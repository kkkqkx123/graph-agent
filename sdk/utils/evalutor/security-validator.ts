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
 * 验证表达式安全性
 * @param expression 表达式字符串
 * @throws ValidationError 如果表达式不安全
 */
export function validateExpression(expression: string): void {
  if (!expression || typeof expression !== 'string') {
    throw new ValidationError('Expression must be a non-empty string', 'expression', expression);
  }

  // 检查表达式长度
  if (expression.length > SECURITY_CONFIG.MAX_EXPRESSION_LENGTH) {
    throw new ValidationError(
      `Expression length exceeds maximum limit of ${SECURITY_CONFIG.MAX_EXPRESSION_LENGTH}`,
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
  if (!path || typeof path !== 'string') {
    throw new ValidationError('Path must be a non-empty string', 'path', path);
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

  // 检查路径格式
  if (!SECURITY_CONFIG.VALID_PATH_PATTERN.test(path)) {
    throw new ValidationError(
      'Path contains invalid characters. Only alphanumeric, underscore, dot, and array brackets are allowed',
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
  if (!Array.isArray(array)) {
    throw new ValidationError('Target is not an array', 'array', array);
  }

  if (index < 0 || index >= array.length) {
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
  const allowedTypes = ['string', 'number', 'boolean', 'undefined'];

  if (value === null) {
    return; // null 是允许的
  }

  if (Array.isArray(value)) {
    return; // 数组是允许的
  }

  // 检查是否为普通对象（非特殊对象）
  if (typeof value === 'object') {
    // 检查是否为特殊对象（Date, RegExp, Map, Set 等）
    if (value.constructor && value.constructor !== Object) {
      throw new ValidationError(
        `Value type ${value.constructor.name} is not allowed`,
        'value',
        value
      );
    }
    return; // 普通对象是允许的
  }

  if (!allowedTypes.includes(typeof value)) {
    throw new ValidationError(
      `Value type ${typeof value} is not allowed`,
      'value',
      value
    );
  }
}