/**
 * 图领域模块入口
 *
 * 包含图相关的所有领域组件：
 * - Graph实体和值对象
 * - Node和Edge实体
 * - 图执行相关服务
 * - 图仓储接口
 * - 扩展系统（钩子、插件、触发器）
 * - 状态管理系统
 * - 编译和验证系统
 * - 执行上下文系统
 * - 领域事件
 */

// 导出实体
export * from './entities';

// 导出值对象
export * from './value-objects';

// 导出服务
export * from './services';

// 导出仓储
export * from './repositories';

// 导出扩展系统
export * from './extensions';

// 导出状态管理
export {
  StateValue,
  StateValueBuilder,
  StateValueUtils,
  StateValueType,
  StateKey,
  StateQuery,
  StateStoreResult,
  IStateStore,
  StateStoreStatistics,
  StateSnapshot,
  ImportOptions,
  StateChangeEvent,
  StateChangeCallback,
  StateKeyUtils,
  StateQueryUtils,
  IStateManager,
  MergeOptions,
  CopyOptions,
  StateValidator,
  StateRepairer,
  RepairResult,
  DefaultStateManager,
  StateUtils
} from './state';
export { ValidationResult as StateValidationResult } from './state';

// 导出编译和验证
export {
  ValidationSeverity,
  ValidationErrorType,
  ValidationError,
  ValidationStatistics,
  ValidationRule,
  ValidationContext,
  ValidationConfig,
  IValidator,
  ValidationErrorBuilder,
  ValidationResultBuilder,
  ValidationUtils,
  CompilationPhase,
  CompilationTarget,
  CompilationOptions,
  CompilationResult,
  CompilationOutput,
  CompilationStatistics,
  CompilationContext,
  CompilationLog,
  CompilationError,
  CompilationWarning,
  CompilationPlugin,
  IGraphCompiler,
  ICompilerFactory,
  CompilationOptionsBuilder,
  CompilationUtils,
  GraphStructureRule,
  NodeReferenceRule,
  CycleDetectionRule,
  NodeTypeRule,
  EdgeTypeRule,
  IsolatedNodeRule,
  DegreeValidationRule,
  ConfigurationCompletenessRule,
  PerformanceRule,
  getPredefinedValidationRules,
  getPredefinedValidationRulesByType,
  getPredefinedValidationRulesBySeverity
} from './validation';
export { ValidationResult as ValidationValidationResult } from './validation';

// 导出执行上下文
export {
  ExecutionStatus,
  ExecutionPriority,
  ExecutionContext,
  ExecutionConfig,
  ExecutionLog,
  ExecutionError,
  NodeExecutionContext,
  EdgeExecutionContext,
  ExecutionContextBuilder,
  NodeExecutionContextBuilder,
  EdgeExecutionContextBuilder,
  ExecutionContextUtils,
  IExecutionContextManager,
  ContextChangeEvent,
  ContextChangeCallback,
  MemoryExecutionContextManager
} from './execution';
export { ExecutionStatistics as ExecutionContextStatistics } from './execution';
export { ExecutionMode as ExecutionContextMode } from './execution';

// 导出事件
export * from './events';