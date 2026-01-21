/**
 * WorkflowBuilder 类
 *
 * 提供流式 API 用于构建工作流配置
 * 支持链式调用，提供流畅的开发体验
 */

import type {
  WorkflowConfigData,
  NodeConfig,
  EdgeConfig,
} from '../types';

/**
 * WorkflowBuilder 类
 * 用于构建工作流配置的流式 API
 */
export class WorkflowBuilder {
  private config: Partial<WorkflowConfigData['workflow']>;
  private nodes: NodeConfig[];
  private edges: EdgeConfig[];

  private constructor(id: string) {
    this.config = {
      id,
      name: '未命名工作流',
      nodes: [],
      edges: [],
    };
    this.nodes = [];
    this.edges = [];
  }

  /**
   * 创建工作流构建器实例
   * @param id 工作流 ID
   * @returns WorkflowBuilder 实例
   */
  public static create(id: string): WorkflowBuilder {
    return new WorkflowBuilder(id);
  }

  /**
   * 设置工作流名称
   * @param name 工作流名称
   * @returns this
   */
  public name(name: string): WorkflowBuilder {
    this.config.name = name;
    return this;
  }

  /**
   * 设置工作流描述
   * @param description 工作流描述
   * @returns this
   */
  public description(description: string): WorkflowBuilder {
    this.config.description = description;
    return this;
  }

  /**
   * 设置工作流类型
   * @param type 工作流类型
   * @returns this
   */
  public type(type: string): WorkflowBuilder {
    this.config.type = type;
    return this;
  }

  /**
   * 设置工作流状态
   * @param status 工作流状态
   * @returns this
   */
  public status(status: string): WorkflowBuilder {
    this.config.status = status;
    return this;
  }

  /**
   * 添加节点到工作流
   * @param node 节点配置
   * @returns this
   */
  public addNode(node: NodeConfig): WorkflowBuilder {
    this.nodes.push(node);
    return this;
  }

  /**
   * 批量添加节点到工作流
   * @param nodes 节点配置数组
   * @returns this
   */
  public addNodes(...nodes: NodeConfig[]): WorkflowBuilder {
    this.nodes.push(...nodes);
    return this;
  }

  /**
   * 添加边到工作流
   * @param edge 边配置
   * @returns this
   */
  public addEdge(edge: EdgeConfig): WorkflowBuilder {
    this.edges.push(edge);
    return this;
  }

  /**
   * 批量添加边到工作流
   * @param edges 边配置数组
   * @returns this
   */
  public addEdges(...edges: EdgeConfig[]): WorkflowBuilder {
    this.edges.push(...edges);
    return this;
  }

  /**
   * 添加标签到工作流
   * @param tag 标签
   * @returns this
   */
  public addTag(tag: string): WorkflowBuilder {
    if (!this.config.tags) {
      this.config.tags = [];
    }
    this.config.tags.push(tag);
    return this;
  }

  /**
   * 批量添加标签到工作流
   * @param tags 标签数组
   * @returns this
   */
  public addTags(...tags: string[]): WorkflowBuilder {
    if (!this.config.tags) {
      this.config.tags = [];
    }
    this.config.tags.push(...tags);
    return this;
  }

  /**
   * 设置工作流元数据
   * @param metadata 元数据对象
   * @returns this
   */
  public metadata(metadata: Record<string, unknown>): WorkflowBuilder {
    this.config.metadata = metadata;
    return this;
  }

  /**
   * 合并元数据
   * @param metadata 要合并的元数据对象
   * @returns this
   */
  public mergeMetadata(metadata: Record<string, unknown>): WorkflowBuilder {
    this.config.metadata = {
      ...this.config.metadata,
      ...metadata,
    };
    return this;
  }

  /**
   * 设置工作流配置
   * @param config 配置对象
   * @returns this
   */
  public configData(config: Record<string, unknown>): WorkflowBuilder {
    this.config.config = config;
    return this;
  }

  /**
   * 设置错误处理策略
   * @param strategy 错误处理策略
   * @returns this
   */
  public errorHandlingStrategy(strategy: string): WorkflowBuilder {
    this.config.errorHandlingStrategy = strategy;
    return this;
  }

  /**
   * 设置执行策略
   * @param strategy 执行策略
   * @returns this
   */
  public executionStrategy(strategy: string): WorkflowBuilder {
    this.config.executionStrategy = strategy;
    return this;
  }

  /**
   * 构建最终的工作流配置对象
   * @returns WorkflowConfigData 对象
   */
  public build(): WorkflowConfigData {
    // 验证工作流配置
    this.validate();

    return {
      workflow: {
        ...this.config,
        nodes: this.nodes,
        edges: this.edges,
      } as WorkflowConfigData['workflow'],
    };
  }

  /**
   * 验证工作流配置
   * @throws Error 如果配置无效
   */
  private validate(): void {
    if (!this.config.name || this.config.name.trim() === '') {
      throw new Error('工作流名称不能为空');
    }

    if (this.nodes.length === 0) {
      throw new Error('工作流必须包含至少一个节点');
    }

    // 验证节点 ID 唯一性
    const nodeIds = new Set<string>();
    for (const node of this.nodes) {
      if (!node.id) {
        throw new Error('节点必须包含 ID');
      }
      if (nodeIds.has(node.id)) {
        throw new Error(`节点 ID 重复: ${node.id}`);
      }
      nodeIds.add(node.id);
    }

    // 验证边的引用
    for (const edge of this.edges) {
      if (!nodeIds.has(edge.from)) {
        throw new Error(`边引用了不存在的源节点: ${edge.from}`);
      }
      if (!nodeIds.has(edge.to)) {
        throw new Error(`边引用了不存在的目标节点: ${edge.to}`);
      }
    }
  }

  /**
   * 获取当前配置的节点数量
   * @returns 节点数量
   */
  public getNodeCount(): number {
    return this.nodes.length;
  }

  /**
   * 获取当前配置的边数量
   * @returns 边数量
   */
  public getEdgeCount(): number {
    return this.edges.length;
  }

  /**
   * 检查工作流是否包含指定节点
   * @param nodeId 节点 ID
   * @returns 是否包含
   */
  public hasNode(nodeId: string): boolean {
    return this.nodes.some(node => node.id === nodeId);
  }

  /**
   * 检查工作流是否包含指定边
   * @param from 源节点 ID
   * @param to 目标节点 ID
   * @returns 是否包含
   */
  public hasEdge(from: string, to: string): boolean {
    return this.edges.some(edge => edge.from === from && edge.to === to);
  }
}