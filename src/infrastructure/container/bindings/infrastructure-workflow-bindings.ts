/**
 * 基础设施层工作流服务绑定
 */

import { ServiceBindings, IContainer, ContainerConfiguration, ServiceLifetime } from '../container';
import { ValueObjectExecutor } from '../../workflow/functions/executors/value-object-executor';
import { NodeExecutor } from '../../workflow/nodes/node-executor';
import { EdgeExecutor } from '../../workflow/edges/edge-executor';
import { HookExecutor } from '../../workflow/hooks/hook-executor';
import { EdgeEvaluator } from '../../threads/execution/edge-evaluator';
import { NodeRouter } from '../../threads/execution/node-router';
import { FunctionRegistry } from '../../workflow/functions/registry/function-registry';
import { FunctionExecutor } from '../../workflow/functions/executors/function-executor';

/**
 * 工作流执行器绑定
 */
export class WorkflowExecutorBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // 注册函数注册表
    container.registerFactory<FunctionRegistry>(
      'FunctionRegistry',
      () => new FunctionRegistry(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册函数执行器
    container.registerFactory<FunctionExecutor>(
      'FunctionExecutor',
      () => new FunctionExecutor(
        container.get('Logger')
      ),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册值对象执行器
    container.registerFactory<ValueObjectExecutor>(
      'ValueObjectExecutor',
      () => new ValueObjectExecutor(
        container.get<FunctionRegistry>('FunctionRegistry'),
        container.get<FunctionExecutor>('FunctionExecutor'),
        container.get('Logger')
      ),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册节点执行器
    container.registerFactory<NodeExecutor>(
      'NodeExecutor',
      () => new NodeExecutor(
        container.get<ValueObjectExecutor>('ValueObjectExecutor'),
        container.get('Logger')
      ),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册边执行器
    container.registerFactory<EdgeExecutor>(
      'EdgeExecutor',
      () => new EdgeExecutor(
        container.get<ValueObjectExecutor>('ValueObjectExecutor'),
        container.get('Logger')
      ),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册钩子执行器
    container.registerFactory<HookExecutor>(
      'HookExecutor',
      () => new HookExecutor(
        container.get<ValueObjectExecutor>('ValueObjectExecutor'),
        container.get('Logger')
      ),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册边评估器
    container.registerFactory<EdgeEvaluator>(
      'EdgeEvaluator',
      () => new EdgeEvaluator(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册节点路由器
    container.registerFactory<NodeRouter>(
      'NodeRouter',
      () => new NodeRouter(),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }
}
