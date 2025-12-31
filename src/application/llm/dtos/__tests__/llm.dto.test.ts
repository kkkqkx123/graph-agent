/**
 * LLM DTO单元测试
 */

import {
  mapPoolToDTO,
  mapPoolsToDTOs,
  mapTaskGroupToDTO,
  mapTaskGroupsToDTOs,
  mapInstanceToDTO,
  mapInstancesToDTOs,
  PoolDTO,
  TaskGroupDTO,
  InstanceDTO
} from '../llm.dto';

describe('LLM DTOs', () => {
  describe('mapPoolToDTO', () => {
    it('应该将领域对象转换为DTO', () => {
      const domainPool = {
        name: '测试轮询池',
        config: { key: 'value' },
        status: {
          totalInstances: 10,
          healthyInstances: 8,
          degradedInstances: 1,
          failedInstances: 1,
          availabilityRate: 0.8,
          concurrencyStatus: {
            enabled: true,
            currentLoad: 5,
            maxLoad: 10,
            loadPercentage: 50
          },
          lastChecked: new Date('2023-01-01T00:00:00Z')
        },
        statistics: {
          totalRequests: 100,
          successfulRequests: 90,
          failedRequests: 10,
          avgResponseTime: 100,
          successRate: 0.9,
          currentLoad: 5,
          maxConcurrency: 10
        }
      };

      const result = mapPoolToDTO(domainPool);

      expect(result.name).toBe('测试轮询池');
      expect(result.status.totalInstances).toBe(10);
      expect(result.status.healthyInstances).toBe(8);
      expect(result.status.availabilityRate).toBe(0.8);
      expect(result.statistics.totalRequests).toBe(100);
      expect(result.statistics.successRate).toBe(0.9);
    });

    it('应该处理空对象', () => {
      const result = mapPoolToDTO({});
      expect(result.name).toBe('');
      expect(result.status.totalInstances).toBe(0);
      expect(result.statistics.totalRequests).toBe(0);
    });
  });

  describe('mapPoolsToDTOs', () => {
    it('应该批量转换领域对象为DTO', () => {
      const domainPools = [
        {
          name: '轮询池1',
          config: {},
          status: {
            totalInstances: 5,
            healthyInstances: 5,
            degradedInstances: 0,
            failedInstances: 0,
            availabilityRate: 1.0,
            concurrencyStatus: {
              enabled: true,
              currentLoad: 2,
              maxLoad: 5,
              loadPercentage: 40
            },
            lastChecked: new Date('2023-01-01T00:00:00Z')
          },
          statistics: {
            totalRequests: 50,
            successfulRequests: 50,
            failedRequests: 0,
            avgResponseTime: 80,
            successRate: 1.0,
            currentLoad: 2,
            maxConcurrency: 5
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
              currentLoad: 1,
              maxLoad: 3,
              loadPercentage: 33.33
            },
            lastChecked: new Date('2023-01-01T00:00:00Z')
          },
          statistics: {
            totalRequests: 30,
            successfulRequests: 28,
            failedRequests: 2,
            avgResponseTime: 90,
            successRate: 0.93,
            currentLoad: 1,
            maxConcurrency: 3
          }
        }
      ];

      const results = mapPoolsToDTOs(domainPools);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('轮询池1');
      expect(results[1].name).toBe('轮询池2');
    });
  });

  describe('mapTaskGroupToDTO', () => {
    it('应该将领域对象转换为DTO', () => {
      const domainTaskGroup = {
        name: '测试任务组',
        config: { key: 'value' },
        status: {
          totalEchelons: 3,
          totalModels: 10,
          available: true,
          echelons: [
            { name: '层级1', priority: 1, modelCount: 5, available: true, models: ['model1', 'model2'] }
          ],
          lastChecked: new Date('2023-01-01T00:00:00Z')
        },
        statistics: {
          name: '测试任务组',
          totalEchelons: 3,
          totalModels: 10,
          availabilityRate: 0.9,
          echelonDistribution: {
            '层级1': { priority: 1, modelCount: 5, availability: true }
          }
        }
      };

      const result = mapTaskGroupToDTO(domainTaskGroup);

      expect(result.name).toBe('测试任务组');
      expect(result.status.totalEchelons).toBe(3);
      expect(result.status.totalModels).toBe(10);
      expect(result.status.available).toBe(true);
      expect(result.statistics.availabilityRate).toBe(0.9);
    });

    it('应该处理空对象', () => {
      const result = mapTaskGroupToDTO({});
      expect(result.name).toBe('');
      expect(result.status.totalEchelons).toBe(0);
      expect(result.statistics.availabilityRate).toBe(0);
    });
  });

  describe('mapTaskGroupsToDTOs', () => {
    it('应该批量转换领域对象为DTO', () => {
      const domainTaskGroups = [
        {
          name: '任务组1',
          config: {},
          status: {
            totalEchelons: 2,
            totalModels: 5,
            available: true,
            echelons: [],
            lastChecked: new Date('2023-01-01T00:00:00Z')
          },
          statistics: {
            name: '任务组1',
            totalEchelons: 2,
            totalModels: 5,
            availabilityRate: 1.0,
            echelonDistribution: {}
          }
        }
      ];

      const results = mapTaskGroupsToDTOs(domainTaskGroups);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('任务组1');
    });
  });

  describe('mapInstanceToDTO', () => {
    it('应该将领域对象转换为DTO', () => {
      const domainInstance = {
        instanceId: '123e4567-e89b-12d3-a456-426614174000',
        modelName: 'gpt-4',
        groupName: 'group1',
        echelon: 'high',
        status: 'healthy',
        currentLoad: 3,
        maxConcurrency: 5,
        avgResponseTime: 100,
        successCount: 95,
        failureCount: 5,
        successRate: 0.95,
        healthScore: 0.9,
        available: true,
        canAcceptRequest: true,
        lastUsed: new Date('2023-01-01T00:00:00Z'),
        lastHealthCheck: new Date('2023-01-01T00:00:00Z')
      };

      const result = mapInstanceToDTO(domainInstance);

      expect(result.instanceId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.modelName).toBe('gpt-4');
      expect(result.status).toBe('healthy');
      expect(result.successRate).toBe(0.95);
      expect(result.available).toBe(true);
    });

    it('应该处理空对象', () => {
      const result = mapInstanceToDTO({});
      expect(result.instanceId).toBe('');
      expect(result.modelName).toBe('');
      expect(result.status).toBe('unknown');
      expect(result.available).toBe(false);
    });
  });

  describe('mapInstancesToDTOs', () => {
    it('应该批量转换领域对象为DTO', () => {
      const domainInstances = [
        {
          instanceId: '123e4567-e89b-12d3-a456-426614174000',
          modelName: 'gpt-4',
          groupName: 'group1',
          echelon: 'high',
          status: 'healthy',
          currentLoad: 3,
          maxConcurrency: 5,
          avgResponseTime: 100,
          successCount: 95,
          failureCount: 5,
          successRate: 0.95,
          healthScore: 0.9,
          available: true,
          canAcceptRequest: true,
          lastUsed: new Date('2023-01-01T00:00:00Z'),
          lastHealthCheck: new Date('2023-01-01T00:00:00Z')
        }
      ];

      const results = mapInstancesToDTOs(domainInstances);

      expect(results).toHaveLength(1);
      expect(results[0].modelName).toBe('gpt-4');
    });
  });
});