/**
 * 文件日志传输器
 */

import * as fs from 'fs';
import * as path from 'path';
import { LogEntry, FileLogOutputConfig, LogRotationStrategy } from '../interfaces';
import { BaseTransport } from './base-transport';
import { FormatterFactory } from '../formatters';

/**
 * 文件传输器
 */
export class FileTransport extends BaseTransport {
  readonly name = 'file';
  private formatterFactory: FormatterFactory;
  private fileStream: fs.WriteStream | null = null;
  private currentFileName: string = '';
  private rotationTimer: NodeJS.Timeout | null = null;

  constructor(config: FileLogOutputConfig) {
    super(config);
    this.formatterFactory = FormatterFactory.getInstance();
    this.initializeFileStream();
  }

  /**
   * 记录日志到文件
   */
  async log(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formattedMessage = this.formatMessage(entry);
    await this.writeToFile(formattedMessage);
  }

  /**
   * 刷新缓冲区
   */
  async flush(): Promise<void> {
    if (this.fileStream) {
      return new Promise((resolve, reject) => {
        this.fileStream!.write('', () => {
          resolve();
        });
      });
    }
  }

  /**
   * 关闭传输器
   */
  async close(): Promise<void> {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }

    if (this.fileStream) {
      return new Promise((resolve, reject) => {
        this.fileStream!.end(() => {
          this.fileStream = null;
          resolve();
        });
      });
    }
  }

  /**
   * 格式化消息
   */
  private formatMessage(entry: LogEntry): string {
    const formatter = this.formatterFactory.createFormatter(this.config.format);
    return formatter.format(entry);
  }

  /**
   * 写入文件
   */
  private async writeToFile(message: string): Promise<void> {
    if (!this.fileStream) {
      this.initializeFileStream();
    }

    if (!this.fileStream) {
      throw new Error('文件流未初始化');
    }

    return new Promise((resolve, reject) => {
      this.fileStream!.write(message + '\n', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 初始化文件流
   */
  private initializeFileStream(): void {
    const fileConfig = this.config as FileLogOutputConfig;
    const filePath = fileConfig.path;
    const dirPath = path.dirname(filePath);

    // 确保目录存在
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 检查是否需要轮转
    if (this.shouldRotateFile(filePath)) {
      this.rotateFile(filePath);
    }

    // 创建文件流
    this.currentFileName = filePath;
    this.fileStream = fs.createWriteStream(filePath, { flags: 'a' });

    // 设置轮转定时器
    this.setupRotationTimer();

    // 处理错误
    this.fileStream.on('error', (error) => {
      console.error('文件日志写入错误:', error);
    });
  }

  /**
   * 检查是否需要轮转文件
   */
  private shouldRotateFile(filePath: string): boolean {
    const fileConfig = this.config as FileLogOutputConfig;

    if (!fs.existsSync(filePath)) {
      return false;
    }

    const stats = fs.statSync(filePath);

    // 按大小轮转
    if (fileConfig.rotation === LogRotationStrategy.SIZE && fileConfig.max_size) {
      const maxSize = this.parseSize(fileConfig.max_size);
      return stats.size >= maxSize;
    }

    // 按时间轮转
    if (fileConfig.rotation === LogRotationStrategy.DAILY) {
      const now = new Date();
      const fileDate = stats.mtime;
      return !this.isSameDay(now, fileDate);
    }

    if (fileConfig.rotation === LogRotationStrategy.WEEKLY) {
      const now = new Date();
      const fileDate = stats.mtime;
      return !this.isSameWeek(now, fileDate);
    }

    if (fileConfig.rotation === LogRotationStrategy.MONTHLY) {
      const now = new Date();
      const fileDate = stats.mtime;
      return !this.isSameMonth(now, fileDate);
    }

    return false;
  }

  /**
   * 轮转文件
   */
  private rotateFile(filePath: string): void {
    const fileConfig = this.config as FileLogOutputConfig;
    const dirPath = path.dirname(filePath);
    const fileName = path.basename(filePath, path.extname(filePath));
    const extName = path.extname(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedFileName = `${fileName}-${timestamp}${extName}`;
    const rotatedFilePath = path.join(dirPath, rotatedFileName);

    // 重命名当前文件
    if (fs.existsSync(filePath)) {
      fs.renameSync(filePath, rotatedFilePath);

      // 压缩文件（如果启用）
      if (fileConfig.compress) {
        this.compressFile(rotatedFilePath);
      }

      // 清理旧文件
      this.cleanupOldFiles(dirPath, fileName, extName, fileConfig.max_files);
    }
  }

  /**
   * 设置轮转定时器
   */
  private setupRotationTimer(): void {
    const fileConfig = this.config as FileLogOutputConfig;

    if (fileConfig.rotation === LogRotationStrategy.DAILY) {
      // 每天午夜检查一次
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const msUntilMidnight = tomorrow.getTime() - now.getTime();

      setTimeout(() => {
        this.rotateFile(this.currentFileName);
        this.rotationTimer = setInterval(() => {
          this.rotateFile(this.currentFileName);
        }, 24 * 60 * 60 * 1000); // 每24小时
      }, msUntilMidnight);
    }
  }

  /**
   * 解析文件大小字符串
   */
  private parseSize(sizeStr: string): number {
    const units: Record<string, number> = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024
    };

    const match = sizeStr.match(/^(\d+)(B|KB|MB|GB)$/i);
    if (!match) {
      throw new Error(`无效的文件大小格式: ${sizeStr}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2].toUpperCase();
    return value * units[unit];
  }

  /**
   * 检查是否为同一天
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /**
   * 检查是否为同一周
   */
  private isSameWeek(date1: Date, date2: Date): boolean {
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    return Math.abs(date1.getTime() - date2.getTime()) < oneWeek;
  }

  /**
   * 检查是否为同一月
   */
  private isSameMonth(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth();
  }

  /**
   * 压缩文件（简化实现）
   */
  private compressFile(filePath: string): void {
    // 这里应该实现文件压缩逻辑
    // 可以使用 zlib 模块进行 gzip 压缩
    // 为了简化，这里只是重命名文件
    const compressedPath = `${filePath}.gz`;
    if (fs.existsSync(filePath) && !fs.existsSync(compressedPath)) {
      fs.renameSync(filePath, compressedPath);
    }
  }

  /**
   * 清理旧文件
   */
  private cleanupOldFiles(dirPath: string, fileName: string, extName: string, maxFiles?: number): void {
    if (!maxFiles || maxFiles <= 0) {
      return;
    }

    try {
      const files = fs.readdirSync(dirPath)
        .filter(file => file.startsWith(fileName) && file.endsWith(extName))
        .map(file => ({
          name: file,
          path: path.join(dirPath, file),
          mtime: fs.statSync(path.join(dirPath, file)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // 保留最新的 maxFiles 个文件，删除其余的
      if (files.length > maxFiles) {
        const filesToDelete = files.slice(maxFiles);
        for (const file of filesToDelete) {
          try {
            fs.unlinkSync(file.path);
          } catch (error) {
            console.warn(`删除旧日志文件失败: ${file.path}`, error);
          }
        }
      }
    } catch (error) {
      console.warn('清理旧日志文件失败:', error);
    }
  }

  /**
   * 获取文件配置
   */
  getFileConfig(): FileLogOutputConfig {
    return this.config as FileLogOutputConfig;
  }
}