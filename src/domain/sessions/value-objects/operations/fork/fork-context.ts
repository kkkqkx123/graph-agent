import { ID, Timestamp, ValueObject } from '../../../../common/value-objects';
import { NodeId } from '../../../../workflow/value-objects';
import { PromptContext } from '../../../../workflow/value-objects/context';
import { NodeExecutionSnapshot } from '../../../../threads/value-objects/node-execution';

/**
 * Fork选项值对象
 */
export class ForkOptions extends ValueObject<{
  readonly contextRetention: 'full' | 'partial' | 'minimal';
  readonly nodeStateHandling: 'copy' | 'reset' | 'inherit';
  readonly includeHistory: boolean;
  readonly includeMetadata: boolean;
  readonly customSettings?: Record<string, unknown>;
}> {
  private constructor(props: {
    contextRetention: 'full' | 'partial' | 'minimal';
    nodeStateHandling: 'copy' | 'reset' | 'inherit';
    includeHistory: boolean;
    includeMetadata: boolean;
    customSettings?: Record<string, unknown>;
  }) {
    super(props);
  }

  /**
   * 创建Fork选项
   */
  public static create(
    contextRetention: 'full' | 'partial' | 'minimal' = 'partial',
    nodeStateHandling: 'copy' | 'reset' | 'inherit' = 'inherit',
    includeHistory: boolean = true,
    includeMetadata: boolean = true,
    customSettings?: Record<string, unknown>
  ): ForkOptions {
    return new ForkOptions({
      contextRetention,
      nodeStateHandling,
      includeHistory,
      includeMetadata,
      customSettings
    });
  }

  /**
   * 创建默认Fork选项
   */
  public static createDefault(): ForkOptions {
    return new ForkOptions({
      contextRetention: 'partial',
      nodeStateHandling: 'inherit',
      includeHistory: true,
      includeMetadata: true
    });
  }

  /**
   * 创建完整上下文保留选项
   */
  public static createFullContext(): ForkOptions {
    return new ForkOptions({
      contextRetention: 'full',
      nodeStateHandling: 'copy',
      includeHistory: true,
      includeMetadata: true
    });
  }

  /**
   * 创建最小上下文保留选项
   */
  public static createMinimalContext(): ForkOptions {
    return new ForkOptions({
      contextRetention: 'minimal',
      nodeStateHandling: 'reset',
      includeHistory: false,
      includeMetadata: false
    });
  }

  public get contextRetention(): 'full' | 'partial' | 'minimal' {
    return this.props.contextRetention;
  }

  public get nodeStateHandling(): 'copy' | 'reset' | 'inherit' {
    return this.props.nodeStateHandling;
  }

  public get includeHistory(): boolean {
    return this.props.includeHistory;
  }

  public get includeMetadata(): boolean {
    return this.props.includeMetadata;
  }

  public get customSettings(): Record<string, unknown> | undefined {
    return this.props.customSettings;
  }

  public validate(): void {
    const validContextRetention = ['full', 'partial', 'minimal'];
    const validNodeStateHandling = ['copy', 'reset', 'inherit'];

    if (!validContextRetention.includes(this.props.contextRetention)) {
      throw new Error('无效的上下文保留类型');
    }

    if (!validNodeStateHandling.includes(this.props.nodeStateHandling)) {
      throw new Error('无效的节点状态处理类型');
    }
  }
}

/**
 * Fork上下文值对象
 */
export class ForkContext extends ValueObject<{
  readonly forkId: ID;
  readonly parentThreadId: ID;
  readonly forkPoint: NodeId;
  readonly timestamp: Timestamp;
  readonly variableSnapshot: Map<string, unknown>;
  readonly nodeStateSnapshot: Map<string, NodeExecutionSnapshot>;
  readonly promptContextSnapshot: PromptContext;
  readonly options: ForkOptions;
}> {
  private constructor(props: {
    forkId: ID;
    parentThreadId: ID;
    forkPoint: NodeId;
    timestamp: Timestamp;
    variableSnapshot: Map<string, unknown>;
    nodeStateSnapshot: Map<string, NodeExecutionSnapshot>;
    promptContextSnapshot: PromptContext;
    options: ForkOptions;
  }) {
    super(props);
  }

  /**
   * 创建Fork上下文
   */
  public static create(
    parentThreadId: ID,
    forkPoint: NodeId,
    variableSnapshot: Map<string, unknown>,
    nodeStateSnapshot: Map<string, NodeExecutionSnapshot>,
    promptContextSnapshot: PromptContext,
    options: ForkOptions
  ): ForkContext {
    return new ForkContext({
      forkId: ID.generate(),
      parentThreadId,
      forkPoint,
      timestamp: Timestamp.now(),
      variableSnapshot: new Map(variableSnapshot),
      nodeStateSnapshot: new Map(nodeStateSnapshot),
      promptContextSnapshot,
      options
    });
  }

  public get forkId(): ID {
    return this.props.forkId;
  }

  public get parentThreadId(): ID {
    return this.props.parentThreadId;
  }

  public get forkPoint(): NodeId {
    return this.props.forkPoint;
  }

  public get timestamp(): Timestamp {
    return this.props.timestamp;
  }

  public get variableSnapshot(): Map<string, unknown> {
    return new Map(this.props.variableSnapshot);
  }

  public get nodeStateSnapshot(): Map<string, NodeExecutionSnapshot> {
    return new Map(this.props.nodeStateSnapshot);
  }

  public get promptContextSnapshot(): PromptContext {
    return this.props.promptContextSnapshot;
  }

  public get options(): ForkOptions {
    return this.props.options;
  }

  /**
   * 获取变量值
   */
  public getVariable(key: string): unknown {
    return this.props.variableSnapshot.get(key);
  }

  /**
   * 检查是否包含变量
   */
  public hasVariable(key: string): boolean {
    return this.props.variableSnapshot.has(key);
  }

  /**
   * 获取节点状态快照
   */
  public getNodeStateSnapshot(nodeId: string): NodeExecutionSnapshot | undefined {
    return this.props.nodeStateSnapshot.get(nodeId);
  }

  /**
   * 检查是否包含节点状态
   */
  public hasNodeStateSnapshot(nodeId: string): boolean {
    return this.props.nodeStateSnapshot.has(nodeId);
  }

  public validate(): void {
    if (!this.props.parentThreadId) {
      throw new Error('父线程ID不能为空');
    }
    if (!this.props.forkPoint) {
      throw new Error('Fork点不能为空');
    }
    if (!this.props.options) {
      throw new Error('Fork选项不能为空');
    }
    // 验证options
    this.props.options.validate();
  }
}