/**
 * Agent 事件类型定义
 *
 * 注意：LLM 层的流式事件（如文本增量、思考内容等）由 MessageStreamEvent 提供，
 * 此处仅定义 Agent 层特有的事件（工具调用、迭代完成等）。
 *
 * 架构设计：
 * - LLM API 流式响应 → MessageStream → MessageStreamEvent
 * - AgentLoopExecutor 订阅 MessageStreamEvent，并产生 AgentStreamEvent
 * - 上层消费者同时接收两类事件
 */

/**
 * Agent 事件类型
 *
 * 仅包含 Agent 层特有的事件，不包含 LLM 层事件
 */
export enum AgentStreamEventType {
    /** 开始执行 */
    START = 'agent_start',
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
 * Agent 事件基类
 */
export interface AgentStreamEvent {
    type: AgentStreamEventType;
    timestamp: number;
    data?: any;
}
