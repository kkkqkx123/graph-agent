/**
 * Agent 循环执行器
 *
 * 负责执行独立的 Agent 工具迭代循环，不依赖于图引擎。
 *
 * 设计原则：
 * - 无状态设计，所有状态通过 AgentLoopEntity 管理
 * - 支持暂停/恢复功能
 * - 支持中断控制（AbortController）
 * - 与 LLMExecutor、ToolCallExecutor 保持一致的架构
 *
 * 流式事件架构：
 * - LLM 层事件（text, inputJson, message 等）由 MessageStream 产生
 * - Agent 层事件（tool_call_start/end, iteration_complete 等）由本执行器产生
 * - executeStream 返回联合类型 AgentLoopStreamEvent，包含两类事件
 */

import type {
    AgentLoopConfig,
    AgentLoopResult,
    AgentStreamEvent,
    LLMMessage
} from '@modular-agent/types';
import { AgentStreamEventType, AgentLoopStatus } from '@modular-agent/types';
import { AgentLoopEntity } from '../../entities/agent-loop-entity.js';
import { LLMWrapper } from '../../../core/llm/index.js';
import { ToolService } from '../../../core/services/tool-service.js';
import { MessageHistory } from '../../../core/messages/message-history.js';
import type { MessageStreamEvent } from '../../../core/llm/message-stream-events.js';
import { isAbortError, checkInterruption } from '@modular-agent/common-utils';
import { LLMExecutor } from '../../../core/executors/llm-executor.js';
import { ToolCallExecutor } from '../../../core/executors/tool-call-executor.js';

/**
 * Agent Loop 流式事件
 *
 * 联合类型，包含：
 * - LLM 层事件（MessageStreamEvent）：文本增量、工具参数解析等
 * - Agent 层事件（AgentStreamEvent）：工具调用、迭代完成等
 */
export type AgentLoopStreamEvent = MessageStreamEvent | AgentStreamEvent;

/**
 * Agent 循环执行器类
 *
 * 提供方法来执行 Agent 循环（非流式和流式）
 * 接收 AgentLoopEntity 参数，支持状态追踪和中断控制
 * 
 * 重构说明：
 * - 复用 LLMExecutor 和 ToolCallExecutor，统一中断控制
 */
export class AgentLoopExecutor {
    private llmExecutor: LLMExecutor;
    private toolCallExecutor: ToolCallExecutor;
    private toolService: ToolService;  // 保留用于 prepareToolSchemas

    constructor(
        llmExecutor: LLMExecutor,
        toolService: ToolService
    ) {
        this.llmExecutor = llmExecutor;
        this.toolService = toolService;
        this.toolCallExecutor = new ToolCallExecutor(toolService);
    }

