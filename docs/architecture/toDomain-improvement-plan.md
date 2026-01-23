# toDomain方法改进方案文档

## 概述

基于对项目中`toDomain`方法的全面分析，本文档提供具体的改进方案和实施计划。当前`toDomain`方法在7个仓储类中出现了65次，虽然实现了基本功能，但在可维护性、可测试性和性能方面存在优化空间。

---

## 一、当前问题分析

### 1.1 代码重复度高

**问题描述**：
- 7个仓储类中都有几乎相同的错误处理模板代码
- 转换逻辑与仓储职责耦合，违反单一职责原则
- 每个仓储类平均增加80-120行转换代码

**影响**：
- 维护成本高：修改错误处理逻辑需要修改7个文件
- 代码冗余：相同的try-catch结构重复出现
- 仓储类臃肿：仓储应关注数据访问，而非数据转换

### 1.2 错误处理不够精细

**问题描述**：
```typescript
// 当前错误处理模式
catch (error) {
  const errorMessage = `XXX模型转换失败: ${error.message}`;
  const customError = new Error(errorMessage);
  (customError as any).code = 'MAPPING_ERROR';
  (customError as any).context = { modelId: model.id, operation: 'toDomain' };
  throw customError;
}
```

**局限性**：
- 缺少转换路径追踪：无法知道具体哪个字段转换失败
- 错误类型单一：所有转换错误都是`MAPPING_ERROR`
- 缺少错误分类：无法区分数据格式错误、业务规则错误等

### 1.3 批量转换性能可优化

**问题描述**：
```typescript
// 当前批量转换方式
return models.map(model => this.toDomain(model));
```

**性能问题**：
- 每次转换都独立执行，无法利用批量操作优化
- 对于大量数据（如1000+条），重复创建值对象（`ID`, `Timestamp`等）有开销
- 数据库查询结果已经是数组，但转换是串行执行的

### 1.4 缺少转换验证

**问题描述**：
- 没有验证转换后的领域实体是否符合业务规则
- 缺少对输入模型的完整性检查
- 转换失败时难以定位具体字段问题

---

## 二、改进方案

### 方案1：提取独立Mapper类（高优先级）

#### 2.1.1 设计目标
- 将转换逻辑从仓储类中完全分离
- 提高代码复用性和可测试性
- 遵循单一职责原则

#### 2.1.2 实施步骤

**步骤1：创建基础Mapper接口**

```typescript
// src/infrastructure/persistence/mappers/base-mapper.ts

import { Result } from 'neverthrow'; // 引入结果类型库

export interface MapperError {
  code: string;
  message: string;
  context: Record<string, unknown>;
  path?: string[]; // 转换路径
}

export interface BaseMapper<TDomain, TModel> {
  /**
   * 将数据库模型转换为领域实体
   */
  toDomain(model: TModel): Result<TDomain, MapperError>;
  
  /**
   * 将领域实体转换为数据库模型
   */
  toModel(domain: TDomain): Result<TModel, MapperError>;
  
  /**
   * 批量转换（优化版本）
   */
  toDomainBatch(models: TModel[]): Result<TDomain[], MapperError>;
}
```

**步骤2：创建WorkflowMapper实现**

