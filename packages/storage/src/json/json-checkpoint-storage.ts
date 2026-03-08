/**
 * JSON 文件检查点存储实现
 * 基于 JSON 文件系统的检查点持久化存储
 */

import type { CheckpointStorageMetadata, CheckpointListOptions } from '@modular-agent/types';
import type { CheckpointStorageCallback } from '../types/callback/index.js';
import { BaseJsonStorage, BaseJsonStorageConfig } from './base-json-storage.js';

/**
 * JSON 文件检查点存储
 * 实现 CheckpointStorageCallback 接口
 */
export class JsonCheckpointStorage extends BaseJsonStorage<CheckpointStorageMetadata> implements CheckpointStorageCallback {
  constructor(config: BaseJsonStorageConfig) {
    super(config);
  }

  /**
   * 列出检查点ID
   */
  async list(options?: CheckpointListOptions): Promise<string[]> {
    this.ensureInitialized();

    let ids = this.getAllIds();

    // 应用过滤
    if (options) {
      ids = ids.filter(id => {
        const entry = this['metadataIndex'].get(id);
        if (!entry) return false;

        const metadata = entry.metadata;

        if (options.threadId && metadata.threadId !== options.threadId) {
          return false;
        }

        if (options.workflowId && metadata.workflowId !== options.workflowId) {
          return false;
        }

        if (options.tags && options.tags.length > 0) {
          if (!metadata.tags || !options.tags.some(tag => metadata.tags!.includes(tag))) {
            return false;
          }
        }

        return true;
      });
    }

    // 按时间戳降序排列
    ids.sort((a, b) => {
      const metaA = this['metadataIndex'].get(a)?.metadata;
      const metaB = this['metadataIndex'].get(b)?.metadata;
      return (metaB?.timestamp ?? 0) - (metaA?.timestamp ?? 0);
    });

    // 分页
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? ids.length;

    return ids.slice(offset, offset + limit);
  }
}
