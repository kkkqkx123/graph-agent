# SDK Core 错误类型分析报告

## 1. 当前错误类型体系概述

根据 `packages/types/src/errors.ts` 文件，当前SDK定义了以下错误类型：

### 基础错误类型
- **SDKError**: 所有错误的基类，包含severity（严重程度）属性
- **ErrorSeverity**: 枚举类型，包含 ERROR、WARNING、INFO 三个级别

### 具体错误类型
1. **ValidationError** (默认severity: ERROR)
   - 用于验证相关的错误
   - 包含field、value等上下文信息

2. **ExecutionError** (默认severity: ERROR)
   - 用于执行过程中的错误
   - 包含nodeId、workflowId等上下文信息

3. **ConfigurationError** (默认severity: ERROR)
   - 用于配置相关的错误
   - 包含configKey等上下文信息

4. **TimeoutError** (默认severity: WARNING)
   - 用于超时相关的错误
   - 包含timeout值

5. **NotFoundError** (默认severity: WARNING)
   - 用于资源未找到的错误
   - 包含resourceType、resourceId

6. **NetworkError** (默认severity: WARNING)
   - 用于网络连接问题
   - 继承自SDKError

7. **HttpError** (默认severity: WARNING)
   - 用于HTTP协议层面的错误
   - 包含statusCode

8. **LLMError** (默认severity: WARNING)
   - 用于LLM调用错误
   - 继承自HttpError，包含provider、model信息

9. **CircuitBreakerOpenError** (默认severity: WARNING)
   - 用于熔断器打开的错误

10. **ToolError** (默认severity: WARNING)
    - 用于工具调用错误
    - 包含toolName、toolType

11. **ThreadInterruptedException** (默认severity: INFO)
    - 用于线程中断控制流异常
    - 包含interruptionType ('PAUSE' | 'STOP')

12. **CodeExecutionError** (默认severity: ERROR)
    - 用于脚本执行错误
    - 包含scriptName、scriptType

## 2. 实际使用情况分析

### 2.1 ValidationError 使用情况
**使用频率**: 非常高（在sdk/core中出现约200+次）
**主要使用场景**:
- 工作流验证 (`workflow-validator.ts`)
- 节点验证 (`node-validator.ts` 及其子验证器)
- 触发器验证 (`trigger-validator.ts`)
- 工具配置验证 (`tool-config-validator.ts`)
- 消息验证 (`message-validator.ts`)
- 图验证 (`graph-validator.ts`)
- 代码配置验证 (`code-config-validator.ts`)
- 运行时参数验证（如变量设置、触发器状态管理等）

**问题分析**:
ValidationError被过度泛化使用，涵盖了从配置验证到运行时验证的各种场景，缺乏细粒度的错误分类。

### 2.2 ExecutionError 使用情况
**使用频率**: 高（在sdk/core中出现约40+次）
**主要使用场景**:
- 线程操作 (`thread-operations.ts`)
- 节点处理器 (`node-handlers/*.ts`)
- 触发器处理器 (`trigger-handlers/*.ts`)
- 事件管理 (`event-manager.ts`)
- 协调器 (`coordinators/*.ts`)
- 执行器 (`executors/*.ts`)

**问题分析**:
ExecutionError同样被泛化使用，涵盖了从业务逻辑错误到系统错误的各种情况。

### 2.3 其他错误类型使用情况

#### ConfigurationError
- **使用场景**: LLM Profile管理 (`llm/wrapper.ts`, `llm/profile-manager.ts`)
- **使用频率**: 低（约3-4次）
- **分析**: 使用合理，专门用于配置相关错误

#### LLMError
- **使用场景**: LLM调用错误处理 (`llm/wrapper.ts`)
- **使用频率**: 低（1次实际创建，但会被LLM客户端抛出）
- **分析**: 使用合理，专门用于LLM相关错误

#### ToolError
- **使用场景**: 工具服务 (`services/tool-service.ts`)
- **使用频率**: 低（约2-3次）
- **分析**: 使用合理，但可能需要进一步细分

#### CodeExecutionError
- **使用场景**: 代码服务 (`services/code-service.ts`)
- **使用频率**: 低（约2-3次）
- **分析**: 使用合理，专门用于脚本执行错误

#### ThreadInterruptedException
- **使用场景**: 中断管理 (`execution/managers/interruption-manager.ts`, 测试文件)
- **使用频率**: 中等（主要在测试和中断处理中）
- **分析**: 使用合理，作为控制流异常

#### TimeoutError
- **使用场景**: 线程操作超时 (`execution/utils/thread-operations.ts`)
- **使用频率**: 低（主要在测试中引用）
- **分析**: 定义存在但实际使用较少

