# Workflow 实体设计分析：聚合根 vs 独立实体

## 问题提出

当前项目的节点、边等组件是否应该采用类似 workflow-example 的"实体+函数"定义方式，而非像当前这样仅在 workflow 聚合根中定义数据结构？

## 两种设计对比

### 当前项目设计：聚合根内嵌数据结构

```typescript
// src/domain/workflow/entities/workflow.ts

/**
 * 节点数据接口
 */
export interface NodeData {
  readonly id: NodeId;
  readonly type: NodeType;
  readonly name?: string;
  readonly description?: string;
  readonly position?: { x: number; y: number };
  readonly properties: Record<string, unknown>;
}

/**
 * 边数据接口
 */
export interface EdgeData {
  readonly id: EdgeId;
  readonly type: EdgeType;
  readonly fromNodeId: NodeId;
  readonly toNodeId: NodeId;
  readonly condition?: string;
  readonly weight?: number;
  readonly properties: Record<string, unknown>;
}

/**
 * Workflow 聚合根
 */
export class Workflow extends Entity {
  private readonly props: WorkflowProps;

  // 节点和边作为聚合根的一部分
  public getNodes(): Map<string, NodeData> {
    return new Map(this.props.graph.nodes);
  }

  public getEdges(): Map<string, EdgeData> {
    return new Map(this.props.graph.edges);
  }

  // 节点和边的操作方法
  public addNode(nodeId: NodeId, type: NodeType, ...): void { /* ... */ }
  public removeNode(nodeId: NodeId): void { /* ... */ }
  public addEdge(edgeId: EdgeId, ...): void { /* ... */ }
  public removeEdge(edgeId: EdgeId): void { /* ... */ }
}
```

**特点**：
- 节点和边是纯数据结构（接口）
- 所有操作通过 `Workflow` 聚合根进行
- 行为逻辑在基础设施层的执行器和评估器中

### workflow-example 设计：独立实体类

```typescript
// src/workflow-example/entities/node.ts

/**
 * 节点实体类
 */
export class NodeImpl {
  private _id: NodeId;
  private _type: NodeType;
  private _name: string;
  private _description: string | undefined;
  private _config: NodeConfig;
  private _status: NodeStatus;

  constructor(id: string, type: NodeType, name: string, ...) {
    this._id = createNodeId(id);
    this._type = type;
    this._name = name;
    // ...
  }

  // 节点自己的方法
  get id(): NodeId { return this._id; }
  get type(): NodeType { return this._type; }
  updateStatus(status: NodeStatus): void { /* ... */ }
  getInputSchema(): Record<string, any> { /* ... */ }
  getOutputSchema(): Record<string, any> { /* ... */ }
}

// src/workflow-example/entities/edge.ts

/**
 * 边实体类
 */
export class EdgeImpl {
  private _id: EdgeId;
  private _type: EdgeType;
  private _fromNodeId: string;
  private _toNodeId: string;
  private _config: EdgeConfig;
  private _weight: number;
  private _condition?: EdgeCondition;

  constructor(id: string, type: EdgeType, fromNodeId: string, ...) {
    this._id = createEdgeId(id);
    this._type = type;
    this._fromNodeId = fromNodeId;
    // ...
  }

  // 边自己的方法
  get id(): EdgeId { return this._id; }
  get type(): EdgeType { return this._type; }
  async evaluateCondition(context: ExecutionContext): Promise<boolean> { /* ... */ }
  getConditionExpression(): string | undefined { /* ... */ }
}
```

**特点**：
- 节点和边是独立的实体类
- 每个实体有自己的方法和状态
- 行为逻辑通过函数注册表关联

## DDD 视角分析

### DDD 实体判断标准

根据 DDD 原则，判断是否需要独立实体需要考虑：

1. **身份标识**：是否有独立的、持久的身份标识？
2. **生命周期**：是否有独立的生命周期？
3. **业务行为**：是否有独立的业务行为？
4. **持久化需求**：是否需要独立持久化？
5. **一致性边界**：是否需要独立的一致性边界？

### 节点和边的 DDD 分析

