/**
 * Execution Commands 单元测试
 * 测试 CancelThreadCommand, ExecuteThreadCommand, PauseThreadCommand, ResumeThreadCommand
 */

import { CancelThreadCommand } from '../cancel-thread-command';
import { ExecuteThreadCommand } from '../execute-thread-command';
import { PauseThreadCommand } from '../pause-thread-command';
import { ResumeThreadCommand } from '../resume-thread-command';
import { ThreadLifecycleCoordinator } from '../../core/execution/coordinators/thread-lifecycle-coordinator';
import { ExecutionContext } from '../../core/execution/context/execution-context';
import type { ThreadResult, ThreadOptions } from '@modular-agent/types';

// Mock ThreadLifecycleCoordinator
jest.mock('../../../../../core/execution/coordinators/thread-lifecycle-coordinator');

// Mock ExecutionContext
jest.mock('../../../../../core/execution/context/execution-context');

describe('CancelThreadCommand', () => {
  let mockLifecycleCoordinator: jest.Mocked<ThreadLifecycleCoordinator>;

  beforeEach(() => {
    mockLifecycleCoordinator = {
      stopThread: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ThreadLifecycleCoordinator>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('应该验证通过当提供有效的 threadId', () => {
      const command = new CancelThreadCommand('thread-123', mockLifecycleCoordinator);
      const result = command.validate();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该验证失败当 threadId 为空', () => {
      const command = new CancelThreadCommand('', mockLifecycleCoordinator);
      const result = command.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('线程ID不能为空');
    });

    it('应该验证失败当 threadId 只有空格', () => {
      const command = new CancelThreadCommand('   ', mockLifecycleCoordinator);
      const result = command.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('线程ID不能为空');
    });

    it('应该验证失败当 threadId 为 undefined', () => {
      const command = new CancelThreadCommand(undefined as any, mockLifecycleCoordinator);
      const result = command.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('线程ID不能为空');
    });
  });

  describe('executeInternal', () => {
    it('应该调用 lifecycleCoordinator.stopThread', async () => {
      const command = new CancelThreadCommand('thread-123', mockLifecycleCoordinator);
      await command.execute();
      
      expect(mockLifecycleCoordinator.stopThread).toHaveBeenCalledWith('thread-123');
      expect(mockLifecycleCoordinator.stopThread).toHaveBeenCalledTimes(1);
    });

    it('应该正确处理 stopThread 抛出的错误', async () => {
      const error = new Error('Thread not found');
      mockLifecycleCoordinator.stopThread.mockRejectedValue(error);
      
      const command = new CancelThreadCommand('thread-123', mockLifecycleCoordinator);
      const result = await command.execute();
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.message).toBe('Thread not found');
      }
    });
  });

  describe('getMetadata', () => {
    it('应该返回正确的元数据', () => {
      const command = new CancelThreadCommand('thread-123', mockLifecycleCoordinator);
      const metadata = command.getMetadata();
      
      expect(metadata.name).toBe('CancelThreadCommand');
      expect(metadata.description).toBe('取消线程执行');
      expect(metadata.category).toBe('execution');
      expect(metadata.requiresAuth).toBe(true);
      expect(metadata.version).toBe('1.0.0');
    });
  });
});

