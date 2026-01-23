/**
 * APIPromise - 延迟解析的 Promise 封装
 *
 * 借鉴 Anthropic SDK 的设计，提供延迟解析功能，避免不必要的解析开销
 * 支持获取原始 Response 对象和解析后的数据
 */

export interface APIResponseProps<T = any> {
  response: Response;
  data: T;
  requestId?: string;
}

export type WithRequestID<T> = T & { _requestId?: string };

export type PromiseOrValue<T> = T | Promise<T>;

/**
 * APIPromise 类
 *
 * 继承自 Promise，提供额外的辅助方法：
 * - asResponse(): 获取原始 Response 对象
 * - withResponse(): 同时获取解析后的数据和原始响应
 * - 延迟解析：只在需要时才解析响应体
 */
export class APIPromise<T> extends Promise<WithRequestID<T>> {
  private parsedPromise: Promise<WithRequestID<T>> | undefined;
  private responsePromise: Promise<APIResponseProps<T>>;
  private parseResponse: (props: APIResponseProps<T>) => PromiseOrValue<WithRequestID<T>>;

  constructor(
    responsePromise: Promise<APIResponseProps<T>>,
    parseResponse?: (props: APIResponseProps<T>) => PromiseOrValue<WithRequestID<T>>
  ) {
    super(() => {}); // No-op constructor

    this.responsePromise = responsePromise;
    this.parseResponse = parseResponse || this.defaultParseResponse;
  }

  /**
   * 默认的响应解析函数
   */
  private defaultParseResponse(props: APIResponseProps<T>): WithRequestID<T> {
    const result = props.data as any;
    if (props.requestId) {
      result._requestId = props.requestId;
    }
    return result;
  }

  /**
   * 获取原始 Response 对象
   *
   * 如果需要解析响应体但仍然获取 Response 实例，请使用 withResponse()
   */
  async asResponse(): Promise<Response> {
    const props = await this.responsePromise;
    return props.response;
  }

  /**
   * 获取解析后的数据、原始 Response 实例和请求 ID
   *
   * 如果只需要原始 Response，请使用 asResponse()
   */
  async withResponse(): Promise<{
    data: T;
    response: Response;
    requestId?: string;
  }> {
    const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
    const props = await this.responsePromise;
    return { data, response, requestId: props.requestId };
  }

  /**
   * 延迟解析响应
   */
  private parse(): Promise<WithRequestID<T>> {
    if (!this.parsedPromise) {
      this.parsedPromise = this.responsePromise.then(this.parseResponse);
    }
    return this.parsedPromise;
  }

  /**
   * 链式转换
   */
  _thenUnwrap<U>(transform: (data: T, props: APIResponseProps<T>) => U): APIPromise<U> {
    const transformedResponsePromise = this.responsePromise.then(async (props) => {
      const data = await this.parseResponse(props);
      const transformed = transform(data, props);
      return {
        response: props.response,
        data: transformed,
        requestId: props.requestId
      } as APIResponseProps<U>;
    });

    return new APIPromise<U>(
      transformedResponsePromise,
      async (props) => {
        const result = props.data as any;
        if (props.requestId) {
          result._requestId = props.requestId;
        }
        return result;
      }
    );
  }

  /**
   * 重写 Promise.then 方法
   */
  override then<TResult1 = WithRequestID<T>, TResult2 = never>(
    onfulfilled?: ((value: WithRequestID<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.parse().then(onfulfilled, onrejected);
  }

  /**
   * 重写 Promise.catch 方法
   */
  override catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<WithRequestID<T> | TResult> {
    return this.parse().catch(onrejected);
  }

  /**
   * 重写 Promise.finally 方法
   */
  override finally(onfinally?: (() => void) | null): Promise<WithRequestID<T>> {
    return this.parse().finally(onfinally);
  }
}