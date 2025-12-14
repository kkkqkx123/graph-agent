import { ID } from '../../common/value-objects/id';

/**
 * 工具结果实体
 * 
 * 表示工具执行的结果
 */
export class ToolResult {
  /**
   * 结果ID
   */
  readonly id: ID;

  /**
   * 执行ID
   */
  readonly executionId: ID;

  /**
   * 是否成功
   */
  readonly success: boolean;

  /**
   * 结果数据
   */
  readonly data?: unknown;

  /**
   * 错误信息
   */
  readonly error?: string;

  /**
   * 执行持续时间（毫秒）
   */
  readonly duration: number;

  /**
   * 创建时间
   */
  readonly createdAt: Date;

  /**
   * 结果元数据
   */
  readonly metadata: Record<string, unknown>;

  /**
   * 结果类型
   */
  readonly type: string;

  /**
   * 结果格式
   */
  readonly format: 'json' | 'text' | 'binary' | 'image' | 'audio' | 'video' | 'other';

  /**
   * 结果大小（字节）
   */
  readonly size?: number;

  /**
   * 结果哈希
   */
  readonly hash?: string;

  /**
   * 结果URL（如果是外部资源）
   */
  readonly url?: string;

  /**
   * 结果文件路径（如果是本地文件）
   */
  readonly filePath?: string;

  /**
   * 结果MIME类型
   */
  readonly mimeType?: string;

  /**
   * 结果编码
   */
  readonly encoding?: string;

  /**
   * 结果压缩信息
   */
  readonly compression?: {
    algorithm: string;
    originalSize: number;
    compressedSize: number;
    ratio: number;
  };

  /**
   * 结果加密信息
   */
  readonly encryption?: {
    algorithm: string;
    keyId: string;
    iv: string;
  };

  /**
   * 结果签名
   */
  readonly signature?: {
    algorithm: string;
    value: string;
    publicKey: string;
  };

  /**
   * 结果校验和
   */
  readonly checksum?: {
    algorithm: string;
    value: string;
  };

  /**
   * 结果过期时间
   */
  readonly expiresAt?: Date;

  /**
   * 结果访问权限
   */
  readonly permissions: {
    read: string[];
    write: string[];
    delete: string[];
  };

  /**
   * 结果标签
   */
  readonly tags: string[];

  /**
   * 结果分类
   */
  readonly category: string;

  /**
   * 结果优先级
   */
  readonly priority: 'low' | 'medium' | 'high' | 'critical';

  /**
   * 结果状态
   */
  readonly status: 'draft' | 'processed' | 'validated' | 'archived' | 'deleted';

  /**
   * 结果处理历史
   */
  readonly processingHistory: Array<{
    step: string;
    timestamp: Date;
    status: 'pending' | 'running' | 'completed' | 'failed';
    duration?: number;
    error?: string;
    metadata?: Record<string, unknown>;
  }>;

  /**
   * 结果依赖
   */
  readonly dependencies: ID[];

  /**
   * 结果消费者
   */
  readonly consumers: ID[];

  /**
   * 结果使用统计
   */
  readonly usage: {
    accessCount: number;
    downloadCount: number;
    lastAccessedAt?: Date;
    lastDownloadedAt?: Date;
  };

