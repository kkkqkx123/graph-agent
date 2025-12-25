/**
 * 接口层服务绑定
 */

import { ServiceBindings, IContainer, ContainerConfiguration, ServiceLifetime } from '../../../infrastructure/container/container';

/**
 * HTTP服务绑定
 */
export class HTTPServiceBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // TODO: 注册HTTP服务
    // container.registerFactory<IHTTPService>(
    //   'IHTTPService',
    //   () => new HTTPService(
    //     container.get<ILogger>('ILogger'),
    //     container.get<IWorkflowService>('IWorkflowService')
    //   ),
    //   { lifetime: ServiceLifetime.SINGLETON }
    // );
  }
}

/**
 * CLI服务绑定
 */
export class CLIServiceBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // TODO: 注册CLI服务
    // container.registerFactory<ICLIService>(
    //   'ICLIService',
    //   () => new CLIService(
    //     container.get<ILogger>('ILogger'),
    //     container.get<IWorkflowService>('IWorkflowService')
    //   ),
    //   { lifetime: ServiceLifetime.SINGLETON }
    // );
  }
}

/**
 * 请求上下文绑定
 */
export class RequestContextBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // TODO: 注册请求上下文 - 作用域生命周期
    // container.registerFactory<IRequestContext>(
    //   'IRequestContext',
    //   () => new RequestContext(
    //     container.get<ILogger>('ILogger')
    //   ),
    //   { lifetime: ServiceLifetime.SCOPED }
    // );
  }
}

/**
 * API控制器绑定
 */
export class ApiControllerBindings extends ServiceBindings {
  registerServices(container: IContainer, config: ContainerConfiguration): void {
    // TODO: 注册API控制器
    // container.registerFactory<WorkflowController>(
    //   'WorkflowController',
    //   () => new WorkflowController(
    //     container.get<IWorkflowService>('IWorkflowService'),
    //     container.get<ILogger>('ILogger')
    //   ),
    //   { lifetime: ServiceLifetime.TRANSIENT }
    // );
    
    // container.registerFactory<SessionController>(
    //   'SessionController',
    //   () => new SessionController(
    //     container.get<ISessionService>('ISessionService'),
    //     container.get<ILogger>('ILogger')
    //   ),
    //   { lifetime: ServiceLifetime.TRANSIENT }
    // );
  }
}