/**
 * Agent Loop 执行记录类型定义
 */

/**
 * 工具调用记录
 */
export interface ToolCallRecord {
    /** 工具调用 ID */
    id: string;
    /** 工具名称 */
    name: string;
    /** 调用参数 */
    arguments: any;
    /** 执行结果 */
    result?: any;
    /** 错误信息 */
    error?: string;
    /** 开始时间 */
    startTime: number;
    /** 结束时间 */
    endTime?: number;
}

/**
 * 迭代记录
 */
export interface IterationRecord {
    /** 迭代序号 */
    iteration: number;
    /** 开始时间 */
    startTime: number;
    /** 结束时间 */
    endTime?: number;
    /** 工具调用记录 */
    toolCalls: ToolCallRecord[];
    /** LLM 响应内容 */
    responseContent?: string;
}
