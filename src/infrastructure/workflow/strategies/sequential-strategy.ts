import { injectable } from 'inversify';
import { ExecutionContext } from '@domain/workflow/execution/execution-context.interface';
import { WorkflowExecutor } from '@domain/workflow/execution/workflow-executor.interface';
import { ExecutionStrategy } from './execution-strategy';

@injectable()
export class SequentialStrategy extends ExecutionStrategy {
  async execute(context: ExecutionContext, workflowExecutor: any): Promise<any> {
    const workflow = context.getWorkflow();
    const executedNodes = new Set<string>();
    const nodeResults: Map<string, any> = new Map();

    // Find start nodes (nodes with no incoming edges)
    const startNodes = this.findStartNodes(workflow);

    if (startNodes.length === 0) {
      throw new Error('No start nodes found in workflow');
    }

    // Execute from each start node
    for (const startNode of startNodes) {
      const result = await this.executeFromNode(
        startNode.id.value,
        context,
        workflowExecutor,
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
    workflowExecutor: any,
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

    // Execute each outgoing edge's target node sequentially
    for (const edgeId of outgoingEdges) {
      const canTraverse = await this.evaluateEdge(edgeId, context, workflowExecutor);

      if (canTraverse) {
        const workflow = context.getWorkflow();
        const edge = workflow.edges.get(edgeId);

        if (edge) {
          const targetNodeId = edge.toNodeId.value;
          await this.executeFromNode(
            targetNodeId,
            context,
            workflowExecutor,
            executedNodes,
            nodeResults
          );
        }
      }
    }

    return nodeResults.get(nodeId);
  }

  private findStartNodes(workflow: any): any[] {
    const startNodes: any[] = [];
    const nodesWithIncomingEdges = new Set<string>();

    // Find all nodes that have incoming edges
    for (const edge of workflow.edges.values()) {
      nodesWithIncomingEdges.add(edge.toNodeId.value);
    }

    // Nodes without incoming edges are start nodes
    for (const node of workflow.nodes.values()) {
      if (!nodesWithIncomingEdges.has(node.id.value)) {
        startNodes.push(node);
      }
    }

    return startNodes;
  }
}