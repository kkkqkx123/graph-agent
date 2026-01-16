/**
 * 命令行参数解析器
 *
 * 职责：
 * - 解析命令行参数
 * - 验证参数格式
 * - 提取命令和参数
 *
 * 技术实现：
 * - 使用Node.js原生process.argv
 * - 不引入额外依赖
 */

/**
 * 解析后的命令
 */
export interface ParsedCommand {
  /** 命令名称 */
  command: string;
  /** 子命令名称（可选） */
  subCommand?: string;
  /** 选项映射 */
  options: Map<string, string | boolean>;
  /** 位置参数 */
  args: string[];
  /** 原始参数 */
  rawArgs: string[];
}

/**
 * 解析结果
 */
export interface ParseResult {
  /** 是否成功 */
  success: boolean;
  /** 解析后的命令 */
  command?: ParsedCommand;
  /** 错误信息 */
  error?: string;
}

/**
 * 命令行参数解析器
 */
export class CommandParser {
  /**
   * 解析命令行参数
   *
   * @param argv 命令行参数数组（通常为process.argv）
   * @returns 解析结果
   */
  parse(argv: string[]): ParseResult {
    try {
      // 跳过前两个参数（node路径和脚本路径）
      const args = argv.slice(2);

      if (args.length === 0) {
        return {
          success: false,
          error: '未提供命令',
        };
      }

      const command = args[0] || '';
      const subCommand = args[1] && !args[1].startsWith('-') ? args[1] : undefined;
      const options = new Map<string, string | boolean>();
      const positionalArgs: string[] = [];

      let i = subCommand ? 2 : 1;

      // 解析选项和位置参数
      while (i < args.length) {
        const arg = args[i];
        if (!arg) {
          i++;
          continue;
        }

        if (arg.startsWith('--')) {
          // 长选项 --option 或 --option=value
          const optionMatch = arg.match(/^--([^=]+)(?:=(.+))?$/);
          if (optionMatch && optionMatch[1]) {
            const [, name, value] = optionMatch;
            options.set(name!, value !== undefined ? value : true);
          }
        } else if (arg.startsWith('-')) {
          // 短选项 -o 或 -o=value
          const optionMatch = arg.match(/^-(.)(?:=(.+))?$/);
          if (optionMatch && optionMatch[1]) {
            const [, name, value] = optionMatch;
            options.set(name!, value !== undefined ? value : true);
          }
        } else {
          // 位置参数
          positionalArgs.push(arg);
        }

        i++;
      }

      return {
        success: true,
        command: {
          command,
          subCommand,
          options,
          args: positionalArgs,
          rawArgs: args,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 获取选项值
   *
   * @param command 解析后的命令
   * @param name 选项名称
   * @param defaultValue 默认值
   * @returns 选项值
   */
  getOption<T extends string | boolean>(
    command: ParsedCommand,
    name: string,
    defaultValue?: T
  ): T | undefined {
    const value = command.options.get(name);
    if (value === undefined) {
      return defaultValue;
    }
    return value as T;
  }

  /**
   * 获取位置参数
   *
   * @param command 解析后的命令
   * @param index 参数索引
   * @param defaultValue 默认值
   * @returns 参数值
   */
  getArg(command: ParsedCommand, index: number, defaultValue?: string): string | undefined {
    return command.args[index] ?? defaultValue;
  }

  /**
   * 检查选项是否存在
   *
   * @param command 解析后的命令
   * @param name 选项名称
   * @returns 是否存在
   */
  hasOption(command: ParsedCommand, name: string): boolean {
    return command.options.has(name);
  }

  /**
   * 获取所有选项
   *
   * @param command 解析后的命令
   * @returns 选项对象
   */
  getOptions(command: ParsedCommand): Record<string, string | boolean> {
    return Object.fromEntries(command.options);
  }

  /**
   * 获取所有位置参数
   *
   * @param command 解析后的命令
   * @returns 位置参数数组
   */
  getArgs(command: ParsedCommand): string[] {
    return [...command.args];
  }
}