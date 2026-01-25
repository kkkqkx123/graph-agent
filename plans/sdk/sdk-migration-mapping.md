# SDK功能迁移映射表

## 迁移原则
- ✅ 保留：SDK核心功能
- ❌ 移除：应用层专属功能
- ⚠️ 简化：保留核心，移除高级特性

---

## 一、执行引擎类功能

### 1.1 工作流执行
| 旧项目模块 | 迁移目标 | 说明 |
|------------|----------|------|
| `src/services/threads/thread-workflow-executor.ts` | `sdk/core/execution/workflow-executor.ts` | 核心工作流执行引擎 |
| `src/services/threads/execution/function-execution-engine.ts` | `sdk/core/execution/function-executor.ts` | 函数执行引擎 |
| `src/services/threads/execution/strategies/` | `sdk/core/execution/node-executors/` | 节点执行策略 |
| `src/services/threads/thread-state-manager.ts` | `sdk/core/state/thread-state.ts` | 线程状态管理 |
| `src/services/workflow/context-management.ts` | `sdk/core/state/workflow-context.ts` | 工作流上下文管理 |

### 1.2 路由和遍历
| 旧项目模块 | 迁移目标 | 说明 |
|------------|----------|------|
| `src/services/threads/thread-conditional-router.ts` | `sdk/core/execution/router.ts` | 条件路由逻辑 |
| `src/domain/workflow/value-objects/edge/` | `sdk/types/edge.ts` | 边定义和路由规则 |

---

## 二、LLM集成类功能

### 2.1 LLM核心
| 旧项目模块 | 迁移目标 | 说明 |
|------------|----------|------|
| `src/services/llm/wrapper.ts` | `sdk/core/llm/wrapper.ts` | LLM包装器 |
| `src/services/llm/managers/llm-wrapper-manager.ts` | `sdk/core/llm/wrapper-manager.ts` | 包装器管理器 |
| `src/infrastructure/llm/clients/llm-client-factory.ts` | `sdk/core/llm/client-factory.ts` | 客户端工厂 |
| `src/infrastructure/llm/clients/base-llm-client.ts` | `sdk/core/llm/base-client.ts` | LLM客户端基类 |

### 2.2 LLM提供商客户端
| 旧项目模块 | 迁移目标 | 说明 |
|------------|----------|------|
| `src/infrastructure/llm/clients/openai-chat-client.ts` | `sdk/core/llm/clients/openai.ts` | OpenAI客户端 |
| `src/infrastructure/llm/clients/openai-response-client.ts` | `sdk/core/llm/clients/openai.ts` | OpenAI Response API |
| `src/infrastructure/llm/clients/anthropic-client.ts` | `sdk/core/llm/clients/anthropic.ts` | Anthropic客户端 |
| `src/infrastructure/llm/clients/gemini-client.ts` | `sdk/core/llm/clients/gemini.ts` | Gemini客户端 |
| `src/infrastructure/llm/clients/gemini-openai-client.ts` | `sdk/core/llm/clients/gemini-openai.ts` | Gemini OpenAI兼容 |
| `src/infrastructure/llm/clients/mock-client.ts` | `sdk/core/llm/clients/mock.ts` | Mock客户端 |
| `src/infrastructure/llm/clients/human-relay-client.ts` | `sdk/core/llm/clients/human-relay.ts` | 人工中继客户端 |

### 2.3 LLM应用层功能（❌ 移除）
| 旧项目模块 | 决策 | 说明 |
|------------|------|------|
| `src/infrastructure/llm/rate-limiters/` | ❌ 移除 | 速率限制是应用层关注点 |
| `src/infrastructure/llm/retry/` | ❌ 移除 | 重试策略是应用层关注点 |
| `src/infrastructure/llm/token-calculators/` | ❌ 移除 | Token计算是应用层监控功能 |
| `src/services/llm/managers/pool-manager.ts` | ❌ 移除 | 连接池管理是应用层优化 |
| `src/services/llm/managers/task-group-manager.ts` | ❌ 移除 | 任务组管理是应用层功能 |

---

## 三、工具执行类功能

