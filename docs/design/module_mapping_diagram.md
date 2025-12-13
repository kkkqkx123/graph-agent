# Python实现到Rust架构模块映射图表

## 整体架构映射关系

### Python Core Layer 模块结构
- python-impl/src/core/
  - workflow/ - 工作流模块
  - state/ - 状态管理模块
  - tools/ - 工具模块
  - sessions/ - 会话模块
  - threads/ - 线程模块
  - storage/ - 存储模块
  - history/ - 历史模块
  - llm/ - LLM模块
  - config/ - 配置模块
  - common/ - 通用模块

### Rust New Architecture 模块结构
- src/
  - domain/ - 领域层
  - application/ - 应用层
  - infrastructure/ - 基础设施层
  - interfaces/ - 接口层

### 模块映射关系
- Python workflow/ 映射到 Rust domain/, application/, infrastructure/
- Python state/ 映射到 Rust domain/, application/, infrastructure/
- Python tools/ 映射到 Rust domain/, application/, infrastructure/
- Python sessions/ 映射到 Rust domain/, application/, infrastructure/
- Python threads/ 映射到 Rust domain/, application/, infrastructure/
- Python storage/ 映射到 Rust domain/, application/, infrastructure/
- Python history/ 映射到 Rust domain/, application/, infrastructure/
- Python llm/ 映射到 Rust domain/, application/, infrastructure/
- Python config/ 映射到 Rust infrastructure/
- Python common/ 映射到 Rust domain/, application/, infrastructure/

## 工作流模块详细映射

### Python workflow/ 子模块
- composition/ - 组合相关
- coordinator/ - 协调器
- core/ - 核心功能
- execution/ - 执行相关
- graph/ - 图相关
- management/ - 管理相关
- registry/ - 注册表
- templates/ - 模板

### Rust Domain Layer 对应模块
- domain/workflow/entities.rs - 工作流实体
- domain/workflow/value_objects.rs - 值对象
- domain/workflow/graph/entities.rs - 图实体
- domain/workflow/registry/entities.rs - 注册表实体

### Rust Application Layer 对应模块
- application/workflow/service.rs - 工作流服务
- application/workflow/composition/service.rs - 组合服务
- application/workflow/coordination/service.rs - 协调服务
- application/workflow/management/service.rs - 管理服务
- application/workflow/templates/service.rs - 模板服务

### Rust Infrastructure Layer 对应模块
- infrastructure/workflow/engine.rs - 工作流引擎
- infrastructure/workflow/execution/ - 执行模块
- infrastructure/workflow/graph/ - 图模块
- infrastructure/workflow/registry/ - 注册表模块

### 映射关系
- composition/ 映射到 application/workflow/composition/service.rs
- coordinator/ 映射到 application/workflow/coordination/service.rs
- core/ 映射到 domain/workflow/entities.rs 和 domain/workflow/value_objects.rs
- execution/ 映射到 infrastructure/workflow/execution/
- graph/ 映射到 domain/workflow/graph/entities.rs 和 infrastructure/workflow/graph/
- management/ 映射到 application/workflow/management/service.rs
- registry/ 映射到 domain/workflow/registry/entities.rs 和 infrastructure/workflow/registry/
- templates/ 映射到 application/workflow/templates/service.rs

## 状态管理模块详细映射

### Python state/ 子模块
- builders/ - 构建器
- core/ - 核心组件
- factories/ - 工厂
- history/ - 历史管理
- implementations/ - 具体实现
- snapshots/ - 快照管理
- utils/ - 工具

### Rust Domain Layer 对应模块
- domain/state/entities.rs - 状态实体
- domain/state/value_objects.rs - 值对象
- domain/state/history/entities.rs - 历史实体
- domain/state/snapshots/entities.rs - 快照实体

### Rust Application Layer 对应模块
- application/state/service.rs - 状态服务
- application/state/builders/service.rs - 构建器服务
- application/state/history/service.rs - 历史服务
- application/state/snapshots/service.rs - 快照服务

### Rust Infrastructure Layer 对应模块
- infrastructure/state/managers/ - 状态管理器
- infrastructure/state/factories/ - 状态工厂
- infrastructure/state/cache/ - 状态缓存
- infrastructure/state/storage/ - 状态存储

### 映射关系
- builders/ 映射到 application/state/builders/service.rs
- core/ 映射到 domain/state/entities.rs 和 domain/state/value_objects.rs
- factories/ 映射到 infrastructure/state/factories/
- history/ 映射到 domain/state/history/entities.rs 和 application/state/history/service.rs
- implementations/ 映射到 domain/state/entities.rs
- snapshots/ 映射到 domain/state/snapshots/entities.rs 和 application/state/snapshots/service.rs
- utils/ 映射到 infrastructure/state/managers/

## 工具模块详细映射

### Python tools/ 子模块
- types/ - 工具类型
- validation/ - 验证
- mappers/ - 映射器
- utils/ - 工具
- base.py - 基础类
- executor.py - 执行器
- factory.py - 工厂
- manager.py - 管理器

### Rust Domain Layer (New) 对应模块
- domain/tools/entities.rs - 工具实体
- domain/tools/value_objects.rs - 值对象
- domain/tools/events.rs - 事件
- domain/tools/errors.rs - 错误

