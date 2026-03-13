/**
 * Skill 命令组
 * 管理 Skill 的查看、加载和搜索
 */

import { Command } from 'commander';
import { SkillAdapter } from '../../adapters/skill-adapter.js';
import { getLogger } from '../../utils/logger.js';
import type { CommandOptions } from '../../types/cli-types.js';
import { handleError } from '../../utils/error-handler.js';
import { ValidationError } from '../../types/cli-types.js';

const logger = getLogger();

/**
 * 格式化 Skill 元数据
 */
function formatSkillMetadata(skill: any, verbose?: boolean): string {
  const lines: string[] = [];

  lines.push(`\n${'─'.repeat(60)}`);
  lines.push(`  Name: ${skill.name}`);
  lines.push(`  Description: ${skill.description}`);

  if (verbose) {
    if (skill.version) {
      lines.push(`  Version: ${skill.version}`);
    }
    if (skill.license) {
      lines.push(`  License: ${skill.license}`);
    }
    if (skill.allowedTools && skill.allowedTools.length > 0) {
      lines.push(`  Allowed Tools: ${skill.allowedTools.join(', ')}`);
    }
    if (skill.metadata) {
      lines.push(`  Metadata: ${JSON.stringify(skill.metadata, null, 2)}`);
    }
  }

  lines.push('─'.repeat(60));

  return lines.join('\n');
}

/**
 * 格式化 Skill 列表
 */
