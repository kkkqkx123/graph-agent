/**
 * 配置加载模块的依赖注入绑定
 */

import { ServiceBindings } from '../container';
import { IContainer, ContainerConfiguration, ServiceLifetime } from '../container';
import { ILogger } from '../../../domain/common/types';

// 加载器导入
import { LLMLoader } from '../../config/loading/loaders/llm-loader';
import { ToolLoader } from '../../config/loading/loaders/tool-loader';
import { PromptLoader } from '../../config/loading/loaders/prompt-loader';
import { PoolConfigLoader } from '../../config/loading/loaders/pool-config-loader';
import { TaskGroupConfigLoader } from '../../config/loading/loaders/task-group-config-loader';

// 规则导入
import { createAllModuleRules } from '../../config/loading/rules';

// 类型导入
import { IModuleLoader } from '../../config/loading/types';

/**
 * 配置加载服务绑定
 */
export class ConfigLoadingBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // 注册日志记录器（如果尚未注册）
    if (!container.has('ILogger')) {
      // 这里应该根据实际的日志实现来注册
      // container.register<ILogger>('ILogger', ConsoleLogger, { lifetime: ServiceLifetime.SINGLETON });
    }

    // 注册所有加载器
    this.registerLoaders(container, config);

    // 注册规则集合
    this.registerRules(container, config);
  }

  /**
   * 注册所有加载器
   */
  private registerLoaders(container: IContainer, config: ContainerConfiguration): void {
    const logger = container.get<ILogger>('ILogger');

    // 注册LLM加载器
    container.registerFactory<IModuleLoader>(
      'LLMLoader',
      () => new LLMLoader(logger),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册工具加载器
    container.registerFactory<IModuleLoader>(
      'ToolLoader',
      () => new ToolLoader(logger),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册提示加载器
    container.registerFactory<IModuleLoader>(
      'PromptLoader',
      () => new PromptLoader(logger),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册轮询池配置加载器
    container.registerFactory<IModuleLoader>(
      'PoolConfigLoader',
      () => new PoolConfigLoader(logger),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册任务组配置加载器
    container.registerFactory<IModuleLoader>(
      'TaskGroupConfigLoader',
      () => new TaskGroupConfigLoader(logger),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册加载器映射表
    container.registerFactory<Map<string, IModuleLoader>>(
      'ModuleLoaders',
      () => this.createLoaderMap(container),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }

  /**
   * 注册规则集合
   */
  private registerRules(container: IContainer, config: ContainerConfiguration): void {
    const logger = container.get<ILogger>('ILogger');
    const loaders = container.get<Map<string, IModuleLoader>>('ModuleLoaders');

    // 注册所有模块规则
    container.registerFactory(
      'ModuleRules',
      () => createAllModuleRules(loaders, logger),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }

  /**
   * 创建加载器映射表
   */
  private createLoaderMap(container: IContainer): Map<string, IModuleLoader> {
    const loaderMap = new Map<string, IModuleLoader>();

    // 映射加载器到模块类型
    loaderMap.set('llm', container.get<IModuleLoader>('LLMLoader'));
    loaderMap.set('tools', container.get<IModuleLoader>('ToolLoader'));
    loaderMap.set('prompts', container.get<IModuleLoader>('PromptLoader'));
    loaderMap.set('pool', container.get<IModuleLoader>('PoolConfigLoader'));
    loaderMap.set('taskGroup', container.get<IModuleLoader>('TaskGroupConfigLoader'));

    return loaderMap;
  }
}