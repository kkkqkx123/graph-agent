/**
 * 规则管理器
 * 
 * 职责：管理模块规则的创建和Schema注册
 * 将业务逻辑从导出文件中分离出来
 */

import { IModuleRule } from '../types';
import { ILogger } from '../../../../domain/common/types';
import { createLLMModuleRule, LLMSchema } from './llm-rule';
import { createToolModuleRule, ToolSchema } from './tool-rule';
import { createPromptModuleRule, PromptSchema } from './prompt-rule';

/**
 * 规则管理器选项
 */
export interface RuleManagerOptions {
  autoRegisterSchemas?: boolean;
  schemaVersion?: string;
}

/**
 * 规则管理器
 */
export class RuleManager {
  private readonly logger: ILogger;
  private readonly options: RuleManagerOptions;

  constructor(
    logger: ILogger,
    options: RuleManagerOptions = {}
  ) {
    this.logger = logger.child({ module: 'RuleManager' });
    this.options = {
      autoRegisterSchemas: true,
      schemaVersion: '1.0.0',
      ...options
    };
  }

  /**
   * 创建所有预定义模块规则并注册Schema
   * 
   * @param loaders 加载器映射表
   * @param schemaRegistry Schema注册表（可选）
   * @returns 模块规则数组
   */
  createAllModuleRules(
    loaders: Map<string, any>,
    schemaRegistry?: any
  ): IModuleRule[] {
    const rules: IModuleRule[] = [];

    // 创建LLM规则
    if (loaders.has('llm')) {
      const rule = createLLMModuleRule(loaders.get('llm'), this.logger);
      rules.push(rule);

      // 注册Schema到注册表
      if (schemaRegistry && this.options.autoRegisterSchemas) {
        this.registerSchema(schemaRegistry, 'llm', rule.schema, 'LLM模块配置Schema');
      }
    }

    // 创建工具规则
    if (loaders.has('tools')) {
      const rule = createToolModuleRule(loaders.get('tools'), this.logger);
      rules.push(rule);

      // 注册Schema到注册表
      if (schemaRegistry && this.options.autoRegisterSchemas) {
        this.registerSchema(schemaRegistry, 'tools', rule.schema, '工具模块配置Schema');
      }
    }

    // 创建提示规则
    if (loaders.has('prompts')) {
      const rule = createPromptModuleRule(loaders.get('prompts'), this.logger);
      rules.push(rule);

      // 注册Schema到注册表
      if (schemaRegistry && this.options.autoRegisterSchemas) {
        this.registerSchema(schemaRegistry, 'prompts', rule.schema, '提示模块配置Schema');
      }
    }

    this.logger.debug('创建所有模块规则完成', { 
      ruleCount: rules.length,
      moduleTypes: rules.map(r => r.moduleType)
    });

    return rules;
  }

  /**
   * 创建单个模块规则并注册Schema
   * 
   * @param moduleType 模块类型
   * @param loader 加载器实例
   * @param schemaRegistry Schema注册表（可选）
   * @returns 模块规则
   */
  createModuleRule(
    moduleType: string,
    loader: any,
    schemaRegistry?: any
  ): IModuleRule {
    let rule: IModuleRule;

    switch (moduleType) {
      case 'llm':
        rule = createLLMModuleRule(loader, this.logger);
        break;
      case 'tools':
        rule = createToolModuleRule(loader, this.logger);
        break;
      case 'prompts':
        rule = createPromptModuleRule(loader, this.logger);
        break;
      default:
        throw new Error(`不支持的模块类型: ${moduleType}`);
    }

    // 注册Schema到注册表
    if (schemaRegistry && this.options.autoRegisterSchemas) {
      this.registerSchema(schemaRegistry, moduleType, rule.schema, `${moduleType}模块配置Schema`);
    }

    this.logger.debug('创建模块规则完成', { moduleType });

    return rule;
  }

  /**
   * 获取所有预定义Schema
   * 
   * @returns Schema映射表
   */
  getAllSchemas(): Record<string, any> {
    return {
      llm: LLMSchema,
      tools: ToolSchema,
      prompts: PromptSchema
    };
  }

  /**
   * 批量注册所有Schema到注册表
   * 
   * @param schemaRegistry Schema注册表
   */
  registerAllSchemas(schemaRegistry: any): void {
    this.registerSchema(schemaRegistry, 'llm', LLMSchema, 'LLM模块配置Schema');
    this.registerSchema(schemaRegistry, 'tools', ToolSchema, '工具模块配置Schema');
    this.registerSchema(schemaRegistry, 'prompts', PromptSchema, '提示模块配置Schema');

    this.logger.debug('批量注册所有Schema完成');
  }

  /**
   * 获取支持的模块类型列表
   */
  getSupportedModuleTypes(): string[] {
    return ['llm', 'tools', 'prompts'];
  }

  /**
   * 检查模块类型是否支持
   */
  isModuleTypeSupported(moduleType: string): boolean {
    return this.getSupportedModuleTypes().includes(moduleType);
  }

  /**
   * 注册Schema到注册表
   */
  private registerSchema(
    schemaRegistry: any,
    moduleType: string,
    schema: any,
    description: string
  ): void {
    try {
      schemaRegistry.registerSchema(
        moduleType, 
        schema, 
        this.options.schemaVersion, 
        description
      );
      this.logger.debug('Schema注册成功', { moduleType });
    } catch (error) {
      this.logger.error('Schema注册失败', error as Error, { moduleType });
      throw error;
    }
  }

  /**
   * 创建自定义模块规则
   * 
   * @param moduleType 模块类型
   * @param loader 加载器实例
   * @param schema Schema定义
   * @param patterns 文件模式
   * @param priority 优先级
   * @param schemaRegistry Schema注册表（可选）
   * @returns 模块规则
   */
  createCustomModuleRule(
    moduleType: string,
    loader: any,
    schema: any,
    patterns: string[],
    priority: number = 50,
    schemaRegistry?: any
  ): IModuleRule {
    const rule: IModuleRule = {
      moduleType,
      patterns,
      priority,
      loader,
      schema,
      dependencies: ['global'],
      mergeStrategy: 'merge_deep' as any
    };

    // 注册Schema到注册表
    if (schemaRegistry && this.options.autoRegisterSchemas) {
      this.registerSchema(schemaRegistry, moduleType, schema, `自定义${moduleType}模块配置Schema`);
    }

    this.logger.debug('创建自定义模块规则完成', { moduleType });

    return rule;
  }
}