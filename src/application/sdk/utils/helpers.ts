/**
 * 辅助工具类
 *
 * 提供通用的辅助功能，如ID生成、深拷贝、对象合并等
 */

/**
 * 辅助工具类
 */
export class Helpers {
  /**
   * 生成唯一ID
   * @param prefix ID前缀
   * @returns 唯一ID
   */
  static generateId(prefix: string = 'id'): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * 深拷贝对象
   * @param obj 要拷贝的对象
   * @returns 深拷贝后的对象
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as T;
    }

    if (obj instanceof Array) {
      return obj.map(item => Helpers.deepClone(item)) as T;
    }

    if (obj instanceof Map) {
      const clonedMap = new Map();
      obj.forEach((value, key) => {
        clonedMap.set(key, Helpers.deepClone(value));
      });
      return clonedMap as T;
    }

    if (obj instanceof Set) {
      const clonedSet = new Set();
      obj.forEach(value => {
        clonedSet.add(Helpers.deepClone(value));
      });
      return clonedSet as T;
    }

    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = Helpers.deepClone(obj[key]);
      }
    }

    return clonedObj;
  }

  /**
   * 深度合并对象
   * @param target 目标对象
   * @param source 源对象
   * @returns 合并后的对象
   */
  static mergeDeep<T extends object>(target: T, source: Partial<T>): T {
    const output = { ...target };

    if (Helpers.isObject(target) && Helpers.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (Helpers.isObject(source[key as keyof T])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key as keyof T] });
          } else {
            output[key as keyof T] = Helpers.mergeDeep(
              target[key as keyof T] as object,
              source[key as keyof T] as object
            ) as T[keyof T];
          }
        } else {
          Object.assign(output, { [key]: source[key as keyof T] });
        }
      });
    }

    return output;
  }

  /**
   * 检查是否为对象
   * @param item 要检查的项
   * @returns 是否为对象
   */
  private static isObject(item: any): item is object {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * 检查是否为空对象
   * @param obj 要检查的对象
   * @returns 是否为空对象
   */
  static isEmptyObject(obj: any): boolean {
    if (!obj || typeof obj !== 'object') {
      return true;
    }

    return Object.keys(obj).length === 0;
  }

  /**
   * 检查是否为空值
   * @param value 要检查的值
   * @returns 是否为空值
   */
  static isEmpty(value: any): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    if (typeof value === 'string') {
      return value.trim() === '';
    }

    if (Array.isArray(value)) {
      return value.length === 0;
    }

    if (typeof value === 'object') {
      return Helpers.isEmptyObject(value);
    }

    return false;
  }

  /**
   * 格式化日期
   * @param date 日期对象或时间戳
   * @param format 格式字符串
   * @returns 格式化后的日期字符串
   */
  static formatDate(date: Date | number | string, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
    const d = date instanceof Date ? date : new Date(date);

    if (isNaN(d.getTime())) {
      return '';
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const milliseconds = String(d.getMilliseconds()).padStart(3, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds)
      .replace('SSS', milliseconds);
  }

  /**
   * 延迟执行
   * @param ms 延迟时间（毫秒）
   * @returns Promise
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重试函数
   * @param fn 要执行的函数
   * @param maxRetries 最大重试次数
   * @param retryDelay 重试延迟（毫秒）
   * @returns Promise
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (i < maxRetries) {
          await Helpers.delay(retryDelay);
        }
      }
    }

    throw lastError;
  }

  /**
   * 批量执行异步函数
   * @param functions 函数数组
   * @param concurrency 并发数
   * @returns Promise数组
   */
  static async batch<T>(
    functions: (() => Promise<T>)[],
    concurrency: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const fn of functions) {
      const promise = fn().then(result => {
        results.push(result);
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * 截断字符串
   * @param str 字符串
   * @param maxLength 最大长度
   * @param suffix 后缀
   * @returns 截断后的字符串
   */
  static truncate(str: string, maxLength: number, suffix: string = '...'): string {
    if (str.length <= maxLength) {
      return str;
    }

    return str.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * 驼峰命名转下划线命名
   * @param str 驼峰命名字符串
   * @returns 下划线命名字符串
   */
  static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * 下划线命名转驼峰命名
   * @param str 下划线命名字符串
   * @returns 驼峰命名字符串
   */
  static snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * 获取对象属性路径的值
   * @param obj 对象
   * @param path 属性路径（如 'a.b.c'）
   * @returns 属性值
   */
  static get(obj: any, path: string): any {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
      if (result === null || result === undefined) {
        return undefined;
      }
      result = result[key];
    }

    return result;
  }

  /**
   * 设置对象属性路径的值
   * @param obj 对象
   * @param path 属性路径（如 'a.b.c'）
   * @param value 值
   */
  static set(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!key) continue;
      
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      current[lastKey] = value;
    }
  }

  /**
   * 数组去重
   * @param arr 数组
   * @param key 对象数组的去重键
   * @returns 去重后的数组
   */
  static unique<T>(arr: T[], key?: keyof T): T[] {
    if (!key) {
      return Array.from(new Set(arr));
    }

    const seen = new Set();
    return arr.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }

  /**
   * 数组分组
   * @param arr 数组
   * @param key 分组键
   * @returns 分组后的对象
   */
  static groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
    return arr.reduce((result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {} as Record<string, T[]>);
  }

  /**
   * 数组排序
   * @param arr 数组
   * @param key 排序键
   * @param order 排序顺序
   * @returns 排序后的数组
   */
  static sortBy<T>(arr: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
    return [...arr].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal < bVal) {
        return order === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  /**
   * 创建防抖函数
   * @param fn 要防抖的函数
   * @param delay 延迟时间（毫秒）
   * @returns 防抖函数
   */
  static debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | undefined;

    return function (this: any, ...args: Parameters<T>) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /**
   * 创建节流函数
   * @param fn 要节流的函数
   * @param delay 延迟时间（毫秒）
   * @returns 节流函数
   */
  static throttle<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    let timeoutId: NodeJS.Timeout | undefined;

    return function (this: any, ...args: Parameters<T>) {
      const now = Date.now();
      const remaining = delay - (now - lastCall);

      if (remaining <= 0) {
        lastCall = now;
        fn.apply(this, args);
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          lastCall = Date.now();
          fn.apply(this, args);
        }, remaining);
      }
    };
  }
}