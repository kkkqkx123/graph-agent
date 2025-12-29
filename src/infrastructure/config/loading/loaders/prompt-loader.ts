/**
 * 提示词配置加载器
 *
 * 职责：
 * - 从 configs/prompts 目录加载提示词配置
 * - 支持复合提示词目录结构的智能查找
 * - 处理文件路径构建和文件系统查找
 *
 * 支持的文件格式：仅支持 TOML 格式
 *
 * 支持的文件结构：
 * - 简单文件: configs/prompts/{category}/{name}.toml
 * - 复合目录: configs/prompts/{category}/{composite}/index.toml
 * - 部分文件: configs/prompts/{category}/{composite}/{序号}_{part}.toml
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseModuleLoader } from '../base-loader';
import { ConfigFile, ModuleMetadata } from '../types';
import { buildFilePath } from '../rules/prompt-rule';

export class PromptLoader extends BaseModuleLoader {
  readonly moduleType = 'prompts';

  protected override async preprocessFiles(files: ConfigFile[]): Promise<ConfigFile[]> {
    // 根据文件路径调整优先级
    const processedFiles = files.map(file => {
      const filePath = file.path.toLowerCase();
      if (filePath.includes('templates/')) {
        file.priority += 1500; // 模板定义文件优先级最高
      } else if (filePath.includes('system/')) {
        file.priority += 1000;
      } else if (filePath.includes('rules/')) {
        file.priority += 800;
      } else if (filePath.includes('user_commands/')) {
        file.priority += 600;
      } else if (filePath.includes('context/')) {
        file.priority += 400;
      } else if (filePath.includes('examples/')) {
        file.priority += 200;
      }
      return file;
    });
    return processedFiles;
  }

  protected override async mergeConfigs(configs: Record<string, any>[]): Promise<Record<string, any>> {
    // 合并prompt配置的逻辑
    const result: Record<string, any> = {};

    // 按类别分组
    const promptsByCategory: Record<string, Record<string, any>> = {};

    for (const config of configs) {
      const category = this.extractCategory(config['path']);
      const name = this.extractName(config['path']);

      if (!promptsByCategory[category]) {
        promptsByCategory[category] = {};
      }

      // 添加文件路径信息到配置中
      const enhancedConfig = {
        ...config['content'],
        _filepath: config['path'],
        _category: category,
        _name: name
      };

      promptsByCategory[category][name] = enhancedConfig;
    }

    result['prompts'] = promptsByCategory;
    return result;
  }

  protected override extractMetadata(config: Record<string, any>): ModuleMetadata {
    return {
      name: 'prompts',
      version: '1.0.0',
      description: '提示词配置模块',
      registry: config['_registry']
    };
  }

  protected override extractDependencies(config: Record<string, any>): string[] {
    return ['global'];
  }

  /**
   * 从文件路径提取类别
   */
  private extractCategory(filePath: string): string {
    // 文件路径格式: configs/prompts/{category}/{name}.toml
    const relativePath = path.relative('configs/prompts', filePath);
    const parts = relativePath.split(path.sep);
    return parts[0] || 'unknown';
  }

  /**
   * 从文件路径提取名称
   */
  private extractName(filePath: string): string {
    // 移除扩展名和目录
    const basename = path.basename(filePath, path.extname(filePath));

    // 如果是复合提示词目录的 index 文件，使用目录名
    if (basename === 'index') {
      const dirname = path.basename(path.dirname(filePath));
      return dirname;
    }

    // 保留完整的文件名（包括序号前缀）
    // 例如：01_code_style.toml → 01_code_style
    return basename;
  }

  /**
   * 加载配置文件内容（仅支持TOML格式）
   */
  protected override async loadConfigs(files: ConfigFile[]): Promise<Record<string, any>[]> {
    const configs: Record<string, any>[] = [];

    for (const file of files) {
      try {
        this.logger.debug('加载提示词配置文件', { path: file.path });

        const content = await fs.readFile(file.path, 'utf8');
        const ext = path.extname(file.path).toLowerCase();

        if (ext !== '.toml') {
          this.logger.warn('不支持的文件格式，仅支持TOML格式', { path: file.path, ext });
          continue;
        }

        // 处理toml文件
        const toml = await import('toml');
        const processed = toml.parse(content);

        configs.push({
          path: file.path,
          content: processed,
          category: this.extractCategory(file.path),
          name: this.extractName(file.path)
        });
      } catch (error) {
        this.logger.warn('提示词配置文件加载失败，跳过', {
          path: file.path,
          error: (error as Error).message
        });
      }
    }

    return configs;
  }

  /**
   * 根据引用查找提示词内容
   * @param category 类别
   * @param name 名称（可能包含复合名称，如 "coder.index" 或 "coder.01_code_style"）
   * @returns 提示词内容，如果未找到则返回 null
   */
  async findPromptByReference(category: string, name: string): Promise<Record<string, unknown> | null> {
    this.logger.debug('根据引用查找提示词', { category, name });

    // 使用 PromptRule 中的路径构建函数（单一处理逻辑）
    const filePath = buildFilePath(category, name);

    try {
      const content = await fs.readFile(filePath, 'utf8');
      const ext = path.extname(filePath).toLowerCase();

      if (ext !== '.toml') {
        this.logger.warn('不支持的文件格式，仅支持TOML格式', { path: filePath, ext });
        return null;
      }

      // 处理toml文件
      const toml = await import('toml');
      const processed = toml.parse(content);

      this.logger.debug('成功加载提示词', { category, name, filePath });
      return processed;
    } catch (error) {
      this.logger.warn('未找到提示词', { category, name, filePath, error: (error as Error).message });
      return null;
    }
  }
}
