/**
 * VariableCoordinator 单元测试
 */

import { VariableCoordinator } from '../variable-coordinator';
import { VariableStateManager } from '../../managers/variable-state-manager';
import { ThreadContext } from '../../context/thread-context';
import { EventManager } from '../../../services/event-manager';
import { EventType } from '@modular-agent/types/events';
import { ValidationError } from '@modular-agent/types/errors';
import { VariableAccessor } from '@modular-agent/common-utils/variable-accessor';
import type { VariableScope } from '@modular-agent/types/common';

// Mock 依赖
jest.mock('../../managers/variable-state-manager');
jest.mock('../../context/thread-context');
jest.mock('../../../services/event-manager');
jest.mock('../../utils/variable-accessor');

describe('VariableCoordinator', () => {
  let coordinator: VariableCoordinator;
  let mockStateManager: jest.Mocked<VariableStateManager>;
  let mockEventManager: jest.Mocked<EventManager>;
  let mockThreadContext: jest.Mocked<ThreadContext>;

  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks();

    // 创建 mock 实例
    mockStateManager = {
      initializeFromWorkflow: jest.fn(),
      getVariableScopes: jest.fn().mockReturnValue({
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      }),
      getVariableDefinition: jest.fn(),
      setVariableValue: jest.fn(),
      getAllVariables: jest.fn().mockReturnValue({}),
      getVariablesByScope: jest.fn().mockReturnValue({}),
      enterSubgraphScope: jest.fn(),
      exitSubgraphScope: jest.fn(),
      enterLoopScope: jest.fn(),
      exitLoopScope: jest.fn(),
      clear: jest.fn(),
      copyFrom: jest.fn()
    } as any;

    mockEventManager = {
      emit: jest.fn()
    } as any;

    mockThreadContext = {
      getThreadId: jest.fn().mockReturnValue('thread-1'),
      getWorkflowId: jest.fn().mockReturnValue('workflow-1')
    } as any;

    // 创建协调器实例
    coordinator = new VariableCoordinator(
      mockStateManager,
      mockEventManager,
      'thread-1',
      'workflow-1'
    );
  });

  describe('构造函数', () => {
    it('应该正确初始化协调器', () => {
      expect(coordinator).toBeInstanceOf(VariableCoordinator);
    });

    it('应该在没有提供可选依赖时正常工作', () => {
      const minimalCoordinator = new VariableCoordinator(mockStateManager);
      expect(minimalCoordinator).toBeInstanceOf(VariableCoordinator);
    });
  });

  describe('initializeFromWorkflow', () => {
    it('应该从工作流定义初始化变量', () => {
      const mockWorkflowVariables = [
        { name: 'var1', type: 'string', value: 'default1', scope: 'thread' as VariableScope, readonly: false },
        { name: 'var2', type: 'number', value: 42, scope: 'global' as VariableScope, readonly: false }
      ];

      // 执行测试
      coordinator.initializeFromWorkflow({} as any, mockWorkflowVariables);

      // 验证状态管理器调用
      expect(mockStateManager.initializeFromWorkflow).toHaveBeenCalledWith(mockWorkflowVariables);
    });
  });

  describe('getVariable', () => {
    it('应该按作用域优先级查找变量', () => {
      // Mock 作用域数据
      mockStateManager.getVariableScopes.mockReturnValue({
        global: { globalVar: 'global-value' },
        thread: { threadVar: 'thread-value' },
        subgraph: [{ subgraphVar: 'subgraph-value' }],
        loop: [{ loopVar: 'loop-value' }]
      });

      // 测试循环作用域（最高优先级）
      const loopResult = coordinator.getVariable(mockThreadContext, 'loopVar');
      expect(loopResult).toBe('loop-value');

      // 测试子图作用域
      const subgraphResult = coordinator.getVariable(mockThreadContext, 'subgraphVar');
      expect(subgraphResult).toBe('subgraph-value');

      // 测试线程作用域
      const threadResult = coordinator.getVariable(mockThreadContext, 'threadVar');
      expect(threadResult).toBe('thread-value');

      // 测试全局作用域（最低优先级）
      const globalResult = coordinator.getVariable(mockThreadContext, 'globalVar');
      expect(globalResult).toBe('global-value');
    });

    it('应该按需初始化变量', () => {
      // Mock 变量定义
      mockStateManager.getVariableDefinition.mockReturnValue({
        name: 'newVar',
        type: 'string',
        value: 'default-value',
        scope: 'thread' as VariableScope,
        readonly: false
      });

      // Mock 作用域 - 变量不存在
      mockStateManager.getVariableScopes.mockReturnValue({
        global: {},
        thread: {}, // 变量不存在
        subgraph: [],
        loop: []
      });

      // 执行测试
      const result = coordinator.getVariable(mockThreadContext, 'newVar');

      // 验证结果
      expect(result).toBe('default-value');

      // 验证变量初始化
      expect(mockStateManager.setVariableValue).toHaveBeenCalledWith(
        'newVar',
        'default-value',
        'thread'
      );
    });

    it('应该返回 undefined 当变量不存在', () => {
      // Mock 作用域 - 所有作用域都没有该变量
      mockStateManager.getVariableScopes.mockReturnValue({
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      });

      // Mock 变量定义不存在
      mockStateManager.getVariableDefinition.mockReturnValue(undefined);

      // 执行测试
      const result = coordinator.getVariable(mockThreadContext, 'nonExistentVar');

      // 验证结果
      expect(result).toBeUndefined();
    });

    it('应该正确处理嵌套作用域', () => {
      // Mock 多层嵌套作用域
      mockStateManager.getVariableScopes.mockReturnValue({
        global: { var: 'global' },
        thread: { var: 'thread' },
        subgraph: [
          { var: 'subgraph1' },
          { var: 'subgraph2' } // 最内层子图
        ],
        loop: [
          { var: 'loop1' },
          { var: 'loop2' } // 最内层循环
        ]
      });

      // 应该返回最内层循环的值
      const result = coordinator.getVariable(mockThreadContext, 'var');
      expect(result).toBe('loop2');
    });
  });

  describe('updateVariable', () => {
    const mockVariableDef = {
      name: 'testVar',
      type: 'string',
      value: 'default',
      scope: 'thread' as VariableScope,
      readonly: false
    };

    it('应该成功更新变量值', async () => {
      // Mock 变量定义存在
      mockStateManager.getVariableDefinition.mockReturnValue(mockVariableDef);

      // 执行测试
      await coordinator.updateVariable(mockThreadContext, 'testVar', 'new-value');

      // 验证状态更新
      expect(mockStateManager.setVariableValue).toHaveBeenCalledWith(
        'testVar',
        'new-value',
        'thread'
      );

      // 验证事件触发
      expect(mockEventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.VARIABLE_CHANGED,
          variableName: 'testVar',
          variableValue: 'new-value',
          variableScope: 'thread'
        })
      );
    });

    it('应该验证变量是否存在', async () => {
      // Mock 变量定义不存在
      mockStateManager.getVariableDefinition.mockReturnValue(undefined);

      // 执行测试并验证错误
      await expect(
        coordinator.updateVariable(mockThreadContext, 'nonExistentVar', 'value')
      ).rejects.toThrow(ValidationError);

      await expect(
        coordinator.updateVariable(mockThreadContext, 'nonExistentVar', 'value')
      ).rejects.toThrow("Variable 'nonExistentVar' is not defined in workflow");
    });

    it('应该验证只读变量', async () => {
      // Mock 只读变量
      mockStateManager.getVariableDefinition.mockReturnValue({
        ...mockVariableDef,
        readonly: true
      });

      // 执行测试并验证错误
      await expect(
        coordinator.updateVariable(mockThreadContext, 'testVar', 'new-value')
      ).rejects.toThrow(ValidationError);

      await expect(
        coordinator.updateVariable(mockThreadContext, 'testVar', 'new-value')
      ).rejects.toThrow("Variable 'testVar' is readonly and cannot be modified");
    });

    it('应该验证变量类型', async () => {
      // Mock 数字类型变量
      mockStateManager.getVariableDefinition.mockReturnValue({
        ...mockVariableDef,
        type: 'number'
      });

      // 执行测试并验证错误 - 字符串值分配给数字变量
      await expect(
        coordinator.updateVariable(mockThreadContext, 'testVar', 'not-a-number')
      ).rejects.toThrow(ValidationError);

      await expect(
        coordinator.updateVariable(mockThreadContext, 'testVar', 'not-a-number')
      ).rejects.toThrow("Type mismatch for variable 'testVar'");
    });

    it('应该支持显式指定作用域', async () => {
      // Mock 变量定义
      mockStateManager.getVariableDefinition.mockReturnValue(mockVariableDef);

      // 执行测试 - 显式指定作用域
      await coordinator.updateVariable(mockThreadContext, 'testVar', 'new-value', 'global');

      // 验证使用显式作用域
      expect(mockStateManager.setVariableValue).toHaveBeenCalledWith(
        'testVar',
        'new-value',
        'global'
      );
    });

    it('应该在没有事件管理器时正常工作', async () => {
      // 创建没有事件管理器的协调器
      const coordinatorWithoutEvents = new VariableCoordinator(mockStateManager);

      // Mock 变量定义
      mockStateManager.getVariableDefinition.mockReturnValue(mockVariableDef);

      // 执行测试
      await coordinatorWithoutEvents.updateVariable(mockThreadContext, 'testVar', 'new-value');

      // 验证状态更新
      expect(mockStateManager.setVariableValue).toHaveBeenCalledWith(
        'testVar',
        'new-value',
        'thread'
      );

      // 验证没有触发事件
      expect(mockEventManager.emit).not.toHaveBeenCalled();
    });

    it('应该静默处理事件触发错误', async () => {
      // Mock 变量定义
      mockStateManager.getVariableDefinition.mockReturnValue(mockVariableDef);

      // Mock 事件管理器抛出错误
      mockEventManager.emit.mockRejectedValue(new Error('Event error'));

      // 执行测试 - 不应该抛出错误
      await expect(
        coordinator.updateVariable(mockThreadContext, 'testVar', 'new-value')
      ).resolves.not.toThrow();

      // 验证状态仍然更新
      expect(mockStateManager.setVariableValue).toHaveBeenCalled();
    });
  });

  describe('hasVariable', () => {
    it('应该正确检查变量是否存在', () => {
      // Mock getVariable 返回有效值
      jest.spyOn(coordinator, 'getVariable').mockReturnValue('some-value');

      // 执行测试
      const result = coordinator.hasVariable(mockThreadContext, 'existingVar');

      // 验证结果
      expect(result).toBe(true);
    });

    it('应该正确检查变量不存在', () => {
      // Mock getVariable 返回 undefined
      jest.spyOn(coordinator, 'getVariable').mockReturnValue(undefined);

      // 执行测试
      const result = coordinator.hasVariable(mockThreadContext, 'nonExistentVar');

      // 验证结果
      expect(result).toBe(false);
    });
  });

  describe('getAllVariables', () => {
    it('应该获取所有变量', () => {
      const mockVariables = {
        var1: 'value1',
        var2: 'value2',
        var3: 'value3'
      };

      // Mock 状态管理器
      mockStateManager.getAllVariables.mockReturnValue(mockVariables);

      // 执行测试
      const result = coordinator.getAllVariables(mockThreadContext);

      // 验证结果
      expect(result).toEqual(mockVariables);
    });
  });

  describe('getVariablesByScope', () => {
    it('应该按作用域获取变量', () => {
      const mockThreadVariables = {
        threadVar1: 'value1',
        threadVar2: 'value2'
      };

      // Mock 状态管理器
      mockStateManager.getVariablesByScope.mockReturnValue(mockThreadVariables);

      // 执行测试
      const result = coordinator.getVariablesByScope(mockThreadContext, 'thread');

      // 验证结果
      expect(result).toEqual(mockThreadVariables);
      expect(mockStateManager.getVariablesByScope).toHaveBeenCalledWith('thread');
    });
  });

  describe('作用域管理', () => {
    it('应该进入子图作用域', () => {
      // 执行测试
      coordinator.enterSubgraphScope(mockThreadContext);

      // 验证状态管理器调用
      expect(mockStateManager.enterSubgraphScope).toHaveBeenCalled();
    });

    it('应该退出子图作用域', () => {
      // 执行测试
      coordinator.exitSubgraphScope(mockThreadContext);

      // 验证状态管理器调用
      expect(mockStateManager.exitSubgraphScope).toHaveBeenCalled();
    });

    it('应该进入循环作用域', () => {
      // 执行测试
      coordinator.enterLoopScope(mockThreadContext);

      // 验证状态管理器调用
      expect(mockStateManager.enterLoopScope).toHaveBeenCalled();
    });

    it('应该退出循环作用域', () => {
      // 执行测试
      coordinator.exitLoopScope(mockThreadContext);

      // 验证状态管理器调用
      expect(mockStateManager.exitLoopScope).toHaveBeenCalled();
    });
  });

  describe('validateType', () => {
    it('应该正确验证各种类型', () => {
      const testCases = [
        { value: 42, type: 'number', expected: true },
        { value: NaN, type: 'number', expected: false },
        { value: 'hello', type: 'string', expected: true },
        { value: true, type: 'boolean', expected: true },
        { value: [1, 2, 3], type: 'array', expected: true },
        { value: { key: 'value' }, type: 'object', expected: true },
        { value: null, type: 'object', expected: false },
        { value: [1, 2, 3], type: 'object', expected: false },
        { value: 'hello', type: 'number', expected: false },
        { value: 42, type: 'unknown', expected: false }
      ];

      for (const { value, type, expected } of testCases) {
        const result = (coordinator as any).validateType(value, type);
        expect(result).toBe(expected);
      }
    });
  });

  describe('copyVariables', () => {
    it('应该复制变量', () => {
      const sourceStateManager = {
        copyFrom: jest.fn()
      } as any;
      const targetStateManager = {
        copyFrom: jest.fn()
      } as any;

      // 执行测试
      coordinator.copyVariables(sourceStateManager, targetStateManager);

      // 验证状态管理器调用
      expect(targetStateManager.copyFrom).toHaveBeenCalledWith(sourceStateManager);
    });
  });

  describe('clearVariables', () => {
    it('应该清空变量', () => {
      // 执行测试
      coordinator.clearVariables();

      // 验证状态管理器调用
      expect(mockStateManager.clear).toHaveBeenCalled();
    });
  });

  describe('createAccessor', () => {
    it('应该创建变量访问器', () => {
      // Mock VariableAccessor
      const mockAccessor = {} as VariableAccessor;
      (VariableAccessor as jest.MockedClass<typeof VariableAccessor>).mockImplementation(() => mockAccessor);

      // 执行测试
      const result = coordinator.createAccessor(mockThreadContext);

      // 验证结果
      expect(result).toBe(mockAccessor);
      expect(VariableAccessor).toHaveBeenCalledWith(mockThreadContext);
    });
  });

  describe('getVariableByPath', () => {
    it('应该通过路径获取变量值', () => {
      // Mock VariableAccessor
      const mockAccessor = {
        get: jest.fn().mockReturnValue('path-value')
      } as any;
      (VariableAccessor as jest.MockedClass<typeof VariableAccessor>).mockImplementation(() => mockAccessor);

      // 执行测试
      const result = coordinator.getVariableByPath(mockThreadContext, 'user.profile.name');

      // 验证结果
      expect(result).toBe('path-value');
      expect(mockAccessor.get).toHaveBeenCalledWith('user.profile.name');
    });
  });

  describe('getStateManager', () => {
    it('应该返回状态管理器', () => {
      // 执行测试
      const result = coordinator.getStateManager();

      // 验证结果
      expect(result).toBe(mockStateManager);
    });
  });
});