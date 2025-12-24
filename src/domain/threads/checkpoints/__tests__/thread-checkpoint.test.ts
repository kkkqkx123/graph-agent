import { ThreadCheckpoint } from '../entities/thread-checkpoint';
import { CheckpointType } from '../../../checkpoint/value-objects/checkpoint-type';
import { CheckpointStatus } from '../value-objects/checkpoint-status';
import { ID } from '../../../common/value-objects/id';

describe('ThreadCheckpoint', () => {
  let threadId: ID;
  let stateData: Record<string, unknown>;

  beforeEach(() => {
    threadId = ID.generate();
    stateData = { key: 'value', number: 42 };
  });

  describe('create', () => {
    it('应该创建有效的自动检查点', () => {
      const checkpoint = ThreadCheckpoint.create(
        threadId,
        CheckpointType.auto(),
        stateData
      );

      expect(checkpoint).toBeDefined();
      expect(checkpoint.threadId.equals(threadId)).toBe(true);
      expect(checkpoint.type.isAuto()).toBe(true);
      expect(checkpoint.status.isActive()).toBe(true);
      expect(checkpoint.stateData).toEqual(stateData);
      expect(checkpoint.sizeBytes).toBeGreaterThan(0);
      expect(checkpoint.restoreCount).toBe(0);
    });

    it('应该创建带有过期时间的检查点', () => {
      const expirationHours = 24;
      const checkpoint = ThreadCheckpoint.create(
        threadId,
        CheckpointType.manual(),
        stateData,
        'Test Checkpoint',
        'Test Description',
        ['test'],
        { custom: 'metadata' },
        expirationHours
      );

      expect(checkpoint.expiresAt).toBeDefined();
      expect(checkpoint.title).toBe('Test Checkpoint');
      expect(checkpoint.description).toBe('Test Description');
      expect(checkpoint.tags).toContain('test');
      expect(checkpoint.metadata.custom).toBe('metadata');
    });

    it('应该为错误检查点强制要求描述', () => {
      expect(() => {
        ThreadCheckpoint.create(
          threadId,
          CheckpointType.error(),
          stateData
        );
      }).toThrow('错误检查点必须有描述');
    });

    it('应该为里程碑检查点强制要求标题', () => {
      expect(() => {
        ThreadCheckpoint.create(
          threadId,
          CheckpointType.milestone(),
          stateData
        );
      }).toThrow('里程碑检查点必须有标题');
    });

    it('应该拒绝空的状态数据', () => {
      expect(() => {
        ThreadCheckpoint.create(
          threadId,
          CheckpointType.auto(),
          {}
        );
      }).toThrow('状态数据不能为空');
    });
  });

  describe('状态管理', () => {
    let checkpoint: ThreadCheckpoint;

    beforeEach(() => {
      checkpoint = ThreadCheckpoint.create(
        threadId,
        CheckpointType.auto(),
        stateData
      );
    });

    it('应该正确检查有效性', () => {
      expect(checkpoint.isValid()).toBe(true);
      expect(checkpoint.canRestore()).toBe(true);
    });

    it('应该正确检查过期状态', () => {
      expect(checkpoint.isExpired()).toBe(false);
    });

    it('应该标记为已恢复', () => {
      const initialRestoreCount = checkpoint.restoreCount;
      checkpoint.markRestored();

      expect(checkpoint.restoreCount).toBe(initialRestoreCount + 1);
      expect(checkpoint.lastRestoredAt).toBeDefined();
    });

    it('应该标记为已过期', () => {
      checkpoint.markExpired();
      expect(checkpoint.status.isExpired()).toBe(true);
      expect(checkpoint.canRestore()).toBe(false);
    });

    it('应该标记为已损坏', () => {
      checkpoint.markCorrupted();
      expect(checkpoint.status.isCorrupted()).toBe(true);
      expect(checkpoint.canRestore()).toBe(false);
    });

    it('应该标记为已归档', () => {
      checkpoint.markArchived();
      expect(checkpoint.status.isArchived()).toBe(true);
      expect(checkpoint.canRestore()).toBe(false);
    });
  });

  describe('数据更新', () => {
    let checkpoint: ThreadCheckpoint;

    beforeEach(() => {
      checkpoint = ThreadCheckpoint.create(
        threadId,
        CheckpointType.auto(),
        stateData,
        'Original Title',
        'Original Description',
        ['original']
      );
    });

    it('应该更新状态数据', () => {
      const newStateData = { newKey: 'newValue' };
      checkpoint.updateStateData(newStateData);

      expect(checkpoint.stateData).toEqual(newStateData);
    });

    it('应该更新标题', () => {
      const newTitle = 'New Title';
      checkpoint.updateTitle(newTitle);

      expect(checkpoint.title).toBe(newTitle);
    });

    it('应该更新描述', () => {
      const newDescription = 'New Description';
      checkpoint.updateDescription(newDescription);

      expect(checkpoint.description).toBe(newDescription);
    });

    it('应该添加标签', () => {
      checkpoint.addTag('newTag');
      expect(checkpoint.tags).toContain('newTag');
      expect(checkpoint.tags).toContain('original');
    });

    it('应该移除标签', () => {
      checkpoint.removeTag('original');
      expect(checkpoint.tags).not.toContain('original');
    });

    it('应该更新元数据', () => {
      const newMetadata = { updated: true };
      checkpoint.updateMetadata(newMetadata);

      expect(checkpoint.metadata).toEqual(newMetadata);
    });

    it('应该拒绝更新已删除的检查点', () => {
      checkpoint.markAsDeleted();

      expect(() => {
        checkpoint.updateTitle('New Title');
      }).toThrow('无法更新已删除的检查点');
    });
  });

  describe('过期时间管理', () => {
    let checkpoint: ThreadCheckpoint;

    beforeEach(() => {
      checkpoint = ThreadCheckpoint.create(
        threadId,
        CheckpointType.auto(),
        stateData
      );
    });

    it('应该设置过期时间', () => {
      const hours = 48;
      checkpoint.setExpiration(hours);

      expect(checkpoint.expiresAt).toBeDefined();
    });

    it('应该延长过期时间', () => {
      checkpoint.setExpiration(24);
      const originalExpiresAt = checkpoint.expiresAt;

      checkpoint.extendExpiration(12);

      expect(checkpoint.expiresAt!.getMilliseconds()).toBeGreaterThan(originalExpiresAt!.getMilliseconds());
    });

    it('应该拒绝无效的过期时间', () => {
      expect(() => {
        checkpoint.setExpiration(-1);
      }).toThrow('过期时间必须为正数');
    });
  });

  describe('年龄计算', () => {
    let checkpoint: ThreadCheckpoint;

    beforeEach(() => {
      checkpoint = ThreadCheckpoint.create(
        threadId,
        CheckpointType.auto(),
        stateData
      );
    });

    it('应该计算年龄（秒）', () => {
      const age = checkpoint.getAgeInSeconds();
      expect(age).toBeGreaterThanOrEqual(0);
    });

    it('应该计算年龄（小时）', () => {
      const age = checkpoint.getAgeInHours();
      expect(age).toBeGreaterThanOrEqual(0);
    });
  });

  describe('序列化', () => {
    let checkpoint: ThreadCheckpoint;

    beforeEach(() => {
      checkpoint = ThreadCheckpoint.create(
        threadId,
        CheckpointType.manual(),
        stateData,
        'Test Title',
        'Test Description',
        ['test'],
        { custom: 'metadata' },
        24
      );
    });

    it('应该转换为字典', () => {
      const dict = checkpoint.toDict();

      expect(dict.id).toBe(checkpoint.checkpointId.toString());
      expect(dict.threadId).toBe(checkpoint.threadId.toString());
      expect(dict.type).toBe(checkpoint.type.getValue());
      expect(dict.status).toBe(checkpoint.status.statusValue);
      expect(dict.title).toBe('Test Title');
      expect(dict.description).toBe('Test Description');
      expect(dict.tags).toEqual(['test']);
      expect((dict.metadata as any).custom).toBe('metadata');
    });

    it('应该从字典创建实例', () => {
      const dict = checkpoint.toDict();
      const restored = ThreadCheckpoint.fromDict(dict);

      expect(restored.checkpointId.equals(checkpoint.checkpointId)).toBe(true);
      expect(restored.threadId.equals(checkpoint.threadId)).toBe(true);
      expect(restored.type.equals(checkpoint.type)).toBe(true);
      expect(restored.status.equals(checkpoint.status)).toBe(true);
      expect(restored.stateData).toEqual(checkpoint.stateData);
    });
  });

  describe('删除管理', () => {
    let checkpoint: ThreadCheckpoint;

    beforeEach(() => {
      checkpoint = ThreadCheckpoint.create(
        threadId,
        CheckpointType.auto(),
        stateData
      );
    });

    it('应该标记为已删除', () => {
      expect(checkpoint.isDeleted()).toBe(false);

      checkpoint.markAsDeleted();

      expect(checkpoint.isDeleted()).toBe(true);
    });

    it('应该允许重复标记为已删除', () => {
      checkpoint.markAsDeleted();

      expect(() => {
        checkpoint.markAsDeleted();
      }).not.toThrow();

      expect(checkpoint.isDeleted()).toBe(true);
    });
  });

  describe('业务标识', () => {
    it('应该生成正确的业务标识', () => {
      const checkpoint = ThreadCheckpoint.create(
        threadId,
        CheckpointType.auto(),
        stateData
      );

      const identifier = checkpoint.getBusinessIdentifier();
      expect(identifier).toBe(`thread-checkpoint:${checkpoint.checkpointId.toString()}`);
    });
  });
});