/**
 * 类型索引管理器
 * 管理按消息类型分组的索引，支持高效的类型查询和过滤
 *
 * 核心职责：
 * 1. 维护按类型分组的消息索引映射
 * 2. 提供类型相关的查询方法
 * 3. 支持索引的添加、删除和范围查询
 */

import { MessageRole } from '@modular-agent/types';

/**
 * 类型索引管理器类
 */
export class TypeIndexManager {
  /** 按类型分组的索引映射 */
  private typeIndices: Map<MessageRole, number[]> = new Map();
  
  /** 全局消息总数 */
  private totalMessages: number = 0;

  constructor() {
    // 初始化所有类型的索引数组
    this.typeIndices.set(MessageRole.SYSTEM, []);
    this.typeIndices.set(MessageRole.USER, []);
    this.typeIndices.set(MessageRole.ASSISTANT, []);
    this.typeIndices.set(MessageRole.TOOL, []);
  }

  /**
   * 添加消息索引
   * @param role 消息角色
   * @param index 消息索引
   */
  addIndex(role: MessageRole, index: number): void {
    const indices = this.typeIndices.get(role);
    if (!indices) {
      this.typeIndices.set(role, [index]);
    } else {
      indices.push(index);
    }
    this.totalMessages++;
  }

  /**
   * 获取指定类型的索引列表
   * @param role 消息角色
   * @returns 索引数组的副本
   */
  getIndicesByRole(role: MessageRole): number[] {
    const indices = this.typeIndices.get(role);
    return indices ? [...indices] : [];
  }

  /**
   * 获取指定类型的最近N条消息索引
   * @param role 消息角色
   * @param n 消息数量
   * @returns 索引数组
   */
  getRecentIndicesByRole(role: MessageRole, n: number): number[] {
    const indices = this.typeIndices.get(role);
    if (!indices) {
      return [];
    }
    return indices.slice(-n);
  }

  /**
   * 获取指定类型的索引范围
   * @param role 消息角色
   * @param start 起始位置（在类型数组中的位置）
   * @param end 结束位置（在类型数组中的位置）
   * @returns 索引数组
   */
  getRangeIndicesByRole(role: MessageRole, start: number, end: number): number[] {
    const indices = this.typeIndices.get(role);
    if (!indices) {
      return [];
    }
    return indices.slice(start, end);
  }

  /**
   * 获取指定类型的消息数量
   * @param role 消息角色
   * @returns 消息数量
   */
  getCountByRole(role: MessageRole): number {
    const indices = this.typeIndices.get(role);
    return indices ? indices.length : 0;
  }

  /**
   * 获取所有类型索引
   * @returns 类型索引映射的副本
   */
  getAllTypeIndices(): Map<MessageRole, number[]> {
    const result = new Map<MessageRole, number[]>();
    for (const [role, indices] of this.typeIndices) {
      result.set(role, [...indices]);
    }
    return result;
  }

  /**
   * 获取全局消息总数
   * @returns 消息总数
   */
  getTotalCount(): number {
    return this.totalMessages;
  }

  /**
   * 移除指定的索引
   * @param indices 要移除的索引数组
   */
  removeIndices(indices: number[]): void {
    const indexSet = new Set(indices);
    for (const [role, roleIndices] of this.typeIndices) {
      const filtered = roleIndices.filter(idx => !indexSet.has(idx));
      this.typeIndices.set(role, filtered);
    }
    this.totalMessages = this.calculateTotalCount();
  }

  /**
   * 保留指定的索引
   * @param indices 要保留的索引数组
   */
  keepIndices(indices: number[]): void {
    const indexSet = new Set(indices);
    for (const [role, roleIndices] of this.typeIndices) {
      const filtered = roleIndices.filter(idx => indexSet.has(idx));
      this.typeIndices.set(role, filtered);
    }
    this.totalMessages = this.calculateTotalCount();
  }

  /**
   * 计算总消息数
   * @returns 总消息数
   */
  private calculateTotalCount(): number {
    let total = 0;
    for (const indices of this.typeIndices.values()) {
      total += indices.length;
    }
    return total;
  }

  /**
   * 克隆类型索引管理器
   * @returns 克隆的类型索引管理器
   */
  clone(): TypeIndexManager {
    const cloned = new TypeIndexManager();
    cloned.typeIndices = this.getAllTypeIndices();
    cloned.totalMessages = this.totalMessages;
    return cloned;
  }

  /**
   * 重置类型索引管理器
   */
  reset(): void {
    this.typeIndices.set(MessageRole.SYSTEM, []);
    this.typeIndices.set(MessageRole.USER, []);
    this.typeIndices.set(MessageRole.ASSISTANT, []);
    this.typeIndices.set(MessageRole.TOOL, []);
    this.totalMessages = 0;
  }

  /**
   * 检查一致性
   * @returns 是否一致
   */
  checkConsistency(): boolean {
    // 检查总消息数是否正确
    const calculatedTotal = this.calculateTotalCount();
    if (calculatedTotal !== this.totalMessages) {
      return false;
    }

    // 检查索引是否按顺序排列
    for (const [role, indices] of this.typeIndices) {
      for (let i = 1; i < indices.length; i++) {
        const current = indices[i];
        const previous = indices[i - 1];
        if (current !== undefined && previous !== undefined && current <= previous) {
          return false;
        }
      }
    }

    return true;
  }
}