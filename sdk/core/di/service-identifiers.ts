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
 * GraphNavigator - 图导航器
 * 提供图的导航和遍历功能
 */
export const GraphNavigator = Symbol('GraphNavigator') as ServiceIdentifier<any>;

/**
 * ThreadRegistry - 线程注册表
 * 管理 ThreadContext 的内存存储
 */
export const ThreadRegistry = Symbol('ThreadRegistry') as ServiceIdentifier<any>;

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
 * ThreadBuilder - 线程构建器
 * 从工作流定义构建 ThreadEntity 实例
 */
export const ThreadBuilder = Symbol('ThreadBuilder') as ServiceIdentifier<any>;

/**
 * ThreadExecutor - 线程执行器
 * 执行单个 ThreadEntity 实例
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
 * ToolVisibilityManager - 工具可见性管理器
 * 管理工具的可见性状态
 */
export const ToolVisibilityManager = Symbol('ToolVisibilityManager') as ServiceIdentifier<any>;

/**
 * MessageStorageManager - 消息存储管理器
 * 管理线程的消息存储，线程隔离
 */
export const MessageStorageManager = Symbol('MessageStorageManager') as ServiceIdentifier<any>;

/**
 * LLMExecutor - LLM 执行器
 * 执行 LLM 节点
 */
export const LLMExecutor = Symbol('LLMExecutor') as ServiceIdentifier<any>;

/**
 * ToolCallExecutor - 工具调用执行器
 * 专门处理工具调用执行
 */
export const ToolCallExecutor = Symbol('ToolCallExecutor') as ServiceIdentifier<any>;

// ============================================================
// 执行层 - Coordinators（协调器）
// ============================================================

/**
 * ThreadExecutionCoordinator - 线程执行协调器
 * 协调线程的执行流程，编排各个组件完成执行任务
 */
export const ThreadExecutionCoordinator = Symbol('ThreadExecutionCoordinator') as ServiceIdentifier<any>;

/**
 * VariableCoordinator - 变量协调器
 * 负责变量的协调逻辑，包括验证、按需初始化、事件触发等
 */
export const VariableCoordinator = Symbol('VariableCoordinator') as ServiceIdentifier<any>;

/**
 * TriggerCoordinator - 触发器协调器
 * 负责触发器的注册、注销和执行触发动作
 */
export const TriggerCoordinator = Symbol('TriggerCoordinator') as ServiceIdentifier<any>;

/**
 * NodeExecutionCoordinator - 节点执行协调器
 * 负责协调节点的执行流程，包括事件触发、Hook执行、子图处理等
 */
export const NodeExecutionCoordinator = Symbol('NodeExecutionCoordinator') as ServiceIdentifier<any>;

/**
 * LLMExecutionCoordinator - LLM执行协调器
 * 负责协调LLM调用和工具调用的完整流程
 */
export const LLMExecutionCoordinator = Symbol('LLMExecutionCoordinator') as ServiceIdentifier<any>;

/**
 * ToolVisibilityCoordinator - 工具可见性协调器
 * 管理工具的运行时可见性，生成可见性声明消息
 */
export const ToolVisibilityCoordinator = Symbol('ToolVisibilityCoordinator') as ServiceIdentifier<any>;

/**
 * ThreadOperationCoordinator - 线程操作协调器
 * 负责协调Thread的结构操作（Fork/Join/Copy）
 */
export const ThreadOperationCoordinator = Symbol('ThreadOperationCoordinator') as ServiceIdentifier<any>;

/**
 * CheckpointCoordinator - 检查点协调器
 * 协调完整的检查点流程
 */
export const CheckpointCoordinator = Symbol('CheckpointCoordinator') as ServiceIdentifier<any>;

// ============================================================
// 执行层 - Managers（管理器）
// ============================================================

/**
 * ConversationManager - 对话管理器
 * 管理消息历史和消息索引
 */
export const ConversationManager = Symbol('ConversationManager') as ServiceIdentifier<any>;

/**
 * VariableStateManager - 变量状态管理器
 * 专门管理变量的运行时状态
 */
export const VariableStateManager = Symbol('VariableStateManager') as ServiceIdentifier<any>;

/**
 * TriggerStateManager - 触发器状态管理器
 * 专门管理触发器的运行时状态
 */
export const TriggerStateManager = Symbol('TriggerStateManager') as ServiceIdentifier<any>;

/**
 * InterruptionManager - 中断管理器
 * 统一管理线程中断状态和操作
 */
export const InterruptionManager = Symbol('InterruptionManager') as ServiceIdentifier<any>;

// ============================================================
// API 层服务
// ============================================================

/**
 * ExecutionContext - 执行上下文
 * 提供全局执行上下文
 */
export const ExecutionContext = Symbol('ExecutionContext') as ServiceIdentifier<any>;

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

/**
 * TriggeredSubworkflowManager - 触发子工作流管理器
 * 管理触发子工作流的执行
 */
export const TriggeredSubworkflowManager = Symbol('TriggeredSubworkflowManager') as ServiceIdentifier<any>;

/**
 * ThreadPoolService - 线程池服务
 * 管理 ThreadExecutor 实例池，提供全局线程池资源管理
 */
export const ThreadPoolService = Symbol('ThreadPoolService') as ServiceIdentifier<any>;
