import { LLMRequest } from '../../../../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../../../../domain/llm/entities/llm-response';
import { IParameterMapper, ParameterDefinition, ProviderRequest, ProviderResponse } from '../interfaces/parameter-mapper.interface';
import { ProviderConfig } from '../interfaces/provider-config.interface';
import { CommonParameterDefinitions } from '../interfaces/parameter-definition.interface';

/**
 * 基础参数映射器
 * 
 * 提供通用的参数映射功能，子类可以扩展实现特定提供商的映射逻辑
 */
export abstract class BaseParameterMapper implements IParameterMapper {
  protected readonly name: string;
  protected readonly version: string;
  protected readonly supportedParameters: ParameterDefinition[];

  constructor(name: string, version: string) {
    this.name = name;
    this.version = version;
    this.supportedParameters = this.initializeSupportedParameters();
  }

  /**
   * 初始化支持的参数列表
   * 子类可以重写此方法来添加特定参数
   */
  protected initializeSupportedParameters(): ParameterDefinition[] {
    return [
      CommonParameterDefinitions.model(),
      CommonParameterDefinitions.messages(),
      CommonParameterDefinitions.temperature(),
      CommonParameterDefinitions.maxTokens(),
      CommonParameterDefinitions.topP(),
      CommonParameterDefinitions.frequencyPenalty(),
      CommonParameterDefinitions.presencePenalty(),
      CommonParameterDefinitions.stop(),
      CommonParameterDefinitions.stream()
    ];
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
   * 获取支持的参数定义列表
   */
  getSupportedParameters(): ParameterDefinition[] {
    return [...this.supportedParameters];
  }

  /**
   * 验证请求参数
   */
  validateRequest(request: LLMRequest): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证必需参数
    for (const param of this.supportedParameters) {
      if (param.required) {
        const value = this.getParamValue(request, param.name);
        if (value === undefined || value === null || value === '') {
          errors.push(`Required parameter '${param.name}' is missing`);
        }
      }
    }

    // 验证参数值
    for (const param of this.supportedParameters) {
      const value = this.getParamValue(request, param.name);
      if (value !== undefined && value !== null) {
        const validationError = this.validateParameterValue(value, param);
        if (validationError) {
          errors.push(validationError);
        }

        // 检查弃用参数
        if (param.deprecated) {
          warnings.push(
            `Parameter '${param.name}' is deprecated${
              param.deprecationMessage ? `: ${param.deprecationMessage}` : ''
            }`
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
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

    // 检查参数定义中的别名
    const paramDef = this.supportedParameters.find(p => p.name === paramName);
    if (paramDef && paramDef.aliases) {
      for (const alias of paramDef.aliases) {
        if (alias in request) {
          return (request as any)[alias];
        }
        if (request.metadata && alias in request.metadata) {
          return request.metadata[alias];
        }
      }
    }

    return undefined;
  }

  /**
   * 验证参数值
   */
  protected validateParameterValue(value: any, paramDef: ParameterDefinition): string | null {
    // 类型验证
    if (!this.validateType(value, paramDef.type)) {
      return `Parameter '${paramDef.name}' must be of type ${paramDef.type}`;
    }

    // 范围验证
    if (paramDef.type === 'number') {
      if (paramDef.min !== undefined && value < paramDef.min) {
        return `Parameter '${paramDef.name}' must be >= ${paramDef.min}`;
      }
      if (paramDef.max !== undefined && value > paramDef.max) {
        return `Parameter '${paramDef.name}' must be <= ${paramDef.max}`;
      }
    }

    // 选项验证
    if (paramDef.options && !paramDef.options.includes(value)) {
      return `Parameter '${paramDef.name}' must be one of: ${paramDef.options.join(', ')}`;
    }

    // 自定义验证
    if (paramDef.validation && !paramDef.validation(value)) {
      return `Parameter '${paramDef.name}' failed custom validation`;
    }

    return null;
  }

  /**
   * 验证类型
   */
  protected validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return false;
    }
  }

  /**
   * 获取参数的默认值
   */
  protected getParamDefaultValue(paramName: string): any {
    const paramDef = this.supportedParameters.find(p => p.name === paramName);
    return paramDef?.defaultValue;
  }

  /**
   * 应用参数默认值
   */
  protected applyDefaultValues(request: LLMRequest): Record<string, any> {
    const result: Record<string, any> = {};

    for (const paramDef of this.supportedParameters) {
      const value = this.getParamValue(request, paramDef.name);
      if (value !== undefined) {
        result[paramDef.name] = value;
      } else if (paramDef.defaultValue !== undefined) {
        result[paramDef.name] = paramDef.defaultValue;
      }
    }

    return result;
  }

  /**
   * 过滤提供商特定参数
   */
  protected filterProviderSpecificParams(params: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(params)) {
      const paramDef = this.supportedParameters.find(p => p.name === key);
      if (paramDef && paramDef.isProviderSpecific) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 过滤通用参数
   */
  protected filterCommonParams(params: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(params)) {
      const paramDef = this.supportedParameters.find(p => p.name === key);
      if (!paramDef || !paramDef.isProviderSpecific) {
        result[key] = value;
      }
    }

    return result;
  }
}