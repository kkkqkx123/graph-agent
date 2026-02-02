/**
 * Node类型定义
 * 定义工作流节点的类型和结构
 */

import type { ID, Metadata } from './common';
import type { Condition } from './condition';
import type { LLMMessage } from './llm';

/**
 * 节点类型枚举
 */
export enum NodeType {
  /** 开始节点。作为工作流开始标志，必须唯一。入度必须为0。 */
  START = 'START',
  /** 结束节点。作为工作流结束标志，必须唯一。出度必须为0。 */
  END = 'END',
  /** 变量操作节点。主要用途是更改工作流变量的值，为边条件评估提供数据。 */
  VARIABLE = 'VARIABLE',
  /** 分叉节点。用于控制thread的fork操作。 */
  FORK = 'FORK',
  /** 连接节点。用于控制thread的join操作。 */
  JOIN = 'JOIN',
  /** 子图节点。用于链接到子工作流。在workflow处理阶段由merge自动把该节点替换为子工作流，以子工作流的start节点连接。 */
  SUBGRAPH = 'SUBGRAPH',
  /** 代码节点。用于执行脚本(脚本用于执行可执行文件或代码)。 */
  CODE = 'CODE',
  /** LLM节点。用于执行LLM api调用。不添加提示词，提示词操作有上下文处理节点负责。 */
  LLM = 'LLM',
  /** 工具节点。通过内部事件通知llm执行器。 */
  TOOL = 'TOOL',
  /** 用户交互节点。用于触发展示前端用户交互。仅提供输入、输出渠道，不关心前端实现细节。 */
  USER_INTERACTION = 'USER_INTERACTION',
  /** 路由节点。用于根据条件路由到下一个节点。 */
  ROUTE = 'ROUTE',
  /** 上下文处理器节点。用于对提示词上下文(消息数组)进行处理。 */
  CONTEXT_PROCESSOR = 'CONTEXT_PROCESSOR',
  /** 循环开始节点。标记循环开始，设置循环变量。循环变量可以被VARIABLE节点修改。不关心条件以外的退出条件 */
  LOOP_START = 'LOOP_START',
  /** 循环结束节点。标记循环结束。让循环次数变量自增，并根据循环次数是否达到 */
  LOOP_END = 'LOOP_END',
  /** 从触发器开始的节点。标识由触发器启动的孤立子工作流的起始点。无特殊配置，与START节点类似。 */
  START_FROM_TRIGGER = 'START_FROM_TRIGGER',
  /** 从触发器继续的节点。用于在子工作流执行完成后恢复到主工作流的执行位置。无特殊配置，类似END节点。 */
  CONTINUE_FROM_TRIGGER = 'CONTINUE_FROM_TRIGGER'
}

/**
 * 节点状态枚举（高级功能，用于审计，不承担工作流执行逻辑）
 */
export enum NodeStatus {
  /** 等待执行 */
  PENDING = 'PENDING',
  /** 正在执行 */
  RUNNING = 'RUNNING',
  /** 执行完成 */
  COMPLETED = 'COMPLETED',
  /** 执行失败 */
  FAILED = 'FAILED',
  /** 已跳过（执行过程中由图算法标记，是可选的高级功能） */
  SKIPPED = 'SKIPPED',
  /** 已取消 */
  CANCELLED = 'CANCELLED'
}

/**
 * Hook类型枚举
 */
export enum HookType {
  /** 节点执行前触发 */
  BEFORE_EXECUTE = 'BEFORE_EXECUTE',
  /** 节点执行后触发 */
  AFTER_EXECUTE = 'AFTER_EXECUTE'
}

/**
 * 节点Hook配置
 */
export interface NodeHook {
  /** Hook类型 */
  hookType: HookType;
  /** 触发条件表达式（可选） */
  condition?: string;
  /** 要触发的自定义事件名称 */
  eventName: string;
  /** 事件载荷生成逻辑（可选） */
  eventPayload?: Record<string, any>;
  /** 是否启用（默认true） */
  enabled?: boolean;
  /** 权重（数字越大优先级越高） */
  weight?: number;
}

/**
 * 开始节点配置
 */
export interface StartNodeConfig {
  // 无配置，仅作为工作流开始标志
}

/**
 * 结束节点配置
 */
export interface EndNodeConfig {
  // 无配置，仅作为工作流结束标志
}

/**
 * 变量操作节点配置
 */