function formatSkillList(skills: any[], options?: { table?: boolean }): string {
  if (skills.length === 0) {
    return '没有找到 Skill';
  }

  if (options?.table) {
    const lines: string[] = [];
    lines.push('\n名称 | 描述 | 版本');
    lines.push('-'.repeat(60));

    for (const skill of skills) {
      const desc = skill.description.length > 40
        ? skill.description.substring(0, 40) + '...'
        : skill.description;
      const version = skill.version || '-';
      lines.push(`${skill.name} | ${desc} | ${version}`);
    }

    return lines.join('\n');
  }

  const lines: string[] = [`\n找到 ${skills.length} 个 Skill:\n`];

  for (const skill of skills) {
    lines.push(`  • ${skill.name}`);
    lines.push(`    ${skill.description}`);
    if (skill.version) {
      lines.push(`    (v${skill.version})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 格式化匹配结果
 */
function formatMatchResults(results: any[]): string {
  if (results.length === 0) {
    return '没有找到匹配的 Skill';
  }

  const lines: string[] = [`\n找到 ${results.length} 个匹配的 Skill:\n`];

  for (const result of results) {
    lines.push(`  • ${result.skill.name} (分数: ${result.score.toFixed(2)})`);
    lines.push(`    ${result.skill.description}`);
    lines.push(`    原因: ${result.reason}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 创建 Skill 命令组
 */
export function createSkillCommands(): Command {
  const skillCmd = new Command('skill')
    .description('管理 Skill');

  // 列出所有 Skill 命令
  skillCmd
    .command('list')
    .description('列出所有可用的 Skill')
    .option('-n, --name <name>', '按名称过滤')
    .option('-t, --table', '以表格格式输出')
    .option('-v, --verbose', '详细输出')
    .action(async (options: CommandOptions & { name?: string; table?: boolean; verbose?: boolean }) => {
      try {
        const adapter = new SkillAdapter();

        const filter = options.name ? { name: options.name } : undefined;
        const skills = await adapter.listSkills(filter);

        console.log(formatSkillList(skills, { table: options.table }));

        if (options.verbose) {
          console.log('\n详细列表:');
          for (const skill of skills) {
            console.log(formatSkillMetadata(skill, true));
          }
        }
      } catch (error) {
        handleError(error, {
          operation: 'listSkills',
          additionalInfo: { filter: { name: options.name } }
        });
      }
    });

  // 查看 Skill 详情命令
  skillCmd
    .command('show <name>')
    .description('查看 Skill 详情')
    .option('-v, --verbose', '详细输出')
    .option('-c, --content', '显示完整内容')
    .action(async (name, options: CommandOptions & { verbose?: boolean; content?: boolean }) => {
      try {
        const adapter = new SkillAdapter();

        const skill = await adapter.getSkill(name);

        if (!skill) {
          handleError(new ValidationError(`Skill 不存在: ${name}`), {
            operation: 'getSkill',
            additionalInfo: { name }
          });
          return;
        }

        console.log(formatSkillMetadata(skill, options.verbose));

        if (options.content) {
          console.log('\n完整内容:');
          console.log('─'.repeat(60));
          const content = await adapter.loadContent(name);
          console.log(content);
          console.log('─'.repeat(60));
        }
      } catch (error) {
        handleError(error, {
          operation: 'getSkill',
          additionalInfo: { name }
        });
      }
    });

  // 加载 Skill 内容命令
  skillCmd
    .command('load <name>')
    .description('加载 Skill 完整内容')
    .option('-p, --prompt', '转换为提示词格式')
    .action(async (name, options: CommandOptions & { prompt?: boolean }) => {
      try {
        const adapter = new SkillAdapter();

        if (options.prompt) {
          const prompt = await adapter.toPrompt(name);
          console.log(prompt);
        } else {
          const content = await adapter.loadContent(name);
          console.log(content);
        }
      } catch (error) {
        handleError(error, {
          operation: 'loadSkill',
          additionalInfo: { name, toPrompt: options.prompt }
        });
      }
    });

  // 搜索 Skill 命令
  skillCmd
    .command('search <query>')
    .description('根据描述搜索 Skill')
    .action(async (query) => {
      try {
        const adapter = new SkillAdapter();
        const results = await adapter.matchSkills(query);

        console.log(formatMatchResults(results));
      } catch (error) {
        handleError(error, {
          operation: 'matchSkills',
          additionalInfo: { query }
        });
      }
    });

  // 列出 Skill 资源命令
  skillCmd
    .command('resources <name>')
    .description('列出 Skill 的资源')
    .option('-t, --type <type>', '资源类型 (references|examples|scripts|assets)')
    .action(async (name, options: CommandOptions & { type?: string }) => {
      try {
        const adapter = new SkillAdapter();

        const resourceType = (options.type || 'scripts') as any;

        const resources = await adapter.listResources(name, resourceType);

        if (resources.length === 0) {
          console.log(`Skill '${name}' 没有 ${resourceType} 资源`);
          return;
        }

        console.log(`\nSkill '${name}' 的 ${resourceType} 资源:`);
        console.log('─'.repeat(40));

        for (const resource of resources) {
          console.log(`  • ${resource}`);
        }
      } catch (error) {
        handleError(error, {
          operation: 'listSkillResources',
          additionalInfo: { name, type: options.type }
        });
      }
    });

  // 重新加载 Skill 命令
  skillCmd
    .command('reload')
    .description('重新加载所有 Skill')
    .option('-d, --dir <directory>', 'Skill 目录路径')
    .action(async (options: CommandOptions & { dir?: string }) => {
      try {
        const adapter = new SkillAdapter();

        if (options.dir) {
          await adapter.initialize(options.dir);
        } else {
          await adapter.reload();
        }

        console.log('\n✓ Skill 已重新加载');
      } catch (error) {
        handleError(error, {
          operation: 'reloadSkills',
          additionalInfo: { dir: options.dir }
        });
      }
    });

  // 清除缓存命令
  skillCmd
    .command('clear-cache')
    .description('清除 Skill 缓存')
    .option('-n, --name <name>', '指定要清除的 Skill 名称')
    .action(async (options: CommandOptions & { name?: string }) => {
      try {
        const adapter = new SkillAdapter();
        adapter.clearCache(options.name);

        console.log('\n✓ 缓存已清除');
      } catch (error) {
        handleError(error, {
          operation: 'clearSkillCache',
          additionalInfo: { name: options.name }
        });
      }
    });

  // 生成元数据提示命令
  skillCmd
    .command('metadata-prompt')
    .description('生成 Skill 元数据提示（用于系统提示）')
    .action(async () => {
      try {
        const adapter = new SkillAdapter();
        const prompt = adapter.generateMetadataPrompt();

        if (prompt) {
          console.log(prompt);
        } else {
          console.log('没有可用的 Skill');
        }
      } catch (error) {
        handleError(error, {
          operation: 'generateMetadataPrompt'
        });
      }
    });

  // 注册 GetSkill 工具命令
  skillCmd
    .command('register-tool')
    .description('注册 get_skill 工具到 ToolService')
    .action(async () => {
      try {
        const adapter = new SkillAdapter();
        await adapter.registerGetSkillTool();

        console.log('\n✓ get_skill 工具已注册');
        console.log('  Agent 现在可以使用 get_skill 工具按需加载 Skill');
      } catch (error) {
        handleError(error, {
          operation: 'registerGetSkillTool'
        });
      }
    });

  // 初始化 Skill 命令
  skillCmd
    .command('init <directory>')
    .description('初始化 Skill 目录')
    .action(async (directory) => {
      try {
        const adapter = new SkillAdapter();
        await adapter.initialize(directory);

        console.log('\n✓ Skill 目录已初始化');
        console.log(`  目录: ${directory}`);
      } catch (error) {
        handleError(error, {
          operation: 'initializeSkillDirectory',
          additionalInfo: { directory }
        });
      }
    });

  return skillCmd;
}
