/**
 * Agent Loop 状态枚举定义
 */

/**
 * Agent Loop 执行状态枚举
 */
export enum AgentLoopStatus {
    /** 已创建，未开始执行 */
    CREATED = 'CREATED',
    /** 正在执行 */
    RUNNING = 'RUNNING',
    /** 已暂停 */
    PAUSED = 'PAUSED',
    /** 已完成 */
    COMPLETED = 'COMPLETED',
    /** 执行失败 */
    FAILED = 'FAILED',
    /** 已取消 */
    CANCELLED = 'CANCELLED',
}
