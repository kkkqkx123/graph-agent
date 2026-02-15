/**
 * 错误处理工具函数
 * 提供统一的错误处理能力，减少重复的类型检查代码
 */

/**
 * 提取错误消息
 * @param error 错误对象
 * @returns 错误消息字符串
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error === null || error === undefined) {
    return 'Unknown error';
  }
  
  if (typeof error === 'object') {
    return (error as any).message || 
           (error as any).toString() || 
           JSON.stringify(error);
  }
  
  return String(error);
}

/**
 * 标准化错误为 Error 对象
 * @param error 错误对象
 * @returns Error 对象
 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  
  if (typeof error === 'string') {
    return new Error(error);
  }
  
  if (error === null || error === undefined) {
    return new Error('Unknown error');
  }
  
  if (typeof error === 'object') {
    const message = (error as any).message || 
                    (error as any).toString() || 
                    JSON.stringify(error);
    return new Error(message);
  }
  
  return new Error(String(error));
}

/**
 * 类型守卫：判断是否为 Error 对象
 * @param error 错误对象
 * @returns 是否为 Error 对象
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * 获取错误对象或 undefined
 * @param error 错误对象
 * @returns Error 对象或 undefined
 */
export function getErrorOrUndefined(error: unknown): Error | undefined {
  return error instanceof Error ? error : undefined;
}

/**
 * 获取错误对象或创建新的 Error
 * @param error 错误对象
 * @returns Error 对象
 */
export function getErrorOrNew(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}