import { ExecutionContext } from '@domain/workflow/execution/execution-context.interface';
import { WorkflowExecutor } from '@domain/workflow/execution/workflow-executor.interface';

export abstract class ExecutionStrategy {
  abstract execute(context: ExecutionContext, workflowExecutor: WorkflowExecutor): Promise<any>;

  protected async executeNode(nodeId: string, context: ExecutionContext, workflowExecutor: WorkflowExecutor): Promise<any> {
    const workflow = context.getWorkflow();
    const node = workflow.getGraph().nodes.get(nodeId);

    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    return workflowExecutor.executeNode(node, context);
  }

  protected async evaluateEdge(edgeId: string, context: ExecutionContext, workflowExecutor: WorkflowExecutor): Promise<boolean> {
    const workflow = context.getWorkflow();
    const edge = workflow.getGraph().edges.get(edgeId);

    if (!edge) {
      throw new Error(`Edge not found: ${edgeId}`);
    }

    return workflowExecutor.evaluateEdge(edge, context);
  }

  protected getOutgoingEdges(nodeId: string, context: ExecutionContext): string[] {
    const workflow = context.getWorkflow();
    const outgoingEdges: string[] = [];

    for (const [edgeId, edge] of workflow.getGraph().edges.entries()) {
      if (edge.fromNodeId.value === nodeId) {
        outgoingEdges.push(edgeId);
      }
    }

    return outgoingEdges;
  }

  protected getIncomingEdges(nodeId: string, context: ExecutionContext): string[] {
    const workflow = context.getWorkflow();
    const incomingEdges: string[] = [];

    for (const [edgeId, edge] of workflow.getGraph().edges.entries()) {
      if (edge.toNodeId.value === nodeId) {
        incomingEdges.push(edgeId);
      }
    }

    return incomingEdges;
  }

  protected async canExecuteNode(nodeId: string, context: ExecutionContext, workflowExecutor: WorkflowExecutor): Promise<boolean> {
    const incomingEdges = this.getIncomingEdges(nodeId, context);

    // If no incoming edges, node can be executed
    if (incomingEdges.length === 0) {
      return true;
    }

    // Check all incoming edges
    for (const edgeId of incomingEdges) {
      const canTraverse = await this.evaluateEdge(edgeId, context, workflowExecutor);
      if (!canTraverse) {
        return false;
      }
    }

    return true;
  }
}