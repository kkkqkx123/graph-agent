/**
 * 提示词系统工厂
 */

import { IConfigManager } from '@shared/types/config';
import { ILogger } from '@shared/types/logger';
import { PromptService } from '../services/prompt-service';
import { PromptRepository } from '../../../infrastructure/prompts/repositories/prompt-repository';
import { PromptLoaderImpl } from '../../../infrastructure/prompts/services/prompt-loader-impl';
import { PromptInjector } from '../../../infrastructure/prompts/services/prompt-injector';

export class PromptSystemFactory {
  /**
   * 创建提示词系统
   */
  static async createPromptSystem(
    configManager: IConfigManager,
    logger: ILogger
  ): Promise<{
    repository: PromptRepository;
    loader: PromptLoaderImpl;
    injector: PromptInjector;
    service: PromptService;
  }> {
    // 创建基础设施组件
    const repository = new PromptRepository(configManager, logger);
    const loader = new PromptLoaderImpl(configManager, logger);
    const injector = new PromptInjector(loader, logger);
    
    // 创建应用服务
    const service = new PromptService(repository, loader, injector);
    
    return {
      repository,
      loader,
      injector,
      service
    };
  }
}