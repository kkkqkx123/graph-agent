/**
 * 预定义的上下文压缩触发器模板和工作流
 *
 * 基于LLM的上下文压缩默认实现
 * 核心逻辑：传入完整上下文 → LLM压缩 → 提取结果 → 回传
 */

import type { TriggerTemplate, WorkflowDefinition, Node, Edge, TruncateMessageOperation } from '@modular-agent/types';
import { now, generateId } from '@modular-agent/common-utils';

/**
 * 上下文压缩触发器模板名称
 */
export const CONTEXT_COMPRESSION_TRIGGER_NAME = 'context_compression_trigger';

/**
 * 上下文压缩工作流ID
 */
export const CONTEXT_COMPRESSION_WORKFLOW_ID = 'context_compression_workflow';

/**
 * 默认的上下文压缩提示词
 * 要求LLM将对话历史压缩为摘要
 */
export const DEFAULT_COMPRESSION_PROMPT = `请对以下对话历史进行压缩总结。

要求：
1. 保留所有重要的事实、决策和行动项
2. 保留用户明确指定的要求或约束
3. 删除冗余的问候、过渡语句和重复信息
4. 如果存在代码片段，保留其功能和用途描述，可以省略具体实现细节
5. 总结长度控制在原始长度的30%以内

请直接输出总结内容，不需要添加任何前缀或解释。`;

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
 * 创建预定义的上下文压缩工作流
 *
 * 工作流结构（4个节点）：
 * 1. START_FROM_TRIGGER: 接收主线程传入的完整上下文
 * 2. LLM: 调用LLM压缩上下文
 * 3. CONTEXT_PROCESSOR: 保留LLM响应，截断前面的消息
 * 4. CONTINUE_FROM_TRIGGER: 回传压缩结果到主线程
 *
 * 上下文的传入和回传通过工作流配置自动处理
 */
export function createContextCompressionWorkflow(
  compressionPrompt?: string
): WorkflowDefinition {
  const currentTime = now();

  // 创建节点
  const startNodeId = generateId();
  const llmNodeId = generateId();
  const processorNodeId = generateId();
  const endNodeId = generateId();

  const nodes: Node[] = [
    {
      id: startNodeId,
      type: 'START_FROM_TRIGGER',
      name: 'Start Compression',
      description: '接收主线程传入的完整上下文',
      config: {},
      outgoingEdgeIds: [],
      incomingEdgeIds: []
    },
    {
      id: llmNodeId,
      type: 'LLM',
      name: 'Compress Context',
      description: '使用LLM压缩对话历史',
      config: {
        // LLM节点配置：使用默认 profile
        profileId: 'DEFAULT',
        prompt: compressionPrompt || DEFAULT_COMPRESSION_PROMPT
      },
      outgoingEdgeIds: [],
      incomingEdgeIds: []
    },
    {
      id: processorNodeId,
      type: 'CONTEXT_PROCESSOR',
      name: 'Extract Result',
      description: '保留LLM压缩结果，截断原始上下文',
      config: {
        // 使用 TRUNCATE 操作保留最后一条消息
        operationConfig: {
          operation: 'TRUNCATE',
          strategy: { type: 'KEEP_LAST', count: 1 }
        } as TruncateMessageOperation
      },
      outgoingEdgeIds: [],
      incomingEdgeIds: []
    },
    {
      id: endNodeId,
      type: 'CONTINUE_FROM_TRIGGER',
      name: 'Complete Compression',
      description: '将压缩结果回传到主线程',
      config: {
        // 对话历史回传配置：使用 TRUNCATE 回传最后一条消息
        conversationHistoryCallback: {
          operation: 'TRUNCATE',
          truncate: {
            operation: 'TRUNCATE',
            strategy: { type: 'KEEP_LAST', count: 1 }
          }
        }
      },
      outgoingEdgeIds: [],
      incomingEdgeIds: []
    }
  ];

  // 创建边
  const edges: Edge[] = [
    {
      id: generateId(),
      sourceNodeId: startNodeId,
      targetNodeId: llmNodeId,
      type: 'DEFAULT'
    },
    {
      id: generateId(),
      sourceNodeId: llmNodeId,
      targetNodeId: processorNodeId,
      type: 'DEFAULT'
    },
    {
      id: generateId(),
      sourceNodeId: processorNodeId,
      targetNodeId: endNodeId,
      type: 'DEFAULT'
    }
  ];

  // 更新节点的出边和入边ID
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.sourceNodeId);
    const targetNode = nodeMap.get(edge.targetNodeId);
    if (sourceNode) {
      sourceNode.outgoingEdgeIds.push(edge.id);
    }
    if (targetNode) {
      targetNode.incomingEdgeIds.push(edge.id);
    }
  }

  return {
    id: CONTEXT_COMPRESSION_WORKFLOW_ID,
    name: 'Context Compression Workflow',
    type: 'TRIGGERED_SUBWORKFLOW',
    description: '基于LLM的上下文压缩工作流，将对话历史压缩为摘要',
    nodes,
    edges,
    triggeredSubworkflowConfig: {
      // 触发子工作流专用配置
      enableCheckpoints: false,
      timeout: 60000,
      maxRetries: 0
    },
    metadata: {
      category: 'system',
      tags: ['context', 'compression', 'token', 'memory', 'predefined'],
      author: 'system'
    },
    version: '1.0.0',
    createdAt: currentTime,
    updatedAt: currentTime
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

/**
 * 创建自定义配置的上下文压缩工作流
 *
 * @param config 自定义配置
 * @returns 自定义配置的工作流定义
 */
export function createCustomContextCompressionWorkflow(
  config: {
    compressionPrompt?: string;
  } = {}
): WorkflowDefinition {
  return createContextCompressionWorkflow(config.compressionPrompt);
}