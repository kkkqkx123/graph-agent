/**
 * CodeConfigValidatorAPI - Code模块配置验证API
 * 封装CodeConfigValidator，提供脚本配置验证接口
 */

import { CodeConfigValidator } from '../../core/validation/code-config-validator';
import type { Script, ScriptExecutionOptions, SandboxConfig } from '../../types/code';
import { ScriptType } from '../../types/code';
import type { ValidationResult } from '../../types/errors';
import { ValidationError } from '../../types/errors';

/**
 * CodeConfigValidatorAPI - Code模块配置验证API
 */
export class CodeConfigValidatorAPI {
  private codeConfigValidator: CodeConfigValidator;

  constructor() {
    this.codeConfigValidator = new CodeConfigValidator();
  }

  /**
   * 验证脚本定义
   * @param script 脚本定义
   * @returns 验证结果
   */
  async validateScript(script: Script): Promise<ValidationResult> {
    try {
      this.codeConfigValidator.validateScript(script);
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          valid: false,
          errors: [error],
          warnings: []
        };
      }
      return {
        valid: false,
        errors: [new ValidationError(
          error instanceof Error ? error.message : 'Unknown validation error',
          'script'
        )],
        warnings: []
      };
    }
  }

  /**
   * 验证脚本执行选项
   * @param options 脚本执行选项
   * @returns 验证结果
   */
  async validateExecutionOptions(options: ScriptExecutionOptions): Promise<ValidationResult> {
    try {
      this.codeConfigValidator.validateExecutionOptions(options);
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          valid: false,
          errors: [error],
          warnings: []
        };
      }
      return {
        valid: false,
        errors: [new ValidationError(
          error instanceof Error ? error.message : 'Unknown validation error',
          'options'
        )],
        warnings: []
      };
    }
  }

  /**
   * 验证沙箱配置
   * @param config 沙箱配置
   * @returns 验证结果
   */
  async validateSandboxConfig(config: SandboxConfig): Promise<ValidationResult> {
    try {
      this.codeConfigValidator.validateSandboxConfig(config);
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          valid: false,
          errors: [error],
          warnings: []
        };
      }
      return {
        valid: false,
        errors: [new ValidationError(
          error instanceof Error ? error.message : 'Unknown validation error',
          'sandbox'
        )],
        warnings: []
      };
    }
  }

  /**
   * 验证脚本类型兼容性
   * @param scriptType 脚本类型
   * @param content 脚本内容
   * @param filePath 文件路径
   * @returns 验证结果
   */
  async validateScriptTypeCompatibility(
    scriptType: ScriptType,
    content?: string,
    filePath?: string
  ): Promise<ValidationResult> {
    try {
      this.codeConfigValidator.validateScriptTypeCompatibility(scriptType, content, filePath);
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          valid: false,
          errors: [error],
          warnings: []
        };
      }
      return {
        valid: false,
        errors: [new ValidationError(
          error instanceof Error ? error.message : 'Unknown validation error',
          'scriptType'
        )],
        warnings: []
      };
    }
  }

  /**
   * 验证脚本执行环境
   * @param script 脚本定义
   * @param environment 执行环境信息
   * @returns 验证结果
   */
  async validateExecutionEnvironment(
    script: Script,
    environment: Record<string, any>
  ): Promise<ValidationResult> {
    try {
      this.codeConfigValidator.validateExecutionEnvironment(script, environment);
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          valid: false,
          errors: [error],
          warnings: []
        };
      }
      return {
        valid: false,
        errors: [new ValidationError(
          error instanceof Error ? error.message : 'Unknown validation error',
          'environment'
        )],
        warnings: []
      };
    }
  }

  /**
   * 获取底层CodeConfigValidator实例
   * @returns CodeConfigValidator实例
   */
  getCodeConfigValidator(): CodeConfigValidator {
    return this.codeConfigValidator;
  }
}