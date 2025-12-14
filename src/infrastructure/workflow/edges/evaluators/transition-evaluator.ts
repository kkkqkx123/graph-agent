import { injectable } from 'inversify';
import { ITransitionEvaluator } from '../../../../domain/workflow/graph/interfaces/transition-evaluator.interface';
import { Edge } from '../../../../domain/workflow/graph/entities/edge';
import { ExecutionContext } from '../../engine/execution-context';

@injectable()
export class TransitionEvaluator implements ITransitionEvaluator {
  async evaluate(edge: Edge, context: ExecutionContext): Promise<boolean> {
    try {
      const transition = edge.condition;
      
      // If no transition is specified, default to true
      if (!transition) {
        return true;
      }
      
      // Parse transition if it's a string
      let parsedTransition;
      if (typeof transition === 'string') {
        try {
          parsedTransition = JSON.parse(transition);
        } catch (parseError) {
          // If it's not valid JSON, treat it as a simple expression
          return true; // Default to true for simple expressions
        }
      } else {
        parsedTransition = transition;
      }
      
      // Evaluate based on transition type
      switch (parsedTransition.type) {
        case 'always':
          return true;
        case 'never':
          return false;
        case 'probability':
          return this.evaluateProbability(parsedTransition, context);
        case 'timeout':
          return this.evaluateTimeout(parsedTransition, context);
        case 'retry':
          return this.evaluateRetry(parsedTransition, context);
        case 'rate_limit':
          return this.evaluateRateLimit(parsedTransition, context);
        case 'schedule':
          return this.evaluateSchedule(parsedTransition, context);
        case 'state':
          return this.evaluateState(parsedTransition, context);
        case 'custom':
          return this.evaluateCustom(parsedTransition, context);
        default:
          throw new Error(`Unknown transition type: ${parsedTransition.type}`);
      }
    } catch (error) {
      throw new Error(`Transition evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private evaluateProbability(transition: any, context: ExecutionContext): boolean {
    const probability = transition.probability || 0.5;
    const seed = transition.seed || Math.random();
    
    // Ensure probability is between 0 and 1
    const clampedProbability = Math.max(0, Math.min(1, probability));
    
    // Generate random number and compare
    const random = Math.random();
    const result = random <= clampedProbability;
    
    // Store evaluation metadata
    context.setVariable(`transition_${transition.type}_result`, {
      probability: clampedProbability,
      random: random,
      result: result,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  private evaluateTimeout(transition: any, context: ExecutionContext): boolean {
    const timeout = transition.timeout;
    const startTime = transition.startTime || context.getStartTime();
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    
    const result = elapsedTime >= timeout;
    
    // Store evaluation metadata
    context.setVariable(`transition_${transition.type}_result`, {
      timeout: timeout,
      startTime: startTime,
      currentTime: currentTime,
      elapsedTime: elapsedTime,
      result: result,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  private evaluateRetry(transition: any, context: ExecutionContext): boolean {
    const maxRetries = transition.maxRetries || 3;
    const retryCount = context.getVariable('retry_count') || 0;
    const retryDelay = transition.retryDelay || 1000;
    const lastRetryTime = context.getVariable('last_retry_time') || 0;
    const currentTime = Date.now();
    
    // Check if we've exceeded max retries
    if (retryCount >= maxRetries) {
      return false;
    }
    
    // Check if enough time has passed since last retry
    if (currentTime - lastRetryTime < retryDelay) {
      return false;
    }
    
    // Update retry metadata
    context.setVariable('retry_count', retryCount + 1);
    context.setVariable('last_retry_time', currentTime);
    
    const result = true;
    
    // Store evaluation metadata
    context.setVariable(`transition_${transition.type}_result`, {
      maxRetries: maxRetries,
      retryCount: retryCount + 1,
      retryDelay: retryDelay,
      lastRetryTime: currentTime,
      result: result,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  private evaluateRateLimit(transition: any, context: ExecutionContext): boolean {
    const limit = transition.limit || 10;
    const window = transition.window || 60000; // 1 minute default
    const currentTime = Date.now();
    
    // Get previous executions from context
    const executions = context.getVariable('rate_limit_executions') || [];
    
    // Filter executions within the time window
    const recentExecutions = executions.filter((time: number) => 
      currentTime - time < window
    );
    
    // Check if we're under the limit
    const result = recentExecutions.length < limit;
    
    if (result) {
      // Add current execution to the list
      recentExecutions.push(currentTime);
      context.setVariable('rate_limit_executions', recentExecutions);
    }
    
    // Store evaluation metadata
    context.setVariable(`transition_${transition.type}_result`, {
      limit: limit,
      window: window,
      recentExecutions: recentExecutions.length,
      result: result,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  private evaluateSchedule(transition: any, context: ExecutionContext): boolean {
    const schedule = transition.schedule;
    const currentTime = new Date();
    
    if (!schedule) {
      return false;
    }
    
    let result = false;
    
    if (schedule.type === 'cron') {
      // Simple cron evaluation - in production, use a proper cron library
      result = this.evaluateCronSchedule(schedule.expression, currentTime);
    } else if (schedule.type === 'interval') {
      result = this.evaluateIntervalSchedule(schedule, context, currentTime);
    } else if (schedule.type === 'specific') {
      result = this.evaluateSpecificSchedule(schedule, currentTime);
    }
    
    // Store evaluation metadata
    context.setVariable(`transition_${transition.type}_result`, {
      schedule: schedule,
      currentTime: currentTime.toISOString(),
      result: result,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  private evaluateCronSchedule(expression: string, currentTime: Date): boolean {
    // Simplified cron evaluation - in production, use a proper cron library
    // This is a very basic implementation for demonstration
    
    const now = {
      minute: currentTime.getMinutes(),
      hour: currentTime.getHours(),
      day: currentTime.getDate(),
      month: currentTime.getMonth() + 1,
      dayOfWeek: currentTime.getDay()
    };
    
    // Parse cron expression (simplified)
    const parts = expression.split(' ');
    if (parts.length !== 5) {
      return false;
    }
    
    const [minute, hour, day, month, dayOfWeek] = parts;
    
    // Check each field (simplified)
    if (minute !== '*' && minute !== undefined && parseInt(minute) !== now.minute) {
      return false;
    }
    
    if (hour !== '*' && hour !== undefined && parseInt(hour) !== now.hour) {
      return false;
    }
    
    if (day !== '*' && day !== undefined && parseInt(day) !== now.day) {
      return false;
    }
    
    if (month !== '*' && month !== undefined && parseInt(month) !== now.month) {
      return false;
    }
    
    if (dayOfWeek !== '*' && dayOfWeek !== undefined && parseInt(dayOfWeek) !== now.dayOfWeek) {
      return false;
    }
    
    return true;
  }

  private evaluateIntervalSchedule(schedule: any, context: ExecutionContext, currentTime: Date): boolean {
    const interval = schedule.interval || 3600000; // 1 hour default
    const lastExecution = context.getVariable('last_scheduled_execution') || 0;
    
    const result = currentTime.getTime() - lastExecution >= interval;
    
    if (result) {
      context.setVariable('last_scheduled_execution', currentTime.getTime());
    }
    
    return result;
  }

  private evaluateSpecificSchedule(schedule: any, currentTime: Date): boolean {
    const specificTimes = schedule.times || [];
    
    for (const time of specificTimes) {
      const scheduledTime = new Date(time);
      
      // Check if the scheduled time is within the current minute
      if (
        scheduledTime.getFullYear() === currentTime.getFullYear() &&
        scheduledTime.getMonth() === currentTime.getMonth() &&
        scheduledTime.getDate() === currentTime.getDate() &&
        scheduledTime.getHours() === currentTime.getHours() &&
        scheduledTime.getMinutes() === currentTime.getMinutes()
      ) {
        return true;
      }
    }
    
    return false;
  }

  private evaluateState(transition: any, context: ExecutionContext): boolean {
    const expectedState = transition.state;
    const statePath = transition.path || 'state';
    const currentState = this.getContextValue(statePath, context);
    
    const result = currentState === expectedState;
    
    // Store evaluation metadata
    context.setVariable(`transition_${transition.type}_result`, {
      expectedState: expectedState,
      currentState: currentState,
      statePath: statePath,
      result: result,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }

  private evaluateCustom(transition: any, context: ExecutionContext): boolean {
    const functionName = transition.function;
    const parameters = transition.parameters || {};
    
    // Get function from context
    const func = context.getVariable(`function_${functionName}`);
    
    if (typeof func !== 'function') {
      throw new Error(`Custom transition function '${functionName}' not found or not a function`);
    }
    
    // Prepare parameters
    const preparedParameters = this.prepareParameters(parameters, context);
    
    try {
      const result = func(preparedParameters, context);
      
      // Store evaluation metadata
      context.setVariable(`transition_${transition.type}_result`, {
        functionName: functionName,
        parameters: preparedParameters,
        result: result,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      throw new Error(`Custom transition function execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
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

  private prepareParameters(parameters: any, context: ExecutionContext): any {
    const prepared: any = {};
    
    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const path = value.slice(2, -2).trim();
        prepared[key] = this.getContextValue(path, context);
      } else {
        prepared[key] = value;
      }
    }
    
    return prepared;
  }

  async validate(edge: Edge): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const transition = edge.condition;
    
    // If no transition, it's valid
    if (!transition) {
      return { valid: true, errors };
    }
    
    // Parse transition if it's a string
    let parsedTransition;
    if (typeof transition === 'string') {
      try {
        parsedTransition = JSON.parse(transition);
      } catch (parseError) {
        // If it's not valid JSON, it's valid as a simple expression
        return { valid: true, errors };
      }
    } else {
      parsedTransition = transition;
    }
    
    // Validate transition based on type
    switch (parsedTransition.type) {
      case 'probability':
        if (parsedTransition.probability === undefined ||
            typeof parsedTransition.probability !== 'number' ||
            parsedTransition.probability < 0 ||
            parsedTransition.probability > 1) {
          errors.push('Probability transition requires a probability between 0 and 1');
        }
        break;
        
      case 'timeout':
        if (parsedTransition.timeout === undefined ||
            typeof parsedTransition.timeout !== 'number' ||
            parsedTransition.timeout < 0) {
          errors.push('Timeout transition requires a non-negative timeout');
        }
        break;
        
      case 'retry':
        if (parsedTransition.maxRetries === undefined ||
            typeof parsedTransition.maxRetries !== 'number' ||
            parsedTransition.maxRetries < 0) {
          errors.push('Retry transition requires a non-negative maxRetries');
        }
        break;
        
      case 'rate_limit':
        if (parsedTransition.limit === undefined ||
            typeof parsedTransition.limit !== 'number' ||
            parsedTransition.limit < 0) {
          errors.push('Rate limit transition requires a non-negative limit');
        }
        if (parsedTransition.window === undefined ||
            typeof parsedTransition.window !== 'number' ||
            parsedTransition.window < 0) {
          errors.push('Rate limit transition requires a non-negative window');
        }
        break;
        
      case 'schedule':
        if (!parsedTransition.schedule) {
          errors.push('Schedule transition requires a schedule configuration');
        }
        break;
        
      case 'state':
        if (parsedTransition.state === undefined) {
          errors.push('State transition requires a state value');
        }
        break;
        
      case 'custom':
        if (!parsedTransition.function) {
          errors.push('Custom transition requires a function name');
        }
        break;
        
      default:
        errors.push(`Unknown transition type: ${parsedTransition.type}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  getSupportedEdgeTypes(): string[] {
    return [
      'always',
      'never',
      'probability',
      'timeout',
      'retry',
      'rate_limit',
      'schedule',
      'state',
      'custom'
    ];
  }
}