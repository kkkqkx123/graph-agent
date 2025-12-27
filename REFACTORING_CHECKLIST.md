# Domain Services 移除 - 逐项检查清单

完成时间: 2025-12-27

## 第一阶段：WorkflowService ✅ DONE

- [x] WorkflowService - 移除 WorkflowDomainService
- [x] 更新AGENTS.md - 明确Domain层职责
- [x] 创建 REFACTORING_DOMAIN_SERVICES.md 指南

## 第二阶段：ThreadService ✅ DONE (4个文件)

### ThreadService ✅
- [x] 读取 ThreadDomainService 所有方法
- [x] thread-service.ts:
  - [x] 移除 import ThreadDomainService
  - [x] 移除构造函数注入
  - [x] 添加这些private方法：
    - validateThreadCreation()
    - validateThreadStart()
    - validateThreadPause()
    - validateThreadResume()
    - validateThreadCompletion()
    - validateThreadFailure()
    - validateThreadCancellation()
    - validateThreadPriorityUpdate()
  - [x] 替换所有调用
  - [x] 验证编译无误

### ThreadLifecycleService ✅
- [x] 移除 import ThreadDomainService
- [x] 移除构造函数注入
- [x] 添加对应private验证方法
- [x] 替换所有调用

### ThreadManagementService ✅
- [x] 移除 import ThreadDomainService
- [x] 移除构造函数注入
- [x] 添加 validateThreadPriorityUpdate() 方法
- [x] 替换调用

### ThreadMaintenanceService ✅
- [x] 移除 import ThreadDomainService
- [x] 移除构造函数注入
- [x] 注意：第110行和188行的调用已注释

## 第四阶段：SessionService ✅ DONE (4个文件)

### SessionService ✅
- [x] 移除 import SessionDomainService
- [x] 移除构造函数注入
- [x] 添加所有private验证方法
- [x] 替换所有调用

### SessionLifecycleService ✅
- [x] 移除 import SessionDomainService
- [x] 移除构造函数注入
- [x] 添加所有private验证方法
- [x] 替换所有调用

### SessionManagementService ✅
- [x] 移除 import SessionDomainService
- [x] 移除构造函数注入
- [x] 添加 validateConfigUpdate() 方法
- [x] 替换调用

### SessionMaintenanceService ✅
- [x] 移除 import SessionDomainService
- [x] 移除构造函数注入
- [x] 添加所有private验证方法
- [x] 替换所有调用

## 第三阶段：CheckpointService (5个文件 - 暂时跳过)

这些文件仍在使用 ThreadCheckpointDomainService。
当所有Domain Services都被移除后再处理。

## 第五阶段：最终清理

- [ ] 删除所有Domain Service文件
- [ ] 更新所有index.ts的exports
- [ ] 验证没有遗留import
- [ ] 运行 tsc --noEmit 检查编译错误
- [ ] 运行相关test
- [ ] 删除 REFACTORING_DOMAIN_SERVICES.md（完成后）
- [ ] 删除此文件（完成后）

## 预期结果

完成此重构后：

```
src/domain/
├── common/
├── sessions/
│   └── services/          // ❌ 应删除此目录
├── threads/
│   ├── services/          // ❌ 应删除此目录
│   └── checkpoints/
│       └── services/      // ❌ 应删除此目录
├── tools/
│   └── services/          // ❌ 应删除此目录
├── workflow/
│   └── services/          // ❌ 应删除此目录
├── history/
│   └── services/          // ❌ 应删除此目录
└── checkpoint/
    └── services/          // ❌ 应删除此目录

src/application/
├── sessions/services/     // ✅ 所有验证逻辑移这里
├── threads/services/      // ✅ 所有验证逻辑移这里
├── workflow/services/     // ✅ 已完成
└── ...
```

## 工作量估计

- WorkflowService: 完成 ✅
- ThreadService: 完成 ✅
- SessionService: 完成 ✅
- CheckpointService: ~3小时（跳过，稍后处理）
- 清理和验证: ~1小时
- **总计**: ~8小时（已花费 ~3小时）

## 进度：37.5% (3/8)
