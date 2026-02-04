/**
 * TriggerStateManager 测试
 * 测试触发器状态管理器的功能
 */

import { TriggerStateManager, type TriggerRuntimeState } from '../trigger-state-manager';
import { TriggerStatus } from '../../../../types/trigger';
import { ID } from '../../../../types/common';

describe('TriggerStateManager', () => {
  let stateManager: TriggerStateManager;
  const threadId = 'thread-1';
  const workflowId = 'workflow-1';

  beforeEach(() => {
    stateManager = new TriggerStateManager(threadId);
    stateManager.setWorkflowId(workflowId);
  });

  describe('register', () => {
    it('应该成功注册触发器状态', () => {
      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      };

      stateManager.register(state);

      expect(stateManager.hasState('trigger-1')).toBe(true);
      const retrievedState = stateManager.getState('trigger-1');
      expect(retrievedState).toEqual(state);
    });

    it('应该拒绝空的触发器 ID', () => {
      const state: TriggerRuntimeState = {
        triggerId: '',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      };

      expect(() => stateManager.register(state)).toThrow('触发器 ID 不能为空');
    });

    it('应该拒绝空的线程 ID', () => {
      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: '',
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      };

      expect(() => stateManager.register(state)).toThrow('线程 ID 不能为空');
    });

    it('应该拒绝线程 ID 不匹配的状态', () => {
      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: 'thread-2',
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      };

      expect(() => stateManager.register(state)).toThrow('线程 ID 不匹配');
    });

    it('应该拒绝重复注册', () => {
      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      };

      stateManager.register(state);

      expect(() => stateManager.register(state)).toThrow('触发器状态 trigger-1 已存在');
    });
  });

  describe('getState', () => {
    it('应该返回已注册的状态', () => {
      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      };

      stateManager.register(state);

      const retrievedState = stateManager.getState('trigger-1');
      expect(retrievedState).toEqual(state);
    });

    it('应该返回 undefined 对于不存在的状态', () => {
      const retrievedState = stateManager.getState('non-existent');
      expect(retrievedState).toBeUndefined();
    });
  });

  describe('updateStatus', () => {
    it('应该成功更新状态', async () => {
      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      };

      stateManager.register(state);
      
      // 添加小延迟确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 1));
      
      stateManager.updateStatus('trigger-1', TriggerStatus.DISABLED);

      const updatedState = stateManager.getState('trigger-1');
      expect(updatedState?.status).toBe(TriggerStatus.DISABLED);
      expect(updatedState?.updatedAt).toBeGreaterThan(state.updatedAt);
    });

    it('应该拒绝更新不存在的状态', () => {
      expect(() => stateManager.updateStatus('non-existent', TriggerStatus.DISABLED))
        .toThrow('触发器状态 non-existent 不存在');
    });
  });

  describe('incrementTriggerCount', () => {
    it('应该成功增加触发次数', async () => {
      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      };

      stateManager.register(state);
      
      // 添加小延迟确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 1));
      
      stateManager.incrementTriggerCount('trigger-1');

      const updatedState = stateManager.getState('trigger-1');
      expect(updatedState?.triggerCount).toBe(1);
      expect(updatedState?.updatedAt).toBeGreaterThan(state.updatedAt);
    });

    it('应该多次增加触发次数', () => {
      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      };

      stateManager.register(state);
      stateManager.incrementTriggerCount('trigger-1');
      stateManager.incrementTriggerCount('trigger-1');
      stateManager.incrementTriggerCount('trigger-1');

      const updatedState = stateManager.getState('trigger-1');
      expect(updatedState?.triggerCount).toBe(3);
    });

    it('应该拒绝增加不存在的状态的触发次数', () => {
      expect(() => stateManager.incrementTriggerCount('non-existent'))
        .toThrow('触发器状态 non-existent 不存在');
    });
  });

  describe('createSnapshot', () => {
    it('应该创建状态快照', () => {
      const state1: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      };

      const state2: TriggerRuntimeState = {
        triggerId: 'trigger-2',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.DISABLED,
        triggerCount: 5,
        updatedAt: Date.now()
      };

      stateManager.register(state1);
      stateManager.register(state2);

      const snapshot = stateManager.createSnapshot();

      expect(snapshot.size).toBe(2);
      expect(snapshot.get('trigger-1')).toEqual(state1);
      expect(snapshot.get('trigger-2')).toEqual(state2);
    });

    it('应该创建深拷贝快照', () => {
      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      };

      stateManager.register(state);
      const snapshot = stateManager.createSnapshot();

      // 修改原始状态
      stateManager.updateStatus('trigger-1', TriggerStatus.DISABLED);

      // 快照应该不受影响
      const snapshotState = snapshot.get('trigger-1');
      expect(snapshotState?.status).toBe(TriggerStatus.ENABLED);
    });
  });

  describe('restoreFromSnapshot', () => {
    it('应该从快照恢复状态', () => {
      const snapshot = new Map<ID, TriggerRuntimeState>();
      snapshot.set('trigger-1', {
        triggerId: 'trigger-1',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      });
      snapshot.set('trigger-2', {
        triggerId: 'trigger-2',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.DISABLED,
        triggerCount: 5,
        updatedAt: Date.now()
      });

      stateManager.restoreFromSnapshot(snapshot);

      expect(stateManager.size()).toBe(2);
      expect(stateManager.getState('trigger-1')?.status).toBe(TriggerStatus.ENABLED);
      expect(stateManager.getState('trigger-2')?.triggerCount).toBe(5);
    });

    it('应该清空现有状态', () => {
      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      };

      stateManager.register(state);

      const emptySnapshot = new Map<ID, TriggerRuntimeState>();
      stateManager.restoreFromSnapshot(emptySnapshot);

      expect(stateManager.size()).toBe(0);
    });

    it('应该拒绝线程 ID 不匹配的快照', () => {
      const snapshot = new Map<ID, TriggerRuntimeState>();
      snapshot.set('trigger-1', {
        triggerId: 'trigger-1',
        threadId: 'thread-2',
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      });

      expect(() => stateManager.restoreFromSnapshot(snapshot)).toThrow('线程 ID 不匹配');
    });
  });

  describe('getAllStates', () => {
    it('应该返回所有状态', () => {
      const state1: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      };

      const state2: TriggerRuntimeState = {
        triggerId: 'trigger-2',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.DISABLED,
        triggerCount: 5,
        updatedAt: Date.now()
      };

      stateManager.register(state1);
      stateManager.register(state2);

      const allStates = stateManager.getAllStates();

      expect(allStates.size).toBe(2);
      expect(allStates.get('trigger-1')).toEqual(state1);
      expect(allStates.get('trigger-2')).toEqual(state2);
    });

    it('应该返回只读副本', () => {
      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      };

      stateManager.register(state);
      const allStates = stateManager.getAllStates();

      // 修改返回的状态
      const retrievedState = allStates.get('trigger-1');
      if (retrievedState) {
        retrievedState.status = TriggerStatus.DISABLED;
      }

      // 原始状态应该不受影响
      const originalState = stateManager.getState('trigger-1');
      expect(originalState?.status).toBe(TriggerStatus.ENABLED);
    });
  });

  describe('hasState', () => {
    it('应该返回 true 对于存在的状态', () => {
      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      };

      stateManager.register(state);

      expect(stateManager.hasState('trigger-1')).toBe(true);
    });

    it('应该返回 false 对于不存在的状态', () => {
      expect(stateManager.hasState('non-existent')).toBe(false);
    });
  });

  describe('deleteState', () => {
    it('应该成功删除状态', () => {
      const state: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      };

      stateManager.register(state);
      stateManager.deleteState('trigger-1');

      expect(stateManager.hasState('trigger-1')).toBe(false);
    });

    it('应该拒绝删除不存在的状态', () => {
      expect(() => stateManager.deleteState('non-existent'))
        .toThrow('触发器状态 non-existent 不存在');
    });
  });

  describe('clear', () => {
    it('应该清空所有状态', () => {
      const state1: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      };

      const state2: TriggerRuntimeState = {
        triggerId: 'trigger-2',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.DISABLED,
        triggerCount: 5,
        updatedAt: Date.now()
      };

      stateManager.register(state1);
      stateManager.register(state2);

      stateManager.clear();

      expect(stateManager.size()).toBe(0);
    });
  });

  describe('getThreadId', () => {
    it('应该返回线程 ID', () => {
      expect(stateManager.getThreadId()).toBe(threadId);
    });
  });

  describe('size', () => {
    it('应该返回状态数量', () => {
      expect(stateManager.size()).toBe(0);

      const state1: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      };

      stateManager.register(state1);
      expect(stateManager.size()).toBe(1);

      const state2: TriggerRuntimeState = {
        triggerId: 'trigger-2',
        threadId: threadId,
        workflowId: workflowId,
        status: TriggerStatus.DISABLED,
        triggerCount: 5,
        updatedAt: Date.now()
      };

      stateManager.register(state2);
      expect(stateManager.size()).toBe(2);
    });
  });

  describe('线程隔离', () => {
    it('应该保证线程隔离', () => {
      const stateManager1 = new TriggerStateManager('thread-1');
      const stateManager2 = new TriggerStateManager('thread-2');
      stateManager1.setWorkflowId(workflowId);
      stateManager2.setWorkflowId(workflowId);

      const state1: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: 'thread-1',
        workflowId: workflowId,
        status: TriggerStatus.ENABLED,
        triggerCount: 0,
        updatedAt: Date.now()
      };

      const state2: TriggerRuntimeState = {
        triggerId: 'trigger-1',
        threadId: 'thread-2',
        workflowId: workflowId,
        status: TriggerStatus.DISABLED,
        triggerCount: 5,
        updatedAt: Date.now()
      };

      stateManager1.register(state1);
      stateManager2.register(state2);

      // 两个线程的状态应该独立
      expect(stateManager1.getState('trigger-1')?.status).toBe(TriggerStatus.ENABLED);
      expect(stateManager2.getState('trigger-1')?.status).toBe(TriggerStatus.DISABLED);

      // 修改一个线程的状态不应该影响另一个线程
      stateManager1.updateStatus('trigger-1', TriggerStatus.DISABLED);

      expect(stateManager1.getState('trigger-1')?.status).toBe(TriggerStatus.DISABLED);
      expect(stateManager2.getState('trigger-1')?.status).toBe(TriggerStatus.DISABLED);
    });
  });
});