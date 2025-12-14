import { injectable, inject } from 'inversify';
import { ExecutionContext } from './execution-context';
import { NodeId } from '../../../../domain/workflow/submodules/graph/value-objects/node-id';
import { EdgeId } from '../../../../domain/workflow/submodules/graph/value-objects/edge-id';
import { CheckpointRepository } from '../../../database/repositories/checkpoint/checkpoint-repository';
import { HistoryRepository } from '../../../database/repositories/history/history-repository';
import { Checkpoint } from '../../../../domain/checkpoint/entities/checkpoint';
import { CheckpointId } from '../../../../domain/checkpoint/value-objects/checkpoint-id';
import { History } from '../../../../domain/history/entities/history';
import { HistoryId } from '../../../../domain/history/value-objects/history-id';
import { SessionId } from '../../../../domain/session/value-objects/session-id';
import { ThreadId } from '../../../../domain/thread/value-objects/thread-id';

@injectable()
export class StateManager {
  constructor(
    @inject('CheckpointRepository') private checkpointRepository: CheckpointRepository,
    @inject('HistoryRepository') private historyRepository: HistoryRepository
  ) {}

  async initialize(context: ExecutionContext): Promise<void> {
    // Initialize execution state
    context.setMetadata('initialized', true);
    context.setMetadata('initializedAt', new Date().toISOString());
    
    // Save initial checkpoint if configured
    if (this.shouldSaveCheckpoint(context, 'initialization')) {
      await this.saveCheckpoint(context, 'initialization');
    }
    
    // Record initialization in history
    await this.recordHistory(context, 'workflow_initialized', {
      graphId: context.getGraph().id.value,
      graphName: context.getGraph().name,
      executionId: context.getExecutionId()
    });
  }

  async updateNodeState(context: ExecutionContext, nodeId: NodeId, result: any): Promise<void> {
    // Mark node as executed
    context.markNodeExecuted(nodeId);
    
    // Store node result
    context.setNodeResult(nodeId, result);
    
    // Update execution metadata
    context.setMetadata('lastNodeExecuted', nodeId.value);
    context.setMetadata('lastNodeExecutionTime', new Date().toISOString());
    
    // Save checkpoint if configured
    if (this.shouldSaveCheckpoint(context, 'node_execution')) {
      await this.saveCheckpoint(context, 'node_execution', { nodeId: nodeId.value });
    }
    
    // Record node execution in history
    await this.recordHistory(context, 'node_executed', {
      nodeId: nodeId.value,
      result: result,
      executionTime: context.getElapsedTime()
    });
  }

  async updateEdgeState(context: ExecutionContext, edgeId: EdgeId, result: boolean): Promise<void> {
    // Store edge evaluation result
    context.setEdgeResult(edgeId, result);
    
    // Update execution metadata
    context.setMetadata('lastEdgeEvaluated', edgeId.value);
    context.setMetadata('lastEdgeEvaluationTime', new Date().toISOString());
    
    // Record edge evaluation in history
    await this.recordHistory(context, 'edge_evaluated', {
      edgeId: edgeId.value,
      result: result,
      executionTime: context.getElapsedTime()
    });
  }

  async saveFinalState(context: ExecutionContext, result: any): Promise<void> {
    // Update execution metadata
    context.setMetadata('completed', true);
    context.setMetadata('completedAt', new Date().toISOString());
    context.setMetadata('totalExecutionTime', context.getElapsedTime());
    context.setVariable('finalResult', result);
    
    // Save final checkpoint
    await this.saveCheckpoint(context, 'completion', { result });
    
    // Record completion in history
    await this.recordHistory(context, 'workflow_completed', {
      result: result,
      totalExecutionTime: context.getElapsedTime(),
      executedNodes: context.getExecutedNodes().size,
      totalNodes: context.getGraph().nodes.size
    });
  }

  async saveErrorState(context: ExecutionContext, error: Error): Promise<void> {
    // Update execution metadata
    context.setMetadata('failed', true);
    context.setMetadata('failedAt', new Date().toISOString());
    context.setMetadata('error', error.message);
    context.setVariable('error', error);
    
    // Save error checkpoint
    await this.saveCheckpoint(context, 'error', { 
      error: error.message,
      stack: error.stack 
    });
    
    // Record error in history
    await this.recordHistory(context, 'workflow_failed', {
      error: error.message,
      stack: error.stack,
      executionTime: context.getElapsedTime(),
      executedNodes: context.getExecutedNodes().size
    });
  }

  async saveCheckpoint(context: ExecutionContext, type: string, data?: any): Promise<void> {
    const checkpoint = new Checkpoint(
      new CheckpointId(this.generateCheckpointId()),
      new SessionId(context.getVariable('sessionId') || 'default'),
      new ThreadId(context.getVariable('threadId') || 'default'),
      type,
      {
        executionContext: context.toJSON(),
        data: data || {}
      },
      {
        graphId: context.getGraph().id.value,
        executionId: context.getExecutionId(),
        timestamp: new Date().toISOString()
      }
    );

    await this.checkpointRepository.save(checkpoint);
  }

