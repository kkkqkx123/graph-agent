/**
 * 历史类型类型转换器
 * 将字符串类型转换为HistoryType值对象
 */
import { TypeConverter } from './type-converter-base';
import { HistoryType } from '../../../domain/history/value-objects/history-type';

export interface HistoryTypeConverter extends TypeConverter<string, HistoryType> {
  fromStorage: (value: string) => HistoryType;
  toStorage: (value: HistoryType) => string;
  validateStorage: (value: string) => boolean;
  validateDomain: (value: HistoryType) => boolean;
}

export const HistoryTypeConverter: HistoryTypeConverter = {
  fromStorage: (value: string) => {
    return HistoryType.fromString(value);
  },
  toStorage: (value: HistoryType) => value.getValue(),
  validateStorage: (value: string) => {
    // 定义有效的历史类型值
    const validTypes = [
      'workflow_created',
      'workflow_updated',
      'workflow_deleted',
      'workflow_executed',
      'workflow_failed',
      'workflow_completed',
      'session_created',
      'session_updated',
      'session_deleted',
      'session_closed',
      'thread_created',
      'thread_updated',
      'thread_deleted',
      'thread_started',
      'thread_paused',
      'thread_resumed',
      'thread_completed',
      'thread_failed',
      'thread_cancelled',
      'checkpoint_created',
      'checkpoint_updated',
      'checkpoint_deleted',
      'checkpoint_restored',
      'node_executed',
      'node_failed',
      'edge_traversed',
      'tool_executed',
      'tool_failed',
      'llm_called',
      'llm_failed',
      'state_changed',
      'error_occurred',
      'warning_occurred',
      'info_occurred'
    ];
    return typeof value === 'string' && validTypes.includes(value);
  },
  validateDomain: (value: HistoryType) => {
    return value instanceof HistoryType;
  }
};