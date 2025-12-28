/**
 * 轮询池模块规则定义
 */

import { IModuleRule, MergeStrategy } from '../types';
import { IModuleLoader } from '../types';
import { ILogger } from '../../../../domain/common/types';

/**
 * 轮询池模块Schema
 */
export const PoolSchema = {
  type: 'object',
  properties: {
    pools: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          taskGroups: { type: 'array', items: { type: 'string' } },
          rotation: {
            type: 'object',
            properties: {
              strategy: { type: 'string', enum: ['round_robin', 'least_recently_used', 'weighted'] },
              currentIndex: { type: 'number' }
            }
          },
          healthCheck: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              interval: { type: 'number' },
              failureThreshold: { type: 'number' }
            }
          },
          concurrencyControl: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              maxConcurrency: { type: 'number' }
            }
          },
          rateLimiting: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              requestsPerMinute: { type: 'number' }
            }
          },
          fallbackConfig: {
            type: 'object',
            properties: {
              strategy: { type: 'string' },
              maxInstanceAttempts: { type: 'number' }
            }
          }
        },
        required: ['name', 'taskGroups']
      }
    }
  }
};

/**
 * 验证轮询池配置
 */
export function validatePoolConfig(poolName: string, config: Record<string, any>): void {
  const requiredFields = ['name', 'taskGroups'];
  
  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`轮询池配置缺少必需字段: ${field}`);
    }
  }

  // 验证任务组
  const taskGroups = config['taskGroups'] || [];
  if (!Array.isArray(taskGroups) || taskGroups.length === 0) {
    throw new Error(`轮询池 ${poolName} 必须配置至少一个任务组`);
  }

  // 验证轮询策略
  const rotationConfig = config['rotation'] || {};
  const validStrategies = ['round_robin', 'least_recently_used', 'weighted'];
  if (rotationConfig.strategy && !validStrategies.includes(rotationConfig.strategy)) {
    throw new Error(`不支持的轮询策略: ${rotationConfig.strategy}`);
  }

  // 验证健康检查配置
  const healthCheckConfig = config['healthCheck'] || {};
  if (healthCheckConfig.interval && typeof healthCheckConfig.interval !== 'number') {
    throw new Error('健康检查间隔必须是数字');
  }

  if (healthCheckConfig.failureThreshold && typeof healthCheckConfig.failureThreshold !== 'number') {
    throw new Error('健康检查失败阈值必须是数字');
  }
}

/**
 * 创建轮询池模块规则
 */
export function createPoolModuleRule(
  loader: IModuleLoader,
  logger: ILogger
): IModuleRule {
  return {
    moduleType: 'pool',
    patterns: [
      'pools/common.toml',
      'pools/default.toml',
      'pools/*.toml'
    ],
    priority: 100,
    loader,
    schema: PoolSchema as any,
    dependencies: ['global'],
    mergeStrategy: MergeStrategy.MERGE_DEEP
  };
}
