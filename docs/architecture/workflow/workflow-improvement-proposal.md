# Workflow 模块改进建议

## 概述

本文档基于 `workflow-example` 的函数式编程设计思想，提出对当前项目 workflow 模块的改进建议。改进目标是保持 DDD 架构优势的同时，引入函数式编程风格，提升代码的简洁性、可测试性和易用性。

## 改进目标

1. **引入函数式编程风格**：简化节点、边、触发器的实现
2. **统一执行上下文**：提供一致的执行上下文实现
3. **添加表达式求值器**：支持灵活的条件判断
4. **增强图算法**：在 `WorkflowGraph` 中添加图算法
5. **完善示例和文档**：降低学习成本

## 改进方案

### 1. 引入函数式编程风格

#### 1.1 定义函数类型接口

在 `src/infrastructure/workflow/functions/types/` 中创建函数类型定义：

```typescript
// src/infrastructure/workflow/functions/types/function-types.ts

import { IExecutionContext } from '../../execution/execution-context.interface';

/**
 * 节点输入接口
 */
export interface NodeInput {
  [key: string]: any;
}

/**
 * 节点输出接口
 */
export interface NodeOutput {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * 节点配置接口
 */
export interface NodeConfig {
  [key: string]: any;
}

/**
 * 节点执行函数类型
 */
export type NodeExecutorFunction = (
  input: NodeInput,
  config: NodeConfig,
  context: IExecutionContext
) => Promise<NodeOutput>;

/**
 * 边输入接口
 */
export interface EdgeInput {
  fromNodeId: string;
  toNodeId: string;
  [key: string]: any;
}

/**
 * 边输出接口
 */
export interface EdgeOutput {
  canTraverse: boolean;
  reason: string;
  metadata?: Record<string, any>;
}

/**
 * 边配置接口
 */
export interface EdgeConfig {
  expression?: string;
  operator?: string;
  expectedValue?: any;
  weight?: number;
  [key: string]: any;
}

/**
 * 边评估函数类型
 */
export type EdgeEvaluatorFunction = (
  input: EdgeInput,
  config: EdgeConfig,
  context: IExecutionContext
) => Promise<EdgeOutput>;

/**
 * 触发器输入接口
 */
export interface TriggerInput {
  triggerId: string;
  [key: string]: any;
}

/**
 * 触发器输出接口
 */
export interface TriggerOutput {
  shouldTrigger: boolean;
  reason: string;
  metadata?: Record<string, any>;
}

/**
 * 触发器配置接口
 */
export interface TriggerConfig {
  [key: string]: any;
}

/**
 * 触发器评估函数类型
 */
export type TriggerEvaluatorFunction = (
  input: TriggerInput,
  config: TriggerConfig,
  context: IExecutionContext
) => Promise<TriggerOutput>;
```

#### 1.2 创建函数包装器

在 `src/infrastructure/workflow/functions/wrappers/` 中创建函数包装器：

```typescript
// src/infrastructure/workflow/functions/wrappers/function-node-executor.ts

import { BaseWorkflowFunction } from '../base/base-workflow-function';
import { NodeExecutorFunction, NodeInput, NodeConfig, NodeOutput } from '../types/function-types';
import { IExecutionContext } from '../../execution/execution-context.interface';
import { WorkflowFunctionType } from '../../../../../domain/workflow/value-objects/workflow-function-type';

/**
 * 函数节点执行器
 * 将函数包装为执行器
 */
export class FunctionNodeExecutor extends BaseWorkflowFunction {
  private readonly executorFunction: NodeExecutorFunction;

  constructor(
    id: string,
    name: string,
    description: string,
    executorFunction: NodeExecutorFunction
  ) {
    super(
      id,
      name,
      description,
      '1.0.0',
      WorkflowFunctionType.NODE,
      true,
      'function'
    );
    this.executorFunction = executorFunction;
  }

  /**
   * 执行节点
   */
  async execute(input: NodeInput, config: NodeConfig, context: IExecutionContext): Promise<NodeOutput> {
    this.checkInitialized();
    return await this.executorFunction(input, config, context);
  }
}
```

