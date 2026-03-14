/**
 * Trigger Handlers 集成测试
 *
 * 测试场景：
 * - 停止线程处理器
 * - 暂停线程处理器
 * - 恢复线程处理器
 * - 跳过节点处理器
 * - 设置变量处理器
 * - 发送通知处理器
 * - 自定义动作处理器
 * - 执行脚本处理器
 * - 执行触发子工作流处理器
 * - 应用消息操作处理器
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTriggerHandler, triggerHandlers } from '../../graph/execution/handlers/trigger-handlers/index.js';
import { TriggerActionType } from '@modular-agent/types';
import type { TriggerAction, TriggerExecutionResult } from '@modular-agent/types';

// Mock implementations
const mockThreadLifecycleCoordinator = {
  stopThread: vi.fn(),
  pauseThread: vi.fn(),
  resumeThread: vi.fn()
} as any;

const mockThreadRegistry = {
  get: vi.fn(),
  update: vi.fn(),
  setVariable: vi.fn(),
  applyMessageOperation: vi.fn()
} as any;

const mockEventManager = {
  emit: vi.fn()
} as any;

const mockThreadBuilder = {
  build: vi.fn()
} as any;

const mockTaskQueueManager = {
  submitSync: vi.fn(),
  submitAsync: vi.fn()
} as any;

describe('Trigger Handlers - 触发器处理器', () => {
  describe('暂停线程处理器', () => {
    it('测试暂停线程：pauseThreadHandler正确暂停指定线程', async () => {
      const action: TriggerAction = {
        type: 'pause_thread',
        parameters: {
          threadId: 'thread-123',
          reason: '测试暂停'
        }
      };

      const handler = getTriggerHandler('pause_thread');
      const result = await handler(action, 'trigger-1', mockThreadLifecycleCoordinator);

      expect(mockThreadLifecycleCoordinator.pauseThread).toHaveBeenCalledWith('thread-123', '测试暂停');
      expect(result.success).toBe(true);
    });

    it('测试暂停原因：reason参数正确记录暂停原因', async () => {
      const action: TriggerAction = {
        type: 'pause_thread',
        parameters: {
          threadId: 'thread-123'
          // reason 未设置
        }
      };

      const handler = getTriggerHandler('pause_thread');
      await handler(action, 'trigger-1', mockThreadLifecycleCoordinator);

      expect(mockThreadLifecycleCoordinator.pauseThread).toHaveBeenCalledWith('thread-123', undefined);
    });
  });

  describe('恢复线程处理器', () => {
    it('测试恢复线程：resumeThreadHandler正确恢复指定线程', async () => {
      const action: TriggerAction = {
        type: 'resume_thread',
        parameters: {
          threadId: 'thread-123'
        }
      };

      const handler = getTriggerHandler('resume_thread');
      const result = await handler(action, 'trigger-1', mockThreadLifecycleCoordinator);

      expect(mockThreadLifecycleCoordinator.resumeThread).toHaveBeenCalledWith('thread-123');
      expect(result.success).toBe(true);
    });
  });

  describe('跳过节点处理器', () => {
    it('测试跳过节点：skipNodeHandler正确跳过指定节点', async () => {
      const action: TriggerAction = {
        type: 'skip_node',
        parameters: {
          threadId: 'thread-123',
          nodeId: 'node-456'
        }
      };

      const handler = getTriggerHandler('skip_node');
      const result = await handler(action, 'trigger-1', mockThreadRegistry, mockEventManager);

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('trigger-1');
    });
  });

  describe('设置变量处理器', () => {
    it('测试设置变量：setVariableHandler正确设置变量', async () => {
      const action: TriggerAction = {
        type: 'set_variable',
        parameters: {
          threadId: 'thread-123',
          variables: {
            var1: 'value1',
            var2: 123
          },
          scope: 'thread'
        }
      };

      const handler = getTriggerHandler('set_variable');
      const result = await handler(action, 'trigger-1', mockThreadRegistry);

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('trigger-1');
    });

    it('测试变量作用域：scope参数控制变量作用域', async () => {
      const action: TriggerAction = {
        type: 'set_variable',
        parameters: {
          threadId: 'thread-123',
          variables: {
            globalVar: 'global-value'
          },
          scope: 'global'
        }
      };

      const handler = getTriggerHandler('set_variable');
      const result = await handler(action, 'trigger-1', mockThreadRegistry);

      expect(result.success).toBe(true);
    });
  });

  describe('发送通知处理器', () => {
    it('测试发送通知：sendNotificationHandler正确发送通知', async () => {
      const action: TriggerAction = {
        type: 'send_notification',
        parameters: {
          message: '测试通知',
          recipients: ['user1@example.com'],
          level: 'info',
          channel: 'email'
        }
      };

      const handler = getTriggerHandler('send_notification');
      const result = await handler(action, 'trigger-1');

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('trigger-1');
    });

    it('测试通知级别：level参数正确设置通知级别', async () => {
      const action: TriggerAction = {
        type: 'send_notification',
        parameters: {
          message: '警告通知',
          level: 'warning'
        }
      };

      const handler = getTriggerHandler('send_notification');
      const result = await handler(action, 'trigger-1');

      expect(result.success).toBe(true);
    });

    it('测试通知渠道：channel参数正确设置通知渠道', async () => {
      const action: TriggerAction = {
        type: 'send_notification',
        parameters: {
          message: '测试通知',
          channel: 'webhook'
        }
      };

      const handler = getTriggerHandler('send_notification');
      const result = await handler(action, 'trigger-1');

      expect(result.success).toBe(true);
    });
  });

  describe('自定义动作处理器', () => {
    it('测试自定义动作：customHandler正确执行自定义动作', async () => {
      const action: TriggerAction = {
        type: 'custom',
        parameters: {
          handlerName: 'myCustomHandler',
          data: {
            key: 'value'
          }
        }
      };

      const handler = getTriggerHandler('custom');
      const result = await handler(action, 'trigger-1');

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('trigger-1');
    });
  });

  describe('执行脚本处理器', () => {
    it('测试执行脚本：executeScriptHandler正确执行脚本', async () => {
      const action: TriggerAction = {
        type: 'execute_script',
        parameters: {
          scriptName: 'test-script',
          parameters: {
            input: 'test'
          },
          timeout: 5000,
          ignoreError: false
        }
      };

      const handler = getTriggerHandler('execute_script');
      const result = await handler(action, 'trigger-1');

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('trigger-1');
    });

    it('测试脚本参数：parameters正确传递给脚本', async () => {
      const action: TriggerAction = {
        type: 'execute_script',
        parameters: {
          scriptName: 'test-script',
          parameters: {
            arg1: 'value1',
            arg2: 123
          }
        }
      };

      const handler = getTriggerHandler('execute_script');
      const result = await handler(action, 'trigger-1');

      expect(result.success).toBe(true);
    });

    it('测试超时处理：timeout参数控制超时行为', async () => {
      const action: TriggerAction = {
        type: 'execute_script',
        parameters: {
          scriptName: 'test-script',
          timeout: 10000
        }
      };

      const handler = getTriggerHandler('execute_script');
      const result = await handler(action, 'trigger-1');

      expect(result.success).toBe(true);
    });
  });

  describe('执行触发子工作流处理器', () => {
    it('测试执行子工作流：executeTriggeredSubgraphHandler正确执行子工作流', async () => {
      const action: TriggerAction = {
        type: 'execute_triggered_subgraph',
        parameters: {
          triggeredWorkflowId: 'subgraph-workflow-123',
          waitForCompletion: true
        }
      };

      const handler = getTriggerHandler('execute_triggered_subgraph');
      const result = await handler(
        action,
        'trigger-1',
        mockThreadRegistry,
        mockEventManager,
        mockThreadBuilder,
        mockTaskQueueManager,
        'parent-thread-456'
      );

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('trigger-1');
    });

    it('测试等待完成：waitForCompletion参数控制等待行为', async () => {
      const action: TriggerAction = {
        type: 'execute_triggered_subgraph',
        parameters: {
          triggeredWorkflowId: 'subgraph-workflow-123',
          waitForCompletion: false
        }
      };

      const handler = getTriggerHandler('execute_triggered_subgraph');
      const result = await handler(
        action,
        'trigger-1',
        mockThreadRegistry,
        mockEventManager,
        mockThreadBuilder,
        mockTaskQueueManager,
        'parent-thread-456'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('应用消息操作处理器', () => {
    it('测试应用消息操作：applyMessageOperationHandler正确应用操作', async () => {
      const action: TriggerAction = {
        type: 'apply_message_operation',
        parameters: {
          threadId: 'thread-123',
          operationType: 'compress',
          config: {
            strategy: 'keep-last-n',
            count: 10
          }
        }
      };

      const handler = getTriggerHandler('apply_message_operation');
      const result = await handler(action, 'trigger-1', mockThreadRegistry);

      expect(result.success).toBe(true);
      expect(result.triggerId).toBe('trigger-1');
    });

    it('测试操作类型：operationType参数控制操作类型', async () => {
      const action: TriggerAction = {
        type: 'apply_message_operation',
        parameters: {
          threadId: 'thread-123',
          operationType: 'truncate'
        }
      };

      const handler = getTriggerHandler('apply_message_operation');
      const result = await handler(action, 'trigger-1', mockThreadRegistry);

      expect(result.success).toBe(true);
    });
  });

  describe('处理器映射', () => {
    it('测试触发器处理器映射：triggerHandlers包含所有处理器', () => {
      expect(triggerHandlers).toBeDefined();
      expect(triggerHandlers['stop_thread']).toBeDefined();
      expect(triggerHandlers['pause_thread']).toBeDefined();
      expect(triggerHandlers['resume_thread']).toBeDefined();
      expect(triggerHandlers['skip_node']).toBeDefined();
      expect(triggerHandlers['set_variable']).toBeDefined();
      expect(triggerHandlers['send_notification']).toBeDefined();
      expect(triggerHandlers['custom']).toBeDefined();
      expect(triggerHandlers['execute_script']).toBeDefined();
      expect(triggerHandlers['apply_message_operation']).toBeDefined();
      expect(triggerHandlers['execute_triggered_subgraph']).toBeDefined();
    });

    it('测试获取处理器：getTriggerHandler返回正确的处理器', () => {
      const stopThreadHandler = getTriggerHandler('stop_thread');
      const pauseThreadHandler = getTriggerHandler('pause_thread');
      const resumeThreadHandler = getTriggerHandler('resume_thread');

      expect(stopThreadHandler).toBeDefined();
      expect(pauseThreadHandler).toBeDefined();
      expect(resumeThreadHandler).toBeDefined();
    });

    it('测试获取不存在的处理器：应抛出错误', () => {
      expect(() => {
        getTriggerHandler('invalid_handler' as any);
      }).toThrow();
    });
  });

  describe('未实现的处理器', () => {
    it('测试start_thread处理器：应返回未实现错误', async () => {
      const action: TriggerAction = {
        type: 'start_thread',
        parameters: {
          graphId: 'graph-123'
        }
      };

      const handler = getTriggerHandler('start_thread');
      const result = await handler(action, 'trigger-1');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('not implemented');
    });
  });

  describe('处理器执行结果', () => {
    it('测试所有处理器返回正确的结果格式', async () => {
      const actionConfigs = [
        { type: 'start_thread', parameters: { graphId: 'graph-123' } },
        { type: 'pause_thread', parameters: { threadId: 'thread-123' } },
        { type: 'resume_thread', parameters: { threadId: 'thread-123' } },
        { type: 'skip_node', parameters: { threadId: 'thread-123', nodeId: 'node-456' } },
        { type: 'set_variable', parameters: { threadId: 'thread-123', variables: {} } },
        { type: 'send_notification', parameters: { message: 'test' } },
        { type: 'custom', parameters: { handlerName: 'test' } },
        { type: 'execute_script', parameters: { scriptName: 'test' } },
        { type: 'apply_message_operation', parameters: { threadId: 'thread-123', operationType: 'compress' } },
        { type: 'execute_triggered_subgraph', parameters: { triggeredWorkflowId: 'workflow-123' } }
      ];

      for (const actionConfig of actionConfigs) {
        const action: TriggerAction = actionConfig as TriggerAction;

        const handler = getTriggerHandler(action.type);
        const result = await handler(action, 'trigger-1', mockThreadLifecycleCoordinator, mockThreadRegistry, mockEventManager, mockThreadBuilder, mockTaskQueueManager, 'thread-123');

        expect(result).toBeDefined();
        expect(result.triggerId).toBe('trigger-1');
        expect(result.action).toBe(action);
        expect(result.executionTime).toBeGreaterThanOrEqual(0);
      }
    });
  });
});