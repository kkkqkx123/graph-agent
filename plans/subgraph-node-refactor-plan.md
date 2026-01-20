# Subgraph Node 重构方案

## 一、核心原则

1. **仅保留合并模式**：移除执行模式，所有子工作流在加载时合并
2. **区分子工作流类型**：base子工作流不需要start/end节点，features工作流需要start/end节点
3. **领域驱动设计**：在domain层定义子工作流相关的值对象
4. **验证逻辑重构**：用domain层的值对象验证替代现有的SubWorkflowValidator

## 二、修改方案

### 2.1 Domain层：添加子工作流相关值对象

#### 2.1.1 创建子工作流类型值对象

**文件**：`src/domain/workflow/value-objects/subworkflow-type.ts`

```typescript
import { ValueObject } from '../../../common/value-objects';

/**
 * 子工作流类型枚举
 */
export enum SubWorkflowTypeValue {
  /** 基础子工作流：不需要start/end节点，通过入度/出度确定入口/出口 */
  BASE = 'base',
  /** 功能子工作流：需要start/end节点，完整的子工作流 */
  FEATURE = 'feature',
}

/**
 * 子工作流类型值对象
 */
export class SubWorkflowType extends ValueObject<{ value: SubWorkflowTypeValue }> {
  private constructor(props: { value: SubWorkflowTypeValue }) {
    super(props);
  }

  public static base(): SubWorkflowType {
    return new SubWorkflowType({ value: SubWorkflowTypeValue.BASE });
  }

  public static feature(): SubWorkflowType {
    return new SubWorkflowType({ value: SubWorkflowTypeValue.FEATURE });
  }

  public static fromString(type: string): SubWorkflowType {
    if (type === SubWorkflowTypeValue.BASE) {
      return SubWorkflowType.base();
    }
    if (type === SubWorkflowTypeValue.FEATURE) {
      return SubWorkflowType.feature();
    }
    throw new Error(`无效的子工作流类型: ${type}`);
  }

  public getValue(): SubWorkflowTypeValue {
    return this.props.value;
  }

  public isBase(): boolean {
    return this.props.value === SubWorkflowTypeValue.BASE;
  }

  public isFeature(): boolean {
    return this.props.value === SubWorkflowTypeValue.FEATURE;
  }

  public override toString(): string {
    return this.props.value;
  }
}
```

#### 2.1.2 创建子工作流标准值对象

**文件**：`src/domain/workflow/value-objects/subworkflow-standard.ts`

