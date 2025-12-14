import { Edge, EdgeProps } from './edge';
import { ID } from '../../common/value-objects/id';
import { EdgeType } from '../value-objects/edge-type';
import { WorkflowState } from './workflow-state';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { DomainError } from '../../common/errors/domain-error';

/**
 * 复杂条件接口
 */
export interface ComplexCondition {
  conditionId: string;
  name: string;
  type: 'simple' | 'composite' | 'function' | 'script';
  expression?: string;
  conditions?: ComplexCondition[]; // 用于复合条件
  operator?: 'AND' | 'OR' | 'NOT' | 'XOR'; // 用于复合条件
  functionName?: string; // 用于函数条件
  scriptCode?: string; // 用于脚本条件
  parameters?: Record<string, unknown>;
  priority: number;
  weight: number;
  enabled: boolean;
  timeout?: number;
}

/**
 * 条件评估上下文接口
 */
export interface ConditionEvaluationContext {
  state: WorkflowState;
  edgeId: ID;
  executionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 条件评估结果接口
 */
export interface FlexibleConditionEvaluationResult {
  conditionId: string;
  result: boolean;
  confidence: number; // 0-1之间的置信度
  evaluationTime: number;
  error?: Error;
  metadata?: Record<string, unknown>;
}

/**
 * 灵活条件边属性接口
 */
export interface FlexibleConditionalEdgeProps extends EdgeProps {
  conditions: ComplexCondition[];
  evaluationMode?: 'eager' | 'lazy' | 'parallel';
  combinationLogic?: 'any' | 'all' | 'weighted' | 'custom';
  customLogic?: string; // 自定义组合逻辑的函数名或脚本
  fallbackEnabled?: boolean;
  fallbackTarget?: ID;
  cacheEnabled?: boolean;
  cacheTimeout?: number;
  maxParallelEvaluations?: number;
  evaluationTimeout?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

/**
 * 灵活条件边实体
 * 
 * 表示支持复杂条件逻辑的条件边
 */
export class FlexibleConditionalEdge extends Edge {
  private readonly flexibleProps: FlexibleConditionalEdgeProps;

  private constructor(props: FlexibleConditionalEdgeProps) {
    super(props);
    this.flexibleProps = Object.freeze(props);
  }

  /**
   * 创建灵活条件边
   */
  public static override create(
    graphId: ID,
    type: EdgeType,
    fromNodeId: ID,
    toNodeId: ID,
    condition?: string,
    weight?: number,
    properties?: Record<string, unknown>,
    conditions?: ComplexCondition[],
    options?: {
      evaluationMode?: 'eager' | 'lazy' | 'parallel';
      combinationLogic?: 'any' | 'all' | 'weighted' | 'custom';
      customLogic?: string;
      fallbackEnabled?: boolean;
      fallbackTarget?: ID;
      cacheEnabled?: boolean;
      cacheTimeout?: number;
      maxParallelEvaluations?: number;
      evaluationTimeout?: number;
      retryOnFailure?: boolean;
      maxRetries?: number;
    }
  ): FlexibleConditionalEdge {
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

    const props: FlexibleConditionalEdgeProps = {
      ...edgeProps,
      conditions: conditions || [],
      evaluationMode: options?.evaluationMode ?? 'eager',
      combinationLogic: options?.combinationLogic ?? 'any',
      customLogic: options?.customLogic,
      fallbackEnabled: options?.fallbackEnabled ?? false,
      fallbackTarget: options?.fallbackTarget,
      cacheEnabled: options?.cacheEnabled ?? false,
      cacheTimeout: options?.cacheTimeout ?? 300000,
      maxParallelEvaluations: options?.maxParallelEvaluations ?? 5,
      evaluationTimeout: options?.evaluationTimeout ?? 30000,
      retryOnFailure: options?.retryOnFailure ?? false,
      maxRetries: options?.maxRetries ?? 3
    };

    return new FlexibleConditionalEdge(props);
  }

  /**
   * 从已有属性重建灵活条件边
   */
  public static override fromProps(props: FlexibleConditionalEdgeProps): FlexibleConditionalEdge {
    return new FlexibleConditionalEdge(props);
  }

  /**
   * 获取复杂条件列表
   */
  public get conditions(): ComplexCondition[] {
    return [...this.flexibleProps.conditions];
  }

  /**
   * 获取评估模式
   */
  public get evaluationMode(): 'eager' | 'lazy' | 'parallel' {
    return this.flexibleProps.evaluationMode ?? 'eager';
  }

