/**
 * HookCreators 单元测试
 * 测试 Hook 创建器工具函数
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createThreadStateCheckHook,
  createCustomValidationHook,
  createPermissionCheckHook,
  createAuditLoggingHook
} from '../hook-creators.js';
import { HookType } from '@modular-agent/types';
import { ExecutionError } from '@modular-agent/types';
import type { HookExecutionContext } from '../../handlers/hook-handlers/hook-handler.js';
import type { Thread } from '@modular-agent/types';

/**
 * 创建模拟 HookExecutionContext
 */
function createMockExecutionContext(overrides?: Partial<HookExecutionContext>): HookExecutionContext {
  const mockThread: Thread = {
    id: 'test-thread',
    workflowId: 'test-workflow',
    workflowVersion: '1.0.0',
    status: 'RUNNING',
    currentNodeId: 'test-node',
    input: {},
    output: {},
    nodeResults: [],
    errors: [],
    startTime: Date.now(),
    graph: {} as any,
    variables: [],
    threadType: 'MAIN',
    variableScopes: {
      global: {},
      thread: {},
      local: [],
      loop: []
    }
  };

  return {
    thread: mockThread,
    node: {
      id: 'test-node',
      type: 'CODE',
      name: 'Test Node',
      config: {}
    },
    executionId: 'test-execution',
    ...overrides
  } as HookExecutionContext;
}

describe('createThreadStateCheckHook', () => {
  it('应该创建正确的 Hook 配置', () => {
    const hook = createThreadStateCheckHook(['RUNNING']);

    expect(hook.hookType).toBe('BEFORE_EXECUTE');
    expect(hook.eventName).toBe('validation.thread_status_check');
    expect(hook.weight).toBe(200);
    expect(hook.eventPayload).toBeDefined();
    expect(hook.eventPayload!.allowedStates).toEqual(['RUNNING']);
    expect(hook.eventPayload!.handler).toBeInstanceOf(Function);
  });

  it('当线程状态在允许列表中时，不抛出错误', async () => {
    const hook = createThreadStateCheckHook(['RUNNING', 'PAUSED']);
    const context = createMockExecutionContext({
      thread: { ...createMockExecutionContext().thread, status: 'RUNNING' }
    });

    // 不应该抛出错误
    await expect(hook.eventPayload!.handler(context)).resolves.toBeUndefined();
  });

  it('当线程状态不在允许列表中时，抛出 ExecutionError', async () => {
    const hook = createThreadStateCheckHook(['RUNNING']);
    const context = createMockExecutionContext({
      thread: { ...createMockExecutionContext().thread, status: 'COMPLETED' }
    });

    await expect(hook.eventPayload!.handler(context))
      .rejects
      .toThrow(ExecutionError);

    await expect(hook.eventPayload!.handler(context))
      .rejects
      .toThrow('Thread is in COMPLETED state, expected: RUNNING');
  });

  it('当有多个允许状态时，正确检查状态', async () => {
    const hook = createThreadStateCheckHook(['RUNNING', 'PAUSED', 'CREATED']);

    // 测试 RUNNING 状态
    const context1 = createMockExecutionContext({
      thread: { ...createMockExecutionContext().thread, status: 'RUNNING' }
    });
    await expect(hook.eventPayload!.handler(context1)).resolves.toBeUndefined();

    // 测试 PAUSED 状态
    const context2 = createMockExecutionContext({
      thread: { ...createMockExecutionContext().thread, status: 'PAUSED' }
    });
    await expect(hook.eventPayload!.handler(context2)).resolves.toBeUndefined();

    // 测试 CREATED 状态
    const context3 = createMockExecutionContext({
      thread: { ...createMockExecutionContext().thread, status: 'CREATED' }
    });
    await expect(hook.eventPayload!.handler(context3)).resolves.toBeUndefined();

    // 测试不允许的状态
    const context4 = createMockExecutionContext({
      thread: { ...createMockExecutionContext().thread, status: 'FAILED' }
    });
    await expect(hook.eventPayload!.handler(context4)).rejects.toThrow();
  });

  it('使用默认允许状态列表', async () => {
    const hook = createThreadStateCheckHook(); // 默认 ['RUNNING']
    const context = createMockExecutionContext({
      thread: { ...createMockExecutionContext().thread, status: 'RUNNING' }
    });

    await expect(hook.eventPayload!.handler(context)).resolves.toBeUndefined();
  });
});

