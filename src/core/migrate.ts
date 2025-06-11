import fs from "node:fs/promises";
import path from "node:path";
import type { Knex } from "knex";
import { getDb } from "@/db/init";
import { formatDate, getVersionFromFilename } from "@/utils/common";
import { parseSqlMigration } from "@/utils/sql_parser";

export interface MigrationOptions {
  driver: string | undefined;
  dbString: string | undefined;
  dir: string;
  table: string;
  verbose: boolean;
}

export interface MigrationRecord {
  id: string;
  version_id: string;
  is_applied: number;
  tstamp: Date;
}

export interface MigrationModule {
  up: (db: Knex) => Promise<void>;
  down?: (db: Knex) => Promise<void>;
  noTransaction: boolean;
  irreversible: boolean;
}

interface MigrationFile {
  version: string;
  filename: string;
  filepath: string;
  module: MigrationModule;
}

/**
 * Get all migration files from the migrations directory
 * @param migrationsDir Directory containing migration files
 * @returns Array of migration files
 */
async function getMigrationFiles(migrationsDir: string): Promise<MigrationFile[]> {
  const files = await fs.readdir(migrationsDir);

  // Filter for .js and .sql files and sort by version
  const migrationFiles = files
    .filter((file) => (file.endsWith(".js") || file.endsWith(".sql")) && (/^\d+_/).test(file))
    .sort((a, b) => {
      const versionA = getVersionFromFilename(a);
      const versionB = getVersionFromFilename(b);

      return Number(BigInt(versionA) - BigInt(versionB));
    });

  // Load each migration file
  const migrations: MigrationFile[] = [];

  for (const filename of migrationFiles) {
    const version = getVersionFromFilename(filename);
    const filepath = path.join(migrationsDir, filename);
    const isSqlFile = filename.endsWith(".sql");

    try {
      let module: MigrationModule;

      if (isSqlFile) {
        // For SQL files, read the content and parse it
        const sqlContent = await fs.readFile(filepath, "utf8");
        module = parseSqlMigration(sqlContent);
      } else {
        // For JS files, import the module
        const importedModule = (await import(`file:${filepath}`)) as Record<string, unknown>;

        if (typeof importedModule.up !== "function") {
          throw new TypeError(`Migration ${filename} must export up function`);
        }

        if (importedModule.down !== undefined && typeof importedModule.down !== "function") {
          throw new TypeError(`Migration ${filename} down export must be a function`);
        }

        if (importedModule.noTransaction !== undefined && typeof importedModule.noTransaction !== "boolean") {
          throw new TypeError(`Migration ${filename} noTransaction export must be a boolean`);
        }

        if (importedModule.irreversible !== undefined && typeof importedModule.irreversible !== "boolean") {
          throw new TypeError(`Migration ${filename} irreversible export must be a boolean`);
        }

        module = {
          up: importedModule.up as MigrationModule["up"],
          down: importedModule.down as MigrationModule["down"],
          noTransaction: Boolean(importedModule.noTransaction),
          irreversible: Boolean(importedModule.irreversible)
        };
      }

      migrations.push({
        version,
        filename,
        filepath,
        module
      });
    } catch (error) {
      console.error(`Error loading migration ${filename}: ${(error as Error).message}`);
      throw error;
    }
  }

  return migrations;
}

/**
 * Get applied migrations from the database
 * @param table Migrations table name
 * @returns Array of applied migrations
 */

async function getAppliedMigrations(table: string): Promise<MigrationRecord[]> {
  const db = getDb();

  return db(table)
    .select("*")
    .orderBy("id", "asc");
}

async function applyMigrations(migrations: MigrationFile[], options: MigrationOptions): Promise<void> {
  const db = getDb();

  console.log(`Applying ${migrations.length} migrations`);

  // Apply each migration
  for (const migration of migrations) {
    if (options.verbose) {
      console.log(`Applying migration: ${migration.filename}`);
    }

    try {
      if (migration.module.noTransaction) {
        // Run without transaction
        if (options.verbose) {
          console.log(`Running migration without transaction: ${migration.filename}`);
        }

        // Run the migration
        await migration.module.up(db);

        // Record the migration
        await db(options.table).insert({ version_id: migration.version, is_applied: 1 });
      } else {
        // Begin transaction
        await db.transaction(async (trx) => {
          // Run the migration
          await migration.module.up(trx);

          // Record the migration
          await trx(options.table).insert({ version_id: migration.version, is_applied: 1 });
        });
      }

      console.log(formatDate(new Date()), "Applied migration:", migration.filename);
    } catch (error) {
      console.error(formatDate(new Date()), `Error applying migration ${migration.filename}: ${(error as Error).message}`);
      throw error;
    }
  }
}

/**
 * Apply migrations in the up direction
 * @param options Migration options
 * @param version Optional version to migrate up to
 */
