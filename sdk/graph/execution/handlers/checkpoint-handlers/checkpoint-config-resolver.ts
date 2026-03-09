/**
 * Graph 检查点配置解析器
 *
 * 基于 sdk/core/checkpoint 通用框架实现 Graph 特定的配置解析逻辑。
 * 处理多层级配置优先级规则。
 */

import type {
  CheckpointConfig,
  WorkflowDefinition,
  Node,
  NodeHook,
  Trigger,
  Tool,
  CheckpointConfigContext,
  CheckpointConfigResult
} from '@modular-agent/types';
import {
  CheckpointConfigResolver,
  type ConfigLayer
} from '../../../../core/checkpoint/index.js';

/**
 * Graph 检查点配置解析器
 *
 * 扩展通用配置解析器，添加 Graph 特定的配置层级。
 *
 * 配置优先级（从高到低）：
 * 1. Hook 配置
 * 2. Trigger 配置
 * 3. Tool 配置
 * 4. Node 配置
 * 5. Global 配置
 */
export class GraphCheckpointConfigResolver extends CheckpointConfigResolver {
  /**
   * 解析 Graph 检查点配置
   *
   * @param globalConfig 全局检查点配置
   * @param nodeConfig 节点配置
   * @param hookConfig Hook 配置
   * @param triggerConfig Trigger 配置
   * @param toolConfig Tool 配置
   * @param context 检查点配置上下文
   * @param workflow 工作流定义
   * @returns 解析结果
   */
  resolveGraphConfig(
    globalConfig: CheckpointConfig | undefined,
    nodeConfig: Node | undefined,
    hookConfig: NodeHook | undefined,
    triggerConfig: Trigger | undefined,
    toolConfig: Tool | undefined,
    context: CheckpointConfigContext,
    workflow?: WorkflowDefinition
  ): CheckpointConfigResult {
    // 特殊处理：triggered 子工作流
    if (workflow && workflow.type === 'TRIGGERED_SUBWORKFLOW') {
      const triggeredConfig = workflow.triggeredSubworkflowConfig;

      if (triggeredConfig?.enableCheckpoints === true) {
        // 明确启用检查点，使用 triggered 子工作流的配置
        return this.resolveGraphConfigInternal(
          triggeredConfig.checkpointConfig,
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
        source: 'triggered_subworkflow'
      };
    }

    // 普通工作流，使用标准解析逻辑
    return this.resolveGraphConfigInternal(
      globalConfig,
      nodeConfig,
      hookConfig,
      triggerConfig,
      toolConfig,
      context
    );
  }

  /**
   * 内部解析逻辑
   */
  private resolveGraphConfigInternal(
    globalConfig: CheckpointConfig | undefined,
    nodeConfig: Node | undefined,
    hookConfig: NodeHook | undefined,
    triggerConfig: Trigger | undefined,
    toolConfig: Tool | undefined,
    context: CheckpointConfigContext
  ): CheckpointConfigResult {
    // 检查全局是否启用
    const globallyEnabled = globalConfig?.enabled !== false;

    if (!globallyEnabled) {
      return {
        shouldCreate: false,
        source: 'disabled'
      };
    }

    // 构建配置层级
    const layers: ConfigLayer[] = [];

    // 1. Hook 配置（最高优先级）
    if (hookConfig?.createCheckpoint !== undefined) {
      layers.push(
        this.createLayer('hook', 100, {
          enabled: hookConfig.createCheckpoint,
          description: hookConfig.checkpointDescription
        })
      );
    }

    // 2. Trigger 配置
    if (triggerConfig?.createCheckpoint !== undefined) {
      layers.push(
        this.createLayer('trigger', 90, {
          enabled: triggerConfig.createCheckpoint,
          description: triggerConfig.checkpointDescription
        })
      );
    }

    // 3. Tool 配置
    if (toolConfig?.createCheckpoint !== undefined) {
      const shouldCreate = this.resolveToolCheckpointConfig(
        toolConfig.createCheckpoint,
        context.triggerType
      );
      layers.push(
        this.createLayer('tool', 80, {
          enabled: shouldCreate,
          description: toolConfig.checkpointDescriptionTemplate
        })
      );
    }

    // 4. Node 配置
    if (nodeConfig) {
      const nodeCheckpointConfig = this.resolveNodeCheckpointConfig(nodeConfig, context.triggerType);
      if (nodeCheckpointConfig !== undefined) {
        layers.push(
          this.createLayer('node', 70, {
            enabled: nodeCheckpointConfig,
            description: `${context.triggerType === 'NODE_BEFORE_EXECUTE' ? 'Before' : 'After'} node: ${nodeConfig.name}`
          })
        );
      }
    }

    // 5. Global 配置（最低优先级）
    if (globalConfig) {
      const globalCheckpointConfig = this.resolveGlobalCheckpointConfig(globalConfig, context.triggerType);
      if (globalCheckpointConfig !== undefined) {
        layers.push(
          this.createLayer('global', 10, {
            enabled: globalCheckpointConfig,
            description: `Global checkpoint ${context.triggerType === 'NODE_BEFORE_EXECUTE' ? 'before' : 'after'} node`
          })
        );
      }
    }

    return this.resolve(layers);
  }

  /**
   * 解析 Tool 检查点配置
   */
  private resolveToolCheckpointConfig(
    config: boolean | 'before' | 'after' | 'both',
    triggerType: string
  ): boolean {
    if (config === true) return true;
    if (config === 'both') return true;
    if (config === 'before' && triggerType === 'TOOL_BEFORE') return true;
    if (config === 'after' && triggerType === 'TOOL_AFTER') return true;
    return false;
  }

  /**
   * 解析 Node 检查点配置
   */
  private resolveNodeCheckpointConfig(
    node: Node,
    triggerType: string
  ): boolean | undefined {
    if (triggerType === 'NODE_BEFORE_EXECUTE') {
      return node.checkpointBeforeExecute;
    }
    if (triggerType === 'NODE_AFTER_EXECUTE') {
      return node.checkpointAfterExecute;
    }
    return undefined;
  }

  /**
   * 解析 Global 检查点配置
   */
  private resolveGlobalCheckpointConfig(
    config: CheckpointConfig,
    triggerType: string
  ): boolean | undefined {
    if (triggerType === 'NODE_BEFORE_EXECUTE') {
      return config.checkpointBeforeNode;
    }
    if (triggerType === 'NODE_AFTER_EXECUTE') {
      return config.checkpointAfterNode;
    }
    return undefined;
  }
}

// 创建默认解析器实例
const defaultResolver = new GraphCheckpointConfigResolver();

/**
 * 解析检查点配置
 *
 * 便捷函数，使用默认解析器。
 *
 * @param globalConfig 全局检查点配置
 * @param nodeConfig 节点配置
 * @param hookConfig Hook 配置
 * @param triggerConfig Trigger 配置
 * @param toolConfig Tool 配置
 * @param context 检查点配置上下文
 * @param workflow 工作流定义
 * @returns 解析结果
 */
export function resolveCheckpointConfig(
  globalConfig: CheckpointConfig | undefined,
  nodeConfig: Node | undefined,
  hookConfig: NodeHook | undefined,
  triggerConfig: Trigger | undefined,
  toolConfig: Tool | undefined,
  context: CheckpointConfigContext,
  workflow?: WorkflowDefinition
): CheckpointConfigResult {
  return defaultResolver.resolveGraphConfig(
    globalConfig,
    nodeConfig,
    hookConfig,
    triggerConfig,
    toolConfig,
    context,
    workflow
  );
}

/**
 * 检查是否应该创建检查点
 */
export function shouldCreateCheckpoint(
  globalConfig: CheckpointConfig | undefined,
  nodeConfig: Node | undefined,
  hookConfig: NodeHook | undefined,
  triggerConfig: Trigger | undefined,
  toolConfig: Tool | undefined,
  context: CheckpointConfigContext
): boolean {
  return resolveCheckpointConfig(
    globalConfig,
    nodeConfig,
    hookConfig,
    triggerConfig,
    toolConfig,
    context
  ).shouldCreate;
}

/**
 * 获取检查点描述
 */
export function getCheckpointDescription(
  globalConfig: CheckpointConfig | undefined,
  nodeConfig: Node | undefined,
  hookConfig: NodeHook | undefined,
  triggerConfig: Trigger | undefined,
  toolConfig: Tool | undefined,
  context: CheckpointConfigContext
): string | undefined {
  return resolveCheckpointConfig(
    globalConfig,
    nodeConfig,
    hookConfig,
    triggerConfig,
    toolConfig,
    context
  ).description;
}
