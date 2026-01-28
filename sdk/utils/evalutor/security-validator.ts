/**
 * SecurityValidator - 安全验证器
 * 提供路径和表达式的安全验证功能，防止注入攻击
 *
 * 安全措施：
 * - 路径深度限制
 * - 禁止访问特殊属性（防止原型链污染）
 * - 路径格式验证
 * - 表达式长度限制
 */

import { z } from 'zod';
import { ValidationError } from '../../types/errors';

/**
 * 安全配置
 */
export const SECURITY_CONFIG = {
  /** 表达式最大长度 */
  MAX_EXPRESSION_LENGTH: 1000,
  /** 路径最大深度 */
  MAX_PATH_DEPTH: 10,
  /** 禁止访问的属性（防止原型链污染） */
  FORBIDDEN_PROPERTIES: ['__proto__', 'constructor', 'prototype'],
  /** 允许的路径字符正则 */
  VALID_PATH_PATTERN: /^[a-zA-Z_][a-zA-Z0-9_]*(\[\d+\])?(\.[a-zA-Z_][a-zA-Z0-9_]*(\[\d+\])?)*$/
} as const;

/**
 * 表达式schema
 */
const expressionSchema = z.string()
  .min(1, 'Expression must be a non-empty string')
  .max(SECURITY_CONFIG.MAX_EXPRESSION_LENGTH, `Expression length exceeds maximum limit of ${SECURITY_CONFIG.MAX_EXPRESSION_LENGTH}`);

/**
 * 路径schema（基础格式验证）
 */
const pathSchema = z.string()
  .min(1, 'Path must be a non-empty string')
  .regex(SECURITY_CONFIG.VALID_PATH_PATTERN, 'Path contains invalid characters. Only alphanumeric, underscore, dot, and array brackets are allowed');

/**
 * 值类型schema
 */
const valueTypeSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.undefined(),
  z.null(),
  z.array(z.any()),
  z.record(z.string(), z.any()).refine(
    (val) => val.constructor === Object || val.constructor === undefined,
    { message: 'Special objects (Date, RegExp, Map, Set, etc.) are not allowed' }
  )
]);

/**
 * 验证表达式安全性
 * @param expression 表达式字符串
 * @throws ValidationError 如果表达式不安全
 */
export function validateExpression(expression: string): void {
  const result = expressionSchema.safeParse(expression);
  if (!result.success) {
    const message = result.error.issues[0]?.message || 'Expression validation failed';
    throw new ValidationError(
      message,
      'expression',
      expression
    );
  }
}

/**
 * 验证路径安全性
 * @param path 路径字符串
 * @throws ValidationError 如果路径不安全
 */
export function validatePath(path: string): void {
  // 检查是否为字符串
  if (!path || typeof path !== 'string') {
    throw new ValidationError(
      'Path must be a non-empty string',
      'path',
      path
    );
  }

  // 检查是否包含禁止的属性
  for (const forbidden of SECURITY_CONFIG.FORBIDDEN_PROPERTIES) {
    if (path.includes(forbidden)) {
      throw new ValidationError(
        `Path contains forbidden property: ${forbidden}`,
        'path',
        path
      );
    }
  }

  // 验证路径格式
  const result = pathSchema.safeParse(path);
  if (!result.success) {
    const message = result.error.issues[0]?.message || 'Path validation failed';
    throw new ValidationError(
      message,
      'path',
      path
    );
  }

  // 检查路径深度
  const depth = path.split('.').length;
  if (depth > SECURITY_CONFIG.MAX_PATH_DEPTH) {
    throw new ValidationError(
      `Path depth exceeds maximum limit of ${SECURITY_CONFIG.MAX_PATH_DEPTH}`,
      'path',
      path
    );
  }
}

/**
 * 验证数组索引是否在有效范围内
 * @param array 数组
 * @param index 索引
 * @throws ValidationError 如果索引越界
 */
export function validateArrayIndex(array: any[], index: number): void {
  const arraySchema = z.array(z.any());
  const arrayResult = arraySchema.safeParse(array);
  if (!arrayResult.success) {
    throw new ValidationError(
      'Target is not an array',
      'array',
      array
    );
  }

  const indexSchema = z.number().int().nonnegative().max(array.length - 1);
  const indexResult = indexSchema.safeParse(index);
  if (!indexResult.success) {
    throw new ValidationError(
      `Array index ${index} out of bounds. Array length is ${array.length}`,
      'index',
      index
    );
  }
}

/**
 * 验证值是否为允许的基本类型
 * @param value 值
 * @throws ValidationError 如果值类型不允许
 */
export function validateValueType(value: any): void {
  const result = valueTypeSchema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    let message = 'Value type validation failed';

    // 根据实际类型生成更具体的错误消息
    if (value !== null && value !== undefined) {
      const typeName = typeof value;
      if (typeName === 'function') {
        message = `Value type ${typeName} is not allowed`;
      } else if (value.constructor && value.constructor !== Object) {
        message = `Value type ${value.constructor.name} is not allowed`;
      } else {
        message = `Value type ${typeName} is not allowed`;
      }
    } else {
      message = result.error.issues[0]?.message || 'Value type validation failed';
    }

    throw new ValidationError(
      message,
      'value',
      value
    );
  }
}