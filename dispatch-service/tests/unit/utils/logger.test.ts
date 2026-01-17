/**
 * Unit tests for structured JSON logging utility
 *
 * @requirements 12.2 - Structured JSON logging for all log entries
 */

import { Logger, ChildLogger, LogContext } from '../../../src/utils/logger.js';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: {
    log: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    // Reset environment
    delete process.env.LOG_LEVEL;

    // Create fresh logger instance
    logger = new Logger('test-service');

    // Spy on console methods
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Log Entry Structure', () => {
    it('should output valid JSON', () => {
      logger.info('Test message');

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      const output = consoleSpy.log.mock.calls[0][0];
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it('should include required fields in log entry', () => {
      logger.info('Test message');

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0]);
      expect(output).toHaveProperty('timestamp');
      expect(output).toHaveProperty('level', 'info');
      expect(output).toHaveProperty('message', 'Test message');
      expect(output).toHaveProperty('service', 'test-service');
    });

    it('should include ISO timestamp', () => {
      logger.info('Test message');

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0]);
      expect(output.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include context when provided', () => {
      const context: LogContext = {
        correlationId: 'test-correlation-id',
        dispatchId: 'dispatch-123',
      };

      logger.info('Test message', context);

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0]);
      expect(output.context).toEqual(context);
    });

    it('should not include context field when context is empty', () => {
      logger.info('Test message', {});

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0]);
      expect(output).not.toHaveProperty('context');
    });
  });

  describe('Log Levels', () => {
    it('should log debug messages', () => {
      process.env.LOG_LEVEL = 'debug';
      const debugLogger = new Logger('test-service');

      debugLogger.debug('Debug message');

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0]);
      expect(output.level).toBe('debug');
    });

    it('should log info messages', () => {
      logger.info('Info message');

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0]);
      expect(output.level).toBe('info');
    });

    it('should log warn messages to console.warn', () => {
      logger.warn('Warning message');

      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleSpy.warn.mock.calls[0][0]);
      expect(output.level).toBe('warn');
    });

    it('should log error messages to console.error', () => {
      logger.error('Error message');

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleSpy.error.mock.calls[0][0]);
      expect(output.level).toBe('error');
    });
  });

  describe('Error Logging', () => {
    it('should include error details when error is provided', () => {
      const error = new Error('Test error');
      error.name = 'TestError';

      logger.error('Error occurred', {}, error);

      const output = JSON.parse(consoleSpy.error.mock.calls[0][0]);
      expect(output.error).toHaveProperty('name', 'TestError');
      expect(output.error).toHaveProperty('message', 'Test error');
      expect(output.error).toHaveProperty('stack');
    });

    it('should include both context and error', () => {
      const error = new Error('Test error');
      const context: LogContext = { correlationId: 'test-id' };

      logger.error('Error occurred', context, error);

      const output = JSON.parse(consoleSpy.error.mock.calls[0][0]);
      expect(output.context).toEqual(context);
      expect(output.error).toBeDefined();
    });
  });

  describe('Log Level Filtering', () => {
    it('should filter debug messages when LOG_LEVEL is info', () => {
      process.env.LOG_LEVEL = 'info';
      const filteredLogger = new Logger('test-service');

      filteredLogger.debug('Debug message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should filter info messages when LOG_LEVEL is warn', () => {
      process.env.LOG_LEVEL = 'warn';
      const filteredLogger = new Logger('test-service');

      filteredLogger.info('Info message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should filter warn messages when LOG_LEVEL is error', () => {
      process.env.LOG_LEVEL = 'error';
      const filteredLogger = new Logger('test-service');

      filteredLogger.warn('Warning message');

      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });

    it('should always log error messages', () => {
      process.env.LOG_LEVEL = 'error';
      const filteredLogger = new Logger('test-service');

      filteredLogger.error('Error message');

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with additional context', () => {
      const childLogger = logger.child({ correlationId: 'parent-id' });

      expect(childLogger).toBeInstanceOf(ChildLogger);
    });

    it('should include parent context in all child log entries', () => {
      const childLogger = logger.child({ correlationId: 'parent-id' });

      childLogger.info('Child message');

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0]);
      expect(output.context.correlationId).toBe('parent-id');
    });

    it('should merge additional context with parent context', () => {
      const childLogger = logger.child({ correlationId: 'parent-id' });

      childLogger.info('Child message', { dispatchId: 'dispatch-123' });

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0]);
      expect(output.context.correlationId).toBe('parent-id');
      expect(output.context.dispatchId).toBe('dispatch-123');
    });

    it('should allow overriding parent context', () => {
      const childLogger = logger.child({ correlationId: 'parent-id' });

      childLogger.info('Child message', { correlationId: 'override-id' });

      const output = JSON.parse(consoleSpy.log.mock.calls[0][0]);
      expect(output.context.correlationId).toBe('override-id');
    });

    it('should support all log levels', () => {
      process.env.LOG_LEVEL = 'debug';
      const debugLogger = new Logger('test-service');
      const childLogger = debugLogger.child({ correlationId: 'test-id' });

      childLogger.debug('Debug');
      childLogger.info('Info');
      childLogger.warn('Warn');
      childLogger.error('Error');

      expect(consoleSpy.log).toHaveBeenCalledTimes(2); // debug + info
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });
});
