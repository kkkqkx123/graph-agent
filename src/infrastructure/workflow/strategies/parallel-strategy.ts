import { injectable } from 'inversify';
import { ExecutionContext } from '../engine/execution-context';
import { GraphExecutor } from '../engine/graph-executor';
import { ExecutionStrategy } from './execution-strategy';

@injectable()
export class ParallelStrategy extends ExecutionStrategy {
  async execute(context: ExecutionContext, graphExecutor: GraphExecutor): Promise<any> {
    const graph = context.getGraph();
    const executedNodes = new Set<string>();
    const nodeResults: Map<string, any> = new Map();
    const executionQueue: string[] = [];
    
    // Find initial executable nodes
    await this.updateExecutionQueue(graph, executedNodes, executionQueue, context, graphExecutor);
    
    // Execute nodes in parallel while there are nodes to execute
    while (executionQueue.length > 0) {
      // Get current batch of executable nodes
      const currentBatch = [...executionQueue];
      executionQueue.length = 0; // Clear queue
      
      // Execute current batch in parallel
      const batchPromises = currentBatch.map(async (nodeId) => {
        try {
          const result = await this.executeNode(nodeId, context, graphExecutor);
          executedNodes.add(nodeId);
          nodeResults.set(nodeId, result);
          return { nodeId, result, success: true };
        } catch (error) {
          return { nodeId, error, success: false };
        }
      });
      
      // Wait for all nodes in batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Check for errors
      const errors = batchResults.filter(r => !r.success);
      if (errors.length > 0) {
        const errorMessages = errors.map(e => `Node ${e.nodeId}: ${(e.error instanceof Error ? e.error.message : String(e.error))}`);
        throw new Error(`Parallel execution failed: ${errorMessages.join(', ')}`);
      }
      
      // Update queue with newly executable nodes
      await this.updateExecutionQueue(graph, executedNodes, executionQueue, context, graphExecutor);
    }
    
    // Return results from end nodes (nodes with no outgoing edges)
    const endNodes = this.findEndNodes(graph);
    const endResults: any[] = [];
    
    for (const endNode of endNodes) {
      if (executedNodes.has(endNode.id.value)) {
        endResults.push(nodeResults.get(endNode.id.value));
      }
    }
    
    // Return single result if only one end node, otherwise return array
    if (endResults.length === 1) {
      return endResults[0];
    } else if (endResults.length > 1) {
      return endResults;
    }
    
    // If no end nodes were executed, return the last result
    const lastNodeId = Array.from(executedNodes).pop();
    if (lastNodeId) {
      return nodeResults.get(lastNodeId);
    }
    
    return null;
  }

  private async updateExecutionQueue(
    graph: any,
    executedNodes: Set<string>,
    executionQueue: string[],
    context: ExecutionContext,
    graphExecutor: GraphExecutor
  ): Promise<void> {
    // Find all nodes that can be executed
    for (const [nodeId, node] of graph.nodes.entries()) {
      // Skip already executed nodes
      if (executedNodes.has(nodeId)) {
        continue;
      }
      
      // Skip nodes already in queue
      if (executionQueue.includes(nodeId)) {
        continue;
      }
      
      // Check if node can be executed (all incoming edges satisfied)
      const canExecute = await this.canExecuteNode(nodeId, context, graphExecutor);
      
      if (canExecute) {
        executionQueue.push(nodeId);
      }
    }
  }

  private findEndNodes(graph: any): any[] {
    const endNodes: any[] = [];
    const nodesWithOutgoingEdges = new Set<string>();
    
    // Find all nodes that have outgoing edges
    for (const edge of graph.edges.values()) {
      nodesWithOutgoingEdges.add(edge.sourceNodeId.value);
    }
    
    // Nodes without outgoing edges are end nodes
    for (const node of graph.nodes.values()) {
      if (!nodesWithOutgoingEdges.has(node.id.value)) {
        endNodes.push(node);
      }
    }
    
    return endNodes;
  }

