/**
 * SessionActivity仓储基础设施实现
 */

import { injectable } from 'inversify';
import { SessionActivityRepository } from '../../../domain/sessions/interfaces/session-activity-repository.interface';
import { SessionActivity } from '../../../domain/sessions/entities/session-activity';
import { ID } from '../../../domain/common/value-objects/id';

/**
 * SessionActivity仓储基础设施实现
 */
@injectable()
export class SessionActivityInfrastructureRepository implements SessionActivityRepository {
  private readonly sessionActivities: Map<string, SessionActivity> = new Map();

  async save(sessionActivity: SessionActivity): Promise<void> {
    this.sessionActivities.set(sessionActivity.activityId.toString(), sessionActivity);
  }

  async findById(id: ID): Promise<SessionActivity | null> {
    return this.sessionActivities.get(id.toString()) || null;
  }

  async findBySessionDefinitionId(sessionDefinitionId: ID): Promise<SessionActivity | null> {
    for (const activity of this.sessionActivities.values()) {
      if (activity.sessionDefinitionId.toString() === sessionDefinitionId.toString()) {
        return activity;
      }
    }
    return null;
  }

  async delete(id: ID): Promise<void> {
    this.sessionActivities.delete(id.toString());
  }

  async update(sessionActivity: SessionActivity): Promise<void> {
    if (this.sessionActivities.has(sessionActivity.activityId.toString())) {
      this.sessionActivities.set(sessionActivity.activityId.toString(), sessionActivity);
    } else {
      throw new Error(`SessionActivity不存在: ${sessionActivity.activityId.toString()}`);
    }
  }

  async exists(id: ID): Promise<boolean> {
    return this.sessionActivities.has(id.toString());
  }

  async incrementMessageCount(sessionDefinitionId: ID): Promise<void> {
    const activity = await this.findBySessionDefinitionId(sessionDefinitionId);
    if (activity) {
      activity.incrementMessageCount();
      await this.update(activity);
    }
  }

  async incrementThreadCount(sessionDefinitionId: ID): Promise<void> {
    const activity = await this.findBySessionDefinitionId(sessionDefinitionId);
    if (activity) {
      activity.incrementThreadCount();
      await this.update(activity);
    }
  }
}