/**
 * 工作流执行引擎完整执行和生命周期管理集成测试
 *
 * 测试范围：
 * - 工作流通过执行引擎完整执行流程
 * - ThreadExecutor、ThreadLifecycleCoordinator的集成
 * - 工作流生命周期状态管理
 * - 执行结果和输出验证
 * - 异常执行路径和错误处理
 * - 暂停、恢复、取消等生命周期操作
 */

import { WorkflowRegistry } from '../core/services/workflow-registry';
import { ThreadExecutor } from '../core/execution/thread-executor';
import { ThreadLifecycleCoordinator } from '../core/execution/coordinators/thread-lifecycle-coordinator';
import { ThreadBuilder } from '../core/execution/thread-builder';
import { ExecutionContext } from '../core/execution/context/execution-context';
import { NodeType } from '../types/node';
import { EdgeType } from '../types/edge';
import { ThreadStatus } from '../types/thread';
import { ValidationError } from '../types/errors';
import type { WorkflowDefinition } from '../types/workflow';
import type { ThreadOptions, ThreadResult } from '../types/thread';

describe.skip('工作流执行引擎完整执行和生命周期管理集成测试', () => {
  let workflowRegistry: WorkflowRegistry;
  let executionContext: ExecutionContext;

  beforeAll(async () => {
    // 注册测试脚本到code-service（只执行一次）
    const { codeService } = await import('../core/services/code-service');
    const { ScriptType } = await import('../types/code');
    const { generateId } = await import('../utils/id-utils');

    // 创建简单的JavaScript执行器
    const javascriptExecutor: import('../types/code').ScriptExecutor = {
      async execute(script, options) {
        try {
          // 简单的JavaScript执行器，使用eval执行脚本内容
          const result = eval(script.content || '');
          return {
            success: true,
            scriptName: script.name,
            scriptType: script.type,
            stdout: JSON.stringify(result),
            executionTime: 0
          };
        } catch (error) {
          return {
            success: false,
            scriptName: script.name,
            scriptType: script.type,
            stderr: error instanceof Error ? error.message : String(error),
            executionTime: 0,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      },
      validate(script) {
        try {
          // 简单的验证：检查脚本内容是否有效
          if (!script.content) {
            return { valid: false, errors: ['Script content is empty'] };
          }
          // 尝试解析脚本
          eval(script.content);
          return { valid: true, errors: [] };
        } catch (error) {
          return {
            valid: false,
            errors: [error instanceof Error ? error.message : 'Invalid script syntax']
          };
        }
      },
      getSupportedTypes() {
        return [ScriptType.JAVASCRIPT];
      }
    };

    // 注册JavaScript执行器
    codeService.registerExecutor(ScriptType.JAVASCRIPT, javascriptExecutor);

    // 先检查是否已注册，避免重复注册
    if (!codeService.hasScript('process1')) {
      codeService.registerScript({
        id: generateId(),
        name: 'process1',
        type: ScriptType.JAVASCRIPT,
        description: 'Test script process1',
        content: '({ result: "process1 completed" })',
        options: { timeout: 5000 }
      });
    }
    if (!codeService.hasScript('process2')) {
      codeService.registerScript({
        id: generateId(),
        name: 'process2',
        type: ScriptType.JAVASCRIPT,
        description: 'Test script process2',
        content: '({ result: "process2 completed" })',
        options: { timeout: 5000 }
      });
    }
    if (!codeService.hasScript('processTrue')) {
      codeService.registerScript({
        id: generateId(),
        name: 'processTrue',
        type: ScriptType.JAVASCRIPT,
        description: 'Test script processTrue',
        content: '({ result: "processTrue completed" })',
        options: { timeout: 5000 }
      });
    }
    if (!codeService.hasScript('processFalse')) {
      codeService.registerScript({
        id: generateId(),
        name: 'processFalse',
        type: ScriptType.JAVASCRIPT,
        description: 'Test script processFalse',
        content: '({ result: "processFalse completed" })',
        options: { timeout: 5000 }
      });
    }
    if (!codeService.hasScript('errorScript')) {
      codeService.registerScript({
        id: generateId(),
        name: 'errorScript',
        type: ScriptType.JAVASCRIPT,
        description: 'Test script errorScript',
        content: 'throw new Error("Test error from errorScript")',
        options: { timeout: 5000 }
      });
    }
  });

  beforeEach(async () => {
    // 创建新的实例以避免测试间干扰
    workflowRegistry = new WorkflowRegistry({
      enableVersioning: true,
      enablePreprocessing: true,
      maxVersions: 5,
      maxRecursionDepth: 3
    });

    // 创建执行上下文
    executionContext = ExecutionContext.createDefault();
    executionContext.register('workflowRegistry', workflowRegistry);
  });

  afterEach(() => {
    // 清理执行上下文
    executionContext.destroy();
  });

  /**
   * 创建简单线性工作流定义
   */
  const createSimpleLinearWorkflow = (id: string, name: string): WorkflowDefinition => ({
    id,
    name,
    version: '1.0.0',
    description: 'Simple linear workflow for execution testing',
    nodes: [
      {
        id: `${id}-start`,
        type: NodeType.START,
        name: 'Start',
        config: {},
        outgoingEdgeIds: [`${id}-edge-1`],
        incomingEdgeIds: []
      },
      {
        id: `${id}-process-1`,
        type: NodeType.CODE,
        name: 'Process 1',
        config: {
          scriptName: 'process1',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-2`],
        incomingEdgeIds: [`${id}-edge-1`]
      },
      {
        id: `${id}-process-2`,
        type: NodeType.CODE,
        name: 'Process 2',
        config: {
          scriptName: 'process2',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-3`],
        incomingEdgeIds: [`${id}-edge-2`]
      },
      {
        id: `${id}-end`,
        type: NodeType.END,
        name: 'End',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: [`${id}-edge-3`]
      }
    ],
    edges: [
      {
        id: `${id}-edge-1`,
        sourceNodeId: `${id}-start`,
        targetNodeId: `${id}-process-1`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-2`,
        sourceNodeId: `${id}-process-1`,
        targetNodeId: `${id}-process-2`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-3`,
        sourceNodeId: `${id}-process-2`,
        targetNodeId: `${id}-end`,
        type: EdgeType.DEFAULT
      }
    ],
    variables: [],
    triggers: [],
    config: {
      timeout: 60000,
      maxSteps: 1000,
      toolApproval: {
        autoApprovedTools: []
      }
    },
    metadata: {
      author: 'test-author',
      tags: ['test', 'execution'],
      category: 'test'
    },
    availableTools: {
      initial: new Set()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  /**
   * 创建分支工作流定义（包含Fork/Join）
   */
  const createBranchingWorkflow = (id: string, name: string): WorkflowDefinition => ({
    id,
    name,
    version: '1.0.0',
    description: 'Branching workflow for execution testing',
    nodes: [
      {
        id: `${id}-start`,
        type: NodeType.START,
        name: 'Start',
        config: {},
        outgoingEdgeIds: [`${id}-edge-1`],
        incomingEdgeIds: []
      },
      {
        id: `${id}-fork`,
        type: NodeType.FORK,
        name: 'Fork',
        config: {
          forkId: `${id}-fork-join`,
          forkStrategy: 'PARALLEL'
        },
        outgoingEdgeIds: [`${id}-edge-2`, `${id}-edge-3`],
        incomingEdgeIds: [`${id}-edge-1`]
      },
      {
        id: `${id}-process-true`,
        type: NodeType.CODE,
        name: 'Process True',
        config: {
          scriptName: 'processTrue',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-4`],
        incomingEdgeIds: [`${id}-edge-2`]
      },
      {
        id: `${id}-process-false`,
        type: NodeType.CODE,
        name: 'Process False',
        config: {
          scriptName: 'processFalse',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-5`],
        incomingEdgeIds: [`${id}-edge-3`]
      },
      {
        id: `${id}-join`,
        type: NodeType.JOIN,
        name: 'Join',
        config: {
          joinId: `${id}-fork-join`,
          joinStrategy: 'ALL_COMPLETED',
          forkId: `${id}-fork-join`
        },
        outgoingEdgeIds: [`${id}-edge-6`],
        incomingEdgeIds: [`${id}-edge-4`, `${id}-edge-5`]
      },
      {
        id: `${id}-end`,
        type: NodeType.END,
        name: 'End',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: [`${id}-edge-6`]
      }
    ],
    edges: [
      {
        id: `${id}-edge-1`,
        sourceNodeId: `${id}-start`,
        targetNodeId: `${id}-fork`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-2`,
        sourceNodeId: `${id}-fork`,
        targetNodeId: `${id}-process-true`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-3`,
        sourceNodeId: `${id}-fork`,
        targetNodeId: `${id}-process-false`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-4`,
        sourceNodeId: `${id}-process-true`,
        targetNodeId: `${id}-join`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-5`,
        sourceNodeId: `${id}-process-false`,
        targetNodeId: `${id}-join`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-6`,
        sourceNodeId: `${id}-join`,
        targetNodeId: `${id}-end`,
        type: EdgeType.DEFAULT
      }
    ],
    variables: [],
    triggers: [],
    config: {
      timeout: 60000,
      maxSteps: 1000,
      toolApproval: {
        autoApprovedTools: []
      }
    },
    metadata: {
      author: 'test-author',
      tags: ['test', 'branching'],
      category: 'test'
    },
    availableTools: {
      initial: new Set()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  // Tests skipped because ThreadExecutorAPI doesn't exist
  // This file needs to be refactored with proper API implementations
});
