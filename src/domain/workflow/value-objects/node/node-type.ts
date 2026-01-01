import { ValueObject } from '../../../common/value-objects';

/**
 * 节点类型枚举
 */
export enum NodeTypeValue {
  START = 'start',
  END = 'end',
  DATA_TRANSFORM = 'data-transform',
  MERGE = 'merge',
  FORK = 'fork',
  JOIN = 'join',
  SUBGRAPH = 'subgraph',
  CUSTOM = 'custom',
  CONDITION = 'condition',
  LLM = 'llm',
  TOOL = 'tool',
  WAIT = 'wait',
  USER_INTERACTION = 'user-interaction'
}

/**
 * 节点上下文类型枚举
 */
export enum NodeContextTypeValue {
  // 上下文处理类型
  PASS_THROUGH = 'pass_through',
  FILTER_IN = 'filter_in',
  FILTER_OUT = 'filter_out',
  TRANSFORM = 'transform',
  ISOLATE = 'isolate',
  MERGE = 'merge',

  // 特殊处理类型
  LLM_CONTEXT = 'llm_context',
  TOOL_CONTEXT = 'tool_context',
  HUMAN_CONTEXT = 'human_context',
  SYSTEM_CONTEXT = 'system_context'
}

/**
 * 节点类型值对象接口
 */
export interface NodeTypeProps {
  value: NodeTypeValue;
  contextType: NodeContextTypeValue;
}

/**
 * 节点类型值对象
 * 
 * 用于表示节点的类型
 */
export class NodeType extends ValueObject<NodeTypeProps> {
  private constructor(props: NodeTypeProps) {
    super(props);
  }
  /**
   * 创建开始节点类型
   * @param contextType 上下文类型（可选，默认为PASS_THROUGH）
   * @returns 开始节点类型实例
   */
  public static start(contextType: NodeContextTypeValue = NodeContextTypeValue.PASS_THROUGH): NodeType {
    return new NodeType({ value: NodeTypeValue.START, contextType });
  }

  /**
   * 创建结束节点类型
   * @param contextType 上下文类型（可选，默认为PASS_THROUGH）
   * @returns 结束节点类型实例
   */
  public static end(contextType: NodeContextTypeValue = NodeContextTypeValue.PASS_THROUGH): NodeType {
    return new NodeType({ value: NodeTypeValue.END, contextType });
  }

  /**
   * 创建数据转换节点类型
   * @param contextType 上下文类型（可选，默认为TRANSFORM）
   * @returns 数据转换节点类型实例
   */
  public static dataTransform(contextType: NodeContextTypeValue = NodeContextTypeValue.TRANSFORM): NodeType {
    return new NodeType({ value: NodeTypeValue.DATA_TRANSFORM, contextType });
  }

  /**
   * 创建合并节点类型
   * @param contextType 上下文类型（可选，默认为MERGE）
   * @returns 合并节点类型实例
   */
  public static merge(contextType: NodeContextTypeValue = NodeContextTypeValue.MERGE): NodeType {
    return new NodeType({ value: NodeTypeValue.MERGE, contextType });
  }

  /**
   * 创建分支节点类型
   * @param contextType 上下文类型（可选，默认为PASS_THROUGH）
   * @returns 分支节点类型实例
   */
  public static fork(contextType: NodeContextTypeValue = NodeContextTypeValue.PASS_THROUGH): NodeType {
    return new NodeType({ value: NodeTypeValue.FORK, contextType });
  }

  /**
   * 创建连接节点类型
   * @param contextType 上下文类型（可选，默认为MERGE）
   * @returns 连接节点类型实例
   */
  public static join(contextType: NodeContextTypeValue = NodeContextTypeValue.MERGE): NodeType {
    return new NodeType({ value: NodeTypeValue.JOIN, contextType });
  }

  /**
   * 创建子图节点类型
   * @param contextType 上下文类型（可选，默认为ISOLATE）
   * @returns 子图节点类型实例
   */
  public static subworkflow(contextType: NodeContextTypeValue = NodeContextTypeValue.ISOLATE): NodeType {
    return new NodeType({ value: NodeTypeValue.SUBGRAPH, contextType });
  }

  /**
   * 创建条件节点类型
   * @param contextType 上下文类型（可选，默认为PASS_THROUGH）
   * @returns 条件节点类型实例
   */
  public static condition(contextType: NodeContextTypeValue = NodeContextTypeValue.PASS_THROUGH): NodeType {
    return new NodeType({ value: NodeTypeValue.CONDITION, contextType });
  }

