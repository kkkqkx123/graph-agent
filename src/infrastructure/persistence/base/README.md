# 查询构建器系统

## 概述

查询构建器系统是Repository架构优化的核心组件，提供了类型安全、流畅的API来构建复杂的数据库查询。该系统包含两个主要部分：QueryOptionsBuilder和QueryTemplateManager。

## 核心组件

### 1. QueryOptionsBuilder

提供流畅的API来构建查询选项，支持链式调用和类型安全的查询条件构建。

#### 主要功能

- **基础查询构建**：分页、排序、过滤
- **条件查询**：相等、不等、IN、NOT IN、LIKE、ILIKE
- **范围查询**：大于、小于、时间范围
- **JSON查询**：JSON包含、JSON路径查询
- **软删除处理**：排除软删除、只查询软删除
- **关联查询**：支持LEFT JOIN和INNER JOIN

#### 使用示例

```typescript
const builder = QueryOptionsBuilder.create<ThreadModel>()
  .equals('sessionId', sessionId.value)
  .equals('state', 'active')
  .greaterThan('priority', 5)
  .like('name', '%test%')
  .excludeSoftDeleted()
  .limit(20)
  .offset(0)
  .sortBy('priority')
  .sortOrder('desc');

const options = builder.build();
```

### 2. QueryTemplateManager

提供预定义查询模板、模板组合和缓存机制。

#### 预定义模板

- **timeRange**：时间范围查询模板
- **status**：状态查询模板
- **search**：搜索查询模板
- **pagination**：分页查询模板
- **activeRecords**：活跃记录查询模板
- **softDelete**：软删除查询模板

#### 使用示例

```typescript
// 使用时间范围模板
const builder = templateManager.buildWithTemplate('timeRange', {
  field: 'createdAt',
  startTime: new Date('2023-01-01'),
  endTime: new Date('2023-12-31')
});

// 使用搜索模板
const builder = templateManager.buildWithTemplate('search', {
  field: 'name',
  keyword: 'test'
});
```

## 集成到BaseRepository

BaseRepository现在集成了查询构建器系统，提供了以下新方法：

### 查询构建器方法

```typescript
// 创建查询选项构建器
protected createQueryOptionsBuilder(): QueryOptionsBuilder<TModel>

// 使用查询构建器查找实体
protected async findWithBuilder(builder: QueryOptionsBuilder<TModel>): Promise<T[]>

// 使用查询构建器查找单个实体
protected async findOneWithBuilder(builder: QueryOptionsBuilder<TModel>): Promise<T | null>

// 使用查询构建器进行分页查询
protected async findWithPaginationBuilder(builder: QueryOptionsBuilder<TModel>): Promise<PaginatedResult<T>>

// 使用查询构建器统计数量
protected async countWithBuilder(builder: QueryOptionsBuilder<TModel>): Promise<number>

// 使用模板构建查询
protected buildWithTemplate(templateName: string, params: any): QueryOptionsBuilder<TModel>

// 使用模板组合构建查询
protected buildWithComposition(compositionName: string): QueryOptionsBuilder<TModel>
```

## 性能优化

### 1. 缓存机制

- 模板结果缓存：相同参数的模板查询会被缓存
- 缓存统计：提供缓存大小和命中率统计

### 2. 性能测试结果

- **构建器创建**：1000个构建器实例创建 < 100ms
- **基础查询构建**：1000个基础查询选项构建 < 50ms
- **复杂查询构建**：100个复杂查询构建 < 100ms
- **模板使用**：100个模板查询构建 < 50ms
- **内存使用**：1000个构建器实例内存增加 < 10MB

### 3. 并发支持

- 支持并发查询构建
- 线程安全的模板管理

## 使用示例

### 1. 在Repository中使用

```typescript
export class ThreadRepository extends BaseRepository<Thread, ThreadModel, ID> implements IThreadRepository {
  
  async findBySessionId(sessionId: ID, options?: ThreadQueryOptions): Promise<Thread[]> {
    const builder = this.createQueryOptionsBuilder()
      .equals('sessionId', sessionId.value)
      .sortBy(options?.sortBy || 'createdAt')
      .sortOrder(options?.sortOrder || 'desc');

    if (options?.includeDeleted === false) {
      builder.excludeSoftDeleted();
    }

    if (options?.status) {
      builder.equals('state', options.status);
    }

    if (options?.priority) {
      builder.equals('priority', options.priority.toString());
    }

    if (options?.title) {
      builder.like('name', `%${options.title}%`);
    }

    if (options?.limit) {
      builder.limit(options.limit);
    }

    if (options?.offset) {
      builder.offset(options.offset);
    }

    return this.findWithBuilder(builder);
  }
}
```

### 2. 使用模板系统

```typescript
// 使用时间范围模板
const builder = this.buildWithTemplate('timeRange', {
  field: 'createdAt',
  startTime: new Date('2023-01-01'),
  endTime: new Date('2023-12-31')
});

// 使用搜索模板
const builder = this.buildWithTemplate('search', {
  field: 'name',
  keyword: options?.title || ''
});

return this.findWithBuilder(builder);
```

## 优势

### 1. 类型安全

- 编译时类型检查
- 字段名和类型验证
- 减少运行时错误

### 2. 代码复用

- 减少重复查询逻辑
- 标准化查询模式
- 统一的错误处理

### 3. 开发效率

- 流畅的API设计
- 链式调用支持
- 预定义模板加速开发

### 4. 性能优化

- 查询结果缓存
- 高效的构建器实例管理
- 优化的查询生成

## 扩展性

查询构建器系统设计具有良好的扩展性：

### 1. 自定义模板

可以轻松添加新的查询模板：

```typescript
const customTemplate: QueryTemplate<TModel> = {
  name: 'customQuery',
  description: '自定义查询模板',
  build: (params, builderOptions) => {
    return QueryOptionsBuilder.create<TModel>(builderOptions)
      .equals(params.field, params.value)
      .greaterThan('priority', params.minPriority);
  },
  validate: (params) => {
    return params.field && params.value && params.minPriority !== undefined;
  }
};

templateManager.registerTemplate(customTemplate);
```

### 2. 自定义构建器

可以扩展QueryOptionsBuilder添加自定义方法：

```typescript
class CustomQueryBuilder<TModel extends ObjectLiteral> extends QueryOptionsBuilder<TModel> {
  customCondition(field: keyof TModel, value: any): this {
    return this.where(qb => {
      qb.andWhere(`custom_function(${String(field)}) = :value`, { value });
    });
  }
}
```

## 测试覆盖

- **功能测试**：验证所有查询构建功能
- **性能测试**：验证性能指标
- **集成测试**：验证与BaseRepository的集成

## 总结

查询构建器系统成功实现了Repository架构优化的阶段2目标：

1. ✅ **实现了QueryOptionsBuilder**：提供类型安全、流畅的查询构建API
2. ✅ **创建了查询模板系统**：提供预定义查询模板和缓存机制
3. ✅ **集成到BaseRepository**：为所有Repository提供统一的查询构建能力
4. ✅ **性能测试和优化**：通过缓存和优化确保高性能

该系统显著提高了开发效率，减少了重复代码，并提供了更好的类型安全性和性能。