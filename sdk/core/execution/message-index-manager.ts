/**
 * 消息索引管理器
 * 管理消息索引和批次信息，支持多次压缩和回退
 *
 * 核心职责：
 * 1. 维护消息索引映射关系
 * 2. 管理批次边界和当前批次
 * 3. 提供索引计算和过滤功能
 * 4. 支持批次回退操作
 */

import type { LLMMessage, MessageMarkMap } from '../../types/llm';
import { ExecutionError } from '../../types/errors';

/**
 * 消息索引管理器类
 */
export class MessageIndexManager {
  private markMap: MessageMarkMap;

  constructor() {
    // 初始化标记映射
    this.markMap = {
      originalIndices: [],
      batchBoundaries: [0],  // 第0个索引作为第0个batch的边界
      boundaryToBatch: [0],
      currentBatch: 0
    };
  }

  /**
   * 添加消息索引
   * @param index 消息索引
   */
  addIndex(index: number): void {
    this.markMap.originalIndices.push(index);
  }

  /**
   * 获取标记映射
   * @returns 标记映射
   */
  getMarkMap(): MessageMarkMap {
    return { ...this.markMap };
  }

  /**
   * 设置标记映射
   * @param markMap 标记映射
   */
  setMarkMap(markMap: MessageMarkMap): void {
    this.markMap = { ...markMap };
  }

  /**
   * 设置原始索引数组
   * @param indices 索引数组
   */
  setOriginalIndices(indices: number[]): void {
    this.markMap.originalIndices = [...indices];
  }

  /**
   * 获取当前批次的消息索引
   * @returns 当前批次的消息索引数组
   */
  getCurrentBatchIndices(): number[] {
    const currentBoundaryIndex = this.markMap.boundaryToBatch.indexOf(this.markMap.currentBatch);
    if (currentBoundaryIndex === -1) {
      throw new ExecutionError(`Current batch ${this.markMap.currentBatch} not found in boundaryToBatch`);
    }
    const boundary = this.markMap.batchBoundaries[currentBoundaryIndex];
    
    if (boundary === undefined) {
      throw new ExecutionError(`Boundary at index ${currentBoundaryIndex} is undefined`);
    }
    
    return this.markMap.originalIndices.filter(index => index >= boundary);
  }

  /**
   * 获取未压缩的消息索引
   * @returns 未压缩的消息索引数组
   */
  getUncompressedIndices(): number[] {
    return this.getCurrentBatchIndices();
  }

  /**
   * 判断消息是否被修改（压缩）
   * @param originalIndex 原始索引
   * @returns 是否被修改
   */
  isModified(originalIndex: number): boolean {
    const currentBoundaryIndex = this.markMap.boundaryToBatch.indexOf(this.markMap.currentBatch);
    if (currentBoundaryIndex === -1) {
      throw new ExecutionError(`Current batch ${this.markMap.currentBatch} not found in boundaryToBatch`);
    }
    const boundary = this.markMap.batchBoundaries[currentBoundaryIndex];
    if (boundary === undefined) {
      throw new ExecutionError(`Boundary at index ${currentBoundaryIndex} is undefined`);
    }
    return originalIndex < boundary;
  }

  /**
   * 获取消息在当前批次中的索引
   * @param originalIndex 原始索引
   * @returns 批次中的索引
   */
  getBatchIndex(originalIndex: number): number {
    const currentBoundaryIndex = this.markMap.boundaryToBatch.indexOf(this.markMap.currentBatch);
    if (currentBoundaryIndex === -1) {
      throw new ExecutionError(`Current batch ${this.markMap.currentBatch} not found in boundaryToBatch`);
    }
    const boundary = this.markMap.batchBoundaries[currentBoundaryIndex];
    if (boundary === undefined) {
      throw new ExecutionError(`Boundary at index ${currentBoundaryIndex} is undefined`);
    }
    return originalIndex - boundary;
  }

