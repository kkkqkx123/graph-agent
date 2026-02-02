/**
 * LifecycleCapable - 统一的生命周期管理能力接口
 * 
 * 为所有有状态的Manager提供统一的生命周期管理标准
 * 
 * 核心职责：
 * 1. 定义标准的初始化方法
 * 2. 定义标准的资源清理方法
 * 3. 定义标准的快照创建和恢复方法
 * 
 * 设计原则：
 * - 统一接口：所有有状态的Manager都应实现此接口
 * - 资源管理：确保资源得到正确释放
 * - 状态持久化：支持检查点功能
 * 
 * 命名说明：
 * - "Capable" 表示组件具备生命周期管理的能力
 * - 不是管理其他组件，而是自己管理自己的生命周期
 * - 与 ThreadLifecycleManager 区分明显，避免混淆
 */

/**
 * 生命周期管理能力接口
 * 
 * 所有有状态的Manager都应该实现此接口，以确保：
 * 1. 统一的初始化和清理机制
 * 2. 标准的资源释放流程
 * 3. 一致的快照和恢复能力
 */
export interface LifecycleCapable<TSnapshot = any> {
  /**
   * 初始化管理器
   * 
   * 在创建实例后调用，用于初始化内部状态和资源
   * 
   * @throws Error 初始化失败时抛出异常
   */
  initialize?(): void | Promise<void>;

  /**
   * 清理资源
   * 
   * 在不再需要管理器时调用，用于释放所有占用的资源
   * 包括但不限于：
   * - 清空内部状态
   * - 释放内存
   * - 关闭连接
   * - 取消定时器
   * 
   * @throws Error 清理失败时抛出异常
   */
  cleanup(): void | Promise<void>;

  /**
   * 创建状态快照
   * 
   * 用于保存当前状态的完整副本，支持检查点功能
   * 
   * @returns 状态快照
   * @throws Error 创建快照失败时抛出异常
   */
  createSnapshot(): TSnapshot;

  /**
   * 从快照恢复状态
   * 
   * 从之前保存的快照中恢复状态
   * 
   * @param snapshot 状态快照
   * @throws Error 恢复失败时抛出异常
   */
  restoreFromSnapshot(snapshot: TSnapshot): void | Promise<void>;

  /**
   * 检查是否已初始化
   * 
   * @returns 是否已初始化
   */
  isInitialized?(): boolean;
}