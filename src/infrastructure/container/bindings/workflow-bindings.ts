/**
 * 工作流相关服务绑定
 */

import { ServiceBindings, IContainer, ContainerConfiguration, ServiceLifetime } from '../container';
import { GraphAlgorithmService } from '../../../domain/workflow/interfaces/graph-algorithm-service.interface';
import { GraphValidationService } from '../../../domain/workflow/interfaces/graph-validation-service.interface';
import { GraphAlgorithmServiceImpl } from '../../workflow/services/graph-algorithm-service.impl';
import { GraphValidationServiceImpl } from '../../workflow/services/graph-validation-service.impl';

/**
 * 工作流服务绑定
 */
export class WorkflowInfrastructureBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // 注册图算法服务
    container.registerFactory<GraphAlgorithmService>(
      'GraphAlgorithmService',
      () => new GraphAlgorithmServiceImpl(),
      { lifetime: ServiceLifetime.SINGLETON }
    );

    // 注册图验证服务
    container.registerFactory<GraphValidationService>(
      'GraphValidationService',
      () => new GraphValidationServiceImpl(),
      { lifetime: ServiceLifetime.SINGLETON }
    );
  }
}