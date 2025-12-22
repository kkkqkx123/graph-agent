/**
 * 检查点类型类型转换器
 * 将字符串类型转换为CheckpointType值对象
 */
import { TypeConverter } from './type-converter-base';
import { CheckpointType } from '../../../domain/checkpoint/value-objects/checkpoint-type';

export interface CheckpointTypeConverter extends TypeConverter<string, CheckpointType> {
  fromStorage: (value: string) => CheckpointType;
  toStorage: (value: CheckpointType) => string;
  validateStorage: (value: string) => boolean;
  validateDomain: (value: CheckpointType) => boolean;
}

export const CheckpointTypeConverter: CheckpointTypeConverter = {
  fromStorage: (value: string) => {
    return CheckpointType.fromString(value);
  },
  toStorage: (value: CheckpointType) => value.getValue(),
  validateStorage: (value: string) => {
    const validTypes = ['auto', 'manual', 'error', 'milestone'];
    return typeof value === 'string' && validTypes.includes(value);
  },
  validateDomain: (value: CheckpointType) => {
    return value instanceof CheckpointType;
  }
};