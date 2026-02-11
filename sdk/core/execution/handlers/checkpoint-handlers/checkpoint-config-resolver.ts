/**
 * 检查点配置解析器
 * 处理检查点配置的优先级规则
 */

import type { CheckpointConfig } from '@modular-agent/types/workflow';
import type { Node, NodeHook } from '@modular-agent/types/node';
import type { Trigger } from '@modular-agent/types/trigger';
import type { Tool } from '@modular-agent/types/tool';
import {
  CheckpointTriggerType
} from '@modular-agent/types/checkpoint';
import type {
  CheckpointConfigContext,
  CheckpointConfigResult
} from '@modular-agent/types/checkpoint';

/**
 * 解析检查点配置
 * 根据优先级规则确定是否创建检查点
 * 
 * 优先级层次：
 * 1. 节点级配置（最高）
 * 2. Hook/Trigger配置（中）
 * 3. 全局配置（最低）
 * 
 * @param globalConfig 全局检查点配置
 * @param nodeConfig 节点配置（可选）
 * @param hookConfig Hook配置（可选）
 * @param triggerConfig Trigger配置（可选）
 * @param toolConfig 工具配置（可选）
 * @param context 检查点配置上下文
 * @returns 检查点配置解析结果
 */
export function resolveCheckpointConfig(
  globalConfig: CheckpointConfig | undefined,
  nodeConfig: Node | undefined,
  hookConfig: NodeHook | undefined,
  triggerConfig: Trigger | undefined,
  toolConfig: Tool | undefined,
  context: CheckpointConfigContext
): CheckpointConfigResult {
  // 检查全局是否启用检查点
  const globallyEnabled = globalConfig?.enabled !== false;
  
  // 如果全局禁用，直接返回不创建
  if (!globallyEnabled) {
    return {
      shouldCreate: false,
      source: 'disabled'
    };
  }

  // 1. 检查Hook配置（最高优先级）
  if (hookConfig?.createCheckpoint !== undefined) {
    return {
      shouldCreate: hookConfig.createCheckpoint,
      description: hookConfig.checkpointDescription,
      source: 'hook'
    };
  }

  // 2. 检查Trigger配置（高优先级）
  if (triggerConfig?.createCheckpoint !== undefined) {
    return {
      shouldCreate: triggerConfig.createCheckpoint,
      description: triggerConfig.checkpointDescription,
      source: 'trigger'
    };
  }

  // 3. 检查工具配置（中优先级）
  if (toolConfig?.createCheckpoint !== undefined) {
    const toolCheckpointConfig = toolConfig.createCheckpoint;
    let shouldCreate = false;
    
    // 根据触发类型和工具配置决定是否创建
    if (context.triggerType === CheckpointTriggerType.TOOL_BEFORE) {
      shouldCreate = toolCheckpointConfig === true || toolCheckpointConfig === 'before' || toolCheckpointConfig === 'both';
    } else if (context.triggerType === CheckpointTriggerType.TOOL_AFTER) {
      shouldCreate = toolCheckpointConfig === 'after' || toolCheckpointConfig === 'both';
    }
    
    return {
      shouldCreate,
      description: toolConfig.checkpointDescriptionTemplate,
      source: 'tool'
    };
  }

  // 4. 检查节点配置（中优先级）
  if (nodeConfig) {
    if (context.triggerType === CheckpointTriggerType.NODE_BEFORE_EXECUTE) {
      if (nodeConfig.checkpointBeforeExecute !== undefined) {
        return {
          shouldCreate: nodeConfig.checkpointBeforeExecute,
          description: `Before node: ${nodeConfig.name}`,
          source: 'node'
        };
      }
    } else if (context.triggerType === CheckpointTriggerType.NODE_AFTER_EXECUTE) {
      if (nodeConfig.checkpointAfterExecute !== undefined) {
        return {
          shouldCreate: nodeConfig.checkpointAfterExecute,
          description: `After node: ${nodeConfig.name}`,
          source: 'node'
        };
      }
    }
  }

  // 5. 检查全局配置（最低优先级）
  if (globalConfig) {
    if (context.triggerType === CheckpointTriggerType.NODE_BEFORE_EXECUTE) {
      if (globalConfig.checkpointBeforeNode !== undefined) {
        return {
          shouldCreate: globalConfig.checkpointBeforeNode,
          description: globalConfig.defaultMetadata?.description || 'Global checkpoint before node',
          source: 'global'
        };
      }
    } else if (context.triggerType === CheckpointTriggerType.NODE_AFTER_EXECUTE) {
      if (globalConfig.checkpointAfterNode !== undefined) {
        return {
          shouldCreate: globalConfig.checkpointAfterNode,
          description: globalConfig.defaultMetadata?.description || 'Global checkpoint after node',
          source: 'global'
        };
      }
    }
  }

  // 默认不创建检查点
  return {
    shouldCreate: false,
    source: 'disabled'
  };
}

/**
 * 检查是否应该创建检查点（便捷函数）
 * @param globalConfig 全局检查点配置
 * @param nodeConfig 节点配置（可选）
 * @param hookConfig Hook配置（可选）
 * @param triggerConfig Trigger配置（可选）
 * @param toolConfig 工具配置（可选）
 * @param context 检查点配置上下文
 * @returns 是否创建检查点
 */
export function shouldCreateCheckpoint(
  globalConfig: CheckpointConfig | undefined,
  nodeConfig: Node | undefined,
  hookConfig: NodeHook | undefined,
  triggerConfig: Trigger | undefined,
  toolConfig: Tool | undefined,
  context: CheckpointConfigContext
): boolean {
  const result = resolveCheckpointConfig(
    globalConfig,
    nodeConfig,
    hookConfig,
    triggerConfig,
    toolConfig,
    context
  );
  return result.shouldCreate;
}

/**
 * 获取检查点描述（便捷函数）
 * @param globalConfig 全局检查点配置
 * @param nodeConfig 节点配置（可选）
 * @param hookConfig Hook配置（可选）
 * @param triggerConfig Trigger配置（可选）
 * @param toolConfig 工具配置（可选）
 * @param context 检查点配置上下文
 * @returns 检查点描述
 */
export function getCheckpointDescription(
  globalConfig: CheckpointConfig | undefined,
  nodeConfig: Node | undefined,
  hookConfig: NodeHook | undefined,
  triggerConfig: Trigger | undefined,
  toolConfig: Tool | undefined,
  context: CheckpointConfigContext
): string | undefined {
  const result = resolveCheckpointConfig(
    globalConfig,
    nodeConfig,
    hookConfig,
    triggerConfig,
    toolConfig,
    context
  );
  return result.description;
}