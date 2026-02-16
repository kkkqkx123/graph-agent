/**
 * 执行节点配置类型定义
 * 包含 CODE、LLM、TOOL 节点配置
 */

import type { ID } from '../../common';
import { CodeRiskLevel } from '../../code-security';

/**
 * 代码节点配置
 */
export interface CodeNodeConfig {
  /** 脚本名称 */
  scriptName: string;
  /** 脚本语言(shell/cmd/powershell/python/javascript) */
  scriptType: 'shell' | 'cmd' | 'powershell' | 'python' | 'javascript';
  /** 风险等级【应用层中会实现不同的执行策略，例如none不检查，high在沙箱运行】 */
  risk: CodeRiskLevel;
  /** 是否为内联代码 */
  inline?: boolean;
}

/**
 * LLM节点配置
 */
export interface LLMNodeConfig {
  /** 引用的LLM Profile ID */
  profileId: ID;
  /** 提示词 */
  prompt?: string;
  /** 可选的参数覆盖（覆盖Profile中的parameters） */
  parameters?: Record<string, any>;
  /** 单次LLM调用最多返回的工具调用数（默认3，超出时抛出错误） */
  maxToolCallsPerRequest?: number;
}

/**
 * 工具添加节点配置
 */
export interface AddToolNodeConfig {
  /** 要添加的工具ID或名称列表 */
  toolIds: string[];
  /** 工具描述模板（可选，用于动态生成工具描述） */
  descriptionTemplate?: string;
  /** 工具作用域（可选，默认为THREAD） */
  scope?: 'THREAD' | 'WORKFLOW' | 'GLOBAL';
  /** 是否覆盖已存在的工具（默认false） */
  overwrite?: boolean;
  /** 工具元数据（可选） */
  metadata?: Record<string, any>;
}
