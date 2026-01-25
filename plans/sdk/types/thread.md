# Thread类型需求分析与设计

## 需求分析

### 核心需求
1. 定义工作流执行线程的结构（执行实例）
2. 支持线程状态管理
3. 支持线程执行历史记录
4. 支持Fork/Join操作

### 功能需求
1. Thread是Workflow的执行实例，从Workflow转换而来
2. Thread包含执行状态、变量、历史等动态信息
3. Thread支持Fork操作（创建子线程）
4. Thread支持Join操作（等待子线程完成）
5. Thread可序列化，支持执行恢复

### 非功能需求
1. 线程状态可序列化
2. 支持线程恢复和断点续传
3. 线程执行可追踪
4. 支持多线程协调

## 设计说明

### 核心类型

#### Thread
线程定义类型（执行实例）。

**属性**：
- id: 线程唯一标识符
- workflowId: 关联的工作流ID
- workflowVersion: 工作流版本
- status: 线程状态
- currentNodeId: 当前执行节点ID
- variables: 变量对象数组
- input: 输入数据
- output: 输出数据
- nodeResults: 节点执行结果映射
- executionHistory: 执行历史记录
- startTime: 开始时间
- endTime: 结束时间
- errors: 错误信息数组
- metadata: 线程元数据

**设计说明**：
- Thread是Workflow的执行实例
- 从Workflow转换而来，包含workflowId、nodes、edges等静态信息
- 包含执行状态、变量、历史等动态信息
- 可序列化，支持执行恢复
- 支持Fork/Join操作

#### ThreadStatus
线程状态枚举。

**状态值**：
- CREATED: 已创建
- RUNNING: 正在运行
- PAUSED: 已暂停
- COMPLETED: 已完成
- FAILED: 已失败
- CANCELLED: 已取消
- TIMEOUT: 超时

#### ThreadOptions
线程执行选项类型。

**属性**：
- input: 输入数据对象
- maxSteps: 最大执行步数
- timeout: 超时时间（毫秒）
- enableCheckpoints: 是否启用检查点
- onNodeExecuted: 节点执行完成回调
- onToolCalled: 工具调用回调
- onError: 错误回调

**设计说明**：
- 线程执行选项，不包含thread或workflow的引用
- 用于配置线程执行行为

#### ThreadVariable
线程变量类型。

**属性**：
- name: 变量名称
- value: 变量值
- type: 变量类型
- scope: 变量作用域（local、global）
- readonly: 是否只读
- metadata: 变量元数据

#### ThreadMetadata
线程元数据类型。

**属性**：
- creator: 创建者
- tags: 标签数组
- customFields: 自定义字段对象
- parentThreadId: 父线程ID（用于fork场景）
- childThreadIds: 子线程ID数组（用于fork场景）

#### ThreadResult
线程执行结果类型。

**属性**：
- threadId: 线程ID
- success: 是否成功
- output: 输出数据
- error: 错误信息（如果有）
- executionTime: 执行时间（毫秒）
- nodeResults: 节点执行结果数组
- metadata: 执行元数据

### 设计原则

1. **状态可恢复**：线程状态支持序列化和反序列化
2. **变量隔离**：线程变量与工作流变量分离
3. **执行追踪**：记录完整的执行历史
4. **错误处理**：支持错误捕获和恢复
5. **Fork/Join支持**：支持多线程协调

### Workflow到Thread的转换

#### 转换流程
1. **创建阶段**：
   - 用户传入Workflow定义
   - SDK创建Thread实例（从Workflow转换而来）
   - Thread包含workflowId、nodes、edges等静态信息
   - 初始化执行状态、变量等动态信息

2. **执行阶段**：
   - 使用ThreadOptions配置执行参数
   - 执行过程中更新Thread状态
   - 记录节点执行结果和执行历史

3. **恢复阶段**：
   - 通过threadId恢复Thread
   - Thread包含完整的执行状态
   - 继续执行

4. **Fork阶段**：
   - 从当前Thread创建子Thread
   - 子Thread继承父Thread的部分状态
   - 子Thread独立执行

5. **Join阶段**：
   - 等待子Thread完成
   - 合并子Thread的结果
   - 继续执行

#### Fork/Join操作
- **Fork**: 创建子线程，用于并行执行
- **Join**: 等待子线程完成，合并结果
- Fork/Join操作的对象是Thread
- 支持多种Join策略（全部完成、任意完成、成功数量阈值等）

### 与Events的集成

#### 事件触发时机
1. **THREAD_STARTED**: Thread创建时触发
2. **THREAD_COMPLETED**: Thread完成时触发
3. **THREAD_FAILED**: Thread失败时触发
4. **THREAD_FORKED**: Thread Fork时触发
5. **THREAD_JOINED**: Thread Join时触发
6. **NODE_STARTED**: 节点开始执行时触发
7. **NODE_COMPLETED**: 节点执行完成时触发
8. **NODE_FAILED**: 节点执行失败时触发
9. **TOOL_CALLED**: 工具调用时触发
10. **ERROR**: 错误发生时触发

#### 事件数据
- 所有事件包含threadId和workflowId
- 节点事件包含nodeId
- 工具事件包含toolId
- 错误事件包含错误信息和堆栈跟踪

### 依赖关系

- 依赖common类型定义ID、时间戳
- 依赖workflow类型（通过workflowId引用）
- 依赖node类型（NodeExecutionResult）
- 依赖tool类型（toolCalls）
- 依赖llm类型（如果需要）
- 不直接依赖workflow类型（通过workflowId引用）
- 不依赖execution类型（已合并）
- 被core/execution模块引用
- 被events类型引用