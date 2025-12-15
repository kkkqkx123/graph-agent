import { Edge, EdgeProps } from '@domain/workflow/graph/entities/edges/base/edge';
import { ID } from '@domain/common/value-objects/id';
import { EdgeType } from '@domain/workflow/graph/value-objects/edge-type';
import { WorkflowState } from '@domain/workflow/graph/entities/workflow-state';
import { Timestamp } from '@domain/common/value-objects/timestamp';
import { Version } from '@domain/common/value-objects/version';
import { DomainError } from '@domain/common/errors/domain-error';

/**
 * 条件表达式接口
 */
export interface ConditionExpression {
  expressionId: string;
  name: string;
  expression: string;
  parameters?: Record<string, unknown>;
  priority: number;
  enabled: boolean;
}

/**
 * 条件评估结果接口
 */
export interface ConditionEvaluationResult {
  expressionId: string;
  result: boolean;
  evaluationTime: number;
  error?: Error;
  metadata?: Record<string, unknown>;
}

/**
 * 条件边属性接口
 */
export interface ConditionalEdgeProps extends EdgeProps {
  expressions: ConditionExpression[];
  evaluationStrategy?: 'first_match' | 'all_match' | 'majority' | 'weighted';
  fallbackEnabled?: boolean;
  fallbackTarget?: ID;
  cacheEnabled?: boolean;
  cacheTimeout?: number;
}

/**
 * 条件边实体
 * 
 * 表示基于条件决定是否遍历的边
 */
export class ConditionalEdge extends Edge {
  private readonly conditionalProps: ConditionalEdgeProps;

  private constructor(props: ConditionalEdgeProps) {
    super(props);
    this.conditionalProps = Object.freeze(props);
  }

