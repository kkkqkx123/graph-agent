import { NodeId } from './node-id';

/**
 * 标记节点类型
 * 
 * 标记节点是特殊的节点，它们不执行实际的业务逻辑，
 * 只是标记工作流中的某个位置，并触发相应的服务。
 * 
 * 标记节点在合并或执行时会被处理，不会作为真正的执行节点运行。
 */
export enum MarkerNodeType {
  /** 并行分支开始标记 */
  FORK = 'fork',
  /** 并行分支合并标记 */
  JOIN = 'join',
  /** 子工作流引用标记 */
  SUBWORKFLOW = 'subworkflow',
  /** 循环开始标记 */
  LOOP_START = 'loop_start',
  /** 循环结束标记 */
  LOOP_END = 'loop_end',
}

/**
 * 分支配置接口
 */
export interface BranchConfig {
  /** 分支ID */
  branchId: string;
  /** 目标节点ID */
  targetNodeId: string;
  /** 分支名称 */
  name?: string;
  /** 分支条件（可选，由ConditionNode处理） */
  condition?: string;
  /** 分支权重（可选，由ThreadFork处理） */
  weight?: number;
}

/**
 * 子工作流配置接口
 */
export interface SubWorkflowConfig {
  /** 引用ID */
  referenceId: string;
  /** 工作流ID */
  workflowId: string;
  /** 版本 */
  version?: string;
  /** 输入映射 */
  inputMapping?: Record<string, string>;
  /** 输出映射 */
  outputMapping?: Record<string, string>;
}

/**
 * 循环配置接口
 */
export interface LoopConfig {
  /** 最大迭代次数 */
  maxIterations?: number;
  /** 迭代变量名 */
  iterateVariable?: string;
  /** 迭代集合 */
  iterateCollection?: string;
}

/**
 * 标记节点值对象
 * 
 * 标记节点是工作流中的特殊节点，用于标记某个位置并触发相应的服务。
 * 标记节点不执行实际的业务逻辑，只负责：
 * 1. 标记工作流中的某个位置
 * 2. 存储必要的配置信息
 * 3. 触发相应的服务
 * 
 * 标记节点与普通节点的区别：
 * - 标记节点是值对象，不可变，没有身份标识
 * - 标记节点不执行业务逻辑，只负责标记和触发
 * - 标记节点在合并或执行时会被处理，不会作为真正的执行节点运行
 * - 标记节点的配置由相应的服务处理
 * 
 * 使用场景：
 * - ForkNode: 标记并行分支的开始，触发ThreadFork服务
 * - JoinNode: 标记并行分支的合并，触发ThreadJoin服务
 * - SubWorkflowNode: 标记子工作流的引用，触发WorkflowMerger服务
 * - LoopStartNode: 标记循环的开始，触发LoopExecution服务
 * - LoopEndNode: 标记循环的结束，触发LoopExecution服务
 */
export class MarkerNode {
  private readonly _id: NodeId;
  private readonly _type: MarkerNodeType;
  private readonly _name: string;
  private readonly _description: string;
  private readonly _config: Record<string, any>;

  private constructor(
    id: NodeId,
    type: MarkerNodeType,
    name: string,
    description: string,
    config: Record<string, any>
  ) {
    this._id = id;
    this._type = type;
    this._name = name;
    this._description = description;
    this._config = { ...config };
  }

  /**
   * 获取节点ID
   */
  get id(): NodeId {
    return this._id;
  }

  /**
   * 获取标记节点类型
   */
  get type(): MarkerNodeType {
    return this._type;
  }

  /**
   * 获取节点名称
   */
  get name(): string {
    return this._name;
  }

  /**
   * 获取节点描述
   */
  get description(): string {
    return this._description;
  }

  /**
   * 获取配置
   */
  get config(): Record<string, any> {
    return { ...this._config };
  }

  /**
   * 判断是否为Fork标记节点
   */
  isFork(): boolean {
    return this._type === MarkerNodeType.FORK;
  }

  /**
   * 判断是否为Join标记节点
   */
  isJoin(): boolean {
    return this._type === MarkerNodeType.JOIN;
  }

  /**
   * 判断是否为SubWorkflow标记节点
   */
  isSubWorkflow(): boolean {
    return this._type === MarkerNodeType.SUBWORKFLOW;
  }

  /**
   * 判断是否为LoopStart标记节点
   */
  isLoopStart(): boolean {
    return this._type === MarkerNodeType.LOOP_START;
  }

  /**
   * 判断是否为LoopEnd标记节点
   */
  isLoopEnd(): boolean {
    return this._type === MarkerNodeType.LOOP_END;
  }

