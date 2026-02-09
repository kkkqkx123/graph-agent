# SDK API Resources 验证逻辑改进方案

## 1. 改进目标

基于现有分析，制定具体的改进方案，解决当前验证逻辑的不足：

1. **增强验证能力**：支持更复杂的验证规则
2. **提升复用性**：减少重复代码，提高开发效率
3. **支持异步验证**：处理需要异步操作的验证场景
4. **增加上下文感知**：支持基于上下文的条件验证
5. **实现配置化**：支持动态调整验证规则

## 2. 具体改进方案

### 2.1 增强验证能力

#### 2.1.1 引入验证规则引擎

创建通用的验证规则系统，支持多种验证类型：

```typescript
// sdk/api/validation/validation-rules.ts
export interface ValidationRule<T> {
  validate(value: T, context?: ValidationContext): ValidationResult;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// 常用验证规则
export const required = <T>(message = '字段不能为空'): ValidationRule<T | null | undefined> => ({
  validate: (value) => ({
    valid: value !== null && value !== undefined && value !== '',
    error: message
  }),
  message
});

export const minLength = (min: number, message = `长度不能少于${min}`): ValidationRule<string> => ({
  validate: (value) => ({
    valid: value.length >= min,
    error: message
  }),
  message
});

export const maxLength = (max: number, message = `长度不能超过${max}`): ValidationRule<string> => ({
  validate: (value) => ({
    valid: value.length <= max,
    error: message
  }),
  message
});

export const pattern = (regex: RegExp, message = '格式不正确'): ValidationRule<string> => ({
  validate: (value) => ({
    valid: regex.test(value),
    error: message
  }),
  message
});

export const range = (min: number, max: number, message = `值必须在${min}到${max}之间`): ValidationRule<number> => ({
  validate: (value) => ({
    valid: value >= min && value <= max,
    error: message
  }),
  message
});
```

#### 2.1.2 实现验证器组合

支持多个验证规则的组合：

```typescript
// sdk/api/validation/validator.ts
export class Validator<T> {
  private rules: Array<ValidationRule<any>> = [];
  
  addRule<R extends keyof T>(field: R, ...rules: ValidationRule<T[R]>[]): this {
    // 实现字段级验证规则组合
    return this;
  }
  
  addCustomRule(rule: ValidationRule<T>): this {
    this.rules.push(rule);
    return this;
  }
  
  async validate(data: T, context?: ValidationContext): Promise<ValidationResult> {
    for (const rule of this.rules) {
      const result = await rule.validate(data, context);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  }
}
```

### 2.2 提升复用性

#### 2.2.1 创建通用验证工具

提取通用的验证方法到工具类：

