import { Entity } from '../../common/base/entity';
import { ID, Timestamp, Version } from '../../common/value-objects';

/**
 * 工具结果压缩信息接口
 */
export interface ToolResultCompression {
  algorithm: string;
  originalSize: number;
  compressedSize: number;
  ratio: number;
}

/**
 * 工具结果加密信息接口
 */
export interface ToolResultEncryption {
  algorithm: string;
  keyId: string;
  iv: string;
}

/**
 * 工具结果签名接口
 */
export interface ToolResultSignature {
  algorithm: string;
  value: string;
  publicKey: string;
}

/**
 * 工具结果校验和接口
 */
export interface ToolResultChecksum {
  algorithm: string;
  value: string;
}

/**
 * 工具结果访问权限接口
 */
export interface ToolResultPermissions {
  read: string[];
  write: string[];
  delete: string[];
}

/**
 * 工具结果处理历史接口
 */
export interface ToolResultProcessingHistory {
  step: string;
  timestamp: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 工具结果使用统计接口
 */
export interface ToolResultUsage {
  accessCount: number;
  downloadCount: number;
  lastAccessedAt?: Date;
  lastDownloadedAt?: Date;
}

/**
 * 工具结果实体属性接口
 */
export interface ToolResultProps {
  readonly id: ID;
  readonly executionId: ID;
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: string;
  readonly duration: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
  readonly metadata: Record<string, unknown>;
  readonly type: string;
  readonly format: 'json' | 'text' | 'binary' | 'image' | 'audio' | 'video' | 'other';
  readonly size?: number;
  readonly hash?: string;
  readonly url?: string;
  readonly filePath?: string;
  readonly mimeType?: string;
  readonly encoding?: string;
  readonly compression?: ToolResultCompression;
  readonly encryption?: ToolResultEncryption;
  readonly signature?: ToolResultSignature;
  readonly checksum?: ToolResultChecksum;
  readonly expiresAt?: Timestamp;
  readonly permissions: ToolResultPermissions;
  readonly tags: string[];
  readonly category: string;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly status: 'draft' | 'processed' | 'validated' | 'archived' | 'deleted';
  readonly processingHistory: ToolResultProcessingHistory[];
  readonly dependencies: ID[];
  readonly consumers: ID[];
  readonly usage: ToolResultUsage;
}

/**
 * 工具结果实体
 *
 * 表示工具执行的结果
 * 职责：
 * - 结果数据管理
 * - 结果格式和类型管理
 * - 结果权限管理
 * - 结果使用统计
 *
 * 不负责：
 * - 业务逻辑判断（由ToolResultService负责）
 * - 序列化/反序列化（由Infrastructure层负责）
 */
export class ToolResult extends Entity {
  private readonly props: ToolResultProps;

