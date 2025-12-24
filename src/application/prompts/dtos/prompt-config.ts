/**
 * 提示词配置DTO接口定义
 */

export interface PromptConfigRequest {
  /** 提示词配置 */
  config: Record<string, unknown>;
  /** 是否覆盖现有配置 */
  overwrite?: boolean;
  /** 配置描述 */
  description?: string;
}

export interface PromptConfigDto {
  /** 配置ID */
  configId: string;
  /** 配置名称 */
  name: string;
  /** 配置值 */
  value: Record<string, unknown>;
  /** 配置描述 */
  description?: string;
  /** 是否为默认配置 */
  isDefault: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

export interface PromptInjectionRequest {
  /** 工作流ID */
  workflowId: string;
  /** 提示词配置 */
  config: PromptConfigRequest;
  /** 注入位置 */
  injectionPoint?: 'start' | 'end' | 'custom';
  /** 自定义注入位置 */
  customPosition?: Record<string, unknown>;
  /** 是否强制注入 */
  force?: boolean;
}

export interface PromptInjectionResult {
  /** 是否成功 */
  success: boolean;
  /** 注入的工作流状态 */
  workflowState: Record<string, unknown>;
  /** 注入的提示词列表 */
  injectedPrompts: string[];
  /** 错误信息 */
  errorMessage?: string;
  /** 警告信息 */
  warnings?: string[];
}