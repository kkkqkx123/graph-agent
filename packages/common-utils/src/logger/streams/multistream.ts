/**
 * 多目标输出Stream
 * 支持同时输出到多个stream，支持级别过滤和去重
 */

import type { LogStream, LogEntry, StreamEntry, MultistreamOptions, LogLevel } from '../types';
import { LOG_LEVEL_PRIORITY } from '../types';

/**
 * Multistream类
 */
export class Multistream implements LogStream {
  private streams: StreamEntry[] = [];
  private dedupe: boolean;
  private streamLevels: Record<string, number>;
  private nextId: number = 0;

  constructor(streams: StreamEntry[] = [], options: MultistreamOptions = {}) {
    this.dedupe = options.dedupe ?? false;
    this.streamLevels = { ...LOG_LEVEL_PRIORITY, ...options.levels };

    // 添加初始streams
    streams.forEach(entry => this.add(entry));
  }

  /**
   * 写入日志条目
   */
  write(entry: LogEntry): void {
    const level = this.streamLevels[entry.level] ?? 0;
    let recordedLevel = 0;

    // 根据dedupe决定遍历顺序
    const startIndex = this.dedupe ? this.streams.length - 1 : 0;
    const step = this.dedupe ? -1 : 1;
    const endIndex = this.dedupe ? -1 : this.streams.length;

    for (let i = startIndex; i !== endIndex; i += step) {
      const dest = this.streams[i];
      if (!dest) continue;
      
      const destLevel = dest.levelVal ?? (typeof dest.level === 'string' ? this.streamLevels[dest.level] : dest.level) ?? 0;

      if (destLevel <= level) {
        // 如果启用去重且已经记录过不同级别，则停止
        if (this.dedupe && recordedLevel !== 0 && recordedLevel !== destLevel) {
          break;
        }

        dest.stream.write(entry);
        
        if (this.dedupe) {
          recordedLevel = destLevel;
        }
      } else if (!this.dedupe) {
        // 如果不启用去重，且当前stream级别高于日志级别，则停止
        break;
      }
    }
  }

  /**
   * 添加stream
   */
  add(entry: StreamEntry): Multistream {
    if (!entry || !entry.stream) {
      throw new Error('stream entry must have a stream property');
    }

    // 确定级别数值
    let levelVal: number;
    if (typeof entry.levelVal === 'number') {
      levelVal = entry.levelVal;
    } else if (typeof entry.level === 'string') {
      levelVal = this.streamLevels[entry.level] ?? 1;
    } else if (typeof entry.level === 'number') {
      levelVal = entry.level;
    } else {
      levelVal = 1; // 默认info级别
    }

    const streamEntry: StreamEntry = {
      stream: entry.stream,
      level: entry.level,
      levelVal,
      id: ++this.nextId
    };

    this.streams.push(streamEntry);

    // 按级别排序（升序）
    this.streams.sort((a, b) => (a.levelVal ?? 0) - (b.levelVal ?? 0));

    return this;
  }

  /**
   * 移除stream
   */
  remove(id: number): Multistream {
    const index = this.streams.findIndex(s => s.id === id);
    if (index >= 0) {
      this.streams.splice(index, 1);
    }
    return this;
  }

  /**
   * 刷新所有stream
   */
  flush(callback?: () => void): void {
    let completed = 0;
    const total = this.streams.length;

    if (total === 0) {
      if (callback) {
        setImmediate(callback);
      }
      return;
    }

    this.streams.forEach(entry => {
      if (entry.stream.flush) {
        entry.stream.flush(() => {
          completed++;
          if (completed === total && callback) {
            callback();
          }
        });
      } else {
        completed++;
        if (completed === total && callback) {
          setImmediate(callback);
        }
      }
    });
  }

  /**
   * 结束所有stream
   */
  end(): void {
    this.flush(() => {
      this.streams.forEach(entry => {
        if (entry.stream.end) {
          entry.stream.end();
        }
      });
    });
  }

  /**
   * 事件监听（转发到所有stream）
   */
  on(event: string, handler: (...args: any[]) => void): void {
    this.streams.forEach(entry => {
      if (entry.stream.on) {
        entry.stream.on(event, handler);
      }
    });
  }

  /**
   * 移除事件监听（从所有stream移除）
   */
  off(event: string, handler: (...args: any[]) => void): void {
    this.streams.forEach(entry => {
      if (entry.stream.off) {
        entry.stream.off(event, handler);
      }
    });
  }

  /**
   * 克隆multistream
   */
  clone(level?: LogLevel): Multistream {
    const cloned = new Multistream([], {
      dedupe: this.dedupe,
      levels: { ...this.streamLevels }
    });

    this.streams.forEach(entry => {
      cloned.add({
        stream: entry.stream,
        level: level ?? entry.level,
        levelVal: level ? this.streamLevels[level] : entry.levelVal
      });
    });

    return cloned;
  }

  /**
   * 获取stream数量
   */
  get count(): number {
    return this.streams.length;
  }
}

/**
 * 创建multistream
 */
export function createMultistream(streams: StreamEntry[] = [], options: MultistreamOptions = {}): LogStream {
  return new Multistream(streams, options);
}