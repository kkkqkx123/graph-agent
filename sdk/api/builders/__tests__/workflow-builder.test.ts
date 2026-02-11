/**
 * WorkflowBuilder 单元测试
 */

import { WorkflowBuilder } from '../workflow-builder';
import { NodeType } from '@modular-agent/types/node';

describe('WorkflowBuilder', () => {
  describe('创建工作流', () => {
    it('应该创建基本的工作流', () => {
      const workflow = WorkflowBuilder
        .create('test-workflow')
        .name('测试工作流')
        .description('这是一个测试工作流')
        .version('1.0.0')
        .build();

      expect(workflow.id).toBe('test-workflow');
      expect(workflow.name).toBe('测试工作流');
      expect(workflow.description).toBe('这是一个测试工作流');
      expect(workflow.version).toBe('1.0.0');
    });

    it('应该创建包含START和END节点的工作流', () => {
      const workflow = WorkflowBuilder
        .create('simple-workflow')
        .addStartNode('start')
        .addEndNode('end')
        .addEdge('start', 'end')
        .build();

      expect(workflow.nodes).toHaveLength(2);
      expect(workflow.nodes[0].type).toBe(NodeType.START);
      expect(workflow.nodes[1].type).toBe(NodeType.END);
      expect(workflow.edges).toHaveLength(1);
      expect(workflow.edges[0].sourceNodeId).toBe('start');
      expect(workflow.edges[0].targetNodeId).toBe('end');
    });
  });

  describe('添加节点', () => {
    it('应该添加LLM节点', () => {
      const workflow = WorkflowBuilder
        .create('llm-workflow')
        .addStartNode()
        .addLLMNode('llm1', 'gpt-4', '处理这个任务')
        .addEndNode()
        .addEdge('start', 'llm1')
        .addEdge('llm1', 'end')
        .build();

      const llmNode = workflow.nodes.find(n => n.id === 'llm1');
      expect(llmNode).toBeDefined();
      expect(llmNode?.type).toBe(NodeType.LLM);
      expect(llmNode?.config).toEqual({
        profileId: 'gpt-4',
        prompt: '处理这个任务'
      });
    });

    it('应该添加CODE节点', () => {
      const workflow = WorkflowBuilder
        .create('code-workflow')
        .addStartNode()
        .addCodeNode('code1', 'test-script', 'python', 'low')
        .addEndNode()
        .addEdge('start', 'code1')
        .addEdge('code1', 'end')
        .build();

      const codeNode = workflow.nodes.find(n => n.id === 'code1');
      expect(codeNode).toBeDefined();
      expect(codeNode?.type).toBe(NodeType.CODE);
      expect(codeNode?.config).toEqual({
        scriptName: 'test-script',
        scriptType: 'python',
        risk: 'low'
      });
    });

    it('应该添加VARIABLE节点', () => {
      const workflow = WorkflowBuilder
        .create('variable-workflow')
        .addStartNode()
        .addVariableNode('var1', 'counter', 'number', '{{counter}} + 1')
        .addEndNode()
        .addEdge('start', 'var1')
        .addEdge('var1', 'end')
        .build();

      const varNode = workflow.nodes.find(n => n.id === 'var1');
      expect(varNode).toBeDefined();
      expect(varNode?.type).toBe(NodeType.VARIABLE);
      expect(varNode?.config).toEqual({
        variableName: 'counter',
        variableType: 'number',
        expression: '{{counter}} + 1'
      });
    });

    it('应该添加ROUTE节点', () => {
      const workflow = WorkflowBuilder
        .create('route-workflow')
        .addStartNode()
        .addRouteNode('route1', [
          { condition: '{{status}} === "success"', targetNodeId: 'success' },
          { condition: '{{status}} === "failure"', targetNodeId: 'failure' }
        ], 'default')
        .addEndNode('success')
        .addEndNode('failure')
        .addEndNode('default')
        .addEdge('start', 'route1')
        .addEdge('route1', 'success')
        .addEdge('route1', 'failure')
        .addEdge('route1', 'default')
        .build();

      const routeNode = workflow.nodes.find(n => n.id === 'route1');
      expect(routeNode).toBeDefined();
      expect(routeNode?.type).toBe(NodeType.ROUTE);
      expect(routeNode?.config).toEqual({
        routes: [
          { condition: { expression: '{{status}} === "success"' }, targetNodeId: 'success' },
          { condition: { expression: '{{status}} === "failure"' }, targetNodeId: 'failure' }
        ],
        defaultTargetNodeId: 'default'
      });
    });
  });

  describe('添加变量', () => {
    it('应该添加工作流变量', () => {
      const workflow = WorkflowBuilder
        .create('variable-workflow')
        .addVariable('userName', 'string', {
          defaultValue: 'Alice',
          description: '用户名称',
          required: true
        })
        .addVariable('userAge', 'number', {
          defaultValue: 25,
          description: '用户年龄'
        })
        .addStartNode()
        .addEndNode()
        .addEdge('start', 'end')
        .build();

      expect(workflow.variables).toHaveLength(2);
      expect(workflow.variables![0]).toEqual({
        name: 'userName',
        type: 'string',
        defaultValue: 'Alice',
        description: '用户名称',
        required: true
      });
      expect(workflow.variables![1]).toEqual({
        name: 'userAge',
        type: 'number',
        defaultValue: 25,
        description: '用户年龄'
      });
    });
  });

  describe('添加边', () => {
    it('应该添加带条件的边', () => {
      const workflow = WorkflowBuilder
        .create('conditional-workflow')
        .addStartNode()
        .addEndNode('end1')
        .addEndNode('end2')
        .addEdge('start', 'end1', '{{condition}} === true')
        .addEdge('start', 'end2', '{{condition}} === false')
        .build();

      expect(workflow.edges).toHaveLength(2);
      expect(workflow.edges[0].condition).toBe('{{condition}} === true');
      expect(workflow.edges[1].condition).toBe('{{condition}} === false');
    });
  });

  describe('验证', () => {
    it('应该验证工作流必须有START节点', () => {
      expect(() => {
        WorkflowBuilder
          .create('invalid-workflow')
          .addEndNode()
          .build();
      }).toThrow('工作流必须有一个START节点');
    });

    it('应该验证工作流必须有END节点', () => {
      expect(() => {
        WorkflowBuilder
          .create('invalid-workflow')
          .addStartNode()
          .build();
      }).toThrow('工作流必须有一个END节点');
    });

    it('应该验证工作流只能有一个START节点', () => {
      expect(() => {
        WorkflowBuilder
          .create('invalid-workflow')
          .addStartNode('start1')
          .addStartNode('start2')
          .addEndNode()
          .build();
      }).toThrow('工作流只能有一个START节点');
    });

    it('应该验证工作流只能有一个END节点', () => {
      expect(() => {
        WorkflowBuilder
          .create('invalid-workflow')
          .addStartNode()
          .addEndNode('end1')
          .addEndNode('end2')
          .build();
      }).toThrow('工作流只能有一个END节点');
    });

    it('应该验证边的节点必须存在', () => {
      expect(() => {
        WorkflowBuilder
          .create('invalid-workflow')
          .addStartNode()
          .addEndNode()
          .addEdge('start', 'nonexistent')
          .build();
      }).toThrow('边的目标节点不存在: nonexistent');
    });
  });

  describe('链式调用', () => {
    it('应该支持完整的链式调用', () => {
      const workflow = WorkflowBuilder
        .create('chain-workflow')
        .name('链式调用测试')
        .description('测试链式调用')
        .version('2.0.0')
        .addVariable('input', 'string')
        .addVariable('output', 'string')
        .addStartNode()
        .addLLMNode('process', 'gpt-4', '处理输入')
        .addEndNode()
        .addEdge('start', 'process')
        .addEdge('process', 'end')
        .build();

      expect(workflow.name).toBe('链式调用测试');
      expect(workflow.description).toBe('测试链式调用');
      expect(workflow.version).toBe('2.0.0');
      expect(workflow.variables).toHaveLength(2);
      expect(workflow.nodes).toHaveLength(3);
      expect(workflow.edges).toHaveLength(2);
    });
  });
});