  /**
   * 构造函数
   * @param props 工具结果属性
   */
  private constructor(props: ToolResultProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建成功结果
   * @param executionId 执行ID
   * @param data 结果数据
   * @param duration 执行持续时间
   * @param metadata 结果元数据
   * @param type 结果类型
   * @param format 结果格式
   * @returns 成功结果
   */
  public static createSuccess(
    executionId: ID,
    data: unknown,
    duration: number = 0,
    metadata: Record<string, unknown> = {},
    type: string = 'unknown',
    format: 'json' | 'text' | 'binary' | 'image' | 'audio' | 'video' | 'other' = 'json'
  ): ToolResult {
    const now = Timestamp.now();
    const id = ID.generate();

    const props: ToolResultProps = {
      id,
      executionId,
      success: true,
      data,
      error: undefined,
      duration,
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      metadata,
      type,
      format,
      size: undefined,
      hash: undefined,
      url: undefined,
      filePath: undefined,
      mimeType: undefined,
      encoding: undefined,
      compression: undefined,
      encryption: undefined,
      signature: undefined,
      checksum: undefined,
      expiresAt: undefined,
      permissions: { read: [], write: [], delete: [] },
      tags: [],
      category: 'general',
      priority: 'medium',
      status: 'draft',
      processingHistory: [],
      dependencies: [],
      consumers: [],
      usage: { accessCount: 0, downloadCount: 0 },
    };

    return new ToolResult(props);
  }

  /**
   * 创建失败结果
   * @param executionId 执行ID
   * @param error 错误信息
   * @param duration 执行持续时间
   * @param metadata 结果元数据
   * @param type 结果类型
   * @returns 失败结果
   */
  public static createFailure(
    executionId: ID,
    error: string,
    duration: number = 0,
    metadata: Record<string, unknown> = {},
    type: string = 'error'
  ): ToolResult {
    const now = Timestamp.now();
    const id = ID.generate();

    const props: ToolResultProps = {
      id,
      executionId,
      success: false,
      data: undefined,
      error,
      duration,
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      metadata,
      type,
      format: 'json',
      size: undefined,
      hash: undefined,
      url: undefined,
      filePath: undefined,
      mimeType: undefined,
      encoding: undefined,
      compression: undefined,
      encryption: undefined,
      signature: undefined,
      checksum: undefined,
      expiresAt: undefined,
      permissions: { read: [], write: [], delete: [] },
      tags: [],
      category: 'general',
      priority: 'medium',
      status: 'draft',
      processingHistory: [],
      dependencies: [],
      consumers: [],
      usage: { accessCount: 0, downloadCount: 0 },
    };

    return new ToolResult(props);
  }

  /**
   * 从已有属性重建工具结果
   * @param props 工具结果属性
   * @returns 工具结果实例
   */
  public static fromProps(props: ToolResultProps): ToolResult {
    return new ToolResult(props);
  }

  /**
   * 从JSON对象创建工具结果
   * @param json JSON对象
   * @returns 工具结果
   */
  public static fromJSON(json: Record<string, unknown>): ToolResult {
    const props: ToolResultProps = {
      id: ID.fromString(json['id'] as string),
      executionId: ID.fromString(json['executionId'] as string),
      success: json['success'] as boolean,
      data: json['data'],
      error: json['error'] as string,
      duration: json['duration'] as number,
      createdAt: Timestamp.fromDate(new Date(json['createdAt'] as string)),
      updatedAt: Timestamp.fromDate(new Date(json['updatedAt'] as string)),
      version: Version.create(json['version'] as string),
      metadata: json['metadata'] as Record<string, unknown>,
      type: json['type'] as string,
      format: json['format'] as 'json' | 'text' | 'binary' | 'image' | 'audio' | 'video' | 'other',
      size: json['size'] as number,
      hash: json['hash'] as string,
      url: json['url'] as string,
      filePath: json['filePath'] as string,
      mimeType: json['mimeType'] as string,
      encoding: json['encoding'] as string,
      compression: json['compression'] as ToolResultCompression,
      encryption: json['encryption'] as ToolResultEncryption,
      signature: json['signature'] as ToolResultSignature,
      checksum: json['checksum'] as ToolResultChecksum,
      expiresAt: json['expiresAt']
        ? Timestamp.fromDate(new Date(json['expiresAt'] as string))
        : undefined,
      permissions: json['permissions'] as ToolResultPermissions,
      tags: json['tags'] as string[],
      category: json['category'] as string,
      priority: json['priority'] as 'low' | 'medium' | 'high' | 'critical',
      status: json['status'] as 'draft' | 'processed' | 'validated' | 'archived' | 'deleted',
      processingHistory: (
        json['processingHistory'] as Array<{
          step: string;
          timestamp: string;
          status: 'pending' | 'running' | 'completed' | 'failed';
          duration?: number;
          error?: string;
          metadata?: Record<string, unknown>;
        }>
      ).map(step => ({
        step: step.step,
        timestamp: new Date(step.timestamp),
        status: step.status,
        duration: step.duration,
        error: step.error,
        metadata: step.metadata,
      })),
      dependencies: (json['dependencies'] as string[]).map(d => ID.fromString(d)),
      consumers: (json['consumers'] as string[]).map(c => ID.fromString(c)),
      usage: {
        accessCount: (json['usage'] as any).accessCount,
        downloadCount: (json['usage'] as any).downloadCount,
        lastAccessedAt: (json['usage'] as any).lastAccessedAt
          ? new Date((json['usage'] as any).lastAccessedAt)
          : undefined,
        lastDownloadedAt: (json['usage'] as any).lastDownloadedAt
          ? new Date((json['usage'] as any).lastDownloadedAt)
          : undefined,
      },
    };

    return new ToolResult(props);
  }

  // 属性访问器

  /**
   * 获取结果ID
   */
  public get resultId(): ID {
    return this.props.id;
  }

  /**
   * 获取执行ID
   */
  public get executionId(): ID {
    return this.props.executionId;
  }

  /**
   * 获取是否成功
   */
  public get success(): boolean {
    return this.props.success;
  }

  /**
   * 获取结果数据
   */
  public get data(): unknown | undefined {
    return this.props.data;
  }

  /**
   * 获取错误信息
   */
  public get error(): string | undefined {
    return this.props.error;
  }

  /**
   * 获取执行持续时间（毫秒）
   */
  public get duration(): number {
    return this.props.duration;
  }

  /**
   * 获取结果元数据
   */
  public get metadata(): Record<string, unknown> {
    return this.props.metadata;
  }

  /**
   * 获取结果类型
   */
  public get type(): string {
    return this.props.type;
  }

  /**
   * 获取结果格式
   */
  public get format(): 'json' | 'text' | 'binary' | 'image' | 'audio' | 'video' | 'other' {
    return this.props.format;
  }

  /**
   * 获取结果大小（字节）
   */
  public get size(): number | undefined {
    return this.props.size;
  }

  /**
   * 获取结果哈希
   */
  public get hash(): string | undefined {
    return this.props.hash;
  }

  /**
   * 获取结果URL
   */
  public get url(): string | undefined {
    return this.props.url;
  }

  /**
   * 获取结果文件路径
   */
  public get filePath(): string | undefined {
    return this.props.filePath;
  }

  /**
   * 获取结果MIME类型
   */
  public get mimeType(): string | undefined {
    return this.props.mimeType;
  }

  /**
   * 获取结果编码
   */
  public get encoding(): string | undefined {
    return this.props.encoding;
  }

  /**
   * 获取结果压缩信息
   */
  public get compression(): ToolResultCompression | undefined {
    return this.props.compression;
  }

  /**
   * 获取结果加密信息
   */
  public get encryption(): ToolResultEncryption | undefined {
    return this.props.encryption;
  }

  /**
   * 获取结果签名
   */
  public get signature(): ToolResultSignature | undefined {
    return this.props.signature;
  }

  /**
   * 获取结果校验和
   */
  public get checksum(): ToolResultChecksum | undefined {
    return this.props.checksum;
  }

  /**
   * 获取结果过期时间
   */
  public get expiresAt(): Timestamp | undefined {
    return this.props.expiresAt;
  }

  /**
   * 获取结果访问权限
   */
  public get permissions(): ToolResultPermissions {
    return { ...this.props.permissions };
  }

  /**
   * 获取结果标签
   */
  public get tags(): string[] {
    return [...this.props.tags];
  }

  /**
   * 获取结果分类
   */
  public get category(): string {
    return this.props.category;
  }

  /**
   * 获取结果优先级
   */
  public get priority(): 'low' | 'medium' | 'high' | 'critical' {
    return this.props.priority;
  }

  /**
   * 获取结果状态
   */
  public get status(): 'draft' | 'processed' | 'validated' | 'archived' | 'deleted' {
    return this.props.status;
  }

  /**
   * 获取结果处理历史
   */
  public get processingHistory(): ToolResultProcessingHistory[] {
    return [...this.props.processingHistory];
  }

  /**
   * 获取结果依赖
   */
  public get dependencies(): ID[] {
    return [...this.props.dependencies];
  }

  /**
   * 获取结果消费者
   */
  public get consumers(): ID[] {
    return [...this.props.consumers];
  }

  /**
   * 获取结果使用统计
   */
  public get usage(): ToolResultUsage {
    return { ...this.props.usage };
  }

  // 更新方法

  /**
   * 更新结果数据
   * @param data 新的结果数据
   * @param size 结果大小
   * @param hash 结果哈希
   * @param mimeType 结果MIME类型
   * @returns 更新后的结果
   */
  public updateData(data: unknown, size?: number, hash?: string, mimeType?: string): ToolResult {
    return new ToolResult({
      ...this.props,
      data,
      size,
      hash,
      mimeType,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新结果状态
   * @param status 新状态
   * @param step 处理步骤
   * @param error 错误信息
   * @param duration 处理持续时间
   * @param stepMetadata 步骤元数据
   * @returns 更新后的结果
   */
  public updateStatus(
    status: 'draft' | 'processed' | 'validated' | 'archived' | 'deleted',
    step?: string,
    error?: string,
    duration?: number,
    stepMetadata?: Record<string, unknown>
  ): ToolResult {
    const newHistory = [...this.props.processingHistory];

    if (step) {
      newHistory.push({
        step,
        timestamp: new Date(),
        status: status === 'deleted' ? 'failed' : 'completed',
        duration,
        error,
        metadata: stepMetadata,
      });
    }

    return new ToolResult({
      ...this.props,
      status,
      processingHistory: newHistory,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 添加标签
   * @param tag 标签
   * @returns 更新后的结果
   */
  public addTag(tag: string): ToolResult {
    if (this.props.tags.includes(tag)) {
      return this;
    }

    return new ToolResult({
      ...this.props,
      tags: [...this.props.tags, tag],
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 移除标签
   * @param tag 标签
   * @returns 更新后的结果
   */
  public removeTag(tag: string): ToolResult {
    if (!this.props.tags.includes(tag)) {
      return this;
    }

    return new ToolResult({
      ...this.props,
      tags: this.props.tags.filter(t => t !== tag),
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 记录访问
   * @returns 更新后的结果
   */
  public recordAccess(): ToolResult {
    return new ToolResult({
      ...this.props,
      usage: {
        ...this.props.usage,
        accessCount: this.props.usage.accessCount + 1,
        lastAccessedAt: new Date(),
      },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 记录下载
   * @returns 更新后的结果
   */
  public recordDownload(): ToolResult {
    return new ToolResult({
      ...this.props,
      usage: {
        ...this.props.usage,
        downloadCount: this.props.usage.downloadCount + 1,
        lastDownloadedAt: new Date(),
      },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   * @returns 更新后的结果
   */
  public updateMetadata(metadata: Record<string, unknown>): ToolResult {
    return new ToolResult({
      ...this.props,
      metadata: { ...this.props.metadata, ...metadata },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch(),
    });
  }

  // 查询方法

  /**
   * 检查是否已过期
   * @returns 是否已过期
   */
  public isExpired(): boolean {
    if (!this.props.expiresAt) {
      return false;
    }

    return new Date() > this.props.expiresAt.toDate();
  }

  /**
   * 检查是否有读取权限
   * @param userId 用户ID
   * @returns 是否有权限
   */
  public hasReadPermission(userId: string): boolean {
    return (
      this.props.permissions.read.includes(userId) || this.props.permissions.read.includes('*')
    );
  }

  /**
   * 检查是否有写入权限
   * @param userId 用户ID
   * @returns 是否有权限
   */
  public hasWritePermission(userId: string): boolean {
    return (
      this.props.permissions.write.includes(userId) || this.props.permissions.write.includes('*')
    );
  }

  /**
   * 检查是否有删除权限
   * @param userId 用户ID
   * @returns 是否有权限
   */
  public hasDeletePermission(userId: string): boolean {
    return (
      this.props.permissions.delete.includes(userId) || this.props.permissions.delete.includes('*')
    );
  }

  /**
   * 检查是否有指定标签
   * @param tag 标签
   * @returns 是否有标签
   */
  public hasTag(tag: string): boolean {
    return this.props.tags.includes(tag);
  }

  /**
   * 检查是否属于指定分类
   * @param category 分类
   * @returns 是否属于分类
   */
  public isInCategory(category: string): boolean {
    return this.props.category === category;
  }

  /**
   * 获取业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return `tool-result:${this.props.id.toString()}`;
  }

  /**
   * 获取工具结果属性（用于持久化）
   * @returns 工具结果属性
   */
  public toProps(): ToolResultProps {
    return this.props;
  }

  /**
   * 转换为JSON对象
   * @returns JSON对象
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this.props.id.value,
      executionId: this.props.executionId.value,
      success: this.props.success,
      data: this.props.data,
      error: this.props.error,
      duration: this.props.duration,
      createdAt: this.props.createdAt.toDate().toISOString(),
      updatedAt: this.props.updatedAt.toDate().toISOString(),
      version: this.props.version.toString(),
      metadata: this.props.metadata,
      type: this.props.type,
      format: this.props.format,
      size: this.props.size,
      hash: this.props.hash,
      url: this.props.url,
      filePath: this.props.filePath,
      mimeType: this.props.mimeType,
      encoding: this.props.encoding,
      compression: this.props.compression,
      encryption: this.props.encryption,
      signature: this.props.signature,
      checksum: this.props.checksum,
      expiresAt: this.props.expiresAt?.toDate().toISOString(),
      permissions: this.props.permissions,
      tags: this.props.tags,
      category: this.props.category,
      priority: this.props.priority,
      status: this.props.status,
      processingHistory: this.props.processingHistory.map(step => ({
        step: step.step,
        timestamp: step.timestamp.toISOString(),
        status: step.status,
        duration: step.duration,
        error: step.error,
        metadata: step.metadata,
      })),
      dependencies: this.props.dependencies.map(d => d.value),
      consumers: this.props.consumers.map(c => c.value),
      usage: {
        ...this.props.usage,
        lastAccessedAt: this.props.usage.lastAccessedAt?.toISOString(),
        lastDownloadedAt: this.props.usage.lastDownloadedAt?.toISOString(),
      },
    };
  }
}
