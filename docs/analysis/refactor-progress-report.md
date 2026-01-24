# Workflow 领域层重构进度报告

## 已完成的工作

### 阶段1：简化领域层实体（已完成）

#### 1.1 简化 Node 实体 ✅
**文件**：`src/domain/workflow/entities/node.ts`

**删除的方法**：
- `execute(context: NodeContext): Promise<NodeExecutionResult>` - 节点执行方法
- `validate(): ValidationResult` - 节点验证方法
- `getMetadata(): NodeMetadata` - 节点元数据方法
- `getInputSchema(): Record<string, any>` - 输入Schema方法
- `getOutputSchema(): Record<string, any>` - 输出Schema方法
- `canExecute(): boolean` - 可执行检查方法

**保留的方法**：
- 所有 getter 方法（nodeId, type, name, description, position, properties, status, retryStrategy）
- 所有类型检查方法（isControlFlow, isExecutable, canHaveMultipleInputs, canHaveMultipleOutputs）
- 所有更新方法（updateProperties, updatePosition, updateStatus, updateRetryStrategy）
- 业务标识方法（getBusinessIdentifier）
- 持久化方法（toProps）
- 抽象方法（createNodeFromProps）

#### 1.2 简化 Edge 值对象 ✅
**文件**：`src/domain/workflow/value-objects/edge/edge-value-object.ts`

**删除的方法**：
- `getConditionExpression(): EdgeCondition | undefined` - 获取条件表达式方法
- `requiresConditionEvaluation(): boolean` - 是否需要条件评估方法

**保留的方法**：
- 所有 getter 方法（id, type, fromNodeId, toNodeId, condition, weight, properties）
- 所有类型检查方法（isExceptionHandling, isNormalFlow, isAsynchronous, isSequence, isConditional, isDefault, isError, isTimeout）
- 优先级方法（getPriority）
- 验证方法（validate）

#### 1.3 简化 Trigger 实体 ✅
**文件**：`src/domain/workflow/entities/trigger.ts`

**删除的方法**：
- `canTrigger(): boolean` - 是否可以触发方法
- `enable(): void` - 启用触发器方法
- `disable(): void` - 禁用触发器方法
- `markAsTriggered(): void` - 标记为已触发方法
- `reset(): void` - 重置触发器状态方法
- `getInputSchema(): Record<string, any>` - 输入Schema方法
- `getOutputSchema(): Record<string, any>` - 输出Schema方法
- `getMetadata(): Record<string, unknown>` - 元数据方法
- `update(): void` - 更新实体方法

**保留的方法**：
- 所有 getter 方法（triggerId, type, name, description, config, action, targetNodeId, status, triggeredAt）
- 所有类型检查方法（isTimeTrigger, isEventTrigger, isStateTrigger, requiresTargetNode）
- 所有更新方法（updateConfig, updateName, updateDescription）
- 验证方法（validate）
- 业务标识方法（getBusinessIdentifier）
- 持久化方法（toProps）

#### 1.4 简化 Hook 实体 ✅
**文件**：`src/domain/workflow/entities/hook.ts`

**删除的方法**：
- `execute(context: HookContextValue): Promise<HookExecutionResultValue>` - 执行Hook方法
- `validate(): HookValidationResult` - 验证Hook配置方法（改为抽象方法）
- `getMetadata(): HookMetadata` - 获取Hook元数据方法
- `getPlugins(): HookPluginConfig[]` - 获取Hook插件配置方法
- `addPlugin(pluginConfig: HookPluginConfig): void` - 添加插件配置方法
- `removePlugin(pluginId: string): void` - 移除插件配置方法
- `shouldExecute(): boolean` - 是否应该执行方法
- `shouldContinueOnError(): boolean` - 错误时是否继续执行方法
- `shouldFailFast(): boolean` - 是否快速失败方法
- `enable(): void` - 启用Hook方法
- `disable(): void` - 禁用Hook方法
- `update(): void` - 更新实体方法

**保留的方法**：
- 所有 getter 方法（hookId, hookPoint, name, description, config, enabled, priority, continueOnError, failFast）
- 所有类型检查方法（isBeforeExecute, isAfterExecute, isError, isBeforeNodeExecute, isAfterNodeExecute, isWorkflowStart, isWorkflowEnd, isControlFlow, isDataFlow, isState, isLifecycle, isCustom）
- 所有更新方法（updateConfig, updatePriority, updateErrorHandling）
- 抽象方法（validate, createHookFromProps）
- 业务标识方法（getBusinessIdentifier）
- 持久化方法（toProps）

