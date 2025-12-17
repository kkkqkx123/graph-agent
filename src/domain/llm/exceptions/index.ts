import { DomainError } from '../../common/errors/domain-error';

/**
 * 轮询池相关异常
 */
export class PoolNotFoundException extends DomainError {
  constructor(poolName: string) {
    super(`轮询池不存在: ${poolName}`);
  }
}

export class PoolAlreadyExistsException extends DomainError {
  constructor(poolName: string) {
    super(`轮询池已存在: ${poolName}`);
  }
}

export class NoHealthyInstanceException extends DomainError {
  constructor(poolName: string) {
    super(`轮询池 ${poolName} 中没有健康的实例`);
  }
}

export class PoolConfigurationException extends DomainError {
  constructor(message: string) {
    super(`轮询池配置错误: ${message}`);
  }
}

export class PoolInstanceAcquisitionException extends DomainError {
  constructor(poolName: string, reason: string) {
    super(`无法从轮询池 ${poolName} 获取实例: ${reason}`);
  }
}

/**
 * 任务组相关异常
 */
export class TaskGroupNotFoundException extends DomainError {
  constructor(groupName: string) {
    super(`任务组不存在: ${groupName}`);
  }
}

export class TaskGroupAlreadyExistsException extends DomainError {
  constructor(groupName: string) {
    super(`任务组已存在: ${groupName}`);
  }
}

export class EchelonNotFoundException extends DomainError {
  constructor(groupName: string, echelonName: string) {
    super(`任务组 ${groupName} 中不存在层级: ${echelonName}`);
  }
}

export class TaskGroupConfigurationException extends DomainError {
  constructor(message: string) {
    super(`任务组配置错误: ${message}`);
  }
}

export class NoAvailableModelException extends DomainError {
  constructor(groupName: string) {
    super(`任务组 ${groupName} 中没有可用的模型`);
  }
}

/**
 * 包装器相关异常
 */
export class WrapperNotFoundException extends DomainError {
  constructor(wrapperName: string) {
    super(`包装器不存在: ${wrapperName}`);
  }
}

export class WrapperAlreadyExistsException extends DomainError {
  constructor(wrapperName: string) {
    super(`包装器已存在: ${wrapperName}`);
  }
}

export class WrapperConfigurationException extends DomainError {
  constructor(message: string) {
    super(`包装器配置错误: ${message}`);
  }
}

export class WrapperExecutionException extends DomainError {
  constructor(wrapperName: string, reason: string) {
    super(`包装器 ${wrapperName} 执行失败: ${reason}`);
  }
}

export class UnsupportedWrapperTypeException extends DomainError {
  constructor(type: string) {
    super(`不支持的包装器类型: ${type}`);
  }
}

/**
 * 配置相关异常
 */
export class ConfigurationNotFoundException extends DomainError {
  constructor(configPath: string) {
    super(`配置文件不存在: ${configPath}`);
  }
}

export class ConfigurationParseException extends DomainError {
  constructor(configPath: string, reason: string) {
    super(`配置文件解析失败: ${configPath}, 原因: ${reason}`);
  }
}

export class ConfigurationValidationException extends DomainError {
  constructor(errors: string[]) {
    super(`配置验证失败: ${errors.join(', ')}`);
  }
}

export class InheritanceProcessingException extends DomainError {
  constructor(configPath: string, reason: string) {
    super(`配置继承处理失败: ${configPath}, 原因: ${reason}`);
  }
}

/**
 * 熔断器相关异常
 */
export class CircuitBreakerOpenException extends DomainError {
  constructor(componentName: string) {
    super(`熔断器已开启: ${componentName}`);
  }
}

export class CircuitBreakerConfigurationException extends DomainError {
  constructor(message: string) {
    super(`熔断器配置错误: ${message}`);
  }
}

/**
 * 降级相关异常
 */
export class FallbackExhaustedException extends DomainError {
  constructor(componentName: string) {
    super(`降级策略已耗尽: ${componentName}`);
  }
}

export class FallbackConfigurationException extends DomainError {
  constructor(message: string) {
    super(`降级配置错误: ${message}`);
  }
}

