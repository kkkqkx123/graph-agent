/**
 * 工作流数据结构（WorkflowData）
 *
 * 设计说明：
 * - WorkflowData 是 WorkflowDefinition 接口的实现类
 * - 提供工作流的基本数据存储和查询功能
 * - 作为核心实体，放在 core/entities 目录
 *
 * 核心职责：
 * - 存储工作流的节点、边和配置
 * - 提供工作流的查询方法
 * - 作为无状态数据结构，不包含执行逻辑
 *
 * 使用场景：
 * - 工作流定义的表示
 * - 工作流注册和管理
 * - 工作流验证和分析
 *
 * 注意事项：
 * - WorkflowData 是无状态的数据结构，构建完成后不应被修改
 * - 工作流的执行逻辑由 ThreadExecutor 负责
 * - 运行时通过 WorkflowRegistry 管理，确保不可变性
 */

import type {
  WorkflowDefinition,
  Node,
  Edge,
  ID,
  Version,
  Timestamp,
  WorkflowTrigger,
  TriggerReference,
  WorkflowVariable,
  WorkflowConfig,
  WorkflowMetadata,
  WorkflowType,
  TriggeredSubworkflowConfig
} from '@modular-agent/types';
import { NodeData } from './node-data.js';
import { EdgeData } from './edge-data.js';

/**
 * 工作流数据结构类
 * 核心职责：存储和管理工作流的节点、边和配置
 * 不包含执行逻辑，仅提供基础的工作流操作
 */
export class WorkflowData implements WorkflowDefinition {
  /** 工作流唯一标识符 */
  public readonly id: ID;
  /** 工作流名称 */
  public readonly name: string;
  /** 工作流类型 */
  public readonly type: WorkflowType;
  /** 可选的工作流描述 */
  public readonly description?: string;
  /** 节点数组，定义工作流的所有节点 */
  public readonly nodes: Node[];
  /** 边数组，定义节点之间的连接关系 */
  public readonly edges: Edge[];
  /** 工作流变量定义数组 */
  public readonly variables?: WorkflowVariable[];
  /** 工作流触发器定义数组 */
  public readonly triggers?: (WorkflowTrigger | TriggerReference)[];
  /** 触发子工作流专用配置 */
  public readonly triggeredSubworkflowConfig?: TriggeredSubworkflowConfig;
  /** 可选的工作流配置 */
  public readonly config?: WorkflowConfig;
  /** 可选的元数据信息 */
  public readonly metadata?: WorkflowMetadata;
  /** 工作流版本号 */
  public readonly version: Version;
  /** 创建时间 */
  public readonly createdAt: Timestamp;
  /** 更新时间 */
  public readonly updatedAt: Timestamp;
  /** 可用工具配置 */
  public readonly availableTools?: {
    /** 初始可用工具集合 */
    initial: Set<string>;
  };

