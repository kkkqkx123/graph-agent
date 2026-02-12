/**
 * 控制台输出Stream
 * 支持JSON和普通格式，支持彩色输出
 */

import type { LogStream, LogEntry, StreamOptions } from '../types';

/**
 * ANSI颜色代码
 */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * 级别颜色映射
 */
const LEVEL_COLORS: Record<string, string> = {
  debug: COLORS.blue,
  info: COLORS.green,
  warn: COLORS.yellow,
  error: COLORS.red
};

/**
 * 格式化时间戳
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 格式化日志条目为普通文本
 */
function formatPretty(entry: LogEntry, pretty: boolean): string {
  const { level, message, timestamp, context, ...rest } = entry;
  
  const timestampStr = timestamp ? `[${timestamp}] ` : '';
  const levelStr = pretty 
    ? `${LEVEL_COLORS[level] || COLORS.white}[${level.toUpperCase()}]${COLORS.reset} `
    : `[${level.toUpperCase()}] `;
  
  let output = `${timestampStr}${levelStr}${message}`;
  
  // 添加上下文和其他字段
  const extraData = { ...context, ...rest };
  if (Object.keys(extraData).length > 0) {
    output += ` ${JSON.stringify(extraData)}`;
  }
  
  return output;
}

/**
 * ConsoleStream类
 */
export class ConsoleStream implements LogStream {
  private json: boolean;
  private timestamp: boolean;
  private pretty: boolean;

  constructor(options: StreamOptions = {}) {
    this.json = options.json ?? false;
    this.timestamp = options.timestamp ?? true;
    this.pretty = options.pretty ?? false;
  }

  /**
   * 写入日志条目
   */
  write(entry: LogEntry): void {
    if (this.json) {
      // JSON格式输出
      console.log(JSON.stringify(entry));
    } else {
      // 普通格式输出
      const formatted = formatPretty(entry, this.pretty);
      
      // 根据级别选择console方法
      switch (entry.level) {
        case 'debug':
          console.debug(formatted);
          break;
        case 'warn':
          console.warn(formatted);
          break;
        case 'error':
          console.error(formatted);
          break;
        default:
          console.log(formatted);
      }
    }
  }

  /**
   * 刷新缓冲区（console无需刷新）
   */
  flush(callback?: () => void): void {
    if (callback) {
      setImmediate(callback);
    }
  }

  /**
   * 结束stream（console无需结束）
   */
  end(): void {
    // console stream无需特殊处理
  }
}

/**
 * 创建控制台stream
 */
export function createConsoleStream(options: StreamOptions = {}): LogStream {
  return new ConsoleStream(options);
}