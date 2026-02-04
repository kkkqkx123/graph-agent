/**
 * HTTP 请求参数构建工具
 * 提供参数合并、过滤和转换功能
 */

/**
 * 参数合并选项
 */
export interface MergeParametersOptions {
  /** 要排除的键名列表 */
  excludeKeys?: string[];
  /** 键名转换函数 */
  transform?: (key: string, value: any) => { key: string; value: any } | null;
  /** 是否深度合并（默认 false） */
  deep?: boolean;
}

/**
 * 合并参数对象
 *
 * 特点：
 * - 支持排除特定键
 * - 支持键名转换
 * - 支持深度合并
 * - 后面的参数覆盖前面的同名参数
 *
 * @example
 * const params = mergeParameters(
 *   { temperature: 0.7, max_tokens: 4096 },
 *   { temperature: 0.8, top_p: 1.0 },
 *   { excludeKeys: ['max_tokens'] }
 * );
 * // 结果: { temperature: 0.8, top_p: 1.0 }
 */
export function mergeParameters(
  target: Record<string, any>,
  source: Record<string, any> | undefined,
  options?: MergeParametersOptions
): Record<string, any> {
  if (!source) {
    // 如果没有源对象，只应用排除规则
    if (options?.excludeKeys?.length) {
      const result = { ...target };
      for (const key of options.excludeKeys) {
        delete result[key];
      }
      return result;
    }
    return { ...target };
  }

  const excludeKeys = new Set(options?.excludeKeys || []);
  
  // 先复制目标对象，并移除要排除的键
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(target)) {
    if (!excludeKeys.has(key)) {
      result[key] = value;
    }
  }

  for (const [key, value] of Object.entries(source)) {
    // 跳过排除的键
    if (excludeKeys.has(key)) {
      continue;
    }

    // 应用转换函数
    if (options?.transform) {
      const transformed = options.transform(key, value);
      if (transformed) {
        result[transformed.key] = transformed.value;
      } else {
        // 如果转换函数返回 null，按原样处理键值对
        // 深度合并或直接覆盖
        if (options?.deep && typeof value === 'object' && value !== null && !Array.isArray(value)) {
          result[key] = mergeParameters(result[key] || {}, value, options);
        } else {
          result[key] = value;
        }
      }
    } else {
      // 没有转换函数，直接处理
      // 深度合并或直接覆盖
      if (options?.deep && typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = mergeParameters(result[key] || {}, value, options);
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * 提取并排除特定键
 *
 * @example
 * const { max_tokens, ...rest } = extractParameters(params, ['max_tokens']);
 * // max_tokens: 4096
 * // rest: { temperature: 0.7, top_p: 1.0 }
 */
export function extractParameters(
  source: Record<string, any> | undefined,
  keys: string[]
): { extracted: Record<string, any>; remaining: Record<string, any> } {
  if (!source) {
    return { extracted: {}, remaining: {} };
  }

  const extracted: Record<string, any> = {};
  const remaining: Record<string, any> = {};

  for (const [key, value] of Object.entries(source)) {
    if (keys.includes(key)) {
      extracted[key] = value;
    } else {
      remaining[key] = value;
    }
  }

  return { extracted, remaining };
}

/**
 * 过滤掉值为 undefined 或 null 的参数
 */
export function filterEmptyParameters(params: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * 判断参数对象是否为空
 */
export function isEmptyParameters(params?: Record<string, any>): boolean {
  return !params || Object.keys(params).length === 0;
}