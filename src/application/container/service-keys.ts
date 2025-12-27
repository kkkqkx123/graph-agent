/**
 * 应用层服务键常量定义
 * 
 * 统一管理应用层服务的键名，避免硬编码字符串
 */

/**
 * 应用层服务键
 */
export const APPLICATION_SERVICE_KEYS = {
  // 工作流服务
  WORKFLOW_ORCHESTRATION_SERVICE: 'WorkflowOrchestrationService',

  // 会话服务
  SESSION_ORCHESTRATION_SERVICE: 'SessionOrchestrationService',
  SESSION_RESOURCE_SERVICE: 'SessionResourceService',

  // 提示词服务
  PROMPT_SERVICE: 'PromptService',

  // 线程服务
  THREAD_LIFECYCLE_SERVICE: 'ThreadLifecycleService'
} as const;

/**
 * 应用层服务键类型
 */
export type ApplicationServiceKey = typeof APPLICATION_SERVICE_KEYS[keyof typeof APPLICATION_SERVICE_KEYS];