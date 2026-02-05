# SDK API 目录结构重构计划

## 1. 问题分析

### 1.1 当前问题
当前 `sdk/api` 目录存在严重的分类混乱问题：

- **混合分类标准**：同时按功能域（conversation、management、registry）和操作性质（builders、code、tools、llm）进行分类
- **CRUD与业务操作混杂**：资源管理（CRUD）和业务操作没有清晰分离
- **职责边界模糊**：同一个功能可能分散在多个目录中
- **使用体验不一致**：开发者难以预测API的位置和使用方式

### 1.2 具体问题示例
- `registry/` 目录包含纯CRUD操作
- `management/` 目录混合了CRUD（checkpoint）和业务操作（event、trigger、variable）
- `code/` 和 `tools/` 目录同时包含注册（CRUD）和执行（业务）操作

## 2. 重构目标

### 2.1 核心原则
- **单一职责**：每个目录只负责一种类型的操作
- **清晰分层**：明确区分资源管理（CRUD）和业务操作
- **易于维护**：职责单一，便于扩展和维护
- **向后兼容**：通过双导出策略确保平滑过渡

### 2.2 预期收益
- 提高代码可读性和可维护性
- 改善开发者体验
- 降低新功能开发的认知负担
- 为未来扩展提供清晰的架构基础

## 3. 新目录结构方案

采用**按操作性质分层**的方案：

```
sdk/api/
├── resources/          # 资源管理API（纯CRUD操作）
│   ├── workflows/      # 工作流资源管理
│   ├── threads/        # 线程资源管理  
│   ├── templates/      # 模板资源管理
│   ├── tools/          # 工具资源管理
│   ├── scripts/        # 脚本资源管理
│   └── profiles/       # Profile资源管理
│
├── operations/         # 业务操作API
│   ├── execution/      # 执行相关操作
│   ├── conversation/   # 对话管理操作
│   ├── state/          # 状态管理操作
│   ├── events/         # 事件管理操作
│   ├── llm/            # LLM调用操作
│   └── code/           # 脚本执行操作
│
├── builders/           # 构建器（保持不变）
├── utils/              # 工具函数（保持不变）
├── types/              # 类型定义（保持不变）
├── validation/         # 验证（保持不变）
└── core/               # 核心入口（简化）
```

## 4. 详细迁移映射

### 4.1 资源管理API (CRUD Operations)

| 原路径 | 新路径 | 说明 |
|--------|--------|------|
| `registry/workflow-registry-api.ts` | `resources/workflows/workflow-registry-api.ts` | 工作流CRUD |
| `registry/thread-registry-api.ts` | `resources/threads/thread-registry-api.ts` | 线程CRUD |
| `template-registry/node-template-registry-api.ts` | `resources/templates/node-template-registry-api.ts` | 节点模板CRUD |
| `template-registry/trigger-template-registry-api.ts` | `resources/templates/trigger-template-registry-api.ts` | 触发器模板CRUD |
| `llm/profile-manager-api.ts` | `resources/profiles/profile-registry-api.ts` | Profile CRUD |

### 4.2 业务操作API (Business Operations)

| 原路径 | 新路径 | 说明 |
|--------|--------|------|
| `core/thread-executor-api.ts` | `operations/execution/thread-executor-api.ts` | 执行入口 |
| `conversation/message-manager-api.ts` | `operations/conversation/message-manager-api.ts` | 消息管理 |
| `management/variable-manager-api.ts` | `operations/state/variable-manager-api.ts` | 变量管理 |
| `management/checkpoint-manager-api.ts` | `operations/state/checkpoint-manager-api.ts` | 检查点管理 |
| `management/trigger-manager-api.ts` | `operations/state/trigger-manager-api.ts` | 触发器管理 |
| `management/event-manager-api.ts` | `operations/events/event-manager-api.ts` | 事件管理 |
| `llm/llm-wrapper-api.ts` | `operations/llm/llm-wrapper-api.ts` | LLM调用 |

### 4.3 拆分混合API

#### ToolServiceAPI 拆分
- **注册部分** → `resources/tools/tool-registry-api.ts`
- **执行部分** → `operations/tools/tool-execution-api.ts`

#### CodeServiceAPI 拆分  
- **注册部分** → `resources/scripts/script-registry-api.ts`
- **执行部分** → `operations/code/script-execution-api.ts`

## 5. 实施步骤

### 阶段1：准备工作
- [ ] 创建新目录结构
- [ ] 分析所有API依赖关系
- [ ] 制定详细的迁移清单

### 阶段2：资源管理API迁移
- [ ] 迁移WorkflowRegistryAPI
- [ ] 迁移ThreadRegistryAPI  
- [ ] 迁移模板相关API
- [ ] 拆分并迁移ToolServiceAPI
- [ ] 拆分并迁移CodeServiceAPI
- [ ] 迁移ProfileManagerAPI

### 阶段3：业务操作API迁移
- [ ] 迁移执行相关API
- [ ] 迁移对话管理API
- [ ] 迁移状态管理API
- [ ] 迁移事件管理API
- [ ] 迁移LLM调用API

### 阶段4：核心入口和类型更新
- [ ] 更新SDK类内部引用
- [ ] 更新index.ts导出结构
- [ ] 调整类型定义组织

### 阶段5：测试和验证
- [ ] 更新单元测试导入路径
- [ ] 运行完整集成测试
- [ ] 验证向后兼容性
- [ ] 更新API文档

## 6. 向后兼容性策略

### 6.1 双导出策略
在原位置保留导出别名：
```typescript
// sdk/api/registry/workflow-registry-api.ts
export { WorkflowRegistryAPI } from '../resources/workflows/workflow-registry-api';
```

### 6.2 弃用警告
添加JSDoc弃用注释：
```typescript
/**
 * @deprecated 请使用 resources/workflows/WorkflowRegistryAPI
 * 将在v3.0.0版本中移除
 */
```

### 6.3 渐进式迁移
- 允许开发者逐步迁移到新API结构
- 提供完整的迁移指南
- 在主要版本更新时移除旧路径

## 7. 风险评估和缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 导入路径错误 | 功能失效 | 使用IDE重构工具，仔细测试 |
| 循环依赖 | 编译失败 | 严格遵循分层原则 |
| 性能影响 | 响应变慢 | 重构不改变核心逻辑 |
| 兼容性破坏 | 用户代码报错 | 双导出策略确保完全兼容 |

## 8. 验收标准

- [ ] 所有现有功能正常工作
- [ ] 向后兼容性完全保持
- [ ] 新目录结构符合设计原则
- [ ] 所有测试通过
- [ ] 文档更新完成
- [ ] 开发者体验显著改善

## 9. 时间估算

虽然不提供具体时间估算，但建议按以下优先级执行：
1. **高优先级**：核心执行API和资源管理API
2. **中优先级**：状态管理和事件管理API  
3. **低优先级**：工具和脚本相关的拆分API

## 10. 后续优化

- 考虑进一步细化operations目录
- 评估是否需要引入更高级别的抽象
- 收集用户反馈持续改进API设计