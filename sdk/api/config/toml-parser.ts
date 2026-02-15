/**
 * TOML解析器
 * 负责解析TOML格式的配置文件
 *
 * 设计原则：
 * - 在模块顶层加载 @iarna/toml 解析库（ES 模块兼容）
 * - 提供清晰的错误信息
 * - 统一的错误处理
 * - 保持同步接口，避免影响现有代码
 */

import type { WorkflowConfigFile } from './types';
import { ConfigurationError } from '@modular-agent/types';

// 在模块顶层动态导入并缓存 TOML 解析器
let tomlParser: any = null;

/**
 * 获取 TOML 解析器实例
 * @returns TOML 解析器
 * @throws {ConfigurationError} 当未找到 TOML 解析库时抛出
 */
function getTomlParser(): any {
  if (tomlParser) {
    return tomlParser;
  }

  try {
    // 使用 require 加载 CommonJS 模块
    tomlParser = require('@iarna/toml');
    return tomlParser;
  } catch (error) {
    throw new ConfigurationError(
      '未找到TOML解析库。请确保已安装 @iarna/toml: pnpm install',
      undefined,
      { suggestion: 'pnpm install' }
    );
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
