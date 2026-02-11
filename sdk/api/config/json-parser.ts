/**
 * JSON解析器
 * 负责解析JSON格式的配置文件
 */

import type { WorkflowConfigFile } from '@modular-agent/types';
import { ConfigurationError } from '@modular-agent/types/errors';

/**
 * 解析JSON内容
 * @param content JSON内容字符串
 * @returns 解析后的配置对象
 * @throws {ConfigurationError} 当JSON解析失败或格式不正确时抛出
 */
export function parseJson(content: string): WorkflowConfigFile {
  try {
    const parsed = JSON.parse(content);
    
    // 验证必需字段
    if (!parsed.id) {
      throw new ConfigurationError(
        'JSON配置文件必须包含 id 字段',
        'id'
      );
    }
    
    if (!parsed.name) {
      throw new ConfigurationError(
        'JSON配置文件必须包含 name 字段',
        'name'
      );
    }
    
    if (!parsed.version) {
      throw new ConfigurationError(
        'JSON配置文件必须包含 version 字段',
        'version'
      );
    }
    
    return parsed as WorkflowConfigFile;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new ConfigurationError(
        `JSON解析失败: ${error.message}`,
        undefined,
        { originalError: error.message }
      );
    }
    throw new ConfigurationError('JSON解析失败: 未知错误');
  }
}

/**
 * 将配置对象转换为JSON字符串
 * @param config 配置对象
 * @param pretty 是否格式化输出
 * @returns JSON字符串
 * @throws {ConfigurationError} 当JSON序列化失败时抛出
 */
export function stringifyJson(config: WorkflowConfigFile, pretty: boolean = true): string {
  try {
    if (pretty) {
      return JSON.stringify(config, null, 2);
    }
    return JSON.stringify(config);
  } catch (error) {
    if (error instanceof Error) {
      throw new ConfigurationError(
        `JSON序列化失败: ${error.message}`,
        undefined,
        { originalError: error.message }
      );
    }
    throw new ConfigurationError('JSON序列化失败: 未知错误');
  }
}

/**
 * 验证JSON内容的基本格式（仅检查JSON语法，不验证必需字段）
 * @param content JSON内容字符串
 * @returns 是否有效
 */
export function validateJsonSyntax(content: string): boolean {
  try {
    JSON.parse(content);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 从文件路径加载JSON内容
 * @param filePath 文件路径
 * @returns JSON内容字符串
 * @throws {ConfigurationError} 当读取文件失败时抛出
 */
export async function loadJsonFromFile(filePath: string): Promise<string> {
  const fs = await import('fs/promises');
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if (error instanceof Error) {
      throw new ConfigurationError(
        `读取文件失败: ${error.message}`,
        filePath,
        { originalError: error.message }
      );
    }
    throw new ConfigurationError('读取文件失败: 未知错误');
  }
}

/**
 * 将配置对象保存到JSON文件
 * @param config 配置对象
 * @param filePath 文件路径
 * @param pretty 是否格式化输出
 * @throws {ConfigurationError} 当保存文件失败时抛出
 */
export async function saveJsonToFile(
  config: WorkflowConfigFile,
  filePath: string,
  pretty: boolean = true
): Promise<void> {
  const fs = await import('fs/promises');
  try {
    const content = stringifyJson(config, pretty);
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new ConfigurationError(
        `保存文件失败: ${error.message}`,
        filePath,
        { originalError: error.message }
      );
    }
    throw new ConfigurationError('保存文件失败: 未知错误');
  }
}