/**
 * PathResolver - 路径解析器
 * 提供简单的对象路径解析功能
 *
 * 支持的路径格式：
 * - 嵌套对象访问：如 "user.name"、"output.data.items"
 * - 数组索引访问：如 "items[0]"、"items[0].name"
 * - 组合访问：如 "output.data.items[0].name"
 *
 * 使用示例：
 * - resolvePath("user.name", obj) - 获取嵌套属性值
 * - resolvePath("items[0].name", obj) - 获取数组元素属性
 * - setPath("user.name", obj, "John") - 设置嵌套属性值
 * - pathExists("user.name", obj) - 检查路径是否存在
 */

import { validatePath } from './security-validator';
/**
 * 解析路径并获取值
 * @param path 路径字符串，支持嵌套访问和数组索引，如 "user.name"、"items[0].name"
 * @param root 根对象
 * @returns 路径对应的值，如果路径不存在则返回undefined
 */
export function resolvePath(path: string, root: any): any {
  if (!path || !root) {
    return undefined;
  }

  // 验证路径安全性
  validatePath(path);

  // 支持嵌套路径访问，如 "output.data.items[0].name"
  const parts = path.split('.');
  let value: any = root;

  for (const part of parts) {
    if (value === null || value === undefined) {
      return undefined;
    }

    // 处理数组索引访问，如 items[0]
    const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
    if (arrayMatch && arrayMatch[1] && arrayMatch[2]) {
      const arrayName = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);
      value = value[arrayName];
      if (Array.isArray(value)) {
        value = value[index];
      }
    } else {
      value = value[part];
    }
  }

  return value;
}

/**
 * 检查路径是否存在
 * @param path 路径字符串
 * @param root 根对象
 * @returns 路径是否存在
 */
export function pathExists(path: string, root: any): boolean {
  try {
    return resolvePath(path, root) !== undefined;
  } catch {
    return false;
  }
}

/**
 * 设置路径的值
 * @param path 路径字符串
 * @param root 根对象
 * @param value 要设置的值
 * @returns 是否设置成功
 */
export function setPath(path: string, root: any, value: any): boolean {
  if (!path || !root) {
    return false;
  }

  // 先检查路径是否包含空部分（如 "valid..invalid"）
  const parts = path.split('.');
  for (const part of parts) {
    if (!part) {
      return false; // 包含空部分
    }
  }

  // 验证路径安全性（数字开头的属性名会抛出异常）
  validatePath(path);
  if (parts.length === 0) {
    return false;
  }

  let current: any = root;

  // 遍历到倒数第二层
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!part) {
      return false; // 包含空部分，如 "valid..invalid"
    }

    // 处理数组索引访问
    const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
    if (arrayMatch && arrayMatch[1] && arrayMatch[2]) {
      const arrayName = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);

      if (!current[arrayName]) {
        current[arrayName] = [];
      }
      current = current[arrayName];

      if (!Array.isArray(current)) {
        return false;
      }

      // 如果索引超出范围，扩展数组
      while (current.length <= index) {
        current.push({});
      }
      current = current[index];

      // 如果current仍然是undefined或null，初始化为空对象以便继续操作
      if (current === undefined || current === null) {
        current = {};
        // 将当前对象放回数组中
        // 注意：此时 current 已经是数组元素，我们需要更新数组中的值
        // 但由于我们已经失去了对数组的引用，我们需要重新获取
        // 实际上，由于我们在扩展数组时已经用 {} 填充了，这里不应该出现 undefined
        // 如果出现了，说明数组扩展有问题，直接返回 false
        return false;
      }
    } else {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
  }

  // 设置最后一层的值
  const lastPart = parts[parts.length - 1];
  if (!lastPart) {
    return false;
  }

  const arrayMatch = lastPart.match(/(\w+)\[(\d+)\]/);
  if (arrayMatch && arrayMatch[1] && arrayMatch[2]) {
    const arrayName = arrayMatch[1];
    const index = parseInt(arrayMatch[2], 10);

    if (!current[arrayName]) {
      current[arrayName] = [];
    }

    // 如果索引超出范围，扩展数组
    while (current[arrayName].length <= index) {
      current[arrayName].push(undefined);
    }
    current[arrayName][index] = value;
  } else {
    current[lastPart] = value;
  }

  return true;
}