## 当前编译错误

### 错误统计
- **总错误数**：约 20 个
- **严重程度**：中等（都是方法调用错误，不影响类型定义）

### 错误分类

#### 1. Edge 相关错误（4个）
- `src/services/threads/thread-conditional-router.ts(276,15)`: `requiresConditionEvaluation` 不存在
- `src/services/threads/thread-conditional-router.ts(281,28)`: `getConditionExpression` 不存在
- `src/services/workflow/edges/edge-executor.ts(106,16)`: `requiresConditionEvaluation` 不存在
- `src/services/workflow/edges/edge-executor.ts(107,32)`: `getConditionExpression` 不存在

#### 2. Hook 相关错误（8个）
- `src/services/workflow/hooks/hook-executor.ts(37,17)`: `shouldExecute` 不存在
- `src/services/workflow/hooks/hook-executor.ts(45,33)`: `execute` 不存在
- `src/services/workflow/hooks/hook-executor.ts(69,14)`: `shouldContinueOnError` 不存在
- `src/services/workflow/hooks/hook-executor.ts(105,18)`: `shouldContinueOnError` 不存在
- `src/services/workflow/hooks/hook-executor.ts(150,38)`: `shouldExecute` 不存在
- `src/services/workflow/hooks/impl/after-execute-hook.ts(33,14)`: 未实现 `createHookFromProps`
- `src/services/workflow/hooks/impl/after-node-execute-hook.ts(29,14)`: 未实现 `createHookFromProps`
- `src/services/workflow/hooks/impl/before-execute-hook.ts(29,14)`: 未实现 `createHookFromProps`
- `src/services/workflow/hooks/impl/before-node-execute-hook.ts(28,14)`: 未实现 `createHookFromProps`

#### 3. Node 相关错误（3个）
- `src/services/workflow/nodes/node-executor.ts(84,31)`: `validate` 不存在
- `src/services/workflow/nodes/node-executor.ts(105,20)`: `execute` 不存在
- `src/services/workflow/nodes/node-executor.ts(151,17)`: `canExecute` 不存在

#### 4. Trigger 相关错误（1个）
- `src/services/workflow/triggers/trigger-executor.ts(43,20)`: `canTrigger` 不存在

## 下一步行动

### 选项1：暂时注释掉错误调用（快速修复）
**优点**：
- 快速让代码可以编译通过
- 不影响后续重构

**缺点**：
- 功能暂时不可用
- 需要后续修复

### 选项2：创建服务层执行处理器（完整方案）
**优点**：
- 一次性解决问题
- 符合重构目标

**缺点**：
- 需要更多时间
- 工作量较大

### 选项3：混合方案（推荐）
**步骤**：
1. 先修复 Hook 子类的 `createHookFromProps` 实现（快速修复）
2. 创建服务层执行处理器接口（架构设计）
3. 逐步修复调用，将逻辑移到服务层（渐进式）

## 推荐方案

采用**选项3：混合方案**，具体步骤：

1. **快速修复**（30分钟）：
   - 修复 Hook 子类的 `createHookFromProps` 实现
   - 暂时注释掉其他错误调用

2. **架构设计**（2小时）：
   - 创建服务层执行处理器接口
   - 设计执行处理器架构

3. **渐进式修复**（4小时）：
   - 创建 EdgeExecutionHandler
   - 创建 HookExecutionHandler
   - 创建 NodeExecutionHandler
   - 创建 TriggerExecutionHandler
   - 逐步修复调用

4. **测试验证**（2小时）：
   - 运行类型检查
   - 运行单元测试
   - 修复发现的问题

**预计总时间**：8.5小时

## 风险评估

### 低风险
- Hook 子类的 `createHookFromProps` 实现
- 暂时注释掉错误调用

### 中风险
- 创建服务层执行处理器
- 修复调用逻辑

### 高风险
- 删除旧的实现
- 集成测试

## 建议

由于这是一个大型重构，建议：

1. **先完成快速修复**，让代码可以编译通过
2. **创建详细的实施计划**，包括每个步骤的时间估算
3. **分阶段实施**，每个阶段都进行充分测试
4. **保留回滚方案**，以便在出现问题时快速恢复

## 结论

领域层的简化工作已经完成，现在需要：
1. 修复编译错误
2. 创建服务层执行处理器
3. 重构调用逻辑
4. 删除旧的实现
5. 进行充分测试

建议采用混合方案，先快速修复编译错误，然后逐步创建服务层执行处理器。