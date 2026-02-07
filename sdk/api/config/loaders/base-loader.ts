/**
 * 基础配置加载器抽象类
 * 定义所有配置加载器的通用接口
 */

import { ConfigFormat } from '../types';
import type { ConfigType, ParsedConfigEx, ConfigFile } from '../types';
import { ConfigParser } from '../config-parser';
import { ConfigurationError } from '../../../types/errors';
import * as path from 'path';

/**
 * 基础配置加载器抽象类
 */
export abstract class BaseConfigLoader<T extends ConfigType> {
  protected configType: T;
  protected parser: ConfigParser;

  constructor(configType: T) {
    this.configType = configType;
    this.parser = new ConfigParser();
  }

  /**
   * 从文件加载配置
   * @param filePath 文件路径
   * @returns 解析后的配置对象
   */
  async loadFromFile(filePath: string): Promise<ParsedConfigEx<T>> {
    const fs = await import('fs/promises');

    try {
      // 读取文件内容
      const content = await fs.readFile(filePath, 'utf-8');

      // 根据文件扩展名检测格式
      const format = this.detectFormat(filePath);

      // 解析配置
      const parsed = this.parser.parse(content, format);

      return {
        configType: this.configType,
        format,
        config: parsed.workflowConfig as any,
        rawContent: content
      };
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ConfigurationError(
          `加载配置文件失败: ${error.message}`,
          filePath,
          { originalError: error.message }
        );
      }
      throw new ConfigurationError('加载配置文件失败: 未知错误');
    }
  }

  /**
   * 从内容加载配置
   * @param content 配置文件内容
   * @param format 配置格式
   * @returns 解析后的配置对象
   */
  loadFromContent(content: string, format: ConfigFormat): ParsedConfigEx<T> {
    const parsed = this.parser.parse(content, format);
    return {
      configType: this.configType,
      format,
      config: parsed.workflowConfig as any,
      rawContent: content
    };
  }

  /**
   * 批量加载配置
   * @param filePaths 文件路径数组
   * @returns 解析后的配置对象数组
   */
  async loadBatch(filePaths: string[]): Promise<ParsedConfigEx<T>[]> {
    return Promise.all(filePaths.map(filePath => this.loadFromFile(filePath)));
  }

  /**
   * 导出配置到文件
   * @param config 配置对象
   * @param filePath 文件路径
   */
  async exportToFile(config: ConfigFile, filePath: string): Promise<void> {
    const format = this.detectFormat(filePath);
    const content = this.exportToContent(config, format);
    await this.saveToFile(filePath, content);
  }

  /**
   * 导出配置为内容字符串
   * @param config 配置对象
   * @param format 配置格式
   * @returns 配置文件内容字符串
   */
  exportToContent(config: ConfigFile, format: ConfigFormat): string {
    // 默认实现：仅支持JSON格式
    switch (format) {
      case ConfigFormat.JSON:
        return JSON.stringify(config, null, 2);
      case ConfigFormat.TOML:
        throw new ConfigurationError(
          'TOML格式不支持导出，请使用JSON格式',
          format,
          { suggestion: '使用 ConfigFormat.JSON 代替' }
        );
      default:
        throw new ConfigurationError(
          `不支持的配置格式: ${format}`,
          format
        );
    }
  }

  /**
   * 检测文件格式
   * @param filePath 文件路径
   * @returns 配置格式
   */
  protected detectFormat(filePath: string): ConfigFormat {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.toml':
        return ConfigFormat.TOML;
      case '.json':
        return ConfigFormat.JSON;
      default:
        throw new ConfigurationError(
          `无法识别的配置文件扩展名: ${ext}`,
          ext
        );
    }
  }

  /**
   * 保存文件
   * @param filePath 文件路径
   * @param content 文件内容
   */
  protected async saveToFile(filePath: string, content: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, content, 'utf-8');
  }
}