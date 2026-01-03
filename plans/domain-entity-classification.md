# Domain 实体分类清单

## 一、聚合根实体（Aggregate Root Entities）

### 定义
聚合根实体是 DDD 中的核心概念，表示具有唯一标识的对象，具有完整的生命周期管理，需要持久化存储，包含业务规则和不变性约束。

### 特征
- ✅ 继承自 `Entity` 基类
- ✅ 具有完整的生命周期管理
- ✅ 需要持久化存储
- ✅ 包含业务规则和不变性约束
- ✅ 作为聚合的根，管理内部实体和值对象
- ✅ 使用完全不可变模式
- ✅ 使用 `DeletionStatus` 值对象
- ✅ 使用 `Version` 值对象
- ✅ 使用 `Timestamp` 值对象
- ✅ Props 接口使用 `readonly` 修饰符
- ✅ 提供 `getBusinessIdentifier()` 方法

### 实体列表

#### 1. Session（会话）
- **路径：** `src/domain/sessions/entities/session.ts`
- **职责：** 用户会话，作为多线程管理器
- **当前状态：** ✅ 符合规范
- **关键特性：**
  - 管理线程集合
  - 管理共享资源
  - 管理并行策略
  - 会话生命周期管理

#### 2. Thread（线程）
- **路径：** `src/domain/threads/entities/thread.ts`
- **职责：** 线程聚合根，专注于串行执行流程协调
- **当前状态：** ✅ 符合规范
- **关键特性：**
  - 串行执行流程协调
  - 单线程内的状态管理
  - 执行步骤的顺序控制
  - 错误处理和恢复

#### 3. Workflow（工作流）
- **路径：** `src/domain/workflow/entities/workflow.ts`
- **职责：** 工作流聚合根，管理节点和边的图结构
- **当前状态：** ✅ 符合规范
- **关键特性：**
  - 节点和边的基本管理
  - 简单的存在性检查
  - 自身状态管理
  - 图结构查询

#### 4. Checkpoint（检查点）
- **路径：** `src/domain/checkpoint/entities/checkpoint.ts`
- **职责：** 检查点聚合根，表示线程执行过程中的状态快照
- **当前状态：** ✅ 符合规范
- **关键特性：**
  - 检查点基本信息管理
  - 状态数据管理
  - 标签和元数据管理
  - 软删除支持

#### 5. History（历史记录）
- **路径：** `src/domain/history/entities/history.ts`
- **职责：** 历史记录聚合根，表示系统中的操作审计记录
- **当前状态：** ✅ 符合规范
- **关键特性：**
  - 历史记录基本信息管理
  - 详细信息管理
  - 元数据管理
  - 软删除支持

#### 6. Tool（工具）
- **路径：** `src/domain/tools/entities/tool.ts`
- **职责：** 工具聚合根，表示系统中的工具定义
- **当前状态：** ✅ 符合规范
- **关键特性：**
  - 工具基本信息管理
  - 参数定义管理
  - 标签和分类管理
  - 依赖关系管理

#### 7. Prompt（提示词）
- **路径：** `src/domain/prompts/entities/prompt.ts`
- **职责：** 提示词聚合根，表示系统中的提示词管理
- **当前状态：** ⚠️ 需要改进
- **关键特性：**
  - 提示词内容管理
  - 变量和验证规则管理
  - 状态管理（激活/禁用/弃用）
  - 依赖关系管理
- **需要改进：**
  - 添加 `DeletionStatus` 值对象
  - 添加 `getBusinessIdentifier()` 方法
  - 统一工厂方法命名为 `fromProps()`

---

## 二、执行记录实体（Execution Record Entities）

### 定义
执行记录实体用于记录执行过程和结果，通常不需要复杂的生命周期管理，可能不需要持久化（或短期持久化），侧重于数据记录而非业务规则。