| 判断标准 | 节点 (Node) | 边 (Edge) | 结论 |
|---------|-------------|-----------|------|
| **身份标识** | 有 (NodeId) | 有 (EdgeId) | ✅ 符合 |
| **生命周期** | 由 Workflow 管理 | 由 Workflow 管理 | ❌ 不符合 |
| **业务行为** | 有（条件评估、Schema） | 有（条件评估） | ✅ 符合 |
| **独立持久化** | 不需要，作为 Workflow 的一部分 | 不需要，作为 Workflow 的一部分 | ❌ 不符合 |
| **一致性边界** | 与 Workflow 共享一致性边界 | 与 Workflow 共享一致性边界 | ❌ 不符合 |

**分析结论**：
- 节点和边有身份标识和业务行为，符合实体的部分特征
- 但它们的生命周期、持久化和一致性边界都由 Workflow 管理
- 因此，它们更适合作为聚合根的一部分，而非独立实体

## 两种设计的优缺点

### 当前设计（聚合根内嵌）的优点

1. **符合 DDD 聚合根原则**
   - Workflow 是唯一的聚合根
   - 节点和边作为聚合根的一部分，共享一致性边界
   - 避免了跨聚合根的引用和一致性维护

2. **简化持久化**
   - 只需要持久化 Workflow 聚合根
   - 节点和边作为 Workflow 的一部分自动持久化
   - 避免了复杂的事务管理

3. **简化领域模型**
   - 减少了实体数量
   - 降低了领域模型的复杂度
   - 更容易理解和维护

4. **符合业务语义**
   - 节点和边是工作流图的组成部分
   - 它们不能独立于工作流存在
   - 操作节点和边必须通过工作流

### 当前设计（聚合根内嵌）的缺点

1. **缺少封装**
   - 节点和边是纯数据结构，没有自己的方法
   - 业务逻辑分散在多个地方
   - 违反了封装原则

2. **缺少类型安全**
   - 使用接口而非类，类型检查较弱
   - 容易出现数据不一致

3. **缺少行为**
   - 节点和边没有自己的行为方法
   - 所有操作都需要通过 Workflow 聚合根
   - 代码可读性较差

### workflow-example 设计（独立实体）的优点

1. **更好的封装**
   - 节点和边有自己的方法和状态
   - 业务逻辑封装在实体内部
   - 符合面向对象原则

2. **更好的类型安全**
   - 使用类而非接口，类型检查更强
   - 编译时就能发现错误

3. **更好的可读性**
   - 节点和边有自己的方法
   - 代码更直观易懂

4. **函数式编程风格**
   - 实体与行为分离
   - 行为通过函数注册表关联
   - 易于测试和扩展

### workflow-example 设计（独立实体）的缺点

1. **违反 DDD 聚合根原则**
   - 节点和边作为独立实体，但生命周期由 Workflow 管理
   - 可能导致跨聚合根的引用
   - 一致性边界不清晰

2. **复杂化持久化**
   - 需要考虑节点和边的独立持久化
   - 事务管理更复杂
   - 可能出现数据不一致

3. **过度设计**
   - 对于简单场景可能过于复杂
   - 增加了学习成本

## 推荐方案：混合设计

结合两种设计的优点，推荐采用混合设计：

### 1. 保持聚合根结构

节点和边作为 Workflow 聚合根的一部分，保持一致性边界。

### 2. 引入值对象封装

将节点和边封装为值对象，提供更好的类型安全和封装。

