/**
 * 会话笔记工具
 * 支持记录和回忆会话笔记
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import type { ToolDefinition, ToolResult, ToolRegistryConfig } from '../types.js';

/**
 * 笔记条目
 */
interface NoteEntry {
  timestamp: string;
  category: string;
  content: string;
}

/**
 * 会话笔记实例
 */
class SessionNoteInstance {
  private memoryFile: string;
  private notes: NoteEntry[] = [];
  private loaded: boolean = false;

  constructor(memoryFile: string) {
    this.memoryFile = memoryFile;
  }

  /**
   * 加载笔记
   */
  private async loadNotes(): Promise<void> {
    if (this.loaded) return;

    if (!existsSync(this.memoryFile)) {
      this.notes = [];
      this.loaded = true;
      return;
    }

    try {
      const content = await readFile(this.memoryFile, 'utf-8');
      this.notes = JSON.parse(content);
    } catch {
      this.notes = [];
    }
    this.loaded = true;
  }

  /**
   * 保存笔记
   */
  private async saveNotes(): Promise<void> {
    const dir = dirname(this.memoryFile);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(this.memoryFile, JSON.stringify(this.notes, null, 2), 'utf-8');
  }

  /**
   * 记录笔记
   */
  async record(content: string, category: string = 'general'): Promise<ToolResult> {
    try {
      await this.loadNotes();

      const note: NoteEntry = {
        timestamp: new Date().toISOString(),
        category,
        content
      };
      this.notes.push(note);

      await this.saveNotes();

      return {
        success: true,
        content: `Recorded note: ${content} (category: ${category})`
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        error: `Failed to record note: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 回忆笔记
   */
  async recall(category?: string): Promise<ToolResult> {
    try {
      await this.loadNotes();

      if (this.notes.length === 0) {
        return {
          success: true,
          content: 'No notes recorded yet.'
        };
      }

      let filteredNotes = this.notes;
      if (category) {
        filteredNotes = this.notes.filter(n => n.category === category);
        if (filteredNotes.length === 0) {
          return {
            success: true,
            content: `No notes found in category: ${category}`
          };
        }
      }

      const formatted = filteredNotes.map((note, index) => {
        return `${index + 1}. [${note.category}] ${note.content}\n   (recorded at ${note.timestamp})`;
      });

      return {
        success: true,
        content: 'Recorded Notes:\n' + formatted.join('\n')
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        error: `Failed to recall notes: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

/**
 * 创建记录笔记工具
 */
export function createRecordNoteTool(config: ToolRegistryConfig): ToolDefinition {
  const memoryFile = resolve(config.workspaceDir!, config.memoryFile!);

  return {
    id: 'record_note',
    name: 'record_note',
    type: 'STATEFUL',
    description: `Record important information as session notes for future reference. Use this to record key facts, user preferences, decisions, or context that should be recalled later in the agent execution chain. Each note is timestamped.`,
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The information to record as a note. Be concise but specific.'
        },
        category: {
          type: 'string',
          description: "Optional category/tag for this note (e.g., 'user_preference', 'project_info', 'decision')"
        }
      },
      required: ['content']
    },
    factory: () => {
      const instance = new SessionNoteInstance(memoryFile);
      return {
        execute: async (params: Record<string, any>) => {
          return instance.record(params['content'], params['category']);
        }
      };
    }
  };
}

/**
 * 创建回忆笔记工具
 */
export function createRecallNoteTool(config: ToolRegistryConfig): ToolDefinition {
  const memoryFile = resolve(config.workspaceDir!, config.memoryFile!);

  return {
    id: 'recall_notes',
    name: 'recall_notes',
    type: 'STATEFUL',
    description: `Recall all previously recorded session notes. Use this to retrieve important information, context, or decisions from earlier in the session or previous agent execution chains.`,
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional: filter notes by category'
        }
      }
    },
    factory: () => {
      const instance = new SessionNoteInstance(memoryFile);
      return {
        execute: async (params: Record<string, any>) => {
          return instance.recall(params['category']);
        }
      };
    }
  };
}
