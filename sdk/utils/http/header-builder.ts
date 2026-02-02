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
  const seen = new Set<string>();

  for (const headers of headersList) {
    if (!headers) continue;

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();

      // 第一次出现的头需要清除前面的
      if (!seen.has(lowerKey)) {
        // 删除任何大小写变体
        for (const existingKey of Object.keys(result)) {
          if (existingKey.toLowerCase() === lowerKey) {
            delete result[existingKey];
          }
        }
        seen.add(lowerKey);
      }

      if (value === undefined) {
        // 显式删除头
        for (const existingKey of Object.keys(result)) {
          if (existingKey.toLowerCase() === lowerKey) {
            delete result[existingKey];
          }
        }
      } else {
        // 添加或覆盖头
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