  /**
   * 根据索引过滤消息
   * @param messages 消息数组
   * @param indices 要保留的索引数组
   * @returns 过滤后的消息数组
   */
  filterMessages(messages: LLMMessage[], indices: number[]): LLMMessage[] {
    return indices.map(index => messages[index]).filter((msg): msg is LLMMessage => msg !== undefined);
  }

  /**
   * 开始新批次
   * @param boundaryIndex 边界索引
   */
  startNewBatch(boundaryIndex: number): void {
    // 验证边界索引
    if (boundaryIndex < 0 || boundaryIndex > this.markMap.originalIndices.length) {
      throw new ExecutionError(`Invalid boundary index: ${boundaryIndex}`);
    }

    // 添加新边界
    this.markMap.batchBoundaries.push(boundaryIndex);
    
    // 分配新批次号
    const newBatch = this.markMap.currentBatch + 1;
    this.markMap.boundaryToBatch.push(newBatch);
    this.markMap.currentBatch = newBatch;
  }

  /**
   * 回退到指定批次
   * @param targetBatch 目标批次号
   */
  rollbackToBatch(targetBatch: number): void {
    // 验证目标批次
    if (!this.markMap.boundaryToBatch.includes(targetBatch)) {
      throw new ExecutionError(`Target batch ${targetBatch} not found`);
    }

    // 找到目标批次的边界索引
    const targetBoundaryIndex = this.markMap.boundaryToBatch.indexOf(targetBatch);
    
    // 移除目标批次之后的边界
    this.markMap.batchBoundaries = this.markMap.batchBoundaries.slice(0, targetBoundaryIndex + 1);
    this.markMap.boundaryToBatch = this.markMap.boundaryToBatch.slice(0, targetBoundaryIndex + 1);
    
    // 设置当前批次
    this.markMap.currentBatch = targetBatch;
  }

  /**
   * 标记消息为已压缩
   * @param indices 要标记的消息索引数组
   */
  markCompressed(indices: number[]): void {
    // 找到当前批次对应的边界
    const currentBoundaryIndex = this.markMap.boundaryToBatch.indexOf(this.markMap.currentBatch);
    if (currentBoundaryIndex === -1) {
      throw new ExecutionError(`Current batch ${this.markMap.currentBatch} not found in boundaryToBatch`);
    }
    const boundary = this.markMap.batchBoundaries[currentBoundaryIndex];
    
    if (boundary === undefined) {
      throw new ExecutionError(`Boundary at index ${currentBoundaryIndex} is undefined`);
    }
    
    // 标记索引小于边界的消息为已修改
    for (const index of indices) {
      if (index < boundary) {
        // 标记为已修改（通过边界机制自动处理）
        // 实际上不需要额外操作，因为边界已经确定了哪些消息被压缩
      }
    }
  }

  /**
   * 克隆索引管理器
   * @returns 克隆的索引管理器
   */
  clone(): MessageIndexManager {
    const cloned = new MessageIndexManager();
    cloned.setMarkMap(this.getMarkMap());
    return cloned;
  }

  /**
   * 重置索引管理器
   */
  reset(): void {
    this.markMap = {
      originalIndices: [],
      batchBoundaries: [0],
      boundaryToBatch: [0],
      currentBatch: 0
    };
  }

  /**
   * 检查一致性
   * @returns 是否一致
   */
  checkConsistency(): boolean {
    // 检查边界数组长度
    if (this.markMap.batchBoundaries.length !== this.markMap.boundaryToBatch.length) {
      return false;
    }
    
    // 检查边界索引顺序
    for (let i = 1; i < this.markMap.batchBoundaries.length; i++) {
      const current = this.markMap.batchBoundaries[i];
      const previous = this.markMap.batchBoundaries[i - 1];
      if (current === undefined || previous === undefined || current <= previous) {
        return false;
      }
    }
    
    // 检查当前批次
    if (!this.markMap.boundaryToBatch.includes(this.markMap.currentBatch)) {
      return false;
    }
    
    return true;
  }
}