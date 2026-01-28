/**
 * Script to create a new tenant schema with the Fleetillo structure
 *
 * This script generates SQL to create a new schema that mirrors the fleetillo schema.
 * The generated SQL can be applied via Supabase SQL Editor or CLI.
 *
 * Usage:
 *   npx tsx scripts/create-tenant-schema.ts <schema_name>
 *
 * Example:
 *   npx tsx scripts/create-tenant-schema.ts kwenv_fleetillo
 *
 * Output:
 *   - Creates supabase/migrations/tenant_<schema_name>.sql
 *   - Prints instructions for applying the migration
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MigrationFile {
  name: string;
  path: string;
  content: string;
}

// Migrations to include (in order) - these contain the full schema structure
const MIGRATION_FILES = [
  '20260120000000_create_fleetillo_schema.sql',
  '20260121000000_add_tags_to_locations_and_drivers.sql',
  '20260122000000_add_data_import_schema_enhancements.sql',
  '20260125000000_create_route_tokens_table.sql',
  '20260127000000_create_import_tables.sql',
];

function validateSchemaName(name: string): boolean {
  // PostgreSQL identifier rules: start with letter or underscore, contain only letters, digits, underscores
  const validPattern = /^[a-z_][a-z0-9_]*$/i;
  return validPattern.test(name) && name.length <= 63;
}

function replaceSchemaName(sql: string, targetSchema: string): string {
  // Replace schema references
  // Handles: CREATE SCHEMA fleetillo, fleetillo.table_name, SET search_path TO fleetillo, etc.
  const patterns = [
    // CREATE SCHEMA IF NOT EXISTS fleetillo;
    { from: /CREATE SCHEMA IF NOT EXISTS fleetillo;/g, to: `CREATE SCHEMA IF NOT EXISTS ${targetSchema};` },
    // SET search_path TO fleetillo, public;
    { from: /SET search_path TO fleetillo/g, to: `SET search_path TO ${targetSchema}` },
    // fleetillo. (schema-qualified names)
    { from: /fleetillo\./g, to: `${targetSchema}.` },
    // REFERENCES fleetillo
    { from: /REFERENCES fleetillo/g, to: `REFERENCES ${targetSchema}` },
    // TO fleetillo
    { from: /TO fleetillo/g, to: `TO ${targetSchema}` },
    // IN SCHEMA fleetillo
    { from: /IN SCHEMA fleetillo/g, to: `IN SCHEMA ${targetSchema}` },
  ];

  let result = sql;
  for (const pattern of patterns) {
    result = result.replace(pattern.from, pattern.to);
  }

  return result;
}

function loadMigrations(migrationsDir: string): MigrationFile[] {
  const migrations: MigrationFile[] = [];

  for (const fileName of MIGRATION_FILES) {
    const filePath = join(migrationsDir, fileName);
    if (!existsSync(filePath)) {
      console.warn(`Warning: Migration file not found: ${fileName}`);
      continue;
    }

    const content = readFileSync(filePath, 'utf-8');
    migrations.push({
      name: fileName,
      path: filePath,
      content,
    });
  }

  return migrations;
}

function generateTenantSQL(targetSchema: string, migrations: MigrationFile[]): string {
  const header = `-- ============================================================================
-- Tenant Schema: ${targetSchema}
-- Generated: ${new Date().toISOString()}
--
-- This file creates a tenant-specific schema that mirrors the fleetillo schema.
-- Apply this migration to create the schema for a new tenant/demo environment.
--
-- Usage:
--   1. Run via Supabase SQL Editor: paste this SQL and execute
--   2. Or via Supabase CLI: supabase db push
--   3. Update .env: SUPABASE_SCHEMA=${targetSchema}
-- ============================================================================

`;

  const sections: string[] = [header];

  for (const migration of migrations) {
    const sectionHeader = `
-- ============================================================================
-- Source: ${migration.name}
-- ============================================================================

`;
    const modifiedContent = replaceSchemaName(migration.content, targetSchema);
    sections.push(sectionHeader + modifiedContent);
  }

  // Add grant for service_role to the new schema
  const grants = `
-- ============================================================================
-- Grants for service_role access
-- ============================================================================
GRANT USAGE ON SCHEMA ${targetSchema} TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA ${targetSchema} TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA ${targetSchema} TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA ${targetSchema} TO service_role;

-- Default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA ${targetSchema} GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA ${targetSchema} GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA ${targetSchema} GRANT ALL ON FUNCTIONS TO service_role;
`;

  sections.push(grants);

  return sections.join('\n');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/create-tenant-schema.ts <schema_name>');
    console.log('');
    console.log('Example:');
    console.log('  npx tsx scripts/create-tenant-schema.ts kwenv_fleetillo');
    console.log('');
    console.log('This will generate a migration file for the new tenant schema.');
    process.exit(1);
  }

  const targetSchema = args[0].toLowerCase();

  // Validate schema name
  if (!validateSchemaName(targetSchema)) {
    console.error(`Error: Invalid schema name "${targetSchema}"`);
    console.error('Schema name must:');
    console.error('  - Start with a letter or underscore');
    console.error('  - Contain only letters, digits, and underscores');
    console.error('  - Be 63 characters or less');
    process.exit(1);
  }

  if (targetSchema === 'fleetillo') {
    console.error('Error: Cannot use "fleetillo" as target schema (it already exists)');
    process.exit(1);
  }

  console.log(`Creating tenant schema: ${targetSchema}`);
  console.log('');

  // Load migrations
  const migrationsDir = join(__dirname, '../supabase/migrations');
  console.log(`Loading migrations from: ${migrationsDir}`);

  const migrations = loadMigrations(migrationsDir);
  console.log(`Loaded ${migrations.length} migration files:`);
  for (const m of migrations) {
    console.log(`  - ${m.name}`);
  }
  console.log('');

  // Generate SQL
  const sql = generateTenantSQL(targetSchema, migrations);

  // Write output file
  const outputFileName = `tenant_${targetSchema}.sql`;
  const outputPath = join(migrationsDir, outputFileName);
  writeFileSync(outputPath, sql);

  console.log(`Generated: ${outputPath}`);
  console.log(`File size: ${(sql.length / 1024).toFixed(2)} KB`);
  console.log('');
  console.log('============================================================================');
  console.log('NEXT STEPS');
  console.log('============================================================================');
  console.log('');
  console.log('1. Apply the migration via Supabase SQL Editor:');
  console.log('   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new');
  console.log(`   - Paste the contents of: ${outputPath}`);
  console.log('   - Execute the SQL');
  console.log('');
  console.log('   Or via Supabase CLI:');
  console.log('   supabase db push');
  console.log('');
  console.log('2. Update your .env file:');
  console.log(`   SUPABASE_SCHEMA=${targetSchema}`);
  console.log('');
  console.log('3. Restart your application to use the new schema');
  console.log('');
  console.log('============================================================================');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
