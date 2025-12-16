import { ID } from '../../common/value-objects/id';
import { ValidationResult, ValidationConfig } from './validation-rules';

/**
 * 编译阶段枚举
 */
export enum CompilationPhase {
  /** 解析阶段 */
  PARSING = 'parsing',
  /** 验证阶段 */
  VALIDATION = 'validation',
  /** 优化阶段 */
  OPTIMIZATION = 'optimization',
  /** 代码生成阶段 */
  CODE_GENERATION = 'code_generation',
  /** 后处理阶段 */
  POST_PROCESSING = 'post_processing'
}

/**
 * 编译目标枚举
 */
export enum CompilationTarget {
  /** 内存执行 */
  MEMORY = 'memory',
  /** JavaScript */
  JAVASCRIPT = 'javascript',
  /** TypeScript */
  TYPESCRIPT = 'typescript',
  /** Python */
  PYTHON = 'python',
  /** JSON */
  JSON = 'json',
  /** 自定义 */
  CUSTOM = 'custom'
}

/**
 * 编译选项接口
 */
export interface CompilationOptions {
  /** 编译目标 */
  readonly target: CompilationTarget;
  /** 是否启用优化 */
  readonly optimize?: boolean;
  /** 是否生成源映射 */
  readonly sourceMap?: boolean;
  /** 是否启用调试信息 */
  readonly debug?: boolean;
  /** 输出目录 */
  readonly outputDir?: string;
  /** 自定义编译器插件 */
  readonly plugins?: CompilationPlugin[];
  /** 编译器配置 */
  readonly config?: Record<string, any>;
  /** 验证配置 */
  readonly validation?: ValidationConfig;
  /** 环境变量 */
  readonly environment?: Record<string, string>;
  /** 宏定义 */
  readonly macros?: Record<string, any>;
}

/**
 * 编译结果接口
 */
export interface CompilationResult {
  /** 是否成功 */
  readonly success: boolean;
  /** 编译输出 */
  readonly output: CompilationOutput;
  /** 验证结果 */
  readonly validation: ValidationResult;
  /** 编译统计信息 */
  readonly statistics: CompilationStatistics;
  /** 编译时间 */
  readonly compilationTime: Date;
  /** 编译持续时间（毫秒） */
  readonly duration: number;
  /** 编译元数据 */
  readonly metadata: Record<string, any>;
}

/**
 * 编译输出接口
 */
export interface CompilationOutput {
  /** 主要输出内容 */
  readonly content: string;
  /** 输出格式 */
  readonly format: string;
  /** 输出文件路径 */
  readonly filePath?: string;
  /** 源映射 */
  readonly sourceMap?: string;
  /** 依赖列表 */
  readonly dependencies: string[];
  /** 导出列表 */
  readonly exports: string[];
  /** 输出元数据 */
  readonly metadata: Record<string, any>;
}

/**
 * 编译统计信息接口
 */
export interface CompilationStatistics {
  /** 总处理节点数 */
  readonly totalNodes: number;
  /** 总处理边数 */
  readonly totalEdges: number;
  /** 按阶段分组的处理时间 */
  readonly phaseDurations: Record<CompilationPhase, number>;
  /** 优化统计 */
  readonly optimizationStats: {
    /** 优化前大小 */
    readonly sizeBefore: number;
    /** 优化后大小 */
    readonly sizeAfter: number;
    /** 压缩率 */
    readonly compressionRatio: number;
    /** 优化次数 */
    readonly optimizationPasses: number;
  };
  /** 内存使用统计 */
  readonly memoryStats: {
    /** 峰值内存使用（字节） */
    readonly peakMemoryUsage: number;
    /** 平均内存使用（字节） */
    readonly averageMemoryUsage: number;
  };
}

/**
 * 编译上下文接口
 */
export interface CompilationContext {
  /** 工作流ID */
  readonly workflowId: ID;
  /** 工作流数据 */
  readonly workflowData: any;
  /** 编译选项 */
  readonly options: CompilationOptions;
  /** 当前编译阶段 */
  readonly currentPhase: CompilationPhase;
  /** 编译状态 */
  readonly state: Map<string, any>;
  /** 编译日志 */
  readonly logs: CompilationLog[];
  /** 错误列表 */
  readonly errors: CompilationError[];
  /** 警告列表 */
  readonly warnings: CompilationWarning[];
}