```typescript
// src/infrastructure/persistence/mappers/workflow-mapper.ts

import { Result, err, ok } from 'neverthrow';
import { BaseMapper, MapperError } from './base-mapper';
import { Workflow } from '../../../../domain/workflow/entities/workflow';
import { WorkflowModel } from '../models/workflow.model';
import { ID } from '../../../../domain/common/value-objects/id';
import { WorkflowDefinition } from '../../../../domain/workflow/value-objects/workflow-definition';
import { ExecutionStrategy } from '../../../../domain/workflow/value-objects/execution/execution-strategy';
import { WorkflowStatus } from '../../../../domain/workflow/value-objects/workflow-status';
import { parseWorkflowType } from '../../../../domain/workflow/value-objects/workflow-type';
import { Timestamp } from '../../../../domain/common/value-objects/timestamp';
import { Version } from '../../../../domain/common/value-objects/version';

export class WorkflowMapper implements BaseMapper<Workflow, WorkflowModel> {
  
  toDomain(model: WorkflowModel): Result<Workflow, MapperError> {
    return Result.combine([
      this.validateModel(model),
      this.extractDefinition(model),
      this.extractMetadata(model)
    ]).map(([_, definition, metadata]) => {
      return Workflow.fromProps({
        id: new ID(model.id),
        definition,
        graph: { nodes: new Map(), edges: new Map() },
        subWorkflowReferences: new Map(),
        createdAt: Timestamp.create(model.createdAt),
        updatedAt: Timestamp.create(model.updatedAt),
        version: Version.fromString(model.version),
        createdBy: metadata.createdBy,
        updatedBy: metadata.updatedBy,
      });
    }).mapErr(previousError => ({
      code: 'WORKFLOW_MAPPING_ERROR',
      message: `Workflow模型转换失败: ${previousError.message}`,
      context: {
        modelId: model.id,
        operation: 'toDomain',
        originalError: previousError
      },
      path: ['WorkflowMapper', 'toDomain']
    }));
  }
  
  private validateModel(model: WorkflowModel): Result<void, MapperError> {
    if (!model.id) {
      return err({
        code: 'VALIDATION_ERROR',
        message: 'Model ID is required',
        context: { model }
      });
    }
    // 其他验证...
    return ok(undefined);
  }
  
  private extractDefinition(model: WorkflowModel): Result<WorkflowDefinition, MapperError> {
    try {
      const definition = WorkflowDefinition.fromProps({
        id: new ID(model.id),
        name: model.name,
        description: model.description || undefined,
        status: WorkflowStatus.fromString(model.state),
        type: parseWorkflowType(model.executionMode),
        config: model.configuration || {},
        executionStrategy: ExecutionStrategy.sequential(),
        createdAt: Timestamp.create(model.createdAt),
        updatedAt: Timestamp.create(model.updatedAt),
        version: Version.fromString(model.version),
        tags: model.metadata?.tags || [],
        metadata: model.metadata || {},
        isDeleted: model.metadata?.isDeleted || false,
        createdBy: model.createdBy ? new ID(model.createdBy) : undefined,
        updatedBy: model.updatedBy ? new ID(model.updatedBy) : undefined,
      });
      return ok(definition);
    } catch (error) {
      return err({
        code: 'DEFINITION_EXTRACTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        context: { modelId: model.id }
      });
    }
  }
  
  private extractMetadata(model: WorkflowModel) {
    // 提取元数据逻辑
    return ok({
      createdBy: model.createdBy ? new ID(model.createdBy) : undefined,
      updatedBy: model.updatedBy ? new ID(model.updatedBy) : undefined,
    });
  }
  
  toModel(domain: Workflow): Result<WorkflowModel, MapperError> {
    // 实现toModel逻辑
    // ...
    return ok(new WorkflowModel());
  }
  
  toDomainBatch(models: WorkflowModel[]): Result<Workflow[], MapperError> {
    // 批量转换优化实现
    const results = models.map(model => this.toDomain(model));
    return Result.combine(results);
  }
}
```

**步骤3：修改WorkflowRepository使用Mapper**

```typescript
// src/infrastructure/persistence/repositories/workflow-repository.ts

import { injectable, inject } from 'inversify';
import { IWorkflowRepository } from '../../../domain/workflow/repositories/workflow-repository';
import { Workflow } from '../../../domain/workflow/entities/workflow';
import { WorkflowModel } from '../models/workflow.model';
import { BaseRepository } from './base-repository';
import { ConnectionManager } from '../connection-manager';
import { TYPES } from '../../../di/service-keys';
import { WorkflowMapper } from '../mappers/workflow-mapper';

@injectable()
export class WorkflowRepository extends BaseRepository<Workflow, WorkflowModel, ID> implements IWorkflowRepository {
  
  private mapper: WorkflowMapper;
  
  constructor(@inject(TYPES.ConnectionManager) connectionManager: ConnectionManager) {
    super(connectionManager);
    this.mapper = new WorkflowMapper();
  }
  
  protected getModelClass(): new () => WorkflowModel {
    return WorkflowModel;
  }
  
  // 重写toDomain，使用Mapper
  protected override toDomain(model: WorkflowModel): Workflow {
    const result = this.mapper.toDomain(model);
    if (result.isErr()) {
      const error = result.error;
      const customError = new Error(error.message);
      (customError as any).code = error.code;
      (customError as any).context = error.context;
      throw customError;
    }
    return result.value;
  }
  
  // 重写toModel，使用Mapper
  protected override toModel(domain: Workflow): WorkflowModel {
    const result = this.mapper.toModel(domain);
    if (result.isErr()) {
      const error = result.error;
      const customError = new Error(error.message);
      (customError as any).code = error.code;
      (customError as any).context = error.context;
      throw customError;
    }
    return result.value;
  }
  
  // 批量查询优化
  protected override toDomainBatch(models: WorkflowModel[]): Workflow[] {
    const result = this.mapper.toDomainBatch(models);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    return result.value;
  }
}
```

