/**
 * 图工作流示例测试
 * 
 * 本文件包含图工作流示例的单元测试和集成测试
 */

import {
  createWorkflowGraph,
  createWorkflowEngine,
  ExecutionStrategy
} from '../engine/workflow-engine';

import {
  createStartNode,
  createLLMNode,
  createConditionNode,
  createTransformNode,
  createEndNode,
  NodeType,
  NodeStatus
} from '../entities/node';

import {
  createDirectEdge,
  createConditionalEdge,
  EdgeType,
  ConditionOperator
} from '../entities/edge';

import {
  createTimeoutTrigger,
  TriggerType,
  TriggerAction
} from '../entities/trigger';

import {
  createExecutionContext,
  generateExecutionId
} from '../engine/execution-context';

import {
  createTextAnalysisWorkflow,
  runTextAnalysisWorkflow
} from '../examples/text-analysis-workflow';

// ============================================================================
// 实体测试
// ============================================================================

describe('Node实体', () => {
  test('应该创建节点', () => {
    const node = createStartNode('test-node', '测试节点', {}, '测试描述');
    expect(node.id.toString()).toBe('test-node');
    expect(node.name).toBe('测试节点');
    expect(node.type).toBe(NodeType.START);
    expect(node.status).toBe(NodeStatus.PENDING);
    expect(node.description).toBe('测试描述');
  });

  test('应该更新节点状态', () => {
    const node = createLLMNode('test-node', 'LLM节点', { model: 'gpt-3.5' });
    expect(node.status).toBe(NodeStatus.PENDING);
    
    node.updateStatus(NodeStatus.RUNNING);
    expect(node.status).toBe(NodeStatus.RUNNING);
    
    node.updateStatus(NodeStatus.COMPLETED);
    expect(node.status).toBe(NodeStatus.COMPLETED);
  });

  test('应该获取输入Schema', () => {
    const node = createLLMNode('test-node', 'LLM节点', {});
    const schema = node.getInputSchema();
    expect(schema.type).toBe('object');
    expect(schema.properties).toBeDefined();
    expect(schema.properties.text).toBeDefined();
  });

  test('应该获取输出Schema', () => {
    const node = createLLMNode('test-node', 'LLM节点', {});
    const schema = node.getOutputSchema();
    expect(schema.type).toBe('object');
    expect(schema.properties).toBeDefined();
    expect(schema.properties.response).toBeDefined();
  });
});

describe('Edge实体', () => {
  test('应该创建直接边', () => {
    const edge = createDirectEdge('test-edge', 'node1', 'node2', 1);
    expect(edge.id.toString()).toBe('test-edge');
    expect(edge.type).toBe(EdgeType.DIRECT);
    expect(edge.fromNodeId).toBe('node1');
    expect(edge.toNodeId).toBe('node2');
    expect(edge.weight).toBe(1);
  });

  test('应该创建条件边', () => {
    const edge = createConditionalEdge(
      'test-edge',
      'node1',
      'node2',
      {
        expression: '{{value}} == true',
        operator: ConditionOperator.EQUALS,
        expectedValue: true
      },
      1
    );
    expect(edge.type).toBe(EdgeType.CONDITIONAL);
    expect(edge.condition).toBeDefined();
    expect(edge.condition?.expression).toBe('{{value}} == true');
  });

  test('应该评估直接边条件', async () => {
    const edge = createDirectEdge('test-edge', 'node1', 'node2');
    const context = createExecutionContext('test-workflow', 'test-exec');
    const result = await edge.evaluateCondition(context);
    expect(result).toBe(true);
  });

  test('应该评估条件边条件', async () => {
    const edge = createConditionalEdge(
      'test-edge',
      'node1',
      'node2',
      {
        expression: '{{value}} == true',
        operator: ConditionOperator.EQUALS,
        expectedValue: true
      }
    );
    const context = createExecutionContext('test-workflow', 'test-exec');
    context.setVariable('value', true);
    const result = await edge.evaluateCondition(context);
    expect(result).toBe(true);
  });
});

