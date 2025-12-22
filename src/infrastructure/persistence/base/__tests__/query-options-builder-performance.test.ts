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
}

/**
 * 查询构建器性能测试
 */
describe('QueryOptionsBuilder 性能测试', () => {
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

  describe('构建器创建性能', () => {
    it('应该快速创建查询构建器实例', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        QueryOptionsBuilder.create<TestModel>();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 创建1000个构建器应该在100ms内完成
      expect(duration).toBeLessThan(100);
      console.log(`创建1000个查询构建器耗时: ${duration.toFixed(2)}ms`);
    });

    it('应该快速构建基础查询选项', () => {
      const builder = QueryOptionsBuilder.create<TestModel>();
      
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        builder
          .limit(10)
          .offset(0)
          .sortBy('createdAt')
          .sortOrder('desc')
          .build();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 构建1000个查询选项应该在50ms内完成
      expect(duration).toBeLessThan(50);
      console.log(`构建1000个基础查询选项耗时: ${duration.toFixed(2)}ms`);
    });
  });

  describe('复杂查询构建性能', () => {
    it('应该快速构建复杂的多条件查询', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        QueryOptionsBuilder.create<TestModel>()
          .equals('status', 'active')
          .greaterThan('priority', 5)
          .between('createdAt', new Date('2023-01-01'), new Date('2023-12-31'))
          .like('name', '%test%')
          .in('id', ['1', '2', '3'])
          .excludeSoftDeleted()
          .limit(20)
          .offset(0)
          .sortBy('priority')
          .sortOrder('desc')
          .build();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 构建100个复杂查询应该在100ms内完成
      expect(duration).toBeLessThan(100);
      console.log(`构建100个复杂查询耗时: ${duration.toFixed(2)}ms`);
    });

    it('应该快速构建包含JSON查询的复杂查询', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        QueryOptionsBuilder.create<TestModel>()
          .equals('status', 'active')
          .jsonContains('metadata', { type: 'user' })
          .jsonPath('metadata', 'settings.theme', 'dark')
          .greaterThan('priority', 5)
          .limit(10)
          .build();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 构建100个包含JSON查询的复杂查询应该在100ms内完成
      expect(duration).toBeLessThan(100);
      console.log(`构建100个包含JSON查询的复杂查询耗时: ${duration.toFixed(2)}ms`);
    });
  });

  describe('模板系统性能', () => {
    it('应该快速使用模板构建查询', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        templateManager.buildWithTemplate('pagination', {
          page: 1,
          pageSize: 20
        });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 使用模板构建100个查询应该在50ms内完成
      expect(duration).toBeLessThan(50);
      console.log(`使用模板构建100个查询耗时: ${duration.toFixed(2)}ms`);
    });

    it('应该快速使用时间范围模板', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        templateManager.buildWithTemplate('timeRange', {
          field: 'createdAt',
          startTime: new Date('2023-01-01'),
          endTime: new Date('2023-12-31')
        });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 使用时间范围模板构建100个查询应该在50ms内完成
      expect(duration).toBeLessThan(50);
      console.log(`使用时间范围模板构建100个查询耗时: ${duration.toFixed(2)}ms`);
    });

    it('应该快速使用搜索模板', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        templateManager.buildWithTemplate('search', {
          field: 'name',
          keyword: 'test'
        });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 使用搜索模板构建100个查询应该在50ms内完成
      expect(duration).toBeLessThan(50);
      console.log(`使用搜索模板构建100个查询耗时: ${duration.toFixed(2)}ms`);
    });
  });

  describe('内存使用性能', () => {
    it('不应该创建过多的内存开销', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // 创建大量构建器实例
      const builders: QueryOptionsBuilder<TestModel>[] = [];
      for (let i = 0; i < 1000; i++) {
        builders.push(
          QueryOptionsBuilder.create<TestModel>()
            .equals('status', 'active')
            .greaterThan('priority', 5)
            .limit(10)
            .build()
        );
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // 内存增加不应该超过10MB
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      console.log(`创建1000个构建器实例内存增加: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('缓存性能', () => {
    it('应该快速缓存和检索模板结果', () => {
      const startTime = performance.now();
      
      // 多次使用相同的模板参数
      for (let i = 0; i < 200; i++) {
        templateManager.buildWithTemplate('pagination', {
          page: 1,
          pageSize: 20
        });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 缓存后的查询应该更快
      expect(duration).toBeLessThan(100);
      console.log(`缓存后构建200个相同查询耗时: ${duration.toFixed(2)}ms`);
      
      const stats = templateManager.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      console.log(`缓存命中率统计: ${JSON.stringify(stats)}`);
    });
  });

  describe('并发性能', () => {
    it('应该支持并发查询构建', async () => {
      const startTime = performance.now();
      
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve(
            QueryOptionsBuilder.create<TestModel>()
              .equals('status', 'active')
              .greaterThan('priority', i)
              .limit(10)
              .build()
          )
        );
      }
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 并发构建100个查询应该在200ms内完成
      expect(duration).toBeLessThan(200);
      console.log(`并发构建100个查询耗时: ${duration.toFixed(2)}ms`);
    });
  });
});