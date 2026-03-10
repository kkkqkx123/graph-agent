/**
 * Agent Loop 执行结果类型定义
 */

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
    /** Agent Loop ID */
    agentLoopId?: string;
}
