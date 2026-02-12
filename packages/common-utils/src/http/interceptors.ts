/**
 * HTTP拦截器
 * 提供请求、响应和错误拦截功能
 */

/**
 * 请求拦截器接口
 */
export interface RequestInterceptor {
  /**
   * 拦截请求
   * @param config 请求配置
   * @returns 处理后的请求配置
   */
  intercept(config: any): any | Promise<any>;
}

/**
 * 响应拦截器接口
 */
export interface ResponseInterceptor {
  /**
   * 拦截响应
   * @param response 响应对象
   * @returns 处理后的响应对象
   */
  intercept(response: any): any | Promise<any>;
}

/**
 * 错误拦截器接口
 */
export interface ErrorInterceptor {
  /**
   * 拦截错误
   * @param error 错误对象
   * @returns 处理后的错误对象
   */
  intercept(error: Error): Error | Promise<Error>;
}

/**
 * 拦截器管理器
 */
export class InterceptorManager {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  /**
   * 添加请求拦截器
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * 添加响应拦截器
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * 添加错误拦截器
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  /**
   * 应用请求拦截器
   */
  async applyRequestInterceptors(config: any): Promise<any> {
    let processedConfig = config;
    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor.intercept(processedConfig);
    }
    return processedConfig;
  }

  /**
   * 应用响应拦截器
   */
  async applyResponseInterceptors(response: any): Promise<any> {
    let processedResponse = response;
    for (const interceptor of this.responseInterceptors) {
      processedResponse = await interceptor.intercept(processedResponse);
    }
    return processedResponse;
  }

  /**
   * 应用错误拦截器
   */
  async applyErrorInterceptors(error: Error): Promise<Error> {
    let processedError = error;
    for (const interceptor of this.errorInterceptors) {
      processedError = await interceptor.intercept(processedError);
    }
    return processedError;
  }

  /**
   * 清除所有拦截器
   */
  clear(): void {
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.errorInterceptors = [];
  }
}

/**
 * 常用拦截器工厂函数
 */

/**
 * 创建认证拦截器
 */
export function createAuthInterceptor(token: string, scheme: string = 'Bearer'): RequestInterceptor {
  return {
    intercept(config: any) {
      return {
        ...config,
        headers: {
          ...config.headers,
          Authorization: `${scheme} ${token}`
        }
      };
    }
  };
}

/**
 * 创建日志拦截器
 */
export function createLoggingInterceptor(
  logger: (message: string, data?: any) => void
): {
  request: RequestInterceptor;
  response: ResponseInterceptor;
  error: ErrorInterceptor;
} {
  return {
    request: {
      intercept(config: any) {
        logger(`[Request] ${config.method} ${config.url}`, config);
        return config;
      }
    },
    response: {
      intercept(response: any) {
        logger(`[Response] ${response.status}`, response);
        return response;
      }
    },
    error: {
      intercept(error: Error) {
        logger(`[Error] ${error.message}`, error);
        return error;
      }
    }
  };
}

/**
 * 创建重试拦截器
 */
export function createRetryInterceptor(
  shouldRetry: (error: Error, retryCount: number) => boolean,
  getRetryDelay: (retryCount: number) => number
): ErrorInterceptor {
  return {
    async intercept(error: Error) {
      // 这个拦截器需要配合外部重试逻辑使用
      // 这里只是标记错误是否可重试
      (error as any).retryable = true;
      return error;
    }
  };
}