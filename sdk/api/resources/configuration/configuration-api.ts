/**
 * ConfigurationAPI - 配置管理API
 * 提供配置文件的加载、解析、验证和注册功能
 *
 * 设计原则：
 * - 配置验证使用 sdk/core/validation 中的 WorkflowValidator
 * - 验证结果使用 Result<WorkflowDefinition, ValidationError[]> 类型
 * - 文件 I/O 操作由应用层负责，不委托给 ConfigParser
 */

import { ConfigParser, ConfigFormat } from '../../config';
import { loadConfigContent } from '../../config/config-utils';
import type { WorkflowDefinition } from '../../../types/workflow';
import type { Result } from '../../../types/result';
import type { ValidationError } from '../../../types/errors';

/**
 * ConfigurationAPI - 配置管理API
 */
export class ConfigurationAPI {
  private parser: ConfigParser;

  constructor() {
    this.parser = new ConfigParser();
  }

  /**
   * 加载并注册工作流配置
   * @param filePath 配置文件路径
   * @param parameters 运行时参数
   * @returns 工作流ID
   */
  async loadAndRegisterWorkflow(
    filePath: string,
    parameters?: Record<string, any>
  ): Promise<string> {
    // 应用层负责文件读取
    const { content, format } = await loadConfigContent(filePath);
    const workflowDef = this.parser.parseAndTransform(content, format, parameters);
    
    // 注册到工作流注册表
    const { workflowRegistry } = await import('../../../core/services/workflow-registry');
    workflowRegistry.register(workflowDef);
    
    return workflowDef.id;
  }

  /**
   * 从配置文件内容加载并注册工作流
   * @param content 配置文件内容
   * @param format 配置格式
   * @param parameters 运行时参数
   * @returns 工作流ID
   */
  loadAndRegisterWorkflowFromContent(
    content: string,
    format: ConfigFormat,
    parameters?: Record<string, any>
  ): string {
    const workflowDef = this.parser.parseAndTransform(content, format, parameters);
    
    // 注册到工作流注册表
    const { workflowRegistry } = require('../../../core/services/workflow-registry');
    workflowRegistry.register(workflowDef);
    
    return workflowDef.id;
  }

  /**
   * 验证配置文件
   * @param filePath 配置文件路径
   * @returns 验证结果
   */
  async validateConfigFile(filePath: string): Promise<Result<WorkflowDefinition, ValidationError[]>> {
    // 应用层负责文件读取
    const { content, format } = await loadConfigContent(filePath);
    const parsedConfig = this.parser.parse(content, format);
    const validationResult = this.parser.validate(parsedConfig);
    
    // 转换为 WorkflowDefinition 类型
    if (validationResult.isOk()) {
      const { ok } = await import('../../../utils/result-utils');
      return ok(validationResult.value.config as WorkflowDefinition);
    } else {
      return validationResult as any;
    }
  }

  /**
   * 验证配置文件内容
   * @param content 配置文件内容
   * @param format 配置格式
   * @returns 验证结果
   */
  validateConfigContent(content: string, format: ConfigFormat): Result<WorkflowDefinition, ValidationError[]> {
    const parsedConfig = this.parser.parse(content, format);
    const validationResult = this.parser.validate(parsedConfig);
    
    // 转换为 WorkflowDefinition 类型
    if (validationResult.isOk()) {
      const { ok } = require('../../../utils/result-utils');
      return ok(validationResult.value.config as WorkflowDefinition);
    } else {
      return validationResult as any;
    }
  }

  /**
   * 从配置文件加载工作流定义（不注册）
   * @param filePath 配置文件路径
   * @param parameters 运行时参数
   * @returns 工作流定义
   */
  async loadWorkflowDefinition(
    filePath: string,
    parameters?: Record<string, any>
  ): Promise<WorkflowDefinition> {
    // 应用层负责文件读取
    const { content, format } = await loadConfigContent(filePath);
    return this.parser.parseAndTransform(content, format, parameters);
  }

  /**
   * 从配置文件内容加载工作流定义（不注册）
   * @param content 配置文件内容
   * @param format 配置格式
   * @param parameters 运行时参数
   * @returns 工作流定义
   */
  loadWorkflowDefinitionFromContent(
    content: string,
    format: ConfigFormat,
    parameters?: Record<string, any>
  ): WorkflowDefinition {
    return this.parser.parseAndTransform(content, format, parameters);
  }

  /**
   * 导出工作流定义为配置文件
   * @param workflowId 工作流ID
   * @param filePath 输出文件路径
   */
  async exportWorkflowToConfig(workflowId: string, filePath: string): Promise<void> {
    const { workflowRegistry } = await import('../../../core/services/workflow-registry');
    const workflowDef = workflowRegistry.get(workflowId);
    
    if (!workflowDef) {
      throw new Error(`工作流不存在: ${workflowId}`);
    }
    
    // 应用层负责文件写入
    const fs = await import('fs/promises');
    const { exportWorkflow } = await import('../../config/processors/workflow');
    const content = exportWorkflow(workflowDef, ConfigFormat.JSON);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * 导出工作流定义为配置文件内容
   * @param workflowId 工作流ID
   * @param format 配置格式
   * @returns 配置文件内容
   */
  exportWorkflowToConfigContent(workflowId: string, format: ConfigFormat): string {
    const { workflowRegistry } = require('../../../core/services/workflow-registry');
    const workflowDef = workflowRegistry.get(workflowId);
    
    if (!workflowDef) {
      throw new Error(`工作流不存在: ${workflowId}`);
    }
    
    // 使用 processors 中的导出函数
    const { exportWorkflow } = require('../../config/processors/workflow');
    return exportWorkflow(workflowDef, format);
  }

  /**
   * 批量加载并注册工作流配置
   * @param filePaths 配置文件路径数组
   * @param parameters 运行时参数（可选，应用于所有配置）
   * @returns 工作流ID数组
   */
  async batchLoadAndRegisterWorkflows(
    filePaths: string[],
    parameters?: Record<string, any>
  ): Promise<string[]> {
    const workflowIds: string[] = [];
    
    for (const filePath of filePaths) {
      try {
        const workflowId = await this.loadAndRegisterWorkflow(filePath, parameters);
        workflowIds.push(workflowId);
      } catch (error) {
        console.error(`加载配置文件失败: ${filePath}`, error);
        // 继续处理其他文件
      }
    }
    
    return workflowIds;
  }

  /**
   * 获取配置解析器实例
   * @returns ConfigParser实例
   */
  getParser(): ConfigParser {
    return this.parser;
  }
}