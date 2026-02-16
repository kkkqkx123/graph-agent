/**
 * ADD_TOOL节点处理器测试
 */

import { addToolHandler, type AddToolHandlerContext } from '../add-tool-handler';
import { NodeType } from '@modular-agent/types';
import { ToolContextManager } from '../../../managers/tool-context-manager';
import { ExecutionError } from '@modular-agent/types';

describe('addToolHandler', () => {
  let mockThread: any;
  let mockNode: any;
  let mockContext: AddToolHandlerContext;
  let toolContextManager: ToolContextManager;

  beforeEach(() => {
    // 创建工具上下文管理器
    toolContextManager = new ToolContextManager();

    // Mock Thread
    mockThread = {
      id: 'thread-1',
      workflowId: 'workflow-1',
      nodeResults: []
    };

    // Mock ToolService
    const mockToolService = {
      getTool: jest.fn((id: string) => {
        const tools: Record<string, any> = {
          'tool-1': { id: 'tool-1', name: 'Tool 1', description: 'Test tool 1', parameters: {} },
          'tool-2': { id: 'tool-2', name: 'Tool 2', description: 'Test tool 2', parameters: {} },
          'tool-3': { id: 'tool-3', name: 'Tool 3', description: 'Test tool 3', parameters: {} }
        };
        return tools[id] || null;
      })
    };

    // Mock EventManager
    const mockEventManager = {
      emit: jest.fn().mockResolvedValue(undefined)
    };

    // 创建上下文
    mockContext = {
      toolContextManager,
      toolService: mockToolService,
      eventManager: mockEventManager
    };

    // Mock Node
    mockNode = {
      id: 'add-tool-1',
      name: 'Add Tool Node',
      type: NodeType.ADD_TOOL,
      config: {
        toolIds: ['tool-1', 'tool-2'],
        scope: 'THREAD',
        overwrite: false
      },
      incomingEdgeIds: [],
      outgoingEdgeIds: []
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('基本功能', () => {
    it('应该成功添加工具到THREAD作用域', async () => {
      const result = await addToolHandler(mockThread, mockNode, mockContext);

      expect(result.status).toBe('COMPLETED');
      expect(result.addedCount).toBe(2);
      expect(result.skippedCount).toBe(0);
      expect(result.executionTime).toBeGreaterThan(0);

      // 验证工具已添加到上下文
      const tools = toolContextManager.getTools(mockThread.id, 'THREAD');
      expect(tools).toContain('tool-1');
      expect(tools).toContain('tool-2');
    });

    it('应该成功添加工具到WORKFLOW作用域', async () => {
      mockNode.config.scope = 'WORKFLOW';

      const result = await addToolHandler(mockThread, mockNode, mockContext);

      expect(result.status).toBe('COMPLETED');
      expect(result.addedCount).toBe(2);

      // 验证工具已添加到WORKFLOW作用域
      const tools = toolContextManager.getTools(mockThread.id, 'WORKFLOW');
      expect(tools).toContain('tool-1');
      expect(tools).toContain('tool-2');
    });

    it('应该成功添加工具到GLOBAL作用域', async () => {
      mockNode.config.scope = 'GLOBAL';

      const result = await addToolHandler(mockThread, mockNode, mockContext);

      expect(result.status).toBe('COMPLETED');
      expect(result.addedCount).toBe(2);

      // 验证工具已添加到GLOBAL作用域
      const tools = toolContextManager.getTools(mockThread.id, 'GLOBAL');
      expect(tools).toContain('tool-1');
      expect(tools).toContain('tool-2');
    });

    it('应该使用默认的THREAD作用域', async () => {
      delete mockNode.config.scope;

      const result = await addToolHandler(mockThread, mockNode, mockContext);

      expect(result.status).toBe('COMPLETED');

      // 验证工具已添加到THREAD作用域
      const tools = toolContextManager.getTools(mockThread.id, 'THREAD');
      expect(tools).toContain('tool-1');
      expect(tools).toContain('tool-2');
    });
  });

  describe('覆盖行为', () => {
    it('应该跳过已存在的工具（overwrite=false）', async () => {
      // 先添加工具
      toolContextManager.addTools(mockThread.id, mockThread.workflowId, ['tool-1'], 'THREAD', false);

      // 再次添加相同的工具
      const result = await addToolHandler(mockThread, mockNode, mockContext);

      expect(result.status).toBe('COMPLETED');
      expect(result.addedCount).toBe(1); // 只有tool-2被添加
      expect(result.skippedCount).toBe(1); // tool-1被跳过
    });

    it('应该覆盖已存在的工具（overwrite=true）', async () => {
      // 先添加工具
      toolContextManager.addTools(mockThread.id, mockThread.workflowId, ['tool-1'], 'THREAD', false);

      // 设置overwrite为true
      mockNode.config.overwrite = true;

      const result = await addToolHandler(mockThread, mockNode, mockContext);

      expect(result.status).toBe('COMPLETED');
      expect(result.addedCount).toBe(2); // 两个工具都被添加/覆盖
      expect(result.skippedCount).toBe(0);
    });
  });

  describe('错误处理', () => {
    it('应该在工具不存在时抛出错误', async () => {
      mockNode.config.toolIds = ['tool-1', 'non-existent-tool'];

      const result = await addToolHandler(mockThread, mockNode, mockContext);

      expect(result.status).toBe('FAILED');
      expect(result.error).toBeInstanceOf(ExecutionError);
      expect(result.error?.message).toContain('Invalid tool IDs');
    });

    it('应该在所有工具都不存在时抛出错误', async () => {
      mockNode.config.toolIds = ['non-existent-tool-1', 'non-existent-tool-2'];

      const result = await addToolHandler(mockThread, mockNode, mockContext);

      expect(result.status).toBe('FAILED');
      expect(result.error).toBeInstanceOf(ExecutionError);
    });

    it('应该处理空工具列表', async () => {
      mockNode.config.toolIds = [];

      const result = await addToolHandler(mockThread, mockNode, mockContext);

      expect(result.status).toBe('COMPLETED');
      expect(result.addedCount).toBe(0);
    });
  });

  describe('元数据支持', () => {
    it('应该支持descriptionTemplate', async () => {
      mockNode.config.descriptionTemplate = 'Tool: {{toolName}}';

      const result = await addToolHandler(mockThread, mockNode, mockContext);

      expect(result.status).toBe('COMPLETED');

      // 验证元数据已保存
      const metadata = toolContextManager.getToolMetadata(mockThread.id, 'tool-1', 'THREAD');
      expect(metadata?.descriptionTemplate).toBe('Tool: {{toolName}}');
    });

    it('应该支持自定义metadata', async () => {
      mockNode.config.metadata = {
        category: 'test',
        priority: 1
      };

      const result = await addToolHandler(mockThread, mockNode, mockContext);

      expect(result.status).toBe('COMPLETED');

      // 验证元数据已保存
      const metadata = toolContextManager.getToolMetadata(mockThread.id, 'tool-1', 'THREAD');
      expect(metadata?.customMetadata).toEqual({
        category: 'test',
        priority: 1
      });
    });
  });

  describe('事件触发', () => {
    it('应该触发TOOL_ADDED事件', async () => {
      await addToolHandler(mockThread, mockNode, mockContext);

      expect(mockContext.eventManager.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TOOL_ADDED',
          threadId: mockThread.id,
          workflowId: mockThread.workflowId,
          nodeId: mockNode.id,
          toolIds: ['tool-1', 'tool-2'],
          scope: 'THREAD',
          addedCount: 2,
          skippedCount: 0
        })
      );
    });
  });

  describe('多线程隔离', () => {
    it('应该在不同线程间隔离工具', async () => {
      const thread1 = { ...mockThread, id: 'thread-1' };
      const thread2 = { ...mockThread, id: 'thread-2' };

      // 在thread1中添加工具
      await addToolHandler(thread1, mockNode, mockContext);

      // 验证thread1有工具
      const tools1 = toolContextManager.getTools(thread1.id, 'THREAD');
      expect(tools1.size).toBe(2);

      // 验证thread2没有工具
      const tools2 = toolContextManager.getTools(thread2.id, 'THREAD');
      expect(tools2.size).toBe(0);
    });
  });
});