describe('ExecuteThreadCommand', () => {
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockThreadResult: ThreadResult;

  let mockExecute: jest.Mock;

  beforeEach(() => {
    mockExecutionContext = {} as unknown as jest.Mocked<ExecutionContext>;
    mockThreadResult = {
      threadId: 'thread-123',
      output: {},
      executionTime: 1000,
      nodeResults: [],
      metadata: {
        status: 'completed' as any,
        startTime: Date.now(),
        endTime: Date.now(),
        executionTime: 1000,
        nodeCount: 0,
        errorCount: 0
      }
    } as ThreadResult;

    // Mock ThreadLifecycleCoordinator constructor
    mockExecute = jest.fn().mockResolvedValue(mockThreadResult);
    (ThreadLifecycleCoordinator as jest.Mock).mockImplementation(() => ({
      execute: mockExecute,
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('应该验证通过当提供有效的 workflowId', () => {
      const params = { workflowId: 'workflow-123' };
      const command = new ExecuteThreadCommand(params, mockExecutionContext);
      const result = command.validate();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该验证失败当 workflowId 为空', () => {
      const params = { workflowId: '' };
      const command = new ExecuteThreadCommand(params, mockExecutionContext);
      const result = command.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('必须提供 workflowId');
    });

    it('应该验证失败当 workflowId 只有空格', () => {
      const params = { workflowId: '   ' };
      const command = new ExecuteThreadCommand(params, mockExecutionContext);
      const result = command.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('必须提供 workflowId');
    });

    it('应该验证通过当提供 options', () => {
      const params = { 
        workflowId: 'workflow-123',
        options: { timeout: 5000 } as ThreadOptions 
      };
      const command = new ExecuteThreadCommand(params, mockExecutionContext);
      const result = command.validate();
      
      expect(result.valid).toBe(true);
    });
  });

  describe('executeInternal', () => {
    it('应该创建 ThreadLifecycleCoordinator 并执行线程', async () => {
      const params = { workflowId: 'workflow-123' };
      const command = new ExecuteThreadCommand(params, mockExecutionContext);
      const result = await command.execute();
      
      expect(ThreadLifecycleCoordinator).toHaveBeenCalledWith(mockExecutionContext);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockThreadResult);
      }
    });

    it('应该传递正确的参数给 execute 方法', async () => {
      const params = { 
        workflowId: 'workflow-123',
        options: { timeout: 5000 } as ThreadOptions 
      };
      const command = new ExecuteThreadCommand(params, mockExecutionContext);
      
      await command.execute();
      
      expect(mockExecute).toHaveBeenCalledWith('workflow-123', { timeout: 5000 });
    });

    it('应该使用空对象作为默认 options', async () => {
      const params = { workflowId: 'workflow-123' };
      const command = new ExecuteThreadCommand(params, mockExecutionContext);
      
      await command.execute();
      
      expect(mockExecute).toHaveBeenCalledWith('workflow-123', {});
    });

    it('应该正确处理 execute 抛出的错误', async () => {
      const error = new Error('Workflow not found');
      (ThreadLifecycleCoordinator as jest.Mock).mockImplementation(() => ({
        execute: jest.fn().mockRejectedValue(error),
      }));
      
      const params = { workflowId: 'workflow-123' };
      const command = new ExecuteThreadCommand(params, mockExecutionContext);
      const result = await command.execute();
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.message).toBe('Workflow not found');
      }
    });
  });

  describe('getMetadata', () => {
    it('应该返回正确的元数据', () => {
      const params = { workflowId: 'workflow-123' };
      const command = new ExecuteThreadCommand(params, mockExecutionContext);
      const metadata = command.getMetadata();
      
      expect(metadata.name).toBe('ExecuteThreadCommand');
      expect(metadata.description).toBe('执行工作流线程');
      expect(metadata.category).toBe('execution');
      expect(metadata.requiresAuth).toBe(true);
      expect(metadata.version).toBe('1.0.0');
    });
  });
});

