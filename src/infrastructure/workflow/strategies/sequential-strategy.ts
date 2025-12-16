import { injectable } from 'inversify';
import { ExecutionContext } from '../engine/execution-context';
import { ExecutionStrategy } from './execution-strategy';

@injectable()
export class SequentialStrategy extends ExecutionStrategy {
  async execute(context: ExecutionContext, graphExecutor: any): Promise<any> {
    const graph = context.getGraph();
    const executedNodes = new Set<string>();
    const nodeResults: Map<string, any> = new Map();
    
    // Find start nodes (nodes with no incoming edges)
    const startNodes = this.findStartNodes(graph);
    
    if (startNodes.length === 0) {
      throw new Error('No start nodes found in graph');
    }
    
    // Execute from each start node
    for (const startNode of startNodes) {
      const result = await this.executeFromNode(
        startNode.id.value,
        context,
        graphExecutor,
        executedNodes,
        nodeResults
      );
      
      // Store result if it's the first execution
      if (nodeResults.size === 1) {
        return result;
      }
    }
    
    // Return the last executed node's result
    const lastNodeId = Array.from(executedNodes).pop();
    if (lastNodeId) {
      return nodeResults.get(lastNodeId);
    }
    
    return null;
  }

  private async executeFromNode(
    nodeId: string,
    context: ExecutionContext,
    graphExecutor: any,
    executedNodes: Set<string>,
    nodeResults: Map<string, any>
  ): Promise<any> {
    const graph = context.getGraph();
    
    // Execute current node if not already executed
    if (!executedNodes.has(nodeId)) {
      const canExecute = await this.canExecuteNode(nodeId, context, graphExecutor);
      
      if (!canExecute) {
        throw new Error(`Cannot execute node ${nodeId}: prerequisites not met`);
      }
      
      const result = await this.executeNode(nodeId, context, graphExecutor);
      executedNodes.add(nodeId);
      nodeResults.set(nodeId, result);
    }
    
    // Get outgoing edges
    const outgoingEdges = this.getOutgoingEdges(nodeId, context);
    
    // Execute each outgoing edge's target node sequentially
    for (const edgeId of outgoingEdges) {
      const canTraverse = await this.evaluateEdge(edgeId, context, graphExecutor);
      
      if (canTraverse) {
        const graph = context.getGraph();
        const edge = graph.edges.get(edgeId);
        
        if (edge) {
          const targetNodeId = edge.toNodeId.value;
          await this.executeFromNode(
            targetNodeId,
            context,
            graphExecutor,
            executedNodes,
            nodeResults
          );
        }
      }
    }
    
    return nodeResults.get(nodeId);
  }

  private findStartNodes(graph: any): any[] {
    const startNodes: any[] = [];
    const nodesWithIncomingEdges = new Set<string>();
    
    // Find all nodes that have incoming edges
    for (const edge of graph.edges.values()) {
      nodesWithIncomingEdges.add(edge.toNodeId.value);
    }
    
    // Nodes without incoming edges are start nodes
    for (const node of graph.nodes.values()) {
      if (!nodesWithIncomingEdges.has(node.id.value)) {
        startNodes.push(node);
      }
    }
    
    return startNodes;
  }
}