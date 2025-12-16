/**
 * 线程DTO映射器
 * 
 * 负责线程领域对象到DTO的转换
 */

import { Thread } from '../../../../domain/thread/entities/thread';
import { BaseDtoMapper } from '../../../common/base-dto-mapper';
import { ThreadInfo } from '../../dtos';

/**
 * 线程DTO映射器
 */
export class ThreadDtoMapper extends BaseDtoMapper {
  /**
   * 将线程领域对象映射为线程信息DTO
   * @param thread 线程领域对象
   * @returns 线程信息DTO
   */
  mapToThreadInfo(thread: Thread): ThreadInfo {
    return {
      threadId: this.mapIdToString(thread.threadId)!,
      sessionId: this.mapIdToString(thread.sessionId)!,
      workflowId: this.mapIdToString(thread.workflowId),
      status: this.mapToString(thread.status),
      priority: this.mapToNumber(thread.priority),
      title: thread.title,
      description: thread.description,
      createdAt: this.mapDateToIsoStringRequired(thread.createdAt.getDate()),
      startedAt: this.mapDateToIsoString(thread.startedAt?.getDate()),
      completedAt: this.mapDateToIsoString(thread.completedAt?.getDate()),
      errorMessage: thread.errorMessage
    };
  }

  /**
   * 批量映射线程领域对象为线程信息DTO列表
   * @param threads 线程领域对象列表
   * @returns 线程信息DTO列表
   */
  mapToThreadInfoList(threads: Thread[]): ThreadInfo[] {
    return this.mapArray(threads, thread => this.mapToThreadInfo(thread));
  }
}