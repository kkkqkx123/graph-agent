# 通用存储包需求规格文档

## 1. 概述

### 1.1 项目背景
Modular Agent Framework 当前采用回调接口模式处理存储需求，SDK 层定义 `CheckpointStorageCallback` 接口，由应用层实现具体存储逻辑。为提升框架的易用性和开箱即用能力，需要提供一个通用的存储包，支持多种存储后端，满足检查点（checkpoint）和线程（thread）等实例的持久化需求。

### 1.2 目标
构建一个位于 `packages/storage` 目录的通用存储包，提供：
- 统一的存储抽象接口
- JSON 文件序列化存储实现
- SQLite 数据库存储实现
- 与现有 SDK 存储回调接口的无缝集成

### 1.3 范围
**包含：**
- 存储接口抽象层设计
- JSON 文件存储后端实现
- SQLite 存储后端实现
- 检查点存储适配器
- 线程存储适配器
- 基本的查询和过滤功能

**不包含：**
- 分布式存储后端（如 Redis、PostgreSQL）
- 云存储服务集成
- 复杂的 ORM 映射功能
- 数据迁移工具

---

## 2. 功能需求

### 2.1 存储接口抽象层

#### 2.1.1 泛型存储接口
**需求描述：** 系统应提供一个泛型存储接口，支持不同类型实体的 CRUD 操作。

**验收标准：**
- When 调用 `save<T>(id: string, entity: T)` 方法，Then 实体应被持久化到存储后端
- When 调用 `load<T>(id: string)` 方法，Then 应返回存储的实体或 null
- When 调用 `delete(id: string)` 方法，Then 实体应从存储中移除
- When 调用 `exists(id: string)` 方法，Then 应返回实体是否存在
- When 调用 `list(options?: ListOptions)` 方法，Then 应返回符合条件的实体 ID 列表

#### 2.1.2 元数据支持
**需求描述：** 系统应支持存储实体的元数据管理，便于索引和查询。

**验收标准：**
- When 保存实体时提供元数据，Then 元数据应与实体一同存储
- When 查询实体列表时，Then 应支持按元数据字段过滤
- When 查询实体列表时，Then 应支持分页参数（limit、offset）

### 2.2 JSON 文件存储后端

#### 2.2.1 文件存储基础功能
**需求描述：** 系统应提供基于 JSON 文件系统的存储实现。

**验收标准：**
- When 初始化 JSON 存储时指定目录路径，Then 应在该目录下创建存储结构
- When 保存实体时，Then 实体应序列化为 JSON 文件存储
- When 加载实体时，Then 应从 JSON 文件反序列化为对象
- When 删除实体时，Then 对应的 JSON 文件应被移除
- When 存储目录不存在时，Then 应自动创建目录结构

#### 2.2.2 文件组织结构
**需求描述：** 系统应采用合理的文件组织结构管理存储的实体。

**验收标准：**
- When 存储检查点实体时，Then 文件应按 `checkpoints/{threadId}/{checkpointId}.json` 路径组织
- When 存储线程实体时，Then 文件应按 `threads/{workflowId}/{threadId}.json` 路径组织
- When 列出实体时，Then 应能正确遍历目录结构获取所有实体

#### 2.2.3 并发安全
**需求描述：** 系统应保证 JSON 文件存储的并发安全。

**验收标准：**
- When 多个进程同时写入同一实体时，Then 应通过文件锁机制保证数据一致性
- When 读取正在写入的文件时，Then 应能读取到完整的数据或旧数据

### 2.3 SQLite 存储后端

#### 2.3.1 数据库初始化
**需求描述：** 系统应提供 SQLite 数据库存储实现，支持自动初始化。

**验收标准：**
- When 初始化 SQLite 存储时指定数据库路径，Then 应创建或连接到数据库文件
- When 数据库不存在时，Then 应自动创建表结构
- When 表结构不存在时，Then 应自动创建所需的表

#### 2.3.2 数据表设计
**需求描述：** 系统应为不同实体类型设计合适的数据表结构。

**验收标准：**
- When 创建检查点表时，Then 应包含 id、threadId、workflowId、timestamp、data、metadata 字段
- When 创建线程表时，Then 应包含 id、workflowId、status、startTime、endTime、data 字段
- When 创建表时，Then 应为常用查询字段创建索引（如 threadId、workflowId）

#### 2.3.3 事务支持
**需求描述：** 系统应支持 SQLite 事务操作。

**验收标准：**
- When 执行批量操作时，Then 应支持事务包装
- When 事务中发生错误时，Then 应自动回滚
- When 事务成功完成时，Then 应自动提交

### 2.4 检查点存储适配器

#### 2.4.1 CheckpointStorageCallback 接口实现
**需求描述：** 系统应提供适配器实现 SDK 的 `CheckpointStorageCallback` 接口。

**验收标准：**
- When 调用 `saveCheckpoint(id, data, metadata)` 方法，Then 检查点数据应通过底层存储保存
- When 调用 `loadCheckpoint(id)` 方法，Then 应返回检查点数据（Uint8Array）或 null
- When 调用 `deleteCheckpoint(id)` 方法，Then 检查点应被删除
- When 调用 `listCheckpoints(options)` 方法，Then 应返回符合过滤条件的检查点 ID 列表
- When 调用 `checkpointExists(id)` 方法，Then 应返回检查点是否存在

#### 2.4.2 元数据映射
**需求描述：** 系统应正确处理检查点元数据的存储和查询。

