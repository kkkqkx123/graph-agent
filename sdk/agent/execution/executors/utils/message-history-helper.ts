/**
 * Message History Helper
 *
 * Provides utility functions for creating and initializing message history
 * in Agent Loop execution context.
 *
 * Design Principles:
 * - Stateless helper functions
 * - Reusable across Agent executors
 * - Encapsulates message history initialization logic
 */

import type { LLMMessage } from '@modular-agent/types';
import type { AgentLoopConfig } from '@modular-agent/types';
import { MessageHistory } from '../../../../core/messages/message-history.js';

/**
 * Create a new message history instance
 *
 * @returns New MessageHistory instance
 */
export function createMessageHistory(): MessageHistory {
    return new MessageHistory();
}

/**
 * Initialize message history with config and existing messages
 *
 * @param messageHistory MessageHistory instance to initialize
 * @param config Agent loop configuration
 * @param existingMessages Existing messages to add
 */
export function initializeMessageHistory(
    messageHistory: MessageHistory,
    config: AgentLoopConfig,
    existingMessages: LLMMessage[]
): void {
    // Add system prompt if provided
    if (config.systemPrompt) {
        messageHistory.addSystemMessage(config.systemPrompt);
    }

    // Add existing messages
    if (existingMessages.length > 0) {
        messageHistory.initializeHistory(existingMessages);
    } else if (config.initialMessages && config.initialMessages.length > 0) {
        messageHistory.initializeHistory(config.initialMessages as LLMMessage[]);
    }
}

/**
 * Build assistant message from LLM response
 *
 * @param content Response content
 * @param toolCalls Tool calls from response
 * @returns LLMMessage in assistant format
 */
export function buildAssistantMessage(
    content: string,
    toolCalls?: Array<{ id: string; name: string; arguments: string }>
): LLMMessage {
    return {
        role: 'assistant',
        content,
        toolCalls: toolCalls?.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
                name: tc.name,
                arguments: tc.arguments
            }
        }))
    };
}

/**
 * Build tool result message
 *
 * @param toolCallId Tool call ID
 * @param content Result content
 * @returns LLMMessage in tool format
 */
export function buildToolResultMessage(
    toolCallId: string,
    content: string
): LLMMessage {
    return {
        role: 'tool',
        toolCallId,
        content
    };
}
