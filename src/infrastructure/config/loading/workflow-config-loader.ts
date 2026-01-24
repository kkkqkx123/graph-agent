/**
 * 工作流配置加载器
 * 负责加载工作流配置文件，支持参数替换和验证
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { parse as parseToml } from 'toml';
import { WorkflowConfigSchema, WorkflowConfig } from './schemas/workflow-schema';
import { ParameterReplacer } from './parameter-replacer';
import { ILogger } from '../../../domain/common';
import { EntityNotFoundError, ValidationError } from '../../../domain/common/exceptions';

/**
 * 工作流配置加载选项
 */
export interface WorkflowConfigLoaderOptions {
  /** 配置文件基础目录 */
  basePath?: string;
  /** 是否启用验证 */
  enableValidation?: boolean;
  /** 是否启用参数替换 */
  enableParameterReplacement?: boolean;
}

/**
 * 工作流配置加载器
 */
export class WorkflowConfigLoader {
  private readonly basePath: string;
  private readonly enableValidation: boolean;
  private readonly enableParameterReplacement: boolean;
  private readonly logger: ILogger;

  constructor(
    logger: ILogger,
    options: WorkflowConfigLoaderOptions = {}
  ) {
    this.logger = logger;
    this.basePath = options.basePath || 'configs/workflows';
    this.enableValidation = options.enableValidation ?? true;
    this.enableParameterReplacement = options.enableParameterReplacement ?? true;
  }

  /**
   * 加载工作流配置
   * @param workflowId 工作流ID
   * @param parameters 参数值（可选）
   * @returns 工作流配置
   */
  async loadWorkflowConfig(
    workflowId: string,
    parameters?: Record<string, any>
  ): Promise<WorkflowConfig> {
    this.logger.info('开始加载工作流配置', { workflowId, parameters: parameters ? Object.keys(parameters) : [] });

    try {
      // 1. 加载原始配置
      const rawConfig = await this.loadRawConfig(workflowId);
      this.logger.debug('原始配置加载完成', { workflowId });

      // 2. 验证配置
      if (this.enableValidation) {
        this.validateConfig(rawConfig);
        this.logger.debug('配置验证完成', { workflowId });
      }

      // 3. 验证参数引用
      if (parameters && this.enableParameterReplacement) {
        const undefinedParams = ParameterReplacer.validateParameters(
          rawConfig,
          new Set(Object.keys(parameters))
        );
        if (undefinedParams.length > 0) {
          this.logger.warn('配置中包含未定义的参数引用', {
            workflowId,
            undefinedParams,
            availableParams: Object.keys(parameters)
          });
        }
      }

      // 4. 替换参数
      let config = rawConfig;
      if (parameters && this.enableParameterReplacement) {
        config = ParameterReplacer.replace(rawConfig, parameters);
        this.logger.debug('参数替换完成', { workflowId });
      }

      // 5. 转换为WorkflowConfig对象
      const workflowConfig = config as WorkflowConfig;

      this.logger.info('工作流配置加载完成', { workflowId });
      return workflowConfig;
    } catch (error) {
      this.logger.error('工作流配置加载失败', error as Error, { workflowId });
      throw error;
    }
  }

  /**
   * 加载原始配置
   * @param workflowId 工作流ID
   * @returns 原始配置对象
   */
  private async loadRawConfig(workflowId: string): Promise<any> {
    // 尝试不同的路径
    const possiblePaths = [
      path.join(this.basePath, `${workflowId}.toml`),
      path.join(this.basePath, 'base', `${workflowId}.toml`),
      path.join(this.basePath, 'features', `${workflowId}.toml`),
      path.join(this.basePath, 'business', `${workflowId}.toml`),
    ];

    for (const configPath of possiblePaths) {
      try {
        const content = await fs.readFile(configPath, 'utf8');
        const parsed = parseToml(content);
        this.logger.debug('配置文件加载成功', { workflowId, configPath });
        return parsed;
      } catch (error) {
        // 继续尝试下一个路径
        continue;
      }
    }

    throw new EntityNotFoundError('WorkflowConfig', workflowId);
  }

  /**
   * 验证配置
   * @param config 配置对象
   */
  private validateConfig(config: any): void {
    try {
      WorkflowConfigSchema.parse(config);
    } catch (error) {
      throw new ValidationError(`工作流配置验证失败: ${(error as Error).message}`);
    }
  }

  /**
   * 检查工作流配置是否存在
   * @param workflowId 工作流ID
   * @returns 是否存在
   */
  async exists(workflowId: string): Promise<boolean> {
    try {
      await this.loadRawConfig(workflowId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取工作流配置路径
   * @param workflowId 工作流ID
   * @returns 配置文件路径
   */
  async getConfigPath(workflowId: string): Promise<string | null> {
    const possiblePaths = [
      path.join(this.basePath, `${workflowId}.toml`),
      path.join(this.basePath, 'base', `${workflowId}.toml`),
      path.join(this.basePath, 'features', `${workflowId}.toml`),
      path.join(this.basePath, 'business', `${workflowId}.toml`),
    ];

    for (const configPath of possiblePaths) {
      try {
        await fs.access(configPath);
        return configPath;
      } catch (error) {
        continue;
      }
    }

    return null;
  }
}