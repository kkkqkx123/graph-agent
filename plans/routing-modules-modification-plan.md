# Routing模块修改实施计划

## 1. 需要修改的文件清单

### 核心接口文件
- `src/infrastructure/workflow/routing/node-router.ts` - 主要重构
- `src/infrastructure/workflow/routing/edge-condition-evaluator.ts` - 职责分离
- `src/infrastructure/workflow/functions/registry/function-registry.ts` - 分层设计

### 依赖文件
- `src/infrastructure/workflow/state/state-transition-manager.ts` - 适配新接口
- `src/infrastructure/workflow/edges/evaluators/condition-evaluator.ts` - 适配新接口

### 新增文件
- `src/domain/workflow/entities/node-execution-result.ts` - 新增接口
- `src/domain/workflow/entities/route-decision.ts` - 新增接口
- `src/infrastructure/workflow/functions/interfaces/` - 分层函数接口

## 2. 具体修改内容

### 2.1 NodeRouter重构

**当前问题**：
- 过度依赖EdgeConditionEvaluator
- 缺乏节点类型路由策略
- 职责混淆

**修改方案**：
```typescript
// 新接口设计
interface NodeRouter {
  route(
    currentNodeId: NodeId,
    nodeResult: NodeExecutionResult,
    executionState: ExecutionState,
    workflow: Workflow
  ): Promise<RouteDecision>;
}

// 新增路由决策类型
interface RouteDecision {
  nextNodeIds: NodeId[];
  satisfiedEdges: EdgeData[];
  unsatisfiedEdges: EdgeData[];
  stateUpdates: Record<string, any>;
}

// 新增节点执行结果类型
interface NodeExecutionResult {
  status: NodeStatus;
  result?: any;
  error?: Error;
  executionTime: number;
  metadata?: Record<string, any>;
}
```

### 2.2 EdgeConditionEvaluator职责分离

**当前问题**：
- 承担路由决策和状态传递双重职责
- 与NodeRouter耦合过紧

**修改方案**：
```typescript
// 专注于状态传递和条件评估
interface EdgeConditionEvaluator {
  evaluate(
    edge: EdgeData,
    context: StateTransferContext
  ): Promise<EdgeEvaluationResult>;
  
  transferState(
    edge: EdgeData,
    sourceState: ExecutionState,
    targetState: ExecutionState
  ): Promise<void>;
}

// 新增状态转换上下文
interface StateTransferContext {
  sourceNodeId: NodeId;
  targetNodeId: NodeId;
  sourceState: NodeExecutionState;
  variables: Map<string, any>;
  promptContext: PromptContext;
}
```

### 2.3 FunctionRegistry分层设计

**当前问题**：
- 使用统一的BaseWorkflowFunction接口
- 缺乏针对不同函数类型的专门接口

**修改方案**：
```typescript
// 分层函数接口
interface FunctionRegistry {
  // 条件函数
  registerConditionFunction(name: string, func: ConditionFunction): void;
  getConditionFunction(name: string): ConditionFunction | undefined;
  
  // 路由函数
  registerRoutingFunction(name: string, func: RoutingFunction): void;
  getRoutingFunction(name: string): RoutingFunction | undefined;
  
  // 节点函数
  registerNodeFunction(name: string, func: NodeFunction): void;
  getNodeFunction(name: string): NodeFunction | undefined;
  
  // 触发器函数
  registerTriggerFunction(name: string, func: TriggerFunction): void;
  getTriggerFunction(name: string): TriggerFunction | undefined;
}

// 各类型函数接口
interface ConditionFunction {
  evaluate(context: ExecutionContext, config: ConditionConfig): Promise<boolean>;
}

interface RoutingFunction {
  route(context: ExecutionContext, config: RoutingConfig, nodeResult: NodeExecutionResult): Promise<RoutingResult>;
}

interface NodeFunction {
  execute(context: ExecutionContext, config: NodeConfig): Promise<NodeExecutionResult>;
}

interface TriggerFunction {
  check(context: ExecutionContext, config: TriggerConfig): Promise<TriggerCheckResult>;
  execute(context: ExecutionContext, config: TriggerConfig): Promise<TriggerExecutionResult>;
}
```

## 3. 实施步骤

### 第一阶段：接口设计和基础重构

1. **创建新的domain层接口**
   - `src/domain/workflow/entities/node-execution-result.ts`
   - `src/domain/workflow/entities/route-decision.ts`
   - `src/domain/workflow/entities/state-transfer-context.ts`

2. **重构NodeRouter**
   - 移除对EdgeConditionEvaluator的强依赖
   - 实现节点类型路由策略
   - 保持向后兼容性

3. **重构EdgeConditionEvaluator**
   - 分离路由决策逻辑
   - 专注于状态传递
   - 增加状态转换功能

### 第二阶段：FunctionRegistry分层

4. **设计分层函数接口**
   - `src/infrastructure/workflow/functions/interfaces/condition-function.ts`
   - `src/infrastructure/workflow/functions/interfaces/routing-function.ts`
   - `src/infrastructure/workflow/functions/interfaces/node-function.ts`
   - `src/infrastructure/workflow/functions/interfaces/trigger-function.ts`

5. **重构FunctionRegistry**
   - 支持分层函数注册
   - 提供类型安全的获取方法
   - 保持现有API兼容性

### 第三阶段：模块实现

6. **实现Conditions模块**
   - 重构现有条件函数
   - 实现新的条件函数接口
   - 支持条件组合

7. **实现Routing模块**
   - 重构现有路由函数
   - 实现新的路由函数接口
   - 支持复杂路由逻辑

8. **实现Nodes模块**
   - 重构现有节点函数
   - 实现新的节点函数接口
   - 支持节点执行逻辑

### 第四阶段：集成和测试

9. **更新依赖模块**
   - `src/infrastructure/workflow/state/state-transition-manager.ts`
   - `src/infrastructure/workflow/edges/evaluators/condition-evaluator.ts`
   - 其他依赖模块

10. **集成测试**
    - 单元测试所有新接口
    - 集成测试模块协作
    - 性能测试

## 4. 向后兼容性考虑

### 保持现有API
- NodeRouter的determineNextNodes方法保持兼容
- EdgeConditionEvaluator的evaluate方法保持兼容
- FunctionRegistry的现有方法保持兼容

### 渐进式迁移
- 新功能使用新接口
- 现有代码可以继续使用旧接口
- 提供迁移指南

## 5. 风险控制

### 技术风险
- 接口变更可能影响现有代码
- 需要充分的测试覆盖
- 需要详细的迁移文档

### 缓解措施
- 分阶段实施，降低风险
- 保持向后兼容性
- 充分的测试覆盖
- 详细的回滚计划

## 6. 预期收益

### 架构收益
- 职责分离，降低耦合
- 模块化设计，易于扩展
- 清晰的接口定义

### 开发收益
- 类型安全的函数调用
- 更好的代码组织
- 易于测试和维护

### 业务收益
- 支持更复杂的业务逻辑
- 更好的性能优化
- 更灵活的配置选项