describe('createCustomValidationHook', () => {
  it('应该创建正确的 Hook 配置', () => {
    const validator = vi.fn();
    const hook = createCustomValidationHook(validator);

    expect(hook.hookType).toBe('BEFORE_EXECUTE');
    expect(hook.eventName).toBe('validation.custom_check');
    expect(hook.weight).toBe(150);
    expect(hook.eventPayload).toBeDefined();
    expect(hook.eventPayload!.handler).toBe(validator);
  });

  it('支持自定义事件名称', () => {
    const validator = vi.fn();
    const hook = createCustomValidationHook(validator, 'custom.event');

    expect(hook.eventName).toBe('custom.event');
    expect(hook.eventPayload).toBeDefined();
  });

  it('支持自定义权重', () => {
    const validator = vi.fn();
    const hook = createCustomValidationHook(validator, 'custom.event', 100);

    expect(hook.weight).toBe(100);
    expect(hook.eventPayload).toBeDefined();
  });

  it('当验证函数 resolve 时，不抛出错误', async () => {
    const validator = vi.fn().mockResolvedValue(undefined);
    const hook = createCustomValidationHook(validator);
    const context = createMockExecutionContext();

    await expect(hook.eventPayload!.handler(context)).resolves.toBeUndefined();
    expect(validator).toHaveBeenCalledWith(context);
  });

  it('当验证函数 reject 时，抛出错误', async () => {
    const validator = vi.fn().mockRejectedValue(new Error('Validation failed'));
    const hook = createCustomValidationHook(validator);
    const context = createMockExecutionContext();

    await expect(hook.eventPayload!.handler(context)).rejects.toThrow('Validation failed');
  });

  it('支持同步验证函数', async () => {
    const validator = vi.fn(); // 同步函数，返回 undefined
    const hook = createCustomValidationHook(validator);
    const context = createMockExecutionContext();

    // 同步函数直接调用，不返回 Promise
    const result = hook.eventPayload!.handler(context);
    expect(result).toBeUndefined();
    expect(validator).toHaveBeenCalledWith(context);
  });

  it('验证函数可以访问上下文信息', async () => {
    const validator = vi.fn().mockImplementation((ctx: HookExecutionContext) => {
      // 验证函数可以访问上下文
      expect(ctx.thread.id).toBe('test-thread');
      expect(ctx.node.id).toBe('test-node');
    });

    const hook = createCustomValidationHook(validator);
    const context = createMockExecutionContext();

    await hook.eventPayload!.handler(context);
    expect(validator).toHaveBeenCalled();
  });
});

