/**
 * SubWorkflow Node 执行策略
 * 
 * 负责执行 SubWorkflow 节点，调用子工作流
 */

import { injectable, inject } from 'inversify';
import { Node } from '../../../../domain/workflow/entities/node';
import { SubWorkflowNode } from '../../../../domain/workflow/entities/node/subworkflow-node';
import { NodeExecutionResult } from '../../../../domain/workflow/entities/node';
import { ExecutionContext } from '../context/execution-context';
import { INodeExecutionStrategy } from './node-execution-strategy';
import { ThreadFork } from '../../thread-fork';
import { WorkflowExecutionEngine } from '../../workflow-execution-engine';
import { IThreadRepository } from '../../../../domain/threads/repositories/thread-repository';
import { IWorkflowRepository } from '../../../../domain/workflow/repositories/workflow-repository';
import { ID } from '../../../../domain/common/value-objects/id';
import { ForkStrategy } from '../../../../domain/sessions/value-objects/operations/fork/fork-strategy';
import { ILogger } from '../../../../domain/common/types/logger-types';

/**
 * SubWorkflow Node 执行策略
 */
@injectable()
export class SubWorkflowNodeStrategy implements INodeExecutionStrategy {
  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('ThreadFork') private readonly threadFork: ThreadFork,
    @inject('WorkflowExecutionEngine') private readonly threadExecutionEngine: WorkflowExecutionEngine,
    @inject('ThreadRepository') private readonly threadRepository: IThreadRepository,
    @inject('WorkflowRepository') private readonly workflowRepository: IWorkflowRepository
  ) {}

  canExecute(node: Node): boolean {
    return node instanceof SubWorkflowNode;
  }

  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    if (!(node instanceof SubWorkflowNode)) {
      return {
        success: false,
        error: '节点类型不匹配，期望 SubWorkflowNode',
        metadata: {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
        },
      };
    }

    const startTime = Date.now();

    this.logger.debug('SubWorkflowNodeStrategy 开始执行 SubWorkflow 节点', {
      nodeId: node.nodeId.toString(),
      threadId: context.threadId,
      subWorkflowId: node.subWorkflowId,
    });

    try {
      // 1. 获取子工作流定义
      const subWorkflow = await this.workflowRepository.findById(ID.fromString(node.subWorkflowId));
      
      if (!subWorkflow) {
        throw new Error(`子工作流不存在: ${node.subWorkflowId}`);
      }

      // 2. 准备子工作流输入（通过 inputMapping 映射）
      const subWorkflowInput = this.mapInput(context, node.inputMapping);

      this.logger.debug('准备子工作流输入', {
        subWorkflowId: node.subWorkflowId,
        inputMapping: node.inputMapping,
        subWorkflowInput,
      });

      // 3. 获取当前线程
      const parentThread = await this.threadRepository.findById(ID.fromString(context.threadId));
      
      if (!parentThread) {
        throw new Error(`父线程不存在: ${context.threadId}`);
      }

      // 4. 创建单分支 Fork（子工作流作为一个分支）
      const forkResult = await this.threadFork.executeFork({
        parentThread,
        forkPoint: node.nodeId,
        branches: [{
          branchId: 'subworkflow',
          targetNodeId: 'start', // TODO: 从子工作流获取实际的起始节点ID
          name: `SubWorkflow: ${subWorkflow.name}`,
        }],
        forkStrategy: ForkStrategy.createPartial() // 顺序执行
      });

      if (!forkResult.success) {
        throw new Error(`创建子线程失败: ${forkResult.error?.message || '未知错误'}`);
      }

      const childThreadId = forkResult.result?.forkedThreadIds?.[0];
      if (!childThreadId) {
        throw new Error('创建子线程失败：未返回子线程ID');
      }

      this.logger.debug('创建子线程成功', {
        childThreadId: childThreadId.toString(),
        subWorkflowId: node.subWorkflowId,
      });

      // 5. 在子线程中执行子工作流
      const subWorkflowResult = await this.threadExecutionEngine.execute(
        subWorkflow,
        childThreadId.toString(),
        subWorkflowInput
      );

      this.logger.debug('子工作流执行完成', {
        childThreadId: childThreadId.toString(),
        success: subWorkflowResult.success,
        executionTime: subWorkflowResult.executionTime,
      });

      // 6. 映射子工作流输出（通过 outputMapping）
      const mappedOutput = this.mapOutput(subWorkflowResult.finalState.data, node.outputMapping);

      // 7. 将子工作流结果存储到父线程上下文
      context.setVariable('subworkflow_result', {
        subWorkflowId: node.subWorkflowId,
        success: subWorkflowResult.success,
        output: subWorkflowResult.finalState.data,
        executionTime: subWorkflowResult.executionTime,
        executedNodes: subWorkflowResult.executedNodes,
      });

      const executionTime = Date.now() - startTime;

      this.logger.info('SubWorkflow 节点执行成功', {
        nodeId: node.nodeId.toString(),
        threadId: context.threadId,
        executionTime,
        subWorkflowId: node.subWorkflowId,
        subWorkflowSuccess: subWorkflowResult.success,
      });

      return {
        success: subWorkflowResult.success,
        output: mappedOutput,
        executionTime,
        metadata: {
          nodeId: node.nodeId.toString(),
          subWorkflowId: node.subWorkflowId,
          subWorkflowSuccess: subWorkflowResult.success,
          subWorkflowExecutionTime: subWorkflowResult.executionTime,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error('SubWorkflow 节点执行失败', error instanceof Error ? error : new Error(String(error)), {
        nodeId: node.nodeId.toString(),
        threadId: context.threadId,
        subWorkflowId: node.subWorkflowId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        metadata: {
          nodeId: node.nodeId.toString(),
          subWorkflowId: node.subWorkflowId,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        },
      };
    }
  }

  /**
   * 映射输入数据
   * @param context 执行上下文
   * @param inputMapping 输入映射
   * @returns 映射后的输入数据
   */
  private mapInput(context: ExecutionContext, inputMapping?: Record<string, string>): Record<string, any> {
    if (!inputMapping) {
      // 如果没有映射，返回所有变量
      return context.getAllVariables();
    }

    const mappedInput: Record<string, any> = {};

    for (const [subWorkflowKey, parentKey] of Object.entries(inputMapping)) {
      const value = context.getVariable(parentKey);
      if (value !== undefined) {
        mappedInput[subWorkflowKey] = value;
      }
    }

    return mappedInput;
  }

  /**
   * 映射输出数据
   * @param subWorkflowOutput 子工作流输出
   * @param outputMapping 输出映射
   * @returns 映射后的输出数据
   */
  private mapOutput(subWorkflowOutput: Record<string, any>, outputMapping?: Record<string, string>): Record<string, any> {
    if (!outputMapping) {
      // 如果没有映射，返回所有输出
      return subWorkflowOutput;
    }

    const mappedOutput: Record<string, any> = {};

    for (const [parentKey, subWorkflowKey] of Object.entries(outputMapping)) {
      const value = subWorkflowOutput[subWorkflowKey];
      if (value !== undefined) {
        mappedOutput[parentKey] = value;
      }
    }

    return mappedOutput;
  }
}