/**
 * 速率限制相关异常
 */
export class RateLimitExceededException extends DomainError {
  constructor(componentName: string, limit: number) {
    super(`速率限制超出: ${componentName}, 限制: ${limit}`);
  }
}

export class ConcurrencyLimitExceededException extends DomainError {
  constructor(componentName: string, limit: number) {
    super(`并发限制超出: ${componentName}, 限制: ${limit}`);
  }
}

/**
 * 健康检查相关异常
 */
export class HealthCheckException extends DomainError {
  constructor(componentName: string, reason: string) {
    super(`健康检查失败: ${componentName}, 原因: ${reason}`);
  }
}

/**
 * 通用LLM异常
 */
export class LLMServiceException extends DomainError {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
  }
}

export class LLMTimeoutException extends DomainError {
  constructor(operation: string, timeout: number) {
    super(`操作超时: ${operation}, 超时时间: ${timeout}ms`);
  }
}

export class LLMConnectionException extends DomainError {
  constructor(endpoint: string, reason: string) {
    super(`连接失败: ${endpoint}, 原因: ${reason}`);
  }
}

export class LLMAuthenticationException extends DomainError {
  constructor(provider: string) {
    super(`认证失败: ${provider}`);
  }
}

export class LLMRateLimitException extends DomainError {
  constructor(provider: string, resetTime?: Date) {
    super(`速率限制: ${provider}${resetTime ? `, 重置时间: ${resetTime.toISOString()}` : ''}`);
  }
}

export class LLMTokenLimitException extends DomainError {
  constructor(model: string, requested: number, limit: number) {
    super(`Token限制超出: ${model}, 请求: ${requested}, 限制: ${limit}`);
  }
}

/**
 * 异常工厂
 */
export class ExceptionFactory {
  static createPoolException(type: string, ...args: any[]): DomainError {
    switch (type) {
      case 'not_found':
        return new PoolNotFoundException(args[0]);
      case 'already_exists':
        return new PoolAlreadyExistsException(args[0]);
      case 'no_healthy_instance':
        return new NoHealthyInstanceException(args[0]);
      case 'config_error':
        return new PoolConfigurationException(args[0]);
      case 'instance_acquisition':
        return new PoolInstanceAcquisitionException(args[0], args[1]);
      default:
        return new DomainError(`未知的池异常类型: ${type}`);
    }
  }

  static createTaskGroupException(type: string, ...args: any[]): DomainError {
    switch (type) {
      case 'not_found':
        return new TaskGroupNotFoundException(args[0]);
      case 'already_exists':
        return new TaskGroupAlreadyExistsException(args[0]);
      case 'echelon_not_found':
        return new EchelonNotFoundException(args[0], args[1]);
      case 'config_error':
        return new TaskGroupConfigurationException(args[0]);
      case 'no_available_model':
        return new NoAvailableModelException(args[0]);
      default:
        return new DomainError(`未知的任务组异常类型: ${type}`);
    }
  }

  static createWrapperException(type: string, ...args: any[]): DomainError {
    switch (type) {
      case 'not_found':
        return new WrapperNotFoundException(args[0]);
      case 'already_exists':
        return new WrapperAlreadyExistsException(args[0]);
      case 'config_error':
        return new WrapperConfigurationException(args[0]);
      case 'execution_error':
        return new WrapperExecutionException(args[0], args[1]);
      case 'unsupported_type':
        return new UnsupportedWrapperTypeException(args[0]);
      default:
        return new DomainError(`未知的包装器异常类型: ${type}`);
    }
  }

  static createConfigurationException(type: string, ...args: any[]): DomainError {
    switch (type) {
      case 'not_found':
        return new ConfigurationNotFoundException(args[0]);
      case 'parse_error':
        return new ConfigurationParseException(args[0], args[1]);
      case 'validation_error':
        return new ConfigurationValidationException(args[0]);
      case 'inheritance_error':
        return new InheritanceProcessingException(args[0], args[1]);
      default:
        return new DomainError(`未知的配置异常类型: ${type}`);
    }
  }
}