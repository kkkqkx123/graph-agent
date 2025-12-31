import { StateManager } from '../state-manager';
import { ID } from '../../../common/value-objects';

describe('StateManager', () => {
  let stateManager: StateManager;
  let threadId: string;
  let workflowId: ID;

  beforeEach(() => {
    stateManager = new StateManager();
    threadId = 'thread-1';
    workflowId = ID.generate();
  });

  describe('initialize', () => {
    it('应该成功初始化状态', () => {
      stateManager.initialize(threadId, workflowId, { key: 'value' });

      const state = stateManager.getState(threadId);
      expect(state).not.toBeNull();
      expect(state?.workflowId.equals(workflowId)).toBe(true);
      expect(state?.getData('key')).toBe('value');
    });

    it('应该支持空初始状态', () => {
      stateManager.initialize(threadId, workflowId);

      const state = stateManager.getState(threadId);
      expect(state).not.toBeNull();
      expect(state?.data).toEqual({});
    });

    it('应该覆盖已存在的状态', () => {
      stateManager.initialize(threadId, workflowId, { key1: 'value1' });
      stateManager.initialize(threadId, workflowId, { key2: 'value2' });

      const state = stateManager.getState(threadId);
      expect(state?.getData('key1')).toBeUndefined();
      expect(state?.getData('key2')).toBe('value2');
    });
  });

  describe('getState', () => {
    it('应该返回已初始化的状态', () => {
      stateManager.initialize(threadId, workflowId, { key: 'value' });

      const state = stateManager.getState(threadId);
      expect(state).not.toBeNull();
      expect(state?.getData('key')).toBe('value');
    });

    it('应该返回 null 如果状态不存在', () => {
      const state = stateManager.getState('non-existent-thread');
      expect(state).toBeNull();
    });
  });

  describe('updateState', () => {
    beforeEach(() => {
      stateManager.initialize(threadId, workflowId, { key1: 'value1' });
    });

    it('应该成功更新状态', () => {
      const updatedState = stateManager.updateState(threadId, { key2: 'value2' });

      expect(updatedState.getData('key1')).toBe('value1');
      expect(updatedState.getData('key2')).toBe('value2');
    });

    it('应该覆盖已存在的键', () => {
      const updatedState = stateManager.updateState(threadId, { key1: 'new-value' });

      expect(updatedState.getData('key1')).toBe('new-value');
    });

    it('应该抛出错误如果状态不存在', () => {
      expect(() => {
        stateManager.updateState('non-existent-thread', { key: 'value' });
      }).toThrow('线程 non-existent-thread 的状态不存在');
    });

    it('应该返回不可变的状态', () => {
      const updatedState = stateManager.updateState(threadId, { key: 'value' });

      // 修改返回的状态不应该影响内部状态
      updatedState.data.key = 'modified';

      const currentState = stateManager.getState(threadId);
      expect(currentState?.getData('key')).toBe('value');
    });
  });

  describe('setCurrentNodeId', () => {
    beforeEach(() => {
      stateManager.initialize(threadId, workflowId);
    });

    it('应该成功设置当前节点ID', () => {
      const nodeId = ID.generate();
      const updatedState = stateManager.setCurrentNodeId(threadId, nodeId);

      expect(updatedState.currentNodeId?.equals(nodeId)).toBe(true);
    });

    it('应该抛出错误如果状态不存在', () => {
      const nodeId = ID.generate();
      expect(() => {
        stateManager.setCurrentNodeId('non-existent-thread', nodeId);
      }).toThrow('线程 non-existent-thread 的状态不存在');
    });
  });

  describe('getData', () => {
    beforeEach(() => {
      stateManager.initialize(threadId, workflowId, { key1: 'value1', key2: 'value2' });
    });

    it('应该返回指定键的值', () => {
      const value = stateManager.getData(threadId, 'key1');
      expect(value).toBe('value1');
    });

    it('应该返回所有数据如果不指定键', () => {
      const data = stateManager.getData(threadId);
      expect(data).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('应该返回 undefined 如果键不存在', () => {
      const value = stateManager.getData(threadId, 'non-existent-key');
      expect(value).toBeUndefined();
    });

    it('应该抛出错误如果状态不存在', () => {
      expect(() => {
        stateManager.getData('non-existent-thread');
      }).toThrow('线程 non-existent-thread 的状态不存在');
    });
  });

  describe('clearState', () => {
    it('应该成功清除状态', () => {
      stateManager.initialize(threadId, workflowId);
      expect(stateManager.hasState(threadId)).toBe(true);

      stateManager.clearState(threadId);
      expect(stateManager.hasState(threadId)).toBe(false);
    });

    it('应该不抛出错误如果状态不存在', () => {
      expect(() => {
        stateManager.clearState('non-existent-thread');
      }).not.toThrow();
    });
  });

  describe('clearAllStates', () => {
    it('应该清除所有状态', () => {
      stateManager.initialize('thread-1', workflowId);
      stateManager.initialize('thread-2', workflowId);
      stateManager.initialize('thread-3', workflowId);

      expect(stateManager.getStateCount()).toBe(3);

      stateManager.clearAllStates();
      expect(stateManager.getStateCount()).toBe(0);
    });
  });

  describe('hasState', () => {
    it('应该返回 true 如果状态存在', () => {
      stateManager.initialize(threadId, workflowId);
      expect(stateManager.hasState(threadId)).toBe(true);
    });

    it('应该返回 false 如果状态不存在', () => {
      expect(stateManager.hasState('non-existent-thread')).toBe(false);
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

    it('应该返回空数组如果没有状态', () => {
      const threadIds = stateManager.getAllThreadIds();
      expect(threadIds).toEqual([]);
    });
  });

  describe('getStateCount', () => {
    it('应该返回正确的状态数量', () => {
      stateManager.initialize('thread-1', workflowId);
      stateManager.initialize('thread-2', workflowId);

      expect(stateManager.getStateCount()).toBe(2);
    });

    it('应该返回 0 如果没有状态', () => {
      expect(stateManager.getStateCount()).toBe(0);
    });
  });

  describe('状态不可变性', () => {
    it('应该保持状态的不可变性', () => {
      stateManager.initialize(threadId, workflowId, { key: 'value' });

      const state1 = stateManager.getState(threadId);
      const state2 = stateManager.getState(threadId);

      // 两个状态对象应该是不同的引用
      expect(state1).not.toBe(state2);

      // 但内容应该相同
      expect(state1?.toProps()).toEqual(state2?.toProps());
    });

    it('更新状态应该创建新的状态对象', () => {
      stateManager.initialize(threadId, workflowId, { key: 'value' });

      const state1 = stateManager.getState(threadId);
      stateManager.updateState(threadId, { key: 'new-value' });
      const state2 = stateManager.getState(threadId);

      // 两个状态对象应该是不同的引用
      expect(state1).not.toBe(state2);

      // 内容应该不同
      expect(state1?.getData('key')).toBe('value');
      expect(state2?.getData('key')).toBe('new-value');
    });
  });
});