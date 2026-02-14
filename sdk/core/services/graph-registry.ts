/**
 * 图注册表
 * 管理预处理后的图
 */

import type { PreprocessedGraph, ID, WorkflowDefinition } from '@modular-agent/types';
import { processWorkflow, type ProcessOptions } from '../graph/workflow-processor';
import { WorkflowNotFoundError } from '@modular-agent/types';

/**
 * 图注册表类
 * 负责管理预处理后的图
 */
export class GraphRegistry {
  private graphs: Map<ID, PreprocessedGraph> = new Map();
  private workflowRegistry: any;
  private maxRecursionDepth: number;
  
  constructor(options: {
    workflowRegistry?: any;
    maxRecursionDepth?: number;
  } = {}) {
    this.workflowRegistry = options.workflowRegistry;
    this.maxRecursionDepth = options.maxRecursionDepth ?? 10;
  }
  
  /**
   * 设置工作流注册表
   * @param workflowRegistry 工作流注册表
   */
  setWorkflowRegistry(workflowRegistry: any): void {
    this.workflowRegistry = workflowRegistry;
  }
  
  /**
   * 注册预处理后的图
   * @param graph 预处理后的图
   */
  register(graph: PreprocessedGraph): void {
    this.graphs.set(graph.workflowId, graph);
  }
  
  /**
   * 获取预处理后的图
   * @param workflowId 工作流ID
   * @returns 预处理后的图，如果不存在则返回undefined
   */
  get(workflowId: ID): PreprocessedGraph | undefined {
    return this.graphs.get(workflowId);
  }
  
  /**
   * 检查图是否存在
   * @param workflowId 工作流ID
   * @returns 是否存在
   */
  has(workflowId: ID): boolean {
    return this.graphs.has(workflowId);
  }
  
  /**
   * 移除图
   * @param workflowId 工作流ID
   */
  unregister(workflowId: ID): void {
    this.graphs.delete(workflowId);
  }
  
  /**
   * 清空所有图
   */
  clear(): void {
    this.graphs.clear();
  }
  
  /**
   * 获取所有工作流ID
   * @returns 工作流ID数组
   */
  getAllWorkflowIds(): ID[] {
    return Array.from(this.graphs.keys());
  }
  
  /**
   * 获取图数量
   * @returns 图数量
   */
  size(): number {
    return this.graphs.size;
  }
  
  /**
   * 批量注册图
   * @param graphs 预处理后的图数组
   */
  registerBatch(graphs: PreprocessedGraph[]): void {
    for (const graph of graphs) {
      this.register(graph);
    }
  }
  
  /**
   * 批量移除图
   * @param workflowIds 工作流ID数组
   */
  unregisterBatch(workflowIds: ID[]): void {
    for (const workflowId of workflowIds) {
      this.unregister(workflowId);
    }
  }
  
  /**
   * 确保工作流已预处理（统一预处理入口）
   * @param workflowId 工作流ID
   * @returns 预处理后的图
   * @throws WorkflowNotFoundError 如果工作流不存在或预处理失败
   */
  async ensureProcessed(workflowId: string): Promise<PreprocessedGraph> {
    // 检查缓存
    let processedGraph = this.get(workflowId);
    if (processedGraph) return processedGraph;

    // 获取原始定义
    if (!this.workflowRegistry) {
      throw new WorkflowNotFoundError(
        'WorkflowRegistry not set in GraphRegistry',
        workflowId
      );
    }
    
    const workflow = this.workflowRegistry.get(workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(
        `Workflow with ID '${workflowId}' not found`,
        workflowId
      );
    }

    // 预处理（会递归处理所有子工作流）
    processedGraph = await this.preprocessAndStore(workflow);

    return processedGraph;
  }
  
  /**
   * 预处理工作流并存储
   * @param workflow 原始工作流定义
   * @returns 预处理后的图
   * @throws WorkflowNotFoundError 如果预处理失败
   */
  async preprocessAndStore(workflow: WorkflowDefinition): Promise<PreprocessedGraph> {
    // 检查是否已经预处理过
    const existing = this.get(workflow.id);
    if (existing) {
      return existing;
    }

    // 调用 processWorkflow 进行预处理
    const processOptions: ProcessOptions = {
      workflowRegistry: this.workflowRegistry,
      maxRecursionDepth: this.maxRecursionDepth,
      validate: true,
      computeTopologicalOrder: true,
      detectCycles: true,
      analyzeReachability: true,
    };

    const processedGraph = await processWorkflow(workflow, processOptions);

    // 缓存处理结果
    this.register(processedGraph);

    return processedGraph;
  }
}

/**
 * 全局单例实例
 */
export const graphRegistry = new GraphRegistry();