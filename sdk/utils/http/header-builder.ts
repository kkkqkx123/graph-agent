/**
 * HTTP 请求头构建工具
 * 提供分层合并和显式删除支持
 */

/**
 * 合并多层请求头
 * 
 * 特点：
 * - 后面的头覆盖前面的同名头（大小写不敏感）
 * - 设置值为 undefined 来显式删除头
 * - 返回记录的低小写名称及是否被删除
 * 
 * @example
 * const headers = mergeHeaders(
 *   { 'Content-Type': 'application/json' },
 *   { 'Authorization': 'Bearer ...' },
 *   { 'X-Custom': 'value' }
 * );
 */
export function mergeHeaders(
  ...headersList: (Record<string, string | undefined> | undefined)[]
): Record<string, string> {
  const result: Record<string, string> = {};
  const keyMap: Record<string, string> = {}; // 存储小写键到实际键的映射

  for (const headers of headersList) {
    if (!headers) continue;

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();

      // 如果存在相同小写的键，则先删除旧的
      if (keyMap[lowerKey]) {
        delete result[keyMap[lowerKey]];
      }

      if (value === undefined) {
        // 显式删除头，如果存在的话
        delete keyMap[lowerKey];
      } else {
        // 更新键映射并设置值
        keyMap[lowerKey] = key;
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * 判断头集合是否为空
 */
export function isEmptyHeaders(headers?: Record<string, string>): boolean {
  return !headers || Object.keys(headers).length === 0;
}