/**
 * 编译日志接口
 */
export interface CompilationLog {
  /** 日志级别 */
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  /** 日志消息 */
  readonly message: string;
  /** 日志时间 */
  readonly timestamp: Date;
  /** 日志上下文 */
  readonly context?: Record<string, any>;
}

/**
 * 编译错误接口
 */
export interface CompilationError {
  /** 错误ID */
  readonly id: string;
  /** 错误消息 */
  readonly message: string;
  /** 错误阶段 */
  readonly phase: CompilationPhase;
  /** 错误位置 */
  readonly location?: {
    /** 文件路径 */
    readonly filePath?: string;
    /** 行号 */
    readonly line?: number;
    /** 列号 */
    readonly column?: number;
  };
  /** 错误堆栈 */
  readonly stack?: string;
  /** 错误时间 */
  readonly timestamp: Date;
  /** 错误元数据 */
  readonly metadata: Record<string, any>;
}

/**
 * 编译警告接口
 */
export interface CompilationWarning {
  /** 警告ID */
  readonly id: string;
  /** 警告消息 */
  readonly message: string;
  /** 警告阶段 */
  readonly phase: CompilationPhase;
  /** 警告位置 */
  readonly location?: {
    /** 文件路径 */
    readonly filePath?: string;
    /** 行号 */
    readonly line?: number;
    /** 列号 */
    readonly column?: number;
  };
  /** 警告时间 */
  readonly timestamp: Date;
  /** 警告元数据 */
  readonly metadata: Record<string, any>;
}

/**
 * 编译插件接口
 */
export interface CompilationPlugin {
  /** 插件名称 */
  readonly name: string;
  /** 插件版本 */
  readonly version: string;
  /** 插件描述 */
  readonly description?: string;
  /** 支持的编译目标 */
  readonly supportedTargets: CompilationTarget[];
  /** 插件配置 */
  readonly config: Record<string, any>;

  /**
   * 初始化插件
   */
  initialize(context: CompilationContext): Promise<void>;

  /**
   * 处理编译阶段
   */
  processPhase(context: CompilationContext, phase: CompilationPhase): Promise<void>;

  /**
   * 清理插件
   */
  cleanup(context: CompilationContext): Promise<void>;
}

/**
 * 工作流编译器接口
 */
export interface IWorkflowCompiler {
  /**
   * 编译工作流
   */
  compile(
    workflowId: ID,
    workflowData: any,
    options: CompilationOptions
  ): Promise<CompilationResult>;

  /**
   * 验证工作流
   */
  validate(
    workflowId: ID,
    workflowData: any,
    config?: ValidationConfig
  ): Promise<ValidationResult>;

  /**
   * 解析工作流
   */
  parse(
    workflowId: ID,
    source: string,
    format?: string
  ): Promise<any>;

  /**
   * 优化工作流
   */
  optimize(
    workflowId: ID,
    workflowData: any,
    options?: Record<string, any>
  ): Promise<any>;

  /**
   * 生成代码
   */
  generateCode(
    workflowId: ID,
    workflowData: any,
    target: CompilationTarget,
    options?: Record<string, any>
  ): Promise<string>;

  /**
   * 批量编译
   */
  compileBatch(requests: Array<{
    workflowId: ID;
    workflowData: any;
    options: CompilationOptions;
  }>): Promise<CompilationResult[]>;

  /**
   * 添加编译插件
   */
  addPlugin(plugin: CompilationPlugin): void;

  /**
   * 移除编译插件
   */
  removePlugin(pluginName: string): boolean;

  /**
   * 获取编译插件
   */
  getPlugin(pluginName: string): CompilationPlugin | undefined;

  /**
   * 获取所有编译插件
   */
  getAllPlugins(): CompilationPlugin[];

  /**
   * 获取支持的编译目标
   */
  getSupportedTargets(): CompilationTarget[];

  /**
   * 获取编译统计信息
   */
  getCompilationStatistics(): Promise<CompilationStatistics>;

  /**
   * 清理编译缓存
   */
  clearCache(): Promise<void>;

  /**
   * 预热编译器
   */
  warmup(): Promise<void>;
}

/**
 * 编译器工厂接口
 */
export interface ICompilerFactory {
  /**
   * 创建编译器
   */
  createCompiler(config?: Record<string, any>): IWorkflowCompiler;