describe('PauseThreadCommand', () => {
  let mockLifecycleCoordinator: jest.Mocked<ThreadLifecycleCoordinator>;

  beforeEach(() => {
    mockLifecycleCoordinator = {
      pauseThread: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ThreadLifecycleCoordinator>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('应该验证通过当提供有效的 threadId', () => {
      const command = new PauseThreadCommand('thread-123', mockLifecycleCoordinator);
      const result = command.validate();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该验证失败当 threadId 为空', () => {
      const command = new PauseThreadCommand('', mockLifecycleCoordinator);
      const result = command.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('线程ID不能为空');
    });

    it('应该验证失败当 threadId 只有空格', () => {
      const command = new PauseThreadCommand('   ', mockLifecycleCoordinator);
      const result = command.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('线程ID不能为空');
    });

    it('应该验证失败当 threadId 为 undefined', () => {
      const command = new PauseThreadCommand(undefined as any, mockLifecycleCoordinator);
      const result = command.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('线程ID不能为空');
    });
  });

  describe('executeInternal', () => {
    it('应该调用 lifecycleCoordinator.pauseThread', async () => {
      const command = new PauseThreadCommand('thread-123', mockLifecycleCoordinator);
      await command.execute();
      
      expect(mockLifecycleCoordinator.pauseThread).toHaveBeenCalledWith('thread-123');
      expect(mockLifecycleCoordinator.pauseThread).toHaveBeenCalledTimes(1);
    });

    it('应该正确处理 pauseThread 抛出的错误', async () => {
      const error = new Error('Thread not found');
      mockLifecycleCoordinator.pauseThread.mockRejectedValue(error);
      
      const command = new PauseThreadCommand('thread-123', mockLifecycleCoordinator);
      const result = await command.execute();
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.message).toBe('Thread not found');
      }
    });
  });

  describe('getMetadata', () => {
    it('应该返回正确的元数据', () => {
      const command = new PauseThreadCommand('thread-123', mockLifecycleCoordinator);
      const metadata = command.getMetadata();
      
      expect(metadata.name).toBe('PauseThreadCommand');
      expect(metadata.description).toBe('暂停线程执行');
      expect(metadata.category).toBe('execution');
      expect(metadata.requiresAuth).toBe(true);
      expect(metadata.version).toBe('1.0.0');
    });
  });
});

describe('ResumeThreadCommand', () => {
  let mockLifecycleCoordinator: jest.Mocked<ThreadLifecycleCoordinator>;
  let mockThreadResult: ThreadResult;

  beforeEach(() => {
    mockThreadResult = {
      threadId: 'thread-123',
      output: {},
      executionTime: 500,
      nodeResults: [],
      metadata: {
        status: 'running' as any,
        startTime: Date.now(),
        endTime: Date.now(),
        executionTime: 500,
        nodeCount: 0,
        errorCount: 0
      }
    } as ThreadResult;

    mockLifecycleCoordinator = {
      resumeThread: jest.fn().mockResolvedValue(mockThreadResult),
    } as unknown as jest.Mocked<ThreadLifecycleCoordinator>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('应该验证通过当提供有效的 threadId', () => {
      const command = new ResumeThreadCommand('thread-123', mockLifecycleCoordinator);
      const result = command.validate();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该验证失败当 threadId 为空', () => {
      const command = new ResumeThreadCommand('', mockLifecycleCoordinator);
      const result = command.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('线程ID不能为空');
    });

    it('应该验证失败当 threadId 只有空格', () => {
      const command = new ResumeThreadCommand('   ', mockLifecycleCoordinator);
      const result = command.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('线程ID不能为空');
    });

    it('应该验证失败当 threadId 为 undefined', () => {
      const command = new ResumeThreadCommand(undefined as any, mockLifecycleCoordinator);
      const result = command.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('线程ID不能为空');
    });
  });

  describe('executeInternal', () => {
    it('应该调用 lifecycleCoordinator.resumeThread 并返回结果', async () => {
      const command = new ResumeThreadCommand('thread-123', mockLifecycleCoordinator);
      const result = await command.execute();
      
      expect(mockLifecycleCoordinator.resumeThread).toHaveBeenCalledWith('thread-123');
      expect(mockLifecycleCoordinator.resumeThread).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockThreadResult);
      }
    });

    it('应该正确处理 resumeThread 抛出的错误', async () => {
      const error = new Error('Thread not found');
      mockLifecycleCoordinator.resumeThread.mockRejectedValue(error);
      
      const command = new ResumeThreadCommand('thread-123', mockLifecycleCoordinator);
      const result = await command.execute();
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.message).toBe('Thread not found');
      }
    });
  });

  describe('getMetadata', () => {
    it('应该返回正确的元数据', () => {
      const command = new ResumeThreadCommand('thread-123', mockLifecycleCoordinator);
      const metadata = command.getMetadata();
      
      expect(metadata.name).toBe('ResumeThreadCommand');
      expect(metadata.description).toBe('恢复线程执行');
      expect(metadata.category).toBe('execution');
      expect(metadata.requiresAuth).toBe(true);
      expect(metadata.version).toBe('1.0.0');
    });
  });
});