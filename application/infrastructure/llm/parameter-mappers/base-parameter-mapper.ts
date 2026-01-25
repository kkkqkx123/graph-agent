import { z } from 'zod';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../domain/llm/entities/llm-response';
import { ProviderConfig } from './interfaces/provider-config.interface';

/**
 * 提供商请求接口
 */
export interface ProviderRequest {
  [key: string]: any;
}

/**
 * 提供商响应接口
 */
export interface ProviderResponse {
  [key: string]: any;
}

/**
 * 基础参数 Schema
 * 定义所有 LLM 提供商通用的参数验证规则
 */
export const BaseParameterSchema = z.object({
  model: z.string().min(1, 'Model name is required'),
  messages: z.array(z.any()).min(1, 'Messages array must not be empty'),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  stop: z.array(z.string()).optional(),
  stream: z.boolean().optional(),
});

/**
 * 参数验证结果
 */
export interface ParameterValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 基础参数映射器
 *
 * 提供通用的参数映射功能，子类可以扩展实现特定提供商的映射逻辑
 * 使用 zod 进行参数验证，移除硬编码的默认值
 */
export abstract class BaseParameterMapper {
  protected readonly name: string;
  protected readonly version: string;
  protected readonly parameterSchema: z.ZodSchema;
  protected readonly knownMetadataKeys: string[] = [];

  constructor(name: string, version: string, parameterSchema?: z.ZodSchema) {
    this.name = name;
    this.version = version;
    this.parameterSchema = parameterSchema || BaseParameterSchema;
  }

  /**
   * 将标准 LLM 请求映射为提供商请求格式
   * 子类必须实现此方法
   */
  abstract mapToProvider(request: LLMRequest, providerConfig: ProviderConfig): ProviderRequest;

  /**
   * 将提供商响应映射为标准 LLM 响应格式
   * 子类必须实现此方法
   */
  abstract mapFromResponse(response: ProviderResponse, originalRequest: LLMRequest): LLMResponse;

  /**
   * 验证请求参数
   * 使用 zod schema 进行验证
   */
  validateRequest(request: LLMRequest): ParameterValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 构建验证对象
    const validationObject: Record<string, any> = {
      model: request.model,
      messages: request.messages,
    };

    // 添加可选参数（如果存在）
    if (request.temperature !== undefined) {
      validationObject['temperature'] = request.temperature;
    }
    if (request.maxTokens !== undefined) {
      validationObject['maxTokens'] = request.maxTokens;
    }
    if (request.topP !== undefined) {
      validationObject['topP'] = request.topP;
    }
    if (request.frequencyPenalty !== undefined) {
      validationObject['frequencyPenalty'] = request.frequencyPenalty;
    }
    if (request.presencePenalty !== undefined) {
      validationObject['presencePenalty'] = request.presencePenalty;
    }
    if (request.stop !== undefined) {
      validationObject['stop'] = request.stop;
    }
    if (request.stream !== undefined) {
      validationObject['stream'] = request.stream;
    }

    // 使用 zod 进行验证
    const result = this.parameterSchema.safeParse(validationObject);

    if (!result.success) {
      result.error.issues.forEach((issue: any) => {
        errors.push(`${issue.path.join('.')}: ${issue.message}`);
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 获取映射器名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 获取映射器版本
   */
  getVersion(): string {
    return this.version;
  }

  /**
   * 从请求中获取参数值
   * 支持嵌套属性和别名
   */
  protected getParamValue(request: LLMRequest, paramName: string): any {
    // 首先检查直接属性
    if (paramName in request) {
      return (request as any)[paramName];
    }

    // 检查元数据中的参数
    if (request.metadata && paramName in request.metadata) {
      return request.metadata[paramName];
    }

    return undefined;
  }

  /**
   * 过滤提供商特定参数
   */
  protected filterProviderSpecificParams(
    params: Record<string, any>,
    providerSpecificKeys: string[]
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (providerSpecificKeys.includes(key)) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 过滤通用参数
   */
  protected filterCommonParams(
    params: Record<string, any>,
    providerSpecificKeys: string[]
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (!providerSpecificKeys.includes(key)) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 安全地添加可选参数到请求对象
   */
  protected addOptionalParam<T>(
    target: Record<string, any>,
    key: string,
    value: T | undefined,
    targetKey?: string
  ): void {
    if (value !== undefined) {
      target[targetKey || key] = value;
    }
  }

  /**
   * 安全地添加元数据参数到请求对象
   */
  protected addMetadataParam<T>(
    target: Record<string, any>,
    metadata: Record<string, any> | undefined,
    key: string,
    targetKey?: string
  ): void {
    if (metadata && metadata[key] !== undefined) {
      target[targetKey || key] = metadata[key];
    }
  }

  /**
   * 添加已知的元数据键
   * 子类可以调用此方法来注册它们处理的元数据键
   */
  protected addKnownMetadataKey(key: string): void {
    if (!this.knownMetadataKeys.includes(key)) {
      this.knownMetadataKeys.push(key);
    }
  }

  /**
   * 传递未知的元数据参数
   * 将 metadata 中未在 knownMetadataKeys 中注册的参数直接传递到目标对象
   * @param target 目标对象
   * @param metadata 元数据对象
   */
  protected passUnknownMetadataParams(
    target: Record<string, any>,
    metadata: Record<string, any> | undefined
  ): void {
    if (!metadata) {
      return;
    }

    for (const [key, value] of Object.entries(metadata)) {
      // 只传递未知的参数
      if (!this.knownMetadataKeys.includes(key)) {
        target[key] = value;
      }
    }
  }
}
