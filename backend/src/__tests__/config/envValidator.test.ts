import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateVar, validateBooleanVar } from '../../config/envValidator';

describe('Environment Variables Validation', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Reset process.env before each test
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        // Restore original process.env after each test
        process.env = originalEnv;
    });

    describe('validateVar', () => {
        it('should return the value when the environment variable is set', () => {
            process.env.TEST_VAR = 'test-value';
            const result = validateVar('TEST_VAR');
            expect(result).toBe('test-value');
        });

        it('should throw an error when the environment variable is not set', () => {
            delete process.env.TEST_VAR;
            expect(() => validateVar('TEST_VAR')).toThrow('Required environment variable TEST_VAR is not set');
        });

        it('should throw a custom error message when provided', () => {
            delete process.env.TEST_VAR;
            expect(() => validateVar('TEST_VAR', 'Custom error message')).toThrow('Custom error message');
        });
    });

    describe('validateBooleanVar', () => {
        it('should return true when the environment variable is set to "true"', () => {
            process.env.BOOL_VAR = 'true';
            const result = validateBooleanVar('BOOL_VAR');
            expect(result).toBe(true);
        });

        it('should return true when the environment variable is set to "TRUE" (case insensitive)', () => {
            process.env.BOOL_VAR = 'TRUE';
            const result = validateBooleanVar('BOOL_VAR');
            expect(result).toBe(true);
        });

        it('should return true when the environment variable is set to "1"', () => {
            process.env.BOOL_VAR = '1';
            const result = validateBooleanVar('BOOL_VAR');
            expect(result).toBe(true);
        });

        it('should return false when the environment variable is set to "false"', () => {
            process.env.BOOL_VAR = 'false';
            const result = validateBooleanVar('BOOL_VAR');
            expect(result).toBe(false);
        });

        it('should return false when the environment variable is set to "FALSE" (case insensitive)', () => {
            process.env.BOOL_VAR = 'FALSE';
            const result = validateBooleanVar('BOOL_VAR');
            expect(result).toBe(false);
        });

        it('should return false when the environment variable is set to "0"', () => {
            process.env.BOOL_VAR = '0';
            const result = validateBooleanVar('BOOL_VAR');
            expect(result).toBe(false);
        });

        it('should return the default value when the environment variable is not set', () => {
            delete process.env.BOOL_VAR;
            const resultWithDefaultTrue = validateBooleanVar('BOOL_VAR', true);
            expect(resultWithDefaultTrue).toBe(true);

            const resultWithDefaultFalse = validateBooleanVar('BOOL_VAR', false);
            expect(resultWithDefaultFalse).toBe(false);
        });

        it('should return the default value when the environment variable has an unrecognized value', () => {
            process.env.BOOL_VAR = 'not-a-boolean';
            const resultWithDefaultTrue = validateBooleanVar('BOOL_VAR', true);
            expect(resultWithDefaultTrue).toBe(true);

            const resultWithDefaultFalse = validateBooleanVar('BOOL_VAR', false);
            expect(resultWithDefaultFalse).toBe(false);
        });

        it('should use false as the default value when no default is specified', () => {
            delete process.env.BOOL_VAR;
            const result = validateBooleanVar('BOOL_VAR');
            expect(result).toBe(false);
        });
    });
}); 