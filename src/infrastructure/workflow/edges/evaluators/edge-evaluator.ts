import { injectable } from 'inversify';
import { EdgeId } from '@domain/workflow/value-objects/edge-id';
import { Workflow } from '@domain/workflow/entities/workflow';
import { ExecutionContext } from '../../execution/execution-context.interface';

@injectable()
export class EdgeEvaluator {
  async evaluate(edgeId: EdgeId, workflow: Workflow, context: ExecutionContext): Promise<boolean> {
    const edge = workflow.getEdge(edgeId);
    if (!edge) {
      throw new Error(`Edge with ID ${edgeId.value} not found in workflow`);
    }
    try {
      const condition = edge.condition;
      
      // If no condition is specified, default to true
      if (!condition) {
        return true;
      }
      
      // Parse condition if it's a string
      let parsedCondition;
      if (typeof condition === 'string') {
        try {
          parsedCondition = JSON.parse(condition);
        } catch (parseError) {
          // If it's not valid JSON, treat it as a simple expression
          return this.evaluateExpression(condition, context);
        }
      } else {
        parsedCondition = condition;
      }
      
      // Check if it's a transition or condition based on structure
      if (parsedCondition.type && this.isTransitionType(parsedCondition.type)) {
        return this.evaluateTransition(parsedCondition, context);
      } else {
        return this.evaluateCondition(parsedCondition, context);
      }
    } catch (error) {
      throw new Error(`Edge evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private isTransitionType(type: string): boolean {
    return [
      'always', 'never', 'probability', 'timeout', 'retry', 
      'rate_limit', 'schedule', 'state', 'custom'
    ].includes(type);
  }

  private evaluateTransition(transition: any, context: ExecutionContext): boolean {
    switch (transition.type) {
      case 'always':
        return true;
      case 'never':
        return false;
      case 'probability':
        return this.evaluateProbability(transition, context);
      case 'timeout':
        return this.evaluateTimeout(transition, context);
      case 'retry':
        return this.evaluateRetry(transition, context);
      case 'rate_limit':
        return this.evaluateRateLimit(transition, context);
      case 'schedule':
        return this.evaluateSchedule(transition, context);
      case 'state':
        return this.evaluateState(transition, context);
      case 'custom':
        return this.evaluateCustom(transition, context);
      default:
        throw new Error(`Unknown transition type: ${transition.type}`);
    }
  }

  private evaluateCondition(condition: any, context: ExecutionContext): boolean {
    switch (condition.type) {
      case 'expression':
        return this.evaluateExpression(condition.expression, context);
      case 'comparison':
        return this.evaluateComparison(condition, context);
      case 'logical':
        return this.evaluateLogical(condition, context);
      case 'existence':
        return this.evaluateExistence(condition, context);
      case 'custom':
        return this.evaluateCustom(condition, context);
      case 'node_result':
        return this.evaluateNodeResult(condition, context);
      case 'variable':
        return this.evaluateVariable(condition, context);
      default:
        // If no type specified, treat as simple expression
        return this.evaluateExpression(condition, context);
    }
  }

  private evaluateExpression(expression: string, context: ExecutionContext): boolean {
    // Replace variables in expression
    const evaluatedExpression = this.interpolateTemplate(expression, context);
    
    try {
      // WARNING: This is a simplified implementation and may be unsafe
      // In production, use a proper expression evaluator
      return Function('"use strict"; return (' + evaluatedExpression + ')')();
    } catch (error) {
      throw new Error(`Failed to evaluate expression: ${error instanceof Error ? error.message : String(error)}`);
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
    const startTime = transition.startTime || context.startTime.getMilliseconds();
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

  private evaluateComparison(condition: any, context: ExecutionContext): boolean {
    const left = this.getValue(condition.left, context);
    const right = this.getValue(condition.right, context);
    const operator = condition.operator;
    
    switch (operator) {
      case 'equals':
        return left === right;
      case 'not_equals':
        return left !== right;
      case 'greater_than':
        return left > right;
      case 'greater_than_or_equal':
        return left >= right;
      case 'less_than':
        return left < right;
      case 'less_than_or_equal':
        return left <= right;
      case 'contains':
        return String(left).includes(String(right));
      case 'starts_with':
        return String(left).startsWith(String(right));
      case 'ends_with':
        return String(left).endsWith(String(right));
      case 'matches':
        return new RegExp(String(right)).test(String(left));
      case 'in':
        return Array.isArray(right) && right.includes(left);
      case 'not_in':
        return Array.isArray(right) && !right.includes(left);
      default:
        throw new Error(`Unknown comparison operator: ${operator}`);
    }
  }

  private evaluateLogical(condition: any, context: ExecutionContext): boolean {
    const operator = condition.operator;
    const operands = condition.operands || [];
    
    switch (operator) {
      case 'and':
        return operands.every((operand: any) => this.evaluateCondition(operand, context));
      case 'or':
        return operands.some((operand: any) => this.evaluateCondition(operand, context));
      case 'not':
        if (operands.length !== 1) {
          throw new Error('NOT operator requires exactly one operand');
        }
        return !this.evaluateCondition(operands[0], context);
      default:
        throw new Error(`Unknown logical operator: ${operator}`);
    }
  }

  private evaluateExistence(condition: any, context: ExecutionContext): boolean {
    const path = condition.path;
    const value = this.getContextValue(path, context);
    
    switch (condition.check) {
      case 'exists':
        return value !== undefined && value !== null;
      case 'not_exists':
        return value === undefined || value === null;
      case 'empty':
        return value === undefined || value === null || value === '' || 
               (Array.isArray(value) && value.length === 0) ||
               (typeof value === 'object' && Object.keys(value).length === 0);
      case 'not_empty':
        return value !== undefined && value !== null && value !== '' && 
               (!Array.isArray(value) || value.length > 0) &&
               (typeof value !== 'object' || Object.keys(value).length > 0);
      default:
        throw new Error(`Unknown existence check: ${condition.check}`);
    }
  }

  private evaluateNodeResult(condition: any, context: ExecutionContext): boolean {
    const nodeId = condition.nodeId;
    const resultPath = condition.resultPath || 'success';
    const operator = condition.operator || 'equals';
    const expectedValue = condition.value;
    
    // Get node result from context
    const nodeResult = context.getNodeResult({ value: nodeId } as any);
    
    if (nodeResult === undefined) {
      throw new Error(`Node result not found for node: ${nodeId}`);
    }
    
    // Get specific value from result
    const actualValue = this.getNestedValue(nodeResult, resultPath);
    
    // Compare with expected value
    switch (operator) {
      case 'equals':
        return actualValue === expectedValue;
      case 'not_equals':
        return actualValue !== expectedValue;
      case 'truthy':
        return Boolean(actualValue);
      case 'falsy':
        return !Boolean(actualValue);
      default:
        throw new Error(`Unknown node result operator: ${operator}`);
    }
  }

  private evaluateVariable(condition: any, context: ExecutionContext): boolean {
    const variableName = condition.variable;
    const operator = condition.operator || 'exists';
    const value = condition.value;
    
    // Get variable from context
    const variableValue = context.getVariable(variableName);
    
    switch (operator) {
      case 'exists':
        return variableValue !== undefined && variableValue !== null;
      case 'not_exists':
        return variableValue === undefined || variableValue === null;
      case 'equals':
        return variableValue === value;
      case 'not_equals':
        return variableValue !== value;
      case 'truthy':
        return Boolean(variableValue);
      case 'falsy':
        return !Boolean(variableValue);
      default:
        throw new Error(`Unknown variable operator: ${operator}`);
    }
  }

  private getValue(value: any, context: ExecutionContext): any {
    if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
      // Extract variable path
      const path = value.slice(2, -2).trim();
      return this.getContextValue(path, context);
    }
    
    return value;
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

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private interpolateTemplate(template: string, context: ExecutionContext): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getContextValue(path, context);
      return value !== undefined ? String(value) : 'undefined';
    });
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

  async validate(edgeId: EdgeId, workflow: Workflow): Promise<{ valid: boolean; errors: string[] }> {
    const edge = workflow.getEdge(edgeId);
    if (!edge) {
      return { valid: false, errors: [`Edge with ID ${edgeId.value} not found in workflow`] };
    }
    const errors: string[] = [];
    const condition = edge.condition;
    
    // If no condition, it's valid
    if (!condition) {
      return { valid: true, errors };
    }
    
    // Parse condition if it's a string
    let parsedCondition;
    if (typeof condition === 'string') {
      try {
        parsedCondition = JSON.parse(condition);
      } catch (parseError) {
        // If it's not valid JSON, treat it as a simple expression
        // Just check if it's a non-empty string
        if (condition.trim().length === 0) {
          errors.push('Expression condition cannot be empty');
        }
        return { valid: errors.length === 0, errors };
      }
    } else {
      parsedCondition = condition;
    }
    
    // Check if it's a transition or condition
    if (parsedCondition.type && this.isTransitionType(parsedCondition.type)) {
      return this.validateTransition(parsedCondition, errors);
    } else {
      return this.validateCondition(parsedCondition, errors);
    }
  }

  private validateTransition(transition: any, errors: string[]): { valid: boolean; errors: string[] } {
    switch (transition.type) {
      case 'probability':
        if (transition.probability === undefined ||
            typeof transition.probability !== 'number' ||
            transition.probability < 0 ||
            transition.probability > 1) {
          errors.push('Probability transition requires a probability between 0 and 1');
        }
        break;
        
      case 'timeout':
        if (transition.timeout === undefined ||
            typeof transition.timeout !== 'number' ||
            transition.timeout < 0) {
          errors.push('Timeout transition requires a non-negative timeout');
        }
        break;
        
      case 'retry':
        if (transition.maxRetries === undefined ||
            typeof transition.maxRetries !== 'number' ||
            transition.maxRetries < 0) {
          errors.push('Retry transition requires a non-negative maxRetries');
        }
        break;
        
      case 'rate_limit':
        if (transition.limit === undefined ||
            typeof transition.limit !== 'number' ||
            transition.limit < 0) {
          errors.push('Rate limit transition requires a non-negative limit');
        }
        if (transition.window === undefined ||
            typeof transition.window !== 'number' ||
            transition.window < 0) {
          errors.push('Rate limit transition requires a non-negative window');
        }
        break;
        
      case 'schedule':
        if (!transition.schedule) {
          errors.push('Schedule transition requires a schedule configuration');
        }
        break;
        
      case 'state':
        if (transition.state === undefined) {
          errors.push('State transition requires a state value');
        }
        break;
        
      case 'custom':
        if (!transition.function) {
          errors.push('Custom transition requires a function name');
        }
        break;
        
      default:
        errors.push(`Unknown transition type: ${transition.type}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateCondition(condition: any, errors: string[]): { valid: boolean; errors: string[] } {
    switch (condition.type) {
      case 'expression':
        if (!condition.expression) {
          errors.push('Expression condition requires an expression');
        }
        break;
        
      case 'comparison':
        if (!condition.left || !condition.right || !condition.operator) {
          errors.push('Comparison condition requires left, right, and operator');
        }
        break;
        
      case 'logical':
        if (!condition.operator || !condition.operands) {
          errors.push('Logical condition requires operator and operands');
        }
        break;
        
      case 'existence':
        if (!condition.path || !condition.check) {
          errors.push('Existence condition requires path and check');
        }
        break;
        
      case 'custom':
        if (!condition.function) {
          errors.push('Custom condition requires a function name');
        }
        break;
        
      case 'node_result':
        if (!condition.nodeId) {
          errors.push('Node result condition requires a nodeId');
        }
        break;
        
      case 'variable':
        if (!condition.variable) {
          errors.push('Variable condition requires a variable name');
        }
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  extractVariables(edgeId: EdgeId, workflow: Workflow): string[] {
    const edge = workflow.getEdge(edgeId);
    if (!edge) {
      return [];
    }
    const condition = edge.condition;
    if (!condition) {
      return [];
    }
    
    const variables = new Set<string>();
    
    // Parse condition if it's a string
    let parsedCondition;
    if (typeof condition === 'string') {
      try {
        parsedCondition = JSON.parse(condition);
      } catch (parseError) {
        // If it's not valid JSON, extract variables from the string expression
        const matches = condition.match(/\{\{(\w+(?:\.\w+)*)\}\}/g);
        if (matches) {
          matches.forEach(match => {
            const variable = match.slice(2, -2).trim();
            variables.add(variable);
          });
        }
        return Array.from(variables);
      }
    } else {
      parsedCondition = condition;
    }
    
    // Extract variables based on condition type
    if (parsedCondition.type && this.isTransitionType(parsedCondition.type)) {
      this.extractVariablesFromTransition(parsedCondition, variables);
    } else {
      this.extractVariablesFromCondition(parsedCondition, variables);
    }
    
    return Array.from(variables);
  }

  private extractVariablesFromTransition(transition: any, variables: Set<string>): void {
    switch (transition.type) {
      case 'state':
        if (transition.path) {
          variables.add(transition.path);
        }
        break;
      case 'custom':
        if (transition.parameters) {
          this.extractVariablesFromValue(transition.parameters, variables);
        }
        break;
    }
  }

  private extractVariablesFromCondition(condition: any, variables: Set<string>): void {
    switch (condition.type) {
      case 'expression':
        const matches = condition.expression.match(/\{\{(\w+(?:\.\w+)*)\}\}/g);
        if (matches) {
          matches.forEach((match: string) => {
            const variable = match.slice(2, -2).trim();
            variables.add(variable);
          });
        }
        break;
        
      case 'comparison':
        this.extractVariablesFromValue(condition.left, variables);
        this.extractVariablesFromValue(condition.right, variables);
        break;
        
      case 'logical':
        if (condition.operands) {
          condition.operands.forEach((operand: any) => {
            this.extractVariablesFromCondition(operand, variables);
          });
        }
        break;
        
      case 'existence':
        variables.add(condition.path);
        break;
        
      case 'variable':
        variables.add(condition.variable);
        break;
        
      case 'node_result':
        variables.add(condition.nodeId);
        break;
        
      case 'custom':
        if (condition.parameters) {
          this.extractVariablesFromValue(condition.parameters, variables);
        }
        break;
    }
  }


  private extractVariablesFromValue(value: any, variables: Set<string>): void {
    if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
      const variable = value.slice(2, -2).trim();
      variables.add(variable);
    } else if (Array.isArray(value)) {
      value.forEach(item => this.extractVariablesFromValue(item, variables));
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(item => this.extractVariablesFromValue(item, variables));
    }
  }

  getSupportedEdgeTypes(): string[] {
    return [
      // Condition types
      'expression',
      'comparison',
      'logical',
      'existence',
      'node_result',
      'variable',
      'custom',
      // Transition types
      'always',
      'never',
      'probability',
      'timeout',
      'retry',
      'rate_limit',
      'schedule',
      'state'
    ];
  }
}