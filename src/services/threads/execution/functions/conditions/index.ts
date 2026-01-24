/**
 * 内置条件函数导出
 *
 * 设计说明：
 * - 仅导出预实例化的条件函数（通过 .toConditionFunction() 转换）
 * - 基于函数式编程范式，无需用户直接实例化类
 * - 自定义条件函数时，可直接从本模块导入基类并扩展
 *
 * 两种条件函数模式：
 * 1. 单例模式：逻辑完全固定，无需配置，预实例化，性能最优
 * 2. 工厂模式：支持配置，支持动态分发，可从配置文件加载参数
 *
 * 注册机制：
 * - 单例条件函数：直接导入使用，无需注册到 FunctionRegistry
 * - 工厂条件函数：通过 FunctionRegistry.registerFactory() 注册
 */

// 基类和类型定义（用于扩展自定义条件函数）
export { BaseConditionFunction } from './base-condition-function';
export { SingletonConditionFunction } from './singleton-condition-function';

// 预实例化的条件函数（单例模式，无需配置）
export { hasErrorsCondition } from './has-errors.function';
export { hasToolCallsCondition } from './has-tool-calls.function';
export { hasToolResultsCondition } from './has-tool-results.function';
export { noToolCallsCondition } from './no-tool-calls.function';

// 条件函数类（需要配置，支持动态分发）
export { MaxIterationsReachedConditionFunction } from './max-iterations-reached.function';
export type { MaxIterationsConfig } from './max-iterations-reached.function';