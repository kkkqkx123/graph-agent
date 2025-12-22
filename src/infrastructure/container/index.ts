import { Container } from './container';

export * from './container';
export * from './bindings';

// 默认容器实例（用于向后兼容）
export const container = new Container();