```typescript
import { ValueObject } from '../../../common/value-objects';
import { SubWorkflowType } from './subworkflow-type';

/**
 * 子工作流标准接口
 */
export interface SubWorkflowStandardProps {
  /** 子工作流类型 */
  type: SubWorkflowType;
  /** 最大入度 */
  maxInDegree: number;
  /** 最小入度 */
  minInDegree: number;
  /** 最大出度 */
  maxOutDegree: number;
  /** 最小出度 */
  minOutDegree: number;
  /** 是否需要start节点 */
  requiresStartNode: boolean;
  /** 是否需要end节点 */
  requiresEndNode: boolean;
}

/**
 * 子工作流标准值对象
 *
 * 定义子工作流必须符合的标准
 */
export class SubWorkflowStandard extends ValueObject<SubWorkflowStandardProps> {
  private constructor(props: SubWorkflowStandardProps) {
    super(props);
  }

  /**
   * 创建基础子工作流标准
   * - 不需要start/end节点
   * - 入度0，出度1（起始子工作流）
   * - 入度1，出度1（中间子工作流）
   * - 入度1，出度0（结束子工作流）
   */
  public static base(
    maxInDegree: number,
    minInDegree: number,
    maxOutDegree: number,
    minOutDegree: number
  ): SubWorkflowStandard {
    return new SubWorkflowStandard({
      type: SubWorkflowType.base(),
      maxInDegree,
      minInDegree,
      maxOutDegree,
      minOutDegree,
      requiresStartNode: false,
      requiresEndNode: false,
    });
  }

  /**
   * 创建功能子工作流标准
   * - 需要start/end节点
   * - 入度0，出度1（起始子工作流）
   * - 入度1，出度1（中间子工作流）
   * - 入度1，出度0（结束子工作流）
   */
  public static feature(
    maxInDegree: number,
    minInDegree: number,
    maxOutDegree: number,
    minOutDegree: number
  ): SubWorkflowStandard {
    return new SubWorkflowStandard({
      type: SubWorkflowType.feature(),
      maxInDegree,
      minInDegree,
      maxOutDegree,
      minOutDegree,
      requiresStartNode: true,
      requiresEndNode: true,
    });
  }

  /**
   * 验证工作流是否符合标准
   * @param entryInDegree 入口节点入度
   * @param entryOutDegree 入口节点出度
   * @param exitInDegree 出口节点入度
   * @param exitOutDegree 出口节点出度
   * @param hasStartNode 是否有start节点
   * @param hasEndNode 是否有end节点
   * @returns 验证结果
   */
  public validate(
    entryInDegree: number,
    entryOutDegree: number,
    exitInDegree: number,
    exitOutDegree: number,
    hasStartNode: boolean,
    hasEndNode: boolean
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证入度
    if (entryInDegree < this.props.minInDegree || entryInDegree > this.props.maxInDegree) {
      errors.push(
        `入口节点入度不符合标准：期望[${this.props.minInDegree}, ${this.props.maxInDegree}]，实际${entryInDegree}`
      );
    }

    // 验证出度
    if (exitOutDegree < this.props.minOutDegree || exitOutDegree > this.props.maxOutDegree) {
      errors.push(
        `出口节点出度不符合标准：期望[${this.props.minOutDegree}, ${this.props.maxOutDegree}]，实际${exitOutDegree}`
      );
    }

    // 验证start节点
    if (this.props.requiresStartNode && !hasStartNode) {
      errors.push('子工作流缺少start节点');
    }

    // 验证end节点
    if (this.props.requiresEndNode && !hasEndNode) {
      errors.push('子工作流缺少end节点');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  public getType(): SubWorkflowType {
    return this.props.type;
  }

  public override toString(): string {
    return `SubWorkflowStandard(type=${this.props.type.toString()}, inDegree=[${this.props.minInDegree},${this.props.maxInDegree}], outDegree=[${this.props.minOutDegree},${this.props.maxOutDegree}])`;
  }
}
```

#### 2.1.3 更新Workflow实体

**文件**：`src/domain/workflow/entities/workflow.ts`

```typescript
// 在WorkflowProps接口中添加
export interface WorkflowProps {
  // ... 现有属性
  /** 子工作流类型（仅对子工作流有效） */
  subWorkflowType?: SubWorkflowType;
}

// 在Workflow类中添加方法
export class Workflow extends Entity {
  // ... 现有代码

  /**
   * 获取子工作流类型
   * @returns 子工作流类型，如果不是子工作流则返回undefined
   */
  public getSubWorkflowType(): SubWorkflowType | undefined {
    return this.props.subWorkflowType;
  }

  /**
   * 检查是否为基础子工作流
   * @returns 是否为基础子工作流
   */
  public isBaseSubWorkflow(): boolean {
    return this.props.subWorkflowType?.isBase() ?? false;
  }

  /**
   * 检查是否为功能子工作流
   * @returns 是否为功能子工作流
   */
  public isFeatureSubWorkflow(): boolean {
    return this.props.subWorkflowType?.isFeature() ?? false;
  }
}
```

### 2.2 Services层：重构验证逻辑

#### 2.2.1 创建新的子工作流验证服务

**文件**：`src/services/workflow/subworkflow-validation-service.ts`

