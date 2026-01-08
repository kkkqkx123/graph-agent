/**
 * 内置上下文处理器导出
 *
 * 设计说明：
 * - 仅导出预实例化的处理器函数（通过 .toProcessor() 转换）
 * - 基于函数式编程范式，无需用户直接实例化类
 * - 自定义处理器时，可直接从本模块导入 BaseContextProcessor 并扩展
 */

// 基类和类型定义（用于扩展自定义处理器）
export { BaseContextProcessor, ContextProcessor, ContextProcessorMetadata, ContextProcessorRegistration } from './base-context-processor';

// 预实例化的处理器函数
export { llmContextProcessor } from './llm-context.processor';
export { toolContextProcessor } from './tool-context.processor';
export { humanContextProcessor } from './human-context.processor';
export { systemContextProcessor } from './system-context.processor';
export { passThroughProcessor } from './pass-through.processor';
export { isolateProcessor } from './isolate.processor';
export { regexFilterProcessor } from './regex-filter.processor';

// 配置类型（用于 regexFilterProcessor 配置）
export { RegexFilterConfig } from './regex-filter.processor';
