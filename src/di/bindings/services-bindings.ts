/**
 * Services层服务绑定
 *
 * 绑定服务层的所有服务实现
 */

import { ContainerModule } from 'inversify';
import { TYPES } from '../service-keys';

// Services层服务实现
import { ThreadCopy } from '../../services/threads/thread-copy';
import { BuiltinExecutor } from '../../services/tools/executors/builtin-executor';
import { NativeExecutor } from '../../services/tools/executors/native-executor';
import { RestExecutor } from '../../services/tools/executors/rest-executor';
import { McpExecutor } from '../../services/tools/executors/mcp-executor';
import { ToolService } from '../../services/tools/tool-service';
import { ThreadExecution } from '../../services/threads/thread-execution';
import { ThreadFork } from '../../services/threads/thread-fork';
import { ThreadLifecycle } from '../../services/threads/thread-lifecycle';
import { ThreadMaintenance } from '../../services/threads/thread-maintenance';
import { ThreadManagement } from '../../services/threads/thread-management';
import { ThreadMonitoring } from '../../services/threads/thread-monitoring';
import { HumanRelay } from '../../services/llm/human-relay';
import { Wrapper } from '../../services/llm/wrapper';
import { SessionLifecycle } from '../../services/sessions/session-lifecycle';
import { SessionMaintenance } from '../../services/sessions/session-maintenance';
import { SessionManagement } from '../../services/sessions/session-management';
import { SessionMonitoring } from '../../services/sessions/session-monitoring';
import { SessionOrchestration } from '../../services/sessions/session-orchestration';
import { SessionResource } from '../../services/sessions/session-resource';
import { SessionCheckpointManagement } from '../../services/sessions/session-checkpoint-management';
import { StateHistory } from '../../services/state/state-history';
import { StateManagement } from '../../services/state/state-management';
import { StateRecovery } from '../../services/state/state-recovery';
import { ContextManagement } from '../../services/workflow/context-management';
import { FunctionManagement } from '../../services/workflow/function-management';
import { WorkflowLifecycle } from '../../services/workflow/workflow-lifecycle';
import { WorkflowManagement } from '../../services/workflow/workflow-management';
import { WorkflowValidator } from '../../services/workflow/workflow-validator';
import { ExpressionEvaluator } from '../../services/workflow/expression-evaluator';
import { FunctionExecutionEngine } from '../../services/threads/execution/function-execution-engine';
import { MonitoringService } from '../../services/workflow/monitoring';
import { NodeRouter } from '../../services/workflow/node-router';
import { CheckpointAnalysis } from '../../services/checkpoints/checkpoint-analysis';
import { CheckpointBackup } from '../../services/checkpoints/checkpoint-backup';
import { CheckpointCleanup } from '../../services/checkpoints/checkpoint-cleanup';
import { CheckpointCreation } from '../../services/checkpoints/checkpoint-creation';
import { CheckpointManagement } from '../../services/checkpoints/checkpoint-management';
import { CheckpointQuery } from '../../services/checkpoints/checkpoint-query';
import { CheckpointRestore } from '../../services/checkpoints/checkpoint-restore';
import { ThreadStateManager } from '../../services/threads/thread-state-manager';
import { ThreadHistoryManager } from '../../services/threads/thread-history-manager';
import { ThreadConditionalRouter } from '../../services/threads/thread-conditional-router';
import { ThreadWorkflowExecutor } from '../../services/threads/thread-workflow-executor';
import { FunctionRegistry } from '../../services/threads/execution/functions/function-registry';
import { MapTransformer } from '../../services/threads/execution/functions/nodes/data-transformer/map-transformer';
import { FilterTransformer } from '../../services/threads/execution/functions/nodes/data-transformer/filter-transformer';
import { ReduceTransformer } from '../../services/threads/execution/functions/nodes/data-transformer/reduce-transformer';
import { SortTransformer } from '../../services/threads/execution/functions/nodes/data-transformer/sort-transformer';
import { GroupTransformer } from '../../services/threads/execution/functions/nodes/data-transformer/group-transformer';
import { NodeExecutionHandler } from '../../services/threads/execution/handlers/node-execution-handler';
import { HookExecutionHandler } from '../../services/threads/execution/handlers/hook-execution-handler';
import { TriggerExecutionHandler } from '../../services/threads/execution/handlers/trigger-execution-handler';
import { InteractionEngine } from '../../services/interaction/interaction-engine';
import { LLMExecutor } from '../../services/interaction/executors/llm-executor';
import { ToolExecutor } from '../../services/interaction/executors/tool-executor';
import { UserInteractionHandler } from '../../services/interaction/executors/user-interaction-handler';
import { NodeExecutionStrategyRegistry } from '../../services/threads/execution/strategies/strategy-registry';
import { LLMNodeStrategy } from '../../services/threads/execution/strategies/llm-node-strategy';
import { ToolNodeStrategy } from '../../services/threads/execution/strategies/tool-node-strategy';
import { UserInteractionStrategy } from '../../services/threads/execution/strategies/user-interaction-strategy';
import { NodeType } from '../../domain/workflow/value-objects/node/node-type';
import { LLMWrapperManager } from '../../services/llm/managers/llm-wrapper-manager';
import { PollingPoolManager } from '../../services/llm/managers/pool-manager';
import { TaskGroupManager } from '../../services/llm/managers/task-group-manager';
import { PromptBuilder } from '../../services/prompts/prompt-builder';
import { TemplateProcessor } from '../../services/prompts/template-processor';
import { PromptReferenceParser } from '../../services/prompts/prompt-reference-parser';
import { PromptReferenceValidator } from '../../services/prompts/prompt-reference-validator';

