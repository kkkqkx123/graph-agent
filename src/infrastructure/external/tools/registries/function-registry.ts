import { injectable } from 'inversify';

@injectable()
export class FunctionRegistry {
  private functions: Map<string, Function> = new Map();
  private functionSchemas: Map<string, any> = new Map();

  registerFunction(name: string, func: Function, schema?: any): void {
    if (this.functions.has(name)) {
      throw new Error(`Function '${name}' is already registered`);
    }

    this.functions.set(name, func);
    if (schema) {
      this.functionSchemas.set(name, schema);
    }
  }

  unregisterFunction(name: string): void {
    this.functions.delete(name);
    this.functionSchemas.delete(name);
  }

  hasFunction(name: string): boolean {
    return this.functions.has(name);
  }

  getFunction(name: string): Function | null {
    return this.functions.get(name) || null;
  }

  getFunctionSchema(name: string): any | null {
    return this.functionSchemas.get(name) || null;
  }

  getAllFunctions(): Array<{ name: string; func: Function; schema?: any }> {
    const result: Array<{ name: string; func: Function; schema?: any }> = [];
    
    for (const [name, func] of this.functions.entries()) {
      result.push({
        name,
        func,
        schema: this.functionSchemas.get(name)
      });
    }
    
    return result;
  }

  getFunctionNames(): string[] {
    return Array.from(this.functions.keys());
  }

  async callFunction(name: string, ...args: any[]): Promise<any> {
    const func = this.functions.get(name);
    if (!func) {
      throw new Error(`Function '${name}' not found`);
    }

    try {
      return await func(...args);
    } catch (error) {
      throw new Error(`Error calling function '${name}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  validateFunctionCall(name: string, args: any[]): { valid: boolean; errors: string[] } {
    const schema = this.functionSchemas.get(name);
    if (!schema) {
      // No schema to validate against
      return { valid: true, errors: [] };
    }

    const errors: string[] = [];

    // Check parameter count
    if (schema.parameters) {
      const { required = [], properties = {} } = schema.parameters;
      
      if (args.length < required.length) {
        errors.push(`Function '${name}' requires at least ${required.length} arguments, but ${args.length} were provided`);
      }

      // Validate each argument against schema
      for (let i = 0; i < args.length; i++) {
        const paramNames = Object.keys(properties);
        const paramName = paramNames[i];
        
        if (paramName && properties[paramName]) {
          const paramSchema = properties[paramName];
          const validationError = this.validateArgument(args[i], paramSchema, `Argument ${i + 1}`);
          
          if (validationError) {
            errors.push(validationError);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateArgument(value: any, schema: any, context: string): string | null {
    const { type, enum: enumValues, minimum, maximum, minLength, maxLength, pattern } = schema;

    // Type validation
    if (type && !this.isValidType(value, type)) {
      return `${context} must be of type ${type}`;
    }

    // Enum validation
    if (enumValues && !enumValues.includes(value)) {
      return `${context} must be one of: ${enumValues.join(', ')}`;
    }

    // Number validation
    if (type === 'number' || type === 'integer') {
      if (minimum !== undefined && value < minimum) {
        return `${context} must be at least ${minimum}`;
      }
      
      if (maximum !== undefined && value > maximum) {
        return `${context} must be at most ${maximum}`;
      }
      
      if (type === 'integer' && !Number.isInteger(value)) {
        return `${context} must be an integer`;
      }
    }

    // String validation
    if (type === 'string') {
      if (minLength !== undefined && value.length < minLength) {
        return `${context} must be at least ${minLength} characters long`;
      }
      
      if (maxLength !== undefined && value.length > maxLength) {
        return `${context} must be at most ${maxLength} characters long`;
      }
      
      if (pattern && !new RegExp(pattern).test(value)) {
        return `${context} does not match required pattern`;
      }
    }

    // Array validation
    if (type === 'array') {
      if (!Array.isArray(value)) {
        return `${context} must be an array`;
      }
      
      if (schema.items) {
        for (let i = 0; i < value.length; i++) {
          const itemError = this.validateArgument(value[i], schema.items, `${context}[${i}]`);
          if (itemError) {
            return itemError;
          }
        }
      }
    }

    // Object validation
    if (type === 'object') {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return `${context} must be an object`;
      }
      
      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          if (value[propName] !== undefined) {
            const propError = this.validateArgument(
              value[propName],
              propSchema as any,
              `${context}.${propName}`
            );
            
            if (propError) {
              return propError;
            }
          }
        }
      }
    }

    return null;
  }

  private isValidType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'integer':
        return typeof value === 'number' && Number.isInteger(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'null':
        return value === null;
      default:
        return true;
    }
  }

  clear(): void {
    this.functions.clear();
    this.functionSchemas.clear();
  }

  getStats(): {
    totalFunctions: number;
    functionsWithSchemas: number;
    functionsByType: Record<string, number>;
  } {
    const functionsByType: Record<string, number> = {};
    let functionsWithSchemas = 0;

    for (const [name, schema] of this.functionSchemas.entries()) {
      functionsWithSchemas++;
      
      if (schema && schema.parameters && schema.parameters.properties) {
        for (const propSchema of Object.values(schema.parameters.properties)) {
          const type = (propSchema as any).type;
          if (type) {
            functionsByType[type] = (functionsByType[type] || 0) + 1;
          }
        }
      }
    }

    return {
      totalFunctions: this.functions.size,
      functionsWithSchemas,
      functionsByType
    };
  }
}