```typescript
import { injectable, inject } from 'inversify';
import { Workflow, Node, NodeType } from '../../domain/workflow';
import { ILogger } from '../../domain/common';
import { SubWorkflowStandard, SubWorkflowType } from '../../domain/workflow/value-objects/subworkflow-standard';

/**
 * 子工作流验证结果
 */
export interface SubWorkflowValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误列表 */
  errors: string[];
  /** 警告列表 */
  warnings: string[];
  /** 子工作流标准 */
  standard?: SubWorkflowStandard;
  /** 入口节点信息 */
  entryNode?: {
    nodeId: string;
    nodeType: string;
    inDegree: number;
    outDegree: number;
  };
  /** 出口节点信息 */
  exitNode?: {
    nodeId: string;
    nodeType: string;
    inDegree: number;
    outDegree: number;
  };
}

/**
 * 子工作流验证服务
 *
 * 使用domain层的SubWorkflowStandard值对象进行验证
 */
@injectable()
export class SubWorkflowValidationService {
  constructor(@inject('Logger') private readonly logger: ILogger) {}

  /**
   * 验证子工作流
   * @param workflow 工作流实例
   * @returns 验证结果
   */
  async validate(workflow: Workflow): Promise<SubWorkflowValidationResult> {
    this.logger.info('开始验证子工作流', {
      workflowId: workflow.workflowId.toString(),
      workflowName: workflow.name,
    });

    const result: SubWorkflowValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // 1. 确定子工作流类型
    const subWorkflowType = workflow.getSubWorkflowType();
    if (!subWorkflowType) {
      result.errors.push('工作流未指定子工作流类型');
      result.isValid = false;
      return result;
    }

    // 2. 计算节点度数
    const nodeDegrees = this.calculateNodeDegrees(workflow);

    // 3. 查找入口和出口节点
    const entryNodes = this.findEntryNodes(workflow, nodeDegrees);
    const exitNodes = this.findExitNodes(workflow, nodeDegrees);

    if (entryNodes.length === 0) {
      result.errors.push('工作流没有入口节点（入度为0的节点）');
      result.isValid = false;
      return result;
    }

    if (exitNodes.length === 0) {
      result.errors.push('工作流没有出口节点（出度为0的节点）');
      result.isValid = false;
      return result;
    }

    if (entryNodes.length > 1) {
      result.warnings.push(`找到${entryNodes.length}个入口节点，建议使用单一入口节点`);
    }

    if (exitNodes.length > 1) {
      result.warnings.push(`找到${exitNodes.length}个出口节点，建议使用单一出口节点`);
    }

    const entryNode = entryNodes[0];
    const exitNode = exitNodes[exitNodes.length - 1];

    result.entryNode = {
      nodeId: entryNode.nodeId,
      nodeType: entryNode.nodeType,
      inDegree: entryNode.inDegree,
      outDegree: entryNode.outDegree,
    };

    result.exitNode = {
      nodeId: exitNode.nodeId,
      nodeType: exitNode.nodeType,
      inDegree: exitNode.inDegree,
      outDegree: exitNode.outDegree,
    };

    // 4. 检查是否有start/end节点
    const hasStartNode = this.hasNodeType(workflow, NodeTypeValue.START);
    const hasEndNode = this.hasNodeType(workflow, NodeTypeValue.END);

    // 5. 创建子工作流标准
    const standard = this.createStandard(
      subWorkflowType,
      entryNode.inDegree,
      entryNode.outDegree,
      exitNode.inDegree,
      exitNode.outDegree
    );

    result.standard = standard;

    // 6. 验证是否符合标准
    const validationResult = standard.validate(
      entryNode.inDegree,
      entryNode.outDegree,
      exitNode.inDegree,
      exitNode.outDegree,
      hasStartNode,
      hasEndNode
    );

    if (!validationResult.valid) {
      result.errors.push(...validationResult.errors);
      result.isValid = false;
    }

    // 7. 验证状态标准
    this.validateStateStandards(workflow, result);

    this.logger.info('子工作流验证完成', {
      workflowId: workflow.workflowId.toString(),
      isValid: result.isValid,
      subWorkflowType: subWorkflowType.toString(),
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
    });

    return result;
  }

  /**
   * 计算所有节点的入度和出度
   */
  private calculateNodeDegrees(workflow: Workflow): Map<string, { inDegree: number; outDegree: number; nodeType: string }> {
    const graph = workflow.getGraph();
    const nodes = Array.from(graph.nodes.values());
    const nodeDegrees = new Map<string, { inDegree: number; outDegree: number; nodeType: string }>();

    // 初始化所有节点的度数
    nodes.forEach((node) => {
      nodeDegrees.set(node.nodeId.toString(), {
        inDegree: 0,
        outDegree: 0,
        nodeType: node.type.toString(),
      });
    });

    // 计算入度和出度
    graph.edges.forEach((edge) => {
      const targetId = edge.toNodeId.toString();
      const sourceId = edge.fromNodeId.toString();

      const targetDegrees = nodeDegrees.get(targetId);
      if (targetDegrees) {
        targetDegrees.inDegree++;
      }

      const sourceDegrees = nodeDegrees.get(sourceId);
      if (sourceDegrees) {
        sourceDegrees.outDegree++;
      }
    });

    return nodeDegrees;
  }

  /**
   * 查找入口节点（入度为0的节点）
   */
  private findEntryNodes(
    workflow: Workflow,
    nodeDegrees: Map<string, { inDegree: number; outDegree: number; nodeType: string }>
  ): Array<{ nodeId: string; nodeType: string; inDegree: number; outDegree: number }> {
    const graph = workflow.getGraph();
    const nodes = Array.from(graph.nodes.values());

    return nodes
      .map((node) => nodeDegrees.get(node.nodeId.toString())!)
      .filter((nodeInfo) => nodeInfo.inDegree === 0);
  }

  /**
   * 查找出口节点（出度为0的节点）
   */
  private findExitNodes(
    workflow: Workflow,
    nodeDegrees: Map<string, { inDegree: number; outDegree: number; nodeType: string }>
  ): Array<{ nodeId: string; nodeType: string; inDegree: number; outDegree: number }> {
    const graph = workflow.getGraph();
    const nodes = Array.from(graph.nodes.values());

    return nodes
      .map((node) => nodeDegrees.get(node.nodeId.toString())!)
      .filter((nodeInfo) => nodeInfo.outDegree === 0);
  }

  /**
   * 检查是否有指定类型的节点
   */
  private hasNodeType(workflow: Workflow, nodeType: string): boolean {
    const graph = workflow.getGraph();
    const nodes = Array.from(graph.nodes.values());
    return nodes.some((node) => node.type.toString() === nodeType);
  }

  /**
   * 创建子工作流标准
   */
  private createStandard(
    type: SubWorkflowType,
    entryInDegree: number,
    entryOutDegree: number,
    exitInDegree: number,
    exitOutDegree: number
  ): SubWorkflowStandard {
    if (type.isBase()) {
      // 基础子工作流：根据入度/出度确定标准
      if (entryInDegree === 0 && exitOutDegree === 1) {
        // 起始子工作流
        return SubWorkflowStandard.base(0, 0, 1, 1);
      } else if (entryInDegree === 1 && exitOutDegree === 0) {
        // 结束子工作流
        return SubWorkflowStandard.base(1, 1, 0, 0);
      } else {
        // 中间子工作流
        return SubWorkflowStandard.base(1, 1, 1, 1);
      }
    } else {
      // 功能子工作流：根据入度/出度确定标准
      if (entryInDegree === 0 && exitOutDegree === 1) {
        // 起始子工作流
        return SubWorkflowStandard.feature(0, 0, 1, 1);
      } else if (entryInDegree === 1 && exitOutDegree === 0) {
        // 结束子工作流
        return SubWorkflowStandard.feature(1, 1, 0, 0);
      } else {
        // 中间子工作流
        return SubWorkflowStandard.feature(1, 1, 1, 1);
      }
    }
  }

  /**
   * 验证状态标准
   */
  private validateStateStandards(workflow: Workflow, result: SubWorkflowValidationResult): void {
    const graph = workflow.getGraph();
    const nodes = Array.from(graph.nodes.values());

    // 检查是否有状态相关的节点类型
    const statefulNodeTypes = ['state', 'checkpoint', 'memory'];
    const statefulNodes = nodes.filter((node) => statefulNodeTypes.includes(node.type.toString()));

    if (statefulNodes.length > 0) {
      result.errors.push(
        `子工作流包含状态节点（${statefulNodes.map((n) => n.nodeId.toString()).join(', ')}），不符合无状态标准`
      );
      result.isValid = false;
    }
  }
}
```

