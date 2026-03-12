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
 * - 支持 Hook 机制，在关键执行点触发自定义逻辑
 *
 * 流式事件架构：
 * - LLM 层事件（text, inputJson, message 等）由 MessageStream 产生
 * - Agent 层事件（tool_call_start/end, iteration_complete 等）由本执行器产生
 * - executeStream 返回联合类型 AgentLoopStreamEvent，包含两类事件
 *
 * Hook 集成：
 * - BEFORE_ITERATION / AFTER_ITERATION: 迭代前后
 * - BEFORE_TOOL_CALL / AFTER_TOOL_CALL: 工具调用前后
 * - BEFORE_LLM_CALL / AFTER_LLM_CALL: LLM 调用前后
 */

import type {
    AgentLoopConfig,
    AgentLoopResult,
    AgentStreamEvent,
    AgentCustomEvent,
    LLMMessage
} from '@modular-agent/types';
import { AgentStreamEventType, AgentLoopStatus } from '@modular-agent/types';
import { AgentLoopEntity } from '../../entities/agent-loop-entity.js';
import { ToolService } from '../../../core/services/tool-service.js';
import { MessageHistory } from '../../../core/messages/message-history.js';
import type { MessageStreamEvent } from '../../../core/llm/message-stream-events.js';
import { isAbortError, checkInterruption } from '@modular-agent/common-utils';
import { LLMExecutor } from '../../../core/executors/llm-executor.js';
import { ToolCallExecutor } from '../../../core/executors/tool-call-executor.js';
import { executeAgentHook } from '../handlers/hook-handlers/index.js';
import type { ErrorService } from '../../../core/services/error-service.js';
import type { EventManager } from '../../../core/services/event-manager.js';
import { safeEmit } from '../../../core/utils/event/event-emitter.js';
import {
    handleAgentError,
    handleAgentInterruption as handleAgentInterruptionHandler
} from '../handlers/agent-error-handler.js';
import { createContextualLogger } from '../../../utils/contextual-logger.js';

const logger = createContextualLogger({ component: 'AgentLoopExecutor' });

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
 * - 集成 Hook 机制，支持在关键执行点触发自定义逻辑
 */
export class AgentLoopExecutor {
    private llmExecutor: LLMExecutor;
    private toolCallExecutor: ToolCallExecutor;
    private toolService: ToolService;  // 保留用于 prepareToolSchemas
    private errorService?: ErrorService;
    private eventManager?: EventManager;
    private emitEvent?: (event: AgentCustomEvent) => Promise<void>;

    constructor(
        llmExecutor: LLMExecutor,
        toolService: ToolService,
        errorService?: ErrorService,
        eventManager?: EventManager,
        emitEvent?: (event: AgentCustomEvent) => Promise<void>
    ) {
        this.llmExecutor = llmExecutor;
        this.toolService = toolService;
        this.errorService = errorService;
        this.eventManager = eventManager;
        this.toolCallExecutor = new ToolCallExecutor(toolService);
        this.emitEvent = emitEvent;
    }

    /**
     * 设置事件发射函数
     * @param emitEvent 事件发射函数
     */
    setEventEmitter(emitEvent: (event: AgentCustomEvent) => Promise<void>): void {
        this.emitEvent = emitEvent;
    }

    /**
     * 设置错误处理服务
     * @param errorService 错误处理服务
     */
    setErrorService(errorService: ErrorService): void {
        this.errorService = errorService;
    }

    /**
     * 设置事件管理器
     * @param eventManager 事件管理器
     */
    setEventManager(eventManager: EventManager): void {
        this.eventManager = eventManager;
    }

    /**
     * 统一的事件发射方法
     * 优先使用 EventManager，否则使用 emitEvent 回调
     * @param event Agent 自定义事件
     */
    private async emitAgentEvent(event: AgentCustomEvent): Promise<void> {
        if (this.eventManager) {
            await safeEmit(this.eventManager, event);
        } else if (this.emitEvent) {
            await this.emitEvent(event);
        }
    }

