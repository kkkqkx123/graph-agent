/**
 * Prompts模块异常定义
 *
 * 提供提示词相关的异常类
 */

/**
 * Prompt异常基类
 */
export class PromptError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'PromptError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词创建失败异常
 */
export class PromptCreationError extends PromptError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super(`提示词创建失败: ${reason}`, 'PROMPT_CREATION_FAILED', details);
    this.name = 'PromptCreationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词名称验证失败异常
 */
export class PromptNameValidationError extends PromptError {
  constructor(name: string, reason: string, details?: Record<string, unknown>) {
    super(`提示词名称验证失败 [${name}]: ${reason}`, 'PROMPT_NAME_VALIDATION_FAILED', {
      name,
      ...details,
    });
    this.name = 'PromptNameValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词内容验证失败异常
 */
export class PromptContentValidationError extends PromptError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super(`提示词内容验证失败: ${reason}`, 'PROMPT_CONTENT_VALIDATION_FAILED', details);
    this.name = 'PromptContentValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词内容长度验证失败异常
 */
export class PromptContentLengthError extends PromptError {
  constructor(actualLength: number, expectedLength: number, type: 'min' | 'max', details?: Record<string, unknown>) {
    const message =
      type === 'min'
        ? `提示词内容长度不足: 实际 ${actualLength} 字符，最少需要 ${expectedLength} 字符`
        : `提示词内容长度超限: 实际 ${actualLength} 字符，最多允许 ${expectedLength} 字符`;
    super(message, 'PROMPT_CONTENT_LENGTH_INVALID', { actualLength, expectedLength, type, ...details });
    this.name = 'PromptContentLengthError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词包含禁止词汇异常
 */
export class PromptForbiddenWordsError extends PromptError {
  constructor(words: string[], details?: Record<string, unknown>) {
    super(`提示词包含禁止词汇: ${words.join(', ')}`, 'PROMPT_CONTAINS_FORBIDDEN_WORDS', {
      words,
      ...details,
    });
    this.name = 'PromptForbiddenWordsError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词缺少必需关键词异常
 */
export class PromptMissingKeywordsError extends PromptError {
  constructor(keywords: string[], details?: Record<string, unknown>) {
    super(`提示词缺少必需关键词: ${keywords.join(', ')}`, 'PROMPT_MISSING_REQUIRED_KEYWORDS', {
      keywords,
      ...details,
    });
    this.name = 'PromptMissingKeywordsError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词分类验证失败异常
 */
export class PromptCategoryValidationError extends PromptError {
  constructor(category: string, reason: string, details?: Record<string, unknown>) {
    super(`提示词分类验证失败 [${category}]: ${reason}`, 'PROMPT_CATEGORY_VALIDATION_FAILED', {
      category,
      ...details,
    });
    this.name = 'PromptCategoryValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词更新失败异常
 */
export class PromptUpdateError extends PromptError {
  constructor(promptId: string, reason: string, details?: Record<string, unknown>) {
    super(`提示词更新失败 [${promptId}]: ${reason}`, 'PROMPT_UPDATE_FAILED', { promptId, ...details });
    this.name = 'PromptUpdateError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词删除失败异常
 */
export class PromptDeletionError extends PromptError {
  constructor(promptId: string, reason: string, details?: Record<string, unknown>) {
    super(`提示词删除失败 [${promptId}]: ${reason}`, 'PROMPT_DELETION_FAILED', { promptId, ...details });
    this.name = 'PromptDeletionError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词未找到异常
 */
export class PromptNotFoundError extends PromptError {
  constructor(promptId: string, details?: Record<string, unknown>) {
    super(`提示词未找到: ${promptId}`, 'PROMPT_NOT_FOUND', { promptId, ...details });
    this.name = 'PromptNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词已删除异常
 */
export class PromptAlreadyDeletedError extends PromptError {
  constructor(promptId: string, details?: Record<string, unknown>) {
    super(`提示词已删除: ${promptId}`, 'PROMPT_ALREADY_DELETED', { promptId, ...details });
    this.name = 'PromptAlreadyDeletedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词状态转换失败异常
 */
export class PromptStatusTransitionError extends PromptError {
  constructor(promptId: string, currentStatus: string, targetStatus: string, reason: string, details?: Record<string, unknown>) {
    super(
      `提示词状态转换失败 [${promptId}]: ${currentStatus} -> ${targetStatus} - ${reason}`,
      'PROMPT_STATUS_TRANSITION_FAILED',
      { promptId, currentStatus, targetStatus, ...details }
    );
    this.name = 'PromptStatusTransitionError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词已激活异常
 */
export class PromptAlreadyActiveError extends PromptError {
  constructor(promptId: string, details?: Record<string, unknown>) {
    super(`提示词已经是激活状态: ${promptId}`, 'PROMPT_ALREADY_ACTIVE', { promptId, ...details });
    this.name = 'PromptAlreadyActiveError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词已禁用异常
 */
export class PromptAlreadyInactiveError extends PromptError {
  constructor(promptId: string, details?: Record<string, unknown>) {
    super(`提示词已经是禁用状态: ${promptId}`, 'PROMPT_ALREADY_INACTIVE', { promptId, ...details });
    this.name = 'PromptAlreadyInactiveError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词已弃用异常
 */
export class PromptAlreadyDeprecatedError extends PromptError {
  constructor(promptId: string, details?: Record<string, unknown>) {
    super(`提示词已经是弃用状态: ${promptId}`, 'PROMPT_ALREADY_DEPRECATED', { promptId, ...details });
    this.name = 'PromptAlreadyDeprecatedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词ID解析失败异常
 */
export class PromptIdParseError extends PromptError {
  constructor(promptId: string, reason: string, details?: Record<string, unknown>) {
    super(`提示词ID解析失败 [${promptId}]: ${reason}`, 'PROMPT_ID_PARSE_FAILED', { promptId, ...details });
    this.name = 'PromptIdParseError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词ID格式无效异常
 */
export class PromptIdFormatError extends PromptError {
  constructor(promptId: string, details?: Record<string, unknown>) {
    super(`提示词ID格式无效: ${promptId}`, 'PROMPT_ID_FORMAT_INVALID', { promptId, ...details });
    this.name = 'PromptIdFormatError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词查询失败异常
 */
export class PromptQueryError extends PromptError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super(`提示词查询失败: ${reason}`, 'PROMPT_QUERY_FAILED', details);
    this.name = 'PromptQueryError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词搜索失败异常
 */
export class PromptSearchError extends PromptError {
  constructor(criteria: string, reason: string, details?: Record<string, unknown>) {
    super(`提示词搜索失败 [${criteria}]: ${reason}`, 'PROMPT_SEARCH_FAILED', { criteria, ...details });
    this.name = 'PromptSearchError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词变量验证失败异常
 */
export class PromptVariableValidationError extends PromptError {
  constructor(variableName: string, reason: string, details?: Record<string, unknown>) {
    super(`提示词变量验证失败 [${variableName}]: ${reason}`, 'PROMPT_VARIABLE_VALIDATION_FAILED', {
      variableName,
      ...details,
    });
    this.name = 'PromptVariableValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词依赖验证失败异常
 */
export class PromptDependencyError extends PromptError {
  constructor(promptId: string, dependency: string, reason: string, details?: Record<string, unknown>) {
    super(
      `提示词依赖验证失败 [${promptId}]: ${dependency} - ${reason}`,
      'PROMPT_DEPENDENCY_VALIDATION_FAILED',
      { promptId, dependency, ...details }
    );
    this.name = 'PromptDependencyError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词模板验证失败异常
 */
export class PromptTemplateValidationError extends PromptError {
  constructor(template: string, reason: string, details?: Record<string, unknown>) {
    super(`提示词模板验证失败: ${reason}`, 'PROMPT_TEMPLATE_VALIDATION_FAILED', { template, ...details });
    this.name = 'PromptTemplateValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词存储失败异常
 */
export class PromptStorageError extends PromptError {
  constructor(operation: string, reason: string, details?: Record<string, unknown>) {
    super(`提示词存储失败: ${operation} - ${reason}`, 'PROMPT_STORAGE_FAILED', { operation, ...details });
    this.name = 'PromptStorageError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词元数据操作失败异常
 */
export class PromptMetadataError extends PromptError {
  constructor(promptId: string, operation: string, reason: string, details?: Record<string, unknown>) {
    super(
      `提示词元数据操作失败 [${promptId}]: ${operation} - ${reason}`,
      'PROMPT_METADATA_OPERATION_FAILED',
      { promptId, operation, ...details }
    );
    this.name = 'PromptMetadataError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 提示词验证规则配置错误异常
 */
export class PromptValidationConfigError extends PromptError {
  constructor(rule: string, reason: string, details?: Record<string, unknown>) {
    super(`提示词验证规则配置错误 [${rule}]: ${reason}`, 'PROMPT_VALIDATION_CONFIG_ERROR', {
      rule,
      ...details,
    });
    this.name = 'PromptValidationConfigError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}