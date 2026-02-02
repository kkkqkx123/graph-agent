/**
 * 获取平台诊断头（仅 Node.js）
 * 用于日志追踪和问题诊断
 */

export function getPlatformHeaders(): Record<string, string> {
  // 仅在 Node.js 环境添加诊断头
  if (typeof process === 'undefined' || !process.version) {
    return {};
  }

  return {
    'X-Runtime': 'node',
    'X-Runtime-Version': process.version,
    'X-Node-Arch': process.arch,
    'X-Node-Platform': process.platform,
  };
}