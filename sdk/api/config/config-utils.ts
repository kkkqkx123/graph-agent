/**
 * 配置工具辅助函数
 * 提供配置文件相关的辅助功能
 */

import * as path from 'path';
import { ConfigFormat } from './types';

/**
 * 根据文件扩展名检测配置格式
 * @param filePath 文件路径
 * @returns 配置格式
 * @throws {Error} 当文件扩展名无法识别时抛出错误
 */
export function detectConfigFormat(filePath: string): ConfigFormat {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.toml':
      return ConfigFormat.TOML;
    case '.json':
      return ConfigFormat.JSON;
    default:
      throw new Error(`无法识别的配置文件扩展名: ${ext}`);
  }
}

/**
 * 读取配置文件内容
 * @param filePath 文件路径
 * @returns 文件内容字符串
 * @throws {Error} 当文件读取失败时抛出错误
 */
export async function readConfigFile(filePath: string): Promise<string> {
  const fs = await import('fs/promises');
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`读取配置文件失败: ${error.message}`);
    }
    throw new Error('读取配置文件失败: 未知错误');
  }
}

/**
 * 从文件路径加载配置内容并检测格式
 * @param filePath 文件路径
 * @returns 包含内容和格式的对象
 */
export async function loadConfigContent(filePath: string): Promise<{
  content: string;
  format: ConfigFormat;
}> {
  const content = await readConfigFile(filePath);
  const format = detectConfigFormat(filePath);
  return { content, format };
}