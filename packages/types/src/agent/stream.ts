/**
 * Agent 流式事件类型定义
 */

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
