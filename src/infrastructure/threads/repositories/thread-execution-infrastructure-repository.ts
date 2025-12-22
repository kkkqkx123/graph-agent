/**
 * ThreadExecution仓储基础设施实现
 */

import { injectable } from 'inversify';
import { ThreadExecutionRepository } from '../../../domain/threads/interfaces/thread-execution-repository.interface';
import { ThreadExecution } from '../../../domain/threads/entities/thread-execution';
import { ID } from '../../../domain/common/value-objects/id';
import { ThreadStatus } from '../../../domain/threads/value-objects/thread-status';

/**
 * ThreadExecution仓储基础设施实现
 */
@injectable()
export class ThreadExecutionInfrastructureRepository implements ThreadExecutionRepository {
  private readonly threadExecutions: Map<string, ThreadExecution> = new Map();

  async save(threadExecution: ThreadExecution): Promise<void> {
    this.threadExecutions.set(threadExecution.executionId.toString(), threadExecution);
  }

  async findById(id: ID): Promise<ThreadExecution | null> {
    return this.threadExecutions.get(id.toString()) || null;
  }

  async findByThreadDefinitionId(threadDefinitionId: ID): Promise<ThreadExecution | null> {
    for (const threadExecution of this.threadExecutions.values()) {
      if (threadExecution.threadDefinitionId.toString() === threadDefinitionId.toString()) {
        return threadExecution;
      }
    }
    return null;
  }

  async findByStatus(status: string): Promise<ThreadExecution[]> {
    const result: ThreadExecution[] = [];
    const threadStatus = ThreadStatus.fromString(status);
    for (const threadExecution of this.threadExecutions.values()) {
      if (threadExecution.status.equals(threadStatus)) {
        result.push(threadExecution);
      }
    }
    return result;
  }

  async findActive(): Promise<ThreadExecution[]> {
    const result: ThreadExecution[] = [];
    for (const threadExecution of this.threadExecutions.values()) {
      if (threadExecution.status.isActive()) {
        result.push(threadExecution);
      }
    }
    return result;
  }

  async delete(id: ID): Promise<void> {
    this.threadExecutions.delete(id.toString());
  }

  async update(threadExecution: ThreadExecution): Promise<void> {
    if (this.threadExecutions.has(threadExecution.executionId.toString())) {
      this.threadExecutions.set(threadExecution.executionId.toString(), threadExecution);
    } else {
      throw new Error(`ThreadExecution不存在: ${threadExecution.executionId.toString()}`);
    }
  }

  async exists(id: ID): Promise<boolean> {
    return this.threadExecutions.has(id.toString());
  }
}