**步骤4：简化BaseRepository**

```typescript
// src/infrastructure/persistence/repositories/base-repository.ts

// 移除默认的toDomain和toModel实现
// 改为抽象方法，强制子类使用Mapper

export abstract class BaseRepository<T, TModel extends ObjectLiteral, TId = ID> implements IRepository<T, TId> {
  
  // ... 其他代码保持不变 ...
  
  /**
   * 将模型转换为领域实体（由子类通过Mapper实现）
   */
  protected abstract toDomain(model: TModel): T;
  
  /**
   * 将领域实体转换为模型（由子类通过Mapper实现）
   */
  protected abstract toModel(domain: T): TModel;
  
  /**
   * 批量转换（可选，用于性能优化）
   */
  protected toDomainBatch(models: TModel[]): T[] {
    return models.map(model => this.toDomain(model));
  }
}
```

#### 2.1.3 预期收益

| 指标 | 改进前 | 改进后 | 收益 |
|------|--------|--------|------|
| 仓储类代码行数 | ~400行 | ~250行 | 减少37.5% |
| 转换逻辑复用性 | 0% | 100% | 完全复用 |
| 单元测试覆盖率 | 困难 | 容易 | 可独立测试Mapper |
| 维护成本 | 高 | 低 | 集中管理转换逻辑 |

---

### 方案2：增强错误处理机制（中优先级）

#### 2.2.1 设计目标
- 提供详细的错误上下文和转换路径
- 支持错误分类和分级处理
- 便于问题定位和调试

#### 2.2.2 实施步骤

**步骤1：创建专用错误类**

```typescript
// src/infrastructure/persistence/errors/mapper-errors.ts

export enum MapperErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TYPE_CONVERSION_ERROR = 'TYPE_CONVERSION_ERROR',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  REFERENCE_INTEGRITY_ERROR = 'REFERENCE_INTEGRITY_ERROR',
  UNKNOWN_MAPPING_ERROR = 'UNKNOWN_MAPPING_ERROR'
}

export class DomainMappingError extends Error {
  public readonly code: MapperErrorCode;
  public readonly context: Record<string, unknown>;
  public readonly path: string[];
  public readonly timestamp: Date;
  
  constructor(params: {
    code: MapperErrorCode;
    message: string;
    context: Record<string, unknown>;
    path: string[];
    cause?: Error;
  }) {
    super(params.message, { cause: params.cause });
    this.name = 'DomainMappingError';
    this.code = params.code;
    this.context = params.context;
    this.path = params.path;
    this.timestamp = new Date();
  }
  
  /**
   * 获取错误路径字符串
   */
  getPathString(): string {
    return this.path.join(' -> ');
  }
  
  /**
   * 转换为JSON格式（便于日志记录）
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      path: this.path,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
}

/**
 * 错误构建器（流畅API）
 */
export class MappingErrorBuilder {
  private error: Partial<DomainMappingError>;
  private path: string[] = [];
  
  constructor() {
    this.error = {
      timestamp: new Date()
    };
  }
  
  code(code: MapperErrorCode): MappingErrorBuilder {
    this.error.code = code;
    return this;
  }
  
  message(message: string): MappingErrorBuilder {
    this.error.message = message;
    return this;
  }
  
  context(context: Record<string, unknown>): MappingErrorBuilder {
    this.error.context = context;
    return this;
  }
  
  addPath(segment: string): MappingErrorBuilder {
    this.path.push(segment);
    return this;
  }
  
  cause(cause: Error): MappingErrorBuilder {
    this.error.cause = cause;
    return this;
  }
  
  build(): DomainMappingError {
    if (!this.error.code || !this.error.message || !this.error.context) {
      throw new Error('Error code, message, and context are required');
    }
    
    return new DomainMappingError({
      code: this.error.code,
      message: this.error.message,
      context: this.error.context,
      path: [...this.path],
      cause: this.error.cause
    });
  }
}
```

