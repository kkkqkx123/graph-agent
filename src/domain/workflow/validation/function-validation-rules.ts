/**
 * 函数验证规则定义
 * 定义函数配置、参数、返回值等的验证规则
 */

import {
  IWorkflowFunction,
  WorkflowFunctionType,
  FunctionParameter,
  ValidationResult
} from '../interfaces/workflow-functions';
import { IExecutionContext } from '../execution/execution-context.interface';

/**
 * 验证规则类型
 */
export enum ValidationRuleType {
  REQUIRED = 'required',
  TYPE_CHECK = 'type_check',
  RANGE_CHECK = 'range_check',
  PATTERN_CHECK = 'pattern_check',
  CUSTOM = 'custom'
}

/**
 * 验证规则定义
 */
export interface FunctionValidationRule {
  type: ValidationRuleType;
  field: string;
  message: string;
  validator: (value: any, context?: any) => boolean;
}

/**
 * 函数验证规则集合
 */
export class FunctionValidationRules {
  /**
   * 获取基础验证规则
   */
  static getBaseValidationRules(): FunctionValidationRule[] {
    return [
      {
        type: ValidationRuleType.REQUIRED,
        field: 'id',
        message: '函数ID是必需的',
        validator: (value: any) => value && typeof value === 'string' && value.trim().length > 0
      },
      {
        type: ValidationRuleType.REQUIRED,
        field: 'name',
        message: '函数名称是必需的',
        validator: (value: any) => value && typeof value === 'string' && value.trim().length > 0
      },
      {
        type: ValidationRuleType.REQUIRED,
        field: 'description',
        message: '函数描述是必需的',
        validator: (value: any) => value && typeof value === 'string' && value.trim().length > 0
      },
      {
        type: ValidationRuleType.REQUIRED,
        field: 'version',
        message: '函数版本是必需的',
        validator: (value: any) => value && typeof value === 'string' && value.trim().length > 0
      },
      {
        type: ValidationRuleType.PATTERN_CHECK,
        field: 'version',
        message: '函数版本格式应为 x.y.z',
        validator: (value: any) => /^\d+\.\d+\.\d+$/.test(value)
      }
    ];
  }

  /**
   * 获取参数验证规则
   */
  static getParameterValidationRules(): FunctionValidationRule[] {
    return [
      {
        type: ValidationRuleType.REQUIRED,
        field: 'parameters',
        message: '参数定义是必需的',
        validator: (value: any) => Array.isArray(value)
      },
      {
        type: ValidationRuleType.CUSTOM,
        field: 'parameters',
        message: '参数定义必须包含name、type、required字段',
        validator: (value: any) => {
          if (!Array.isArray(value)) return false;
          return value.every((param: FunctionParameter) => 
            param.name && 
            param.type && 
            typeof param.required === 'boolean'
          );
        }
      }
    ];
  }

  /**
   * 获取函数类型特定验证规则
   */
  static getTypeSpecificValidationRules(functionType: WorkflowFunctionType): FunctionValidationRule[] {
    switch (functionType) {
      case WorkflowFunctionType.CONDITION:
        return [
          {
            type: ValidationRuleType.CUSTOM,
            field: 'returnType',
            message: '条件函数的返回类型必须是boolean',
            validator: (value: any) => value === 'boolean'
          }
        ];

      case WorkflowFunctionType.NODE:
        return [
          {
            type: ValidationRuleType.CUSTOM,
            field: 'isAsync',
            message: '节点函数应该是异步的',
            validator: (value: any) => value === true
          }
        ];

      case WorkflowFunctionType.ROUTING:
        return [
          {
            type: ValidationRuleType.CUSTOM,
            field: 'returnType',
            message: '路由函数的返回类型必须是string或string[]',
            validator: (value: any) => value === 'string' || value === 'string | string[]'
          }
        ];

      case WorkflowFunctionType.TRIGGER:
        return [
          {
            type: ValidationRuleType.CUSTOM,
            field: 'returnType',
            message: '触发器函数的返回类型必须是boolean',
            validator: (value: any) => value === 'boolean'
          }
        ];

      default:
        return [];
    }
  }

