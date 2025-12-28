import { injectable, inject } from 'inversify';
import { ValueObject } from '../../../../domain/common/value-objects/value-object';
import { NodeValueObject, EdgeValueObject } from '../../../../domain/workflow/value-objects';
import { TriggerValueObject } from '../../../../domain/workflow/value-objects/trigger-value-object';
import { HookValueObject } from '../../../../domain/workflow/value-objects/hook-value-object';
import { FunctionRegistry } from '../registry/function-registry';
import { FunctionExecutor, FunctionExecutionConfig } from './function-executor';
import { ILogger } from '../../../../domain/common/types/logger-types';
import { ValidationResult } from '../base/base-workflow-function';

/**
 * 函数执行上下文接口
 */
export interface FunctionExecutionContext {
  workflowId: string;
  executionId: string;
  variables: Map<string, any>;
  getVariable(key: string): any;
  setVariable(key: string, value: any): void;
  getNodeResult(nodeId: string): any;
  setNodeResult(nodeId: string, result: any): void;
}

/**
 * 执行记录接口
 */
export interface ExecutionRecord {
  valueObjectType: string;
  functionName: string;
  success: boolean;
  executionTime: number;
  timestamp: number;
  error?: string;
}

/**
 * 执行统计信息接口
 */
export interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  executionHistory: ExecutionRecord[];
}

/**
 * 值对象执行器接口
 */
export interface IValueObjectExecutor {
  /**
   * 执行单个值对象
   * @param valueObject 值对象
   * @param context 执行上下文
   * @returns 执行结果
   */
  executeValueObject(valueObject: ValueObject<any>, context: FunctionExecutionContext): Promise<any>;

  /**
   * 批量执行值对象
   * @param valueObjects 值对象列表
   * @param context 执行上下文
   * @returns 执行结果列表
   */
  executeBatch(valueObjects: ValueObject<any>[], context: FunctionExecutionContext): Promise<any[]>;

  /**
   * 验证值对象与函数的映射关系
   * @param valueObject 值对象
   * @returns 验证结果
   */
  validateMapping(valueObject: ValueObject<any>): ValidationResult;

  /**
   * 获取执行统计信息
   * @returns 执行统计信息
   */
  getExecutionStats(): ExecutionStats;

  /**
   * 重置执行统计信息
   */
  resetStats(): void;
}

/**
 * 值对象执行器实现
 */
