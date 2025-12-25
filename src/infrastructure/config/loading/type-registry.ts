/**
 * 类型注册表实现
 * 使用新的 SchemaRegistry 作为核心实现
 */

import { ITypeRegistry, ValidationResult, PreValidationResult, SchemaVersion } from './types';
import { SchemaRegistry } from './schema-registry';
import { ILogger } from '../../../domain/common/types';

// 使用 JSONSchemaType 作为 JSONSchema 的别名
type JSONSchema = any;

/**
 * 类型注册表实现
 */
export class TypeRegistry implements ITypeRegistry {
  private readonly schemaRegistry: SchemaRegistry;

  constructor(logger: ILogger) {
    this.schemaRegistry = new SchemaRegistry(logger);
  }

  /**
   * 注册模块类型
   */
  registerModuleType(moduleType: string, schema: JSONSchema): void {
    this.schemaRegistry.registerSchema(moduleType, schema);
  }

  /**
   * 注册模块Schema
   */
  registerSchema(moduleType: string, schema: JSONSchema, version?: string, description?: string): void {
    this.schemaRegistry.registerSchema(moduleType, schema, version, description);
  }

  /**
   * 获取模块Schema
   */
  getSchema(moduleType: string): JSONSchema | undefined {
    return this.schemaRegistry.getSchema(moduleType);
  }

  /**
   * 验证配置
   */
  validateConfig(moduleType: string, config: any): ValidationResult {
    return this.schemaRegistry.validateConfig(moduleType, config);
  }

  /**
   * 预验证配置
   */
  preValidate(config: any, moduleType: string): PreValidationResult {
    return this.schemaRegistry.preValidate(config, moduleType);
  }

  /**
   * 验证Schema兼容性
   */
  validateSchemaCompatibility(newSchema: JSONSchema, oldSchema: JSONSchema): boolean {
    return this.schemaRegistry.validateSchemaCompatibility(newSchema, oldSchema);
  }

  /**
   * 获取Schema版本历史
   */
  getSchemaHistory(moduleType: string): SchemaVersion[] {
    return this.schemaRegistry.getSchemaHistory(moduleType);
  }

  /**
   * 检查模块类型是否已注册
   */
  hasModuleType(moduleType: string): boolean {
    return this.schemaRegistry.hasModuleType(moduleType);
  }

  /**
   * 获取所有已注册的模块类型
   */
  getRegisteredTypes(): string[] {
    return this.schemaRegistry.getRegisteredTypes();
  }

  /**
   * 移除模块类型
   */
  unregisterModuleType(moduleType: string): boolean {
    return this.schemaRegistry.unregisterModuleType(moduleType);
  }

  /**
   * 清空所有注册的类型
   */
  clear(): void {
    this.schemaRegistry.clear();
  }

  /**
   * 获取底层Schema注册表（内部使用）
   */
  getSchemaRegistry(): SchemaRegistry {
    return this.schemaRegistry;
  }
}