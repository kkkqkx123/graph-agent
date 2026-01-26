# WorkflowRegistry 设计文档

## 1. 概述

WorkflowRegistry 是工作流定义的中央注册和管理组件，负责工作流定义的生命周期管理、查询和缓存。它是 SDK 中工作流定义的唯一来源，确保工作流定义的一致性和可访问性。

## 2. 核心职责

### 2.1 工作流定义的注册

WorkflowRegistry 提供工作流定义的注册接口，允许将 WorkflowDefinition 注册到系统中。注册过程包括：

- 接收 WorkflowDefinition 对象
- 验证工作流定义的完整性和正确性
- 将工作流定义存储到内部缓存中
- 更新工作流索引和元数据索引

注册时需要验证的内容包括：
- 工作流 ID 的唯一性
- 节点列表的非空性
- 必须包含 START 和 END 节点
- 边引用的节点必须存在
- 节点 ID 的唯一性
- 边 ID 的唯一性

### 2.2 工作流定义的查询

提供多种查询方式来获取已注册的工作流定义：

- 按 ID 查询：通过工作流 ID 获取完整的工作流定义
- 按名称查询：通过工作流名称获取工作流定义
- 按标签查询：通过标签数组获取匹配的工作流定义列表
- 按分类查询：通过分类获取工作流定义列表
- 按作者查询：通过作者信息获取工作流定义列表
- 列出所有工作流：获取所有已注册工作流的摘要信息

查询接口支持返回完整定义或摘要信息，摘要信息包含 ID、名称、描述、版本、创建时间等基本信息，不包含节点和边的详细定义。

### 2.3 工作流定义的移除

提供工作流定义的移除功能，包括：

- 按 ID 移除单个工作流定义
- 批量移除多个工作流定义
- 清空所有工作流定义

移除操作需要检查工作流是否正在被使用，如果存在正在执行的 Thread 引用该工作流，则不允许移除或提供警告。

### 2.4 工作流定义的更新

支持工作流定义的更新操作，包括：

- 更新整个工作流定义
- 更新工作流的元数据（名称、描述、标签等）
- 更新工作流的配置

更新操作会自动增加版本号，并保留历史版本信息（如果启用版本管理）。

### 2.5 工作流定义的缓存管理

WorkflowRegistry 内部维护工作流定义的缓存，提供缓存管理功能：

- 自动缓存已注册的工作流定义
- 支持缓存失效策略（基于时间、基于访问频率）
- 提供手动清理缓存的接口
- 支持缓存预热（预先加载常用工作流）

### 2.6 工作流定义的验证

在注册和更新时进行工作流定义的验证，确保工作流定义的正确性：

- 结构验证：检查必需字段和数据类型
- 引用验证：检查节点和边的引用关系
- 逻辑验证：检查工作流的逻辑完整性（如是否有孤立节点）
- 配置验证：检查工作流配置的有效性

验证失败时返回详细的错误信息，指出具体的问题位置和原因。

### 2.7 版本管理

支持工作流定义的版本管理：

- 每次更新自动增加版本号
- 保留历史版本的工作流定义
- 支持查询特定版本的工作流定义
- 支持回滚到历史版本
- 支持版本比较和差异分析

版本管理可以配置为启用或禁用，禁用时只保留最新版本。

### 2.8 元数据管理

管理工作流的元数据信息：

- 索引工作流的元数据（作者、标签、分类等）
- 支持按元数据快速查询工作流
- 支持元数据的批量更新
- 支持自定义元数据字段

## 3. 设计原则

### 3.1 单一职责原则

WorkflowRegistry 只负责工作流定义的管理，不涉及工作流的执行逻辑。工作流的执行由 ThreadExecutor 负责。

### 3.2 依赖倒置原则

WorkflowRegistry 不依赖具体的存储实现，通过抽象接口支持多种存储后端（内存、文件、数据库等）。

### 3.3 开闭原则

