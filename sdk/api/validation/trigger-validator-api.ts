/**
 * TriggerValidatorAPI - Trigger配置验证API
 * 封装Trigger验证函数，提供Trigger配置验证接口
 */

import {
  validateTriggerCondition,
  validateExecuteTriggeredSubgraphActionConfig,
  validateTriggerAction,
  validateWorkflowTrigger,
  validateTriggerReference,
  validateTriggers
} from '../../core/validation/trigger-validator';
import type {
  TriggerCondition,
  TriggerAction,
  ExecuteTriggeredSubgraphActionConfig,
  WorkflowTrigger,
} from '../../types/trigger';
import type { TriggerReference as TriggerReferenceType } from '../../types/trigger-template';
import type { ValidationResult } from '../../types/errors';
import { ValidationError } from '../../types/errors';

/**
 * TriggerValidatorAPI - Trigger配置验证API
 */
export class TriggerValidatorAPI {
  /**
   * 验证触发条件
   * @param condition 触发条件
   * @param path 字段路径（用于错误路径）
   * @returns 验证结果
   */
  async validateTriggerCondition(condition: TriggerCondition, path: string = 'condition'): Promise<ValidationResult> {
    try {
      validateTriggerCondition(condition, path);
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          valid: false,
          errors: [error],
          warnings: []
        };
      }
      return {
        valid: false,
        errors: [new ValidationError(
          error instanceof Error ? error.message : 'Unknown validation error',
          path
        )],
        warnings: []
      };
    }
  }

  /**
   * 验证触发子工作流动作配置
   * @param config 触发子工作流动作配置
   * @param path 字段路径（用于错误路径）
   * @returns 验证结果
   */
  async validateExecuteTriggeredSubgraphActionConfig(
    config: ExecuteTriggeredSubgraphActionConfig,
    path: string = 'action.parameters'
  ): Promise<ValidationResult> {
    try {
      validateExecuteTriggeredSubgraphActionConfig(config, path);
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          valid: false,
          errors: [error],
          warnings: []
        };
      }
      return {
        valid: false,
        errors: [new ValidationError(
          error instanceof Error ? error.message : 'Unknown validation error',
          path
        )],
        warnings: []
      };
    }
  }

  /**
   * 验证触发动作
   * @param action 触发动作
   * @param path 字段路径（用于错误路径）
   * @returns 验证结果
   */
  async validateTriggerAction(action: TriggerAction, path: string = 'action'): Promise<ValidationResult> {
    try {
      validateTriggerAction(action, path);
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          valid: false,
          errors: [error],
          warnings: []
        };
      }
      return {
        valid: false,
        errors: [new ValidationError(
          error instanceof Error ? error.message : 'Unknown validation error',
          path
        )],
        warnings: []
      };
    }
  }

  /**
   * 验证WorkflowTrigger
   * @param trigger WorkflowTrigger对象
   * @param path 字段路径（用于错误路径）
   * @returns 验证结果
   */
  async validateWorkflowTrigger(trigger: WorkflowTrigger, path: string = 'triggers'): Promise<ValidationResult> {
    try {
      validateWorkflowTrigger(trigger, path);
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          valid: false,
          errors: [error],
          warnings: []
        };
      }
      return {
        valid: false,
        errors: [new ValidationError(
          error instanceof Error ? error.message : 'Unknown validation error',
          path
        )],
        warnings: []
      };
    }
  }

  /**
   * 验证TriggerReference
   * @param reference TriggerReference对象
   * @param path 字段路径（用于错误路径）
   * @returns 验证结果
   */
  async validateTriggerReference(reference: TriggerReferenceType, path: string = 'triggers'): Promise<ValidationResult> {
    try {
      validateTriggerReference(reference, path);
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          valid: false,
          errors: [error],
          warnings: []
        };
      }
      return {
        valid: false,
        errors: [new ValidationError(
          error instanceof Error ? error.message : 'Unknown validation error',
          path
        )],
        warnings: []
      };
    }
  }

  /**
   * 验证触发器数组（包含 WorkflowTrigger 和 TriggerReference）
   * @param triggers 触发器数组
   * @param path 字段路径（用于错误路径）
   * @returns 验证结果
   */
  async validateTriggers(
    triggers: (WorkflowTrigger | TriggerReferenceType)[],
    path: string = 'triggers'
  ): Promise<ValidationResult> {
    try {
      validateTriggers(triggers, path);
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          valid: false,
          errors: [error],
          warnings: []
        };
      }
      return {
        valid: false,
        errors: [new ValidationError(
          error instanceof Error ? error.message : 'Unknown validation error',
          path
        )],
        warnings: []
      };
    }
  }

  /**
   * 批量验证触发器数组（返回所有错误）
   * @param triggers 触发器数组
   * @param path 字段路径（用于错误路径）
   * @returns 验证结果
   */
  async validateTriggersBatch(
    triggers: (WorkflowTrigger | TriggerReferenceType)[],
    path: string = 'triggers'
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (!triggers || !Array.isArray(triggers)) {
      errors.push(new ValidationError('Triggers must be an array', path));
      return {
        valid: false,
        errors,
        warnings: []
      };
    }

    // 检查触发器ID唯一性
    const triggerIds = new Set<string>();
    for (let i = 0; i < triggers.length; i++) {
      const trigger = triggers[i];
      if (!trigger) continue;

      const itemPath = `${path}[${i}]`;

      // 检查ID唯一性
      const triggerId = 'id' in trigger ? trigger.id : trigger.triggerId;
      if (triggerIds.has(triggerId)) {
        errors.push(new ValidationError(`Trigger ID must be unique: ${triggerId}`, `${itemPath}.id`));
        continue;
      }
      triggerIds.add(triggerId);

      // 根据类型验证
      try {
        if ('templateName' in trigger) {
          // TriggerReference
          validateTriggerReference(trigger, itemPath);
        } else {
          // WorkflowTrigger
          validateWorkflowTrigger(trigger, itemPath);
        }
      } catch (error) {
        if (error instanceof ValidationError) {
          errors.push(new ValidationError(
            error.message,
            error.field || itemPath
          ));
        } else {
          errors.push(new ValidationError(
            error instanceof Error ? error.message : 'Unknown validation error',
            itemPath
          ));
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }
}