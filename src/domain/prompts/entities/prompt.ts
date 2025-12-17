/**
 * 提示词实体
 */

import { PromptId } from '../value-objects/prompt-id';
import { PromptType } from '../value-objects/prompt-type';
import { PromptStatus } from '../value-objects/prompt-status';

/**
 * 提示词元数据
 */
export interface PromptMetadata {
  filePath?: string;
  relativePath?: string;
  isComposite?: boolean;
  subFiles?: string[];
  tags?: string[];
  createdBy?: string;
  updatedBy?: string;
  [key: string]: unknown;
}

/**
 * 提示词实体接口
 */
export interface Prompt {
  id: PromptId;
  name: string;
  type: PromptType;
  content: string;
  category: string;
  metadata: PromptMetadata;
  version: string;
  status: PromptStatus;
  description?: string;
  template?: string;
  priority?: number;
  createdAt?: Date;
  updatedAt?: Date;
  dependencies?: string[];
  variables?: PromptVariable[];
  validation?: PromptValidation;
}

/**
 * 提示词变量
 */
export interface PromptVariable {
  name: string;
  type: string;
  defaultValue?: unknown;
  required?: boolean;
  description?: string;
}

/**
 * 提示词验证规则
 */
export interface PromptValidation {
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  forbiddenWords?: string[];
  requiredKeywords?: string[];
}

/**
 * 提示词配置
 */
export interface PromptConfig {
  systemPrompt?: string;
  rules: string[];
  userCommand?: string;
  context?: string[];
  examples?: string[];
  constraints?: string[];
  format?: string;
  enableReferenceResolution?: boolean;
  maxReferenceDepth?: number;
}