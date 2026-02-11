/**
 * 检查点外部系统集成测试
 * 
 * 测试范围：
 * - 与监控系统的集成
 * - 与日志系统的集成
 * - 与告警系统的集成
 * - 与其他服务的集成
 */

import { CheckpointResourceAPI } from '@modular-agent/sdk/api/resources/checkpoints/checkpoint-resource-api';
import { ThreadRegistry } from '../../../core/services/thread-registry';
import { WorkflowRegistry } from '@modular-agent/sdk/core/services/workflow-registry';
import { SingletonRegistry } from '@modular-agent/sdk/core/execution/context/singleton-registry';
import type { WorkflowDefinition } from '@modular-agent/types/workflow';
import { NodeType } from '@modular-agent/types/node';
import { EdgeType } from '@modular-agent/types/edge';
import { ThreadStatus } from '@modular-agent/types/thread';

// 模拟外部系统
class MockMonitoringService {
  events: any[] = [];

  recordEvent(event: any) {
    this.events.push(event);
  }

  getEvents() {
    return this.events;
  }

  clear() {
    this.events = [];
  }
}

class MockLoggingService {
  logs: any[] = [];

  log(level: string, message: string, data?: any) {
    this.logs.push({ level, message, data, timestamp: Date.now() });
  }

  getLogs() {
    return this.logs;
  }

  clear() {
    this.logs = [];
  }
}

class MockAlertingService {
  alerts: any[] = [];

  triggerAlert(alert: any) {
    this.alerts.push(alert);
  }

  getAlerts() {
    return this.alerts;
  }

  clear() {
    this.alerts = [];
  }
}

