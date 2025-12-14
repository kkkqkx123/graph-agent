import { ValueObject } from '../../../common/value-objects/value-object';
import { DomainError } from '../../../common/errors/domain-error';

/**
 * 钩子点枚举
 */
export enum HookPoint {
  BEFORE_EXECUTE = 'before_execute',
  AFTER_EXECUTE = 'after_execute',
  ON_ERROR = 'on_error',
  BEFORE_COMPILE = 'before_compile',
  AFTER_COMPILE = 'after_compile',
  BEFORE_NODE_EXECUTE = 'before_node_execute',
  AFTER_NODE_EXECUTE = 'after_node_execute',
  ON_NODE_ERROR = 'on_node_error',
  BEFORE_EDGE_TRAVERSE = 'before_edge_traverse',
  AFTER_EDGE_TRAVERSE = 'after_edge_traverse',
  ON_STATE_CHANGE = 'on_state_change',
  ON_CHECKPOINT = 'on_checkpoint',
  ON_RESTORE = 'on_restore'
}

/**
 * 钩子点值对象属性接口
 */
export interface HookPointValueProps {
  value: HookPoint;
}

/**
 * 钩子点值对象
 *
 * 表示钩子执行的时机点
 */
export class HookPointValue extends ValueObject<HookPointValueProps> {
  constructor(props: HookPointValueProps) {
    super(props);
    this.validate();
  }

  /**
   * 验证钩子点
   */
  public validate(): void {
    if (!Object.values(HookPoint).includes(this.props.value)) {
      throw new DomainError(`无效的钩子点: ${this.props.value}`);
    }
  }

  /**
   * 获取钩子点值
   */
  public getValue(): HookPoint {
    return this.props.value;
  }

  /**
   * 检查是否为执行前钩子
   */
  public isBeforeExecute(): boolean {
    return this.props.value === HookPoint.BEFORE_EXECUTE;
  }

  /**
   * 检查是否为执行后钩子
   */
  public isAfterExecute(): boolean {
    return this.props.value === HookPoint.AFTER_EXECUTE;
  }

  /**
   * 检查是否为错误钩子
   */
  public isError(): boolean {
    return this.props.value === HookPoint.ON_ERROR || this.props.value === HookPoint.ON_NODE_ERROR;
  }

  /**
   * 检查是否为编译相关钩子
   */
  public isCompilation(): boolean {
    return this.props.value === HookPoint.BEFORE_COMPILE || this.props.value === HookPoint.AFTER_COMPILE;
  }

  /**
   * 检查是否为节点相关钩子
   */
  public isNodeRelated(): boolean {
    return [
      HookPoint.BEFORE_NODE_EXECUTE,
      HookPoint.AFTER_NODE_EXECUTE,
      HookPoint.ON_NODE_ERROR
    ].includes(this.props.value);
  }

  /**
   * 检查是否为边相关钩子
   */
  public isEdgeRelated(): boolean {
    return [
      HookPoint.BEFORE_EDGE_TRAVERSE,
      HookPoint.AFTER_EDGE_TRAVERSE
    ].includes(this.props.value);
  }

  /**
   * 检查是否为状态相关钩子
   */
  public isStateRelated(): boolean {
    return [
      HookPoint.ON_STATE_CHANGE,
      HookPoint.ON_CHECKPOINT,
      HookPoint.ON_RESTORE
    ].includes(this.props.value);
  }

  /**
   * 创建执行前钩子点
   */
  public static beforeExecute(): HookPointValue {
    return new HookPointValue({ value: HookPoint.BEFORE_EXECUTE });
  }

  /**
   * 创建执行后钩子点
   */
  public static afterExecute(): HookPointValue {
    return new HookPointValue({ value: HookPoint.AFTER_EXECUTE });
  }

  /**
   * 创建错误钩子点
   */
  public static onError(): HookPointValue {
    return new HookPointValue({ value: HookPoint.ON_ERROR });
  }

  /**
   * 创建编译前钩子点
   */
  public static beforeCompile(): HookPointValue {
    return new HookPointValue({ value: HookPoint.BEFORE_COMPILE });
  }