```typescript
// src/infrastructure/workflow/functions/wrappers/function-edge-evaluator.ts

import { EdgeEvaluatorFunction, EdgeInput, EdgeConfig, EdgeOutput } from '../types/function-types';
import { IExecutionContext } from '../../execution/execution-context.interface';

/**
 * 函数边评估器
 * 将函数包装为评估器
 */
export class FunctionEdgeEvaluator {
  private readonly evaluatorFunction: EdgeEvaluatorFunction;

  constructor(evaluatorFunction: EdgeEvaluatorFunction) {
    this.evaluatorFunction = evaluatorFunction;
  }

  /**
   * 评估边
   */
  async evaluate(input: EdgeInput, config: EdgeConfig, context: IExecutionContext): Promise<EdgeOutput> {
    return await this.evaluatorFunction(input, config, context);
  }
}
```

#### 1.3 简化函数注册表

在 `src/infrastructure/workflow/functions/registry/` 中简化注册表：

```typescript
// src/infrastructure/workflow/functions/registry/simplified-function-registry.ts

import { NodeExecutorFunction, EdgeEvaluatorFunction, TriggerEvaluatorFunction } from '../types/function-types';
import { FunctionNodeExecutor } from '../wrappers/function-node-executor';
import { FunctionEdgeEvaluator } from '../wrappers/function-edge-evaluator';

/**
 * 简化的函数注册表
 * 支持直接注册函数
 */
export class SimplifiedFunctionRegistry {
  private nodeFunctions: Map<string, NodeExecutorFunction> = new Map();
  private edgeFunctions: Map<string, EdgeEvaluatorFunction> = new Map();
  private triggerFunctions: Map<string, TriggerEvaluatorFunction> = new Map();

  /**
   * 注册节点函数
   */
  registerNodeFunction(nodeType: string, func: NodeExecutorFunction): void {
    this.nodeFunctions.set(nodeType, func);
  }

  /**
   * 注册边函数
   */
  registerEdgeFunction(edgeType: string, func: EdgeEvaluatorFunction): void {
    this.edgeFunctions.set(edgeType, func);
  }

  /**
   * 注册触发器函数
   */
  registerTriggerFunction(triggerType: string, func: TriggerEvaluatorFunction): void {
    this.triggerFunctions.set(triggerType, func);
  }

  /**
   * 获取节点函数
   */
  getNodeFunction(nodeType: string): NodeExecutorFunction | undefined {
    return this.nodeFunctions.get(nodeType);
  }

  /**
   * 获取边函数
   */
  getEdgeFunction(edgeType: string): EdgeEvaluatorFunction | undefined {
    return this.edgeFunctions.get(edgeType);
  }

  /**
   * 获取触发器函数
   */
  getTriggerFunction(triggerType: string): TriggerEvaluatorFunction | undefined {
    return this.triggerFunctions.get(triggerType);
  }

  /**
   * 创建节点执行器
   */
  createNodeExecutor(nodeType: string): FunctionNodeExecutor | null {
    const func = this.getNodeFunction(nodeType);
    if (!func) {
      return null;
    }
    return new FunctionNodeExecutor(
      `node-${nodeType}`,
      nodeType,
      `${nodeType} 节点执行器`,
      func
    );
  }

  /**
   * 创建边评估器
   */
  createEdgeEvaluator(edgeType: string): FunctionEdgeEvaluator | null {
    const func = this.getEdgeFunction(edgeType);
    if (!func) {
      return null;
    }
    return new FunctionEdgeEvaluator(func);
  }
}

// 导出单例
export const simplifiedFunctionRegistry = new SimplifiedFunctionRegistry();
```

### 2. 统一执行上下文

#### 2.1 实现统一的执行上下文

在 `src/infrastructure/workflow/execution/` 中创建统一的执行上下文：

