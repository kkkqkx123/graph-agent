/**
 * Modular Agent SDK - Main Entry Point
 *
 * This is the main entry point for the Modular Agent SDK.
 * It re-exports all API layer content and manages global instances.
 */

import { createPackageLogger } from '@modular-agent/common-utils';
import { ConfigurationError } from '@modular-agent/types';

/**
 * SDK包级别日志器
 * 用于记录SDK级别的日志信息
 */
export const logger = createPackageLogger('sdk', {
  level: (process.env['SDK_LOG_LEVEL'] as any) || 'info',
  json: process.env['NODE_ENV'] === 'production'
});

/**
 * 全局实例管理器
 * 集中管理 SDK 中需要延迟初始化和缓存的全局实例
 *
 * 设计原则：
 * - 延迟初始化：只在首次使用时创建实例
 * - 单例模式：确保每个实例只创建一次
 * - 错误处理：提供清晰的错误信息
 * - 可测试性：支持重置实例（仅用于测试）
 */
class GlobalInstanceManager {
  private instances = new Map<string, any>();
  private initFailed = new Set<string>();

  /**
   * 获取或创建 TOML 解析器实例
   * @returns TOML 解析器
   * @throws {ConfigurationError} 当未找到 TOML 解析库时抛出
   */
  getTomlParser(): any {
    const key = 'toml_parser';
    
    // 如果已经初始化失败，直接抛出错误
    if (this.initFailed.has(key)) {
      throw new ConfigurationError(
        'TOML解析器初始化失败。请确保已安装 @iarna/toml: pnpm install',
        undefined,
        { suggestion: 'pnpm install' }
      );
    }

    // 如果已缓存，直接返回
    if (this.instances.has(key)) {
      return this.instances.get(key);
    }

    try {
      // 使用 require 加载 CommonJS 模块
      const toml = require('@iarna/toml');
      this.instances.set(key, toml);
      return toml;
    } catch (error) {
      this.initFailed.add(key);
      throw new ConfigurationError(
        '未找到TOML解析库。请确保已安装 @iarna/toml: pnpm install',
        undefined,
        { suggestion: 'pnpm install' }
      );
    }
  }

  /**
   * 获取或创建 Token 编码器实例
   * @returns Token 编码器，如果初始化失败则返回 null
   */
  getTokenEncoder(): any {
    const key = 'token_encoder';
    
    // 如果已经初始化失败，返回 null
    if (this.initFailed.has(key)) {
      return null;
    }

    // 如果已缓存，直接返回
    if (this.instances.has(key)) {
      return this.instances.get(key);
    }

    try {
      const tiktoken = require('tiktoken');
      const encoder = tiktoken.getEncoding('cl100k_base');
      this.instances.set(key, encoder);
      return encoder;
    } catch (error) {
      this.initFailed.add(key);
      return null;
    }
  }

  /**
   * 重置指定类型的实例（仅用于测试）
   * @param key 实例键名
   */
  resetInstance(key: string): void {
    this.instances.delete(key);
    this.initFailed.delete(key);
  }

  /**
   * 重置所有实例（仅用于测试）
   */
  resetAll(): void {
    this.instances.clear();
    this.initFailed.clear();
  }

  /**
   * 检查实例是否已初始化
   * @param key 实例键名
   * @returns 是否已初始化
   */
  isInitialized(key: string): boolean {
    return this.instances.has(key);
  }

  /**
   * 检查实例初始化是否失败
   * @param key 实例键名
   * @returns 是否初始化失败
   */
  isInitFailed(key: string): boolean {
    return this.initFailed.has(key);
  }
}

/**
 * 全局实例管理器单例
 */
export const globalInstanceManager = new GlobalInstanceManager();

// Re-export all API layer content
export * from './api';
