/**
 * Destination工厂函数
 * 用于创建各种目标stream
 */

import type { LogStream, StreamOptions } from '../types';
import { createConsoleStream, createFileStream } from '../streams';

/**
 * Destination类型
 */
export type Destination = 
  | string 
  | number 
  | NodeJS.WritableStream 
  | LogStream
  | { dest: Destination; options?: StreamOptions };

/**
 * 创建目标stream
 * @param dest 目标配置
 * @returns LogStream实例
 */
export function destination(dest: Destination = process.stdout): LogStream {
  // 如果已经是LogStream，直接返回
  if (isLogStream(dest)) {
    return dest;
  }

  // 如果是Node.js WritableStream，包装为LogStream
  if (isWritableStream(dest)) {
    return wrapWritableStream(dest);
  }

  // 如果是对象配置
  if (typeof dest === 'object' && 'dest' in dest) {
    const options = dest.options || {};
    return destination(dest.dest);
  }

  // 如果是文件路径
  if (typeof dest === 'string') {
    return createFileStream({
      filePath: dest,
      append: true,
      json: true,
      timestamp: true
    });
  }

  // 如果是文件描述符
  if (typeof dest === 'number') {
    // 文件描述符1是stdout，2是stderr
    if (dest === 1 || dest === 2) {
      return createConsoleStream({
        json: true,
        timestamp: true
      });
    }
    throw new Error(`Unsupported file descriptor: ${dest}`);
  }

  // 默认返回console stream
  return createConsoleStream({
    json: true,
    timestamp: true
  });
}

/**
 * 检查是否是LogStream
 */
function isLogStream(obj: any): obj is LogStream {
  return obj && typeof obj.write === 'function';
}

/**
 * 检查是否是Node.js WritableStream
 */
function isWritableStream(obj: any): obj is NodeJS.WritableStream {
  return obj && typeof obj.write === 'function' && typeof obj.end === 'function';
}

/**
 * 包装Node.js WritableStream为LogStream
 */
function wrapWritableStream(stream: NodeJS.WritableStream): LogStream {
  return {
    write(entry: any): void {
      stream.write(JSON.stringify(entry) + '\n');
    },
    flush(callback?: () => void): void {
      if (callback) {
        setImmediate(callback);
      }
    },
    end(): void {
      stream.end();
    },
    on(event: string, handler: (...args: any[]) => void): void {
      (stream as any).on(event, handler);
    },
    off(event: string, handler: (...args: any[]) => void): void {
      (stream as any).off(event, handler);
    }
  };
}