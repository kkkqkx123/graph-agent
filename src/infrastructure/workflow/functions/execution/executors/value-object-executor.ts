import { injectable } from 'inversify';
import { BaseWorkflowFunction, WorkflowExecutionContext } from '../../base/base-workflow-function';
import { ValueObject } from '../../../../../domain/common/value-objects/value-object';
import { NodeValueObject } from '../../../../../domain/workflow/value-objects';
import { EdgeValueObject } from '../../../../../domain/workflow/value-objects/edge/edge-value-object';
import { TriggerValueObject } from '../../../../../domain/workflow/value-objects/trigger-value-object';
import { HookValueObject } from '../../../../../domain/workflow/value-objects/hook-value-object';
import { FunctionRegistry } from '../registry/function-registry';
import { ILogger } from '../../../../../domain/common/types/logger-types';

/**
 * 函数执行上下文接口
 */
interface FunctionExecutionContext extends WorkflowExecutionContext {
  variables: Map<string, any>;
}

/**
 * 值对象执行器
 * 负责将值对象映射到函数并执行
 */
@injectable()
export class ValueObjectExecutor {
  constructor(
    private registry: FunctionRegistry,
    private logger: ILogger
  ) { }

  /**
   * 执行值对象
   * @param valueObject 值对象
   * @param context 执行上下文
   * @returns 执行结果
   */
  async executeValueObject(valueObject: ValueObject<any>, context: WorkflowExecutionContext): Promise<any> {
    // 获取对应的函数
    const func = this.registry.getFunctionByValueObject(valueObject);

    if (!func) {
      throw new Error(`未找到值对象 ${valueObject.constructor.name} 对应的函数`);
    }

    // 构建配置
    const config = this.buildConfig(valueObject);

    // 执行函数
    this.logger.debug(`执行函数: ${func.name}`, { valueObject: valueObject.constructor.name });

    const result = await func.execute(context, config);

    this.logger.debug(`函数执行完成: ${func.name}`, { result });

    return result;
  }

  /**
   * 批量执行值对象
   * @param valueObjects 值对象列表
   * @param context 执行上下文
   * @returns 执行结果列表
   */
  async executeValueObjects(valueObjects: ValueObject<any>[], context: WorkflowExecutionContext): Promise<any[]> {
    const results: any[] = [];

    for (const valueObject of valueObjects) {
      const result = await this.executeValueObject(valueObject, context);
      results.push(result);
    }

    return results;
  }

  /**
   * 构建配置对象
   * @param valueObject 值对象
   * @returns 配置对象
   */
  private buildConfig(valueObject: ValueObject<any>): any {
    const config: any = {};

    // 根据值对象类型构建配置
    if (valueObject instanceof NodeValueObject) {
      config.nodeId = valueObject.id.toString();
      config.nodeType = valueObject.type.toString();
      config.properties = valueObject.properties;
    } else if (valueObject instanceof EdgeValueObject) {
      config.edgeId = valueObject.id.toString();
      config.fromNodeId = valueObject.fromNodeId.toString();
      config.toNodeId = valueObject.toNodeId.toString();
      config.properties = valueObject.properties;
    } else if (valueObject instanceof TriggerValueObject) {
      config.triggerId = valueObject.id.toString();
      config.triggerType = valueObject.type.toString();
      // TriggerValueObject没有properties属性，使用其他属性
      config.action = valueObject.action?.toString();
      config.targetNodeId = valueObject.targetNodeId?.toString();
    } else if (valueObject instanceof HookValueObject) {
      config.hookId = valueObject.id.toString();
      config.hookPoint = valueObject.hookPoint.toString();
      config.config = valueObject.config;
    }

    return config;
  }

  /**
   * 获取执行统计信息
   * @returns 统计信息
   */
  getStats(): { totalExecutions: number; successRate: number } {
    // TODO: 实现执行统计
    return {
      totalExecutions: 0,
      successRate: 0
    };
  }
}