/**
 * HTTP 响应接口
 */

export interface HTTPResponse<T = any> {
  /** HTTP 状态码 */
  status: number;
  /** 状态文本 */
  statusText: string;
  /** 响应头 */
  headers: Headers;
  /** 响应数据 */
  data: T;
  /** 请求 ID（从响应头获取） */
  requestId?: string;
  /** 请求持续时间（毫秒） */
  duration?: number;
  /** 是否成功 */
  ok: boolean;
  /** 重定向 */
  redirected: boolean;
  /** 响应类型 */
  type: ResponseType;
  /** 响应 URL */
  url: string;
}

/**
 * 流式响应接口
 */
export interface StreamResponse {
  /** HTTP 状态码 */
  status: number;
  /** 状态文本 */
  statusText: string;
  /** 响应头 */
  headers: Headers;
  /** 流式响应体 */
  body: ReadableStream<Uint8Array>;
  /** 请求 ID（从响应头获取） */
  requestId?: string;
  /** 请求持续时间（毫秒） */
  duration?: number;
  /** 是否成功 */
  ok: boolean;
  /** 重定向 */
  redirected: boolean;
  /** 响应类型 */
  type: ResponseType;
  /** 响应 URL */
  url: string;
}