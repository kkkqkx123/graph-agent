/**
 * 并行处理节点模块
 * 提供Fork和Join节点，支持工作流的并行执行
 */

export { ForkNode } from './fork-node';
export { JoinNode } from './join-node';
export type { BranchConfig } from '../../../../domain/workflow/value-objects/node/marker-node';
