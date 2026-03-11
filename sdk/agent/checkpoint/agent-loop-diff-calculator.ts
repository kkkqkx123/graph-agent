/**
 * Agent Loop 检查点差异计算器
 *
 * 计算两个快照之间的差异，生成增量数据
 */

import type { AgentLoopStateSnapshot, AgentLoopDelta } from '@modular-agent/types';
import type { LLMMessage } from '@modular-agent/types';

/**
 * Agent Loop 检查点差异计算器
 */
export class AgentLoopDiffCalculator {
  /**
   * 计算两个快照之间的差异
   * @param previous 前一个快照状态
   * @param current 当前快照状态
   * @param previousMessageCount 前一个快照的消息数量
   * @param currentMessages 当前消息列表
   * @returns 增量数据
   */
  calculateDelta(
    previous: AgentLoopStateSnapshot,
    current: AgentLoopStateSnapshot,
    previousMessageCount: number,
    currentMessages: LLMMessage[]
  ): AgentLoopDelta {
    const delta: AgentLoopDelta = {};

    // 1. 计算消息增量（只返回新增消息）
    const addedMessages = this.calculateMessageDelta(
      previousMessageCount,
      currentMessages
    );
    if (addedMessages.length > 0) {
      delta.addedMessages = addedMessages;
    }

    // 2. 计算状态变更
    if (previous.status !== current.status) {
      delta.statusChange = {
        from: previous.status,
        to: current.status
      };
    }

    // 3. 计算其他状态差异
    const otherChanges = this.calculateOtherChanges(previous, current);
    if (Object.keys(otherChanges).length > 0) {
      delta.otherChanges = otherChanges;
    }

    return delta;
  }

  /**
   * 计算消息增量（只返回新增消息）
   * @param previousMessageCount 前一个快照的消息数量
   * @param currentMessages 当前消息列表
   * @returns 新增的消息列表
   */
  private calculateMessageDelta(
    previousMessageCount: number,
    currentMessages: LLMMessage[]
  ): LLMMessage[] {
    // 消息通常是追加操作，返回新增部分
    if (currentMessages.length > previousMessageCount) {
      return currentMessages.slice(previousMessageCount);
    }
    return [];
  }

  /**
   * 计算其他状态差异
   * @param previous 前一个快照状态
   * @param current 当前快照状态
   * @returns 其他状态差异
   */
  private calculateOtherChanges(
    previous: AgentLoopStateSnapshot,
    current: AgentLoopStateSnapshot
  ): Record<string, { from: any; to: any }> {
    const otherChanges: Record<string, { from: any; to: any }> = {};

    // 检查工具调用次数变化
    if (previous.toolCallCount !== current.toolCallCount) {
      otherChanges['toolCallCount'] = {
        from: previous.toolCallCount,
        to: current.toolCallCount
      };
    }

    // 检查错误信息变化
    if (!this.deepEqual(previous.error, current.error)) {
      otherChanges['error'] = {
        from: previous.error,
        to: current.error
      };
    }

    // 检查开始时间变化
    if (previous.startTime !== current.startTime) {
      otherChanges['startTime'] = {
        from: previous.startTime,
        to: current.startTime
      };
    }

    // 检查结束时间变化
    if (previous.endTime !== current.endTime) {
      otherChanges['endTime'] = {
        from: previous.endTime,
        to: current.endTime
      };
    }

    return otherChanges;
  }

  /**
   * 深度比较两个值是否相等
   * @param a 第一个值
   * @param b 第二个值
   * @returns 是否相等
   */
  private deepEqual(a: any, b: any): boolean {
    // 处理简单类型
    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (typeof a !== 'object' || typeof b !== 'object') return a === b;

    // 处理 Map 类型
    if (a instanceof Map && b instanceof Map) {
      if (a.size !== b.size) return false;
      for (const [key, value] of a) {
        if (!b.has(key) || !this.deepEqual(value, b.get(key))) {
          return false;
        }
      }
      return true;
    }

    // 处理 Set 类型
    if (a instanceof Set && b instanceof Set) {
      if (a.size !== b.size) return false;
      for (const value of a) {
        if (!b.has(value)) {
          return false;
        }
      }
      return true;
    }

    // 处理数组
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => this.deepEqual(item, b[index]));
    }

    // 处理普通对象
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    return keysA.every(key => {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      return this.deepEqual(a[key], b[key]);
    });
  }
}