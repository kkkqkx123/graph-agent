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
  AgentLoopCheckpointConfigContext
} from '@modular-agent/types';

/**
 * Agent Loop 检查点配置解析器
 *
 * 扩展通用配置解析器，添加 Agent Loop 特定的配置层级。
 *
 * 配置优先级（从高到低）：
 * 1. Loop 级配置
 * 2. 全局配置
 */
export class AgentLoopCheckpointResolver extends CheckpointConfigResolver {
  /**
   * 解析 Agent Loop 检查点配置
   *
   * @param globalConfig 全局检查点配置
   * @param loopConfig Loop 级检查点配置
   * @param context 检查点配置上下文
   * @returns 解析结果
   */
  resolveAgentConfig(
    globalConfig: AgentLoopCheckpointConfig,
    loopConfig: AgentLoopCheckpointConfig,
    context: AgentLoopCheckpointConfigContext
  ): CheckpointConfigResult {
    const layers: ConfigLayer[] = [];

    // 1. Loop 配置（最高优先级）
    if (loopConfig.enabled !== undefined) {
      const shouldCreate = this.shouldCreateAtIteration(
        loopConfig.enabled,
        loopConfig.interval,
        context.currentIteration
      );
      layers.push(
        this.createLayer('loop', 100, {
          enabled: shouldCreate,
          description: `Loop checkpoint at iteration ${context.currentIteration}`
        })
      );
    }

    // 2. 全局配置
    if (globalConfig.enabled !== undefined) {
      // 如果配置了 onErrorOnly，只在出错时创建
      if (!globalConfig.onErrorOnly || context.hasError) {
        const shouldCreate = this.shouldCreateAtIteration(
          globalConfig.enabled,
          globalConfig.interval,
          context.currentIteration
        );
        layers.push(
          this.createLayer('global', 10, {
            enabled: shouldCreate,
            description: `Global checkpoint at iteration ${context.currentIteration}`
          })
        );
      }
    }

    const result = this.resolve(layers);

    return {
      shouldCreate: result.shouldCreate,
      description: result.description,
      source: result.source as any
    };
  }

  /**
   * 判断是否应该在当前迭代创建检查点
   * @param enabled 是否启用检查点
   * @param interval 检查点间隔
   * @param currentIteration 当前迭代次数
   * @returns 是否创建检查点
   */
  private shouldCreateAtIteration(
    enabled: boolean,
    interval: number = 1,
    currentIteration: number
  ): boolean {
    if (!enabled) return false;
    // 每隔 interval 次迭代创建一次
    return currentIteration % interval === 0;
  }
}