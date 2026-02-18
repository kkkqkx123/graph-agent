/**
 * 服务标识符
 * 定义所有 SDK 服务的 Symbol 标识符，提供类型安全的服务标识符
 *
 * 设计原则：
 * - 使用 Symbol 作为标识符，避免字符串拼写错误
 * - 提供类型安全的服务访问
 * - 按服务层次组织标识符
 */

import type { ServiceIdentifier } from '@modular-agent/common-utils';

// ============================================================
// 存储层服务
// ============================================================

/**
 * GraphRegistry - 图注册表
 * 管理预处理后的图的存储和检索
 */
export const GraphRegistry = Symbol('GraphRegistry') as ServiceIdentifier<any>;

/**
 * ThreadRegistry - 线程注册表
 * 管理 ThreadContext 的内存存储
 */
export const ThreadRegistry = Symbol('ThreadRegistry') as ServiceIdentifier<any>;

/**
 * GlobalMessageStorage - 全局消息存储
 * 管理全局消息存储
 */
export const GlobalMessageStorage = Symbol('GlobalMessageStorage') as ServiceIdentifier<any>;

// ============================================================
// 业务层服务
// ============================================================

/**
 * EventManager - 事件管理器
 * 管理全局事件的发布和订阅
 */
export const EventManager = Symbol('EventManager') as ServiceIdentifier<any>;

/**
 * ToolService - 工具服务
 * 管理工具的注册和执行
 */
export const ToolService = Symbol('ToolService') as ServiceIdentifier<any>;

/**
 * ScriptService - 脚本服务
 * 管理脚本的注册和执行
 */
export const ScriptService = Symbol('ScriptService') as ServiceIdentifier<any>;

/**
 * WorkflowRegistry - 工作流注册表
 * 管理工作流定义的完整生命周期，包括引用管理
 */
export const WorkflowRegistry = Symbol('WorkflowRegistry') as ServiceIdentifier<any>;

/**
 * NodeTemplateRegistry - 节点模板注册表
 * 管理节点模板的注册和查询
 */
export const NodeTemplateRegistry = Symbol('NodeTemplateRegistry') as ServiceIdentifier<any>;

/**
 * TriggerTemplateRegistry - 触发器模板注册表
 * 管理触发器模板的注册和查询
 */
export const TriggerTemplateRegistry = Symbol('TriggerTemplateRegistry') as ServiceIdentifier<any>;

/**
 * TaskRegistry - 任务注册表
 * 管理任务的注册和查询
 */
export const TaskRegistry = Symbol('TaskRegistry') as ServiceIdentifier<any>;

/**
 * ErrorService - 错误服务
 * 管理错误的收集和处理
 */
export const ErrorService = Symbol('ErrorService') as ServiceIdentifier<any>;

// ============================================================
// 执行层服务
// ============================================================

/**
 * ExecutionContext - 执行上下文
 * 管理执行组件的创建和访问
 */
export const ExecutionContext = Symbol('ExecutionContext') as ServiceIdentifier<any>;

/**
 * ThreadBuilder - 线程构建器
 * 从工作流定义构建 ThreadContext 实例
 */
export const ThreadBuilder = Symbol('ThreadBuilder') as ServiceIdentifier<any>;

/**
 * ThreadExecutor - 线程执行器
 * 执行单个 ThreadContext 实例
 */
export const ThreadExecutor = Symbol('ThreadExecutor') as ServiceIdentifier<any>;

/**
 * ThreadLifecycleCoordinator - 线程生命周期协调器
 * 管理线程的完整生命周期
 */
export const ThreadLifecycleCoordinator = Symbol('ThreadLifecycleCoordinator') as ServiceIdentifier<any>;

/**
 * ThreadLifecycleManager - 线程生命周期管理器
 * 管理线程的生命周期状态转换
 */
export const ThreadLifecycleManager = Symbol('ThreadLifecycleManager') as ServiceIdentifier<any>;

/**
 * ThreadCascadeManager - 线程级联管理器
 * 管理线程的级联关系
 */
export const ThreadCascadeManager = Symbol('ThreadCascadeManager') as ServiceIdentifier<any>;

/**
 * CheckpointStateManager - 检查点状态管理器
 * 管理检查点状态
 */
export const CheckpointStateManager = Symbol('CheckpointStateManager') as ServiceIdentifier<any>;

/**
 * ToolContextManager - 工具上下文管理器
 * 管理工具执行上下文
 */
export const ToolContextManager = Symbol('ToolContextManager') as ServiceIdentifier<any>;

/**
 * LLMExecutor - LLM 执行器
 * 执行 LLM 节点
 */
export const LLMExecutor = Symbol('LLMExecutor') as ServiceIdentifier<any>;

// ============================================================
// API 层服务
// ============================================================

/**
 * APIDependencyManager - API 依赖管理器
 * 统一管理 API 层所需的所有 Core 层依赖
 */
export const APIDependencyManager = Symbol('APIDependencyManager') as ServiceIdentifier<any>;

/**
 * APIFactory - API 工厂
 * 统一管理所有资源 API 实例的创建
 */
export const APIFactory = Symbol('APIFactory') as ServiceIdentifier<any>;

/**
 * SDK - SDK 主类
 * 提供统一的 API 入口
 */
export const SDK = Symbol('SDK') as ServiceIdentifier<any>;