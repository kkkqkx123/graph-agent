/**
 * End节点执行器
 * 负责执行END节点，标记工作流的结束，收集执行结果
 */

import { NodeExecutor } from './base-node-executor';
import type { Node } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import { NodeType } from '../../../../types/node';
import { ValidationError } from '../../../../types/errors';
import { ThreadStatus } from '../../../../types/thread';

/**
 * End节点执行器
 */
export class EndNodeExecutor extends NodeExecutor {
  /**
   * 验证节点配置
   */
  protected override validate(node: Node): boolean {
    // 检查节点类型
    if (node.type !== NodeType.END) {
      return false;
    }

    // 检查配置是否为空（END节点不需要配置）
    if (node.config && Object.keys(node.config).length > 0) {
      throw new ValidationError('END node must have no configuration', `node.${node.id}`);
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

    // 检查Thread状态是否为RUNNING
    if (thread.status !== ThreadStatus.RUNNING) {
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
    // 步骤1：验证END节点出度（通过检查是否有出边）
    // 注意：这里需要从WorkflowContext获取边信息，暂时跳过
    // 实际实现中应该检查出边数量是否为0

    // 步骤2：收集Thread输出
    let output: any = {};

    // 优先级1：Thread的output
    if (thread.output && Object.keys(thread.output).length > 0) {
      output = thread.output;
    } else {
      // 优先级2：最后一个节点的output
      if (thread.nodeResults && thread.nodeResults.length > 0) {
        const lastHistory = thread.nodeResults[thread.nodeResults.length - 1];
        if (lastHistory) {
          const lastResult = thread.nodeResults.get(lastHistory.nodeId);
          if (lastResult && lastResult.output) {
            output = lastResult.output;
          }
        }
      }
      // 优先级3：空对象（已在上面初始化）
    }

    // 步骤3：更新Thread状态
    thread.status = ThreadStatus.COMPLETED;
    thread.endTime = Date.now();
    thread.output = output;

    // 步骤4：记录执行历史
    thread.nodeResults.push({
      step: thread.nodeResults.length + 1,
      nodeId: node.id,
      nodeType: node.type,
      status: 'COMPLETED',
      timestamp: Date.now(),
      action: 'end'
    });

    // 步骤5：返回执行结果
    return {
      message: 'Workflow completed',
      output,
      executionTime: thread.endTime - thread.startTime
    };
  }
}
