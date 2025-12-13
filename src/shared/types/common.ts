/**
 * 通用类型定义
 */

/**
 * 实体标识符
 */
export interface EntityId {
  value: string;
}

/**
 * 时间戳
 */
export interface Timestamp {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 版本信息
 */
export interface Version {
  value: string;
  major: number;
  minor: number;
  patch: number;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * 排序参数
 */
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * 查询参数
 */
export interface QueryParams extends PaginationParams {
  sort?: SortParams[];
  filters?: Record<string, any>;
}

/**
 * 操作结果
 */
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: Error;
  message?: string;
}

/**
 * 领域事件
 */
export interface DomainEvent {
  id: EntityId;
  type: string;
  aggregateId: EntityId;
  occurredOn: Date;
  data: Record<string, any>;
}

/**
 * 值对象基类
 */
export abstract class ValueObject {
  public abstract equals(other: ValueObject): boolean;
  public abstract hashCode(): string;
}

/**
 * 实体基类
 */
export abstract class Entity {
  public readonly id: EntityId;
  public readonly timestamp: Timestamp;

  constructor(id: EntityId, timestamp: Timestamp) {
    this.id = id;
    this.timestamp = timestamp;
  }

  public equals(other: Entity): boolean {
    return this.id.value === other.id.value;
  }

  public hashCode(): string {
    return this.id.value;
  }
}

/**
 * 聚合根基类
 */
export abstract class AggregateRoot extends Entity {
  private readonly _domainEvents: DomainEvent[] = [];

  protected constructor(id: EntityId, timestamp: Timestamp) {
    super(id, timestamp);
  }

  public get domainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }
}

/**
 * 仓储接口
 */
export interface IRepository<T extends Entity> {
  findById(id: EntityId): Promise<T | null>;
  findAll(params?: QueryParams): Promise<PaginatedResult<T>>;
  save(entity: T): Promise<T>;
  delete(id: EntityId): Promise<void>;
  exists(id: EntityId): Promise<boolean>;
}

/**
 * 服务接口
 */
export interface IService {
  initialize(): Promise<void>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
  dispose(): Promise<void>;
}

/**
 * 工厂接口
 */
export interface IFactory<T> {
  create(params: Record<string, any>): T;
}

/**
 * 规约接口
 */
export interface ISpecification<T> {
  isSatisfiedBy(candidate: T): boolean;
}

/**
 * 验证器接口
 */
export interface IValidator<T> {
  validate(candidate: T): ValidationResult;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * 验证错误
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}