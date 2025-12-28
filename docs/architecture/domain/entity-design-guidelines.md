# Domain 层实体类设计规范与改造方案

## 概述

本文档基于 Workflow 实体重构经验，总结 Domain 层实体类的设计规范和改造方案，确保代码符合 DDD 原则和框架规范。

## 核心原则

### 1. 单一职责原则 (SRP)

每个实体类应该只有一个明确的职责，避免职责过多导致代码难以维护。

**错误示例：**
```typescript
// ❌ 聚合根承担了过多职责
class Workflow {
  // 基本管理
  addNode() { }
  removeNode() { }
  
  // 复杂验证逻辑
  validate() { }
  detectCycle() { }
  
  // 图算法
  getTopologicalOrder() { }
  findPath() { }
  
  // 复杂度计算
  getComplexityMetrics() { }
}
```

**正确示例：**
```typescript
// ✅ 聚合根只负责核心业务
class Workflow {
  // 基本管理
  addNode() { }
  removeNode() { }
  hasNode() { }
}

// 验证逻辑由领域服务接口定义
interface GraphValidationService {
  validate(workflow: Workflow): ValidationResult;
  detectCycle(workflow: Workflow): boolean;
}

// 图算法由领域服务接口定义
interface GraphAlgorithmService {
  getTopologicalOrder(workflow: Workflow): NodeValueObject[];
  findPath(workflow: Workflow, start: ID, end: ID): NodeValueObject[];
}
```

### 2. 依赖倒置原则 (DIP)

Domain 层应该定义接口（契约），具体实现在 Infrastructure 层提供。

**架构层次：**
```
Domain Layer (定义接口)
    ↓
Infrastructure Layer (提供实现)
    ↓
Application Layer (使用服务)
```

**示例：**
```typescript
// Domain 层：定义接口
// src/domain/workflow/services/graph-validation-service.interface.ts
export interface GraphValidationService {
  validateGraph(workflow: Workflow): boolean;
  validateGraphDetailed(workflow: Workflow): WorkflowValidationResult;
}

// Infrastructure 层：提供实现
// src/infrastructure/workflow/services/graph-validation-service.ts
@injectable()
export class GraphValidationServiceImpl implements GraphValidationService {
  validateGraph(workflow: Workflow): boolean {
    // 具体实现
  }
}
```

### 3. 值对象不可变性

值对象应该是不可变的，创建后不能修改，通过创建新实例来表示变化。

**错误示例：**
```typescript
// ❌ 值对象包含可变方法
class WorkflowDefinition {
  updateName(name: string): void {
    this.props.name = name; // 直接修改
  }
}
```

**正确示例：**
```typescript
// ✅ 值对象返回新实例
class WorkflowDefinition {
  updateName(name: string): WorkflowDefinition {
    return new WorkflowDefinition({
      ...this.props,
      name,
      updatedAt: Timestamp.now()
    });
  }
}
```

### 4. 值对象自验证性

值对象应该在构造时验证自身有效性，失败则抛出异常。

**错误示例：**
```typescript
// ❌ 返回验证结果的方法
class WorkflowDefinition {
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!this.props.name) {
      errors.push('名称不能为空');
    }
    return { isValid: errors.length === 0, errors };
  }
}
```

**正确示例：**
```typescript
// ✅ 构造时验证，失败抛出异常
class WorkflowDefinition extends ValueObject<WorkflowDefinitionProps> {
  protected constructor(props: WorkflowDefinitionProps) {
    super(props);
    this.validate(); // 构造时验证
  }

  public validate(): void {
    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new Error('工作流名称不能为空');
    }
    if (this.props.name.length > 100) {
      throw new Error('工作流名称不能超过100个字符');
    }
  }
}
```

## 实体类设计规范

### 聚合根 (Aggregate Root)

**职责：**
- 管理聚合内部的一致性边界
- 提供聚合的公共接口
- 管理聚合内部实体的生命周期
- 维护聚合的不变性

**应该包含：**
- ✅ 基本的 CRUD 操作（增删改）
- ✅ 简单的存在性检查
- ✅ 自身状态管理（版本、时间戳）
- ✅ 属性访问器
- ✅ 简单的查询方法（如 `hasNode`, `getNode`）

**不应该包含：**
- ❌ 复杂的验证逻辑（使用领域服务）
- ❌ 图算法和遍历（使用领域服务）
- ❌ 执行状态管理（由其他聚合根负责）
- ❌ 持久化细节
- ❌ UI 相关的逻辑