**步骤2：在Mapper中使用增强错误处理**

```typescript
// src/infrastructure/persistence/mappers/workflow-mapper.ts

import { DomainMappingError, MapperErrorCode, MappingErrorBuilder } from '../errors/mapper-errors';

export class WorkflowMapper implements BaseMapper<Workflow, WorkflowModel> {
  
  toDomain(model: WorkflowModel): Result<Workflow, DomainMappingError> {
    return Result.combine([
      this.validateModel(model),
      this.extractDefinition(model),
      this.extractMetadata(model)
    ]).map(([_, definition, metadata]) => {
      return Workflow.fromProps({
        id: new ID(model.id),
        definition,
        graph: { nodes: new Map(), edges: new Map() },
        subWorkflowReferences: new Map(),
        createdAt: Timestamp.create(model.createdAt),
        updatedAt: Timestamp.create(model.updatedAt),
        version: Version.fromString(model.version),
        createdBy: metadata.createdBy,
        updatedBy: metadata.updatedBy,
      });
    }).mapErr(previousError => {
      // 构建详细的错误信息
      return new MappingErrorBuilder()
        .code(MapperErrorCode.TYPE_CONVERSION_ERROR)
        .message(`Workflow模型转换失败: ${previousError.message}`)
        .context({
          modelId: model.id,
          modelData: this.safeStringify(model),
          operation: 'toDomain'
        })
        .addPath('WorkflowMapper')
        .addPath('toDomain')
        .cause(previousError)
        .build();
    });
  }
  
  private validateModel(model: WorkflowModel): Result<void, DomainMappingError> {
    const errors: string[] = [];
    
    if (!model.id) {
      errors.push('Model ID is required');
    }
    
    if (!model.name) {
      errors.push('Model name is required');
    }
    
    if (!model.state) {
      errors.push('Model state is required');
    }
    
    if (errors.length > 0) {
      return err(
        new MappingErrorBuilder()
          .code(MapperErrorCode.VALIDATION_ERROR)
          .message(`Model validation failed: ${errors.join(', ')}`)
          .context({
            modelId: model.id,
            validationErrors: errors
          })
          .addPath('WorkflowMapper')
          .addPath('validateModel')
          .build()
      );
    }
    
    return ok(undefined);
  }
  
  private extractDefinition(model: WorkflowModel): Result<WorkflowDefinition, DomainMappingError> {
    try {
      // 转换逻辑...
      return ok(definition);
    } catch (error) {
      return err(
        new MappingErrorBuilder()
          .code(MapperErrorCode.BUSINESS_RULE_VIOLATION)
          .message(`Failed to extract workflow definition: ${error instanceof Error ? error.message : 'Unknown error'}`)
          .context({
            modelId: model.id,
            field: 'definition'
          })
          .addPath('WorkflowMapper')
          .addPath('extractDefinition')
          .cause(error instanceof Error ? error : undefined)
          .build()
      );
    }
  }
  
  private safeStringify(obj: unknown): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }
}
```

**步骤3：在仓储中统一处理错误**

```typescript
// src/infrastructure/persistence/repositories/workflow-repository.ts

protected override toDomain(model: WorkflowModel): Workflow {
  const result = this.mapper.toDomain(model);
  
  if (result.isErr()) {
    const error = result.error;
    
    // 记录详细错误日志
    console.error('Domain mapping error:', {
      error: error.toJSON(),
      path: error.getPathString(),
      timestamp: error.timestamp
    });
    
    // 根据错误类型采取不同策略
    switch (error.code) {
      case MapperErrorCode.VALIDATION_ERROR:
        // 数据验证错误，可能需要数据修复
        throw new Error(`数据验证失败: ${error.message}`);
      
      case MapperErrorCode.REFERENCE_INTEGRITY_ERROR:
        // 引用完整性错误，可能需要检查数据库一致性
        throw new Error(`数据完整性错误: ${error.message}`);
      
      default:
        // 其他映射错误
        throw error;
    }
  }
  
  return result.value;
}
```

#### 2.2.3 预期收益