### 2.3 移除执行模式

#### 2.3.1 删除ThreadExecution中的executeSubWorkflow方法

**文件**：`src/services/threads/thread-execution.ts`

```typescript
// 删除以下方法：
// - executeSubWorkflow()
// - createSubWorkflowThread()
// - executeWorkflowInThread()
// - mapInputVariables()
// - mapOutputVariables()
// - applyTransform()
// - extractValue()
// - updateParentContext()
```

#### 2.3.2 简化NodeExecutor

**文件**：`src/services/workflow/nodes/node-executor.ts`

```typescript
// 删除executeSubgraphNode方法
// 删除handleSubgraphExecutionError方法
// 简化execute方法，移除对subworkflow的特殊处理

async execute(
  node: Node,
  context: WorkflowContext,
  options: NodeExecutionOptions = {}
): Promise<NodeExecutionResult> {
  // ... 验证逻辑

  // 所有节点统一执行，不再区分subworkflow
  const result = await this.executeWithRetryAndTimeout(
    () => node.execute(context),
    timeout,
    maxRetries,
    retryDelay,
    node.nodeId.toString(),
    node.type.toString()
  );

  return result;
}
```

#### 2.3.3 删除SubgraphNode配置类

**文件**：删除 `src/services/workflow/nodes/subgraph/subgraph-node.ts`

