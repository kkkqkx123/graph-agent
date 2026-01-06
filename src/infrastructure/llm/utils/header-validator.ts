/**
 * HTTP标头验证和脱敏处理
 */

/**
 * HTTP标头验证器
 */
export class HeaderValidator {
  // 白名单标头 - 包含常用的HTTP标头
  private static readonly ALLOWED_HEADERS = new Set([
    'authorization', // 认证标头
    'x-api-key', // API密钥标头
    'x-custom-header', // 自定义标头
    'user-agent', // 用户代理标头
    'content-type', // 内容类型标头
    'content-length', // 内容长度标头
    'accept', // 接受类型标头
    'accept-encoding', // 接受编码标头
    'accept-language', // 接受语言标头
    'cache-control', // 缓存控制标头
    'pragma', // pragma标头
    'x-requested-with', // 请求来源标头
    'x-forwarded-for', // 转发IP标头
    'x-forwarded-proto', // 转发协议标头
    'x-forwarded-host', // 转发主机标头
    'referer', // 引用页标头
    'origin', // 来源标头
    'host', // 主机标头
    'connection', // 连接标头
    'accept-charset', // 接受字符集标头
    'accept-datetime', // 接受日期时间标头
    'x-csrf-token', // CSRF令牌标头
    'x-http-method-override', // HTTP方法重写标头
  ]);

  // 敏感标头（需要环境变量引用）- 仅包含真正敏感的标头
  private static readonly SENSITIVE_HEADERS = new Set(['authorization', 'x-api-key']);

