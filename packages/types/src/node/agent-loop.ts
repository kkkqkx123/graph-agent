/**
 * Agent Loop 节点类型定义
 *
 * 设计原则：极简配置，专注于LLM-工具自循环
 * 不提供复杂约束，复杂控制请使用 LOOP_START/LOOP_END + 图编排
 */

import type { ID } from '../common.js';

/**
 * Agent Loop 节点配置
 *
 * Agent Loop 用于简单工作流场景：
 * - 单轮/多轮工具调用的简单任务
 * - 作为主协调引擎按需调用子工作流
 *
 * 对于复杂控制流（条件分支、状态机等），请使用 LOOP_START/LOOP_END + 图编排
 */
export interface AgentLoopNodeConfig {
  /** LLM配置ID */
  profileId: string;

  /**
   * 最大迭代次数
   * @default 20
   * @description 达到此次数后强制结束，无论是否有工具调用
   */
  maxIterations?: number;

  /**
   * 可用工具列表
   * @description 如果不指定，使用上下文中的所有可用工具
   */
  tools?: string[];

  /**
   * 系统提示词（可选）
   * @description 如果提供，会在每次迭代时注入
   */
  systemPrompt?: string;
}

/**
 * Agent Loop 工具调用记录
 */
export interface AgentLoopToolCall {
  /** 迭代次数 */
  iteration: number;
  /** 工具名称 */
  toolName: string;
  /** 工具输入 */
  input: unknown;
  /** 工具输出 */
  output: unknown;
  /** 工具调用ID */
  toolCallId: string;
}

/**
 * Agent Loop 节点执行结果
 */
export interface AgentLoopNodeResult {
  /** 最终LLM输出内容 */
  content: string;
  /** 实际迭代次数 */
  iterations: number;
  /** 是否因为达到最大迭代次数而结束 */
  hitIterationLimit: boolean;
  /** 使用的工具调用历史 */
  toolCalls: AgentLoopToolCall[];
}

/**
 * Agent Loop 节点执行数据
 * 用于在节点处理器中传递数据
 */
export interface AgentLoopExecutionData {
  /** 节点ID */
  nodeId: ID;
  /** 线程ID */
  threadId: ID;
  /** 输入提示词 */
  prompt?: string;
  /** 节点配置 */
  config: AgentLoopNodeConfig;
}