**示例：**
```typescript
export class Workflow extends Entity {
  private readonly props: WorkflowProps;

  // ✅ 基本管理
  public addNode(nodeId: NodeId, type: NodeType, ...): void {
    if (this.hasNode(nodeId)) {
      throw new Error('节点已存在');
    }
    // 添加节点逻辑
  }

  public removeNode(nodeId: NodeId): void {
    if (!this.hasNode(nodeId)) {
      throw new Error('节点不存在');
    }
    // 移除节点逻辑
  }

  // ✅ 简单检查
  public hasNode(nodeId: NodeId): boolean {
    return this.props.graph.nodes.has(nodeId.toString());
  }

  // ✅ 属性访问
  public get name(): string {
    return this.props.definition.name;
  }

  // ✅ 简单查询
  public getIncomingEdges(nodeId: NodeId): EdgeValueObject[] {
    const incomingEdges: EdgeValueObject[] = [];
    for (const edge of this.props.graph.edges.values()) {
      if (edge.toNodeId.equals(nodeId)) {
        incomingEdges.push(edge);
      }
    }
    return incomingEdges;
  }

  // ❌ 不应该包含复杂逻辑
  // public validate(): WorkflowValidationResult { } // 移到领域服务
  // public detectCycle(): boolean { } // 移到领域服务
  // public getTopologicalOrder(): NodeValueObject[] { } // 移到领域服务
}
```

### 实体 (Entity)

**职责：**
- 表示具有唯一标识的业务对象
- 封装业务行为
- 维护自身状态的一致性

**设计要点：**
- 必须有唯一标识（ID）
- 通过 ID 判断相等性
- 可以包含业务行为
- 状态变化应该通过方法触发

### 值对象 (Value Object)

**职责：**
- 描述事物的特征
- 通过属性值判断相等性
- 不可变
- 自验证

**设计要点：**
- 继承 `ValueObject<T>` 基类
- 构造时验证有效性
- 返回新实例而不是修改自身
- 不包含业务逻辑（只包含数据访问和验证）

**示例：**
```typescript
export class WorkflowDefinition extends ValueObject<WorkflowDefinitionProps> {
  protected constructor(props: WorkflowDefinitionProps) {
    super(props);
    this.validate(); // 自验证
  }

  // ✅ 数据访问
  public get name(): string {
    return this.props.name;
  }

  // ✅ 返回新实例
  public updateName(name: string): WorkflowDefinition {
    return new WorkflowDefinition({
      ...this.props,
      name,
      updatedAt: Timestamp.now()
    });
  }

  // ✅ 自验证
  public validate(): void {
    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new Error('工作流名称不能为空');
    }
  }
}
```

## 领域服务设计规范

### 接口定义

**职责：**
- 定义业务契约
- 声明服务能力
- 不包含实现细节

**设计要点：**
- 放在 `src/domain/{module}/services/` 目录
- 文件名以 `.interface.ts` 结尾
- 只定义方法签名，不包含实现
- 使用领域类型作为参数和返回值

**示例：**
```typescript
// src/domain/workflow/services/graph-validation-service.interface.ts
export interface GraphValidationService {
  validateGraph(workflow: Workflow): boolean;
  validateGraphDetailed(workflow: Workflow): WorkflowValidationResult;
  validateNodes(workflow: Workflow): WorkflowValidationResult;
  validateEdges(workflow: Workflow): WorkflowValidationResult;
  validateExecutable(workflow: Workflow): WorkflowValidationResult;
}
```

### 实现类

**职责：**
- 提供接口的具体实现
- 包含技术实现细节
- 可以使用外部依赖

**设计要点：**
- 放在 `src/infrastructure/{module}/services/` 目录
- 使用 `@injectable()` 装饰器
- 实现对应的领域接口
- 可以包含复杂的算法和逻辑

**示例：**
```typescript
// src/infrastructure/workflow/services/graph-validation-service.ts
@injectable()
export class GraphValidationServiceImpl implements GraphValidationService {
  validateGraph(workflow: Workflow): boolean {
    // 具体实现
  }

  validateGraphDetailed(workflow: Workflow): WorkflowValidationResult {
    // 具体实现
  }
}
```

## 常见问题和解决方案

### 问题 1：聚合根职责过多

**症状：**
- 实体类代码过长（超过 500 行）
- 包含多种不同类型的逻辑
- 难以测试和维护

**解决方案：**
1. 识别不同的职责
2. 将复杂逻辑提取到领域服务
3. 保持聚合根只管理核心业务

**改造步骤：**
```typescript
// 1. 识别需要提取的方法
class Workflow {
  // 保留：基本管理
  addNode() { }
  removeNode() { }
  
  // 提取：验证逻辑
  validate() { } → GraphValidationService
  
  // 提取：图算法
  detectCycle() { } → GraphAlgorithmService
  getTopologicalOrder() { } → GraphAlgorithmService
}

// 2. 创建领域服务接口
interface GraphValidationService {
  validate(workflow: Workflow): ValidationResult;
}

interface GraphAlgorithmService {
  detectCycle(workflow: Workflow): boolean;
  getTopologicalOrder(workflow: Workflow): NodeValueObject[];
}

// 3. 在 Infrastructure 层实现
@injectable()
class GraphValidationServiceImpl implements GraphValidationService {
  validate(workflow: Workflow): ValidationResult {
    // 具体实现
  }
}
```

