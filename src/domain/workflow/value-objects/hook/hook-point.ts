import { ValueObject } from '../../../common/value-objects';

/**
 * 钩子点枚举
 */
export enum HookPointValue {
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
  ON_RESTORE = 'on_restore',
}

/**
 * 钩子点值对象属性接口
 */
export interface HookPointProps {
  value: HookPointValue;
}

/**
 * 钩子点值对象
 *
 * 表示钩子执行的时机点
 */
export class HookPoint extends ValueObject<HookPointProps> {
  private constructor(props: HookPointProps) {
    super(props);
  }

  /**
   * 创建执行前钩子点
   */
  public static beforeExecute(): HookPoint {
    return new HookPoint({ value: HookPointValue.BEFORE_EXECUTE });
  }

  /**
   * 创建执行后钩子点
   */
  public static afterExecute(): HookPoint {
    return new HookPoint({ value: HookPointValue.AFTER_EXECUTE });
  }

  /**
   * 创建错误钩子点
   */
  public static onError(): HookPoint {
    return new HookPoint({ value: HookPointValue.ON_ERROR });
  }

  /**
   * 创建编译前钩子点
   */
  public static beforeCompile(): HookPoint {
    return new HookPoint({ value: HookPointValue.BEFORE_COMPILE });
  }

  /**
   * 创建编译后钩子点
   */
  public static afterCompile(): HookPoint {
    return new HookPoint({ value: HookPointValue.AFTER_COMPILE });
  }

  /**
   * 创建节点执行前钩子点
   */
  public static beforeNodeExecute(): HookPoint {
    return new HookPoint({ value: HookPointValue.BEFORE_NODE_EXECUTE });
  }

  /**
   * 创建节点执行后钩子点
   */
  public static afterNodeExecute(): HookPoint {
    return new HookPoint({ value: HookPointValue.AFTER_NODE_EXECUTE });
  }

  /**
   * 创建节点错误钩子点
   */
  public static onNodeError(): HookPoint {
    return new HookPoint({ value: HookPointValue.ON_NODE_ERROR });
  }

  /**
   * 创建边遍历前钩子点
   */
  public static beforeEdgeTraverse(): HookPoint {
    return new HookPoint({ value: HookPointValue.BEFORE_EDGE_TRAVERSE });
  }

  /**
   * 创建边遍历后钩子点
   */
  public static afterEdgeTraverse(): HookPoint {
    return new HookPoint({ value: HookPointValue.AFTER_EDGE_TRAVERSE });
  }

  /**
   * 创建状态变化钩子点
   */
  public static onStateChange(): HookPoint {
    return new HookPoint({ value: HookPointValue.ON_STATE_CHANGE });
  }

  /**
   * 创建检查点钩子点
   */
  public static onCheckpoint(): HookPoint {
    return new HookPoint({ value: HookPointValue.ON_CHECKPOINT });
  }

  /**
   * 创建恢复钩子点
   */
  public static onRestore(): HookPoint {
    return new HookPoint({ value: HookPointValue.ON_RESTORE });
  }

  /**
   * 获取钩子点值
   */
  public getValue(): HookPointValue {
    return this.props.value;
  }

  /**
   * 检查是否为执行前钩子
   */
  public isBeforeExecute(): boolean {
    return this.props.value === HookPointValue.BEFORE_EXECUTE;
  }

  /**
   * 检查是否为执行后钩子
   */
  public isAfterExecute(): boolean {
    return this.props.value === HookPointValue.AFTER_EXECUTE;
  }

  /**
   * 检查是否为错误钩子
   */
  public isError(): boolean {
    return this.props.value === HookPointValue.ON_ERROR || this.props.value === HookPointValue.ON_NODE_ERROR;
  }

  /**
   * 检查是否为编译相关钩子
   */
  public isCompilation(): boolean {
    return (
      this.props.value === HookPointValue.BEFORE_COMPILE || this.props.value === HookPointValue.AFTER_COMPILE
    );
  }

  /**
   * 检查是否为节点相关钩子
   */
  public isNodeRelated(): boolean {
    return [
      HookPointValue.BEFORE_NODE_EXECUTE,
      HookPointValue.AFTER_NODE_EXECUTE,
      HookPointValue.ON_NODE_ERROR,
    ].includes(this.props.value);
  }

  /**
   * 检查是否为边相关钩子
   */
  public isEdgeRelated(): boolean {
    return [HookPointValue.BEFORE_EDGE_TRAVERSE, HookPointValue.AFTER_EDGE_TRAVERSE].includes(
      this.props.value
    );
  }

  /**
   * 检查是否为状态相关钩子
   */
  public isStateRelated(): boolean {
    return [HookPointValue.ON_STATE_CHANGE, HookPointValue.ON_CHECKPOINT, HookPointValue.ON_RESTORE].includes(
      this.props.value
    );
  }

  /**
   * 检查是否为节点执行前钩子
   */
  public isBeforeNodeExecute(): boolean {
    return this.props.value === HookPointValue.BEFORE_NODE_EXECUTE;
  }

  /**
   * 检查是否为节点执行后钩子
   */
  public isAfterNodeExecute(): boolean {
    return this.props.value === HookPointValue.AFTER_NODE_EXECUTE;
  }

