/**
 * 提示词配置加载器
 * 
 * 负责从 configs/prompts 目录加载提示词配置。
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseModuleLoader } from '../base-loader';
import { ConfigFile, ModuleConfig, ModuleMetadata } from '../types';
import { ILogger } from '../../../../domain/common/types';
import { PromptType, inferPromptTypeFromCategory } from '../../../../domain/prompts/value-objects/prompt-type';

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
      
      promptsByCategory[category][name] = config['content'];
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
    // 文件路径格式: configs/prompts/{category}/{name}.md
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
    // 如果是复合提示词目录，使用目录名
    if (basename === 'index') {
      const dirname = path.basename(path.dirname(filePath));
      return dirname;
    }
    return basename;
  }

  /**
    * 加载配置文件内容（支持markdown和toml文件）
    */
  protected override async loadConfigs(files: ConfigFile[]): Promise<Record<string, any>[]> {
    const configs: Record<string, any>[] = [];
    
    for (const file of files) {
      try {
        this.logger.debug('加载提示词配置文件', { path: file.path });
        
        const content = await fs.readFile(file.path, 'utf8');
        const ext = path.extname(file.path).toLowerCase();
        
        let processed: any;
        
        if (ext === '.md') {
          // 处理markdown文件
          processed = await this.processMarkdownContent(content, file.path);
        } else if (ext === '.toml') {
          // 处理toml文件
          processed = await this.processTomlContent(content, file.path);
        } else {
          this.logger.warn('不支持的文件格式', { path: file.path, ext });
          continue;
        }
        
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
    * 处理markdown内容，移除frontmatter
    */
  private async processMarkdownContent(content: string, filePath: string): Promise<string> {
    // 移除YAML frontmatter（如果有）
    if (content.startsWith('---')) {
      const parts = content.split('---', 3);
      if (parts.length >= 3) {
        return parts[2]?.trim() ?? '';
      }
    }
    return content.trim();
  }

  /**
    * 处理toml内容，解析为对象
    */
  private async processTomlContent(content: string, filePath: string): Promise<any> {
    // 动态导入toml解析器
    const toml = await import('toml');
    return toml.parse(content);
  }
}
