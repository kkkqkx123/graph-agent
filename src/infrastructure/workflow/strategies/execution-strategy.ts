import { ExecutionContext } from '../engine/execution-context';
import { GraphExecutor } from '../engine/graph-executor';

export abstract class ExecutionStrategy {
  abstract execute(context: ExecutionContext, graphExecutor: GraphExecutor): Promise<any>;
  
  protected async executeNode(nodeId: string, context: ExecutionContext, graphExecutor: GraphExecutor): Promise<any> {
    const graph = context.getGraph();
    const node = graph.nodes.get(nodeId);
    
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    
    return graphExecutor.executeNode(node, context);
  }
  
  protected async evaluateEdge(edgeId: string, context: ExecutionContext, graphExecutor: GraphExecutor): Promise<boolean> {
    const graph = context.getGraph();
    const edge = graph.edges.get(edgeId);
    
    if (!edge) {
      throw new Error(`Edge not found: ${edgeId}`);
    }
    
    return graphExecutor.evaluateEdge(edge, context);
  }
  
  protected getOutgoingEdges(nodeId: string, context: ExecutionContext): string[] {
    const graph = context.getGraph();
    const outgoingEdges: string[] = [];
    
    for (const [edgeId, edge] of graph.edges.entries()) {
      if (edge.fromNodeId.value === nodeId) {
        outgoingEdges.push(edgeId);
      }
    }
    
    return outgoingEdges;
  }
  
  protected getIncomingEdges(nodeId: string, context: ExecutionContext): string[] {
    const graph = context.getGraph();
    const incomingEdges: string[] = [];
    
    for (const [edgeId, edge] of graph.edges.entries()) {
      if (edge.toNodeId.value === nodeId) {
        incomingEdges.push(edgeId);
      }
    }
    
    return incomingEdges;
  }
  
  protected async canExecuteNode(nodeId: string, context: ExecutionContext, graphExecutor: GraphExecutor): Promise<boolean> {
    const incomingEdges = this.getIncomingEdges(nodeId, context);
    
    // If no incoming edges, node can be executed
    if (incomingEdges.length === 0) {
      return true;
    }
    
    // Check all incoming edges
    for (const edgeId of incomingEdges) {
      const canTraverse = await this.evaluateEdge(edgeId, context, graphExecutor);
      if (!canTraverse) {
        return false;
      }
    }
    
    return true;
  }
}