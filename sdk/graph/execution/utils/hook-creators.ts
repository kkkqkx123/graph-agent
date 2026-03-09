/**
 * Hook创建器工具（Thread特定部分）
 * 提供Thread相关的Hook配置创建函数
 *
 * 注意：SDK完全信任用户配置，不预设任何验证逻辑。
 * 应用层应根据实际需求实现自定义的验证逻辑。
 */

import type {
  NodeHook,
  ScriptNodeConfig
} from '@modular-agent/types';

import { HookType } from '@modular-agent/types';

import type { HookExecutionContext } from '../handlers/hook-handlers/index.js';

import { ExecutionError } from '@modular-agent/types';

// 重新导出通用的Hook创建器
export { createCustomValidationHook } from '../../../core/utils/hook/creators.js';

/**
 * 创建线程状态检查Hook
 * @param allowedStates 允许的线程状态列表
 * @returns NodeHook配置
 */
export function createThreadStateCheckHook(
  allowedStates: string[] = ['RUNNING']
): NodeHook {
  return {
    hookType: 'BEFORE_EXECUTE',
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
 * 创建权限检查Hook
 * @param requiredPermissions 需要的权限列表
 * @returns NodeHook配置
 */
export function createPermissionCheckHook(
  requiredPermissions: string[]
): NodeHook {
  return {
    hookType: 'BEFORE_EXECUTE',
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
    hookType: 'BEFORE_EXECUTE',
    eventName: 'monitoring.execution_audit',
    weight: 50,
    eventPayload: {
      handler: async (context: HookExecutionContext) => {
        const config = context.node.config as ScriptNodeConfig;
        
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