  /**
   * 创建LLM节点类型
   * @param contextType 上下文类型（可选，默认为LLM_CONTEXT）
   * @returns LLM节点类型实例
   */
  public static llm(contextType: NodeContextTypeValue = NodeContextTypeValue.LLM_CONTEXT): NodeType {
    return new NodeType({ value: NodeTypeValue.LLM, contextType });
  }

  /**
   * 创建工具节点类型
   * @param contextType 上下文类型（可选，默认为TOOL_CONTEXT）
   * @returns 工具节点类型实例
   */
  public static tool(contextType: NodeContextTypeValue = NodeContextTypeValue.TOOL_CONTEXT): NodeType {
    return new NodeType({ value: NodeTypeValue.TOOL, contextType });
  }

  /**
   * 创建等待节点类型
   * @param contextType 上下文类型（可选，默认为PASS_THROUGH）
   * @returns 等待节点类型实例
   */
  public static wait(contextType: NodeContextTypeValue = NodeContextTypeValue.PASS_THROUGH): NodeType {
    return new NodeType({ value: NodeTypeValue.WAIT, contextType });
  }

  /**
   * 创建用户交互节点类型
   * @param contextType 上下文类型（可选，默认为HUMAN_CONTEXT）
   * @returns 用户交互节点类型实例
   */
  public static userInteraction(contextType: NodeContextTypeValue = NodeContextTypeValue.HUMAN_CONTEXT): NodeType {
    return new NodeType({ value: NodeTypeValue.USER_INTERACTION, contextType });
  }

  /**
   * 创建自定义节点类型
   * @param contextType 上下文类型（可选，默认为PASS_THROUGH）
   * @returns 自定义节点类型实例
   */
  public static custom(contextType: NodeContextTypeValue = NodeContextTypeValue.PASS_THROUGH): NodeType {
    return new NodeType({ value: NodeTypeValue.CUSTOM, contextType });
  }

  /**
   * 从字符串创建节点类型
   * @param type 类型字符串
   * @param contextType 上下文类型（可选，默认为PASS_THROUGH）
   * @returns 节点类型实例
   */
  public static fromString(type: string, contextType: NodeContextTypeValue = NodeContextTypeValue.PASS_THROUGH): NodeType {
    if (!Object.values(NodeTypeValue).includes(type as NodeTypeValue)) {
      throw new Error(`无效的节点类型: ${type}`);
    }
    return new NodeType({ value: type as NodeTypeValue, contextType });
  }

  /**
   * 获取类型值
   * @returns 类型值
   */
  public getValue(): NodeTypeValue {
    return this.props.value;
  }

  /**
   * 获取上下文类型
   * @returns 上下文类型
   */
  public getContextType(): NodeContextTypeValue {
    return this.props.contextType;
  }

  /**
   * 设置上下文类型（创建新实例）
   * @param contextType 新的上下文类型
   * @returns 新的节点类型实例
   */
  public setContextType(contextType: NodeContextTypeValue): NodeType {
    return new NodeType({ value: this.props.value, contextType });
  }

  /**
   * 检查是否为开始节点
   * @returns 是否为开始节点
   */
  public isStart(): boolean {
    return this.props.value === NodeTypeValue.START;
  }

  /**
   * 检查是否为结束节点
   * @returns 是否为结束节点
   */
  public isEnd(): boolean {
    return this.props.value === NodeTypeValue.END;
  }

  /**
   * 检查是否为数据转换节点
   * @returns 是否为数据转换节点
   */
  public isDataTransform(): boolean {
    return this.props.value === NodeTypeValue.DATA_TRANSFORM;
  }

  /**
   * 检查是否为合并节点
   * @returns 是否为合并节点
   */
  public isMerge(): boolean {
    return this.props.value === NodeTypeValue.MERGE;
  }

  /**
   * 检查是否为分支节点
   * @returns 是否为分支节点
   */
  public isFork(): boolean {
    return this.props.value === NodeTypeValue.FORK;
  }

  /**
   * 检查是否为连接节点
   * @returns 是否为连接节点
   */
  public isJoin(): boolean {
    return this.props.value === NodeTypeValue.JOIN;
  }

  /**
   * 检查是否为子图节点
   * @returns 是否为子图节点
   */
  public isSubworkflow(): boolean {
    return this.props.value === NodeTypeValue.SUBGRAPH;
  }

