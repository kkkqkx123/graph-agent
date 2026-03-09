/**
 * Agent 循环服务
 *
 * 负责执行独立的 Agent 工具迭代循环，不依赖于图引擎。
 * 参考 Lim-Code 的 ToolIterationLoopService 实现。
 */

import type {
    AgentLoopConfig,
    AgentLoopResult,
    AgentStreamEvent
} from '@modular-agent/types';
import { AgentStreamEventType } from '@modular-agent/types';
import { LLMWrapper } from '../core/llm/index.js';
import { ToolService } from '../core/services/tool-service.js';
import { MessageHistory } from '../core/messages/message-history.js';

export class AgentLoopService {
    /** 消息历史实例 */
    private messageHistory: MessageHistory;

    constructor(
        private llmWrapper: LLMWrapper,
        private toolService: ToolService
    ) {
        this.messageHistory = new MessageHistory();
    }

    /**
     * 获取消息历史实例
     * @returns MessageHistory 实例
     */
    getMessageHistory(): MessageHistory {
        return this.messageHistory;
    }

    /**
     * 运行 Agent 循环（非流式）
     * @param config 循环配置
     */
    async run(config: AgentLoopConfig): Promise<AgentLoopResult> {
        const maxIterations = config.maxIterations ?? 10;
        let iterations = 0;
        let toolCallCount = 0;

        // 1. 初始化对话
        this.messageHistory.clear();
        if (config.systemPrompt) {
            this.messageHistory.addSystemMessage(config.systemPrompt);
        }
        if (config.initialMessages && config.initialMessages.length > 0) {
            this.messageHistory.initialize(config.initialMessages);
        }

        // 2. 准备工具信息
        const toolSchemas = config.tools
            ? config.tools.map(id => {
                const tool = this.toolService.getTool(id);
                return tool ? {
                    id: tool.id,
                    description: tool.description,
                    parameters: tool.parameters
                } : null;
            }).filter(Boolean)
            : undefined;

        try {
            while (iterations < maxIterations) {
                // 3. 调用 LLM
                const llmResult = await this.llmWrapper.generate({
                    profileId: config.profileId || 'DEFAULT',
                    messages: this.messageHistory.getMessages(),
                    tools: toolSchemas as any,
                });

                if (llmResult.isErr()) {
                    return {
                        success: false,
                        iterations,
                        toolCallCount,
                        error: llmResult.error
                    };
                }

                const response = llmResult.value;
                this.messageHistory.addAssistantMessage(
                    response.content,
                    response.toolCalls?.map(tc => ({
                        id: tc.id,
                        type: 'function',
                        function: {
                            name: tc.function.name,
                            arguments: tc.function.arguments
                        }
                    }))
                );

                // 4. 检查并执行工具调用
                if (!response.toolCalls || response.toolCalls.length === 0) {
                    return {
                        success: true,
                        content: response.content,
                        iterations: iterations + 1,
                        toolCallCount
                    };
                }

                // 串行执行工具调用
                for (const toolCall of response.toolCalls) {
                    const executionResult = await this.toolService.execute(toolCall.function.name, {
                        parameters: typeof toolCall.function.arguments === 'string'
                            ? JSON.parse(toolCall.function.arguments)
                            : toolCall.function.arguments
                    });

                    if (executionResult.isOk()) {
                        this.messageHistory.addToolResultMessage(
                            toolCall.id,
                            JSON.stringify(executionResult.value.result)
                        );
                    } else {
                        this.messageHistory.addToolResultMessage(
                            toolCall.id,
                            JSON.stringify({ error: executionResult.error.message })
                        );
                    }
                    toolCallCount++;
                }

                iterations++;
            }

            return {
                success: true,
                iterations,
                toolCallCount,
                content: "Reached maximum iterations without final answer."
            };

        } catch (error) {
            return {
                success: false,
                iterations,
                toolCallCount,
                error: error
            };
        }
    }

