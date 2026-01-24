/**
 * Interaction 模块依赖注入配置
 */

import { Container } from 'inversify';
import { IInteractionEngine, InteractionEngine } from '../services/interaction/interaction-engine-impl';
import { ILLMExecutor, LLMExecutor } from '../services/interaction/executors/llm-executor';
import { IToolExecutor, ToolExecutor } from '../services/interaction/executors/tool-executor';
import { IUserInteractionHandler, UserInteractionHandler } from '../services/interaction/executors/user-interaction-handler';
import { NodeExecutionStrategyRegistry } from '../services/workflow/execution/strategies/strategy-registry';
import { LLMNodeStrategy } from '../services/workflow/execution/strategies/llm-node-strategy';
import { ToolNodeStrategy } from '../services/workflow/execution/strategies/tool-node-strategy';
import { UserInteractionStrategy } from '../services/workflow/execution/strategies/user-interaction-strategy';
import { NodeType } from '../domain/workflow/value-objects/node/node-type';

/**
 * 配置 Interaction 模块的依赖注入
 * @param container 依赖注入容器
 */
export function configureInteractionDI(container: Container): void {
  // Interaction Engine
  container.bind<IInteractionEngine>('InteractionEngine').to(InteractionEngine).inSingletonScope();

  // Executors
  container.bind<ILLMExecutor>('LLMExecutor').to(LLMExecutor).inSingletonScope();
  container.bind<IToolExecutor>('ToolExecutor').to(ToolExecutor).inSingletonScope();
  container.bind<IUserInteractionHandler>('UserInteractionHandler').to(UserInteractionHandler).inSingletonScope();

  // Strategy Registry
  container.bind<NodeExecutionStrategyRegistry>('NodeExecutionStrategyRegistry').to(NodeExecutionStrategyRegistry).inSingletonScope();

  // Node Execution Strategies
  container.bind<LLMNodeStrategy>('LLMNodeStrategy').to(LLMNodeStrategy).inSingletonScope();
  container.bind<ToolNodeStrategy>('ToolNodeStrategy').to(ToolNodeStrategy).inSingletonScope();
  container.bind<UserInteractionStrategy>('UserInteractionStrategy').to(UserInteractionStrategy).inSingletonScope();

  // 注册策略到注册表
  const strategyRegistry = container.get<NodeExecutionStrategyRegistry>('NodeExecutionStrategyRegistry');
  const llmStrategy = container.get<LLMNodeStrategy>('LLMNodeStrategy');
  const toolStrategy = container.get<ToolNodeStrategy>('ToolNodeStrategy');
  const userInteractionStrategy = container.get<UserInteractionStrategy>('UserInteractionStrategy');

  strategyRegistry.register(NodeType.llm(), llmStrategy);
  strategyRegistry.register(NodeType.tool(), toolStrategy);
  strategyRegistry.register(NodeType.userInteraction(), userInteractionStrategy);
}