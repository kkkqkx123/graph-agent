import { ID } from '../../common/value-objects/id';

/**
 * 验证严重程度枚举
 */
export enum ValidationSeverity {
  /** 信息 */
  INFO = 'info',
  /** 警告 */
  WARNING = 'warning',
  /** 错误 */
  ERROR = 'error',
  /** 严重错误 */
  CRITICAL = 'critical'
}

/**
 * 验证错误类型枚举
 */
export enum ValidationErrorType {
  /** 结构错误 */
  STRUCTURE = 'structure',
  /** 语义错误 */
  SEMANTIC = 'semantic',
  /** 类型错误 */
  TYPE = 'type',
  /** 引用错误 */
  REFERENCE = 'reference',
  /** 配置错误 */
  CONFIGURATION = 'configuration',
  /** 依赖错误 */
  DEPENDENCY = 'dependency',
  /** 循环错误 */
  CYCLE = 'cycle',
  /** 性能问题 */
  PERFORMANCE = 'performance',
  /** 安全问题 */
  SECURITY = 'security'
}

/**
 * 验证错误接口
 */
export interface ValidationError {
  /** 错误ID */
  readonly id: string;
  /** 错误类型 */
  readonly type: ValidationErrorType;
  /** 严重程度 */
  readonly severity: ValidationSeverity;
  /** 错误消息 */
  readonly message: string;
  /** 错误描述 */
  readonly description?: string;
  /** 相关图ID */
  readonly graphId?: ID;
  /** 相关节点ID */
  readonly nodeId?: ID;
  /** 相关边ID */
  readonly edgeId?: ID;
  /** 错误位置 */
  readonly location?: {
    /** 文件路径 */
    readonly filePath?: string;
    /** 行号 */
    readonly line?: number;
    /** 列号 */
    readonly column?: number;
  };
  /** 错误上下文 */
  readonly context?: Record<string, any>;
  /** 修复建议 */
  readonly suggestions?: string[];
  /** 错误代码 */
  readonly code?: string;
  /** 错误时间 */
  readonly timestamp: Date;
  /** 错误元数据 */
  readonly metadata: Record<string, any>;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 是否有效 */
  readonly valid: boolean;
  /** 验证错误列表 */
  readonly errors: ValidationError[];
  /** 验证统计信息 */
  readonly statistics: ValidationStatistics;
  /** 验证时间 */
  readonly validationTime: Date;
  /** 验证持续时间（毫秒） */
  readonly duration: number;
  /** 验证元数据 */
  readonly metadata: Record<string, any>;
}

/**
 * 验证统计信息接口
 */
export interface ValidationStatistics {
  /** 总错误数 */
  readonly totalErrors: number;
  /** 按严重程度分组的错误数 */
  readonly errorsBySeverity: Record<ValidationSeverity, number>;
  /** 按类型分组的错误数 */
  readonly errorsByType: Record<ValidationErrorType, number>;
  /** 按图分组的错误数 */
  readonly errorsByGraph: Record<string, number>;
  /** 按节点分组的错误数 */
  readonly errorsByNode: Record<string, number>;
  /** 按边分组的错误数 */
  readonly errorsByEdge: Record<string, number>;
}

/**
 * 验证规则接口
 */
export interface ValidationRule {
  /** 规则ID */
  readonly id: string;
  /** 规则名称 */
  readonly name: string;
  /** 规则描述 */
  readonly description?: string;
  /** 规则类型 */
  readonly type: ValidationErrorType;
  /** 默认严重程度 */
  readonly defaultSeverity: ValidationSeverity;
  /** 是否启用 */
  readonly enabled: boolean;
  /** 规则配置 */
  readonly config: Record<string, any>;
  /** 验证函数 */
  readonly validate: (context: ValidationContext) => ValidationError[];
}

/**
 * 验证上下文接口
 */
