/**
 * ConversationCoordinator - 对话协调器
 *
 * 职责：
 * - 提供无状态的对话管理协调逻辑
 * - 封装对话历史的规范化和统计逻辑
 * - 协调多个 Agent Loop 之间的消息流（未来扩展）
 *
 * 设计原则：
 * - 无状态：所有状态由 AgentLoopEntity 或其管理器持有
 * - 协调性：作为高层接口，协调底层组件完成复杂任务
 */

import { LLMMessage } from '@modular-agent/types';
import { AgentLoopRegistry } from '../../services/agent-loop-registry.js';
import { MessageHistoryManager } from '../managers/message-history-manager.js';

export class ConversationCoordinator {
    constructor(private registry: AgentLoopRegistry) { }

    /**
     * 获取对话历史管理器
     * @param agentLoopId Agent Loop ID
     */
    getHistoryManager(agentLoopId: string): MessageHistoryManager | undefined {
        const loop = this.registry.get(agentLoopId);
        if (!loop) return undefined;
        return loop.messageHistoryManager;
    }

    /**
     * 规范化并获取历史
     * @param agentLoopId Agent Loop ID
     */
    async getNormalizedHistory(agentLoopId: string): Promise<LLMMessage[]> {
        const manager = this.getHistoryManager(agentLoopId);
        if (!manager) return [];

        manager.normalizeHistory();
        return manager.getMessages();
    }

    /**
     * 获取对话统计
     * @param agentLoopId Agent Loop ID
     */
    async getConversationStats(agentLoopId: string) {
        const manager = this.getHistoryManager(agentLoopId);
        if (!manager) return undefined;

        return manager.getStats();
    }
}