    /**
     * 执行 Agent Loop（基于 AgentLoopEntity）
     * @param entity Agent Loop 实体
     * @returns 执行结果
     */
    async execute(entity: AgentLoopEntity): Promise<AgentLoopResult> {
        const config = entity.config;
        const maxIterations = config.maxIterations ?? 10;
        const messageHistory = this.createMessageHistory();

        // 初始化消息历史
        this.initializeMessageHistory(messageHistory, config, entity.getMessages());

        // 准备工具信息
        const toolSchemas = this.prepareToolSchemas(config);

        try {
            while (entity.state.currentIteration < maxIterations) {
                // 检查中断信号
                if (entity.isAborted() || entity.shouldStop()) {
                    entity.state.cancel();
                    return {
                        success: false,
                        iterations: entity.state.currentIteration,
                        toolCallCount: entity.state.toolCallCount,
                        error: 'Execution cancelled'
                    };
                }

                // 检查暂停信号
                if (entity.shouldPause()) {
                    entity.state.pause();
                    return {
                        success: false,
                        iterations: entity.state.currentIteration,
                        toolCallCount: entity.state.toolCallCount,
                        error: 'Execution paused'
                    };
                }

                // 开始新迭代
                entity.state.startIteration();

                // 使用 LLMExecutor 调用 LLM
                const llmResult = await this.llmExecutor.executeLLMCall(
                    messageHistory.getMessages(),
                    {
                        prompt: '',  // Agent不需要prompt参数
                        profileId: config.profileId || 'DEFAULT',
                        parameters: {},
                        tools: toolSchemas as any,
                        stream: false
                    },
                    {
                        abortSignal: entity.getAbortSignal(),
                        threadId: entity.id,
                        nodeId: entity.nodeId
                    }
                );

                // 处理中断状态
                if (!llmResult.success) {
                    const interruption = llmResult.interruption;
                    if (interruption.type === 'paused') {
                        entity.state.pause();
                        return {
                            success: false,
                            iterations: entity.state.currentIteration,
                            toolCallCount: entity.state.toolCallCount,
                            error: 'Execution paused'
                        };
                    }
                    if (interruption.type === 'stopped' || interruption.type === 'aborted') {
                        entity.state.cancel();
                        return {
                            success: false,
                            iterations: entity.state.currentIteration,
                            toolCallCount: entity.state.toolCallCount,
                            error: 'Execution cancelled'
                        };
                    }
                    // 如果不是中断错误,抛出异常
                    throw new Error('LLM execution failed with unknown error');
                }

                const response = llmResult.result;

                // 记录助手消息
                const assistantMessage: LLMMessage = {
                    role: 'assistant',
                    content: response.content,
                    toolCalls: response.toolCalls?.map((tc: any) => ({
                        id: tc.id,
                        type: 'function' as const,
                        function: {
                            name: tc.function.name,
                            arguments: tc.function.arguments
                        }
                    }))
                };
                messageHistory.addAssistantMessage(
                    response.content,
                    response.toolCalls?.map((tc: any) => ({
                        id: tc.id,
                        type: 'function' as const,
                        function: {
                            name: tc.function.name,
                            arguments: tc.function.arguments
                        }
                    }))
                );
                entity.addMessage(assistantMessage);

                // 检查是否需要工具调用
                if (!response.toolCalls || response.toolCalls.length === 0) {
                    entity.state.endIteration(response.content);
                    entity.state.complete();
                    return {
                        success: true,
                        content: response.content,
                        iterations: entity.state.currentIteration,
                        toolCallCount: entity.state.toolCallCount
                    };
                }

                // 执行工具调用
                if (response.toolCalls && response.toolCalls.length > 0) {
                    // 使用 ToolCallExecutor 执行工具调用
                    const toolResults = await this.toolCallExecutor.executeToolCalls(
                        response.toolCalls.map((tc: any) => ({
                            id: tc.id,
                            name: tc.function.name,
                            arguments: tc.function.arguments
                        })),
                        messageHistory as any,  // MessageHistory 实现了 addMessage 方法
                        entity.id,
                        entity.nodeId,
                        { abortSignal: entity.getAbortSignal() }
                    );

                    // 处理结果
                    for (const result of toolResults) {
                        if (result.success) {
                            entity.state.recordToolCallEnd(result.toolCallId, result.result);
                        } else {
                            entity.state.recordToolCallEnd(result.toolCallId, undefined, result.error);
                        }
                    }
                }

                entity.state.endIteration(response.content);
            }

            // 达到最大迭代次数
            entity.state.complete();
            return {
                success: true,
                iterations: entity.state.currentIteration,
                toolCallCount: entity.state.toolCallCount,
                content: "Reached maximum iterations without final answer."
            };

        } catch (error) {
            entity.state.fail(error);
            return {
                success: false,
                iterations: entity.state.currentIteration,
                toolCallCount: entity.state.toolCallCount,
                error: error
            };
        }
    }