export interface ValidationContext {
  /** 图ID */
  readonly graphId: ID;
  /** 图数据 */
  readonly graphData: any;
  /** 节点数据 */
  readonly nodes: Map<ID, any>;
  /** 边数据 */
  readonly edges: Map<ID, any>;
  /** 验证配置 */
  readonly config: ValidationConfig;
  /** 验证规则 */
  readonly rules: Map<string, ValidationRule>;
  /** 上下文数据 */
  readonly contextData: Map<string, any>;
}

/**
 * 验证配置接口
 */
export interface ValidationConfig {
  /** 是否启用验证 */
  readonly enabled: boolean;
  /** 验证级别 */
  readonly level: 'strict' | 'normal' | 'lenient';
  /** 最大错误数 */
  readonly maxErrors?: number;
  /** 最大警告数 */
  readonly maxWarnings?: number;
  /** 是否快速失败 */
  readonly failFast?: boolean;
  /** 自定义规则 */
  readonly customRules?: ValidationRule[];
  /** 规则覆盖配置 */
  readonly ruleOverrides?: Record<string, {
    enabled?: boolean;
    severity?: ValidationSeverity;
    config?: Record<string, any>;
  }>;
  /** 验证器选项 */
  readonly validatorOptions?: Record<string, any>;
}

/**
 * 验证器接口
 */
export interface IValidator {
  /**
   * 验证图
   */
  validate(graphId: ID, graphData: any, config?: ValidationConfig): Promise<ValidationResult>;

  /**
   * 验证节点
   */
  validateNode(graphId: ID, nodeId: ID, nodeData: any, config?: ValidationConfig): Promise<ValidationResult>;

  /**
   * 验证边
   */
  validateEdge(graphId: ID, edgeId: ID, edgeData: any, config?: ValidationConfig): Promise<ValidationResult>;

  /**
   * 批量验证
   */
  validateBatch(requests: Array<{
    graphId: ID;
    graphData: any;
    config?: ValidationConfig;
  }>): Promise<ValidationResult[]>;

  /**
   * 添加验证规则
   */
  addRule(rule: ValidationRule): void;

  /**
   * 移除验证规则
   */
  removeRule(ruleId: string): boolean;

  /**
   * 获取验证规则
   */
  getRule(ruleId: string): ValidationRule | undefined;

  /**
   * 获取所有验证规则
   */
  getAllRules(): ValidationRule[];

  /**
   * 启用/禁用验证规则
   */
  enableRule(ruleId: string, enabled: boolean): boolean;

  /**
   * 更新验证规则配置
   */
  updateRuleConfig(ruleId: string, config: Record<string, any>): boolean;

  /**
   * 获取验证统计信息
   */
  getValidationStatistics(): Promise<ValidationStatistics>;
}

/**
 * 验证错误构建器
 */
export class ValidationErrorBuilder {
  private id: string;
  private type: ValidationErrorType;
  private severity: ValidationSeverity;
  private message: string;
  private description?: string;
  private graphId?: ID;
  private nodeId?: ID;
  private edgeId?: ID;
  private location?: {
    filePath?: string;
    line?: number;
    column?: number;
  };
  private context?: Record<string, any>;
  private suggestions?: string[];
  private code?: string;
  private metadata: Record<string, any>;

  constructor(
    type: ValidationErrorType,
    severity: ValidationSeverity,
    message: string
  ) {
    this.id = this.generateId();
    this.type = type;
    this.severity = severity;
    this.message = message;
    this.metadata = {};
  }

  withDescription(description: string): ValidationErrorBuilder {
    this.description = description;
    return this;
  }

  withGraphId(graphId: ID): ValidationErrorBuilder {
    this.graphId = graphId;
    return this;
  }

  withNodeId(nodeId: ID): ValidationErrorBuilder {
    this.nodeId = nodeId;
    return this;
  }

  withEdgeId(edgeId: ID): ValidationErrorBuilder {
    this.edgeId = edgeId;
    return this;
  }

  withLocation(location: {
    filePath?: string;
    line?: number;
    column?: number;
  }): ValidationErrorBuilder {
    this.location = location;
    return this;
  }

