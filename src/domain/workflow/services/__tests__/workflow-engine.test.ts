import { WorkflowEngine } from '../workflow-engine';
import { StateManager } from '../state-manager';
import { HistoryManager } from '../history-manager';
import { CheckpointManager } from '../../../checkpoint/services/checkpoint-manager';
import { ConditionalRouter } from '../conditional-router';
import { ExpressionEvaluator } from '../expression-evaluator';
import { Workflow } from '../../entities/workflow';
import { NodeId, NodeType } from '../../value-objects/node';
import { EdgeId, EdgeType, EdgeValueObject } from '../../value-objects/edge';
import { ID } from '../../../common/value-objects';

// Mock NodeExecutor
class MockNodeExecutor implements import('../node-executor.interface').INodeExecutor {
  async execute(node: any, context: any): Promise<any> {
    return {
      success: true,
      output: { result: `executed-${node.nodeId.value}` },
      metadata: { executedAt: Date.now() }
    };
  }

  async canExecute(node: any, context: any): Promise<boolean> {
    return true;
  }

  getSupportedNodeTypes(): string[] {
    return ['llm', 'tool', 'code'];
  }
}

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;
  let stateManager: StateManager;
  let historyManager: HistoryManager;
  let checkpointManager: CheckpointManager;
  let router: ConditionalRouter;
  let evaluator: ExpressionEvaluator;
  let nodeExecutor: MockNodeExecutor;
  let workflow: Workflow;
  let threadId: string;
  let workflowId: ID;

  beforeEach(() => {
    evaluator = new ExpressionEvaluator();
    stateManager = new StateManager();
    historyManager = new HistoryManager();
    checkpointManager = new CheckpointManager(10, 100);
    router = new ConditionalRouter(evaluator);
    nodeExecutor = new MockNodeExecutor();
    engine = new WorkflowEngine(stateManager, historyManager, checkpointManager, router, nodeExecutor);

    workflowId = ID.generate();
    threadId = 'thread-1';

    // 创建测试工作流
    workflow = Workflow.create('test-workflow', 'Test workflow');
  });

  afterEach(() => {
    stateManager.clearAllStates();
    historyManager.clearAllHistories();
    checkpointManager.clearAllCheckpoints();
    router.clearRoutingHistory();
  });

  describe('execute', () => {
    it('应该成功执行简单的工作流', async () => {
      // 添加节点
      const startNodeId = NodeId.from('start');
      const endNodeId = NodeId.from('end');

      workflow.addNode({
        id: startNodeId.value,
        type: NodeType.start(),
        name: 'Start',
        properties: {}
      });

      workflow.addNode({
        id: endNodeId.value,
        type: NodeType.end(),
        name: 'End',
        properties: {}
      });

      // 添加边
      workflow.addEdge(
        EdgeId.from('edge-1'),
        EdgeType.sequence(),
        startNodeId,
        endNodeId,
        undefined,
        undefined,
        {},
        require('../../../domain/workflow/value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      );

      // 执行工作流
      const result = await engine.execute(workflow, threadId, { input: 'test' });

      expect(result.success).toBe(true);
      expect(result.executedNodes).toBe(1);
      expect(result.finalState.getData('input')).toBe('test');
    });

    it('应该支持条件路由', async () => {
      // 添加节点
      const startNodeId = NodeId.from('start');
      const branch1NodeId = NodeId.from('branch1');
      const branch2NodeId = NodeId.from('branch2');

      workflow.addNode({
        id: startNodeId.value,
        type: NodeType.start(),
        name: 'Start',
        properties: {}
      });

      workflow.addNode({
        id: branch1NodeId.value,
        type: NodeType.code(),
        name: 'Branch 1',
        properties: {}
      });

      workflow.addNode({
        id: branch2NodeId.value,
        type: NodeType.code(),
        name: 'Branch 2',
        properties: {}
      });

      // 添加条件边
      workflow.addEdge(
        EdgeId.from('edge-1'),
        EdgeType.conditional(),
        startNodeId,
        branch1NodeId,
        'state.value > 10',
        undefined,
        {},
        require('../../../domain/workflow/value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      );

      workflow.addEdge(
        EdgeId.from('edge-2'),
        EdgeType.conditional(),
        startNodeId,
        branch2NodeId,
        'state.value <= 10',
        undefined,
        {},
        require('../../../domain/workflow/value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      );

      // 执行工作流（应该走 branch1）
      const result1 = await engine.execute(workflow, threadId, { value: 20 });

      expect(result1.success).toBe(true);
      expect(result1.executedNodes).toBe(2); // start + branch1

      // 执行工作流（应该走 branch2）
      const result2 = await engine.execute(workflow, 'thread-2', { value: 5 });

      expect(result2.success).toBe(true);
      expect(result2.executedNodes).toBe(2); // start + branch2
    });

    it('应该创建检查点', async () => {
      const startNodeId = NodeId.from('start');
      const endNodeId = NodeId.from('end');

      workflow.addNode({
        id: startNodeId.value,
        type: NodeType.start(),
        name: 'Start',
        properties: {}
      });

      workflow.addNode({
        id: endNodeId.value,
        type: NodeType.end(),
        name: 'End',
        properties: {}
      });

      workflow.addEdge(
        EdgeId.from('edge-1'),
        EdgeType.sequence(),
        startNodeId,
        endNodeId,
        undefined,
        undefined,
        {},
        require('../../../domain/workflow/value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      );

      // 执行工作流（启用检查点）
      const result = await engine.execute(workflow, threadId, {}, {
        enableCheckpoints: true,
        checkpointInterval: 1
      });

      expect(result.success).toBe(true);
      expect(result.checkpointCount).toBeGreaterThan(0);
    });

    it('应该支持最大步数限制', async () => {
      const startNodeId = NodeId.from('start');
      const loopNodeId = NodeId.from('loop');

      workflow.addNode({
        id: startNodeId.value,
        type: NodeType.start(),
        name: 'Start',
        properties: {}
      });

      workflow.addNode({
        id: loopNodeId.value,
        type: NodeType.code(),
        name: 'Loop',
        properties: {}
      });

      // 添加循环边
      workflow.addEdge(
        EdgeId.from('edge-1'),
        EdgeType.sequence(),
        startNodeId,
        loopNodeId,
        undefined,
        undefined,
        {},
        require('../../../domain/workflow/value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      );

      workflow.addEdge(
        EdgeId.from('edge-2'),
        EdgeType.sequence(),
        loopNodeId,
        loopNodeId,
        undefined,
        undefined,
        {},
        require('../../../domain/workflow/value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      );

      // 执行工作流（限制最大步数）
      const result = await engine.execute(workflow, threadId, {}, {
        maxSteps: 5
      });

      expect(result.success).toBe(true);
      expect(result.executedNodes).toBeLessThanOrEqual(5);
    });

    it('应该支持执行超时', async () => {
      const startNodeId = NodeId.from('start');
      const slowNodeId = NodeId.from('slow');

      workflow.addNode({
        id: startNodeId.value,
        type: NodeType.start(),
        name: 'Start',
        properties: {}
      });

      workflow.addNode({
        id: slowNodeId.value,
        type: NodeType.code(),
        name: 'Slow',
        properties: {}
      });

      workflow.addEdge(
        EdgeId.from('edge-1'),
        EdgeType.sequence(),
        startNodeId,
        slowNodeId,
        undefined,
        undefined,
        {},
        require('../../../domain/workflow/value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      );

      // Mock 慢节点执行
      jest.spyOn(nodeExecutor, 'execute').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return { success: true, output: {} };
      });

      // 执行工作流（设置短超时）
      const result = await engine.execute(workflow, threadId, {}, {
        timeout: 100
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('超时');
    });

    it('应该处理节点执行失败', async () => {
      const startNodeId = NodeId.from('start');

      workflow.addNode({
        id: startNodeId.value,
        type: NodeType.start(),
        name: 'Start',
        properties: {}
      });

      // Mock 节点执行失败
      jest.spyOn(nodeExecutor, 'execute').mockRejectedValue(new Error('Node execution failed'));

      const result = await engine.execute(workflow, threadId, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Node execution failed');
    });
  });

  describe('resumeFromCheckpoint', () => {
    it('应该从检查点恢复执行', async () => {
      const startNodeId = NodeId.from('start');
      const middleNodeId = NodeId.from('middle');
      const endNodeId = NodeId.from('end');

      workflow.addNode({
        id: startNodeId.value,
        type: NodeType.start(),
        name: 'Start',
        properties: {}
      });

      workflow.addNode({
        id: middleNodeId.value,
        type: NodeType.code(),
        name: 'Middle',
        properties: {}
      });

      workflow.addNode({
        id: endNodeId.value,
        type: NodeType.end(),
        name: 'End',
        properties: {}
      });

      workflow.addEdge(
        EdgeId.from('edge-1'),
        EdgeType.sequence(),
        startNodeId,
        middleNodeId,
        undefined,
        undefined,
        {},
        require('../../../domain/workflow/value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      );

      workflow.addEdge(
        EdgeId.from('edge-2'),
        EdgeType.sequence(),
        middleNodeId,
        endNodeId,
        undefined,
        undefined,
        {},
        require('../../../domain/workflow/value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      );

      // 执行工作流并创建检查点
      await engine.execute(workflow, threadId, { step: 1 }, {
        enableCheckpoints: true,
        checkpointInterval: 1
      });

      // 获取检查点
      const checkpoints = checkpointManager.getThreadCheckpoints(threadId);
      expect(checkpoints.length).toBeGreaterThan(0);

      // 从检查点恢复
      const result = await engine.resumeFromCheckpoint(
        workflow,
        'thread-2',
        checkpoints[0].id
      );

      expect(result.success).toBe(true);
    });

    it('应该抛出错误对于不存在的检查点', async () => {
      await expect(
        engine.resumeFromCheckpoint(workflow, threadId, 'non-existent')
      ).rejects.toThrow('检查点 non-existent 不存在');
    });
  });
});