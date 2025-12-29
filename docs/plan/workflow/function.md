理解了！您的分析很准确。让我分析如何在保持triggers/edges/hooks函数式实现的同时，减少中间抽象层。

## 当前架构分析

**Nodes（已改为直接类型）**：
- 每个节点类型需要完全不同的配置和执行逻辑
- 直接类型实现更合适

**Triggers/Edges/Hooks（保持函数式）**：
- 输入输出相对统一（都是boolean或简单对象）
- 需要灵活的函数注册和动态调用
- 函数式实现更合适

## 可以简化的中间抽象层

当前问题：
1. **ValueObjectExecutor**：作为中间层，增加了配置转换开销
2. **FunctionRegistry**：维护复杂的映射关系

## 简化方案

**方案1：直接在Executor中调用函数**
- TriggerExecutor直接调用TriggerFunction
- HookExecutor直接调用HookFunction
- EdgeExecutor直接调用EdgeFunction
- 删除ValueObjectExecutor中间层

**方案2：简化FunctionRegistry**
- 保留FunctionRegistry，但简化其职责
- 只负责函数注册和查找，不处理配置转换
- 配置转换由各个Executor直接处理

我建议采用**方案1**，这样可以：
1. 消除ValueObjectExecutor中间层
2. 简化执行链路
3. 保持函数式实现的灵活性
4. 代码更清晰直观
