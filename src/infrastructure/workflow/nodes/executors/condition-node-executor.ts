import { injectable } from 'inversify';
import { Node } from '@domain/workflow/entities/nodes/base/node';
import { ExecutionContext } from '../../execution/execution-context.interface';

@injectable()
export class ConditionNodeExecutor {
  async execute(node: Node, context: ExecutionContext): Promise<any> {
    try {
      // Evaluate condition
      const result = this.evaluateCondition(node, context);

      // Store result in context
      context.setVariable(`condition_result_${node.nodeId.value}`, result);

      // Store condition metadata
      context.setVariable(`condition_metadata_${node.nodeId.value}`, {
        nodeId: node.nodeId.value,
        nodeName: node.name,
        condition: node.properties['condition'],
        result: result,
        evaluatedAt: new Date().toISOString()
      });

      return result;
    } catch (error) {
      throw new Error(`Condition node execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private evaluateCondition(node: Node, context: ExecutionContext): boolean {
    const condition = node.properties['condition'];

    if (!condition) {
      throw new Error('Condition node requires a condition configuration');
    }

    const conditionObj = condition as any;
    switch (conditionObj.type) {
      case 'expression':
        return this.evaluateExpression(conditionObj.expression, context);
      case 'comparison':
        return this.evaluateComparison(condition, context);
      case 'logical':
        return this.evaluateLogical(condition, context);
      case 'existence':
        return this.evaluateExistence(condition, context);
      case 'custom':
        return this.evaluateCustom(condition, context);
      default:
        throw new Error(`Unknown condition type: ${conditionObj.type}`);
    }
  }

  private evaluateExpression(expression: string, context: ExecutionContext): boolean {
    // Simple expression evaluation
    // In a real implementation, you would use a proper expression parser

    // Replace variables in expression
    const evaluatedExpression = this.interpolateTemplate(expression, context);

    // Evaluate the expression
    try {
      // WARNING: This is a simplified implementation and may be unsafe
      // In production, use a proper expression evaluator like mathjs or similar
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
        return operands.every((operand: any) => this.evaluateCondition({ properties: { condition: operand } } as any, context));
      case 'or':
        return operands.some((operand: any) => this.evaluateCondition({ properties: { condition: operand } } as any, context));
      case 'not':
        if (operands.length !== 1) {
          throw new Error('NOT operator requires exactly one operand');
        }
        return !this.evaluateCondition({ properties: { condition: operands[0] } } as any, context);
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
    // Custom condition evaluation
    // This would typically involve calling a custom function

    const functionName = condition.function;
    const parameters = condition.parameters || {};

    // Get function from registry or context
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

  async canExecute(node: Node, context: ExecutionContext): Promise<boolean> {
    // Check if node has required configuration
    const config = node.properties;

    if (!config['condition']) {
      return false;
    }

    return true;
  }

  async validate(node: Node): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const config = node.properties;

    // Check required fields
    if (!config['condition']) {
      errors.push('Condition node requires a condition configuration');
      return { valid: false, errors };
    }

    const condition = config['condition'] as any;

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

      default:
        errors.push(`Unknown condition type: ${condition.type}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
  getSupportedNodeTypes(): string[] {
    return ['condition'];
  }
}