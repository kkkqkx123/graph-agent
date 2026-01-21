/**
 * WorkflowBuilder 单元测试
 */

import { WorkflowBuilder } from '../workflow-builder';
import { NodeFactory } from '../nodes/node-factory';
import { ILogger } from '../../../domain/common';
import { Container } from 'inversify';
import { WorkflowConfigData } from '../config-parser';

describe('WorkflowBuilder', () => {
  let container: Container;
  let workflowBuilder: WorkflowBuilder;
  let mockLogger: ILogger;
  let mockNodeFactory: NodeFactory;

  beforeEach(() => {
    container = new Container();

    // 创建 mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    // 创建 mock node factory
    mockNodeFactory = {
      create: jest.fn(),
    } as any;

    container.bind('Logger').toConstantValue(mockLogger);
    container.bind('NodeFactory').toConstantValue(mockNodeFactory);
    container.bind(WorkflowBuilder).toSelf();

    workflowBuilder = container.get(WorkflowBuilder);
  });

  describe('build', () => {
    it('应该成功构建简单的工作流', async () => {
      const configData: WorkflowConfigData = {
        workflow: {
          name: '测试工作流',
          description: '这是一个测试工作流',
          nodes: [
            {
              id: 'start',
              type: 'start',
              name: '开始',
            },
            {
              id: 'end',
              type: 'end',
              name: '结束',
            },
          ],
          edges: [
            {
              from: 'start',
              to: 'end',
            },
          ],
        },
      };

      // Mock node factory 返回值
      const mockStartNode = {
        nodeId: { toString: () => 'start' },
      } as any;
      const mockEndNode = {
        nodeId: { toString: () => 'end' },
      } as any;

      (mockNodeFactory.create as jest.Mock)
        .mockReturnValueOnce(mockStartNode)
        .mockReturnValueOnce(mockEndNode);

      const workflow = await workflowBuilder.build(configData);

      expect(workflow).toBeDefined();
      expect(workflow.name).toBe('测试工作流');
      expect(workflow.description).toBe('这是一个测试工作流');
      expect(mockNodeFactory.create).toHaveBeenCalledTimes(2);
    });

    it('应该正确处理带标签的工作流', async () => {
      const configData = {
        workflow: {
          name: '测试工作流',
          tags: ['tag1', 'tag2', 'tag3'],
          nodes: [],
          edges: [],
        },
      };

      const workflow = await workflowBuilder.build(configData);

      expect(workflow.tags).toContain('tag1');
      expect(workflow.tags).toContain('tag2');
      expect(workflow.tags).toContain('tag3');
    });

    it('应该正确处理带元数据的工作流', async () => {
      const configData = {
        workflow: {
          name: '测试工作流',
          metadata: {
            key1: 'value1',
            key2: 'value2',
          },
          nodes: [],
          edges: [],
        },
      };

      const workflow = await workflowBuilder.build(configData);

      expect(workflow.metadata).toEqual({
        key1: 'value1',
        key2: 'value2',
      });
    });

    it('应该正确处理错误处理策略', async () => {
      const configData = {
        workflow: {
          name: '测试工作流',
          errorHandlingStrategy: 'stop_on_error',
          nodes: [],
          edges: [],
        },
      };

      const workflow = await workflowBuilder.build(configData);

      expect(workflow.metadata.errorHandlingStrategy).toBe('ErrorHandlingStrategy(stop_on_error)');
    });

    it('应该正确处理执行策略', async () => {
      const configData = {
        workflow: {
          name: '测试工作流',
          executionStrategy: 'parallel',
          nodes: [],
          edges: [],
        },
      };

      const workflow = await workflowBuilder.build(configData);

      expect(workflow.metadata.executionStrategy).toBe('ExecutionStrategy(parallel)');
    });
  });
});