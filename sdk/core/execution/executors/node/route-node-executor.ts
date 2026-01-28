/**
 * Route节点执行器
 * 负责执行ROUTE节点，评估条件表达式，选择下一个节点
 */

import { NodeExecutor } from './base-node-executor';
import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';
import { now } from '../../../../utils';

/**
 * Route节点配置
 */
interface RouteNodeConfig {
  /** 条件表达式数组 */
  conditions: string[];
  /** 下一个节点ID数组 */
  nextNodes: string[];
  /** 默认节点ID（可选） */
  defaultNode?: string;
}

/**
 * Route节点执行器
 */
export class RouteNodeExecutor extends NodeExecutor {
  /**
   * 验证节点配置
   */
  protected override validate(node: Node): boolean {
    // 检查节点类型
    if (node.type !== NodeType.ROUTE) {
      return false;
    }

    const config = node.config as RouteNodeConfig;

    // 检查必需的配置项
    if (!config.conditions || !Array.isArray(config.conditions) || config.conditions.length === 0) {
      throw new ValidationError('Route node must have conditions array', `node.${node.id}`);
    }

    if (!config.nextNodes || !Array.isArray(config.nextNodes) || config.nextNodes.length === 0) {
      throw new ValidationError('Route node must have nextNodes array', `node.${node.id}`);
    }

    // 检查conditions和nextNodes长度是否一致
    if (config.conditions.length !== config.nextNodes.length) {
      throw new ValidationError('Conditions and nextNodes must have the same length', `node.${node.id}`);
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
    const config = node.config as RouteNodeConfig;

    // 步骤1：评估条件表达式
    let selectedNodeIndex = -1;

    for (let i = 0; i < config.conditions.length; i++) {
      const condition = config.conditions[i];
      if (condition) {
        const evaluatedCondition = this.resolveVariableReferences(condition, thread);
        const result = this.evaluateCondition(evaluatedCondition);

        if (result) {
          selectedNodeIndex = i;
          break;
        }
      }
    }

    // 步骤2：选择下一个节点
    let selectedNode: string;

    if (selectedNodeIndex === -1) {
      // 没有条件满足，使用默认节点
      if (config.defaultNode) {
        selectedNode = config.defaultNode;
      } else {
        throw new ValidationError('No condition matched and no default node specified', `node.${node.id}`);
      }
    } else {
      const nextNode = config.nextNodes[selectedNodeIndex];
      if (!nextNode) {
        throw new ValidationError(`No next node found at index ${selectedNodeIndex}`, `node.${node.id}`);
      }
      selectedNode = nextNode;
    }

    // 步骤3：记录执行历史
    thread.nodeResults.push({
      step: thread.nodeResults.length + 1,
      nodeId: node.id,
      nodeType: node.type,
      status: 'COMPLETED',
      timestamp: now(),
      output: {
        selectedNode,
        matchedConditionIndex: selectedNodeIndex
      }
    });

    // 步骤4：返回执行结果
    return {
      selectedNode,
      matchedConditionIndex: selectedNodeIndex
    };
  }

  /**
   * 解析条件表达式中的变量引用
   * @param condition 条件表达式
   * @param thread Thread实例
   * @returns 解析后的条件表达式
   */
  private resolveVariableReferences(condition: string, thread: Thread): string {
    const variablePattern = /\{\{(\w+(?:\.\w+)*)\}\}/g;

    return condition.replace(variablePattern, (match, varPath) => {
      // 从variableValues获取变量值
      const parts = varPath.split('.');
      let value: any = thread.variableValues || {};

      for (const part of parts) {
        if (value === null || value === undefined) {
          return 'undefined';
        }
        value = value[part];
      }

      // 根据值的类型返回字符串表示
      if (typeof value === 'string') {
        return `'${value}'`;
      } else if (typeof value === 'object') {
        return JSON.stringify(value);
      } else {
        return String(value);
      }
    });
  }

  /**
   * 评估条件表达式
   * @param condition 条件表达式
   * @returns 评估结果
   */
  private evaluateCondition(condition: string): boolean {
    try {
      // 使用安全的表达式求值
      const result = new Function(`return (${condition})`)();
      return Boolean(result);
    } catch (error) {
      console.error(`Failed to evaluate condition: ${condition}`, error);
      return false;
    }
  }
}
