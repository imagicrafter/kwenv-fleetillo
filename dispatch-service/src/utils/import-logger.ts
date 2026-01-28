/**
 * Import Logger Utility
 *
 * Provides file-based logging for import operations with:
 * - Full log: All records with their status
 * - Error log: Only failed records for quick review
 *
 * Log files are created in: logs/import/
 */

import { appendFileSync, mkdirSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

export type ImportLogLevel = 'INFO' | 'SUCCESS' | 'ERROR' | 'WARN' | 'DEBUG';

export interface ImportLogEntry {
  timestamp: string;
  level: ImportLogLevel;
  entityType: 'customer' | 'location' | 'booking' | 'batch' | 'geocode';
  entityId?: string;
  entityName?: string;
  rowNumber?: number;
  message: string;
  error?: string;
  details?: Record<string, unknown>;
}

export class ImportLogger {
  private batchId: string;
  private logDir: string;
  private fullLogPath: string;
  private errorLogPath: string;
  private startTime: Date;
  private recordCount: number = 0;
  private errorCount: number = 0;
  private successCount: number = 0;

  constructor(batchId: string, operation: string = 'commit') {
    this.batchId = batchId;
    this.startTime = new Date();

    // Create logs/import directory if it doesn't exist
    this.logDir = resolve(process.cwd(), '..', 'logs', 'import');
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }

    // Create log file names with timestamp
    const timestamp = this.formatTimestamp(this.startTime).replace(/[:\s]/g, '').replace(',', '_');
    const batchShort = batchId.slice(0, 8);

    this.fullLogPath = resolve(this.logDir, `${operation}_${batchShort}_${timestamp}.log`);
    this.errorLogPath = resolve(this.logDir, `${operation}_${batchShort}_${timestamp}_errors.log`);

    // Initialize log files with headers
    this.initLogFiles(operation);
  }

  private formatTimestamp(date: Date): string {
    return date.toISOString().replace('T', ' ').replace('Z', '');
  }

  private initLogFiles(operation: string): void {
    const header = [
      '================================================================================',
      `Import ${operation.toUpperCase()} Log`,
      '================================================================================',
      `Batch ID: ${this.batchId}`,
      `Started: ${this.formatTimestamp(this.startTime)}`,
      `Schema: ${process.env.SUPABASE_SCHEMA || 'fleetillo'}`,
      '================================================================================',
      '',
    ].join('\n');

    writeFileSync(this.fullLogPath, header);
    writeFileSync(this.errorLogPath, header.replace('Log', 'Error Log'));
  }

  private formatLogLine(entry: ImportLogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level.padEnd(7)}]`,
      `[${entry.entityType.padEnd(8)}]`,
    ];

    if (entry.rowNumber !== undefined) {
      parts.push(`[Row ${String(entry.rowNumber).padStart(5)}]`);
    }

    if (entry.entityId) {
      parts.push(`[${entry.entityId.slice(0, 8)}]`);
    }

    if (entry.entityName) {
      parts.push(`${entry.entityName}:`);
    }

    parts.push(entry.message);

    if (entry.error) {
      parts.push(`- ERROR: ${entry.error}`);
    }

    return parts.join(' ');
  }

  log(entry: Omit<ImportLogEntry, 'timestamp'>): void {
    const fullEntry: ImportLogEntry = {
      ...entry,
      timestamp: this.formatTimestamp(new Date()),
    };

    const logLine = this.formatLogLine(fullEntry) + '\n';

    // Always write to full log
    appendFileSync(this.fullLogPath, logLine);

    // Write to error log if ERROR or WARN
    if (entry.level === 'ERROR' || entry.level === 'WARN') {
      appendFileSync(this.errorLogPath, logLine);
      if (entry.details) {
        appendFileSync(this.errorLogPath, `         Details: ${JSON.stringify(entry.details)}\n`);
      }
      this.errorCount++;
    }

    if (entry.level === 'SUCCESS') {
      this.successCount++;
    }

    this.recordCount++;
  }

  // Convenience methods
  info(entityType: ImportLogEntry['entityType'], message: string, details?: Record<string, unknown>): void {
    this.log({ level: 'INFO', entityType, message, details });
  }

  success(
    entityType: ImportLogEntry['entityType'],
    message: string,
    options?: { entityId?: string; entityName?: string; rowNumber?: number; details?: Record<string, unknown> }
  ): void {
    this.log({ level: 'SUCCESS', entityType, message, ...options });
  }

  error(
    entityType: ImportLogEntry['entityType'],
    message: string,
    error: string,
    options?: { entityId?: string; entityName?: string; rowNumber?: number; details?: Record<string, unknown> }
  ): void {
    this.log({ level: 'ERROR', entityType, message, error, ...options });
  }

  warn(
    entityType: ImportLogEntry['entityType'],
    message: string,
    options?: { entityId?: string; entityName?: string; rowNumber?: number; details?: Record<string, unknown> }
  ): void {
    this.log({ level: 'WARN', entityType, message, ...options });
  }

  // Progress logging
  progress(current: number, total: number, entityType: ImportLogEntry['entityType']): void {
    const percent = ((current / total) * 100).toFixed(1);
    this.log({
      level: 'INFO',
      entityType,
      message: `Progress: ${current}/${total} (${percent}%)`,
    });
  }

  // Finalize logs with summary
  finalize(success: boolean): { fullLogPath: string; errorLogPath: string; summary: string } {
    const endTime = new Date();
    const duration = (endTime.getTime() - this.startTime.getTime()) / 1000;

    const summary = [
      '',
      '================================================================================',
      'Summary',
      '================================================================================',
      `Status: ${success ? 'COMPLETED' : 'FAILED'}`,
      `Duration: ${duration.toFixed(2)} seconds`,
      `Total Records Processed: ${this.recordCount}`,
      `Successful: ${this.successCount}`,
      `Errors: ${this.errorCount}`,
      `Ended: ${this.formatTimestamp(endTime)}`,
      '================================================================================',
    ].join('\n');

    appendFileSync(this.fullLogPath, summary);
    appendFileSync(this.errorLogPath, summary);

    return {
      fullLogPath: this.fullLogPath,
      errorLogPath: this.errorLogPath,
      summary: summary,
    };
  }

  getLogPaths(): { fullLogPath: string; errorLogPath: string } {
    return {
      fullLogPath: this.fullLogPath,
      errorLogPath: this.errorLogPath,
    };
  }
}

/**
 * Creates a new import logger for a batch operation
 */
export function createImportLogger(batchId: string, operation: string = 'commit'): ImportLogger {
  return new ImportLogger(batchId, operation);
}