  constructor(data: WorkflowDefinition) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.description = data.description;
    this.nodes = data.nodes.map(node => node instanceof NodeData ? node : new NodeData(node));
    this.edges = data.edges.map(edge => edge instanceof EdgeData ? edge : new EdgeData(edge));
    this.variables = data.variables;
    this.triggers = data.triggers;
    this.triggeredSubworkflowConfig = data.triggeredSubworkflowConfig;
    this.config = data.config;
    this.metadata = data.metadata;
    this.version = data.version;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.availableTools = data.availableTools ? {
      initial: new Set(data.availableTools.initial)
    } : undefined;
  }

  /**
   * 根据ID获取节点
   */
  getNode(nodeId: ID): Node | undefined {
    return this.nodes.find(node => node.id === nodeId);
  }

  /**
   * 根据ID获取边
   */
  getEdge(edgeId: ID): Edge | undefined {
    return this.edges.find(edge => edge.id === edgeId);
  }

  /**
   * 获取指定节点的出边
   */
  getOutgoingEdges(nodeId: ID): Edge[] {
    return this.edges.filter(edge => edge.sourceNodeId === nodeId);
  }

  /**
   * 获取指定节点的入边
   */
  getIncomingEdges(nodeId: ID): Edge[] {
    return this.edges.filter(edge => edge.targetNodeId === nodeId);
  }

  /**
   * 获取指定节点的下一个节点
   */
  getNextNodes(nodeId: ID): Node[] {
    const outgoingEdges = this.getOutgoingEdges(nodeId);
    const nextNodeIds = outgoingEdges.map(edge => edge.targetNodeId);
    return this.nodes.filter(node => nextNodeIds.includes(node.id));
  }

  /**
   * 获取指定节点的上一个节点
   */
  getPreviousNodes(nodeId: ID): Node[] {
    const incomingEdges = this.getIncomingEdges(nodeId);
    const previousNodeIds = incomingEdges.map(edge => edge.sourceNodeId);
    return this.nodes.filter(node => previousNodeIds.includes(node.id));
  }

  /**
   * 获取起始节点
   */
  getStartNode(): Node | undefined {
    return this.nodes.find(node => node.type === 'START');
  }

  /**
   * 获取所有结束节点
   */
  getEndNodes(): Node[] {
    return this.nodes.filter(node => node.type === 'END');
  }

  /**
   * 获取指定类型的节点
   */
  getNodesByType(nodeType: string): Node[] {
    return this.nodes.filter(node => node.type === nodeType);
  }

  /**
   * 获取节点数量
   */
  getNodeCount(): number {
    return this.nodes.length;
  }

  /**
   * 获取边数量
   */
  getEdgeCount(): number {
    return this.edges.length;
  }

  /**
   * 检查是否包含指定节点
   */
  hasNode(nodeId: ID): boolean {
    return this.nodes.some(node => node.id === nodeId);
  }

  /**
   * 检查是否包含指定边
   */
  hasEdge(edgeId: ID): boolean {
    return this.edges.some(edge => edge.id === edgeId);
  }

  /**
   * 检查是否有触发器
   */
  hasTriggers(): boolean {
    return this.triggers !== undefined && this.triggers.length > 0;
  }

  /**
   * 检查是否有变量
   */
  hasVariables(): boolean {
    return this.variables !== undefined && this.variables.length > 0;
  }

  /**
   * 获取可用工具集合
   */
  getAvailableTools(): Set<string> {
    return this.availableTools?.initial ?? new Set();
  }

  /**
   * 检查是否有可用工具
   */
  hasAvailableTools(): boolean {
    return this.availableTools !== undefined && this.availableTools.initial.size > 0;
  }

  /**
   * 检查是否包含指定工具
   * @param toolId 工具ID
   * @returns 是否包含该工具
   */
  hasAvailableTool(toolId: string): boolean {
    return this.getAvailableTools().has(toolId);
  }

  /**
   * 获取指定名称的变量
   * @param variableName 变量名称
   * @returns 变量定义或undefined
   */
  getVariable(variableName: string): WorkflowVariable | undefined {
    return this.variables?.find(variable => variable.name === variableName);
  }

  /**
   * 检查是否包含指定变量
   * @param variableName 变量名称
   * @returns 是否包含该变量
   */
  hasVariable(variableName: string): boolean {
    return this.variables?.some(variable => variable.name === variableName) ?? false;
  }

  /**
   * 获取工作流配置
   * @returns 工作流配置或undefined
   */
  getWorkflowConfig(): WorkflowConfig | undefined {
    return this.config;
  }

  /**
   * 检查是否启用了检查点
   * @returns 是否启用检查点
   */
  isCheckpointsEnabled(): boolean {
    return this.config?.enableCheckpoints ?? false;
  }

  /**
   * 获取执行超时时间
   * @returns 超时时间（毫秒）或undefined
   */
  getTimeout(): number | undefined {
    return this.config?.timeout;
  }

  /**
   * 获取最大执行步数
   * @returns 最大步数或undefined
   */
  getMaxSteps(): number | undefined {
    return this.config?.maxSteps;
  }

  /**
   * 转换为纯对象
   */
  toJSON(): WorkflowDefinition {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      description: this.description,
      nodes: this.nodes.map(node => node instanceof NodeData ? node.toJSON() : node),
      edges: this.edges.map(edge => edge instanceof EdgeData ? edge.toJSON() : edge),
      variables: this.variables,
      triggers: this.triggers,
      triggeredSubworkflowConfig: this.triggeredSubworkflowConfig,
      config: this.config,
      metadata: this.metadata,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      availableTools: this.availableTools ? {
        initial: new Set(this.availableTools.initial)
      } : undefined
    };
  }
}