WorkflowRegistry 对扩展开放，对修改关闭。可以通过插件机制扩展新的查询方式、验证规则和存储后端。

### 3.4 性能优先

WorkflowRegistry 是高频访问的组件，设计时优先考虑性能：
- 使用内存缓存提高查询速度
- 使用索引加速元数据查询
- 支持批量操作减少开销

## 4. 与其他组件的关系

### 4.1 与 ThreadBuilder 的关系

ThreadBuilder 在构建 ThreadContext 时需要 WorkflowDefinition，通过 WorkflowRegistry 获取：

- ThreadBuilder 不再直接接收 WorkflowDefinition
- ThreadBuilder 接收工作流 ID，从 WorkflowRegistry 获取定义
- WorkflowRegistry 确保获取到的是最新版本的工作流定义

### 4.2 与 CheckpointManager 的关系

CheckpointManager 在恢复 Thread 时需要 WorkflowDefinition，通过 WorkflowRegistry 获取：

- Checkpoint 保存工作流 ID 和版本号
- 恢复时从 WorkflowRegistry 获取对应版本的工作流定义
- 如果工作流定义已被删除或版本不存在，恢复失败

### 4.3 与 WorkflowValidator 的关系

WorkflowRegistry 使用 WorkflowValidator 进行工作流定义的验证：

- 注册和更新时调用 WorkflowValidator
- WorkflowValidator 返回详细的验证结果
- 验证失败时拒绝注册或更新

### 4.4 与 WorkflowContext 的关系

WorkflowRegistry 不直接创建 WorkflowContext，只提供 WorkflowDefinition：

- WorkflowContext 由 ThreadBuilder 创建
- WorkflowRegistry 提供 WorkflowDefinition 作为输入
- WorkflowContext 的生命周期由 ThreadBuilder 管理

## 5. 使用场景

### 5.1 应用启动时注册工作流

应用启动时，从配置文件或数据库加载工作流定义，注册到 WorkflowRegistry：

- 扫描工作流定义文件
- 解析工作流定义
- 验证工作流定义
- 注册到 WorkflowRegistry
- 记录注册结果

### 5.2 运行时动态注册工作流

支持在运行时动态注册新的工作流定义：

- 接收新的工作流定义
- 验证工作流定义
- 注册到 WorkflowRegistry
- 立即可用于创建 Thread

### 5.3 工作流定义的热更新

支持工作流定义的热更新，无需重启应用：

- 接收更新的工作流定义
- 验证更新后的定义
- 更新 WorkflowRegistry 中的定义
- 新创建的 Thread 使用新版本
- 已存在的 Thread 继续使用旧版本

### 5.4 工作流定义的查询和浏览

提供工作流定义的查询和浏览功能：

- 列出所有可用的工作流
- 按条件筛选工作流
- 查看工作流的详细信息
- 查看工作流的版本历史

### 5.5 工作流定义的导出和导入

支持工作流定义的导出和导入：

- 导出工作流定义为 JSON 文件
- 从 JSON 文件导入工作流定义
- 支持批量导入和导出

## 6. 接口设计

### 6.1 注册接口

- `register(workflow: WorkflowDefinition): void` - 注册单个工作流定义
- `registerBatch(workflows: WorkflowDefinition[]): void` - 批量注册工作流定义
- `registerFromFile(filePath: string): void` - 从文件注册工作流定义
- `registerFromDirectory(directoryPath: string): void` - 从目录批量注册工作流定义

### 6.2 查询接口

- `get(workflowId: string): WorkflowDefinition | undefined` - 按 ID 获取工作流定义
- `getVersion(workflowId: string, version: string): WorkflowDefinition | undefined` - 获取特定版本的工作流定义
- `getByName(name: string): WorkflowDefinition | undefined` - 按名称获取工作流定义
- `getByTags(tags: string[]): WorkflowDefinition[]` - 按标签获取工作流定义列表
- `getByCategory(category: string): WorkflowDefinition[]` - 按分类获取工作流定义列表
- `getByAuthor(author: string): WorkflowDefinition[]` - 按作者获取工作流定义列表
- `list(): WorkflowSummary[]` - 列出所有工作流的摘要信息
- `search(keyword: string): WorkflowSummary[]` - 搜索工作流