  /**
   * 创建条件边
   */
  public static override create(
    graphId: ID,
    type: EdgeType,
    fromNodeId: ID,
    toNodeId: ID,
    condition?: string,
    weight?: number,
    properties?: Record<string, unknown>,
    expressions?: ConditionExpression[],
    options?: {
      evaluationStrategy?: 'first_match' | 'all_match' | 'majority' | 'weighted';
      fallbackEnabled?: boolean;
      fallbackTarget?: ID;
      cacheEnabled?: boolean;
      cacheTimeout?: number;
    }
  ): ConditionalEdge {
    const now = Timestamp.now();
    const edgeId = ID.generate();

    const edgeProps: EdgeProps = {
      id: edgeId,
      graphId,
      type,
      fromNodeId,
      toNodeId,
      condition,
      weight,
      properties: properties || {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false
    };

    const props: ConditionalEdgeProps = {
      ...edgeProps,
      expressions: expressions || [],
      evaluationStrategy: options?.evaluationStrategy ?? 'first_match',
      fallbackEnabled: options?.fallbackEnabled ?? false,
      fallbackTarget: options?.fallbackTarget,
      cacheEnabled: options?.cacheEnabled ?? false,
      cacheTimeout: options?.cacheTimeout ?? 300000 // 5分钟
    };

    return new ConditionalEdge(props);
  }

  /**
   * 从已有属性重建条件边
   */
  public static override fromProps(props: ConditionalEdgeProps): ConditionalEdge {
    return new ConditionalEdge(props);
  }

  /**
   * 获取条件表达式列表
   */
  public get expressions(): ConditionExpression[] {
    return [...this.conditionalProps.expressions];
  }

  /**
   * 获取评估策略
   */
  public get evaluationStrategy(): 'first_match' | 'all_match' | 'majority' | 'weighted' {
    return this.conditionalProps.evaluationStrategy ?? 'first_match';
  }

  /**
   * 获取是否启用回退
   */
  public get fallbackEnabled(): boolean {
    return this.conditionalProps.fallbackEnabled ?? false;
  }

  /**
   * 获取回退目标
   */
  public get fallbackTarget(): ID | undefined {
    return this.conditionalProps.fallbackTarget;
  }

  /**
   * 获取是否启用缓存
   */
  public get cacheEnabled(): boolean {
    return this.conditionalProps.cacheEnabled ?? false;
  }

  /**
   * 获取缓存超时时间
   */
  public get cacheTimeout(): number {
    return this.conditionalProps.cacheTimeout ?? 300000;
  }

  /**
   * 添加条件表达式
   */
  public addExpression(expression: ConditionExpression): ConditionalEdge {
    if (this.hasExpression(expression.expressionId)) {
      throw new DomainError(`条件表达式已存在: ${expression.expressionId}`);
    }

    const newExpressions = [...this.conditionalProps.expressions, expression];
    return new ConditionalEdge({
      ...this.conditionalProps,
      expressions: newExpressions,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 移除条件表达式
   */
  public removeExpression(expressionId: string): ConditionalEdge {
    const newExpressions = this.conditionalProps.expressions.filter(
      e => e.expressionId !== expressionId
    );

    if (newExpressions.length === this.conditionalProps.expressions.length) {
      throw new DomainError(`条件表达式不存在: ${expressionId}`);
    }

    return new ConditionalEdge({
      ...this.conditionalProps,
      expressions: newExpressions,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 更新条件表达式
   */
  public updateExpression(expressionId: string, updates: Partial<ConditionExpression>): ConditionalEdge {
    const expressionIndex = this.conditionalProps.expressions.findIndex(
      e => e.expressionId === expressionId
    );

    if (expressionIndex === -1) {
      throw new DomainError(`条件表达式不存在: ${expressionId}`);
    }

    const newExpressions = [...this.conditionalProps.expressions];
    // 确保 expressionId 不被更新
    const { expressionId: _, ...safeUpdates } = updates;
    // 确保 expressionId 不为 undefined
    const originalExpression = newExpressions[expressionIndex];
    if (!originalExpression) {
      throw new DomainError(`条件表达式不存在: ${expressionId}`);
    }
    const updatedExpression: ConditionExpression = {
      ...originalExpression,
      ...safeUpdates,
      expressionId: originalExpression.expressionId // 确保 expressionId 始终是字符串
    };
    newExpressions[expressionIndex] = updatedExpression;

    return new ConditionalEdge({
      ...this.conditionalProps,
      expressions: newExpressions,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 检查是否有指定条件表达式
   */
  public hasExpression(expressionId: string): boolean {
    return this.conditionalProps.expressions.some(e => e.expressionId === expressionId);
  }

  /**
   * 获取条件表达式
   */
  public getExpression(expressionId: string): ConditionExpression | undefined {
    return this.conditionalProps.expressions.find(e => e.expressionId === expressionId);
  }

  /**
   * 获取启用的条件表达式
   */
  public getEnabledExpressions(): ConditionExpression[] {
    return this.conditionalProps.expressions.filter(e => e.enabled);
  }

  /**
   * 启用条件表达式
   */
  public enableExpression(expressionId: string): ConditionalEdge {
    return this.updateExpression(expressionId, { enabled: true });
  }

  /**
   * 禁用条件表达式
   */
  public disableExpression(expressionId: string): ConditionalEdge {
    return this.updateExpression(expressionId, { enabled: false });
  }

  /**
   * 设置评估策略
   */
  public setEvaluationStrategy(strategy: 'first_match' | 'all_match' | 'majority' | 'weighted'): ConditionalEdge {
    return new ConditionalEdge({
      ...this.conditionalProps,
      evaluationStrategy: strategy,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 启用回退
   */
  public enableFallback(fallbackTarget?: ID): ConditionalEdge {
    return new ConditionalEdge({
      ...this.conditionalProps,
      fallbackEnabled: true,
      fallbackTarget,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 禁用回退
   */
  public disableFallback(): ConditionalEdge {
    return new ConditionalEdge({
      ...this.conditionalProps,
      fallbackEnabled: false,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 启用缓存
   */
  public enableCache(timeout?: number): ConditionalEdge {
    return new ConditionalEdge({
      ...this.conditionalProps,
      cacheEnabled: true,
      cacheTimeout: timeout ?? this.cacheTimeout,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 禁用缓存
   */
  public disableCache(): ConditionalEdge {
    return new ConditionalEdge({
      ...this.conditionalProps,
      cacheEnabled: false,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 评估条件
   */
  public async evaluateConditions(state: WorkflowState): Promise<{
    canTraverse: boolean;
    results: ConditionEvaluationResult[];
    strategy: string;
    metadata?: Record<string, unknown>;
  }> {
    const enabledExpressions = this.getEnabledExpressions();
    if (enabledExpressions.length === 0) {
      return {
        canTraverse: this.fallbackEnabled,
        results: [],
        strategy: this.evaluationStrategy,
        metadata: {
          reason: '没有启用的条件表达式',
          fallbackUsed: this.fallbackEnabled
        }
      };
    }

    // 按优先级排序
    const sortedExpressions = enabledExpressions.sort((a, b) => b.priority - a.priority);
    const results: ConditionEvaluationResult[] = [];

    // 评估所有条件
    for (const expression of sortedExpressions) {
      const result = await this.evaluateExpression(expression, state);
      results.push(result);
    }

    // 根据策略决定是否可以遍历
    const canTraverse = this.evaluateByStrategy(results);

    return {
      canTraverse,
      results,
      strategy: this.evaluationStrategy,
      metadata: {
        expressionCount: enabledExpressions.length,
        successCount: results.filter(r => r.result).length,
        failureCount: results.filter(r => !r.result).length,
        fallbackUsed: !canTraverse && this.fallbackEnabled
      }
    };
  }

  /**
   * 评估单个条件表达式
   */
  private async evaluateExpression(
    expression: ConditionExpression,
    state: WorkflowState
  ): Promise<ConditionEvaluationResult> {
    const startTime = Date.now();

    try {
      // 检查缓存
      if (this.cacheEnabled) {
        const cachedResult = this.getCachedResult(expression.expressionId, state);
        if (cachedResult !== null) {
          return {
            expressionId: expression.expressionId,
            result: cachedResult,
            evaluationTime: Date.now() - startTime,
            metadata: { cached: true }
          };
        }
      }

      // 评估表达式
      const result = this.evaluateConditionExpression(expression, state);

      // 缓存结果
      if (this.cacheEnabled) {
        this.cacheResult(expression.expressionId, state, result);
      }

      return {
        expressionId: expression.expressionId,
        result,
        evaluationTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        expressionId: expression.expressionId,
        result: false,
        evaluationTime: Date.now() - startTime,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * 评估条件表达式
   */
  private evaluateConditionExpression(
    expression: ConditionExpression,
    state: WorkflowState
  ): boolean {
    // 简单的表达式评估实现
    // 在实际应用中，这里应该使用更复杂的表达式解析器
    const expr = expression.expression;
    const parameters = expression.parameters || {};

    // 替换表达式中的变量
    let evaluatedExpression = expr;
    for (const [key, value] of Object.entries(parameters)) {
      evaluatedExpression = evaluatedExpression.replace(
        new RegExp(`\\$\\{${key}\\}`, 'g'),
        String(value)
      );
    }

    // 从状态中获取变量
    for (const [key, value] of Object.entries(state.data)) {
      evaluatedExpression = evaluatedExpression.replace(
        new RegExp(`\\$\\{${key}\\}`, 'g'),
        String(value)
      );
    }

    // 简单的表达式评估
    return this.evaluateSimpleExpression(evaluatedExpression);
  }

  /**
   * 评估简单表达式
   */
  private evaluateSimpleExpression(expression: string): boolean {
    // 支持基本的比较操作：==, !=, >, <, >=, <=
    const operators = ['>=', '<=', '==', '!=', '>', '<'];

    for (const op of operators) {
      if (expression.includes(op)) {
        const parts = expression.split(op).map(s => s.trim());
        if (parts.length !== 2) continue;
        const [left, right] = parts;
        const leftValue = this.parseValue(left || '');
        const rightValue = this.parseValue(right || '');

        switch (op) {
          case '==':
            return leftValue === rightValue;
          case '!=':
            return leftValue !== rightValue;
          case '>':
            return typeof leftValue === 'number' && typeof rightValue === 'number' && leftValue > rightValue;
          case '<':
            return typeof leftValue === 'number' && typeof rightValue === 'number' && leftValue < rightValue;
          case '>=':
            return typeof leftValue === 'number' && typeof rightValue === 'number' && leftValue >= rightValue;
          case '<=':
            return typeof leftValue === 'number' && typeof rightValue === 'number' && leftValue <= rightValue;
        }
      }
    }

    // 如果没有比较操作符，尝试解析为布尔值
    const boolValue = this.parseValue(expression);
    return Boolean(boolValue);
  }

  /**
   * 解析值
   */
  private parseValue(value: string): unknown {
    // 移除引号
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1);
    }

    // 尝试解析为数字
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      return numValue;
    }

    // 尝试解析为布尔值
    if (value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'false') {
      return false;
    }

    // 返回原始字符串
    return value;
  }

  /**
   * 根据策略评估结果
   */
  private evaluateByStrategy(results: ConditionEvaluationResult[]): boolean {
    const strategy = this.evaluationStrategy;

    switch (strategy) {
      case 'first_match':
        return results.some(r => r.result);

      case 'all_match':
        return results.every(r => r.result);

      case 'majority':
        const successCount = results.filter(r => r.result).length;
        return successCount > results.length / 2;

      case 'weighted':
        // 简化的加权评估
        let totalWeight = 0;
        let successWeight = 0;

        for (const result of results) {
          const expression = this.getExpression(result.expressionId);
          if (expression) {
            totalWeight += expression.priority;
            if (result.result) {
              successWeight += expression.priority;
            }
          }
        }

        return totalWeight > 0 && (successWeight / totalWeight) > 0.5;

      default:
        return false;
    }
  }

  /**
   * 获取缓存结果
   */
  private getCachedResult(expressionId: string, state: WorkflowState): boolean | null {
    // 简化的缓存实现
    // 在实际应用中，应该使用更复杂的缓存机制
    return null;
  }

  /**
   * 缓存结果
   */
  private cacheResult(expressionId: string, state: WorkflowState, result: boolean): void {
    // 简化的缓存实现
    // 在实际应用中，应该使用更复杂的缓存机制
  }

  /**
   * 验证条件边
   */
  public validateConditionalEdge(): string[] {
    const errors: string[] = [];

    if (this.conditionalProps.expressions.length === 0) {
      errors.push('条件边必须至少有一个条件表达式');
    }

    for (const expression of this.conditionalProps.expressions) {
      if (!expression.expressionId) {
        errors.push('条件表达式ID不能为空');
      }
      if (!expression.name) {
        errors.push('条件表达式名称不能为空');
      }
      if (!expression.expression) {
        errors.push('条件表达式不能为空');
      }
      if (expression.priority < 0) {
        errors.push('条件表达式优先级不能为负数');
      }
    }

    // 检查表达式ID是否唯一
    const expressionIds = this.conditionalProps.expressions.map(e => e.expressionId);
    const uniqueIds = new Set(expressionIds);
    if (expressionIds.length !== uniqueIds.size) {
      errors.push('条件表达式ID必须唯一');
    }

    if (this.fallbackEnabled && !this.fallbackTarget) {
      errors.push('启用回退时必须指定回退目标');
    }

    if (this.cacheTimeout && this.cacheTimeout <= 0) {
      errors.push('缓存超时时间必须大于0');
    }

    return errors;
  }

  /**
   * 验证实体的有效性
   */
  public override validate(): void {
    super.validate();

    const conditionalErrors = this.validateConditionalEdge();
    if (conditionalErrors.length > 0) {
      throw new DomainError(`条件边验证失败: ${conditionalErrors.join(', ')}`);
    }
  }
}