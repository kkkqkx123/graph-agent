/**
 * 工作流状态类型转换器
 * 将字符串状态转换为WorkflowStatus值对象
 */
import { TypeConverter } from './type-converter-base';
import { WorkflowStatus } from '../../../domain/workflow/value-objects/workflow-status';

export interface WorkflowStatusConverter extends TypeConverter<string, WorkflowStatus> {
  fromStorage: (value: string) => WorkflowStatus;
  toStorage: (value: WorkflowStatus) => string;
  validateStorage: (value: string) => boolean;
  validateDomain: (value: WorkflowStatus) => boolean;
}

export const WorkflowStatusConverter: WorkflowStatusConverter = {
  fromStorage: (value: string) => {
    return WorkflowStatus.fromString(value);
  },
  toStorage: (value: WorkflowStatus) => value.getValue(),
  validateStorage: (value: string) => {
    const validStates = ['draft', 'active', 'inactive', 'archived'];
    return typeof value === 'string' && validStates.includes(value);
  },
  validateDomain: (value: WorkflowStatus) => {
    return value instanceof WorkflowStatus;
  }
};