```typescript
// src/domain/workflow/value-objects/node-value-object.ts

import { ValueObject } from '../../common/value-objects/value-object';
import { NodeId } from './node-id';
import { NodeType } from './node-type';

/**
 * 节点值对象属性接口
 */
export interface NodeValueObjectProps {
  readonly id: NodeId;
  readonly type: NodeType;
  readonly name?: string;
  readonly description?: string;
  readonly position?: { x: number; y: number };
  readonly properties: Record<string, unknown>;
}

/**
 * 节点值对象
 * 封装节点数据，提供类型安全和验证
 */
export class NodeValueObject extends ValueObject<NodeValueObjectProps> {
  /**
   * 创建节点值对象
   */
  public static create(props: NodeValueObjectProps): NodeValueObject {
    // 验证
    if (!props.id) {
      throw new Error('节点ID不能为空');
    }
    if (!props.type) {
      throw new Error('节点类型不能为空');
    }

    return new NodeValueObject(props);
  }

  /**
   * 获取输入Schema
   */
  public getInputSchema(): Record<string, any> {
    switch (this.props.type.getValue()) {
      case 'llm':
        return {
          type: 'object',
          properties: {
            text: { type: 'string', description: '输入文本' },
            prompt: { type: 'string', description: '提示词模板' }
          },
          required: ['text']
        };
      // ... 其他类型
      default:
        return { type: 'object', properties: {}, required: [] };
    }
  }

  /**
   * 获取输出Schema
   */
  public getOutputSchema(): Record<string, any> {
    switch (this.props.type.getValue()) {
      case 'llm':
        return {
          type: 'object',
          properties: {
            response: { type: 'string', description: 'LLM响应' },
            model: { type: 'string', description: '使用的模型' }
          }
        };
      // ... 其他类型
      default:
        return { type: 'object', properties: {}, required: [] };
    }
  }

  /**
   * 检查是否为控制流节点
   */
  public isControlFlow(): boolean {
    return this.props.type.isControlFlow();
  }

  /**
   * 检查是否为执行节点
   */
  public isExecutable(): boolean {
    return this.props.type.isExecutable();
  }
}
```

```typescript
// src/domain/workflow/value-objects/edge-value-object.ts

import { ValueObject } from '../../common/value-objects/value-object';
import { EdgeId } from './edge-id';
import { EdgeType } from './edge-type';
import { NodeId } from './node-id';

/**
 * 边值对象属性接口
 */
export interface EdgeValueObjectProps {
  readonly id: EdgeId;
  readonly type: EdgeType;
  readonly fromNodeId: NodeId;
  readonly toNodeId: NodeId;
  readonly condition?: string;
  readonly weight?: number;
  readonly properties: Record<string, unknown>;
}

/**
 * 边值对象
 * 封装边数据，提供类型安全和验证
 */
export class EdgeValueObject extends ValueObject<EdgeValueObjectProps> {
  /**
   * 创建边值对象
   */
  public static create(props: EdgeValueObjectProps): EdgeValueObject {
    // 验证
    if (!props.id) {
      throw new Error('边ID不能为空');
    }
    if (!props.type) {
      throw new Error('边类型不能为空');
    }
    if (!props.fromNodeId) {
      throw new Error('源节点ID不能为空');
    }
    if (!props.toNodeId) {
      throw new Error('目标节点ID不能为空');
    }

    return new EdgeValueObject(props);
  }

  /**
   * 获取条件表达式
   */
  public getConditionExpression(): string | undefined {
    return this.props.condition;
  }

  /**
   * 检查是否需要条件评估
   */
  public requiresConditionEvaluation(): boolean {
    return this.props.type.requiresConditionEvaluation();
  }

  /**
   * 检查是否为异常处理边
   */
  public isExceptionHandling(): boolean {
    return this.props.type.isExceptionHandling();
  }
}
```

### 3. 更新 Workflow 聚合根

```typescript
// src/domain/workflow/entities/workflow.ts

import { NodeValueObject } from '../value-objects/node-value-object';
import { EdgeValueObject } from '../value-objects/edge-value-object';

/**
 * Workflow 聚合根
 */
export class Workflow extends Entity {
  private readonly props: WorkflowProps;

  /**
   * 获取所有节点
   */
  public getNodes(): Map<string, NodeValueObject> {
    return new Map(this.props.graph.nodes);
  }

  /**
   * 获取所有边
   */
  public getEdges(): Map<string, EdgeValueObject> {
    return new Map(this.props.graph.edges);
  }

  /**
   * 添加节点
   */
  public addNode(
    nodeId: NodeId,
    type: NodeType,
    name?: string,
    description?: string,
    position?: { x: number; y: number },
    properties?: Record<string, unknown>,
    updatedBy?: ID
  ): void {
    if (this.hasNode(nodeId)) {
      throw new Error('节点已存在');
    }

    if (!this.status.canEdit()) {
      throw new Error('只能编辑草稿状态工作流的节点');
    }

    // 创建节点值对象
    const node = NodeValueObject.create({
      id: nodeId,
      type,
      name,
      description,
      position,
      properties: properties || {}
    });

    const newNodes = new Map(this.props.graph.nodes);
    newNodes.set(nodeId.toString(), node);

    const newGraph = {
      ...this.props.graph,
      nodes: newNodes
    };

    (this.props as any).graph = newGraph;
    this.update(updatedBy);
  }

  /**
   * 添加边
   */
  public addEdge(
    edgeId: EdgeId,
    type: EdgeType,
    fromNodeId: NodeId,
    toNodeId: NodeId,
    condition?: string,
    weight?: number,
    properties?: Record<string, unknown>,
    updatedBy?: ID
  ): void {
    if (this.hasEdge(edgeId)) {
      throw new Error('边已存在');
    }

    if (!this.status.canEdit()) {
      throw new Error('只能编辑草稿状态工作流的边');
    }

    // 检查源节点和目标节点是否存在
    if (!this.hasNode(fromNodeId)) {
      throw new Error('源节点不存在');
    }

    if (!this.hasNode(toNodeId)) {
      throw new Error('目标节点不存在');
    }

    // 创建边值对象
    const edge = EdgeValueObject.create({
      id: edgeId,
      type,
      fromNodeId,
      toNodeId,
      condition,
      weight,
      properties: properties || {}
    });

    const newEdges = new Map(this.props.graph.edges);
    newEdges.set(edgeId.toString(), edge);

    const newGraph = {
      ...this.props.graph,
      edges: newEdges
    };

    (this.props as any).graph = newGraph;
    this.update(updatedBy);
  }
}
```

