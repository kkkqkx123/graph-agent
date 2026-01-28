/**
 * Subgraph节点执行器
 * 负责执行SUBGRAPH节点，调用子工作流，处理输入输出映射
 */

import { NodeExecutor } from './base-node-executor';
import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';
import { now } from '../../../../utils';

/**
 * Subgraph节点配置
 */
interface SubgraphNodeConfig {
  /** 子工作流ID */
  subgraphId: string;
  /** 子工作流版本 */
  subgraphVersion?: string;
  /** 输入映射（父工作流变量 -> 子工作流输入） */
  inputMapping?: Record<string, string>;
  /** 输出映射（子工作流输出 -> 父工作流变量） */
  outputMapping?: Record<string, string>;
  /** 是否异步执行 */
  async?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * Subgraph节点执行器
 */
export class SubgraphNodeExecutor extends NodeExecutor {
  /**
   * 验证节点配置
   */
  protected override validate(node: Node): boolean {
    // 检查节点类型
    if (node.type !== NodeType.SUBGRAPH) {
      return false;
    }

    const config = node.config as SubgraphNodeConfig;

    // 检查必需的配置项
    if (!config.subgraphId || typeof config.subgraphId !== 'string') {
      throw new ValidationError('Subgraph node must have a valid subgraphId', `node.${node.id}`);
    }

    // 检查超时配置
    if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      throw new ValidationError('Subgraph node timeout must be a positive number', `node.${node.id}`);
    }

    return true;
  }

  /**
   * 检查节点是否可以执行
   */
  protected override canExecute(thread: Thread, node: Node): boolean {
    // 调用父类检查
    if (!super.canExecute(thread, node)) {
      return false;
    }

    return true;
  }

  /**
   * 执行节点的具体逻辑
   */
  protected override async doExecute(thread: Thread, node: Node): Promise<any> {
    const config = node.config as SubgraphNodeConfig;
    const timeout = config.timeout || 300000; // 默认5分钟

    // 步骤1：准备子工作流输入
    const subgraphInput = this.prepareSubgraphInput(config.inputMapping, thread);

    // 步骤2：调用子工作流
    const subgraphResult = await this.executeSubgraph(
      config.subgraphId,
      config.subgraphVersion,
      subgraphInput,
      config.async || false,
      timeout
    );

    // 步骤3：处理子工作流输出
    const output = this.processSubgraphOutput(config.outputMapping, subgraphResult, thread);

    // 步骤4：记录执行历史
    thread.nodeResults.push({
      step: thread.nodeResults.length + 1,
      nodeId: node.id,
      nodeType: node.type,
      status: 'COMPLETED',
      timestamp: now(),
      output: {
        subgraphId: config.subgraphId,
        subgraphVersion: config.subgraphVersion,
        input: subgraphInput,
        output: subgraphResult,
        mappedOutput: output
      }
    });

    // 步骤5：返回执行结果
    return {
      subgraphId: config.subgraphId,
      subgraphVersion: config.subgraphVersion,
      input: subgraphInput,
      output: subgraphResult,
      mappedOutput: output
    };
  }

  /**
   * 准备子工作流输入
   * @param inputMapping 输入映射
   * @param thread Thread实例
   * @returns 子工作流输入
   */
  private prepareSubgraphInput(inputMapping: Record<string, string> | undefined, thread: Thread): Record<string, any> {
    const subgraphInput: Record<string, any> = {};

    if (!inputMapping) {
      // 如果没有映射，使用所有变量
      return { ...thread.variableValues };
    }

    // 根据映射准备输入
    for (const [subgraphVar, parentVar] of Object.entries(inputMapping)) {
      const value = this.getVariableValue(parentVar, thread);
      subgraphInput[subgraphVar] = value;
    }

    return subgraphInput;
  }

  /**
   * 获取变量值
   * @param varPath 变量路径
   * @param thread Thread实例
   * @returns 变量值
   */
  private getVariableValue(varPath: string, thread: Thread): any {
    const parts = varPath.split('.');
    let value: any = thread.variableValues || {};

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * 执行子工作流
   * @param subgraphId 子工作流ID
   * @param subgraphVersion 子工作流版本
   * @param input 输入
   * @param async 是否异步
   * @param timeout 超时时间
   * @returns 子工作流结果
   */
  private async executeSubgraph(
    subgraphId: string,
    subgraphVersion: string | undefined,
    input: Record<string, any>,
    async: boolean,
    timeout: number
  ): Promise<any> {
    // 注意：这里使用模拟的子工作流执行
    // 实际实现应该使用WorkflowExecutor执行子工作流

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Subgraph execution timeout after ${timeout}ms`));
      }, timeout);

      // 模拟子工作流执行
      setTimeout(() => {
        clearTimeout(timer);

        // 模拟子工作流结果
        const mockResult = {
          status: 'COMPLETED',
          output: {
            message: `Mock result for subgraph: ${subgraphId}`,
            input
          },
          executionTime: 100
        };

        resolve(mockResult);
      }, 100);
    });
  }

  /**
   * 处理子工作流输出
   * @param outputMapping 输出映射
   * @param subgraphResult 子工作流结果
   * @param thread Thread实例
   * @returns 映射后的输出
   */
  private processSubgraphOutput(
    outputMapping: Record<string, string> | undefined,
    subgraphResult: any,
    thread: Thread
  ): Record<string, any> {
    const mappedOutput: Record<string, any> = {};

    if (!outputMapping) {
      // 如果没有映射，直接返回子工作流输出
      return subgraphResult.output || {};
    }

    // 根据映射处理输出
    for (const [parentVar, subgraphVar] of Object.entries(outputMapping)) {
      const value = this.getNestedValue(subgraphResult.output, subgraphVar);
      mappedOutput[parentVar] = value;

      // 更新父工作流变量
      if (!thread.variableValues) {
        thread.variableValues = {};
      }
      thread.variableValues[parentVar] = value;
    }

    return mappedOutput;
  }

  /**
   * 获取嵌套值
   * @param obj 对象
   * @param path 路径
   * @returns 值
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let value = obj;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }
}
