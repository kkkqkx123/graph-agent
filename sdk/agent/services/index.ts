/**
 * Agent Services 模块导出
 *
 * 设计原则：
 * - 服务类通过 DI 访问，避免误用
 * - 确保单例的全局唯一性
 * - 支持测试环境下的单例替换
 */

export { AgentLoopRegistry } from './agent-loop-registry.js';
