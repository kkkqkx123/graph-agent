/**
 * 异步输出Stream
 * 基于队列的异步批量处理，不阻塞主线程
 */

import type { LogStream, LogEntry, StreamOptions } from '../types';

/**
 * 日志队列项
 */
interface QueueItem {
  entry: LogEntry;
  callback?: () => void;
}

/**
 * AsyncStream类
 */
export class AsyncStream implements LogStream {
  private targetStream: LogStream;
  private queue: QueueItem[] = [];
  private batchSize: number;
  private isProcessing: boolean = false;
  private flushTimer?: NodeJS.Timeout;

  constructor(targetStream: LogStream, options: StreamOptions = {}) {
    this.targetStream = targetStream;
    this.batchSize = options.batchSize ?? 10;
  }

  /**
   * 写入日志条目
   */
  write(entry: LogEntry): void {
    this.queue.push({ entry });
    
    // 如果队列达到批量大小，立即处理
    if (this.queue.length >= this.batchSize) {
      this.processQueue();
    } else {
      // 否则延迟处理
      this.scheduleFlush();
    }
  }

  /**
   * 安排延迟刷新
   */
  private scheduleFlush(): void {
    if (this.flushTimer) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.processQueue();
      this.flushTimer = undefined;
    }, 100); // 100ms延迟
  }

  /**
   * 处理队列
   */
  private processQueue(): void {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // 取出一批日志
    const batch = this.queue.splice(0, this.batchSize);

    // 异步处理
    setImmediate(() => {
      batch.forEach(item => {
        this.targetStream.write(item.entry);
      });

      this.isProcessing = false;

      // 如果还有剩余，继续处理
      if (this.queue.length > 0) {
        this.processQueue();
      }
    });
  }

  /**
   * 刷新缓冲区
   */
  flush(callback?: () => void): void {
    // 清除定时器
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    // 处理所有剩余日志
    const processAll = () => {
      if (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.batchSize);
        batch.forEach(item => {
          this.targetStream.write(item.entry);
        });

        if (this.queue.length > 0) {
          setImmediate(processAll);
          return;
        }
      }

      // 刷新目标stream
      if (this.targetStream.flush) {
        this.targetStream.flush(callback);
      } else if (callback) {
        setImmediate(callback);
      }
    };

    processAll();
  }

  /**
   * 结束stream
   */
  end(): void {
    this.flush(() => {
      if (this.targetStream.end) {
        this.targetStream.end();
      }
    });
  }

  /**
   * 事件监听
   */
  on(event: string, handler: (...args: any[]) => void): void {
    if (this.targetStream.on) {
      this.targetStream.on(event, handler);
    }
  }

  /**
   * 移除事件监听
   */
  off(event: string, handler: (...args: any[]) => void): void {
    if (this.targetStream.off) {
      this.targetStream.off(event, handler);
    }
  }
}

/**
 * 创建异步stream
 */
export function createAsyncStream(targetStream: LogStream, options: StreamOptions = {}): LogStream {
  return new AsyncStream(targetStream, options);
}