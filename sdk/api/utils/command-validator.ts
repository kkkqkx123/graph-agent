/**
 * CommandValidator - 命令参数验证工具类
 * 
 * 提供链式API来验证命令参数
 * 简化验证逻辑，减少重复代码
 */

import type { CommandValidationResult } from '../types/command';
import { validationSuccess, validationFailure } from '../types/command';

/**
 * 命令验证器
 * 提供链式验证方法
 */
export class CommandValidator {
  private errors: string[] = [];

  /**
   * 验证值不为空
   * @param value 要验证的值
   * @param fieldName 字段名称
   * @returns this
   */
  notEmpty(value: any, fieldName: string): this {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim().length === 0)) {
      this.errors.push(`${fieldName}不能为空`);
    }
    return this;
  }

  /**
   * 验证数组不为空
   * @param array 要验证的数组
   * @param fieldName 字段名称
   * @returns this
   */
  notEmptyArray(array: any[], fieldName: string): this {
    if (!array || array.length === 0) {
      this.errors.push(`${fieldName}不能为空`);
    }
    return this;
  }

  /**
   * 验证数字在指定范围内
   * @param value 要验证的数字
   * @param fieldName 字段名称
   * @param min 最小值
   * @param max 最大值
   * @returns this
   */
  inRange(value: number, fieldName: string, min: number, max: number): this {
    if (value < min || value > max) {
      this.errors.push(`${fieldName}必须在 ${min} 到 ${max} 之间`);
    }
    return this;
  }

  /**
   * 验证数字大于等于指定值
   * @param value 要验证的数字
   * @param fieldName 字段名称
   * @param min 最小值
   * @returns this
   */
  min(value: number, fieldName: string, min: number): this {
    if (value < min) {
      this.errors.push(`${fieldName}必须大于或等于 ${min}`);
    }
    return this;
  }

  /**
   * 验证数字小于等于指定值
   * @param value 要验证的数字
   * @param fieldName 字段名称
   * @param max 最大值
   * @returns this
   */
  max(value: number, fieldName: string, max: number): this {
    if (value > max) {
      this.errors.push(`${fieldName}必须小于或等于 ${max}`);
    }
    return this;
  }

  /**
   * 验证字符串长度
   * @param value 要验证的字符串
   * @param fieldName 字段名称
   * @param minLength 最小长度
   * @param maxLength 最大长度
   * @returns this
   */
  length(value: string, fieldName: string, minLength: number, maxLength: number): this {
    if (value.length < minLength || value.length > maxLength) {
      this.errors.push(`${fieldName}长度必须在 ${minLength} 到 ${maxLength} 之间`);
    }
    return this;
  }

  /**
   * 验证字符串匹配正则表达式
   * @param value 要验证的字符串
   * @param fieldName 字段名称
   * @param pattern 正则表达式
   * @param errorMessage 自定义错误消息
   * @returns this
   */
  matches(value: string, fieldName: string, pattern: RegExp, errorMessage?: string): this {
    if (!pattern.test(value)) {
      this.errors.push(errorMessage || `${fieldName}格式不正确`);
    }
    return this;
  }

  /**
   * 验证值在指定列表中
   * @param value 要验证的值
   * @param fieldName 字段名称
   * @param allowedValues 允许的值列表
   * @returns this
   */
  oneOf(value: any, fieldName: string, allowedValues: any[]): this {
    if (!allowedValues.includes(value)) {
      this.errors.push(`${fieldName}必须是以下值之一: ${allowedValues.join(', ')}`);
    }
    return this;
  }

  /**
   * 自定义验证
   * @param condition 验证条件
   * @param errorMessage 错误消息
   * @returns this
   */
  custom(condition: boolean, errorMessage: string): this {
    if (!condition) {
      this.errors.push(errorMessage);
    }
    return this;
  }

  /**
   * 获取验证结果
   * @returns 验证结果
   */
  getResult(): CommandValidationResult {
    return this.errors.length > 0 ? validationFailure(this.errors) : validationSuccess();
  }

  /**
   * 检查是否有错误
   * @returns 是否有错误
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * 获取所有错误消息
   * @returns 错误消息数组
   */
  getErrors(): string[] {
    return [...this.errors];
  }
}