### 3.1 工具框架
| 旧项目模块 | 迁移目标 | 说明 |
|------------|----------|------|
| `src/services/tools/tool-service.ts` | `sdk/core/tools/tool-service.ts` | 工具服务 |
| `src/services/tools/executors/tool-executor-base.ts` | `sdk/core/tools/executor-base.ts` | 执行器基类 |
| `src/domain/tools/entities/tool.ts` | `sdk/types/tool.ts` | 工具定义 |
| `src/domain/tools/entities/tool-execution.ts` | `sdk/types/tool.ts` | 工具执行 |
| `src/domain/tools/entities/tool-result.ts` | `sdk/types/tool.ts` | 工具结果 |

### 3.2 工具执行器
| 旧项目模块 | 迁移目标 | 说明 |
|------------|----------|------|
| `src/services/tools/executors/builtin-executor.ts` | `sdk/core/tools/executors/builtin.ts` | 内置工具执行器 |
| `src/services/tools/executors/native-executor.ts` | `sdk/core/tools/executors/native.ts` | 本地工具执行器 |
| `src/services/tools/executors/rest-executor.ts` | `sdk/core/tools/executors/rest.ts` | REST工具执行器 |
| `src/services/tools/executors/mcp-executor.ts` | `sdk/core/tools/executors/mcp.ts` | MCP工具执行器 |

### 3.3 工具配置（⚠️ 简化）
| 旧项目模块 | 决策 | 说明 |
|------------|------|------|
| `src/infrastructure/config/loading/config-loading-module.ts` | ❌ 移除 | 配置通过API参数传递 |
| `src/services/tools/tool-service.ts`中的配置加载 | ⚠️ 简化 | 改为运行时参数 |

---

## 四、领域模型类功能

### 4.1 核心实体（迁移到types/）
| 旧项目模块 | 迁移目标 | 说明 |
|------------|----------|------|
| `src/domain/workflow/entities/workflow.ts` | `sdk/types/workflow.ts` | 工作流实体 |
| `src/domain/threads/entities/thread.ts` | `sdk/types/thread.ts` | 线程实体 |
| `src/domain/workflow/entities/node/` | `sdk/types/node.ts` | 节点实体 |
| `src/domain/workflow/value-objects/edge/` | `sdk/types/edge.ts` | 边实体 |
| `src/domain/tools/entities/tool.ts` | `sdk/types/tool.ts` | 工具实体 |

### 4.2 值对象（迁移到types/）
| 旧项目模块 | 迁移目标 | 说明 |
|------------|----------|------|
| `src/domain/common/value-objects/id.ts` | `sdk/types/common.ts` | ID值对象 |
| `src/domain/common/value-objects/timestamp.ts` | `sdk/types/common.ts` | 时间戳 |
| `src/domain/common/value-objects/version.ts` | `sdk/types/common.ts` | 版本 |
| `src/domain/workflow/value-objects/node/` | `sdk/types/node.ts` | 节点值对象 |
| `src/domain/workflow/value-objects/workflow-status.ts` | `sdk/types/workflow.ts` | 工作流状态 |
| `src/domain/threads/value-objects/thread-status.ts` | `sdk/types/thread.ts` | 线程状态 |
| `src/domain/tools/value-objects/tool-status.ts` | `sdk/types/tool.ts` | 工具状态 |
| `src/domain/tools/value-objects/tool-type.ts` | `sdk/types/tool.ts` | 工具类型 |

### 4.3 应用层实体（❌ 移除）
| 旧项目模块 | 决策 | 说明 |
|------------|------|------|
| `src/domain/sessions/` | ❌ 移除 | 会话是应用层概念 |
| `src/domain/prompts/` | ❌ 移除 | Prompt是应用层关注点 |
| `src/domain/interaction/` | ❌ 移除 | 交互是应用层逻辑 |
| `src/domain/llm/entities/` | ❌ 移除 | LLM实体是应用层封装 |

---

## 五、验证类功能

### 5.1 工作流验证
| 旧项目模块 | 迁移目标 | 说明 |
|------------|----------|------|
| `src/services/workflow/validators/workflow-structure-validator.ts` | `sdk/core/validation/workflow-validator.ts` | 工作流结构验证 |
| `src/domain/workflow/value-objects/workflow-definition.ts` | `sdk/types/workflow.ts` | 工作流定义验证 |

### 5.2 应用层验证（❌ 移除）
| 旧项目模块 | 决策 | 说明 |
|------------|------|------|
| `src/services/workflow/validators/subworkflow-validator.ts` | ❌ 移除 | 子工作流验证是应用层功能 |