  /**
   * 检查是否为工作流开始钩子 (映射到 BEFORE_EXECUTE)
   */
  public isWorkflowStart(): boolean {
    return this.props.value === HookPointValue.BEFORE_EXECUTE;
  }

  /**
   * 检查是否为工作流结束钩子 (映射到 AFTER_EXECUTE)
   */
  public isWorkflowEnd(): boolean {
    return this.props.value === HookPointValue.AFTER_EXECUTE;
  }

  /**
   * 检查是否为控制流钩子 (映射到边相关钩子)
   */
  public isControlFlow(): boolean {
    return this.isEdgeRelated();
  }

  /**
   * 检查是否为数据流钩子 (映射到状态相关钩子)
   */
  public isDataFlow(): boolean {
    return this.isStateRelated();
  }

  /**
   * 检查是否为状态钩子 (映射到状态相关钩子)
   */
  public isState(): boolean {
    return this.isStateRelated();
  }

  /**
   * 检查是否为生命周期钩子 (所有钩子都是生命周期钩子)
   */
  public isLifecycle(): boolean {
    return true;
  }

  /**
   * 检查是否为自定义钩子 (暂无专用自定义钩子)
   */
  public isCustom(): boolean {
    return false;
  }

  /**
   * 获取所有可用的钩子点
   */
  public static getAllHookPoints(): HookPointValue[] {
    return Object.values(HookPointValue);
  }

  /**
   * 获取执行相关的钩子点
   */
  public static getExecutionHookPoints(): HookPointValue[] {
    return [HookPointValue.BEFORE_EXECUTE, HookPointValue.AFTER_EXECUTE, HookPointValue.ON_ERROR];
  }

  /**
   * 获取编译相关的钩子点
   */
  public static getCompilationHookPoints(): HookPointValue[] {
    return [HookPointValue.BEFORE_COMPILE, HookPointValue.AFTER_COMPILE];
  }

  /**
   * 获取节点相关的钩子点
   */
  public static getNodeHookPoints(): HookPointValue[] {
    return [HookPointValue.BEFORE_NODE_EXECUTE, HookPointValue.AFTER_NODE_EXECUTE, HookPointValue.ON_NODE_ERROR];
  }

  /**
   * 获取边相关的钩子点
   */
  public static getEdgeHookPoints(): HookPointValue[] {
    return [HookPointValue.BEFORE_EDGE_TRAVERSE, HookPointValue.AFTER_EDGE_TRAVERSE];
  }

  /**
   * 获取状态相关的钩子点
   */
  public static getStateHookPoints(): HookPointValue[] {
    return [HookPointValue.ON_STATE_CHANGE, HookPointValue.ON_CHECKPOINT, HookPointValue.ON_RESTORE];
  }

  /**
   * 验证钩子点的有效性
   */
  public validate(): void {
    if (!this.props.value) {
      throw new Error('钩子点不能为空');
    }

    if (!Object.values(HookPointValue).includes(this.props.value)) {
      throw new Error(`无效的钩子点: ${this.props.value}`);
    }
  }

  /**
   * 比较两个钩子点是否相等
   */
  public override equals(vo?: ValueObject<HookPointProps>): boolean {
    if (!vo) return false;
    return this.props.value === (vo as HookPoint).props.value;
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

  /**
   * 获取钩子点的描述
   */
  public getDescription(): string {
    const descriptions: Record<HookPointValue, string> = {
      [HookPointValue.BEFORE_EXECUTE]: '工作流执行前钩子，在工作流开始执行前调用，用于预处理、验证等',
      [HookPointValue.AFTER_EXECUTE]: '工作流执行后钩子，在工作流执行完成后调用，用于后处理、清理、日志记录等',
      [HookPointValue.ON_ERROR]: '工作流错误钩子，在工作流执行过程中发生错误时调用，用于错误处理和恢复',
      [HookPointValue.BEFORE_COMPILE]: '编译前钩子，在工作流编译前调用，用于编译前的准备工作',
      [HookPointValue.AFTER_COMPILE]: '编译后钩子，在工作流编译完成后调用，用于编译后的验证和优化',
      [HookPointValue.BEFORE_NODE_EXECUTE]: '节点执行前钩子，在节点执行前调用，用于节点级别的预处理和验证',
      [HookPointValue.AFTER_NODE_EXECUTE]: '节点执行后钩子，在节点执行完成后调用，用于节点级别的后处理和结果转换',
      [HookPointValue.ON_NODE_ERROR]: '节点错误钩子，在节点执行过程中发生错误时调用，用于节点级别的错误处理',
      [HookPointValue.BEFORE_EDGE_TRAVERSE]: '边遍历前钩子，在遍历边之前调用，用于边遍历前的准备工作',
      [HookPointValue.AFTER_EDGE_TRAVERSE]: '边遍历后钩子，在遍历边之后调用，用于边遍历后的处理工作',
      [HookPointValue.ON_STATE_CHANGE]: '状态变化钩子，在工作流状态发生变化时调用，用于状态变化的监听和处理',
      [HookPointValue.ON_CHECKPOINT]: '检查点钩子，在创建检查点时调用，用于检查点相关的处理',
      [HookPointValue.ON_RESTORE]: '恢复钩子，在从检查点恢复时调用，用于恢复相关的处理',
    };

    return descriptions[this.props.value];
  }
}