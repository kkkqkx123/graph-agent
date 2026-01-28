/**
 * 版本工具函数
 * 提供版本号的解析、比较和递增功能
 * 遵循语义化版本规范（如 "1.0.0"）
 */

import type { Version } from '../types/common';

/**
 * 版本工具类
 */
export const VersionUtils = {
  /**
   * 创建初始版本（"1.0.0"）
   */
  initial(): Version {
    return '1.0.0';
  },

  /**
   * 解析版本号
   */
  parse(version: Version): { major: number; minor: number; patch: number } {
    const parts = version.split('.').map(Number);
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0
    };
  },

  /**
   * 下一个主版本
   */
  nextMajor(version: Version): Version {
    const parsed = this.parse(version);
    return `${parsed.major + 1}.0.0`;
  },

  /**
   * 下一个次版本
   */
  nextMinor(version: Version): Version {
    const parsed = this.parse(version);
    return `${parsed.major}.${parsed.minor + 1}.0`;
  },

  /**
   * 下一个补丁版本
   */
  nextPatch(version: Version): Version {
    const parsed = this.parse(version);
    return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  },

  /**
   * 比较版本号
   * @returns -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
   */
  compare(v1: Version, v2: Version): number {
    const p1 = this.parse(v1);
    const p2 = this.parse(v2);
    
    if (p1.major !== p2.major) return p1.major < p2.major ? -1 : 1;
    if (p1.minor !== p2.minor) return p1.minor < p2.minor ? -1 : 1;
    if (p1.patch !== p2.patch) return p1.patch < p2.patch ? -1 : 1;
    return 0;
  }
};