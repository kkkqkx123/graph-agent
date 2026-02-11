/**
 * TOML解析器
 * 负责解析TOML格式的配置文件
 */

import type { WorkflowConfigFile } from './types';
import { ConfigurationError } from '@modular-agent/types/errors';

/**
 * 获取TOML解析器实例
 * @returns TOML解析器
 * @throws {ConfigurationError} 当未找到TOML解析库时抛出
 */
function getTomlParser(): any {
  try {
    // 尝试使用 @iarna/toml
    const toml = require('@iarna/toml');
    return toml;
  } catch (error) {
    try {
      // 尝试使用 toml
      const toml = require('toml');
      return toml;
    } catch (error2) {
      throw new ConfigurationError(
        '未找到TOML解析库。请安装 @iarna/toml 或 toml: pnpm add @iarna/toml',
        undefined,
        { suggestion: 'pnpm add @iarna/toml' }
      );
    }
  }
}

/**
 * 解析TOML内容
 * @param content TOML内容字符串
 * @returns 解析后的配置对象
 * @throws {ConfigurationError} 当TOML解析失败或格式不正确时抛出
 */
export function parseToml(content: string): WorkflowConfigFile {
  try {
    // 使用动态导入来支持TOML解析
    // 如果项目中没有安装TOML解析库，这里会抛出错误
    const toml = getTomlParser();
    const parsed = toml.parse(content);

    // 验证解析结果
    if (!parsed.workflow) {
      throw new ConfigurationError(
        'TOML配置文件必须包含 [workflow] 部分',
        'workflow'
      );
    }

    return parsed as WorkflowConfigFile;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new ConfigurationError(
        `TOML解析失败: ${error.message}`,
        undefined,
        { originalError: error.message }
      );
    }
    throw new ConfigurationError('TOML解析失败: 未知错误');
  }
}

/**
 * 验证TOML内容的基本格式
 * @param content TOML内容字符串
 * @returns 是否有效
 */
export function validateTomlSyntax(content: string): boolean {
  try {
    parseToml(content);
    return true;
  } catch (error) {
    return false;
  }
}