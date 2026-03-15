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
  CheckpointConfigResult,
  GraphCheckpointConfigLayer,
  CheckpointConfigContent,
  CheckpointConfigSource,
  GraphCheckpointTriggerType
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
 * 1. runtime - 运行时传入
 * 2. workflow - 工作流定义
 * 3. node - 节点定义
 * 4. global - 全局配置
 * 5. default - 默认值
 */
export class GraphCheckpointConfigResolver extends CheckpointConfigResolver {
  /**
   * 解析 Graph 检查点配置
   *
   * @param layers 配置层级列表（按优先级从高到低排序，索引 0 优先级最高）
   * @param context 检查点配置上下文
   * @returns 解析结果
   */
  resolveGraphConfig(
    layers: GraphCheckpointConfigLayer[],
    context: CheckpointConfigContext
  ): CheckpointConfigResult {
    // 特殊处理：triggered 子工作流默认不创建检查点
    if (context.isTriggeredSubworkflow && !context.explicitEnableCheckpoint) {
      return {
        shouldCreate: false,
        effectiveSource: 'default',
        triggerType: context.triggerType
      };
    }

    // 1. 合并配置
    const mergedConfig = this.mergeConfigs(layers);

    // 2. 根据触发时机评估
    const shouldCreate = this.evaluateTriggerForGraph(mergedConfig, context);

    // 3. 找到实际生效的配置来源
    const effectiveSource = this.findEffectiveSource(layers);

    return {
      shouldCreate,
      description: this.buildDescription(context, mergedConfig),
      effectiveSource,
      triggerType: context.triggerType
    };
  }

  /**
   * 合并配置层
   */
  private mergeConfigs(
    layers: GraphCheckpointConfigLayer[]
  ): CheckpointConfigContent {
    const result: CheckpointConfigContent = {};

    for (const layer of layers) {
      if (layer.config.enabled !== undefined) {
        result.enabled = layer.config.enabled;
      }
      if (layer.config.description !== undefined) {
        result.description = layer.config.description;
      }
      if (layer.config.triggers !== undefined) {
        result.triggers = {
          ...result.triggers,
          ...layer.config.triggers
        };
      }
    }

    return result;
  }

  /**
   * 根据触发时机评估（Graph 场景）
   */
  private evaluateTriggerForGraph(
    config: CheckpointConfigContent,
    context: CheckpointConfigContext
  ): boolean {
    if (config.enabled === false) return false;

    // 根据触发时机检查对应的启用配置
    const triggerConfig = config.triggers || {};

    switch (context.triggerType) {
      case 'NODE_BEFORE_EXECUTE':
        return triggerConfig.nodeBeforeExecute !== false;
      case 'NODE_AFTER_EXECUTE':
        return triggerConfig.nodeAfterExecute !== false;
      case 'TOOL_BEFORE':
        return triggerConfig.toolBefore !== false;
      case 'TOOL_AFTER':
        return triggerConfig.toolAfter !== false;
      case 'HOOK':
      case 'TRIGGER':
        return true; // Hook 和 Trigger 默认启用
      default:
        return false;
    }
  }

  /**
   * 找到实际生效的配置来源
   */
  private findEffectiveSource(
    layers: GraphCheckpointConfigLayer[]
  ): CheckpointConfigSource {
    // 返回第一个明确指定了 enabled 的配置来源
    for (const layer of layers) {
      if (layer.config.enabled !== undefined) {
        return layer.source;
      }
    }
    return 'default';
  }

  /**
   * 构建检查点描述
   */
  private buildDescription(
    context: CheckpointConfigContext,
    config: CheckpointConfigContent
  ): string {
    if (config.description) {
      return config.description;
    }

    const triggerDesc: Record<GraphCheckpointTriggerType, string> = {
      'NODE_BEFORE_EXECUTE': 'Before node',
      'NODE_AFTER_EXECUTE': 'After node',
      'TOOL_BEFORE': 'Before tool',
      'TOOL_AFTER': 'After tool',
      'HOOK': 'Hook',
      'TRIGGER': 'Trigger'
    };

    return `${triggerDesc[context.triggerType]} checkpoint`;
  }
}

// 创建默认解析器实例
const defaultResolver = new GraphCheckpointConfigResolver();

/**
 * 构建节点检查点配置层
 *
 * @param globalConfig 全局检查点配置
 * @param node 节点配置
 * @param context 检查点配置上下文
 * @returns 配置层级列表（按优先级从高到低排序）
 */
export function buildNodeCheckpointLayers(
  globalConfig: CheckpointConfig | undefined,
  node: Node | undefined,
  context: CheckpointConfigContext
): GraphCheckpointConfigLayer[] {
  const layers: GraphCheckpointConfigLayer[] = [];

  // 1. Node 配置（优先级高）
  if (node) {
    const nodeEnabled = context.triggerType === 'NODE_BEFORE_EXECUTE'
      ? node.checkpointBeforeExecute
      : node.checkpointAfterExecute;

    if (nodeEnabled !== undefined) {
      layers.push({
        source: 'node',
        config: {
          enabled: nodeEnabled,
          description: `${context.triggerType === 'NODE_BEFORE_EXECUTE' ? 'Before' : 'After'} node: ${node.name}`
        }
      });
    }
  }

  // 2. Global 配置（优先级低）
  if (globalConfig) {
    const globalEnabled = context.triggerType === 'NODE_BEFORE_EXECUTE'
      ? globalConfig.checkpointBeforeNode
      : globalConfig.checkpointAfterNode;

    if (globalEnabled !== undefined) {
      layers.push({
        source: 'global',
        config: {
          enabled: globalEnabled,
          description: `Global checkpoint ${context.triggerType === 'NODE_BEFORE_EXECUTE' ? 'before' : 'after'} node`
        }
      });
    }
  }

  return layers;
}

/**
 * 解析检查点配置
 *
 * 便捷函数，使用默认解析器。
 *
 * @param layers 配置层级列表
 * @param context 检查点配置上下文
 * @returns 解析结果
 */
export function resolveCheckpointConfig(
  layers: GraphCheckpointConfigLayer[],
  context: CheckpointConfigContext
): CheckpointConfigResult {
  return defaultResolver.resolveGraphConfig(layers, context);
}

/**
 * 检查是否应该创建检查点
 */
export function shouldCreateCheckpoint(
  layers: GraphCheckpointConfigLayer[],
  context: CheckpointConfigContext
): boolean {
  return resolveCheckpointConfig(layers, context).shouldCreate;
}

/**
 * 获取检查点描述
 */
export function getCheckpointDescription(
  layers: GraphCheckpointConfigLayer[],
  context: CheckpointConfigContext
): string | undefined {
  return resolveCheckpointConfig(layers, context).description;
}
