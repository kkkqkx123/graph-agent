/**
 * 脚本验证工具
 * 提供纯工具函数，不包含任何预设的验证逻辑
 *
 * 注意：SDK完全信任用户配置，不预设任何验证规则。
 * 应用层应根据实际需求实现自定义验证逻辑。
 */

/**
 * 检查字符串是否包含指定的模式
 * @param text 要检查的文本
 * @param patterns 要匹配的模式数组
 * @returns 是否包含任一模式
 */
export function containsAnyPattern(
  text: string,
  patterns: string[]
): boolean {
  return patterns.some(pattern => text.includes(pattern));
}

/**
 * 检查字符串是否匹配指定的正则表达式
 * @param text 要检查的文本
 * @param regexes 正则表达式数组
 * @returns 是否匹配任一正则表达式
 */
export function matchesAnyRegex(
  text: string,
  regexes: RegExp[]
): boolean {
  return regexes.some(regex => regex.test(text));
}

/**
 * 检查字符串是否在白名单中
 * @param text 要检查的文本
 * @param whitelist 白名单数组
 * @returns 是否在白名单中
 */
export function isInWhitelist(
  text: string,
  whitelist: string[]
): boolean {
  return whitelist.includes(text);
}

/**
 * 检查字符串是否在黑名单中
 * @param text 要检查的文本
 * @param blacklist 黑名单数组
 * @returns 是否在黑名单中
 */
export function isInBlacklist(
  text: string,
  blacklist: string[]
): boolean {
  return blacklist.includes(text);
}