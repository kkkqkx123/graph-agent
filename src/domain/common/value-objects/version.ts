import { ValueObject } from './value-object';
/**
 * 版本值对象接口
 */
export interface VersionProps {
  value: string;
}

/**
 * 版本值对象
 * 
 * 用于表示实体的版本信息，支持语义化版本控制
 */
export class Version extends ValueObject<VersionProps> {
  /**
   * 创建版本实例
   * @param value 版本字符串
   * @returns 版本实例
   */
  public static create(value: string): Version {
    return new Version({ value });
  }

  /**
   * 从字符串创建版本
   * @param value 版本字符串
   * @returns 版本实例
   */
  public static fromString(value: string): Version {
    return Version.create(value);
  }

  /**
   * 创建初始版本
   * @returns 初始版本实例
   */
  public static initial(): Version {
    return new Version({ value: '1.0.0' });
  }

  /**
   * 从主版本、次版本、补丁版本创建版本
   * @param major 主版本
   * @param minor 次版本
   * @param patch 补丁版本
   * @returns 版本实例
   */
  public static fromParts(major: number, minor: number, patch: number): Version {
    return new Version({ value: `${major}.${minor}.${patch}` });
  }

  /**
   * 获取版本字符串
   * @returns 版本字符串
   */
  public getValue(): string {
    return this.props.value;
  }

  /**
   * 获取主版本号
   * @returns 主版本号
   */
  public getMajor(): number {
    const parts = this.parseVersion();
    return parts.major;
  }

  /**
   * 获取次版本号
   * @returns 次版本号
   */
  public getMinor(): number {
    const parts = this.parseVersion();
    return parts.minor;
  }

  /**
   * 获取补丁版本号
   * @returns 补丁版本号
   */
  public getPatch(): number {
    const parts = this.parseVersion();
    return parts.patch;
  }

  /**
   * 解析版本字符串
   * @returns 解析后的版本对象
   */
  private parseVersion(): { major: number; minor: number; patch: number } {
    const versionRegex = /^(\d+)\.(\d+)\.(\d+)$/;
    const match = this.props.value.match(versionRegex);
    
    if (!match) {
      throw new Error(`无效的版本格式: ${this.props.value}`);
    }

    return {
      major: parseInt(match[1]!, 10),
      minor: parseInt(match[2]!, 10),
      patch: parseInt(match[3]!, 10)
    };
  }

  /**
   * 创建下一个主版本
   * @returns 下一个主版本
   */
  public nextMajor(): Version {
    const parts = this.parseVersion();
    return Version.fromParts(parts.major + 1, 0, 0);
  }

  /**
   * 创建下一个次版本
   * @returns 下一个次版本
   */
  public nextMinor(): Version {
    const parts = this.parseVersion();
    return Version.fromParts(parts.major, parts.minor + 1, 0);
  }

  /**
   * 创建下一个补丁版本
   * @returns 下一个补丁版本
   */
  public nextPatch(): Version {
    const parts = this.parseVersion();
    return Version.fromParts(parts.major, parts.minor, parts.patch + 1);
  }

  /**
   * 比较版本是否相等
   * @param other 另一个版本
   * @returns 是否相等
   */
  public override equals(other?: Version): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    return this.props.value === other.getValue();
  }

  /**
   * 检查当前版本是否大于另一个版本
   * @param other 另一个版本
   * @returns 是否大于
   */
  public greaterThan(other: Version): boolean {
    const thisParts = this.parseVersion();
    const otherParts = other.parseVersion();

    if (thisParts.major !== otherParts.major) {
      return thisParts.major > otherParts.major;
    }
    if (thisParts.minor !== otherParts.minor) {
      return thisParts.minor > otherParts.minor;
    }
    return thisParts.patch > otherParts.patch;
  }

  /**
   * 检查当前版本是否小于另一个版本
   * @param other 另一个版本
   * @returns 是否小于
   */
  public lessThan(other: Version): boolean {
    return other.greaterThan(this);
  }

  /**
   * 检查当前版本是否大于等于另一个版本
   * @param other 另一个版本
   * @returns 是否大于等于
   */
  public greaterThanOrEqual(other: Version): boolean {
    return this.equals(other) || this.greaterThan(other);
  }

  /**
   * 检查当前版本是否小于等于另一个版本
   * @param other 另一个版本
   * @returns 是否小于等于
   */
  public lessThanOrEqual(other: Version): boolean {
    return this.equals(other) || this.lessThan(other);
  }

  /**
   * 验证版本的有效性
   */
  public validate(): void {
    if (!this.props.value || this.props.value.trim().length === 0) {
      throw new Error('版本不能为空');
    }

    // 验证版本格式
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(this.props.value)) {
      throw new Error(`无效的版本格式: ${this.props.value}，应为 x.y.z 格式`);
    }
  }

  /**
   * 获取版本的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return this.props.value;
  }
}