  /**
   * 获取组合逻辑
   */
  public get combinationLogic(): 'any' | 'all' | 'weighted' | 'custom' {
    return this.flexibleProps.combinationLogic ?? 'any';
  }

  /**
   * 获取自定义逻辑
   */
  public get customLogic(): string | undefined {
    return this.flexibleProps.customLogic;
  }

  /**
   * 获取是否启用回退
   */
  public get fallbackEnabled(): boolean {
    return this.flexibleProps.fallbackEnabled ?? false;
  }

  /**
   * 获取回退目标
   */
  public get fallbackTarget(): ID | undefined {
    return this.flexibleProps.fallbackTarget;
  }

  /**
   * 获取是否启用缓存
   */
  public get cacheEnabled(): boolean {
    return this.flexibleProps.cacheEnabled ?? false;
  }

  /**
   * 获取缓存超时时间
   */
  public get cacheTimeout(): number {
    return this.flexibleProps.cacheTimeout ?? 300000;
  }

  /**
   * 获取最大并行评估数
   */
  public get maxParallelEvaluations(): number {
    return this.flexibleProps.maxParallelEvaluations ?? 5;
  }

  /**
   * 获取评估超时时间
   */
  public get evaluationTimeout(): number {
    return this.flexibleProps.evaluationTimeout ?? 30000;
  }

  /**
   * 获取失败时是否重试
   */
  public get retryOnFailure(): boolean {
    return this.flexibleProps.retryOnFailure ?? false;
  }

  /**
   * 获取最大重试次数
   */
  public get maxRetries(): number {
    return this.flexibleProps.maxRetries ?? 3;
  }

