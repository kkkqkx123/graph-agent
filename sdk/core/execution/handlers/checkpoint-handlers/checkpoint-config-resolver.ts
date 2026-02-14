/**
 * 检查点配置解析器
 * 处理检查点配置的优先级规则
 */

import type { CheckpointConfig, ProcessedWorkflowDefinition } from '@modular-agent/types';
import { WorkflowType } from '@modular-agent/types';
import type { Node, NodeHook } from '@modular-agent/types';
import type { Trigger } from '@modular-agent/types';
import type { Tool } from '@modular-agent/types';
import {
  CheckpointTriggerType,
  CheckpointConfigSource
} from '@modular-agent/types';
import type {
  CheckpointConfigContext,
  CheckpointConfigResult
} from '@modular-agent/types';

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
  context: CheckpointConfigContext,
  workflow?: ProcessedWorkflowDefinition
): CheckpointConfigResult {
  // 特殊处理：如果是triggered子工作流，默认不创建检查点
  if (workflow && workflow.type === WorkflowType.TRIGGERED_SUBWORKFLOW) {
    // 检查是否明确启用了检查点
    const triggeredConfig = workflow.triggeredSubworkflowConfig;
    
    if (triggeredConfig?.enableCheckpoints === true) {
      // 明确启用检查点，使用triggered子工作流的检查点配置
      const triggeredCheckpointConfig = triggeredConfig.checkpointConfig;
      return resolveCheckpointConfigInternal(
        triggeredCheckpointConfig,
        nodeConfig,
        hookConfig,
        triggerConfig,
        toolConfig,
        context
      );
    }
    
    // 默认不创建检查点
    return {
      shouldCreate: false,
      source: CheckpointConfigSource.TRIGGERED_SUBWORKFLOW
    };
  }
  
  // 普通工作流，使用标准解析逻辑
  return resolveCheckpointConfigInternal(
    globalConfig,
    nodeConfig,
    hookConfig,
    triggerConfig,
    toolConfig,
    context
  );
}

/**
 * 内部检查点配置解析函数
 * 不包含triggered子工作流的特殊处理
 */
function resolveCheckpointConfigInternal(
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
      source: CheckpointConfigSource.DISABLED
    };
  }

  // 1. 检查Hook配置（最高优先级）
  if (hookConfig?.createCheckpoint !== undefined) {
    return {
      shouldCreate: hookConfig.createCheckpoint,
      description: hookConfig.checkpointDescription,
      source: CheckpointConfigSource.HOOK
    };
  }

  // 2. 检查Trigger配置（高优先级）
  if (triggerConfig?.createCheckpoint !== undefined) {
    return {
      shouldCreate: triggerConfig.createCheckpoint,
      description: triggerConfig.checkpointDescription,
      source: CheckpointConfigSource.TRIGGER
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
      source: CheckpointConfigSource.TOOL
    };
  }

  // 4. 检查节点配置（中优先级）
  if (nodeConfig) {
    if (context.triggerType === CheckpointTriggerType.NODE_BEFORE_EXECUTE) {
      if (nodeConfig.checkpointBeforeExecute !== undefined) {
        return {
          shouldCreate: nodeConfig.checkpointBeforeExecute,
          description: `Before node: ${nodeConfig.name}`,
          source: CheckpointConfigSource.NODE
        };
      }
    } else if (context.triggerType === CheckpointTriggerType.NODE_AFTER_EXECUTE) {
      if (nodeConfig.checkpointAfterExecute !== undefined) {
        return {
          shouldCreate: nodeConfig.checkpointAfterExecute,
          description: `After node: ${nodeConfig.name}`,
          source: CheckpointConfigSource.NODE
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
          description: 'Global checkpoint before node',
          source: CheckpointConfigSource.GLOBAL
        };
      }
    } else if (context.triggerType === CheckpointTriggerType.NODE_AFTER_EXECUTE) {
      if (globalConfig.checkpointAfterNode !== undefined) {
        return {
          shouldCreate: globalConfig.checkpointAfterNode,
          description: 'Global checkpoint after node',
          source: CheckpointConfigSource.GLOBAL
        };
      }
    }
  }

  // 默认不创建检查点
  return {
    shouldCreate: false,
    source: CheckpointConfigSource.DISABLED
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