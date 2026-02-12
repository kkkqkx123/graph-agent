/**
 * Core层日志器
 * 用于记录Core层的日志信息
 */

import { logger as sdkLogger } from '../index';

/**
 * Core层日志器
 */
export const logger = sdkLogger.child('core');