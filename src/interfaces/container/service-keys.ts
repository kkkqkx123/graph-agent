/**
 * 接口层服务键常量定义
 * 
 * 统一管理接口层服务的键名，避免硬编码字符串
 */

/**
 * 接口层服务键
 */
export const INTERFACE_SERVICE_KEYS = {
  // HTTP服务
  HTTP_SERVICE: 'HTTPService',

  // CLI服务
  CLI_SERVICE: 'CLIService',

  // 请求上下文
  REQUEST_CONTEXT: 'RequestContext',

  // API控制器
  API_CONTROLLER: 'ApiController'
} as const;

/**
 * 接口层服务键类型
 */
export type InterfaceServiceKey = typeof INTERFACE_SERVICE_KEYS[keyof typeof INTERFACE_SERVICE_KEYS];