import { ID } from '../../common/value-objects/id';
import { ThreadExecutor } from '../../threads/entities/thread-executor';
import { SessionConfig } from '../value-objects/session-config';

/**
 * 线程池接口
 */
export interface IThreadPool {
  /**
   * 添加线程
   */
  addThread(thread: ThreadExecutor): void;

  /**
   * 移除线程
   */
  removeThread(thread: ThreadExecutor): void;

  /**
   * 获取线程
   */
  getThread(threadId: ID): ThreadExecutor | undefined;

  /**
   * 获取大小
   */
  getSize(): number;

  /**
   * 获取活跃线程数
   */
  getActiveCount(): number;

  /**
   * 获取空闲线程数
   */
  getIdleCount(): number;

  /**
   * 验证
   */
  validate(): void;
}

/**
 * 线程池实现类
 */
export class ThreadPoolImpl implements IThreadPool {
  private threads: Map<string, ThreadExecutor> = new Map();
  private maxSize: number;

  private constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  /**
   * 创建线程池
   */
  public static create(maxSize: number): IThreadPool {
    return new ThreadPoolImpl(maxSize);
  }

  public addThread(thread: ThreadExecutor): void {
    if (this.threads.size >= this.maxSize) {
      throw new Error(`Thread pool has reached maximum size of ${this.maxSize}`);
    }
    this.threads.set(thread.threadId.toString(), thread);
  }

  public removeThread(thread: ThreadExecutor): void {
    this.threads.delete(thread.threadId.toString());
  }

  public getThread(threadId: ID): ThreadExecutor | undefined {
    return this.threads.get(threadId.toString());
  }

  public getSize(): number {
    return this.threads.size;
  }

  public getActiveCount(): number {
    let count = 0;
    for (const thread of this.threads.values()) {
      if (thread.status.isActive()) {
        count++;
      }
    }
    return count;
  }

  public getIdleCount(): number {
    return this.getSize() - this.getActiveCount();
  }

  public validate(): void {
    if (this.maxSize <= 0) {
      throw new Error('Max size must be greater than 0');
    }
  }
}