import { injectable } from 'inversify';
import { IConditionEvaluator } from '../../../../domain/workflow/submodules/graph/interfaces/condition-evaluator.interface';
import { Edge } from '../../../../domain/workflow/submodules/graph/entities/edge';
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
      
      // Evaluate based on condition type
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
    } catch (error) {
      throw new Error(`Condition evaluation failed: ${error.message}`);
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
      throw new Error(`Failed to evaluate expression: ${error.message}`);
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
        return operands.every(operand => this.evaluateCondition(operand, context));
      case 'or':
        return operands.some(operand => this.evaluateCondition(operand, context));
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
      throw new Error(`Custom function execution failed: ${error.message}`);
    }
  }

  private evaluateNodeResult(condition: any, context: ExecutionContext): boolean {
    const nodeId = condition.nodeId;
    const resultPath = condition.resultPath || 'success';
    const operator = condition.operator || 'equals';
    const expectedValue = condition.value;
    
    // Get node result from context
    const nodeResult = context.getNodeResult(new NodeId(nodeId));
    
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
    
    // Validate condition based on type
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
        
      default:
        errors.push(`Unknown condition type: ${condition.type}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}