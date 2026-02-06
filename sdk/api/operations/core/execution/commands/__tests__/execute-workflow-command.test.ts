/**
 * ExecuteWorkflowCommand 单元测试
 */

import { ExecuteWorkflowCommand } from '../execute-workflow-command';
import { ThreadLifecycleCoordinator } from '../../../../../core/execution/coordinators/thread-lifecycle-coordinator';
import { workflowRegistry } from '../../../../../core/services/workflow-registry';
import { success, failure, isSuccess } from '../../../../types/execution-result';

// Mock ThreadLifecycleCoordinator
jest.mock('../../../../../core/execution/coordinators/thread-lifecycle-coordinator');

describe('ExecuteWorkflowCommand', () => {
  let mockCoordinator: jest.Mocked<ThreadLifecycleCoordinator>;

  beforeEach(() => {
    // 创建mock coordinator
    mockCoordinator = {
      executeWorkflow: jest.fn()
    } as any;

    (ThreadLifecycleCoordinator as jest.Mock).mockImplementation(() => mockCoordinator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetadata', () => {
    it('应该返回正确的元数据', () => {
      const command = new ExecuteWorkflowCommand(
        { workflowId: 'test-workflow' },
        mockCoordinator
      );

      const metadata = command.getMetadata();

      expect(metadata.name).toBe('ExecuteWorkflow');
      expect(metadata.description).toBe('执行工作流');
      expect(metadata.category).toBe('execution');
      expect(metadata.requiresAuth).toBe(false);
      expect(metadata.version).toBe('1.0.0');
    });
  });

  describe('validate', () => {
    it('应该验证通过当提供workflowId', () => {
      const command = new ExecuteWorkflowCommand(
        { workflowId: 'test-workflow' },
        mockCoordinator
      );

      const result = command.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该验证通过当提供workflowDefinition', () => {
      const command = new ExecuteWorkflowCommand(
        {
          workflowDefinition: {
            id: 'test-workflow',
            name: 'Test Workflow',
            nodes: [],
            edges: []
          }
        },
        mockCoordinator
      );

      const result = command.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该验证失败当既没有workflowId也没有workflowDefinition', () => {
      const command = new ExecuteWorkflowCommand(
        {} as any,
        mockCoordinator
      );

      const result = command.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Either workflowId or workflowDefinition is required');
    });

    it('应该验证失败当workflowId为空', () => {
      const command = new ExecuteWorkflowCommand(
        { workflowId: '' },
        mockCoordinator
      );

      const result = command.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('workflowId cannot be empty');
    });
  });

  describe('execute', () => {
    it('应该成功执行工作流', async () => {
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

      const result = await command.execute();

      expect(isSuccess(result)).toBe(true);
      expect(result.data).toEqual(mockThreadResult);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('应该返回失败当验证失败', async () => {
      const command = new ExecuteWorkflowCommand(
        {} as any,
        mockCoordinator
      );

      const result = await command.execute();

      expect(isSuccess(result)).toBe(false);
      expect(result.error).toContain('Either workflowId or workflowDefinition is required');
    });

    it('应该处理执行错误', async () => {
      const error = new Error('Execution failed');
      mockCoordinator.executeWorkflow.mockRejectedValue(error);

      const command = new ExecuteWorkflowCommand(
        { workflowId: 'test-workflow' },
        mockCoordinator
      );

      const result = await command.execute();

      expect(isSuccess(result)).toBe(false);
      expect(result.error).toBe('Execution failed');
    });

    it('应该使用workflowDefinition执行', async () => {
      const mockThreadResult = {
        threadId: 'thread-456',
        status: 'completed',
        output: { result: 'success' }
      };

      mockCoordinator.executeWorkflow.mockResolvedValue(mockThreadResult);

      const workflowDefinition = {
        id: 'test-workflow',
        name: 'Test Workflow',
        nodes: [],
        edges: []
      };

      const command = new ExecuteWorkflowCommand(
        { workflowDefinition },
        mockCoordinator
      );

      const result = await command.execute();

      expect(isSuccess(result)).toBe(true);
      expect(result.data).toEqual(mockThreadResult);
    });
  });
});