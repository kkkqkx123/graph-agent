/**
 * 工具类型值对象
 * 
 * 表示工具的类型
 */
export class ToolType {
  /**
   * 工具类型值
   */
  readonly value: string;

  /**
   * 内置类型常量
   */
  static readonly BUILTIN = new ToolType('builtin');
  static readonly NATIVE = new ToolType('native');
  static readonly REST = new ToolType('rest');
  static readonly MCP = new ToolType('mcp');
  static readonly CUSTOM = new ToolType('custom');

  /**
   * 所有有效类型
   */
  private static readonly VALID_TYPES = [
    'builtin',
    'native',
    'rest',
    'mcp',
    'custom'
  ];

  /**
   * 构造函数
   * 
   * @param value 工具类型值
   */
  constructor(value: string) {
    if (!ToolType.isValid(value)) {
      throw new Error(`Invalid tool type: ${value}`);
    }
    
    this.value = value;
  }

  /**
   * 检查类型值是否有效
   * 
   * @param value 类型值
   * @returns 是否有效
   */
  static isValid(value: string): boolean {
    return ToolType.VALID_TYPES.includes(value);
  }

  /**
   * 从字符串创建工具类型
   * 
   * @param value 字符串值
   * @returns 工具类型
   */
  static fromString(value: string): ToolType {
    return new ToolType(value);
  }

  /**
   * 检查是否为内置类型
   * 
   * @returns 是否为内置类型
   */
  isBuiltin(): boolean {
    return this.value === ToolType.BUILTIN.value;
  }

  /**
   * 检查是否为原生类型
   * 
   * @returns 是否为原生类型
   */
  isNative(): boolean {
    return this.value === ToolType.NATIVE.value;
  }

  /**
   * 检查是否为REST类型
   * 
   * @returns 是否为REST类型
   */
  isRest(): boolean {
    return this.value === ToolType.REST.value;
  }

  /**
   * 检查是否为MCP类型
   * 
   * @returns 是否为MCP类型
   */
  isMcp(): boolean {
    return this.value === ToolType.MCP.value;
  }

  /**
   * 检查是否为自定义类型
   * 
   * @returns 是否为自定义类型
   */
  isCustom(): boolean {
    return this.value === ToolType.CUSTOM.value;
  }

  /**
   * 检查是否为远程类型（REST或MCP）
   * 
   * @returns 是否为远程类型
   */
  isRemote(): boolean {
    return this.isRest() || this.isMcp();
  }

  /**
   * 检查是否为本地类型（内置或原生）
   * 
   * @returns 是否为本地类型
   */
  isLocal(): boolean {
    return this.isBuiltin() || this.isNative();
  }

  /**
   * 获取类型的显示名称
   * 
   * @returns 显示名称
   */
  getDisplayName(): string {
    switch (this.value) {
      case 'builtin':
        return '内置工具';
      case 'native':
        return '原生工具';
      case 'rest':
        return 'REST工具';
      case 'mcp':
        return 'MCP工具';
      case 'custom':
        return '自定义工具';
      default:
        return this.value;
    }
  }

  /**
   * 获取类型的描述
   * 
   * @returns 描述
   */
  getDescription(): string {
    switch (this.value) {
      case 'builtin':
        return '系统内置的工具，无需额外配置';
      case 'native':
        return '原生执行的工具，直接调用系统命令或函数';
      case 'rest':
        return '通过REST API调用的工具';
      case 'mcp':
        return '通过MCP协议调用的工具';
      case 'custom':
        return '用户自定义的工具';
      default:
        return '未知工具类型';
    }
  }

  /**
   * 获取所有有效的工具类型
   * 
   * @returns 所有有效的工具类型
   */
  static getAllTypes(): ToolType[] {
    return ToolType.VALID_TYPES.map(value => new ToolType(value));
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
   * @param other 另一个工具类型
   * @returns 是否相等
   */
  equals(other: ToolType): boolean {
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