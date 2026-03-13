/**
 * 输入验证工具
 * 提供各种输入参数的验证功能
 */

import { z } from 'zod';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { CLIValidationError } from '../types/cli-types.js';

/**
 * 验证文件路径
 * @param filePath 文件路径
 * @returns 验证结果
 */
export function validateFilePath(filePath: string): { valid: boolean; error?: string } {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: '文件路径不能为空' };
  }

  if (filePath.trim() === '') {
    return { valid: false, error: '文件路径不能为空字符串' };
  }

  // 检查路径是否包含非法字符（Windows）
  const invalidChars = /[<>:"|?*]/;
  if (invalidChars.test(filePath)) {
    return { valid: false, error: '文件路径包含非法字符' };
  }

  // 检查文件扩展名
  const validExtensions = ['.json', '.toml', '.yaml', '.yml'];
  const ext = filePath.toLowerCase().split('.').pop();
  if (!ext || !validExtensions.includes(`.${ext}`)) {
    return { valid: false, error: `不支持的文件格式，支持的格式: ${validExtensions.join(', ')}` };
  }

  return { valid: true };
}

/**
 * 验证文件是否存在
 * @param filePath 文件路径
 * @returns 验证结果
 */
export function validateFileExists(filePath: string): { valid: boolean; error?: string } {
  const fullPath = resolve(process.cwd(), filePath);
  
  if (!existsSync(fullPath)) {
    return { valid: false, error: `文件不存在: ${filePath}` };
  }

  return { valid: true };
}

/**
 * 验证目录是否存在
 * @param dirPath 目录路径
 * @returns 验证结果
 */
export function validateDirectoryExists(dirPath: string): { valid: boolean; error?: string } {
  const fullPath = resolve(process.cwd(), dirPath);
  
  if (!existsSync(fullPath)) {
    return { valid: false, error: `目录不存在: ${dirPath}` };
  }

  return { valid: true };
}

/**
 * 验证 JSON 字符串
 * @param jsonString JSON 字符串
 * @returns 验证结果
 */
export function validateJSON(jsonString: string): { valid: boolean; error?: string; parsed?: any } {
  if (!jsonString || typeof jsonString !== 'string') {
    return { valid: false, error: 'JSON 字符串不能为空' };
  }

  if (jsonString.trim() === '') {
    return { valid: false, error: 'JSON 字符串不能为空字符串' };
  }

  try {
    const parsed = JSON.parse(jsonString);
    return { valid: true, parsed };
  } catch (error) {
    return { 
      valid: false, 
      error: `无效的 JSON 格式: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * 验证工作流 ID
 * @param id 工作流 ID
 * @returns 验证结果
 */
export function validateWorkflowId(id: string): { valid: boolean; error?: string } {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: '工作流 ID 不能为空' };
  }

  if (id.trim() === '') {
    return { valid: false, error: '工作流 ID 不能为空字符串' };
  }

  // 工作流 ID 应该是有效的 UUID 或自定义 ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const customIdRegex = /^[a-zA-Z0-9_-]+$/;

  if (!uuidRegex.test(id) && !customIdRegex.test(id)) {
    return { valid: false, error: '工作流 ID 格式无效' };
  }

  return { valid: true };
}

/**
 * 验证线程 ID
 * @param id 线程 ID
 * @returns 验证结果
 */
export function validateThreadId(id: string): { valid: boolean; error?: string } {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: '线程 ID 不能为空' };
  }

  if (id.trim() === '') {
    return { valid: false, error: '线程 ID 不能为空字符串' };
  }

  // 线程 ID 应该是有效的 UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(id)) {
    return { valid: false, error: '线程 ID 格式无效，应为 UUID 格式' };
  }

  return { valid: true };
}

/**
 * 验证检查点 ID
 * @param id 检查点 ID
 * @returns 验证结果
 */
export function validateCheckpointId(id: string): { valid: boolean; error?: string } {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: '检查点 ID 不能为空' };
  }

  if (id.trim() === '') {
    return { valid: false, error: '检查点 ID 不能为空字符串' };
  }

  return { valid: true };
}

/**
 * 验证模板 ID
 * @param id 模板 ID
 * @returns 验证结果
 */
export function validateTemplateId(id: string): { valid: boolean; error?: string } {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: '模板 ID 不能为空' };
  }

  if (id.trim() === '') {
    return { valid: false, error: '模板 ID 不能为空字符串' };
  }

  return { valid: true };
}

/**
 * 验证正则表达式模式
 * @param pattern 正则表达式字符串
 * @returns 验证结果
 */
export function validateRegexPattern(pattern: string): { valid: boolean; error?: string; regex?: RegExp } {
  if (!pattern || typeof pattern !== 'string') {
    return { valid: false, error: '正则表达式不能为空' };
  }

  try {
    const regex = new RegExp(pattern);
    return { valid: true, regex };
  } catch (error) {
    return { 
      valid: false, 
      error: `无效的正则表达式: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * 验证超时时间
 * @param timeout 超时时间（毫秒）
 * @returns 验证结果
 */
export function validateTimeout(timeout: number): { valid: boolean; error?: string } {
  if (typeof timeout !== 'number') {
    return { valid: false, error: '超时时间必须是数字' };
  }

  if (isNaN(timeout)) {
    return { valid: false, error: '超时时间不能是 NaN' };
  }

  if (timeout <= 0) {
    return { valid: false, error: '超时时间必须大于 0' };
  }

  if (timeout > 3600000) { // 1小时
    return { valid: false, error: '超时时间不能超过 1 小时' };
  }

  return { valid: true };
}

/**
 * 验证并发数
 * @param concurrency 并发数
 * @returns 验证结果
 */
export function validateConcurrency(concurrency: number): { valid: boolean; error?: string } {
  if (typeof concurrency !== 'number') {
    return { valid: false, error: '并发数必须是数字' };
  }

  if (isNaN(concurrency)) {
    return { valid: false, error: '并发数不能是 NaN' };
  }

  if (concurrency < 1) {
    return { valid: false, error: '并发数必须大于等于 1' };
  }

  if (concurrency > 100) {
    return { valid: false, error: '并发数不能超过 100' };
  }

  return { valid: true };
}

/**
 * Zod 验证模式
 */
export const ValidationSchemas = {
  workflowId: z.string().min(1, '工作流 ID 不能为空'),
  threadId: z.string().uuid('线程 ID 必须是有效的 UUID'),
  checkpointId: z.string().min(1, '检查点 ID 不能为空'),
  templateId: z.string().min(1, '模板 ID 不能为空'),
  filePath: z.string().min(1, '文件路径不能为空'),
  timeout: z.number().positive('超时时间必须大于 0').max(3600000, '超时时间不能超过 1 小时'),
  concurrency: z.number().int('并发数必须是整数').min(1, '并发数必须大于等于 1').max(100, '并发数不能超过 100'),
};

/**
 * 使用 Zod 验证对象
 * @param schema Zod 验证模式
 * @param data 要验证的数据
 * @returns 验证结果
 */
export function validateWithZod<T>(schema: z.ZodSchema<T>, data: unknown): { valid: boolean; error?: string; data?: T } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { valid: true, data: result.data };
  }
  
  const errors = (result.error as z.ZodError).issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
  return { valid: false, error: errors };
}

/**
 * 重新导出 CLIValidationError 以保持向后兼容
 */
export { CLIValidationError as ValidationError };