#### NotFoundError
- **使用场景**: 注册表查找失败 (`tool-registry.ts`, `workflow-registry.ts`等)
- **使用频率**: 中等（约10-15次）
- **分析**: 使用合理，但可以考虑更具体的未找到错误

#### NetworkError, HttpError, CircuitBreakerOpenError
- **使用场景**: 主要在 `packages/tool-executors` 和 `packages/common-utils` 中
- **使用频率**: 在sdk/core中很少直接使用
- **分析**: 这些错误类型主要在底层HTTP客户端和工具执行器中使用

## 3. 错误类型细分建议

### 3.1 ValidationError 细分建议

当前ValidationError承担了过多职责，建议细分为：

#### 3.1.1 ConfigurationValidationError
- **用途**: 专门用于工作流、节点、触发器等静态配置的验证错误
- **继承**: ValidationError
- **新增属性**: configPath, configType
- **使用场景**: 
  - workflow-validator.ts
  - node-validator.ts 及其子验证器
  - trigger-validator.ts
  - graph-validator.ts

#### 3.1.2 RuntimeValidationError  
- **用途**: 专门用于运行时参数和状态的验证错误
- **继承**: ValidationError
- **新增属性**: runtimeContext, operation
- **使用场景**:
  - variable-state-manager.ts
  - trigger-state-manager.ts
  - thread-operations.ts (参数验证部分)

#### 3.1.3 SchemaValidationError
- **用途**: 专门用于JSON Schema验证失败
- **继承**: ValidationError  
- **新增属性**: schemaPath, validationErrors
- **使用场景**:
  - tool-config-validator.ts
  - code-config-validator.ts
  - message-validator.ts

### 3.2 ExecutionError 细分建议

ExecutionError同样过于泛化，建议细分为：

#### 3.2.1 BusinessLogicError
- **用途**: 业务逻辑相关的执行错误（如路由不匹配、条件不满足等）
- **继承**: ExecutionError
- **新增属性**: businessContext, ruleName
- **使用场景**:
  - route-handler.ts
  - loop-start-handler.ts (迭代表达式解析失败)
  - user-interaction-handler.ts (操作类型未知)

#### 3.2.2 SystemExecutionError
- **用途**: 系统级别的执行错误（如状态管理失败、上下文丢失等）
- **继承**: ExecutionError
- **新增属性**: systemComponent, failurePoint
- **使用场景**:
  - event-manager.ts (事件监听器执行失败)
  - thread-operations.ts (合并失败、状态验证失败)
  - coordinators/* (协调器内部错误)

#### 3.2.3 ResourceAccessError
- **用途**: 资源访问相关的执行错误
- **继承**: ExecutionError
- **新增属性**: resourceType, resourceId, accessType
- **使用场景**:
  - thread-registry.ts 相关操作
  - conversation-manager.ts
  - stateful tools 访问

### 3.3 其他错误类型改进建议

#### 3.3.1 NotFoundError 细分
- **WorkflowNotFoundError**: 工作流未找到
- **NodeNotFoundError**: 节点未找到  
- **ToolNotFoundError**: 工具未找到
- **ScriptNotFoundError**: 脚本未找到

#### 3.3.2 ToolError 细分
- **ToolExecutionError**: 工具执行失败
- **ToolConfigurationError**: 工具配置错误
- **ToolNotFoundError**: 工具未找到（可替代NotFoundError）

#### 3.3.3 新增错误类型

##### StateManagementError
- **用途**: 专门用于状态管理相关的错误
- **继承**: ExecutionError
- **使用场景**: variable-state-manager.ts, trigger-state-manager.ts

##### EventProcessingError  
- **用途**: 专门用于事件处理相关的错误
- **继承**: ExecutionError
- **使用场景**: event-manager.ts, event-emitter.ts

## 4. 实施优先级建议

### 高优先级（立即实施）
1. **ConfigurationValidationError**: 配置验证错误细分，影响面大且清晰
2. **BusinessLogicError**: 业务逻辑错误细分，提高错误处理的精确性

### 中优先级（后续版本）
1. **RuntimeValidationError**: 运行时验证错误细分
2. **SystemExecutionError**: 系统执行错误细分
3. **NotFoundError细分**: 提高资源未找到错误的精确性

### 低优先级（长期规划）
1. **SchemaValidationError**: Schema验证错误细分
2. **StateManagementError**: 状态管理错误
3. **EventProcessingError**: 事件处理错误

## 5. 向后兼容性考虑

所有新的错误类型都应该继承现有的错误类型，确保现有的错误处理逻辑仍然有效。例如：

```typescript
// 新的ConfigurationValidationError继承ValidationError
export class ConfigurationValidationError extends ValidationError {
  // 新增属性和方法
}

// 现有的catch (error instanceof ValidationError) 仍然能捕获ConfigurationValidationError
```

这样可以在不破坏现有代码的情况下逐步引入更细粒度的错误类型。