  /**
   * 添加复杂条件
   */
  public addCondition(condition: ComplexCondition): FlexibleConditionalEdge {
    if (this.hasCondition(condition.conditionId)) {
      throw new DomainError(`条件已存在: ${condition.conditionId}`);
    }

    const newConditions = [...this.flexibleProps.conditions, condition];
    return new FlexibleConditionalEdge({
      ...this.flexibleProps,
      conditions: newConditions,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 移除复杂条件
   */
  public removeCondition(conditionId: string): FlexibleConditionalEdge {
    const newConditions = this.flexibleProps.conditions.filter(
      c => c.conditionId !== conditionId
    );

    if (newConditions.length === this.flexibleProps.conditions.length) {
      throw new DomainError(`条件不存在: ${conditionId}`);
    }

    return new FlexibleConditionalEdge({
      ...this.flexibleProps,
      conditions: newConditions,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 更新复杂条件
   */
  public updateComplexCondition(conditionId: string, updates: Partial<ComplexCondition>): FlexibleConditionalEdge {
    const conditionIndex = this.flexibleProps.conditions.findIndex(
      c => c.conditionId === conditionId
    );

    if (conditionIndex === -1) {
      throw new DomainError(`条件不存在: ${conditionId}`);
    }

    const newConditions = [...this.flexibleProps.conditions];
    // 确保 conditionId 不被更新
    const { conditionId: _, ...safeUpdates } = updates;
    // 确保 conditionId 不为 undefined
    const originalCondition = newConditions[conditionIndex];
    if (!originalCondition) {
      throw new DomainError(`条件不存在: ${conditionId}`);
    }
    const updatedCondition: ComplexCondition = {
      ...originalCondition,
      ...safeUpdates,
      conditionId: originalCondition.conditionId // 确保 conditionId 始终是字符串
    };
    newConditions[conditionIndex] = updatedCondition;

    return new FlexibleConditionalEdge({
      ...this.flexibleProps,
      conditions: newConditions,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 检查是否有指定条件
   */
  public hasCondition(conditionId: string): boolean {
    return this.flexibleProps.conditions.some(c => c.conditionId === conditionId);
  }

  /**
   * 获取复杂条件
   */
  public getCondition(conditionId: string): ComplexCondition | undefined {
    return this.flexibleProps.conditions.find(c => c.conditionId === conditionId);
  }

  /**
   * 获取启用的条件
   */
  public getEnabledConditions(): ComplexCondition[] {
    return this.flexibleProps.conditions.filter(c => c.enabled);
  }

  /**
   * 启用条件
   */
  public enableCondition(conditionId: string): FlexibleConditionalEdge {
    return this.updateComplexCondition(conditionId, { enabled: true });
  }

  /**
   * 禁用条件
   */
  public disableCondition(conditionId: string): FlexibleConditionalEdge {
    return this.updateComplexCondition(conditionId, { enabled: false });
  }

  /**
   * 设置评估模式
   */
  public setEvaluationMode(mode: 'eager' | 'lazy' | 'parallel'): FlexibleConditionalEdge {
    return new FlexibleConditionalEdge({
      ...this.flexibleProps,
      evaluationMode: mode,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置组合逻辑
   */
  public setCombinationLogic(logic: 'any' | 'all' | 'weighted' | 'custom'): FlexibleConditionalEdge {
    return new FlexibleConditionalEdge({
      ...this.flexibleProps,
      combinationLogic: logic,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置自定义逻辑
   */
  public setCustomLogic(logic: string): FlexibleConditionalEdge {
    return new FlexibleConditionalEdge({
      ...this.flexibleProps,
      customLogic: logic,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 评估条件
   */
  public async evaluateConditions(state: WorkflowState): Promise<{
    canTraverse: boolean;
    results: FlexibleConditionEvaluationResult[];
    confidence: number;
    strategy: string;
    metadata?: Record<string, unknown>;
  }> {
    const enabledConditions = this.getEnabledConditions();
    if (enabledConditions.length === 0) {
      return {
        canTraverse: this.fallbackEnabled,
        results: [],
        confidence: 0,
        strategy: this.combinationLogic,
        metadata: {
          reason: '没有启用的条件',
          fallbackUsed: this.fallbackEnabled
        }
      };
    }

    const context: ConditionEvaluationContext = {
      state,
      edgeId: this.flexibleProps.id,
      metadata: {
        evaluationMode: this.evaluationMode,
        combinationLogic: this.combinationLogic
      }
    };

    let results: FlexibleConditionEvaluationResult[];

    // 根据评估模式执行评估
    switch (this.evaluationMode) {
      case 'eager':
        results = await this.evaluateEager(enabledConditions, context);
        break;
      case 'lazy':
        results = await this.evaluateLazy(enabledConditions, context);
        break;
      case 'parallel':
        results = await this.evaluateParallel(enabledConditions, context);
        break;
      default:
        results = await this.evaluateEager(enabledConditions, context);
    }

    // 根据组合逻辑计算最终结果
    const { canTraverse, confidence } = this.combineResults(results);

    return {
      canTraverse,
      results,
      confidence,
      strategy: `${this.evaluationMode}-${this.combinationLogic}`,
      metadata: {
        conditionCount: enabledConditions.length,
        successCount: results.filter(r => r.result).length,
        failureCount: results.filter(r => !r.result).length,
        averageConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
        fallbackUsed: !canTraverse && this.fallbackEnabled
      }
    };
  }

  /**
   * 急切评估模式
   */
  private async evaluateEager(
    conditions: ComplexCondition[],
    context: ConditionEvaluationContext
  ): Promise<FlexibleConditionEvaluationResult[]> {
    const results: FlexibleConditionEvaluationResult[] = [];

    for (const condition of conditions) {
      const result = await this.evaluateComplexCondition(condition, context);
      results.push(result);

      // 如果是"any"逻辑且已找到满足的条件，可以提前返回
      if (this.combinationLogic === 'any' && result.result) {
        break;
      }

      // 如果是"all"逻辑且有不满足的条件，可以提前返回
      if (this.combinationLogic === 'all' && !result.result) {
        break;
      }
    }

    return results;
  }

  /**
   * 懒惰评估模式
   */
  private async evaluateLazy(
    conditions: ComplexCondition[],
    context: ConditionEvaluationContext
  ): Promise<FlexibleConditionEvaluationResult[]> {
    // 懒惰评估只评估必要的条件
    // 这里简化实现，实际应该根据组合逻辑优化评估顺序
    return this.evaluateEager(conditions, context);
  }

  /**
   * 并行评估模式
   */
  private async evaluateParallel(
    conditions: ComplexCondition[],
    context: ConditionEvaluationContext
  ): Promise<FlexibleConditionEvaluationResult[]> {
    const maxParallel = Math.min(this.maxParallelEvaluations, conditions.length);
    const results: FlexibleConditionEvaluationResult[] = [];

    // 分批并行评估
    for (let i = 0; i < conditions.length; i += maxParallel) {
      const batch = conditions.slice(i, i + maxParallel);
      const batchPromises = batch.map(condition => 
        this.evaluateComplexCondition(condition, context)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 评估复杂条件
   */
  private async evaluateComplexCondition(
    condition: ComplexCondition,
    context: ConditionEvaluationContext
  ): Promise<FlexibleConditionEvaluationResult> {
    const startTime = Date.now();

    try {
      // 检查缓存
      if (this.cacheEnabled) {
        const cachedResult = this.getCachedResult(condition.conditionId, context.state);
        if (cachedResult !== null) {
          return {
            conditionId: condition.conditionId,
            result: cachedResult.result,
            confidence: cachedResult.confidence,
            evaluationTime: Date.now() - startTime,
            metadata: { cached: true }
          };
        }
      }

      // 根据条件类型评估
      let result: boolean;
      let confidence: number;

      switch (condition.type) {
        case 'simple':
          ({ result, confidence } = this.evaluateSimpleCondition(condition, context));
          break;
        case 'composite':
          const compositeResult = await this.evaluateCompositeCondition(condition, context);
          ({ result, confidence } = compositeResult);
          break;
        case 'function':
          ({ result, confidence } = this.evaluateFunctionCondition(condition, context));
          break;
        case 'script':
          ({ result, confidence } = this.evaluateScriptCondition(condition, context));
          break;
        default:
          result = false;
          confidence = 0;
      }

      // 缓存结果
      if (this.cacheEnabled) {
        this.cacheResult(condition.conditionId, context.state, { result, confidence });
      }

      return {
        conditionId: condition.conditionId,
        result,
        confidence,
        evaluationTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        conditionId: condition.conditionId,
        result: false,
        confidence: 0,
        evaluationTime: Date.now() - startTime,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * 评估简单条件
   */
  private evaluateSimpleCondition(
    condition: ComplexCondition,
    context: ConditionEvaluationContext
  ): { result: boolean; confidence: number } {
    if (!condition.expression) {
      return { result: false, confidence: 0 };
    }

    // 简单的表达式评估
    const expression = condition.expression;
    const parameters = condition.parameters || {};

    // 替换表达式中的变量
    let evaluatedExpression = expression;
    for (const [key, value] of Object.entries(parameters)) {
      evaluatedExpression = evaluatedExpression.replace(
        new RegExp(`\\$\\{${key}\\}`, 'g'),
        String(value)
      );
    }

    // 从状态中获取变量
    for (const [key, value] of Object.entries(context.state.data)) {
      evaluatedExpression = evaluatedExpression.replace(
        new RegExp(`\\$\\{${key}\\}`, 'g'),
        String(value)
      );
    }

    // 简单的表达式评估
    const result = this.evaluateSimpleExpression(evaluatedExpression);
    return { result, confidence: 0.8 }; // 简单条件给予较高置信度
  }

  /**
   * 评估复合条件
   */
  private async evaluateCompositeCondition(
    condition: ComplexCondition,
    context: ConditionEvaluationContext
  ): Promise<{ result: boolean; confidence: number }> {
    if (!condition.conditions || condition.conditions.length === 0) {
      return { result: false, confidence: 0 };
    }

    const operator = condition.operator || 'AND';
    const subResults: { result: boolean; confidence: number }[] = [];

    // 递归评估子条件
    for (const subCondition of condition.conditions) {
      const subResult = await this.evaluateComplexCondition(subCondition, context);
      subResults.push({ result: subResult.result, confidence: subResult.confidence });
    }

    // 根据操作符组合结果
    let result: boolean;
    switch (operator) {
      case 'AND':
        result = subResults.every(r => r.result);
        break;
      case 'OR':
        result = subResults.some(r => r.result);
        break;
      case 'NOT':
        result = !subResults[0]?.result;
        break;
      case 'XOR':
        const trueCount = subResults.filter(r => r.result).length;
        result = trueCount === 1;
        break;
      default:
        result = false;
    }

    // 计算平均置信度
    const confidence = subResults.reduce((sum, r) => sum + r.confidence, 0) / subResults.length;
    return { result, confidence };
  }

  /**
   * 评估函数条件
   */
  private evaluateFunctionCondition(
    condition: ComplexCondition,
    context: ConditionEvaluationContext
  ): { result: boolean; confidence: number } {
    if (!condition.functionName) {
      return { result: false, confidence: 0 };
    }

    // 简化实现：检查状态中是否有对应的函数
    const functions = context.state.getData('functions') as Record<string, Function> || {};
    const func = functions[condition.functionName];

    if (!func || typeof func !== 'function') {
      return { result: false, confidence: 0 };
    }

    try {
      const parameters = condition.parameters || {};
      const result = func(context.state, parameters);
      return { 
        result: Boolean(result), 
        confidence: 0.9 // 函数条件给予高置信度
      };
    } catch (error) {
      return { result: false, confidence: 0 };
    }
  }

  /**
   * 评估脚本条件
   */
  private evaluateScriptCondition(
    condition: ComplexCondition,
    context: ConditionEvaluationContext
  ): { result: boolean; confidence: number } {
    if (!condition.scriptCode) {
      return { result: false, confidence: 0 };
    }

    // 简化实现：不支持脚本执行
    // 在实际应用中，应该使用安全的脚本执行环境
    return { result: false, confidence: 0 };
  }

  /**
   * 组合评估结果
   */
  private combineResults(
    results: FlexibleConditionEvaluationResult[]
  ): { canTraverse: boolean; confidence: number } {
    if (results.length === 0) {
      return { canTraverse: false, confidence: 0 };
    }

    switch (this.combinationLogic) {
      case 'any':
        const anyResult = results.find(r => r.result);
        return {
          canTraverse: !!anyResult,
          confidence: anyResult ? anyResult.confidence : 0
        };
      
      case 'all':
        const allResult = results.every(r => r.result);
        const minConfidence = Math.min(...results.map(r => r.confidence));
        return {
          canTraverse: allResult,
          confidence: allResult ? minConfidence : 0
        };
      
      case 'weighted':
        let totalWeight = 0;
        let weightedSum = 0;
        
        for (const result of results) {
          const condition = this.getCondition(result.conditionId);
          if (condition) {
            totalWeight += condition.weight;
            if (result.result) {
              weightedSum += condition.weight * result.confidence;
            }
          }
        }
        
        return {
          canTraverse: weightedSum > 0,
          confidence: totalWeight > 0 ? weightedSum / totalWeight : 0
        };
      
      case 'custom':
        // 简化实现：使用平均置信度
        const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
        return {
          canTraverse: results.some(r => r.result),
          confidence: avgConfidence
        };
      
      default:
        return { canTraverse: false, confidence: 0 };
    }
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
   * 获取缓存结果
   */
  private getCachedResult(conditionId: string, state: WorkflowState): { result: boolean; confidence: number } | null {
    // 简化的缓存实现
    return null;
  }

  /**
   * 缓存结果
   */
  private cacheResult(conditionId: string, state: WorkflowState, result: { result: boolean; confidence: number }): void {
    // 简化的缓存实现
  }

  /**
   * 验证灵活条件边
   */
  public validateFlexibleConditionalEdge(): string[] {
    const errors: string[] = [];

    if (this.flexibleProps.conditions.length === 0) {
      errors.push('灵活条件边必须至少有一个条件');
    }

    for (const condition of this.flexibleProps.conditions) {
      if (!condition.conditionId) {
        errors.push('条件ID不能为空');
      }
      if (!condition.name) {
        errors.push('条件名称不能为空');
      }
      if (condition.type === 'simple' && !condition.expression) {
        errors.push('简单条件必须有表达式');
      }
      if (condition.type === 'composite' && (!condition.conditions || condition.conditions.length === 0)) {
        errors.push('复合条件必须有子条件');
      }
      if (condition.type === 'function' && !condition.functionName) {
        errors.push('函数条件必须有函数名');
      }
      if (condition.type === 'script' && !condition.scriptCode) {
        errors.push('脚本条件必须有脚本代码');
      }
      if (condition.priority < 0) {
        errors.push('条件优先级不能为负数');
      }
      if (condition.weight < 0) {
        errors.push('条件权重不能为负数');
      }
    }

    // 检查条件ID是否唯一
    const conditionIds = this.flexibleProps.conditions.map(c => c.conditionId);
    const uniqueIds = new Set(conditionIds);
    if (conditionIds.length !== uniqueIds.size) {
      errors.push('条件ID必须唯一');
    }

    if (this.fallbackEnabled && !this.fallbackTarget) {
      errors.push('启用回退时必须指定回退目标');
    }

    if (this.cacheTimeout && this.cacheTimeout <= 0) {
      errors.push('缓存超时时间必须大于0');
    }

    if (this.maxParallelEvaluations <= 0) {
      errors.push('最大并行评估数必须大于0');
    }

    if (this.evaluationTimeout <= 0) {
      errors.push('评估超时时间必须大于0');
    }

    if (this.maxRetries < 0) {
      errors.push('最大重试次数不能为负数');
    }

    return errors;
  }

  /**
   * 验证实体的有效性
   */
  public override validate(): void {
    super.validate();
    
    const flexibleErrors = this.validateFlexibleConditionalEdge();
    if (flexibleErrors.length > 0) {
      throw new DomainError(`灵活条件边验证失败: ${flexibleErrors.join(', ')}`);
    }
  }
}