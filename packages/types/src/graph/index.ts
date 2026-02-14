/**
 * Graph类型定义统一导出
 * 定义工作流图验证和分析所需的数据结构
 */

// 导出图结构类型
export * from './structure';

// 导出验证相关类型
export * from './validation';

// 导出分析结果类型
export * from './analysis';

// 导出合并相关类型
export * from './merge';

// 为了向后兼容，重新导出 Graph 和 GraphAnalysisResult
export type { Graph } from './structure';
export type { GraphAnalysisResult } from './analysis';