/**
 * Stream模块导出
 * 统一导出所有stream实现
 */

// ConsoleStream
export { ConsoleStream, createConsoleStream } from './console-stream';

// FileStream
export { FileStream, createFileStream } from './file-stream';

// AsyncStream
export { AsyncStream, createAsyncStream } from './async-stream';

// Multistream
export { Multistream, createMultistream } from './multistream';