export interface VariableNodeConfig {
  /** 操作的变量名称 */
  variableName: string;
  /** 操作的变量类型【包含number、string、boolean、array、object】 */
  variableType: 'number' | 'string' | 'boolean' | 'array' | 'object';
  /** 操作的表达式【直接用表达式覆盖相应变量】 */
  expression: string;
  /** 变量作用域 */
  scope?: 'global' | 'thread' | 'subgraph' | 'loop';
  /** 是否只读 */
  readonly?: boolean;
}

/**
 * 分叉节点配置
 */
export interface ForkNodeConfig {
  /** 连接操作的id，与join节点完全一致 */
  forkId: ID;
  /** 分叉策略(串行、并行) */
  forkStrategy: 'serial' | 'parallel';
  /** 子节点ID列表 */
  childNodeIds?: string[];
}

/**
 * 连接节点配置
 */
export interface JoinNodeConfig {
  /** 连接操作的id，与fork节点完全一致 */
  joinId: ID;
  /** 连接策略(ALL_COMPLETED、ANY_COMPLETED、ALL_FAILED、ANY_FAILED、SUCCESS_COUNT_THRESHOLD) */
  joinStrategy: 'ALL_COMPLETED' | 'ANY_COMPLETED' | 'ALL_FAILED' | 'ANY_FAILED' | 'SUCCESS_COUNT_THRESHOLD';
  /** 成功数量阈值（当joinStrategy为SUCCESS_COUNT_THRESHOLD时使用） */
  threshold?: number;
  /** 等待超时时间（秒）【从第一个前继路径完成开始计算】 */
  timeout?: number;
  /** 子Thread ID列表 */
  childThreadIds?: string[];
}

/**
 * 代码节点配置
 */
export interface CodeNodeConfig {
  /** 脚本名称 */
  scriptName: string;
  /** 脚本语言(shell/cmd/powershell/python/javascript) */
  scriptType: 'shell' | 'cmd' | 'powershell' | 'python' | 'javascript';
  /** 风险等级(none/low/medium/high)【应用层中会实现不同的执行策略，例如none不检查，high在沙箱运行】 */
  risk: 'none' | 'low' | 'medium' | 'high';
  /** 超时时间（秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 重试延迟（秒） */
  retryDelay?: number;
  /** 是否为内联代码 */
  inline?: boolean;
}

/**
 * LLM节点配置
 */
export interface LLMNodeConfig {
  /** 引用的LLM Profile ID */
  profileId: ID;
  /** 提示词 */
  prompt?: string;
  /** 可选的参数覆盖（覆盖Profile中的parameters） */
  parameters?: Record<string, any>;
  /** 最大工具调用次数（默认10，由LLM模块控制） */
  maxToolCalls?: number;
}

/**
 * 用户交互节点配置
 * 定义用户交互的业务语义，不包含应用层实现细节
 */
export interface UserInteractionNodeConfig {
  /** 操作类型 */
  operationType: 'UPDATE_VARIABLES' | 'ADD_MESSAGE';
  /** 变量更新配置（当 operationType = UPDATE_VARIABLES） */
  variables?: Array<{
    /** 变量名称 */
    variableName: string;
    /** 变量更新表达式（可能包含 {{input}} 占位符） */
    expression: string;
    /** 变量作用域 */
    scope: 'global' | 'thread' | 'subgraph' | 'loop';
  }>;
  /** 消息配置（当 operationType = ADD_MESSAGE） */
  message?: {
    /** 消息角色（固定为 'user'） */
    role: 'user';
    /** 消息内容模板（可能包含 {{input}} 占位符） */
    contentTemplate: string;
  };
  /** 给用户的提示信息（应用层用于显示） */
  prompt: string;
  /** 交互超时时间（毫秒） */
  timeout?: number;
  /** 额外的业务信息 */
  metadata?: Record<string, any>;
}

/**
 * 路由节点配置
 */
export interface RouteNodeConfig {
  /** 路由规则数组 */
  routes: Array<{
    /** 条件表达式 */
    condition: string;
    /** 目标节点ID */
    targetNodeId: string;
    /** 优先级 */
    priority?: number;
  }>;
  /** 默认目标节点ID */
  defaultTargetNodeId?: string;
}


/**
 * 上下文处理器节点配置
 * 用于直接操作提示词消息数组，支持截断、插入、替换、过滤、清空等操作
 */
