/**
 * ToolDescriptionGenerator 单元测试
 * 测试工具描述生成功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateToolDescription,
  generateToolListDescription,
  generateToolTableRow,
  generateToolTable,
  type ToolDescriptionFormat
} from '../tool-description-generator';
import type { Tool } from '@modular-agent/types';

// Mock 模板和工具
vi.mock('@modular-agent/common-utils', () => ({
  renderTemplate: vi.fn((template: string, variables: Record<string, unknown>) => {
    // 简单的模板渲染实现用于测试
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(variables[key] || ''));
  })
}));

vi.mock('@modular-agent/prompt-templates', () => ({
  TOOL_DESCRIPTION_TABLE_TEMPLATE: {
    content: '| {{toolName}} | {{toolId}} | {{toolDescription}} |'
  },
  TOOL_DESCRIPTION_SINGLE_LINE_TEMPLATE: '{{toolName}}: {{toolDescription}}',
  TOOL_DESCRIPTION_LIST_TEMPLATE: '- {{toolName}} ({{toolId}}): {{toolDescription}}'
}));

describe('ToolDescriptionGenerator', () => {
  let mockTool1: Tool;
  let mockTool2: Tool;
  let mockTool3: Tool;

  beforeEach(() => {
    mockTool1 = {
      id: 'tool-1',
      name: 'Calculator',
      type: 'STATELESS' as const,
      description: 'Performs basic calculations',
      parameters: {
        properties: {},
        required: []
      }
    };

    mockTool2 = {
      id: 'tool-2',
      name: 'Weather',
      type: 'STATELESS' as const,
      description: 'Gets weather information',
      parameters: {
        properties: {},
        required: []
      }
    };

    mockTool3 = {
      id: 'tool-3',
      name: 'Email',
      type: 'STATELESS' as const,
      description: 'Sends emails',
      parameters: {
        properties: {},
        required: []
      }
    };
  });

  describe('generateToolDescription', () => {
    it('应该生成表格格式的工具描述', () => {
      const description = generateToolDescription(mockTool1, 'table');

      expect(description).toBe('| Calculator | tool-1 | Performs basic calculations |');
    });

    it('应该生成单行格式的工具描述', () => {
      const description = generateToolDescription(mockTool1, 'single-line');

      expect(description).toBe('Calculator: Performs basic calculations');
    });

    it('应该生成列表格式的工具描述', () => {
      const description = generateToolDescription(mockTool1, 'list');

      expect(description).toBe('- Calculator (tool-1): Performs basic calculations');
    });

    it('应该处理没有描述的工具', () => {
      const toolWithoutDesc = {
        ...mockTool1,
        description: undefined as unknown as string
      };

      const description = generateToolDescription(toolWithoutDesc, 'single-line');

      expect(description).toContain('No description');
    });

    it('默认应该使用单行格式', () => {
      const description = generateToolDescription(mockTool1, 'single-line' as ToolDescriptionFormat);

      expect(description).toBe('Calculator: Performs basic calculations');
    });
  });

  describe('generateToolListDescription', () => {
    it('应该生成表格格式的工具列表描述', () => {
      const tools = [mockTool1, mockTool2, mockTool3];
      const description = generateToolListDescription(tools, 'table');

      expect(description).toContain('| Calculator | tool-1 | Performs basic calculations |');
      expect(description).toContain('| Weather | tool-2 | Gets weather information |');
      expect(description).toContain('| Email | tool-3 | Sends emails |');
      expect(description.split('\n')).toHaveLength(3);
    });

    it('应该生成包含表头的表格格式', () => {
      const tools = [mockTool1, mockTool2, mockTool3];
      const description = generateToolListDescription(tools, 'table', {
        includeHeader: true
      });

      expect(description).toContain('| 工具名称 | 工具ID | 说明 |');
      expect(description).toContain('|----------|--------|------|');
      expect(description).toContain('| Calculator | tool-1 | Performs basic calculations |');
    });

    it('应该生成单行格式的工具列表描述（默认换行符）', () => {
      const tools = [mockTool1, mockTool2, mockTool3];
      const description = generateToolListDescription(tools, 'single-line');

      const lines = description.split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('Calculator: Performs basic calculations');
      expect(lines[1]).toBe('Weather: Gets weather information');
      expect(lines[2]).toBe('Email: Sends emails');
    });

    it('应该支持自定义分隔符', () => {
      const tools = [mockTool1, mockTool2, mockTool3];
      const description = generateToolListDescription(tools, 'single-line', {
        separator: ' | '
      });

      expect(description).toBe('Calculator: Performs basic calculations | Weather: Gets weather information | Email: Sends emails');
    });

    it('应该生成列表格式的工具列表描述', () => {
      const tools = [mockTool1, mockTool2, mockTool3];
      const description = generateToolListDescription(tools, 'list');

      const lines = description.split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('- Calculator (tool-1): Performs basic calculations');
      expect(lines[1]).toBe('- Weather (tool-2): Gets weather information');
      expect(lines[2]).toBe('- Email (tool-3): Sends emails');
    });

    it('应该处理空工具数组', () => {
      const description = generateToolListDescription([], 'table');

      expect(description).toBe('');
    });

    it('应该处理 undefined 工具数组', () => {
      const description = generateToolListDescription(undefined as unknown as Tool[], 'table');

      expect(description).toBe('');
    });

    it('应该处理单个工具', () => {
      const description = generateToolListDescription([mockTool1], 'single-line');

      expect(description).toBe('Calculator: Performs basic calculations');
    });

    it('应该处理两个工具', () => {
      const description = generateToolListDescription([mockTool1, mockTool2], 'list');

      const lines = description.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('- Calculator (tool-1): Performs basic calculations');
      expect(lines[1]).toBe('- Weather (tool-2): Gets weather information');
    });
  });

  describe('generateToolTableRow', () => {
    it('应该生成表格行格式', () => {
      const row = generateToolTableRow(mockTool1);

      expect(row).toBe('| Calculator | tool-1 | Performs basic calculations |');
    });

    it('应该处理没有描述的工具', () => {
      const toolWithoutDesc = {
        ...mockTool1,
        description: undefined as unknown as string
      };

      const row = generateToolTableRow(toolWithoutDesc);

      expect(row).toContain('No description');
    });

    it('应该包含所有必要字段', () => {
      const row = generateToolTableRow(mockTool1);

      expect(row).toContain('Calculator');
      expect(row).toContain('tool-1');
      expect(row).toContain('Performs basic calculations');
    });
  });

  describe('generateToolTable', () => {
    it('应该生成完整的表格包含表头', () => {
      const table = generateToolTable([mockTool1, mockTool2]);

      const lines = table.split('\n');
      expect(lines).toHaveLength(4);
      expect(lines[0]).toBe('| 工具名称 | 工具ID | 说明 |');
      expect(lines[1]).toBe('|----------|--------|------|');
      expect(lines[2]).toBe('| Calculator | tool-1 | Performs basic calculations |');
      expect(lines[3]).toBe('| Weather | tool-2 | Gets weather information |');
    });

    it('应该处理空工具数组', () => {
      const table = generateToolTable([]);

      expect(table).toBe('');
    });

    it('应该处理单个工具', () => {
      const table = generateToolTable([mockTool1]);

      const lines = table.split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('| 工具名称 | 工具ID | 说明 |');
      expect(lines[1]).toBe('|----------|--------|------|');
      expect(lines[2]).toBe('| Calculator | tool-1 | Performs basic calculations |');
    });

    it('应该处理多个工具', () => {
      const table = generateToolTable([mockTool1, mockTool2, mockTool3]);

      const lines = table.split('\n');
      expect(lines).toHaveLength(5);
      expect(lines[0]).toBe('| 工具名称 | 工具ID | 说明 |');
      expect(lines[1]).toBe('|----------|--------|------|');
      expect(lines[2]).toContain('Calculator');
      expect(lines[3]).toContain('Weather');
      expect(lines[4]).toContain('Email');
    });
  });

  describe('边界情况', () => {
    it('应该处理特殊字符在描述中', () => {
      const toolWithSpecialChars = {
        ...mockTool1,
        description: 'Calculates with special chars: @#$%'
      };

      const description = generateToolDescription(toolWithSpecialChars, 'single-line');

      expect(description).toContain('@#$%');
    });

    it('应该处理长描述', () => {
      const toolWithLongDesc = {
        ...mockTool1,
        description: 'This is a very long description that goes on and on and on and on and on and on and on and on and on and on and on and on and on'
      };

      const description = generateToolDescription(toolWithLongDesc, 'single-line');

      expect(description).toContain('This is a very long description');
    });

    it('应该处理空名称', () => {
      const toolWithEmptyName = {
        ...mockTool1,
        name: ''
      };

      const description = generateToolDescription(toolWithEmptyName, 'single-line');

      expect(description).toContain(':');
    });

    it('应该处理空 ID', () => {
      const toolWithEmptyId = {
        ...mockTool1,
        id: ''
      };

      const description = generateToolDescription(toolWithEmptyId, 'list');

      expect(description).toContain('()');
    });
  });
});
