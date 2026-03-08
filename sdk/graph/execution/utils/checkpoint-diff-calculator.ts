/**
 * 检查点差异计算器
 * 用于计算两个检查点之间的差异，生成增量数据
 */

import type { ThreadStateSnapshot } from '@modular-agent/types';
import type { CheckpointDelta } from '@modular-agent/types';
import type { NodeExecutionResult } from '@modular-agent/types';

/**
 * 检查点差异计算器
 */
export class CheckpointDiffCalculator {
  /**
   * 计算两个检查点之间的差异
   * @param previous 前一个检查点状态
   * @param current 当前检查点状态
   * @returns 增量数据
   */
  calculateDelta(
    previous: ThreadStateSnapshot,
    current: ThreadStateSnapshot
  ): CheckpointDelta {
    const delta: CheckpointDelta = {};

    // 1. 计算消息差异
    const addedMessages = this.calculateMessageDelta(
      previous.conversationState.messages,
      current.conversationState.messages
    );
    if (addedMessages.length > 0) {
      delta.addedMessages = addedMessages;
    }

    // 2. 计算变量差异
    const varDiff = this.calculateVariableDelta(
      previous.variables,
      current.variables
    );
    if (varDiff.added.length > 0) {
      delta.addedVariables = varDiff.added;
    }
    if (varDiff.modified.size > 0) {
      delta.modifiedVariables = varDiff.modified;
    }

    // 3. 计算节点结果差异
    const addedNodeResults = this.calculateNodeResultsDelta(
      previous.nodeResults,
      current.nodeResults
    );
    if (Object.keys(addedNodeResults).length > 0) {
      delta.addedNodeResults = addedNodeResults;
    }

    // 4. 计算状态变更
    if (previous.status !== current.status) {
      delta.statusChange = { from: previous.status, to: current.status };
    }

    // 5. 计算当前节点变更
    if (previous.currentNodeId !== current.currentNodeId) {
      delta.currentNodeChange = {
        from: previous.currentNodeId,
        to: current.currentNodeId
      };
    }

    // 6. 计算其他状态差异
    const otherChanges = this.calculateOtherChanges(previous, current);
    if (Object.keys(otherChanges).length > 0) {
      delta.otherChanges = otherChanges;
    }

    return delta;
  }

  /**
   * 计算消息差异（只返回新增消息）
   * @param previousMessages 前一个检查点的消息列表
   * @param currentMessages 当前检查点的消息列表
   * @returns 新增的消息列表
   */
  private calculateMessageDelta(
    previousMessages: any[],
    currentMessages: any[]
  ): any[] {
    // 消息通常是追加操作，返回新增部分
    if (currentMessages.length > previousMessages.length) {
      return currentMessages.slice(previousMessages.length);
    }
    return [];
  }

  /**
   * 计算变量差异
   * @param previousVars 前一个检查点的变量列表
   * @param currentVars 当前检查点的变量列表
   * @returns 新增和修改的变量
   */
  private calculateVariableDelta(
    previousVars: any[],
    currentVars: any[]
  ): { added: any[]; modified: Map<string, any> } {
    const added: any[] = [];
    const modified = new Map<string, any>();

    const prevVarMap = new Map(previousVars.map(v => [v.name, v]));

    for (const currentVar of currentVars) {
      const prevVar = prevVarMap.get(currentVar.name);
      if (!prevVar) {
        added.push(currentVar);
      } else if (!this.deepEqual(prevVar.value, currentVar.value)) {
        modified.set(currentVar.name, currentVar.value);
      }
    }

    return { added, modified };
  }

  /**
   * 计算节点结果差异
   * @param previous 前一个检查点的节点结果
   * @param current 当前检查点的节点结果
   * @returns 新增的节点结果
   */
  private calculateNodeResultsDelta(
    previous: Record<string, NodeExecutionResult>,
    current: Record<string, NodeExecutionResult>
  ): Record<string, NodeExecutionResult> {
    const added: Record<string, NodeExecutionResult> = {};

    for (const [nodeId, result] of Object.entries(current)) {
      if (!previous[nodeId]) {
        added[nodeId] = result;
      }
    }

    return added;
  }

  /**
   * 计算其他状态差异
   * @param previous 前一个检查点状态
   * @param current 当前检查点状态
   * @returns 其他状态差异
   */
  private calculateOtherChanges(
    previous: ThreadStateSnapshot,
    current: ThreadStateSnapshot
  ): Record<string, { from: any; to: any }> {
    const otherChanges: Record<string, { from: any; to: any }> = {};

    // 检查输入变化
    if (!this.deepEqual(previous.input, current.input)) {
      otherChanges['input'] = { from: previous.input, to: current.input };
    }

    // 检查输出变化
    if (!this.deepEqual(previous.output, current.output)) {
      otherChanges['output'] = { from: previous.output, to: current.output };
    }

    // 检查错误变化
    if (!this.deepEqual(previous.errors, current.errors)) {
      otherChanges['errors'] = { from: previous.errors, to: current.errors };
    }

    // 检查变量作用域变化
    if (!this.deepEqual(previous.variableScopes, current.variableScopes)) {
      otherChanges['variableScopes'] = { from: previous.variableScopes, to: current.variableScopes };
    }

    // 检查 tokenUsage 变化
    if (!this.deepEqual(
      previous.conversationState.tokenUsage,
      current.conversationState.tokenUsage
    )) {
      otherChanges['tokenUsage'] = {
        from: previous.conversationState.tokenUsage,
        to: current.conversationState.tokenUsage
      };
    }

    // 检查 currentRequestUsage 变化
    if (!this.deepEqual(
      previous.conversationState.currentRequestUsage,
      current.conversationState.currentRequestUsage
    )) {
      otherChanges['currentRequestUsage'] = {
        from: previous.conversationState.currentRequestUsage,
        to: current.conversationState.currentRequestUsage
      };
    }

    // 检查 markMap 变化
    if (!this.deepEqual(
      previous.conversationState.markMap,
      current.conversationState.markMap
    )) {
      otherChanges['markMap'] = {
        from: previous.conversationState.markMap,
        to: current.conversationState.markMap
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
        if (!b.has(value)) return false;
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
