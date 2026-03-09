/**
 * Agent 对话服务
 * 提供轻量级的对话历史管理，不依赖于图引擎。
 */

import type { LLMMessage, LLMToolCall } from '@modular-agent/types';

export class ConversationService {
    private messages: LLMMessage[] = [];

    /**
     * 初始化对话内容
     * @param initialMessages 初始消息列表
     */
    initialize(initialMessages: LLMMessage[] = []): void {
        this.messages = [...initialMessages];
    }

    /**
     * 添加单个消息
     * @param message 消息对象
     */
    addMessage(message: LLMMessage): void {
        this.messages.push({ ...message });
    }

    /**
     * 添加用户消息
     * @param content 内容
     */
    addUserMessage(content: string): void {
        this.addMessage({ role: 'user', content });
    }

    /**
     * 添加助理消息
     * @param content 内容
     * @param toolCalls 工具调用（可选）
     */
    addAssistantMessage(content: string, toolCalls?: LLMToolCall[]): void {
        this.addMessage({
            role: 'assistant',
            content,
            toolCalls
        });
    }

    /**
     * 添加工具运行结果消息
     * @param toolCallId 工具调用 ID
     * @param content 结果内容
     */
    addToolResultMessage(toolCallId: string, content: string): void {
        this.addMessage({
            role: 'tool',
            toolCallId,
            content
        } as any);
    }

    /**
     * 获取所有消息
     */
    getMessages(): LLMMessage[] {
        return [...this.messages];
    }

    /**
     * 清空对话
     */
    clear(): void {
        this.messages = [];
    }
}
