/**
 * 审计服务接口
 * 应用层可实现自定义的审计日志逻辑
 */

import type { AuditEvent } from '@modular-agent/types';

/**
 * 审计服务接口
 */
export interface AuditService {
  /**
   * 记录审计事件
   * @param event 审计事件
   */
  log(event: AuditEvent): Promise<void>;
}