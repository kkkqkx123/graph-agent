/**
 * Agent Loop 检查点配置解析器
 *
 * 基于 sdk/core/checkpoint 通用框架实现 Agent Loop 特定的配置解析逻辑
 */

import {
  CheckpointConfigResolver,
  type ConfigLayer
} from '../../core/checkpoint/index.js';
import type {
  AgentLoopCheckpointConfig,
  CheckpointConfigResult,
  AgentLoopCheckpointConfigContext,
  AgentLoopCheckpointConfigLayer,
  CheckpointConfigSource,
  AgentLoopCheckpointTriggerType
} from '@modular-agent/types';

/**
 * Agent Loop 检查点配置解析器
 *
 * 扩展通用配置解析器，添加 Agent Loop 特定的配置层级。
 *
 * 配置优先级（从高到低）：
 * 1. runtime - 运行时传入
 * 2. agent - Agent Loop 配置
 * 3. global - 全局配置
 * 4. default - 默认值
 */
export class AgentLoopCheckpointResolver extends CheckpointConfigResolver {
  /**
   * 解析 Agent Loop 检查点配置
   *
   * @param layers 配置层级列表（按优先级从高到低排序，索引 0 优先级最高）
   * @param context 检查点配置上下文
   * @returns 解析结果
   */
  resolveAgentConfig(
    layers: AgentLoopCheckpointConfigLayer[],
    context: AgentLoopCheckpointConfigContext
  ): CheckpointConfigResult {
    // 1. 合并配置（高优先级覆盖低优先级）
    const mergedConfig = this.mergeConfigs(layers);

    // 2. 根据触发时机判断是否启用
    const shouldCreate = this.evaluateTrigger(mergedConfig, context);

    // 3. 找到实际生效的配置来源
    const effectiveSource = shouldCreate
      ? this.findEffectiveSource(layers)
      : 'default';

    return {
      shouldCreate,
      description: this.buildDescription(context),
      effectiveSource,
      triggerType: context.triggerType
    };
  }

  /**
   * 合并配置层
   */
  private mergeConfigs(
    layers: AgentLoopCheckpointConfigLayer[]
  ): AgentLoopCheckpointConfig {
    const result: AgentLoopCheckpointConfig = {};

    for (const layer of layers) {
      if (layer.config.enabled !== undefined) {
        result.enabled = layer.config.enabled;
      }
      if (layer.config.interval !== undefined) {
        result.interval = layer.config.interval;
      }
      if (layer.config.onErrorOnly !== undefined) {
        result.onErrorOnly = layer.config.onErrorOnly;
      }
      if (layer.config.deltaStorage !== undefined) {
        result.deltaStorage = layer.config.deltaStorage;
      }
    }

    return result;
  }

  /**
   * 根据触发时机评估是否创建检查点
   */
  private evaluateTrigger(
    config: AgentLoopCheckpointConfig,
    context: AgentLoopCheckpointConfigContext
  ): boolean {
    // 全局禁用
    if (config.enabled === false) return false;

    // 仅在错误时创建
    if (config.onErrorOnly && !context.hasError) return false;

    // 检查间隔
    if (config.interval && config.interval > 1) {
      return context.currentIteration % config.interval === 0;
    }

    return true;
  }

  /**
   * 找到实际生效的配置来源
   */
  private findEffectiveSource(
    layers: AgentLoopCheckpointConfigLayer[]
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
    context: AgentLoopCheckpointConfigContext
  ): string {
    if (context.triggerType === 'ERROR') {
      return 'Error checkpoint';
    }
    return `Iteration ${context.currentIteration} checkpoint`;
  }
}