  /**
   * 获取分支配置（仅Fork节点）
   */
  getBranches(): BranchConfig[] {
    if (!this.isFork()) {
      throw new Error('只有Fork节点才能获取分支配置');
    }
    return this._config['branches'] || [];
  }

  /**
   * 获取子工作流配置（仅SubWorkflow节点）
   */
  getSubWorkflowConfig(): SubWorkflowConfig {
    if (!this.isSubWorkflow()) {
      throw new Error('只有SubWorkflow节点才能获取子工作流配置');
    }
    return {
      referenceId: this._config['referenceId'],
      workflowId: this._config['workflowId'],
      version: this._config['version'],
      inputMapping: this._config['inputMapping'],
      outputMapping: this._config['outputMapping'],
    };
  }

  /**
   * 获取循环配置（仅LoopStart节点）
   */
  getLoopConfig(): LoopConfig {
    if (!this.isLoopStart()) {
      throw new Error('只有LoopStart节点才能获取循环配置');
    }
    return {
      maxIterations: this._config['maxIterations'],
      iterateVariable: this._config['iterateVariable'],
      iterateCollection: this._config['iterateCollection'],
    };
  }

  /**
   * 创建Fork标记节点
   */
  static fork(id: NodeId, branches: BranchConfig[]): MarkerNode {
    if (!Array.isArray(branches) || branches.length === 0) {
      throw new Error('branches必须是非空数组');
    }

    // 验证分支配置
    branches.forEach((branch, index) => {
      if (!branch.branchId || typeof branch.branchId !== 'string') {
        throw new Error(`分支[${index}]缺少branchId`);
      }
      if (!branch.targetNodeId || typeof branch.targetNodeId !== 'string') {
        throw new Error(`分支[${index}]缺少targetNodeId`);
      }
    });

    return new MarkerNode(
      id,
      MarkerNodeType.FORK,
      'Fork',
      '并行分支开始标记节点',
      { branches }
    );
  }

  /**
   * 创建Join标记节点
   */
  static join(id: NodeId): MarkerNode {
    return new MarkerNode(
      id,
      MarkerNodeType.JOIN,
      'Join',
      '并行分支合并标记节点',
      {}
    );
  }

  /**
   * 创建SubWorkflow标记节点
   */
  static subworkflow(id: NodeId, config: SubWorkflowConfig): MarkerNode {
    if (!config.referenceId || typeof config.referenceId !== 'string') {
      throw new Error('referenceId必须是非空字符串');
    }
    if (!config.workflowId || typeof config.workflowId !== 'string') {
      throw new Error('workflowId必须是非空字符串');
    }

    return new MarkerNode(
      id,
      MarkerNodeType.SUBWORKFLOW,
      'SubWorkflow',
      '子工作流引用标记节点',
      config
    );
  }

  /**
   * 创建LoopStart标记节点
   */
  static loopStart(id: NodeId, config: LoopConfig = {}): MarkerNode {
    return new MarkerNode(
      id,
      MarkerNodeType.LOOP_START,
      'LoopStart',
      '循环开始标记节点',
      config
    );
  }

  /**
   * 创建LoopEnd标记节点
   */
  static loopEnd(id: NodeId): MarkerNode {
    return new MarkerNode(
      id,
      MarkerNodeType.LOOP_END,
      'LoopEnd',
      '循环结束标记节点',
      {}
    );
  }

  /**
   * 从属性创建标记节点
   */
  static fromProps(props: {
    id: NodeId;
    type: MarkerNodeType;
    name?: string;
    description?: string;
    config: Record<string, any>;
  }): MarkerNode {
    return new MarkerNode(
      props.id,
      props.type,
      props.name || props.type,
      props.description || `${props.type}标记节点`,
      props.config
    );
  }

  /**
   * 转换为JSON
   */
  toJSON(): Record<string, any> {
    return {
      id: this._id.toString(),
      type: this._type,
      name: this._name,
      description: this._description,
      config: this._config,
    };
  }

  /**
   * 从JSON创建标记节点
   */
  static fromJSON(json: Record<string, any>): MarkerNode {
    return new MarkerNode(
      NodeId.fromString(json['id']),
      json['type'] as MarkerNodeType,
      json['name'],
      json['description'],
      json['config']
    );
  }

  /**
   * 判断两个标记节点是否相等
   */
  equals(other: MarkerNode): boolean {
    return (
      this._id.equals(other._id) &&
      this._type === other._type &&
      this._name === other._name &&
      JSON.stringify(this._config) === JSON.stringify(other._config)
    );
  }
}