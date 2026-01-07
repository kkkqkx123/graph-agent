# 新架构方案

## 架构概览

```
src/
├── domain/              # 领域层（保持不变）
│   ├── workflow/
│   ├── threads/
│   ├── checkpoint/
│   └── common/
├── services/            # 服务层（合并应用层和基础设施层的具体实现）
│   ├── workflow/
│   │   ├── workflow-management.ts      # 之前：WorkflowManagementService
│   │   ├── workflow-lifecycle.ts       # 之前：WorkflowLifecycleService
│   │   ├── workflow-validator.ts       # 之前：WorkflowValidator
│   │   ├── workflow-execution.ts       # 之前：WorkflowExecutionEngine
│   │   ├── nodes/
│   │   ├── functions/
│   │   └── dtos/                       # DTO定义
│   ├── threads/
│   │   ├── thread-execution.ts         # 之前：ThreadExecutionService
│   │   ├── thread-monitoring.ts        # 之前：ThreadMonitoringService
│   │   ├── thread-state.ts             # 之前：ThreadStateManager
│   │   ├── thread-history.ts           # 之前：ThreadHistoryManager
│   │   └── dtos/                       # DTO定义
│   ├── llm/
│   │   ├── wrapper.ts                  # 之前：WrapperService
│   │   ├── llm-wrapper-manager.ts      # 之前：LLMWrapperManager
│   │   ├── clients/
│   │   └── dtos/                       # DTO定义
│   └── sessions/
│       ├── session-management.ts       # 之前：SessionManagementService
│       └── dtos/                       # DTO定义
├── infrastructure/      # 基础设施层（保留技术基础设施）
│   ├── persistence/
│   │   ├── connection-manager.ts
│   │   └── repositories/
│   ├── logging/
│   │   ├── logger.ts
│   │   └── loggers/
│   └── config/
│       └── config-loader.ts
└── application/         # 应用层（作为接口层）
    ├── http/
    │   ├── controllers/
    │   ├── routes/
    │   └── middleware/
    └── grpc/
        └── services/
```

## 各层职责

### 1. Domain层（领域层）
- **职责**：定义领域模型、值对象、领域服务接口
- **内容**：实体、值对象、领域事件、仓储接口
- **不变**：保持现有结构

### 2. Services层（服务层）
- **职责**：提供业务和技术服务，返回DTO
- **内容**：
  - 业务逻辑实现
  - 工作流执行引擎
  - 节点执行器
  - LLM集成
  - DTO定义和转换
- **命名规范**：移除`Service`后缀，使用简洁的命名

### 3. Infrastructure层（基础设施层）
- **职责**：提供技术基础设施
- **内容**：
  - 持久化（数据库连接、仓储实现）
  - 日志记录
  - 配置加载
  - 其他技术基础设施

### 4. Application层（应用层）
- **职责**：作为接口层，提供HTTP/gRPC API
- **内容**：
  - HTTP控制器
  - 路由定义
  - 中间件
  - gRPC服务

## 命名规范

### 服务类命名
```typescript
// 之前
class WorkflowManagementService { }
class ThreadExecutionService { }
class LLMWrapperManager { }

// 之后
class WorkflowManagement { }
class ThreadExecution { }
class LLMWrapperManager { }  // Manager保持不变
```

### DTO定义
```typescript
// services/workflow/dtos/workflow.dto.ts
export interface WorkflowDTO {
  id: string;
  name: string;
  description?: string;
  status: string;
  // ...
}

export function mapWorkflowToDTO(workflow: Workflow): WorkflowDTO {
  return {
    id: workflow.workflowId.value,
    name: workflow.name,
    description: workflow.description,
    status: workflow.status.toString(),
    // ...
  };
}
```

## 依赖关系

```
Application层 → Services层 → Domain层
                    ↓
              Infrastructure层
```

- Application层依赖Services层
- Services层依赖Domain层和Infrastructure层
- Infrastructure层依赖Domain层（实现仓储接口）

## 迁移步骤

### 第一步：创建新的目录结构
```bash
mkdir -p src/services/workflow/dtos
mkdir -p src/services/threads/dtos
mkdir -p src/services/llm/dtos
mkdir -p src/services/sessions/dtos
```

