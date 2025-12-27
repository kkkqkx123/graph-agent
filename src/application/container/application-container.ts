/**
 * 应用层容器
 */

import { BaseContainer, IContainer, ContainerConfiguration } from '../../infrastructure/container/container';
import { WorkflowServiceBindings, SessionServiceBindings, PromptServiceBindings } from './bindings/application-bindings';

/**
 * 应用层容器
 */
export class ApplicationContainer extends BaseContainer {
  constructor(
    infrastructureContainer: IContainer,
    config: ContainerConfiguration = {}
  ) {
    super(infrastructureContainer);
    this.configure(config);
    this.registerApplicationServices();
  }

  /**
   * 注册应用层服务
   */
  private registerApplicationServices(): void {
    // 注册工作流服务
    const workflowBindings = new WorkflowServiceBindings();
    workflowBindings.registerServices(this, this.config);

    // 注册会话服务
    const sessionBindings = new SessionServiceBindings();
    sessionBindings.registerServices(this, this.config);

    // 注册提示词服务
    const promptBindings = new PromptServiceBindings();
    promptBindings.registerServices(this, this.config);
  }
}