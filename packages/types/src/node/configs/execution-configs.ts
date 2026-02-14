/**
 * 执行节点配置类型定义
 * 包含 CODE、LLM、TOOL 节点配置
 */

import type { ID } from '../../common';

/**
 * 代码节点配置
 */
export interface CodeNodeConfig {
  /** 脚本名称 */
  scriptName: string;
  /** 脚本语言(shell/cmd/powershell/python/javascript) */
  scriptType: 'shell' | 'cmd' | 'powershell' | 'python' | 'javascript';
  /** 风险等级(none/low/medium/high)【应用层中会实现不同的执行策略，例如none不检查，high在沙箱运行】 */
  risk: 'none' | 'low' | 'medium' | 'high';
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
  /** 动态工具配置 */
  dynamicTools?: {
    /** 要动态添加的工具ID或名称 */
    toolIds: string[];
    /** 工具描述模板（可选） */
    descriptionTemplate?: string;
  };
}

/**
 * 工具节点配置
 */
export interface ToolNodeConfig {
  /** 工具ID或名称 */
  toolId: string;
  /** 工具参数 */
  parameters?: Record<string, any>;
}