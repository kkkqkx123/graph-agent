/**
 * 日志终端流
 * 将日志输出到文件，并由独立终端实时显示
 */

import type { LogStream, LogEntry } from '@modular-agent/common-utils';
import { getLogTerminal } from './log-terminal.js';

/**
 * LogTerminalStream
 * 将日志写入文件，由独立终端实时显示
 */
export class LogTerminalStream implements LogStream {
  private logTerminal = getLogTerminal();

  /**
   * 写入日志条目
   */
  write(entry: LogEntry): void {
    const formattedMessage = this.formatEntry(entry);
    this.logTerminal.write(formattedMessage);
  }

  /**
   * 格式化日志条目
   */
  private formatEntry(entry: LogEntry): string {
    const { level, message, timestamp, context, ...rest } = entry;
    const timestampStr = timestamp ? `[${timestamp}] ` : '';
    const levelStr = `[${level.toUpperCase()}] `.padEnd(9);
    
    let output = `${timestampStr}${levelStr}${message}`;
    
    const extraData = { ...context, ...rest };
    if (Object.keys(extraData).length > 0) {
      output += ` ${JSON.stringify(extraData)}`;
    }
    
    return output;
  }

  /**
   * 刷新缓冲区
   */
  flush(callback?: () => void): void {
    // 文件流会自动刷新
    if (callback) {
      setImmediate(callback);
    }
  }

  /**
   * 结束流
   */
  end(): void {
    this.logTerminal.close();
  }
}

/**
 * 创建日志终端流
 */
export function createLogTerminalStream(): LogStream {
  return new LogTerminalStream();
}