    /**
     * 流式执行 Agent Loop（基于 AgentLoopEntity）
     *
     * 返回联合类型 AgentLoopStreamEvent，包含：
     * - LLM 层事件（MessageStreamEvent）：直接转发 MessageStream 的事件
     * - Agent 层事件（AgentStreamEvent）：工具调用、迭代完成等
     *
     * @param entity Agent Loop 实体
     * @returns 流式事件生成器
     */
    async *executeStream(entity: AgentLoopEntity): AsyncGenerator<AgentLoopStreamEvent> {
        const config = entity.config;
        const maxIterations = config.maxIterations ?? 10;
        const messageHistory = this.createMessageHistory();

        // 初始化消息历史
        this.initializeMessageHistory(messageHistory, config, entity.getMessages());

        // 准备工具信息
        const toolSchemas = this.prepareToolSchemas(config);

        yield {
            type: AgentStreamEventType.START,
            timestamp: Date.now(),
            data: { config, loopId: entity.id }
        };

        try {
            while (entity.state.currentIteration < maxIterations) {
                // 检查中断信号
                if (entity.isAborted() || entity.shouldStop()) {
                    entity.state.cancel();
                    yield {
                        type: AgentStreamEventType.ERROR,
                        timestamp: Date.now(),
                        data: { error: 'Execution cancelled' }
                    };
                    return;
                }

                // 检查暂停信号
                if (entity.shouldPause()) {
                    entity.state.pause();
                    yield {
                        type: AgentStreamEventType.ERROR,
                        timestamp: Date.now(),
                        data: { error: 'Execution paused' }
                    };
                    return;
                }

                // 开始新迭代
                entity.state.startIteration();

                // 调用 LLM (流式) - 使用 LLMExecutor
                const llmResult = await this.llmExecutor.executeLLMCall(
                    messageHistory.getMessages(),
                    {
                        prompt: '',  // Agent不需要prompt参数
                        profileId: config.profileId || 'DEFAULT',
                        parameters: {},
                        tools: toolSchemas as any,
                        stream: true
                    },
                    {
                        abortSignal: entity.getAbortSignal(),
                        threadId: entity.id,
                        nodeId: entity.nodeId
                    }
                );

                // 处理中断状态
                if (!llmResult.success) {
                    const interruption = llmResult.interruption;
                    if (interruption.type === 'paused') {
                        entity.state.pause();
                        yield {
                            type: AgentStreamEventType.ERROR,
                            timestamp: Date.now(),
                            data: { error: 'Execution paused' }
                        };
                        return;
                    }
                    if (interruption.type === 'stopped' || interruption.type === 'aborted') {
                        entity.state.cancel();
                        yield {
                            type: AgentStreamEventType.ERROR,
                            timestamp: Date.now(),
                            data: { error: 'Execution cancelled' }
                        };
                        return;
                    }
                    // 如果不是中断错误,抛出异常
                    throw new Error('LLM execution failed with unknown error');
                }

                // 流式执行需要直接使用 LLMWrapper 的 generateStream
                // LLMExecutor 的流式实现不支持实时事件转发
                // 所以这里我们仍然使用 llmWrapper.generateStream
                // 但需要从 llmExecutor 中获取 llmWrapper
                const llmWrapperResult = await this.llmExecutor['llmWrapper'].generateStream({
                    profileId: config.profileId || 'DEFAULT',
                    messages: messageHistory.getMessages(),
                    tools: toolSchemas as any,
                    stream: true,
                    signal: entity.getAbortSignal(),
                });

                if (llmWrapperResult.isErr()) {
                    const error = llmWrapperResult.error;

                    // 处理中断错误
                    if (isAbortError(error)) {
                        const result = checkInterruption(entity.getAbortSignal());
                        entity.state.fail(error);
                        yield {
                            type: AgentStreamEventType.ERROR,
                            timestamp: Date.now(),
                            data: { error: result.type === 'paused' ? 'Execution paused' : 'Execution cancelled' }
                        };
                        return;
                    }

                    // 其他错误
                    entity.state.fail(error);
                    yield {
                        type: AgentStreamEventType.ERROR,
                        timestamp: Date.now(),
                        data: { error: error }
                    };
                    return;
                }

                const messageStream = llmWrapperResult.value;

                // 订阅 MessageStream 事件并转发
                // 使用事件监听器模式收集 LLM 层事件
                // 注意：MessageStream 的 on 方法在 emit 时会展开参数，所以需要使用展开参数的监听器类型
                const llmEvents: MessageStreamEvent[] = [];

                messageStream
                    .on('text', ((delta: string, snapshot: string) => {
                        llmEvents.push({
                            type: 'text',
                            delta,
                            snapshot
                        });
                    }) as any)
                    .on('inputJson', ((partialJson: string, parsedSnapshot: unknown, snapshot: LLMMessage) => {
                        llmEvents.push({
                            type: 'inputJson',
                            partialJson,
                            parsedSnapshot,
                            snapshot
                        });
                    }) as any)
                    .on('message', ((message: LLMMessage) => {
                        llmEvents.push({
                            type: 'message',
                            message
                        });
                    }) as any)
                    .on('error', ((error: Error) => {
                        llmEvents.push({
                            type: 'error',
                            error
                        });
                    }) as any);

                // 等待流完成，同时转发事件
                try {
                    await messageStream.done();
                } catch (error) {
                    // 处理流式完成时的中断错误
                    if (isAbortError(error)) {
                        const result = checkInterruption(entity.getAbortSignal());
                        entity.state.fail(error);
                        yield {
                            type: AgentStreamEventType.ERROR,
                            timestamp: Date.now(),
                            data: { error: result.type === 'paused' ? 'Execution paused' : 'Execution cancelled' }
                        };
                        return;
                    }
                    throw error;
                }

                // 转发收集到的 LLM 层事件
                for (const event of llmEvents) {
                    // 检查中断信号
                    if (entity.isAborted() || entity.shouldStop()) {
                        const result = checkInterruption(entity.getAbortSignal());
                        entity.state.cancel();
                        yield {
                            type: AgentStreamEventType.ERROR,
                            timestamp: Date.now(),
                            data: { error: result.type === 'paused' ? 'Execution paused' : 'Execution cancelled' }
                        };
                        return;
                    }
                    yield event;
                }

                const finalResult = await messageStream.getFinalResult();

                // 记录助手消息
                const assistantMessage: LLMMessage = {
                    role: 'assistant',
                    content: finalResult.content,
                    toolCalls: finalResult.toolCalls?.map((tc: any) => ({
                        id: tc.id,
                        type: 'function' as const,
                        function: {
                            name: tc.function.name,
                            arguments: tc.function.arguments
                        }
                    }))
                };
                messageHistory.addAssistantMessage(
                    finalResult.content,
                    finalResult.toolCalls?.map((tc: any) => ({
                        id: tc.id,
                        type: 'function' as const,
                        function: {
                            name: tc.function.name,
                            arguments: tc.function.arguments
                        }
                    }))
                );
                entity.addMessage(assistantMessage);

                // 检查是否需要工具调用
                if (!finalResult.toolCalls || finalResult.toolCalls.length === 0) {
                    entity.state.endIteration(finalResult.content);
                    entity.state.complete();
                    yield {
                        type: AgentStreamEventType.COMPLETE,
                        timestamp: Date.now(),
                        data: {
                            success: true,
                            iterations: entity.state.currentIteration,
                            toolCallCount: entity.state.toolCallCount,
                            content: finalResult.content
                        }
                    };
                    return;
                }

                // 执行工具调用
                for (const toolCall of finalResult.toolCalls) {
                    // 检查中断信号
                    if (entity.isAborted() || entity.shouldStop()) {
                        entity.state.cancel();
                        yield {
                            type: AgentStreamEventType.ERROR,
                            timestamp: Date.now(),
                            data: { error: 'Execution cancelled during tool call' }
                        };
                        return;
                    }

                    yield {
                        type: AgentStreamEventType.TOOL_CALL_START,
                        timestamp: Date.now(),
                        data: { toolCall }
                    };

                    const args = typeof toolCall.function.arguments === 'string'
                        ? JSON.parse(toolCall.function.arguments)
                        : toolCall.function.arguments;
                    entity.state.recordToolCallStart(toolCall.id, toolCall.function.name, args);

                    const executionResult = await this.toolService.execute(
                        toolCall.function.name,
                        {
                            parameters: args
                        },
                        {
                            signal: entity.getAbortSignal()  // 传递 AbortSignal
                        }
                    );

                    if (executionResult.isOk()) {
                        const result = executionResult.value.result;
                        messageHistory.addToolResultMessage(
                            toolCall.id,
                            JSON.stringify(result)
                        );
                        entity.state.recordToolCallEnd(toolCall.id, result);

                        const toolResultMessage: LLMMessage = {
                            role: 'tool',
                            toolCallId: toolCall.id,
                            content: JSON.stringify(result)
                        };
                        entity.addMessage(toolResultMessage);

                        yield {
                            type: AgentStreamEventType.TOOL_CALL_END,
                            timestamp: Date.now(),
                            data: { toolCallId: toolCall.id, result, success: true }
                        };
                    } else {
                        const error = executionResult.error;

                        // 处理中断错误
                        if (isAbortError(error)) {
                            const result = checkInterruption(entity.getAbortSignal());
                            entity.state.fail(error);
                            yield {
                                type: AgentStreamEventType.ERROR,
                                timestamp: Date.now(),
                                data: { error: result.type === 'paused' ? 'Execution paused during tool call' : 'Execution cancelled during tool call' }
                            };
                            return;
                        }

                        // 其他错误
                        const errorMessage = error.message;
                        messageHistory.addToolResultMessage(
                            toolCall.id,
                            JSON.stringify({ error: errorMessage })
                        );
                        entity.state.recordToolCallEnd(toolCall.id, undefined, errorMessage);

                        const toolResultMessage: LLMMessage = {
                            role: 'tool',
                            toolCallId: toolCall.id,
                            content: JSON.stringify({ error: errorMessage })
                        };
                        entity.addMessage(toolResultMessage);

                        yield {
                            type: AgentStreamEventType.TOOL_CALL_END,
                            timestamp: Date.now(),
                            data: { toolCallId: toolCall.id, error: errorMessage, success: false }
                        };
                    }
                }

                yield {
                    type: AgentStreamEventType.ITERATION_COMPLETE,
                    timestamp: Date.now(),
                    data: { iteration: entity.state.currentIteration }
                };

                entity.state.endIteration(finalResult.content);
            }

            // 达到最大迭代次数
            entity.state.complete();
            yield {
                type: AgentStreamEventType.COMPLETE,
                timestamp: Date.now(),
                data: {
                    success: true,
                    iterations: entity.state.currentIteration,
                    toolCallCount: entity.state.toolCallCount,
                    content: "Reached maximum iterations."
                }
            };

        } catch (error) {
            entity.state.fail(error);
            yield {
                type: AgentStreamEventType.ERROR,
                timestamp: Date.now(),
                data: { error }
            };
        }
    }