    /**
     * 运行 Agent 循环（流式）
     * @param config 循环配置
     */
    async *runStream(config: AgentLoopConfig): AsyncGenerator<AgentStreamEvent> {
        const maxIterations = config.maxIterations ?? 10;
        let iterations = 0;
        let toolCallCount = 0;

        // 1. 初始化对话
        this.messageHistory.clear();
        if (config.systemPrompt) {
            this.messageHistory.addSystemMessage(config.systemPrompt);
        }
        if (config.initialMessages && config.initialMessages.length > 0) {
            this.messageHistory.initialize(config.initialMessages);
        }

        // 2. 准备工具信息
        const toolSchemas = config.tools
            ? config.tools.map(id => {
                const tool = this.toolService.getTool(id);
                return tool ? {
                    id: tool.id,
                    description: tool.description,
                    parameters: tool.parameters
                } : null;
            }).filter(Boolean)
            : undefined;

        yield {
            type: AgentStreamEventType.START,
            timestamp: Date.now(),
            data: { config }
        };

        try {
            while (iterations < maxIterations) {
                // 3. 调用 LLM (流式)
                const llmResult = await this.llmWrapper.generateStream({
                    profileId: config.profileId || 'DEFAULT',
                    messages: this.messageHistory.getMessages(),
                    tools: toolSchemas as any,
                    stream: true
                });

                if (llmResult.isErr()) {
                    yield {
                        type: AgentStreamEventType.ERROR,
                        timestamp: Date.now(),
                        data: { error: llmResult.error }
                    };
                    return;
                }

                const messageStream = llmResult.value;

                // 订阅流事件并转发
                for await (const event of messageStream) {
                    if (event.type === 'content_block_delta') {
                        if (event.data.delta.type === 'text_delta') {
                            yield {
                                type: AgentStreamEventType.CONTENT_CHUNK,
                                timestamp: Date.now(),
                                data: { delta: event.data.delta.text }
                            };
                        } else if (event.data.delta.type === 'thinking_delta') {
                            yield {
                                type: AgentStreamEventType.THINKING,
                                timestamp: Date.now(),
                                data: { delta: event.data.delta.thinking }
                            };
                        }
                    }
                }

                const finalResult = await messageStream.getFinalResult();
                this.messageHistory.addAssistantMessage(
                    finalResult.content,
                    finalResult.toolCalls?.map(tc => ({
                        id: tc.id,
                        type: 'function',
                        function: {
                            name: tc.function.name,
                            arguments: tc.function.arguments
                        }
                    }))
                );

                // 4. 检查并执行工具调用
                if (!finalResult.toolCalls || finalResult.toolCalls.length === 0) {
                    yield {
                        type: AgentStreamEventType.COMPLETE,
                        timestamp: Date.now(),
                        data: {
                            success: true,
                            iterations: iterations + 1,
                            toolCallCount,
                            content: finalResult.content
                        }
                    };
                    return;
                }

                // 执行工具调用并发送事件
                for (const toolCall of finalResult.toolCalls) {
                    yield {
                        type: AgentStreamEventType.TOOL_CALL_START,
                        timestamp: Date.now(),
                        data: { toolCall }
                    };

                    const executionResult = await this.toolService.execute(toolCall.function.name, {
                        parameters: typeof toolCall.function.arguments === 'string'
                            ? JSON.parse(toolCall.function.arguments)
                            : toolCall.function.arguments
                    });

                    if (executionResult.isOk()) {
                        this.messageHistory.addToolResultMessage(
                            toolCall.id,
                            JSON.stringify(executionResult.value.result)
                        );
                        yield {
                            type: AgentStreamEventType.TOOL_CALL_END,
                            timestamp: Date.now(),
                            data: { toolCallId: toolCall.id, result: executionResult.value.result, success: true }
                        };
                    } else {
                        this.messageHistory.addToolResultMessage(
                            toolCall.id,
                            JSON.stringify({ error: executionResult.error.message })
                        );
                        yield {
                            type: AgentStreamEventType.TOOL_CALL_END,
                            timestamp: Date.now(),
                            data: { toolCallId: toolCall.id, error: executionResult.error.message, success: false }
                        };
                    }
                    toolCallCount++;
                }

                yield {
                    type: AgentStreamEventType.ITERATION_COMPLETE,
                    timestamp: Date.now(),
                    data: { iteration: iterations + 1 }
                };

                iterations++;
            }

            yield {
                type: AgentStreamEventType.COMPLETE,
                timestamp: Date.now(),
                data: {
                    success: true,
                    iterations,
                    toolCallCount,
                    content: "Reached maximum iterations."
                }
            };

        } catch (error) {
            yield {
                type: AgentStreamEventType.ERROR,
                timestamp: Date.now(),
                data: { error }
            };
        }
    }
}