  /**
   * 获取支持的编译目标
   */
  getSupportedTargets(): CompilationTarget[];

  /**
   * 注册编译器类型
   */
  registerCompilerType(
    target: CompilationTarget,
    compilerClass: new (config?: Record<string, any>) => IWorkflowCompiler
  ): void;

  /**
   * 创建特定目标的编译器
   */
  createCompilerForTarget(
    target: CompilationTarget,
    config?: Record<string, any>
  ): IWorkflowCompiler;
}

/**
 * 编译选项构建器
 */
export class CompilationOptionsBuilder {
  private target: CompilationTarget;
  private optimize: boolean = true;
  private sourceMap: boolean = false;
  private debug: boolean = false;
  private outputDir?: string;
  private plugins: CompilationPlugin[] = [];
  private config: Record<string, any> = {};
  private validation?: ValidationConfig;
  private environment: Record<string, string> = {};
  private macros: Record<string, any> = {};

  constructor(target: CompilationTarget) {
    this.target = target;
  }

  withOptimize(optimize: boolean): CompilationOptionsBuilder {
    this.optimize = optimize;
    return this;
  }

  withSourceMap(sourceMap: boolean): CompilationOptionsBuilder {
    this.sourceMap = sourceMap;
    return this;
  }

  withDebug(debug: boolean): CompilationOptionsBuilder {
    this.debug = debug;
    return this;
  }

  withOutputDir(outputDir: string): CompilationOptionsBuilder {
    this.outputDir = outputDir;
    return this;
  }

  withPlugins(plugins: CompilationPlugin[]): CompilationOptionsBuilder {
    this.plugins = plugins;
    return this;
  }

  withConfig(config: Record<string, any>): CompilationOptionsBuilder {
    this.config = { ...this.config, ...config };
    return this;
  }

  withValidation(validation: ValidationConfig): CompilationOptionsBuilder {
    this.validation = validation;
    return this;
  }

  withEnvironment(environment: Record<string, string>): CompilationOptionsBuilder {
    this.environment = { ...this.environment, ...environment };
    return this;
  }

  withMacros(macros: Record<string, any>): CompilationOptionsBuilder {
    this.macros = { ...this.macros, ...macros };
    return this;
  }

  build(): CompilationOptions {
    return {
      target: this.target,
      optimize: this.optimize,
      sourceMap: this.sourceMap,
      debug: this.debug,
      outputDir: this.outputDir,
      plugins: this.plugins,
      config: this.config,
      validation: this.validation,
      environment: this.environment,
      macros: this.macros
    };
  }
}

/**
 * 编译工具类
 */
export class CompilationUtils {
  /**
   * 创建编译选项
   */
  static createOptions(target: CompilationTarget): CompilationOptionsBuilder {
    return new CompilationOptionsBuilder(target);
  }

  /**
   * 创建内存编译选项
   */
  static createMemoryOptions(): CompilationOptionsBuilder {
    return this.createOptions(CompilationTarget.MEMORY);
  }

  /**
   * 创建JavaScript编译选项
   */
  static createJavaScriptOptions(): CompilationOptionsBuilder {
    return this.createOptions(CompilationTarget.JAVASCRIPT);
  }

  /**
   * 创建TypeScript编译选项
   */
  static createTypeScriptOptions(): CompilationOptionsBuilder {
    return this.createOptions(CompilationTarget.TYPESCRIPT);
  }

  /**
   * 创建Python编译选项
   */
  static createPythonOptions(): CompilationOptionsBuilder {
    return this.createOptions(CompilationTarget.PYTHON);
  }

  /**
   * 创建JSON编译选项
   */
  static createJsonOptions(): CompilationOptionsBuilder {
    return this.createOptions(CompilationTarget.JSON);
  }

  /**
   * 创建自定义编译选项
   */
  static createCustomOptions(): CompilationOptionsBuilder {
    return this.createOptions(CompilationTarget.CUSTOM);
  }

  /**
   * 创建开发编译选项
   */
  static createDevelopmentOptions(target: CompilationTarget): CompilationOptions {
    return this.createOptions(target)
      .withDebug(true)
      .withSourceMap(true)
      .withOptimize(false)
      .build();
  }

