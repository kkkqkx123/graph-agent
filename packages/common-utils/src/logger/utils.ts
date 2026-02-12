/**
 * 日志工具函数
 * 基于pino设计思想的性能优化工具
 */

import type { LogLevel, LoggerContext, LogOutput, LoggerOptions } from './types';
import { LOG_LEVEL_PRIORITY } from './types';

/**
 * 检查日志级别是否应该输出
 * @param currentLevel 当前配置的日志级别
 * @param messageLevel 消息的日志级别
 * @returns 是否应该输出该日志
 */
export function shouldLog(currentLevel: LogLevel, messageLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[messageLevel] >= LOG_LEVEL_PRIORITY[currentLevel];
}

/**
 * 格式化时间戳
 * @returns ISO格式的时间戳
 */
export function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 创建控制台输出函数（同步）
 * @param options 日志器配置
 * @returns 输出函数
 */
export function createConsoleOutput(options: LoggerOptions = {}): LogOutput {
  const { json = false, timestamp = true } = options;

  return (level: LogLevel, message: string, context?: LoggerContext) => {
    const timestampStr = timestamp ? formatTimestamp() : '';
    
    if (json) {
      // JSON格式输出
      const logObj: any = {
        level,
        msg: message
      };
      if (timestampStr) {
        logObj.time = timestampStr;
      }
      if (context && Object.keys(context).length > 0) {
        Object.assign(logObj, context);
      }
      console.log(JSON.stringify(logObj));
    } else {
      // 普通格式输出
      const contextStr = context && Object.keys(context).length > 0 
        ? ` ${JSON.stringify(context)}` 
        : '';
      const timestampPrefix = timestampStr ? `[${timestampStr}] ` : '';
      const levelPrefix = `[${level.toUpperCase()}] `;
      
      switch (level) {
        case 'debug':
          console.debug(`${timestampPrefix}${levelPrefix}${message}${contextStr}`);
          break;
        case 'warn':
          console.warn(`${timestampPrefix}${levelPrefix}${message}${contextStr}`);
          break;
        case 'error':
          console.error(`${timestampPrefix}${levelPrefix}${message}${contextStr}`);
          break;
        default:
          console.log(`${timestampPrefix}${levelPrefix}${message}${contextStr}`);
      }
    }
  };
}

/**
 * 日志队列项
 */
interface LogItem {
  level: LogLevel;
  message: string;
  context?: LoggerContext;
}

/**
 * 创建异步输出函数
 * 使用队列和setImmediate实现非阻塞输出
 * @param options 日志器配置
 * @returns 输出函数
 */
export function createAsyncOutput(options: LoggerOptions = {}): LogOutput {
  const { json = false, timestamp = true, batchSize = 10 } = options;
  const queue: LogItem[] = [];
  let isProcessing = false;
  
  const syncOutput = createConsoleOutput({ json, timestamp });
  
  const processQueue = () => {
    if (queue.length === 0) {
      isProcessing = false;
      return;
    }
    
    // 批量处理
    const itemsToProcess = queue.splice(0, batchSize);
    itemsToProcess.forEach(item => {
      syncOutput(item.level, item.message, item.context);
    });
    
    // 如果还有剩余，继续处理
    if (queue.length > 0) {
      setImmediate(processQueue);
    } else {
      isProcessing = false;
    }
  };
  
  return (level: LogLevel, message: string, context?: LoggerContext) => {
    queue.push({ level, message, context });
    
    if (!isProcessing) {
      isProcessing = true;
      setImmediate(processQueue);
    }
  };
}

/**
 * 合并上下文对象
 * @param base 基础上下文
 * @param additional 额外上下文
 * @returns 合并后的上下文
 */
export function mergeContext(base: LoggerContext, additional: LoggerContext = {}): LoggerContext {
  return { ...base, ...additional };
}

/**
 * 格式化上下文为字符串
 * @param context 上下文对象
 * @returns 格式化后的字符串
 */
export function formatContext(context: LoggerContext): string {
  if (!context || Object.keys(context).length === 0) {
    return '';
  }
  return JSON.stringify(context);
}