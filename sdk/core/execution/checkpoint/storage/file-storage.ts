/**
 * FileStorage - 文件系统存储实现
 * 用于持久化保存检查点
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Checkpoint } from '../../../../types/checkpoint';
import type { CheckpointStorage, CheckpointFilter } from './storage-interface';

/**
 * 文件存储实现
 */
export class FileStorage implements CheckpointStorage {
  private basePath: string;

  /**
   * 构造函数
   * @param basePath 基础存储路径
   */
  constructor(basePath: string = './checkpoints') {
    this.basePath = basePath;
  }

  /**
   * 初始化存储目录
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * 获取检查点文件路径
   */
  private getCheckpointPath(checkpointId: string, workflowId?: string, threadId?: string): string {
    if (workflowId && threadId) {
      // 按工作流和线程分层组织
      return path.join(this.basePath, workflowId, threadId, `${checkpointId}.json`);
    }
    return path.join(this.basePath, `${checkpointId}.json`);
  }

  /**
   * 保存检查点
   */
  async save(checkpoint: Checkpoint): Promise<void> {
    const filePath = this.getCheckpointPath(checkpoint.id, checkpoint.workflowId, checkpoint.threadId);
    const dirPath = path.dirname(filePath);

    // 确保目录存在
    await this.ensureDirectory(dirPath);

    // 序列化并保存
    const data = JSON.stringify(checkpoint, null, 2);
    await fs.writeFile(filePath, data, 'utf-8');
  }

  /**
   * 加载检查点
   */
  async load(checkpointId: string): Promise<Checkpoint | null> {
    // 尝试在基础目录查找
    const basePath = path.join(this.basePath, `${checkpointId}.json`);
    
    try {
      const data = await fs.readFile(basePath, 'utf-8');
      return JSON.parse(data) as Checkpoint;
    } catch {
      // 如果基础目录找不到，尝试递归查找
      return this.findCheckpointRecursively(checkpointId, this.basePath);
    }
  }

  /**
   * 递归查找检查点文件
   */
  private async findCheckpointRecursively(checkpointId: string, dirPath: string): Promise<Checkpoint | null> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // 递归搜索子目录
          const result = await this.findCheckpointRecursively(checkpointId, fullPath);
          if (result) {
            return result;
          }
        } else if (entry.name === `${checkpointId}.json`) {
          // 找到目标文件
          const data = await fs.readFile(fullPath, 'utf-8');
          return JSON.parse(data) as Checkpoint;
        }
      }
    } catch {
      // 忽略错误，继续查找
    }

    return null;
  }

  /**
   * 查询检查点
   */
  async list(filter?: CheckpointFilter): Promise<Checkpoint[]> {
    const results: Checkpoint[] = [];

    try {
      await this.collectCheckpointsRecursively(this.basePath, results, filter);
    } catch {
      // 忽略错误，返回空数组
    }

    // 按时间戳降序排序
    results.sort((a, b) => b.timestamp - a.timestamp);

    return results;
  }

  /**
   * 递归收集检查点
   */
  private async collectCheckpointsRecursively(
    dirPath: string,
    results: Checkpoint[],
    filter?: CheckpointFilter
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // 递归处理子目录
          await this.collectCheckpointsRecursively(fullPath, results, filter);
        } else if (entry.name.endsWith('.json')) {
          // 读取检查点文件
          try {
            const data = await fs.readFile(fullPath, 'utf-8');
            const checkpoint = JSON.parse(data) as Checkpoint;

            // 应用过滤条件
            if (this.matchesFilter(checkpoint, filter)) {
              results.push(checkpoint);
            }
          } catch {
            // 忽略无效文件
          }
        }
      }
    } catch {
      // 忽略错误
    }
  }

  /**
   * 检查检查点是否匹配过滤条件
   */
  private matchesFilter(checkpoint: Checkpoint, filter?: CheckpointFilter): boolean {
    if (!filter) {
      return true;
    }

    if (filter.threadId && checkpoint.threadId !== filter.threadId) {
      return false;
    }

    if (filter.workflowId && checkpoint.workflowId !== filter.workflowId) {
      return false;
    }

    if (filter.tags && filter.tags.length > 0) {
      const checkpointTags = checkpoint.metadata?.tags || [];
      if (!filter.tags.some(tag => checkpointTags.includes(tag))) {
        return false;
      }
    }

    if (filter.startTime !== undefined && checkpoint.timestamp < filter.startTime) {
      return false;
    }

    if (filter.endTime !== undefined && checkpoint.timestamp > filter.endTime) {
      return false;
    }

    return true;
  }

  /**
   * 删除检查点
   */
  async delete(checkpointId: string): Promise<void> {
    const checkpoint = await this.load(checkpointId);
    if (!checkpoint) {
      return;
    }

    const filePath = this.getCheckpointPath(checkpoint.id, checkpoint.workflowId, checkpoint.threadId);
    
    try {
      await fs.unlink(filePath);
    } catch {
      // 忽略错误
    }
  }

  /**
   * 检查检查点是否存在
   */
  async exists(checkpointId: string): Promise<boolean> {
    const checkpoint = await this.load(checkpointId);
    return checkpoint !== null;
  }

  /**
   * 清空所有检查点
   */
  async clear(): Promise<void> {
    try {
      await fs.rm(this.basePath, { recursive: true, force: true });
      await this.ensureDirectory(this.basePath);
    } catch {
      // 忽略错误
    }
  }
}