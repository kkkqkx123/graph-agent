import { TaskGroup } from '../entities/task-group';
import { Echelon } from '../value-objects/echelon';

describe('任务组实体测试', () => {
  describe('TaskGroup 构造函数', () => {
    test('应该成功创建任务组', () => {
      const taskGroup = new TaskGroup('test_group', '测试任务组');
      
      expect(taskGroup.name).toBe('test_group');
      expect(taskGroup.displayName).toBe('测试任务组');
      expect(taskGroup.echelons).toHaveLength(0);
      expect(taskGroup.isActive).toBe(true);
    });

    test('应该添加层级', () => {
      const taskGroup = new TaskGroup('test_group', '测试任务组');
      const echelon = new Echelon('echelon1', 1, ['openai:gpt-4o', 'anthropic:claude-3-5-sonnet']);
      
      taskGroup.addEchelon(echelon);
      
      expect(taskGroup.echelons).toHaveLength(1);
      expect(taskGroup.echelons[0]).toBe(echelon);
    });

    test('应该移除层级', () => {
      const taskGroup = new TaskGroup('test_group', '测试任务组');
      const echelon = new Echelon('echelon1', 1, ['openai:gpt-4o']);
      
      taskGroup.addEchelon(echelon);
      expect(taskGroup.echelons).toHaveLength(1);
      
      taskGroup.removeEchelon('echelon1');
      expect(taskGroup.echelons).toHaveLength(0);
    });

    test('应该激活和停用任务组', () => {
      const taskGroup = new TaskGroup('test_group', '测试任务组');
      
      expect(taskGroup.isActive).toBe(true);
      
      taskGroup.deactivate();
      expect(taskGroup.isActive).toBe(false);
      
      taskGroup.activate();
      expect(taskGroup.isActive).toBe(true);
    });
  });

  describe('层级管理测试', () => {
    test('应该按优先级排序层级', () => {
      const taskGroup = new TaskGroup('test_group', '测试任务组');
      const echelon1 = new Echelon('echelon1', 3, ['openai:gpt-4o-mini']);
      const echelon2 = new Echelon('echelon2', 1, ['openai:gpt-4o']);
      const echelon3 = new Echelon('echelon3', 2, ['anthropic:claude-3-5-sonnet']);
      
      taskGroup.addEchelon(echelon1);
      taskGroup.addEchelon(echelon2);
      taskGroup.addEchelon(echelon3);
      
      const sortedEchelons = taskGroup.getEchelonsByPriority();
      
      expect(sortedEchelons).toHaveLength(3);
      expect(sortedEchelons[0].priority).toBe(1); // echelon2
      expect(sortedEchelons[1].priority).toBe(2); // echelon3
      expect(sortedEchelons[2].priority).toBe(3); // echelon1
    });

    test('应该获取可用模型列表', () => {
      const taskGroup = new TaskGroup('test_group', '测试任务组');
      const echelon1 = new Echelon('echelon1', 1, ['openai:gpt-4o', 'anthropic:claude-3-5-sonnet']);
      const echelon2 = new Echelon('echelon2', 2, ['openai:gpt-4o-mini', 'gemini:gemini-2.5-flash']);
      
      taskGroup.addEchelon(echelon1);
      taskGroup.addEchelon(echelon2);
      
      const availableModels = taskGroup.getAvailableModels();
      
      expect(availableModels).toHaveLength(4);
      expect(availableModels).toContain('openai:gpt-4o');
      expect(availableModels).toContain('anthropic:claude-3-5-sonnet');
      expect(availableModels).toContain('openai:gpt-4o-mini');
      expect(availableModels).toContain('gemini:gemini-2.5-flash');
    });

    test('应该根据优先级选择模型', () => {
      const taskGroup = new TaskGroup('test_group', '测试任务组');
      const echelon1 = new Echelon('echelon1', 1, ['openai:gpt-4o']);
      const echelon2 = new Echelon('echelon2', 2, ['openai:gpt-4o-mini']);
      
      taskGroup.addEchelon(echelon1);
      taskGroup.addEchelon(echelon2);
      
      // 优先选择第一层级的模型
      const model1 = taskGroup.selectModel();
      expect(model1).toBe('openai:gpt-4o');
      
      // 如果第一层级失败，应该选择第二层级的模型
      taskGroup.markEchelonFailed('echelon1');
      const model2 = taskGroup.selectModel();
      expect(model2).toBe('openai:gpt-4o-mini');
    });
  });

  describe('熔断器测试', () => {
    test('应该触发熔断器', () => {
      const taskGroup = new TaskGroup('test_group', '测试任务组');
      const echelon = new Echelon('echelon1', 1, ['openai:gpt-4o']);
      
      taskGroup.addEchelon(echelon);
      
      // 连续失败5次应该触发熔断
      for (let i = 0; i < 5; i++) {
        taskGroup.markEchelonFailed('echelon1');
      }
      
      expect(taskGroup.isCircuitBreakerOpen('echelon1')).toBe(true);
    });

    test('应该重置熔断器', () => {
      const taskGroup = new TaskGroup('test_group', '测试任务组');
      const echelon = new Echelon('echelon1', 1, ['openai:gpt-4o']);
      
      taskGroup.addEchelon(echelon);
      
      // 触发熔断
      for (let i = 0; i < 5; i++) {
        taskGroup.markEchelonFailed('echelon1');
      }
      expect(taskGroup.isCircuitBreakerOpen('echelon1')).toBe(true);
      
      // 重置熔断器
      taskGroup.resetCircuitBreaker('echelon1');
      expect(taskGroup.isCircuitBreakerOpen('echelon1')).toBe(false);
    });

    test('应该记录成功请求', () => {
      const taskGroup = new TaskGroup('test_group', '测试任务组');
      const echelon = new Echelon('echelon1', 1, ['openai:gpt-4o']);
      
      taskGroup.addEchelon(echelon);
      
      // 记录一些失败
      taskGroup.markEchelonFailed('echelon1');
      taskGroup.markEchelonFailed('echelon1');
      
      // 记录成功应该重置失败计数
      taskGroup.markEchelonSuccess('echelon1');
      
      expect(taskGroup.getEchelonFailureCount('echelon1')).toBe(0);
    });
  });

  describe('降级策略测试', () => {
    test('应该执行层级降级', () => {
      const taskGroup = new TaskGroup('test_group', '测试任务组');
      const echelon1 = new Echelon('echelon1', 1, ['openai:gpt-4o']);
      const echelon2 = new Echelon('echelon2', 2, ['openai:gpt-4o-mini']);
      
      taskGroup.addEchelon(echelon1);
      taskGroup.addEchelon(echelon2);
      
      // 第一层级失败，应该降级到第二层级
      taskGroup.markEchelonFailed('echelon1');
      const model = taskGroup.selectModel();
      
      expect(model).toBe('openai:gpt-4o-mini');
    });

    test('应该处理所有层级都失败的情况', () => {
      const taskGroup = new TaskGroup('test_group', '测试任务组');
      const echelon1 = new Echelon('echelon1', 1, ['openai:gpt-4o']);
      const echelon2 = new Echelon('echelon2', 2, ['openai:gpt-4o-mini']);
      
      taskGroup.addEchelon(echelon1);
      taskGroup.addEchelon(echelon2);
      
      // 所有层级都失败
      taskGroup.markEchelonFailed('echelon1');
      taskGroup.markEchelonFailed('echelon2');
      
      const model = taskGroup.selectModel();
      
      // 应该返回null表示所有层级都不可用
      expect(model).toBeNull();
    });
  });
});