/**
 * Code模块配置验证器
 * 提供Code模块配置的验证逻辑
 */

import { z } from 'zod';
import type { Script, ScriptExecutionOptions, SandboxConfig } from '../../types/code';
import { ScriptType } from '../../types/code';
import { ValidationError } from '../../types/errors';
import { ok, err } from '../../utils/result-utils';
import type { Result } from '../../types/result';

/**
 * 沙箱配置schema
 */
const sandboxConfigSchema = z.object({
  type: z.enum(['docker', 'nodejs', 'python', 'custom']),
  image: z.string().optional(),
  resourceLimits: z.object({
    memory: z.number().positive().optional(),
    cpu: z.number().positive().optional(),
    disk: z.number().positive().optional(),
  }).optional(),
  network: z.object({
    enabled: z.boolean(),
    allowedDomains: z.array(z.string()).optional(),
  }).optional(),
  filesystem: z.object({
    allowedPaths: z.array(z.string()).optional(),
    readOnly: z.boolean().optional(),
  }).optional(),
});

/**
 * 脚本执行选项schema
 */
const scriptExecutionOptionsSchema = z.object({
  timeout: z.number().positive().optional(),
  retries: z.number().nonnegative().optional(),
  retryDelay: z.number().nonnegative().optional(),
  workingDirectory: z.string().optional(),
  environment: z.record(z.string(), z.string()).optional(),
  sandbox: z.boolean().optional(),
  sandboxConfig: sandboxConfigSchema.optional(),
});

/**
 * 脚本元数据schema
 */
const scriptMetadataSchema = z.object({
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
  version: z.string().optional(),
  documentationUrl: z.string().url().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
});

/**
 * 脚本定义schema
 */
const scriptSchema = z.object({
  id: z.string().min(1, 'Script ID is required'),
  name: z.string().min(1, 'Script name is required'),
  type: z.custom<ScriptType>((val): val is ScriptType =>
    Object.values(ScriptType).includes(val as ScriptType)
  ),
  description: z.string().min(1, 'Script description is required'),
  content: z.string().optional(),
  filePath: z.string().optional(),
  options: scriptExecutionOptionsSchema,
  metadata: scriptMetadataSchema.optional(),
}).refine(
  (data) => data.content || data.filePath,
  {
    message: 'Script must have either content or filePath',
    path: ['content'],
  }
);

/**
 * Code配置验证器类
 */
export class CodeConfigValidator {
  /**
   * 验证脚本定义
   * @param script 脚本定义
   * @throws ValidationError 当脚本定义无效时抛出
   */
  validateScript(script: Script): Result<Script, ValidationError[]> {
    const result = scriptSchema.safeParse(script);
    if (!result.success) {
      const error = result.error.issues[0];
      if (!error) {
        return err([new ValidationError('Invalid script configuration', 'script')]);
      }
      return err([new ValidationError(error.message, `script.${error.path.join('.')}`)]);
    }
    return ok(script);
  }

  /**
   * 验证脚本执行选项
   * @param options 脚本执行选项
   * @throws ValidationError 当执行选项无效时抛出
   */
  validateExecutionOptions(options: ScriptExecutionOptions): Result<ScriptExecutionOptions, ValidationError[]> {
    const result = scriptExecutionOptionsSchema.safeParse(options);
    if (!result.success) {
      const error = result.error.issues[0];
      if (!error) {
        return err([new ValidationError('Invalid execution options', 'options')]);
      }
      return err([new ValidationError(error.message, `options.${error.path.join('.')}`)]);
    }
    return ok(options);
  }

  /**
   * 验证沙箱配置
   * @param config 沙箱配置
   * @throws ValidationError 当沙箱配置无效时抛出
   */
  validateSandboxConfig(config: SandboxConfig): Result<SandboxConfig, ValidationError[]> {
    const result = sandboxConfigSchema.safeParse(config);
    if (!result.success) {
      const error = result.error.issues[0];
      if (!error) {
        return err([new ValidationError('Invalid sandbox configuration', 'sandbox')]);
      }
      return err([new ValidationError(error.message, `sandbox.${error.path.join('.')}`)]);
    }
    return ok(config);
  }

