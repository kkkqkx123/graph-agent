/**
 * Start节点执行器
 * 负责执行START节点，标记工作流的开始，初始化Thread状态
 */

import { NodeExecutor } from './base-node-executor';
import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';
import { ThreadStatus } from '../../../../types/thread';

/**
 * Start节点执行器
 */
export class StartNodeExecutor extends NodeExecutor {
  /**
   * 验证节点配置
   */
  protected override validate(node: Node): boolean {
    // 检查节点类型
    if (node.type !== NodeType.START) {
      return false;
    }

    // 检查配置是否为空（START节点不需要配置）
    if (node.config && Object.keys(node.config).length > 0) {
      throw new ValidationError('START node must have no configuration', `node.${node.id}`);
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

    // 检查Thread状态是否为CREATED
    if (thread.status !== ThreadStatus.CREATED) {
      return false;
    }

    // 检查节点是否已执行
    if (thread.nodeResults.has(node.id)) {
      return false;
    }

    return true;
  }

  /**
   * 执行节点的具体逻辑
   */
  protected override async doExecute(thread: Thread, node: Node): Promise<any> {
    // 步骤1：验证START节点入度（通过检查是否有入边）
    // 注意：这里需要从WorkflowContext获取边信息，暂时跳过
    // 实际实现中应该检查入边数量是否为0

    // 步骤2：初始化Thread状态
    thread.status = ThreadStatus.RUNNING;
    thread.currentNodeId = node.id;
    thread.startTime = Date.now();

    // 步骤3：初始化Thread的变量和结果
    if (!thread.variables) {
      thread.variables = [];
    }
    if (!thread.variableValues) {
      thread.variableValues = {};
    }
    if (!thread.nodeResults) {
      thread.nodeResults = new Map();
    }
    if (!thread.executionHistory) {
      thread.executionHistory = [];
    }
    if (!thread.errors) {
      thread.errors = [];
    }

    // 步骤4：初始化Thread输入
    if (!thread.input) {
      thread.input = {};
    }

    // 步骤5：记录执行历史
    thread.executionHistory.push({
      step: thread.executionHistory.length + 1,
      nodeId: node.id,
      nodeType: node.type,
      status: 'COMPLETED',
      timestamp: Date.now(),
      action: 'start'
    });

    // 步骤6：返回执行结果
    return {
      message: 'Workflow started',
      input: thread.input
    };
  }
}
