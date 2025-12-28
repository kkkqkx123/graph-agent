## 重构建议

基于分析，建议进行以下重构：

### 1. ContextProcessorRegistry 改造

**当前问题**：
- `ContextProcessorRegistry` 在Domain层有具体实现（409行代码）
- 包含6个内置处理器的具体逻辑
- 被Infrastructure层的`ExecutionStrategy`直接使用

**改造方案**：

#### 步骤1：在Domain层定义接口
```typescript
// src/domain/workflow/services/context-processor-service.interface.ts
export interface ContextProcessorService {
  register(name: string, processor: ContextProcessor, metadata?: Partial<ContextProcessorMetadata>): void;
  get(name: string): ContextProcessor | undefined;
  has(name: string): boolean;
  execute(name: string, context: PromptContext, config?: Record<string, unknown>): PromptContext;
  getProcessorNames(): string[];
  unregister(name: string): boolean;
  clear(): void;
}
```

#### 步骤2：在Infrastructure层提供实现
```typescript
// src/infrastructure/workflow/services/context-processor-service.ts
@injectable()
export class ContextProcessorServiceImpl implements ContextProcessorService {
  // 实现注册表逻辑
  // 从functions目录加载处理器函数
}
```

#### 步骤3：创建上下文处理器函数模块
参考 `src/infrastructure/workflow/functions` 结构：
```
src/infrastructure/workflow/context-processors/
├── builtin/
│   ├── llm-context.processor.ts
│   ├── tool-context.processor.ts
│   ├── human-context.processor.ts
│   ├── system-context.processor.ts
│   ├── pass-through.processor.ts
│   └── isolate.processor.ts
├── registry/
│   └── context-processor-registry.ts
└── index.ts
```

### 2. Infrastructure接口移动到Domain层

**需要移动的接口**：

#### 2.1 IExecutionContextManager
```typescript
// 从: src/infrastructure/workflow/interfaces/execution-context-manager.interface.ts
// 移动到: src/domain/workflow/services/execution-context-manager.interface.ts
```

#### 2.2 INodeExecutor
```typescript
// 从: src/infrastructure/workflow/interfaces/node-executor.interface.ts
// 移动到: src/domain/workflow/services/node-executor.interface.ts
```

#### 2.3 GraphAlgorithmService（已存在，需统一）
当前有两个定义：
- `src/domain/workflow/services/graph-algorithm-service.interface.ts` ✅
- `src/infrastructure/workflow/interfaces/graph-algorithm-service.interface.ts` ❌

**操作**：删除Infrastructure层的重复定义，统一使用Domain层的接口

### 3. 架构调整后的依赖关系

```
Domain层（定义）
├── entities/
├── value-objects/
└── services/                    # 所有服务接口
    ├── graph-algorithm-service.interface.ts
    ├── graph-validation-service.interface.ts
    ├── context-processor-service.interface.ts
    ├── execution-context-manager.interface.ts    # 从Infrastructure移动
    └── node-executor.interface.ts                # 从Infrastructure移动

Infrastructure层（实现）
├── workflow/
│   ├── services/                # 实现Domain接口
│   │   ├── graph-algorithm-service.ts
│   │   ├── graph-validation-service.ts
│   │   └── context-processor-service.ts        # 新增实现
│   ├── context-processors/      # 新增：处理器函数模块
│   └── interfaces/              # 删除：接口已移动到Domain层
└── di/
    └── bindings/                # 更新依赖注入配置

Application层（使用）
└── workflow/services/           # 通过接口使用服务
    └── workflow-orchestration-service.ts
```

### 4. 改造优势

✅ **符合分层架构原则**：
- Domain层：纯业务定义，无技术细节
- Infrastructure层：技术实现，依赖Domain
- Application层：业务流程，依赖Domain

✅ **提高可扩展性**：
- 上下文处理器可像workflow functions一样灵活添加
- 支持自定义处理器注册
- 便于单元测试（mock接口）

✅ **代码组织更清晰**：
- 接口统一在Domain层管理
- 实现细节在Infrastructure层
- 功能模块化（处理器函数独立）

### 5. 实施步骤

1. **第一阶段**：移动Infrastructure接口到Domain层
2. **第二阶段**：改造ContextProcessorRegistry为接口+实现模式
3. **第三阶段**：创建上下文处理器函数模块
4. **第四阶段**：更新依赖注入配置
5. **第五阶段**：测试验证

### 6. 注意事项

- 保持向后兼容，逐步迁移
- 更新所有import路径
- 确保DI容器配置正确
- 添加必要的单元测试

这样的重构既保持了架构的纯粹性，又提高了系统的灵活性和可维护性。