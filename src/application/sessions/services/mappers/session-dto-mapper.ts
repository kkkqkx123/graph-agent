/**
 * 会话DTO映射器
 * 
 * 负责会话领域对象到DTO的转换
 */

import { Session } from '../../../../domain/session/entities/session';
import { BaseDtoMapper } from '../../../common/base-dto-mapper';
import { SessionInfo } from '../session-lifecycle-service';

/**
 * 会话DTO映射器
 */
export class SessionDtoMapper extends BaseDtoMapper {
  /**
   * 将会话领域对象映射为会话信息DTO
   * @param session 会话领域对象
   * @returns 会话信息DTO
   */
  mapToSessionInfo(session: Session): SessionInfo {
    return {
      sessionId: this.mapIdToString(session.sessionId)!,
      userId: this.mapIdToString(session.userId),
      title: session.title,
      status: this.mapToString(session.status),
      messageCount: session.messageCount,
      createdAt: this.mapDateToIsoStringRequired(session.createdAt.getDate()),
      lastActivityAt: this.mapDateToIsoStringRequired(session.lastActivityAt.getDate())
    };
  }

  /**
   * 批量映射会话领域对象为会话信息DTO列表
   * @param sessions 会话领域对象列表
   * @returns 会话信息DTO列表
   */
  mapToSessionInfoList(sessions: Session[]): SessionInfo[] {
    return this.mapArray(sessions, session => this.mapToSessionInfo(session));
  }
}