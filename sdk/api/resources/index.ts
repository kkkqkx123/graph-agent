/**
 * Resources Index - 资源管理API统一导出
 * 提供所有资源管理API的统一访问入口
 */

// 通用资源API基类
import { GenericResourceAPI } from './generic-resource-api';

// 检查点资源管理
import { CheckpointResourceAPI } from './checkpoints/checkpoint-resource-api';

// 消息资源管理
import {
  MessageResourceAPI,
  type MessageFilter,
  type MessageStats
} from './messages/message-resource-api';

// 变量资源管理
import {
  VariableResourceAPI,
  type VariableFilter,
  type VariableDefinition
} from './variables/variable-resource-api';

// 触发器资源管理
import { TriggerResourceAPI } from './triggers/trigger-resource-api';

// 事件资源管理
import {
  EventResourceAPI,
  type EventStats
} from './events/event-resource-api';

// 工作流资源管理
import { WorkflowRegistryAPI } from './workflows/workflow-registry-api';

// 线程资源管理
import { ThreadRegistryAPI } from './threads/thread-registry-api';

// 工具资源管理
import { ToolRegistryAPI } from './tools/tool-registry-api';

// 脚本资源管理
import { ScriptRegistryAPI } from './scripts/script-registry-api';

// 节点模板资源管理
import { NodeRegistryAPI } from './templates/node-template-registry-api';

// 触发器模板资源管理
import { TriggerTemplateRegistryAPI } from './templates/trigger-template-registry-api';

// Profile资源管理
import { LLMProfileRegistryAPI } from './llm/llm-profile-registry-api';

// 用户交互资源管理
import { UserInteractionResourceAPI, type UserInteractionConfig, type UserInteractionFilter } from './user-interaction/user-interaction-resource-api';

// Human Relay资源管理
import { HumanRelayResourceAPI, type HumanRelayConfig, type HumanRelayFilter } from './human-relay/human-relay-resource-api';

// 配置依赖接口
import type { APIDependencies } from '../core/api-dependencies';

// 重新导出所有资源管理API
export { GenericResourceAPI };
export { CheckpointResourceAPI };
export { MessageResourceAPI, type MessageFilter, type MessageStats };
export { VariableResourceAPI, type VariableFilter, type VariableDefinition };
export { TriggerResourceAPI };
export { EventResourceAPI, type EventStats };
export { WorkflowRegistryAPI };
export { ThreadRegistryAPI };
export { ToolRegistryAPI };
export { ScriptRegistryAPI };
export { NodeRegistryAPI };
export { TriggerTemplateRegistryAPI };
export { LLMProfileRegistryAPI };
export { UserInteractionResourceAPI, type UserInteractionConfig, type UserInteractionFilter };
export { HumanRelayResourceAPI, type HumanRelayConfig, type HumanRelayFilter };

/**
 * 创建所有资源管理API实例的工厂函数
 */
export function createResourceAPIs(dependencies: APIDependencies) {
  return {
    checkpoints: new CheckpointResourceAPI(),
    messages: new MessageResourceAPI(),
    variables: new VariableResourceAPI(),
    triggers: new TriggerResourceAPI(),
    events: new EventResourceAPI(),
    workflows: new WorkflowRegistryAPI(dependencies),
    threads: new ThreadRegistryAPI(dependencies),
    tools: new ToolRegistryAPI(dependencies),
    scripts: new ScriptRegistryAPI(dependencies),
    nodeTemplates: new NodeRegistryAPI(dependencies),
    triggerTemplates: new TriggerTemplateRegistryAPI(dependencies),
    profiles: new LLMProfileRegistryAPI(dependencies),
    userInteractions: new UserInteractionResourceAPI(dependencies),
    humanRelay: new HumanRelayResourceAPI(dependencies)
  };
}

/**
 * 资源管理API类型定义
 */
export type ResourceAPIs = ReturnType<typeof createResourceAPIs>;