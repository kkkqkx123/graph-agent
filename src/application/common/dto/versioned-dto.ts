/**
 * 版本化DTO
 * 提供DTO版本控制和演进支持
 */

import { z, ZodSchema } from 'zod';
import { BaseDto, DtoValidationError } from './base-dto';

/**
 * 版本化DTO接口
 */
export interface VersionedDto<T extends ZodSchema> {
  /**
   * DTO版本
   */
  version: string;

  /**
   * DTO数据
   */
  data: z.infer<T>;

  /**
   * 创建时间
   */
  createdAt?: string;

  /**
   * 更新时间
   */
  updatedAt?: string;
}

/**
 * 版本迁移函数类型
 */
export type VersionMigrationFunction<TFrom, TTo> = (data: TFrom) => TTo;

/**
 * 版本迁移配置
 */
export interface VersionMigration<TFrom, TTo> {
  /**
   * 源版本
   */
  fromVersion: string;

  /**
   * 目标版本
   */
  toVersion: string;

  /**
   * 迁移函数
   */
  migrate: VersionMigrationFunction<TFrom, TTo>;

  /**
   * 迁移描述
   */
  description?: string;
}

/**
 * 版本化DTO基类
 * 支持多版本DTO管理和自动迁移
 */
export abstract class VersionedBaseDto<T extends ZodSchema> extends BaseDto<T> {
  /**
   * 版本历史记录
   */
  protected versionHistory: Map<string, ZodSchema> = new Map();

  /**
   * 版本迁移映射
   */
  protected migrations: Map<string, VersionMigration<any, any>> = new Map();

  /**
   * 支持的版本列表（按语义化版本排序）
   */
  protected supportedVersions: string[] = [];

  constructor(currentSchema: T, currentVersion: string = '1.0.0') {
    super(currentSchema, currentVersion);
    this.versionHistory.set(currentVersion, currentSchema);
    this.supportedVersions.push(currentVersion);
    this.sortVersions();
  }

  /**
   * 注册历史版本Schema
   * @param version 版本号
   * @param schema Zod Schema
   */
  registerVersion(version: string, schema: ZodSchema): void {
    this.versionHistory.set(version, schema);
    if (!this.supportedVersions.includes(version)) {
      this.supportedVersions.push(version);
      this.sortVersions();
    }
  }

  /**
   * 注册版本迁移
   * @param migration 迁移配置
   */
  registerMigration<TFrom, TTo>(migration: VersionMigration<TFrom, TTo>): void {
    const key = `${migration.fromVersion}->${migration.toVersion}`;
    this.migrations.set(key, migration);
  }

  /**
   * 验证特定版本的数据
   * @param data 待验证的数据
   * @param version 版本号
   * @returns 验证后的数据
   */
  validateVersion(data: unknown, version: string): z.infer<T> {
    const schema = this.versionHistory.get(version);
    if (!schema) {
      throw new Error(`不支持的版本: ${version}。支持的版本: ${this.getSupportedVersions().join(', ')}`);
    }
    
    try {
      return schema.parse(data) as z.infer<T>;
    } catch (error) {
      throw new DtoValidationError(
        (error as any).errors || [],
        version
      );
    }
  }

  /**
   * 验证版本化DTO
   * @param versionedDto 版本化DTO对象
   * @returns 验证后的数据
   */
  validateVersionedDto(versionedDto: unknown): z.infer<T> {
    if (!versionedDto || typeof versionedDto !== 'object') {
      throw new Error('无效的版本化DTO对象');
    }

    const dto = versionedDto as any;
    if (!dto.version || !dto.data) {
      throw new Error('版本化DTO必须包含version和data字段');
    }

    return this.validateVersion(dto.data, dto.version);
  }

  /**
   * 迁移数据到指定版本
   * @param data 原始数据
   * @param fromVersion 源版本
   * @param toVersion 目标版本
   * @returns 迁移后的数据
   */
  async migrateToVersion(
    data: any,
    fromVersion: string,
    toVersion: string
  ): Promise<any> {
    if (fromVersion === toVersion) {
      return data;
    }

    // 检查是否需要迁移
    const migrationPath = this.findMigrationPath(fromVersion, toVersion);
    if (!migrationPath || migrationPath.length === 0) {
      throw new Error(`无法从版本 ${fromVersion} 迁移到版本 ${toVersion}`);
    }

    let currentData = data;
    let currentVersion = fromVersion;

    // 执行迁移路径
    for (const migration of migrationPath) {
      const key = `${migration.fromVersion}->${migration.toVersion}`;
      const migrationFunc = this.migrations.get(key);
      
      if (!migrationFunc) {
        throw new Error(`缺少迁移函数: ${key}`);
      }

      try {
        currentData = migrationFunc.migrate(currentData);
        currentVersion = migration.toVersion;
      } catch (error) {
        throw new Error(`迁移失败 ${fromVersion} -> ${toVersion}: ${error}`);
      }
    }

    return currentData;
  }

