/**
 * Transport工厂函数
 * 支持创建各种transport stream
 */

import type { LogStream, StreamOptions, StreamEntry, LogLevel } from '../types';
import { destination } from './destination';
import { createMultistream } from '../streams';

/**
 * 日志Transport配置
 */
export interface LogTransportOptions {
  /**
   * Transport目标
   * 可以是stream实例、文件路径、或预定义的transport类型
   */
  target: string | LogStream;

  /**
   * 日志级别
   */
  level?: string;

  /**
   * Transport选项
   */
  options?: any;

  /**
   * 是否同步
   */
  sync?: boolean;
}

/**
 * 多目标Transport配置
 */
export interface MultiLogTransportOptions {
  /**
   * Transport目标列表
   */
  targets?: LogTransportOptions[];

  /**
   * Pipeline配置
   */
  pipeline?: LogTransportOptions[];

  /**
   * 是否去重
   */
  dedupe?: boolean;

  /**
   * 自定义级别映射
   */
  levels?: Record<string, number>;

  /**
   * Worker选项（用于worker thread transport）
   */
  worker?: any;

  /**
   * 是否同步
   */
  sync?: boolean;
}

/**
 * 兼容性别名
 */
export type TransportOptions = LogTransportOptions;
export type MultiTransportOptions = MultiLogTransportOptions;

/**
 * 创建transport stream
 * @param options Transport配置
 * @returns LogStream实例
 */
export function transport(options: LogTransportOptions | MultiLogTransportOptions): LogStream {
  // 如果是多目标配置
  if (isMultiTransportOptions(options)) {
    return createMultiTransport(options);
  }

  // 单目标配置
  return createSingleTransport(options);
}

/**
 * 创建单目标transport
 */
function createSingleTransport(options: LogTransportOptions): LogStream {
  const { target, level, options: transportOptions } = options;

  // 如果target已经是LogStream，直接返回
  if (isLogStream(target)) {
    return target;
  }

  // 如果是字符串，解析为具体的目标
  if (typeof target === 'string') {
    return resolveTransportTarget(target, transportOptions);
  }

  throw new Error(`Invalid transport target: ${target}`);
}

/**
 * 创建多目标transport
 */
function createMultiTransport(options: MultiLogTransportOptions): LogStream {
  const { targets, pipeline, dedupe, levels } = options;

  const streams: StreamEntry[] = [];

  // 处理targets
  if (targets && targets.length > 0) {
    targets.forEach(target => {
      const stream = createSingleTransport(target);
      streams.push({
        stream,
        level: target.level ? (target.level as LogLevel | number) : undefined
      });
    });
  }

  // 处理pipeline
  if (pipeline && pipeline.length > 0) {
    pipeline.forEach(target => {
      const stream = createSingleTransport(target);
      streams.push({
        stream,
        level: target.level ? (target.level as LogLevel | number) : undefined
      });
    });
  }

  // 创建multistream
  return createMultistream(streams, {
    dedupe,
    levels
  });
}

/**
 * 解析transport目标
 */
function resolveTransportTarget(target: string, options?: any): LogStream {
  // 文件路径
  if (target.startsWith('file://') || target.endsWith('.log') || target.endsWith('.json')) {
    const filePath = target.startsWith('file://') ? target.slice(7) : target;
    return destination(filePath);
  }

  // 预定义的transport类型
  switch (target) {
    case 'console':
    case 'stdout':
      return destination(process.stdout);
    
    case 'stderr':
      return destination(process.stderr);
    
    case 'pino/file':
      if (options && options.destination) {
        return destination(options.destination);
      }
      throw new Error('pino/file requires destination option');
    
    default:
      // 尝试作为文件路径处理
      try {
        return destination(target);
      } catch (err) {
        throw new Error(`Unknown transport target: ${target}`);
      }
  }
}

/**
 * 检查是否是多目标配置
 */
function isMultiTransportOptions(options: any): options is MultiLogTransportOptions {
  return options && (options.targets || options.pipeline);
}

/**
 * 检查是否是LogStream
 */
function isLogStream(obj: any): obj is LogStream {
  return obj && typeof obj.write === 'function';
}