/**
 * TemplateRenderer - 模板渲染器
 * 提供模板变量替换功能，支持嵌套路径解析
 *
 * 功能：
 * - 支持 {{variable}} 占位符替换
 * - 支持嵌套路径解析（如 user.name）
 * - 支持数组索引访问（如 items[0].name）
 * - 提供安全的变量值获取
 */

import { resolvePath } from '../evalutor/path-resolver.js';

/**
 * 获取变量值
 * @param variableName 变量名，支持嵌套路径（如 user.name）
 * @param variables 变量对象
 * @returns 变量值，如果不存在则返回 undefined
 */
export function getVariableValue(variableName: string, variables: Record<string, any>): any {
  if (!variableName || !variables) {
    return undefined;
  }

  // 尝试直接获取
  if (variableName in variables) {
    return variables[variableName];
  }

  // 尝试路径解析
  return resolvePath(variableName, variables);
}

/**
 * 渲染模板
 * 替换模板中的 {{variable}} 占位符
 *
 * @param template 模板字符串，包含 {{variable}} 占位符
 * @param variables 变量对象
 * @returns 渲染后的字符串
 *
 * @example
 * ```ts
 * const template = 'Hello, {{name}}! Today is {{date}}.';
 * const result = renderTemplate(template, { name: 'Alice', date: '2024-01-01' });
 * // 结果: 'Hello, Alice! Today is 2024-01-01.'
 * ```
 *
 * @example
 * ```ts
 * const template = 'User: {{user.name}}, Age: {{user.age}}';
 * const result = renderTemplate(template, { user: { name: 'Bob', age: 30 } });
 * // 结果: 'User: Bob, Age: 30'
 * ```
 */
export function renderTemplate(template: string, variables: Record<string, any>): string {
  if (!template) {
    return '';
  }

  if (!variables || Object.keys(variables).length === 0) {
    return template;
  }

  // 使用正则表达式匹配 {{variable}} 占位符
  const placeholderRegex = /\{\{([^}]+)\}\}/g;

  return template.replace(placeholderRegex, (match, variableName) => {
    // 去除变量名两端的空白字符
    const trimmedName = variableName.trim();
    const value = getVariableValue(trimmedName, variables);

    // 如果值为 undefined 或 null，保留原始占位符
    if (value === undefined || value === null) {
      return match;
    }

    // 将值转换为字符串
    return String(value);
  });
}

/**
 * 批量渲染模板
 * 对多个模板进行批量渲染
 *
 * @param templates 模板数组
 * @param variables 变量对象
 * @returns 渲染后的字符串数组
 */
export function renderTemplates(templates: string[], variables: Record<string, any>): string[] {
  return templates.map(template => renderTemplate(template, variables));
}

/**
 * 验证模板变量
 * 检查模板中的所有变量是否在变量对象中存在
 *
 * @param template 模板字符串
 * @param variables 变量对象
 * @returns 包含缺失变量名的数组，如果没有缺失则返回空数组
 */
export function validateTemplateVariables(template: string, variables: Record<string, any>): string[] {
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const missingVariablesSet = new Set<string>();
  let match;

  while ((match = placeholderRegex.exec(template)) !== null) {
    const variableName = match[1]?.trim();
    if (!variableName) continue;

    const value = getVariableValue(variableName, variables);

    if (value === undefined || value === null) {
      missingVariablesSet.add(variableName);
    }
  }

  return Array.from(missingVariablesSet);
}