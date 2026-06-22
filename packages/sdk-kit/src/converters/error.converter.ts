/**
 * Error Converter - Convert SDK errors to JS exceptions
 */

/**
 * Kit error codes
 */
export enum KitErrorCode {
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT = 'TIMEOUT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DUPLICATE_NODE_ID = 'DUPLICATE_NODE_ID',
  NODE_NOT_FOUND = 'NODE_NOT_FOUND',
  INVALID_WORKFLOW = 'INVALID_WORKFLOW',
  EXECUTION_NOT_FOUND = 'EXECUTION_NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  VERSION_NOT_FOUND = 'VERSION_NOT_FOUND',
}

/**
 * Custom error class for SDK-Kit
 */
export class KitError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'KitError';
    Object.setPrototypeOf(this, KitError.prototype);
  }

  override toString(): string {
    return `${this.name}[${this.code}]: ${this.message}`;
  }
}

/**
 * Error Converter - Converts SDK Result type to JS exceptions
 */
export class ErrorConverter {
  /**
   * Convert SDK Result type to data or throw KitError
   */
  convertResult<T>(result: any): T {
    // Check if result has the SDK Result structure
    if (result && typeof result === 'object') {
      // Check for success case (isSuccess function behavior)
      if (this.isSuccessResult(result)) {
        return this.getSuccessData(result);
      }

      // Check for failure case
      if (this.isFailureResult(result)) {
        const error = this.getErrorData(result);
        throw this.convertError(error);
      }
    }

    // If it doesn't look like a Result type, return as-is
    return result as T;
  }

  /**
   * Convert SDK error or any error to KitError
   */
  convertError(error: any): KitError {
    if (error instanceof KitError) {
      return error;
    }

    let code = KitErrorCode.INTERNAL_ERROR;
    let message = error?.message || 'Unknown error';
    let context: Record<string, unknown> | undefined;

    // Identify common SDK error codes
    if (error?.code) {
      switch (error.code) {
        case 'WORKFLOW_NOT_FOUND':
          code = KitErrorCode.WORKFLOW_NOT_FOUND;
          break;
        case 'EXECUTION_FAILED':
          code = KitErrorCode.EXECUTION_FAILED;
          break;
        case 'VALIDATION_ERROR':
          code = KitErrorCode.VALIDATION_ERROR;
          break;
        case 'TIMEOUT':
          code = KitErrorCode.TIMEOUT;
          break;
        case 'DUPLICATE_NODE_ID':
          code = KitErrorCode.DUPLICATE_NODE_ID;
          break;
        case 'NODE_NOT_FOUND':
          code = KitErrorCode.NODE_NOT_FOUND;
          break;
        case 'INVALID_WORKFLOW':
          code = KitErrorCode.INVALID_WORKFLOW;
          break;
        case 'EXECUTION_NOT_FOUND':
          code = KitErrorCode.EXECUTION_NOT_FOUND;
          break;
        case 'RESOURCE_NOT_FOUND':
          code = KitErrorCode.RESOURCE_NOT_FOUND;
          break;
        case 'VERSION_NOT_FOUND':
          code = KitErrorCode.VERSION_NOT_FOUND;
          break;
        default:
          code = KitErrorCode.INTERNAL_ERROR;
      }
    }

    if (error && typeof error === 'object') {
      context = { originalError: error };
    }

    return new KitError(message, code, context);
  }

  /**
   * Check if result is a success (follows SDK Result type structure)
   */
  private isSuccessResult(result: any): boolean {
    return result && result.success === true;
  }

  /**
   * Check if result is a failure (follows SDK Result type structure)
   */
  private isFailureResult(result: any): boolean {
    return result && result.success === false;
  }

  /**
   * Extract success data from Result
   */
  private getSuccessData<T>(result: any): T {
    return result.data as T;
  }

  /**
   * Extract error from Result
   */
  private getErrorData(result: any): any {
    return result.error;
  }
}
