/**
 * DTO模块统一导出
 */

// 基础DTO类
export { BaseDto, BaseDtoWithOptions, DtoValidationError } from './base-dto';
export type { DtoValidationOptions } from './base-dto';

// DTO转换器
export { 
  DtoConverter, 
  GenericDtoConverter, 
  DtoConverterFactory,
  type DtoConverterOptions,
  type ConversionResult
} from './dto-converter';

// 版本化DTO
export { 
  VersionedBaseDto, 
  VersionedDtoManager, 
  globalVersionedDtoManager,
  type VersionedDto,
  type VersionMigration,
  type VersionMigrationFunction
} from './versioned-dto';