  /**
   * 构造函数
   * 
   * @param id 结果ID
   * @param executionId 执行ID
   * @param success 是否成功
   * @param data 结果数据
   * @param error 错误信息
   * @param duration 执行持续时间
   * @param createdAt 创建时间
   * @param metadata 结果元数据
   * @param type 结果类型
   * @param format 结果格式
   * @param size 结果大小
   * @param hash 结果哈希
   * @param url 结果URL
   * @param filePath 结果文件路径
   * @param mimeType 结果MIME类型
   * @param encoding 结果编码
   * @param compression 结果压缩信息
   * @param encryption 结果加密信息
   * @param signature 结果签名
   * @param checksum 结果校验和
   * @param expiresAt 结果过期时间
   * @param permissions 结果访问权限
   * @param tags 结果标签
   * @param category 结果分类
   * @param priority 结果优先级
   * @param status 结果状态
   * @param processingHistory 结果处理历史
   * @param dependencies 结果依赖
   * @param consumers 结果消费者
   * @param usage 结果使用统计
   */
  constructor(
    id: ID,
    executionId: ID,
    success: boolean,
    data?: unknown,
    error?: string,
    duration: number = 0,
    createdAt: Date = new Date(),
    metadata: Record<string, unknown> = {},
    type: string = 'unknown',
    format: 'json' | 'text' | 'binary' | 'image' | 'audio' | 'video' | 'other' = 'json',
    size?: number,
    hash?: string,
    url?: string,
    filePath?: string,
    mimeType?: string,
    encoding?: string,
    compression?: {
      algorithm: string;
      originalSize: number;
      compressedSize: number;
      ratio: number;
    },
    encryption?: {
      algorithm: string;
      keyId: string;
      iv: string;
    },
    signature?: {
      algorithm: string;
      value: string;
      publicKey: string;
    },
    checksum?: {
      algorithm: string;
      value: string;
    },
    expiresAt?: Date,
    permissions: {
      read: string[];
      write: string[];
      delete: string[];
    } = { read: [], write: [], delete: [] },
    tags: string[] = [],
    category: string = 'general',
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    status: 'draft' | 'processed' | 'validated' | 'archived' | 'deleted' = 'draft',
    processingHistory: Array<{
      step: string;
      timestamp: Date;
      status: 'pending' | 'running' | 'completed' | 'failed';
      duration?: number;
      error?: string;
      metadata?: Record<string, unknown>;
    }> = [],
    dependencies: ID[] = [],
    consumers: ID[] = [],
    usage: {
      accessCount: number;
      downloadCount: number;
      lastAccessedAt?: Date;
      lastDownloadedAt?: Date;
    } = { accessCount: 0, downloadCount: 0 }
  ) {
    this.id = id;
    this.executionId = executionId;
    this.success = success;
    this.data = data;
    this.error = error;
    this.duration = duration;
    this.createdAt = createdAt;
    this.metadata = metadata;
    this.type = type;
    this.format = format;
    this.size = size;
    this.hash = hash;
    this.url = url;
    this.filePath = filePath;
    this.mimeType = mimeType;
    this.encoding = encoding;
    this.compression = compression;
    this.encryption = encryption;
    this.signature = signature;
    this.checksum = checksum;
    this.expiresAt = expiresAt;
    this.permissions = permissions;
    this.tags = tags;
    this.category = category;
    this.priority = priority;
    this.status = status;
    this.processingHistory = processingHistory;
    this.dependencies = dependencies;
    this.consumers = consumers;
    this.usage = usage;
  }

  /**
   * 创建成功结果
   * 
   * @param executionId 执行ID
   * @param data 结果数据
   * @param duration 执行持续时间
   * @param metadata 结果元数据
   * @param type 结果类型
   * @param format 结果格式
   * @returns 成功结果
   */
  static createSuccess(
    executionId: ID,
    data: unknown,
    duration: number = 0,
    metadata: Record<string, unknown> = {},
    type: string = 'unknown',
    format: 'json' | 'text' | 'binary' | 'image' | 'audio' | 'video' | 'other' = 'json'
  ): ToolResult {
    const id = ID.generate();
    const now = new Date();
    
    return new ToolResult(
      id,
      executionId,
      true,
      data,
      undefined,
      duration,
      now,
      metadata,
      type,
      format
    );
  }

  /**
   * 创建失败结果
   * 
   * @param executionId 执行ID
   * @param error 错误信息
   * @param duration 执行持续时间
   * @param metadata 结果元数据
   * @param type 结果类型
   * @returns 失败结果
   */
  static createFailure(
    executionId: ID,
    error: string,
    duration: number = 0,
    metadata: Record<string, unknown> = {},
    type: string = 'error'
  ): ToolResult {
    const id = ID.generate();
    const now = new Date();
    
    return new ToolResult(
      id,
      executionId,
      false,
      undefined,
      error,
      duration,
      now,
      metadata,
      type
    );
  }

  /**
   * 更新结果数据
   * 
   * @param data 新的结果数据
   * @param size 结果大小
   * @param hash 结果哈希
   * @param mimeType 结果MIME类型
   * @returns 更新后的结果
   */
  updateData(
    data: unknown,
    size?: number,
    hash?: string,
    mimeType?: string
  ): ToolResult {
    return new ToolResult(
      this.id,
      this.executionId,
      this.success,
      data,
      this.error,
      this.duration,
      this.createdAt,
      this.metadata,
      this.type,
      this.format,
      size,
      hash,
      this.url,
      this.filePath,
      mimeType,
      this.encoding,
      this.compression,
      this.encryption,
      this.signature,
      this.checksum,
      this.expiresAt,
      this.permissions,
      this.tags,
      this.category,
      this.priority,
      this.status,
      this.processingHistory,
      this.dependencies,
      this.consumers,
      this.usage
    );
  }