**理由**：Subgraph节点在合并后会被展开，不需要单独的配置类

### 2.4 更新WorkflowMerger

#### 2.4.1 使用新的验证服务

**文件**：`src/services/workflow/workflow-merger.ts`

```typescript
import { SubWorkflowValidationService } from './subworkflow-validation-service';

export class WorkflowMerger {
  constructor(
    @inject('WorkflowRepository') private readonly workflowRepository: IWorkflowRepository,
    @inject('SubWorkflowValidationService') private readonly subWorkflowValidator: SubWorkflowValidationService,
    @inject('WorkflowStructureValidator') private readonly structureValidator: WorkflowStructureValidator,
    @inject('Logger') private readonly logger: ILogger
  ) {}

  private async recursiveMerge(
    workflow: Workflow,
    processedWorkflowIds: Set<string>,
    mergedSubWorkflows: Array<{
      referenceId: string;
      workflowId: string;
      nodeCount: number;
      edgeCount: number;
    }> = []
  ): Promise<Workflow> {
    // ... 现有代码

    // 使用新的验证服务
    const validationResult = await this.subWorkflowValidator.validate(subWorkflow);

    if (!validationResult.isValid) {
      throw new Error(
        `子工作流验证失败（${reference.workflowId.toString()}）：${validationResult.errors.join(', ')}`
      );
    }

    // ... 继续合并逻辑
  }
}
```

#### 2.4.2 改进入口/出口节点查找

**文件**：`src/services/workflow/workflow-merger.ts`

```typescript
private findEntryNode(subWorkflow: Workflow, referenceId: string): Node | null {
  const graph = subWorkflow.getGraph();
  const nodes = Array.from(graph.nodes.values());

  // 计算入度
  const nodeInDegrees = new Map<string, number>();
  nodes.forEach((node) => nodeInDegrees.set(node.nodeId.toString(), 0));
  graph.edges.forEach((edge) => {
    const targetId = edge.toNodeId.toString();
    nodeInDegrees.set(targetId, (nodeInDegrees.get(targetId) || 0) + 1);
  });

  // 找到入度为0的节点作为入口节点
  const entryNodes = nodes.filter((node) => nodeInDegrees.get(node.nodeId.toString()) === 0);

  if (entryNodes.length === 0) {
    this.logger.warn('子工作流没有入口节点', { referenceId });
    return null;
  }

  if (entryNodes.length > 1) {
    this.logger.warn('子工作流有多个入口节点，使用第一个', {
      referenceId,
      entryNodes: entryNodes.map(n => n.nodeId.toString())
    });
  }

  const entryNode = entryNodes[0];

  // 验证入口节点类型（仅对feature子工作流）
  if (subWorkflow.isFeatureSubWorkflow() && !entryNode.type.isStart()) {
    this.logger.warn('功能子工作流的入口节点不是start节点', {
      referenceId,
      nodeId: entryNode.nodeId.toString(),
      nodeType: entryNode.type.toString()
    });
  }

  return entryNode;
}

private findExitNode(subWorkflow: Workflow, referenceId: string): Node | null {
  const graph = subWorkflow.getGraph();
  const nodes = Array.from(graph.nodes.values());

  // 计算出度
  const nodeOutDegrees = new Map<string, number>();
  nodes.forEach((node) => nodeOutDegrees.set(node.nodeId.toString(), 0));
  graph.edges.forEach((edge) => {
    const sourceId = edge.fromNodeId.toString();
    nodeOutDegrees.set(sourceId, (nodeOutDegrees.get(sourceId) || 0) + 1);
  });

  // 找到出度为0的节点作为出口节点
  const exitNodes = nodes.filter((node) => nodeOutDegrees.get(node.nodeId.toString()) === 0);

  if (exitNodes.length === 0) {
    this.logger.warn('子工作流没有出口节点', { referenceId });
    return null;
  }

  if (exitNodes.length > 1) {
    this.logger.warn('子工作流有多个出口节点，使用最后一个', {
      referenceId,
      exitNodes: exitNodes.map(n => n.nodeId.toString())
    });
  }

  const exitNode = exitNodes[exitNodes.length - 1];

  // 验证出口节点类型（仅对feature子工作流）
  if (subWorkflow.isFeatureSubWorkflow() && !exitNode.type.isEnd()) {
    this.logger.warn('功能子工作流的出口节点不是end节点', {
      referenceId,
      nodeId: exitNode.nodeId.toString(),
      nodeType: exitNode.type.toString()
    });
  }

  return exitNode;
}
```

