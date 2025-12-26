# BaseRepository重构迁移指南

## 概述

本指南描述了如何将原有的 [`base-repository.ts`](src/infrastructure/persistence/base/base-repository.ts:1) 重构为模块化设计的过程。

## 重构目标

1. **职责分离**: 将1102行的巨型文件拆分为多个职责单一的模块
2. **类型统一**: 解决类型定义混乱问题
3. **可维护性**: 提高代码可读性和可测试性
4. **向后兼容**: 确保现有代码无需修改即可继续工作

## 新文件结构

```
src/infrastructure/persistence/base/
├── base-repository.ts              # 精简版核心仓储基类（约300行，已替换原文件）
├── repository-error-handler.ts     # 错误处理模块
├── query-builder-helper.ts         # 查询构建器辅助类
├── soft-delete-manager.ts          # 软删除管理模块
├── transaction-manager.ts          # 事务管理模块
├── batch-operation-manager.ts      # 批量操作管理模块
├── query-conditions-applier.ts   # 查询条件应用器
├── repository-config.ts            # 仓储配置管理
├── type-converter-base.ts          # 类型转换器基础
├── types.ts                        # 统一类型定义导出
└── index.ts                        # 统一模块导出
```

## 主要变化

### 1. 职责分离

| 原职责 | 新模块 | 文件 |
|--------|--------|------|
| 错误处理 | RepositoryErrorHandler | [`repository-error-handler.ts`](src/infrastructure/persistence/base/repository-error-handler.ts:1) |
| 查询构建器辅助 | QueryBuilderHelper | [`query-builder-helper.ts`](src/infrastructure/persistence/base/query-builder-helper.ts:1) |
| 软删除管理 | SoftDeleteManager | [`soft-delete-manager.ts`](src/infrastructure/persistence/base/soft-delete-manager.ts:1) |
| 事务管理 | TransactionManager | [`transaction-manager.ts`](src/infrastructure/persistence/base/transaction-manager.ts:1) |
| 批量操作 | BatchOperationManager | [`batch-operation-manager.ts`](src/infrastructure/persistence/base/batch-operation-manager.ts:1) |
| 查询条件应用 | QueryConditionsApplier | [`query-conditions-applier.ts`](src/infrastructure/persistence/base/query-conditions-applier.ts:1) |
| 配置管理 | RepositoryConfig | [`repository-config.ts`](src/infrastructure/persistence/base/repository-config.ts:1) |

### 2. 类型定义统一

- 创建了 [`types.ts`](src/infrastructure/persistence/base/types.ts:1) 统一导出所有类型定义
- 删除了重复的 [`entity-mapper.ts`](src/infrastructure/persistence/base/entity-mapper.ts:1) 文件
- 统一使用类型转换器策略

### 3. API兼容性

所有公共API保持不变，现有子类无需修改即可继续工作。

## 迁移步骤

### 第一步：导入新模块

```typescript
// 旧方式
import { BaseRepository } from '@infrastructure/persistence/base/base-repository';

// 新方式（推荐）
import { BaseRepository } from '@infrastructure/persistence/base';
// 或者按需导入特定模块
import { RepositoryErrorHandler, SoftDeleteManager } from '@infrastructure/persistence/base';
```

### 第二步：更新自定义仓储类

```typescript
// 无需修改，直接继承新的BaseRepository
export class MyRepository extends BaseRepository<MyEntity, MyModel> {
  protected getModelClass(): new () => MyModel {
    return MyModel;
  }
}
```

### 第三步：使用类型转换器（可选）

```typescript
export class MyRepository extends BaseRepository<MyEntity, MyModel> {
  protected converters = {
    id: IdConverter,
    createdAt: TimestampConverter,
    // ... 其他字段转换器
  };
}
```

## 新功能

### 1. 模块化错误处理

```typescript
const errorHandler = new RepositoryErrorHandler();
await errorHandler.safeExecute(
  async () => {
    // 可能出错的操作
  },
  '操作名称',
  '实体名称'
);
```

### 2. 独立的软删除管理

```typescript
const softDeleteManager = new SoftDeleteManager(config);
await softDeleteManager.softDelete(repository, idWhere);
```

### 3. 独立的事务管理

```typescript
const transactionManager = new TransactionManager(dataSource);
await transactionManager.executeInTransaction(async () => {
  // 事务操作
});
```

### 4. 独立的批量操作管理

```typescript
const batchManager = new BatchOperationManager(repository);
await batchManager.saveBatch(models);
await batchManager.deleteWhere(filters, alias);
```

## 配置选项

```typescript
const config = new DefaultRepositoryConfig({
  queryBuilderOptions: {
    alias: 'entity',
    enableSoftDelete: true,
    defaultSortField: 'createdAt',
    defaultSortOrder: 'desc'
  },
  softDeleteConfig: {
    enabled: true,
    fieldName: 'isDeleted',
    deletedAtField: 'deletedAt',
    stateField: 'state',
    deletedValue: 'archived',
    activeValue: 'active'
  },
  defaultPageSize: 10,
  enableCaching: false
});
```

## 向后兼容性

- 所有公共API保持不变
- 现有子类无需修改即可继续工作
- 配置系统支持平滑迁移
- 错误处理保持原有行为

## 性能影响

- **零性能影响**: 重构主要是代码组织优化
- **更好的内存管理**: 模块按需加载
- **更好的错误处理**: 更详细的错误信息和上下文

## 测试

每个模块都可以独立测试：

```typescript
// 测试错误处理模块
describe('RepositoryErrorHandler', () => {
  it('应该正确处理连接错误', async () => {
    // 测试代码
  });
});

// 测试软删除管理模块
describe('SoftDeleteManager', () => {
  it('应该正确应用软删除', async () => {
    // 测试代码
  });
});
```

## 总结

这次重构将原有的巨型BaseRepository拆分为多个职责单一的模块，解决了类型定义混乱问题，提高了代码的可维护性和可测试性，同时保持了完全的向后兼容性。新的模块化设计为未来的功能扩展提供了更好的基础。