  /**
   * 更新结果状态
   * 
   * @param status 新状态
   * @param step 处理步骤
   * @param error 错误信息
   * @param duration 处理持续时间
   * @param stepMetadata 步骤元数据
   * @returns 更新后的结果
   */
  updateStatus(
    status: 'draft' | 'processed' | 'validated' | 'archived' | 'deleted',
    step?: string,
    error?: string,
    duration?: number,
    stepMetadata?: Record<string, unknown>
  ): ToolResult {
    const newHistory = [...this.processingHistory];
    
    if (step) {
      newHistory.push({
        step,
        timestamp: new Date(),
        status: status === 'deleted' ? 'failed' : 'completed',
        duration,
        error,
        metadata: stepMetadata
      });
    }
    
    return new ToolResult(
      this.id,
      this.executionId,
      this.success,
      this.data,
      this.error,
      this.duration,
      this.createdAt,
      this.metadata,
      this.type,
      this.format,
      this.size,
      this.hash,
      this.url,
      this.filePath,
      this.mimeType,
      this.encoding,
      this.compression,
      this.encryption,
      this.signature,
      this.checksum,
      this.expiresAt,
      this.permissions,
      this.tags,
      this.category,
      this.priority,
      status,
      newHistory,
      this.dependencies,
      this.consumers,
      this.usage
    );
  }

  /**
   * 添加标签
   * 
   * @param tag 标签
   * @returns 更新后的结果
   */
  addTag(tag: string): ToolResult {
    if (this.tags.includes(tag)) {
      return this;
    }

    return new ToolResult(
      this.id,
      this.executionId,
      this.success,
      this.data,
      this.error,
      this.duration,
      this.createdAt,
      this.metadata,
      this.type,
      this.format,
      this.size,
      this.hash,
      this.url,
      this.filePath,
      this.mimeType,
      this.encoding,
      this.compression,
      this.encryption,
      this.signature,
      this.checksum,
      this.expiresAt,
      this.permissions,
      [...this.tags, tag],
      this.category,
      this.priority,
      this.status,
      this.processingHistory,
      this.dependencies,
      this.consumers,
      this.usage
    );
  }

  /**
   * 移除标签
   * 
   * @param tag 标签
   * @returns 更新后的结果
   */
  removeTag(tag: string): ToolResult {
    if (!this.tags.includes(tag)) {
      return this;
    }

    return new ToolResult(
      this.id,
      this.executionId,
      this.success,
      this.data,
      this.error,
      this.duration,
      this.createdAt,
      this.metadata,
      this.type,
      this.format,
      this.size,
      this.hash,
      this.url,
      this.filePath,
      this.mimeType,
      this.encoding,
      this.compression,
      this.encryption,
      this.signature,
      this.checksum,
      this.expiresAt,
      this.permissions,
      this.tags.filter(t => t !== tag),
      this.category,
      this.priority,
      this.status,
      this.processingHistory,
      this.dependencies,
      this.consumers,
      this.usage
    );
  }

  /**
   * 记录访问
   * 
   * @returns 更新后的结果
   */
  recordAccess(): ToolResult {
    return new ToolResult(
      this.id,
      this.executionId,
      this.success,
      this.data,
      this.error,
      this.duration,
      this.createdAt,
      this.metadata,
      this.type,
      this.format,
      this.size,
      this.hash,
      this.url,
      this.filePath,
      this.mimeType,
      this.encoding,
      this.compression,
      this.encryption,
      this.signature,
      this.checksum,
      this.expiresAt,
      this.permissions,
      this.tags,
      this.category,
      this.priority,
      this.status,
      this.processingHistory,
      this.dependencies,
      this.consumers,
      {
        ...this.usage,
        accessCount: this.usage.accessCount + 1,
        lastAccessedAt: new Date()
      }
    );
  }

  /**
   * 记录下载
   * 
   * @returns 更新后的结果
   */
  recordDownload(): ToolResult {
    return new ToolResult(
      this.id,
      this.executionId,
      this.success,
      this.data,
      this.error,
      this.duration,
      this.createdAt,
      this.metadata,
      this.type,
      this.format,
      this.size,
      this.hash,
      this.url,
      this.filePath,
      this.mimeType,
      this.encoding,
      this.compression,
      this.encryption,
      this.signature,
      this.checksum,
      this.expiresAt,
      this.permissions,
      this.tags,
      this.category,
      this.priority,
      this.status,
      this.processingHistory,
      this.dependencies,
      this.consumers,
      {
        ...this.usage,
        downloadCount: this.usage.downloadCount + 1,
        lastDownloadedAt: new Date()
      }
    );
  }

  /**
   * 检查是否已过期
   * 
   * @returns 是否已过期
   */
  isExpired(): boolean {
    if (!this.expiresAt) {
      return false;
    }
    
    return new Date() > this.expiresAt;
  }

  /**
   * 检查是否有读取权限
   * 
   * @param userId 用户ID
   * @returns 是否有权限
   */
  hasReadPermission(userId: string): boolean {
    return this.permissions.read.includes(userId) || this.permissions.read.includes('*');
  }