```typescript
// src/infrastructure/workflow/execution/workflow-execution-context.ts

import { IExecutionContext } from './execution-context.interface';
import { NodeOutput } from '../functions/types/function-types';
import { ID } from '../../../../domain/common/value-objects/id';

/**
 * 工作流执行上下文实现
 * 参考 workflow-example 的设计
 */
export class WorkflowExecutionContext implements IExecutionContext {
  private readonly _executionId: string;
  private readonly _workflowId: string;
  private readonly _data: Map<string, any>;
  private readonly _nodeResults: Map<string, NodeOutput>;
  private readonly _recentEvents: Map<string, any>;
  private readonly _startTime: number;

  constructor(workflowId: string, executionId?: string) {
    this._workflowId = workflowId;
    this._executionId = executionId || this.generateExecutionId();
    this._data = new Map();
    this._nodeResults = new Map();
    this._recentEvents = new Map();
    this._startTime = Date.now();

    // 初始化工作流级别的变量
    this._data.set('workflow', {
      id: workflowId,
      executionId: this._executionId,
      startTime: this._startTime
    });
  }

  get executionId(): string {
    return this._executionId;
  }

  get workflowId(): string {
    return this._workflowId;
  }

  get startTime(): number {
    return this._startTime;
  }

  /**
   * 设置变量
   */
  setVariable(path: string, value: any): void {
    const parts = path.split('.');
    const key = parts[0];

    if (!key) {
      return;
    }

    if (parts.length === 1) {
      this._data.set(key, value);
    } else {
      const current = this._data.get(key) || {};
      const nestedValue = this.setNestedValue(current, parts.slice(1), value);
      this._data.set(key, nestedValue);
    }
  }

  /**
   * 获取变量
   */
  getVariable(path: string): any {
    const parts = path.split('.');
    const key = parts[0];

    if (!key) {
      return undefined;
    }

    if (parts.length === 1) {
      return this._data.get(key);
    }

    const current = this._data.get(key);
    if (current === null || current === undefined) {
      return undefined;
    }

    return this.getNestedValue(current, parts.slice(1));
  }

  /**
   * 获取所有数据
   */
  getAllData(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of this._data.entries()) {
      result[key] = value;
    }

    // 添加节点结果
    result['node'] = {};
    for (const [nodeId, output] of this._nodeResults.entries()) {
      result['node'][nodeId] = {
        success: output.success,
        data: output.data,
        error: output.error
      };
    }

    return result;
  }

  /**
   * 设置节点执行结果
   */
  setNodeResult(nodeId: string, result: NodeOutput): void {
    this._nodeResults.set(nodeId, result);

    // 同时设置到数据中，方便访问
    this.setVariable(`node.${nodeId}`, {
      success: result.success,
      data: result.data,
      error: result.error
    });
  }

  /**
   * 获取节点执行结果
   */
  getNodeResult(nodeId: string): NodeOutput | undefined {
    return this._nodeResults.get(nodeId);
  }

  /**
   * 设置最近的事件
   */
  setRecentEvent(eventType: string, event: any): void {
    this._recentEvents.set(eventType, event);
  }

  /**
   * 获取最近的事件
   */
  getRecentEvent(eventType: string): any {
    return this._recentEvents.get(eventType);
  }

  /**
   * 清除所有数据
   */
  clear(): void {
    this._data.clear();
    this._nodeResults.clear();
    this._recentEvents.clear();
  }

  /**
   * 获取执行时长（毫秒）
   */
  getExecutionDuration(): number {
    return Date.now() - this._startTime;
  }

  /**
   * 获取已执行的节点数量
   */
  getExecutedNodeCount(): number {
    return this._nodeResults.size;
  }

  /**
   * 获取成功的节点数量
   */
  getSuccessNodeCount(): number {
    let count = 0;
    for (const result of this._nodeResults.values()) {
      if (result.success) {
        count++;
      }
    }
    return count;
  }

  /**
   * 获取失败的节点数量
   */
  getFailedNodeCount(): number {
    let count = 0;
    for (const result of this._nodeResults.values()) {
      if (!result.success) {
        count++;
      }
    }
    return count;
  }

  /**
   * 设置嵌套值
   */
  private setNestedValue(obj: any, path: string[], value: any): any {
    if (path.length === 0) {
      return value;
    }

    const key = path[0];
    if (!key) {
      return obj;
    }

    const remaining = path.slice(1);

    if (obj === null || typeof obj !== 'object') {
      obj = {};
    }

    if (remaining.length === 0) {
      obj[key] = value;
    } else {
      obj[key] = this.setNestedValue(obj[key] || {}, remaining, value);
    }

    return obj;
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: any, path: string[]): any {
    if (obj === null || obj === undefined) {
      return undefined;
    }

    if (path.length === 0) {
      return obj;
    }

    const key = path[0];
    if (!key) {
      return undefined;
    }

    const remaining = path.slice(1);

    if (key in obj) {
      return this.getNestedValue(obj[key], remaining);
    }

    return undefined;
  }

  /**
   * 生成执行ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 转换为字符串表示
   */
  toString(): string {
    return `WorkflowExecutionContext(workflowId=${this._workflowId}, executionId=${this._executionId}, nodes=${this._nodeResults.size})`;
  }
}
```

