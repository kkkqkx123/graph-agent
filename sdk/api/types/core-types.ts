/**
 * 核心API类型定义
 * 定义核心执行相关的类型
 */

import type { UserInteractionHandler } from '@modular-agent/types';
import type { ThreadOptions, SDKOptions, SDKDependencies } from '@modular-agent/types';
import type { ExecutionContext } from '../../core/execution/context/execution-context';

// 重新导出类型供API层使用
export type { ThreadOptions, SDKOptions, SDKDependencies };