  /**
   * 检查是否有写入权限
   * 
   * @param userId 用户ID
   * @returns 是否有权限
   */
  hasWritePermission(userId: string): boolean {
    return this.permissions.write.includes(userId) || this.permissions.write.includes('*');
  }

  /**
   * 检查是否有删除权限
   * 
   * @param userId 用户ID
   * @returns 是否有权限
   */
  hasDeletePermission(userId: string): boolean {
    return this.permissions.delete.includes(userId) || this.permissions.delete.includes('*');
  }

  /**
   * 检查是否有指定标签
   * 
   * @param tag 标签
   * @returns 是否有标签
   */
  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }

  /**
   * 检查是否属于指定分类
   * 
   * @param category 分类
   * @returns 是否属于分类
   */
  isInCategory(category: string): boolean {
    return this.category === category;
  }

  /**
   * 转换为JSON对象
   * 
   * @returns JSON对象
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id.value,
      executionId: this.executionId.value,
      success: this.success,
      data: this.data,
      error: this.error,
      duration: this.duration,
      createdAt: this.createdAt.toISOString(),
      metadata: this.metadata,
      type: this.type,
      format: this.format,
      size: this.size,
      hash: this.hash,
      url: this.url,
      filePath: this.filePath,
      mimeType: this.mimeType,
      encoding: this.encoding,
      compression: this.compression,
      encryption: this.encryption,
      signature: this.signature,
      checksum: this.checksum,
      expiresAt: this.expiresAt?.toISOString(),
      permissions: this.permissions,
      tags: this.tags,
      category: this.category,
      priority: this.priority,
      status: this.status,
      processingHistory: this.processingHistory.map(step => ({
        step: step.step,
        timestamp: step.timestamp.toISOString(),
        status: step.status,
        duration: step.duration,
        error: step.error,
        metadata: step.metadata
      })),
      dependencies: this.dependencies.map(d => d.value),
      consumers: this.consumers.map(c => c.value),
      usage: {
        ...this.usage,
        lastAccessedAt: this.usage.lastAccessedAt?.toISOString(),
        lastDownloadedAt: this.usage.lastDownloadedAt?.toISOString()
      }
    };
  }

  /**
   * 从JSON对象创建工具结果
   * 
   * @param json JSON对象
   * @returns 工具结果
   */
  static fromJSON(json: Record<string, unknown>): ToolResult {
    return new ToolResult(
      ID.fromString(json['id'] as string),
      ID.fromString(json['executionId'] as string),
      json['success'] as boolean,
      json['data'],
      json['error'] as string,
      json['duration'] as number,
      new Date(json['createdAt'] as string),
      json['metadata'] as Record<string, unknown>,
      json['type'] as string,
      json['format'] as 'json' | 'text' | 'binary' | 'image' | 'audio' | 'video' | 'other',
      json['size'] as number,
      json['hash'] as string,
      json['url'] as string,
      json['filePath'] as string,
      json['mimeType'] as string,
      json['encoding'] as string,
      json['compression'] as {
        algorithm: string;
        originalSize: number;
        compressedSize: number;
        ratio: number;
      },
      json['encryption'] as {
        algorithm: string;
        keyId: string;
        iv: string;
      },
      json['signature'] as {
        algorithm: string;
        value: string;
        publicKey: string;
      },
      json['checksum'] as {
        algorithm: string;
        value: string;
      },
      json['expiresAt'] ? new Date(json['expiresAt'] as string) : undefined,
      json['permissions'] as {
        read: string[];
        write: string[];
        delete: string[];
      },
      json['tags'] as string[],
      json['category'] as string,
      json['priority'] as 'low' | 'medium' | 'high' | 'critical',
      json['status'] as 'draft' | 'processed' | 'validated' | 'archived' | 'deleted',
      (json['processingHistory'] as Array<{
        step: string;
        timestamp: string;
        status: 'pending' | 'running' | 'completed' | 'failed';
        duration?: number;
        error?: string;
        metadata?: Record<string, unknown>;
      }>).map(step => ({
        step: step.step,
        timestamp: new Date(step.timestamp),
        status: step.status,
        duration: step.duration,
        error: step.error,
        metadata: step.metadata
      })),
      (json['dependencies'] as string[]).map(d => ID.fromString(d)),
      (json['consumers'] as string[]).map(c => ID.fromString(c)),
      {
        accessCount: (json['usage'] as any).accessCount,
        downloadCount: (json['usage'] as any).downloadCount,
        lastAccessedAt: (json['usage'] as any).lastAccessedAt ? new Date((json['usage'] as any).lastAccessedAt) : undefined,
        lastDownloadedAt: (json['usage'] as any).lastDownloadedAt ? new Date((json['usage'] as any).lastDownloadedAt) : undefined
      }
    );
  }
}