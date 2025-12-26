import { ObjectLiteral } from 'typeorm';

/**
 * 仓储配置接口 - 简化版
 * 只保留核心配置项，避免过度设计
 */
export interface RepositoryConfig {
  /**
   * 默认分页大小
   */
  defaultPageSize: number;
  
  /**
   * 最大分页大小（防止滥用）
   */
  maxPageSize: number;
  
  /**
   * 是否启用软删除
   */
  softDeleteEnabled: boolean;
  
  /**
   * 软删除字段名
   */
  softDeleteField: string;
  
  /**
   * 是否启用缓存
   */
  cacheEnabled: boolean;
  
  /**
   * 缓存过期时间（毫秒）
   */
  cacheExpiration: number;
}

/**
 * 配置验证器
 */
export class ConfigValidator {
  /**
   * 验证配置的有效性
   */
  static validate(config: RepositoryConfig): boolean {
    if (config.defaultPageSize <= 0) {
      throw new Error('默认分页大小必须大于0');
    }
    
    if (config.maxPageSize <= 0) {
      throw new Error('最大分页大小必须大于0');
    }
    
    if (config.defaultPageSize > config.maxPageSize) {
      throw new Error('默认分页大小不能大于最大分页大小');
    }
    
    if (config.cacheEnabled && config.cacheExpiration <= 0) {
      throw new Error('缓存过期时间必须大于0');
    }
    
    if (!config.softDeleteField || config.softDeleteField.trim().length === 0) {
      throw new Error('软删除字段名不能为空');
    }
    
    return true;
  }
}

/**
 * 默认仓储配置 - 简化版
 * 移除过度设计的链式方法，专注于核心配置
 */
export class DefaultRepositoryConfig implements RepositoryConfig {
  defaultPageSize = 10;
  maxPageSize = 100;
  softDeleteEnabled = true;
  softDeleteField = 'isDeleted';
  cacheEnabled = false;
  cacheExpiration = 300000; // 5分钟

  constructor(config?: Partial<RepositoryConfig>) {
    if (config) {
      // 合并配置
      const mergedConfig = { ...this, ...config };
      
      // 验证配置
      ConfigValidator.validate(mergedConfig);
      
      // 应用验证后的配置
      Object.assign(this, mergedConfig);
    }
  }
}