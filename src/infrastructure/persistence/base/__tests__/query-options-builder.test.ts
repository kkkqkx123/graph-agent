import { QueryOptionsBuilder } from '../query-options-builder';
import { QueryTemplateManager, CommonQueryTemplates } from '../query-template-manager';
import { ObjectLiteral } from 'typeorm';

/**
 * 模拟模型类型
 */
interface TestModel extends ObjectLiteral {
  id: string;
  name: string;
  status: string;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  metadata: any;
  isDeleted: boolean;
}

/**
 * 查询构建器功能测试
 */
describe('QueryOptionsBuilder 功能测试', () => {
  let templateManager: QueryTemplateManager<TestModel>;

  beforeEach(() => {
    templateManager = new QueryTemplateManager<TestModel>();
    // 注册通用模板
    templateManager
      .registerTemplate(CommonQueryTemplates.createTimeRangeTemplate<TestModel>())
      .registerTemplate(CommonQueryTemplates.createStatusTemplate<TestModel>())
      .registerTemplate(CommonQueryTemplates.createSearchTemplate<TestModel>())
      .registerTemplate(CommonQueryTemplates.createPaginationTemplate<TestModel>())
      .registerTemplate(CommonQueryTemplates.createActiveRecordsTemplate<TestModel>())
      .registerTemplate(CommonQueryTemplates.createSoftDeleteTemplate<TestModel>());
  });

  describe('基础查询构建', () => {
    it('应该正确构建基础查询选项', () => {
      const builder = QueryOptionsBuilder.create<TestModel>()
        .limit(10)
        .offset(20)
        .sortBy('createdAt')
        .sortOrder('desc');

      const options = builder.build();

      expect(options.limit).toBe(10);
      expect(options.offset).toBe(20);
      expect(options.sortBy).toBe('createdAt');
      expect(options.sortOrder).toBe('desc');
    });

    it('应该正确构建过滤条件', () => {
      const builder = QueryOptionsBuilder.create<TestModel>()
        .filter('status', 'active')
        .filter('priority', 5);

      const options = builder.build();

      expect(options.filters).toBeDefined();
      expect(options.filters!['status']).toBe('active');
      expect(options.filters!['priority']).toBe(5);
    });

    it('应该正确构建多个过滤条件', () => {
      const builder = QueryOptionsBuilder.create<TestModel>()
        .filters({
          status: 'active',
          priority: 5,
          name: 'test'
        });

      const options = builder.build();

      expect(options.filters).toBeDefined();
      expect(options.filters!['status']).toBe('active');
      expect(options.filters!['priority']).toBe(5);
      expect(options.filters!['name']).toBe('test');
    });
  });

  describe('条件查询构建', () => {
    it('应该正确构建相等条件', () => {
      const builder = QueryOptionsBuilder.create<TestModel>()
        .equals('status', 'active');

      const options = builder.build();

      expect(options.customConditions).toBeDefined();
      // 验证自定义条件函数
      const mockQb = {
        andWhere: jest.fn()
      };
      options.customConditions!(mockQb as any);
      expect(mockQb.andWhere).toHaveBeenCalledWith('entity.status = :status', { status: 'active' });
    });

    it('应该正确构建IN条件', () => {
      const builder = QueryOptionsBuilder.create<TestModel>()
        .in('status', ['active', 'pending']);

      const options = builder.build();

      expect(options.customConditions).toBeDefined();
      const mockQb = {
        andWhere: jest.fn()
      };
      options.customConditions!(mockQb as any);
      expect(mockQb.andWhere).toHaveBeenCalledWith('entity.status IN (:...status)', { status: ['active', 'pending'] });
    });

    it('应该正确构建LIKE条件', () => {
      const builder = QueryOptionsBuilder.create<TestModel>()
        .like('name', '%test%');

      const options = builder.build();

      expect(options.customConditions).toBeDefined();
      const mockQb = {
        andWhere: jest.fn()
      };
      options.customConditions!(mockQb as any);
      expect(mockQb.andWhere).toHaveBeenCalledWith('entity.name LIKE :name', { name: '%test%' });
    });

    it('应该正确构建范围条件', () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      const builder = QueryOptionsBuilder.create<TestModel>()
        .between('createdAt', startDate, endDate);

      const options = builder.build();

      expect(options.customConditions).toBeDefined();
      const mockQb = {
        andWhere: jest.fn()
      };
      options.customConditions!(mockQb as any);
      expect(mockQb.andWhere).toHaveBeenCalledWith('entity.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate });
    });

    it('应该正确构建比较条件', () => {
      const builder = QueryOptionsBuilder.create<TestModel>()
        .greaterThan('priority', 5)
        .lessThan('priority', 10);

      const options = builder.build();

      expect(options.customConditions).toBeDefined();
      const mockQb = {
        andWhere: jest.fn()
      };
      options.customConditions!(mockQb as any);
      expect(mockQb.andWhere).toHaveBeenCalledWith('entity.priority > :priority', { priority: 5 });
      expect(mockQb.andWhere).toHaveBeenCalledWith('entity.priority < :priority', { priority: 10 });
    });
  });

  describe('JSON查询构建', () => {
    it('应该正确构建JSON包含条件', () => {
      const builder = QueryOptionsBuilder.create<TestModel>()
        .jsonContains('metadata', { type: 'user' });

      const options = builder.build();

      expect(options.customConditions).toBeDefined();
      const mockQb = {
        andWhere: jest.fn()
      };
      options.customConditions!(mockQb as any);
      expect(mockQb.andWhere).toHaveBeenCalledWith('entity.metadata::jsonb @> :value', { value: JSON.stringify({ type: 'user' }) });
    });

    it('应该正确构建JSON路径查询', () => {
      const builder = QueryOptionsBuilder.create<TestModel>()
        .jsonPath('metadata', 'settings.theme', 'dark');

      const options = builder.build();

      expect(options.customConditions).toBeDefined();
      const mockQb = {
        andWhere: jest.fn()
      };
      options.customConditions!(mockQb as any);
      expect(mockQb.andWhere).toHaveBeenCalledWith('entity.metadata->>:path = :value', { path: 'settings.theme', value: 'dark' });
    });
  });

  describe('软删除处理', () => {
    it('应该正确排除软删除记录', () => {
      const builder = QueryOptionsBuilder.create<TestModel>()
        .excludeSoftDeleted();

      const options = builder.build();

      expect(options.customConditions).toBeDefined();
      const mockQb = {
        andWhere: jest.fn()
      };
      options.customConditions!(mockQb as any);
      expect(mockQb.andWhere).toHaveBeenCalledWith('entity.isDeleted = false');
    });

    it('应该正确只查询软删除记录', () => {
      const builder = QueryOptionsBuilder.create<TestModel>()
        .onlySoftDeleted();

      const options = builder.build();

      expect(options.customConditions).toBeDefined();
      const mockQb = {
        andWhere: jest.fn()
      };
      options.customConditions!(mockQb as any);
      expect(mockQb.andWhere).toHaveBeenCalledWith('entity.isDeleted = true');
    });
  });

  describe('关联查询', () => {
    it('应该正确构建关联查询', () => {
      const builder = QueryOptionsBuilder.create<TestModel>()
        .join('messages', 'm', 'm.threadId = entity.id')
        .join('session', 's', undefined, 'inner');

      const options = builder.build();

      expect(options.joins).toBeDefined();
      expect(options.joins!.length).toBe(2);
      expect(options.joins![0]).toEqual({
        alias: 'm',
        property: 'messages',
        condition: 'm.threadId = entity.id',
        type: 'left'
      });
      expect(options.joins![1]).toEqual({
        alias: 's',
        property: 'session',
        condition: undefined,
        type: 'inner'
      });
    });
  });

  describe('模板系统功能', () => {
    it('应该正确使用时间范围模板', () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      const builder = templateManager.buildWithTemplate('timeRange', {
        field: 'createdAt',
        startTime: startDate,
        endTime: endDate
      });

      const options = builder.build();

      expect(options.customConditions).toBeDefined();
      expect(options.sortBy).toBe('createdAt');
      expect(options.sortOrder).toBe('asc');

      const mockQb = {
        andWhere: jest.fn()
      };
      options.customConditions!(mockQb as any);
      expect(mockQb.andWhere).toHaveBeenCalledWith('entity.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate });
    });

    it('应该正确使用状态模板', () => {
      const builder = templateManager.buildWithTemplate('status', {
        field: 'status',
        status: 'active'
      });

      const options = builder.build();

      expect(options.customConditions).toBeDefined();
      expect(options.sortBy).toBe('createdAt');
      expect(options.sortOrder).toBe('desc');

      const mockQb = {
        andWhere: jest.fn()
      };
      options.customConditions!(mockQb as any);
      expect(mockQb.andWhere).toHaveBeenCalledWith('entity.status = :status', { status: 'active' });
    });

    it('应该正确使用搜索模板', () => {
      const builder = templateManager.buildWithTemplate('search', {
        field: 'name',
        keyword: 'test'
      });

      const options = builder.build();

      expect(options.customConditions).toBeDefined();
      expect(options.sortBy).toBe('createdAt');
      expect(options.sortOrder).toBe('desc');

      const mockQb = {
        andWhere: jest.fn()
      };
      options.customConditions!(mockQb as any);
      expect(mockQb.andWhere).toHaveBeenCalledWith('entity.name ILIKE :name', { name: '%test%' });
    });

    it('应该正确使用分页模板', () => {
      const builder = templateManager.buildWithTemplate('pagination', {
        page: 2,
        pageSize: 20
      });

      const options = builder.build();

      expect(options.offset).toBe(20); // (2-1) * 20
      expect(options.limit).toBe(20);
      expect(options.sortBy).toBe('createdAt');
      expect(options.sortOrder).toBe('desc');
    });

    it('应该正确使用活跃记录模板', () => {
      const builder = templateManager.buildWithTemplate('activeRecords', {
        statusField: 'status',
        activeStatuses: ['active', 'pending']
      });

      const options = builder.build();

      expect(options.customConditions).toBeDefined();
      expect(options.sortBy).toBe('priority');
      expect(options.sortOrder).toBe('desc');

      const mockQb = {
        andWhere: jest.fn()
      };
      options.customConditions!(mockQb as any);
      expect(mockQb.andWhere).toHaveBeenCalledWith('entity.status IN (:...status)', { status: ['active', 'pending'] });
      expect(mockQb.andWhere).toHaveBeenCalledWith('entity.isDeleted = false');
    });
  });

  describe('构建器工厂方法', () => {
    it('应该正确从现有选项创建构建器', () => {
      const existingOptions = {
        limit: 10,
        offset: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
        filters: { status: 'active' }
      };

      const builder = QueryOptionsBuilder.fromOptions<TestModel>(existingOptions);
      const options = builder.build();

      expect(options.limit).toBe(10);
      expect(options.offset).toBe(20);
      expect(options.sortBy).toBe('createdAt');
      expect(options.sortOrder).toBe('desc');
      expect(options.filters).toEqual({ status: 'active' });
    });
  });

  describe('错误处理', () => {
    it('应该处理不存在的模板', () => {
      expect(() => {
        templateManager.buildWithTemplate('nonExistent', {});
      }).toThrow("查询模板 'nonExistent' 不存在");
    });

    it('应该处理模板参数验证失败', () => {
      expect(() => {
        templateManager.buildWithTemplate('timeRange', {
          field: 'createdAt'
          // 缺少 startTime 和 endTime
        });
      }).toThrow("查询模板 'timeRange' 参数验证失败");
    });

    it('应该处理不存在的模板组合', () => {
      expect(() => {
        templateManager.buildWithComposition('nonExistent');
      }).toThrow("模板组合 'nonExistent' 不存在");
    });
  });

  describe('链式调用', () => {
    it('应该支持流畅的链式调用', () => {
      const builder = QueryOptionsBuilder.create<TestModel>()
        .equals('status', 'active')
        .greaterThan('priority', 5)
        .lessThan('priority', 10)
        .like('name', '%test%')
        .limit(20)
        .offset(0)
        .sortBy('priority')
        .sortOrder('desc')
        .excludeSoftDeleted();

      const options = builder.build();

      expect(options.limit).toBe(20);
      expect(options.offset).toBe(0);
      expect(options.sortBy).toBe('priority');
      expect(options.sortOrder).toBe('desc');
      expect(options.customConditions).toBeDefined();
    });
  });
});