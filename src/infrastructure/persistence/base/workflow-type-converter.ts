/**
 * 工作流类型类型转换器
 * 将字符串类型转换为WorkflowType值对象
 */
import { TypeConverter } from './type-converter-base';
import { WorkflowType } from '../../../domain/workflow/value-objects/workflow-type';

export interface WorkflowTypeConverter extends TypeConverter<string, WorkflowType> {
  fromStorage: (value: string) => WorkflowType;
  toStorage: (value: WorkflowType) => string;
  validateStorage: (value: string) => boolean;
  validateDomain: (value: WorkflowType) => boolean;
}

export const WorkflowTypeConverter: WorkflowTypeConverter = {
  fromStorage: (value: string) => {
    return WorkflowType.fromString(value);
  },
  toStorage: (value: WorkflowType) => value.getValue(),
  validateStorage: (value: string) => {
    const validTypes = ['sequential', 'parallel', 'conditional', 'loop', 'custom'];
    return typeof value === 'string' && validTypes.includes(value);
  },
  validateDomain: (value: WorkflowType) => {
    return value instanceof WorkflowType;
  }
};