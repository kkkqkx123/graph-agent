/**
 * Infrastructure层服务绑定
 *
 * 绑定基础设施层的所有服务实现
 */

import { ContainerModule } from 'inversify';
import { TYPES } from '../service-keys';

// LLM模块服务
import { HttpClient } from '../../infrastructure/common/http/http-client';
import { ConfigLoadingModule } from '../../infrastructure/config/loading/config-loading-module';
import { TokenBucketLimiter } from '../../infrastructure/llm/rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../../infrastructure/llm/token-calculators/token-calculator';
import { OpenAIChatClient } from '../../infrastructure/llm/clients/openai-chat-client';
import { OpenAIResponseClient } from '../../infrastructure/llm/clients/openai-response-client';
import { AnthropicClient } from '../../infrastructure/llm/clients/anthropic-client';
import { GeminiClient } from '../../infrastructure/llm/clients/gemini-client';
import { GeminiOpenAIClient } from '../../infrastructure/llm/clients/gemini-openai-client';
import { MockClient } from '../../infrastructure/llm/clients/mock-client';
import { HumanRelayClient } from '../../infrastructure/llm/clients/human-relay-client';
import { LLMClientFactory } from '../../infrastructure/llm/clients/llm-client-factory';
import { PollingPoolManager } from '../../infrastructure/llm/managers/pool-manager';
import { TaskGroupManager } from '../../infrastructure/llm/managers/task-group-manager';
import { LLMWrapperManager } from '../../infrastructure/llm/managers/llm-wrapper-manager';

// 仓储实现
import { SessionRepository as SessionInfrastructureRepository } from '../../infrastructure/persistence/repositories/session-repository';
import { ThreadRepository as ThreadInfrastructureRepository } from '../../infrastructure/persistence/repositories/thread-repository';
import { WorkflowRepository as WorkflowInfrastructureRepository } from '../../infrastructure/persistence/repositories/workflow-repository';
import { PromptRepository as PromptInfrastructureRepository } from '../../infrastructure/persistence/repositories/prompt-repository';
import { ThreadCheckpointRepository as ThreadCheckpointInfrastructureRepository } from '../../infrastructure/persistence/repositories/thread-checkpoint-repository';
import { HistoryRepository as HistoryInfrastructureRepository } from '../../infrastructure/persistence/repositories/history-repository';

// 业务服务实现
import { GraphAlgorithmServiceImpl } from '../../infrastructure/workflow/services/graph-algorithm-service';
import { FunctionExecutionEngine } from '../../infrastructure/workflow/services/function-execution-engine';
import { MonitoringService } from '../../infrastructure/workflow/services/monitoring-service';
import { FunctionRegistry } from '../../infrastructure/workflow/functions/function-registry';
import { MapTransformFunction } from '../../infrastructure/workflow/functions/nodes/data-transformer/map-transform.function';
import { FilterTransformFunction } from '../../infrastructure/workflow/functions/nodes/data-transformer/filter-transform.function';
import { ReduceTransformFunction } from '../../infrastructure/workflow/functions/nodes/data-transformer/reduce-transform.function';
import { SortTransformFunction } from '../../infrastructure/workflow/functions/nodes/data-transformer/sort-transform.function';
import { GroupTransformFunction } from '../../infrastructure/workflow/functions/nodes/data-transformer/group-transform.function';

// 基础设施服务
import { ConnectionManager } from '../../infrastructure/persistence/connection-manager';
import { PromptBuilder } from '../../infrastructure/prompts/services/prompt-builder';
import { TemplateProcessor } from '../../infrastructure/prompts/services/template-processor';
import { PromptReferenceParser } from '../../infrastructure/prompts/services/prompt-reference-parser';
import { PromptReferenceValidator } from '../../infrastructure/prompts/services/prompt-reference-validator';
import { NodeExecutor } from '../../infrastructure/workflow/nodes/node-executor';
import { EdgeExecutor } from '../../infrastructure/workflow/edges/edge-executor';
import { NodeRouter } from '../../infrastructure/workflow/services/node-router';
import { WorkflowExecutionEngine } from '../../infrastructure/workflow/services/workflow-execution-engine';
import { HookExecutor } from '../../infrastructure/workflow/hooks/hook-executor';
import { HookFactory } from '../../infrastructure/workflow/hooks/hook-factory';
import { Logger } from '../../infrastructure/logging/logger';

/**
 * Infrastructure层绑定模块
 */