  /**
   * 自动迁移到最新版本
   * @param versionedDto 版本化DTO
   * @returns 最新版本的DTO
   */
  async migrateToLatest(versionedDto: VersionedDto<T>): Promise<z.infer<T>> {
    const latestVersion = this.getLatestVersion();
    
    if (versionedDto.version === latestVersion) {
      return versionedDto.data as z.infer<T>;
    }

    const migratedData = await this.migrateToVersion(
      versionedDto.data,
      versionedDto.version,
      latestVersion
    );

    return this.validate(migratedData);
  }

  /**
   * 创建版本化DTO
   * @param data DTO数据
   * @param version 版本号（默认为当前版本）
   * @returns 版本化DTO对象
   */
  createVersionedDto(data: z.infer<T>, version?: string): VersionedDto<T> {
    const targetVersion = version || this.version;
    const validatedData = this.validateVersion(data, targetVersion);
    
    return {
      version: targetVersion,
      data: validatedData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * 获取支持的版本列表
   * @returns 版本号数组
   */
  getSupportedVersions(): string[] {
    return [...this.supportedVersions];
  }

  /**
   * 获取最新版本
   * @returns 最新版本号
   */
  getLatestVersion(): string {
    return this.supportedVersions[this.supportedVersions.length - 1] || this.version;
  }

  /**
   * 获取最早版本
   * @returns 最早版本号
   */
  getEarliestVersion(): string {
    return this.supportedVersions[0] || this.version;
  }

  /**
   * 检查版本是否支持
   * @param version 版本号
   * @returns 是否支持
   */
  isVersionSupported(version: string): boolean {
    return this.supportedVersions.includes(version);
  }

  /**
   * 比较版本号
   * @param version1 版本1
   * @param version2 版本2
   * @returns 比较结果：-1(小于), 0(等于), 1(大于)
   */
  compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }
    
    return 0;
  }

  /**
   * 查找迁移路径
   * @param fromVersion 源版本
   * @param toVersion 目标版本
   * @returns 迁移路径数组
   */
  private findMigrationPath(
    fromVersion: string,
    toVersion: string
  ): VersionMigration<any, any>[] {
    // 简单实现：直接查找迁移
    const key = `${fromVersion}->${toVersion}`;
    const directMigration = this.migrations.get(key);
    
    if (directMigration) {
      return [directMigration];
    }

    // TODO: 实现更复杂的路径查找算法（如广度优先搜索）
    return [];
  }

  /**
   * 按版本号排序
   */
  private sortVersions(): void {
    this.supportedVersions.sort((a, b) => this.compareVersions(a, b));
  }
}

/**
 * 版本化DTO管理器
 * 管理多个版本化DTO
 */
export class VersionedDtoManager {
  /**
   * DTO注册表
   */
  private dtoRegistry: Map<string, VersionedBaseDto<any>> = new Map();

  /**
   * 注册版本化DTO
   * @param name DTO名称
   * @param dto 版本化DTO实例
   */
  registerDto(name: string, dto: VersionedBaseDto<any>): void {
    this.dtoRegistry.set(name, dto);
  }

  /**
   * 获取版本化DTO
   * @param name DTO名称
   * @returns 版本化DTO实例
   */
  getDto(name: string): VersionedBaseDto<any> | undefined {
    return this.dtoRegistry.get(name);
  }

  /**
   * 验证版本化DTO
   * @param dtoName DTO名称
   * @param versionedDto 版本化DTO对象
   * @returns 验证后的数据
   */
  validateVersionedDto(dtoName: string, versionedDto: unknown): any {
    const dto = this.getDto(dtoName);
    if (!dto) {
      throw new Error(`未找到DTO: ${dtoName}`);
    }
    
    return dto.validateVersionedDto(versionedDto);
  }

  /**
   * 迁移DTO到最新版本
   * @param dtoName DTO名称
   * @param versionedDto 版本化DTO对象
   * @returns 最新版本的DTO
   */
  async migrateToLatest(dtoName: string, versionedDto: VersionedDto<any>): Promise<any> {
    const dto = this.getDto(dtoName);
    if (!dto) {
      throw new Error(`未找到DTO: ${dtoName}`);
    }
    
    return dto.migrateToLatest(versionedDto);
  }

  /**
   * 获取所有注册的DTO名称
   * @returns DTO名称数组
   */
  getRegisteredDtoNames(): string[] {
    return Array.from(this.dtoRegistry.keys());
  }

  /**
   * 获取DTO版本信息
   * @param dtoName DTO名称
   * @returns 版本信息
   */
  getDtoVersionInfo(dtoName: string): {
    current: string;
    supported: string[];
    latest: string;
  } | null {
    const dto = this.getDto(dtoName);
    if (!dto) {
      return null;
    }

    return {
      current: dto.getVersion(),
      supported: dto.getSupportedVersions(),
      latest: dto.getLatestVersion()
    };
  }
}

/**
 * 全局版本化DTO管理器实例
 */
export const globalVersionedDtoManager = new VersionedDtoManager();