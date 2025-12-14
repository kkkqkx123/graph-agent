/**
 * 邮箱地址值对象
 * 
 * 表示邮箱地址
 */
export class Email {
  /**
   * 邮箱地址值
   */
  readonly value: string;

  /**
   * 构造函数
   * 
   * @param value 邮箱地址值
   */
  constructor(value: string) {
    if (!Email.isValid(value)) {
      throw new Error(`Invalid email address: ${value}`);
    }
    
    this.value = value.toLowerCase();
  }

  /**
   * 检查邮箱地址是否有效
   * 
   * @param value 邮箱地址值
   * @returns 是否有效
   */
  static isValid(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }

    // 基本的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return false;
    }

    // 更详细的验证
    const parts = value.split('@');
    if (parts.length !== 2) {
      return false;
    }

    const [localPart, domain] = parts;

    // 验证本地部分
    if (!localPart || localPart.length > 64) {
      return false;
    }

    // 本地部分不能以点开始或结束
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      return false;
    }

    // 本地部分不能有连续的点
    if (localPart.includes('..')) {
      return false;
    }

    // 验证域名部分
    if (!domain || domain.length > 253) {
      return false;
    }

    // 域名不能以点开始或结束
    if (domain.startsWith('.') || domain.endsWith('.')) {
      return false;
    }

    // 域名不能有连续的点
    if (domain.includes('..')) {
      return false;
    }

    // 验证域名的每个标签
    const domainLabels = domain.split('.');
    if (domainLabels.length < 2) {
      return false;
    }

    for (const label of domainLabels) {
      if (!label || label.length > 63) {
        return false;
      }

      // 标签不能以点开始或结束
      if (label.startsWith('-') || label.endsWith('-')) {
        return false;
      }

      // 标签只能包含字母、数字和连字符
      if (!/^[a-zA-Z0-9-]+$/.test(label)) {
        return false;
      }
    }

    // 顶级域名验证
    const tld = domainLabels[domainLabels.length - 1];
    if (!tld || !/^[a-zA-Z]{2,}$/.test(tld)) {
      return false;
    }

    return true;
  }

  /**
   * 从字符串创建邮箱地址
   * 
   * @param value 字符串值
   * @returns 邮箱地址
   */
  static fromString(value: string): Email {
    return new Email(value);
  }

  /**
   * 获取本地部分
   *
   * @returns 本地部分
   */
  getLocalPart(): string {
    const parts = this.value.split('@');
    return parts[0] || '';
  }

  /**
   * 获取域名部分
   *
   * @returns 域名部分
   */
  getDomain(): string {
    const parts = this.value.split('@');
    return parts[1] || '';
  }

  /**
   * 获取显示名称
   * 
   * @returns 显示名称
   */
  getDisplayName(): string {
    return this.value;
  }

  /**
   * 检查是否为企业邮箱
   * 
   * @returns 是否为企业邮箱
   */
  isCorporate(): boolean {
    const domain = this.getDomain();
    
    // 常见的个人邮箱服务提供商
    const personalDomains = [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'aol.com',
      'icloud.com',
      'mail.com',
      'protonmail.com',
      'tutanota.com'
    ];

    return !personalDomains.includes(domain);
  }

  /**
   * 检查是否为临时邮箱
   * 
   * @returns 是否为临时邮箱
   */
  isDisposable(): boolean {
    const domain = this.getDomain();
    
    // 常见的临时邮箱服务提供商
    const disposableDomains = [
      '10minutemail.com',
      'guerrillamail.com',
      'mailinator.com',
      'tempmail.org',
      'yopmail.com',
      'maildrop.cc',
      'throwaway.email'
    ];

    return disposableDomains.includes(domain);
  }

  /**
   * 检查是否为教育邮箱
   * 
   * @returns 是否为教育邮箱
   */
  isEducational(): boolean {
    const domain = this.getDomain();
    
    // 教育域名后缀
    const educationalTlds = [
      '.edu',
      '.ac.',
      '.sch.',
      '.school.'
    ];

    return educationalTlds.some(tld => domain.includes(tld));
  }

  /**
   * 检查是否为政府邮箱
   * 
   * @returns 是否为政府邮箱
   */
  isGovernment(): boolean {
    const domain = this.getDomain();
    
    // 政府域名后缀
    const governmentTlds = [
      '.gov',
      '.mil',
      '.gov.',
      '.mil.'
    ];

    return governmentTlds.some(tld => domain.includes(tld));
  }

  /**
   * 获取域名等级
   * 
   * @returns 域名等级
   */
  getDomainLevel(): number {
    const domain = this.getDomain();
    return domain.split('.').length;
  }

  /**
   * 获取顶级域名
   *
   * @returns 顶级域名
   */
  getTopLevelDomain(): string {
    const domain = this.getDomain();
    const parts = domain.split('.');
    return parts[parts.length - 1] || '';
  }

  /**
   * 获取二级域名
   *
   * @returns 二级域名
   */
  getSecondLevelDomain(): string {
    const domain = this.getDomain();
    const parts = domain.split('.');
    
    if (parts.length >= 2) {
      return parts[parts.length - 2] || '';
    }
    
    return domain;
  }

  /**
   * 隐藏部分邮箱地址
   * 
   * @param visibleChars 可见字符数
   * @returns 隐藏后的邮箱地址
   */
  mask(visibleChars: number = 2): string {
    const localPart = this.getLocalPart();
    const domain = this.getDomain();
    
    if (localPart.length <= visibleChars) {
      return this.value;
    }
    
    const visibleLocalPart = localPart.substring(0, visibleChars);
    const maskedLocalPart = '*'.repeat(localPart.length - visibleChars);
    
    return `${visibleLocalPart}${maskedLocalPart}@${domain}`;
  }

  /**
   * 转换为字符串
   * 
   * @returns 字符串表示
   */
  toString(): string {
    return this.value;
  }

  /**
   * 转换为JSON
   * 
   * @returns JSON表示
   */
  toJSON(): string {
    return this.value;
  }

  /**
   * 检查是否相等
   * 
   * @param other 另一个邮箱地址
   * @returns 是否相等
   */
  equals(other: Email): boolean {
    return this.value === other.value;
  }

  /**
   * 哈希值
   * 
   * @returns 哈希值
   */
  hashCode(): number {
    return this.value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }

  /**
   * 比较两个邮箱地址
   * 
   * @param other 另一个邮箱地址
   * @returns 比较结果
   */
  compareTo(other: Email): number {
    if (this.value < other.value) {
      return -1;
    } else if (this.value > other.value) {
      return 1;
    } else {
      return 0;
    }
  }

  /**
   * 克隆邮箱地址
   * 
   * @returns 新邮箱地址
   */
  clone(): Email {
    return new Email(this.value);
  }

  /**
   * 获取邮箱地址的字符串表示（用于调试）
   * 
   * @returns 调试字符串
   */
  toDebugString(): string {
    return `Email(${this.value})`;
  }
}