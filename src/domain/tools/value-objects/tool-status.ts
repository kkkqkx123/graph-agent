/**
 * 工具状态值对象
 * 
 * 表示工具的状态
 */
export class ToolStatus {
  /**
   * 状态值
   */
  readonly value: string;

  /**
   * 状态常量
   */
  static readonly DRAFT = new ToolStatus('draft');
  static readonly ACTIVE = new ToolStatus('active');
  static readonly INACTIVE = new ToolStatus('inactive');
  static readonly DEPRECATED = new ToolStatus('deprecated');
  static readonly ARCHIVED = new ToolStatus('archived');

  /**
   * 所有有效状态
   */
  private static readonly VALID_STATUSES = [
    'draft',
    'active',
    'inactive',
    'deprecated',
    'archived'
  ];

  /**
   * 构造函数
   * 
   * @param value 状态值
   */
  constructor(value: string) {
    if (!ToolStatus.isValid(value)) {
      throw new Error(`Invalid tool status: ${value}`);
    }
    
    this.value = value;
  }

  /**
   * 检查状态值是否有效
   * 
   * @param value 状态值
   * @returns 是否有效
   */
  static isValid(value: string): boolean {
    return ToolStatus.VALID_STATUSES.includes(value);
  }

  /**
   * 从字符串创建工具状态
   * 
   * @param value 字符串值
   * @returns 工具状态
   */
  static fromString(value: string): ToolStatus {
    return new ToolStatus(value);
  }

  /**
   * 检查是否为草稿状态
   * 
   * @returns 是否为草稿状态
   */
  isDraft(): boolean {
    return this.value === ToolStatus.DRAFT.value;
  }

  /**
   * 检查是否为活跃状态
   * 
   * @returns 是否为活跃状态
   */
  isActive(): boolean {
    return this.value === ToolStatus.ACTIVE.value;
  }

  /**
   * 检查是否为非活跃状态
   * 
   * @returns 是否为非活跃状态
   */
  isInactive(): boolean {
    return this.value === ToolStatus.INACTIVE.value;
  }

  /**
   * 检查是否为已弃用状态
   * 
   * @returns 是否为已弃用状态
   */
  isDeprecated(): boolean {
    return this.value === ToolStatus.DEPRECATED.value;
  }

  /**
   * 检查是否为已归档状态
   * 
   * @returns 是否为已归档状态
   */
  isArchived(): boolean {
    return this.value === ToolStatus.ARCHIVED.value;
  }

  /**
   * 检查是否可用（活跃或非活跃）
   * 
   * @returns 是否可用
   */
  isAvailable(): boolean {
    return this.isActive() || this.isInactive();
  }

  /**
   * 检查是否不可用（已弃用或已归档）
   * 
   * @returns 是否不可用
   */
  isUnavailable(): boolean {
    return this.isDeprecated() || this.isArchived();
  }

  /**
   * 检查是否可以激活
   * 
   * @returns 是否可以激活
   */
  canActivate(): boolean {
    return this.isDraft() || this.isInactive();
  }

  /**
   * 检查是否可以停用
   * 
   * @returns 是否可以停用
   */
  canDeactivate(): boolean {
    return this.isActive();
  }

  /**
   * 检查是否可以弃用
   * 
   * @returns 是否可以弃用
   */
  canDeprecate(): boolean {
    return this.isActive() || this.isInactive();
  }

  /**
   * 检查是否可以归档
   * 
   * @returns 是否可以归档
   */
  canArchive(): boolean {
    return this.isDeprecated();
  }

  /**
   * 获取状态的显示名称
   * 
   * @returns 显示名称
   */
  getDisplayName(): string {
    switch (this.value) {
      case 'draft':
        return '草稿';
      case 'active':
        return '活跃';
      case 'inactive':
        return '非活跃';
      case 'deprecated':
        return '已弃用';
      case 'archived':
        return '已归档';
      default:
        return this.value;
    }
  }

  /**
   * 获取状态的描述
   * 
   * @returns 描述
   */
  getDescription(): string {
    switch (this.value) {
      case 'draft':
        return '工具正在开发中，尚未发布';
      case 'active':
        return '工具已发布并可以使用';
      case 'inactive':
        return '工具已发布但暂时不可用';
      case 'deprecated':
        return '工具已弃用，建议使用替代方案';
      case 'archived':
        return '工具已归档，不再维护';
      default:
        return '未知状态';
    }
  }

  /**
   * 获取状态的颜色代码
   * 
   * @returns 颜色代码
   */
  getColorCode(): string {
    switch (this.value) {
      case 'draft':
        return '#6c757d'; // 灰色
      case 'active':
        return '#28a745'; // 绿色
      case 'inactive':
        return '#ffc107'; // 黄色
      case 'deprecated':
        return '#fd7e14'; // 橙色
      case 'archived':
        return '#dc3545'; // 红色
      default:
        return '#6c757d'; // 默认灰色
    }
  }

  /**
   * 获取状态图标
   * 
   * @returns 图标名称
   */
  getIcon(): string {
    switch (this.value) {
      case 'draft':
        return 'edit';
      case 'active':
        return 'check-circle';
      case 'inactive':
        return 'pause-circle';
      case 'deprecated':
        return 'alert-triangle';
      case 'archived':
        return 'archive';
      default:
        return 'help-circle';
    }
  }

  /**
   * 获取所有有效的工具状态
   * 
   * @returns 所有有效的工具状态
   */
  static getAllStatuses(): ToolStatus[] {
    return ToolStatus.VALID_STATUSES.map(value => new ToolStatus(value));
  }

  /**
   * 获取可用的状态（活跃和非活跃）
   * 
   * @returns 可用的状态
   */
  static getAvailableStatuses(): ToolStatus[] {
    return [ToolStatus.ACTIVE, ToolStatus.INACTIVE];
  }

  /**
   * 获取不可用的状态（已弃用和已归档）
   * 
   * @returns 不可用的状态
   */
  static getUnavailableStatuses(): ToolStatus[] {
    return [ToolStatus.DEPRECATED, ToolStatus.ARCHIVED];
  }

  /**
   * 获取开发中的状态（草稿）
   * 
   * @returns 开发中的状态
   */
  static getDevelopmentStatuses(): ToolStatus[] {
    return [ToolStatus.DRAFT];
  }

  /**
   * 获取已发布的状态（活跃、非活跃、已弃用）
   * 
   * @returns 已发布的状态
   */
  static getPublishedStatuses(): ToolStatus[] {
    return [ToolStatus.ACTIVE, ToolStatus.INACTIVE, ToolStatus.DEPRECATED];
  }

  /**
   * 获取已结束的状态（已弃用、已归档）
   * 
   * @returns 已结束的状态
   */
  static getEndedStatuses(): ToolStatus[] {
    return [ToolStatus.DEPRECATED, ToolStatus.ARCHIVED];
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
   * @param other 另一个工具状态
   * @returns 是否相等
   */
  equals(other: ToolStatus): boolean {
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
}