import { injectable } from 'inversify';
import { ExecutionContext } from '@domain/workflow/execution/execution-context.interface';
import { WorkflowExecutor } from '@domain/workflow/execution/workflow-executor.interface';
import { ExecutionStrategy } from './execution-strategy';

@injectable()
export class ConditionalStrategy extends ExecutionStrategy {
  async execute(context: ExecutionContext, workflowExecutor: WorkflowExecutor): Promise<any> {
    const workflow = context.getWorkflow();
    const executedNodes = new Set<string>();
    const nodeResults: Map<string, any> = new Map();

    // Find start nodes
    const startNodes = this.findStartNodes(workflow);

    if (startNodes.length === 0) {
      throw new Error('No start nodes found in workflow');
    }

    // Execute from start nodes with conditional branching
    for (const startNode of startNodes) {
      const result = await this.executeConditionalPath(
        startNode.id.value,
        context,
        workflowExecutor,
        executedNodes,
        nodeResults
      );

      // If this is the first execution, store as potential result
      if (nodeResults.size === 1) {
        context.setVariable('conditional_result', result);
      }
    }

    // Return the final result
    return context.getVariable('conditional_result');
  }

  private async executeConditionalPath(
    nodeId: string,
    context: ExecutionContext,
    workflowExecutor: WorkflowExecutor,
    executedNodes: Set<string>,
    nodeResults: Map<string, any>
  ): Promise<any> {
    const workflow = context.getWorkflow();

    // Execute current node if not already executed
    if (!executedNodes.has(nodeId)) {
      const canExecute = await this.canExecuteNode(nodeId, context, workflowExecutor);

      if (!canExecute) {
        throw new Error(`Cannot execute node ${nodeId}: prerequisites not met`);
      }

      const result = await this.executeNode(nodeId, context, workflowExecutor);
      executedNodes.add(nodeId);
      nodeResults.set(nodeId, result);
    }

    // Get outgoing edges
    const outgoingEdges = this.getOutgoingEdges(nodeId, context);

    // Filter and evaluate edges based on conditions
    const validEdges: string[] = [];

    for (const edgeId of outgoingEdges) {
      const canTraverse = await this.evaluateEdge(edgeId, context, workflowExecutor);

      if (canTraverse) {
        validEdges.push(edgeId);
      }
    }

    // Handle different branching scenarios
    if (validEdges.length === 0) {
      // No valid edges, end this path
      return nodeResults.get(nodeId);
    } else if (validEdges.length === 1) {
      // Single valid edge, continue down this path
      const workflow = context.getWorkflow();
      const edgeId = validEdges[0];
      if (edgeId === undefined) {
        return nodeResults.get(nodeId);
      }
      const edge = workflow.getGraph().edges.get(edgeId);

      if (edge) {
        return await this.executeConditionalPath(
          edge.toNodeId.value,
          context,
          workflowExecutor,
          executedNodes,
          nodeResults
        );
      }
    } else {
      // Multiple valid edges, handle based on branching strategy
      const branchingStrategy = this.determineBranchingStrategy(validEdges, context);

      switch (branchingStrategy) {
        case 'first':
          return await this.executeFirstValidEdge(
            validEdges,
            context,
            workflowExecutor,
            executedNodes,
            nodeResults
          );

        case 'all':
          return await this.executeAllValidEdges(
            validEdges,
            context,
            workflowExecutor,
            executedNodes,
            nodeResults
          );

        case 'parallel':
          return await this.executeValidEdgesInParallel(
            validEdges,
            context,
            workflowExecutor,
            executedNodes,
            nodeResults
          );

        case 'weighted':
          return await this.executeWeightedEdge(
            validEdges,
            context,
            workflowExecutor,
            executedNodes,
            nodeResults
          );

        default:
          return await this.executeFirstValidEdge(
            validEdges,
            context,
            workflowExecutor,
            executedNodes,
            nodeResults
          );
      }
    }

    return nodeResults.get(nodeId);
  }

