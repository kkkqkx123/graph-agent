import { injectable, inject } from 'inversify';
import { ExecutionContext } from './execution-context';

@injectable()
export class StateManager {
  constructor() {}

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

  async updateNodeState(context: ExecutionContext, nodeId: any, result: any): Promise<void> {
    // Mark node as executed
    context.markNodeExecuted(nodeId);
    
    // Store node result
    context.setNodeResult(nodeId, result);
    
    // Update execution metadata
    context.setMetadata('lastNodeExecuted', nodeId.value || nodeId);
    context.setMetadata('lastNodeExecutionTime', new Date().toISOString());
    
    // Save checkpoint if configured
    if (this.shouldSaveCheckpoint(context, 'node_execution')) {
      await this.saveCheckpoint(context, 'node_execution', { nodeId: nodeId.value || nodeId });
    }
    
    // Record node execution in history
    await this.recordHistory(context, 'node_executed', {
      nodeId: nodeId.value || nodeId,
      result: result,
      executionTime: context.getElapsedTime()
    });
  }

  async updateEdgeState(context: ExecutionContext, edgeId: any, result: boolean): Promise<void> {
    // Store edge evaluation result
    context.setEdgeResult(edgeId, result);
    
    // Update execution metadata
    context.setMetadata('lastEdgeEvaluated', edgeId.value || edgeId);
    context.setMetadata('lastEdgeEvaluationTime', new Date().toISOString());
    
    // Record edge evaluation in history
    await this.recordHistory(context, 'edge_evaluated', {
      edgeId: edgeId.value || edgeId,
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
    // Simplified checkpoint implementation
    console.log(`Saving checkpoint: ${type}`, data);
  }

  async loadCheckpoint(checkpointId: any): Promise<ExecutionContext | null> {
    // Simplified checkpoint loading
    console.log(`Loading checkpoint: ${checkpointId}`);
    return null;
  }

  async recordHistory(context: ExecutionContext, type: string, data: any): Promise<void> {
    // Simplified history recording
    console.log(`Recording history: ${type}`, data);
  }

  async getExecutionHistory(sessionId: any, threadId: any): Promise<any[]> {
    return [];
  }

  async getExecutionCheckpoints(sessionId: any, threadId: any): Promise<any[]> {
    return [];
  }

  async cleanupOldStates(sessionId: any, retentionDays: number = 30): Promise<void> {
    // Simplified cleanup
    console.log(`Cleaning up old states for session: ${sessionId}`);
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
  async getExecutionStats(sessionId: any, threadId: any): Promise<any> {
    const history = await this.getExecutionHistory(sessionId, threadId);
    const checkpoints = await this.getExecutionCheckpoints(sessionId, threadId);

    const executions = this.groupExecutions(history);
    const stats: any = {
      totalExecutions: executions.size,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      checkpointsCreated: checkpoints.length,
      executions: []
    };

    let totalExecutionTime = 0;

    for (const execution of Array.from(executions.values())) {
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
    stats.averageExecutionTime = executions.size > 0 ? totalExecutionTime / executions.size : 0;

    return stats;
  }

  private groupExecutions(history: any[]): Map<string, any[]> {
    const executions = new Map<string, any[]>();

    for (const entry of history) {
      const executionId = entry?.data?.executionId || 'unknown';
      
      if (!executions.has(executionId)) {
        executions.set(executionId, []);
      }
      
      executions.get(executionId)?.push(entry);
    }

    return executions;
  }

  private analyzeExecution(executionHistory: any[]): any {
    const startEntry = executionHistory.find((entry: any) => entry.type === 'workflow_initialized');
    const endEntry = executionHistory.find((entry: any) =>
      entry.type === 'workflow_completed' || entry.type === 'workflow_failed'
    );

    const status = endEntry?.type === 'workflow_completed' ? 'completed' : 'failed';
    const startTime = startEntry?.timestamp ? new Date(startEntry.timestamp).getTime() : 0;
    const endTime = endEntry?.timestamp ? new Date(endEntry.timestamp).getTime() : 0;
    const duration = endTime - startTime;

    const nodeExecutions = executionHistory.filter((entry: any) => entry.type === 'node_executed');
    const edgeEvaluations = executionHistory.filter((entry: any) => entry.type === 'edge_evaluated');

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