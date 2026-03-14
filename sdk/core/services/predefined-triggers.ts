/**
 * 预定义触发器注册工具函数
 *
 * 提供无状态的工具函数用于注册SDK预定义的触发器模板和工作流。
 * 这些函数不维护任何状态，直接操作传入的注册表实例。
 */

import type { TriggerTemplate, WorkflowDefinition } from '@modular-agent/types';
import type { TriggerTemplateRegistry } from './trigger-template-registry.js';
import type { WorkflowRegistry } from '../../graph/services/workflow-registry.js';
import { createContextualLogger } from '../../utils/contextual-logger.js';
import {
  createContextCompressionTriggerTemplate,
  createContextCompressionWorkflow,
  createCustomContextCompressionTrigger,
  createCustomContextCompressionWorkflow,
  CONTEXT_COMPRESSION_TRIGGER_NAME,
  CONTEXT_COMPRESSION_WORKFLOW_ID,
  DEFAULT_COMPRESSION_PROMPT
} from '../triggers/predefined/context-compression.js';

const logger = createContextualLogger();

/**
 * 预定义触发器配置选项
 */
export interface ContextCompressionConfig {
  /**
   * 自定义压缩提示词
   * 如果未提供，使用默认提示词
   */
  compressionPrompt?: string;

  /**
   * 超时时间（毫秒）
   * @default 60000
   */
  timeout?: number;

  /**
   * 最大触发次数（0表示无限制）
   * @default 0
   */
  maxTriggers?: number;
}

/**
 * 注册上下文压缩触发器模板
 *
 * @param registry 触发器模板注册表
 * @param config 自定义配置
 * @param skipIfExists 如果已存在是否跳过（而非报错）
 * @returns 是否成功注册
 */
export function registerContextCompressionTrigger(
  registry: TriggerTemplateRegistry,
  config?: ContextCompressionConfig,
  skipIfExists: boolean = true
): boolean {
  try {
    // 检查是否已存在
    if (registry.has(CONTEXT_COMPRESSION_TRIGGER_NAME)) {
      if (skipIfExists) {
        logger.debug(`Context compression trigger already exists, skipping`);
        return false;
      }
      registry.unregister(CONTEXT_COMPRESSION_TRIGGER_NAME);
    }

    // 创建并注册模板
    const template = config
      ? createCustomContextCompressionTrigger(config)
      : createContextCompressionTriggerTemplate();

    registry.register(template);
    logger.info(`Registered context compression trigger template`);
    return true;

  } catch (error) {
    logger.error(`Failed to register context compression trigger`, { error });
    return false;
  }
}

/**
 * 注册上下文压缩工作流
 *
 * @param registry 工作流注册表
 * @param config 自定义配置
 * @param skipIfExists 如果已存在是否跳过（而非报错）
 * @returns 是否成功注册
 */
export function registerContextCompressionWorkflow(
  registry: WorkflowRegistry,
  config?: ContextCompressionConfig,
  skipIfExists: boolean = true
): boolean {
  try {
    // 检查是否已存在
    if (registry.has(CONTEXT_COMPRESSION_WORKFLOW_ID)) {
      if (skipIfExists) {
        logger.debug(`Context compression workflow already exists, skipping`);
        return false;
      }
      registry.unregister(CONTEXT_COMPRESSION_WORKFLOW_ID, { force: true });
    }

    // 创建工作流
    const workflow = config?.compressionPrompt
      ? createCustomContextCompressionWorkflow(config)
      : createContextCompressionWorkflow();

    registry.register(workflow);
    logger.info(`Registered context compression workflow`);
    return true;

  } catch (error) {
    logger.error(`Failed to register context compression workflow`, { error });
    return false;
  }
}

/**
 * 同时注册上下文压缩触发器和工作流
 *
 * 便捷函数，用于一次性注册相关的触发器模板和工作流
 *
 * @param triggerRegistry 触发器模板注册表
 * @param workflowRegistry 工作流注册表
 * @param config 自定义配置
 * @returns 注册结果
 */
export function registerContextCompression(
  triggerRegistry: TriggerTemplateRegistry,
  workflowRegistry: WorkflowRegistry,
  config?: ContextCompressionConfig
): {
  triggerRegistered: boolean;
  workflowRegistered: boolean;
} {
  // 必须先注册工作流，因为触发器引用了工作流ID
  const workflowRegistered = registerContextCompressionWorkflow(workflowRegistry, config);
  const triggerRegistered = registerContextCompressionTrigger(triggerRegistry, config);

  return {
    triggerRegistered,
    workflowRegistered
  };
}

/**
 * 注销上下文压缩触发器
 *
 * @param registry 触发器模板注册表
 * @returns 是否成功注销
 */
export function unregisterContextCompressionTrigger(
  registry: TriggerTemplateRegistry
): boolean {
  try {
    if (registry.has(CONTEXT_COMPRESSION_TRIGGER_NAME)) {
      registry.unregister(CONTEXT_COMPRESSION_TRIGGER_NAME);
      logger.info(`Unregistered context compression trigger`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Failed to unregister context compression trigger`, { error });
    return false;
  }
}

/**
 * 注销上下文压缩工作流
 *
 * @param registry 工作流注册表
 * @returns 是否成功注销
 */
export function unregisterContextCompressionWorkflow(
  registry: WorkflowRegistry
): boolean {
  try {
    if (registry.has(CONTEXT_COMPRESSION_WORKFLOW_ID)) {
      registry.unregister(CONTEXT_COMPRESSION_WORKFLOW_ID, { force: true });
      logger.info(`Unregistered context compression workflow`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Failed to unregister context compression workflow`, { error });
    return false;
  }
}

/**
 * 检查上下文压缩触发器是否已注册
 */
export function isContextCompressionTriggerRegistered(
  registry: TriggerTemplateRegistry
): boolean {
  return registry.has(CONTEXT_COMPRESSION_TRIGGER_NAME);
}

/**
 * 检查上下文压缩工作流是否已注册
 */
export function isContextCompressionWorkflowRegistered(
  registry: WorkflowRegistry
): boolean {
  return registry.has(CONTEXT_COMPRESSION_WORKFLOW_ID);
}

// 重新导出预定义配置，便于用户使用
export {
  CONTEXT_COMPRESSION_TRIGGER_NAME,
  CONTEXT_COMPRESSION_WORKFLOW_ID,
  DEFAULT_COMPRESSION_PROMPT
} from '../triggers/predefined/context-compression.js';