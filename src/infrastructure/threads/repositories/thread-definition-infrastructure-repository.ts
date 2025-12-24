/**
 * ThreadDefinition仓储基础设施实现
 */

import { injectable } from 'inversify';
import { ThreadDefinitionRepository } from '../../../domain/threads/interfaces/thread-definition-repository.interface';
import { ThreadDefinition } from '../../../domain/threads/value-objects/thread-definition';
import { ID } from '../../../domain/common/value-objects/id';

/**
 * ThreadDefinition仓储基础设施实现
 */
@injectable()
export class ThreadDefinitionInfrastructureRepository implements ThreadDefinitionRepository {
  private readonly threadDefinitions: Map<string, ThreadDefinition> = new Map();

  async save(threadDefinition: ThreadDefinition): Promise<void> {
    this.threadDefinitions.set(threadDefinition.id.toString(), threadDefinition);
  }

  async findById(id: ID): Promise<ThreadDefinition | null> {
    return this.threadDefinitions.get(id.toString()) || null;
  }

  async findBySessionId(sessionId: ID): Promise<ThreadDefinition[]> {
    const result: ThreadDefinition[] = [];
    for (const threadDefinition of this.threadDefinitions.values()) {
      if (threadDefinition.sessionId.toString() === sessionId.toString()) {
        result.push(threadDefinition);
      }
    }
    return result;
  }

  async findByWorkflowId(workflowId: ID): Promise<ThreadDefinition[]> {
    const result: ThreadDefinition[] = [];
    for (const threadDefinition of this.threadDefinitions.values()) {
      if (threadDefinition.workflowId && threadDefinition.workflowId.toString() === workflowId.toString()) {
        result.push(threadDefinition);
      }
    }
    return result;
  }

  async delete(id: ID): Promise<void> {
    this.threadDefinitions.delete(id.toString());
  }

  async update(threadDefinition: ThreadDefinition): Promise<void> {
    if (this.threadDefinitions.has(threadDefinition.id.toString())) {
      this.threadDefinitions.set(threadDefinition.id.toString(), threadDefinition);
    } else {
      throw new Error(`ThreadDefinition不存在: ${threadDefinition.id.toString()}`);
    }
  }

  async exists(id: ID): Promise<boolean> {
    return this.threadDefinitions.has(id.toString());
  }
}