export interface ContextProcessorNodeConfig {
  /** 配置版本（可选，默认为2） */
  version?: number;
  /** 操作类型 */
  operation: 'truncate' | 'insert' | 'replace' | 'clear' | 'filter';

  /** 截断操作配置 */
  truncate?: {
    /** 保留前N条消息 */
    keepFirst?: number;
    /** 保留后N条消息 */
    keepLast?: number;
    /** 删除前N条消息 */
    removeFirst?: number;
    /** 删除后N条消息 */
    removeLast?: number;
    /** 保留索引范围 [start, end) */
    range?: { start: number; end: number };
  };

  /** 插入操作配置 */
  insert?: {
    /** 插入位置（-1表示末尾，0表示开头） */
    position: number;
    /** 要插入的消息 */
    messages: LLMMessage[];
  };

  /** 替换操作配置 */
  replace?: {
    /** 要替换的消息索引 */
    index: number;
    /** 新的消息内容 */
    message: LLMMessage;
  };

  /** 过滤操作配置 */
  filter?: {
    /** 按角色过滤 */
    roles?: ('system' | 'user' | 'assistant' | 'tool')[];
    /** 按内容关键词过滤（包含指定关键词的消息） */
    contentContains?: string[];
    /** 按内容关键词排除（不包含指定关键词的消息） */
    contentExcludes?: string[];
  };

  /** 清空操作配置 */
  clear?: {
    /** 是否保留系统消息 */
    keepSystemMessage?: boolean;
  };
}

/**
 * 循环数据源配置
 * 
 * 说明：定义循环迭代的数据源和循环变量
 * - iterable：被迭代的数据源（数组、对象、数字、字符串或变量表达式）
 * - variableName：循环变量名，存储当前迭代值
 * - 两个属性必须同时存在或同时不存在（成对使用）
 */
export interface DataSource {
  /** 可迭代对象或变量表达式
   * - 直接值：数组、对象、数字、字符串
   * - 变量表达式：支持 {{variable.path}} 语法，在运行时从 thread 和 input 中解析
   * 例：[1,2,3] 或 "{{input.list}}" 或 "{{thread.items}}"
   */
  iterable: any;
  /** 循环变量名，存储当前迭代值（在 loop 级作用域中） */
  variableName: string;
}

/**
 * 循环开始节点配置
 * 
 * 说明：初始化循环迭代，支持两种循环模式
 * 
 * 模式1：数据驱动循环（提供 dataSource）
 * - 遍历指定的数据集合（数组、对象等）
 * - 每次迭代自动提取当前值到循环变量
 * - 例：遍历 [1,2,3]，每次 item = 当前值
 * 
 * 模式2：计数循环（不提供 dataSource）
 * - 仅基于 maxIterations 循环固定次数
 * - 无循环变量，循环体可以自行维护状态
 * - 例：检查 10 次
 * 
 * - 循环状态（迭代计数、索引等）存储在 loop 级作用域，自动随作用域生命周期管理
 */
export interface LoopStartNodeConfig {
  /** 循环ID（唯一标识此循环） */
  loopId: string;
  /** 数据源配置（可选）
   * - 提供时：进行数据驱动循环，遍历 dataSource.iterable
   * - 不提供时：进行计数循环，仅基于 maxIterations
   * - 若提供则 iterable 和 variableName 必须同时存在
   */
  dataSource?: DataSource;
  /** 最大迭代次数（安全保护，必需） */
  maxIterations: number;
}

/**
 * 循环结束节点配置
 * 
 * 说明：检查循环条件和中断条件，决定是否继续迭代
 * - loopId 唯一标识循环，用于检索 LOOP_START 中初始化的循环状态
 * - 循环状态（iterable、iterationCount 等）已在 LOOP_START 中初始化并存储，无需重复定义
 * - 所有循环数据和状态都在 loop 级作用域中，与其他作用域隔离
 */
export interface LoopEndNodeConfig {
  /** 循环ID（与LOOP_START节点完全一致，用于标识和检索循环状态） */
  loopId: string;
  /** 中断条件表达式（可选，满足时立即退出循环） */
  breakCondition?: any;
  /** LOOP_START节点ID（用于跳转到下一迭代） */
  loopStartNodeId?: string;
}

/**
 * 子图节点配置
 */
