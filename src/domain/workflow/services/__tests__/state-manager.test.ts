import { StateManager } from '../state-manager';
import { ID } from '../../../common/value-objects';

describe('StateManager', () => {
  let stateManager: StateManager;
  let threadId: string;
  let workflowId: ID;

  beforeEach(() => {
    stateManager = new StateManager(100);
    threadId = 'thread-1';
    workflowId = ID.generate();
  });

  afterEach(() => {
    stateManager.clearAllStates();
  });

  describe('initialize', () => {
    it('应该初始化状态', () => {
      stateManager.initialize(threadId, workflowId, { key: 'value' });

      const state = stateManager.getState(threadId);
      expect(state).not.toBeNull();
      expect(state?.workflowId.value).toBe(workflowId.value);
      expect(state?.getData('key')).toBe('value');
    });

    it('应该支持空初始状态', () => {
      stateManager.initialize(threadId, workflowId);

      const state = stateManager.getState(threadId);
      expect(state).not.toBeNull();
      expect(state?.data).toEqual({});
    });
  });

  describe('getState', () => {
    it('应该获取已初始化的状态', () => {
      stateManager.initialize(threadId, workflowId);

      const state = stateManager.getState(threadId);
      expect(state).not.toBeNull();
    });

    it('应该返回 null 对于不存在的状态', () => {
      const state = stateManager.getState('non-existent');
      expect(state).toBeNull();
    });
  });

  describe('updateState', () => {
    it('应该更新状态数据', () => {
      stateManager.initialize(threadId, workflowId, { key1: 'value1' });

      const updatedState = stateManager.updateState(threadId, { key2: 'value2' });

      expect(updatedState.getData('key1')).toBe('value1');
      expect(updatedState.getData('key2')).toBe('value2');
    });

    it('应该覆盖已存在的数据', () => {
      stateManager.initialize(threadId, workflowId, { key: 'old' });

      const updatedState = stateManager.updateState(threadId, { key: 'new' });

      expect(updatedState.getData('key')).toBe('new');
    });

    it('应该添加到执行历史', () => {
      stateManager.initialize(threadId, workflowId);
      const nodeId = ID.generate();

      const updatedState = stateManager.updateState(
        threadId,
        { result: 'success' },
        {
          addToHistory: true,
          historyNodeId: nodeId,
          historyResult: 'success',
          historyStatus: 'success'
        }
      );

      const history = updatedState.history;
      expect(history).toHaveLength(1);
      expect(history[0].nodeId.value).toBe(nodeId.value);
      expect(history[0].result).toBe('success');
      expect(history[0].status).toBe('success');
    });

    it('应该更新当前节点ID', () => {
      stateManager.initialize(threadId, workflowId);
      const nodeId = ID.generate();

      const updatedState = stateManager.updateState(
        threadId,
        {},
        {
          addToHistory: true,
          historyNodeId: nodeId
        }
      );

      expect(updatedState.currentNodeId?.value).toBe(nodeId.value);
    });

    it('应该抛出错误对于不存在的状态', () => {
      expect(() => {
        stateManager.updateState('non-existent', { key: 'value' });
      }).toThrow('线程 non-existent 的状态不存在');
    });
  });

  describe('setCurrentNodeId', () => {
    it('应该设置当前节点ID', () => {
      stateManager.initialize(threadId, workflowId);
      const nodeId = ID.generate();

      const updatedState = stateManager.setCurrentNodeId(threadId, nodeId);

      expect(updatedState.currentNodeId?.value).toBe(nodeId.value);
    });

    it('应该抛出错误对于不存在的状态', () => {
      const nodeId = ID.generate();

      expect(() => {
        stateManager.setCurrentNodeId('non-existent', nodeId);
      }).toThrow('线程 non-existent 的状态不存在');
    });
  });

  describe('getData', () => {
    it('应该获取所有数据', () => {
      stateManager.initialize(threadId, workflowId, { key1: 'value1', key2: 'value2' });

      const data = stateManager.getData(threadId);

      expect(data).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('应该获取指定键的数据', () => {
      stateManager.initialize(threadId, workflowId, { key1: 'value1', key2: 'value2' });

      const value = stateManager.getData(threadId, 'key1');

      expect(value).toBe('value1');
    });

    it('应该返回 undefined 对于不存在的键', () => {
      stateManager.initialize(threadId, workflowId);

      const value = stateManager.getData(threadId, 'non-existent');

      expect(value).toBeUndefined();
    });
  });

  describe('getHistory', () => {
    it('应该获取执行历史', () => {
      stateManager.initialize(threadId, workflowId);
      const nodeId = ID.generate();

      stateManager.updateState(
        threadId,
        {},
        {
          addToHistory: true,
          historyNodeId: nodeId,
          historyStatus: 'success'
        }
      );

      const history = stateManager.getHistory(threadId);

      expect(history).toHaveLength(1);
      expect(history[0].nodeId.value).toBe(nodeId.value);
    });

    it('应该返回空数组对于没有历史的状态', () => {
      stateManager.initialize(threadId, workflowId);

      const history = stateManager.getHistory(threadId);

      expect(history).toEqual([]);
    });
  });

  describe('clearState', () => {
    it('应该清除指定状态', () => {
      stateManager.initialize(threadId, workflowId);

      stateManager.clearState(threadId);

      expect(stateManager.hasState(threadId)).toBe(false);
    });
  });

  describe('clearAllStates', () => {
    it('应该清除所有状态', () => {
      stateManager.initialize('thread-1', workflowId);
      stateManager.initialize('thread-2', workflowId);

      stateManager.clearAllStates();

      expect(stateManager.getStateCount()).toBe(0);
    });
  });

  describe('getSnapshot', () => {
    it('应该获取状态快照', () => {
      stateManager.initialize(threadId, workflowId, { key: 'value' });

      const snapshot = stateManager.getSnapshot(threadId);

      expect(typeof snapshot).toBe('string');
      const parsed = JSON.parse(snapshot);
      expect(parsed.data.key).toBe('value');
    });

    it('应该抛出错误对于不存在的状态', () => {
      expect(() => {
        stateManager.getSnapshot('non-existent');
      }).toThrow('线程 non-existent 的状态不存在');
    });
  });

  describe('restoreFromSnapshot', () => {
    it('应该从快照恢复状态', () => {
      stateManager.initialize(threadId, workflowId, { key: 'value' });
      const snapshot = stateManager.getSnapshot(threadId);

      stateManager.clearState(threadId);
      expect(stateManager.hasState(threadId)).toBe(false);

      stateManager.restoreFromSnapshot(threadId, snapshot);

      expect(stateManager.hasState(threadId)).toBe(true);
      const state = stateManager.getState(threadId);
      expect(state?.getData('key')).toBe('value');
    });
  });

  describe('hasState', () => {
    it('应该返回 true 对于存在的状态', () => {
      stateManager.initialize(threadId, workflowId);

      expect(stateManager.hasState(threadId)).toBe(true);
    });

    it('应该返回 false 对于不存在的状态', () => {
      expect(stateManager.hasState('non-existent')).toBe(false);
    });
  });

  describe('getAllThreadIds', () => {
    it('应该返回所有线程ID', () => {
      stateManager.initialize('thread-1', workflowId);
      stateManager.initialize('thread-2', workflowId);
      stateManager.initialize('thread-3', workflowId);

      const threadIds = stateManager.getAllThreadIds();

      expect(threadIds).toHaveLength(3);
      expect(threadIds).toContain('thread-1');
      expect(threadIds).toContain('thread-2');
      expect(threadIds).toContain('thread-3');
    });

    it('应该返回空数组对于没有状态的情况', () => {
      const threadIds = stateManager.getAllThreadIds();

      expect(threadIds).toEqual([]);
    });
  });

  describe('getStateCount', () => {
    it('应该返回状态数量', () => {
      stateManager.initialize('thread-1', workflowId);
      stateManager.initialize('thread-2', workflowId);

      expect(stateManager.getStateCount()).toBe(2);
    });

    it('应该返回 0 对于没有状态的情况', () => {
      expect(stateManager.getStateCount()).toBe(0);
    });
  });

  describe('缓存管理', () => {
    it('应该在达到最大缓存大小时删除最旧的状态', () => {
      const smallStateManager = new StateManager(3);

      smallStateManager.initialize('thread-1', workflowId);
      smallStateManager.initialize('thread-2', workflowId);
      smallStateManager.initialize('thread-3', workflowId);

      expect(smallStateManager.getStateCount()).toBe(3);

      smallStateManager.initialize('thread-4', workflowId);

      expect(smallStateManager.getStateCount()).toBe(3);
      expect(smallStateManager.hasState('thread-1')).toBe(false);
      expect(smallStateManager.hasState('thread-4')).toBe(true);
    });
  });
});