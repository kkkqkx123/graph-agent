/**
 * 应用层容器
 */

import { BaseContainer, IContainer, ContainerConfiguration } from '../../../infrastructure/container/container';
import { WorkflowServiceBindings } from './bindings/application-bindings';
import { SessionServiceBindings } from './bindings/application-bindings';
import { ToolServiceBindings } from './bindings/application-bindings';
import { StateServiceBindings } from './bindings/application-bindings';
import { HistoryServiceBindings } from './bindings/application-bindings';
import { WorkflowExecutorBindings } from './bindings/application-bindings';

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
    // 注册应用层服务
    const workflowBindings = new WorkflowServiceBindings();
    workflowBindings.registerServices(this, this.config);

    const sessionBindings = new SessionServiceBindings();
    sessionBindings.registerServices(this, this.config);

    const toolBindings = new ToolServiceBindings();
    toolBindings.registerServices(this, this.config);

    const stateBindings = new StateServiceBindings();
    stateBindings.registerServices(this, this.config);

    const historyBindings = new HistoryServiceBindings();
    historyBindings.registerServices(this, this.config);

    const executorBindings = new WorkflowExecutorBindings();
    executorBindings.registerServices(this, this.config);
  }
}