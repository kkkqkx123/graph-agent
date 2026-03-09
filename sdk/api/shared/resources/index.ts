/**
 * Resources Index - 资源管理API统一导出
 * 提供所有资源管理API的统一访问入口
 */

// 通用资源API基类
import { GenericResourceAPI } from './generic-resource-api.js';

// 检查点资源管理
import { CheckpointResourceAPI } from '../../graph/resources/checkpoints/checkpoint-resource-api.js';

// 消息资源管理
import {
  MessageResourceAPI,
  type MessageFilter,
  type MessageStats
} from '../../graph/resources/messages/message-resource-api.js';

// 变量资源管理
import {
  VariableResourceAPI,
  type VariableFilter,
  type VariableDefinition
} from '../../graph/resources/variables/variable-resource-api.js';

// 触发器资源管理
import { TriggerResourceAPI } from '../../graph/resources/triggers/trigger-resource-api.js';

// 事件资源管理
import {
  EventResourceAPI,
  type EventStats
} from '../../graph/resources/events/event-resource-api.js';

// 工作流资源管理
import { WorkflowRegistryAPI } from '../../graph/resources/workflows/workflow-registry-api.js';

// 线程资源管理
import { ThreadRegistryAPI } from '../../graph/resources/threads/thread-registry-api.js';

// 工具资源管理
import { ToolRegistryAPI } from './tools/tool-registry-api.js';

// 脚本资源管理
import { ScriptRegistryAPI } from './scripts/script-registry-api.js';

// 节点模板资源管理
import { NodeRegistryAPI } from '../../graph/resources/templates/node-template-registry-api.js';

// 触发器模板资源管理
import { TriggerTemplateRegistryAPI } from '../../graph/resources/templates/trigger-template-registry-api.js';

// Profile资源管理
import { LLMProfileRegistryAPI } from './llm/llm-profile-registry-api.js';

// 用户交互资源管理
import { UserInteractionResourceAPI, type UserInteractionConfig, type UserInteractionFilter } from '../../graph/resources/user-interaction/user-interaction-resource-api.js';

// Human Relay资源管理
import { HumanRelayResourceAPI, type HumanRelayConfig, type HumanRelayFilter } from '../../graph/resources/human-relay/human-relay-resource-api.js';

// 依赖管理
import type { APIDependencyManager } from '../core/sdk-dependencies.js';

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
export function createResourceAPIs(dependencies: APIDependencyManager) {
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
