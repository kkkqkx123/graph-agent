/**
 * 日志工具函数
 * 提供日志格式化和上下文处理等辅助功能
 */

import type { LogLevel } from './types';

/**
 * 格式化日志消息
 * @param level 日志级别
 * @param message 日志消息
 * @param name 日志器名称（可选）
 * @returns 格式化后的消息字符串
 */
export function formatLogMessage(level: LogLevel, message: string, name?: string): string {
  const timestamp = new Date().toISOString();
  const prefix = name ? `[${name}]` : '';
  return `${timestamp} ${prefix} [${level.toUpperCase()}] ${message}`;
}

/**
 * 合并上下文信息
 * @param baseContext 基础上下文
 * @param additionalContext 额外上下文
 * @returns 合并后的上下文对象
 */
export function mergeContext(
  baseContext?: Record<string, any>,
  additionalContext?: Record<string, any>
): Record<string, any> | undefined {
  if (!baseContext && !additionalContext) {
    return undefined;
  }
  
  if (!baseContext) {
    return additionalContext;
  }
  
  if (!additionalContext) {
    return baseContext;
  }
  
  return { ...baseContext, ...additionalContext };
}

/**
 * 格式化上下文为字符串
 * @param context 上下文对象
 * @returns 格式化后的字符串
 */
export function formatContext(context?: Record<string, any>): string {
  if (!context || Object.keys(context).length === 0) {
    return '';
  }
  
  try {
    return JSON.stringify(context, null, 2);
  } catch (error) {
    return '[无法序列化的上下文]';
  }
}

/**
 * 创建默认的console输出函数
 * @returns console输出函数
 */
export function createConsoleOutput(): (level: LogLevel, message: string, context?: Record<string, any>) => void {
  return (level: LogLevel, message: string, context?: Record<string, any>) => {
    const formattedMessage = formatLogMessage(level, message);
    const contextStr = formatContext(context);
    
    switch (level) {
      case 'debug':
        console.debug(formattedMessage, contextStr);
        break;
      case 'info':
        console.info(formattedMessage, contextStr);
        break;
      case 'warn':
        console.warn(formattedMessage, contextStr);
        break;
      case 'error':
        console.error(formattedMessage, contextStr);
        break;
      default:
        console.log(formattedMessage, contextStr);
    }
  };
}