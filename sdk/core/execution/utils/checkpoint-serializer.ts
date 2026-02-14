/**
 * 检查点序列化工具函数
 * 纯函数实现，无状态
 */

import type { Checkpoint } from '@modular-agent/types';

/**
 * 序列化检查点为字节数组
 */
export function serializeCheckpoint(checkpoint: Checkpoint): Uint8Array {
  const json = JSON.stringify(checkpoint, null, 2);
  return new TextEncoder().encode(json);
}

/**
 * 从字节数组反序列化检查点
 */
export function deserializeCheckpoint(data: Uint8Array): Checkpoint {
  const json = new TextDecoder().decode(data);
  return JSON.parse(json) as Checkpoint;
}