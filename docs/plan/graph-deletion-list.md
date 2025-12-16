# Graph模块删除清单

根据迁移策略文档和代码分析，以下是需要删除的Graph相关文件和代码：

## 1. 基础设施层 (Infrastructure Layer)

### 1.1 数据库模型 (Database Models)
- `src/infrastructure/database/models/graph.model.ts`
- `src/infrastructure/database/models/node.model.ts`
- `src/infrastructure/database/models/edge.model.ts`

### 1.2 数据库仓储 (Database Repositories)
- `src/infrastructure/database/repositories/graph/` 目录及其中所有文件：
  - `graph-repository.ts`
  - `graph-mapper.ts`
  - `index.ts`

### 1.3 数据库迁移文件 (Database Migrations)
- `src/infrastructure/database/migrations/migration-005-graphs.ts`

## 2. 应用层 (Application Layer)

### 2.1 工作流服务 (Workflow Services)
- `src/application/workflow/services/common/` 目录中的以下文件：
  - `topological-sorter.ts`
  - `path-analyzer.ts`
  - `graph-metrics-calculator.ts`
  - `base-graph-service.ts`
  - `cycle-detector.ts`

### 2.2 工作流DTOs (Workflow DTOs)
- `src/application/workflow/dtos/` 目录中的以下文件：
  - `graph.dto.ts`
  - `node.dto.ts`
  - `edge.dto.ts`
  - `graph-statistics.dto.ts`

### 2.3 工作流事件 (Workflow Events)
- `src/application/workflow/events/` 目录中的以下文件：
  - `get-graph-query.ts`
  - `list-graphs-query.ts`
  - `search-graphs-query.ts`
  - `graph-analysis-query.ts`
  - `graph-statistics-query.ts`
  - `node-query.ts`
  - `edge-query.ts`

## 3. 领域层 (Domain Layer)

### 3.1 工作流实体 (Workflow Entities)
注意：这些文件实际上已经合并到Workflow中，但需要检查是否还有残留的Graph引用：
- `src/domain/workflow/graph/` 目录及其中所有文件（如果存在）
- 检查所有Node和Edge实体中对graphId的引用

### 3.2 工作流仓储接口 (Workflow Repository Interfaces)
- 检查并移除任何Graph相关的仓储接口

## 4. 执行引擎 (Execution Engine)

### 4.1 执行策略 (Execution Strategies)
- 检查所有策略文件中对GraphExecutor的引用：
  - `src/infrastructure/workflow/strategies/execution-strategy.ts`
  - `src/infrastructure/workflow/strategies/sequential-strategy.ts`
  - `src/infrastructure/workflow/strategies/parallel-strategy.ts`
  - `src/infrastructure/workflow/strategies/conditional-strategy.ts`

### 4.2 执行上下文和执行器 (Execution Context and Executor)
- `src/infrastructure/workflow/engine/graph-executor.ts`（如果存在）
- `src/infrastructure/workflow/engine/execution-context.ts` 中对Graph的引用

## 5. 其他需要检查的地方

### 5.1 配置文件
- 检查所有配置文件中对Graph模块的引用

### 5.2 依赖注入绑定
- `src/infrastructure/container/bindings/` 目录中对Graph相关服务的绑定

### 5.3 测试文件
- 所有与Graph相关的测试文件

## 6. 数据库清理

### 6.1 数据库表
根据迁移策略文档，需要执行以下SQL操作：
```sql
-- 删除graph表及相关表
DROP TABLE edges;
DROP TABLE nodes;
DROP TABLE graphs;

-- 删除相关类型定义
DROP TYPE IF EXISTS graph_state;
DROP TYPE IF EXISTS node_type;
DROP TYPE IF EXISTS edge_type;
DROP TYPE IF EXISTS node_state;
DROP TYPE IF EXISTS edge_state;
```

## 注意事项

1. 在删除任何文件之前，请确保相关功能已完全迁移到Workflow模块中
2. 确保所有对外接口保持向后兼容
3. 更新所有相关的文档和注释
4. 运行完整的测试套件以确保没有破坏现有功能
5. 更新README和其他文档以反映架构变化