---

## 六、检查点类功能（⚠️ 可选）

### 6.1 轻量级检查点（建议保留）
| 旧项目模块 | 迁移目标 | 说明 |
|------------|----------|------|
| `src/services/checkpoints/checkpoint-creation.ts` | `sdk/core/checkpoint/creation.ts` | 检查点创建 |
| `src/services/checkpoints/checkpoint-restore.ts` | `sdk/core/checkpoint/restore.ts` | 检查点恢复 |
| `src/domain/threads/checkpoints/entities/checkpoint.ts` | `sdk/types/checkpoint.ts` | 检查点实体 |

### 6.2 应用层检查点功能（❌ 移除）
| 旧项目模块 | 决策 | 说明 |
|------------|------|------|
| `src/services/checkpoints/checkpoint-query.ts` | ❌ 移除 | 查询是应用层功能 |
| `src/services/checkpoints/checkpoint-cleanup.ts` | ❌ 移除 | 清理是应用层维护功能 |
| `src/services/checkpoints/checkpoint-backup.ts` | ❌ 移除 | 备份是应用层功能 |
| `src/services/checkpoints/checkpoint-analysis.ts` | ❌ 移除 | 分析是应用层功能 |
| `src/services/checkpoints/checkpoint-management.ts` | ❌ 移除 | 综合管理是应用层功能 |

---

## 七、状态管理类功能（⚠️ 简化）

### 7.1 核心状态管理（保留）
| 旧项目模块 | 迁移目标 | 说明 |
|------------|----------|------|
| `src/services/state/state-management.ts` | `sdk/core/state/manager.ts` | 状态管理 |
| `src/domain/state/entities/state.ts` | `sdk/types/state.ts` | 状态实体 |

### 7.2 应用层状态功能（❌ 移除）
| 旧项目模块 | 决策 | 说明 |
|------------|------|------|
| `src/services/state/state-history.ts` | ❌ 移除 | 历史记录是应用层功能 |
| `src/services/state/state-recovery.ts` | ❌ 移除 | 恢复机制是应用层容错功能 |

---

## 八、交互类功能（❌ 全部移除）

| 旧项目模块 | 决策 | 说明 |
|------------|------|------|
| `src/services/interaction/interaction-engine.ts` | ❌ 移除 | 交互引擎是应用层逻辑 |
| `src/services/interaction/agent-loop.ts` | ❌ 移除 | Agent循环是应用层模式 |
| `src/services/interaction/message-summarizer.ts` | ❌ 移除 | 消息摘要是应用层功能 |
| `src/services/interaction/executors/` | ❌ 移除 | 执行器是应用层封装 |
| `src/services/interaction/managers/` | ❌ 移除 | 管理器是应用层功能 |
| `src/domain/interaction/` | ❌ 移除 | 交互领域模型是应用层概念 |

---

## 九、提示词类功能（❌ 全部移除）

| 旧项目模块 | 决策 | 说明 |
|------------|------|------|
| `src/services/prompts/prompt-builder.ts` | ❌ 移除 | Prompt构建是应用层工程 |
| `src/services/prompts/template-processor.ts` | ❌ 移除 | 模板处理是应用层功能 |
| `src/services/prompts/prompt-reference-parser.ts` | ❌ 移除 | 引用解析是应用层功能 |
| `src/services/prompts/prompt-reference-validator.ts` | ❌ 移除 | 验证是应用层功能 |
| `src/domain/prompts/` | ❌ 移除 | Prompt领域模型是应用层概念 |

---

## 十、基础设施类功能（❌ 全部移除）

### 10.1 持久化（❌ 移除）
| 旧项目模块 | 决策 | 说明 |
|------------|------|------|
| `src/infrastructure/persistence/connection-manager.ts` | ❌ 移除 | 数据库连接是应用层决策 |
| `src/infrastructure/persistence/repositories/` | ❌ 移除 | 仓储实现是应用层策略 |
| `src/infrastructure/persistence/mappers/` | ❌ 移除 | 对象映射是应用层细节 |
| `src/infrastructure/persistence/models/` | ❌ 移除 | 数据库模型是应用层设计 |

