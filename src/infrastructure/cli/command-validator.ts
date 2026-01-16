/**
 * 命令参数验证器
 *
 * 职责：
 * - 验证命令参数
 * - 检查参数类型
 * - 提供验证错误信息
 */

import { ParsedCommand } from './command-parser';

/**
 * 验证规则
 */
export interface ValidationRule {
  /** 参数名称 */
  name: string;
  /** 是否必需 */
  required?: boolean;
  /** 参数类型 */
  type?: 'string' | 'number' | 'boolean' | 'array';
  /** 允许的值 */
  allowedValues?: string[];
  /** 正则表达式验证 */
  pattern?: RegExp;
  /** 最小值（数字） */
  min?: number;
  /** 最大值（数字） */
  max?: number;
  /** 最小长度（字符串或数组） */
  minLength?: number;
  /** 最大长度（字符串或数组） */
  maxLength?: number;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean;
  /** 错误信息 */
  errors: string[];
}

/**
 * 命令参数验证器
 */
export class CommandValidator {
  /**
   * 验证命令
   *
   * @param command 解析后的命令
   * @param rules 验证规则
   * @returns 验证结果
   */
  validate(command: ParsedCommand, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = command.options.get(rule.name) ?? command.args.find((_, i) => i === 0);

      // 检查必需参数
      if (rule.required && value === undefined) {
        errors.push(`参数 --${rule.name} 是必需的`);
        continue;
      }

      // 如果参数不存在且不是必需的，跳过验证
      if (value === undefined) {
        continue;
      }

      // 类型验证
      if (rule.type) {
        const typeError = this.validateType(rule.name, value, rule.type);
        if (typeError) {
          errors.push(typeError);
          continue;
        }
      }

      // 允许值验证
      if (rule.allowedValues && rule.allowedValues.length > 0) {
        if (!rule.allowedValues.includes(String(value))) {
          errors.push(
            `参数 --${rule.name} 的值必须是以下之一: ${rule.allowedValues.join(', ')}`
          );
        }
      }

      // 正则表达式验证
      if (rule.pattern) {
        if (!rule.pattern.test(String(value))) {
          errors.push(`参数 --${rule.name} 的格式不正确`);
        }
      }

      // 数值范围验证
      if (rule.type === 'number') {
        const numValue = Number(value);
        if (rule.min !== undefined && numValue < rule.min) {
          errors.push(`参数 --${rule.name} 的值不能小于 ${rule.min}`);
        }
        if (rule.max !== undefined && numValue > rule.max) {
          errors.push(`参数 --${rule.name} 的值不能大于 ${rule.max}`);
        }
      }

      // 长度验证
      if (rule.minLength !== undefined || rule.maxLength !== undefined) {
        const strValue = String(value);
        if (rule.minLength !== undefined && strValue.length < rule.minLength) {
          errors.push(`参数 --${rule.name} 的长度不能小于 ${rule.minLength}`);
        }
        if (rule.maxLength !== undefined && strValue.length > rule.maxLength) {
          errors.push(`参数 --${rule.name} 的长度不能大于 ${rule.maxLength}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证参数类型
   *
   * @param name 参数名称
   * @param value 参数值
   * @param type 期望类型
   * @returns 错误信息或null
   */
  private validateType(name: string, value: string | boolean, type: string): string | null {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return `参数 --${name} 必须是字符串类型`;
        }
        break;
      case 'number':
        if (isNaN(Number(value))) {
          return `参数 --${name} 必须是数字类型`;
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          return `参数 --${name} 必须是布尔类型`;
        }
        break;
      case 'array':
        if (typeof value !== 'string') {
          return `参数 --${name} 必须是数组类型（逗号分隔的字符串）`;
        }
        break;
      default:
        return `参数 --${name} 的类型 ${type} 不支持`;
    }

    return null;
  }

  /**
   * 验证命令名称
   *
   * @param command 解析后的命令
   * @param allowedCommands 允许的命令列表
   * @returns 验证结果
   */
  validateCommand(command: ParsedCommand, allowedCommands: string[]): ValidationResult {
    const errors: string[] = [];

    if (!allowedCommands.includes(command.command)) {
      errors.push(
        `未知的命令: ${command.command}。允许的命令: ${allowedCommands.join(', ')}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证子命令名称
   *
   * @param command 解析后的命令
   * @param allowedSubCommands 允许的子命令列表
   * @returns 验证结果
   */
  validateSubCommand(command: ParsedCommand, allowedSubCommands: string[]): ValidationResult {
    const errors: string[] = [];

    if (command.subCommand && !allowedSubCommands.includes(command.subCommand)) {
      errors.push(
        `未知的子命令: ${command.subCommand}。允许的子命令: ${allowedSubCommands.join(', ')}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证位置参数数量
   *
   * @param command 解析后的命令
   * @param min 最小数量
   * @param max 最大数量
   * @returns 验证结果
   */
  validateArgCount(command: ParsedCommand, min: number, max?: number): ValidationResult {
    const errors: string[] = [];
    const argCount = command.args.length;

    if (argCount < min) {
      errors.push(`至少需要 ${min} 个位置参数，但只提供了 ${argCount} 个`);
    }

    if (max !== undefined && argCount > max) {
      errors.push(`最多需要 ${max} 个位置参数，但提供了 ${argCount} 个`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}