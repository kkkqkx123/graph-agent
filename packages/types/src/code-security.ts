/**
 * 代码安全相关类型定义
 * 定义代码执行风险管理的类型系统
 */

/**
 * 代码风险等级枚举
 */
export enum CodeRiskLevel {
  /** 无风险 - 不进行任何安全检查 */
  NONE = 'none',
  /** 低风险 - 基础路径检查 */
  LOW = 'low',
  /** 中风险 - 危险命令检查 */
  MEDIUM = 'medium',
  /** 高风险 - 记录警告日志，应用层应实现沙箱执行等额外安全措施 */
  HIGH = 'high'
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean;
  /** 错误消息（如果验证失败） */
  message?: string;
  /** 额外信息 */
  metadata?: Record<string, any>;
}

/**
 * 安全检查结果
 */
export interface SecurityCheckResult {
  /** 是否安全 */
  secure: boolean;
  /** 违规项列表 */
  violations: SecurityViolation[];
  /** 建议 */
  recommendations?: string[];
}

/**
 * 安全违规
 */
export interface SecurityViolation {
  /** 违规类型 */
  type: 'risk_level' | 'forbidden_command' | 'forbidden_path' | 'size_exceeded' | 'blacklisted';
  /** 错误消息 */
  message: string;
  /** 严重程度 */
  severity: 'error' | 'warning';
  /** 详细信息 */
  details?: Record<string, any>;
}

/**
 * 代码安全策略
 */
export interface CodeSecurityPolicy {
  /** 允许的风险等级 */
  allowedRiskLevels: CodeRiskLevel[];
  /** 脚本白名单 */
  whitelist?: string[];
  /** 脚本黑名单 */
  blacklist?: string[];
  /** 禁止的命令 */
  forbiddenCommands?: string[];
  /** 禁止的路径模式 */
  forbiddenPathPatterns?: RegExp[];
  /** 最大脚本大小（字节） */
  maxScriptSize?: number;
  /** 是否允许动态脚本 */
  allowDynamicScripts?: boolean;
}

/**
 * 审计事件
 */
export interface AuditEvent {
  /** 事件类型 */
  eventType: string;
  /** 时间戳 */
  timestamp: Date;
  /** 线程ID */
  threadId: string;
  /** 节点ID */
  nodeId: string;
  /** 节点名称 */
  nodeName?: string;
  /** 节点类型 */
  nodeType?: string;
  /** 用户ID */
  userId?: string;
  /** 脚本名称 */
  scriptName?: string;
  /** 风险等级 */
  riskLevel?: CodeRiskLevel;
  /** 额外数据 */
  data?: Record<string, any>;
}