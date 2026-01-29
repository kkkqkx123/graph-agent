/**
 * 节点处理器接口定义
 * 定义节点处理器的统一接口规范
 */

import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';

/**
 * 节点处理函数类型
 * @param thread Thread实例
 * @param node 节点定义
 * @returns 执行结果
 */
export type NodeHandler = (thread: Thread, node: Node) => Promise<any>;