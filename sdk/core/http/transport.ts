/**
 * 传输协议抽象层
 * 定义HTTP和SSE传输协议的统一接口
 * 主要用于REST API工具和流式传输
 */

/**
 * 传输响应接口
 */
export interface TransportResponse<T = any> {
  data: T;
  status?: number;
  headers?: Record<string, string>;
  requestId?: string;
}

/**
 * 传输选项接口
 */
export interface TransportOptions {
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean>;
  timeout?: number;
  stream?: boolean;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
}

/**
 * 传输协议接口
 */
export interface Transport {
  execute<T = any>(url: string, options?: TransportOptions): Promise<TransportResponse<T>>;
  executeStream?(url: string, options?: TransportOptions): AsyncIterable<any>;
}

/**
 * HTTP传输实现
 */
export class HttpTransport implements Transport {
  constructor(
    private baseUrl?: string,
    private defaultHeaders?: Record<string, string>,
    private timeout?: number
  ) { }

  async execute<T = any>(url: string, options?: TransportOptions): Promise<TransportResponse<T>> {
    // 构建完整URL
    let fullUrl = url;
    if (this.baseUrl && !url.startsWith('http://') && !url.startsWith('https://')) {
      const cleanBaseUrl = this.baseUrl.replace(/\/$/, '');
      const cleanUrl = url.replace(/^\//, '');
      fullUrl = `${cleanBaseUrl}/${cleanUrl}`;
    }

    // 添加查询参数
    if (options?.query) {
      const queryString = new URLSearchParams(
        Object.entries(options.query)
          .filter(([_, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)])
      ).toString();

      fullUrl += `?${queryString}`;
    }

    // 合并请求头
    const headers = {
      ...(this.defaultHeaders || {}),
      ...(options?.headers || {})
    };

    // 创建AbortController用于超时
    const controller = new AbortController();
    const timeoutId = options?.timeout || this.timeout
      ? setTimeout(() => controller.abort(), options?.timeout || this.timeout)
      : null;

    try {
      const response = await fetch(fullUrl, {
        method: 'GET', // Simplified for example, could extend to support other methods
        headers,
        signal: controller.signal,
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 如果请求流式响应，返回流
      if (options?.stream) {
        return {
          data: response.body as T,
          status: response.status,
          headers: this.headersToObject(response.headers),
          requestId: response.headers.get('x-request-id') || undefined,
        };
      }

      // 解析响应
      const contentType = response.headers.get('content-type');
      let data: T;
      if (contentType && contentType.includes('application/json')) {
        data = (await response.json()) as T;
      } else {
        data = (await response.text()) as T;
      }

      return {
        data,
        status: response.status,
        headers: this.headersToObject(response.headers),
        requestId: response.headers.get('x-request-id') || undefined,
      };
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 将Headers转换为对象
   */
  private headersToObject(headers: Headers): Record<string, string> {
    const obj: Record<string, string> = {};
    headers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
}

/**
 * SSE传输实现
 */
export class SseTransport implements Transport {
  constructor(
    private baseUrl?: string,
    private defaultHeaders?: Record<string, string>,
    private timeout?: number
  ) { }

  async execute<T = any>(url: string, options?: TransportOptions): Promise<TransportResponse<T>> {
    // 对于SSE，我们返回一个可迭代的流
    const fullUrl = this.buildFullUrl(url, options?.query);
    const headers = {
      Accept: 'text/event-stream, text/plain, */*',
      ...(this.defaultHeaders || {}),
      ...(options?.headers || {})
    };

    const response = await fetch(fullUrl, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      data: response.body as T,
      status: response.status,
      headers: this.headersToObject(response.headers),
      requestId: response.headers.get('x-request-id') || undefined,
    };
  }

  async *executeStream(url: string, options?: TransportOptions): AsyncIterable<any> {
    const fullUrl = this.buildFullUrl(url, options?.query);
    const headers = {
      Accept: 'text/event-stream, text/plain, */*',
      ...(this.defaultHeaders || {}),
      ...(options?.headers || {})
    };

    const response = await fetch(fullUrl, {
      method: options?.method || 'GET',
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // 将新数据添加到缓冲区
        buffer += decoder.decode(value, { stream: true });

        // 按行分割缓冲区内容
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || ''; // 保留不完整的最后一行

        // 处理每一行
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            // 这是SSE数据行
            const data = line.substring(6); // 移除 "data: " 前缀

            if (data === '[DONE]' || data.trim() === '') {
              // 特殊标记表示流结束或空行
              continue;
            }

            try {
              // 尝试解析JSON数据
              yield JSON.parse(data);
            } catch (e) {
              // 如果不是JSON，作为普通字符串处理
              yield data;
            }
          }
          // 其他SSE字段如 event:, id:, retry: 可以在这里处理
        }
      }

      // 处理缓冲区中剩余的数据
      if (buffer.trim()) {
        try {
          yield JSON.parse(buffer.trim());
        } catch (e) {
          yield buffer.trim();
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 构建完整URL
   */
  private buildFullUrl(url: string, query?: Record<string, string | number | boolean>): string {
    let fullUrl = url;

    if (this.baseUrl && !url.startsWith('http://') && !url.startsWith('https://')) {
      const cleanBaseUrl = this.baseUrl.replace(/\/$/, '');
      const cleanUrl = url.replace(/^\//, '');
      fullUrl = `${cleanBaseUrl}/${cleanUrl}`;
    }

    if (query && Object.keys(query).length > 0) {
      const queryString = new URLSearchParams(
        Object.entries(query)
          .filter(([_, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)])
      ).toString();

      fullUrl += `?${queryString}`;
    }

    return fullUrl;
  }

  /**
   * 将Headers转换为对象
   */
  private headersToObject(headers: Headers): Record<string, string> {
    const obj: Record<string, string> = {};
    headers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
}
