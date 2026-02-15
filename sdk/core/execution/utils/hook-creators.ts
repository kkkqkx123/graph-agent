/**
 * Hook创建器工具
 * 提供便捷的Hook配置创建函数
 *
 * 注意：SDK完全信任用户配置，不预设任何验证逻辑。
 * 应用层应根据实际需求实现自定义的验证逻辑。
 */

import type {
  NodeHook,
  CodeNodeConfig
} from '@modular-agent/types';

import { HookType } from '@modular-agent/types';

import type { HookExecutionContext } from '../handlers/hook-handlers';

import { ExecutionError } from '@modular-agent/types';

/**
 * 创建线程状态检查Hook
 * @param allowedStates 允许的线程状态列表
 * @returns NodeHook配置
 */
export function createThreadStateCheckHook(
  allowedStates: string[] = ['RUNNING']
): NodeHook {
  return {
    hookType: HookType.BEFORE_EXECUTE,
    eventName: 'validation.thread_status_check',
    weight: 200,
    eventPayload: {
      allowedStates,
      handler: async (context: HookExecutionContext) => {
        if (!allowedStates.includes(context.thread.status)) {
          throw new ExecutionError(
            `Thread is in ${context.thread.status} state, expected: ${allowedStates.join(', ')}`,
            context.node.id
          );
        }
      }
    }
  };
}

/**
 * 创建自定义验证Hook
 *
 * 应用层可以传入自定义的验证函数来实现任何验证逻辑。
 * SDK不预设任何验证规则，完全信任应用层的实现。
 *
 * @param validator 自定义验证函数
 * @param eventName 事件名称（默认为 'validation.custom_check'）
 * @param weight Hook权重（默认为150）
 * @returns NodeHook配置
 *
 * @example
 * // 应用层自定义验证逻辑
 * const customHook = createCustomValidationHook(
 *   async (context) => {
 *     const config = context.node.config as CodeNodeConfig;
 *     // 实现自定义验证逻辑
 *     if (config.scriptName.includes('..')) {
 *       throw new ExecutionError('Invalid script path', context.node.id);
 *     }
 *   },
 *   'security.path_check',
 *   150
 * );
 */
export function createCustomValidationHook(
  validator: (context: HookExecutionContext) => Promise<void> | void,
  eventName: string = 'validation.custom_check',
  weight: number = 150
): NodeHook {
  return {
    hookType: HookType.BEFORE_EXECUTE,
    eventName,
    weight,
    eventPayload: {
      handler: validator
    }
  };
}

/**
 * 创建权限检查Hook
 * @param requiredPermissions 需要的权限列表
 * @returns NodeHook配置
 */
export function createPermissionCheckHook(
  requiredPermissions: string[]
): NodeHook {
  return {
    hookType: HookType.BEFORE_EXECUTE,
    eventName: 'business.permission_check',
    weight: 100,
    eventPayload: {
      requiredPermissions,
      handler: async (context: HookExecutionContext) => {
        const userPermissions = context.thread.variableScopes.thread?.['permissions'] || [];
        const missing = requiredPermissions.filter(p => !userPermissions.includes(p));
        
        if (missing.length > 0) {
          throw new ExecutionError(
            `Missing permissions: ${missing.join(', ')}`,
            context.node.id
          );
        }
      }
    }
  };
}

/**
 * 创建审计日志Hook
 * @param auditService 审计服务实例
 * @returns NodeHook配置
 */
export function createAuditLoggingHook(
  auditService: { log: (event: any) => Promise<void> }
): NodeHook {
  return {
    hookType: HookType.BEFORE_EXECUTE,
    eventName: 'monitoring.execution_audit',
    weight: 50,
    eventPayload: {
      handler: async (context: HookExecutionContext) => {
        const config = context.node.config as CodeNodeConfig;
        
        await auditService.log({
          eventType: 'NODE_EXECUTION_ATTEMPT',
          timestamp: new Date(),
          threadId: context.thread.id,
          nodeId: context.node.id,
          nodeName: context.node.name,
          nodeType: context.node.type,
          userId: context.thread.variableScopes.thread?.['userId'],
          scriptName: config.scriptName,
          riskLevel: config.risk
        });
      }
    }
  };
}