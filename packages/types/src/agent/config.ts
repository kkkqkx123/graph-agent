/**
 * Agent Loop 配置类型定义
 */

import type { ID } from '../common.js';
import type { Message } from '../message/index.js';
import type { AgentHook } from './hooks.js';

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
    /** 是否在结束时创建检查点 */
    createCheckpointOnEnd?: boolean;
    /** 是否在出错时创建检查点 */
    createCheckpointOnError?: boolean;
    /** Hook 配置列表 */
    hooks?: AgentHook[];
}
