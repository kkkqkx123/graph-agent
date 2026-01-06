import { ValueObject } from '../../../common/value-objects';
import { ThreadCheckpoint } from '../entities/thread-checkpoint';

/**
 * 检查点元组接口
 */
export interface CheckpointTupleProps {
  config: Record<string, unknown>;
  checkpoint: ThreadCheckpoint;
  parentConfig?: Record<string, unknown>;
  pendingWrites?: unknown[];
}

/**
 * 检查点元组值对象
 *
 * 用于LangWorkflow集成的检查点元组结构
 */
export class CheckpointTuple extends ValueObject<CheckpointTupleProps> {
  protected override readonly props: CheckpointTupleProps;

  /**
   * 构造函数
   * @param props 元组属性
   */
  private constructor(props: CheckpointTupleProps) {
    super(props);
    this.props = Object.freeze({ ...props });
  }

  /**
   * 创建检查点元组
   */
  public static create(
    config: Record<string, unknown>,
    checkpoint: ThreadCheckpoint,
    parentConfig?: Record<string, unknown>,
    pendingWrites?: unknown[]
  ): CheckpointTuple {
    if (!config) {
      throw new Error('配置不能为空');
    }

    if (!checkpoint) {
      throw new Error('检查点不能为空');
    }

    return new CheckpointTuple({
      config: { ...config },
      checkpoint,
      parentConfig: parentConfig ? { ...parentConfig } : undefined,
      pendingWrites: pendingWrites ? [...pendingWrites] : undefined,
    });
  }

  /**
   * 从属性创建检查点元组
   */
  public static fromProps(props: CheckpointTupleProps): CheckpointTuple {
    return new CheckpointTuple(props);
  }

  /**
   * 获取配置
   */
  public get config(): Record<string, unknown> {
    return { ...this.props.config };
  }

  /**
   * 获取检查点
   */
  public get checkpoint(): ThreadCheckpoint {
    return this.props.checkpoint;
  }

  /**
   * 获取父配置
   */
  public get parentConfig(): Record<string, unknown> | undefined {
    return this.props.parentConfig ? { ...this.props.parentConfig } : undefined;
  }

  /**
   * 获取待写入数据
   */
  public get pendingWrites(): unknown[] | undefined {
    return this.props.pendingWrites ? [...this.props.pendingWrites] : undefined;
  }

  /**
   * 获取线程ID
   */
  public getThreadId(): string {
    const configThreadId = this.getThreadIdFromConfig();
    return configThreadId || this.props.checkpoint.threadId.toString();
  }

  /**
   * 获取检查点命名空间
   */
  public getCheckpointNamespace(): string {
    const configurable = (this.props.config['configurable'] as Record<string, unknown>) || {};
    return (configurable['checkpoint_ns'] as string) || '';
  }

  /**
   * 获取检查点ID
   */
  public getCheckpointId(): string {
    const configurable = (this.props.config['configurable'] as Record<string, unknown>) || {};
    const configId = configurable['checkpoint_id'] as string;
    return configId || this.props.checkpoint.checkpointId.toString();
  }

  /**
   * 获取配置中的线程ID
   */
  private getThreadIdFromConfig(): string {
    const configurable = (this.props.config['configurable'] as Record<string, unknown>) || {};
    return (configurable['thread_id'] as string) || '';
  }

  /**
   * 检查是否有父配置
   */
  public hasParentConfig(): boolean {
    return this.props.parentConfig !== undefined;
  }

  /**
   * 检查是否有待写入数据
   */
  public hasPendingWrites(): boolean {
    return this.props.pendingWrites !== undefined && this.props.pendingWrites.length > 0;
  }

  /**
   * 获取待写入数据数量
   */
  public getPendingWritesCount(): number {
    return this.props.pendingWrites?.length || 0;
  }

  /**
   * 添加待写入数据
   */
  public addPendingWrite(data: unknown): CheckpointTuple {
    const newPendingWrites = this.props.pendingWrites
      ? [...this.props.pendingWrites, data]
      : [data];

    return new CheckpointTuple({
      ...this.props,
      pendingWrites: newPendingWrites,
    });
  }

  /**
   * 清除待写入数据
   */
  public clearPendingWrites(): CheckpointTuple {
    return new CheckpointTuple({
      ...this.props,
      pendingWrites: undefined,
    });
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Record<string, unknown>): CheckpointTuple {
    return new CheckpointTuple({
      ...this.props,
      config: { ...newConfig },
    });
  }

  /**
   * 更新父配置
   */
  public updateParentConfig(newParentConfig: Record<string, unknown>): CheckpointTuple {
    return new CheckpointTuple({
      ...this.props,
      parentConfig: { ...newParentConfig },
    });
  }

