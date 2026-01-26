# ThreadBuilder设计文档

## 设计目标
将Workflow到Thread的转换逻辑独立出来，由ThreadBuilder类统一管理，实现转换过程的缓存和复用。

## 核心职责

### 1. Workflow到Thread转换
- 接收WorkflowDefinition和ThreadOptions
- 验证Workflow完整性（检查START/END节点）
- 创建Thread基础实例（ID、状态、时间戳等）
- 复制Workflow配置到Thread元数据

### 2. 执行对象初始化
- 创建Conversation实例（传入LLMWrapper和ToolService）
- 设置Conversation的tokenLimit和事件回调
- 将Conversation存储到Thread.contextData
- 初始化其他执行期需要的对象（如变量管理器）

### 3. 缓存管理
- 缓存已构建的Thread模板（不包含执行状态）
- 按Workflow ID和版本号索引缓存
- 监听Workflow定义变更，自动失效缓存
- 提供缓存清理接口

### 4. 深拷贝支持
- 提供createCopy方法，完整复制Thread和关联对象
- 确保Conversation的独立副本
- 处理变量和上下文的深拷贝

## 工作流程

### 创建Thread流程
1. 接收Workflow和选项参数
2. 检查缓存中是否存在相同Workflow的Thread模板
3. 如命中缓存，基于模板创建新Thread实例
4. 如未命中，执行完整构建流程
5. 初始化Conversation和其他执行对象
6. 返回构建完成的Thread

### Fork操作支持
- 接收父Thread和Fork配置
- 调用深拷贝方法创建子Thread
- 复制Conversation实例确保独立性
- 设置父子关系元数据

### Copy操作支持
- 接收源Thread
- 完整复制Thread所有属性
- 深拷贝Conversation避免状态共享
- 生成新的Thread ID

## 接口设计

### 主要方法
- `build(workflow, options)`: 从Workflow构建Thread
- `buildFromTemplate(templateId, options)`: 从缓存模板构建
- `createCopy(sourceThread)`: 创建Thread副本
- `createFork(parentThread, forkConfig)`: 创建Fork子Thread
- `clearCache()`: 清理缓存
- `invalidateWorkflow(workflowId)`: 失效指定Workflow缓存

### 缓存策略
- 使用LRU算法限制缓存大小
- 默认缓存100个Thread模板
- 缓存项包含构建时间和访问次数
- 定期清理过期缓存

## 与ThreadExecutor协作

ThreadBuilder仅负责Thread的创建和初始化，不涉及执行逻辑。ThreadExecutor接收ThreadBuilder创建的Thread实例进行执行。

ThreadExecutor不再直接持有Workflow到Thread的转换逻辑，而是通过ThreadBuilder获取已构建的Thread。