import { BaseRepository, QueryOptions, QueryBuilderHelper } from '../base-repository';
import { ConnectionManager } from '../../connections/connection-manager';
import { Repository, DataSource, SelectQueryBuilder, FindOptionsWhere } from 'typeorm';
import { RepositoryError } from '../../../../domain/common/errors/repository-error';
import { ID } from '../../../../domain/common/value-objects/id';
import { IMapper } from '../base-repository';

// Mock 类定义
interface MockEntity {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
  deletedAt?: Date;
}

interface MockModel {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
  deletedAt?: Date;
}

class MockMapper implements IMapper<MockEntity, MockModel> {
  toEntity(model: MockModel): MockEntity {
    return {
      id: model.id,
      name: model.name,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      isDeleted: model.isDeleted,
      deletedAt: model.deletedAt
    };
  }

  toModel(entity: MockEntity): MockModel {
    return {
      id: entity.id,
      name: entity.name,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      isDeleted: entity.isDeleted,
      deletedAt: entity.deletedAt
    };
  }
}

class MockModel {}

class TestRepository extends BaseRepository<MockEntity, MockModel, string> {
  protected override mapper = new MockMapper();

  protected getModelClass(): new () => MockModel {
    return MockModel;
  }

  // 公开受保护的方法用于测试
  public testFindByMultipleFields = this.findByMultipleFields;
  public testFindByTimeRangeField = this.findByTimeRangeField;
  public testFindWithRelations = this.findWithRelations;
  public testExecuteCustomQuery = this.executeCustomQuery;
  public testGetEntityName = this.getEntityName;
  public testHandleError = this.handleError;
  public testSafeExecute = this.safeExecute;
  public testGetQueryBuilderHelper = this.getQueryBuilderHelper;
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let mockConnectionManager: jest.Mocked<ConnectionManager>;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockRepository: jest.Mocked<Repository<MockModel>>;
  let mockQueryBuilder: any;