### Rust Application Layer (New) 对应模块
- application/tools/service.rs - 工具服务
- application/tools/commands.rs - 命令
- application/tools/queries.rs - 查询
- application/tools/dto.rs - 数据传输对象
- application/tools/validation/ - 验证

### Rust Infrastructure Layer (New) 对应模块
- infrastructure/tools/executors/ - 执行器
- infrastructure/tools/factories/ - 工厂
- infrastructure/tools/types/ - 工具类型

### 映射关系
- types/ 映射到 domain/tools/entities.rs 和 infrastructure/tools/types/
- validation/ 映射到 application/tools/validation/
- mappers/ 映射到 application/tools/dto.rs
- utils/ 映射到 infrastructure/tools/executors/
- base.py 映射到 domain/tools/entities.rs
- executor.py 映射到 infrastructure/tools/executors/
- factory.py 映射到 infrastructure/tools/factories/
- manager.py 映射到 application/tools/service.rs

## 新增模块映射

### Domain Layer (New) 新增模块
- domain/sessions/ - 会话领域
- domain/threads/ - 线程领域
- domain/storage/ - 存储领域
- domain/history/ - 历史领域

### Application Layer (New) 新增模块
- application/sessions/ - 会话应用
- application/threads/ - 线程应用
- application/storage/ - 存储应用
- application/history/ - 历史应用

### Infrastructure Layer (New) 新增模块
- infrastructure/sessions/ - 会话基础设施
- infrastructure/threads/ - 线程基础设施
- infrastructure/storage/ - 存储基础设施
- infrastructure/history/ - 历史基础设施

### 依赖关系
- domain/sessions/ 依赖 application/sessions/
- domain/threads/ 依赖 application/threads/
- domain/storage/ 依赖 application/storage/
- domain/history/ 依赖 application/history/
- application/sessions/ 依赖 infrastructure/sessions/
- application/threads/ 依赖 infrastructure/threads/
- application/storage/ 依赖 infrastructure/storage/
- application/history/ 依赖 infrastructure/history/

## 模块依赖关系图

### Domain Layer 内部依赖
- domain/workflow/ 依赖 domain/common/
- domain/state/ 依赖 domain/common/
- domain/llm/ 依赖 domain/common/
- domain/tools/ 依赖 domain/common/
- domain/sessions/ 依赖 domain/common/
- domain/threads/ 依赖 domain/common/
- domain/storage/ 依赖 domain/common/
- domain/history/ 依赖 domain/common/

### Application Layer 内部依赖
- application/workflow/ 依赖 domain/workflow/
- application/state/ 依赖 domain/state/
- application/llm/ 依赖 domain/llm/
- application/tools/ 依赖 domain/tools/
- application/sessions/ 依赖 domain/sessions/
- application/threads/ 依赖 domain/threads/
- application/storage/ 依赖 domain/storage/
- application/history/ 依赖 domain/history/
- application/common/ 依赖 domain/common/

### Infrastructure Layer 内部依赖
- infrastructure/workflow/ 依赖 domain/workflow/
- infrastructure/state/ 依赖 domain/state/
- infrastructure/llm/ 依赖 domain/llm/
- infrastructure/tools/ 依赖 domain/tools/
- infrastructure/sessions/ 依赖 domain/sessions/
- infrastructure/threads/ 依赖 domain/threads/
- infrastructure/storage/ 依赖 domain/storage/
- infrastructure/history/ 依赖 domain/history/
- infrastructure/common/ 依赖 domain/common/

### Interface Layer 依赖
- interfaces/http/ 依赖 application/workflow/, application/state/, application/llm/
- interfaces/grpc/ 依赖 application/workflow/
- interfaces/cli/ 依赖 application/workflow/

## 实施路线图

### 阶段1：核心基础 (2024-01-01 - 2024-02-18)
- 工作流领域模型 (14天)
- 状态管理领域模型 (14天)
- 工作流执行基础设施 (21天)
- 状态管理基础设施 (21天)

### 阶段2：核心功能 (2024-02-19 - 2024-05-12)
- 工具系统 (28天)
- 图相关实现 (21天)
- 会话管理 (21天)
- 线程管理 (21天)

### 阶段3：增强功能 (2024-05-13 - 2024-08-19)
- 历史管理 (21天)
- 快照管理 (21天)
- 存储系统 (28天)
- 模板系统 (21天)

### 阶段4：高级功能 (2024-08-20 - 2024-10-18)
- 注册表缓存 (14天)
- 扩展系统 (21天)
- 监控和指标 (21天)
- 性能优化 (14天)

## 关键决策点

### 1. 模块拆分策略
- 保持Python实现的功能完整性
- 按照Rust的单一职责原则进行拆分
- 确保模块间的松耦合

### 2. 依赖管理
- 严格遵循分层架构的依赖规则
- 使用Rust的类型系统确保编译时安全
- 通过trait定义清晰的接口边界

### 3. 性能考虑
- 利用Rust的零成本抽象
- 合理使用内存管理机制
- 优化关键路径的执行效率

### 4. 兼容性保证
- 保持API的向后兼容性
- 提供平滑的迁移路径
- 确保功能等价性