### 10.2 日志（❌ 移除）
| 旧项目模块 | 决策 | 说明 |
|------------|------|------|
| `src/infrastructure/logging/logger.ts` | ❌ 移除 | 具体日志实现是应用层选择 |
| `src/infrastructure/logging/logger-factory.ts` | ❌ 移除 | 日志工厂是应用层封装 |
| `src/infrastructure/logging/formatters/` | ❌ 移除 | 格式化是应用层格式 |
| `src/infrastructure/logging/transports/` | ❌ 移除 | 传输方式是应用层输出 |
| `src/domain/common/types/logger-types.ts` | ✅ 保留接口 | 只保留ILogger接口定义 |

### 10.3 配置（❌ 移除）
| 旧项目模块 | 决策 | 说明 |
|------------|------|------|
| `src/infrastructure/config/config.ts` | ❌ 移除 | 配置加载是应用层管理 |
| `src/infrastructure/config/loading/` | ❌ 移除 | 配置加载是应用层功能 |
| `src/infrastructure/config/processors/` | ❌ 移除 | 配置处理是应用层逻辑 |
| `src/infrastructure/config/services/` | ❌ 移除 | 配置服务是应用层功能 |

---

## 十一、会话管理类功能（❌ 全部移除）

| 旧项目模块 | 决策 | 说明 |
|------------|------|------|
| `src/services/sessions/session-management.ts` | ❌ 移除 | 会话管理是应用层功能 |
| `src/services/sessions/session-lifecycle.ts` | ❌ 移除 | 生命周期是应用层管理 |
| `src/services/sessions/session-maintenance.ts` | ❌ 移除 | 维护是应用层功能 |
| `src/services/sessions/session-monitoring.ts` | ❌ 移除 | 监控是应用层功能 |
| `src/services/sessions/session-orchestration.ts` | ❌ 移除 | 编排是应用层功能 |
| `src/services/sessions/session-resource.ts` | ❌ 移除 | 资源管理是应用层功能 |
| `src/services/sessions/session-checkpoint-management.ts` | ❌ 移除 | 会话检查点是应用层功能 |
| `src/domain/sessions/` | ❌ 移除 | 会话领域模型是应用层概念 |

---

## 十二、通用功能

### 12.1 基础功能（迁移）
| 旧项目模块 | 迁移目标 | 说明 |
|------------|----------|------|
| `src/services/common/base-service.ts` | `sdk/core/base.ts` | 基础服务类 |
| `src/domain/common/exceptions/` | `sdk/types/errors.ts` | 异常定义 |
| `src/domain/common/base/entity.ts` | `sdk/types/common.ts` | 实体基类 |

### 12.2 应用层通用功能（❌ 移除）
| 旧项目模块 | 决策 | 说明 |
|------------|------|------|
| `src/di/` | ❌ 移除 | DI容器是应用层选择 |
| `src/application/` | ❌ 移除 | 应用层接口是应用层逻辑 |

---

## 十三、迁移优先级建议

### 第一阶段：核心执行引擎（必须）
1. `thread-workflow-executor.ts` → `core/execution/workflow-executor.ts`
2. `function-execution-engine.ts` → `core/execution/function-executor.ts`
3. `thread-state-manager.ts` → `core/state/thread-state.ts`
4. `context-management.ts` → `core/state/workflow-context.ts`
5. 所有节点执行策略 → `core/execution/node-executors/`

### 第二阶段：LLM集成（必须）
1. `wrapper.ts` → `core/llm/wrapper.ts`
2. `llm-wrapper-manager.ts` → `core/llm/wrapper-manager.ts`
3. `llm-client-factory.ts` → `core/llm/client-factory.ts`
4. 所有LLM客户端 → `core/llm/clients/`

### 第三阶段：工具框架（必须）
1. `tool-service.ts` → `core/tools/tool-service.ts`
2. `tool-executor-base.ts` → `core/tools/executor-base.ts`
3. 所有工具执行器 → `core/tools/executors/`

### 第四阶段：领域模型（必须）
1. `workflow.ts` → `types/workflow.ts`
2. `thread.ts` → `types/thread.ts`
3. `node/` → `types/node.ts`
4. `edge/` → `types/edge.ts`
5. `tool.ts` → `types/tool.ts`
6. 所有值对象 → `types/common.ts`

### 第五阶段：验证（必须）
1. `workflow-structure-validator.ts` → `core/validation/workflow-validator.ts`

