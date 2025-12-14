import { injectable, inject } from 'inversify';
import { Graph } from '../../../../domain/workflow/submodules/graph/entities/graph';
import { Node } from '../../../../domain/workflow/submodules/graph/entities/node';
import { Edge } from '../../../../domain/workflow/submodules/graph/entities/edge';
import { NodeId } from '../../../../domain/workflow/submodules/graph/value-objects/node-id';
import { ExecutionContext } from './execution-context';
import { StateManager } from './state-manager';
import { NodeExecutorFactory } from '../nodes/factories/node-executor-factory';
import { ConditionEvaluator } from '../edges/evaluators/condition-evaluator';
import { ExecutionStrategy } from '../strategies/execution-strategy';
import { ParallelStrategy } from '../strategies/parallel-strategy';
import { SequentialStrategy } from '../strategies/sequential-strategy';

@injectable()
export class GraphExecutor {
  constructor(
    @inject('NodeExecutorFactory') private nodeExecutorFactory: NodeExecutorFactory,
    @inject('ConditionEvaluator') private conditionEvaluator: ConditionEvaluator,
    @inject('StateManager') private stateManager: StateManager
  ) {}

  async execute(graph: Graph, input: any): Promise<any> {
    // Create execution context
    const context = new ExecutionContext(graph, input);
    
    // Initialize state
    await this.stateManager.initialize(context);
    
    try {
      // Determine execution strategy
      const strategy = this.determineExecutionStrategy(graph);
      
      // Execute graph
      const result = await strategy.execute(context, this);
      
      // Save final state
      await this.stateManager.saveFinalState(context, result);
      
      return result;
    } catch (error) {
      // Save error state
      await this.stateManager.saveErrorState(context, error);
      throw error;
    }
  }

  async executeNode(node: Node, context: ExecutionContext): Promise<any> {
    // Get node executor
    const executor = this.nodeExecutorFactory.createExecutor(node.type);
    
    // Execute node
    const result = await executor.execute(node, context);
    
    // Update state
    await this.stateManager.updateNodeState(context, node.id, result);
    
    return result;
  }

  async evaluateEdge(edge: Edge, context: ExecutionContext): Promise<boolean> {
    // Evaluate condition
    const result = await this.conditionEvaluator.evaluate(edge, context);
    
    // Update state
    await this.stateManager.updateEdgeState(context, edge.id, result);
    
    return result;
  }

  private determineExecutionStrategy(graph: Graph): ExecutionStrategy {
    // Check if graph has parallel execution nodes
    const hasParallelNodes = this.hasParallelExecutionNodes(graph);
    
    if (hasParallelNodes) {
      return new ParallelStrategy();
    } else {
      return new SequentialStrategy();
    }
  }

  private hasParallelExecutionNodes(graph: Graph): boolean {
    // Check if any node has parallel execution configuration
    for (const node of graph.nodes.values()) {
      if (node.metadata.parallel === true) {
        return true;
      }
    }
    return false;
  }

  async getExecutableNodes(context: ExecutionContext): Promise<Node[]> {
    const graph = context.graph;
    const executedNodes = context.getExecutedNodes();
    const executableNodes: Node[] = [];

    for (const node of graph.nodes.values()) {
      // Skip already executed nodes
      if (executedNodes.has(node.id.value)) {
        continue;
      }

      // Check if all incoming edges conditions are satisfied
      const incomingEdges = this.getIncomingEdges(node, graph);
      let canExecute = true;

      for (const edge of incomingEdges) {
        // Skip if source node hasn't been executed
        if (!executedNodes.has(edge.sourceNodeId.value)) {
          canExecute = false;
          break;
        }

        // Evaluate edge condition
        const conditionResult = await this.evaluateEdge(edge, context);
        if (!conditionResult) {
          canExecute = false;
          break;
        }
      }

      if (canExecute) {
        executableNodes.push(node);
      }
    }

    return executableNodes;
  }

  private getIncomingEdges(node: Node, graph: Graph): Edge[] {
    const incomingEdges: Edge[] = [];
    
    for (const edge of graph.edges.values()) {
      if (edge.targetNodeId.value === node.id.value) {
        incomingEdges.push(edge);
      }
    }
    
    return incomingEdges;
  }

  private getOutgoingEdges(node: Node, graph: Graph): Edge[] {
    const outgoingEdges: Edge[] = [];
    
    for (const edge of graph.edges.values()) {
      if (edge.sourceNodeId.value === node.id.value) {
        outgoingEdges.push(edge);
      }
    }
    
    return outgoingEdges;
  }

  async isExecutionComplete(context: ExecutionContext): Promise<boolean> {
    const graph = context.graph;
    const executedNodes = context.getExecutedNodes();
    
    // Check if all nodes have been executed
    for (const node of graph.nodes.values()) {
      if (!executedNodes.has(node.id.value)) {
        // Check if node is still executable
        const executableNodes = await this.getExecutableNodes(context);
        if (executableNodes.some(n => n.id.value === node.id.value)) {
          return false;
        }
      }
    }
    
    return true;
  }

