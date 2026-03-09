/**
 * Agent 核心类型定义
 */

import type { ID } from './common.js';
import type { Message } from './message/index.js';

/**
 * Agent 循环配置
 */
export interface AgentLoopConfig {
    /** LLM Profile ID */
    profileId?: ID;
    /** 系统提示词 */
    systemPrompt?: string;
    /** 最大迭代次数（-1 表示无限制） */
    maxIterations?: number;
    /** 初始消息列表 */
    initialMessages?: Message[];
    /** 允许使用的工具列表（工具 ID 数组） */
    tools?: string[];
    /** 是否流式输出 */
    stream?: boolean;
}

/**
 * Agent 循环结果
 */
export interface AgentLoopResult {
    /** 执行是否成功 */
    success: boolean;
    /** 最终回复内容 */
    content?: string;
    /** 迭代次数 */
    iterations: number;
    /** 工具调用记录数量 */
    toolCallCount: number;
    /** 错误信息 */
    error?: any;
}

/**
 * Agent 流式事件类型
 */
export enum AgentStreamEventType {
    /** 开始执行 */
    START = 'agent_start',
    /** 模型正在生成 */
    THINKING = 'agent_thinking',
    /** 模型回复块（内容增量） */
    CONTENT_CHUNK = 'agent_content_chunk',
    /** 工具调用开始 */
    TOOL_CALL_START = 'agent_tool_call_start',
    /** 工具调用结束 */
    TOOL_CALL_END = 'agent_tool_call_end',
    /** 工具迭代完成 */
    ITERATION_COMPLETE = 'agent_iteration_complete',
    /** 整体执行完成 */
    COMPLETE = 'agent_complete',
    /** 发生错误 */
    ERROR = 'agent_error',
}

/**
 * Agent 流式事件基类
 */
export interface AgentStreamEvent {
    type: AgentStreamEventType;
    timestamp: number;
    data?: any;
}