    // ========== 私有方法 ==========

    /**
     * 创建新的消息历史实例
     */
    private createMessageHistory(): MessageHistory {
        return new MessageHistory();
    }

    /**
     * 初始化消息历史
     */
    private initializeMessageHistory(
        messageHistory: MessageHistory,
        config: AgentLoopConfig,
        existingMessages: LLMMessage[]
    ): void {
        // 添加系统提示词
        if (config.systemPrompt) {
            messageHistory.addSystemMessage(config.systemPrompt);
        }

        // 添加已有消息
        if (existingMessages.length > 0) {
            messageHistory.initialize(existingMessages);
        } else if (config.initialMessages && config.initialMessages.length > 0) {
            messageHistory.initialize(config.initialMessages as LLMMessage[]);
        }
    }

    /**
     * 准备工具 Schema
     */
    private prepareToolSchemas(config: AgentLoopConfig): Array<{ id: string; description: string; parameters: any }> | undefined {
        if (!config.tools || config.tools.length === 0) {
            return undefined;
        }

        return config.tools
            .map(id => {
                const tool = this.toolService.getTool(id);
                return tool ? {
                    id: tool.id,
                    description: tool.description,
                    parameters: tool.parameters
                } : null;
            })
            .filter((t): t is { id: string; description: string; parameters: any } => t !== null);
    }
}