  // 环境变量引用模式
  private static readonly ENV_VAR_PATTERN = /^\$\{([^}:]+)(?::([^}]*))?\}$/;

  private validationErrors: string[] = [];

  /**
   * 验证HTTP标头
   *
   * @param headers 标头字典
   * @returns Tuple[boolean, string[]]: (是否有效, 错误列表)
   */
  validateHeaders(headers: Record<string, string>): [boolean, string[]] {
    this.validationErrors = [];

    if (!headers) {
      return [true, []];
    }

    for (const [headerName, headerValue] of Object.entries(headers)) {
      // 转换为小写进行比较
      const headerLower = headerName.toLowerCase();

      // 检查是否在白名单中
      if (!HeaderValidator.ALLOWED_HEADERS.has(headerLower)) {
        this.validationErrors.push(
          `标头 '${headerName}' 不在白名单中。允许的标头: ${Array.from(HeaderValidator.ALLOWED_HEADERS).sort().join(', ')}`
        );
        continue;
      }

      // 检查敏感标头是否使用环境变量引用
      if (HeaderValidator.SENSITIVE_HEADERS.has(headerLower)) {
        // Authorization标头特殊处理：允许Bearer格式
        if (headerLower === 'authorization' && headerValue.startsWith('Bearer ')) {
          // Bearer格式，检查token是否为环境变量引用
          const token = headerValue.substring(7); // 移除"Bearer "
          if (!this.isEnvVarReference(token)) {
            this.validationErrors.push(
              'Authorization标头的token必须使用环境变量引用格式 ${ENV_VAR}'
            );
          } else {
            // 验证环境变量是否存在
            const envVarName = this.extractEnvVarName(token);
            if (envVarName && !process.env[envVarName]) {
              console.warn(`环境变量 '${envVarName}' 未设置`);
            }
          }
        } else {
          // 其他敏感标头必须使用环境变量引用
          if (!this.isEnvVarReference(headerValue)) {
            this.validationErrors.push(
              `敏感标头 '${headerName}' 必须使用环境变量引用格式 \${ENV_VAR}`
            );
          } else {
            // 验证环境变量是否存在
            const envVarName = this.extractEnvVarName(headerValue);
            if (envVarName && !process.env[envVarName]) {
              console.warn(`环境变量 '${envVarName}' 未设置`);
            }
          }
        }
      }
    }

    return [this.validationErrors.length === 0, [...this.validationErrors]];
  }

  /**
   * 解析标头中的环境变量引用
   *
   * @param headers 原始标头字典
   * @returns 解析后的标头字典
   */
  resolveHeaders(headers: Record<string, string>): Record<string, string> {
    const resolvedHeaders: Record<string, string> = {};

    for (const [headerName, headerValue] of Object.entries(headers)) {
      const headerLower = headerName.toLowerCase();

      // Authorization标头特殊处理
      if (headerLower === 'authorization' && headerValue.startsWith('Bearer ')) {
        const token = headerValue.substring(7); // 移除"Bearer "
        if (this.isEnvVarReference(token)) {
          const resolvedToken = this.resolveEnvVar(token);
          if (resolvedToken !== null) {
            resolvedHeaders[headerName] = `Bearer ${resolvedToken}`;
          } else {
            console.warn(`无法解析Authorization标头的环境变量引用: ${token}`);
          }
        } else {
          resolvedHeaders[headerName] = headerValue;
        }
      } else {
        // 其他标头处理
        if (this.isEnvVarReference(headerValue)) {
          const resolvedValue = this.resolveEnvVar(headerValue);
          if (resolvedValue !== null) {
            resolvedHeaders[headerName] = resolvedValue;
          } else {
            console.warn(`无法解析标头 '${headerName}' 的环境变量引用: ${headerValue}`);
          }
        } else {
          resolvedHeaders[headerName] = headerValue;
        }
      }
    }

    return resolvedHeaders;
  }

  /**
   * 脱敏标头用于日志记录
   *
   * @param headers 原始标头字典
   * @returns 脱敏后的标头字典
   */
  sanitizeHeadersForLogging(headers: Record<string, string>): Record<string, string> {
    const sanitizedHeaders: Record<string, string> = {};

    for (const [headerName, headerValue] of Object.entries(headers)) {
      const headerLower = headerName.toLowerCase();

      if (HeaderValidator.SENSITIVE_HEADERS.has(headerLower)) {
        // 敏感标头脱敏
        if (headerLower === 'authorization' && headerValue.startsWith('Bearer ')) {
          // Authorization标头完全脱敏
          sanitizedHeaders[headerName] = '***';
        } else {
          sanitizedHeaders[headerName] = '***';
        }
      } else if (this.isEnvVarReference(headerValue)) {
        // 环境变量引用脱敏
        sanitizedHeaders[headerName] = '${***}';
      } else {
        sanitizedHeaders[headerName] = headerValue;
      }
    }

    return sanitizedHeaders;
  }

  private isEnvVarReference(value: string): boolean {
    return HeaderValidator.ENV_VAR_PATTERN.test(value.trim());
  }

  private extractEnvVarName(value: string): string | null {
    const match = HeaderValidator.ENV_VAR_PATTERN.exec(value.trim());
    if (match && match[1]) {
      // 只返回环境变量名称，不包括默认值部分
      return match[1];
    }
    return null;
  }

  private resolveEnvVar(value: string): string | null {
    const match = HeaderValidator.ENV_VAR_PATTERN.exec(value.trim());
    if (!match || !match[1]) {
      return value;
    }

    const envVarName = match[1];
    const defaultValue = match[2] !== undefined ? match[2] : '';

    return process.env[envVarName] || defaultValue;
  }

  /**
   * 验证Authorization标头格式
   *
   * @param value 标头值
   * @returns 是否有效
   */
  validateAuthorizationFormat(value: string): boolean {
    if (!value) {
      return false;
    }

    // 检查Bearer格式
    if (value.toLowerCase().startsWith('bearer ')) {
      // 确保有token，不仅仅是"Bearer "
      const parts = value.split(' ', 2);
      return parts.length > 1 && !!parts[1] && parts[1].trim() !== '';
    }

    // 如果只是"Bearer"而没有token，则无效
    if (value.toLowerCase() === 'bearer') {
      return false;
    }

    // 检查其他可能的格式
    return value.length > 0;
  }
}

/**
 * HTTP标头处理器
 */
export class HeaderProcessor {
  private validator: HeaderValidator;

  constructor(validator?: HeaderValidator) {
    this.validator = validator || new HeaderValidator();
  }

  /**
   * 处理HTTP标头
   *
   * @param headers 原始标头字典
   * @returns Tuple[Dict, Dict, boolean, string[]]: (解析后的标头, 脱敏后的标头, 是否有效, 错误列表)
   */
  processHeaders(
    headers: Record<string, string>
  ): [Record<string, string>, Record<string, string>, boolean, string[]] {
    // 验证标头
    const [isValid, errors] = this.validator.validateHeaders(headers);

    // 解析环境变量
    const resolvedHeaders = isValid ? this.validator.resolveHeaders(headers) : {};

    // 脱敏处理
    const sanitizedHeaders = this.validator.sanitizeHeadersForLogging(headers);

    return [resolvedHeaders, sanitizedHeaders, isValid, errors];
  }

  /**
   * 获取允许的标头列表
   */
  getAllowedHeaders(): string[] {
    return Array.from(HeaderValidator['ALLOWED_HEADERS']).sort();
  }

  /**
   * 获取敏感标头列表
   */
  getSensitiveHeaders(): string[] {
    return Array.from(HeaderValidator['SENSITIVE_HEADERS']).sort();
  }
}
