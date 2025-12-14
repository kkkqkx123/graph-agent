import { injectable } from 'inversify';
import { IExpressionEvaluator } from '../../../../domain/workflow/graph/interfaces/expression-evaluator.interface';
import { ExecutionContext } from '../../engine/execution-context';

@injectable()
export class ExpressionEvaluator implements IExpressionEvaluator {
  async evaluate(expression: string, context: ExecutionContext): Promise<any> {
    try {
      // Replace variables in expression
      const evaluatedExpression = this.interpolateTemplate(expression, context);
      
      // Evaluate the expression
      return this.evaluateExpression(evaluatedExpression, context);
    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private evaluateExpression(expression: string, context: ExecutionContext): any {
    // Create a safe evaluation context
    const evalContext = this.createEvalContext(context);
    
    try {
      // Use Function constructor for safer evaluation
      const func = new Function(...Object.keys(evalContext), `return ${expression}`);
      return func(...Object.values(evalContext));
    } catch (error) {
      throw new Error(`Failed to evaluate expression: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private createEvalContext(context: ExecutionContext): Record<string, any> {
    const evalContext: Record<string, any> = {};
    
    // Add common utility functions
    evalContext['abs'] = Math.abs;
    evalContext['ceil'] = Math.ceil;
    evalContext['floor'] = Math.floor;
    evalContext['max'] = Math.max;
    evalContext['min'] = Math.min;
    evalContext['pow'] = Math.pow;
    evalContext['round'] = Math.round;
    evalContext['sqrt'] = Math.sqrt;
    evalContext['random'] = Math.random;
    
    // Add string utility functions
    evalContext['startsWith'] = (str: string, prefix: string) => str.startsWith(prefix);
    evalContext['endsWith'] = (str: string, suffix: string) => str.endsWith(suffix);
    evalContext['includes'] = (str: string, search: string) => str.includes(search);
    evalContext['split'] = (str: string, separator: string) => str.split(separator);
    evalContext['join'] = (arr: string[], separator: string) => arr.join(separator);
    evalContext['toLowerCase'] = (str: string) => str.toLowerCase();
    evalContext['toUpperCase'] = (str: string) => str.toUpperCase();
    evalContext['trim'] = (str: string) => str.trim();
    
    // Add array utility functions
    evalContext['isArray'] = Array.isArray;
    evalContext['length'] = (arr: any[]) => arr.length;
    evalContext['first'] = (arr: any[]) => arr[0];
    evalContext['last'] = (arr: any[]) => arr[arr.length - 1];
    evalContext['sum'] = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    evalContext['avg'] = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    
    // Add date utility functions
    evalContext['now'] = () => new Date();
    evalContext['timestamp'] = () => Date.now();
    evalContext['date'] = (dateString?: string) => dateString ? new Date(dateString) : new Date();
    evalContext['formatDate'] = (date: Date, format: string) => {
      // Simple date formatting - in production, use a proper date library
      return date.toISOString();
    };
    
    // Add type checking functions
    evalContext['isString'] = (value: any) => typeof value === 'string';
    evalContext['isNumber'] = (value: any) => typeof value === 'number';
    evalContext['isBoolean'] = (value: any) => typeof value === 'boolean';
    evalContext['isObject'] = (value: any) => typeof value === 'object' && value !== null && !Array.isArray(value);
    evalContext['isArray'] = Array['isArray'];
    evalContext['isNull'] = (value: any) => value === null;
    evalContext['isUndefined'] = (value: any) => value === undefined;
    
    // Add context variables
    for (const [key, value] of context.getAllVariables()) {
      evalContext[key] = value;
    }
    
    // Add context metadata
    for (const [key, value] of context.getAllMetadata()) {
      evalContext[`meta_${key}`] = value;
    }
    
    // Add special context values
    evalContext['input'] = context.getInput();
    evalContext['executionId'] = context.getExecutionId();
    evalContext['elapsedTime'] = context.getElapsedTime();
    evalContext['executedNodes'] = Array.from(context.getExecutedNodes());
    
    return evalContext;
  }

  private interpolateTemplate(template: string, context: ExecutionContext): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getContextValue(path, context);
      return value !== undefined ? this.formatValue(value) : 'undefined';
    });
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

  private formatValue(value: any): string {
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  }

  async validate(expression: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    if (!expression || typeof expression !== 'string') {
      errors.push('Expression must be a non-empty string');
      return { valid: false, errors };
    }
    
    // Basic syntax validation
    try {
      // Check for balanced parentheses
      const openParens = (expression.match(/\(/g) || []).length;
      const closeParens = (expression.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        errors.push('Unbalanced parentheses in expression');
      }
      
      // Check for balanced brackets
      const openBrackets = (expression.match(/\[/g) || []).length;
      const closeBrackets = (expression.match(/\]/g) || []).length;
      if (openBrackets !== closeBrackets) {
        errors.push('Unbalanced brackets in expression');
      }
      
      // Check for balanced braces
      const openBraces = (expression.match(/\{/g) || []).length;
      const closeBraces = (expression.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        errors.push('Unbalanced braces in expression');
      }
      
      // Try to parse the expression (basic check)
      // This is a simplified validation - in production, use a proper parser
      new Function(`return ${expression}`);
    } catch (error) {
      errors.push(`Invalid expression syntax: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Advanced expression evaluation with custom functions
  async evaluateWithFunctions(
    expression: string, 
    context: ExecutionContext, 
    functions: Record<string, Function>
  ): Promise<any> {
    try {
      // Replace variables in expression
      const evaluatedExpression = this.interpolateTemplate(expression, context);
      
      // Create evaluation context with custom functions
      const evalContext = {
        ...this.createEvalContext(context),
        ...functions
      };
      
      // Evaluate the expression
      const func = new Function(...Object.keys(evalContext), `return ${evaluatedExpression}`);
      return func(...Object.values(evalContext));
    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Batch evaluation of multiple expressions
  async evaluateBatch(
    expressions: string[], 
    context: ExecutionContext
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    const errors: Record<string, string> = {};
    
    for (const expression of expressions) {
      try {
        results[expression] = await this.evaluate(expression, context);
      } catch (error) {
        errors[expression] = error instanceof Error ? error.message : String(error);
      }
    }
    
    if (Object.keys(errors).length > 0) {
      throw new Error(`Batch evaluation failed: ${JSON.stringify(errors)}`);
    }
    
    return results;
  }

  // Compile expression for repeated evaluation
  async compile(expression: string): Promise<(context: ExecutionContext) => any> {
    // Pre-validate expression
    const validation = await this.validate(expression);
    if (!validation.valid) {
      throw new Error(`Cannot compile invalid expression: ${validation.errors.join(', ')}`);
    }
    
    return (context: ExecutionContext) => {
      const evaluatedExpression = this.interpolateTemplate(expression, context);
      const evalContext = this.createEvalContext(context);
      const func = new Function(...Object.keys(evalContext), `return ${evaluatedExpression}`);
      return func(...Object.values(evalContext));
    };
  }

  extractVariables(expression: string): string[] {
    const variables = new Set<string>();
    
    // Extract variables from template syntax {{variable.path}}
    const matches = expression.match(/\{\{(\w+(?:\.\w+)*)\}\}/g);
    if (matches) {
      matches.forEach((match: string) => {
        const variable = match.slice(2, -2).trim();
        variables.add(variable);
      });
    }
    
    // Extract variables from function calls and property access
    // This is a simplified implementation - in production, use a proper parser
    const functionMatches = expression.match(/(\w+)\(/g);
    if (functionMatches) {
      functionMatches.forEach((match: string) => {
        const functionName = match.slice(0, -1);
        // Only add if it's not a known function
        const knownFunctions = [
          'abs', 'ceil', 'floor', 'max', 'min', 'pow', 'round', 'sqrt', 'random',
          'startsWith', 'endsWith', 'includes', 'split', 'join', 'toLowerCase', 'toUpperCase', 'trim',
          'isArray', 'length', 'first', 'last', 'sum', 'avg',
          'now', 'timestamp', 'date', 'formatDate',
          'isString', 'isNumber', 'isBoolean', 'isObject', 'isNull', 'isUndefined'
        ];
        if (!knownFunctions.includes(functionName)) {
          variables.add(functionName);
        }
      });
    }
    
    // Extract property access patterns
    const propertyMatches = expression.match(/(\w+)\./g);
    if (propertyMatches) {
      propertyMatches.forEach((match: string) => {
        const propertyName = match.slice(0, -1);
        variables.add(propertyName);
      });
    }
    
    return Array.from(variables);
  }
}