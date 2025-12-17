/**
 * 提示词模板值对象
 * 
 * 支持变量替换的提示词模板
 */

import { ValueObject } from '../../common/value-objects/value-object';

/**
 * 提示词模板属性接口
 */
export interface PromptTemplateProps {
  /**
   * 模板内容
   */
  template: string;
  
  /**
   * 模板变量列表
   */
  variables: string[];
  
  /**
   * 模板描述
   */
  description?: string;
}

/**
 * 提示词模板值对象
 */
export class PromptTemplate extends ValueObject<PromptTemplateProps> {
  constructor(props: PromptTemplateProps) {
    super(props);
  }

  /**
   * 获取模板内容
   */
  getTemplate(): string {
    return this.props.template;
  }

  /**
   * 获取模板变量列表
   */
  getVariables(): string[] {
    return [...this.props.variables];
  }

  /**
   * 获取模板描述
   */
  getDescription(): string | undefined {
    return this.props.description;
  }

  /**
   * 渲染模板
   * 
   * @param variables 变量值映射
   * @returns 渲染后的字符串
   */
  public render(variables: Record<string, string>): string {
    let rendered = this.props.template;

    // 替换所有变量
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
    }

    // 检查是否有未替换的变量
    const unreplacedVariables = PromptTemplate.extractVariables(rendered);
    if (unreplacedVariables.length > 0) {
      throw new Error(`未提供以下变量的值: ${unreplacedVariables.join(', ')}`);
    }

    return rendered;
  }

  /**
   * 验证变量是否完整
   * 
   * @param variables 变量值映射
   * @returns 验证结果
   */
  public validateVariables(variables: Record<string, string>): {
    isValid: boolean;
    missingVariables: string[];
  } {
    const missingVariables: string[] = [];

    for (const variable of this.props.variables) {
      if (!(variable in variables)) {
        missingVariables.push(variable);
      }
    }

    return {
      isValid: missingVariables.length === 0,
      missingVariables
    };
  }

  /**
   * 从模板字符串中提取变量
   * 
   * @param template 模板字符串
   * @returns 变量列表
   */
  public static extractVariables(template: string): string[] {
    const variablePattern = /\{([^}]+)\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variablePattern.exec(template)) !== null) {
      const variable = match[1] || '';
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }

    return variables;
  }

  /**
   * 创建提示词模板
   * 
   * @param template 模板内容
   * @param description 模板描述
   * @returns 提示词模板实例
   */
  public static create(
    template: string,
    description?: string
  ): PromptTemplate {
    const variables = this.extractVariables(template);

    return new PromptTemplate({
      template,
      variables,
      description
    });
  }

  /**
   * 创建单轮模式默认模板
   */
  public static createSingleTurnDefault(): PromptTemplate {
    return this.create(
      `请将以下提示词输入到Web LLM中，并将回复粘贴回来：

{prompt}

回复：`,
      '单轮对话默认模板'
    );
  }

  /**
   * 创建多轮模式默认模板
   */
  public static createMultiTurnDefault(): PromptTemplate {
    return this.create(
      `请继续对话，将以下提示词输入到Web LLM中：

{incremental_prompt}

对话历史：
{conversation_history}

回复：`,
      '多轮对话默认模板'
    );
  }

  /**
   * 创建高级单轮模板
   */
  public static createAdvancedSingleTurn(): PromptTemplate {
    return this.create(
      `╔═══════════════════════════════════════════
║ 🎯 任务指令
╚═══════════════════════════════════════════

{prompt}

╔═══════════════════════════════════════════
║ 📝 请在此处粘贴Web LLM的回复：
╚═══════════════════════════════════════════`,
      '高级单轮对话模板'
    );
  }

  /**
   * 创建高级多轮模板
   */
  public static createAdvancedMultiTurn(): PromptTemplate {
    return this.create(
      `╔═══════════════════════════════════════════
║ 🔄 继续对话
╚═══════════════════════════════════════════

{incremental_prompt}

╔═══════════════════════════════════════════
║ 📜 对话历史
╚═══════════════════════════════════════════
{conversation_history}

╔═══════════════════════════════════════════
║ 📝 新的回复：
╚═══════════════════════════════════════════`,
      '高级多轮对话模板'
    );
  }

  /**
   * 验证提示词模板的有效性
   */
  public override validate(): void {
    if (!this.props.template || this.props.template.trim() === '') {
      throw new Error('模板内容不能为空');
    }
    if (!Array.isArray(this.props.variables)) {
      throw new Error('模板变量必须是数组');
    }
  }

  /**
   * 克隆模板并修改内容
   * 
   * @param newTemplate 新的模板内容
   * @param newDescription 新的模板描述
   * @returns 新的模板实例
   */
  public clone(
    newTemplate?: string,
    newDescription?: string
  ): PromptTemplate {
    return PromptTemplate.create(
      newTemplate || this.props.template,
      newDescription || this.props.description
    );
  }

  /**
   * 检查模板是否包含特定变量
   * 
   * @param variable 变量名
   * @returns 是否包含
   */
  public hasVariable(variable: string): boolean {
    return this.props.variables.includes(variable);
  }

  /**
   * 获取模板的预估长度（不含变量）
   * 
   * @returns 模板基础长度
   */
  public getBaseLength(): number {
    return this.props.template.replace(/\{[^}]+\}/g, '').length;
  }

  /**
   * 获取模板的复杂度评分
   * 
   * @returns 复杂度评分（1-10）
   */
  public getComplexityScore(): number {
    let score = 1;
    
    // 基于变量数量
    score += Math.min(this.props.variables.length * 0.5, 3);
    
    // 基于模板长度
    score += Math.min(this.getBaseLength() / 100, 2);
    
    // 基于特殊字符
    const specialChars = (this.props.template.match(/[╔═║╚╝]/g) || []).length;
    score += Math.min(specialChars * 0.2, 2);
    
    // 基于条件结构（简单检测）
    const conditionalStructures = (this.props.template.match(/\{if.*?\}|\{endif\}/g) || []).length;
    score += Math.min(conditionalStructures * 0.5, 2);
    
    return Math.min(Math.round(score * 10) / 10, 10);
  }
}