describe('检查点外部系统集成测试', () => {
  let api: CheckpointResourceAPI;
  let threadRegistry: ThreadRegistry;
  let workflowRegistry: WorkflowRegistry;
  let monitoringService: MockMonitoringService;
  let loggingService: MockLoggingService;
  let alertingService: MockAlertingService;

  beforeEach(() => {
    threadRegistry = new ThreadRegistry();
    workflowRegistry = new WorkflowRegistry();

    // 注册全局服务
    SingletonRegistry.register('threadRegistry', threadRegistry);
    SingletonRegistry.register('workflowRegistry', workflowRegistry);

    // 创建外部服务
    monitoringService = new MockMonitoringService();
    loggingService = new MockLoggingService();
    alertingService = new MockAlertingService();

    // 创建API
    api = new CheckpointResourceAPI();
  });

  afterEach(() => {
    monitoringService.clear();
    loggingService.clear();
    alertingService.clear();
  });

  /**
   * 创建测试工作流
   */
  const createTestWorkflow = (id: string, name: string): WorkflowDefinition => ({
    id,
    name,
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [
      {
        id: `${id}-start`,
        name: 'Start',
        type: NodeType.START,
        config: {},
        incomingEdgeIds: [],
        outgoingEdgeIds: [`${id}-edge-1`]
      },
      {
        id: `${id}-process`,
        name: 'Process',
        type: NodeType.CODE,
        config: {
          scriptName: 'test-process',
          scriptType: 'javascript',
          risk: 'low'
        },
        incomingEdgeIds: [`${id}-edge-1`],
        outgoingEdgeIds: [`${id}-edge-2`]
      },
      {
        id: `${id}-end`,
        name: 'End',
        type: NodeType.END,
        config: {},
        incomingEdgeIds: [`${id}-edge-2`],
        outgoingEdgeIds: []
      }
    ],
    edges: [
      {
        id: `${id}-edge-1`,
        sourceNodeId: `${id}-start`,
        targetNodeId: `${id}-process`,
        type: EdgeType.DEFAULT,
        condition: undefined
      },
      {
        id: `${id}-edge-2`,
        sourceNodeId: `${id}-process`,
        targetNodeId: `${id}-end`,
        type: EdgeType.DEFAULT,
        condition: undefined
      }
    ]
  });

  /**
   * 创建测试线程上下文
   */
  const createTestThreadContext = async (
    threadRegistry: ThreadRegistry,
    workflowRegistry: WorkflowRegistry,
    workflow: WorkflowDefinition
  ) => {
    const { ThreadContext } = await import('../../../core/execution/context/thread-context');
    const { ConversationManager } = await import('../../../core/execution/managers/conversation-manager');
    const { generateId } = await import('../../../utils');
    const { GraphBuilder } = await import('../../../core/graph/graph-builder');

    const conversationManager = new ConversationManager();
    const graph = GraphBuilder.build(workflow);

    const thread = {
      id: generateId(),
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      status: ThreadStatus.RUNNING,
      currentNodeId: `${workflow.id}-process`,
      graph,
      variables: [],
      variableScopes: {
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      },
      variableValues: {},
      input: { testInput: 'value' },
      output: {},
      nodeResults: [],
      startTime: Date.now(),
      errors: []
    };

    const executionContext = await import('../../../core/execution/context/execution-context');
    const threadContext = new ThreadContext(
      thread,
      conversationManager,
      threadRegistry,
      workflowRegistry,
      {} as any, // eventManager
      {} as any, // toolService
      { executeLLMCall: jest.fn() } as any // llmExecutor
    );
    threadRegistry.register(threadContext);

    return threadContext;
  };

  describe('场景1: 监控系统集成', () => {
    it('应该在检查点操作时发送监控事件', async () => {
      const workflow = createTestWorkflow('monitoring-test', 'Monitoring Test');
      workflowRegistry.register(workflow);

      const threadContext = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);

      // 模拟监控集成
      const originalCreate = api.createThreadCheckpoint;
      api.createThreadCheckpoint = async (...args) => {
        const result = await originalCreate.apply(api, args);
        monitoringService.recordEvent({
          type: 'CHECKPOINT_CREATED',
          checkpointId: result,
          threadId: args[0],
          timestamp: Date.now()
        });
        return result;
      };

      const originalDelete = api.delete;
      api.delete = async (...args) => {
        const result = await originalDelete.apply(api, args);
        monitoringService.recordEvent({
          type: 'CHECKPOINT_DELETED',
          checkpointId: args[0],
          timestamp: Date.now()
        });
        return result;
      };

      // 创建检查点
      const checkpointId = await api.createThreadCheckpoint(threadContext.getThreadId(), {
        description: 'Monitoring test checkpoint'
      });

      // 删除检查点
      await api.delete(checkpointId);

      // 验证监控事件
      const events = monitoringService.getEvents();
      expect(events).toHaveLength(2);

      const createEvent = events.find(e => e.type === 'CHECKPOINT_CREATED');
      expect(createEvent).toBeDefined();
      expect(createEvent?.checkpointId).toBe(checkpointId);
      expect(createEvent?.threadId).toBe(threadContext.getThreadId());

      const deleteEvent = events.find(e => e.type === 'CHECKPOINT_DELETED');
      expect(deleteEvent).toBeDefined();
      expect(deleteEvent?.checkpointId).toBe(checkpointId);
    });
  });

  describe('场景2: 日志系统集成', () => {
    it('应该在检查点操作时记录详细日志', async () => {
      const workflow = createTestWorkflow('logging-test', 'Logging Test');
      workflowRegistry.register(workflow);

      const threadContext = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);

      // 模拟日志集成
      const originalCreate = api.createThreadCheckpoint;
      api.createThreadCheckpoint = async (...args) => {
        try {
          const result = await originalCreate.apply(api, args);
          loggingService.log('INFO', 'Checkpoint created successfully', {
            checkpointId: result,
            threadId: args[0],
            metadata: args[1]
          });
          return result;
        } catch (error) {
          loggingService.log('ERROR', 'Failed to create checkpoint', {
            threadId: args[0],
            error: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }
      };

      const originalGet = api.get;
      api.get = async (...args) => {
        try {
          const result = await originalGet.apply(api, args);
          if (result) {
            loggingService.log('INFO', 'Checkpoint retrieved successfully', {
              checkpointId: args[0]
            });
          } else {
            loggingService.log('WARN', 'Checkpoint not found', {
              checkpointId: args[0]
            });
          }
          return result;
        } catch (error) {
          loggingService.log('ERROR', 'Failed to retrieve checkpoint', {
            checkpointId: args[0],
            error: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }
      };

      // 创建检查点
      const checkpointId = await api.createThreadCheckpoint(threadContext.getThreadId(), {
        description: 'Logging test checkpoint',
        tags: ['logging', 'test']
      });

      // 获取存在的检查点
      const existing = await api.get(checkpointId);

      // 获取不存在的检查点
      const nonExistent = await api.get('non-existent-checkpoint');

      // 验证日志
      const logs = loggingService.getLogs();
      expect(logs).toHaveLength(3);

      const createLog = logs.find(l => l.message.includes('created successfully'));
      expect(createLog).toBeDefined();
      expect(createLog?.data?.checkpointId).toBe(checkpointId);
      expect(createLog?.data?.metadata?.tags).toContain('logging');

      const retrieveLog = logs.find(l => l.message.includes('retrieved successfully'));
      expect(retrieveLog).toBeDefined();

      const notFoundLog = logs.find(l => l.message.includes('not found'));
      expect(notFoundLog).toBeDefined();
    });
  });

  describe('场景3: 告警系统集成', () => {
    it('应该在异常情况下触发告警', async () => {
      const workflow = createTestWorkflow('alerting-test', 'Alerting Test');
      workflowRegistry.register(workflow);

      const threadContext = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);

      // 模拟告警集成
      const originalCreate = api.createThreadCheckpoint;
      api.createThreadCheckpoint = async (...args) => {
        try {
          const result = await originalCreate.apply(api, args);

          // 检查检查点大小是否过大（模拟性能告警）
          const checkpoint = await api.get(result);
          if (checkpoint && JSON.stringify(checkpoint).length > 1000000) { // 1MB
            alertingService.triggerAlert({
              type: 'LARGE_CHECKPOINT',
              severity: 'WARNING',
              message: 'Checkpoint size exceeds 1MB',
              checkpointId: result,
              size: JSON.stringify(checkpoint).length
            });
          }

          return result;
        } catch (error) {
          alertingService.triggerAlert({
            type: 'CHECKPOINT_CREATION_FAILED',
            severity: 'ERROR',
            message: 'Failed to create checkpoint',
            threadId: args[0],
            error: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }
      };

      // 创建正常大小的检查点
      const normalCheckpointId = await api.createThreadCheckpoint(threadContext.getThreadId(), {
        description: 'Normal checkpoint'
      });

      // 创建大型检查点（包含大量数据）
      const largeInput = {
        largeArray: Array.from({ length: 10000 }, (_, i) => `item-${i}`)
      };

      // 修改线程输入以创建大型检查点
      threadContext.thread.input = largeInput;
      const largeCheckpointId = await api.createThreadCheckpoint(threadContext.getThreadId(), {
        description: 'Large checkpoint for alerting test'
      });

      // 验证告警
      const alerts = alertingService.getAlerts();

      // 应该有一个关于大型检查点的告警
      const largeCheckpointAlert = alerts.find(a => a.type === 'LARGE_CHECKPOINT');
      expect(largeCheckpointAlert).toBeDefined();
      expect(largeCheckpointAlert?.checkpointId).toBe(largeCheckpointId);
      expect(largeCheckpointAlert?.severity).toBe('WARNING');

      // 正常检查点不应该触发告警
      const normalCheckpointAlert = alerts.find(a => a.checkpointId === normalCheckpointId);
      expect(normalCheckpointAlert).toBeUndefined();
    });
  });

  describe('场景4: 性能指标集成', () => {
    it('应该收集和报告检查点操作的性能指标', async () => {
      const workflow = createTestWorkflow('metrics-test', 'Metrics Test');
      workflowRegistry.register(workflow);

      const threadContext = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);

      // 模拟性能指标收集
      const metrics: Record<string, number[]> = {
        createDuration: [],
        restoreDuration: [],
        storageSize: []
      };

      const originalCreate = api.createThreadCheckpoint;
      api.createThreadCheckpoint = async (...args) => {
        const startTime = Date.now();
        const result = await originalCreate.apply(api, args);
        const duration = Date.now() - startTime;
        metrics.createDuration.push(duration);

        // 记录存储大小
        const checkpoint = await api.get(result);
        if (checkpoint) {
          const size = JSON.stringify(checkpoint).length;
          metrics.storageSize.push(size);
        }

        return result;
      };

      const originalRestore = api.restoreFromCheckpoint;
      api.restoreFromCheckpoint = async (...args) => {
        const startTime = Date.now();
        const result = await originalRestore.apply(api, args);
        const duration = Date.now() - startTime;
        metrics.restoreDuration.push(duration);
        return result;
      };

      // 执行多次检查点操作
      const numOperations = 5;
      const checkpointIds: string[] = [];

      for (let i = 0; i < numOperations; i++) {
        const checkpointId = await api.createThreadCheckpoint(threadContext.getThreadId(), {
          description: `Metrics test ${i}`
        });
        checkpointIds.push(checkpointId);
      }

      // 恢复一个检查点
      await api.restoreFromCheckpoint(checkpointIds[0]);

      // 验证性能指标
      expect(metrics.createDuration).toHaveLength(numOperations);
      expect(metrics.restoreDuration).toHaveLength(1);
      expect(metrics.storageSize).toHaveLength(numOperations);

      // 验证指标值合理
      const avgCreateDuration = metrics.createDuration.reduce((a, b) => a + b, 0) / numOperations;
      expect(avgCreateDuration).toBeGreaterThan(0);
      expect(avgCreateDuration).toBeLessThan(1000); // 应该在1秒内

      const avgStorageSize = metrics.storageSize.reduce((a, b) => a + b, 0) / numOperations;
      expect(avgStorageSize).toBeGreaterThan(100); // 应该有合理的大小
    });
  });

  describe('场景5: 安全审计集成', () => {
    it('应该记录安全相关的审计事件', async () => {
      const workflow = createTestWorkflow('audit-test', 'Audit Test');
      workflowRegistry.register(workflow);

      const threadContext = await createTestThreadContext(threadRegistry, workflowRegistry, workflow);

      // 模拟审计日志
      const auditLogs: any[] = [];

      const originalCreate = api.createThreadCheckpoint;
      api.createThreadCheckpoint = async (...args) => {
        const result = await originalCreate.apply(api, args);
        auditLogs.push({
          eventType: 'CHECKPOINT_CREATED',
          timestamp: Date.now(),
          userId: 'test-user',
          threadId: args[0],
          checkpointId: result,
          sensitiveDataDetected: false // 简化实现
        });
        return result;
      };

      const originalDelete = api.delete;
      api.delete = async (...args) => {
        const result = await originalDelete.apply(api, args);
        auditLogs.push({
          eventType: 'CHECKPOINT_DELETED',
          timestamp: Date.now(),
          userId: 'test-user',
          checkpointId: args[0]
        });
        return result;
      };

      // 创建和删除检查点
      const checkpointId = await api.createThreadCheckpoint(threadContext.getThreadId());
      await api.delete(checkpointId);

      // 验证审计日志
      expect(auditLogs).toHaveLength(2);

      const createAudit = auditLogs.find(log => log.eventType === 'CHECKPOINT_CREATED');
      expect(createAudit).toBeDefined();
      expect(createAudit?.threadId).toBe(threadContext.getThreadId());
      expect(createAudit?.checkpointId).toBe(checkpointId);

      const deleteAudit = auditLogs.find(log => log.eventType === 'CHECKPOINT_DELETED');
      expect(deleteAudit).toBeDefined();
      expect(deleteAudit?.checkpointId).toBe(checkpointId);
    });
  });
});