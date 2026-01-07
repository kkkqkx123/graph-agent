/**
 * LLM客户端异常基类
 */
export abstract class LLMClientError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(message: string, code: string, details?: Record<string, any>) {
    super(message);
    this.name = 'LLMClientError';
    this.code = code;
    this.details = details;
    
    // 修复原型链，确保instanceof正常工作
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * LLM客户端配置错误异常
 */
export class LLMClientConfigurationError extends LLMClientError {
  constructor(provider: string, reason: string, details?: Record<string, any>) {
    super(
      `LLM客户端配置错误: ${provider} - ${reason}`,
      'LLM_CLIENT_CONFIGURATION_ERROR',
      { provider, reason, ...details }
    );
  }
}

/**
 * API密钥未配置异常
 */
export class LLMClientApiKeyMissingError extends LLMClientConfigurationError {
  constructor(provider: string) {
    super(provider, 'API密钥未配置', { provider });
  }
}

/**
 * 默认模型未配置异常
 */
export class LLMClientDefaultModelMissingError extends LLMClientConfigurationError {
  constructor(provider: string) {
    super(provider, '默认模型未配置', { provider });
  }
}

/**
 * 支持的模型列表未配置异常
 */
export class LLMClientSupportedModelsMissingError extends LLMClientConfigurationError {
  constructor(provider: string) {
    super(provider, '支持的模型列表未配置', { provider });
  }
}

/**
 * 模型配置未找到异常
 */
export class LLMClientModelConfigNotFoundError extends LLMClientConfigurationError {
  constructor(provider: string, model: string) {
    super(provider, `模型配置未找到: ${model}`, { provider, model });
  }
}

/**
 * 模型配置字段缺失异常
 */
export class LLMClientModelConfigFieldMissingError extends LLMClientConfigurationError {
  constructor(provider: string, model: string, field: string) {
    super(provider, `模型 ${model} 缺少必需配置字段: ${field}`, { provider, model, field });
  }
}

/**
 * LLM客户端请求错误异常
 */
export class LLMClientRequestError extends LLMClientError {
  constructor(provider: string, reason: string, details?: Record<string, any>) {
    super(`LLM客户端请求错误: ${provider} - ${reason}`, 'LLM_CLIENT_REQUEST_ERROR', {
      provider,
      reason,
      ...details,
    });
  }
}

/**
 * 请求验证失败异常
 */
export class LLMClientRequestValidationError extends LLMClientRequestError {
  constructor(provider: string, errors: string[]) {
    super(provider, `请求验证失败: ${errors.join(', ')}`, { provider, errors });
  }
}

/**
 * 消息为空异常
 */
export class LLMClientEmptyMessagesError extends LLMClientRequestError {
  constructor(provider: string) {
    super(provider, '消息列表不能为空', { provider });
  }
}

/**
 * 模型不可用异常
 */
export class LLMClientModelUnavailableError extends LLMClientRequestError {
  constructor(provider: string, model: string) {
    super(provider, `模型不可用: ${model}`, { provider, model });
  }
}

/**
 * LLM客户端响应错误异常
 */
export class LLMClientResponseError extends LLMClientError {
  constructor(provider: string, reason: string, details?: Record<string, any>) {
    super(`LLM客户端响应错误: ${provider} - ${reason}`, 'LLM_CLIENT_RESPONSE_ERROR', {
      provider,
      reason,
      ...details,
    });
  }
}

/**
 * 响应解析失败异常
 */
export class LLMClientResponseParseError extends LLMClientResponseError {
  constructor(provider: string, reason: string) {
    super(provider, `响应解析失败: ${reason}`, { provider, reason });
  }
}

/**
 * 无效响应格式异常
 */
export class LLMClientInvalidResponseFormatError extends LLMClientResponseError {
  constructor(provider: string, expected: string, actual: string) {
    super(provider, `无效响应格式，期望: ${expected}，实际: ${actual}`, {
      provider,
      expected,
      actual,
    });
  }
}

/**
 * 响应中无选择项异常
 */
export class LLMClientNoChoicesError extends LLMClientResponseError {
  constructor(provider: string) {
    super(provider, '响应中没有找到选择项', { provider });
  }
}

/**
 * 响应中无内容异常
 */
export class LLMClientNoContentError extends LLMClientResponseError {
  constructor(provider: string) {
    super(provider, '响应中没有找到内容', { provider });
  }
}

/**
 * 流式响应错误异常
 */
export class LLMClientStreamError extends LLMClientError {
  constructor(provider: string, reason: string, details?: Record<string, any>) {
    super(`LLM客户端流式响应错误: ${provider} - ${reason}`, 'LLM_CLIENT_STREAM_ERROR', {
      provider,
      reason,
      ...details,
    });
  }
}

/**
 * 流式响应解析失败异常
 */
export class LLMClientStreamParseError extends LLMClientStreamError {
  constructor(provider: string, reason: string) {
    super(provider, `流式响应解析失败: ${reason}`, { provider, reason });
  }
}

/**
 * 流式响应中断异常
 */
export class LLMClientStreamInterruptedError extends LLMClientStreamError {
  constructor(provider: string, reason: string) {
    super(provider, `流式响应中断: ${reason}`, { provider, reason });
  }
}

/**
 * LLM客户端API错误异常
 */
export class LLMClientAPIError extends LLMClientError {
  constructor(provider: string, reason: string, details?: Record<string, any>) {
    super(`LLM客户端API错误: ${provider} - ${reason}`, 'LLM_CLIENT_API_ERROR', {
      provider,
      reason,
      ...details,
    });
  }
}

/**
 * API调用失败异常
 */
export class LLMClientAPICallFailedError extends LLMClientAPIError {
  constructor(provider: string, endpoint: string, reason: string) {
    super(provider, `API调用失败: ${endpoint} - ${reason}`, { provider, endpoint, reason });
  }
}

/**
 * API超时异常
 */
export class LLMClientAPITimeoutError extends LLMClientAPIError {
  constructor(provider: string, endpoint: string, timeout: number) {
    super(provider, `API调用超时: ${endpoint} - ${timeout}ms`, { provider, endpoint, timeout });
  }
}

/**
 * API限流异常
 */
export class LLMClientAPIRateLimitError extends LLMClientAPIError {
  constructor(provider: string, endpoint: string, retryAfter?: number) {
    super(
      provider,
      `API限流: ${endpoint}${retryAfter ? ` - 请在 ${retryAfter}ms 后重试` : ''}`,
      { provider, endpoint, retryAfter }
    );
  }
}

/**
 * API认证失败异常
 */
export class LLMClientAPIAuthenticationError extends LLMClientAPIError {
  constructor(provider: string, reason: string) {
    super(provider, `API认证失败: ${reason}`, { provider, reason });
  }
}

/**
 * API权限不足异常
 */
export class LLMClientAPIPermissionError extends LLMClientAPIError {
  constructor(provider: string, resource: string) {
    super(provider, `API权限不足: ${resource}`, { provider, resource });
  }
}

/**
 * LLM客户端健康检查错误异常
 */
export class LLMClientHealthCheckError extends LLMClientError {
  constructor(provider: string, reason: string, details?: Record<string, any>) {
    super(`LLM客户端健康检查错误: ${provider} - ${reason}`, 'LLM_CLIENT_HEALTH_CHECK_ERROR', {
      provider,
      reason,
      ...details,
    });
  }
}

/**
 * 服务不可用异常
 */
export class LLMClientServiceUnavailableError extends LLMClientHealthCheckError {
  constructor(provider: string, reason?: string) {
    super(provider, reason || '服务不可用', { provider });
  }
}

/**
 * 服务降级异常
 */
export class LLMClientServiceDegradedError extends LLMClientHealthCheckError {
  constructor(provider: string, reason: string) {
    super(provider, `服务降级: ${reason}`, { provider, reason });
  }
}

/**
 * LLM客户端功能不支持异常
 */
export class LLMClientFeatureNotSupportedError extends LLMClientError {
  constructor(provider: string, feature: string, model?: string) {
    super(
      `LLM客户端功能不支持: ${provider} - ${feature}${model ? ` (模型: ${model})` : ''}`,
      'LLM_CLIENT_FEATURE_NOT_SUPPORTED',
      { provider, feature, model }
    );
  }
}

/**
 * 流式功能不支持异常
 */
export class LLMClientStreamingNotSupportedError extends LLMClientFeatureNotSupportedError {
  constructor(provider: string, model?: string) {
    super(provider, '流式响应', model);
  }
}

/**
 * 工具调用功能不支持异常
 */
export class LLMClientToolsNotSupportedError extends LLMClientFeatureNotSupportedError {
  constructor(provider: string, model?: string) {
    super(provider, '工具调用', model);
  }
}

/**
 * 图像功能不支持异常
 */
export class LLMClientImagesNotSupportedError extends LLMClientFeatureNotSupportedError {
  constructor(provider: string, model?: string) {
    super(provider, '图像处理', model);
  }
}

/**
 * LLM客户端令牌错误异常
 */
export class LLMClientTokenError extends LLMClientError {
  constructor(provider: string, reason: string, details?: Record<string, any>) {
    super(`LLM客户端令牌错误: ${provider} - ${reason}`, 'LLM_CLIENT_TOKEN_ERROR', {
      provider,
      reason,
      ...details,
    });
  }
}

/**
 * 令牌超限异常
 */
export class LLMClientTokenLimitExceededError extends LLMClientTokenError {
  constructor(provider: string, model: string, tokens: number, maxTokens: number) {
    super(
      provider,
      `令牌超限: ${model} - 当前: ${tokens}, 最大: ${maxTokens}`,
      { provider, model, tokens, maxTokens }
    );
  }
}

/**
 * 令牌计算失败异常
 */
export class LLMClientTokenCalculationError extends LLMClientTokenError {
  constructor(provider: string, reason: string) {
    super(provider, `令牌计算失败: ${reason}`, { provider, reason });
  }
}

/**
 * LLM客户端未初始化异常
 */
export class LLMClientNotInitializedError extends LLMClientError {
  constructor(provider: string) {
    super(`LLM客户端未初始化: ${provider}`, 'LLM_CLIENT_NOT_INITIALIZED', { provider });
  }
}

/**
 * LLM客户端方法未实现异常
 */
export class LLMClientMethodNotImplementedError extends LLMClientError {
  constructor(provider: string, method: string) {
    super(`LLM客户端方法未实现: ${provider} - ${method}`, 'LLM_CLIENT_METHOD_NOT_IMPLEMENTED', {
      provider,
      method,
    });
  }
}