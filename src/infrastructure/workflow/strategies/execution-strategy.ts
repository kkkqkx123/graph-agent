/**
 * 执行上下文接口
 */
export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
  getWorkflow: () => any;
  getVariable: (path: string) => any;
  setVariable: (path: string, value: any) => void;
}

/**
 * 工作流执行器接口
 */
export interface WorkflowExecutor {
  canExecuteNode(nodeId: string, context: ExecutionContext): Promise<boolean>;
  executeNode(nodeId: string, context: ExecutionContext): Promise<any>;
  evaluateEdge(edgeId: string, context: ExecutionContext): Promise<boolean>;
}

export abstract class ExecutionStrategy {
  abstract execute(context: ExecutionContext, workflowExecutor: WorkflowExecutor): Promise<any>;

  protected async executeNode(nodeId: string, context: ExecutionContext, workflowExecutor: WorkflowExecutor): Promise<any> {
    return workflowExecutor.executeNode(nodeId, context);
  }

  protected async evaluateEdge(edgeId: string, context: ExecutionContext, workflowExecutor: WorkflowExecutor): Promise<boolean> {
    return workflowExecutor.evaluateEdge(edgeId, context);
  }

  protected getOutgoingEdges(nodeId: string, context: ExecutionContext): string[] {
    const workflow = context.getWorkflow();
    const graph = workflow.getGraph();
    const outgoingEdges: string[] = [];

    for (const [edgeId, edge] of graph.edges.entries()) {
      if (edge.fromNodeId === nodeId) {
        outgoingEdges.push(edgeId);
      }
    }

    return outgoingEdges;
  }

  protected getIncomingEdges(nodeId: string, context: ExecutionContext): string[] {
    const workflow = context.getWorkflow();
    const graph = workflow.getGraph();
    const incomingEdges: string[] = [];

    for (const [edgeId, edge] of graph.edges.entries()) {
      if (edge.toNodeId === nodeId) {
        incomingEdges.push(edgeId);
      }
    }

    return incomingEdges;
  }

  protected async canExecuteNode(nodeId: string, context: ExecutionContext, workflowExecutor: WorkflowExecutor): Promise<boolean> {
    return workflowExecutor.canExecuteNode(nodeId, context);
  }
}