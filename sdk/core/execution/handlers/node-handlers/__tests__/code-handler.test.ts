/**
 * Code节点处理函数单元测试
 * 
 * 测试范围：纯执行逻辑和历史记录
 * 注意：验证、安全检查、状态判断由应用层负责，不在此测试
 */

import { codeHandler } from '../code-handler';
import type { Node, CodeNodeConfig } from '@modular-agent/types';
import { NodeType } from '@modular-agent/types';
import type { Thread } from '@modular-agent/types';
import { ThreadStatus } from '@modular-agent/types';

// Mock codeService
jest.mock('../../../../../core/services/code-service', () => ({
  codeService: {
    execute: jest.fn()
  }
}));

// Get reference to the mocked function
const mockExecute = require('../../../../../core/services/code-service').codeService.execute;

describe('code-handler', () => {
  let mockThread: Thread;
  let mockNode: Node;

  beforeEach(() => {
    // 初始化mock thread
    mockThread = {
      id: 'thread-1',
      workflowId: 'workflow-1',
      workflowVersion: '1.0.0',
      status: ThreadStatus.RUNNING,
      currentNodeId: '',
      graph: {} as any,
      variables: [],
      variableScopes: {
        global: {},
        thread: {},
        local: [],
        loop: []
      },
      input: {},
      output: {},
      nodeResults: [],
      startTime: 0,
      errors: []
    };

    // 重置mock
    mockExecute.mockReset();
  });

  describe('基本功能测试', () => {
    it('应该成功执行脚本并返回结果', async () => {
      const mockResult = {
        success: true,
        scriptName: 'test-script',
        scriptType: 'JAVASCRIPT',
        stdout: 'Script output',
        executionTime: 100
      };

      mockExecute.mockResolvedValue(mockResult);

      mockNode = {
        id: 'code-node-1',
        name: 'Code Node',
        type: NodeType.CODE,
        config: {
          scriptName: 'test-script',
          scriptType: 'javascript',
          risk: 'none'
        } as CodeNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      const result = await codeHandler(mockThread, mockNode);

      expect(result).toEqual(mockResult);
      expect(mockExecute).toHaveBeenCalledWith('test-script');
      
      // 验证执行历史已记录
      expect(mockThread.nodeResults).toHaveLength(1);
      const executionResult = mockThread.nodeResults[0]!;
      expect(executionResult).toMatchObject({
        step: 1,
        nodeId: 'code-node-1',
        nodeType: NodeType.CODE,
        status: 'COMPLETED'
      });
      expect(executionResult.timestamp).toBeDefined();
    });

    it('应该在执行失败时记录错误并抛出异常', async () => {
      const mockError = new Error('Script execution failed');
      mockExecute.mockRejectedValue(mockError);

      mockNode = {
        id: 'code-node-1',
        name: 'Code Node',
        type: NodeType.CODE,
        config: {
          scriptName: 'failing-script',
          scriptType: 'javascript',
          risk: 'none'
        } as CodeNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await expect(codeHandler(mockThread, mockNode))
        .rejects
        .toThrow('Script execution failed');

      // 验证执行历史已记录错误
      expect(mockThread.nodeResults).toHaveLength(1);
      const executionResult = mockThread.nodeResults[0]!;
      expect(executionResult).toMatchObject({
        step: 1,
        nodeId: 'code-node-1',
        nodeType: NodeType.CODE,
        status: 'FAILED',
        error: 'Script execution failed'
      });
      expect(executionResult.timestamp).toBeDefined();
    });
  });



  describe('边界情况测试', () => {
    it('应该正确处理空的nodeResults数组', async () => {
      mockThread.nodeResults = [];
      mockExecute.mockResolvedValue({
        success: true,
        scriptName: 'test-script',
        scriptType: 'JAVASCRIPT',
        executionTime: 100
      });

      mockNode = {
        id: 'code-node-1',
        name: 'Code Node',
        type: NodeType.CODE,
        config: {
          scriptName: 'test-script',
          scriptType: 'javascript',
          risk: 'none'
        } as CodeNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await codeHandler(mockThread, mockNode);

      expect(mockThread.nodeResults).toHaveLength(1);
      expect(mockThread.nodeResults[0]!.step).toBe(1);
    });

    it('应该正确处理非空的nodeResults数组', async () => {
      mockThread.nodeResults = [{ step: 1, nodeId: 'prev-node', nodeType: 'START', status: 'COMPLETED', timestamp: 123456 }];
      mockExecute.mockResolvedValue({
        success: true,
        scriptName: 'test-script',
        scriptType: 'JAVASCRIPT',
        executionTime: 100
      });

      mockNode = {
        id: 'code-node-1',
        name: 'Code Node',
        type: NodeType.CODE,
        config: {
          scriptName: 'test-script',
          scriptType: 'javascript',
          risk: 'none'
        } as CodeNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await codeHandler(mockThread, mockNode);

      expect(mockThread.nodeResults).toHaveLength(2);
      expect(mockThread.nodeResults[1]!.step).toBe(2);
    });

    it('应该处理inline配置选项', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        scriptName: 'inline-script',
        scriptType: 'JAVASCRIPT',
        executionTime: 100
      });

      mockNode = {
        id: 'code-node-1',
        name: 'Code Node',
        type: NodeType.CODE,
        config: {
          scriptName: 'inline-script',
          scriptType: 'javascript',
          risk: 'none',
          inline: true
        } as CodeNodeConfig,
        incomingEdgeIds: [],
        outgoingEdgeIds: []
      };

      await codeHandler(mockThread, mockNode);

      expect(mockExecute).toHaveBeenCalledWith('inline-script');
    });
  });
});