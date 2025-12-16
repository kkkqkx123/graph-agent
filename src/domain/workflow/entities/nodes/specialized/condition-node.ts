import { Node, NodeProps, NodePosition } from '@domain/workflow/entities/nodes/base/node';
import { ID } from '@domain/common/value-objects/id';
import { NodeType } from '@/domain/workflow/value-objects/node-type';
import { WorkflowState } from '@domain/workflow/entities/workflow-state';
import { Timestamp } from '@domain/common/value-objects/timestamp';
import { Version } from '@domain/common/value-objects/version';
import { DomainError } from '@domain/common/errors/domain-error';

/**
 * 条件配置接口
 */
export interface ConditionConfig {
  conditionId: string;
  name: string;
  description?: string;
  expression: string;
  nextNodeId: ID;
  priority: number;
  enabled: boolean;
  parameters?: Record<string, unknown>;
}

/**
 * 条件评估结果接口
 */
export interface ConditionEvaluationResult {
  conditionMet: boolean;
  condition?: ConditionConfig;
  nextNodeId?: ID;
  evaluationTime: number;
  error?: Error;
  metadata?: Record<string, unknown>;
}

/**
 * 条件节点属性接口
 */
export interface ConditionNodeProps extends NodeProps {
  conditions: ConditionConfig[];
  defaultNextNodeId?: ID;
}

/**
 * 条件节点实体
 * 
 * 表示根据状态进行条件判断和路由决策的节点
 */
export class ConditionNode extends Node {
  private readonly conditionProps: ConditionNodeProps;

  private constructor(props: ConditionNodeProps) {
    super(props);
    this.conditionProps = Object.freeze(props);
  }