  /**
   * 验证脚本类型兼容性
   * @param scriptType 脚本类型
   * @param content 脚本内容
   * @param filePath 文件路径
   * @throws ValidationError 当类型与内容不兼容时抛出
   */
  validateScriptTypeCompatibility(
    scriptType: ScriptType,
    content?: string,
    filePath?: string
  ): Result<void, ValidationError[]> {
    // 验证文件扩展名与脚本类型的兼容性
    if (filePath) {
      const extension = filePath.toLowerCase().split('.').pop();
      const expectedExtensions = this.getExpectedExtensions(scriptType);
      
      if (extension && !expectedExtensions.includes(extension)) {
        return err([
          new ValidationError(
            `File extension '${extension}' is not compatible with script type '${scriptType}'. Expected: ${expectedExtensions.join(', ')}`,
            'filePath'
          )
        ]);
      }
    }

    // 验证内容与脚本类型的兼容性
    if (content) {
      try {
        this.validateContentCompatibility(scriptType, content);
      } catch (error) {
        if (error instanceof ValidationError) {
          return err([error]);
        }
        return err([new ValidationError(
          error instanceof Error ? error.message : String(error),
          'content'
        )]);
      }
    }
    
    return ok(undefined);
  }

  /**
   * 获取脚本类型预期的文件扩展名
   * @param scriptType 脚本类型
   * @returns 预期的文件扩展名数组
   */
  private getExpectedExtensions(scriptType: ScriptType): string[] {
    switch (scriptType) {
      case ScriptType.SHELL:
        return ['sh', 'bash'];
      case ScriptType.CMD:
        return ['bat', 'cmd'];
      case ScriptType.POWERSHELL:
        return ['ps1'];
      case ScriptType.PYTHON:
        return ['py'];
      case ScriptType.JAVASCRIPT:
        return ['js', 'ts'];
      default:
        return [];
    }
  }

  /**
   * 验证内容与脚本类型的兼容性
   * @param scriptType 脚本类型
   * @param content 脚本内容
   * @throws ValidationError 当内容与类型不兼容时抛出
   */
  private validateContentCompatibility(scriptType: ScriptType, content: string): void {
    // 基本语法检查
    switch (scriptType) {
      case ScriptType.SHELL:
        if (!content.includes('#!/bin/bash') && !content.includes('#!/bin/sh')) {
          console.warn('Shell script may be missing shebang line');
        }
        break;
      case ScriptType.POWERSHELL:
        if (!content.includes('#') && !content.includes('Write-Host')) {
          console.warn('PowerShell script may be missing proper syntax');
        }
        break;
      case ScriptType.PYTHON:
        if (!content.includes('def ') && !content.includes('import ')) {
          console.warn('Python script may be missing proper syntax');
        }
        break;
      case ScriptType.JAVASCRIPT:
        if (!content.includes('function') && !content.includes('const') && !content.includes('let')) {
          console.warn('JavaScript script may be missing proper syntax');
        }
        break;
    }
  }

  /**
   * 验证脚本执行环境
   * @param script 脚本定义
   * @param environment 执行环境信息
   * @throws ValidationError 当环境不满足要求时抛出
   */
  validateExecutionEnvironment(script: Script, environment: Record<string, any>): Result<void, ValidationError[]> {
    const { type, options } = script;
    const errors: ValidationError[] = [];

    // 验证必要的环境变量
    if (options.environment) {
      for (const [key, value] of Object.entries(options.environment)) {
        if (typeof value !== 'string') {
          errors.push(new ValidationError(
            `Environment variable '${key}' must be a string`,
            'options.environment'
          ));
        }
      }
    }

    // 验证脚本类型特定的环境要求
    switch (type) {
      case ScriptType.PYTHON:
        if (!environment['pythonAvailable']) {
          errors.push(new ValidationError(
            'Python interpreter is not available in the execution environment',
            'environment'
          ));
        }
        break;
      case ScriptType.JAVASCRIPT:
        if (!environment['nodeAvailable']) {
          errors.push(new ValidationError(
            'Node.js runtime is not available in the execution environment',
            'environment'
          ));
        }
        break;
      case ScriptType.POWERSHELL:
        if (!environment['powershellAvailable']) {
          errors.push(new ValidationError(
            'PowerShell is not available in the execution environment',
            'environment'
          ));
        }
        break;
    }
    
    if (errors.length === 0) {
      return ok(undefined);
    }
    return err(errors);
  }
}