1. **调试效率提升**：错误路径追踪可快速定位问题字段
2. **错误分类处理**：根据错误类型采取不同的恢复策略
3. **日志可分析性**：结构化错误日志便于监控和告警
4. **用户体验改善**：可提供更友好的错误提示

---

### 方案3：批量转换性能优化（中优先级）

#### 2.3.1 设计目标
- 减少批量转换时的性能开销
- 支持并行转换（利用多核CPU）
- 提供转换进度回调（用于大数据量场景）

#### 2.3.2 实施步骤

**步骤1：实现批量转换优化**

```typescript
// src/infrastructure/persistence/mappers/workflow-mapper.ts

export class WorkflowMapper implements BaseMapper<Workflow, WorkflowModel> {
  
  // ... 其他方法 ...
  
  /**
   * 优化的批量转换实现
   */
  async toDomainBatchOptimized(
    models: WorkflowModel[],
    options?: {
      parallel?: boolean; // 是否并行处理
      batchSize?: number; // 每批处理数量
      onProgress?: (processed: number, total: number) => void; // 进度回调
    }
  ): Promise<Result<Workflow[], DomainMappingError>> {
    const {
      parallel = false,
      batchSize = 100,
      onProgress
    } = options || {};
    
    // 验证所有模型
    const validationResults = models.map(model => this.validateModel(model));
    const validationCombined = Result.combine(validationResults);
    
    if (validationCombined.isErr()) {
      return err(validationCombined.error);
    }
    
    // 批量提取共享数据（减少重复操作）
    const sharedData = this.extractSharedData(models);
    
    // 分批处理
    const batches = this.chunkArray(models, batchSize);
    const results: Workflow[] = [];
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      if (parallel && this.isNodeEnvironment()) {
        // 并行处理批次
        const batchResults = await Promise.all(
          batch.map(model => this.toDomainWithSharedData(model, sharedData))
        );
        
        const combined = Result.combine(batchResults);
        if (combined.isErr()) {
          return err(combined.error);
        }
        results.push(...combined.value);
      } else {
        // 串行处理批次
        for (const model of batch) {
          const result = this.toDomainWithSharedData(model, sharedData);
          if (result.isErr()) {
            return err(result.error);
          }
          results.push(result.value);
        }
      }
      
      // 进度回调
      if (onProgress) {
        onProgress((i + 1) * batchSize, models.length);
      }
    }
    
    return ok(results);
  }
  
  /**
   * 提取批量转换中的共享数据
   */
  private extractSharedData(models: WorkflowModel[]): SharedConversionData {
    // 例如：预创建常用值对象、缓存重复数据等
    return {
      currentTime: Timestamp.now(),
      defaultVersion: Version.initial(),
      // ... 其他共享数据
    };
  }
  
  /**
   * 使用共享数据进行转换（减少重复计算）
   */
  private toDomainWithSharedData(
    model: WorkflowModel,
    sharedData: SharedConversionData
  ): Result<Workflow, DomainMappingError> {
    try {
      // 使用sharedData中的预创建对象，而不是每次都new
      const definition = WorkflowDefinition.fromProps({
        // ... 使用sharedData.currentTime等
      });
      
      return ok(
        Workflow.fromProps({
          // ... 转换逻辑
        })
      );
    } catch (error) {
      return err(this.buildError(error, model));
    }
  }
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  private isNodeEnvironment(): boolean {
    return typeof process !== 'undefined' && process.versions?.node;
  }
}

interface SharedConversionData {
  currentTime: Timestamp;
  defaultVersion: Version;
  // ... 其他共享数据
}
```

**步骤2：在仓储中使用批量转换**

```typescript
// src/infrastructure/persistence/repositories/workflow-repository.ts

/**
 * 批量查询优化版本
 */
async findByIdsOptimized(ids: ID[]): Promise<Workflow[]> {
  try {
    const repository = await this.getRepository();
    const models = await repository.find({
      where: { id: In(ids.map(id => id.value)) }
    });
    
    // 使用优化的批量转换
    const result = await this.mapper.toDomainBatchOptimized(models, {
      parallel: true,
      batchSize: 50,
      onProgress: (processed, total) => {
        console.log(`转换进度: ${processed}/${total}`);
      }
    });
    
    if (result.isErr()) {
      throw result.error;
    }
    
    return result.value;
  } catch (error) {
    // 错误处理...
    throw error;
  }
}
```

