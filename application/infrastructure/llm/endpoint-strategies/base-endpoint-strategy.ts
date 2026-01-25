import { z } from 'zod';
import { ProviderConfig } from '../parameter-mappers/interfaces/provider-config.interface';
import { ProviderRequest } from '../parameter-mappers/base-parameter-mapper';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';

/**
 * 基础端点配置 Schema
 * 定义所有端点策略通用的配置验证规则
 */
export const BaseEndpointConfigSchema = z.object({
  /**
   * 提供商名称
   */
  name: z.string().min(1, 'Provider name is required'),

  /**
   * API 类型
   */
  apiType: z.enum(['openai-compatible', 'native', 'custom']),

  /**
   * 基础 URL
   */
  baseURL: z.string().url('Base URL must be a valid URL'),

  /**
   * API 密钥
   */
  apiKey: z.string().min(1, 'API key is required'),

  /**
   * 额外配置
   */
  extraConfig: z.record(z.string(), z.any()).optional(),
});

/**
 * 基础配置类型
 */
export type BaseEndpointConfig = z.infer<typeof BaseEndpointConfigSchema>;

/**
 * 基础端点策略
 *
 * 提供通用的端点策略功能，子类可以扩展实现特定提供商的策略
 * 使用 Zod 进行配置验证
 */
export abstract class BaseEndpointStrategy {
  protected readonly name: string;
  protected readonly version: string;
  protected readonly configSchema: z.ZodSchema;

  constructor(name: string, version: string, configSchema?: z.ZodSchema) {
    this.name = name;
    this.version = version;
    this.configSchema = configSchema || BaseEndpointConfigSchema;
  }

  /**
   * 构建端点 URL
   * 子类必须实现此方法
   */
  abstract buildEndpoint(config: ProviderConfig, request: ProviderRequest): string;

  /**
   * 构建请求头
   * 默认实现包含 Content-Type，子类可以扩展
   * @param config 提供商配置
   * @param request LLM请求（可选，用于支持请求级自定义头部）
   * @returns 请求头对象
   */
  buildHeaders(config: ProviderConfig, request?: LLMRequest): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 合并请求级自定义头部
    if (request?.headers) {
      Object.assign(headers, request.headers);
    }

    return headers;
  }

  /**
   * 处理认证
   * 默认实现不做任何处理，子类可以重写
   */
  handleAuthentication(request: any, config: ProviderConfig): any {
    return request;
  }

  /**
   * 获取策略名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 获取策略版本
   */
  getVersion(): string {
    return this.version;
  }

  /**
   * 验证配置
   * 使用 Zod schema 进行验证
   */
  validateConfig(config: ProviderConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const result = this.configSchema.safeParse(config);

    if (!result.success) {
      const errors = result.error.issues.map(issue => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'config';
        return `${path}: ${issue.message}`;
      });

      return {
        isValid: false,
        errors,
      };
    }

    return {
      isValid: true,
      errors: [],
    };
  }

  /**
   * 获取配置类型（用于类型推断）
   */
  getConfigType(): z.ZodType {
    return this.configSchema;
  }

  /**
   * 构建 URL 路径
   * 辅助方法，用于安全地拼接 URL 路径
   */
  protected buildPath(baseURL: string, ...pathSegments: string[]): string {
    const url = new URL(baseURL);
    const currentPath = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
    const cleanSegments = pathSegments
      .map(segment => (segment.startsWith('/') ? segment.slice(1) : segment))
      .filter(segment => segment.length > 0);

    const newPath =
      cleanSegments.length > 0 ? `${currentPath}/${cleanSegments.join('/')}` : currentPath;

    url.pathname = newPath;
    return url.toString();
  }

  /**
   * 添加查询参数
   * 辅助方法，用于向 URL 添加查询参数
   */
  protected addQueryParams(url: string, params: Record<string, string>): string {
    const urlObj = new URL(url);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.set(key, value);
      }
    });
    return urlObj.toString();
  }

  /**
   * 验证 URL 格式
   * 辅助方法，用于验证 URL 格式是否正确
   */
  protected isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