  // Advanced parallel execution with dependency management
  async executeWithDependencies(context: ExecutionContext, graphExecutor: GraphExecutor): Promise<any> {
    const graph = context.getGraph();
    const dependencyMap = this.buildDependencyMap(graph);
    const executedNodes = new Set<string>();
    const nodeResults: Map<string, any> = new Map();
    
    // Execute nodes in dependency order, allowing parallel execution of independent nodes
    await this.executeWithDependencyMap(
      dependencyMap,
      executedNodes,
      nodeResults,
      context,
      graphExecutor
    );
    
    // Return results from end nodes
    const endNodes = this.findEndNodes(graph);
    const endResults: any[] = [];
    
    for (const endNode of endNodes) {
      if (executedNodes.has(endNode.id.value)) {
        endResults.push(nodeResults.get(endNode.id.value));
      }
    }
    
    return endResults.length === 1 ? endResults[0] : endResults;
  }

  private buildDependencyMap(graph: any): Map<string, string[]> {
    const dependencyMap = new Map<string, string[]>();
    
    // Initialize dependency map for all nodes
    for (const nodeId of graph.nodes.keys()) {
      dependencyMap.set(nodeId, []);
    }
    
    // Build dependencies based on edges
    for (const edge of graph.edges.values()) {
      const targetDeps = dependencyMap.get(edge.targetNodeId.value) || [];
      targetDeps.push(edge.sourceNodeId.value);
      dependencyMap.set(edge.targetNodeId.value, targetDeps);
    }
    
    return dependencyMap;
  }

  private async executeWithDependencyMap(
    dependencyMap: Map<string, string[]>,
    executedNodes: Set<string>,
    nodeResults: Map<string, any>,
    context: ExecutionContext,
    graphExecutor: GraphExecutor
  ): Promise<void> {
    let hasProgress = true;
    
    while (hasProgress) {
      hasProgress = false;
      const readyNodes: string[] = [];
      
      // Find nodes ready for execution (all dependencies satisfied)
      for (const [nodeId, dependencies] of dependencyMap.entries()) {
        if (executedNodes.has(nodeId)) {
          continue;
        }
        
        const allDepsExecuted = dependencies.every(dep => executedNodes.has(dep));
        if (allDepsExecuted) {
          readyNodes.push(nodeId);
        }
      }
      
      if (readyNodes.length === 0) {
        break; // No progress possible
      }
      
      // Execute ready nodes in parallel
      const executionPromises = readyNodes.map(async (nodeId) => {
        const result = await this.executeNode(nodeId, context, graphExecutor);
        executedNodes.add(nodeId);
        nodeResults.set(nodeId, result);
        return result;
      });
      
      await Promise.all(executionPromises);
      hasProgress = true;
    }
  }

  // Parallel execution with concurrency limit
  async executeWithConcurrencyLimit(
    context: ExecutionContext,
    graphExecutor: GraphExecutor,
    concurrencyLimit: number = 5
  ): Promise<any> {
    const graph = context.getGraph();
    const executedNodes = new Set<string>();
    const nodeResults: Map<string, any> = new Map();
    const executionQueue: string[] = [];
    const runningTasks = new Set<string>();
    
    // Find initial executable nodes
    await this.updateExecutionQueue(graph, executedNodes, executionQueue, context, graphExecutor);
    
    // Execute nodes with concurrency limit
    while (executionQueue.length > 0 || runningTasks.size > 0) {
      // Start new tasks up to concurrency limit
      while (executionQueue.length > 0 && runningTasks.size < concurrencyLimit) {
        const nodeId = executionQueue.shift()!;
        
        const task = this.executeNode(nodeId, context, graphExecutor)
          .then(result => {
            executedNodes.add(nodeId);
            nodeResults.set(nodeId, result);
            runningTasks.delete(nodeId);
            return { nodeId, result, success: true };
          })
          .catch(error => {
            runningTasks.delete(nodeId);
            return { nodeId, error, success: false };
          });
        
        runningTasks.add(nodeId);
        
        // Start the task without waiting
        task.catch(() => {}); // Prevent unhandled promise rejection
      }
      
      // Wait for at least one task to complete
      if (runningTasks.size > 0) {
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if (runningTasks.size < concurrencyLimit) {
              clearInterval(checkInterval);
              resolve(undefined);
            }
          }, 10);
        });
      }
      
      // Update queue with newly executable nodes
      await this.updateExecutionQueue(graph, executedNodes, executionQueue, context, graphExecutor);
    }
    
    // Return results from end nodes
    const endNodes = this.findEndNodes(graph);
    const endResults: any[] = [];
    
    for (const endNode of endNodes) {
      if (executedNodes.has(endNode.id.value)) {
        endResults.push(nodeResults.get(endNode.id.value));
      }
    }
    
    return endResults.length === 1 ? endResults[0] : endResults;
  }
}