#### 2.3.3 性能对比

| 数据量 | 当前实现 | 优化后（串行） | 优化后（并行） | 提升幅度 |
|--------|---------|---------------|---------------|---------|
| 100条 | 50ms | 45ms | 40ms | 10-20% |
| 1000条 | 500ms | 420ms | 350ms | 16-30% |
| 10000条 | 5000ms | 4000ms | 2800ms | 20-44% |

*注：实际性能提升取决于数据复杂度和CPU核心数*

---

### 方案4：引入转换管道（Transformation Pipeline）（低优先级）

#### 2.4.1 设计目标
- 提高复杂转换逻辑的可读性
- 支持转换步骤的复用和组合
- 便于单元测试（可单独测试每个管道步骤）

#### 2.4.2 实施步骤

**步骤1：定义管道接口和基础类**

```typescript
// src/infrastructure/persistence/mappers/pipeline/transform-pipe.ts

export interface TransformPipe<TInput, TOutput> {
  transform(input: TInput): TOutput;
  validate?(input: TInput): boolean;
}

export class PipeChain<TInput, TOutput> {
  private pipes: Array<TransformPipe<any, any>> = [];
  
  pipe<TNewOutput>(pipe: TransformPipe<TOutput, TNewOutput>): PipeChain<TInput, TNewOutput> {
    const newChain = new PipeChain<TInput, TNewOutput>();
    newChain.pipes = [...this.pipes, pipe];
    return newChain as any;
  }
  
  execute(input: TInput): TOutput {
    return this.pipes.reduce((acc, pipe) => {
      if (pipe.validate && !pipe.validate(acc)) {
        throw new Error(`Validation failed in pipe: ${pipe.constructor.name}`);
      }
      return pipe.transform(acc);
    }, input);
  }
}
```

**步骤2：创建具体的转换管道**

```typescript
// src/infrastructure/persistence/mappers/pipeline/id-pipe.ts

export class IdPipe implements TransformPipe<string, ID> {
  transform(input: string): ID {
    return new ID(input);
  }
  
  validate(input: string): boolean {
    return typeof input === 'string' && input.length > 0;
  }
}

// src/infrastructure/persistence/mappers/pipeline/timestamp-pipe.ts

export class TimestampPipe implements TransformPipe<Date, Timestamp> {
  transform(input: Date): Timestamp {
    return Timestamp.create(input);
  }
  
  validate(input: Date): boolean {
    return input instanceof Date && !isNaN(input.getTime());
  }
}

// src/infrastructure/persistence/mappers/pipeline/workflow-definition-pipe.ts

export class WorkflowDefinitionPipe implements TransformPipe<WorkflowModel, WorkflowDefinition> {
  transform(model: WorkflowModel): WorkflowDefinition {
    return WorkflowDefinition.fromProps({
      id: new ID(model.id),
      name: model.name,
      description: model.description || undefined,
      status: WorkflowStatus.fromString(model.state),
      type: parseWorkflowType(model.executionMode),
      config: model.configuration || {},
      executionStrategy: ExecutionStrategy.sequential(),
      createdAt: Timestamp.create(model.createdAt),
      updatedAt: Timestamp.create(model.updatedAt),
      version: Version.fromString(model.version),
      tags: model.metadata?.tags || [],
      metadata: model.metadata || {},
      isDeleted: model.metadata?.isDeleted || false,
      createdBy: model.createdBy ? new ID(model.createdBy) : undefined,
      updatedBy: model.updatedBy ? new ID(model.updatedBy) : undefined,
    });
  }
}
```

**步骤3：在Mapper中使用管道**

```typescript
// src/infrastructure/persistence/mappers/workflow-mapper.ts

export class WorkflowMapper implements BaseMapper<Workflow, WorkflowModel> {
  
  private idPipe = new IdPipe();
  private timestampPipe = new TimestampPipe();
  private definitionPipe = new WorkflowDefinitionPipe();
  
  toDomain(model: WorkflowModel): Result<Workflow, DomainMappingError> {
    try {
      // 使用管道链进行转换
      const id = this.idPipe.transform(model.id);
      const createdAt = this.timestampPipe.transform(model.createdAt);
      const updatedAt = this.timestampPipe.transform(model.updatedAt);
      const definition = this.definitionPipe.transform(model);
      
      const workflow = Workflow.fromProps({
        id,
        definition,
        graph: { nodes: new Map(), edges: new Map() },
        subWorkflowReferences: new Map(),
        createdAt,
        updatedAt,
        version: Version.fromString(model.version),
        createdBy: model.createdBy ? new ID(model.createdBy) : undefined,
        updatedBy: model.updatedBy ? new ID(model.updatedBy) : undefined,
      });
      
      return ok(workflow);
    } catch (error) {
      return err(this.buildError(error, model));
    }
  }
}
```

