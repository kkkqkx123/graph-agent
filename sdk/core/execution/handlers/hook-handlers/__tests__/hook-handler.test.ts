/**
 * Hook处理器单元测试
 */

import {
  executeHook,
  type HookExecutionContext
} from '../hook-handler';
import { HookType } from '../../../../../types/node';
import type { Node, NodeHook } from '../../../../../types/node';
import type { Thread, NodeExecutionResult } from '../../../../../types/thread';
import type { NodeCustomEvent } from '../../../../../types/events';

// Mock condition-evaluator
jest.mock('../../../../../utils/evalutor/condition-evaluator', () => ({
  conditionEvaluator: {
    evaluate: jest.fn()
  }
}));

// Mock utils module
jest.mock('../utils', () => ({
  buildHookEvaluationContext: jest.fn(),
  convertToEvaluationContext: jest.fn(),
  generateHookEventData: jest.fn(),
  emitHookEvent: jest.fn()
}));

// Mock createCheckpoint
jest.mock('../../checkpoint-handlers/checkpoint-utils', () => ({
  createCheckpoint: jest.fn()
}));

describe('hook-handler', () => {
  let mockThread: Thread;
  let mockNode: Node;
  let mockEmitEvent: jest.Mock;

  beforeEach(() => {
    // 初始化mock
    mockThread = {
      id: 'thread-1',
      workflowId: 'workflow-1',
      variableValues: {
        var1: 'value1',
        var2: 42
      }
    } as any;

    mockNode = {
      id: 'node-1',
      name: 'Test Node',
      type: 'LLM_NODE',
      config: {
        model: 'gpt-4'
      },
      incomingEdgeIds: [],
      outgoingEdgeIds: []
    } as any;

    mockEmitEvent = jest.fn().mockResolvedValue(undefined);

    // 清除所有mock的调用记录
    jest.clearAllMocks();
  });

  describe('executeHook', () => {
    it('应该在节点没有hooks时直接返回', async () => {
      const context: HookExecutionContext = {
        thread: mockThread,
        node: mockNode
      };

      // node.hooks未定义
      await executeHook(context, HookType.BEFORE_EXECUTE, mockEmitEvent);

      expect(mockEmitEvent).not.toHaveBeenCalled();
    });

    it('应该在hooks为空数组时直接返回', async () => {
      const nodeWithEmptyHooks = {
        ...mockNode,
        hooks: []
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: nodeWithEmptyHooks
      };

      await executeHook(context, HookType.BEFORE_EXECUTE, mockEmitEvent);

      expect(mockEmitEvent).not.toHaveBeenCalled();
    });

    it('应该执行匹配HookType的hooks', async () => {
      const { conditionEvaluator } = require('../../../../../utils/evalutor/condition-evaluator');
      const { buildHookEvaluationContext, convertToEvaluationContext, generateHookEventData, emitHookEvent } = require('../utils');

      conditionEvaluator.evaluate.mockReturnValue(true);
      buildHookEvaluationContext.mockReturnValue({ output: 'test' });
      convertToEvaluationContext.mockReturnValue({});
      generateHookEventData.mockReturnValue({ eventData: 'test' });
      emitHookEvent.mockResolvedValue(undefined);

      const hooks: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'before-event',
          enabled: true,
          weight: 10
        },
        {
          hookType: HookType.AFTER_EXECUTE,
          eventName: 'after-event',
          enabled: true,
          weight: 5
        }
      ];

      const nodeWithHooks = {
        ...mockNode,
        hooks
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: nodeWithHooks
      };

      await executeHook(context, HookType.BEFORE_EXECUTE, mockEmitEvent);

      // 只有BEFORE_EXECUTE的hook应该被执行
      expect(emitHookEvent).toHaveBeenCalledTimes(1);
      expect(emitHookEvent).toHaveBeenCalledWith(
        context,
        'before-event',
        { eventData: 'test' },
        mockEmitEvent
      );
    });

    it('应该按权重排序hooks（权重高的先执行）', async () => {
      const { conditionEvaluator } = require('../../../../../utils/evalutor/condition-evaluator');
      const { buildHookEvaluationContext, convertToEvaluationContext, generateHookEventData, emitHookEvent } = require('../utils');

      conditionEvaluator.evaluate.mockReturnValue(true);
      buildHookEvaluationContext.mockReturnValue({ output: 'test' });
      convertToEvaluationContext.mockReturnValue({});
      generateHookEventData.mockReturnValue({ eventData: 'test' });
      emitHookEvent.mockResolvedValue(undefined);

      const executionOrder: string[] = [];

      // 使用side effect来追踪执行顺序
      emitHookEvent.mockImplementation(async (_context: any, eventName: string) => {
        executionOrder.push(eventName);
      });

      const hooks: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'low-priority',
          enabled: true,
          weight: 5
        },
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'high-priority',
          enabled: true,
          weight: 10
        },
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'medium-priority',
          enabled: true,
          weight: 8
        }
      ];

      const nodeWithHooks = {
        ...mockNode,
        hooks
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: nodeWithHooks
      };

      await executeHook(context, HookType.BEFORE_EXECUTE, mockEmitEvent);

      // 验证执行顺序（权重高优先）
      expect(executionOrder[0]).toBe('high-priority');
      expect(executionOrder[1]).toBe('medium-priority');
      expect(executionOrder[2]).toBe('low-priority');
    });

    it('应该过滤disabled的hooks', async () => {
      const { conditionEvaluator } = require('../../../../../utils/evalutor/condition-evaluator');
      const { buildHookEvaluationContext, convertToEvaluationContext, generateHookEventData, emitHookEvent } = require('../utils');

      conditionEvaluator.evaluate.mockReturnValue(true);
      buildHookEvaluationContext.mockReturnValue({ output: 'test' });
      convertToEvaluationContext.mockReturnValue({});
      generateHookEventData.mockReturnValue({ eventData: 'test' });
      emitHookEvent.mockResolvedValue(undefined);

      const hooks: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'enabled-event',
          enabled: true
        },
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'disabled-event',
          enabled: false
        }
      ];

      const nodeWithHooks = {
        ...mockNode,
        hooks
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: nodeWithHooks
      };

      await executeHook(context, HookType.BEFORE_EXECUTE, mockEmitEvent);

      // 只有enabled的hook应该被执行
      expect(emitHookEvent).toHaveBeenCalledTimes(1);
      expect(emitHookEvent).toHaveBeenCalledWith(
        context,
        'enabled-event',
        expect.any(Object),
        mockEmitEvent
      );
    });

    it('应该使用Promise.allSettled处理hook执行，不阻塞', async () => {
      const { conditionEvaluator } = require('../../../../../utils/evalutor/condition-evaluator');
      const { buildHookEvaluationContext, convertToEvaluationContext, generateHookEventData, emitHookEvent } = require('../utils');

      conditionEvaluator.evaluate.mockReturnValue(true);
      buildHookEvaluationContext.mockReturnValue({ output: 'test' });
      convertToEvaluationContext.mockReturnValue({});
      generateHookEventData.mockReturnValue({ eventData: 'test' });

      // 模拟一个hook抛出错误，但其他hook仍应执行
      emitHookEvent.mockImplementation(async (_context: any, eventName: string) => {
        if (eventName === 'failing-event') {
          throw new Error('Hook execution failed');
        }
      });

      const hooks: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'first-event',
          enabled: true,
          weight: 10
        },
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'failing-event',
          enabled: true,
          weight: 5
        },
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'last-event',
          enabled: true,
          weight: 1
        }
      ];

      const nodeWithHooks = {
        ...mockNode,
        hooks
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: nodeWithHooks
      };

      // 应该不抛出错误，即使某些hook失败
      await expect(
        executeHook(context, HookType.BEFORE_EXECUTE, mockEmitEvent)
      ).resolves.toBeUndefined();

      // 验证所有hook都被执行
      expect(emitHookEvent).toHaveBeenCalledTimes(3);
    });

    it('应该在AFTER_EXECUTE时接收nodeExecutionResult', async () => {
      const { buildHookEvaluationContext, convertToEvaluationContext, generateHookEventData, emitHookEvent } = require('../utils');

      buildHookEvaluationContext.mockReturnValue({ output: 'test' });
      convertToEvaluationContext.mockReturnValue({});
      generateHookEventData.mockReturnValue({ eventData: 'test' });
      emitHookEvent.mockResolvedValue(undefined);

      const mockResult: NodeExecutionResult = {
        nodeId: 'node-1',
        nodeType: 'LLM_NODE',
        step: 1,
        status: 'COMPLETED',
        data: { output: 'generated text' },
        executionTime: 1500,
        error: null
      };

      const hooks: NodeHook[] = [
        {
          hookType: HookType.AFTER_EXECUTE,
          eventName: 'after-event',
          enabled: true
        }
      ];

      const nodeWithHooks = {
        ...mockNode,
        hooks
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: nodeWithHooks,
        result: mockResult
      };

      await executeHook(context, HookType.AFTER_EXECUTE, mockEmitEvent);

      // 验证buildHookEvaluationContext被调用时context包含result
      expect(buildHookEvaluationContext).toHaveBeenCalledWith(context);
      expect(context.result).toBe(mockResult);
    });

    it('应该处理没有默认权重的hooks', async () => {
      const { conditionEvaluator } = require('../../../../../utils/evalutor/condition-evaluator');
      const { buildHookEvaluationContext, convertToEvaluationContext, generateHookEventData, emitHookEvent } = require('../utils');

      conditionEvaluator.evaluate.mockReturnValue(true);
      buildHookEvaluationContext.mockReturnValue({ output: 'test' });
      convertToEvaluationContext.mockReturnValue({});
      generateHookEventData.mockReturnValue({ eventData: 'test' });
      emitHookEvent.mockResolvedValue(undefined);

      const hooks: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'no-weight-event'
        },
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'with-weight-event',
          weight: 5
        }
      ];

      const nodeWithHooks = {
        ...mockNode,
        hooks
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: nodeWithHooks
      };

      await executeHook(context, HookType.BEFORE_EXECUTE, mockEmitEvent);

      // 应该能正确处理，权重为undefined的hook权重视为0
      expect(emitHookEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('条件评估', () => {
    it('应该评估hook的触发条件', async () => {
      const { conditionEvaluator } = require('../../../../../utils/evalutor/condition-evaluator');
      const { buildHookEvaluationContext, convertToEvaluationContext, generateHookEventData, emitHookEvent } = require('../utils');

      const mockCondition = { expression: 'output.result === "success"' };
      conditionEvaluator.evaluate.mockReturnValue(true);
      buildHookEvaluationContext.mockReturnValue({ output: { result: 'success' } });
      convertToEvaluationContext.mockReturnValue({});
      generateHookEventData.mockReturnValue({ eventData: 'test' });
      emitHookEvent.mockResolvedValue(undefined);

      const hooks: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'conditional-event',
          condition: mockCondition,
          enabled: true
        }
      ];

      const nodeWithHooks = {
        ...mockNode,
        hooks
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: nodeWithHooks
      };

      await executeHook(context, HookType.BEFORE_EXECUTE, mockEmitEvent);

      // 验证条件评估器被调用
      expect(conditionEvaluator.evaluate).toHaveBeenCalledWith(
        mockCondition,
        {}
      );
      expect(emitHookEvent).toHaveBeenCalled();
    });

    it('应该在条件为false时不触发hook', async () => {
      const { conditionEvaluator } = require('../../../../../utils/evalutor/condition-evaluator');
      const { buildHookEvaluationContext, convertToEvaluationContext, generateHookEventData, emitHookEvent } = require('../utils');

      conditionEvaluator.evaluate.mockReturnValue(false);
      buildHookEvaluationContext.mockReturnValue({ output: { result: 'failed' } });
      convertToEvaluationContext.mockReturnValue({});
      generateHookEventData.mockReturnValue({ eventData: 'test' });
      emitHookEvent.mockResolvedValue(undefined);

      const hooks: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'conditional-event',
          condition: { expression: 'output.result === "success"' },
          enabled: true
        }
      ];

      const nodeWithHooks = {
        ...mockNode,
        hooks
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: nodeWithHooks
      };

      await executeHook(context, HookType.BEFORE_EXECUTE, mockEmitEvent);

      // 条件为false时，不应触发事件
      expect(emitHookEvent).not.toHaveBeenCalled();
    });

    it('应该在条件评估失败时捕获错误并继续', async () => {
      const { conditionEvaluator } = require('../../../../../utils/evalutor/condition-evaluator');
      const { buildHookEvaluationContext, convertToEvaluationContext, generateHookEventData, emitHookEvent } = require('../utils');

      const error = new Error('Invalid expression');
      conditionEvaluator.evaluate.mockImplementation(() => {
        throw error;
      });
      buildHookEvaluationContext.mockReturnValue({ output: 'test' });
      convertToEvaluationContext.mockReturnValue({});
      generateHookEventData.mockReturnValue({ eventData: 'test' });
      emitHookEvent.mockResolvedValue(undefined);

      const hooks: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'conditional-event',
          condition: { expression: 'invalid expression' },
          enabled: true
        },
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'next-event',
          enabled: true
        }
      ];

      const nodeWithHooks = {
        ...mockNode,
        hooks
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: nodeWithHooks
      };

      // 应该不抛出错误
      await expect(
        executeHook(context, HookType.BEFORE_EXECUTE, mockEmitEvent)
      ).resolves.toBeUndefined();

      // 第一个hook因条件评估失败应该被跳过，第二个应该被执行
      expect(emitHookEvent).toHaveBeenCalledTimes(1);
      expect(emitHookEvent).toHaveBeenCalledWith(
        context,
        'next-event',
        expect.any(Object),
        mockEmitEvent
      );
    });
  });

  describe('自定义handler执行', () => {
    it('应该执行eventPayload中的自定义handler函数', async () => {
      const { conditionEvaluator } = require('../../../../../utils/evalutor/condition-evaluator');
      const { buildHookEvaluationContext, convertToEvaluationContext, generateHookEventData, emitHookEvent } = require('../utils');

      conditionEvaluator.evaluate.mockReturnValue(true);
      buildHookEvaluationContext.mockReturnValue({ output: 'test' });
      convertToEvaluationContext.mockReturnValue({});
      generateHookEventData.mockReturnValue({ eventData: 'test' });
      emitHookEvent.mockResolvedValue(undefined);

      const mockCustomHandler = jest.fn().mockResolvedValue(undefined);

      const hooks: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'custom-handler-event',
          enabled: true,
          eventPayload: {
            handler: mockCustomHandler,
            data: 'test'
          }
        }
      ];

      const nodeWithHooks = {
        ...mockNode,
        hooks
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: nodeWithHooks
      };

      await executeHook(context, HookType.BEFORE_EXECUTE, mockEmitEvent);

      // 验证自定义handler被调用
      expect(mockCustomHandler).toHaveBeenCalledWith(
        context,
        hooks[0],
        { eventData: 'test' }
      );
    });

    it('应该跳过非函数类型的handler', async () => {
      const { conditionEvaluator } = require('../../../../../utils/evalutor/condition-evaluator');
      const { buildHookEvaluationContext, convertToEvaluationContext, generateHookEventData, emitHookEvent } = require('../utils');

      conditionEvaluator.evaluate.mockReturnValue(true);
      buildHookEvaluationContext.mockReturnValue({ output: 'test' });
      convertToEvaluationContext.mockReturnValue({});
      generateHookEventData.mockReturnValue({ eventData: 'test' });
      emitHookEvent.mockResolvedValue(undefined);

      const hooks: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'custom-handler-event',
          enabled: true,
          eventPayload: {
            handler: 'not-a-function',
            data: 'test'
          }
        }
      ];

      const nodeWithHooks = {
        ...mockNode,
        hooks
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: nodeWithHooks
      };

      // 应该不抛出错误
      await expect(
        executeHook(context, HookType.BEFORE_EXECUTE, mockEmitEvent)
      ).resolves.toBeUndefined();

      // 事件应该仍然被触发
      expect(emitHookEvent).toHaveBeenCalled();
    });

    it('应该在自定义handler执行失败时捕获错误', async () => {
      const { conditionEvaluator } = require('../../../../../utils/evalutor/condition-evaluator');
      const { buildHookEvaluationContext, convertToEvaluationContext, generateHookEventData, emitHookEvent } = require('../utils');

      conditionEvaluator.evaluate.mockReturnValue(true);
      buildHookEvaluationContext.mockReturnValue({ output: 'test' });
      convertToEvaluationContext.mockReturnValue({});
      generateHookEventData.mockReturnValue({ eventData: 'test' });
      emitHookEvent.mockResolvedValue(undefined);

      const handlerError = new Error('Handler execution failed');
      const mockFailingHandler = jest.fn().mockRejectedValue(handlerError);

      const hooks: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'failing-handler-event',
          enabled: true,
          eventPayload: {
            handler: mockFailingHandler
          }
        }
      ];

      const nodeWithHooks = {
        ...mockNode,
        hooks
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: nodeWithHooks
      };

      // 应该不抛出错误
      await expect(
        executeHook(context, HookType.BEFORE_EXECUTE, mockEmitEvent)
      ).resolves.toBeUndefined();

      // 事件应该仍然被触发
      expect(emitHookEvent).toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('应该在hook执行失败时不影响后续hook执行', async () => {
      const { conditionEvaluator } = require('../../../../../utils/evalutor/condition-evaluator');
      const { buildHookEvaluationContext, convertToEvaluationContext, generateHookEventData, emitHookEvent } = require('../utils');

      conditionEvaluator.evaluate.mockReturnValue(true);
      buildHookEvaluationContext.mockReturnValue({ output: 'test' });
      convertToEvaluationContext.mockReturnValue({});
      generateHookEventData.mockReturnValue({ eventData: 'test' });

      // 第一个hook失败，第二个hook成功
      emitHookEvent
        .mockRejectedValueOnce(new Error('First hook failed'))
        .mockResolvedValueOnce(undefined);

      const hooks: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'first-event',
          enabled: true,
          weight: 10
        },
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'second-event',
          enabled: true,
          weight: 5
        }
      ];

      const nodeWithHooks = {
        ...mockNode,
        hooks
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: nodeWithHooks
      };

      // 应该不抛出错误
      await expect(
        executeHook(context, HookType.BEFORE_EXECUTE, mockEmitEvent)
      ).resolves.toBeUndefined();

      // 两个hook都应该被尝试执行
      expect(emitHookEvent).toHaveBeenCalledTimes(2);
    });

    it('应该优雅处理导入utils模块失败的情况', async () => {
      // 模拟导入失败
      jest.isolateModules(() => {
        jest.doMock(
          '../utils',
          () => {
            throw new Error('Failed to load utils');
          },
          { virtual: true }
        );
      });

      const hooks: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'event',
          enabled: true
        }
      ];

      const nodeWithHooks = {
        ...mockNode,
        hooks
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: nodeWithHooks
      };

      // 重新导入以获取mock的版本
      const { executeHook: executeHookFresh } = require('../hook-handler');

      // 应该不抛出错误
      await expect(
        executeHookFresh(context, HookType.BEFORE_EXECUTE, mockEmitEvent)
      ).resolves.toBeUndefined();
    });
  });

  describe('检查点功能', () => {
    it('应该在hook配置了createCheckpoint时创建检查点', async () => {
      const { conditionEvaluator } = require('../../../../../utils/evalutor/condition-evaluator');
      const { buildHookEvaluationContext, convertToEvaluationContext, generateHookEventData, emitHookEvent } = require('../utils');
      const { createCheckpoint } = require('../../checkpoint-handlers/checkpoint-utils');

      conditionEvaluator.evaluate.mockReturnValue(true);
      buildHookEvaluationContext.mockReturnValue({ output: 'test' });
      convertToEvaluationContext.mockReturnValue({});
      generateHookEventData.mockReturnValue({ eventData: 'test' });
      emitHookEvent.mockResolvedValue(undefined);
      createCheckpoint.mockResolvedValue('checkpoint-1');

      const mockCheckpointDependencies = {
        threadRegistry: {
          get: jest.fn().mockReturnValue({
            thread: mockThread,
            getThreadId: jest.fn().mockReturnValue('thread-1')
          }),
          register: jest.fn(),
          delete: jest.fn(),
          getAll: jest.fn().mockReturnValue([]),
          clear: jest.fn(),
          has: jest.fn().mockReturnValue(true)
        } as any,
        checkpointStateManager: {
          create: jest.fn().mockResolvedValue('checkpoint-1')
        } as any,
        workflowRegistry: {} as any,
        globalMessageStorage: {} as any
      };

      const hooks: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'checkpoint-event',
          enabled: true,
          createCheckpoint: true,
          checkpointDescription: 'Hook checkpoint'
        }
      ];

      const nodeWithHooks = {
        ...mockNode,
        hooks
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: nodeWithHooks,
        checkpointDependencies: mockCheckpointDependencies
      };

      await executeHook(context, HookType.BEFORE_EXECUTE, mockEmitEvent);

      // 验证检查点被创建
      expect(createCheckpoint).toHaveBeenCalledWith(
        {
          threadId: 'thread-1',
          nodeId: 'node-1',
          description: 'Hook checkpoint'
        },
        mockCheckpointDependencies
      );
    });

    it('应该在hook没有配置createCheckpoint时不创建检查点', async () => {
      const { conditionEvaluator } = require('../../../../../utils/evalutor/condition-evaluator');
      const { buildHookEvaluationContext, convertToEvaluationContext, generateHookEventData, emitHookEvent } = require('../utils');
      const { createCheckpoint } = require('../../checkpoint-handlers/checkpoint-utils');

      conditionEvaluator.evaluate.mockReturnValue(true);
      buildHookEvaluationContext.mockReturnValue({ output: 'test' });
      convertToEvaluationContext.mockReturnValue({});
      generateHookEventData.mockReturnValue({ eventData: 'test' });
      emitHookEvent.mockResolvedValue(undefined);
      createCheckpoint.mockResolvedValue('checkpoint-1');

      const hooks: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'no-checkpoint-event',
          enabled: true
        }
      ];

      const nodeWithHooks = {
        ...mockNode,
        hooks
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: nodeWithHooks
      };

      await executeHook(context, HookType.BEFORE_EXECUTE, mockEmitEvent);

      // 验证检查点没有被创建
      expect(createCheckpoint).not.toHaveBeenCalled();
    });

    it('应该在createCheckpoint为false时不创建检查点', async () => {
      const { conditionEvaluator } = require('../../../../../utils/evalutor/condition-evaluator');
      const { buildHookEvaluationContext, convertToEvaluationContext, generateHookEventData, emitHookEvent } = require('../utils');
      const { createCheckpoint } = require('../../checkpoint-handlers/checkpoint-utils');

      conditionEvaluator.evaluate.mockReturnValue(true);
      buildHookEvaluationContext.mockReturnValue({ output: 'test' });
      convertToEvaluationContext.mockReturnValue({});
      generateHookEventData.mockReturnValue({ eventData: 'test' });
      emitHookEvent.mockResolvedValue(undefined);
      createCheckpoint.mockResolvedValue('checkpoint-1');

      const hooks: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'disabled-checkpoint-event',
          enabled: true,
          createCheckpoint: false
        }
      ];

      const nodeWithHooks = {
        ...mockNode,
        hooks
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: nodeWithHooks
      };

      await executeHook(context, HookType.BEFORE_EXECUTE, mockEmitEvent);

      // 验证检查点没有被创建
      expect(createCheckpoint).not.toHaveBeenCalled();
    });

    it('应该在检查点创建失败时继续执行hook', async () => {
      const { conditionEvaluator } = require('../../../../../utils/evalutor/condition-evaluator');
      const { buildHookEvaluationContext, convertToEvaluationContext, generateHookEventData, emitHookEvent } = require('../utils');
      const { createCheckpoint } = require('../../checkpoint-handlers/checkpoint-utils');

      conditionEvaluator.evaluate.mockReturnValue(true);
      buildHookEvaluationContext.mockReturnValue({ output: 'test' });
      convertToEvaluationContext.mockReturnValue({});
      generateHookEventData.mockReturnValue({ eventData: 'test' });
      emitHookEvent.mockResolvedValue(undefined);
      createCheckpoint.mockRejectedValue(new Error('Checkpoint creation failed'));

      const mockCheckpointDependencies = {
        threadRegistry: {
          get: jest.fn().mockReturnValue({
            thread: mockThread,
            getThreadId: jest.fn().mockReturnValue('thread-1')
          }),
          register: jest.fn(),
          delete: jest.fn(),
          getAll: jest.fn().mockReturnValue([]),
          clear: jest.fn(),
          has: jest.fn().mockReturnValue(true)
        } as any,
        checkpointStateManager: {
          create: jest.fn().mockRejectedValue(new Error('Checkpoint creation failed'))
        } as any,
        workflowRegistry: {} as any,
        globalMessageStorage: {} as any
      };

      const hooks: NodeHook[] = [
        {
          hookType: HookType.BEFORE_EXECUTE,
          eventName: 'checkpoint-event',
          enabled: true,
          createCheckpoint: true,
          checkpointDescription: 'Hook checkpoint'
        }
      ];

      const nodeWithHooks = {
        ...mockNode,
        hooks
      };

      const context: HookExecutionContext = {
        thread: mockThread,
        node: nodeWithHooks,
        checkpointDependencies: mockCheckpointDependencies
      };

      // 应该不抛出错误
      await expect(
        executeHook(context, HookType.BEFORE_EXECUTE, mockEmitEvent)
      ).resolves.toBeUndefined();

      // 验证事件仍然被触发
      expect(emitHookEvent).toHaveBeenCalled();
    });
  });
});