### 特征
- ✅ 继承自 `Entity` 基类（推荐）
- ⚠️ 可能需要持久化（根据需求）
- ⚠️ 可以使用可变模式（性能优先）或不可变模式（一致性优先）
- ⚠️ 可以使用简单的 `isDeleted: boolean` 标志
- ⚠️ 可以使用 `Version` 值对象（根据需求）
- ⚠️ 可以使用 `Timestamp` 值对象或 `Date` 类型
- ✅ Props 接口使用 `readonly` 修饰符（推荐）
- ⚠️ 可以提供 `getBusinessIdentifier()` 方法（根据需求）

### 实体列表

#### 1. LLMRequest（LLM请求）
- **路径：** `src/domain/llm/entities/llm-request.ts`
- **职责：** 记录对大语言模型的请求
- **当前状态：** ⚠️ 需要改进
- **关键特性：**
  - 请求基本信息管理
  - 消息列表管理
  - 参数管理
  - 元数据管理
- **需要改进：**
  - Props 接口添加 `readonly` 修饰符
  - 统一不可变性模式（建议使用不可变模式）
  - 统一删除状态管理（建议使用 `DeletionStatus`）

#### 2. LLMResponse（LLM响应）
- **路径：** `src/domain/llm/entities/llm-response.ts`
- **职责：** 记录大语言模型的响应
- **当前状态：** ⚠️ 需要改进
- **关键特性：**
  - 响应基本信息管理
  - 选择列表管理
  - Token 使用统计管理
  - 元数据管理
- **需要改进：**
  - Props 接口添加 `readonly` 修饰符
  - 统一不可变性模式（建议使用不可变模式）
  - 统一删除状态管理（建议使用 `DeletionStatus`）

#### 3. ToolExecution（工具执行）
- **路径：** `src/domain/tools/entities/tool-execution.ts`
- **职责：** 记录工具的一次执行记录
- **当前状态：** ❌ 需要重大改进
- **关键特性：**
  - 执行状态管理
  - 执行参数和结果管理
  - 执行日志管理
  - 执行指标管理
- **需要改进：**
  - 继承 `Entity` 基类
  - Props 接口添加 `readonly` 修饰符
  - 添加 `Version` 值对象
  - 添加 `Timestamp` 值对象
  - 添加 `getBusinessIdentifier()` 方法
  - 统一工厂方法命名为 `fromProps()`

#### 4. ToolResult（工具结果）
- **路径：** `src/domain/tools/entities/tool-result.ts`
- **职责：** 记录工具执行的结果
- **当前状态：** ❌ 需要重大改进
- **关键特性：**
  - 结果数据管理
  - 结果格式和类型管理
  - 结果权限管理
  - 结果使用统计
- **需要改进：**
  - 继承 `Entity` 基类
  - Props 接口添加 `readonly` 修饰符
  - 添加 `Version` 值对象
  - 添加 `Timestamp` 值对象
  - 添加 `getBusinessIdentifier()` 方法
  - 统一工厂方法命名为 `fromProps()`

---

## 三、抽象实体（Abstract Entities）

### 定义
抽象实体作为其他实体的基类，定义通用接口和行为，不能直接实例化。

### 特征
- ✅ 继承自 `Entity` 基类
- ✅ 使用 `abstract` 关键字
- ✅ 定义抽象方法
- ✅ 使用不可变模式
- ❌ 不需要删除状态
- ❌ 不需要版本管理
- ✅ 使用 `Timestamp` 值对象
- ✅ Props 接口使用 `readonly` 修饰符

### 实体列表

#### 1. Node（节点）
- **路径：** `src/domain/workflow/entities/node.ts`
- **职责：** 抽象节点实体，作为工作流节点的基类
- **当前状态：** ⚠️ 需要改进
- **关键特性：**
  - 节点基本信息管理
  - 节点类型管理
  - 节点状态管理
  - 抽象执行和验证方法
- **需要改进：**
  - 统一不可变性模式（当前使用混合模式）
  - Props 接口添加 `readonly` 修饰符
  - 添加 `getBusinessIdentifier()` 方法

---

## 四、实体分类总结表