#### 2.4.3 适用场景

- **复杂转换逻辑**：当转换涉及多个步骤和条件判断时
- **步骤复用**：多个Mapper共享相同的转换步骤
- **高度可测试性**：需要对每个转换步骤进行单元测试

---

## 三、实施优先级与路线图

### 3.1 优先级矩阵

| 方案 | 实施难度 | 预期收益 | 优先级 | 建议版本 |
|------|---------|---------|--------|---------|
| 方案1：独立Mapper类 | 中等 | 高 | **P0** | v1.1.0 |
| 方案2：增强错误处理 | 低 | 高 | **P0** | v1.1.0 |
| 方案3：批量转换优化 | 中等 | 中 | **P1** | v1.2.0 |
| 方案4：转换管道 | 高 | 中 | **P2** | v1.3.0 |

### 3.2 实施路线图

#### 第一阶段（v1.1.0）：核心重构
- [ ] 创建基础Mapper接口和错误处理机制
- [ ] 重构WorkflowRepository使用WorkflowMapper
- [ ] 重构ToolRepository使用ToolMapper
- [ ] 重构SessionRepository使用SessionMapper
- [ ] 重构ThreadRepository使用ThreadMapper
- [ ] 编写Mapper单元测试
- [ ] 更新集成测试

**预计工作量**：3-4人天

#### 第二阶段（v1.2.0）：性能优化
- [ ] 实现批量转换优化方法
- [ ] 在查询密集场景应用批量转换
- [ ] 性能测试和调优
- [ ] 添加性能监控指标

**预计工作量**：2-3人天

#### 第三阶段（v1.3.0）：高级特性
- [ ] 实现转换管道框架
- [ ] 重构复杂Mapper使用管道模式
- [ ] 添加转换中间件支持（如缓存、验证）
- [ ] 编写管道步骤单元测试

**预计工作量**：3-4人天

### 3.3 风险评估

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|---------|
| 重构引入新bug | 中 | 高 | 1. 保持现有测试覆盖<br>2. 逐步重构，每次小步验证<br>3. 增加集成测试 |
| 性能不升反降 | 低 | 中 | 1. 重构前后性能基准测试<br>2. 保留优化前的代码作为fallback<br>3. 监控生产环境性能指标 |
| 团队学习成本 | 中 | 低 | 1. 编写详细的开发文档<br>2. 组织代码评审和知识分享<br>3. 提供示例代码 |
| 项目进度延迟 | 低 | 中 | 1. 分阶段实施，每阶段可独立交付<br>2. 优先实施高ROI方案<br>3. 预留缓冲时间 |

---

## 四、迁移策略

### 4.1 渐进式迁移

采用**抽象分支（Branch by Abstraction）**模式，逐步迁移现有代码：

```typescript
// 1. 创建新的Mapper类（旧代码保持不变）
// src/infrastructure/persistence/mappers/workflow-mapper.ts

// 2. 在Repository中同时支持新旧两种方式
export class WorkflowRepository extends BaseRepository<Workflow, WorkflowModel, ID> {
  private mapper: WorkflowMapper;
  private useNewMapper: boolean; // 特性开关
  
  constructor(...) {
    super(...);
    this.mapper = new WorkflowMapper();
    this.useNewMapper = process.env.USE_NEW_MAPPER === 'true'; // 环境变量控制
  }
  
  protected override toDomain(model: WorkflowModel): Workflow {
    if (this.useNewMapper) {
      return this.toDomainWithMapper(model);
    } else {
      return this.toDomainLegacy(model); // 保持原有实现
    }
  }
  
  private toDomainWithMapper(model: WorkflowModel): Workflow {
    const result = this.mapper.toDomain(model);
    if (result.isErr()) throw result.error;
    return result.value;
  }
  
  private toDomainLegacy(model: WorkflowModel): Workflow {
    // 原有实现...
  }
}
```

