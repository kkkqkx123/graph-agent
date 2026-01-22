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

// 仓储实现
import { SessionRepository as SessionInfrastructureRepository } from '../../infrastructure/persistence/repositories/session-repository';
import { ThreadRepository as ThreadInfrastructureRepository } from '../../infrastructure/persistence/repositories/thread-repository';
import { WorkflowRepository as WorkflowInfrastructureRepository } from '../../infrastructure/persistence/repositories/workflow-repository';
import { PromptRepository as PromptInfrastructureRepository } from '../../infrastructure/persistence/repositories/prompt-repository';
import { CheckpointRepository as CheckpointInfrastructureRepository } from '../../infrastructure/persistence/repositories/checkpoint-repository';

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

  bind(TYPES.SessionRepository).to(SessionInfrastructureRepository).inSingletonScope();
  bind(TYPES.ThreadRepository).to(ThreadInfrastructureRepository).inSingletonScope();
  bind(TYPES.WorkflowRepository).to(WorkflowInfrastructureRepository).inSingletonScope();
  bind(TYPES.PromptRepository).to(PromptInfrastructureRepository).inSingletonScope();
  bind(TYPES.CheckpointRepository)
    .to(CheckpointInfrastructureRepository)
    .inSingletonScope();

  // ========== 基础设施服务绑定 ==========

  bind(TYPES.ConnectionManager).to(ConnectionManager).inSingletonScope();
  bind(TYPES.Logger).to(Logger).inSingletonScope();
});