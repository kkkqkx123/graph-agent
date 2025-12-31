import { ConditionalRouter } from '../conditional-router';
import { ExpressionEvaluator } from '../expression-evaluator';
import { EdgeValueObject } from '../../value-objects/edge/edge-value-object';
import { EdgeId, EdgeType } from '../../value-objects/edge';
import { NodeId } from '../../value-objects/node';
import { WorkflowState } from '../../value-objects/workflow-state';
import { ID } from '../../../common/value-objects';

describe('ConditionalRouter', () => {
  let router: ConditionalRouter;
  let evaluator: ExpressionEvaluator;
  let state: WorkflowState;
  let workflowId: ID;
  let nodeId1: NodeId;
  let nodeId2: NodeId;
  let nodeId3: NodeId;

  beforeEach(() => {
    evaluator = new ExpressionEvaluator();
    router = new ConditionalRouter(evaluator);
    workflowId = ID.generate();
    state = WorkflowState.initial(workflowId);
    nodeId1 = NodeId.from('node-1');
    nodeId2 = NodeId.from('node-2');
    nodeId3 = NodeId.from('node-3');
  });

  afterEach(() => {
    router.clearRoutingHistory();
  });

  describe('route', () => {
    it('应该路由到无条件边', async () => {
      const edge = EdgeValueObject.create({
        id: EdgeId.from('edge-1'),
        type: EdgeType.sequence(),
        fromNodeId: nodeId1,
        toNodeId: nodeId2,
        properties: {},
        contextFilter: require('../../value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      });

      const result = await router.route([edge], state);

      expect(result).not.toBeNull();
      expect(result?.targetNodeId).toBe('node-2');
      expect(result?.edgeId).toBe('edge-1');
    });

    it('应该路由到条件为真的边', async () => {
      const edge = EdgeValueObject.create({
        id: EdgeId.from('edge-1'),
        type: EdgeType.conditional(),
        fromNodeId: nodeId1,
        toNodeId: nodeId2,
        condition: 'state.value > 10',
        properties: {},
        contextFilter: require('../../value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      });

      const updatedState = state.updateStateData(state, { value: 20 });
      const result = await router.route([edge], updatedState);

      expect(result).not.toBeNull();
      expect(result?.targetNodeId).toBe('node-2');
      expect(result?.conditionResult).toBe(true);
    });

    it('不应该路由到条件为假的边', async () => {
      const edge = EdgeValueObject.create({
        id: EdgeId.from('edge-1'),
        type: EdgeType.conditional(),
        fromNodeId: nodeId1,
        toNodeId: nodeId2,
        condition: 'state.value > 10',
        properties: {},
        contextFilter: require('../../value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      });

      const updatedState = state.updateStateData(state, { value: 5 });
      const result = await router.route([edge], updatedState);

      expect(result).toBeNull();
    });

    it('应该支持复杂条件表达式', async () => {
      const edge = EdgeValueObject.create({
        id: EdgeId.from('edge-1'),
        type: EdgeType.conditional(),
        fromNodeId: nodeId1,
        toNodeId: nodeId2,
        condition: 'state.errors.length > 0 && state.retryCount < 3',
        properties: {},
        contextFilter: require('../../value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      });

      const updatedState = state.updateStateData(state, {
        errors: [{ message: 'error1' }],
        retryCount: 2
      });
      const result = await router.route([edge], updatedState);

      expect(result).not.toBeNull();
      expect(result?.conditionResult).toBe(true);
    });

    it('应该按顺序评估边，返回第一个匹配的边', async () => {
      const edge1 = EdgeValueObject.create({
        id: EdgeId.from('edge-1'),
        type: EdgeType.conditional(),
        fromNodeId: nodeId1,
        toNodeId: nodeId2,
        condition: 'state.value == 1',
        properties: {},
        contextFilter: require('../../value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      });

      const edge2 = EdgeValueObject.create({
        id: EdgeId.from('edge-2'),
        type: EdgeType.conditional(),
        fromNodeId: nodeId1,
        toNodeId: nodeId3,
        condition: 'state.value == 2',
        properties: {},
        contextFilter: require('../../value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      });

      const updatedState = state.updateStateData(state, { value: 1 });
      const result = await router.route([edge1, edge2], updatedState);

      expect(result?.targetNodeId).toBe('node-2');
    });

    it('应该使用默认边当没有匹配的边时', async () => {
      const edge1 = EdgeValueObject.create({
        id: EdgeId.from('edge-1'),
        type: EdgeType.conditional(),
        fromNodeId: nodeId1,
        toNodeId: nodeId2,
        condition: 'state.value == 1',
        properties: {},
        contextFilter: require('../../value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      });

      const edge2 = EdgeValueObject.create({
        id: EdgeId.from('edge-2'),
        type: EdgeType.default(),
        fromNodeId: nodeId1,
        toNodeId: nodeId3,
        properties: {},
        contextFilter: require('../../value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      });

      const updatedState = state.updateStateData(state, { value: 2 });
      const result = await router.route([edge1, edge2], updatedState, { useDefaultEdge: true });

      expect(result?.targetNodeId).toBe('node-3');
      expect(result?.metadata?.isDefault).toBe(true);
    });

    it('应该支持自定义上下文', async () => {
      const edge = EdgeValueObject.create({
        id: EdgeId.from('edge-1'),
        type: EdgeType.conditional(),
        fromNodeId: nodeId1,
        toNodeId: nodeId2,
        condition: 'custom.value > 10',
        properties: {},
        contextFilter: require('../../value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      });

      const result = await router.route([edge], state, {
        customContext: { custom: { value: 20 } }
      });

      expect(result).not.toBeNull();
      expect(result?.conditionResult).toBe(true);
    });

    it('应该记录路由历史', async () => {
      const edge = EdgeValueObject.create({
        id: EdgeId.from('edge-1'),
        type: EdgeType.conditional(),
        fromNodeId: nodeId1,
        toNodeId: nodeId2,
        condition: 'state.value > 10',
        properties: {},
        contextFilter: require('../../value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      });

      const updatedState = state.updateStateData(state, { value: 20 });
      await router.route([edge], updatedState, { recordHistory: true });

      const history = router.getRoutingHistory(workflowId.value);
      expect(history).toHaveLength(1);
      expect(history[0].targetNodeId).toBe('node-2');
    });
  });

  describe('routeMultiple', () => {
    it('应该返回所有匹配的边', async () => {
      const edge1 = EdgeValueObject.create({
        id: EdgeId.from('edge-1'),
        type: EdgeType.conditional(),
        fromNodeId: nodeId1,
        toNodeId: nodeId2,
        condition: 'state.value > 5',
        properties: {},
        contextFilter: require('../../value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      });

      const edge2 = EdgeValueObject.create({
        id: EdgeId.from('edge-2'),
        type: EdgeType.conditional(),
        fromNodeId: nodeId1,
        toNodeId: nodeId3,
        condition: 'state.value < 20',
        properties: {},
        contextFilter: require('../../value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      });

      const updatedState = state.updateStateData(state, { value: 10 });
      const results = await router.routeMultiple([edge1, edge2], updatedState);

      expect(results).toHaveLength(2);
      expect(results[0].targetNodeId).toBe('node-2');
      expect(results[1].targetNodeId).toBe('node-3');
    });

    it('应该返回空数组当没有匹配的边时', async () => {
      const edge = EdgeValueObject.create({
        id: EdgeId.from('edge-1'),
        type: EdgeType.conditional(),
        fromNodeId: nodeId1,
        toNodeId: nodeId2,
        condition: 'state.value > 100',
        properties: {},
        contextFilter: require('../../value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      });

      const updatedState = state.updateStateData(state, { value: 10 });
      const results = await router.routeMultiple([edge], updatedState);

      expect(results).toHaveLength(0);
    });
  });

  describe('getRoutingHistory', () => {
    it('应该返回路由历史', async () => {
      const edge = EdgeValueObject.create({
        id: EdgeId.from('edge-1'),
        type: EdgeType.conditional(),
        fromNodeId: nodeId1,
        toNodeId: nodeId2,
        condition: 'state.value > 10',
        properties: {},
        contextFilter: require('../../value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      });

      const updatedState = state.updateStateData(state, { value: 20 });
      await router.route([edge], updatedState, { recordHistory: true });

      const history = router.getRoutingHistory(workflowId.value);
      expect(history).toHaveLength(1);
    });

    it('应该返回空数组对于没有历史的路由', () => {
      const history = router.getRoutingHistory('non-existent');
      expect(history).toEqual([]);
    });
  });

  describe('clearRoutingHistory', () => {
    it('应该清除指定工作流的路由历史', async () => {
      const edge = EdgeValueObject.create({
        id: EdgeId.from('edge-1'),
        type: EdgeType.conditional(),
        fromNodeId: nodeId1,
        toNodeId: nodeId2,
        condition: 'state.value > 10',
        properties: {},
        contextFilter: require('../../value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      });

      const updatedState = state.updateStateData(state, { value: 20 });
      await router.route([edge], updatedState, { recordHistory: true });

      router.clearRoutingHistory(workflowId.value);

      const history = router.getRoutingHistory(workflowId.value);
      expect(history).toHaveLength(0);
    });

    it('应该清除所有路由历史', async () => {
      const edge = EdgeValueObject.create({
        id: EdgeId.from('edge-1'),
        type: EdgeType.conditional(),
        fromNodeId: nodeId1,
        toNodeId: nodeId2,
        condition: 'state.value > 10',
        properties: {},
        contextFilter: require('../../value-objects/context/edge-context-filter').EdgeContextFilter.passAll()
      });

      const updatedState = state.updateStateData(state, { value: 20 });
      await router.route([edge], updatedState, { recordHistory: true });

      router.clearRoutingHistory();

      const history = router.getRoutingHistory(workflowId.value);
      expect(history).toHaveLength(0);
    });
  });
});