### 2.5 更新依赖注入

**文件**：`src/di/bindings/services-bindings.ts`

```typescript
// 移除旧的SubWorkflowValidator绑定
// bind(TYPES.SubWorkflowValidator).to(SubWorkflowValidator).inSingletonScope();

// 添加新的SubWorkflowValidationService绑定
bind(TYPES.SubWorkflowValidationService).to(SubWorkflowValidationService).inSingletonScope();
```

### 2.6 更新配置文件

**文件**：`configs/workflows/base/*.toml`

```toml
# 在base子工作流配置中添加类型标识
[workflow]
id = "llm_call"
name = "LLM调用"
type = "base"  # 标识为基础子工作流
```

**文件**：`configs/workflows/features/*.toml`

```toml
# 在features工作流配置中添加类型标识
[workflow]
id = "data_analysis"
name = "数据分析"
type = "feature"  # 标识为功能子工作流
```

## 三、实施步骤

### 步骤1：创建domain层值对象
1. 创建 `src/domain/workflow/value-objects/subworkflow-type.ts`
2. 创建 `src/domain/workflow/value-objects/subworkflow-standard.ts`
3. 更新 `src/domain/workflow/entities/workflow.ts`

### 步骤2：创建新的验证服务
1. 创建 `src/services/workflow/subworkflow-validation-service.ts`
2. 更新依赖注入配置

### 步骤3：更新WorkflowMerger
1. 使用新的验证服务
2. 改进入口/出口节点查找逻辑

### 步骤4：移除执行模式
1. 删除 `ThreadExecution.executeSubWorkflow()` 等方法
2. 简化 `NodeExecutor.execute()`
3. 删除 `SubgraphNode` 配置类

### 步骤5：更新配置文件
1. 在base子工作流配置中添加 `type = "base"`
2. 在features工作流配置中添加 `type = "feature"`

### 步骤6：更新测试
1. 更新子工作流验证测试
2. 更新工作流合并测试
3. 删除执行模式相关测试

### 步骤7：清理旧代码
1. 删除 `src/services/workflow/validators/subworkflow-validator.ts`
2. 删除 `src/services/workflow/nodes/subgraph/` 目录
3. 更新所有引用

## 四、验证清单

- [ ] base子工作流不需要start/end节点，通过入度/出度确定入口/出口
- [ ] feature子工作流需要start/end节点
- [ ] 所有子工作流在加载时合并
- [ ] 执行模式已完全移除
- [ ] 使用domain层的SubWorkflowStandard进行验证
- [ ] WorkflowMerger正确使用新的验证服务
- [ ] 入口/出口节点查找逻辑正确处理base和feature子工作流
- [ ] 所有测试通过

## 五、风险评估

### 风险1：配置文件兼容性
- **风险**：现有配置文件可能缺少type字段
- **缓解**：提供默认值，base目录默认为base类型，features目录默认为feature类型

### 风险2：向后兼容性
- **风险**：移除执行模式可能影响现有功能
- **缓解**：充分测试，确保合并模式满足所有需求

### 风险3：验证逻辑变更
- **风险**：新的验证逻辑可能与旧逻辑不一致
- **缓解**：对比新旧验证结果，确保一致性

## 六、预期效果

1. **架构更清晰**：domain层定义标准，services层实现验证
2. **逻辑更简单**：只保留合并模式，移除执行模式
3. **类型更明确**：区分base和feature子工作流
4. **验证更严格**：使用值对象进行类型安全的验证
5. **代码更易维护**：职责分离清晰，易于扩展

---

**方案版本**：1.0
**创建时间**：2025-01-XX
**预计工作量**：3-5天