export const infrastructureBindings = new ContainerModule((bind: any) => {
  // ========== LLM模块服务绑定 ==========

  // 基础设施组件
  bind(TYPES.ConfigLoadingModule).to(ConfigLoadingModule).inSingletonScope();
  bind(TYPES.HttpClient).to(HttpClient).inSingletonScope();
  bind(TYPES.TokenBucketLimiter).to(TokenBucketLimiter).inSingletonScope();
  bind(TYPES.TokenCalculator).to(TokenCalculator).inSingletonScope();

  // 客户端实现
  bind(TYPES.OpenAIChatClient).to(OpenAIChatClient).inSingletonScope();
  bind(TYPES.OpenAIResponseClient).to(OpenAIResponseClient).inSingletonScope();
  bind(TYPES.AnthropicClient).to(AnthropicClient).inSingletonScope();
  bind(TYPES.GeminiClient).to(GeminiClient).inSingletonScope();
  bind(TYPES.GeminiOpenAIClient).to(GeminiOpenAIClient).inSingletonScope();
  bind(TYPES.MockClient).to(MockClient).inSingletonScope();
  bind(TYPES.HumanRelayClient).to(HumanRelayClient).inSingletonScope();

  // 工厂类
  bind(TYPES.LLMClientFactory).to(LLMClientFactory).inSingletonScope();

  // 管理器
  bind(TYPES.TaskGroupManager).to(TaskGroupManager).inSingletonScope();
  bind(TYPES.PollingPoolManager).to(PollingPoolManager).inSingletonScope();
  bind(TYPES.LLMWrapperManager).to(LLMWrapperManager).inSingletonScope();

  // ========== 仓储绑定 ==========

  bind(TYPES.SessionRepositoryImpl).to(SessionInfrastructureRepository).inSingletonScope();
  bind(TYPES.ThreadRepositoryImpl).to(ThreadInfrastructureRepository).inSingletonScope();
  bind(TYPES.WorkflowRepositoryImpl).to(WorkflowInfrastructureRepository).inSingletonScope();
  bind(TYPES.PromptRepositoryImpl).to(PromptInfrastructureRepository).inSingletonScope();
  bind(TYPES.ThreadCheckpointRepositoryImpl)
    .to(ThreadCheckpointInfrastructureRepository)
    .inSingletonScope();
  bind(TYPES.HistoryRepositoryImpl).to(HistoryInfrastructureRepository).inSingletonScope();

  // ========== 业务服务绑定 ==========

  bind(TYPES.GraphAlgorithmServiceImpl).to(GraphAlgorithmServiceImpl).inSingletonScope();
  bind(TYPES.FunctionExecutionEngine).to(FunctionExecutionEngine).inSingletonScope();
  bind(TYPES.MonitoringService).to(MonitoringService).inSingletonScope();
  
  // ========== 函数注册表绑定 ==========
  
  // 创建并配置 FunctionRegistry 单例
  bind(TYPES.FunctionRegistry)
    .toDynamicValue((context: any) => {
      const functionRegistry = new FunctionRegistry();
      
      // 注册内置的转换函数
      functionRegistry.registerSingleton(new MapTransformFunction());
      functionRegistry.registerSingleton(new FilterTransformFunction());
      functionRegistry.registerSingleton(new ReduceTransformFunction());
      functionRegistry.registerSingleton(new SortTransformFunction());
      functionRegistry.registerSingleton(new GroupTransformFunction());
      
      return functionRegistry;
    })
    .inSingletonScope();

  // ========== 基础设施服务绑定 ==========

  bind(TYPES.ConnectionManager).to(ConnectionManager).inSingletonScope();
  bind(TYPES.PromptBuilder).to(PromptBuilder).inSingletonScope();
  bind(TYPES.TemplateProcessor).to(TemplateProcessor).inSingletonScope();
  bind(TYPES.PromptReferenceParser).to(PromptReferenceParser).inSingletonScope();
  bind(TYPES.PromptReferenceValidator).to(PromptReferenceValidator).inSingletonScope();
  bind(TYPES.NodeExecutor).to(NodeExecutor).inSingletonScope();
  bind(TYPES.EdgeExecutor).to(EdgeExecutor).inSingletonScope();
  bind(TYPES.NodeRouter).to(NodeRouter).inSingletonScope();
  bind(TYPES.WorkflowExecutionEngine).to(WorkflowExecutionEngine).inSingletonScope();
  bind(TYPES.HookExecutor).to(HookExecutor).inSingletonScope();
  bind(TYPES.HookFactory).to(HookFactory).inSingletonScope();
  bind(TYPES.Logger).to(Logger).inSingletonScope();
});
