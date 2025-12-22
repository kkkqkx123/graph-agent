/**
 * SessionDefinition仓储基础设施实现
 */

import { injectable } from 'inversify';
import { SessionDefinitionRepository } from '../../../domain/sessions/interfaces/session-definition-repository.interface';
import { SessionDefinition } from '../../../domain/sessions/entities/session-definition';
import { ID } from '../../../domain/common/value-objects/id';

/**
 * SessionDefinition仓储基础设施实现
 */
@injectable()
export class SessionDefinitionInfrastructureRepository implements SessionDefinitionRepository {
  private readonly sessionDefinitions: Map<string, SessionDefinition> = new Map();

  async save(sessionDefinition: SessionDefinition): Promise<void> {
    this.sessionDefinitions.set(sessionDefinition.id.toString(), sessionDefinition);
  }

  async findById(id: ID): Promise<SessionDefinition | null> {
    return this.sessionDefinitions.get(id.toString()) || null;
  }

  async findByUserId(userId: ID): Promise<SessionDefinition[]> {
    const result: SessionDefinition[] = [];
    for (const sessionDefinition of this.sessionDefinitions.values()) {
      if (sessionDefinition.userId && sessionDefinition.userId.toString() === userId.toString()) {
        result.push(sessionDefinition);
      }
    }
    return result;
  }

  async delete(id: ID): Promise<void> {
    this.sessionDefinitions.delete(id.toString());
  }

  async update(sessionDefinition: SessionDefinition): Promise<void> {
    if (this.sessionDefinitions.has(sessionDefinition.id.toString())) {
      this.sessionDefinitions.set(sessionDefinition.id.toString(), sessionDefinition);
    } else {
      throw new Error(`SessionDefinition不存在: ${sessionDefinition.id.toString()}`);
    }
  }


  async findActive(): Promise<SessionDefinition[]> {
    const result: SessionDefinition[] = [];
    // 由于SessionDefinition没有status属性，我们返回所有会话定义
    // 在实际实现中，可能需要根据其他逻辑判断活跃状态
    for (const sessionDefinition of this.sessionDefinitions.values()) {
      result.push(sessionDefinition);
    }
    return result;
  }

  async exists(id: ID): Promise<boolean> {
    return this.sessionDefinitions.has(id.toString());
  }
}