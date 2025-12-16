import { ValueObject } from '../../common/value-objects/value-object';
import { DomainError } from '../../common/errors/domain-error';

/**
 * 节点类型枚举
 */
export enum NodeTypeValue {
  START = 'start',
  END = 'end',
  TASK = 'task',
  DECISION = 'decision',
  MERGE = 'merge',
  FORK = 'fork',
  JOIN = 'join',
  SUBGRAPH = 'subgraph',
  CUSTOM = 'custom',
  CONDITION = 'condition',
  LLM = 'llm',
  TOOL = 'tool',
  WAIT = 'wait'
}

/**
 * 节点类型值对象接口
 */
export interface NodeTypeProps {
  value: NodeTypeValue;
}

/**
 * 节点类型值对象
 * 
 * 用于表示节点的类型
 */
export class NodeType extends ValueObject<NodeTypeProps> {
  /**
   * 创建开始节点类型
   * @returns 开始节点类型实例
   */
  public static start(): NodeType {
    return new NodeType({ value: NodeTypeValue.START });
  }

  /**
   * 创建结束节点类型
   * @returns 结束节点类型实例
   */
  public static end(): NodeType {
    return new NodeType({ value: NodeTypeValue.END });
  }

  /**
   * 创建任务节点类型
   * @returns 任务节点类型实例
   */
  public static task(): NodeType {
    return new NodeType({ value: NodeTypeValue.TASK });
  }

  /**
   * 创建决策节点类型
   * @returns 决策节点类型实例
   */
  public static decision(): NodeType {
    return new NodeType({ value: NodeTypeValue.DECISION });
  }

  /**
   * 创建合并节点类型
   * @returns 合并节点类型实例
   */
  public static merge(): NodeType {
    return new NodeType({ value: NodeTypeValue.MERGE });
  }

  /**
   * 创建分支节点类型
   * @returns 分支节点类型实例
   */
  public static fork(): NodeType {
    return new NodeType({ value: NodeTypeValue.FORK });
  }

  /**
   * 创建连接节点类型
   * @returns 连接节点类型实例
   */
  public static join(): NodeType {
    return new NodeType({ value: NodeTypeValue.JOIN });
  }

  /**
   * 创建子图节点类型
   * @returns 子图节点类型实例
   */
  public static subgraph(): NodeType {
    return new NodeType({ value: NodeTypeValue.SUBGRAPH });
  }

  /**
   * 创建条件节点类型
   * @returns 条件节点类型实例
   */
  public static condition(): NodeType {
    return new NodeType({ value: NodeTypeValue.CONDITION });
  }

  /**
   * 创建LLM节点类型
   * @returns LLM节点类型实例
   */
  public static llm(): NodeType {
    return new NodeType({ value: NodeTypeValue.LLM });
  }

  /**
   * 创建工具节点类型
   * @returns 工具节点类型实例
   */
  public static tool(): NodeType {
    return new NodeType({ value: NodeTypeValue.TOOL });
  }

  /**
   * 创建等待节点类型
   * @returns 等待节点类型实例
   */
  public static wait(): NodeType {
    return new NodeType({ value: NodeTypeValue.WAIT });
  }

  /**
   * 创建自定义节点类型
   * @returns 自定义节点类型实例
   */
  public static custom(): NodeType {
    return new NodeType({ value: NodeTypeValue.CUSTOM });
  }

  /**
   * 从字符串创建节点类型
   * @param type 类型字符串
   * @returns 节点类型实例
   */
  public static fromString(type: string): NodeType {
    if (!Object.values(NodeTypeValue).includes(type as NodeTypeValue)) {
      throw new DomainError(`无效的节点类型: ${type}`);
    }
    return new NodeType({ value: type as NodeTypeValue });
  }

  /**
   * 获取类型值
   * @returns 类型值
   */
  public getValue(): NodeTypeValue {
    return this.props.value;
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
   * 检查是否为任务节点
   * @returns 是否为任务节点
   */
  public isTask(): boolean {
    return this.props.value === NodeTypeValue.TASK;
  }

  /**
   * 检查是否为决策节点
   * @returns 是否为决策节点
   */
  public isDecision(): boolean {
    return this.props.value === NodeTypeValue.DECISION;
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
  public isSubgraph(): boolean {
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
   * 检查是否为控制流节点
   * @returns 是否为控制流节点
   */
  public isControlFlow(): boolean {
    return this.isStart() || this.isEnd() || this.isDecision() ||
      this.isMerge() || this.isFork() || this.isJoin();
  }

  /**
   * 检查是否为执行节点
   * @returns 是否为执行节点
   */
  public isExecutable(): boolean {
    return this.isTask() || this.isSubgraph() || this.isCustom() ||
      this.isCondition() || this.isLLM() || this.isTool() || this.isWait();
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
    return this.isDecision() || this.isFork() || this.isStart() || this.isCondition();
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
      throw new DomainError('节点类型不能为空');
    }

    if (!Object.values(NodeTypeValue).includes(this.props.value)) {
      throw new DomainError(`无效的节点类型: ${this.props.value}`);
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
      [NodeTypeValue.TASK]: '任务节点，表示具体的执行任务',
      [NodeTypeValue.DECISION]: '决策节点，根据条件选择执行路径',
      [NodeTypeValue.MERGE]: '合并节点，合并多个输入路径',
      [NodeTypeValue.FORK]: '分支节点，分支出多个执行路径',
      [NodeTypeValue.JOIN]: '连接节点，等待多个输入路径完成',
      [NodeTypeValue.SUBGRAPH]: '子图节点，表示一个子图的执行',
      [NodeTypeValue.CONDITION]: '条件节点，根据状态进行条件判断和路由决策',
      [NodeTypeValue.LLM]: 'LLM节点，调用大语言模型进行文本生成',
      [NodeTypeValue.TOOL]: '工具节点，执行工具调用并处理结果',
      [NodeTypeValue.WAIT]: '等待节点，处理等待和延迟逻辑',
      [NodeTypeValue.CUSTOM]: '自定义节点，根据特定逻辑执行'
    };

    return descriptions[this.props.value];
  }
}