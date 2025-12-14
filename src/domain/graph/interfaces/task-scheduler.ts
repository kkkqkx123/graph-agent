import { WorkflowState } from '../entities/workflow-state';

/**
 * 任务定义
 */
export interface Task {
  taskId: string;
  nodeId: string;
  priority: number;
  dependencies: string[];
  estimatedDuration: number;
  retryPolicy?: RetryPolicy;
  timeout?: number;
  metadata: Record<string, unknown>;
}

/**
 * 任务状态
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying'
}

/**
 * 任务执行结果
 */
export interface TaskResult {
  taskId: string;
  status: TaskStatus;
  result?: any;
  error?: Error;
  executionTime: number;
  startTime: Date;
  endTime: Date;
  retryCount: number;
}

/**
 * 调度策略
 */
export enum SchedulingStrategy {
  FIFO = 'fifo',
  PRIORITY = 'priority',
  DEPENDENCY_FIRST = 'dependency_first',
  PARALLEL = 'parallel',
  ADAPTIVE = 'adaptive'
}

/**
 * 资源限制
 */
export interface ResourceLimits {
  maxConcurrentTasks: number;
  maxMemoryUsage: number;
  maxCpuUsage: number;
  maxExecutionTime: number;
}

/**
 * 调度配置
 */
export interface SchedulingConfig {
  strategy: SchedulingStrategy;
  resourceLimits: ResourceLimits;
  enableLoadBalancing: boolean;
  enablePriorityPreemption: boolean;
  deadlockDetectionTimeout: number;
}

/**
 * 调度统计信息
 */
export interface SchedulingStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
  resourceUtilization: ResourceUtilization;
  throughput: number;
}

/**
 * 资源利用率
 */
export interface ResourceUtilization {
  cpuUsage: number;
  memoryUsage: number;
  activeTasks: number;
  queuedTasks: number;
}

/**
 * 重试策略
 */
export interface RetryPolicy {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxRetryDelay: number;
  retryableErrors: string[];
}

/**
 * 任务调度器接口
 * 
 * 负责管理任务执行顺序、并行性和资源分配
 */
export interface ITaskScheduler {
  /**
   * 提交任务
   * 
   * @param task 要执行的任务
   * @returns 任务ID
   */
  submitTask(task: Task): string;

  /**
   * 批量提交任务
   * 
   * @param tasks 任务列表
   * @returns 任务ID列表
   */
  submitTasks(tasks: Task[]): string[];

  /**
   * 取消任务
   * 
   * @param taskId 任务ID
   * @returns 是否成功取消
   */
  cancelTask(taskId: string): boolean;

  /**
   * 获取任务状态
   * 
   * @param taskId 任务ID
   * @returns 任务状态
   */
  getTaskStatus(taskId: string): TaskStatus;

  /**
   * 获取任务结果
   * 
   * @param taskId 任务ID
   * @returns 任务结果
   */
  getTaskResult(taskId: string): Promise<TaskResult | null>;

  /**
   * 获取可执行的任务
   * 
   * @param state 当前状态
   * @returns 可执行的任务列表
   */
  getExecutableTasks(state: WorkflowState): Task[];

  /**
   * 检查任务依赖
   * 
   * @param task 任务
   * @param completedTasks 已完成任务列表
   * @returns 依赖是否满足
   */
  checkDependencies(task: Task, completedTasks: string[]): boolean;

  /**
   * 设置调度配置
   * 
   * @param config 调度配置
   */
  setSchedulingConfig(config: SchedulingConfig): void;

  /**
   * 获取调度统计信息
   * 
   * @returns 调度统计信息
   */
  getSchedulingStats(): SchedulingStats;

  /**
   * 检测死锁
   * 
   * @returns 死锁任务列表
   */
  detectDeadlocks(): string[];

  /**
   * 解决死锁
   * 
   * @param deadlockedTasks 死锁任务列表
   * @returns 是否成功解决
   */
  resolveDeadlocks(deadlockedTasks: string[]): boolean;

  /**
   * 暂停调度
   */
  pause(): void;

  /**
   * 恢复调度
   */
  resume(): void;

  /**
   * 清理已完成的任务
   * 
   * @param olderThan 清理早于此时间的任务
   */
  cleanup(olderThan?: Date): void;

  /**
   * 销毁调度器，释放资源
   */
  destroy(): Promise<void>;
}