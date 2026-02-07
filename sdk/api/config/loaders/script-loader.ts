/**
 * 脚本配置加载器
 * 负责加载、注册和导出脚本配置文件
 */

import type { Script } from '../../../types/code';
import { ConfigFormat } from '../types';
import { ConfigType } from '../types';
import { BaseConfigLoader } from './base-loader';
import { codeService } from '../../../core/services/code-service';
import { ConfigurationError } from '../../../types/errors';

/**
 * 脚本配置加载器
 */
export class ScriptLoader extends BaseConfigLoader<ConfigType.SCRIPT> {
  constructor() {
    super(ConfigType.SCRIPT);
  }

  /**
   * 加载并注册脚本
   * @param filePath 文件路径
   * @returns 脚本
   */
  async loadAndRegister(filePath: string): Promise<Script> {
    const config = await this.loadFromFile(filePath);
    const script = config.config as Script;

    try {
      codeService.registerScript(script);
      return script;
    } catch (error) {
      if (error instanceof Error) {
        throw new ConfigurationError(
          `注册脚本失败: ${error.message}`,
          filePath,
          { originalError: error.message }
        );
      }
      throw new ConfigurationError('注册脚本失败: 未知错误');
    }
  }

  /**
   * 从内容加载并注册脚本
   * @param content 配置文件内容
   * @param format 配置格式
   * @returns 脚本
   */
  loadAndRegisterFromContent(content: string, format: ConfigFormat): Script {
    const config = this.loadFromContent(content, format);
    const script = config.config as Script;

    try {
      codeService.registerScript(script);
      return script;
    } catch (error) {
      if (error instanceof Error) {
        throw new ConfigurationError(
          `注册脚本失败: ${error.message}`,
          undefined,
          { originalError: error.message }
        );
      }
      throw new ConfigurationError('注册脚本失败: 未知错误');
    }
  }

  /**
   * 批量加载并注册脚本
   * @param filePaths 文件路径数组
   * @returns 脚本数组
   */
  async loadBatchAndRegister(filePaths: string[]): Promise<Script[]> {
    const scripts: Script[] = [];
    for (const filePath of filePaths) {
      const script = await this.loadAndRegister(filePath);
      scripts.push(script);
    }
    return scripts;
  }

  /**
   * 导出脚本为配置文件
   * @param script 脚本
   * @param format 配置格式
   * @returns 配置文件内容字符串
   */
  override exportToContent(script: Script, format: ConfigFormat): string {
    switch (format) {
      case ConfigFormat.JSON:
        return JSON.stringify(script, null, 2);
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
   * 从注册表获取脚本
   * @param name 脚本名称
   * @returns 脚本
   */
  getScript(name: string): Script | null {
    try {
      return codeService.getScript(name);
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取所有脚本
   * @returns 脚本数组
   */
  getAllScripts(): Script[] {
    return codeService.listScripts();
  }

  /**
   * 搜索脚本
   * @param keyword 搜索关键词
   * @returns 脚本数组
   */
  searchScripts(keyword: string): Script[] {
    return codeService.searchScripts(keyword);
  }

  /**
   * 验证脚本
   * @param name 脚本名称
   * @returns 验证结果
   */
  validateScript(name: string): { valid: boolean; errors: string[] } {
    return codeService.validateScript(name);
  }
}