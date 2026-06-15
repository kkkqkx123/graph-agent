/**
 * Validation Utilities
 *
 * Provides common validation patterns for registry entities.
 * Reduces duplication across different registry implementations.
 */

import { RegistryValidationError } from "../types.js";

/**
 * Validation rule for required fields.
 */
export interface RequiredFieldRule<T> {
  field: keyof T;
  message?: string;
  validator?: (value: T[keyof T]) => boolean;
}

/**
 * Validation result.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates that required fields are present and valid.
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
  entity: T,
  rules: RequiredFieldRule<T>[],
): ValidationResult {
  const errors: string[] = [];

  for (const rule of rules) {
    const value = entity[rule.field];

    if (value === undefined || value === null) {
      errors.push(rule.message || `Field '${String(rule.field)}' is required`);
      continue;
    }

    if (typeof value === "string" && value.trim() === "") {
      errors.push(rule.message || `Field '${String(rule.field)}' cannot be empty`);
      continue;
    }

    if (rule.validator && !rule.validator(value)) {
      errors.push(rule.message || `Field '${String(rule.field)}' is invalid`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that a field is a non-empty string.
 */
export function validateRequiredString<T extends Record<string, unknown>>(
  entity: T,
  field: keyof T,
  message?: string,
): void {
  const value = entity[field];

  if (typeof value !== "string") {
    throw new RegistryValidationError(
      message || `Field '${String(field)}' must be a string`,
      String(field),
    );
  }

  if (value.trim() === "") {
    throw new RegistryValidationError(
      message || `Field '${String(field)}' cannot be empty`,
      String(field),
    );
  }
}

/**
 * Validates that a field is a valid identifier.
 */
export function validateIdentifier<T extends Record<string, unknown>>(
  entity: T,
  field: keyof T,
  pattern?: RegExp,
  message?: string,
): void {
  validateRequiredString(entity, field, message);

  const value = entity[field] as string;
  const defaultPattern = /^[a-zA-Z0-9_-]+$/;
  const validationPattern = pattern || defaultPattern;

  if (!validationPattern.test(value)) {
    throw new RegistryValidationError(
      message || `Field '${String(field)}' contains invalid characters`,
      String(field),
    );
  }
}

/**
 * Validates that a field is a boolean.
 */
export function validateBoolean<T extends Record<string, unknown>>(
  entity: T,
  field: keyof T,
  message?: string,
): void {
  const value = entity[field];

  if (value !== undefined && typeof value !== "boolean") {
    throw new RegistryValidationError(
      message || `Field '${String(field)}' must be a boolean`,
      String(field),
    );
  }
}

/**
 * Validates that a field is a positive number.
 */
export function validatePositiveNumber<T extends Record<string, unknown>>(
  entity: T,
  field: keyof T,
  message?: string,
): void {
  const value = entity[field];

  if (value !== undefined) {
    if (typeof value !== "number" || value < 0) {
      throw new RegistryValidationError(
        message || `Field '${String(field)}' must be a non-negative number`,
        String(field),
      );
    }
  }
}

/**
 * Validates that a field is one of the allowed values.
 */
export function validateEnum<T extends Record<string, unknown>>(
  entity: T,
  field: keyof T,
  allowedValues: readonly (T[keyof T])[],
  message?: string,
): void {
  const value = entity[field];

  if (value !== undefined && !allowedValues.includes(value)) {
    throw new RegistryValidationError(
      message ||
        `Field '${String(field)}' must be one of: ${allowedValues.join(", ")}`,
      String(field),
    );
  }
}

/**
 * Validates that at least one of the specified fields is present.
 */
export function validateAtLeastOne<T extends Record<string, unknown>>(
  entity: T,
  fields: (keyof T)[],
  message?: string,
): void {
  const hasAtLeastOne = fields.some((field) => {
    const value = entity[field];
    return value !== undefined && value !== null && value !== "";
  });

  if (!hasAtLeastOne) {
    throw new RegistryValidationError(
      message || `At least one of the following fields is required: ${fields.map(String).join(", ")}`,
    );
  }
}

/**
 * Validates metadata object structure.
 */
export function validateMetadata<T extends Record<string, unknown>>(
  entity: T,
  field: keyof T,
  message?: string,
): void {
  const value = entity[field];

  if (value !== undefined && value !== null) {
    if (typeof value !== "object" || Array.isArray(value)) {
      throw new RegistryValidationError(
        message || `Field '${String(field)}' must be an object`,
        String(field),
      );
    }
  }
}

/**
 * Combines multiple validation results into one.
 */
export function combineValidationResults(results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap((r) => r.errors);
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Type guard to check if an error is a RegistryValidationError.
 */
export function isRegistryValidationError(error: unknown): error is RegistryValidationError {
  return error instanceof RegistryValidationError;
}