### 6.3 更新接口

- `update(workflow: WorkflowDefinition): void` - 更新工作流定义
- `updateMetadata(workflowId: string, metadata: Partial<WorkflowMetadata>): void` - 更新工作流元数据
- `updateConfig(workflowId: string, config: WorkflowConfig): void` - 更新工作流配置

### 6.4 移除接口

- `unregister(workflowId: string): void` - 移除工作流定义
- `unregisterBatch(workflowIds: string[]): void` - 批量移除工作流定义
- `clear(): void` - 清空所有工作流定义

### 6.5 版本管理接口

- `getVersions(workflowId: string): WorkflowVersion[]` - 获取工作流的所有版本
- `rollback(workflowId: string, version: string): void` - 回滚到指定版本
- `compareVersions(workflowId: string, version1: string, version2: string): WorkflowDiff` - 比较两个版本的差异

### 6.6 缓存管理接口

- `clearCache(): void` - 清空缓存
- `invalidateCache(workflowId: string): void` - 失效指定工作流的缓存
- `preload(workflowIds: string[]): void` - 预加载工作流定义到缓存

### 6.7 验证接口

- `validate(workflow: WorkflowDefinition): ValidationResult` - 验证工作流定义
- `validateBatch(workflows: WorkflowDefinition[]): ValidationResult[]` - 批量验证工作流定义

### 6.8 导出导入接口

- `export(workflowId: string): string` - 导出工作流定义为 JSON 字符串
- `exportToFile(workflowId: string, filePath: string): void` - 导出工作流定义到文件
- `import(json: string): void` - 从 JSON 字符串导入工作流定义
- `importFromFile(filePath: string): void` - 从文件导入工作流定义

## 7. 存储策略

### 7.1 内存存储

默认使用内存存储，提供最快的访问速度：

- 使用 Map 存储工作流定义
- 使用索引加速元数据查询
- 适合工作流数量较少的场景

### 7.2 文件存储

支持将工作流定义持久化到文件：

- 每个工作流定义保存为一个 JSON 文件
- 支持目录结构组织工作流
- 适合需要持久化的场景

### 7.3 数据库存储

支持将工作流定义存储到数据库：

- 支持关系型数据库（MySQL、PostgreSQL）
- 支持 NoSQL 数据库（MongoDB）
- 适合大规模工作流管理

### 7.4 混合存储

支持内存缓存 + 持久化存储的混合模式：

- 内存中缓存常用的工作流定义
- 持久化存储所有工作流定义
- 定期同步内存和持久化存储

## 8. 性能优化

### 8.1 缓存策略

- 使用 LRU 缓存策略管理内存使用
- 支持缓存预热，预先加载常用工作流
- 支持缓存失效，及时更新缓存

### 8.2 索引优化

- 为常用查询字段建立索引（ID、名称、标签、分类、作者）
- 使用倒排索引加速标签查询
- 使用前缀树加速名称搜索

### 8.3 批量操作

- 支持批量注册、查询、移除操作
- 减少单次操作的开销
- 提高整体吞吐量

### 8.4 懒加载

- 按需加载工作流定义的详细信息
- 摘要信息快速返回
- 详细信息延迟加载

## 9. 错误处理

### 9.1 注册错误

- 工作流 ID 重复：拒绝注册，返回错误信息
- 工作流定义无效：拒绝注册，返回验证错误
- 存储失败：拒绝注册，返回存储错误

### 9.2 查询错误

- 工作流不存在：返回 undefined 或抛出异常
- 版本不存在：返回 undefined 或抛出异常
- 查询参数无效：返回空列表或抛出异常

### 9.3 更新错误