export async function upMigration(options: MigrationOptions, version?: string): Promise<void> {
  // Get migration files and applied migrations
  const migrations = await getMigrationFiles(options.dir);
  const appliedMigrations = await getAppliedMigrations(options.table);

  // Find migrations that need to be applied
  let pendingMigrations = migrations.filter(
    (migration) => !appliedMigrations.some(
      (applied) => applied.version_id === migration.version
    )
  );

  if (version !== undefined && pendingMigrations.length > 0) {
    // Filter pending migrations to only those up to the specified version
    const targetVersion = BigInt(version);
    pendingMigrations = pendingMigrations.filter((migration) => BigInt(migration.version) <= targetVersion);
  }

  if (pendingMigrations.length === 0) {
    console.log("No pending migrations");

    return;
  }

  // Apply each migration
  await applyMigrations(pendingMigrations, options);
}

/**
 * Migrate up a single migration from the current version
 * @param options Migration options
 */
export async function upByOneMigration(options: MigrationOptions): Promise<void> {
  // Get migration files and applied migrations
  const migrations = await getMigrationFiles(options.dir);
  const appliedMigrations = await getAppliedMigrations(options.table);

  // Find migrations that need to be applied
  const pendingMigrations = migrations.filter(
    (migration) => !appliedMigrations.some(
      (applied) => applied.version_id === migration.version
    )
  );

  if (pendingMigrations.length === 0) {
    console.log("No pending migrations");

    return;
  }

  // Apply only the first pending migration
  await applyMigrations([pendingMigrations[0]], options);
}

/**
 * Roll back migrations to a specific version
 * @param options Migration options
 * @param version Version to roll back to
 */
export async function downToMigration(options: MigrationOptions, version?: string): Promise<void> {
  const db = getDb();

  // Get migration files and applied migrations
  const migrations = await getMigrationFiles(options.dir);
  const appliedMigrations = await getAppliedMigrations(options.table);

  if (appliedMigrations.length === 0) {
    console.log("No migrations to roll back");

    return;
  }

  // Sort applied migrations in reverse order (newest first)
  const sortedAppliedMigrations = [...appliedMigrations].sort((a, b) => {
    return Number(BigInt(b.version_id) - BigInt(a.version_id));
  });

  let migrationsToRollback: MigrationRecord[] = [];

  // Find migrations that need to be rolled back (those with version > targetVersion) or rollback the latest if no version is specified
  if (version === undefined) {
    migrationsToRollback.push(sortedAppliedMigrations[0]);
  } else {
    migrationsToRollback = sortedAppliedMigrations.filter((m) => BigInt(m.version_id) > BigInt(version));
  }

  if (migrationsToRollback.length === 0) {
    console.log(`No migrations to roll back`);

    return;
  }

  console.log(
    `Rolling back ${migrationsToRollback.length} migrations to version ${migrationsToRollback[migrationsToRollback.length - 1].version_id}`
  );

  // Roll back each migration
  for (const appliedMigration of migrationsToRollback) {
    const migration = migrations.find((m) => m.version === appliedMigration.version_id);

    if (migration === undefined) {
      console.error(`Migration file not found for version ${appliedMigration.version_id}`);
      continue;
    }

    if (options.verbose) {
      console.log(`Rolling back migration: ${migration.filename}`);
    }

    try {
      if (migration.module.irreversible) {
        console.log(`irreversible migration: ${migration.filename} (finishing rollback)`);
        break;
      }

      if (migration.module.noTransaction) {
        // Run without transaction
        if (options.verbose) {
          console.log(`Rolling back migration without transaction: ${migration.filename}`);
        }

        // Run the down migration
        if (migration.module.down !== undefined) {
          await migration.module.down(db);
        }

        // Remove the migration record
        await db(options.table)
          .where("version_id", migration.version)
          .delete();
      } else {
        // Begin transaction
        await db.transaction(async (trx) => {
          // Run the down migration
          if (migration.module.down !== undefined) {
            await migration.module.down(trx);
          }

          // Remove the migration record
          await trx(options.table)
            .where("version_id", migration.version)
            .delete();
        });
      }

      console.log(`Rolled back migration: ${migration.filename}`);
    } catch (error) {
      console.error(
        `Error rolling back migration ${migration.filename}: ${(error as Error).message}`
      );
      throw error;
    }
  }
}

/**
 * Print the status of all migrations
 * @param options Migration options
 */
export async function statusMigration(options: MigrationOptions): Promise<void> {
  // Get migration files and applied migrations
  const migrations = await getMigrationFiles(options.dir);
  const appliedMigrations = await getAppliedMigrations(options.table);

  console.log("Migration Status:");
  console.log("=================");

  if (migrations.length === 0) {
    console.log("No migration files found");

    return;
  }

  // Print status for each migration
  for (const migration of migrations) {
    const appliedMigration = appliedMigrations.find(
      (applied) => applied.version_id === migration.version
    );
    const status = appliedMigration !== undefined ? "Applied" : "Pending";
    const appliedAt
      = appliedMigration !== undefined
        ? new Date(appliedMigration.tstamp).toISOString()
        : "";

    console.log(
      `[${status}] ${migration.filename}${appliedAt !== "" ? ` (${appliedAt})` : ""}`
    );
  }
}
