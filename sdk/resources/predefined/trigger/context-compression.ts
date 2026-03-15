/**
 * 预定义的上下文压缩触发器模板
 *
 * 当监测到需要压缩上下文的事件时触发
 */

import type { TriggerTemplate } from '@modular-agent/types';
import { now } from '@modular-agent/common-utils';
import { CONTEXT_COMPRESSION_WORKFLOW_ID } from '../workflow/context-compression.js';

/**
 * 上下文压缩触发器模板名称
 */
export const CONTEXT_COMPRESSION_TRIGGER_NAME = 'context_compression_trigger';

/**
 * 创建预定义的上下文压缩触发器模板
 *
 * 该触发器监听 CONTEXT_COMPRESSION_REQUESTED 事件，
 * 当Token使用量超过限制时自动触发上下文压缩子工作流
 */
export function createContextCompressionTriggerTemplate(): TriggerTemplate {
  return {
    name: CONTEXT_COMPRESSION_TRIGGER_NAME,
    description: '当Token使用量超过限制时自动触发上下文压缩子工作流',
    condition: {
      eventType: 'CONTEXT_COMPRESSION_REQUESTED'
    },
    action: {
      type: 'execute_triggered_subgraph',
      parameters: {
        triggeredWorkflowId: CONTEXT_COMPRESSION_WORKFLOW_ID,
        waitForCompletion: true,
        timeout: 60000,
        recordHistory: false
      }
    },
    enabled: true,
    maxTriggers: 0, // 无限制
    metadata: {
      category: 'system',
      tags: ['context', 'compression', 'token', 'memory']
    },
    createdAt: now(),
    updatedAt: now()
  };
}

/**
 * 创建自定义配置的上下文压缩触发器模板
 *
 * @param config 自定义配置
 * @returns 自定义配置的触发器模板
 */
export function createCustomContextCompressionTrigger(
  config: {
    timeout?: number;
    maxTriggers?: number;
    compressionPrompt?: string;
  } = {}
): TriggerTemplate {
  const template = createContextCompressionTriggerTemplate();

  // 应用自定义配置
  if (config.timeout !== undefined) {
    (template.action.parameters as Record<string, any>)['timeout'] = config.timeout;
  }

  if (config.maxTriggers !== undefined) {
    template.maxTriggers = config.maxTriggers;
  }

  // 存储自定义配置
  const metadata = template.metadata || {};
  (metadata as Record<string, any>)['customConfig'] = config;
  template.metadata = metadata;

  template.updatedAt = now();
  return template;
}