  /**
   * 检查是否为条件节点
   * @returns 是否为条件节点
   */
  public isCondition(): boolean {
    return this.props.value === NodeTypeValue.CONDITION;
  }

  /**
   * 检查是否为LLM节点
   * @returns 是否为LLM节点
   */
  public isLLM(): boolean {
    return this.props.value === NodeTypeValue.LLM;
  }

  /**
   * 检查是否为工具节点
   * @returns 是否为工具节点
   */
  public isTool(): boolean {
    return this.props.value === NodeTypeValue.TOOL;
  }

  /**
   * 检查是否为等待节点
   * @returns 是否为等待节点
   */
  public isWait(): boolean {
    return this.props.value === NodeTypeValue.WAIT;
  }

  /**
   * 检查是否为自定义节点
   * @returns 是否为自定义节点
   */
  public isCustom(): boolean {
    return this.props.value === NodeTypeValue.CUSTOM;
  }

  /**
   * 检查是否为用户交互节点
   * @returns 是否为用户交互节点
   */
  public isUserInteraction(): boolean {
    return this.props.value === NodeTypeValue.USER_INTERACTION;
  }

  /**
   * 检查是否为控制流节点
   * @returns 是否为控制流节点
   */
  public isControlFlow(): boolean {
    return this.isStart() || this.isEnd() || this.isCondition() ||
      this.isMerge() || this.isFork() || this.isJoin();
  }

  /**
   * 检查是否为执行节点
   * @returns 是否为执行节点
   */
  public isExecutable(): boolean {
    return this.isDataTransform() || this.isSubworkflow() || this.isCustom() ||
      this.isCondition() || this.isLLM() || this.isTool() || this.isWait() || this.isUserInteraction();
  }

  /**
   * 检查是否可以有多个输入边
   * @returns 是否可以有多个输入边
   */
  public canHaveMultipleInputs(): boolean {
    return this.isMerge() || this.isJoin() || this.isEnd();
  }

  /**
   * 检查是否可以有多个输出边
   * @returns 是否可以有多个输出边
   */
  public canHaveMultipleOutputs(): boolean {
    return this.isCondition() || this.isFork() || this.isStart();
  }

  /**
   * 比较两个节点类型是否相等
   * @param type 另一个节点类型
   * @returns 是否相等
   */
  public override equals(type?: NodeType): boolean {
    if (type === null || type === undefined) {
      return false;
    }
    return this.props.value === type.getValue();
  }

  /**
   * 验证节点类型的有效性
   */
  public validate(): void {
    if (!this.props.value) {
      throw new Error('节点类型不能为空');
    }

    if (!Object.values(NodeTypeValue).includes(this.props.value)) {
      throw new Error(`无效的节点类型: ${this.props.value}`);
    }

    if (!this.props.contextType) {
      throw new Error('节点上下文类型不能为空');
    }

    if (!Object.values(NodeContextTypeValue).includes(this.props.contextType)) {
      throw new Error(`无效的节点上下文类型: ${this.props.contextType}`);
    }
  }

  /**
   * 获取节点类型的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return this.props.value;
  }

  /**
   * 获取节点类型的描述
   * @returns 类型描述
   */
  public getDescription(): string {
    const descriptions: Record<NodeTypeValue, string> = {
      [NodeTypeValue.START]: '开始节点，表示图的入口点',
      [NodeTypeValue.END]: '结束节点，表示图的出口点',
      [NodeTypeValue.DATA_TRANSFORM]: '数据转换节点，执行数据转换操作（map、filter、reduce、sort、group）',
      [NodeTypeValue.MERGE]: '合并节点，合并多个输入路径',
      [NodeTypeValue.FORK]: '分支节点，分支出多个执行路径',
      [NodeTypeValue.JOIN]: '连接节点，等待多个输入路径完成',
      [NodeTypeValue.SUBGRAPH]: '子图节点，表示一个子图的执行',
      [NodeTypeValue.CONDITION]: '条件节点，根据状态进行条件判断和路由决策',
      [NodeTypeValue.LLM]: 'LLM节点，调用大语言模型进行文本生成',
      [NodeTypeValue.TOOL]: '工具节点，执行工具调用并处理结果',
      [NodeTypeValue.WAIT]: '等待节点，处理等待和延迟逻辑',
      [NodeTypeValue.USER_INTERACTION]: '用户交互节点，通过前端与用户交互进行人工中转',
      [NodeTypeValue.CUSTOM]: '自定义节点，根据特定逻辑执行'
    };

    return descriptions[this.props.value];
  }
}