### 第二步：移动和重命名服务类
```typescript
// 从 src/application/workflow/services/workflow-management-service.ts
// 移动到 src/services/workflow/workflow-management.ts

// 从 src/infrastructure/threads/workflow-execution-engine.ts
// 移动到 src/services/threads/workflow-execution.ts
```

### 第三步：移动DTO到服务层
```typescript
// 从 src/application/workflow/dtos/workflow-dto.ts
// 移动到 src/services/workflow/dtos/workflow.dto.ts
```

### 第四步：保留基础设施层
```typescript
// 保留 src/infrastructure/persistence/
// 保留 src/infrastructure/logging/
// 保留 src/infrastructure/config/
```

### 第五步：更新应用层为接口层
```typescript
// src/application/http/controllers/workflow.controller.ts
import { WorkflowManagement } from '../../services/workflow/workflow-management';
import { WorkflowDTO } from '../../services/workflow/dtos/workflow.dto';

export class WorkflowController {
  constructor(
    private readonly workflowManagement: WorkflowManagement
  ) {}

  async getWorkflow(req: Request, res: Response): Promise<void> {
    const workflowDTO = await this.workflowManagement.getWorkflow(req.params.id);
    res.json(workflowDTO);
  }
}
```

### 第六步：更新依赖注入
```typescript
// src/di/bindings/service-bindings.ts
container.bind<WorkflowManagement>('WorkflowManagement').to(WorkflowManagement);
container.bind<ThreadExecution>('ThreadExecution').to(ThreadExecution);
container.bind<LLMWrapperManager>('LLMWrapperManager').to(LLMWrapperManager);
```

## 示例代码

### 服务层示例
```typescript
// src/services/workflow/workflow-management.ts
import { injectable, inject } from 'inversify';
import { Workflow, IWorkflowRepository } from '../../domain/workflow';
import { WorkflowDTO, mapWorkflowToDTO } from './dtos/workflow.dto';

@injectable()
export class WorkflowManagement {
  constructor(
    @inject('WorkflowRepository') private readonly workflowRepository: IWorkflowRepository
  ) {}

  async getWorkflow(workflowId: string): Promise<WorkflowDTO | null> {
    const workflow = await this.workflowRepository.findById(ID.fromString(workflowId));
    return workflow ? mapWorkflowToDTO(workflow) : null;
  }

  async updateWorkflow(params: UpdateWorkflowParams): Promise<WorkflowDTO> {
    const workflow = await this.workflowRepository.findByIdOrFail(ID.fromString(params.workflowId));
    workflow.updateName(params.name, params.userId);
    const updatedWorkflow = await this.workflowRepository.save(workflow);
    return mapWorkflowToDTO(updatedWorkflow);
  }
}
```

### 应用层示例
```typescript
// src/application/http/controllers/workflow.controller.ts
import { injectable, inject } from 'inversify';
import { Request, Response } from 'express';
import { WorkflowManagement } from '../../services/workflow/workflow-management';

@injectable()
export class WorkflowController {
  constructor(
    @inject('WorkflowManagement') private readonly workflowManagement: WorkflowManagement
  ) {}

  async getWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const workflowDTO = await this.workflowManagement.getWorkflow(req.params.id);
      if (!workflowDTO) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }
      res.json(workflowDTO);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

## 预期效果

### 架构简化
- 从4层简化为3层（Domain + Services + Infrastructure + Application）
- Services层统一提供业务和技术服务
- Application层专注于接口层职责

### 职责清晰
- Services层：业务逻辑和技术实现，返回DTO
- Infrastructure层：技术基础设施（persistence、logging等）
- Application层：HTTP/gRPC接口

### 命名简洁
- 移除`Service`后缀，使用更简洁的命名
- DTO统一放在服务层的`dtos/`目录

### 依赖清晰
- Application层 → Services层 → Domain层
- Services层 → Infrastructure层
- Infrastructure层 → Domain层

## 总结

这个新架构方案：
1. **保留基础设施层**：persistence、logging等技术基础设施
2. **合并具体实现到服务层**：业务逻辑和技术实现统一在Services层
3. **应用层作为接口层**：提供HTTP/gRPC API
4. **DTO在服务层**：统一管理DTO定义和转换
5. **简化命名**：移除`Service`后缀，使用简洁的命名

这个方案既保持了架构的清晰性，又简化了层次结构，符合项目的技术驱动本质。