describe('Trigger实体', () => {
  test('应该创建超时触发器', () => {
    const trigger = createTimeoutTrigger('test-trigger', 30000, 'test-node');
    expect(trigger.type).toBe(TriggerType.TIME);
    expect(trigger.action).toBe(TriggerAction.SKIP_NODE);
    expect(trigger.targetNodeId).toBe('test-node');
  });

  test('应该启用和禁用触发器', () => {
    const trigger = createTimeoutTrigger('test-trigger', 30000);
    expect(trigger.status).toBe('enabled');
    
    trigger.disable();
    expect(trigger.status).toBe('disabled');
    
    trigger.enable();
    expect(trigger.status).toBe('enabled');
  });
});

// ============================================================================
// 执行上下文测试
// ============================================================================

describe('ExecutionContext', () => {
  test('应该创建执行上下文', () => {
    const context = createExecutionContext('test-workflow', 'test-exec');
    expect(context.workflowId).toBe('test-workflow');
    expect(context.executionId).toBe('test-exec');
  });

  test('应该设置和获取变量', () => {
    const context = createExecutionContext('test-workflow', 'test-exec');
    context.setVariable('test', 'value');
    expect(context.getVariable('test')).toBe('value');
  });

  test('应该设置和获取嵌套变量', () => {
    const context = createExecutionContext('test-workflow', 'test-exec');
    context.setVariable('node.result', 'success');
    expect(context.getVariable('node.result')).toBe('success');
  });

  test('应该获取所有数据', () => {
    const context = createExecutionContext('test-workflow', 'test-exec');
    context.setVariable('test', 'value');
    const data = context.getAllData();
    expect(data.test).toBe('value');
    expect(data.workflow).toBeDefined();
  });

  test('应该设置和获取节点结果', () => {
    const context = createExecutionContext('test-workflow', 'test-exec');
    const result = {
      success: true,
      data: { output: 'test' }
    };
    context.setNodeResult('test-node', result);
    const retrieved = context.getNodeResult('test-node');
    expect(retrieved).toEqual(result);
  });

  test('应该设置和获取事件', () => {
    const context = createExecutionContext('test-workflow', 'test-exec');
    const event = { type: 'test', data: 'value' };
    context.setRecentEvent('test-event', event);
    const retrieved = context.getRecentEvent('test-event');
    expect(retrieved).toEqual(event);
  });

  test('应该生成执行ID', () => {
    const id1 = generateExecutionId();
    const id2 = generateExecutionId();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^exec_\d+_[a-z0-9]+$/);
  });
});

// ============================================================================
// 工作流图测试
// ============================================================================

