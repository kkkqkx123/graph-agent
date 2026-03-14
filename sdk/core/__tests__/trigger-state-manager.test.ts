/**
 * Trigger State Manager 集成测试
 *
 * 测试场景：
 * - 状态注册
 * - 状态更新
 * - 快照功能
 * - 查询和删除
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TriggerStateManager } from '../../graph/execution/managers/trigger-state-manager.js';
import type { TriggerRuntimeState } from '@modular-agent/types';
import { NotFoundError, RuntimeValidationError } from '@modular-agent/types';

describe('Trigger State Manager - 触发器状态管理器', () => {
  let stateManager: TriggerStateManager;

  beforeEach(() => {
    stateManager = new TriggerStateManager('test-thread');
    stateManager.setWorkflowId('workflow-123');
  });

  describe('状态注册', () => {
    it('测试注册状态：register方法正确存储状态', () => {
      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        status: 'enabled',
        triggerCount: 0,
        updatedAt: Date.now()
      };

      stateManager.register(state);

      expect(stateManager.hasState('trigger-1')).toBe(true);
      const retrievedState = stateManager.getState('trigger-1');
      expect(retrievedState).toEqual(state);
    });

    it('测试线程ID验证：状态中的threadId必须匹配管理器的threadId', () => {
      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: 'different-thread', // 不匹配
        workflowId: 'workflow-123',
        status: 'enabled',
        triggerCount: 0,
        updatedAt: Date.now()
      };

      expect(() => {
        stateManager.register(state);
      }).toThrow(RuntimeValidationError);
    });

    it('测试工作流ID验证：状态中的workflowId必须匹配管理器的workflowId', () => {
      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: 'test-thread',
        workflowId: 'different-workflow', // 不匹配
        status: 'enabled',
        triggerCount: 0,
        updatedAt: Date.now()
      };

      expect(() => {
        stateManager.register(state);
      }).toThrow(RuntimeValidationError);
    });

    it('测试触发器ID为空：应抛出错误', () => {
      const state: any = {
        triggerId: '', // 空ID
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        status: 'enabled',
        triggerCount: 0,
        updatedAt: Date.now()
      };

      expect(() => {
        stateManager.register(state);
      }).toThrow(RuntimeValidationError);
    });

    it('测试线程ID为空：应抛出错误', () => {
      const state: any = {
        triggerId: 'trigger-1',
        threadId: '', // 空ID
        workflowId: 'workflow-123',
        status: 'enabled',
        triggerCount: 0,
        updatedAt: Date.now()
      };

      expect(() => {
        stateManager.register(state);
      }).toThrow(RuntimeValidationError);
    });

    it('测试工作流ID为空：应抛出错误', () => {
      const state: any = {
        triggerId: 'trigger-1',
        threadId: 'test-thread',
        workflowId: '', // 空ID
        status: 'enabled',
        triggerCount: 0,
        updatedAt: Date.now()
      };

      expect(() => {
        stateManager.register(state);
      }).toThrow(RuntimeValidationError);
    });

    it('测试重复注册：重复注册应抛出错误', () => {
      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        status: 'enabled',
        triggerCount: 0,
        updatedAt: Date.now()
      };

      stateManager.register(state);

      expect(() => {
        stateManager.register(state);
      }).toThrow();
    });

    it('测试未设置工作流ID：工作流ID为null时应抛出错误', () => {
      const managerWithoutWorkflowId = new TriggerStateManager('test-thread');
      // 不设置 workflowId

      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: 'test-thread',
        workflowId: null as any,
        status: 'enabled',
        triggerCount: 0,
        updatedAt: Date.now()
      };

      expect(() => {
        managerWithoutWorkflowId.register(state);
      }).toThrow(RuntimeValidationError);
    });
  });

  describe('状态更新', () => {
    beforeEach(() => {
      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        status: 'enabled',
        triggerCount: 0,
        updatedAt: Date.now()
      };

      stateManager.register(state);
    });

    it('测试更新状态：updateStatus方法正确更新状态', () => {
      const originalState = stateManager.getState('trigger-1');
      const originalUpdatedAt = originalState!.updatedAt;

      // 等待1毫秒确保时间戳不同
      return new Promise<void>(resolve => {
        setTimeout(() => {
          stateManager.updateStatus('trigger-1', 'disabled');

          const updatedState = stateManager.getState('trigger-1');
          expect(updatedState?.status).toBe('disabled');
          expect(updatedState?.updatedAt).toBeGreaterThan(originalUpdatedAt);
          resolve();
        }, 1);
      });
    });

    it('测试增加触发次数：incrementTriggerCount正确递增计数', () => {
      const originalState = stateManager.getState('trigger-1');
      const originalUpdatedAt = originalState!.updatedAt;

      // 等待1毫秒确保时间戳不同
      return new Promise<void>(resolve => {
        setTimeout(() => {
          stateManager.incrementTriggerCount('trigger-1');

          const updatedState = stateManager.getState('trigger-1');
          expect(updatedState?.triggerCount).toBe(1);
          expect(updatedState?.updatedAt).toBeGreaterThan(originalUpdatedAt);
          resolve();
        }, 1);
      });
    });

    it('测试多次增加触发次数：正确累加', () => {
      stateManager.incrementTriggerCount('trigger-1');
      stateManager.incrementTriggerCount('trigger-1');
      stateManager.incrementTriggerCount('trigger-1');

      const state = stateManager.getState('trigger-1');
      expect(state?.triggerCount).toBe(3);
    });

    it('测试更新不存在的状态：应抛出错误', () => {
      expect(() => {
        stateManager.updateStatus('non-existent', 'disabled');
      }).toThrow(NotFoundError);
    });

    it('测试增加不存在的状态：应抛出错误', () => {
      expect(() => {
        stateManager.incrementTriggerCount('non-existent');
      }).toThrow(NotFoundError);
    });
  });

  describe('快照功能', () => {
    beforeEach(() => {
      const states: TriggerRuntimeState[] = [
        {
          triggerId: 'trigger-1',
          threadId: 'test-thread',
          workflowId: 'workflow-123',
          status: 'enabled',
          triggerCount: 5,
          updatedAt: Date.now()
        },
        {
          triggerId: 'trigger-2',
          threadId: 'test-thread',
          workflowId: 'workflow-123',
          status: 'disabled',
          triggerCount: 10,
          updatedAt: Date.now()
        }
      ];

      states.forEach(state => stateManager.register(state));
    });

    it('测试创建快照：createSnapshot创建状态的深拷贝', () => {
      const snapshot = stateManager.createSnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot.size).toBe(2);
      expect(snapshot.get('trigger-1')).toEqual(stateManager.getState('trigger-1'));
      expect(snapshot.get('trigger-2')).toEqual(stateManager.getState('trigger-2'));
    });

    it('测试恢复快照：restoreFromSnapshot正确恢复状态', () => {
      const snapshot = stateManager.createSnapshot();

      // 修改当前状态
      stateManager.updateStatus('trigger-1', 'disabled');
      stateManager.incrementTriggerCount('trigger-2');

      // 从快照恢复
      stateManager.restoreFromSnapshot(snapshot);

      // 验证恢复后的状态
      const state1 = stateManager.getState('trigger-1');
      const state2 = stateManager.getState('trigger-2');
      expect(state1?.status).toBe('enabled');
      expect(state1?.triggerCount).toBe(5);
      expect(state2?.triggerCount).toBe(10);
    });

    it('测试快照独立性：快照修改不影响原始状态', () => {
      const snapshot = stateManager.createSnapshot();

      // 修改快照
      const snapshotState = snapshot.get('trigger-1');
      if (snapshotState) {
        snapshotState.status = 'disabled';
        snapshotState.triggerCount = 100;
      }

      // 原始状态不应被修改
      const originalState = stateManager.getState('trigger-1');
      expect(originalState?.status).toBe('enabled');
      expect(originalState?.triggerCount).toBe(5);
    });

    it('测试恢复空快照：应清空所有状态', () => {
      const emptySnapshot = new Map<string, TriggerRuntimeState>();

      stateManager.restoreFromSnapshot(emptySnapshot);

      expect(stateManager.size()).toBe(0);
      expect(stateManager.getAllStates().size).toBe(0);
    });

    it('测试快照包含所有状态：快照应包含所有注册的状态', () => {
      // 添加更多状态
      const additionalState: TriggerRuntimeState = {
        triggerId: 'trigger-3',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        status: 'triggered',
        triggerCount: 2,
        updatedAt: Date.now()
      };

      stateManager.register(additionalState);

      const snapshot = stateManager.createSnapshot();

      expect(snapshot.size).toBe(3);
      expect(snapshot.has('trigger-1')).toBe(true);
      expect(snapshot.has('trigger-2')).toBe(true);
      expect(snapshot.has('trigger-3')).toBe(true);
    });

    it('测试恢复不匹配线程ID的快照：应抛出错误', () => {
      const invalidSnapshot = new Map<string, TriggerRuntimeState>();
      invalidSnapshot.set('trigger-1', {
        triggerId: 'trigger-1',
        threadId: 'different-thread', // 不匹配
        workflowId: 'workflow-123',
        status: 'enabled',
        triggerCount: 0,
        updatedAt: Date.now()
      });

      expect(() => {
        stateManager.restoreFromSnapshot(invalidSnapshot);
      }).toThrow(RuntimeValidationError);
    });
  });

  describe('查询和删除', () => {
    beforeEach(() => {
      const states: TriggerRuntimeState[] = [
        {
          triggerId: 'trigger-1',
          threadId: 'test-thread',
          workflowId: 'workflow-123',
          status: 'enabled',
          triggerCount: 0,
          updatedAt: Date.now()
        },
        {
          triggerId: 'trigger-2',
          threadId: 'test-thread',
          workflowId: 'workflow-123',
          status: 'disabled',
          triggerCount: 5,
          updatedAt: Date.now()
        }
      ];

      states.forEach(state => stateManager.register(state));
    });

    it('测试获取状态：getState返回正确的状态', () => {
      const state1 = stateManager.getState('trigger-1');
      const state2 = stateManager.getState('trigger-2');

      expect(state1).toBeDefined();
      expect(state1?.triggerId).toBe('trigger-1');
      expect(state1?.status).toBe('enabled');
      expect(state1?.triggerCount).toBe(0);

      expect(state2).toBeDefined();
      expect(state2?.triggerId).toBe('trigger-2');
      expect(state2?.status).toBe('disabled');
      expect(state2?.triggerCount).toBe(5);
    });

    it('测试获取不存在的状态：返回undefined', () => {
      const state = stateManager.getState('non-existent');

      expect(state).toBeUndefined();
    });

    it('测试检查存在性：hasState正确返回状态是否存在', () => {
      expect(stateManager.hasState('trigger-1')).toBe(true);
      expect(stateManager.hasState('trigger-2')).toBe(true);
      expect(stateManager.hasState('non-existent')).toBe(false);
    });

    it('测试删除状态：deleteState正确删除状态', () => {
      expect(stateManager.hasState('trigger-1')).toBe(true);

      stateManager.deleteState('trigger-1');

      expect(stateManager.hasState('trigger-1')).toBe(false);
      expect(stateManager.getState('trigger-1')).toBeUndefined();
    });

    it('测试删除不存在的状态：应抛出错误', () => {
      expect(() => {
        stateManager.deleteState('non-existent');
      }).toThrow(NotFoundError);
    });

    it('测试获取所有状态：getAllStates返回所有状态的只读副本', () => {
      const allStates = stateManager.getAllStates();

      expect(allStates.size).toBe(2);
      expect(allStates.get('trigger-1')).toEqual(stateManager.getState('trigger-1'));
      expect(allStates.get('trigger-2')).toEqual(stateManager.getState('trigger-2'));

      // 验证返回的是副本（修改副本不应影响原状态）
      const stateCopy = allStates.get('trigger-1');
      if (stateCopy) {
        stateCopy.status = 'disabled';
      }

      expect(stateManager.getState('trigger-1')?.status).toBe('enabled');
    });

    it('测试获取状态数量：size返回状态数量', () => {
      expect(stateManager.size()).toBe(2);

      stateManager.register({
        triggerId: 'trigger-3',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        status: 'enabled',
        triggerCount: 0,
        updatedAt: Date.now()
      });

      expect(stateManager.size()).toBe(3);

      stateManager.deleteState('trigger-1');

      expect(stateManager.size()).toBe(2);
    });
  });

  describe('清理功能', () => {
    it('测试清理资源：cleanup方法清空所有状态', () => {
      const states: TriggerRuntimeState[] = [
        {
          triggerId: 'trigger-1',
          threadId: 'test-thread',
          workflowId: 'workflow-123',
          status: 'enabled',
          triggerCount: 0,
          updatedAt: Date.now()
        },
        {
          triggerId: 'trigger-2',
          threadId: 'test-thread',
          workflowId: 'workflow-123',
          status: 'disabled',
          triggerCount: 5,
          updatedAt: Date.now()
        }
      ];

      states.forEach(state => stateManager.register(state));

      expect(stateManager.size()).toBe(2);

      stateManager.cleanup();

      expect(stateManager.size()).toBe(0);
      expect(stateManager.getAllStates().size).toBe(0);
      expect(stateManager.hasState('trigger-1')).toBe(false);
      expect(stateManager.hasState('trigger-2')).toBe(false);
    });

    it('测试清理空状态管理器：应正常处理', () => {
      expect(stateManager.size()).toBe(0);

      stateManager.cleanup();

      expect(stateManager.size()).toBe(0);
    });
  });

  describe('获取器方法', () => {
    it('测试获取线程ID：getThreadId返回正确的线程ID', () => {
      expect(stateManager.getThreadId()).toBe('test-thread');
    });

    it('测试获取工作流ID：getWorkflowId返回正确的工作流ID', () => {
      expect(stateManager.getWorkflowId()).toBe('workflow-123');
    });

    it('测试获取未设置的工作流ID：返回null', () => {
      const managerWithoutWorkflowId = new TriggerStateManager('test-thread');
      // 不设置 workflowId

      expect(managerWithoutWorkflowId.getWorkflowId()).toBeNull();
    });

    it('测试设置工作流ID：setWorkflowId正确设置工作流ID', () => {
      stateManager.setWorkflowId('new-workflow-456');

      expect(stateManager.getWorkflowId()).toBe('new-workflow-456');
    });
  });

  describe('边界情况', () => {
    it('测试注册大量状态：应能正确处理', () => {
      const stateCount = 100;

      for (let i = 0; i < stateCount; i++) {
        const state: TriggerRuntimeState = {
          triggerId: `trigger-${i}`,
          threadId: 'test-thread',
          workflowId: 'workflow-123',
          status: 'enabled',
          triggerCount: i,
          updatedAt: Date.now()
        };

        stateManager.register(state);
      }

      expect(stateManager.size()).toBe(stateCount);
      expect(stateManager.getAllStates().size).toBe(stateCount);
    });

    it('测试并发状态更新：状态应正确更新', () => {
      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: 'test-thread',
        workflowId: 'workflow-123',
        status: 'enabled',
        triggerCount: 0,
        updatedAt: Date.now()
      };

      stateManager.register(state);

      // 多次增加触发次数
      for (let i = 0; i < 10; i++) {
        stateManager.incrementTriggerCount('trigger-1');
      }

      expect(stateManager.getState('trigger-1')?.triggerCount).toBe(10);
    });
  });
});