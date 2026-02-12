/**
 * 文件输出Stream
 * 支持文件写入和追加模式
 */

import * as fs from 'fs';
import type { LogStream, LogEntry, StreamOptions } from '../types';

/**
 * FileStream类
 */
export class FileStream implements LogStream {
  private filePath: string;
  private json: boolean;
  private timestamp: boolean;
  private writeStream: fs.WriteStream;
  private buffer: string[] = [];
  private bufferSize: number = 0;
  private maxBufferSize: number = 64 * 1024; // 64KB

  constructor(options: StreamOptions = {}) {
    if (!options.filePath) {
      throw new Error('filePath is required for FileStream');
    }

    this.filePath = options.filePath;
    this.json = options.json ?? true;
    this.timestamp = options.timestamp ?? true;

    // 创建写入流
    const flags = options.append ? 'a' : 'w';
    this.writeStream = fs.createWriteStream(this.filePath, {
      flags,
      encoding: 'utf8'
    });

    // 处理错误
    this.writeStream.on('error', (err) => {
      console.error(`FileStream error: ${err.message}`);
    });
  }

  /**
   * 写入日志条目
   */
  write(entry: LogEntry): void {
    const line = this.formatEntry(entry) + '\n';
    
    // 添加到缓冲区
    this.buffer.push(line);
    this.bufferSize += line.length;

    // 如果缓冲区超过阈值，刷新到文件
    if (this.bufferSize >= this.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * 格式化日志条目
   */
  private formatEntry(entry: LogEntry): string {
    if (this.json) {
      return JSON.stringify(entry);
    } else {
      const { level, message, timestamp, context, ...rest } = entry;
      const timestampStr = timestamp ? `[${timestamp}] ` : '';
      const levelStr = `[${level.toUpperCase()}] `;
      
      let output = `${timestampStr}${levelStr}${message}`;
      
      const extraData = { ...context, ...rest };
      if (Object.keys(extraData).length > 0) {
        output += ` ${JSON.stringify(extraData)}`;
      }
      
      return output;
    }
  }

  /**
   * 刷新缓冲区到文件
   */
  flush(callback?: () => void): void {
    if (this.buffer.length === 0) {
      if (callback) {
        setImmediate(callback);
      }
      return;
    }

    const lines = this.buffer;
    this.buffer = [];
    this.bufferSize = 0;

    this.writeStream.write(lines.join(''), 'utf8', (err) => {
      if (err) {
        console.error(`FileStream flush error: ${err.message}`);
      }
      if (callback) {
        callback();
      }
    });
  }

  /**
   * 结束stream
   */
  end(): void {
    this.flush(() => {
      this.writeStream.end();
    });
  }

  /**
   * 事件监听
   */
  on(event: string, handler: (...args: any[]) => void): void {
    this.writeStream.on(event as any, handler);
  }

  /**
   * 移除事件监听
   */
  off(event: string, handler: (...args: any[]) => void): void {
    this.writeStream.off(event as any, handler);
  }
}

/**
 * 创建文件stream
 */
export function createFileStream(options: StreamOptions): LogStream {
  return new FileStream(options);
}