@injectable()
export class ValueObjectExecutor implements IValueObjectExecutor {
  private stats: ExecutionStats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageExecutionTime: 0,
    executionHistory: []
  };

  constructor(
    @inject('FunctionRegistry') private readonly registry: FunctionRegistry,
    @inject('FunctionExecutor') private readonly functionExecutor: FunctionExecutor,
    @inject('Logger') private readonly logger: ILogger
  ) { }

  async executeValueObject(valueObject: ValueObject<any>, context: FunctionExecutionContext): Promise<any> {
    const startTime = Date.now();

    try {
      // 1. 验证映射关系
      const validation = this.validateMapping(valueObject);
      if (!validation.valid) {
        throw new Error(`映射验证失败: ${validation.errors.join(', ')}`);
      }

      // 2. 获取对应的函数
      const func = this.registry.getFunctionByValueObject(valueObject);
      if (!func) {
        throw new Error(`未找到值对象类型 ${this.getValueObjectType(valueObject)} 对应的函数`);
      }

      // 3. 提取配置数据
      const config = this.extractConfigFromValueObject(valueObject);

      // 4. 执行函数
      const executionConfig: FunctionExecutionConfig = {
        strategy: 'sequential',
        errorHandling: 'fail-fast'
      };

      const results = await this.functionExecutor.execute({
        functions: [{ function: func, config }],
        context: context.variables,
        executionConfig
      });

      const executionTime = Date.now() - startTime;

      // 更新统计信息
      this.updateStats(this.getValueObjectType(valueObject), func.name, true, executionTime);

      this.logger.info('值对象执行完成', {
        valueObjectType: this.getValueObjectType(valueObject),
        functionName: func.name,
        executionTime,
        success: true
      });

      return results[0]?.result;

    } catch (error) {
      const executionTime = Date.now() - startTime;

      // 更新统计信息
      this.updateStats(
        this.getValueObjectType(valueObject),
        'unknown',
        false,
        executionTime,
        error instanceof Error ? error.message : String(error)
      );

      this.logger.error('值对象执行失败', error instanceof Error ? error : new Error(String(error)), {
        valueObjectType: this.getValueObjectType(valueObject),
        executionTime,
        success: false
      });

      throw error;
    }
  }

  async executeBatch(valueObjects: ValueObject<any>[], context: FunctionExecutionContext): Promise<any[]> {
    const results: any[] = [];

    for (const valueObject of valueObjects) {
      try {
        const result = await this.executeValueObject(valueObject, context);
        results.push(result);
      } catch (error) {
        results.push({ error: error instanceof Error ? error.message : String(error) });
      }
    }

    return results;
  }

  validateMapping(valueObject: ValueObject<any>): ValidationResult {
    const valueObjectType = this.getValueObjectType(valueObject);
    const functionName = this.registry.getValueObjectTypeMapping().get(valueObjectType);

    const errors: string[] = [];

    if (!functionName) {
      errors.push(`值对象类型 ${valueObjectType} 未配置映射关系`);
    } else {
      const func = this.registry.getFunctionByName(functionName);
      if (!func) {
        errors.push(`映射的函数 ${functionName} 不存在`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getExecutionStats(): ExecutionStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      executionHistory: []
    };
  }

  private extractConfigFromValueObject(valueObject: ValueObject<any>): any {
    if (valueObject instanceof NodeValueObject) {
      return {
        ...valueObject.properties,
        _metadata: {
          nodeId: valueObject.id.toString(),
          nodeType: valueObject.type.toString(),
          nodeName: valueObject.name
        }
      };
    } else if (valueObject instanceof EdgeValueObject) {
      return {
        ...valueObject.properties,
        condition: valueObject.condition,
        _metadata: {
          edgeId: valueObject.id.toString(),
          edgeType: valueObject.type.toString(),
          fromNodeId: valueObject.fromNodeId.toString(),
          toNodeId: valueObject.toNodeId.toString()
        }
      };
    } else if (valueObject instanceof TriggerValueObject) {
      return {
        ...valueObject.config,
        _metadata: {
          triggerId: valueObject.id.toString(),
          triggerType: valueObject.type.toString(),
          triggerName: valueObject.name,
          action: valueObject.action.toString()
        }
      };
    } else if (valueObject instanceof HookValueObject) {
      return {
        ...valueObject.config,
        _metadata: {
          hookId: valueObject.id.toString(),
          hookPoint: valueObject.hookPoint.toString(),
          hookName: valueObject.name,
          priority: valueObject.priority,
          enabled: valueObject.enabled
        }
      };
    }

    return {};
  }

  private getValueObjectType(valueObject: ValueObject<any>): string {
    if (valueObject instanceof NodeValueObject) {
      return `node_${valueObject.type.toString()}`;
    } else if (valueObject instanceof EdgeValueObject) {
      return `edge_${valueObject.type.toString()}`;
    } else if (valueObject instanceof TriggerValueObject) {
      return `trigger_${valueObject.type.toString()}`;
    } else if (valueObject instanceof HookValueObject) {
      return `hook_${valueObject.hookPoint.toString()}`;
    }
    return 'unknown';
  }

  private updateStats(
    valueObjectType: string,
    functionName: string,
    success: boolean,
    executionTime: number,
    error?: string
  ): void {
    this.stats.totalExecutions++;

    if (success) {
      this.stats.successfulExecutions++;
    } else {
      this.stats.failedExecutions++;
    }

    // 计算平均执行时间
    const totalTime = this.stats.executionHistory.reduce((sum, record) => sum + record.executionTime, 0);
    this.stats.averageExecutionTime = (totalTime + executionTime) / this.stats.totalExecutions;

    // 添加执行记录
    const record: ExecutionRecord = {
      valueObjectType,
      functionName,
      success,
      executionTime,
      timestamp: Date.now(),
      error
    };

    this.stats.executionHistory.push(record);

    // 限制历史记录数量
    if (this.stats.executionHistory.length > 1000) {
      this.stats.executionHistory.shift();
    }
  }
}