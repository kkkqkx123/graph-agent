/**
 * 提示词基础设施服务绑定
 */

import { ServiceBindings, IContainer, ContainerConfiguration, ServiceLifetime } from '../container';
import { ILogger } from '../../../domain/common/types';
import { IConfigManager } from '../../../domain/common/types';
import { PromptRepository } from '../../persistence/repositories/prompt-repository';
import { PromptLoader } from '../../prompts/services/prompt-loader';
import { PromptInjector } from '../../prompts/services/prompt-injector';

/**
 * 提示词服务绑定
 */
export class InfrastructurePromptsBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // 注册提示词仓库
    container.registerFactory<PromptRepository>(
      'PromptRepository',
      () => {
        const configManager = container.get<IConfigManager>('IConfigManager');
        const logger = container.get<ILogger>('ILogger');
        return new PromptRepository(configManager, logger);
      },
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册提示词加载器
    container.registerFactory<PromptLoader>(
      'PromptLoader',
      () => {
        const configManager = container.get<IConfigManager>('IConfigManager');
        const logger = container.get<ILogger>('ILogger');
        return new PromptLoader(configManager, logger);
      },
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册提示词注入器
    container.registerFactory<PromptInjector>(
      'PromptInjector',
      () => {
        const promptLoader = container.get<PromptLoader>('PromptLoader');
        const logger = container.get<ILogger>('ILogger');
        return new PromptInjector(promptLoader, logger);
      },
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }
}