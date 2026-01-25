#!/usr/bin/env tsx
"use strict";
/**
 * Check Secrets - NPM Command Integration
 * Runs secret scanner on all tracked files
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const SCANNER_SCRIPT = path.join(__dirname, 'secret-scanner.sh');
async function main() {
    console.log('🔍 Scanning repository for secrets...\n');
    // Verify scanner script exists
    if (!(0, fs_1.existsSync)(SCANNER_SCRIPT)) {
        console.error(`ERROR: Scanner script not found: ${SCANNER_SCRIPT}`);
        process.exit(1);
    }
    try {
        // Get list of tracked files
        const trackedFiles = (0, child_process_1.execSync)('git ls-files', {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        })
            .trim()
            .split('\n')
            .filter(Boolean);
        console.log(`📊 Scanning ${trackedFiles.length} tracked files...\n`);
        // Run scanner on all files
        const filesToScan = trackedFiles.join(' ');
        try {
            (0, child_process_1.execSync)(`bash "${SCANNER_SCRIPT}" ${filesToScan}`, {
                stdio: 'inherit',
                encoding: 'utf-8'
            });
            console.log('\n✅ Scan complete - No secrets detected');
            process.exit(0);
        }
        catch (error) {
            // Scanner exits with code 1 if secrets found
            if (error.status === 1) {
                console.log('\n❌ Secrets detected - See above for details');
                process.exit(1);
            }
            throw error;
        }
    }
    catch (error) {
        console.error('\n❌ Error running secret scan:');
        console.error(error.message);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=check-secrets.js.map