import { ID, Timestamp, ValueObject } from '../../../../common';
import { NodeId } from '../../../../workflow';
import { NodeExecutionSnapshot } from '../../../../threads';

/**
 * Copy选项值对象
 */
export class CopyOptions extends ValueObject<{
  readonly copyScope: 'full' | 'partial';
  readonly includeExecutionHistory: boolean;
  readonly includeMetadata: boolean;
  readonly resetState: boolean;
  readonly customSettings?: Record<string, unknown>;
}> {
  private constructor(props: {
    copyScope: 'full' | 'partial';
    includeExecutionHistory: boolean;
    includeMetadata: boolean;
    resetState: boolean;
    customSettings?: Record<string, unknown>;
  }) {
    super(props);
  }

  /**
   * 创建Copy选项
   */
  public static create(
    copyScope: 'full' | 'partial' = 'full',
    includeExecutionHistory: boolean = true,
    includeMetadata: boolean = true,
    resetState: boolean = false,
    customSettings?: Record<string, unknown>
  ): CopyOptions {
    return new CopyOptions({
      copyScope,
      includeExecutionHistory,
      includeMetadata,
      resetState,
      customSettings
    });
  }

  /**
   * 创建默认Copy选项
   */
  public static createDefault(): CopyOptions {
    return new CopyOptions({
      copyScope: 'full',
      includeExecutionHistory: true,
      includeMetadata: true,
      resetState: false
    });
  }

  /**
   * 创建完整Copy选项
   */
  public static createFull(): CopyOptions {
    return new CopyOptions({
      copyScope: 'full',
      includeExecutionHistory: true,
      includeMetadata: true,
      resetState: false
    });
  }

  /**
   * 创建部分Copy选项
   */
  public static createPartial(): CopyOptions {
    return new CopyOptions({
      copyScope: 'partial',
      includeExecutionHistory: false,
      includeMetadata: false,
      resetState: true
    });
  }

  public get copyScope(): 'full' | 'partial' {
    return this.props.copyScope;
  }

  public get includeExecutionHistory(): boolean {
    return this.props.includeExecutionHistory;
  }

  public get includeMetadata(): boolean {
    return this.props.includeMetadata;
  }

  public get resetState(): boolean {
    return this.props.resetState;
  }

  public get customSettings(): Record<string, unknown> | undefined {
    return this.props.customSettings;
  }

  public validate(): void {
    const validCopyScope = ['full', 'partial'];
    if (!validCopyScope.includes(this.props.copyScope)) {
      throw new Error('无效的复制范围类型');
    }
  }
}

/**
 * Copy范围值对象
 */
export class CopyScope extends ValueObject<{
  readonly nodeIds: NodeId[];
  readonly includeVariables: boolean;
  readonly includeNodeStates: boolean;
  readonly includeContext: boolean;
}> {
  private constructor(props: {
    nodeIds: NodeId[];
    includeVariables: boolean;
    includeNodeStates: boolean;
    includeContext: boolean;
  }) {
    super(props);
  }

  /**
   * 创建Copy范围
   */
  public static create(
    nodeIds: NodeId[],
    includeVariables: boolean = true,
    includeNodeStates: boolean = true,
    includeContext: boolean = true
  ): CopyScope {
    return new CopyScope({
      nodeIds: [...nodeIds],
      includeVariables,
      includeNodeStates,
      includeContext
    });
  }

  /**
   * 创建空Copy范围
   */
  public static createEmpty(): CopyScope {
    return new CopyScope({
      nodeIds: [],
      includeVariables: false,
      includeNodeStates: false,
      includeContext: false
    });
  }

  public get nodeIds(): NodeId[] {
    return [...this.props.nodeIds];
  }

  public get includeVariables(): boolean {
    return this.props.includeVariables;
  }

  public get includeNodeStates(): boolean {
    return this.props.includeNodeStates;
  }

  public get includeContext(): boolean {
    return this.props.includeContext;
  }

  /**
   * 获取节点ID数量
   */
  public get nodeCount(): number {
    return this.props.nodeIds.length;
  }

  /**
   * 检查是否包含指定节点
   */
  public containsNode(nodeId: NodeId): boolean {
    return this.props.nodeIds.some(id => id.toString() === nodeId.toString());
  }

  /**
   * 检查是否为空范围
   */
  public isEmpty(): boolean {
    return this.props.nodeIds.length === 0;
  }

  public validate(): void {
    if (!this.props.nodeIds) {
      throw new Error('节点ID列表不能为空');
    }
    // 验证nodeIds数组中的每个元素都是有效的NodeId
    for (const nodeId of this.props.nodeIds) {
      if (!nodeId || typeof nodeId.toString !== 'function') {
        throw new Error('无效的节点ID');
      }
    }
  }
}

/**
 * Copy上下文值对象
 */
export class CopyContext extends ValueObject<{
  readonly copyId: ID;
  readonly sourceThreadId: ID;
  readonly timestamp: Timestamp;
  readonly options: CopyOptions;
  readonly scope: CopyScope;
  readonly relationshipMapping: Map<ID, ID>;
}> {
  private constructor(props: {
    copyId: ID;
    sourceThreadId: ID;
    timestamp: Timestamp;
    options: CopyOptions;
    scope: CopyScope;
    relationshipMapping: Map<ID, ID>;
  }) {
    super(props);
  }

  /**
   * 创建Copy上下文
   */
  public static create(
    sourceThreadId: ID,
    options: CopyOptions,
    scope: CopyScope,
    relationshipMapping: Map<ID, ID>
  ): CopyContext {
    return new CopyContext({
      copyId: ID.generate(),
      sourceThreadId,
      timestamp: Timestamp.now(),
      options,
      scope,
      relationshipMapping: new Map(relationshipMapping)
    });
  }

  public get copyId(): ID {
    return this.props.copyId;
  }

  public get sourceThreadId(): ID {
    return this.props.sourceThreadId;
  }

  public get timestamp(): Timestamp {
    return this.props.timestamp;
  }

  public get options(): CopyOptions {
    return this.props.options;
  }

  public get scope(): CopyScope {
    return this.props.scope;
  }

  public get relationshipMapping(): Map<ID, ID> {
    return new Map(this.props.relationshipMapping);
  }

  /**
   * 获取源ID对应的目标ID
   */
  public getTargetId(sourceId: ID): ID | undefined {
    return this.props.relationshipMapping.get(sourceId);
  }

  /**
   * 检查是否存在源ID的映射
   */
  public hasMapping(sourceId: ID): boolean {
    return this.props.relationshipMapping.has(sourceId);
  }

  /**
   * 获取映射数量
   */
  public get mappingCount(): number {
    return this.props.relationshipMapping.size;
  }

  public validate(): void {
    if (!this.props.sourceThreadId) {
      throw new Error('源线程ID不能为空');
    }
    if (!this.props.options) {
      throw new Error('Copy选项不能为空');
    }
    if (!this.props.scope) {
      throw new Error('Copy范围不能为空');
    }
    if (!this.props.relationshipMapping) {
      throw new Error('关系映射不能为空');
    }
    
    // 验证各个组件
    this.props.options.validate();
    this.props.scope.validate();
  }
}