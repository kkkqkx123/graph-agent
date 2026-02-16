/**
 * ToolContextManager 测试
 */

import { ToolContextManager, type ToolScope } from '../tool-context-manager';

describe('ToolContextManager', () => {
  let manager: ToolContextManager;
  const threadId = 'thread-1';
  const workflowId = 'workflow-1';

  beforeEach(() => {
    manager = new ToolContextManager();
  });

  afterEach(() => {
    manager.clearAll();
  });

  describe('基本功能', () => {
    it('应该成功添加工具到THREAD作用域', () => {
      const addedCount = manager.addTools(threadId, workflowId, ['tool-1', 'tool-2'], 'THREAD');

      expect(addedCount).toBe(2);

      const tools = manager.getTools(threadId, 'THREAD');
      expect(tools).toContain('tool-1');
      expect(tools).toContain('tool-2');
    });

    it('应该成功添加工具到WORKFLOW作用域', () => {
      const addedCount = manager.addTools(threadId, workflowId, ['tool-1', 'tool-2'], 'WORKFLOW');

      expect(addedCount).toBe(2);

      const tools = manager.getTools(threadId, 'WORKFLOW');
      expect(tools).toContain('tool-1');
      expect(tools).toContain('tool-2');
    });

    it('应该成功添加工具到GLOBAL作用域', () => {
      const addedCount = manager.addTools(threadId, workflowId, ['tool-1', 'tool-2'], 'GLOBAL');

      expect(addedCount).toBe(2);

      const tools = manager.getTools(threadId, 'GLOBAL');
      expect(tools).toContain('tool-1');
      expect(tools).toContain('tool-2');
    });

    it('应该获取所有作用域的工具', () => {
      manager.addTools(threadId, workflowId, ['tool-1'], 'THREAD');
      manager.addTools(threadId, workflowId, ['tool-2'], 'WORKFLOW');
      manager.addTools(threadId, workflowId, ['tool-3'], 'GLOBAL');

      const allTools = manager.getTools(threadId);
      expect(allTools.size).toBe(3);
      expect(allTools).toContain('tool-1');
      expect(allTools).toContain('tool-2');
      expect(allTools).toContain('tool-3');
    });
  });

  describe('覆盖行为', () => {
    it('应该跳过已存在的工具（overwrite=false）', () => {
      manager.addTools(threadId, workflowId, ['tool-1'], 'THREAD', false);
      const addedCount = manager.addTools(threadId, workflowId, ['tool-1', 'tool-2'], 'THREAD', false);

      expect(addedCount).toBe(1); // 只有tool-2被添加

      const tools = manager.getTools(threadId, 'THREAD');
      expect(tools.size).toBe(2);
    });

    it('应该覆盖已存在的工具（overwrite=true）', () => {
      manager.addTools(threadId, workflowId, ['tool-1'], 'THREAD', false);
      const addedCount = manager.addTools(threadId, workflowId, ['tool-1', 'tool-2'], 'THREAD', true);

      expect(addedCount).toBe(2); // 两个工具都被添加/覆盖

      const tools = manager.getTools(threadId, 'THREAD');
      expect(tools.size).toBe(2);
    });
  });

  describe('元数据管理', () => {
    it('应该保存工具元数据', () => {
      manager.addTools(
        threadId,
        workflowId,
        ['tool-1'],
        'THREAD',
        false,
        'Tool: {{toolName}}',
        { category: 'test' }
      );

      const metadata = manager.getToolMetadata(threadId, 'tool-1', 'THREAD');
      expect(metadata).toBeDefined();
      expect(metadata?.toolId).toBe('tool-1');
      expect(metadata?.descriptionTemplate).toBe('Tool: {{toolName}}');
      expect(metadata?.customMetadata).toEqual({ category: 'test' });
      expect(metadata?.addedAt).toBeGreaterThan(0);
    });

    it('应该在不同作用域中保存不同的元数据', () => {
      manager.addTools(threadId, workflowId, ['tool-1'], 'THREAD', false, 'Thread tool');
      manager.addTools(threadId, workflowId, ['tool-1'], 'WORKFLOW', false, 'Workflow tool');

      const threadMetadata = manager.getToolMetadata(threadId, 'tool-1', 'THREAD');
      const workflowMetadata = manager.getToolMetadata(threadId, 'tool-1', 'WORKFLOW');

      expect(threadMetadata?.descriptionTemplate).toBe('Thread tool');
      expect(workflowMetadata?.descriptionTemplate).toBe('Workflow tool');
    });
  });

  describe('工具移除', () => {
    it('应该从指定作用域移除工具', () => {
      manager.addTools(threadId, workflowId, ['tool-1', 'tool-2'], 'THREAD');
      manager.addTools(threadId, workflowId, ['tool-1'], 'WORKFLOW');

      const removedCount = manager.removeTools(threadId, ['tool-1'], 'THREAD');

      expect(removedCount).toBe(1);

      const threadTools = manager.getTools(threadId, 'THREAD');
      expect(threadTools).not.toContain('tool-1');
      expect(threadTools).toContain('tool-2');

      const workflowTools = manager.getTools(threadId, 'WORKFLOW');
      expect(workflowTools).toContain('tool-1'); // WORKFLOW作用域的工具还在
    });

    it('应该从所有作用域移除工具', () => {
      manager.addTools(threadId, workflowId, ['tool-1'], 'THREAD');
      manager.addTools(threadId, workflowId, ['tool-1'], 'WORKFLOW');
      manager.addTools(threadId, workflowId, ['tool-1'], 'GLOBAL');

      const removedCount = manager.removeTools(threadId, ['tool-1']);

      expect(removedCount).toBe(3);

      expect(manager.getTools(threadId, 'THREAD')).not.toContain('tool-1');
      expect(manager.getTools(threadId, 'WORKFLOW')).not.toContain('tool-1');
      expect(manager.getTools(threadId, 'GLOBAL')).not.toContain('tool-1');
    });
  });

  describe('工具清空', () => {
    it('应该清空指定作用域的工具', () => {
      manager.addTools(threadId, workflowId, ['tool-1', 'tool-2'], 'THREAD');
      manager.addTools(threadId, workflowId, ['tool-3'], 'WORKFLOW');

      const clearedCount = manager.clearTools(threadId, 'THREAD');

      expect(clearedCount).toBe(2);
      expect(manager.getTools(threadId, 'THREAD').size).toBe(0);
      expect(manager.getTools(threadId, 'WORKFLOW').size).toBe(1);
    });

    it('应该清空所有作用域的工具', () => {
      manager.addTools(threadId, workflowId, ['tool-1'], 'THREAD');
      manager.addTools(threadId, workflowId, ['tool-2'], 'WORKFLOW');
      manager.addTools(threadId, workflowId, ['tool-3'], 'GLOBAL');

      const clearedCount = manager.clearTools(threadId);

      expect(clearedCount).toBe(3);
      expect(manager.getTools(threadId).size).toBe(0);
    });
  });

  describe('工具检查', () => {
    it('应该检查工具是否存在于指定作用域', () => {
      manager.addTools(threadId, workflowId, ['tool-1'], 'THREAD');

      expect(manager.hasTool(threadId, 'tool-1', 'THREAD')).toBe(true);
      expect(manager.hasTool(threadId, 'tool-1', 'WORKFLOW')).toBe(false);
    });

    it('应该检查工具是否存在于任何作用域', () => {
      manager.addTools(threadId, workflowId, ['tool-1'], 'WORKFLOW');

      expect(manager.hasTool(threadId, 'tool-1')).toBe(true);
      expect(manager.hasTool(threadId, 'tool-2')).toBe(false);
    });
  });

  describe('快照和恢复', () => {
    it('应该创建工具上下文快照', () => {
      manager.addTools(threadId, workflowId, ['tool-1'], 'THREAD');
      manager.addTools(threadId, workflowId, ['tool-2'], 'WORKFLOW');

      const snapshot = manager.getSnapshot(threadId);

      expect(snapshot).toBeDefined();
      expect(snapshot?.threadTools.size).toBe(1);
      expect(snapshot?.workflowTools.size).toBe(1);
    });

    it('应该从快照恢复工具上下文', () => {
      manager.addTools(threadId, workflowId, ['tool-1'], 'THREAD');
      const snapshot = manager.getSnapshot(threadId);

      // 清空工具
      manager.clearTools(threadId);
      expect(manager.getTools(threadId).size).toBe(0);

      // 恢复快照
      manager.restoreSnapshot(threadId, snapshot!);

      expect(manager.getTools(threadId, 'THREAD')).toContain('tool-1');
    });

    it('应该返回undefined对于不存在的线程', () => {
      const snapshot = manager.getSnapshot('non-existent-thread');
      expect(snapshot).toBeUndefined();
    });
  });

  describe('上下文管理', () => {
    it('应该删除工具上下文', () => {
      manager.addTools(threadId, workflowId, ['tool-1'], 'THREAD');
      manager.deleteContext(threadId);

      expect(manager.getTools(threadId).size).toBe(0);
    });

    it('应该清空所有工具上下文', () => {
      manager.addTools('thread-1', workflowId, ['tool-1'], 'THREAD');
      manager.addTools('thread-2', workflowId, ['tool-2'], 'THREAD');

      manager.clearAll();

      expect(manager.getTools('thread-1').size).toBe(0);
      expect(manager.getTools('thread-2').size).toBe(0);
    });

    it('应该获取所有线程ID', () => {
      manager.addTools('thread-1', workflowId, ['tool-1'], 'THREAD');
      manager.addTools('thread-2', workflowId, ['tool-2'], 'THREAD');

      const threadIds = manager.getAllThreadIds();

      expect(threadIds).toContain('thread-1');
      expect(threadIds).toContain('thread-2');
      expect(threadIds.length).toBe(2);
    });
  });

  describe('多线程隔离', () => {
    it('应该在不同线程间隔离工具', () => {
      manager.addTools('thread-1', workflowId, ['tool-1'], 'THREAD');
      manager.addTools('thread-2', workflowId, ['tool-2'], 'THREAD');

      const tools1 = manager.getTools('thread-1', 'THREAD');
      const tools2 = manager.getTools('thread-2', 'THREAD');

      expect(tools1).toContain('tool-1');
      expect(tools1).not.toContain('tool-2');
      expect(tools2).toContain('tool-2');
      expect(tools2).not.toContain('tool-1');
    });
  });

  describe('边界情况', () => {
    it('应该处理空工具列表', () => {
      const addedCount = manager.addTools(threadId, workflowId, [], 'THREAD');
      expect(addedCount).toBe(0);
    });

    it('应该处理不存在的线程', () => {
      const tools = manager.getTools('non-existent-thread');
      expect(tools.size).toBe(0);
    });

    it('应该处理移除不存在的工具', () => {
      const removedCount = manager.removeTools(threadId, ['non-existent-tool']);
      expect(removedCount).toBe(0);
    });

    it('应该处理清空不存在的线程', () => {
      const clearedCount = manager.clearTools('non-existent-thread');
      expect(clearedCount).toBe(0);
    });
  });
});