- 工作流不存在：拒绝更新，返回错误信息
- 更新后的定义无效：拒绝更新，返回验证错误
- 版本冲突：拒绝更新，返回版本冲突错误

### 9.4 移除错误

- 工作流不存在：忽略或返回错误信息
- 工作流正在使用：拒绝移除，返回错误信息
- 存储失败：拒绝移除，返回存储错误

## 10. 扩展性

### 10.1 插件机制

支持通过插件扩展 WorkflowRegistry 的功能：

- 自定义验证规则插件
- 自定义存储后端插件
- 自定义查询方式插件
- 自定义导出导入格式插件

### 10.2 事件机制

支持事件通知，允许其他组件监听 WorkflowRegistry 的变化：

- 工作流注册事件
- 工作流更新事件
- 工作流移除事件
- 工作流版本变化事件

### 10.3 钩子机制

支持在关键操作前后执行自定义逻辑：

- 注册前钩子
- 注册后钩子
- 更新前钩子
- 更新后钩子
- 移除前钩子
- 移除后钩子

## 11. 安全性

### 11.1 访问控制

支持工作流定义的访问控制：

- 基于角色的访问控制（RBAC）
- 基于属性的访问控制（ABAC）
- 支持工作流级别的权限设置

### 11.2 数据验证

严格验证所有输入数据：

- 验证工作流定义的结构和内容
- 验证查询参数的有效性
- 验证更新操作的合法性

### 11.3 审计日志

记录所有关键操作：

- 记录工作流注册操作
- 记录工作流更新操作
- 记录工作流移除操作
- 记录工作流查询操作（可选）

## 12. 监控和诊断

### 12.1 性能监控

监控 WorkflowRegistry 的性能指标：

- 注册操作的耗时
- 查询操作的耗时
- 缓存命中率
- 内存使用情况

### 12.2 健康检查

提供健康检查接口：

- 检查存储后端的可用性
- 检查缓存的完整性
- 检查索引的有效性

### 12.3 诊断信息

提供诊断信息接口：

- 返回已注册工作流的统计信息
- 返回缓存的使用情况
- 返回索引的状态信息

## 13. 配置选项

### 13.1 缓存配置

- 缓存大小限制
- 缓存过期时间
- 缓存策略（LRU、LFU 等）

### 13.2 版本管理配置

- 是否启用版本管理
- 保留的历史版本数量
- 版本清理策略

### 13.3 验证配置

- 是否启用严格验证
- 自定义验证规则
- 验证失败的处理策略

### 13.4 存储配置

- 存储后端类型（内存、文件、数据库）
- 存储路径或连接字符串
- 持久化策略

## 14. 实现建议

### 14.1 分层架构

WorkflowRegistry 采用分层架构：

- 接口层：定义公共接口
- 业务逻辑层：实现核心业务逻辑
- 存储层：抽象存储接口
- 缓存层：实现缓存逻辑
- 索引层：实现索引逻辑

### 14.2 依赖注入

使用依赖注入模式，提高可测试性和可扩展性：

- 注入存储后端实现
- 注入验证器实现
- 注入事件发射器实现

### 14.3 单例模式

WorkflowRegistry 通常作为单例使用，确保全局只有一个实例：

- 提供全局访问点
- 确保线程安全
- 支持延迟初始化

## 15. 总结

WorkflowRegistry 是 SDK 中工作流定义管理的核心组件，承担着工作流定义的注册、查询、更新、移除、缓存、验证、版本管理等职责。它与 ThreadBuilder、CheckpointManager、WorkflowValidator 等组件紧密协作，为整个 SDK 提供工作流定义的基础服务。

设计 WorkflowRegistry 时需要遵循单一职责、依赖倒置、开闭原则等设计原则，优先考虑性能，同时保证扩展性和安全性。通过合理的接口设计、存储策略、性能优化和错误处理，WorkflowRegistry 能够满足各种场景下的工作流定义管理需求。