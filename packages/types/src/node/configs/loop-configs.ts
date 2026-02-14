/**
 * 循环节点配置类型定义
 */

import type { Condition } from '../../condition';

/**
 * 循环数据源配置
 * 
 * 说明：定义循环迭代的数据源和循环变量
 * - iterable：被迭代的数据源（数组、对象、数字、字符串或变量表达式）
 * - variableName：循环变量名，存储当前迭代值
 * - 两个属性必须同时存在或同时不存在（成对使用）
 */
export interface DataSource {
  /** 可迭代对象或变量表达式
   * - 直接值：数组、对象、数字、字符串
   * - 变量表达式：支持 {{variable.path}} 语法，在运行时从 thread 和 input 中解析
   * 例：[1,2,3] 或 "{{input.list}}" 或 "{{thread.items}}"
   */
  iterable: any;
  /** 循环变量名，存储当前迭代值（在 loop 级作用域中） */
  variableName: string;
}

/**
 * 循环开始节点配置
 * 
 * 说明：初始化循环迭代，支持两种循环模式
 * 
 * 模式1：数据驱动循环（提供 dataSource）
 * - 遍历指定的数据集合（数组、对象等）
 * - 每次迭代自动提取当前值到循环变量
 * - 例：遍历 [1,2,3]，每次 item = 当前值
 * 
 * 模式2：计数循环（不提供 dataSource）
 * - 仅基于 maxIterations 循环固定次数
 * - 无循环变量，循环体可以自行维护状态
 * - 例：检查 10 次
 * 
 * - 循环状态（迭代计数、索引等）存储在 loop 级作用域，自动随作用域生命周期管理
 */
export interface LoopStartNodeConfig {
  /** 循环ID（唯一标识此循环） */
  loopId: string;
  /** 数据源配置（可选）
   * - 提供时：进行数据驱动循环，遍历 dataSource.iterable
   * - 不提供时：进行计数循环，仅基于 maxIterations
   * - 若提供则 iterable 和 variableName 必须同时存在
   */
  dataSource?: DataSource;
  /** 最大迭代次数（安全保护，必需） */
  maxIterations: number;
}

/**
 * 循环结束节点配置
 *
 * 说明：检查循环条件和中断条件，决定是否继续迭代
 * - loopId 唯一标识循环，用于检索 LOOP_START 中初始化的循环状态
 * - 循环状态（iterable、iterationCount 等）已在 LOOP_START 中初始化并存储，无需重复定义
 * - 所有循环数据和状态都在 loop 级作用域中，与其他作用域隔离
 */
export interface LoopEndNodeConfig {
  /** 循环ID（与LOOP_START节点完全一致，用于标识和检索循环状态） */
  loopId: string;
  /** 中断条件表达式（可选，满足时立即退出循环） */
  breakCondition?: Condition;
  /** LOOP_START节点ID（用于跳转到下一迭代） */
  loopStartNodeId?: string;
}