describe('WorkflowGraph', () => {
  test('应该创建工作流图', () => {
    const workflow = createWorkflowGraph('test-workflow');
    expect(workflow.id).toBe('test-workflow');
    expect(workflow.nodes.size).toBe(0);
    expect(workflow.edges.size).toBe(0);
  });

  test('应该添加节点', () => {
    const workflow = createWorkflowGraph('test-workflow');
    const node = createStartNode('node1', '节点1');
    workflow.addNode(node);
    expect(workflow.nodes.size).toBe(1);
    expect(workflow.getNode('node1')).toBe(node);
  });

  test('应该添加边', () => {
    const workflow = createWorkflowGraph('test-workflow');
    const edge = createDirectEdge('edge1', 'node1', 'node2');
    workflow.addEdge(edge);
    expect(workflow.edges.size).toBe(1);
  });

  test('应该获取从节点出发的边', () => {
    const workflow = createWorkflowGraph('test-workflow');
    workflow.addEdge(createDirectEdge('edge1', 'node1', 'node2'));
    workflow.addEdge(createDirectEdge('edge2', 'node1', 'node3'));
    const edges = workflow.getEdgesFrom('node1');
    expect(edges.length).toBe(2);
  });

  test('应该获取到达节点的边', () => {
    const workflow = createWorkflowGraph('test-workflow');
    workflow.addEdge(createDirectEdge('edge1', 'node1', 'node2'));
    workflow.addEdge(createDirectEdge('edge2', 'node3', 'node2'));
    const edges = workflow.getEdgesTo('node2');
    expect(edges.length).toBe(2);
  });

  test('应该获取就绪节点', () => {
    const workflow = createWorkflowGraph('test-workflow');
    workflow.addNode(createStartNode('node1', '节点1'));
    workflow.addNode(createLLMNode('node2', '节点2', {}));
    workflow.addEdge(createDirectEdge('edge1', 'node1', 'node2'));
    
    const readyNodes = workflow.getReadyNodes(new Set());
    expect(readyNodes.length).toBe(1);
    expect(readyNodes[0].id.toString()).toBe('node1');
  });

  test('应该检测循环依赖', () => {
    const workflow = createWorkflowGraph('test-workflow');
    workflow.addNode(createStartNode('node1', '节点1'));
    workflow.addNode(createLLMNode('node2', '节点2', {}));
    workflow.addEdge(createDirectEdge('edge1', 'node1', 'node2'));
    workflow.addEdge(createDirectEdge('edge2', 'node2', 'node1'));
    
    expect(workflow.hasCycle()).toBe(true);
  });

  test('应该进行拓扑排序', () => {
    const workflow = createWorkflowGraph('test-workflow');
    workflow.addNode(createStartNode('node1', '节点1'));
    workflow.addNode(createLLMNode('node2', '节点2', {}));
    workflow.addNode(createEndNode('node3', '节点3'));
    workflow.addEdge(createDirectEdge('edge1', 'node1', 'node2'));
    workflow.addEdge(createDirectEdge('edge2', 'node2', 'node3'));
    
    const order = workflow.getTopologicalOrder();
    expect(order).toEqual(['node1', 'node2', 'node3']);
  });
});

// ============================================================================
// 工作流执行引擎测试
// ============================================================================

