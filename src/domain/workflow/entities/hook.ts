import { Entity } from '../../common/base/entity';
import { ID, Timestamp, Version } from '../../common/value-objects';
import { HookPoint } from '../value-objects/hook/hook-point';
import { HookContextValue, HookExecutionResultValue } from '../value-objects/hook';

/**
 * 钩子插件配置接口
 */
export interface HookPluginConfig {
  readonly pluginId: string;
  readonly config: Record<string, any>;
  readonly enabled?: boolean;
}

/**
 * 钩子元数据接口
 */
export interface HookMetadata {
  readonly id: string;
  readonly hookPoint: string;
  readonly name: string;
  readonly description?: string;
  readonly parameters: HookParameter[];
  readonly enabled: boolean;
  readonly priority: number;
}

/**
 * 钩子参数接口
 */
export interface HookParameter {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly description: string;
  readonly defaultValue?: any;
}

/**
 * Hook验证结果接口
 */
export interface HookValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}

/**
 * Hook聚合根属性接口
 */
export interface HookProps {
  readonly id: ID;
  readonly hookPoint: HookPoint;
  readonly name: string;
  readonly description?: string;
  readonly config: Record<string, any>;
  readonly enabled: boolean;
  readonly priority: number;
  readonly continueOnError: boolean;
  readonly failFast: boolean;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
}

/**
 * Hook聚合根实体（简化版）
 *
 * 根据DDD原则，Hook是工作流生命周期中的关键组件，负责：
 * 1. Hook 配置管理
 * 2. Hook 状态管理
 * 3. Hook 验证
 *
 * 不负责：
 * - Hook 执行（由 HookExecutionHandler 负责）
 * - Hook 插件管理（由 HookExecutionHandler 负责）
 */
export abstract class Hook extends Entity {
  protected readonly props: HookProps;

  /**
   * 构造函数
   * @param props Hook属性
   */
  protected constructor(props: HookProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 获取Hook ID
   * @returns Hook ID
   */
  public get hookId(): ID {
    return this.props.id;
  }

  /**
   * 获取钩子点
   * @returns 钩子点
   */
  public get hookPoint(): HookPoint {
    return this.props.hookPoint;
  }

  /**
   * 获取Hook名称
   * @returns Hook名称
   */
  public get name(): string {
    return this.props.name;
  }

  /**
   * 获取Hook描述
   * @returns Hook描述
   */
  public get description(): string | undefined {
    return this.props.description;
  }

  /**
   * 获取Hook配置
   * @returns Hook配置
   */
  public get config(): Record<string, any> {
    return this.props.config;
  }

  /**
   * 检查是否启用
   * @returns 是否启用
   */
  public get enabled(): boolean {
    return this.props.enabled;
  }

  /**
   * 获取优先级
   * @returns 优先级
   */
  public get priority(): number {
    return this.props.priority;
  }

  /**
   * 检查错误时是否继续
   * @returns 错误时是否继续
   */
  public get continueOnError(): boolean {
    return this.props.continueOnError;
  }

  /**
   * 检查是否快速失败
   * @returns 是否快速失败
   */
  public get failFast(): boolean {
    return this.props.failFast;
  }

  /**
   * 检查是否为执行前Hook
   * @returns 是否为执行前Hook
   */
  public isBeforeExecute(): boolean {
    return this.props.hookPoint.isBeforeExecute();
  }

  /**
   * 检查是否为执行后Hook
   * @returns 是否为执行后Hook
   */
  public isAfterExecute(): boolean {
    return this.props.hookPoint.isAfterExecute();
  }

  /**
   * 检查是否为错误Hook
   * @returns 是否为错误Hook
   */
  public isError(): boolean {
    return this.props.hookPoint.isError();
  }

  /**
   * 检查是否为节点执行前Hook
   * @returns 是否为节点执行前Hook
   */
  public isBeforeNodeExecute(): boolean {
    return this.props.hookPoint.isBeforeNodeExecute();
  }

  /**
   * 检查是否为节点执行后Hook
   * @returns 是否为节点执行后Hook
   */
  public isAfterNodeExecute(): boolean {
    return this.props.hookPoint.isAfterNodeExecute();
  }

  /**
   * 检查是否为工作流开始Hook
   * @returns 是否为工作流开始Hook
   */
  public isWorkflowStart(): boolean {
    return this.props.hookPoint.isWorkflowStart();
  }

  /**
   * 检查是否为工作流结束Hook
   * @returns 是否为工作流结束Hook
   */
  public isWorkflowEnd(): boolean {
    return this.props.hookPoint.isWorkflowEnd();
  }

  /**
   * 检查是否为控制流Hook
   * @returns 是否为控制流Hook
   */
  public isControlFlow(): boolean {
    return this.props.hookPoint.isControlFlow();
  }

  /**
   * 检查是否为数据流Hook
   * @returns 是否为数据流Hook
   */
  public isDataFlow(): boolean {
    return this.props.hookPoint.isDataFlow();
  }

  /**
   * 检查是否为状态Hook
   * @returns 是否为状态Hook
   */
  public isState(): boolean {
    return this.props.hookPoint.isState();
  }

  /**
   * 检查是否为生命周期Hook
   * @returns 是否为生命周期Hook
   */
  public isLifecycle(): boolean {
    return this.props.hookPoint.isLifecycle();
  }

  /**
   * 检查是否为自定义Hook
   * @returns 是否为自定义Hook
   */
  public isCustom(): boolean {
    return this.props.hookPoint.isCustom();
  }

  /**
   * 更新Hook配置
   * @param config 新配置
   */
  public updateConfig(config: Record<string, any>): Hook {
    const newProps: HookProps = {
      ...this.props,
      config: { ...this.props.config, ...config },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };
    return this.createHookFromProps(newProps);
  }

  /**
   * 更新优先级
   * @param priority 新优先级
   */
  public updatePriority(priority: number): Hook {
    const newProps: HookProps = {
      ...this.props,
      priority,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };
    return this.createHookFromProps(newProps);
  }

  /**
   * 更新错误处理策略
   * @param continueOnError 错误时是否继续
   * @param failFast 是否快速失败
   */
  public updateErrorHandling(continueOnError: boolean, failFast: boolean): Hook {
    const newProps: HookProps = {
      ...this.props,
      continueOnError,
      failFast,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    };
    return this.createHookFromProps(newProps);
  }

  /**
   * 验证Hook配置
   * @returns 验证结果
   */
  public abstract validate(): HookValidationResult;

  /**
   * 抽象方法（由子类实现）
   */
  protected abstract createHookFromProps(props: HookProps): Hook;

  /**
   * 获取业务标识
   */
  public getBusinessIdentifier(): string {
    return `hook:${this.props.id.toString()}`;
  }

  /**
   * 获取Hook属性（用于持久化）
   */
  public toProps(): HookProps {
    return this.props;
  }

  /**
   * 转换为字符串
   * @returns 字符串表示
   */
  public override toString(): string {
    return `Hook(id=${this.props.id.toString()}, hookPoint=${this.props.hookPoint.toString()}, name=${this.props.name}, enabled=${this.props.enabled}, priority=${this.props.priority})`;
  }
}
