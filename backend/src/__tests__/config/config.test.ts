import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as envValidator from '../../config/envValidator';

describe('Config Object', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Reset process.env and mocks before each test
        vi.resetModules();
        process.env = { ...originalEnv };
        vi.mock('../../config/envValidator', async () => {
            const actual = await vi.importActual('../../config/envValidator');
            return {
                ...actual,
                validateVar: vi.fn().mockImplementation((name) => `${name}-value`),
                validateBooleanVar: vi.fn().mockImplementation((name, defaultValue) => defaultValue)
            };
        });
    });

    afterEach(() => {
        // Restore original process.env after each test
        process.env = originalEnv;
        vi.restoreAllMocks();
    });

    it('should load config with REUSE_EXISTING_ANALYSIS disabled by default', async () => {
        // Reset the modules to ensure config is reloaded
        vi.resetModules();

        // Mock validateBooleanVar to return false (default value)
        const validateBooleanVarMock = vi.spyOn(envValidator, 'validateBooleanVar');
        validateBooleanVarMock.mockReturnValue(false);

        // Import config (it will use the mock validateBooleanVar)
        const config = (await import('../../config')).default;

        // Verify config has the expected structure for features
        expect(config.features).toBeDefined();
        expect(config.features.reuseExistingAnalysis).toBe(false);

        // Verify the validator was called with correct parameters
        expect(validateBooleanVarMock).toHaveBeenCalledWith('REUSE_EXISTING_ANALYSIS', false);
    });

    it('should set REUSE_EXISTING_ANALYSIS to true when env var is set to true', async () => {
        // Reset the modules to ensure config is reloaded
        vi.resetModules();

        // Mock validateBooleanVar to return true (as if env var is set to true)
        const validateBooleanVarMock = vi.spyOn(envValidator, 'validateBooleanVar');
        validateBooleanVarMock.mockReturnValue(true);

        // Import config (it will use the mock validateBooleanVar)
        const config = (await import('../../config')).default;

        // Verify config has the reuseExistingAnalysis set to true
        expect(config.features.reuseExistingAnalysis).toBe(true);

        // Verify the validator was called with correct parameters
        expect(validateBooleanVarMock).toHaveBeenCalledWith('REUSE_EXISTING_ANALYSIS', false);
    });
}); 