### 问题 2：值对象包含业务逻辑

**症状：**
- 值对象有返回复杂结果的方法
- 值对象包含算法逻辑
- 值对象依赖其他服务

**解决方案：**
1. 移除返回复杂结果的方法
2. 改为构造时验证，失败抛出异常
3. 将业务逻辑移到领域服务

**改造步骤：**
```typescript
// 改造前
class WorkflowDefinition {
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!this.props.name) {
      errors.push('名称不能为空');
    }
    return { isValid: errors.length === 0, errors };
  }
}

// 改造后
class WorkflowDefinition extends ValueObject<WorkflowDefinitionProps> {
  protected constructor(props: WorkflowDefinitionProps) {
    super(props);
    this.validate(); // 构造时验证
  }

  public validate(): void {
    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new Error('工作流名称不能为空');
    }
  }
}
```

### 问题 3：违反分层原则

**症状：**
- Domain 层包含具体实现
- Infrastructure 层依赖 Application 层
- 循环依赖

**解决方案：**
1. Domain 层只定义接口
2. Infrastructure 层提供实现
3. Application 层使用服务

**架构层次：**
```
Domain Layer (src/domain/)
  ├── entities/          # 实体类
  ├── value-objects/     # 值对象
  ├── services/          # 服务接口
  └── repositories/      # 仓储接口

Infrastructure Layer (src/infrastructure/)
  ├── workflow/
  │   └── services/      # 服务实现
  └── persistence/       # 仓储实现

Application Layer (src/application/)
  └── services/          # 应用服务
```

## 改造步骤

### 步骤 1：分析现有代码

1. 识别实体类的职责
2. 找出违反 DDD 原则的地方
3. 列出需要提取的逻辑

### 步骤 2：设计领域服务接口

1. 在 Domain 层创建服务接口
2. 定义清晰的方法签名
3. 使用领域类型

### 步骤 3：实现领域服务

1. 在 Infrastructure 层创建实现类
2. 实现接口定义的方法
3. 添加必要的依赖注入

### 步骤 4：简化聚合根

1. 移除已提取的方法
2. 保留核心业务逻辑
3. 更新方法调用

### 步骤 5：修正值对象

1. 移除返回复杂结果的方法
2. 改为构造时验证
3. 确保不可变性

### 步骤 6：更新依赖

1. 更新所有调用方
2. 确保类型检查通过
3. 运行测试验证

## 最佳实践

### 1. 保持聚合根简洁

- 聚合根代码不超过 300 行
- 只包含核心业务逻辑
- 复杂逻辑委托给领域服务

### 2. 使用不可变值对象

- 值对象创建后不能修改
- 通过创建新实例表示变化
- 构造时验证有效性

### 3. 遵循分层架构

- Domain 层定义接口
- Infrastructure 层提供实现
- Application 层使用服务

### 4. 使用依赖注入

- 通过接口注入依赖
- 避免直接依赖具体实现
- 提高可测试性

### 5. 编写清晰的注释

- 说明类的职责
- 解释复杂逻辑
- 标注不负责的内容

## 检查清单

### 实体类检查

- [ ] 聚合根职责单一
- [ ] 不包含复杂验证逻辑
- [ ] 不包含图算法
- [ ] 不包含持久化细节
- [ ] 有清晰的注释说明职责

### 值对象检查

- [ ] 继承 ValueObject 基类
- [ ] 构造时验证有效性
- [ ] 返回新实例而不是修改自身
- [ ] 不包含业务逻辑
- [ ] 不可变

### 领域服务检查

- [ ] 接口在 Domain 层
- [ ] 实现在 Infrastructure 层
- [ ] 使用领域类型
- [ ] 方法签名清晰
- [ ] 不包含技术细节

## 参考资料

- [AGENTS.md](../../AGENTS.md) - 框架开发规范
- [DDD 原则](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [值对象模式](https://martinfowler.com/bliki/ValueObject.html)
- [聚合模式](https://martinfowler.com/bliki/Aggregate.html)

## 总结

遵循本规范可以确保 Domain 层代码：

1. **符合 DDD 原则** - 单一职责、依赖倒置、开闭原则
2. **易于维护** - 职责清晰，代码简洁
3. **易于测试** - 依赖接口，可模拟依赖
4. **符合框架规范** - 遵循分层架构
5. **可扩展性强** - 通过接口扩展，不影响现有代码

通过持续的代码审查和重构，可以保持代码质量和架构健康。