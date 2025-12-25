/**
 * LLM DTO单元测试
 */

import {
  PoolDto,
  PoolCreateDto,
  TaskGroupDto,
  TaskGroupCreateDto,
  PoolConverter,
  TaskGroupConverter,
  DtoValidationError
} from '../llm.dto';

describe('LLM DTOs', () => {
  describe('PoolDto', () => {
    let poolDto: PoolDto;

    beforeEach(() => {
      poolDto = new PoolDto();
    });

    it('应该验证有效的轮询池', () => {
      const validPool = {
        name: '测试轮询池',
        config: {
          maxConcurrency: 10,
          timeout: 30000
        },
        status: {
          totalInstances: 5,
          healthyInstances: 4,
          degradedInstances: 1,
          failedInstances: 0,
          availabilityRate: 0.8,
          concurrencyStatus: {
            enabled: true,
            currentLoad: 3,
            maxLoad: 10,
            loadPercentage: 30
          },
          lastChecked: '2023-01-01T00:00:00Z'
        },
        statistics: {
          totalRequests: 1000,
          successfulRequests: 950,
          failedRequests: 50,
          avgResponseTime: 150,
          successRate: 0.95,
          currentLoad: 3,
          maxConcurrency: 10
        }
      };

      const result = poolDto.validate(validPool);
      expect(result).toEqual(validPool);
    });

    it('应该拒绝无效的轮询池', () => {
      const invalidPool = {
        name: '',
        config: 'not-an-object',
        status: {
          totalInstances: -1,
          healthyInstances: 'not-a-number',
          degradedInstances: 0,
          failedInstances: 0,
          availabilityRate: 1.5, // 超出范围
          concurrencyStatus: {
            enabled: 'not-a-boolean',
            currentLoad: -1,
            maxLoad: 0,
            loadPercentage: 150 // 超出范围
          },
          lastChecked: 'invalid-date'
        },
        statistics: {
          totalRequests: -1,
          successfulRequests: 'not-a-number',
          failedRequests: 0,
          avgResponseTime: -1,
          successRate: 1.5, // 超出范围
          currentLoad: -1,
          maxConcurrency: 0
        }
      };

      expect(() => {
        poolDto.validate(invalidPool);
      }).toThrow(DtoValidationError);
    });

    it('应该安全验证并返回成功结果', () => {
      const validPool = {
        name: '测试轮询池',
        config: {},
        status: {
          totalInstances: 1,
          healthyInstances: 1,
          degradedInstances: 0,
          failedInstances: 0,
          availabilityRate: 1.0,
          concurrencyStatus: {
            enabled: true,
            currentLoad: 0,
            maxLoad: 1,
            loadPercentage: 0
          },
          lastChecked: '2023-01-01T00:00:00Z'
        },
        statistics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          avgResponseTime: 0,
          successRate: 0,
          currentLoad: 0,
          maxConcurrency: 1
        }
      };

      const result = poolDto.safeValidate(validPool);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validPool);
    });

    it('应该安全验证并返回失败结果', () => {
      const invalidPool = {
        name: '',
        config: {},
        status: {},
        statistics: {}
      };

      const result = poolDto.safeValidate(invalidPool);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('PoolCreateDto', () => {
    let poolCreateDto: PoolCreateDto;

    beforeEach(() => {
      poolCreateDto = new PoolCreateDto();
    });

    it('应该验证有效的轮询池创建请求', () => {
      const validCreateRequest = {
        name: '新轮询池',
        config: {
          maxConcurrency: 5,
          timeout: 30000
        },
        taskGroups: ['group1', 'group2']
      };

      const result = poolCreateDto.validate(validCreateRequest);
      expect(result).toEqual(validCreateRequest);
    });

    it('应该拒绝无效的轮询池创建请求', () => {
      const invalidCreateRequest = {
        name: '',
        config: 'not-an-object',
        taskGroups: 'not-an-array'
      };

      expect(() => {
        poolCreateDto.validate(invalidCreateRequest);
      }).toThrow(DtoValidationError);
    });
  });

  describe('TaskGroupDto', () => {
    let taskGroupDto: TaskGroupDto;

    beforeEach(() => {
      taskGroupDto = new TaskGroupDto();
    });

    it('应该验证有效的任务组', () => {
      const validTaskGroup = {
        name: '测试任务组',
        config: {
          setting1: 'value1',
          setting2: 'value2'
        },
        status: {
          totalEchelons: 3,
          totalModels: 10,
          available: true,
          echelons: [
            {
              name: 'echelon1',
              priority: 1,
              modelCount: 5,
              available: true,
              models: ['model1', 'model2', 'model3', 'model4', 'model5']
            },
            {
              name: 'echelon2',
              priority: 2,
              modelCount: 3,
              available: true,
              models: ['model6', 'model7', 'model8']
            },
            {
              name: 'echelon3',
              priority: 3,
              modelCount: 2,
              available: true,
              models: ['model9', 'model10']
            }
          ],
          lastChecked: '2023-01-01T00:00:00Z'
        },
        statistics: {
          name: '测试任务组',
          totalEchelons: 3,
          totalModels: 10,
          availabilityRate: 1.0,
          echelonDistribution: {
            echelon1: {
              priority: 1,
              modelCount: 5,
              availability: true
            },
            echelon2: {
              priority: 2,
              modelCount: 3,
              availability: true
            },
            echelon3: {
              priority: 3,
              modelCount: 2,
              availability: true
            }
          }
        }
      };

      const result = taskGroupDto.validate(validTaskGroup);
      expect(result).toEqual(validTaskGroup);
    });

    it('应该拒绝无效的任务组', () => {
      const invalidTaskGroup = {
        name: '',
        config: 'not-an-object',
        status: {
          totalEchelons: -1,
          totalModels: 'not-a-number',
          available: 'not-a-boolean',
          echelons: 'not-an-array',
          lastChecked: 'invalid-date'
        },
        statistics: {
          name: '',
          totalEchelons: -1,
          totalModels: 'not-a-number',
          availabilityRate: 1.5, // 超出范围
          echelonDistribution: 'not-an-object'
        }
      };

      expect(() => {
        taskGroupDto.validate(invalidTaskGroup);
      }).toThrow(DtoValidationError);
    });
  });

  describe('TaskGroupCreateDto', () => {
    let taskGroupCreateDto: TaskGroupCreateDto;

    beforeEach(() => {
      taskGroupCreateDto = new TaskGroupCreateDto();
    });

    it('应该验证有效的任务组创建请求', () => {
      const validCreateRequest = {
        name: '新任务组',
        config: {
          setting1: 'value1'
        },
        echelons: {
          echelon1: {
            priority: 1,
            models: ['model1', 'model2'],
            fallbackStrategy: 'sequential',
            maxAttempts: 3,
            retryDelay: 1000
          },
          echelon2: {
            priority: 2,
            models: ['model3']
          }
        }
      };

      const result = taskGroupCreateDto.validate(validCreateRequest);
      expect(result).toEqual(validCreateRequest);
    });

    it('应该拒绝无效的任务组创建请求', () => {
      const invalidCreateRequest = {
        name: '',
        config: 'not-an-object',
        echelons: 'not-an-object'
      };

      expect(() => {
        taskGroupCreateDto.validate(invalidCreateRequest);
      }).toThrow(DtoValidationError);
    });
  });

  describe('PoolConverter', () => {
    let poolConverter: PoolConverter;

    beforeEach(() => {
      poolConverter = new PoolConverter();
    });

    it('应该将领域对象转换为DTO', () => {
      const domainPool = {
        name: '测试轮询池',
        config: {
          maxConcurrency: 10
        },
        status: {
          totalInstances: 5,
          healthyInstances: 4,
          degradedInstances: 1,
          failedInstances: 0,
          availabilityRate: 0.8,
          concurrencyStatus: {
            enabled: true,
            currentLoad: 3,
            maxLoad: 10,
            loadPercentage: 30
          },
          lastChecked: new Date('2023-01-01T00:00:00Z')
        },
        statistics: {
          totalRequests: 1000,
          successfulRequests: 950,
          failedRequests: 50,
          avgResponseTime: 150,
          successRate: 0.95,
          currentLoad: 3,
          maxConcurrency: 10
        }
      };

      const result = poolConverter.toDto(domainPool);
      
      expect(result.name).toBe('测试轮询池');
      expect(result.config).toEqual({ maxConcurrency: 10 });
      expect(result.status.totalInstances).toBe(5);
      expect(result.status.healthyInstances).toBe(4);
      expect(result.status.lastChecked).toBe('2023-01-01T00:00:00.000Z');
      expect(result.statistics.totalRequests).toBe(1000);
      expect(result.statistics.successfulRequests).toBe(950);
    });

    it('应该批量转换领域对象为DTO', () => {
      const domainPools = [
        {
          name: '轮询池1',
          config: {},
          status: {
            totalInstances: 2,
            healthyInstances: 2,
            degradedInstances: 0,
            failedInstances: 0,
            availabilityRate: 1.0,
            concurrencyStatus: {
              enabled: true,
              currentLoad: 1,
              maxLoad: 2,
              loadPercentage: 50
            },
            lastChecked: new Date('2023-01-01T00:00:00Z')
          },
          statistics: {
            totalRequests: 100,
            successfulRequests: 100,
            failedRequests: 0,
            avgResponseTime: 100,
            successRate: 1.0,
            currentLoad: 1,
            maxConcurrency: 2
          }
        },
        {
          name: '轮询池2',
          config: {},
          status: {
            totalInstances: 3,
            healthyInstances: 2,
            degradedInstances: 1,
            failedInstances: 0,
            availabilityRate: 0.67,
            concurrencyStatus: {
              enabled: true,
              currentLoad: 2,
              maxLoad: 3,
              loadPercentage: 67
            },
            lastChecked: new Date('2023-01-01T00:00:00Z')
          },
          statistics: {
            totalRequests: 200,
            successfulRequests: 180,
            failedRequests: 20,
            avgResponseTime: 120,
            successRate: 0.9,
            currentLoad: 2,
            maxConcurrency: 3
          }
        }
      ];

      const results = poolConverter.toDtoList(domainPools);
      
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('轮询池1');
      expect(results[1].name).toBe('轮询池2');
    });

    it('应该在DTO到实体转换时抛出错误', () => {
      const dto = {
        name: '测试轮询池',
        config: {},
        status: {
          totalInstances: 1,
          healthyInstances: 1,
          degradedInstances: 0,
          failedInstances: 0,
          availabilityRate: 1.0,
          concurrencyStatus: {
            enabled: true,
            currentLoad: 0,
            maxLoad: 1,
            loadPercentage: 0
          },
          lastChecked: '2023-01-01T00:00:00Z'
        },
        statistics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          avgResponseTime: 0,
          successRate: 0,
          currentLoad: 0,
          maxConcurrency: 1
        }
      };

      expect(() => {
        poolConverter.toEntity(dto);
      }).toThrow('DTO到Entity的转换需要业务上下文，请使用工厂方法');
    });
  });

  describe('TaskGroupConverter', () => {
    let taskGroupConverter: TaskGroupConverter;

    beforeEach(() => {
      taskGroupConverter = new TaskGroupConverter();
    });

    it('应该将领域对象转换为DTO', () => {
      const domainTaskGroup = {
        name: '测试任务组',
        config: {
          setting1: 'value1'
        },
        status: {
          totalEchelons: 2,
          totalModels: 5,
          available: true,
          echelons: [
            {
              name: 'echelon1',
              priority: 1,
              modelCount: 3,
              available: true,
              models: ['model1', 'model2', 'model3']
            },
            {
              name: 'echelon2',
              priority: 2,
              modelCount: 2,
              available: true,
              models: ['model4', 'model5']
            }
          ],
          lastChecked: new Date('2023-01-01T00:00:00Z')
        },
        statistics: {
          name: '测试任务组',
          totalEchelons: 2,
          totalModels: 5,
          availabilityRate: 1.0,
          echelonDistribution: {
            echelon1: {
              priority: 1,
              modelCount: 3,
              availability: true
            },
            echelon2: {
              priority: 2,
              modelCount: 2,
              availability: true
            }
          }
        }
      };

      const result = taskGroupConverter.toDto(domainTaskGroup);
      
      expect(result.name).toBe('测试任务组');
      expect(result.config).toEqual({ setting1: 'value1' });
      expect(result.status.totalEchelons).toBe(2);
      expect(result.status.totalModels).toBe(5);
      expect(result.status.lastChecked).toBe('2023-01-01T00:00:00.000Z');
      expect(result.statistics.name).toBe('测试任务组');
      expect(result.statistics.totalModels).toBe(5);
    });

    it('应该在DTO到实体转换时抛出错误', () => {
      const dto = {
        name: '测试任务组',
        config: {},
        status: {
          totalEchelons: 1,
          totalModels: 1,
          available: true,
          echelons: [],
          lastChecked: '2023-01-01T00:00:00Z'
        },
        statistics: {
          name: '测试任务组',
          totalEchelons: 1,
          totalModels: 1,
          availabilityRate: 1.0,
          echelonDistribution: {}
        }
      };

      expect(() => {
        taskGroupConverter.toEntity(dto);
      }).toThrow('DTO到Entity的转换需要业务上下文，请使用工厂方法');
    });
  });
});