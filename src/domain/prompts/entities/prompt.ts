/**
 * 提示词实体
 */

import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { DomainError } from '../../common/errors/domain-error';
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

/**
 * 提示词属性接口
 */
export interface PromptProps {
  id: PromptId;
  name: string;
  type: PromptType;
  content: string;
  category: string;
  metadata: PromptMetadata;
  version: Version;
  status: PromptStatus;
  description?: string;
  template?: string;
  priority?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  dependencies?: string[];
  variables?: PromptVariable[];
  validation?: PromptValidation;
}

/**
 * 创建提示词的属性接口
 */
export interface CreatePromptProps {
  name: string;
  type: PromptType;
  content: string;
  category: string;
  metadata?: PromptMetadata;
  version?: string;
  status?: PromptStatus;
  description?: string;
  template?: string;
  priority?: number;
  dependencies?: string[];
  variables?: PromptVariable[];
  validation?: PromptValidation;
}

/**
 * 提示词实体
 */
export class Prompt extends Entity {
  private readonly props: PromptProps;

  private constructor(props: PromptProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 创建新的提示词
   */
  static create(props: CreatePromptProps): Prompt {
    // 验证必填字段
    if (!props.name || props.name.trim().length === 0) {
      throw new DomainError('提示词名称不能为空');
    }

    if (!props.content || props.content.trim().length === 0) {
      throw new DomainError('提示词内容不能为空');
    }

    if (!props.category || props.category.trim().length === 0) {
      throw new DomainError('提示词分类不能为空');
    }

    // 验证内容长度
    if (props.validation?.maxLength && props.content.length > props.validation.maxLength) {
      throw new DomainError(`提示词内容长度不能超过 ${props.validation.maxLength} 个字符`);
    }

    if (props.validation?.minLength && props.content.length < props.validation.minLength) {
      throw new DomainError(`提示词内容长度不能少于 ${props.validation.minLength} 个字符`);
    }

    // 验证禁止词汇
    if (props.validation?.forbiddenWords) {
      const forbiddenWords = props.validation.forbiddenWords.filter(word => 
        props.content.toLowerCase().includes(word.toLowerCase())
      );
      if (forbiddenWords.length > 0) {
        throw new DomainError(`提示词内容包含禁止词汇: ${forbiddenWords.join(', ')}`);
      }
    }

    // 验证必需关键词
    if (props.validation?.requiredKeywords) {
      const missingKeywords = props.validation.requiredKeywords.filter(keyword => 
        !props.content.toLowerCase().includes(keyword.toLowerCase())
      );
      if (missingKeywords.length > 0) {
        throw new DomainError(`提示词内容缺少必需关键词: ${missingKeywords.join(', ')}`);
      }
    }

    const now = Timestamp.now();
    const version = Version.create(props.version || '1.0.0');
    const promptProps: PromptProps = {
      id: PromptId.create(props.category, props.name),
      name: props.name.trim(),
      type: props.type,
      content: props.content.trim(),
      category: props.category.trim(),
      metadata: props.metadata || {},
      version: version,
      status: props.status || PromptStatus.DRAFT,
      description: props.description,
      template: props.template,
      priority: props.priority || 0,
      createdAt: now,
      updatedAt: now,
      dependencies: props.dependencies || [],
      variables: props.variables || [],
      validation: props.validation,
    };

    return new Prompt(promptProps);
  }

  /**
   * 从已有数据重建提示词
   */
  static reconstruct(props: PromptProps): Prompt {
    return new Prompt(props);
  }

  // 业务方法

  /**
   * 激活提示词
   */
  activate(): void {
    if (this.props.status === PromptStatus.ACTIVE) {
      throw new DomainError('提示词已经是激活状态');
    }

    if (this.props.status === PromptStatus.DEPRECATED) {
      throw new DomainError('已弃用的提示词不能激活');
    }

    // 创建新的props并更新状态和时间戳
    const newProps: PromptProps = {
      ...this.props,
      status: PromptStatus.ACTIVE,
      updatedAt: Timestamp.now(),
    };

    // 使用Object.assign更新冻结的props
    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 禁用提示词
   */
  deactivate(): void {
    if (this.props.status === PromptStatus.INACTIVE) {
      throw new DomainError('提示词已经是禁用状态');
    }

    // 创建新的props并更新状态和时间戳
    const newProps: PromptProps = {
      ...this.props,
      status: PromptStatus.INACTIVE,
      updatedAt: Timestamp.now(),
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 弃用提示词
   */
  deprecate(): void {
    if (this.props.status === PromptStatus.DEPRECATED) {
      throw new DomainError('提示词已经是弃用状态');
    }

    // 创建新的props并更新状态和时间戳
    const newProps: PromptProps = {
      ...this.props,
      status: PromptStatus.DEPRECATED,
      updatedAt: Timestamp.now(),
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新提示词内容
   */
  updateContent(newContent: string): void {
    if (!newContent || newContent.trim().length === 0) {
      throw new DomainError('提示词内容不能为空');
    }

    if (newContent === this.props.content) {
      return; // 内容没有变化，无需更新
    }

    // 验证新内容
    if (this.props.validation?.maxLength && newContent.length > this.props.validation.maxLength) {
      throw new DomainError(`提示词内容长度不能超过 ${this.props.validation.maxLength} 个字符`);
    }

    if (this.props.validation?.minLength && newContent.length < this.props.validation.minLength) {
      throw new DomainError(`提示词内容长度不能少于 ${this.props.validation.minLength} 个字符`);
    }

    // 验证禁止词汇
    if (this.props.validation?.forbiddenWords) {
      const forbiddenWords = this.props.validation.forbiddenWords.filter(word =>
        newContent.toLowerCase().includes(word.toLowerCase())
      );
      if (forbiddenWords.length > 0) {
        throw new DomainError(`提示词内容包含禁止词汇: ${forbiddenWords.join(', ')}`);
      }
    }

    // 验证必需关键词
    if (this.props.validation?.requiredKeywords) {
      const missingKeywords = this.props.validation.requiredKeywords.filter(keyword =>
        !newContent.toLowerCase().includes(keyword.toLowerCase())
      );
      if (missingKeywords.length > 0) {
        throw new DomainError(`提示词内容缺少必需关键词: ${missingKeywords.join(', ')}`);
      }
    }

    // 创建新的props并更新内容和时间戳
    const newProps: PromptProps = {
      ...this.props,
      content: newContent.trim(),
      updatedAt: Timestamp.now(),
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  /**
   * 更新提示词元数据
   */
  updateMetadata(metadata: Partial<PromptMetadata>): void {
    const newProps: PromptProps = {
      ...this.props,
      metadata: {
        ...this.props.metadata,
        ...metadata,
      },
      updatedAt: Timestamp.now(),
    };

    (this as any).props = Object.freeze(newProps);
    this.update();
  }

  // 属性访问器

  get name(): string {
    return this.props.name;
  }

  get type(): PromptType {
    return this.props.type;
  }

  get content(): string {
    return this.props.content;
  }

  get category(): string {
    return this.props.category;
  }

  get metadata(): PromptMetadata {
    return this.props.metadata;
  }

  override get version(): Version {
    return this.props.version;
  }

  get status(): PromptStatus {
    return this.props.status;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get template(): string | undefined {
    return this.props.template;
  }

  get priority(): number {
    return this.props.priority || 0;
  }

  get dependencies(): string[] {
    return this.props.dependencies || [];
  }

  get variables(): PromptVariable[] {
    return this.props.variables || [];
  }

  get validation(): PromptValidation | undefined {
    return this.props.validation;
  }

  override get createdAt(): Timestamp {
    return this.props.createdAt;
  }

  override get updatedAt(): Timestamp {
    return this.props.updatedAt;
  }
}