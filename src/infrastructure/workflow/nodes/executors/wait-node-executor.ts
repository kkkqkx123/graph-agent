import { injectable } from 'inversify';
import { Node } from '../../../../domain/workflow/graph/entities/nodes/base/node';
import { ExecutionContext } from '../../engine/execution-context';

@injectable()
export class WaitNodeExecutor {
  async execute(node: Node, context: ExecutionContext): Promise<any> {
    try {
      const config = node.properties;
      const waitTime = this.calculateWaitTime(config, context);
      
      // Store wait start time
      const startTime = Date.now();
      context.setVariable(`wait_start_${node.id.value}`, startTime);
      
      // Perform the wait
      if (waitTime > 0) {
        await this.wait(waitTime);
      }
      
      // Calculate actual wait time
      const actualWaitTime = Date.now() - startTime;
      
      // Store wait metadata
      context.setVariable(`wait_metadata_${node.id.value}`, {
        nodeId: node.id.value,
        nodeName: node.name,
        requestedWaitTime: waitTime,
        actualWaitTime: actualWaitTime,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString()
      });
      
      return {
        waitTime: actualWaitTime,
        startedAt: startTime,
        completedAt: Date.now()
      };
    } catch (error) {
      throw new Error(`Wait node execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private calculateWaitTime(config: any, context: ExecutionContext): number {
    const waitType = config.type || 'fixed';
    
    switch (waitType) {
      case 'fixed':
        return this.getFixedWaitTime(config);
      case 'dynamic':
        return this.getDynamicWaitTime(config, context);
      case 'exponential':
        return this.getExponentialWaitTime(config, context);
      case 'random':
        return this.getRandomWaitTime(config);
      case 'scheduled':
        return this.getScheduledWaitTime(config, context);
      default:
        throw new Error(`Unknown wait type: ${waitType}`);
    }
  }

  private getFixedWaitTime(config: any): number {
    const duration = config.duration || 1000;
    
    if (typeof duration !== 'number' || duration < 0) {
      throw new Error('Fixed wait duration must be a non-negative number');
    }
    
    return duration;
  }

  private getDynamicWaitTime(config: any, context: ExecutionContext): number {
    const source = config.source;
    
    if (!source) {
      throw new Error('Dynamic wait requires a source configuration');
    }
    
    const value = this.getContextValue(source, context);
    
    if (value === undefined || value === null) {
      throw new Error(`Dynamic wait source '${source}' is not defined`);
    }
    
    let waitTime = Number(value);
    
    if (isNaN(waitTime) || waitTime < 0) {
      throw new Error(`Dynamic wait source '${source}' must be a non-negative number`);
    }
    
    // Apply multiplier if configured
    if (config.multiplier) {
      waitTime *= config.multiplier;
    }
    
    // Apply offset if configured
    if (config.offset) {
      waitTime += config.offset;
    }
    
    // Apply bounds if configured
    if (config.min !== undefined) {
      waitTime = Math.max(waitTime, config.min);
    }
    
    if (config.max !== undefined) {
      waitTime = Math.min(waitTime, config.max);
    }
    
    return waitTime;
  }

  private getExponentialWaitTime(config: any, context: ExecutionContext): number {
    const baseTime = config.baseTime || 1000;
    const multiplier = config.multiplier || 2;
    const maxTime = config.maxTime || 60000;
    const attemptSource = config.attemptSource || 'attempt_count';
    
    const attempt = this.getContextValue(attemptSource, context) || 1;
    
    let waitTime = baseTime * Math.pow(multiplier, attempt - 1);
    
    // Add jitter if configured
    if (config.jitter) {
      const jitterAmount = waitTime * config.jitter;
      waitTime += (Math.random() - 0.5) * jitterAmount;
    }
    
    // Apply bounds
    waitTime = Math.max(0, Math.min(waitTime, maxTime));
    
    return Math.round(waitTime);
  }

  private getRandomWaitTime(config: any): number {
    const min = config.min || 0;
    const max = config.max || 1000;
    
    if (min < 0 || max < 0) {
      throw new Error('Random wait bounds must be non-negative');
    }
    
    if (min >= max) {
      throw new Error('Random wait min must be less than max');
    }
    
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private getScheduledWaitTime(config: any, context: ExecutionContext): number {
    const scheduledTime = config.scheduledTime;
    const timezone = config.timezone || 'UTC';
    
    if (!scheduledTime) {
      throw new Error('Scheduled wait requires a scheduledTime configuration');
    }
    
    let targetTime: Date;
    
    if (typeof scheduledTime === 'string') {
      // Parse scheduled time string
      targetTime = new Date(scheduledTime);
    } else if (typeof scheduledTime === 'object') {
      // Build scheduled time from components
      const now = new Date();
      targetTime = new Date(
        scheduledTime.year || now.getFullYear(),
        scheduledTime.month || now.getMonth(),
        scheduledTime.day || now.getDate(),
        scheduledTime.hour || now.getHours(),
        scheduledTime.minute || now.getMinutes(),
        scheduledTime.second || now.getSeconds()
      );
    } else {
      throw new Error('Invalid scheduledTime configuration');
    }
    
    if (isNaN(targetTime.getTime())) {
      throw new Error('Invalid scheduled time');
    }
    
    const now = new Date();
    const waitTime = targetTime.getTime() - now.getTime();
    
    if (waitTime < 0) {
      // Scheduled time is in the past
      if (config.ifPast === 'skip') {
        return 0;
      } else if (config.ifPast === 'nextDay') {
        // Schedule for next day
        targetTime.setDate(targetTime.getDate() + 1);
        return targetTime.getTime() - now.getTime();
      } else {
        throw new Error('Scheduled time is in the past');
      }
    }
    
    return waitTime;
  }

  private getContextValue(path: string, context: ExecutionContext): any {
    const parts = path.split('.');
    let current: any = context;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        // Try to get from variables
        current = context.getVariable(part);
        if (current === undefined) {
          return undefined;
        }
      }
    }
    
    return current;
  }

  private wait(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  async canExecute(node: Node, context: ExecutionContext): Promise<boolean> {
    // Wait nodes can always execute if they have valid configuration
    const config = node.properties;
    const waitType = config['type'] || 'fixed';
    
    switch (waitType) {
      case 'fixed':
        return config['duration'] !== undefined && typeof config['duration'] === 'number' && config['duration'] >= 0;
      case 'dynamic':
        return config['source'] !== undefined;
      case 'exponential':
        return true; // Can always execute, will use defaults
      case 'random':
        return config['min'] !== undefined && config['max'] !== undefined && (config['min'] as number) < (config['max'] as number);
      case 'scheduled':
        return config['scheduledTime'] !== undefined;
      default:
        return false;
    }
  }

  async validate(node: Node): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const config = node.properties;
    
    // Check wait type
    const waitType = config['type'] || 'fixed';
    
    switch (waitType) {
      case 'fixed':
        if (config['duration'] === undefined) {
          errors.push('Fixed wait requires a duration');
        } else if (typeof config['duration'] !== 'number' || (config['duration'] as number) < 0) {
          errors.push('Fixed wait duration must be a non-negative number');
        }
        break;
        
      case 'dynamic':
        if (!config['source']) {
          errors.push('Dynamic wait requires a source');
        }
        break;
        
      case 'exponential':
        if (config['baseTime'] !== undefined && (typeof config['baseTime'] !== 'number' || (config['baseTime'] as number) < 0)) {
          errors.push('Exponential wait baseTime must be a non-negative number');
        }
        if (config['multiplier'] !== undefined && (typeof config['multiplier'] !== 'number' || (config['multiplier'] as number) <= 0)) {
          errors.push('Exponential wait multiplier must be a positive number');
        }
        if (config['maxTime'] !== undefined && (typeof config['maxTime'] !== 'number' || (config['maxTime'] as number) < 0)) {
          errors.push('Exponential wait maxTime must be a non-negative number');
        }
        break;
        
      case 'random':
        if (config['min'] !== undefined && (typeof config['min'] !== 'number' || (config['min'] as number) < 0)) {
          errors.push('Random wait min must be a non-negative number');
        }
        if (config['max'] !== undefined && (typeof config['max'] !== 'number' || (config['max'] as number) < 0)) {
          errors.push('Random wait max must be a non-negative number');
        }
        if (config['min'] !== undefined && config['max'] !== undefined && (config['min'] as number) >= (config['max'] as number)) {
          errors.push('Random wait min must be less than max');
        }
        break;
        
      case 'scheduled':
        if (!config['scheduledTime']) {
          errors.push('Scheduled wait requires a scheduledTime');
        }
        break;
        
      default:
        errors.push(`Unknown wait type: ${waitType}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  getSupportedNodeTypes(): string[] {
    return ['wait'];
  }
}