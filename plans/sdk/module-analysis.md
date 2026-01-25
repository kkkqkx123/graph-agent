## 分析结果总结

### 1. src/services目录分析

Thread相关：线程执行、管理、生命周期、状态管理、历史记录、工作流执行引擎
Workflow相关：函数管理、上下文管理、监控、验证器
LLM相关：包装器、包装器管理器、池管理器、任务组管理器
Tools相关：工具服务、多种执行器（builtin、native、rest、mcp）
Checkpoints：检查点创建、恢复、查询、清理、备份、分析
Sessions：会话管理、生命周期、维护、监控、编排
State：状态历史、管理、恢复
Interaction：交互引擎、LLM执行器、工具执行器、用户交互处理器
Prompts：提示词构建器、模板处理器、引用解析器

### 2. src/infrastructure目录分析

Persistence：数据库连接管理、各种Repository实现、Mapper、Model
Logging：日志记录器、多种格式化器、传输方式
Config：配置加载、处理、验证、缓存
LLM：客户端工厂、各种LLM客户端（OpenAI、Anthropic、Gemini等）、重试机制、速率限制、token计算

### 3. src/domain目录分析

核心领域模型：Workflow、Thread、Tool、Session、State、LLM等
值对象、实体、仓储接口、领域异常

### 4. SDK核心功能边界确定

**应该属于SDK的核心功能：**

工作流执行引擎（ThreadWorkflowExecutor）
节点执行和函数执行引擎
LLM客户端抽象和多种提供商实现
工具执行框架和多种执行器
核心领域模型（Workflow、Thread、Tool等）
工作流上下文管理
线程状态管理

**应该作为应用层专属功能：**
Sessions管理（多线程协调、用户会话）
Checkpoints管理（持久化策略、备份清理）
Interaction引擎（用户交互、消息管理）
Prompts管理（模板处理、构建）
数据库持久化（Repository实现）
日志记录（应用级日志）
配置管理（应用配置）

**可选项（根据SDK定位决定）：**
状态历史管理（如果SDK需要支持状态恢复）
工作流验证（如果SDK需要内置验证）
