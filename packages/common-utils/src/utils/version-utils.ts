/**
 * 版本工具函数
 * 提供版本号的解析、比较和递增功能
 * 遵循语义化版本规范（如 "1.0.0"）
 */

import type { Version } from '@modular-agent/types/common';

/**
 * 创建初始版本（"1.0.0"）
 */
export function initialVersion(): Version {
  return '1.0.0';
}

/**
 * 解析版本号
 */
export function parseVersion(version: Version): { major: number; minor: number; patch: number } {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

/**
 * 下一个主版本
 */
export function nextMajorVersion(version: Version): Version {
  const parsed = parseVersion(version);
  return `${parsed.major + 1}.0.0`;
}

/**
 * 下一个次版本
 */
export function nextMinorVersion(version: Version): Version {
  const parsed = parseVersion(version);
  return `${parsed.major}.${parsed.minor + 1}.0`;
}

/**
 * 下一个补丁版本
 */
export function nextPatchVersion(version: Version): Version {
  const parsed = parseVersion(version);
  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
}

/**
 * 比较版本号
 * @returns -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
 */
export function compareVersion(v1: Version, v2: Version): number {
  const p1 = parseVersion(v1);
  const p2 = parseVersion(v2);
  
  if (p1.major !== p2.major) return p1.major < p2.major ? -1 : 1;
  if (p1.minor !== p2.minor) return p1.minor < p2.minor ? -1 : 1;
  if (p1.patch !== p2.patch) return p1.patch < p2.patch ? -1 : 1;
  return 0;
}

/**
 * 根据变更类型自动递增版本
 * @param currentVersion 当前版本号
 * @param changeType 变更类型：major（主版本）、minor（次版本）、patch（补丁版本）
 * @returns 递增后的版本号
 */
export function autoIncrementVersion(currentVersion: Version, changeType: 'major' | 'minor' | 'patch'): Version {
  switch (changeType) {
    case 'major':
      return nextMajorVersion(currentVersion);
    case 'minor':
      return nextMinorVersion(currentVersion);
    case 'patch':
      return nextPatchVersion(currentVersion);
    default:
      return nextPatchVersion(currentVersion);
  }
}

/**
 * 解析版本号的预发布和构建元数据
 * @param version 完整版本号，如 "1.2.3-alpha.1+build.123"
 * @returns 解析后的版本信息对象
 */
export function parseFullVersion(version: Version): {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
} {
  const [base, ...rest] = version.split('+');
  const [versionCore, prerelease] = (base || '').split('-');
  const [major, minor, patch] = (versionCore || '').split('.').map(Number);
  
  return {
    major: major || 0,
    minor: minor || 0,
    patch: patch || 0,
    prerelease,
    build: rest.join('+')
  };
}