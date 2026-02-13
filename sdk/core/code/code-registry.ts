/**
 * 脚本注册表
 * 负责脚本定义的管理
 */

import type { Script } from '@modular-agent/types/code';
import { ValidationError, NotFoundError, ConfigurationValidationError, ScriptNotFoundError } from '@modular-agent/types/errors';

/**
 * 脚本注册表类
 */
export class CodeRegistry {
  private scripts: Map<string, Script> = new Map();

  /**
   * 注册脚本定义
   * @param script 脚本定义
   * @throws ValidationError 如果脚本定义无效
   */
  register(script: Script): void {
    // 验证脚本定义
    this.validate(script);

    // 设置默认值
    const scriptWithDefaults: Script = {
      ...script,
      enabled: script.enabled !== undefined ? script.enabled : true
    };

    // 检查脚本名称是否已存在
    if (this.scripts.has(script.name)) {
      throw new ConfigurationValidationError(
        `Script with name '${script.name}' already exists`,
        {
          configType: 'script',
          field: 'name'
        }
      );
    }

    // 注册脚本
    this.scripts.set(script.name, scriptWithDefaults);
  }

  /**
   * 批量注册脚本
   * @param scripts 脚本定义数组
   */
  registerBatch(scripts: Script[]): void {
    for (const script of scripts) {
      this.register(script);
    }
  }

  /**
   * 获取脚本定义
   * @param scriptName 脚本名称
   * @returns 脚本定义，如果不存在则返回undefined
   */
  get(scriptName: string): Script | undefined {
    return this.scripts.get(scriptName);
  }

  /**
   * 检查脚本是否存在
   * @param scriptName 脚本名称
   * @returns 是否存在
   */
  has(scriptName: string): boolean {
    return this.scripts.has(scriptName);
  }

  /**
   * 删除脚本定义
   * @param scriptName 脚本名称
   * @throws NotFoundError 如果脚本不存在
   */
  remove(scriptName: string): void {
    if (!this.scripts.has(scriptName)) {
      throw new ScriptNotFoundError(
        `Script '${scriptName}' not found`,
        scriptName
      );
    }
    this.scripts.delete(scriptName);
  }

  /**
   * 列出所有脚本
   * @returns 脚本定义数组
   */
  list(): Script[] {
    return Array.from(this.scripts.values());
  }

  /**
   * 按类型列出脚本
   * @param type 脚本类型
   * @returns 脚本定义数组
   */
  listByType(type: string): Script[] {
    return this.list().filter(script => script.type === type);
  }

  /**
   * 按分类列出脚本
   * @param category 脚本分类
   * @returns 脚本定义数组
   */
  listByCategory(category: string): Script[] {
    return this.list().filter(
      script => script.metadata?.category === category
    );
  }

  /**
   * 清空所有脚本
   */
  clear(): void {
    this.scripts.clear();
  }

  /**
   * 获取脚本数量
   * @returns 脚本数量
   */
  size(): number {
    return this.scripts.size;
  }

  /**
   * 验证脚本定义
   * @param script 脚本定义
   * @returns 是否有效
   * @throws ValidationError 如果脚本定义无效
   */
  validate(script: Script): boolean {
    // 验证必需字段
    if (!script.name || typeof script.name !== 'string') {
      throw new ConfigurationValidationError(
        'Script name is required and must be a string',
        {
          configType: 'script',
          field: 'name'
        }
      );
    }

    if (!script.type || typeof script.type !== 'string') {
      throw new ConfigurationValidationError(
        'Script type is required and must be a string',
        {
          configType: 'script',
          field: 'type'
        }
      );
    }

    if (!script.description || typeof script.description !== 'string') {
      throw new ConfigurationValidationError(
        'Script description is required and must be a string',
        {
          configType: 'script',
          field: 'description'
        }
      );
    }

    // 验证脚本内容或文件路径至少有一个
    if (!script.content && !script.filePath) {
      throw new ConfigurationValidationError(
        'Script must have either content or filePath',
        {
          configType: 'script',
          field: 'content'
        }
      );
    }

    // 验证执行选项
    if (!script.options) {
      throw new ConfigurationValidationError(
        'Script options are required',
        {
          configType: 'script',
          field: 'options'
        }
      );
    }

    // 验证超时时间
    if (script.options.timeout !== undefined && script.options.timeout < 0) {
      throw new ConfigurationValidationError(
        'Script timeout must be a positive number',
        {
          configType: 'script',
          field: 'options.timeout'
        }
      );
    }

    // 验证重试次数
    if (script.options.retries !== undefined && script.options.retries < 0) {
      throw new ConfigurationValidationError(
        'Script retries must be a non-negative number',
        {
          configType: 'script',
          field: 'options.retries'
        }
      );
    }

    // 验证重试延迟
    if (script.options.retryDelay !== undefined && script.options.retryDelay < 0) {
      throw new ConfigurationValidationError(
        'Script retryDelay must be a non-negative number',
        {
          configType: 'script',
          field: 'options.retryDelay'
        }
      );
    }

    // 验证 enabled 字段（如果提供）
    if (script.enabled !== undefined && typeof script.enabled !== 'boolean') {
      throw new ConfigurationValidationError(
        'Script enabled must be a boolean',
        {
          configType: 'script',
          field: 'enabled'
        }
      );
    }

    return true;
  }

  /**
   * 搜索脚本
   * @param query 搜索关键词
   * @returns 匹配的脚本数组
   */
  search(query: string): Script[] {
    const lowerQuery = query.toLowerCase();
    return this.list().filter(script => {
      return (
        script.name.toLowerCase().includes(lowerQuery) ||
        script.description.toLowerCase().includes(lowerQuery) ||
        script.metadata?.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        script.metadata?.category?.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * 更新脚本定义
   * @param scriptName 脚本名称
   * @param updates 更新内容
   * @throws NotFoundError 如果脚本不存在
   */
  update(scriptName: string, updates: Partial<Script>): void {
    const script = this.get(scriptName);
    if (!script) {
      throw new ScriptNotFoundError(
        `Script '${scriptName}' not found`,
        scriptName
      );
    }
    
    const updatedScript = {
      ...script,
      ...updates,
      // 确保 enabled 字段有默认值
      enabled: updates.enabled !== undefined ? updates.enabled : (script.enabled ?? true)
    };
    
    this.validate(updatedScript);
    this.scripts.set(scriptName, updatedScript);
  }
}