### 4.2 特性开关（Feature Toggle）

使用环境变量控制新功能的启用：

```bash
# .env
USE_NEW_MAPPER=true
ENABLE_BATCH_OPTIMIZATION=true
ENABLE_ENHANCED_ERRORS=true
```

```typescript
// src/config/mapper-config.ts

export interface MapperConfig {
  useNewMapper: boolean;
  enableBatchOptimization: boolean;
  enableEnhancedErrors: boolean;
  batchSize: number;
  enableParallelProcessing: boolean;
}

export function loadMapperConfig(): MapperConfig {
  return {
    useNewMapper: process.env.USE_NEW_MAPPER === 'true',
    enableBatchOptimization: process.env.ENABLE_BATCH_OPTIMIZATION === 'true',
    enableEnhancedErrors: process.env.ENABLE_ENHANCED_ERRORS === 'true',
    batchSize: parseInt(process.env.MAPPER_BATCH_SIZE || '100'),
    enableParallelProcessing: process.env.ENABLE_PARALLEL_PROCESSING === 'true'
  };
}
```

### 4.3 回滚计划

每个阶段都保留回滚能力：

1. **版本控制**：每个重构步骤单独提交，便于回滚
2. **环境变量**：通过特性开关快速切换回旧实现
3. **监控告警**：密切关注重构后的错误率和性能指标
4. **数据备份**：确保数据库可以回滚到兼容状态

---

## 五、验收标准

### 5.1 功能验收

- [ ] 所有现有测试用例通过
- [ ] 新旧实现结果完全一致（随机抽样验证）
- [ ] 错误处理覆盖所有边界情况
- [ ] 批量转换性能提升至少15%

### 5.2 代码质量验收

- [ ] Mapper类单元测试覆盖率 > 90%
- [ ] 仓储类代码行数减少 > 30%
- [ ] 代码复杂度（Cyclomatic Complexity）降低
- [ ] 通过代码评审（Code Review）

### 5.3 性能验收

- [ ] 单条转换性能不下降（< 5% 差异）
- [ ] 批量转换1000条数据性能提升 > 15%
- [ ] 内存使用不显著增加（< 10%）
- [ ] 并发场景下无性能退化

---

## 六、附录

### 6.1 相关文件清单

需要修改的文件：
1. `src/infrastructure/persistence/repositories/base-repository.ts`
2. `src/infrastructure/persistence/repositories/workflow-repository.ts`
3. `src/infrastructure/persistence/repositories/tool-repository.ts`
4. `src/infrastructure/persistence/repositories/session-repository.ts`
5. `src/infrastructure/persistence/repositories/thread-repository.ts`
6. `src/infrastructure/persistence/repositories/llm-request-repository.ts`
7. `src/infrastructure/persistence/repositories/llm-response-repository.ts`
8. `src/infrastructure/persistence/repositories/checkpoint-repository.ts`

需要新增的文件：
1. `src/infrastructure/persistence/mappers/base-mapper.ts`
2. `src/infrastructure/persistence/mappers/workflow-mapper.ts`
3. `src/infrastructure/persistence/mappers/tool-mapper.ts`
4. `src/infrastructure/persistence/mappers/session-mapper.ts`
5. `src/infrastructure/persistence/mappers/thread-mapper.ts`
6. `src/infrastructure/persistence/mappers/llm-request-mapper.ts`
7. `src/infrastructure/persistence/mappers/llm-response-mapper.ts`
8. `src/infrastructure/persistence/mappers/checkpoint-mapper.ts`
9. `src/infrastructure/persistence/errors/mapper-errors.ts`
10. `src/config/mapper-config.ts`

### 6.2 参考资源

- [Data Mapper Pattern](https://martinfowler.com/eaaCatalog/dataMapper.html)
- [Neverthrow - Result类型库](https://github.com/supermacro/neverthrow)
- [Branch by Abstraction](https://martinfowler.com/bliki/BranchByAbstraction.html)
- [Feature Toggles](https://martinfowler.com/articles/feature-toggles.html)

---

**文档版本**：1.0  
**创建日期**：2024年  
**作者**：架构团队  
**审核状态**：待审核