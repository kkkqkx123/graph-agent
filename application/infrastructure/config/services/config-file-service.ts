/**
 * 配置文件服务
 * 统一处理配置文件的读取、解析和验证操作
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { parse as parseToml } from 'toml';
import { ILogger } from '../../../domain/common/types';
import { ConfigFile } from '../loading/types';
import { InvalidConfigurationError } from '../../../domain/common/exceptions';

/**
 * 文件读取结果
 */
export interface FileReadResult {
  success: boolean;
  content?: Record<string, any>;
  error?: string;
  filePath: string;
}

/**
 * 配置文件服务
 * 提供统一的文件读取、解析和验证功能
 */
export class ConfigFileService {
  private readonly logger: ILogger;
  private readonly supportedExtensions: string[];

  constructor(logger: ILogger, supportedExtensions: string[] = ['.toml']) {
    this.logger = logger;
    this.supportedExtensions = supportedExtensions;
  }

  /**
   * 读取并解析单个配置文件
   */
  async readAndParse(filePath: string): Promise<Record<string, any>> {
    try {
      this.logger.debug('读取配置文件', { filePath });
      
      const content = await fs.readFile(filePath, 'utf8');
      const parsed = this.parseContent(content, filePath);
      
      this.logger.debug('配置文件读取成功', { filePath });
      return parsed;
    } catch (error) {
      const errorMessage = `读取配置文件失败 ${filePath}: ${(error as Error).message}`;
      this.logger.error(errorMessage, error as Error);
      throw new InvalidConfigurationError('read', errorMessage);
    }
  }

  /**
   * 批量读取并解析配置文件
   */
  async readAndParseBatch(files: ConfigFile[]): Promise<Array<{ file: ConfigFile; content: Record<string, any> }>> {
    const results: Array<{ file: ConfigFile; content: Record<string, any> }> = [];
    const errors: Array<{ filePath: string; error: string }> = [];

    for (const file of files) {
      try {
        const content = await this.readAndParse(file.path);
        results.push({ file, content });
      } catch (error) {
        errors.push({
          filePath: file.path,
          error: (error as Error).message
        });
      }
    }

    if (errors.length > 0) {
      this.logger.warn('部分配置文件读取失败', {
        total: files.length,
        success: results.length,
        failed: errors.length,
        failedFiles: errors.map(e => e.filePath)
      });
    }

    return results;
  }

  /**
   * 验证配置文件语法
   */
  async validateSyntax(filePath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      this.parseContent(content, filePath);
      return true;
    } catch (error) {
      this.logger.warn('配置文件语法验证失败', {
        filePath,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * 批量验证配置文件语法
   */
  async validateSyntaxBatch(files: ConfigFile[]): Promise<{
    valid: ConfigFile[];
    invalid: Array<{ file: ConfigFile; error: string }>
  }> {
    const valid: ConfigFile[] = [];
    const invalid: Array<{ file: ConfigFile; error: string }> = [];

    for (const file of files) {
      try {
        await this.validateSyntax(file.path);
        valid.push(file);
      } catch (error) {
        invalid.push({
          file,
          error: (error as Error).message
        });
      }
    }

    return { valid, invalid };
  }

  /**
   * 检查文件扩展名是否支持
   */
  isSupportedExtension(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedExtensions.includes(ext);
  }

  /**
   * 解析文件内容
   */
  private parseContent(content: string, filePath: string): Record<string, any> {
    const ext = path.extname(filePath).toLowerCase();

    if (!this.isSupportedExtension(filePath)) {
      throw new InvalidConfigurationError(
        'format',
        `不支持的配置文件格式: ${ext}，支持的格式: ${this.supportedExtensions.join(', ')}`
      );
    }

    try {
      return parseToml(content);
    } catch (error) {
      throw new InvalidConfigurationError(
        'content',
        `解析配置文件失败 ${filePath}: ${(error as Error).message}`
      );
    }
  }

  /**
   * 获取文件状态信息
   */
  async getFileInfo(filePath: string): Promise<{
    size: number;
    modified: Date;
    created: Date;
  }> {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime
    };
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}