  async getExecutionPath(context: ExecutionContext): Promise<NodeId[]> {
    const graph = context.graph;
    const executedNodes = context.getExecutedNodes();
    const path: NodeId[] = [];
    
    // Find start nodes (nodes with no incoming edges)
    const startNodes = this.findStartNodes(graph);
    
    // Build execution path
    for (const startNode of startNodes) {
      await this.buildExecutionPath(startNode, graph, executedNodes, path, new Set());
    }
    
    return path;
  }

  private findStartNodes(graph: Graph): Node[] {
    const startNodes: Node[] = [];
    const nodesWithIncomingEdges = new Set<string>();
    
    // Find all nodes that have incoming edges
    for (const edge of graph.edges.values()) {
      nodesWithIncomingEdges.add(edge.targetNodeId.value);
    }
    
    // Nodes without incoming edges are start nodes
    for (const node of graph.nodes.values()) {
      if (!nodesWithIncomingEdges.has(node.id.value)) {
        startNodes.push(node);
      }
    }
    
    return startNodes;
  }

  private async buildExecutionPath(
    node: Node,
    graph: Graph,
    executedNodes: Set<string>,
    path: NodeId[],
    visited: Set<string>
  ): Promise<void> {
    // Avoid cycles
    if (visited.has(node.id.value)) {
      return;
    }
    
    visited.add(node.id.value);
    
    // Add node to path if it was executed
    if (executedNodes.has(node.id.value)) {
      path.push(node.id);
    }
    
    // Follow outgoing edges
    const outgoingEdges = this.getOutgoingEdges(node, graph);
    for (const edge of outgoingEdges) {
      const targetNode = graph.nodes.get(edge.targetNodeId.value);
      if (targetNode) {
        await this.buildExecutionPath(targetNode, graph, executedNodes, path, visited);
      }
    }
  }

  async validateGraph(graph: Graph): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Check if graph has nodes
    if (graph.nodes.size === 0) {
      errors.push('Graph must have at least one node');
    }
    
    // Check if all edges reference valid nodes
    for (const edge of graph.edges.values()) {
      if (!graph.nodes.has(edge.sourceNodeId.value)) {
        errors.push(`Edge references non-existent source node: ${edge.sourceNodeId.value}`);
      }
      
      if (!graph.nodes.has(edge.targetNodeId.value)) {
        errors.push(`Edge references non-existent target node: ${edge.targetNodeId.value}`);
      }
    }
    
    // Check for cycles
    const hasCycles = await this.detectCycles(graph);
    if (hasCycles) {
      errors.push('Graph contains cycles, which are not supported in sequential execution');
    }
    
    // Check for disconnected nodes
    const disconnectedNodes = this.findDisconnectedNodes(graph);
    if (disconnectedNodes.length > 0) {
      errors.push(`Graph has disconnected nodes: ${disconnectedNodes.map(n => n.id.value).join(', ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async detectCycles(graph: Graph): Promise<boolean> {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    for (const node of graph.nodes.values()) {
      if (await this.hasCycleDFS(node, graph, visited, recursionStack)) {
        return true;
      }
    }
    
    return false;
  }

  private async hasCycleDFS(
    node: Node,
    graph: Graph,
    visited: Set<string>,
    recursionStack: Set<string>
  ): Promise<boolean> {
    visited.add(node.id.value);
    recursionStack.add(node.id.value);
    
    const outgoingEdges = this.getOutgoingEdges(node, graph);
    for (const edge of outgoingEdges) {
      const targetNode = graph.nodes.get(edge.targetNodeId.value);
      if (!targetNode) continue;
      
      if (!visited.has(targetNode.id.value)) {
        if (await this.hasCycleDFS(targetNode, graph, visited, recursionStack)) {
          return true;
        }
      } else if (recursionStack.has(targetNode.id.value)) {
        return true;
      }
    }
    
    recursionStack.delete(node.id.value);
    return false;
  }

  private findDisconnectedNodes(graph: Graph): Node[] {
    if (graph.nodes.size === 0) {
      return [];
    }
    
    const visited = new Set<string>();
    const startNodes = this.findStartNodes(graph);
    
    // If no start nodes, pick any node as starting point
    const startNode = startNodes.length > 0 ? startNodes[0] : graph.nodes.values().next().value;
    
    // DFS to find all reachable nodes
    this.dfsVisit(startNode, graph, visited);
    
    // Nodes not visited are disconnected
    const disconnectedNodes: Node[] = [];
    for (const node of graph.nodes.values()) {
      if (!visited.has(node.id.value)) {
        disconnectedNodes.push(node);
      }
    }
    
    return disconnectedNodes;
  }

  private dfsVisit(node: Node, graph: Graph, visited: Set<string>): void {
    visited.add(node.id.value);
    
    const outgoingEdges = this.getOutgoingEdges(node, graph);
    for (const edge of outgoingEdges) {
      const targetNode = graph.nodes.get(edge.targetNodeId.value);
      if (targetNode && !visited.has(targetNode.id.value)) {
        this.dfsVisit(targetNode, graph, visited);
      }
    }
  }
}