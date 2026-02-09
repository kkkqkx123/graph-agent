/**
 * 验证系统使用示例
 * 展示如何使用新的验证工具和规则引擎
 */

import { 
  CommonValidators, 
  ValidationRuleFactory,
  Validator,
  required,
  stringLength,
  pattern,
  type ValidationContext 
} from '../../sdk/api/validation';

/**
 * 示例1：使用通用验证工具
 */
async function exampleCommonValidators() {
  console.log('=== 示例1：使用通用验证工具 ===');

  const data = {
    name: 'test-tool',
    description: '这是一个测试工具',
    parameters: { input: { type: 'string' } }
  };

  // 验证必需字段
  const requiredResult = CommonValidators.validateRequiredFields(data, ['name', 'description']);
  console.log('必需字段验证:', requiredResult);

  // 验证字符串长度
  const lengthResult = CommonValidators.validateStringLength(data.name, 1, 100, '工具名称');
  console.log('字符串长度验证:', lengthResult);

  // 验证对象结构
  const objectResult = CommonValidators.validateObject(data.parameters, '工具参数');
  console.log('对象结构验证:', objectResult);

  // 组合多个验证结果
  const combinedResult = CommonValidators.combineResults(
    requiredResult,
    lengthResult,
    objectResult
  );
  console.log('组合验证结果:', combinedResult);
}

/**
 * 示例2：使用验证规则引擎
 */
async function exampleValidationRules() {
  console.log('\n=== 示例2：使用验证规则引擎 ===');

  const toolData = {
    name: 'test-tool',
    type: 'stateless',
    description: '这是一个测试工具',
    parameters: { input: { type: 'string' } }
  };

  // 使用预定义的验证规则
  const toolValidator = ValidationRuleFactory.createToolValidator();
  const toolResult = await toolValidator.validate(toolData);
  console.log('工具验证结果:', toolResult);

  // 创建自定义验证器
  const customValidator = new Validator<any>()
    .addFieldRule(required('name', '名称不能为空'))
    .addFieldRule(stringLength('name', 1, 50, '名称长度必须在1到50之间'))
    .addFieldRule(pattern('type', /^(stateless|rest|native)$/, '类型必须是stateless、rest或native'));

  const customResult = await customValidator.validate(toolData);
  console.log('自定义验证结果:', customResult);
}

/**
 * 示例3：使用上下文感知验证
 */
async function exampleContextAwareValidation() {
  console.log('\n=== 示例3：使用上下文感知验证 ===');

  const context: ValidationContext = {
    userId: 'user-123',
    tenantId: 'tenant-456',
    operation: 'create',
    environment: 'production'
  };

  const data = {
    name: 'production-tool',
    type: 'rest',
    description: '生产环境使用的工具'
  };

  // 创建上下文感知的验证器
  const contextValidator = new Validator<any>()
    .addFieldRule(required('name'))
    .addFieldRule(stringLength('name', 1, 100))
    .addCustomRule({
      validate: (data: any, ctx?: ValidationContext) => {
        // 在生产环境中进行更严格的验证
        if (ctx?.environment === 'production') {
          if (data.type !== 'rest') {
            return {
              valid: false,
              errors: ['生产环境只允许使用REST类型工具']
            };
          }
        }
        return { valid: true, errors: [] };
      },
      message: '环境限制验证失败'
    });

  const result = await contextValidator.validate(data, context);
  console.log('上下文感知验证结果:', result);
}

/**
 * 示例4：在资源API中使用新验证系统
 */
async function exampleResourceAPIUsage() {
  console.log('\n=== 示例4：在资源API中使用新验证系统 ===');

  // 模拟工具注册API的验证方法
  class ExampleToolAPI {
    async validateTool(tool: any, context?: ValidationContext) {
      const errors: string[] = [];

      // 使用通用验证工具
      const requiredFields = CommonValidators.validateRequiredFields(tool, ['name', 'type', 'description']);
      errors.push(...requiredFields.errors);

      // 使用验证规则引擎
      const toolValidator = ValidationRuleFactory.createToolValidator();
      const ruleResult = await toolValidator.validate(tool, context);
      errors.push(...ruleResult.errors);

      // 自定义业务逻辑验证
      if (tool.parameters && typeof tool.parameters === 'object') {
        const paramsValidation = CommonValidators.validateObject(tool.parameters, '工具参数');
        if (!paramsValidation.valid) {
          errors.push(...paramsValidation.errors);
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    }
  }

  const api = new ExampleToolAPI();
  const tool = {
    name: 'example-tool',
    type: 'stateless',
    description: '示例工具',
    parameters: { input: { type: 'string' } }
  };

  const result = await api.validateTool(tool);
  console.log('资源API验证结果:', result);
}

/**
 * 运行所有示例
 */
async function runExamples() {
  await exampleCommonValidators();
  await exampleValidationRules();
  await exampleContextAwareValidation();
  await exampleResourceAPIUsage();
}

// 运行示例
runExamples().catch(console.error);