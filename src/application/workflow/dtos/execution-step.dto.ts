/**
 * 执行步骤DTO
 */
export interface ExecutionStepDto {
  /** 步骤ID */
  id: string;
  /** 节点ID */
  nodeId: string;
  /** 步骤名称 */
  name?: string;
  /** 步骤类型 */
  type: string;
  /** 执行顺序 */
  order: number;
  /** 并行组ID（可选） */
  parallelGroupId?: string;
  /** 前置条件 */
  prerequisites: string[];
  /** 输入映射 */
  inputMapping: Record<string, string>;
  /** 输出映射 */
  outputMapping: Record<string, string>;
  /** 超时时间（秒） */
  timeout?: number;
  /** 重试配置 */
  retryConfig?: {
    maxRetries: number;
    retryInterval: number;
    exponentialBackoff: boolean;
  };
}