import { inject } from 'inversify';
import { PromptContext } from '../../../domain/workflow/value-objects/context/prompt-context';
import { ContextProcessorService } from '../../../domain/workflow/services/context-processor-service.interface';
import { NodeContextTypeValue } from '../../../domain/workflow/value-objects/node/node-type';
import { TYPES } from '../../../di/service-keys';

/**
 * 执行上下文接口
 */
export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
  promptContext?: PromptContext;
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
  protected contextProcessorService: ContextProcessorService;

  constructor(@inject(TYPES.ContextProcessorService) contextProcessorService: ContextProcessorService) {
    this.contextProcessorService = contextProcessorService;
  }

  abstract execute(context: ExecutionContext, workflowExecutor: WorkflowExecutor): Promise<any>;

  /**
   * 执行节点（支持上下文过滤）
   */
  protected async executeNode(nodeId: string, context: ExecutionContext, workflowExecutor: WorkflowExecutor): Promise<any> {
    const workflow = context.getWorkflow();
    const node = workflow.getNode(nodeId);
    
    if (!node) {
      throw new Error(`节点 ${nodeId} 不存在`);
    }

    // 步骤1：应用边的上下文过滤器
    let filteredContext = this.applyEdgeFilters(context, nodeId, workflow);

    // 步骤2：应用节点的入站上下文过滤
    if (node.contextFilter) {
      filteredContext = node.filterIncomingContext(filteredContext);
    }

    // 步骤3：应用上下文处理器
    const contextType = node.type.getContextType();
    filteredContext = this.applyContextProcessor(filteredContext, contextType);

    // 步骤4：更新执行上下文
    const updatedExecutionContext = {
      ...context,
      promptContext: filteredContext
    };

    // 步骤5：执行节点逻辑
    const result = await workflowExecutor.executeNode(nodeId, updatedExecutionContext);

    // 步骤6：应用节点的出站上下文过滤
    let outgoingContext = filteredContext;
    if (node.contextFilter) {
      outgoingContext = node.filterOutgoingContext(filteredContext);
    }

    // 步骤7：更新上下文历史
    const updatedContext = outgoingContext.addHistoryEntry({
      nodeId,
      prompt: result.prompt || '',
      response: result.response || '',
      timestamp: new Date(),
      metadata: {
        nodeType: node.type.getValue(),
        contextType: contextType
      }
    });

    // 步骤8：更新执行上下文
    return {
      result,
      context: updatedContext
    };
  }

  /**
   * 评估边（支持上下文过滤）
   */
  protected async evaluateEdge(edgeId: string, context: ExecutionContext, workflowExecutor: WorkflowExecutor): Promise<boolean> {
    const workflow = context.getWorkflow();
    const edge = workflow.getEdge(edgeId);
    
    if (!edge) {
      throw new Error(`边 ${edgeId} 不存在`);
    }

    // 应用边的上下文过滤器
    const filteredContext = edge.filterContext(context.promptContext || PromptContext.create('', new Map()));

    // 更新执行上下文
    const updatedExecutionContext = {
      ...context,
      promptContext: filteredContext
    };

    // 调用原始的边评估逻辑
    return workflowExecutor.evaluateEdge(edgeId, updatedExecutionContext);
  }

  /**
   * 应用边的上下文过滤器
   */
  protected applyEdgeFilters(context: ExecutionContext, nodeId: string, workflow: any): PromptContext {
    const incomingEdges = workflow.getIncomingEdges(nodeId);
    let filteredContext = context.promptContext || PromptContext.create('', new Map());

    for (const edge of incomingEdges) {
      filteredContext = edge.filterContext(filteredContext);
    }

    return filteredContext;
  }

  /**
   * 应用上下文处理器
   */
  protected applyContextProcessor(context: PromptContext, contextType: NodeContextTypeValue): PromptContext {
    const processorName = this.getProcessorNameForContextType(contextType);

    if (processorName && this.contextProcessorService.has(processorName)) {
      return this.contextProcessorService.execute(processorName, context);
    }

    return context.clone();
  }

  /**
   * 根据上下文类型获取处理器名称
   */
  protected getProcessorNameForContextType(contextType: NodeContextTypeValue): string | null {
    switch (contextType) {
      case NodeContextTypeValue.LLM_CONTEXT:
        return 'llm_context';
      case NodeContextTypeValue.TOOL_CONTEXT:
        return 'tool_context';
      case NodeContextTypeValue.HUMAN_CONTEXT:
        return 'human_context';
      case NodeContextTypeValue.SYSTEM_CONTEXT:
        return 'system_context';
      case NodeContextTypeValue.PASS_THROUGH:
        return 'pass_through';
      case NodeContextTypeValue.ISOLATE:
        return 'isolate';
      default:
        return null;
    }
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