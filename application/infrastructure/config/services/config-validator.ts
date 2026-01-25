/**
 * 配置验证服务
 * 统一处理配置验证逻辑，包括文件语法验证和Schema验证
 */

import { ILogger } from '../../../domain/common/types';
import { ConfigFile } from '../loading/types';
import { ValidationResult, ValidationError } from '../loading/types';
import { SchemaRegistry } from '../loading/schema-registry';
import { ConfigFileService } from './config-file-service';
import { ConfigurationError } from '../../../domain/common/exceptions';

/**
 * 验证选项
 */
export interface ValidationOptions {
  enableSyntaxValidation?: boolean;
  enableSchemaValidation?: boolean;
  failOnSyntaxError?: boolean;
  failOnSchemaError?: boolean;
}

/**
 * 验证结果详情
 */
export interface ValidationDetail {
  moduleType: string;
  syntaxValid: boolean;
  schemaValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * 配置验证服务
 * 提供统一的配置验证功能
 */
export class ConfigValidator {
  private readonly logger: ILogger;
  private readonly schemaRegistry: SchemaRegistry;
  private readonly fileService: ConfigFileService;
  private readonly options: Required<ValidationOptions>;

  constructor(
    logger: ILogger,
    schemaRegistry: SchemaRegistry,
    fileService: ConfigFileService,
    options: ValidationOptions = {}
  ) {
    this.logger = logger;
    this.schemaRegistry = schemaRegistry;
    this.fileService = fileService;
    this.options = {
      enableSyntaxValidation: options.enableSyntaxValidation ?? true,
      enableSchemaValidation: options.enableSchemaValidation ?? true,
      failOnSyntaxError: options.failOnSyntaxError ?? true,
      failOnSchemaError: options.failOnSchemaError ?? true,
    };
  }

  /**
   * 验证模块配置文件
   * 包括语法验证和Schema验证
   */
  async validateModuleConfig(
    moduleType: string,
    files: ConfigFile[],
    processedConfig?: Record<string, any>
  ): Promise<ValidationDetail> {
    this.logger.debug('开始验证模块配置', { moduleType, fileCount: files.length });

    const detail: ValidationDetail = {
      moduleType,
      syntaxValid: true,
      schemaValid: true,
      errors: [],
      warnings: [],
    };

    // 1. 语法验证
    if (this.options.enableSyntaxValidation) {
      const syntaxResult = await this.validateFilesSyntax(files);
      detail.syntaxValid = syntaxResult.valid.length > 0;

      if (syntaxResult.invalid.length > 0) {
        const syntaxErrors = syntaxResult.invalid.map(({ file, error }) => ({
          path: file.path,
          message: error,
          code: 'SYNTAX_ERROR',
          severity: 'error' as const,
        }));
        detail.errors.push(...syntaxErrors);

        this.logger.warn('模块配置文件语法验证失败', {
          moduleType,
          validCount: syntaxResult.valid.length,
          invalidCount: syntaxResult.invalid.length,
        });

        if (this.options.failOnSyntaxError && detail.syntaxValid === false) {
          throw new ConfigurationError(
            `模块 ${moduleType} 所有配置文件语法验证失败`
          );
        }
      }
    }

    // 2. Schema验证
    if (this.options.enableSchemaValidation && processedConfig) {
      const schemaResult = this.schemaRegistry.validateConfig(moduleType, processedConfig);
      detail.schemaValid = schemaResult.isValid;

      if (!schemaResult.isValid) {
        detail.errors.push(...schemaResult.errors);

        this.logger.warn('模块配置Schema验证失败', {
          moduleType,
          errorCount: schemaResult.errors.length,
          severity: schemaResult.severity,
        });

        if (this.options.failOnSchemaError) {
          const errorMessages = schemaResult.errors.map(e => `${e.path}: ${e.message}`);
          throw new ConfigurationError(
            `模块 ${moduleType} Schema验证失败:\n${errorMessages.join('\n')}`
          );
        }
      }
    }

    // 分离错误和警告
    detail.warnings = detail.errors.filter(e => e.severity === 'warning');
    detail.errors = detail.errors.filter(e => e.severity === 'error');

    this.logger.debug('模块配置验证完成', {
      moduleType,
      syntaxValid: detail.syntaxValid,
      schemaValid: detail.schemaValid,
      errorCount: detail.errors.length,
      warningCount: detail.warnings.length,
    });

    return detail;
  }

  /**
   * 验证文件语法
   */
  async validateFilesSyntax(files: ConfigFile[]): Promise<{
    valid: ConfigFile[];
    invalid: Array<{ file: ConfigFile; error: string }>;
  }> {
    return this.fileService.validateSyntaxBatch(files);
  }

  /**
   * 验证单个配置对象
   */
  validateConfig(moduleType: string, config: Record<string, any>): ValidationResult {
    if (!this.options.enableSchemaValidation) {
      return {
        isValid: true,
        errors: [],
        severity: 'success',
      };
    }

    return this.schemaRegistry.validateConfig(moduleType, config);
  }

  /**
   * 批量验证多个模块配置
   */
  async validateBatch(
    configs: Map<string, { files: ConfigFile[]; processedConfig?: Record<string, any> }>
  ): Promise<Map<string, ValidationDetail>> {
    const results = new Map<string, ValidationDetail>();

    for (const [moduleType, { files, processedConfig }] of configs.entries()) {
      try {
        const detail = await this.validateModuleConfig(moduleType, files, processedConfig);
        results.set(moduleType, detail);
      } catch (error) {
        this.logger.error('模块配置验证失败', error as Error, { moduleType });
        results.set(moduleType, {
          moduleType,
          syntaxValid: false,
          schemaValid: false,
          errors: [
            {
              path: 'root',
              message: (error as Error).message,
              code: 'VALIDATION_ERROR',
              severity: 'error',
            },
          ],
          warnings: [],
        });
      }
    }

    return results;
  }

  /**
   * 检查模块类型是否已注册Schema
   */
  hasSchema(moduleType: string): boolean {
    return this.schemaRegistry.hasModuleType(moduleType);
  }

  /**
   * 获取所有已注册的模块类型
   */
  getRegisteredModuleTypes(): string[] {
    return this.schemaRegistry.getRegisteredTypes();
  }
}