### 3. 添加表达式求值器

#### 3.1 实现表达式求值器

在 `src/infrastructure/workflow/evaluators/` 中创建表达式求值器：

```typescript
// src/infrastructure/workflow/evaluators/expression-evaluator.ts

import { IExecutionContext } from '../execution/execution-context.interface';

/**
 * 表达式求值器
 * 参考 workflow-example 的设计
 */
export class ExpressionEvaluator {
  /**
   * 评估表达式
   */
  evaluate(expression: string, context: IExecutionContext): any {
    // 替换变量占位符
    const processedExpr = this.replacePlaceholders(expression, context.getAllData());
    // 安全求值
    return this.safeEvaluate(processedExpr);
  }

  /**
   * 替换变量占位符
   */
  private replacePlaceholders(expression: string, data: Record<string, any>): string {
    const placeholderRegex = /\{\{([^}]+)\}\}/g;

    return expression.replace(placeholderRegex, (match, path) => {
      const value = this.getValueByPath(data, path.trim());
      return this.valueToString(value);
    });
  }

  /**
   * 根据路径获取值
   */
  private getValueByPath(data: Record<string, any>, path: string): any {
    const parts = path.split('.');
    let current: any = data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * 将值转换为字符串
   */
  private valueToString(value: any): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'string') {
      return `'${value}'`;
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * 安全求值
   */
  private safeEvaluate(expression: string): any {
    const trimmed = expression.trim();

    // 布尔值
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;

    // 数字
    if (/^-?\d+\.?\d*$/.test(trimmed)) {
      return Number(trimmed);
    }

    // 字符串（带引号）
    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      return trimmed.slice(1, -1);
    }

    // 比较表达式
    const comparisonRegex = /^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/;
    const match = trimmed.match(comparisonRegex);

    if (match) {
      const [, left, operator = '', right] = match;
      const leftValue = this.parseValue(left);
      const rightValue = this.parseValue(right);

      switch (operator) {
        case '==':
          return leftValue == rightValue;
        case '!=':
          return leftValue != rightValue;
        case '>=':
          return leftValue >= rightValue;
        case '<=':
          return leftValue <= rightValue;
        case '>':
          return leftValue > rightValue;
        case '<':
          return leftValue < rightValue;
        default:
          return false;
      }
    }

    // 默认返回原始值
    return trimmed;
  }

  /**
   * 解析值
   */
  private parseValue(str?: string): any {
    if (!str) return undefined;

    const trimmed = str.trim();

    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;

    if (/^-?\d+\.?\d*$/.test(trimmed)) {
      return Number(trimmed);
    }

    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      return trimmed.slice(1, -1);
    }

    return trimmed;
  }
}

// 导出单例
export const expressionEvaluator = new ExpressionEvaluator();
```

