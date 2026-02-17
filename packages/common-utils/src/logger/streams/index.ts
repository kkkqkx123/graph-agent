/**
 * Stream模块导出
 * 统一导出所有stream实现
 */

// ConsoleStream
export { ConsoleStream, createConsoleStream } from './console-stream.js';

// FileStream
export { FileStream, createFileStream } from './file-stream.js';

// AsyncStream
export { AsyncStream, createAsyncStream } from './async-stream.js';

// Multistream
export { Multistream, createMultistream } from './multistream.js';