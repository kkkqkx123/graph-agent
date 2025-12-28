import { ValueObject } from '../../../common/value-objects/value-object';

/**
 * 提示词上下文值对象接口
 */
export interface PromptContextProps {
  /** 提示词模板 */
  template: string;
  /** 提示词变量 */
  variables: Map<string, unknown>;
  /** 提示词历史记录 */
  history: PromptHistoryEntry[];
  /** 元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 提示词历史记录条目
 */
export interface PromptHistoryEntry {
  /** 节点ID */
  nodeId: string;
  /** 提示词内容 */
  prompt: string;
  /** 响应内容 */
  response?: string;
  /** 时间戳 */
  timestamp: Date;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 提示词上下文值对象
 *
 * 用于在工作流执行过程中传递和管理提示词上下文
 */
export class PromptContext extends ValueObject<PromptContextProps> {
  private constructor(props: PromptContextProps) {
    super(props);
    if (!props.template) {
      throw new Error('提示词模板不能为空');
    }
  }

  /**
   * 创建提示词上下文
   * @param template 提示词模板
   * @param variables 提示词变量
   * @param history 历史记录
   * @param metadata 元数据
   * @returns 提示词上下文实例
   */
  public static create(
    template: string,
    variables: Map<string, unknown> = new Map(),
    history: PromptHistoryEntry[] = [],
    metadata: Record<string, unknown> = {}
  ): PromptContext {
    return new PromptContext({
      template,
      variables: new Map(variables),
      history: [...history],
      metadata: { ...metadata }
    });
  }

  /**
   * 从已有属性重建提示词上下文
   * @param props 提示词上下文属性
   * @returns 提示词上下文实例
   */
  public static fromProps(props: PromptContextProps): PromptContext {
    return new PromptContext({
      template: props.template,
      variables: new Map(props.variables),
      history: [...props.history],
      metadata: { ...props.metadata }
    });
  }

  /**
   * 获取提示词模板
   * @returns 提示词模板
   */
  public get template(): string {
    return this.props.template;
  }

  /**
   * 获取提示词变量
   * @returns 提示词变量映射
   */
  public get variables(): Map<string, unknown> {
    return new Map(this.props.variables);
  }

  /**
   * 获取历史记录
   * @returns 历史记录数组
   */
  public get history(): PromptHistoryEntry[] {
    return [...this.props.history];
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 获取变量值
   * @param key 变量名
   * @returns 变量值
   */
  public getVariable(key: string): unknown | undefined {
    return this.props.variables.get(key);
  }

  /**
   * 检查变量是否存在
   * @param key 变量名
   * @returns 是否存在
   */
  public hasVariable(key: string): boolean {
    return this.props.variables.has(key);
  }

  /**
   * 获取所有变量名
   * @returns 变量名数组
   */
  public getVariableNames(): string[] {
    return Array.from(this.props.variables.keys());
  }

  /**
   * 设置变量值（创建新实例）
   * @param key 变量名
   * @param value 变量值
   * @returns 新的提示词上下文实例
   */
  public setVariable(key: string, value: unknown): PromptContext {
    const newVariables = new Map(this.props.variables);
    newVariables.set(key, value);
    return new PromptContext({
      ...this.props,
      variables: newVariables
    });
  }

  /**
   * 批量设置变量（创建新实例）
   * @param variables 变量映射
   * @returns 新的提示词上下文实例
   */
  public setVariables(variables: Map<string, unknown>): PromptContext {
    const newVariables = new Map(this.props.variables);
    for (const [key, value] of variables.entries()) {
      newVariables.set(key, value);
    }
    return new PromptContext({
      ...this.props,
      variables: newVariables
    });
  }

  /**
   * 删除变量（创建新实例）
   * @param key 变量名
   * @returns 新的提示词上下文实例
   */
  public removeVariable(key: string): PromptContext {
    const newVariables = new Map(this.props.variables);
    newVariables.delete(key);
    return new PromptContext({
      ...this.props,
      variables: newVariables
    });
  }

  /**
   * 添加历史记录（创建新实例）
   * @param entry 历史记录条目
   * @returns 新的提示词上下文实例
   */
  public addHistoryEntry(entry: PromptHistoryEntry): PromptContext {
    return new PromptContext({
      ...this.props,
      history: [...this.props.history, entry]
    });
  }

  /**
   * 获取指定节点的历史记录
   * @param nodeId 节点ID
   * @returns 历史记录条目数组
   */
  public getHistoryByNode(nodeId: string): PromptHistoryEntry[] {
    return this.props.history.filter(entry => entry.nodeId === nodeId);
  }

  /**
   * 获取最近的历史记录
   * @param count 数量
   * @returns 历史记录条目数组
   */
  public getRecentHistory(count: number = 10): PromptHistoryEntry[] {
    return this.props.history.slice(-count);
  }

  /**
   * 更新模板（创建新实例）
   * @param template 新模板
   * @returns 新的提示词上下文实例
   */
  public updateTemplate(template: string): PromptContext {
    return new PromptContext({
      ...this.props,
      template
    });
  }

  /**
   * 更新元数据（创建新实例）
   * @param metadata 新元数据
   * @returns 新的提示词上下文实例
   */
  public updateMetadata(metadata: Record<string, unknown>): PromptContext {
    return new PromptContext({
      ...this.props,
      metadata: { ...this.props.metadata, ...metadata }
    });
  }

  /**
   * 渲染提示词
   * @param additionalVariables 额外变量
   * @returns 渲染后的提示词
   */
  public render(additionalVariables?: Map<string, unknown>): string {
    let rendered = this.props.template;
    const allVariables = new Map(this.props.variables);

    if (additionalVariables) {
      for (const [key, value] of additionalVariables.entries()) {
        allVariables.set(key, value);
      }
    }

    // 替换 {{variable}} 格式的变量
    for (const [key, value] of allVariables.entries()) {
      const placeholder = `{{${key}}}`;
      const valueStr = value !== undefined && value !== null ? String(value) : '';
      rendered = rendered.replace(new RegExp(placeholder, 'g'), valueStr);
    }

    return rendered;
  }

  /**
   * 克隆提示词上下文
   * @returns 新的提示词上下文实例
   */
  public clone(): PromptContext {
    return new PromptContext({
      template: this.props.template,
      variables: new Map(this.props.variables),
      history: [...this.props.history],
      metadata: { ...this.props.metadata }
    });
  }

  /**
   * 比较两个提示词上下文是否相等
   * @param context 另一个提示词上下文
   * @returns 是否相等
   */
  public override equals(context?: PromptContext): boolean {
    if (context === null || context === undefined) {
      return false;
    }
    return (
      this.props.template === context.template &&
      JSON.stringify(Array.from(this.props.variables.entries())) ===
      JSON.stringify(Array.from(context.variables.entries())) &&
      JSON.stringify(this.props.history) === JSON.stringify(context.history)
    );
  }

  /**
   * 获取提示词上下文的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return `PromptContext(template="${this.props.template}", variables=${this.props.variables.size}, history=${this.props.history.length})`;
  }

  /**
   * 验证值对象的有效性
   */
  public validate(): void {
    if (!this.props.template || this.props.template.trim().length === 0) {
      throw new Error('提示词模板不能为空');
    }
  }
}