/**
 * Services层绑定模块
 */
export const servicesBindings = new ContainerModule((bind: any) => {
  // ========== Services层服务绑定 ==========

  // 线程服务
  bind(TYPES.ThreadCopy).to(ThreadCopy).inSingletonScope();
  bind(TYPES.ThreadExecution).to(ThreadExecution).inSingletonScope();
  bind(TYPES.ThreadFork).to(ThreadFork).inSingletonScope();
  bind(TYPES.ThreadLifecycle).to(ThreadLifecycle).inSingletonScope();
  bind(TYPES.ThreadMaintenance).to(ThreadMaintenance).inSingletonScope();
  bind(TYPES.ThreadManagement).to(ThreadManagement).inSingletonScope();
  bind(TYPES.ThreadMonitoring).to(ThreadMonitoring).inSingletonScope();
  bind(TYPES.ThreadStateManager).to(ThreadStateManager).inSingletonScope();
  bind(TYPES.ThreadHistoryManager).to(ThreadHistoryManager).inSingletonScope();
  bind(TYPES.ThreadConditionalRouter).to(ThreadConditionalRouter).inSingletonScope();
  bind(TYPES.ThreadWorkflowExecutor).to(ThreadWorkflowExecutor).inSingletonScope();

  // LLM服务
  bind(TYPES.HumanRelay).to(HumanRelay).inSingletonScope();
  bind(TYPES.Wrapper).to(Wrapper).inSingletonScope();
  bind(TYPES.LLMWrapperManager).to(LLMWrapperManager).inSingletonScope();
  bind(TYPES.PollingPoolManager).to(PollingPoolManager).inSingletonScope();
  bind(TYPES.TaskGroupManager).to(TaskGroupManager).inSingletonScope();

  // 会话服务
  bind(TYPES.SessionLifecycle).to(SessionLifecycle).inSingletonScope();
  bind(TYPES.SessionMaintenance).to(SessionMaintenance).inSingletonScope();
  bind(TYPES.SessionManagement).to(SessionManagement).inSingletonScope();
  bind(TYPES.SessionMonitoring).to(SessionMonitoring).inSingletonScope();
  bind(TYPES.SessionOrchestration).to(SessionOrchestration).inSingletonScope();
  bind(TYPES.SessionResource).to(SessionResource).inSingletonScope();
  bind(TYPES.SessionCheckpointManagement).to(SessionCheckpointManagement).inSingletonScope();

  // 状态服务
  bind(TYPES.StateHistory).toDynamicValue((context: any) => {
    return new StateHistory(context.container.get(TYPES.Logger));
  }).inSingletonScope();
  bind(TYPES.StateManagement).to(StateManagement).inSingletonScope();
  bind(TYPES.StateRecovery).toDynamicValue((context: any) => {
    return new StateRecovery(
      context.container.get(TYPES.CheckpointRepository),
      context.container.get(TYPES.Logger)
    );
  }).inSingletonScope();

  // 工作流服务
  bind(TYPES.ContextManagement).to(ContextManagement).inSingletonScope();
  bind(TYPES.FunctionManagement).to(FunctionManagement).inSingletonScope();
  bind(TYPES.WorkflowLifecycle).to(WorkflowLifecycle).inSingletonScope();
  bind(TYPES.WorkflowManagement).to(WorkflowManagement).inSingletonScope();
  bind(TYPES.WorkflowValidator).to(WorkflowValidator).inSingletonScope();
  bind(TYPES.ExpressionEvaluator).to(ExpressionEvaluator).inSingletonScope();
  bind(TYPES.FunctionExecutionEngine).to(FunctionExecutionEngine).inSingletonScope();
  bind(TYPES.MonitoringService).to(MonitoringService).inSingletonScope();
  bind(TYPES.NodeRouter).to(NodeRouter).inSingletonScope();

  // 检查点服务
  bind(TYPES.CheckpointAnalysis).to(CheckpointAnalysis).inSingletonScope();
  bind(TYPES.CheckpointBackup).to(CheckpointBackup).inSingletonScope();
  bind(TYPES.CheckpointCleanup).to(CheckpointCleanup).inSingletonScope();
  bind(TYPES.CheckpointCreation).to(CheckpointCreation).inSingletonScope();
  bind(TYPES.CheckpointManagement).to(CheckpointManagement).inSingletonScope();
  bind(TYPES.CheckpointQuery).to(CheckpointQuery).inSingletonScope();
  bind(TYPES.CheckpointRestore).to(CheckpointRestore).inSingletonScope();

  // Prompt服务
  bind(TYPES.PromptBuilder).to(PromptBuilder).inSingletonScope();
  bind(TYPES.TemplateProcessor).to(TemplateProcessor).inSingletonScope();
  bind(TYPES.PromptReferenceParser).to(PromptReferenceParser).inSingletonScope();
  bind(TYPES.PromptReferenceValidator).to(PromptReferenceValidator).inSingletonScope();

  // ========== 函数注册表绑定 ==========

  // 创建并配置 FunctionRegistry 单例
  bind(TYPES.FunctionRegistry)
    .toDynamicValue((context: any) => {
      const functionRegistry = new FunctionRegistry();

      // 注册内置的转换函数
      functionRegistry.registerSingleton(new MapTransformer());
      functionRegistry.registerSingleton(new FilterTransformer());
      functionRegistry.registerSingleton(new ReduceTransformer());
      functionRegistry.registerSingleton(new SortTransformer());
      functionRegistry.registerSingleton(new GroupTransformer());

      return functionRegistry;
    })
    .inSingletonScope();

  // ========== 执行处理器绑定 ==========

  bind(TYPES.NodeExecutor).to(NodeExecutionHandler).inSingletonScope();
  bind(TYPES.HookExecutor).to(HookExecutionHandler).inSingletonScope();

  // ========== Tools 模块绑定 ==========

  // Tool Executors
  bind('BuiltinExecutor').to(BuiltinExecutor).inSingletonScope();
  bind('NativeExecutor').to(NativeExecutor).inSingletonScope();
  bind('RestExecutor').to(RestExecutor).inSingletonScope();
  bind('McpExecutor').to(McpExecutor).inSingletonScope();

  // Tool Service
  bind('ToolService').to(ToolService).inSingletonScope();

  // ========== Interaction 模块绑定 ==========

  // Interaction Engine
  bind('InteractionEngine').to(InteractionEngine).inSingletonScope();

  // Executors
  bind('LLMExecutor').to(LLMExecutor).inSingletonScope();
  bind('ToolExecutor').to(ToolExecutor).inSingletonScope();
  bind('UserInteractionHandler').to(UserInteractionHandler).inSingletonScope();

  // Strategy Registry
  bind('NodeExecutionStrategyRegistry').to(NodeExecutionStrategyRegistry).inSingletonScope();

  // Node Execution Strategies
  bind('LLMNodeStrategy').to(LLMNodeStrategy).inSingletonScope();
  bind('ToolNodeStrategy').to(ToolNodeStrategy).inSingletonScope();
  bind('UserInteractionStrategy').to(UserInteractionStrategy).inSingletonScope();

  // 注册策略到注册表
  bind('NodeExecutionStrategyRegistryInitializer').toDynamicValue((context: any) => {
    const strategyRegistry = context.container.get('NodeExecutionStrategyRegistry');
    const llmStrategy = context.container.get('LLMNodeStrategy');
    const toolStrategy = context.container.get('ToolNodeStrategy');
    const userInteractionStrategy = context.container.get('UserInteractionStrategy');

    strategyRegistry.register(NodeType.llm(), llmStrategy);
    strategyRegistry.register(NodeType.tool(), toolStrategy);
    strategyRegistry.register(NodeType.userInteraction(), userInteractionStrategy);

    return strategyRegistry;
  }).inSingletonScope();
});