describe('createPermissionCheckHook', () => {
  it('应该创建正确的 Hook 配置', () => {
    const hook = createPermissionCheckHook(['read', 'write']);

    expect(hook.hookType).toBe('BEFORE_EXECUTE');
    expect(hook.eventName).toBe('business.permission_check');
    expect(hook.weight).toBe(100);
    expect(hook.eventPayload).toBeDefined();
    expect(hook.eventPayload!.requiredPermissions).toEqual(['read', 'write']);
    expect(hook.eventPayload!.handler).toBeInstanceOf(Function);
  });

  it('当用户有所需权限时，不抛出错误', async () => {
    const hook = createPermissionCheckHook(['read', 'write']);
    const baseContext = createMockExecutionContext();
    const context = createMockExecutionContext({
      thread: {
        ...baseContext.thread,
        variableScopes: {
          ...baseContext.thread.variableScopes,
          thread: { permissions: ['read', 'write', 'delete'] }
        }
      }
    });

    await expect(hook.eventPayload!.handler(context)).resolves.toBeUndefined();
  });

  it('当用户缺少权限时，抛出 ExecutionError', async () => {
    const hook = createPermissionCheckHook(['read', 'write', 'admin']);
    const baseContext = createMockExecutionContext();
    const context = createMockExecutionContext({
      thread: {
        ...baseContext.thread,
        variableScopes: {
          ...baseContext.thread.variableScopes,
          thread: { permissions: ['read'] }
        }
      }
    });

    await expect(hook.eventPayload!.handler(context))
      .rejects
      .toThrow(ExecutionError);

    await expect(hook.eventPayload!.handler(context))
      .rejects
      .toThrow('Missing permissions: write, admin');
  });

  it('当用户没有任何权限时，抛出包含所有所需权限的错误', async () => {
    const hook = createPermissionCheckHook(['read', 'write']);
    const baseContext = createMockExecutionContext();
    const context = createMockExecutionContext({
      thread: {
        ...baseContext.thread,
        variableScopes: {
          ...baseContext.thread.variableScopes,
          thread: { permissions: [] }
        }
      }
    });

    await expect(hook.eventPayload!.handler(context))
      .rejects
      .toThrow('Missing permissions: read, write');
  });

  it('当线程作用域没有 permissions 时，视为没有任何权限', async () => {
    const hook = createPermissionCheckHook(['read']);
    const baseContext = createMockExecutionContext();
    const context = createMockExecutionContext({
      thread: {
        ...baseContext.thread,
        variableScopes: {
          ...baseContext.thread.variableScopes,
          thread: {}
        }
      }
    });

    await expect(hook.eventPayload!.handler(context))
      .rejects
      .toThrow('Missing permissions: read');
  });
});

describe('createAuditLoggingHook', () => {
  it('应该创建正确的 Hook 配置', () => {
    const auditService = { log: vi.fn() };
    const hook = createAuditLoggingHook(auditService);

    expect(hook.hookType).toBe('BEFORE_EXECUTE');
    expect(hook.eventName).toBe('monitoring.execution_audit');
    expect(hook.weight).toBe(50);
    expect(hook.eventPayload).toBeDefined();
    expect(hook.eventPayload!.handler).toBeInstanceOf(Function);
  });

  it('调用审计服务记录日志', async () => {
    const mockLog = vi.fn().mockResolvedValue(undefined);
    const auditService = { log: mockLog };
    const hook = createAuditLoggingHook(auditService);

    const baseContext = createMockExecutionContext();
    const context = createMockExecutionContext({
      thread: {
        ...baseContext.thread,
        variableScopes: {
          ...baseContext.thread.variableScopes,
          thread: { userId: 'user-123' }
        }
      },
      node: {
        ...baseContext.node,
        config: {
          scriptName: 'test-script.js',
          risk: 'high'
        }
      }
    }) as any;

    await hook.eventPayload!.handler(context);

    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'NODE_EXECUTION_ATTEMPT',
      threadId: 'test-thread',
      nodeId: 'test-node',
      nodeName: 'Test Node',
      nodeType: 'CODE',
      userId: 'user-123',
      scriptName: 'test-script.js',
      riskLevel: 'high'
    }));
  });

  it('记录的事件包含时间戳', async () => {
    const mockLog = vi.fn().mockResolvedValue(undefined);
    const auditService = { log: mockLog };
    const hook = createAuditLoggingHook(auditService);
    const context = createMockExecutionContext();

    if (hook.eventPayload) {
      await hook.eventPayload.handler(context);

      const loggedEvent = mockLog.mock.calls[0][0];
      expect(loggedEvent.timestamp).toBeInstanceOf(Date);
    }
  });

  it('当审计服务抛出错误时，传播错误', async () => {
    const mockLog = vi.fn().mockRejectedValue(new Error('Audit service error'));
    const auditService = { log: mockLog };
    const hook = createAuditLoggingHook(auditService);
    const context = createMockExecutionContext();

    await expect(hook.eventPayload!.handler(context)).rejects.toThrow('Audit service error');
  });
});