  private determineBranchingStrategy(edgeIds: string[], context: ExecutionContext): string {
    // Check if branching strategy is specified in context
    const strategy = context.getVariable('branching_strategy');

    if (strategy && ['first', 'all', 'parallel', 'weighted'].includes(strategy)) {
      return strategy;
    }

    // Default strategy based on number of edges
    if (edgeIds.length === 1) {
      return 'first';
    } else if (edgeIds.length <= 3) {
      return 'parallel';
    } else {
      return 'first';
    }
  }

  private async executeFirstValidEdge(
    edgeIds: string[],
    context: ExecutionContext,
    workflowExecutor: WorkflowExecutor,
    executedNodes: Set<string>,
    nodeResults: Map<string, any>
  ): Promise<any> {
    const workflow = context.getWorkflow();
    const edgeId = edgeIds[0];
    if (edgeId === undefined) {
      return null;
    }
    const edge = workflow.getGraph().edges.get(edgeId);

    if (edge) {
      return await this.executeConditionalPath(
        edge.toNodeId.value,
        context,
        workflowExecutor,
        executedNodes,
        nodeResults
      );
    }

    return null;
  }

  private async executeAllValidEdges(
    edgeIds: string[],
    context: ExecutionContext,
    workflowExecutor: WorkflowExecutor,
    executedNodes: Set<string>,
    nodeResults: Map<string, any>
  ): Promise<any[]> {
    const results: any[] = [];

    for (const edgeId of edgeIds) {
      const workflow = context.getWorkflow();
      const edge = workflow.getGraph().edges.get(edgeId);

      if (edge) {
        const result = await this.executeConditionalPath(
          edge.toNodeId.value,
          context,
          workflowExecutor,
          executedNodes,
          nodeResults
        );
        results.push(result);
      }
    }

    return results;
  }

  private async executeValidEdgesInParallel(
    edgeIds: string[],
    context: ExecutionContext,
    workflowExecutor: WorkflowExecutor,
    executedNodes: Set<string>,
    nodeResults: Map<string, any>
  ): Promise<any[]> {
    const workflow = context.getWorkflow();

    // Create execution promises for all valid edges
    const edgePromises = edgeIds.map(async (edgeId) => {
      const edge = workflow.getGraph().edges.get(edgeId);

      if (edge) {
        return await this.executeConditionalPath(
          edge.toNodeId.value,
          context,
          workflowExecutor,
          new Set(executedNodes), // Create copy for parallel execution
          new Map(nodeResults) // Create copy for parallel execution
        );
      }

      return null;
    });

    // Execute all edges in parallel
    const results = await Promise.all(edgePromises);

    // Merge results back to main context
    for (let i = 0; i < edgeIds.length; i++) {
      const edgeId = edgeIds[i];
      const result = results[i];

      if (result !== null) {
        // Store result with edge identifier
        context.setVariable(`edge_result_${edgeId}`, result);
      }
    }

    return results.filter(r => r !== null);
  }

  private async executeWeightedEdge(
    edgeIds: string[],
    context: ExecutionContext,
    workflowExecutor: WorkflowExecutor,
    executedNodes: Set<string>,
    nodeResults: Map<string, any>
  ): Promise<any> {
    const workflow = context.getWorkflow();
    const weights: number[] = [];

    // Calculate weights for each edge
    for (const edgeId of edgeIds) {
      const edge = workflow.getGraph().edges.get(edgeId);

      if (edge && edge.weight) {
        weights.push(edge.weight);
      } else {
        weights.push(1); // Default weight
      }
    }

    // Select edge based on weights
    const selectedEdgeIndex = this.selectWeightedIndex(weights);
    const selectedEdgeId = edgeIds[selectedEdgeIndex];
    if (selectedEdgeId === undefined) {
      return null;
    }
    const selectedEdge = workflow.getGraph().edges.get(selectedEdgeId);

    if (selectedEdge) {
      return await this.executeConditionalPath(
        selectedEdge.toNodeId.value,
        context,
        workflowExecutor,
        executedNodes,
        nodeResults
      );
    }

    return null;
  }

  private selectWeightedIndex(weights: number[]): number {
    if (weights.length === 0) {
      return -1;
    }

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < weights.length; i++) {
      random -= weights[i]!;
      if (random <= 0) {
        return i;
      }
    }