  /**
   * 获取配置值
   */
  public getConfigValue(key: string): unknown {
    return this.props.config[key];
  }

  /**
   * 获取可配置值
   */
  public getConfigurableValue(key: string): unknown {
    const configurable = (this.props.config['configurable'] as Record<string, unknown>) || {};
    return configurable[key];
  }

  /**
   * 设置配置值
   */
  public setConfigValue(key: string, value: unknown): CheckpointTuple {
    const newConfig = { ...this.props.config };
    newConfig[key] = value;

    return new CheckpointTuple({
      ...this.props,
      config: newConfig,
    });
  }

  /**
   * 设置可配置值
   */
  public setConfigurableValue(key: string, value: unknown): CheckpointTuple {
    const configurable = (this.props.config['configurable'] as Record<string, unknown>) || {};
    const newConfigurable = { ...configurable };
    newConfigurable[key] = value;

    const newConfig = { ...this.props.config };
    newConfig['configurable'] = newConfigurable;

    return new CheckpointTuple({
      ...this.props,
      config: newConfig,
    });
  }

  /**
   * 检查是否为根检查点
   */
  public isRoot(): boolean {
    return !this.hasParentConfig();
  }

  /**
   * 获取层级深度
   */
  public getDepth(): number {
    if (!this.hasParentConfig()) {
      return 0;
    }

    // 简化实现，实际可能需要递归计算
    return 1;
  }

  /**
   * 转换为字典表示
   */
  public toDict(): Record<string, unknown> {
    return {
      config: this.props.config,
      checkpoint: this.props.checkpoint.toDict(),
      parentConfig: this.props.parentConfig,
      pendingWrites: this.props.pendingWrites,
    };
  }

  /**
   * 转换为LangWorkflow格式
   */
  public toLangWorkflowFormat(): Record<string, unknown> {
    return {
      config: this.props.config,
      checkpoint: {
        id: this.props.checkpoint.checkpointId.toString(),
        thread_id: this.props.checkpoint.threadId.toString(),
        checkpoint_ns: this.getCheckpointNamespace(),
        checkpoint_id: this.getCheckpointId(),
        checkpoint_data: {
          values: this.props.checkpoint.stateData,
          step: 0,
          metadata: {
            source: 'workflow-agent',
            step: 0,
            writes: this.props.pendingWrites || [],
            parents: this.props.parentConfig ? [this.props.parentConfig] : undefined,
          },
        },
        metadata: {
          source: 'workflow-agent',
          step: 0,
          writes: this.props.pendingWrites || [],
          parents: this.props.parentConfig ? [this.props.parentConfig] : undefined,
          config: this.props.config,
        },
      },
      metadata: {
        source: 'workflow-agent',
        step: 0,
        writes: this.props.pendingWrites || [],
        parents: this.props.parentConfig ? [this.props.parentConfig] : undefined,
      },
    };
  }

  /**
   * 从LangWorkflow格式创建
   */
  public static fromLangWorkflowFormat(data: Record<string, unknown>): CheckpointTuple {
    const config = data['config'] as Record<string, unknown>;
    const checkpointData = data['checkpoint'] as Record<string, unknown>;

    // 这里需要根据实际的LangWorkflow格式进行转换
    // 简化实现，实际需要更复杂的转换逻辑
    throw new Error('从LangWorkflow格式创建检查点元组的功能尚未实现');
  }

  /**
   * 验证值对象
   */
  public validate(): void {
    if (!this.props.config) {
      throw new Error('配置不能为空');
    }

    if (!this.props.checkpoint) {
      throw new Error('检查点不能为空');
    }

    // 验证配置中的线程ID与检查点线程ID的一致性
    const configThreadId = this.getThreadIdFromConfig();
    if (configThreadId && configThreadId !== this.props.checkpoint.threadId.toString()) {
      throw new Error('配置中的线程ID与检查点线程ID不一致');
    }

    // 验证检查点ID的一致性
    const configurable = (this.props.config['configurable'] as Record<string, unknown>) || {};
    const configCheckpointId = configurable['checkpoint_id'] as string;
    if (
      configCheckpointId &&
      configCheckpointId !== this.props.checkpoint.checkpointId.toString()
    ) {
      throw new Error('配置中的检查点ID与检查点ID不一致');
    }
  }

  /**
   * 相等性比较
   */
  public override equals(other: CheckpointTuple): boolean {
    if (!(other instanceof CheckpointTuple)) {
      return false;
    }

    return (
      this.props.checkpoint.equals(other.props.checkpoint) &&
      JSON.stringify(this.props.config) === JSON.stringify(other.props.config) &&
      JSON.stringify(this.props.parentConfig) === JSON.stringify(other.props.parentConfig) &&
      JSON.stringify(this.props.pendingWrites) === JSON.stringify(other.props.pendingWrites)
    );
  }
}
