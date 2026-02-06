/**
 * CommandExecutor 集成测试
 */

import { CommandExecutor } from '../command-executor';
import { LoggingMiddleware, ValidationMiddleware } from '../command-middleware';
import { ExecuteWorkflowCommand } from '../../operations/core/execution/commands';
import { GetMessagesCommand } from '../../operations/monitoring/messages/commands';
import { ThreadLifecycleCoordinator } from '../../../core/execution/coordinators/thread-lifecycle-coordinator';
import { threadRegistry } from '../../../core/services/thread-registry';
import type { LLMMessage } from '../../../types/llm';

// Mock dependencies
jest.mock('../../../core/execution/coordinators/thread-lifecycle-coordinator');
jest.mock('../../../core/services/thread-registry');

describe('CommandExecutor 集成测试', () => {
  let executor: CommandExecutor;
  let mockCoordinator: jest.Mocked<ThreadLifecycleCoordinator>;
  let mockThreadContext: any;

  beforeEach(() => {
    // 创建mock coordinator
    mockCoordinator = {
      executeWorkflow: jest.fn()
    } as any;

    (ThreadLifecycleCoordinator as jest.Mock).mockImplementation(() => mockCoordinator);

    // 创建mock thread context
    mockThreadContext = {
      conversationManager: {
        getMessages: jest.fn()
      }
    };

    (threadRegistry.get as jest.Mock).mockReturnValue(mockThreadContext);

    // 创建executor并添加中间件
    executor = new CommandExecutor();
    executor.addMiddleware(new LoggingMiddleware());
    executor.addMiddleware(new ValidationMiddleware());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('执行单个Command', () => {
    it('应该成功执行ExecuteWorkflowCommand', async () => {
      const mockThreadResult = {
        threadId: 'thread-123',
        status: 'completed',
        output: { result: 'success' }
      };

      mockCoordinator.executeWorkflow.mockResolvedValue(mockThreadResult);

      const command = new ExecuteWorkflowCommand(
        { workflowId: 'test-workflow' },
        mockCoordinator
      );

      const result = await executor.execute(command);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockThreadResult);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('应该成功执行GetMessagesCommand', async () => {
      const mockMessages: LLMMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' }
      ];

      mockThreadContext.conversationManager.getMessages.mockReturnValue(mockMessages);

      const command = new GetMessagesCommand({ threadId: 'test-thread' });

      const result = await executor.execute(command);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMessages);
    });

    it('应该处理验证失败的Command', async () => {
      const command = new ExecuteWorkflowCommand(
        {} as any,
        mockCoordinator
      );

      const result = await executor.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Either workflowId or workflowDefinition is required');
    });

    it('应该处理执行失败的Command', async () => {
      const error = new Error('Execution failed');
      mockCoordinator.executeWorkflow.mockRejectedValue(error);

      const command = new ExecuteWorkflowCommand(
        { workflowId: 'test-workflow' },
        mockCoordinator
      );

      const result = await executor.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Execution failed');
    });
  });

  describe('批量执行Commands', () => {
    it('应该成功批量执行Commands（并行）', async () => {
      const mockThreadResult = {
        threadId: 'thread-123',
        status: 'completed',
        output: { result: 'success' }
      };

      const mockMessages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      mockCoordinator.executeWorkflow.mockResolvedValue(mockThreadResult);
      mockThreadContext.conversationManager.getMessages.mockReturnValue(mockMessages);

      const commands = [
        new ExecuteWorkflowCommand(
          { workflowId: 'test-workflow' },
          mockCoordinator
        ),
        new GetMessagesCommand({ threadId: 'test-thread' })
      ];

      const results = await executor.executeBatch(commands, { mode: 'parallel' });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('应该成功批量执行Commands（串行）', async () => {
      const mockThreadResult = {
        threadId: 'thread-123',
        status: 'completed',
        output: { result: 'success' }
      };

      const mockMessages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      mockCoordinator.executeWorkflow.mockResolvedValue(mockThreadResult);
      mockThreadContext.conversationManager.getMessages.mockReturnValue(mockMessages);

      const commands = [
        new ExecuteWorkflowCommand(
          { workflowId: 'test-workflow' },
          mockCoordinator
        ),
        new GetMessagesCommand({ threadId: 'test-thread' })
      ];

      const results = await executor.executeBatch(commands, { mode: 'serial' });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('应该处理批量执行中的失败', async () => {
      const error = new Error('Execution failed');
      mockCoordinator.executeWorkflow.mockRejectedValue(error);

      const commands = [
        new ExecuteWorkflowCommand(
          { workflowId: 'test-workflow' },
          mockCoordinator
        )
      ];

      const results = await executor.executeBatch(commands, { mode: 'parallel' });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Execution failed');
    });
  });

  describe('中间件集成', () => {
    it('应该应用所有中间件', async () => {
      const mockThreadResult = {
        threadId: 'thread-123',
        status: 'completed',
        output: { result: 'success' }
      };

      mockCoordinator.executeWorkflow.mockResolvedValue(mockThreadResult);

      const command = new ExecuteWorkflowCommand(
        { workflowId: 'test-workflow' },
        mockCoordinator
      );

      const result = await executor.execute(command);

      expect(result.success).toBe(true);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('应该在验证失败时停止执行', async () => {
      const command = new ExecuteWorkflowCommand(
        {} as any,
        mockCoordinator
      );

      const result = await executor.execute(command);

      expect(result.success).toBe(false);
      expect(mockCoordinator.executeWorkflow).not.toHaveBeenCalled();
    });
  });
});