  /**
   * 获取配置验证规则
   */
  static getConfigValidationRules(functionType: WorkflowFunctionType): FunctionValidationRule[] {
    const baseRules = [
      {
        type: ValidationRuleType.CUSTOM,
        field: 'config',
        message: '配置必须是对象类型',
        validator: (value: any) => !value || typeof value === 'object'
      }
    ];

    switch (functionType) {
      case WorkflowFunctionType.NODE:
        return [
          ...baseRules,
          {
            type: ValidationRuleType.CUSTOM,
            field: 'config.timeout',
            message: '超时时间必须是正数',
            validator: (value: any) => !value || (typeof value === 'number' && value > 0)
          }
        ];

      case WorkflowFunctionType.CONDITION:
        return [
          ...baseRules,
          {
            type: ValidationRuleType.CUSTOM,
            field: 'config.strictMode',
            message: '严格模式必须是布尔值',
            validator: (value: any) => value === undefined || typeof value === 'boolean'
          }
        ];

      default:
        return baseRules;
    }
  }

  /**
   * 获取安全验证规则
   */
  static getSecurityValidationRules(): FunctionValidationRule[] {
    return [
      {
        type: ValidationRuleType.CUSTOM,
        field: 'permissions',
        message: '权限配置必须是数组',
        validator: (value: any) => !value || Array.isArray(value)
      },
      {
        type: ValidationRuleType.CUSTOM,
        field: 'resourceLimits',
        message: '资源限制必须是对象',
        validator: (value: any) => !value || typeof value === 'object'
      }
    ];
  }
}

/**
 * 函数验证器
 */
export class FunctionValidator {
  /**
   * 验证函数定义
   */
  static validateFunction(functionDef: IWorkflowFunction): ValidationResult {
    const errors: string[] = [];

    // 基础验证
    const baseRules = FunctionValidationRules.getBaseValidationRules();
    errors.push(...this.validateRules(functionDef, baseRules));

    // 参数验证
    const paramRules = FunctionValidationRules.getParameterValidationRules();
    errors.push(...this.validateRules(functionDef, paramRules));

    // 类型特定验证
    const typeRules = FunctionValidationRules.getTypeSpecificValidationRules(functionDef.type);
    errors.push(...this.validateRules(functionDef, typeRules));

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证函数配置
   */
  static validateConfig(functionDef: IWorkflowFunction, config: any): ValidationResult {
    const errors: string[] = [];
    const configRules = FunctionValidationRules.getConfigValidationRules(functionDef.type);
    
    errors.push(...this.validateRules({ config }, configRules));

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证函数参数
   */
  static validateParameters(functionDef: IWorkflowFunction, parameters: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const functionParams = functionDef.getParameters();

    // 检查必需参数
    for (const param of functionParams) {
      if (param.required && (parameters === undefined || parameters[param.name] === undefined)) {
        errors.push(`必需参数 '${param.name}' 缺失`);
      }
    }

    // 检查参数类型
    if (parameters) {
      for (const [key, value] of Object.entries(parameters)) {
        const paramDef = functionParams.find(p => p.name === key);
        if (paramDef && !this.validateType(value, paramDef.type)) {
          errors.push(`参数 '${key}' 类型错误，期望 ${paramDef.type}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证函数兼容性
   */
  static validateCompatibility(function1: IWorkflowFunction, function2: IWorkflowFunction): ValidationResult {
    const errors: string[] = [];

    // 检查类型兼容性
    if (function1.type !== function2.type) {
      errors.push(`函数类型不兼容: ${function1.type} vs ${function2.type}`);
    }

    // 检查参数兼容性
    const params1 = function1.getParameters();
    const params2 = function2.getParameters();
    
    if (params1.length !== params2.length) {
      errors.push('参数数量不匹配');
    } else {
      for (let i = 0; i < params1.length; i++) {
        if (params1[i] && params2[i] && params1[i]!.type !== params2[i]!.type) {
          errors.push(`参数 ${i} 类型不匹配: ${params1[i]!.type} vs ${params2[i]!.type}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 执行验证规则
   */
  private static validateRules(target: any, rules: FunctionValidationRule[]): string[] {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = this.getNestedValue(target, rule.field);
      if (!rule.validator(value, target)) {
        errors.push(rule.message);
      }
    }

    return errors;
  }

  /**
   * 获取嵌套对象值
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * 验证类型
   */
  private static validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null;
      case 'array':
        return Array.isArray(value);
      case 'any':
        return true;
      default:
        return true; // 复杂类型暂不验证
    }
  }
}