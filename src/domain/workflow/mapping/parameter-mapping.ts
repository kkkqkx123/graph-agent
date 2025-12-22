import { ExecutionContext } from '../execution';

/**
 * 参数映射接口
 * 
 * 定义工作流执行过程中的参数映射和转换策略
 */
export interface ParameterMapping {
  /**
   * 参数映射名称
   */
  readonly name: string;
  
  /**
   * 参数映射类型
   */
  readonly type: ParameterMappingType;
  
  /**
   * 参数映射描述
   */
  readonly description: string;
  
  /**
   * 应用参数映射
   * @param context 执行上下文
   * @returns 映射后的执行上下文
   */
  apply(context: ExecutionContext): Promise<ExecutionContext>;
  
  /**
   * 添加参数映射规则
   * @param rule 映射规则
   */
  addRule(rule: ParameterMappingRule): void;
  
  /**
   * 移除参数映射规则
   * @param ruleId 规则ID
   */
  removeRule(ruleId: string): void;
  
  /**
   * 获取所有映射规则
   */
  getRules(): ParameterMappingRule[];
  
  /**
   * 验证映射配置
   */
  validate(): void;
}

/**
 * 参数映射类型枚举
 */
export enum ParameterMappingType {
  DIRECT = 'direct',
  TRANSFORM = 'transform',
  CONDITIONAL = 'conditional',
  VALIDATION = 'validation',
  CUSTOM = 'custom'
}

/**
 * 参数映射规则接口
 */
export interface ParameterMappingRule {
  /**
   * 规则ID
   */
  readonly ruleId: string;
  
  /**
   * 规则名称
   */
  readonly name: string;
  
  /**
   * 源参数路径
   */
  readonly sourcePath: string;
  
  /**
   * 目标参数路径
   */
  readonly targetPath: string;
  
  /**
   * 转换函数
   */
  readonly transform?: (value: any, context: ExecutionContext) => any;
  
  /**
   * 验证函数
   */
  readonly validate?: (value: any, context: ExecutionContext) => boolean;
  
  /**
   * 条件函数
   */
  readonly condition?: (context: ExecutionContext) => boolean;
  
  /**
   * 默认值
   */
  readonly defaultValue?: any;
  
  /**
   * 是否必需
   */
  readonly required?: boolean;
  
  /**
   * 应用规则
   * @param context 执行上下文
   */
  apply(context: ExecutionContext): ExecutionContext;
}

/**
 * 直接参数映射
 * 
 * 直接将源参数映射到目标参数，不进行任何转换
 */
export class DirectParameterMapping implements ParameterMapping {
  readonly name = 'Direct Parameter Mapping';
  readonly type = ParameterMappingType.DIRECT;
  readonly description = '直接将源参数映射到目标参数';
  
  private rules: ParameterMappingRule[] = [];
  
  async apply(context: ExecutionContext): Promise<ExecutionContext> {
    const mappedContext = { ...context };
    
    for (const rule of this.rules) {
      if (this.shouldApplyRule(rule, mappedContext)) {
        const result = rule.apply(mappedContext);
        Object.assign(mappedContext, result);
      }
    }
    
    return mappedContext;
  }
  
