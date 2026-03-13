/**
 * Agent 错误处理器
 *
 * 职责：
 * - 处理 Agent Loop 执行过程中的错误
 * - 统一错误标准化和上下文构建
 * - 集成错误处理工具函数记录日志和触发事件
 * - 管理 Agent Loop 状态
 *
 * 设计原则：
 * - 函数式实现，无状态
 * - 使用无状态的错误处理工具函数
 * - severity 驱动：仅 ERROR 级别停止执行
 * - 与 Graph 模块的 error-handler.ts 保持一致
 */

import type { AgentLoopEntity } from '../../entities/agent-loop-entity.js';
import type { ErrorContext, SDKError } from '@modular-agent/types';
import type { EventManager } from '../../../core/managers/event-manager.js';
import { SDKError as SDKErrorClass } from '@modular-agent/types';
import { isAbortError, checkInterruption } from '@modular-agent/common-utils';
import { createContextualLogger } from '../../../utils/contextual-logger.js';
import { handleError } from '../../../core/utils/error-utils.js';

const logger = createContextualLogger({ component: 'AgentErrorHandler' });

/**
 * 构建 Agent 错误上下文
 *
 * @param entity Agent Loop 实体
 * @param operation 操作类型
 * @param additionalContext 额外的上下文信息
 * @returns 完整的错误上下文
 */
function buildAgentErrorContext(
    entity: AgentLoopEntity,
    operation: string,
    additionalContext?: Partial<ErrorContext>
): ErrorContext {
    return {
        threadId: entity.id,
        nodeId: entity.nodeId,
        operation,
        iteration: entity.state.currentIteration,
        toolCallCount: entity.state.toolCallCount,
        ...additionalContext
    };
}

/**
 * 标准化错误为 SDKError
 *
 * @param error 原始错误
 * @param context 错误上下文
 * @returns 标准化的 SDKError
 */
function standardizeAgentError(error: Error, context: ErrorContext): SDKError {
    // 如果已经是 SDKError，直接返回
    if (error instanceof SDKErrorClass) {
        return error;
    }

    // 否则包装为 SDKError，默认使用 ERROR 级别
    return new SDKErrorClass(
        error.message,
        'error',
        context,
        error
    );
}

/**
 * 判断是否为可恢复错误
 *
 * @param error SDKError 对象
 * @returns 是否可恢复
 */
function isRecoverableError(error: SDKError): boolean {
    // TimeoutError 和 ToolError 默认为 warning 级别，可恢复
    return error.severity === 'warning' || error.severity === 'info';
}

/**
 * 处理 Agent Loop 执行错误
 *
 * @param entity Agent Loop 实例
 * @param error 原始错误
 * @param operation 操作类型
 * @param additionalContext 额外的上下文信息
 * @param eventManager 事件管理器
 * @returns 标准化后的错误
 */
export async function handleAgentError(
    entity: AgentLoopEntity,
    error: Error,
    operation: string,
    additionalContext?: Partial<ErrorContext>,
    eventManager?: EventManager
): Promise<SDKError> {
    // 构建错误上下文
    const context = buildAgentErrorContext(entity, operation, additionalContext);

    logger.debug('Handling Agent Loop error', {
        agentLoopId: entity.id,
        operation,
        errorMessage: error.message,
        iteration: entity.state.currentIteration
    });

    // 标准化错误
    const standardizedError = standardizeAgentError(error, context);

    logger.info('Agent Loop error standardized', {
        agentLoopId: entity.id,
        operation,
        severity: standardizedError.severity,
        recoverable: isRecoverableError(standardizedError)
    });

    // 使用无状态的错误处理工具函数（记录日志和触发事件）
    await handleError(eventManager, standardizedError, {
        threadId: entity.id,
        workflowId: context.workflowId || '',
        nodeId: context.nodeId
    });

    // 根据 severity 决定是否停止执行
    if (standardizedError.severity === 'error') {
        entity.state.fail(standardizedError);
        logger.info('Agent Loop execution failed due to error', {
            agentLoopId: entity.id,
            operation,
            errorMessage: standardizedError.message
        });
    } else {
        logger.info('Agent Loop error is recoverable, continuing execution', {
            agentLoopId: entity.id,
            operation,
            severity: standardizedError.severity
        });
    }
    // WARNING 和 INFO 级别自动继续执行

    return standardizedError;
}

/**
 * 处理 Agent Loop 中断错误
 *
 * @param entity Agent Loop 实体
 * @param error 原始错误
 * @param operation 操作类型
 * @param eventManager 事件管理器
 * @returns 是否为中断错误
 */
export async function handleAgentInterruption(
    entity: AgentLoopEntity,
    error: Error,
    operation: string,
    eventManager?: EventManager
): Promise<boolean> {
    if (!isAbortError(error)) {
        return false;
    }

    const result = checkInterruption(entity.getAbortSignal());

    logger.info('Agent Loop interruption detected', {
        agentLoopId: entity.id,
        operation,
        interruptionType: result.type,
        iteration: entity.state.currentIteration
    });

    // 构建错误上下文
    const context = buildAgentErrorContext(entity, operation, {
        interruptionType: result.type
    });

    // 创建中断错误（warning 级别，不阻止后续执行）
    const interruptionError = new SDKErrorClass(
        result.type === 'paused' ? 'Execution paused' : 'Execution cancelled',
        'warning',
        context,
        error
    );

    // 使用无状态的错误处理工具函数
    await handleError(eventManager, interruptionError, {
        threadId: entity.id,
        workflowId: context.workflowId || '',
        nodeId: context.nodeId
    });

    // 更新 Agent 状态
    if (result.type === 'paused') {
        entity.state.pause();
        logger.info('Agent Loop paused', {
            agentLoopId: entity.id,
            operation,
            iteration: entity.state.currentIteration
        });
    } else {
        entity.state.cancel();
        logger.info('Agent Loop cancelled', {
            agentLoopId: entity.id,
            operation,
            iteration: entity.state.currentIteration
        });
    }

    return true;
}

/**
 * 判断是否为可恢复的 Agent 错误
 *
 * @param error SDKError 对象
 * @returns 是否可恢复
 */
export function isRecoverableAgentError(error: SDKError): boolean {
    return isRecoverableError(error);
}

/**
 * 创建 Agent 执行错误
 *
 * @param entity Agent Loop 实体
 * @param message 错误消息
 * @param operation 操作类型
 * @param cause 原始错误
 * @param severity 错误严重程度
 * @returns SDKError 实例
 */
export function createAgentExecutionError(
    entity: AgentLoopEntity,
    message: string,
    operation: string,
    cause?: Error,
    severity: 'error' | 'warning' | 'info' = 'error'
): SDKError {
    const context = buildAgentErrorContext(entity, operation);
    return new SDKErrorClass(message, severity, context, cause);
}