### 第六阶段：可选功能（按需）
1. 检查点功能 → `core/checkpoint/`
2. 状态管理 → `core/state/`

---

## 十四、总结

### 保留的核心功能（SDK必需）
- ✅ 工作流执行引擎
- ✅ 函数/节点执行器
- ✅ 状态管理（轻量级）
- ✅ LLM集成（多提供商）
- ✅ 工具执行框架
- ✅ 核心领域模型
- ✅ 工作流结构验证
- ✅ 基础工具类

### 移除的应用层功能
- ❌ 会话管理
- ❌ 持久化（Repository实现）
- ❌ 配置管理
- ❌ 日志实现
- ❌ 交互引擎
- ❌ Prompt工程
- ❌ 监控和维护
- ❌ 速率限制和重试
- ❌ 高级路由（分叉/合并）

### 简化的可选功能
- ⚠️ 检查点（保留创建/恢复，移除查询/清理/分析）
- ⚠️ 状态历史（移除）
- ⚠️ 状态恢复（移除）

---

## 十五、编程任务清单

### 任务1：创建SDK目录结构
```
sdk/
├── core/
│   ├── execution/
│   ├── state/
│   ├── llm/
│   ├── tools/
│   └── validation/
├── types/
├── api/
└── utils/
```

### 任务2：实现types层
- [ ] `types/workflow.ts` - 工作流类型
- [ ] `types/node.ts` - 节点类型
- [ ] `types/edge.ts` - 边类型
- [ ] `types/thread.ts` - 线程类型
- [ ] `types/tool.ts` - 工具类型
- [ ] `types/llm.ts` - LLM类型
- [ ] `types/execution.ts` - 执行类型
- [ ] `types/events.ts` - 事件类型
- [ ] `types/repositories.ts` - 仓储接口
- [ ] `types/errors.ts` - 错误类型

### 任务3：实现core层 - 执行引擎
- [ ] `core/execution/workflow-executor.ts` - 工作流执行器
- [ ] `core/execution/function-executor.ts` - 函数执行器
- [ ] `core/execution/node-executors/function-executor.ts` - 函数节点执行器
- [ ] `core/execution/node-executors/condition-executor.ts` - 条件节点执行器
- [ ] `core/execution/router.ts` - 条件路由

### 任务4：实现core层 - 状态管理
- [ ] `core/state/thread-state.ts` - 线程状态管理
- [ ] `core/state/workflow-context.ts` - 工作流上下文

### 任务5：实现core层 - LLM集成
- [ ] `core/llm/wrapper.ts` - LLM包装器
- [ ] `core/llm/wrapper-manager.ts` - 包装器管理器
- [ ] `core/llm/client-factory.ts` - 客户端工厂
- [ ] `core/llm/base-client.ts` - 客户端基类
- [ ] `core/llm/clients/openai.ts` - OpenAI客户端
- [ ] `core/llm/clients/anthropic.ts` - Anthropic客户端
- [ ] `core/llm/clients/gemini.ts` - Gemini客户端
- [ ] `core/llm/clients/mock.ts` - Mock客户端

### 任务6：实现core层 - 工具框架
- [ ] `core/tools/tool-service.ts` - 工具服务
- [ ] `core/tools/executor-base.ts` - 执行器基类
- [ ] `core/tools/executors/builtin.ts` - 内置执行器
- [ ] `core/tools/executors/native.ts` - 本地执行器
- [ ] `core/tools/executors/rest.ts` - REST执行器
- [ ] `core/tools/executors/mcp.ts` - MCP执行器

### 任务7：实现core层 - 验证
- [ ] `core/validation/workflow-validator.ts` - 工作流验证器

### 任务8：实现API层
- [ ] `api/sdk.ts` - SDK主类
- [ ] `api/options.ts` - API选项类型
- [ ] `api/result.ts` - API结果类型

### 任务9：实现工具层
- [ ] `utils/id-generator.ts` - ID生成器
- [ ] `utils/error-handler.ts` - 错误处理器

### 任务10：可选功能
- [ ] `core/checkpoint/creation.ts` - 检查点创建
- [ ] `core/checkpoint/restore.ts` - 检查点恢复
- [ ] `types/checkpoint.ts` - 检查点类型

---

**文档结束**