/**
 * 白名单/黑名单检查工具
 * 提供纯工具函数，不包含任何预设的验证逻辑
 *
 * 注意：SDK完全信任用户配置，不预设任何白名单或黑名单规则。
 * 应用层应根据实际需求实现自定义的白名单/黑名单逻辑。
 */

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

/**
 * 检查字符串是否匹配白名单中的任一模式（支持通配符）
 * @param text 要检查的文本
 * @param whitelistPatterns 白名单模式数组（支持*通配符）
 * @returns 是否匹配白名单中的任一模式
 */
export function matchesWhitelistPattern(
  text: string,
  whitelistPatterns: string[]
): boolean {
  return whitelistPatterns.some(pattern => {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(text);
  });
}

/**
 * 检查字符串是否匹配黑名单中的任一模式（支持通配符）
 * @param text 要检查的文本
 * @param blacklistPatterns 黑名单模式数组（支持*通配符）
 * @returns 是否匹配黑名单中的任一模式
 */
export function matchesBlacklistPattern(
  text: string,
  blacklistPatterns: string[]
): boolean {
  return blacklistPatterns.some(pattern => {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(text);
  });
}