  withContext(context: Record<string, any>): ValidationErrorBuilder {
    this.context = { ...this.context, ...context };
    return this;
  }

  withSuggestions(suggestions: string[]): ValidationErrorBuilder {
    this.suggestions = suggestions;
    return this;
  }

  withCode(code: string): ValidationErrorBuilder {
    this.code = code;
    return this;
  }

  withMetadata(metadata: Record<string, any>): ValidationErrorBuilder {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  build(): ValidationError {
    return {
      id: this.id,
      type: this.type,
      severity: this.severity,
      message: this.message,
      description: this.description,
      graphId: this.graphId,
      nodeId: this.nodeId,
      edgeId: this.edgeId,
      location: this.location,
      context: this.context,
      suggestions: this.suggestions,
      code: this.code,
      timestamp: new Date(),
      metadata: this.metadata
    };
  }

  private generateId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 验证结果构建器
 */
export class ValidationResultBuilder {
  private errors: ValidationError[] = [];
  private validationTime: Date = new Date();
  private duration: number = 0;
  private metadata: Record<string, any> = {};

  addError(error: ValidationError): ValidationResultBuilder {
    this.errors.push(error);
    return this;
  }

  addErrors(errors: ValidationError[]): ValidationResultBuilder {
    this.errors.push(...errors);
    return this;
  }

  withValidationTime(validationTime: Date): ValidationResultBuilder {
    this.validationTime = validationTime;
    return this;
  }

  withDuration(duration: number): ValidationResultBuilder {
    this.duration = duration;
    return this;
  }

  withMetadata(metadata: Record<string, any>): ValidationResultBuilder {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  build(): ValidationResult {
    const statistics = this.calculateStatistics();
    
    return {
      valid: this.errors.filter(e => e.severity === ValidationSeverity.ERROR || e.severity === ValidationSeverity.CRITICAL).length === 0,
      errors: this.errors,
      statistics,
      validationTime: this.validationTime,
      duration: this.duration,
      metadata: this.metadata
    };
  }

  private calculateStatistics(): ValidationStatistics {
    const errorsBySeverity: Record<ValidationSeverity, number> = {} as any;
    const errorsByType: Record<ValidationErrorType, number> = {} as any;
    const errorsByGraph: Record<string, number> = {};
    const errorsByNode: Record<string, number> = {};
    const errorsByEdge: Record<string, number> = {};

    // 初始化计数器
    for (const severity of Object.values(ValidationSeverity)) {
      errorsBySeverity[severity] = 0;
    }
    for (const type of Object.values(ValidationErrorType)) {
      errorsByType[type] = 0;
    }

    // 统计错误
    for (const error of this.errors) {
      errorsBySeverity[error.severity]++;
      errorsByType[error.type]++;
      
      if (error.graphId) {
        const graphIdStr = error.graphId.toString();
        errorsByGraph[graphIdStr] = (errorsByGraph[graphIdStr] || 0) + 1;
      }
      
      if (error.nodeId) {
        const nodeIdStr = error.nodeId.toString();
        errorsByNode[nodeIdStr] = (errorsByNode[nodeIdStr] || 0) + 1;
      }
      
      if (error.edgeId) {
        const edgeIdStr = error.edgeId.toString();
        errorsByEdge[edgeIdStr] = (errorsByEdge[edgeIdStr] || 0) + 1;
      }
    }

    return {
      totalErrors: this.errors.length,
      errorsBySeverity,
      errorsByType,
      errorsByGraph,
      errorsByNode,
      errorsByEdge
    };
  }
}

/**
 * 验证工具类
 */
export class ValidationUtils {
  /**
   * 创建验证错误
   */
  static createError(
    type: ValidationErrorType,
    severity: ValidationSeverity,
    message: string
  ): ValidationErrorBuilder {
    return new ValidationErrorBuilder(type, severity, message);
  }

  /**
   * 创建结构错误
   */
  static createStructureError(
    message: string,
    severity: ValidationSeverity = ValidationSeverity.ERROR
  ): ValidationErrorBuilder {
    return this.createError(ValidationErrorType.STRUCTURE, severity, message);
  }

  /**
   * 创建语义错误
   */
  static createSemanticError(
    message: string,
    severity: ValidationSeverity = ValidationSeverity.ERROR
  ): ValidationErrorBuilder {
    return this.createError(ValidationErrorType.SEMANTIC, severity, message);
  }

  /**
   * 创建类型错误
   */
  static createTypeError(
    message: string,
    severity: ValidationSeverity = ValidationSeverity.ERROR
  ): ValidationErrorBuilder {
    return this.createError(ValidationErrorType.TYPE, severity, message);
  }

  /**
   * 创建引用错误
   */
  static createReferenceError(
    message: string,
    severity: ValidationSeverity = ValidationSeverity.ERROR
  ): ValidationErrorBuilder {
    return this.createError(ValidationErrorType.REFERENCE, severity, message);
  }

  /**
   * 创建配置错误
   */
  static createConfigurationError(
    message: string,
    severity: ValidationSeverity = ValidationSeverity.ERROR
  ): ValidationErrorBuilder {
    return this.createError(ValidationErrorType.CONFIGURATION, severity, message);
  }

  /**
   * 创建依赖错误
   */
  static createDependencyError(
    message: string,
    severity: ValidationSeverity = ValidationSeverity.ERROR
  ): ValidationErrorBuilder {
    return this.createError(ValidationErrorType.DEPENDENCY, severity, message);
  }

  /**
   * 创建循环错误
   */
  static createCycleError(
    message: string,
    severity: ValidationSeverity = ValidationSeverity.ERROR
  ): ValidationErrorBuilder {
    return this.createError(ValidationErrorType.CYCLE, severity, message);
  }

  /**
   * 创建性能问题
   */
  static createPerformanceIssue(
    message: string,
    severity: ValidationSeverity = ValidationSeverity.WARNING
  ): ValidationErrorBuilder {
    return this.createError(ValidationErrorType.PERFORMANCE, severity, message);
  }

  /**
   * 创建安全问题
   */
  static createSecurityIssue(
    message: string,
    severity: ValidationSeverity = ValidationSeverity.WARNING
  ): ValidationErrorBuilder {
    return this.createError(ValidationErrorType.SECURITY, severity, message);
  }

  /**
   * 创建验证结果
   */
  static createResult(): ValidationResultBuilder {
    return new ValidationResultBuilder();
  }

  /**
   * 创建成功验证结果
   */
  static createSuccessResult(): ValidationResult {
    return this.createResult().build();
  }

  /**
   * 创建失败验证结果
   */
  static createFailureResult(errors: ValidationError[]): ValidationResult {
    return this.createResult().addErrors(errors).build();
  }

  /**
   * 合并验证结果
   */
  static mergeResults(results: ValidationResult[]): ValidationResult {
    const allErrors: ValidationError[] = [];
    let totalDuration = 0;
    const mergedMetadata: Record<string, any> = {};

    for (const result of results) {
      allErrors.push(...result.errors);
      totalDuration += result.duration;
      Object.assign(mergedMetadata, result.metadata);
    }

    return this.createResult()
      .addErrors(allErrors)
      .withDuration(totalDuration)
      .withMetadata(mergedMetadata)
      .build();
  }

  /**
   * 过滤验证错误
   */
  static filterErrors(
    errors: ValidationError[],
    filter: (error: ValidationError) => boolean
  ): ValidationError[] {
    return errors.filter(filter);
  }

  /**
   * 按严重程度过滤验证错误
   */
  static filterErrorsBySeverity(
    errors: ValidationError[],
    severity: ValidationSeverity
  ): ValidationError[] {
    return this.filterErrors(errors, error => error.severity === severity);
  }

  /**
   * 按类型过滤验证错误
   */
  static filterErrorsByType(
    errors: ValidationError[],
    type: ValidationErrorType
  ): ValidationError[] {
    return this.filterErrors(errors, error => error.type === type);
  }

  /**
   * 按图ID过滤验证错误
   */
  static filterErrorsByGraph(
    errors: ValidationError[],
    graphId: ID
  ): ValidationError[] {
    return this.filterErrors(errors, error => error.graphId === graphId);
  }

  /**
   * 按节点ID过滤验证错误
   */
  static filterErrorsByNode(
    errors: ValidationError[],
    nodeId: ID
  ): ValidationError[] {
    return this.filterErrors(errors, error => error.nodeId === nodeId);
  }

  /**
   * 按边ID过滤验证错误
   */
  static filterErrorsByEdge(
    errors: ValidationError[],
    edgeId: ID
  ): ValidationError[] {
    return this.filterErrors(errors, error => error.edgeId === edgeId);
  }

  /**
   * 获取验证错误的摘要
   */
  static getErrorSummary(error: ValidationError): string {
    const parts = [
      `[${error.severity.toUpperCase()}]`,
      error.type,
      error.message
    ];

    if (error.nodeId) {
      parts.push(`(node: ${error.nodeId.toString()})`);
    }

    if (error.edgeId) {
      parts.push(`(edge: ${error.edgeId.toString()})`);
    }

    return parts.join(' ');
  }

  /**
   * 获取验证结果的摘要
   */
  static getResultSummary(result: ValidationResult): string {
    const errorCount = result.errors.filter(e => 
      e.severity === ValidationSeverity.ERROR || e.severity === ValidationSeverity.CRITICAL
    ).length;
    
    const warningCount = result.errors.filter(e => 
      e.severity === ValidationSeverity.WARNING
    ).length;
    
    const infoCount = result.errors.filter(e => 
      e.severity === ValidationSeverity.INFO
    ).length;

    const parts = [];
    
    if (result.valid) {
      parts.push('验证通过');
    } else {
      parts.push('验证失败');
    }

    if (errorCount > 0) {
      parts.push(`${errorCount}个错误`);
    }

    if (warningCount > 0) {
      parts.push(`${warningCount}个警告`);
    }

    if (infoCount > 0) {
      parts.push(`${infoCount}个信息`);
    }

    parts.push(`(耗时: ${result.duration}ms)`);

    return parts.join(', ');
  }

  /**
   * 检查验证结果是否有效
   */
  static isValid(result: ValidationResult): boolean {
    return result.valid;
  }

  /**
   * 检查验证结果是否有错误
   */
  static hasErrors(result: ValidationResult): boolean {
    return result.errors.some(e => 
      e.severity === ValidationSeverity.ERROR || e.severity === ValidationSeverity.CRITICAL
    );
  }

  /**
   * 检查验证结果是否有警告
   */
  static hasWarnings(result: ValidationResult): boolean {
    return result.errors.some(e => e.severity === ValidationSeverity.WARNING);
  }

  /**
   * 获取验证错误的严重程度
   */
  static getErrorSeverity(error: ValidationError): ValidationSeverity {
    return error.severity;
  }

  /**
   * 比较验证错误的严重程度
   */
  static compareErrorSeverity(severity1: ValidationSeverity, severity2: ValidationSeverity): number {
    const severityOrder = {
      [ValidationSeverity.INFO]: 0,
      [ValidationSeverity.WARNING]: 1,
      [ValidationSeverity.ERROR]: 2,
      [ValidationSeverity.CRITICAL]: 3
    };
    
    return severityOrder[severity1] - severityOrder[severity2];
  }

  /**
   * 排序验证错误
   */
  static sortErrors(
    errors: ValidationError[],
    sortBy: 'severity' | 'type' | 'timestamp' = 'severity',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): ValidationError[] {
    return [...errors].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'severity':
          comparison = this.compareErrorSeverity(a.severity, b.severity);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'timestamp':
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }
}