### 4. 行为逻辑通过函数注册表关联

```typescript
// src/infrastructure/workflow/functions/registry/simplified-function-registry.ts

import { NodeValueObject } from '../../../../domain/workflow/value-objects/node-value-object';
import { EdgeValueObject } from '../../../../domain/workflow/value-objects/edge-value-object';

/**
 * 简化的函数注册表
 */
export class SimplifiedFunctionRegistry {
  private nodeFunctions: Map<string, NodeExecutorFunction> = new Map();
  private edgeFunctions: Map<string, EdgeEvaluatorFunction> = new Map();

  /**
   * 执行节点
   */
  async executeNode(
    node: NodeValueObject,
    input: NodeInput,
    context: IExecutionContext
  ): Promise<NodeOutput> {
    const func = this.getNodeFunction(node.type.toString());
    if (!func) {
      throw new Error(`未找到节点类型 ${node.type.toString()} 的执行函数`);
    }
    return await func(input, node.properties, context);
  }

  /**
   * 评估边
   */
  async evaluateEdge(
    edge: EdgeValueObject,
    context: IExecutionContext
  ): Promise<EdgeOutput> {
    const func = this.getEdgeFunction(edge.type.toString());
    if (!func) {
      throw new Error(`未找到边类型 ${edge.type.toString()} 的评估函数`);
    }

    const input: EdgeInput = {
      fromNodeId: edge.fromNodeId.toString(),
      toNodeId: edge.toNodeId.toString()
    };

    const config: EdgeConfig = {
      expression: edge.getConditionExpression(),
      weight: edge.weight,
      ...edge.properties
    };

    return await func(input, config, context);
  }
}
```

## 总结

### 推荐采用混合设计的原因

1. **符合 DDD 原则**
   - 保持 Workflow 作为唯一的聚合根
   - 节点和边作为值对象，共享一致性边界
   - 避免了跨聚合根的引用

2. **提供更好的封装**
   - 节点和边作为值对象，有自己的方法
   - 业务逻辑封装在值对象内部
   - 提供类型安全和验证

3. **简化持久化**
   - 只需要持久化 Workflow 聚合根
   - 节点和边作为值对象自动持久化

4. **支持函数式编程**
   - 行为逻辑通过函数注册表关联
   - 易于测试和扩展
   - 参考 workflow-example 的设计

5. **平衡复杂度**
   - 比纯数据结构更完善
   - 比独立实体更简单
   - 适合企业级应用

### 实施建议

1. **第一阶段**：创建 `NodeValueObject` 和 `EdgeValueObject`
2. **第二阶段**：更新 `Workflow` 聚合根使用值对象
3. **第三阶段**：更新基础设施层使用值对象
4. **第四阶段**：添加单元测试
5. **第五阶段**：更新文档

这种混合设计既保持了 DDD 的聚合根原则，又提供了更好的封装和类型安全，同时支持函数式编程风格，是当前项目的最佳选择。