export interface SubgraphNodeConfig {
  /** 子工作流ID */
  subgraphId: ID;
  /**
   * 输入参数映射（父工作流变量到子工作流输入的映射）
   *
   * 说明：定义父工作流的变量如何传递给子工作流
   * - 键：子工作流的输入变量名
   * - 值：父工作流的变量路径（支持嵌套路径，如 'parent.user.name'）
   * - 如果为空对象，则传递所有父工作流变量
   *
   * 示例：
   * ```typescript
   * inputMapping: {
   *   'childInput': 'parentVar1',      // 父工作流的 parentVar1 → 子工作流的 childInput
   *   'childConfig': 'parent.user.config'  // 支持嵌套路径
   * }
   * ```
   *
   * 注意：此映射规则与 variables 机制配合使用
   * - variables: 存储工作流内部的变量数据
   * - inputMapping: 定义跨工作流的数据传递规则
   * 两者互补，不重复
   */
  inputMapping: Record<string, string>;
  /**
   * 输出参数映射（子工作流输出到父工作流变量的映射）
   *
   * 说明：定义子工作流的输出如何映射回父工作流的变量
   * - 键：父工作流的变量名（将更新此变量）
   * - 值：子工作流输出的路径（支持嵌套路径）
   * - 如果为空对象，则直接返回子工作流输出，不更新父工作流变量
   *
   * 示例：
   * ```typescript
   * outputMapping: {
   *   'parentResult': 'childOutput',   // 子工作流的 childOutput → 父工作流的 parentResult
   *   'parentStatus': 'result.status'  // 支持嵌套路径
   * }
   * ```
   *
   * 注意：此映射规则与 variables 机制配合使用
   * - variables: 存储工作流内部的变量数据
   * - outputMapping: 定义跨工作流的数据传递规则
   * 两者互补，不重复
   */
  outputMapping: Record<string, string>;
  /** 是否异步执行 */
  async: boolean;
}

/**
 * 从触发器开始的节点配置
 * 专门用于标识由触发器启动的孤立子工作流的起始点
 * 空配置，仅作为标识
 */
export interface StartFromTriggerNodeConfig {
  // 空配置，仅作为标识
}

/**
 * 从触发器继续的节点配置
 * 用于在子工作流执行完成后恢复到主工作流的执行位置
 * 无特殊配置，类似 END 节点
 */
export interface ContinueFromTriggerNodeConfig {
  // 无配置，仅作为子工作流结束标志
}

/**
 * 节点配置联合类型
 */
export type NodeConfig =
  | StartNodeConfig
  | EndNodeConfig
  | VariableNodeConfig
  | ForkNodeConfig
  | JoinNodeConfig
  | CodeNodeConfig
  | LLMNodeConfig
  | UserInteractionNodeConfig
  | RouteNodeConfig
  | ContextProcessorNodeConfig
  | LoopStartNodeConfig
  | LoopEndNodeConfig
  | SubgraphNodeConfig
  | StartFromTriggerNodeConfig
  | ContinueFromTriggerNodeConfig;

/**
 * 节点输入定义类型
 */
export interface NodeInput {
  /** 输入参数名称 */
  name: string;
  /** 输入类型 */
  type: string;
  /** 是否必需 */
  required: boolean;
  /** 默认值 */
  defaultValue?: any;
  /** 输入描述 */
  description?: string;
}

/**
 * 节点输出定义类型
 */
export interface NodeOutput {
  /** 输出参数名称 */
  name: string;
  /** 输出类型 */
  type: string;
  /** 输出描述 */
  description?: string;
}

/**
 * 节点动态属性类型
 */
export interface NodeProperty {
  /** 属性键 */
  key: string;
  /** 属性值 */
  value: any;
  /** 属性类型 */
  type: string;
  /** 是否必需 */
  required: boolean;
  /** 验证规则 */
  validation?: any;
}

/**
 * 节点定义类型
 */
export interface Node {
  /** 节点唯一标识符 */
  id: ID;
  /** 节点类型(NodeType枚举类型) */
  type: NodeType;
  /** 节点名称 */
  name: string;
  /** 可选的节点描述 */
  description?: string;
  /** 节点配置，根据节点类型不同而不同 */
  config: NodeConfig;
  /** 可选的元数据 */
  metadata?: Metadata;
  /** 出边ID数组，用于路由决策 */
  outgoingEdgeIds: ID[];
  /** 入边ID数组，用于反向追踪 */
  incomingEdgeIds: ID[];
  /** 可选的动态属性对象 */
  properties?: NodeProperty[];
  /** 可选的Hook配置数组 */
  hooks?: NodeHook[];
}