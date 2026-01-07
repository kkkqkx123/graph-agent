/**
 * Infrastructure层服务绑定
 *
 * 绑定基础设施层的所有服务实现
 * 只包含技术基础设施：persistence、logging、config等
 */

import { ContainerModule } from 'inversify';
import { TYPES } from '../service-keys';

// Infrastructure层服务实现
import { HttpClient } from '../../infrastructure/common/http/http-client';
import { ConfigLoadingModule } from '../../infrastructure/config/loading/config-loading-module';
import { TokenBucketLimiter } from '../../services/llm/llm/rate-limiters/token-bucket-limiter';
import { TokenCalculator } from '../../services/llm/llm/token-calculators/token-calculator';
import { OpenAIChatClient } from '../../services/llm/llm/clients/openai-chat-client';
import { OpenAIResponseClient } from '../../services/llm/llm/clients/openai-response-client';
import { AnthropicClient } from '../../services/llm/llm/clients/anthropic-client';
import { GeminiClient } from '../../services/llm/llm/clients/gemini-client';
import { GeminiOpenAIClient } from '../../services/llm/llm/clients/gemini-openai-client';
import { MockClient } from '../../services/llm/llm/clients/mock-client';
import { HumanRelayClient } from '../../services/llm/llm/clients/human-relay-client';
import { LLMClientFactory } from '../../services/llm/llm/clients/llm-client-factory';

// 仓储实现
import { SessionRepository as SessionInfrastructureRepository } from '../../infrastructure/persistence/repositories/session-repository';
import { ThreadRepository as ThreadInfrastructureRepository } from '../../infrastructure/persistence/repositories/thread-repository';
import { WorkflowRepository as WorkflowInfrastructureRepository } from '../../infrastructure/persistence/repositories/workflow-repository';
import { PromptRepository as PromptInfrastructureRepository } from '../../infrastructure/persistence/repositories/prompt-repository';
import { ThreadCheckpointRepository as ThreadCheckpointInfrastructureRepository } from '../../infrastructure/persistence/repositories/thread-checkpoint-repository';
import { HistoryRepository as HistoryInfrastructureRepository } from '../../infrastructure/persistence/repositories/history-repository';

// 基础设施服务
import { ConnectionManager } from '../../infrastructure/persistence/connection-manager';
import { Logger } from '../../infrastructure/logging/logger';

/**
 * Infrastructure层绑定模块
 */
export const infrastructureBindings = new ContainerModule((bind: any) => {
  // ========== LLM模块基础设施服务绑定 ==========

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

  // ========== 仓储绑定 ==========

  bind(TYPES.SessionRepositoryImpl).to(SessionInfrastructureRepository).inSingletonScope();
  bind(TYPES.ThreadRepositoryImpl).to(ThreadInfrastructureRepository).inSingletonScope();
  bind(TYPES.WorkflowRepositoryImpl).to(WorkflowInfrastructureRepository).inSingletonScope();
  bind(TYPES.PromptRepositoryImpl).to(PromptInfrastructureRepository).inSingletonScope();
  bind(TYPES.ThreadCheckpointRepositoryImpl)
    .to(ThreadCheckpointInfrastructureRepository)
    .inSingletonScope();
  bind(TYPES.HistoryRepositoryImpl).to(HistoryInfrastructureRepository).inSingletonScope();

  // ========== 基础设施服务绑定 ==========

  bind(TYPES.ConnectionManager).to(ConnectionManager).inSingletonScope();
  bind(TYPES.Logger).to(Logger).inSingletonScope();
});