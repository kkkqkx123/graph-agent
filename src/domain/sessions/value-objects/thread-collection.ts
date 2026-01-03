import { ValueObject } from '../../common/value-objects';
import { Thread } from '../../threads/entities/thread';

/**
 * 线程集合值对象
 *
 * 职责：管理会话中的线程集合
 */
export class ThreadCollection extends ValueObject<Map<string, Thread>> {
  public validate(): void {
    // 线程集合不需要特殊验证
  }

  [Symbol.iterator](): IterableIterator<[string, Thread]> {
    return this.props.entries();
  }

  entries(): IterableIterator<[string, Thread]> {
    return this.props.entries();
  }

  keys(): IterableIterator<string> {
    return this.props.keys();
  }

  values(): IterableIterator<Thread> {
    return this.props.values();
  }

  /**
   * 创建空的线程集合
   * @returns 线程集合实例
   */
  public static empty(): ThreadCollection {
    return new ThreadCollection(new Map());
  }

  /**
   * 从现有映射创建线程集合
   * @param threads 线程映射
   * @returns 线程集合实例
   */
  public static fromMap(threads: Map<string, Thread>): ThreadCollection {
    return new ThreadCollection(new Map(threads));
  }

  /**
   * 添加线程
   * @param thread 线程实例
   * @returns 新的线程集合实例
   */
  public add(thread: Thread): ThreadCollection {
    const newThreads = new Map(this.props);
    newThreads.set(thread.threadId.toString(), thread);
    return new ThreadCollection(newThreads);
  }

  /**
   * 移除线程
   * @param threadId 线程ID
   * @returns 新的线程集合实例
   */
  public remove(threadId: string): ThreadCollection {
    const newThreads = new Map(this.props);
    newThreads.delete(threadId);
    return new ThreadCollection(newThreads);
  }

  /**
   * 获取线程
   * @param threadId 线程ID
   * @returns 线程或null
   */
  public get(threadId: string): Thread | null {
    return this.props.get(threadId) || null;
  }

  /**
   * 检查线程是否存在
   * @param threadId 线程ID
   * @returns 是否存在
   */
  public has(threadId: string): boolean {
    return this.props.has(threadId);
  }

  /**
   * 获取所有线程
   * @returns 线程数组
   */
  public getAll(): Thread[] {
    return Array.from(this.props.values());
  }

  /**
   * 获取线程数量
   * @returns 线程数量
   */
  public get size(): number {
    return this.props.size;
  }

  /**
   * 检查是否为空
   * @returns 是否为空
   */
  public isEmpty(): boolean {
    return this.props.size === 0;
  }

  /**
   * 获取活跃线程数量
   * @returns 活跃线程数量
   */
  public getActiveThreadCount(): number {
    return this.getAll().filter(thread => thread.status.isActive()).length;
  }

  /**
   * 获取已完成线程数量
   * @returns 已完成线程数量
   */
  public getCompletedThreadCount(): number {
    return this.getAll().filter(thread => thread.status.isCompleted()).length;
  }

  /**
   * 获取失败线程数量
   * @returns 失败线程数量
   */
  public getFailedThreadCount(): number {
    return this.getAll().filter(thread => thread.status.isFailed()).length;
  }

  /**
   * 检查是否所有线程都已完成
   * @returns 是否所有线程都已完成
   */
  public areAllThreadsCompleted(): boolean {
    if (this.isEmpty()) {
      return true;
    }

    return this.getAll().every(
      thread => thread.status.isCompleted() || thread.status.isFailed() || thread.status.isCancelled()
    );
  }

  /**
   * 检查是否有活跃线程
   * @returns 是否有活跃线程
   */
  public hasActiveThreads(): boolean {
    return this.getActiveThreadCount() > 0;
  }

  /**
   * 转换为映射
   * @returns 线程映射
   */
  public toMap(): Map<string, Thread> {
    return new Map(this.props);
  }

  /**
   * 过滤线程
   * @param predicate 过滤条件
   * @returns 过滤后的线程集合
   */
  public filter(predicate: (thread: Thread) => boolean): ThreadCollection {
    const filteredThreads = new Map(
      Array.from(this.props.entries()).filter(([_, thread]) => predicate(thread))
    );
    return new ThreadCollection(filteredThreads);
  }
}