### 4. 增强图算法

#### 4.1 在 WorkflowGraph 中添加图算法

在 `src/domain/workflow/entities/workflow.ts` 中添加图算法：

```typescript
// 在 Workflow 类中添加以下方法

/**
 * 拓扑排序
 * 返回节点的执行顺序
 */
public getTopologicalOrder(): string[] {
  const order: string[] = [];
  const visited = new Set<string>();
  const tempVisited = new Set<string>();

  const visit = (nodeId: string): void => {
    if (tempVisited.has(nodeId)) {
      throw new Error(`检测到循环依赖: ${nodeId}`);
    }
    if (visited.has(nodeId)) {
      return;
    }

    tempVisited.add(nodeId);

    // 先访问所有后继节点
    const outgoingEdges = this.getOutgoingEdges(nodeId);
    for (const edge of outgoingEdges) {
      visit(edge.toNodeId.toString());
    }

    tempVisited.delete(nodeId);
    visited.add(nodeId);
    order.push(nodeId);
  };

  // 访问所有节点
  for (const nodeId of this.props.graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      visit(nodeId);
    }
  }

  // 反转顺序，得到从前往后的执行顺序
  return order.reverse();
}

/**
 * 检测循环依赖
 */
public hasCycle(): boolean {
  try {
    this.getTopologicalOrder();
    return false;
  } catch (error) {
    return true;
  }
}

/**
 * 获取就绪节点
 * 就绪节点是指所有前置节点都已执行的节点
 */
public getReadyNodes(executedNodes: Set<string>): NodeData[] {
  const readyNodes: NodeData[] = [];

  for (const [nodeId, node] of this.props.graph.nodes.entries()) {
    // 如果已经执行过，跳过
    if (executedNodes.has(nodeId)) {
      continue;
    }

    // 获取所有入边
    const incomingEdges = this.getIncomingEdges(nodeId);

    // 如果没有入边，说明是起始节点，可以执行
    if (incomingEdges.length === 0) {
      readyNodes.push(node);
      continue;
    }

    // 检查所有前置节点是否都已执行
    let allPredecessorsExecuted = true;
    for (const edge of incomingEdges) {
      if (!executedNodes.has(edge.fromNodeId.toString())) {
        allPredecessorsExecuted = false;
        break;
      }
    }

    if (allPredecessorsExecuted) {
      readyNodes.push(node);
    }
  }

  return readyNodes;
}
```

### 5. 添加示例和文档

#### 5.1 创建示例工作流

在 `src/examples/workflow/` 中创建示例：