| 实体名称 | 类型 | 路径 | 当前状态 | 需要改进 |
|---------|------|------|---------|---------|
| Session | 聚合根 | `src/domain/sessions/entities/session.ts` | ✅ 符合规范 | 无 |
| Thread | 聚合根 | `src/domain/threads/entities/thread.ts` | ✅ 符合规范 | 无 |
| Workflow | 聚合根 | `src/domain/workflow/entities/workflow.ts` | ✅ 符合规范 | 无 |
| Checkpoint | 聚合根 | `src/domain/checkpoint/entities/checkpoint.ts` | ✅ 符合规范 | 无 |
| History | 聚合根 | `src/domain/history/entities/history.ts` | ✅ 符合规范 | 无 |
| Tool | 聚合根 | `src/domain/tools/entities/tool.ts` | ✅ 符合规范 | 无 |
| Prompt | 聚合根 | `src/domain/prompts/entities/prompt.ts` | ⚠️ 需要改进 | 添加 DeletionStatus、getBusinessIdentifier()、统一工厂方法 |
| LLMRequest | 执行记录 | `src/domain/llm/entities/llm-request.ts` | ⚠️ 需要改进 | Props readonly、统一不可变性、统一删除状态 |
| LLMResponse | 执行记录 | `src/domain/llm/entities/llm-response.ts` | ⚠️ 需要改进 | Props readonly、统一不可变性、统一删除状态 |
| ToolExecution | 执行记录 | `src/domain/tools/entities/tool-execution.ts` | ❌ 需要重大改进 | 继承 Entity、Props readonly、添加 Version/Timestamp/getBusinessIdentifier() |
| ToolResult | 执行记录 | `src/domain/tools/entities/tool-result.ts` | ❌ 需要重大改进 | 继承 Entity、Props readonly、添加 Version/Timestamp/getBusinessIdentifier() |
| Node | 抽象 | `src/domain/workflow/entities/node.ts` | ⚠️ 需要改进 | 统一不可变性、Props readonly、添加 getBusinessIdentifier() |

---

## 五、改进优先级

### 高优先级（立即实施）
1. **ToolExecution** - 需要重大改进，缺少 Entity 基础功能
2. **ToolResult** - 需要重大改进，缺少 Entity 基础功能
3. **Prompt** - 添加 DeletionStatus 和 getBusinessIdentifier()

### 中优先级（逐步实施）
1. **LLMRequest** - 统一不可变性和删除状态管理
2. **LLMResponse** - 统一不可变性和删除状态管理
3. **Node** - 统一不可变性模式

### 低优先级（可选）
1. 所有实体的 Props 接口添加 `readonly` 修饰符
2. 所有实体的工厂方法统一命名

---

## 六、改进计划

### 阶段一：执行记录实体基础改进
- [ ] 修改 ToolExecution 继承 Entity 基类
- [ ] 修改 ToolResult 继承 Entity 基类
- [ ] 为 ToolExecution 添加 Version、Timestamp、getBusinessIdentifier()
- [ ] 为 ToolResult 添加 Version、Timestamp、getBusinessIdentifier()

### 阶段二：聚合根实体完善
- [ ] 为 Prompt 添加 DeletionStatus
- [ ] 为 Prompt 添加 getBusinessIdentifier()
- [ ] 统一 Prompt 的工厂方法命名为 fromProps()

### 阶段三：执行记录实体统一
- [ ] 统一 LLMRequest 的不可变性模式
- [ ] 统一 LLMResponse 的不可变性模式
- [ ] 统一 LLMRequest 的删除状态管理
- [ ] 统一 LLMResponse 的删除状态管理

### 阶段四：抽象实体完善
- [ ] 统一 Node 的不可变性模式
- [ ] 为 Node 添加 getBusinessIdentifier()

### 阶段五：全局优化
- [ ] 为所有实体的 Props 接口添加 readonly 修饰符
- [ ] 统一所有实体的工厂方法命名
- [ ] 添加完整的单元测试
- [ ] 更新相关文档