  /**
   * 创建生产编译选项
   */
  static createProductionOptions(target: CompilationTarget): CompilationOptions {
    return this.createOptions(target)
      .withDebug(false)
      .withSourceMap(false)
      .withOptimize(true)
      .build();
  }

  /**
   * 检查编译目标是否支持
   */
  static isTargetSupported(target: CompilationTarget, supportedTargets: CompilationTarget[]): boolean {
    return supportedTargets.includes(target);
  }

  /**
   * 获取编译目标的文件扩展名
   */
  static getTargetFileExtension(target: CompilationTarget): string {
    const extensions = {
      [CompilationTarget.MEMORY]: '',
      [CompilationTarget.JAVASCRIPT]: '.js',
      [CompilationTarget.TYPESCRIPT]: '.ts',
      [CompilationTarget.PYTHON]: '.py',
      [CompilationTarget.JSON]: '.json',
      [CompilationTarget.CUSTOM]: '.custom'
    };
    return extensions[target] || '';
  }

  /**
   * 获取编译目标的MIME类型
   */
  static getTargetMimeType(target: CompilationTarget): string {
    const mimeTypes = {
      [CompilationTarget.MEMORY]: 'application/octet-stream',
      [CompilationTarget.JAVASCRIPT]: 'application/javascript',
      [CompilationTarget.TYPESCRIPT]: 'application/typescript',
      [CompilationTarget.PYTHON]: 'text/x-python',
      [CompilationTarget.JSON]: 'application/json',
      [CompilationTarget.CUSTOM]: 'application/octet-stream'
    };
    return mimeTypes[target] || 'application/octet-stream';
  }

  /**
   * 格式化编译持续时间
   */
  static formatDuration(duration: number): string {
    if (duration < 1000) {
      return `${duration}ms`;
    } else if (duration < 60000) {
      return `${(duration / 1000).toFixed(2)}s`;
    } else {
      return `${(duration / 60000).toFixed(2)}m`;
    }
  }

  /**
   * 格式化编译统计信息
   */
  static formatStatistics(stats: CompilationStatistics): string {
    const parts = [
      `节点: ${stats.totalNodes}`,
      `边: ${stats.totalEdges}`,
      `优化: ${((stats.optimizationStats.sizeBefore - stats.optimizationStats.sizeAfter) / stats.optimizationStats.sizeBefore * 100).toFixed(1)}%`,
      `内存: ${(stats.memoryStats.peakMemoryUsage / 1024 / 1024).toFixed(1)}MB`
    ];
    return parts.join(', ');
  }

  /**
   * 计算编译性能指标
   */
  static calculatePerformanceMetrics(result: CompilationResult): {
    throughput: number; // 节点/秒
    efficiency: number; // 优化效率
    memoryEfficiency: number; // 内存效率
  } {
    const durationInSeconds = result.duration / 1000;
    const throughput = durationInSeconds > 0 ? result.statistics.totalNodes / durationInSeconds : 0;

    const optimizationEfficiency = result.statistics.optimizationStats.sizeBefore > 0 ?
      (result.statistics.optimizationStats.sizeBefore - result.statistics.optimizationStats.sizeAfter) /
      result.statistics.optimizationStats.sizeBefore : 0;

    const memoryEfficiency = result.statistics.totalNodes > 0 ?
      result.statistics.memoryStats.peakMemoryUsage / result.statistics.totalNodes : 0;

    return {
      throughput,
      efficiency: optimizationEfficiency,
      memoryEfficiency
    };
  }

  /**
   * 创建编译错误
   */
  static createCompilationError(
    message: string,
    phase: CompilationPhase,
    location?: {
      filePath?: string;
      line?: number;
      column?: number;
    }
  ): CompilationError {
    return {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      phase,
      location,
      timestamp: new Date(),
      metadata: {}
    };
  }

  /**
   * 创建编译警告
   */
  static createCompilationWarning(
    message: string,
    phase: CompilationPhase,
    location?: {
      filePath?: string;
      line?: number;
      column?: number;
    }
  ): CompilationWarning {
    return {
      id: `warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      phase,
      location,
      timestamp: new Date(),
      metadata: {}
    };
  }

  /**
   * 创建编译日志
   */
  static createCompilationLog(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: Record<string, any>
  ): CompilationLog {
    return {
      level,
      message,
      timestamp: new Date(),
      context
    };
  }
}