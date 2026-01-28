# 内部事件机制设计文档

## 问题背景

当前节点执行器存在职责混乱的问题：

- LLMNodeExecutor 直接调用LLM API，绕过了LLMExecutor的统一管理
- ToolNodeExecutor 直接执行工具，无法利用LLMExecutor的工具调用循环
- ContextProcessorNodeExecutor 和 UserInteractionNodeExecutor 也直接操作上下文

这导致代码重复、逻辑分散，无法支持复杂的LLM交互场景（如工具调用循环、流式响应等）。

## 解决方案

采用内部事件机制，将LLM相关的执行逻辑托管给LLMExecutor统一处理。

## 需要托管的节点类型

1. **LLM节点**：执行LLM调用，可能触发工具调用
2. **工具节点**：执行工具，应该由LLMExecutor协调
3. **上下文处理器节点**：处理上下文，需要LLM参与
4. **用户交互节点**：处理用户交互，需要LLM协调

## 内部事件类型

新增以下内部事件类型：

1. **LLM执行请求**：节点向LLMExecutor请求执行LLM调用
2. **工具执行请求**：LLMExecutor向ToolService请求执行工具
3. **LLM执行完成**：LLMExecutor通知节点执行完成
4. **工具执行完成**：ToolService通知LLMExecutor工具执行完成

## 执行流程

当节点需要执行时：

1. 节点执行器准备执行参数（解析变量、构建prompt等）
2. 节点执行器发送内部事件（LLM执行请求）
3. LLMExecutor监听并处理该事件
4. LLMExecutor执行LLM调用，如有工具调用则协调ToolService
5. LLMExecutor完成执行后，通过事件返回结果
6. 节点执行器接收结果并继续执行

## 优势

1. **职责清晰**：节点执行器只负责准备参数，LLMExecutor负责执行
2. **逻辑统一**：所有LLM调用都经过LLMExecutor，支持工具调用循环
3. **解耦**：通过事件机制解耦，避免直接依赖
4. **可扩展**：新增节点类型只需发送相应事件
5. **支持复杂场景**：流式响应、多轮工具调用等

## 实施步骤

1. 在内部事件类型定义中新增LLM相关事件
2. 改造LLMExecutor，添加内部事件监听器
3. 改造LLMNodeExecutor，改为发送内部事件而非直接调用
4. 改造ToolNodeExecutor，改为发送内部事件
5. 改造ContextProcessorNodeExecutor，改为发送内部事件
6. 改造UserInteractionNodeExecutor，改为发送内部事件
7. 确保事件传递包含必要的上下文信息（threadId、nodeId等）

## 风险和对策

| 风险 | 对策 |
|------|------|
| 事件机制增加复杂度 | 清晰的文档和示例，限制事件类型数量 |
| 调试困难 | 完善的事件日志和追踪机制 |
| 性能开销 | 事件为内存调用，开销极小 |
| 循环依赖 | 通过事件解耦，避免直接依赖 |
