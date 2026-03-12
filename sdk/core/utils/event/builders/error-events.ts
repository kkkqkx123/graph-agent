/**
 * Error Event Builders
 * Provides builders for error-related events
 */

import { createErrorBuilder } from './common.js';
import type { ErrorEvent } from '@modular-agent/types';

// =============================================================================
// Error Events
// =============================================================================

/**
 * Build error event
 */
export const buildErrorEvent = createErrorBuilder<ErrorEvent>('ERROR');
