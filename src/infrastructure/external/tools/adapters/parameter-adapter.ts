import { injectable } from 'inversify';

@injectable()
export class ParameterAdapter {
  adaptParameters(template: any, parameters: any): any {
    if (typeof template === 'string') {
      return this.interpolateString(template, parameters);
    }

    if (Array.isArray(template)) {
      return template.map(item => this.adaptParameters(item, parameters));
    }

    if (typeof template === 'object' && template !== null) {
      const result: any = {};
      
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.adaptParameters(value, parameters);
      }
      
      return result;
    }

    return template;
  }

  private interpolateString(template: string, parameters: any): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      return this.getParameterValue(path, parameters, match);
    });
  }

  private getParameterValue(path: string, parameters: any, defaultValue: any = null): any {
    const keys = path.split('.');
    let current = parameters;
    
    for (const key of keys) {
      if (current === null || current === undefined || current[key] === undefined) {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current;
  }

  validateParameters(schema: any, parameters: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!schema) {
      return { valid: true, errors };
    }

    // Check required parameters
    if (schema.required) {
      for (const requiredParam of schema.required) {
        if (parameters[requiredParam] === undefined || parameters[requiredParam] === null) {
          errors.push(`Required parameter '${requiredParam}' is missing`);
        }
      }
    }

    // Check parameter types
    if (schema.properties) {
      for (const [paramName, paramSchema] of Object.entries(schema.properties)) {
        if (parameters[paramName] !== undefined) {
          const typeError = this.validateParameterType(
            paramName, 
            parameters[paramName], 
            paramSchema as any
          );
          
          if (typeError) {
            errors.push(typeError);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateParameterType(paramName: string, value: any, schema: any): string | null {
    const { type, enum: enumValues } = schema;

    if (enumValues && !enumValues.includes(value)) {
      return `Parameter '${paramName}' must be one of: ${enumValues.join(', ')}`;
    }

    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return `Parameter '${paramName}' must be a string`;
        }
        
        if (schema.minLength !== undefined && value.length < schema.minLength) {
          return `Parameter '${paramName}' must be at least ${schema.minLength} characters long`;
        }
        
        if (schema.maxLength !== undefined && value.length > schema.maxLength) {
          return `Parameter '${paramName}' must be at most ${schema.maxLength} characters long`;
        }
        
        if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
          return `Parameter '${paramName}' does not match required pattern`;
        }
        break;

      case 'number':
        if (typeof value !== 'number') {
          return `Parameter '${paramName}' must be a number`;
        }
        
        if (schema.minimum !== undefined && value < schema.minimum) {
          return `Parameter '${paramName}' must be at least ${schema.minimum}`;
        }
        
        if (schema.maximum !== undefined && value > schema.maximum) {
          return `Parameter '${paramName}' must be at most ${schema.maximum}`;
        }
        break;

      case 'integer':
        if (typeof value !== 'number' || !Number.isInteger(value)) {
          return `Parameter '${paramName}' must be an integer`;
        }
        
        if (schema.minimum !== undefined && value < schema.minimum) {
          return `Parameter '${paramName}' must be at least ${schema.minimum}`;
        }
        
        if (schema.maximum !== undefined && value > schema.maximum) {
          return `Parameter '${paramName}' must be at most ${schema.maximum}`;
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return `Parameter '${paramName}' must be a boolean`;
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return `Parameter '${paramName}' must be an array`;
        }
        
        if (schema.minItems !== undefined && value.length < schema.minItems) {
          return `Parameter '${paramName}' must have at least ${schema.minItems} items`;
        }
        
        if (schema.maxItems !== undefined && value.length > schema.maxItems) {
          return `Parameter '${paramName}' must have at most ${schema.maxItems} items`;
        }
        
        if (schema.items) {
          for (let i = 0; i < value.length; i++) {
            const itemError = this.validateParameterType(
              `${paramName}[${i}]`,
              value[i],
              schema.items
            );
            
            if (itemError) {
              return itemError;
            }
          }
        }
        break;

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return `Parameter '${paramName}' must be an object`;
        }
        
        if (schema.properties) {
          for (const [propName, propSchema] of Object.entries(schema.properties)) {
            if (value[propName] !== undefined) {
              const propError = this.validateParameterType(
                `${paramName}.${propName}`,
                value[propName],
                propSchema as any
              );
              
              if (propError) {
                return propError;
              }
            }
          }
        }
        break;
    }

    return null;
  }

  transformParameters(parameters: any, transformations: any): any {
    if (!transformations) {
      return parameters;
    }

    let result = { ...parameters };

    for (const [targetPath, transformation] of Object.entries(transformations)) {
      const value = this.getParameterValue(transformation.source, parameters);
      
      if (value !== null) {
        this.setParameterValue(result, targetPath, this.applyTransformation(value, transformation));
      }
    }

    return result;
  }

  private setParameterValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  private applyTransformation(value: any, transformation: any): any {
    const { type, options } = transformation;

    switch (type) {
      case 'toString':
        return String(value);
      
      case 'toNumber':
        return Number(value);
      
      case 'toBoolean':
        return Boolean(value);
      
      case 'toUpperCase':
        return String(value).toUpperCase();
      
      case 'toLowerCase':
        return String(value).toLowerCase();
      
      case 'trim':
        return String(value).trim();
      
      case 'split':
        return String(value).split(options.delimiter || ',');
      
      case 'join':
        return Array.isArray(value) ? value.join(options.delimiter || ',') : value;
      
      case 'replace':
        return String(value).replace(
          new RegExp(options.search, options.flags || 'g'),
          options.replace
        );
      
      case 'dateFormat':
        // Simple date formatting - in real implementation, use a date library
        const date = new Date(value);
        return date.toISOString();
      
      case 'math':
        return this.applyMathOperation(value, options.operation);
      
      default:
        return value;
    }
  }

  private applyMathOperation(value: number, operation: string): number {
    switch (operation) {
      case 'round':
        return Math.round(value);
      case 'floor':
        return Math.floor(value);
      case 'ceil':
        return Math.ceil(value);
      case 'abs':
        return Math.abs(value);
      case 'sqrt':
        return Math.sqrt(value);
      default:
        return value;
    }
  }
}