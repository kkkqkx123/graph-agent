/**
 * TriggeredSubworkflowManager 单元测试
 */

import { TriggeredSubworkflowManager } from '../triggered-subworkflow-manager';
import type { SubgraphContextFactory, SubgraphExecutor, TriggeredSubgraphTask } from '../triggered-subworkflow-manager';
import { ThreadContext } from '../../context/thread-context';
import type { EventManager } from '../../../services/event-manager';
import { EventType } from '@modular-agent/types';
import type { ThreadResult } from '@modular-agent/types';

describe('TriggeredSubworkflowManager', () => {
  let manager: TriggeredSubworkflowManager;
  let mockContextFactory: jest.Mocked<SubgraphContextFactory>;
  let mockExecutor: jest.Mocked<SubgraphExecutor>;
  let mockEventManager: jest.Mocked<EventManager>;
  let mockMainThreadContext: jest.Mocked<ThreadContext>;
  let mockSubgraphContext: jest.Mocked<ThreadContext>;

  beforeEach(() => {
    // Mock EventManager
    mockEventManager = {
      emit: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      off: jest.fn(),
      once: jest.fn()
    } as any;

    // Mock ThreadContext
    mockMainThreadContext = {
      getThreadId: jest.fn().mockReturnValue('main-thread-1'),
      getWorkflowId: jest.fn().mockReturnValue('main-workflow-1'),
      getOutput: jest.fn().mockReturnValue({ mainOutput: 'value' }),
      getInput: jest.fn().mockReturnValue({ mainInput: 'data' })
    } as any;

    mockSubgraphContext = {
      getThreadId: jest.fn().mockReturnValue('sub-thread-1'),
      getWorkflowId: jest.fn().mockReturnValue('sub-workflow-1'),
      getOutput: jest.fn().mockReturnValue({ subOutput: 'result' }),
      getInput: jest.fn().mockReturnValue({ subInput: 'data' })
    } as any;

    // Mock SubgraphContextFactory
    mockContextFactory = {
      buildSubgraphContext: jest.fn().mockResolvedValue(mockSubgraphContext)
    };

    // Mock SubgraphExecutor
    mockExecutor = {
      executeThread: jest.fn().mockResolvedValue({
        threadId: 'sub-thread-1',
        output: { subOutput: 'result' },
        executionTime: 100,
        nodeResults: [],
        metadata: {
          status: 'COMPLETED',
          startTime: Date.now(),
          endTime: Date.now() + 100,
          executionTime: 100,
          nodeCount: 1,
          errorCount: 0
        }
      } as ThreadResult)
    };

    // 创建管理器
    manager = new TriggeredSubworkflowManager(
      mockContextFactory,
      mockExecutor,
      mockEventManager
    );
  });

  describe('基本功能测试', () => {
    it('应该成功执行触发子工作流', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'sub-workflow-1',
        input: { triggerId: 'trigger-1', output: { mainOutput: 'value' }, input: { mainInput: 'data' } },
        triggerId: 'trigger-1',
        mainThreadContext: mockMainThreadContext,
        config: {
          waitForCompletion: true,
          recordHistory: true
        }
      };

      const result = await manager.executeTriggeredSubgraph(task);

      // 验证结果
      expect(result).toBeDefined();
      expect(result.subgraphContext).toBe(mockSubgraphContext);
      expect(result.threadResult).toBeDefined();
      expect(result.executionTime).toBeGreaterThanOrEqual(0);

      // 验证上下文创建被调用
      expect(mockContextFactory.buildSubgraphContext).toHaveBeenCalledWith(
        'sub-workflow-1',
        task.input,
        expect.objectContaining({
          triggeredBy: expect.objectContaining({
            triggerId: 'trigger-1',
            mainThreadId: 'main-thread-1'
          }),
          isTriggeredSubgraph: true
        })
      );

      // 验证执行器被调用
      expect(mockExecutor.executeThread).toHaveBeenCalledWith(mockSubgraphContext);

      // 验证事件被触发
      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TRIGGERED_SUBGRAPH_STARTED'
        })
      );
      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TRIGGERED_SUBGRAPH_COMPLETED'
        })
      );
    });

    it('应该在执行失败时触发失败事件', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'sub-workflow-1',
        input: { triggerId: 'trigger-1' },
        triggerId: 'trigger-1',
        mainThreadContext: mockMainThreadContext
      };

      const error = new Error('Execution failed');
      mockExecutor.executeThread.mockRejectedValue(error);

      await expect(manager.executeTriggeredSubgraph(task)).rejects.toThrow('Execution failed');

      // 验证失败事件被触发
      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TRIGGERED_SUBGRAPH_FAILED',
          error: 'Execution failed'
        })
      );

      // 验证执行状态已结束
      expect(manager.isExecuting()).toBe(false);
    });

    it('应该在创建上下文失败时触发失败事件', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'sub-workflow-1',
        input: { triggerId: 'trigger-1' },
        triggerId: 'trigger-1',
        mainThreadContext: mockMainThreadContext
      };

      const error = new Error('Context creation failed');
      mockContextFactory.buildSubgraphContext.mockRejectedValue(error);

      await expect(manager.executeTriggeredSubgraph(task)).rejects.toThrow('Context creation failed');

      // 验证失败事件被触发
      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TRIGGERED_SUBGRAPH_FAILED',
          error: 'Context creation failed'
        })
      );
    });
  });

  describe('执行状态管理测试', () => {
    it('应该正确管理执行状态', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'sub-workflow-1',
        input: { triggerId: 'trigger-1' },
        triggerId: 'trigger-1',
        mainThreadContext: mockMainThreadContext
      };

      // 执行前
      expect(manager.isExecuting()).toBe(false);
      expect(manager.getCurrentWorkflowId()).toBe('');

      // 执行中
      const executionPromise = manager.executeTriggeredSubgraph(task);
      expect(manager.isExecuting()).toBe(true);
      expect(manager.getCurrentWorkflowId()).toBe('sub-workflow-1');

      // 等待执行完成
      await executionPromise;

      // 执行后
      expect(manager.isExecuting()).toBe(false);
      expect(manager.getCurrentWorkflowId()).toBe('');
    });

    it('应该记录执行历史', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'sub-workflow-1',
        input: { triggerId: 'trigger-1' },
        triggerId: 'trigger-1',
        mainThreadContext: mockMainThreadContext,
        config: {
          recordHistory: true
        }
      };

      const threadResult: ThreadResult = {
        status: 'COMPLETED',
        output: { result: 'success' }
      } as any;
      mockExecutor.executeThread.mockResolvedValue(threadResult);

      await manager.executeTriggeredSubgraph(task);

      const history = manager.getExecutionHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toBe(threadResult);
    });

    it('应该支持不记录历史', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'sub-workflow-1',
        input: { triggerId: 'trigger-1' },
        triggerId: 'trigger-1',
        mainThreadContext: mockMainThreadContext,
        config: {
          recordHistory: false
        }
      };

      await manager.executeTriggeredSubgraph(task);

      const history = manager.getExecutionHistory();
      expect(history).toHaveLength(0);
    });

    it('应该正确计算执行时长', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'sub-workflow-1',
        input: { triggerId: 'trigger-1' },
        triggerId: 'trigger-1',
        mainThreadContext: mockMainThreadContext
      };

      // 模拟执行耗时
      mockExecutor.executeThread.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return {
          threadId: 'sub-thread-1',
          output: {},
          executionTime: 100,
          nodeResults: [],
          metadata: {
            status: 'COMPLETED',
            startTime: Date.now(),
            endTime: Date.now() + 100,
            executionTime: 100,
            nodeCount: 1,
            errorCount: 0
          }
        } as ThreadResult;
      });

      const result = await manager.executeTriggeredSubgraph(task);

      expect(result.executionTime).toBeGreaterThanOrEqual(10);
      expect(result.executionTime).toBeLessThan(100);
    });
  });

  describe('事件触发测试', () => {
    it('应该按正确顺序触发事件', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'sub-workflow-1',
        input: { triggerId: 'trigger-1' },
        triggerId: 'trigger-1',
        mainThreadContext: mockMainThreadContext
      };

      await manager.executeTriggeredSubgraph(task);

      const calls = mockEventManager.emit.mock.calls;
      
      // 验证事件顺序
      expect(calls[0]?.[0]?.type).toBe('TRIGGERED_SUBGRAPH_STARTED');
      expect(calls[1]?.[0]?.type).toBe('TRIGGERED_SUBGRAPH_COMPLETED');
    });

    it('应该在开始事件中包含正确的数据', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'sub-workflow-1',
        input: { triggerId: 'trigger-1', data: 'test' },
        triggerId: 'trigger-1',
        mainThreadContext: mockMainThreadContext
      };

      await manager.executeTriggeredSubgraph(task);

      const startedEvent = mockEventManager.emit.mock.calls[0]?.[0] as any;
      
      expect(startedEvent.type).toBe('TRIGGERED_SUBGRAPH_STARTED');
      expect(startedEvent.threadId).toBe('main-thread-1');
      expect(startedEvent.workflowId).toBe('main-workflow-1');
      expect(startedEvent.subgraphId).toBe('sub-workflow-1');
      expect(startedEvent.triggerId).toBe('trigger-1');
      expect(startedEvent.input).toEqual(task.input);
      expect(startedEvent.timestamp).toBeDefined();
    });

    it('应该在完成事件中包含正确的数据', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'sub-workflow-1',
        input: { triggerId: 'trigger-1' },
        triggerId: 'trigger-1',
        mainThreadContext: mockMainThreadContext
      };

      mockSubgraphContext.getOutput.mockReturnValue({ result: 'success' });

      await manager.executeTriggeredSubgraph(task);

      const completedEvent = mockEventManager.emit.mock.calls[1]?.[0] as any;
      
      expect(completedEvent.type).toBe('TRIGGERED_SUBGRAPH_COMPLETED');
      expect(completedEvent.threadId).toBe('main-thread-1');
      expect(completedEvent.workflowId).toBe('main-workflow-1');
      expect(completedEvent.subgraphId).toBe('sub-workflow-1');
      expect(completedEvent.triggerId).toBe('trigger-1');
      expect(completedEvent.output).toEqual({ result: 'success' });
      expect(completedEvent.executionTime).toBeGreaterThanOrEqual(0);
      expect(completedEvent.timestamp).toBeDefined();
    });
  });

  describe('状态查询测试', () => {
    it('应该正确返回执行状态', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'sub-workflow-1',
        input: { triggerId: 'trigger-1' },
        triggerId: 'trigger-1',
        mainThreadContext: mockMainThreadContext
      };

      const executionPromise = manager.executeTriggeredSubgraph(task);
      
      const state = manager.getExecutionState();
      expect(state.isExecuting).toBe(true);
      expect(state.currentWorkflowId).toBe('sub-workflow-1');
      expect(state.executionHistory).toHaveLength(0);
      expect(state.startTime).toBeDefined();

      await executionPromise;
    });

    it('应该正确返回执行历史', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'sub-workflow-1',
        input: { triggerId: 'trigger-1' },
        triggerId: 'trigger-1',
        mainThreadContext: mockMainThreadContext,
        config: {
          recordHistory: true
        }
      };

      await manager.executeTriggeredSubgraph(task);

      const history = manager.getExecutionHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(0);
    });

    it('应该正确检查是否正在执行', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'sub-workflow-1',
        input: { triggerId: 'trigger-1' },
        triggerId: 'trigger-1',
        mainThreadContext: mockMainThreadContext
      };

      expect(manager.isExecuting()).toBe(false);

      const executionPromise = manager.executeTriggeredSubgraph(task);
      expect(manager.isExecuting()).toBe(true);

      await executionPromise;
      expect(manager.isExecuting()).toBe(false);
    });

    it('应该正确返回当前工作流ID', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'sub-workflow-1',
        input: { triggerId: 'trigger-1' },
        triggerId: 'trigger-1',
        mainThreadContext: mockMainThreadContext
      };

      expect(manager.getCurrentWorkflowId()).toBe('');

      const executionPromise = manager.executeTriggeredSubgraph(task);
      expect(manager.getCurrentWorkflowId()).toBe('sub-workflow-1');

      await executionPromise;
      expect(manager.getCurrentWorkflowId()).toBe('');
    });

    it('应该正确返回执行时长', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'sub-workflow-1',
        input: { triggerId: 'trigger-1' },
        triggerId: 'trigger-1',
        mainThreadContext: mockMainThreadContext
      };

      expect(manager.getExecutionDuration()).toBe(0);

      const executionPromise = manager.executeTriggeredSubgraph(task);
      const duration = manager.getExecutionDuration();
      expect(duration).toBeGreaterThanOrEqual(0);

      await executionPromise;
      expect(manager.getExecutionDuration()).toBe(0);
    });
  });

  describe('清空状态测试', () => {
    it('应该清空所有状态', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'sub-workflow-1',
        input: { triggerId: 'trigger-1' },
        triggerId: 'trigger-1',
        mainThreadContext: mockMainThreadContext,
        config: {
          recordHistory: true
        }
      };

      await manager.executeTriggeredSubgraph(task);

      // 清空状态
      manager.clear();

      // 验证状态已清空
      expect(manager.isExecuting()).toBe(false);
      expect(manager.getCurrentWorkflowId()).toBe('');
      expect(manager.getExecutionHistory()).toHaveLength(0);
      expect(manager.getExecutionDuration()).toBe(0);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空的输入数据', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'sub-workflow-1',
        input: {},
        triggerId: 'trigger-1',
        mainThreadContext: mockMainThreadContext
      };

      const result = await manager.executeTriggeredSubgraph(task);

      expect(result).toBeDefined();
      expect(mockContextFactory.buildSubgraphContext).toHaveBeenCalledWith(
        'sub-workflow-1',
        {},
        expect.any(Object)
      );
    });

    it('应该处理空的配置', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'sub-workflow-1',
        input: { triggerId: 'trigger-1' },
        triggerId: 'trigger-1',
        mainThreadContext: mockMainThreadContext
        // config 未设置
      };

      const result = await manager.executeTriggeredSubgraph(task);

      expect(result).toBeDefined();
      // 默认应该记录历史
      expect(manager.getExecutionHistory()).toHaveLength(1);
    });

    it('应该处理执行器返回空结果', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'sub-workflow-1',
        input: { triggerId: 'trigger-1' },
        triggerId: 'trigger-1',
        mainThreadContext: mockMainThreadContext
      };

      mockExecutor.executeThread.mockResolvedValue({} as ThreadResult);

      const result = await manager.executeTriggeredSubgraph(task);

      expect(result).toBeDefined();
      expect(result.threadResult).toEqual({});
    });
  });
});