  async loadCheckpoint(checkpointId: CheckpointId): Promise<ExecutionContext | null> {
    const checkpoint = await this.checkpointRepository.findById(checkpointId);
    if (!checkpoint) {
      return null;
    }

    // Restore execution context from checkpoint
    const contextData = checkpoint.state.executionContext;
    
    // Note: This would require the Graph to be loaded separately
    // For now, we return the context data
    return contextData as ExecutionContext;
  }

  async recordHistory(context: ExecutionContext, type: string, data: any): Promise<void> {
    const history = new History(
      new HistoryId(this.generateHistoryId()),
      new SessionId(context.getVariable('sessionId') || 'default'),
      new ThreadId(context.getVariable('threadId') || 'default'),
      type,
      {
        executionId: context.getExecutionId(),
        graphId: context.getGraph().id.value,
        data: data
      },
      {
        timestamp: new Date().toISOString(),
        elapsedTime: context.getElapsedTime()
      }
    );

    await this.historyRepository.save(history);
  }

  async getExecutionHistory(sessionId: SessionId, threadId: ThreadId): Promise<History[]> {
    return this.historyRepository.findBySessionIdAndThreadId(sessionId, threadId);
  }

  async getExecutionCheckpoints(sessionId: SessionId, threadId: ThreadId): Promise<Checkpoint[]> {
    return this.checkpointRepository.findBySessionIdAndThreadId(sessionId, threadId);
  }

  async cleanupOldStates(sessionId: SessionId, retentionDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Clean up old checkpoints
    await this.checkpointRepository.deleteOlderThan(cutoffDate);
    
    // Clean up old history
    await this.historyRepository.deleteOlderThan(cutoffDate);
  }

  private shouldSaveCheckpoint(context: ExecutionContext, trigger: string): boolean {
    // Check if checkpointing is enabled
    const checkpointEnabled = context.getMetadata('checkpointEnabled') !== false;
    
    if (!checkpointEnabled) {
      return false;
    }

    // Check trigger-specific rules
    const checkpointConfig = context.getMetadata('checkpointConfig') || {};
    
    switch (trigger) {
      case 'initialization':
        return checkpointConfig.onInitialization !== false;
      
      case 'node_execution':
        return checkpointConfig.onNodeExecution === true;
      
      case 'completion':
        return checkpointConfig.onCompletion !== false;
      
      case 'error':
        return checkpointConfig.onError !== false;
      
      default:
        return false;
    }
  }

  private generateCheckpointId(): string {
    return `ckpt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateHistoryId(): string {
    return `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Analytics and monitoring methods
  async getExecutionStats(sessionId: SessionId, threadId: ThreadId): Promise<any> {
    const history = await this.getExecutionHistory(sessionId, threadId);
    const checkpoints = await this.getExecutionCheckpoints(sessionId, threadId);

    const executions = this.groupExecutions(history);
    const stats = {
      totalExecutions: executions.length,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      checkpointsCreated: checkpoints.length,
      executions: []
    };

    let totalExecutionTime = 0;

    for (const execution of executions) {
      const executionStats = this.analyzeExecution(execution);
      stats.executions.push(executionStats);
      
      if (executionStats.status === 'completed') {
        stats.successfulExecutions++;
      } else {
        stats.failedExecutions++;
      }
      
      totalExecutionTime += executionStats.duration;
    }

    stats.totalExecutionTime = totalExecutionTime;
    stats.averageExecutionTime = executions.length > 0 ? totalExecutionTime / executions.length : 0;

    return stats;
  }

  private groupExecutions(history: History[]): Map<string, History[]> {
    const executions = new Map<string, History[]>();

    for (const entry of history) {
      const executionId = entry.data.executionId;
      
      if (!executions.has(executionId)) {
        executions.set(executionId, []);
      }
      
      executions.get(executionId)!.push(entry);
    }

    return executions;
  }

  private analyzeExecution(executionHistory: History[]): any {
    const startEntry = executionHistory.find(entry => entry.type === 'workflow_initialized');
    const endEntry = executionHistory.find(entry => 
      entry.type === 'workflow_completed' || entry.type === 'workflow_failed'
    );

    const status = endEntry?.type === 'workflow_completed' ? 'completed' : 'failed';
    const startTime = startEntry?.timestamp ? new Date(startEntry.timestamp).getTime() : 0;
    const endTime = endEntry?.timestamp ? new Date(endEntry.timestamp).getTime() : 0;
    const duration = endTime - startTime;

    const nodeExecutions = executionHistory.filter(entry => entry.type === 'node_executed');
    const edgeEvaluations = executionHistory.filter(entry => entry.type === 'edge_evaluated');

    return {
      status,
      startTime,
      endTime,
      duration,
      nodeExecutions: nodeExecutions.length,
      edgeEvaluations: edgeEvaluations.length,
      error: endEntry?.data?.error || null
    };
  }
}