describe('WorkflowEngine', () => {
  test('应该创建执行引擎', () => {
    const engine = createWorkflowEngine(ExecutionStrategy.SEQUENTIAL);
    expect(engine.getStatus()).toBe('pending');
  });

  test('应该执行简单工作流', async () => {
    const workflow = createWorkflowGraph('test-workflow');
    
    // 创建简单的工作流：开始 -> 结束
    const startNode = createStartNode('start', '开始');
    const endNode = createEndNode('end', '结束');
    
    workflow.addNode(startNode);
    workflow.addNode(endNode);
    workflow.addEdge(createDirectEdge('edge1', 'start', 'end'));
    
    const engine = createWorkflowEngine();
    const result = await engine.execute(workflow, { text: 'test' });
    
    expect(result.success).toBe(true);
    expect(result.metadata?.executedNodes).toContain('start');
    expect(result.metadata?.executedNodes).toContain('end');
  });

  test('应该执行带LLM节点的工作流', async () => {
    const workflow = createWorkflowGraph('test-workflow');
    
    const startNode = createStartNode('start', '开始');
    const llmNode = createLLMNode('llm', 'LLM节点', {
      prompt: '处理文本: {{input.text}}',
      model: 'gpt-3.5-turbo'
    });
    const endNode = createEndNode('end', '结束');
    
    workflow.addNode(startNode);
    workflow.addNode(llmNode);
    workflow.addNode(endNode);
    workflow.addEdge(createDirectEdge('edge1', 'start', 'llm'));
    workflow.addEdge(createDirectEdge('edge2', 'llm', 'end'));
    
    const engine = createWorkflowEngine();
    const result = await engine.execute(workflow, { text: '测试文本' });
    
    expect(result.success).toBe(true);
    expect(result.metadata?.executedNodes).toContain('llm');
  });

  test('应该执行带条件分支的工作流', async () => {
    const workflow = createWorkflowGraph('test-workflow');
    
    const startNode = createStartNode('start', '开始');
    const conditionNode = createConditionNode('condition', '条件判断', {
      condition: '{{input.value}} == true',
      data: { value: true }
    });
    const endNode = createEndNode('end', '结束');
    
    workflow.addNode(startNode);
    workflow.addNode(conditionNode);
    workflow.addNode(endNode);
    workflow.addEdge(createDirectEdge('edge1', 'start', 'condition'));
    workflow.addEdge(createConditionalEdge(
      'edge2',
      'condition',
      'end',
      {
        expression: '{{condition.data.result}} == true',
        operator: ConditionOperator.EQUALS,
        expectedValue: true
      }
    ));
    
    const engine = createWorkflowEngine();
    const result = await engine.execute(workflow, { value: true });
    
    expect(result.success).toBe(true);
  });

  test('应该暂停和恢复执行', async () => {
    const workflow = createWorkflowGraph('test-workflow');
    
    const startNode = createStartNode('start', '开始');
    const llmNode = createLLMNode('llm', 'LLM节点', {
      prompt: '处理文本',
      model: 'gpt-3.5-turbo'
    });
    const endNode = createEndNode('end', '结束');
    
    workflow.addNode(startNode);
    workflow.addNode(llmNode);
    workflow.addNode(endNode);
    workflow.addEdge(createDirectEdge('edge1', 'start', 'llm'));
    workflow.addEdge(createDirectEdge('edge2', 'llm', 'end'));
    
    const engine = createWorkflowEngine();
    
    // 在另一个线程中暂停
    setTimeout(() => engine.pause(), 50);
    setTimeout(() => engine.resume(), 150);
    
    const result = await engine.execute(workflow, { text: 'test' });
    
    expect(result.success).toBe(true);
  });

  test('应该停止执行', async () => {
    const workflow = createWorkflowGraph('test-workflow');
    
    const startNode = createStartNode('start', '开始');
    const llmNode = createLLMNode('llm', 'LLM节点', {
      prompt: '处理文本',
      model: 'gpt-3.5-turbo'
    });
    const endNode = createEndNode('end', '结束');
    
    workflow.addNode(startNode);
    workflow.addNode(llmNode);
    workflow.addNode(endNode);
    workflow.addEdge(createDirectEdge('edge1', 'start', 'llm'));
    workflow.addEdge(createDirectEdge('edge2', 'llm', 'end'));
    
    const engine = createWorkflowEngine();
    
    // 在另一个线程中停止
    setTimeout(() => engine.stop(), 50);
    
    const result = await engine.execute(workflow, { text: 'test' });
    
    expect(result.success).toBe(false);
    expect(engine.getStatus()).toBe('cancelled');
  });
});

// ============================================================================
// 文本分析工作流测试
// ============================================================================

describe('文本分析工作流', () => {
  test('应该创建文本分析工作流', () => {
    const workflow = createTextAnalysisWorkflow();
    expect(workflow.id).toBe('text-analysis-workflow');
    expect(workflow.nodes.size).toBeGreaterThan(0);
    expect(workflow.edges.size).toBeGreaterThan(0);
    expect(workflow.triggers.length).toBeGreaterThan(0);
  });

  test('应该执行文本分析工作流', async () => {
    const result = await runTextAnalysisWorkflow(
      '这是一条测试新闻文本。',
      ExecutionStrategy.SEQUENTIAL
    );
    
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    expect(result.metadata).toBeDefined();
  }, 10000);

  test('应该处理新闻文本', async () => {
    const result = await runTextAnalysisWorkflow(
      '北京时间2024年1月1日，新年庆祝活动在北京举行。',
      ExecutionStrategy.SEQUENTIAL
    );
    
    expect(result.success).toBe(true);
  }, 10000);

  test('应该处理评论文本', async () => {
    const result = await runTextAnalysisWorkflow(
      '这个产品真的太棒了！非常满意！',
      ExecutionStrategy.SEQUENTIAL
    );
    
    expect(result.success).toBe(true);
  }, 10000);

  test('应该处理问答文本', async () => {
    const result = await runTextAnalysisWorkflow(
      '问：什么是人工智能？答：人工智能是计算机科学的一个分支。',
      ExecutionStrategy.SEQUENTIAL
    );
    
    expect(result.success).toBe(true);
  }, 10000);
});