  beforeEach(() => {
    // 创建 mock 对象
    mockQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      getCount: jest.fn(),
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn(),
      where: jest.fn().mockReturnThis()
    } as any;

    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      update: jest.fn().mockReturnThis(),
      create: jest.fn()
    } as any;

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
      createQueryRunner: jest.fn(),
      transaction: jest.fn()
    } as any;

    mockConnectionManager = {
      getConnection: jest.fn().mockResolvedValue(mockDataSource)
    } as any;

    repository = new TestRepository(mockConnectionManager);
  });

  describe('通用查询模板方法', () => {
    it('应该能够通过多字段组合查询', async () => {
      const mockModels = [
        { id: '1', name: 'test1', createdAt: new Date(), updatedAt: new Date() },
        { id: '2', name: 'test2', createdAt: new Date(), updatedAt: new Date() }
      ] as MockModel[];

      mockQueryBuilder.getMany.mockResolvedValue(mockModels);

      const fields = { name: 'test1', isDeleted: false };
      const options = { limit: 10 };

      const result = await repository.testFindByMultipleFields(fields, options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('mock.name = :name', { name: 'test1' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('mock.isDeleted = :isDeleted', { isDeleted: false });
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(2);
    });

    it('应该能够处理数组字段值', async () => {
      const mockModels = [
        { id: '1', name: 'test1', createdAt: new Date(), updatedAt: new Date() }
      ] as MockModel[];

      mockQueryBuilder.getMany.mockResolvedValue(mockModels);

      const fields = { id: ['1', '2', '3'] };

      await repository.testFindByMultipleFields(fields);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('mock.id IN (:...id)', { id: ['1', '2', '3'] });
    });

    it('应该能够通过时间范围查询', async () => {
      const mockModels = [
        { id: '1', name: 'test1', createdAt: new Date(), updatedAt: new Date() }
      ] as MockModel[];

      mockQueryBuilder.getMany.mockResolvedValue(mockModels);

      const startTime = new Date('2023-01-01');
      const endTime = new Date('2023-12-31');

      await repository.testFindByTimeRangeField('createdAt', startTime, endTime);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'mock.createdAt BETWEEN :startTime AND :endTime',
        { startTime, endTime }
      );
    });

    it('应该能够执行关联查询', async () => {
      const mockModels = [
        { id: '1', name: 'test1', createdAt: new Date(), updatedAt: new Date() }
      ] as MockModel[];

      mockQueryBuilder.getMany.mockResolvedValue(mockModels);

      const relations = [
        { alias: 'user', property: 'user', type: 'left' as const },
        { alias: 'profile', property: 'profile', condition: 'user.id = profile.userId', type: 'inner' as const }
      ];

      await repository.testFindWithRelations(relations);

      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith('mock.user', 'user');
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith('mock.profile', 'profile');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.id = profile.userId');
    });

    it('应该能够执行自定义查询', async () => {
      const mockModels = [
        { id: '1', name: 'test1', createdAt: new Date(), updatedAt: new Date() }
      ] as MockModel[];

      mockQueryBuilder.getMany.mockResolvedValue(mockModels);

      const customQuery = (qb: SelectQueryBuilder<MockModel>) => {
        qb.andWhere('test.name LIKE :name', { name: '%test%' })
          .orderBy('test.createdAt', 'DESC');
      };

      await repository.testExecuteCustomQuery(customQuery);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('test.name LIKE :name', { name: '%test%' });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('test.createdAt', 'DESC');
    });
  });

  describe('软删除机制', () => {
    it('应该能够软删除实体', async () => {
      const mockResult = { affected: 1, raw: [], generatedMaps: [] };
      mockRepository.update.mockResolvedValue(mockResult);

      await repository.softDelete('1');

      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: '1' },
        {
          isDeleted: true,
          deletedAt: expect.any(Date),
          updatedAt: expect.any(Date)
        }
      );
    });

    it('应该能够批量软删除实体', async () => {
      const mockResult = { affected: 3 };
      mockQueryBuilder.execute.mockResolvedValue(mockResult);

      const result = await repository.batchSoftDelete(['1', '2', '3']);

      expect(result).toBe(3);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id IN (:...ids)', { ids: ['1', '2', '3'] });
    });

    it('应该能够恢复软删除的实体', async () => {
      const mockResult = { affected: 1, raw: [], generatedMaps: [] };
      mockRepository.update.mockResolvedValue(mockResult);

      await repository.restoreSoftDeleted('1');

      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: '1' },
        {
          isDeleted: false,
          deletedAt: null,
          updatedAt: expect.any(Date)
        }
      );
    });

    it('应该能够查找软删除的实体', async () => {
      const mockModels = [
        { id: '1', name: 'test1', isDeleted: true, createdAt: new Date(), updatedAt: new Date() }
      ] as MockModel[];

      mockQueryBuilder.getMany.mockResolvedValue(mockModels);

      const result = await repository.findSoftDeleted();

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('mock.isDeleted = :isDeleted', { isDeleted: true });
      expect(result).toHaveLength(1);
    });
  });

  describe('批量操作', () => {
    it('应该能够批量更新实体', async () => {
      const mockResult = { affected: 2 };
      mockQueryBuilder.execute.mockResolvedValue(mockResult);

      const updateData = { name: 'updated' };
      const result = await repository.batchUpdate(['1', '2'], updateData);

      expect(result).toBe(2);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({
        ...updateData,
        updatedAt: expect.any(Date)
      });
    });

    it('应该能够批量删除实体', async () => {
      const mockResult = { affected: 2 };
      mockQueryBuilder.execute.mockResolvedValue(mockResult);

      const result = await repository.batchDeleteByIds(['1', '2']);

      expect(result).toBe(2);
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });

    it('应该能够在事务中执行批量操作', async () => {
      const mockResults = ['result1', 'result2'];
      const operations = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn().mockResolvedValue('result2')
      ];

      // Mock executeInTransaction
      const executeInTransactionSpy = jest.spyOn(repository, 'executeInTransaction');
      executeInTransactionSpy.mockImplementation(async (operation) => {
        return operation();
      });

      const result = await repository.executeBatchInTransaction(operations);

      expect(result).toEqual(mockResults);
      expect(operations[0]).toHaveBeenCalled();
      expect(operations[1]).toHaveBeenCalled();
    });
  });

  describe('错误处理机制', () => {
    it('应该能够正确识别连接错误', () => {
      const connectionError = new Error('Connection failed');
      
      expect(() => repository.testHandleError(connectionError, '测试操作')).toThrow(RepositoryError);
    });

    it('应该能够正确识别查询错误', () => {
      const queryError = new Error('SQL syntax error');
      
      expect(() => repository.testHandleError(queryError, '测试操作')).toThrow(RepositoryError);
    });

    it('应该能够正确识别验证错误', () => {
      const validationError = new Error('Validation constraint failed');
      
      expect(() => repository.testHandleError(validationError, '测试操作')).toThrow(RepositoryError);
    });

    it('应该能够正确识别事务错误', () => {
      const transactionError = new Error('Transaction rollback');
      
      expect(() => repository.testHandleError(transactionError, '测试操作')).toThrow(RepositoryError);
    });

    it('应该能够安全执行操作', async () => {
      const successOperation = jest.fn().mockResolvedValue('success');
      
      const result = await repository.testSafeExecute(successOperation, '成功操作');
      
      expect(result).toBe('success');
      expect(successOperation).toHaveBeenCalled();
    });

    it('应该能够处理操作失败', async () => {
      const failOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      
      await expect(repository.testSafeExecute(failOperation, '失败操作')).rejects.toThrow(RepositoryError);
    });

    it('应该在开发环境中打印详细错误信息', () => {
      const originalEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'development';
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');
      
      try {
        repository.testHandleError(error, '测试操作');
      } catch (e) {
        // 忽略错误，只检查控制台输出
      }
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Repository Error Details:',
        expect.objectContaining({
          message: expect.stringContaining('测试操作失败'),
          type: expect.any(String),
          context: expect.objectContaining({
            operation: '测试操作',
            entityName: 'MockModel',
            timestamp: expect.any(Date)
          }),
          originalError: error
        })
      );
      
      consoleSpy.mockRestore();
      process.env['NODE_ENV'] = originalEnv;
    });
  });

  describe('辅助方法', () => {
    it('应该能够获取实体名称', () => {
      const entityName = repository.testGetEntityName();
      expect(entityName).toBe('MockModel');
    });

    it('应该能够构建查询构建器辅助类', async () => {
      const helper = await repository.testGetQueryBuilderHelper();
      expect(helper).toBeInstanceOf(QueryBuilderHelper);
    });
  });

  describe('QueryBuilderHelper', () => {
    let helper: QueryBuilderHelper<MockModel>;

    beforeEach(() => {
      helper = new QueryBuilderHelper(mockQueryBuilder, 'test');
    });

    it('应该能够构建JSON字段包含查询', () => {
      helper.whereJsonContains('metadata', { key: 'value' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'test.metadata::jsonb @> :value',
        { value: JSON.stringify({ key: 'value' }) }
      );
    });

    it('应该能够构建JSON字段查询', () => {
      helper.whereJsonbField('metadata', '>', 10);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'test.metadata::jsonb > :value',
        { value: 10 }
      );
    });

    it('应该能够构建时间范围查询', () => {
      const startTime = new Date('2023-01-01');
      const endTime = new Date('2023-12-31');
      
      helper.whereTimeRange('createdAt', startTime, endTime);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'test.createdAt BETWEEN :startTime AND :endTime',
        { startTime, endTime }
      );
    });

    it('应该能够获取原始查询构建器', () => {
      const qb = helper.getQueryBuilder();
      expect(qb).toBe(mockQueryBuilder);
    });
  });
});