/**
 * 基础仓储模块统一导出
 * 
 * 该文件统一导出所有基础仓储相关的模块，提供统一的导入接口
 */

// 核心基础仓储类
export * from './base-repository';

// 各个功能模块（避免重复导出类型）
export { RepositoryErrorHandler, ErrorType, ErrorContext, EnhancedRepositoryError } from './repository-error-handler';
export { QueryBuilderHelper } from './query-builder-helper';
export { SoftDeleteManager, SoftDeleteConfig } from './soft-delete-manager';
export { TransactionManager } from './transaction-manager';
export { BatchOperationManager } from './batch-operation-manager';
export { QueryConditionsApplier } from './query-conditions-applier';
export { RepositoryConfig, DefaultRepositoryConfig } from './repository-config';
export { QueryOptionsBuilder, QueryBuilderOptions, QueryCondition, QueryTemplateFactory } from './query-options-builder';
export { QueryTemplate, TemplateComposition, QueryTemplateManager, QueryTemplateRegistrar, CommonQueryTemplates } from './query-template-manager';
export { TypeConverter, IdConverter, OptionalIdConverter, TimestampConverter, VersionConverter, StringConverter, OptionalStringConverter, NumberConverter, BooleanConverter, MetadataConverter, ValueObjectConverterFactory } from './type-converter-base';