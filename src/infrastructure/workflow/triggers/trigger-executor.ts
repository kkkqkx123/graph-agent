import { injectable, inject } from 'inversify';
import { TriggerValueObject } from '../../../domain/workflow/value-objects/trigger-value-object';
import { ValueObjectExecutor, FunctionExecutionContext } from '../functions/executors/value-object-executor';
import { ILogger } from '../../../domain/common/types/logger-types';
import { TriggerContext } from './trigger-context';
import { TriggerExecutionResult, TriggerExecutionResultUtils } from './trigger-execution-result';

/**
 * 触发器执行器
 *
 * 职责：
 * - 负责执行触发逻辑判断
 * - 使用 ValueObjectExecutor 调用 TriggerFunction
 * - 返回触发结果
 *
 * 注意：状态管理由 TriggerManager 负责
 */
@injectable()
export class TriggerExecutor {
  constructor(
    @inject('ValueObjectExecutor') private readonly valueObjectExecutor: ValueObjectExecutor,
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 执行触发器检查
   * @param trigger 触发器值对象
   * @param context 触发器上下文
   * @returns 触发执行结果
   */
  async execute(trigger: TriggerValueObject, context: TriggerContext): Promise<TriggerExecutionResult> {
    const startTime = Date.now();

    try {
      this.logger.info('开始执行触发器检查', {
        triggerId: trigger.id.toString(),
        triggerType: trigger.type.toString(),
        triggerName: trigger.name
      });

      // 检查触发器是否可以触发
      if (!trigger.canTrigger()) {
        return TriggerExecutionResultUtils.failure('触发器未启用或已触发').build();
      }

      // 构建函数执行上下文
      const functionContext: FunctionExecutionContext = {
        variables: new Map(Object.entries(context.triggerData || {})),
        getVariable: (key: string) => context.triggerData?.[key],
        setVariable: (key: string, value: any) => {
          if (context.triggerData) {
            context.triggerData[key] = value;
          }
        },
        getNodeResult: (nodeId: string) => context.metadata?.[nodeId],
        setNodeResult: (nodeId: string, result: any) => {
          if (context.metadata) {
            context.metadata[nodeId] = result;
          }
        },
        getExecutionId: () => context.triggerId,
        getWorkflowId: () => context.workflowId.toString()
      };

      // 使用 ValueObjectExecutor 执行触发器
      const shouldTrigger = await this.valueObjectExecutor.executeValueObject(trigger, functionContext);

      const executionTime = Date.now() - startTime;

      if (shouldTrigger) {
        this.logger.info('触发器条件满足', {
          triggerId: trigger.id.toString(),
          triggerName: trigger.name,
          executionTime
        });

        return TriggerExecutionResultUtils.success('触发器条件满足')
          .setData({
            triggerId: trigger.id.toString(),
            triggerType: trigger.type.toString(),
            action: trigger.action.toString(),
            targetNodeId: trigger.targetNodeId?.toString()
          })
          .build();
      } else {
        this.logger.info('触发器条件不满足', {
          triggerId: trigger.id.toString(),
          triggerName: trigger.name,
          executionTime
        });

        return TriggerExecutionResultUtils.failure('触发器条件不满足').build();
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('触发器执行失败', error instanceof Error ? error : new Error(String(error)), {
        triggerId: trigger.id.toString(),
        triggerName: trigger.name,
        executionTime
      });

      return TriggerExecutionResultUtils.failure('触发器执行失败', error as Error).build();
    }
  }

  /**
   * 批量执行触发器检查
   * @param triggers 触发器值对象列表
   * @param context 触发器上下文
   * @returns 触发执行结果列表
   */
  async executeBatch(triggers: TriggerValueObject[], context: TriggerContext): Promise<TriggerExecutionResult[]> {
    const results: TriggerExecutionResult[] = [];

    for (const trigger of triggers) {
      try {
        const result = await this.execute(trigger, context);
        results.push(result);
      } catch (error) {
        results.push(
          TriggerExecutionResultUtils.failure('触发器执行异常', error as Error).build()
        );
      }
    }

    return results;
  }

  /**
   * 验证触发器配置
   * @param trigger 触发器值对象
   * @returns 验证结果
   */
  validateTrigger(trigger: TriggerValueObject): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      trigger.validate();
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}