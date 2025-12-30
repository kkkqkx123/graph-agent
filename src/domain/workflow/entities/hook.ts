import { Entity } from '../../common/base/entity';
import { ID, Timestamp, Version } from '../../common/value-objects';
import { HookPointValue } from '../value-objects/hook-point';

/**
 * 钩子执行结果接口
 */
export interface HookExecutionResult {
  readonly success: boolean;
  readonly output?: any;
  readonly error?: string;
  readonly metadata?: Record<string, any>;
  readonly shouldContinue: boolean;
  readonly executionTime: number;
}

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
 * 钩子上下文接口
 */
export interface HookContext {
  readonly workflowId?: ID;
  readonly executionId?: string;
  readonly nodeId?: string;
  readonly edgeId?: string;
  readonly variables: Map<string, any>;
  readonly metadata?: Record<string, any>;
  getVariable(key: string): any;
  setVariable(key: string, value: any): void;
  getAllVariables(): Record<string, any>;
  getNodeResult(nodeId: string): any;
  setNodeResult(nodeId: string, result: any): void;
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
  readonly hookPoint: HookPointValue;
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
 * Hook聚合根实体
 *
 * 根据DDD原则，Hook是工作流生命周期中的关键组件，负责：
 * 1. 在特定时机执行自定义逻辑
 * 2. 验证自身配置
 * 3. 控制执行流程（是否继续、是否快速失败）
 * 4. 提供元数据信息
 *
 * 不负责：
 * - Hook的调度和执行顺序（由HookExecutor负责）
 * - Hook的注册和管理（由HookRegistry负责）
 * - Hook的持久化细节
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
  public get hookPoint(): HookPointValue {
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
   * 执行Hook
   * @param context Hook上下文
   * @returns 执行结果
   */
  public abstract execute(context: HookContext): Promise<HookExecutionResult>;

  /**
   * 验证Hook配置
   * @returns 验证结果
   */
  public abstract validate(): HookValidationResult;

  /**
   * 获取Hook元数据
   * @returns Hook元数据
   */
  public abstract getMetadata(): HookMetadata;

  /**
   * 获取Hook插件配置
   * @returns 插件配置列表
   */
  public getPlugins(): HookPluginConfig[] {
    return [];
  }

  /**
   * 添加插件配置
   * @param pluginConfig 插件配置
   */
  public addPlugin(pluginConfig: HookPluginConfig): void {
    // 由子类实现，如果需要支持插件
    throw new Error('addPlugin() 必须由子类实现');
  }

  /**
   * 移除插件配置
   * @param pluginId 插件ID
   */
  public removePlugin(pluginId: string): void {
    // 由子类实现，如果需要支持插件
    throw new Error('removePlugin() 必须由子类实现');
  }

  /**
   * 检查Hook是否应该执行
   * @returns 是否应该执行
   */
  public shouldExecute(): boolean {
    return this.props.enabled;
  }

  /**
   * 检查错误时是否继续执行
   * @returns 错误时是否继续执行
   */
  public shouldContinueOnError(): boolean {
    return this.props.continueOnError;
  }

  /**
   * 检查是否快速失败
   * @returns 是否快速失败
   */
  public shouldFailFast(): boolean {
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
   * 启用Hook
   */
  public enable(): void {
    if (this.props.enabled) {
      return;
    }

    (this.props as any).enabled = true;
    this.update();
  }

  /**
   * 禁用Hook
   */
  public disable(): void {
    if (!this.props.enabled) {
      return;
    }

    (this.props as any).enabled = false;
    this.update();
  }

  /**
   * 更新Hook配置
   * @param config 新配置
   */
  public updateConfig(config: Record<string, any>): void {
    (this.props as any).config = { ...this.props.config, ...config };
    this.update();
  }

  /**
   * 更新优先级
   * @param priority 新优先级
   */
  public updatePriority(priority: number): void {
    if (this.props.priority === priority) {
      return;
    }

    (this.props as any).priority = priority;
    this.update();
  }

  /**
   * 更新错误处理策略
   * @param continueOnError 错误时是否继续
   * @param failFast 是否快速失败
   */
  public updateErrorHandling(continueOnError: boolean, failFast: boolean): void {
    if (this.props.continueOnError === continueOnError && this.props.failFast === failFast) {
      return;
    }

    (this.props as any).continueOnError = continueOnError;
    (this.props as any).failFast = failFast;
    this.update();
  }

  /**
   * 更新实体
   */
  protected override update(): void {
    (this.props as any).updatedAt = Timestamp.now();
    (this.props as any).version = this.props.version.nextPatch();
    super.update();
  }

  /**
   * 转换为字符串
   * @returns 字符串表示
   */
  public override toString(): string {
    return `Hook(id=${this.props.id.toString()}, hookPoint=${this.props.hookPoint.toString()}, name=${this.props.name}, enabled=${this.props.enabled}, priority=${this.props.priority})`;
  }
}