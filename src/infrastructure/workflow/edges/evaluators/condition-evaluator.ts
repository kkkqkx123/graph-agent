import { injectable } from 'inversify';
import { IConditionEvaluator } from '../../../../domain/workflow/graph/interfaces/condition-evaluator.interface';
import { Edge } from '../../../../domain/workflow/graph/entities/edge';
import { ExecutionContext } from '../../engine/execution-context';

@injectable()
export class ConditionEvaluator implements IConditionEvaluator {
  async evaluate(edge: Edge, context: ExecutionContext): Promise<boolean> {
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
      
      // Evaluate based on condition type
      switch (parsedCondition.type) {
        case 'expression':
          return this.evaluateExpression(parsedCondition.expression, context);
        case 'comparison':
          return this.evaluateComparison(parsedCondition, context);
        case 'logical':
          return this.evaluateLogical(parsedCondition, context);
        case 'existence':
          return this.evaluateExistence(parsedCondition, context);
        case 'custom':
          return this.evaluateCustom(parsedCondition, context);
        case 'node_result':
          return this.evaluateNodeResult(parsedCondition, context);
        case 'variable':
          return this.evaluateVariable(parsedCondition, context);
        default:
          throw new Error(`Unknown condition type: ${parsedCondition.type}`);
      }
    } catch (error) {
      throw new Error(`Condition evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
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

  private evaluateCustom(condition: any, context: ExecutionContext): boolean {
    const functionName = condition.function;
    const parameters = condition.parameters || {};
    
    // Get function from context
    const func = context.getVariable(`function_${functionName}`);
    
    if (typeof func !== 'function') {
      throw new Error(`Custom function '${functionName}' not found or not a function`);
    }
    
    // Prepare parameters
    const preparedParameters = this.prepareParameters(parameters, context);
    
    try {
      return func(preparedParameters, context);
    } catch (error) {
      throw new Error(`Custom function execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private evaluateNodeResult(condition: any, context: ExecutionContext): boolean {
    const nodeId = condition.nodeId;
    const resultPath = condition.resultPath || 'success';
    const operator = condition.operator || 'equals';
    const expectedValue = condition.value;
    
    // Get node result from context
    const nodeResult = context.getNodeResult(nodeId);
    
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
        throw new Error(`Unknown condition type: ${condition.type}`);
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

  async validate(edge: Edge): Promise<{ valid: boolean; errors: string[] }> {
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
    
    // Validate condition based on type
    switch (parsedCondition.type) {
      case 'expression':
        if (!parsedCondition.expression) {
          errors.push('Expression condition requires an expression');
        }
        break;
        
      case 'comparison':
        if (!parsedCondition.left || !parsedCondition.right || !parsedCondition.operator) {
          errors.push('Comparison condition requires left, right, and operator');
        }
        break;
        
      case 'logical':
        if (!parsedCondition.operator || !parsedCondition.operands) {
          errors.push('Logical condition requires operator and operands');
        }
        break;
        
      case 'existence':
        if (!parsedCondition.path || !parsedCondition.check) {
          errors.push('Existence condition requires path and check');
        }
        break;
        
      case 'custom':
        if (!parsedCondition.function) {
          errors.push('Custom condition requires a function name');
        }
        break;
        
      case 'node_result':
        if (!parsedCondition.nodeId) {
          errors.push('Node result condition requires a nodeId');
        }
        break;
        
      case 'variable':
        if (!parsedCondition.variable) {
          errors.push('Variable condition requires a variable name');
        }
        break;
        
      default:
        errors.push(`Unknown condition type: ${parsedCondition.type}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  extractVariables(edge: Edge): string[] {
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
    switch (parsedCondition.type) {
      case 'expression':
        const matches = parsedCondition.expression.match(/\{\{(\w+(?:\.\w+)*)\}\}/g);
        if (matches) {
          matches.forEach((match: string) => {
            const variable = match.slice(2, -2).trim();
            variables.add(variable);
          });
        }
        break;
        
      case 'comparison':
        this.extractVariablesFromValue(parsedCondition.left, variables);
        this.extractVariablesFromValue(parsedCondition.right, variables);
        break;
        
      case 'logical':
        if (parsedCondition.operands) {
          parsedCondition.operands.forEach((operand: any) => {
            this.extractVariablesFromCondition(operand, variables);
          });
        }
        break;
        
      case 'existence':
        variables.add(parsedCondition.path);
        break;
        
      case 'variable':
        variables.add(parsedCondition.variable);
        break;
        
      case 'node_result':
        variables.add(parsedCondition.nodeId);
        break;
    }
    
    return Array.from(variables);
  }

  private extractVariablesFromCondition(condition: any, variables: Set<string>): void {
    if (typeof condition === 'string') {
      const matches = condition.match(/\{\{(\w+(?:\.\w+)*)\}\}/g);
      if (matches) {
        matches.forEach((match: string) => {
          const variable = match.slice(2, -2).trim();
          variables.add(variable);
        });
      }
    } else if (condition && typeof condition === 'object') {
      Object.values(condition).forEach(value => {
        this.extractVariablesFromValue(value, variables);
      });
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
}