**验收标准：**
- When 保存检查点时，Then 元数据（threadId、workflowId、timestamp、tags）应正确存储
- When 按 threadId 过滤时，Then 应只返回匹配的检查点
- When 按 workflowId 过滤时，Then 应只返回匹配的检查点
- When 按 tags 过滤时，Then 应返回包含任一标签的检查点

### 2.5 线程存储适配器

#### 2.5.1 线程存储接口
**需求描述：** 系统应提供线程实体的存储接口和实现。

**验收标准：**
- When 调用 `saveThread(thread)` 方法，Then 线程实体应被持久化
- When 调用 `loadThread(id)` 方法，Then 应返回线程实体或 null
- When 调用 `deleteThread(id)` 方法，Then 线程应被删除
- When 调用 `listThreads(options)` 方法，Then 应返回符合过滤条件的线程列表
- When 按 workflowId 过滤时，Then 应只返回匹配的线程
- When 按 status 过滤时，Then 应只返回匹配状态的线程

#### 2.5.2 线程状态恢复
**需求描述：** 系统应支持从存储恢复线程的完整状态。

**验收标准：**
- When 加载线程时，Then 应恢复线程的所有属性（id、status、currentNodeId、variables 等）
- When 加载线程时，Then 应恢复线程的执行历史（nodeResults）
- When 加载线程时，Then 应恢复线程的上下文数据（contextData）

### 2.6 存储工厂与配置

#### 2.6.1 存储工厂
**需求描述：** 系统应提供工厂方法创建不同类型的存储实例。

**验收标准：**
- When 调用 `createJsonStorage(config)` 方法，Then 应返回配置好的 JSON 存储实例
- When 调用 `createSqliteStorage(config)` 方法，Then 应返回配置好的 SQLite 存储实例
- When 调用 `createCheckpointAdapter(storage)` 方法，Then 应返回检查点存储适配器
- When 调用 `createThreadAdapter(storage)` 方法，Then 应返回线程存储适配器

#### 2.6.2 配置选项
**需求描述：** 系统应支持灵活的存储配置选项。

**验收标准：**
- When 配置 JSON 存储时，Then 应支持指定基础目录路径
- When 配置 SQLite 存储时，Then 应支持指定数据库文件路径
- When 配置存储时，Then 应支持启用/禁用日志记录

---

## 3. 非功能需求

### 3.1 性能要求

#### 3.1.1 响应时间
**需求描述：** 存储操作应满足性能要求。

**验收标准：**
- When 执行单条记录的 CRUD 操作时，Then 响应时间应小于 100ms
- When 批量列出 1000 条记录时，Then 响应时间应小于 500ms

#### 3.1.2 存储效率
**需求描述：** 存储应高效利用存储空间。

**验收标准：**
- When 使用 SQLite 存储时，Then 数据应采用压缩格式存储
- When 存储大量实体时，Then 应支持分页查询避免内存溢出

### 3.2 可靠性要求

#### 3.2.1 数据完整性
**需求描述：** 存储应保证数据的完整性。

**验收标准：**
- When 写入数据时发生错误，Then 应保证原有数据不被破坏
- When 存储介质出现问题时，Then 应抛出明确的错误信息

#### 3.2.2 错误处理
**需求描述：** 系统应提供清晰的错误信息。

**验收标准：**
- When 存储操作失败时，Then 应抛出包含详细信息的 StorageError
- When 存储空间不足时，Then 应抛出 StorageQuotaExceededError

### 3.3 可维护性要求

#### 3.3.1 代码组织
**需求描述：** 代码应遵循项目的模块化设计原则。

**验收标准：**
- When 查看包结构时，Then 应遵循 `packages/` 目录的标准结构
- When 查看代码时，Then 应使用 TypeScript 强类型，避免 any 类型
- When 查看导出时，Then 应通过 `index.ts` 统一导出公共 API

#### 3.3.2 测试覆盖
**需求描述：** 系统应具备完善的测试覆盖。

**验收标准：**
- When 运行测试时，Then 单元测试覆盖率应达到 80% 以上
- When 测试 JSON 存储时，Then 应覆盖文件读写、并发安全等场景
- When 测试 SQLite 存储时，Then 应覆盖事务、查询等场景

### 3.4 兼容性要求

#### 3.4.1 运行环境
**需求描述：** 系统应支持 Node.js 运行环境。

**验收标准：**
- When 在 Node.js 22.x 环境运行时，Then 所有功能应正常工作
- When 使用 ES Module 模式时，Then 应正确导入导出

#### 3.4.2 SDK 集成
**需求描述：** 系统应与现有 SDK 无缝集成。

**验收标准：**
- When 使用存储适配器时，Then 应能直接注入到 SDK 的依赖容器
- When SDK 调用存储接口时，Then 应与现有回调接口行为一致

---

## 4. 约束条件

### 4.1 技术约束
- 必须使用 TypeScript 编写，遵循项目的 TypeScript 配置
- 必须使用 `workspace:*` 协议引用内部包（如 `@modular-agent/types`）
- 必须遵循 monorepo 的构建和测试规范
- SQLite 依赖应使用纯 JavaScript 实现（如 better-sqlite3 或 sql.js），避免原生编译问题

### 4.2 设计约束
- 存储接口设计应参考现有 `CheckpointStorageCallback` 接口风格
- 错误类型应继承自项目现有的错误体系
- 日志记录应使用项目现有的日志工具

---

## 5. 依赖关系

### 5.1 内部依赖
- `@modular-agent/types`：使用 Thread、Checkpoint、CheckpointStorageMetadata 等类型定义
- `@modular-agent/common-utils`：使用通用工具函数

### 5.2 外部依赖
- SQLite 库（better-sqlite3）
- 无其他重量级外部依赖