```typescript
// src/examples/workflow/text-analysis-workflow.ts

import { Workflow } from '../../domain/workflow/entities/workflow';
import { NodeType } from '../../domain/workflow/value-objects/node-type';
import { EdgeType } from '../../domain/workflow/value-objects/edge-type';
import { NodeId } from '../../domain/workflow/value-objects/node-id';
import { EdgeId } from '../../domain/workflow/value-objects/edge-id';
import { ExecutionStrategy } from '../../domain/workflow/value-objects/execution-strategy';

/**
 * 创建文本分析工作流
 */
export function createTextAnalysisWorkflow(): Workflow {
  const workflow = Workflow.create(
    'text-analysis-workflow',
    '智能文本分析工作流',
    undefined,
    undefined,
    undefined
  );

  // 创建节点
  const inputNode = new NodeId('InputNode');
  workflow.addNode(
    inputNode,
    NodeType.start(),
    '输入节点',
    '接收用户输入的文本'
  );

  const classifyNode = new NodeId('ClassifyNode');
  workflow.addNode(
    classifyNode,
    NodeType.llm(),
    'LLM分类节点',
    '使用LLM对输入文本进行分类',
    undefined,
    {
      prompt: '请判断以下文本的类型：新闻、评论、问答。只返回类型名称（news/review/qa）。文本：{{input.text}}',
      model: 'gpt-3.5-turbo',
      temperature: 0.3
    }
  );

  const isNewsNode = new NodeId('IsNewsNode');
  workflow.addNode(
    isNewsNode,
    NodeType.condition(),
    '是否为新闻',
    '判断分类结果是否为新闻',
    undefined,
    {
      condition: '{{ClassifyNode.data.response}} == "news"'
    }
  );

  const extractNewsNode = new NodeId('ExtractNewsNode');
  workflow.addNode(
    extractNewsNode,
    NodeType.llm(),
    '新闻信息提取',
    '提取新闻的关键信息',
    undefined,
    {
      prompt: '从以下新闻文本中提取标题、时间、地点，以JSON格式返回。文本：{{input.text}}'
    }
  );

  const outputNode = new NodeId('OutputNode');
  workflow.addNode(
    outputNode,
    NodeType.end(),
    '输出节点',
    '返回工作流执行结果'
  );

  // 创建边
  workflow.addEdge(
    new EdgeId('edge_input_classify'),
    EdgeType.sequence(),
    inputNode,
    classifyNode
  );

  workflow.addEdge(
    new EdgeId('edge_classify_isnews'),
    EdgeType.sequence(),
    classifyNode,
    isNewsNode
  );

  workflow.addEdge(
    new EdgeId('edge_isnews_extract'),
    EdgeType.conditional(),
    isNewsNode,
    extractNewsNode,
    '{{IsNewsNode.data.result}} == true'
  );

  workflow.addEdge(
    new EdgeId('edge_extract_output'),
    EdgeType.sequence(),
    extractNewsNode,
    outputNode
  );

  return workflow;
}

/**
 * 运行文本分析工作流示例
 */
export async function runTextAnalysisWorkflowExample(inputText: string) {
  console.log('========================================');
  console.log('智能文本分析工作流示例');
  console.log('========================================');
  console.log(`输入文本: ${inputText}`);
  console.log('========================================\n');

  // 创建工作流
  const workflow = createTextAnalysisWorkflow();

  // TODO: 创建执行引擎并执行
  // const engine = new WorkflowEngine(ExecutionStrategy.sequential());
  // const result = await engine.execute(workflow, { text: inputText });

  console.log('\n========================================');
  console.log('执行完成');
  console.log('========================================\n');

  return workflow;
}
```

## 实施计划

### 阶段1：函数式编程风格（1-2周）

1. 创建函数类型定义
2. 实现函数包装器
3. 简化函数注册表
4. 编写单元测试

### 阶段2：统一执行上下文（1周）

1. 实现 `WorkflowExecutionContext`
2. 替换现有的执行上下文实现
3. 添加事件管理功能
4. 编写单元测试

### 阶段3：表达式求值器（1周）

1. 实现 `ExpressionEvaluator`
2. 集成到边评估器和条件节点
3. 编写单元测试

### 阶段4：图算法增强（1周）

1. 在 `WorkflowGraph` 中添加图算法
2. 替换现有的领域服务调用
3. 添加循环检测
4. 编写单元测试

### 阶段5：示例和文档（1周）

1. 创建示例工作流
2. 编写使用文档
3. 添加教程
4. 更新 API 文档

## 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 破坏现有功能 | 高 | 中 | 保持向后兼容，逐步迁移 |
| 增加复杂度 | 中 | 低 | 提供清晰的文档和示例 |
| 性能下降 | 低 | 低 | 进行性能测试和优化 |
| 测试覆盖不足 | 中 | 中 | 编写完整的单元测试 |

## 总结

通过引入 workflow-example 的函数式编程风格，可以在保持当前项目 DDD 架构优势的同时，提升代码的简洁性、可测试性和易用性。改进方案分阶段实施，每个阶段都有明确的目标和可验证的成果，确保改进过程可控且可回滚。