    return weights.length - 1;
  }

  private findStartNodes(workflow: any): any[] {
    const startNodes: any[] = [];
    const nodesWithIncomingEdges = new Set<string>();

    // Find all nodes that have incoming edges
    for (const edge of workflow.getGraph().edges.values()) {
      nodesWithIncomingEdges.add(edge.toNodeId.value);
    }

    // Nodes without incoming edges are start nodes
    for (const node of workflow.getGraph().nodes.values()) {
      if (!nodesWithIncomingEdges.has(node.id.value)) {
        startNodes.push(node);
      }
    }

    return startNodes;
  }

  // Advanced conditional execution with custom logic
  async executeWithCustomLogic(
    context: ExecutionContext,
    workflowExecutor: WorkflowExecutor,
    customLogic: (edges: any[], context: ExecutionContext) => Promise<string[]>
  ): Promise<any> {
    const workflow = context.getWorkflow();
    const executedNodes = new Set<string>();
    const nodeResults: Map<string, any> = new Map();

    // Find start nodes
    const startNodes = this.findStartNodes(workflow);

    if (startNodes.length === 0) {
      throw new Error('No start nodes found in workflow');
    }

    // Execute from start nodes with custom branching logic
    for (const startNode of startNodes) {
      const result = await this.executeConditionalPathWithCustomLogic(
        startNode.id.value,
        context,
        workflowExecutor,
        executedNodes,
        nodeResults,
        customLogic
      );

      if (nodeResults.size === 1) {
        context.setVariable('conditional_result', result);
      }
    }

    return context.getVariable('conditional_result');
  }

  private async executeConditionalPathWithCustomLogic(
    nodeId: string,
    context: ExecutionContext,
    workflowExecutor: WorkflowExecutor,
    executedNodes: Set<string>,
    nodeResults: Map<string, any>,
    customLogic: (edges: any[], context: ExecutionContext) => Promise<string[]>
  ): Promise<any> {
    const workflow = context.getWorkflow();

    // Execute current node if not already executed
    if (!executedNodes.has(nodeId)) {
      const canExecute = await this.canExecuteNode(nodeId, context, workflowExecutor);

      if (!canExecute) {
        throw new Error(`Cannot execute node ${nodeId}: prerequisites not met`);
      }

      const result = await this.executeNode(nodeId, context, workflowExecutor);
      executedNodes.add(nodeId);
      nodeResults.set(nodeId, result);
    }

    // Get outgoing edges
    const outgoingEdges = this.getOutgoingEdges(nodeId, context);

    // Filter valid edges
    const validEdges: any[] = [];
    for (const edgeId of outgoingEdges) {
      const canTraverse = await this.evaluateEdge(edgeId, context, workflowExecutor);

      if (canTraverse) {
        validEdges.push(workflow.getGraph().edges.get(edgeId));
      }
    }

    // Apply custom logic to select edges
    const selectedEdgeIds = await customLogic(validEdges, context);

    // Execute selected edges
    if (selectedEdgeIds.length === 0) {
      return nodeResults.get(nodeId);
    } else if (selectedEdgeIds.length === 1) {
      const edgeId = selectedEdgeIds[0];
      if (edgeId === undefined) {
        return nodeResults.get(nodeId);
      }
      const edge = workflow.getGraph().edges.get(edgeId);
      if (edge) {
        return await this.executeConditionalPathWithCustomLogic(
          edge.toNodeId.value,
          context,
          workflowExecutor,
          executedNodes,
          nodeResults,
          customLogic
        );
      }
    } else {
      // Multiple edges selected, execute in parallel
      const edgePromises = selectedEdgeIds.map(async (edgeId) => {
        const edge = workflow.getGraph().edges.get(edgeId);
        if (edge) {
          return await this.executeConditionalPathWithCustomLogic(
            edge.toNodeId.value,
            context,
            workflowExecutor,
            new Set(executedNodes),
            new Map(nodeResults),
            customLogic
          );
        }
        return null;
      });

      const results = await Promise.all(edgePromises);
      return results.filter(r => r !== null);
    }

    return nodeResults.get(nodeId);
  }
}