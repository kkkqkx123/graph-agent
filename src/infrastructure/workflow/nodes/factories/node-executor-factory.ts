import { injectable, inject } from 'inversify';
import { INodeExecutor } from '../../interfaces/node-executor.interface';
import { LLMNodeExecutor } from '../executors/llm-node-executor';
import { ToolNodeExecutor } from '../executors/tool-node-executor';
import { ConditionNodeExecutor } from '../executors/condition-node-executor';
import { WaitNodeExecutor } from '../executors/wait-node-executor';
import { DataTransformNodeExecutor } from '../executors/data-transform-node-executor';

@injectable()
export class NodeExecutorFactory {
  private executors: Map<string, INodeExecutor> = new Map();

  constructor(
    @inject('LLMNodeExecutor') private llmNodeExecutor: LLMNodeExecutor,
    @inject('ToolNodeExecutor') private toolNodeExecutor: ToolNodeExecutor,
    @inject('ConditionNodeExecutor') private conditionNodeExecutor: ConditionNodeExecutor,
    @inject('WaitNodeExecutor') private waitNodeExecutor: WaitNodeExecutor,
    @inject('DataTransformNodeExecutor') private dataTransformNodeExecutor: DataTransformNodeExecutor
  ) {
    this.registerDefaultExecutors();
  }

  createExecutor(nodeType: string): INodeExecutor {
    const executor = this.executors.get(nodeType);

    if (!executor) {
      throw new Error(`No executor found for node type: ${nodeType}`);
    }

    return executor;
  }

  registerExecutor(nodeType: string, executor: INodeExecutor): void {
    this.executors.set(nodeType, executor);
  }

  unregisterExecutor(nodeType: string): void {
    this.executors.delete(nodeType);
  }

  getSupportedNodeTypes(): string[] {
    return Array.from(this.executors.keys());
  }

  hasExecutor(nodeType: string): boolean {
    return this.executors.has(nodeType);
  }

  private registerDefaultExecutors(): void {
    this.executors.set('llm', this.llmNodeExecutor);
    this.executors.set('tool', this.toolNodeExecutor);
    this.executors.set('condition', this.conditionNodeExecutor);
    this.executors.set('wait', this.waitNodeExecutor);
    this.executors.set('data_transform', this.dataTransformNodeExecutor);
    this.executors.set('transform', this.dataTransformNodeExecutor);
    this.executors.set('data-mapping', this.dataTransformNodeExecutor);
  }
}