```typescript
// sdk/api/validation/common-validators.ts
export class CommonValidators {
  static validateRequiredFields<T>(data: T, fields: (keyof T)[], messages?: Record<string, string>): ValidationResult {
    const errors: string[] = [];
    
    for (const field of fields) {
      const value = data[field];
      if (value === null || value === undefined || value === '') {
        const message = messages?.[String(field)] || `${String(field)}不能为空`;
        errors.push(message);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  static validateStringLength(value: string, min: number, max: number, fieldName: string): ValidationResult {
    const errors: string[] = [];
    
    if (value.length < min) {
      errors.push(`${fieldName}长度不能少于${min}`);
    }
    if (value.length > max) {
      errors.push(`${fieldName}长度不能超过${max}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  static validatePositiveNumber(value: number, fieldName: string): ValidationResult {
    if (value < 0) {
      return {
        valid: false,
        errors: [`${fieldName}不能为负数`]
      };
    }
    return { valid: true, errors: [] };
  }
}
```

#### 2.2.2 重构现有资源API

使用通用验证工具重构现有验证逻辑：

```typescript
// 示例：重构ToolRegistryAPI的验证逻辑
protected override validateResource(tool: Tool): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 使用通用验证工具
  const requiredFields = CommonValidators.validateRequiredFields(tool, ['name', 'type', 'description']);
  errors.push(...requiredFields.errors);
  
  // 验证参数对象
  if (!tool.parameters || typeof tool.parameters !== 'object') {
    errors.push('工具参数定义无效');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### 2.3 支持异步验证

#### 2.3.1 修改基类验证方法

将验证方法改为异步：

```typescript
// sdk/api/resources/generic-resource-api.ts
/**
 * 验证资源（子类可以重写）
 * @param resource 资源对象
 * @returns 验证结果
 */
protected async validateResource(resource: T): Promise<{ valid: boolean; errors: string[] }> {
  // 默认实现：子类可以重写此方法
  return { valid: true, errors: [] };
}

/**
 * 验证更新内容（子类可以重写）
 * @param updates 更新内容
 * @returns 验证结果
 */
protected async validateUpdate(updates: Partial<T>): Promise<{ valid: boolean; errors: string[] }> {
  // 默认实现：子类可以重写此方法
  return { valid: true, errors: [] };
}
```

#### 2.3.2 更新CRUD方法

相应地更新create和update方法：

```typescript
/**
 * 创建新资源
 * @param resource 资源对象
 * @returns 执行结果
 */
async create(resource: T): Promise<ExecutionResult<void>> {
  const startTime = Date.now();
  
  try {
    // 验证资源（始终启用）
    const validation = await this.validateResource(resource);
    if (!validation.valid) {
      return failure(
        {
          message: `Validation failed: ${validation.errors.join(', ')}`,
          code: 'VALIDATION_ERROR'
        },
        Date.now() - startTime
      );
    }

    await this.createResource(resource);
    return success(undefined, Date.now() - startTime);
  } catch (error) {
    return this.handleError(error, 'CREATE', startTime);
  }
}
```

### 2.4 增加上下文感知

#### 2.4.1 扩展验证方法签名

在验证方法中添加上下文参数：

```typescript
/**
 * 验证资源（子类可以重写）
 * @param resource 资源对象
 * @param context 验证上下文
 * @returns 验证结果
 */
protected async validateResource(
  resource: T, 
  context?: ValidationContext
): Promise<{ valid: boolean; errors: string[] }> {
  // 默认实现：子类可以重写此方法
  return { valid: true, errors: [] };
}

export interface ValidationContext {
  userId?: string;
  tenantId?: string;
  operation?: 'create' | 'update' | 'delete';
  existingResource?: T;
  environment?: 'development' | 'production' | 'test';
}
```

#### 2.4.2 在CRUD方法中传递上下文

```typescript
async create(resource: T, context?: ValidationContext): Promise<ExecutionResult<void>> {
  const startTime = Date.now();
  
  try {
    const validation = await this.validateResource(resource, context);
    // ... 其余逻辑
  } catch (error) {
    // ... 错误处理
  }
}
```

### 2.5 实现配置化验证

#### 2.5.1 创建验证配置系统

```typescript
// sdk/api/validation/validation-config.ts
export interface ValidationConfig {
  enabled: boolean;
  rules: ValidationRuleConfig[];
  contextRules?: ContextValidationRule[];
}

export interface ValidationRuleConfig {
  field: string;
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'range' | 'custom';
  options?: any;
  message?: string;
}

export interface ContextValidationRule {
  condition: (context: ValidationContext) => boolean;
  rules: ValidationRuleConfig[];
}
```

#### 2.5.2 实现配置驱动的验证器

```typescript
// sdk/api/validation/configurable-validator.ts
export class ConfigurableValidator<T> {
  constructor(private config: ValidationConfig) {}
  
  async validate(data: T, context?: ValidationContext): Promise<ValidationResult> {
    if (!this.config.enabled) {
      return { valid: true };
    }
    
    // 应用基础规则
    for (const ruleConfig of this.config.rules) {
      const rule = this.createRuleFromConfig(ruleConfig);
      const result = await rule.validate(data[ruleConfig.field as keyof T]);
      if (!result.valid) {
        return result;
      }
    }
    
    // 应用上下文规则
    if (context && this.config.contextRules) {
      for (const contextRule of this.config.contextRules) {
        if (contextRule.condition(context)) {
          for (const ruleConfig of contextRule.rules) {
            const rule = this.createRuleFromConfig(ruleConfig);
            const result = await rule.validate(data[ruleConfig.field as keyof T]);
            if (!result.valid) {
              return result;
            }
          }
        }
      }
    }
    
    return { valid: true };
  }
  
  private createRuleFromConfig(config: ValidationRuleConfig): ValidationRule<any> {
    // 根据配置创建对应的验证规则
    switch (config.type) {
      case 'required':
        return required(config.message);
      case 'minLength':
        return minLength(config.options.min, config.message);
      // ... 其他规则类型
      default:
        throw new Error(`Unknown validation rule type: ${config.type}`);
    }
  }
}
```

## 3. 实施计划

### 3.1 第一阶段：基础改进（1-2周）

1. **创建通用验证工具类**
   - 实现CommonValidators工具类
   - 提取现有的验证逻辑到工具方法中

2. **重构现有资源API**
   - 使用通用验证工具重构所有资源API的验证逻辑
   - 确保向后兼容性

3. **更新测试用例**
   - 更新所有相关测试用例
   - 确保验证逻辑的正确性

### 3.2 第二阶段：异步验证支持（1周）

1. **修改基类验证方法为异步**
2. **更新所有子类的验证实现**
3. **更新相关测试用例**

### 3.3 第三阶段：上下文感知验证（1-2周）

1. **扩展验证方法签名**
2. **实现ValidationContext接口**
3. **在关键资源API中实现上下文感知验证**

### 3.4 第四阶段：配置化验证（2-3周）

1. **实现验证配置系统**
2. **创建配置驱动的验证器**
3. **提供配置文件示例和文档**

## 4. 向后兼容性保证

### 4.1 API兼容性

- **保持现有方法签名不变**：通过重载或可选参数实现新功能
- **默认行为不变**：新功能默认关闭，确保现有代码不受影响

### 4.2 配置兼容性

- **渐进式采用**：新功能可以逐步采用，不影响现有功能
- **配置迁移工具**：提供工具帮助用户从硬编码验证迁移到配置化验证

## 5. 预期收益

### 5.1 开发效率提升

- **减少重复代码**：通用验证工具减少50%以上的验证代码
- **快速实现验证**：配置化验证让新资源类型的验证实现时间减少70%

### 5.2 系统质量提升

- **验证一致性**：统一的验证规则确保系统各部分验证逻辑一致
- **错误处理标准化**：标准化的错误信息提高调试效率

### 5.3 灵活性增强

- **动态调整**：配置化验证支持运行时调整验证规则
- **复杂场景支持**：异步验证和上下文感知支持复杂业务场景

## 6. 风险评估与缓解

### 6.1 技术风险

- **性能影响**：异步验证可能增加响应时间
  - **缓解措施**：提供性能监控和优化选项

- **复杂度增加**：新功能可能增加系统复杂度
  - **缓解措施**：提供清晰的文档和最佳实践指南

### 6.2 迁移风险

- **现有代码兼容性**：确保现有代码不受影响
  - **缓解措施**：充分的测试覆盖和渐进式迁移策略

## 7. 结论

本改进方案在保持现有架构优势的基础上，系统性地解决了当前验证逻辑的不足。通过分阶段实施，可以在控制风险的同时逐步提升系统的验证能力。建议按照实施计划逐步推进，优先实现第一阶段的基础改进，为后续功能奠定基础。