  /**
   * 创建编译后钩子点
   */
  public static afterCompile(): HookPointValue {
    return new HookPointValue({ value: HookPoint.AFTER_COMPILE });
  }

  /**
   * 创建节点执行前钩子点
   */
  public static beforeNodeExecute(): HookPointValue {
    return new HookPointValue({ value: HookPoint.BEFORE_NODE_EXECUTE });
  }

  /**
   * 创建节点执行后钩子点
   */
  public static afterNodeExecute(): HookPointValue {
    return new HookPointValue({ value: HookPoint.AFTER_NODE_EXECUTE });
  }

  /**
   * 创建节点错误钩子点
   */
  public static onNodeError(): HookPointValue {
    return new HookPointValue({ value: HookPoint.ON_NODE_ERROR });
  }

  /**
   * 创建边遍历前钩子点
   */
  public static beforeEdgeTraverse(): HookPointValue {
    return new HookPointValue({ value: HookPoint.BEFORE_EDGE_TRAVERSE });
  }

  /**
   * 创建边遍历后钩子点
   */
  public static afterEdgeTraverse(): HookPointValue {
    return new HookPointValue({ value: HookPoint.AFTER_EDGE_TRAVERSE });
  }

  /**
   * 创建状态变化钩子点
   */
  public static onStateChange(): HookPointValue {
    return new HookPointValue({ value: HookPoint.ON_STATE_CHANGE });
  }

  /**
   * 创建检查点钩子点
   */
  public static onCheckpoint(): HookPointValue {
    return new HookPointValue({ value: HookPoint.ON_CHECKPOINT });
  }

  /**
   * 创建恢复钩子点
   */
  public static onRestore(): HookPointValue {
    return new HookPointValue({ value: HookPoint.ON_RESTORE });
  }

  /**
   * 从字符串创建钩子点
   */
  public static fromString(value: string): HookPointValue {
    const hookPoint = Object.values(HookPoint).find(h => h === value);
    if (!hookPoint) {
      throw new DomainError(`无法识别的钩子点字符串: ${value}`);
    }
    return new HookPointValue({ value: hookPoint });
  }

  /**
   * 获取所有可用的钩子点
   */
  public static getAllHookPoints(): HookPoint[] {
    return Object.values(HookPoint);
  }

  /**
   * 获取执行相关的钩子点
   */
  public static getExecutionHookPoints(): HookPoint[] {
    return [
      HookPoint.BEFORE_EXECUTE,
      HookPoint.AFTER_EXECUTE,
      HookPoint.ON_ERROR
    ];
  }

  /**
   * 获取编译相关的钩子点
   */
  public static getCompilationHookPoints(): HookPoint[] {
    return [
      HookPoint.BEFORE_COMPILE,
      HookPoint.AFTER_COMPILE
    ];
  }

  /**
   * 获取节点相关的钩子点
   */
  public static getNodeHookPoints(): HookPoint[] {
    return [
      HookPoint.BEFORE_NODE_EXECUTE,
      HookPoint.AFTER_NODE_EXECUTE,
      HookPoint.ON_NODE_ERROR
    ];
  }

  /**
   * 获取边相关的钩子点
   */
  public static getEdgeHookPoints(): HookPoint[] {
    return [
      HookPoint.BEFORE_EDGE_TRAVERSE,
      HookPoint.AFTER_EDGE_TRAVERSE
    ];
  }

  /**
   * 获取状态相关的钩子点
   */
  public static getStateHookPoints(): HookPoint[] {
    return [
      HookPoint.ON_STATE_CHANGE,
      HookPoint.ON_CHECKPOINT,
      HookPoint.ON_RESTORE
    ];
  }

  /**
   * 比较两个钩子点是否相等
   */
  public override equals(vo?: ValueObject<HookPointValueProps>): boolean {
    if (!vo) return false;
    return this.props.value === (vo as HookPointValue).props.value;
  }

  /**
   * 转换为字符串
   */
  public override toString(): string {
    return this.props.value;
  }

  /**
   * 转换为JSON
   */
  public toJSON(): string {
    return this.props.value;
  }
}