  /**
   * 创建条件节点
   */
  public static override create(
    graphId: ID,
    type: NodeType,
    name?: string,
    description?: string,
    position?: NodePosition,
    properties?: Record<string, unknown>,
    conditions?: ConditionConfig[],
    defaultNextNodeId?: ID
  ): ConditionNode {
    const now = Timestamp.now();
    const nodeId = ID.generate();

    const nodeProps: NodeProps = {
      id: nodeId,
      graphId,
      type,
      name,
      description,
      position,
      properties: properties || {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false
    };

    const props: ConditionNodeProps = {
      ...nodeProps,
      conditions: conditions || [],
      defaultNextNodeId
    };

    return new ConditionNode(props);
  }

  /**
   * 从已有属性重建条件节点
   */
  public static override fromProps(props: ConditionNodeProps): ConditionNode {
    return new ConditionNode(props);
  }

  /**
   * 获取条件列表
   */
  public get conditions(): ConditionConfig[] {
    return [...this.conditionProps.conditions];
  }

  /**
   * 获取默认下一个节点ID
   */
  public get defaultNextNodeId(): ID | undefined {
    return this.conditionProps.defaultNextNodeId;
  }

  /**
   * 添加条件
   */
  public addCondition(condition: ConditionConfig): ConditionNode {
    if (this.hasCondition(condition.conditionId)) {
      throw new DomainError(`条件ID已存在: ${condition.conditionId}`);
    }

    const newConditions = [...this.conditionProps.conditions, condition];
    return new ConditionNode({
      ...this.conditionProps,
      conditions: newConditions,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 移除条件
   */
  public removeCondition(conditionId: string): ConditionNode {
    const newConditions = this.conditionProps.conditions.filter(
      c => c.conditionId !== conditionId
    );

    if (newConditions.length === this.conditionProps.conditions.length) {
      throw new DomainError(`条件不存在: ${conditionId}`);
    }

    return new ConditionNode({
      ...this.conditionProps,
      conditions: newConditions,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 更新条件
   */
  public updateCondition(conditionId: string, updates: Partial<ConditionConfig>): ConditionNode {
    const conditionIndex = this.conditionProps.conditions.findIndex(
      c => c.conditionId === conditionId
    );

    if (conditionIndex === -1) {
      throw new DomainError(`条件不存在: ${conditionId}`);
    }

    const newConditions = [...this.conditionProps.conditions];
    // 确保 conditionId 不被更新
    const { conditionId: _, ...safeUpdates } = updates;
    // 确保 conditionId 不为 undefined
    const originalCondition = newConditions[conditionIndex];
    if (!originalCondition) {
      throw new DomainError(`条件不存在: ${conditionId}`);
    }
    const updatedCondition: ConditionConfig = {
      ...originalCondition,
      ...safeUpdates,
      conditionId: originalCondition.conditionId // 确保 conditionId 始终是字符串
    };
    newConditions[conditionIndex] = updatedCondition;

    return new ConditionNode({
      ...this.conditionProps,
      conditions: newConditions,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置默认下一个节点
   */
  public setDefaultNextNodeId(nextNodeId: ID): ConditionNode {
    return new ConditionNode({
      ...this.conditionProps,
      defaultNextNodeId: nextNodeId,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 清除默认下一个节点
   */
  public clearDefaultNextNodeId(): ConditionNode {
    return new ConditionNode({
      ...this.conditionProps,
      defaultNextNodeId: undefined,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 检查是否有指定条件
   */
  public hasCondition(conditionId: string): boolean {
    return this.conditionProps.conditions.some(c => c.conditionId === conditionId);
  }

  /**
   * 获取条件
   */
  public getCondition(conditionId: string): ConditionConfig | undefined {
    return this.conditionProps.conditions.find(c => c.conditionId === conditionId);
  }

  /**
   * 获取启用的条件
   */
  public getEnabledConditions(): ConditionConfig[] {
    return this.conditionProps.conditions.filter(c => c.enabled);
  }

  /**
   * 启用条件
   */
  public enableCondition(conditionId: string): ConditionNode {
    return this.updateCondition(conditionId, { enabled: true });
  }

  /**
   * 禁用条件
   */
  public disableCondition(conditionId: string): ConditionNode {
    return this.updateCondition(conditionId, { enabled: false });
  }

  /**
   * 评估条件
   */
  public evaluateConditions(state: WorkflowState): ConditionEvaluationResult {
    const startTime = Date.now();
    const enabledConditions = this.getEnabledConditions().sort((a, b) => b.priority - a.priority);

    try {
      for (const condition of enabledConditions) {
        const result = this.evaluateCondition(condition, state);
        if (result) {
          return {
            conditionMet: true,
            condition,
            nextNodeId: condition.nextNodeId,
            evaluationTime: Date.now() - startTime,
            metadata: {
              evaluatedConditions: 1,
              matchedCondition: condition.conditionId
            }
          };
        }
      }

      return {
        conditionMet: false,
        nextNodeId: this.conditionProps.defaultNextNodeId,
        evaluationTime: Date.now() - startTime,
        metadata: {
          evaluatedConditions: enabledConditions.length,
          matchedCondition: null
        }
      };
    } catch (error) {
      return {
        conditionMet: false,
        evaluationTime: Date.now() - startTime,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          evaluatedConditions: enabledConditions.length,
          error: true
        }
      };
    }
  }

  /**
   * 评估单个条件
   */
  private evaluateCondition(condition: ConditionConfig, state: WorkflowState): boolean {
    try {
      // 简单的条件评估实现
      // 在实际应用中，这里应该使用更复杂的表达式解析器
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
      for (const [key, value] of Object.entries(state.data)) {
        evaluatedExpression = evaluatedExpression.replace(
          new RegExp(`\\$\\{${key}\\}`, 'g'),
          String(value)
        );
      }

      // 简单的表达式评估（仅支持基本的比较操作）
      return this.evaluateSimpleExpression(evaluatedExpression);
    } catch (error) {
      throw new DomainError(`条件评估失败: ${error}`);
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
   * 验证条件节点
   */
  public validateConditions(): string[] {
    const errors: string[] = [];

    if (this.conditionProps.conditions.length === 0) {
      errors.push('条件节点必须至少有一个条件');
    }

    for (const condition of this.conditionProps.conditions) {
      if (!condition.conditionId) {
        errors.push('条件ID不能为空');
      }
      if (!condition.name) {
        errors.push('条件名称不能为空');
      }
      if (!condition.expression) {
        errors.push('条件表达式不能为空');
      }
      if (!condition.nextNodeId) {
        errors.push('条件的下一个节点ID不能为空');
      }
      if (condition.priority < 0) {
        errors.push('条件优先级不能为负数');
      }
    }

    // 检查条件ID是否唯一
    const conditionIds = this.conditionProps.conditions.map(c => c.conditionId);
    const uniqueIds = new Set(conditionIds);
    if (conditionIds.length !== uniqueIds.size) {
      errors.push('条件ID必须唯一');
    }

    return errors;
  }

  /**
   * 验证实体的有效性
   */
  public override validate(): void {
    super.validate();

    const conditionErrors = this.validateConditions();
    if (conditionErrors.length > 0) {
      throw new DomainError(`条件节点验证失败: ${conditionErrors.join(', ')}`);
    }
  }
}