    /**
     * 获取默认的事件发射函数（空操作）
     */
    private getDefaultEmitter(): (event: AgentCustomEvent) => Promise<void> {
        return async (_event: AgentCustomEvent) => {
            // 默认空操作
        };
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

        logger.info('Agent Loop execution started', {
            agentLoopId: entity.id,
            maxIterations,
            toolsCount: config.tools?.length || 0,
            profileId: config.profileId || 'DEFAULT'
        });

        // 初始化消息历史
        this.initializeMessageHistory(messageHistory, config, entity.getMessages());

        logger.debug('Message history initialized', {
            agentLoopId: entity.id,
            initialMessagesCount: messageHistory.getMessages().length
        });

        // 准备工具信息
        const toolSchemas = this.prepareToolSchemas(config);

        if (toolSchemas) {
            logger.debug('Tool schemas prepared', {
                agentLoopId: entity.id,
                toolsCount: toolSchemas.length
            });
        }

        try {
            while (entity.state.currentIteration < maxIterations) {
                logger.debug('Starting new iteration', {
                    agentLoopId: entity.id,
                    iteration: entity.state.currentIteration + 1,
                    maxIterations
                });

                // 检查中断信号
                if (entity.isAborted() || entity.shouldStop()) {
                    logger.info('Agent Loop execution cancelled', {
                        agentLoopId: entity.id,
                        iteration: entity.state.currentIteration
                    });
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
                    logger.info('Agent Loop execution paused', {
                        agentLoopId: entity.id,
                        iteration: entity.state.currentIteration
                    });
                    entity.state.pause();
                    return {
                        success: false,
                        iterations: entity.state.currentIteration,
                        toolCallCount: entity.state.toolCallCount,
                        error: 'Execution paused'
                    };
                }

                // ========== BEFORE_ITERATION Hook ==========
                await executeAgentHook(entity, 'BEFORE_ITERATION', this.emitAgentEvent.bind(this));

                // 开始新迭代
                entity.state.startIteration();

                // ========== BEFORE_LLM_CALL Hook ==========
                await executeAgentHook(entity, 'BEFORE_LLM_CALL', this.emitAgentEvent.bind(this));

                logger.debug('Calling LLM', {
                    agentLoopId: entity.id,
                    iteration: entity.state.currentIteration,
                    messageCount: messageHistory.getMessages().length
                });

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

                logger.debug('LLM call completed', {
                    agentLoopId: entity.id,
                    iteration: entity.state.currentIteration,
                    success: llmResult.success,
                    hasToolCalls: llmResult.success ? !!llmResult.result?.toolCalls?.length : false
                });

                // 处理中断状态
                if (!llmResult.success) {
                    const interruption = llmResult.interruption;
                    if (interruption.type === 'paused') {
                        logger.info('LLM call paused', { agentLoopId: entity.id, iteration: entity.state.currentIteration });
                        entity.state.pause();
                        return {
                            success: false,
                            iterations: entity.state.currentIteration,
                            toolCallCount: entity.state.toolCallCount,
                            error: 'Execution paused'
                        };
                    }
                    if (interruption.type === 'stopped' || interruption.type === 'aborted') {
                        logger.info('LLM call stopped', { agentLoopId: entity.id, iteration: entity.state.currentIteration });
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

                // ========== AFTER_LLM_CALL Hook ==========
                await executeAgentHook(
                    entity,
                    'AFTER_LLM_CALL',
                    this.emitAgentEvent.bind(this),
                    undefined,
                    { content: response.content, toolCalls: response.toolCalls }
                );

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
                    logger.debug('No tool calls required, completing execution', {
                        agentLoopId: entity.id,
                        iteration: entity.state.currentIteration,
                        contentLength: response.content.length
                    });

                    entity.state.endIteration(response.content);

                    // ========== AFTER_ITERATION Hook ==========
                    await executeAgentHook(entity, 'AFTER_ITERATION', this.emitAgentEvent.bind(this));

                    entity.state.complete();
                    logger.info('Agent Loop execution completed successfully', {
                        agentLoopId: entity.id,
                        iterations: entity.state.currentIteration,
                        toolCallCount: entity.state.toolCallCount
                    });
                    return {
                        success: true,
                        content: response.content,
                        iterations: entity.state.currentIteration,
                        toolCallCount: entity.state.toolCallCount
                    };
                }

                // 执行工具调用
                if (response.toolCalls && response.toolCalls.length > 0) {
                    logger.debug('Executing tool calls', {
                        agentLoopId: entity.id,
                        iteration: entity.state.currentIteration,
                        toolCallCount: response.toolCalls.length
                    });

                    // 保存原始工具调用信息用于 Hook
                    const originalToolCalls = response.toolCalls;

                    // 使用 ToolCallExecutor 执行工具调用
                    const toolResults = await this.toolCallExecutor.executeToolCalls(
                        response.toolCalls.map(tc => ({
                            id: tc.id,
                            name: tc.name,
                            arguments: tc.arguments
                        })),
                        messageHistory as any,  // MessageHistory 实现了 addMessage 方法
                        entity.id,
                        entity.nodeId,
                        { abortSignal: entity.getAbortSignal() }
                    );

                    logger.debug('Tool calls execution completed', {
                        agentLoopId: entity.id,
                        iteration: entity.state.currentIteration,
                        successCount: toolResults.filter(r => r.success).length,
                        failureCount: toolResults.filter(r => !r.success).length
                    });

                    // 处理结果
                    for (const result of toolResults) {
                        // ========== BEFORE_TOOL_CALL Hook ==========
                        const originalToolCall = originalToolCalls.find(tc => tc.id === result.toolCallId);
                        const toolCallInfo = {
                            id: result.toolCallId,
                            name: originalToolCall?.name || '',
                            arguments: originalToolCall?.arguments ?
                                JSON.parse(originalToolCall.arguments) : {}
                        };
                        await executeAgentHook(entity, 'BEFORE_TOOL_CALL', this.emitAgentEvent.bind(this), toolCallInfo);

                        if (result.success) {
                            logger.debug('Tool call succeeded', {
                                agentLoopId: entity.id,
                                toolCallId: result.toolCallId,
                                toolName: toolCallInfo.name
                            });

                            entity.state.recordToolCallEnd(result.toolCallId, result.result);

                            // ========== AFTER_TOOL_CALL Hook ==========
                            await executeAgentHook(entity, 'AFTER_TOOL_CALL', this.emitAgentEvent.bind(this), {
                                ...toolCallInfo,
                                result: result.result
                            });
                        } else {
                            logger.warn('Tool call failed', {
                                agentLoopId: entity.id,
                                toolCallId: result.toolCallId,
                                toolName: toolCallInfo.name,
                                error: result.error
                            });

                            entity.state.recordToolCallEnd(result.toolCallId, undefined, result.error);

                            // ========== AFTER_TOOL_CALL Hook (with error) ==========
                            await executeAgentHook(entity, 'AFTER_TOOL_CALL', this.emitAgentEvent.bind(this), {
                                ...toolCallInfo,
                                error: result.error
                            });
                        }
                    }
                }

                logger.debug('Iteration completed', {
                    agentLoopId: entity.id,
                    iteration: entity.state.currentIteration
                });

                entity.state.endIteration(response.content);

                // ========== AFTER_ITERATION Hook ==========
                await executeAgentHook(entity, 'AFTER_ITERATION', this.emitAgentEvent.bind(this));
            }

            // 达到最大迭代次数
            logger.info('Agent Loop reached maximum iterations', {
                agentLoopId: entity.id,
                maxIterations,
                toolCallCount: entity.state.toolCallCount
            });

            entity.state.complete();
            return {
                success: true,
                iterations: entity.state.currentIteration,
                toolCallCount: entity.state.toolCallCount,
                content: "Reached maximum iterations without final answer."
            };

        } catch (error) {
            // 使用统一的错误处理器
            const standardizedError = await handleAgentError(
                entity,
                error as Error,
                'agent_loop_execution'
            );

            return {
                success: false,
                iterations: entity.state.currentIteration,
                toolCallCount: entity.state.toolCallCount,
                error: standardizedError
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
     * Hook 集成：
     * - 在关键执行点触发 Hook（迭代前后、工具调用前后、LLM 调用前后）
     *
     * @param entity Agent Loop 实体
     * @returns 流式事件生成器
     */
    async *executeStream(entity: AgentLoopEntity): AsyncGenerator<AgentLoopStreamEvent> {
        const config = entity.config;
        const maxIterations = config.maxIterations ?? 10;
        const messageHistory = this.createMessageHistory();

        logger.info('Agent Loop stream execution started', {
            agentLoopId: entity.id,
            maxIterations,
            toolsCount: config.tools?.length || 0,
            profileId: config.profileId || 'DEFAULT'
        });

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
                logger.debug('Starting new stream iteration', {
                    agentLoopId: entity.id,
                    iteration: entity.state.currentIteration + 1,
                    maxIterations
                });

                // 检查中断信号
                if (entity.isAborted() || entity.shouldStop()) {
                    logger.info('Agent Loop stream execution cancelled', {
                        agentLoopId: entity.id,
                        iteration: entity.state.currentIteration
                    });
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
                    logger.info('Agent Loop stream execution paused', {
                        agentLoopId: entity.id,
                        iteration: entity.state.currentIteration
                    });
                    entity.state.pause();
                    yield {
                        type: AgentStreamEventType.ERROR,
                        timestamp: Date.now(),
                        data: { error: 'Execution paused' }
                    };
                    return;
                }

                // ========== BEFORE_ITERATION Hook ==========
                await executeAgentHook(entity, 'BEFORE_ITERATION', this.emitAgentEvent.bind(this));

                // 开始新迭代
                entity.state.startIteration();

                // ========== BEFORE_LLM_CALL Hook ==========
                await executeAgentHook(entity, 'BEFORE_LLM_CALL', this.emitAgentEvent.bind(this));

                logger.debug('Calling LLM for stream', {
                    agentLoopId: entity.id,
                    iteration: entity.state.currentIteration,
                    messageCount: messageHistory.getMessages().length
                });

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

                logger.debug('LLM stream call completed', {
                    agentLoopId: entity.id,
                    iteration: entity.state.currentIteration,
                    success: llmResult.success
                });

                // 处理中断状态
                if (!llmResult.success) {
                    const interruption = llmResult.interruption;
                    if (interruption.type === 'paused') {
                        logger.info('LLM stream call paused', { agentLoopId: entity.id, iteration: entity.state.currentIteration });
                        entity.state.pause();
                        yield {
                            type: AgentStreamEventType.ERROR,
                            timestamp: Date.now(),
                            data: { error: 'Execution paused' }
                        };
                        return;
                    }
                    if (interruption.type === 'stopped' || interruption.type === 'aborted') {
                        logger.info('LLM stream call stopped', { agentLoopId: entity.id, iteration: entity.state.currentIteration });
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
                        const isInterruption = await handleAgentInterruptionHandler(
                            entity,
                            error,
                            'llm_stream_call'
                        );
                        if (isInterruption) {
                            yield {
                                type: AgentStreamEventType.ERROR,
                                timestamp: Date.now(),
                                data: { error: entity.state.error?.message || 'Execution interrupted' }
                            };
                            return;
                        }
                    }

                    // 其他错误 - 使用统一的错误处理器
                    const standardizedError = await handleAgentError(
                        entity,
                        error,
                        'llm_stream_call'
                    );

                    yield {
                        type: AgentStreamEventType.ERROR,
                        timestamp: Date.now(),
                        data: { error: standardizedError }
                    };
                    return;
                }

                const messageStream = llmWrapperResult.value;

                // 实时转发 MessageStream 事件
                // 使用事件队列实现实时转发，避免批量收集
                const eventQueue: MessageStreamEvent[] = [];
                let streamDone = false;
                let streamError: Error | null = null;

                // 订阅 MessageStream 事件并放入队列
                messageStream
                    .on('text', ((delta: string, snapshot: string) => {
                        eventQueue.push({
                            type: 'text',
                            delta,
                            snapshot
                        });
                    }) as any)
                    .on('inputJson', ((partialJson: string, parsedSnapshot: unknown, snapshot: LLMMessage) => {
                        eventQueue.push({
                            type: 'inputJson',
                            partialJson,
                            parsedSnapshot,
                            snapshot
                        });
                    }) as any)
                    .on('message', ((message: LLMMessage) => {
                        eventQueue.push({
                            type: 'message',
                            message
                        });
                    }) as any)
                    .on('error', ((error: Error) => {
                        eventQueue.push({
                            type: 'error',
                            error
                        });
                    }) as any);

                // 启动流完成等待（不阻塞）
                const donePromise = messageStream.done().then(() => {
                    streamDone = true;
                }).catch((error) => {
                    streamError = error;
                    streamDone = true;
                });

                // 实时转发事件
                while (!streamDone || eventQueue.length > 0) {
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

                    // 转发队列中的事件
                    while (eventQueue.length > 0) {
                        const event = eventQueue.shift()!;
                        yield event;
                    }

                    // 等待一小段时间让新事件进入队列
                    if (!streamDone) {
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                }

                // 处理流完成时的错误
                if (streamError) {
                    const error = streamError;
                    // 处理流式完成时的中断错误
                    if (isAbortError(error)) {
                        const isInterruption = await handleAgentInterruptionHandler(
                            entity,
                            error,
                            'message_stream_done'
                        );
                        if (isInterruption) {
                            yield {
                                type: AgentStreamEventType.ERROR,
                                timestamp: Date.now(),
                                data: { error: entity.state.error?.message || 'Execution interrupted' }
                            };
                            return;
                        }
                    }

                    // 其他错误 - 使用统一的错误处理器
                    const standardizedError = await handleAgentError(
                        entity,
                        error,
                        'message_stream_done'
                    );

                    yield {
                        type: AgentStreamEventType.ERROR,
                        timestamp: Date.now(),
                        data: { error: standardizedError }
                    };
                    return;
                }

                const finalResult = await messageStream.getFinalResult();

                // ========== AFTER_LLM_CALL Hook ==========
                await executeAgentHook(
                    entity,
                    'AFTER_LLM_CALL',
                    this.emitAgentEvent.bind(this),
                    undefined,
                    { content: finalResult.content, toolCalls: finalResult.toolCalls }
                );

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
                    logger.debug('No tool calls required in stream, completing execution', {
                        agentLoopId: entity.id,
                        iteration: entity.state.currentIteration,
                        contentLength: finalResult.content.length
                    });

                    entity.state.endIteration(finalResult.content);

                    // ========== AFTER_ITERATION Hook ==========
                    await executeAgentHook(entity, 'AFTER_ITERATION', this.emitAgentEvent.bind(this));

                    entity.state.complete();
                    logger.info('Agent Loop stream execution completed successfully', {
                        agentLoopId: entity.id,
                        iterations: entity.state.currentIteration,
                        toolCallCount: entity.state.toolCallCount
                    });
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

                logger.debug('Executing tool calls in stream', {
                    agentLoopId: entity.id,
                    iteration: entity.state.currentIteration,
                    toolCallCount: finalResult.toolCalls.length
                });

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

                    const args = typeof toolCall.function.arguments === 'string'
                        ? JSON.parse(toolCall.function.arguments)
                        : toolCall.function.arguments;

                    // ========== BEFORE_TOOL_CALL Hook ==========
                    const toolCallInfo = {
                        id: toolCall.id,
                        name: toolCall.function.name,
                        arguments: args
                    };
                    await executeAgentHook(entity, 'BEFORE_TOOL_CALL', this.emitAgentEvent.bind(this), toolCallInfo);

                    yield {
                        type: AgentStreamEventType.TOOL_CALL_START,
                        timestamp: Date.now(),
                        data: { toolCall }
                    };

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

                        // ========== AFTER_TOOL_CALL Hook ==========
                        await executeAgentHook(entity, 'AFTER_TOOL_CALL', this.emitAgentEvent.bind(this), {
                            ...toolCallInfo,
                            result: result
                        });

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
                            const isInterruption = await handleAgentInterruptionHandler(
                                entity,
                                error,
                                'tool_call_execution'
                            );
                            if (isInterruption) {
                                yield {
                                    type: AgentStreamEventType.ERROR,
                                    timestamp: Date.now(),
                                    data: { error: entity.state.error?.message || 'Execution interrupted during tool call' }
                                };
                                return;
                            }
                        }

                        // 其他错误 - 使用统一的错误处理器
                        const standardizedError = await handleAgentError(
                            entity,
                            error,
                            'tool_call_execution',
                            {
                                toolCallId: toolCall.id,
                                toolName: toolCall.function.name
                            }
                        );

                        const errorMessage = error.message;
                        messageHistory.addToolResultMessage(
                            toolCall.id,
                            JSON.stringify({ error: errorMessage })
                        );
                        entity.state.recordToolCallEnd(toolCall.id, undefined, errorMessage);

                        // ========== AFTER_TOOL_CALL Hook (with error) ==========
                        await executeAgentHook(entity, 'AFTER_TOOL_CALL', this.emitAgentEvent.bind(this), {
                            ...toolCallInfo,
                            error: errorMessage
                        });

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

                logger.debug('Stream iteration completed', {
                    agentLoopId: entity.id,
                    iteration: entity.state.currentIteration
                });

                entity.state.endIteration(finalResult.content);

                // ========== AFTER_ITERATION Hook ==========
                await executeAgentHook(entity, 'AFTER_ITERATION', this.emitAgentEvent.bind(this));
            }

            // 达到最大迭代次数
            logger.info('Agent Loop stream reached maximum iterations', {
                agentLoopId: entity.id,
                maxIterations,
                toolCallCount: entity.state.toolCallCount
            });

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
            // 使用统一的错误处理器
            const standardizedError = await handleAgentError(
                entity,
                error as Error,
                'agent_loop_stream_execution'
            );

            yield {
                type: AgentStreamEventType.ERROR,
                timestamp: Date.now(),
                data: { error: standardizedError }
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
            messageHistory.initializeHistory(existingMessages);
        } else if (config.initialMessages && config.initialMessages.length > 0) {
            messageHistory.initializeHistory(config.initialMessages as LLMMessage[]);
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
