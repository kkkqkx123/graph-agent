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
import { createContextualLogger } from '../../../utils/contextual-logger.js';

const logger = createContextualLogger({ component: 'ConversationCoordinator' });

export class ConversationCoordinator {
    constructor(private registry: AgentLoopRegistry) { }

    /**
     * 获取对话历史管理器
     * @param agentLoopId Agent Loop ID
     */
    getHistoryManager(agentLoopId: string): MessageHistoryManager | undefined {
        logger.debug('Getting conversation history manager', { agentLoopId });

        const loop = this.registry.get(agentLoopId);
        if (!loop) {
            logger.warn('Agent Loop not found when getting history manager', { agentLoopId });
            return undefined;
        }

        return loop.messageHistoryManager;
    }

    /**
     * 规范化并获取历史
     * @param agentLoopId Agent Loop ID
     */
    async getNormalizedHistory(agentLoopId: string): Promise<LLMMessage[]> {
        logger.debug('Getting normalized conversation history', { agentLoopId });

        const manager = this.getHistoryManager(agentLoopId);
        if (!manager) {
            logger.warn('Message history manager not found', { agentLoopId });
            return [];
        }

        manager.normalizeHistory();
        const messages = manager.getMessages();

        logger.debug('Normalized conversation history retrieved', {
            agentLoopId,
            messageCount: messages.length
        });

        return messages;
    }

    /**
     * 获取对话统计
     * @param agentLoopId Agent Loop ID
     */
    async getConversationStats(agentLoopId: string) {
        logger.debug('Getting conversation statistics', { agentLoopId });

        const manager = this.getHistoryManager(agentLoopId);
        if (!manager) {
            logger.warn('Message history manager not found when getting stats', { agentLoopId });
            return undefined;
        }

        const stats = manager.getStats();

        logger.debug('Conversation statistics retrieved', {
            agentLoopId,
            totalMessages: stats.totalMessages,
            roleDistribution: stats.roleDistribution
        });

        return stats;
    }
}
