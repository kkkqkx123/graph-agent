/**
 * LLM DTO模块导出
 */

// 导出新的基于Zod的DTO
export * from './llm.dto';

// 为了向后兼容，保留旧的导出
export type {
  PoolDTO,
  InstanceDTO,
  PoolCreateDTO,
  PoolUpdateDTO,
  PoolHealthReportDTO,
  SystemPoolReportDTO,
  TaskGroupDTO,
  TaskGroupCreateDTO,
  TaskGroupUpdateDTO,
  TaskGroupHealthReportDTO,
  SystemTaskGroupReportDTO,
  OptimalTaskGroupSelectionDTO,
  ModelListDTO,
  EchelonPriorityDTO,
  GroupReferenceParseDTO,
  FallbackConfigDTO
} from './llm.dto';