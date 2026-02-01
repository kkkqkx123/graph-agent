/**
 * Token编码器工具
 * 基于tiktoken的精确token计数，使用cl100k_base编码器（GPT-4/Claude兼容）
 * 编码失败时降级为字符估算
 */

let encoder: any = null;
let initFailed = false;

/**
 * 初始化编码器（延迟初始化）
 */
function initEncoder(): any {
  if (encoder) return encoder;
  if (initFailed) return null;

  try {
    const tiktoken = require('tiktoken');
    encoder = tiktoken.getEncoding('cl100k_base');
    return encoder;
  } catch (error) {
    initFailed = true;
    return null;
  }
}

/**
 * 编码文本并计数token
 * 优先使用tiktoken精确计数，失败时降级为字符估算
 *
 * @param text 文本内容
 * @returns Token数量
 */
export function encodeText(text: string): number {
  const enc = initEncoder();
  if (!enc) {
    // 降级：平均每2.5个字符约1个token
    return Math.ceil(text.length / 2.5);
  }

  try {
    return enc.encode(text).length;
  } catch {
    return Math.ceil(text.length / 2.5);
  }
}

/**
 * 编码对象并计数token
 * JSON序列化后再编码
 *
 * @param obj 对象
 * @returns Token数量
 */
export function encodeObject(obj: any): number {
  try {
    return encodeText(JSON.stringify(obj));
  } catch {
    return Math.ceil(String(obj).length / 2.5);
  }
}

/**
 * 字符估算降级方案（平均2.5字符/token）
 *
 * @param text 文本
 * @returns 估算的token数量
 */
export function estimateTokensFallback(text: string): number {
  return Math.ceil(text.length / 2.5);
}

/**
 * 重置编码器（仅用于测试）
 */
export function resetEncoder(): void {
  encoder = null;
  initFailed = false;
}
