/**
 * 检查点存储回调接口定义
 * 定义检查点持久化操作的统一接口
 */

import type { CheckpointStorageMetadata, CheckpointStorageListOptions } from '@modular-agent/types';
import type { BaseStorageCallback } from './base-storage-callback.js';

/**
 * 检查点存储回调接口
 *
 * 定义检查点持久化操作的统一接口
 * - 继承自 BaseStorageCallback，提供标准 CRUD 操作
 * - packages/storage 提供了基于此接口的 CheckpointStorageAdapter 实现
 * - 应用层可以直接使用 CheckpointStorageAdapter，或自行实现此接口
 */
export interface CheckpointStorageCallback
  extends BaseStorageCallback<CheckpointStorageMetadata, CheckpointStorageListOptions> {
  // 检查点存储无特有方法，所有操作都通过 BaseStorageCallback 提供
}
