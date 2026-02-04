/**
 * 执行触发子工作流处理函数单元测试
 */

import { executeTriggeredSubgraphHandler } from '../execute-triggered-subgraph-handler';
import type { TriggerAction, TriggerExecutionResult } from '../../../../../types/trigger';
import { TriggerActionType } from '../../../../../types/trigger';
import { ValidationError, NotFoundError } from '../../../../../types/errors';
import { ExecutionContext } from '../../../context/execution-context';

// Mock dependencies
jest.mock('../../../context/execution-context');
jest.mock('../triggered-subgraph-handler');
jest.mock('../../thread-executor');

describe('execute-triggered-subgraph-handler', () => {
  let mockAction: TriggerAction;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  const triggerId = 'trigger-123';
  const triggeredWorkflowId = 'workflow-456';
  const threadId = 'thread-789';

  beforeEach(() => {
    mockAction = {
      type: TriggerActionType.EXECUTE_TRIGGERED_SUBGRAPH,
      parameters: {
        triggeredWorkflowId,
        waitForCompletion: true
      },
      metadata: {}
    };

    // Mock ExecutionContext
    mockExecutionContext = {
      getThreadRegistry: jest.fn(),
      getCurrentThreadId: jest.fn(),
      getWorkflowRegistry: jest.fn(),
      getEventManager: jest.fn(),
      getLifecycleCoordinator: jest.fn(),
      getCheckpointStateManager: jest.fn(),
      getCheckpointCoordinator: jest.fn(),
      getThreadLifecycleManager: jest.fn(),
      getSingletonRegistry: jest.fn(),
      getGlobalMessageStorage: jest.fn(),
      setCurrentThreadId: jest.fn(),
      clearCurrentThreadId: jest.fn(),
      initialize: jest.fn(),
      dispose: jest.fn(),
      isInitialized: true
    } as any;

    // Mock default context creation
    (ExecutionContext.createDefault as jest.Mock) = jest.fn().mockReturnValue(mockExecutionContext);
  });

  describe('基本功能测试', () => {
    it('应该成功执行触发子工作流', async () => {
      // Mock thread context
      const mockMainThreadContext = {
        getAllVariables: jest.fn().mockReturnValue({ var1: 'value1' }),
        getOutput: jest.fn().mockReturnValue({ output: 'test' }),
        getInput: jest.fn().mockReturnValue({ input: 'data' }),
        getWorkflowId: jest.fn(),
        getThreadId: jest.fn(),
        thread: {}
      };

      // Mock thread registry
      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(mockMainThreadContext)
      };

      // Mock workflow registry
      const mockWorkflowRegistry = {
        get: jest.fn().mockReturnValue({ id: triggeredWorkflowId, name: 'Test Workflow' })
      };

      // Mock event manager
      const mockEventManager = {
        emit: jest.fn().mockResolvedValue(undefined)
      };

      // Mock triggered subgraph execution
      const { executeSingleTriggeredSubgraph } = require('../triggered-subgraph-handler');
      const mockSubgraphContext = {
        getOutput: jest.fn().mockReturnValue({ subgraphOutput: 'result' })
      };
      executeSingleTriggeredSubgraph.mockResolvedValue({
        subgraphContext: mockSubgraphContext,
        executionTime: 1500
      });

      // Mock ThreadExecutor
      const { ThreadExecutor } = require('../../thread-executor');
      const mockThreadExecutor = {
        // ThreadExecutor实例作为SubgraphContextFactory和SubgraphExecutor
      };
      ThreadExecutor.mockReturnValue(mockThreadExecutor);

      // Setup execution context
      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry);
      mockExecutionContext.getWorkflowRegistry.mockReturnValue(mockWorkflowRegistry);
      mockExecutionContext.getEventManager.mockReturnValue(mockEventManager);
      mockExecutionContext.getCurrentThreadId.mockReturnValue(threadId);

      const result = await executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext);

      expect(result).toMatchObject({
        triggerId,
        success: true,
        action: mockAction,
        result: {
          message: `Triggered subgraph execution completed: ${triggeredWorkflowId}`,
          triggeredWorkflowId,
          input: {
            variables: { var1: 'value1' },
            output: { output: 'test' },
            input: { input: 'data' }
          },
          output: { subgraphOutput: 'result' },
          waitForCompletion: true,
          executed: true,
          completed: true,
          executionTime: 1500
        }
      });
      expect(result.executionTime).toBeGreaterThan(0);

      // 验证子工作流执行被调用
      expect(executeSingleTriggeredSubgraph).toHaveBeenCalledWith(
        expect.objectContaining({
          subgraphId: triggeredWorkflowId,
          input: {
            variables: { var1: 'value1' },
            output: { output: 'test' },
            input: { input: 'data' }
          },
          triggerId,
          mainThreadContext: mockMainThreadContext,
          config: {
            waitForCompletion: true,
            timeout: 30000,
            recordHistory: true
          }
        }),
        mockThreadExecutor, // 作为SubgraphContextFactory
        mockThreadExecutor, // 作为SubgraphExecutor
        mockEventManager
      );
    });

    it('应该使用默认执行上下文当未提供时', async () => {
      // Mock minimal setup for default context test
      const mockMainThreadContext = {
        getAllVariables: jest.fn().mockReturnValue({}),
        getOutput: jest.fn().mockReturnValue({}),
        getInput: jest.fn().mockReturnValue({}),
        getWorkflowId: jest.fn(),
        getThreadId: jest.fn(),
        thread: {}
      };

      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(mockMainThreadContext)
      };

      const mockWorkflowRegistry = {
        get: jest.fn().mockReturnValue({ id: triggeredWorkflowId })
      };

      const { executeSingleTriggeredSubgraph } = require('../triggered-subgraph-handler');
      executeSingleTriggeredSubgraph.mockResolvedValue({
        subgraphContext: { getOutput: jest.fn().mockReturnValue({}) },
        executionTime: 1000
      });

      const { ThreadExecutor } = require('../../thread-executor');
      ThreadExecutor.mockReturnValue({});

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry);
      mockExecutionContext.getWorkflowRegistry.mockReturnValue(mockWorkflowRegistry);
      mockExecutionContext.getCurrentThreadId.mockReturnValue(threadId);

      const result = await executeTriggeredSubgraphHandler(mockAction, triggerId);

      expect(ExecutionContext.createDefault).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('应该使用默认的waitForCompletion值', async () => {
      mockAction.parameters = {
        triggeredWorkflowId
        // waitForCompletion未设置，应该使用默认值false
      };

      const mockMainThreadContext = {
        getAllVariables: jest.fn().mockReturnValue({}),
        getOutput: jest.fn().mockReturnValue({}),
        getInput: jest.fn().mockReturnValue({}),
        getWorkflowId: jest.fn(),
        getThreadId: jest.fn(),
        thread: {}
      };

      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(mockMainThreadContext)
      };

      const mockWorkflowRegistry = {
        get: jest.fn().mockReturnValue({ id: triggeredWorkflowId })
      };

      const { executeSingleTriggeredSubgraph } = require('../triggered-subgraph-handler');
      executeSingleTriggeredSubgraph.mockResolvedValue({
        subgraphContext: { getOutput: jest.fn().mockReturnValue({}) },
        executionTime: 1000
      });

      const { ThreadExecutor } = require('../../thread-executor');
      ThreadExecutor.mockReturnValue({});

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry);
      mockExecutionContext.getWorkflowRegistry.mockReturnValue(mockWorkflowRegistry);
      mockExecutionContext.getCurrentThreadId.mockReturnValue(threadId);

      await executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext);

      expect(executeSingleTriggeredSubgraph).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            waitForCompletion: false // 默认值
          })
        }),
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('参数验证测试', () => {
    it('应该在缺少triggeredWorkflowId参数时抛出ValidationError', async () => {
      mockAction.parameters = {
        waitForCompletion: true
      };

      await expect(executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow(ValidationError);

      await expect(executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow('Missing required parameter: triggeredWorkflowId');
    });

    it('应该在triggeredWorkflowId为空字符串时抛出ValidationError', async () => {
      mockAction.parameters = {
        triggeredWorkflowId: '',
        waitForCompletion: true
      };

      await expect(executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow(ValidationError);
    });

    it('应该在triggeredWorkflowId为null时抛出ValidationError', async () => {
      mockAction.parameters = {
        triggeredWorkflowId: null,
        waitForCompletion: true
      };

      await expect(executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow(ValidationError);
    });

    it('应该在triggeredWorkflowId为undefined时抛出ValidationError', async () => {
      mockAction.parameters = {
        triggeredWorkflowId: undefined,
        waitForCompletion: true
      };

      await expect(executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('线程上下文测试', () => {
    it('应该在找不到当前线程ID时抛出NotFoundError', async () => {
      mockExecutionContext.getCurrentThreadId.mockReturnValue(null);

      await expect(executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow(NotFoundError);

      await expect(executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow('Current thread ID not found in execution context');
    });

    it('应该在找不到主线程上下文时抛出NotFoundError', async () => {
      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(null)
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry);
      mockExecutionContext.getCurrentThreadId.mockReturnValue(threadId);

      await expect(executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow(NotFoundError);

      await expect(executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow(`Main thread context not found: ${threadId}`);
    });
  });

  describe('工作流注册表测试', () => {
    it('应该在找不到触发工作流时抛出NotFoundError', async () => {
      const mockMainThreadContext = {
        getAllVariables: jest.fn().mockReturnValue({}),
        getOutput: jest.fn().mockReturnValue({}),
        getInput: jest.fn().mockReturnValue({}),
        getWorkflowId: jest.fn(),
        getThreadId: jest.fn(),
        thread: {}
      };

      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(mockMainThreadContext)
      };

      const mockWorkflowRegistry = {
        get: jest.fn().mockReturnValue(null)
      };

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry);
      mockExecutionContext.getWorkflowRegistry.mockReturnValue(mockWorkflowRegistry);
      mockExecutionContext.getCurrentThreadId.mockReturnValue(threadId);

      await expect(executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow(NotFoundError);

      await expect(executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext))
        .rejects
        .toThrow(`Triggered workflow not found: ${triggeredWorkflowId}`);
    });
  });

  describe('输入数据测试', () => {
    it('应该正确传递主线程上下文的所有数据', async () => {
      const mockMainThreadContext = {
        getAllVariables: jest.fn().mockReturnValue({
          globalVar: 'global',
          threadVar: 'thread'
        }),
        getOutput: jest.fn().mockReturnValue({
          previousOutput: 'result'
        }),
        getInput: jest.fn().mockReturnValue({
          originalInput: 'data'
        }),
        getWorkflowId: jest.fn(),
        getThreadId: jest.fn(),
        thread: {}
      };

      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(mockMainThreadContext)
      };

      const mockWorkflowRegistry = {
        get: jest.fn().mockReturnValue({ id: triggeredWorkflowId })
      };

      const { executeSingleTriggeredSubgraph } = require('../triggered-subgraph-handler');
      executeSingleTriggeredSubgraph.mockResolvedValue({
        subgraphContext: { getOutput: jest.fn().mockReturnValue({}) },
        executionTime: 1000
      });

      const { ThreadExecutor } = require('../../thread-executor');
      ThreadExecutor.mockReturnValue({});

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry);
      mockExecutionContext.getWorkflowRegistry.mockReturnValue(mockWorkflowRegistry);
      mockExecutionContext.getCurrentThreadId.mockReturnValue(threadId);

      await executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext);

      expect(executeSingleTriggeredSubgraph).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            variables: {
              globalVar: 'global',
              threadVar: 'thread'
            },
            output: {
              previousOutput: 'result'
            },
            input: {
              originalInput: 'data'
            }
          }
        }),
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    it('应该处理空的输入数据', async () => {
      const mockMainThreadContext = {
        getAllVariables: jest.fn().mockReturnValue({}),
        getOutput: jest.fn().mockReturnValue({}),
        getInput: jest.fn().mockReturnValue({}),
        getWorkflowId: jest.fn(),
        getThreadId: jest.fn(),
        thread: {}
      };

      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(mockMainThreadContext)
      };

      const mockWorkflowRegistry = {
        get: jest.fn().mockReturnValue({ id: triggeredWorkflowId })
      };

      const { executeSingleTriggeredSubgraph } = require('../triggered-subgraph-handler');
      executeSingleTriggeredSubgraph.mockResolvedValue({
        subgraphContext: { getOutput: jest.fn().mockReturnValue({}) },
        executionTime: 1000
      });

      const { ThreadExecutor } = require('../../thread-executor');
      ThreadExecutor.mockReturnValue({});

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry);
      mockExecutionContext.getWorkflowRegistry.mockReturnValue(mockWorkflowRegistry);
      mockExecutionContext.getCurrentThreadId.mockReturnValue(threadId);

      await executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext);

      expect(executeSingleTriggeredSubgraph).toHaveBeenCalledWith(
        expect.objectContaining({
          input: {
            variables: {},
            output: {},
            input: {}
          }
        }),
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('错误处理测试', () => {
    it('应该在子工作流执行失败时返回失败结果', async () => {
      const mockMainThreadContext = {
        getAllVariables: jest.fn().mockReturnValue({}),
        getOutput: jest.fn().mockReturnValue({}),
        getInput: jest.fn().mockReturnValue({}),
        getWorkflowId: jest.fn(),
        getThreadId: jest.fn(),
        thread: {}
      };

      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(mockMainThreadContext)
      };

      const mockWorkflowRegistry = {
        get: jest.fn().mockReturnValue({ id: triggeredWorkflowId })
      };

      const { executeSingleTriggeredSubgraph } = require('../triggered-subgraph-handler');
      executeSingleTriggeredSubgraph.mockRejectedValue(new Error('Subgraph execution failed'));

      const { ThreadExecutor } = require('../../thread-executor');
      ThreadExecutor.mockReturnValue({});

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry);
      mockExecutionContext.getWorkflowRegistry.mockReturnValue(mockWorkflowRegistry);
      mockExecutionContext.getCurrentThreadId.mockReturnValue(threadId);

      const result = await executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Subgraph execution failed');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('应该在获取线程注册表失败时返回失败结果', async () => {
      mockExecutionContext.getThreadRegistry.mockImplementation(() => {
        throw new Error('Thread registry unavailable');
      });

      const result = await executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Thread registry unavailable');
    });
  });

  describe('执行时间测试', () => {
    it('应该记录正确的执行时间', async () => {
      const mockMainThreadContext = {
        getAllVariables: jest.fn().mockReturnValue({}),
        getOutput: jest.fn().mockReturnValue({}),
        getInput: jest.fn().mockReturnValue({}),
        getWorkflowId: jest.fn(),
        getThreadId: jest.fn(),
        thread: {}
      };

      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(mockMainThreadContext)
      };

      const mockWorkflowRegistry = {
        get: jest.fn().mockReturnValue({ id: triggeredWorkflowId })
      };

      const { executeSingleTriggeredSubgraph } = require('../triggered-subgraph-handler');
      executeSingleTriggeredSubgraph.mockResolvedValue({
        subgraphContext: { getOutput: jest.fn().mockReturnValue({}) },
        executionTime: 1000
      });

      const { ThreadExecutor } = require('../../thread-executor');
      ThreadExecutor.mockReturnValue({});

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry);
      mockExecutionContext.getWorkflowRegistry.mockReturnValue(mockWorkflowRegistry);
      mockExecutionContext.getCurrentThreadId.mockReturnValue(threadId);

      const startTime = Date.now();
      const result = await executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeLessThanOrEqual(Date.now() - startTime + 10);
    });

    it('应该在子工作流执行耗时较长时记录正确的执行时间', async () => {
      const mockMainThreadContext = {
        getAllVariables: jest.fn().mockReturnValue({}),
        getOutput: jest.fn().mockReturnValue({}),
        getInput: jest.fn().mockReturnValue({}),
        getWorkflowId: jest.fn(),
        getThreadId: jest.fn(),
        thread: {}
      };

      const mockThreadRegistry = {
        get: jest.fn().mockReturnValue(mockMainThreadContext)
      };

      const mockWorkflowRegistry = {
        get: jest.fn().mockReturnValue({ id: triggeredWorkflowId })
      };

      const { executeSingleTriggeredSubgraph } = require('../triggered-subgraph-handler');
      executeSingleTriggeredSubgraph.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return {
          subgraphContext: { getOutput: jest.fn().mockReturnValue({}) },
          executionTime: 20
        };
      });

      const { ThreadExecutor } = require('../../thread-executor');
      ThreadExecutor.mockReturnValue({});

      mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry);
      mockExecutionContext.getWorkflowRegistry.mockReturnValue(mockWorkflowRegistry);
      mockExecutionContext.getCurrentThreadId.mockReturnValue(threadId);

      const result = await executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext);

      expect(result.executionTime).toBeGreaterThanOrEqual(20);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理不同的triggeredWorkflowId格式', async () => {
      const testWorkflowIds = [
        'workflow-1',
        '12345',
        'custom-workflow-id',
        'workflow_with_underscores'
      ];

      for (const testWorkflowId of testWorkflowIds) {
        mockAction.parameters = {
          triggeredWorkflowId: testWorkflowId
        };

        const mockMainThreadContext = {
          getAllVariables: jest.fn().mockReturnValue({}),
          getOutput: jest.fn().mockReturnValue({}),
          getInput: jest.fn().mockReturnValue({}),
          getWorkflowId: jest.fn(),
          getThreadId: jest.fn(),
          thread: {}
        };

        const mockThreadRegistry = {
          get: jest.fn().mockReturnValue(mockMainThreadContext)
        };

        const mockWorkflowRegistry = {
          get: jest.fn().mockReturnValue({ id: testWorkflowId })
        };

        const { executeSingleTriggeredSubgraph } = require('../triggered-subgraph-handler');
        executeSingleTriggeredSubgraph.mockResolvedValue({
          subgraphContext: { getOutput: jest.fn().mockReturnValue({}) },
          executionTime: 1000
        });

        const { ThreadExecutor } = require('../../thread-executor');
        ThreadExecutor.mockReturnValue({});

        mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry);
        mockExecutionContext.getWorkflowRegistry.mockReturnValue(mockWorkflowRegistry);
        mockExecutionContext.getCurrentThreadId.mockReturnValue(threadId);

        const result = await executeTriggeredSubgraphHandler(mockAction, triggerId, mockExecutionContext);

        expect(result.success).toBe(true);
        expect(mockWorkflowRegistry.get).toHaveBeenCalledWith(testWorkflowId);
      }
    });

    it('应该处理不同的triggerId格式', async () => {
      const testTriggerIds = [
        'trigger-1',
        '12345',
        'execute-subgraph-trigger',
        ''
      ];

      for (const testTriggerId of testTriggerIds) {
        mockAction.parameters = {
          triggeredWorkflowId
        };

        const mockMainThreadContext = {
          getAllVariables: jest.fn().mockReturnValue({}),
          getOutput: jest.fn().mockReturnValue({}),
          getInput: jest.fn().mockReturnValue({}),
          getWorkflowId: jest.fn(),
          getThreadId: jest.fn(),
          thread: {}
        };

        const mockThreadRegistry = {
          get: jest.fn().mockReturnValue(mockMainThreadContext)
        };

        const mockWorkflowRegistry = {
          get: jest.fn().mockReturnValue({ id: triggeredWorkflowId })
        };

        const { executeSingleTriggeredSubgraph } = require('../triggered-subgraph-handler');
        executeSingleTriggeredSubgraph.mockResolvedValue({
          subgraphContext: { getOutput: jest.fn().mockReturnValue({}) },
          executionTime: 1000
        });

        const { ThreadExecutor } = require('../../thread-executor');
        ThreadExecutor.mockReturnValue({});

        mockExecutionContext.getThreadRegistry.mockReturnValue(mockThreadRegistry);
        mockExecutionContext.getWorkflowRegistry.mockReturnValue(mockWorkflowRegistry);
        mockExecutionContext.getCurrentThreadId.mockReturnValue(threadId);

        const result = await executeTriggeredSubgraphHandler(mockAction, testTriggerId, mockExecutionContext);

        expect(result.triggerId).toBe(testTriggerId);
        expect(result.success).toBe(true);
      }
    });
  });
});