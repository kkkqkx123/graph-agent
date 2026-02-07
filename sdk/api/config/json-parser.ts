/**
 * JSON解析器
 * 负责解析JSON格式的配置文件
 */

import type { WorkflowConfigFile } from './types';

/**
 * JSON解析器类
 */
export class JsonParser {
  /**
   * 解析JSON内容
   * @param content JSON内容字符串
   * @returns 解析后的配置对象
   */
  parse(content: string): WorkflowConfigFile {
    try {
      const parsed = JSON.parse(content);
      
      // 验证解析结果
      if (!parsed.workflow) {
        throw new Error('JSON配置文件必须包含 workflow 对象');
      }
      
      return parsed as WorkflowConfigFile;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`JSON解析失败: ${error.message}`);
      }
      throw new Error('JSON解析失败: 未知错误');
    }
  }

  /**
   * 将配置对象转换为JSON字符串
   * @param config 配置对象
   * @param pretty 是否格式化输出
   * @returns JSON字符串
   */
  stringify(config: WorkflowConfigFile, pretty: boolean = true): string {
    try {
      if (pretty) {
        return JSON.stringify(config, null, 2);
      }
      return JSON.stringify(config);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`JSON序列化失败: ${error.message}`);
      }
      throw new Error('JSON序列化失败: 未知错误');
    }
  }

  /**
   * 验证JSON内容的基本格式
   * @param content JSON内容字符串
   * @returns 是否有效
   */
  validateSyntax(content: string): boolean {
    try {
      this.parse(content);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 从文件路径加载JSON内容
   * @param filePath 文件路径
   * @returns JSON内容字符串
   */
  async loadFromFile(filePath: string): Promise<string> {
    const fs = await import('fs/promises');
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`读取文件失败: ${error.message}`);
      }
      throw new Error('读取文件失败: 未知错误');
    }
  }

  /**
   * 将配置对象保存到JSON文件
   * @param config 配置对象
   * @param filePath 文件路径
   * @param pretty 是否格式化输出
   */
  async saveToFile(config: WorkflowConfigFile, filePath: string, pretty: boolean = true): Promise<void> {
    const fs = await import('fs/promises');
    try {
      const content = this.stringify(config, pretty);
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`保存文件失败: ${error.message}`);
      }
      throw new Error('保存文件失败: 未知错误');
    }
  }
}