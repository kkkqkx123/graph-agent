/**
 * ToolConfigValidatorAPI - Tool模块配置验证API
 * 封装ToolConfigValidator，提供工具配置验证接口
 */

import { ToolConfigValidator } from '../../core/validation/tool-config-validator';
import type { Tool, ToolParameters } from '../../types/tool';
import { ToolType } from '../../types/tool';
import type { ValidationResult } from '../../types/errors';
import { ValidationError } from '../../types/errors';

/**
 * ToolConfigValidatorAPI - Tool模块配置验证API
 */
export class ToolConfigValidatorAPI {
  private toolConfigValidator: ToolConfigValidator;

  constructor() {
    this.toolConfigValidator = new ToolConfigValidator();
  }

  /**
   * 验证工具定义
   * @param tool 工具定义
   * @returns 验证结果
   */
  async validateTool(tool: Tool): Promise<ValidationResult> {
    try {
      this.toolConfigValidator.validateTool(tool);
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
          'tool'
        )],
        warnings: []
      };
    }
  }

  /**
   * 验证工具参数schema
   * @param parameters 工具参数schema
   * @returns 验证结果
   */
  async validateParameters(parameters: ToolParameters): Promise<ValidationResult> {
    try {
      this.toolConfigValidator.validateParameters(parameters);
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
          'parameters'
        )],
        warnings: []
      };
    }
  }

  /**
   * 验证工具配置
   * @param toolType 工具类型
   * @param config 工具配置
   * @returns 验证结果
   */
  async validateToolConfig(toolType: ToolType, config: any): Promise<ValidationResult> {
    try {
      this.toolConfigValidator.validateToolConfig(toolType, config);
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
          'config'
        )],
        warnings: []
      };
    }
  }

  /**
   * 验证工具调用参数
   * @param tool 工具定义
   * @param parameters 调用参数
   * @returns 验证结果
   */
  async validateToolCallParameters(tool: Tool, parameters: Record<string, any>): Promise<ValidationResult> {
    try {
      this.toolConfigValidator.validateToolCallParameters(tool, parameters);
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
          'parameters'
        )],
        warnings: []
      };
    }
  }

  /**
   * 验证工具兼容性
   * @param tool 工具定义
   * @param environment 执行环境信息
   * @returns 验证结果
   */
  async validateToolCompatibility(tool: Tool, environment: Record<string, any>): Promise<ValidationResult> {
    try {
      this.toolConfigValidator.validateToolCompatibility(tool, environment);
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
   * 获取底层ToolConfigValidator实例
   * @returns ToolConfigValidator实例
   */
  getToolConfigValidator(): ToolConfigValidator {
    return this.toolConfigValidator;
  }
}