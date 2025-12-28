/**
 * DI模块入口
 *
 * 导出所有依赖注入相关的类型和函数
 */

// 导出服务标识符
export { TYPES } from './service-keys';

// 导出容器
export { diContainer, container, ContainerManager, AppContainer } from './container';

// 导出绑定模块
export { infrastructureBindings, applicationBindings } from './bindings';

// 导出类型
export type { ContainerConfig } from './container';

// 默认导出AppContainer
export { default } from './container';