  addRule(rule: ParameterMappingRule): void {
    this.rules.push(rule);
  }
  
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.ruleId !== ruleId);
  }
  
  getRules(): ParameterMappingRule[] {
    return [...this.rules];
  }
  
  validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('参数映射名称不能为空');
    }
    
    if (this.type !== ParameterMappingType.DIRECT) {
      throw new Error('参数映射类型不匹配');
    }
    
    // 验证规则
    for (const rule of this.rules) {
      this.validateRule(rule);
    }
  }
  
  /**
   * 检查是否应该应用规则
   */
  private shouldApplyRule(rule: ParameterMappingRule, context: ExecutionContext): boolean {
    if (rule.condition && !rule.condition(context)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * 验证规则
   */
  private validateRule(rule: ParameterMappingRule): void {
    if (!rule.ruleId || rule.ruleId.trim().length === 0) {
      throw new Error('规则ID不能为空');
    }
    
    if (!rule.name || rule.name.trim().length === 0) {
      throw new Error('规则名称不能为空');
    }
    
    if (!rule.sourcePath || rule.sourcePath.trim().length === 0) {
      throw new Error('源参数路径不能为空');
    }
    
    if (!rule.targetPath || rule.targetPath.trim().length === 0) {
      throw new Error('目标参数路径不能为空');
    }
  }
}

/**
 * 转换参数映射
 * 
 * 对参数进行转换和格式化
 */
export class TransformParameterMapping implements ParameterMapping {
  readonly name = 'Transform Parameter Mapping';
  readonly type = ParameterMappingType.TRANSFORM;
  readonly description = '对参数进行转换和格式化';
  
  private rules: ParameterMappingRule[] = [];
  
  async apply(context: ExecutionContext): Promise<ExecutionContext> {
    const mappedContext = { ...context };
    
    for (const rule of this.rules) {
      if (this.shouldApplyRule(rule, mappedContext)) {
        try {
          // 获取源值
          const sourceValue = this.getValueByPath(mappedContext, rule.sourcePath);
          
          // 应用转换
          let targetValue = sourceValue;
          if (rule.transform) {
            targetValue = rule.transform(sourceValue, mappedContext);
          }
          
          // 验证转换结果
          if (rule.validate && !rule.validate(targetValue, mappedContext)) {
            throw new Error(`参数验证失败: ${rule.targetPath}`);
          }
          
          // 设置目标值
          this.setValueByPath(mappedContext, rule.targetPath, targetValue);
          
        } catch (error) {
          if (rule.required) {
            throw error;
          } else if (rule.defaultValue !== undefined) {
            this.setValueByPath(mappedContext, rule.targetPath, rule.defaultValue);
          }
        }
      }
    }
    
    return mappedContext;
  }
  
  addRule(rule: ParameterMappingRule): void {
    this.rules.push(rule);
  }
  
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.ruleId !== ruleId);
  }
  
  getRules(): ParameterMappingRule[] {
    return [...this.rules];
  }
  
  validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('参数映射名称不能为空');
    }
    
    if (this.type !== ParameterMappingType.TRANSFORM) {
      throw new Error('参数映射类型不匹配');
    }
    
    // 验证规则
    for (const rule of this.rules) {
      this.validateRule(rule);
    }
  }
  
  /**
   * 检查是否应该应用规则
   */
  private shouldApplyRule(rule: ParameterMappingRule, context: ExecutionContext): boolean {
    if (rule.condition && !rule.condition(context)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * 验证规则
   */
  private validateRule(rule: ParameterMappingRule): void {
    if (!rule.ruleId || rule.ruleId.trim().length === 0) {
      throw new Error('规则ID不能为空');
    }
    
    if (!rule.name || rule.name.trim().length === 0) {
      throw new Error('规则名称不能为空');
    }
    
    if (!rule.sourcePath || rule.sourcePath.trim().length === 0) {
      throw new Error('源参数路径不能为空');
    }
    
    if (!rule.targetPath || rule.targetPath.trim().length === 0) {
      throw new Error('目标参数路径不能为空');
    }
  }
  
  /**
   * 根据路径获取值
   */
  private getValueByPath(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }
    
    return current;
  }
  
  /**
   * 根据路径设置值
   */
  private setValueByPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key) {
        if (current[key] === undefined || current[key] === null) {
          current[key] = {};
        }
        current = current[key];
      }
    }
    
    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      current[lastKey] = value;
    }
  }
  }

  /**
  * 条件参数映射
  * 
  * 根据条件选择不同的参数映射
  */
  export class ConditionalParameterMapping implements ParameterMapping {
  readonly name = 'Conditional Parameter Mapping';
  readonly type = ParameterMappingType.CONDITIONAL;
  readonly description = '根据条件选择不同的参数映射';
  
  private rules: ParameterMappingRule[] = [];
  private conditions: Array<{
    condition: (context: ExecutionContext) => boolean;
    rules: ParameterMappingRule[];
  }> = [];
  
  async apply(context: ExecutionContext): Promise<ExecutionContext> {
    let mappedContext = { ...context };
    
    // 应用基础规则
    for (const rule of this.rules) {
      if (this.shouldApplyRule(rule, mappedContext)) {
        const result = rule.apply(mappedContext);
        Object.assign(mappedContext, result);
      }
    }
    
    // 应用条件规则
    for (const conditionGroup of this.conditions) {
      if (conditionGroup.condition(mappedContext)) {
        for (const rule of conditionGroup.rules) {
          if (this.shouldApplyRule(rule, mappedContext)) {
            const result = rule.apply(mappedContext);
            Object.assign(mappedContext, result);
          }
        }
        break; // 只应用第一个匹配的条件组
      }
    }
    
    return mappedContext;
  }
  
  addRule(rule: ParameterMappingRule): void {
    this.rules.push(rule);
  }
  
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.ruleId !== ruleId);
    
    // 也从条件规则中移除
    for (const conditionGroup of this.conditions) {
      conditionGroup.rules = conditionGroup.rules.filter(rule => rule.ruleId !== ruleId);
    }
  }
  
  getRules(): ParameterMappingRule[] {
    return [...this.rules];
  }
  
  /**
   * 添加条件规则组
   */
  addConditionalRules(
    condition: (context: ExecutionContext) => boolean,
    rules: ParameterMappingRule[]
  ): void {
    this.conditions.push({
      condition,
      rules
    });
  }
  
  validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('参数映射名称不能为空');
    }
    
    if (this.type !== ParameterMappingType.CONDITIONAL) {
      throw new Error('参数映射类型不匹配');
    }
    
    // 验证基础规则
    for (const rule of this.rules) {
      this.validateRule(rule);
    }
    
    // 验证条件规则
    for (const conditionGroup of this.conditions) {
      for (const rule of conditionGroup.rules) {
        this.validateRule(rule);
      }
    }
  }
  
  /**
   * 检查是否应该应用规则
   */
  private shouldApplyRule(rule: ParameterMappingRule, context: ExecutionContext): boolean {
    if (rule.condition && !rule.condition(context)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * 验证规则
   */
  private validateRule(rule: ParameterMappingRule): void {
    if (!rule.ruleId || rule.ruleId.trim().length === 0) {
      throw new Error('规则ID不能为空');
    }
    
    if (!rule.name || rule.name.trim().length === 0) {
      throw new Error('规则名称不能为空');
    }
    
    if (!rule.sourcePath || rule.sourcePath.trim().length === 0) {
      throw new Error('源参数路径不能为空');
    }
    
    if (!rule.targetPath || rule.targetPath.trim().length === 0) {
      throw new Error('目标参数路径不能为空');
    }
  }
}

/**
 * 参数映射规则实现
 */
export class ParameterMappingRuleImpl implements ParameterMappingRule {
  constructor(
    public readonly ruleId: string,
    public readonly name: string,
    public readonly sourcePath: string,
    public readonly targetPath: string,
    public readonly transform?: (value: any, context: ExecutionContext) => any,
    public readonly validate?: (value: any, context: ExecutionContext) => boolean,
    public readonly condition?: (context: ExecutionContext) => boolean,
    public readonly defaultValue?: any,
    public readonly required: boolean = false
  ) {}
  
  apply(context: ExecutionContext): ExecutionContext {
    // 获取源值
    const sourceValue = this.getValueByPath(context, this.sourcePath);
    
    // 应用转换
    let targetValue = sourceValue;
    if (this.transform) {
      targetValue = this.transform(sourceValue, context);
    }
    
    // 验证转换结果
    if (this.validate && !this.validate(targetValue, context)) {
      if (this.required) {
        throw new Error(`参数验证失败: ${this.targetPath}`);
      } else if (this.defaultValue !== undefined) {
        targetValue = this.defaultValue;
      }
    }
    
    // 设置目标值
    this.setValueByPath(context, this.targetPath, targetValue);
    
    return context;
  }
  
  /**
   * 根据路径获取值
   */
  private getValueByPath(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }
    
    return current;
  }
  
  /**
   * 根据路径设置值
   */
  private setValueByPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key) {
        if (current[key] === undefined || current[key] === null) {
          current[key] = {};
        }
        current = current[key];
      }
    }
    
    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      current[lastKey] = value;
    }
  }
  }

/**
 * 参数映射工厂
 */
export class ParameterMappingFactory {
  /**
   * 创建参数映射
   */
  static create(
    type: ParameterMappingType,
    options?: Record<string, any>
  ): ParameterMapping {
    switch (type) {
      case ParameterMappingType.DIRECT:
        return new DirectParameterMapping();
      
      case ParameterMappingType.TRANSFORM:
        return new TransformParameterMapping();
      
      case ParameterMappingType.CONDITIONAL:
        return new ConditionalParameterMapping();
      
      // TODO: 实现其他参数映射类型
      // case ParameterMappingType.VALIDATION:
      //   return new ValidationParameterMapping();
      
      // case ParameterMappingType.CUSTOM:
      //   return new CustomParameterMapping(options);
      
      default:
        throw new Error(`不支持参数映射类型: ${type}`);
    }
  }
  
  /**
   * 创建默认参数映射
   */
  static default(): ParameterMapping {
    return new DirectParameterMapping();
  }
}