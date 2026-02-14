/**
 * LLM类型定义统一导出
 * 定义LLM配置文件（Profile），支持独立配置和复用
 */

// 为了向后兼容，导出类型别名
export type { LLMMessage, LLMToolCall } from '../message';
export type { MessageRole as LLMMessageRole } from '../message';

// 导出状态类型
export * from './state';

// 导出配置文件类型
export * from './profile';

// 导出请求类型
export * from './request';

// 导出响应类型
export * from './response';

// 导出使用统计类型
export * from './usage';

// 导出客户端类型
export * from './client';

// 为了向后兼容，重新导出 TokenUsageStats
export type { TokenUsageStats } from './usage';