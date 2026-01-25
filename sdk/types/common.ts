/**
 * Common类型定义
 * 定义通用的基础类型，包括ID、时间戳、版本、元数据等
 *
 * 设计原则：
 * - 使用类型别名而非类，保持简单性
 * - 提供工具函数辅助操作，但不强制使用
 * - 便于序列化和反序列化
 * - 适合SDK的使用场景
 */

/**
 * ID类型（类型别名）
 * 使用字符串作为ID，支持UUID或其他格式
 */
export type ID = string;

/**
 * ID工具函数
 */
export const IDUtils = {
  /**
   * 生成新ID（使用UUID v4）
   */
  generate(): ID {
    return crypto.randomUUID();
  },

  /**
   * 验证ID是否有效
   */
  isValid(id: ID): boolean {
    return typeof id === 'string' && id.length > 0;
  }
};

/**
 * 时间戳类型（类型别名）
 * 使用毫秒时间戳
 */
export type Timestamp = number;

/**
 * 时间戳工具函数
 */
export const TimestampUtils = {
  /**
   * 创建当前时间戳
   */
  now(): Timestamp {
    return Date.now();
  },

  /**
   * 从Date创建时间戳
   */
  fromDate(date: Date): Timestamp {
    return date.getTime();
  },

  /**
   * 转换为Date对象
   */
  toDate(timestamp: Timestamp): Date {
    return new Date(timestamp);
  },

  /**
   * 转换为ISO字符串
   */
  toISOString(timestamp: Timestamp): string {
    return new Date(timestamp).toISOString();
  }
};

/**
 * 版本类型（类型别名）
 * 遵循语义化版本规范（如 "1.0.0"）
 */
export type Version = string;

/**
 * 版本工具函数
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

/**
 * 元数据类型（类型别名）
 * 支持任意键值对
 */
export type Metadata = Record<string, any>;

/**
 * 元数据工具函数
 */
export const MetadataUtils = {
  /**
   * 创建空元数据
   */
  empty(): Metadata {
    return {};
  },

  /**
   * 获取元数据值
   */
  get(metadata: Metadata, key: string): any {
    return metadata[key];
  },

  /**
   * 设置元数据值（返回新对象，保持不可变性）
   */
  set(metadata: Metadata, key: string, value: any): Metadata {
    return { ...metadata, [key]: value };
  },

  /**
   * 删除元数据值（返回新对象，保持不可变性）
   */
  delete(metadata: Metadata, key: string): Metadata {
    const { [key]: _, ...rest } = metadata;
    return rest;
  },

  /**
   * 检查是否存在
   */
  has(metadata: Metadata, key: string): boolean {
    return key in metadata;
  },

  /**
   * 合并元数据
   */
  merge(...metadatas: Metadata[]): Metadata {
    return Object.assign({}, ...metadatas);
  }
};