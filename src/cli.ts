#!/usr/bin/env node

import { Command } from "@commander-js/extra-typings";
import { createMigration } from "@/core/create";
import { upMigration, statusMigration, upByOneMigration, downToMigration } from "@/core/migrate";
import { initializeDb } from "@/db/init";
import { formatDate } from "@/utils/common";

const program = new Command("goose-js")
  .description("JavaScript implementation of goose database migration tool")
  .version(process.env.GOOSE_JS_VERSION ?? "DEV")
  .option("--dir <string>", "directory with migration files, (GOOSE_MIGRATION_DIR env variable supported)", process.env.GOOSE_MIGRATION_DIR ?? "./")
  .option("--table <string>", "migrations table name", process.env.GOOSE_TABLE ?? "goose_db_version")
  .option("-v, --verbose", "enable verbose mode", false);

program
  .command("create <name> [sql|js]")
  .description("Creates new migration file with the current timestamp")
  .action(async (name, migrationType) => {
    if (migrationType !== "js") {
      migrationType = "sql";
    }

    try {
      const filename = await createMigration(name, migrationType, program.opts().dir);
      console.log(formatDate(new Date()), "Created new file:", filename);
      process.exit(0);
    } catch (error) {
      console.error(`Error creating migration: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command("up")
  .description("Migrate the DB to the most recent version available")
  .action(async () => {
    const opts = { ...program.opts(), driver: process.env.GOOSE_DRIVER, dbString: process.env.GOOSE_DBSTRING };

    try {
      await initializeDb(opts);
      await upMigration(opts);
      process.exit(0);
    } catch (error) {
      console.error(`Error running migrations: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command("down")
  .description("Roll back the version by 1")
  .action(async () => {
    const opts = { ...program.opts(), driver: process.env.GOOSE_DRIVER, dbString: process.env.GOOSE_DBSTRING };

    try {
      await initializeDb(opts);
      await downToMigration(opts);
      process.exit(0);
    } catch (error) {
      console.error(`Error rolling back migrations: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Dump the migration status for the current DB")
  .action(async () => {
    const opts = { ...program.opts(), driver: process.env.GOOSE_DRIVER, dbString: process.env.GOOSE_DBSTRING };

    try {
      await initializeDb(opts);
      await statusMigration(opts);
      process.exit(0);
    } catch (error) {
      console.error(`Error checking migration status: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command("up-to <version>")
  .description("Migrate the DB to a specific version")
  .action(async (version) => {
    const opts = { ...program.opts(), driver: process.env.GOOSE_DRIVER, dbString: process.env.GOOSE_DBSTRING };

    try {
      await initializeDb(opts);
      await upMigration(opts, version);
      process.exit(0);
    } catch (error) {
      console.error(`Error migrating up to version ${version}: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command("up-by-one")
  .description("Migrate the DB up by 1")
  .action(async () => {
    const opts = { ...program.opts(), driver: process.env.GOOSE_DRIVER, dbString: process.env.GOOSE_DBSTRING };

    try {
      await initializeDb(opts);
      await upByOneMigration(opts);
      process.exit(0);
    } catch (error) {
      console.error(`Error migrating up by one: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command("down-to <version>")
  .description("Roll back to a specific version")
  .action(async (version) => {
    const opts = { ...program.opts(), driver: process.env.GOOSE_DRIVER, dbString: process.env.GOOSE_DBSTRING };

    try {
      await initializeDb(opts);
      await downToMigration(opts, version);
      process.exit(0);
    } catch (error) {
      console.error(`Error rolling back to version ${version}: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Roll back to a specific version")
  .action(async () => {
    const opts = { ...program.opts(), driver: process.env.GOOSE_DRIVER, dbString: process.env.GOOSE_DBSTRING };

    try {
      await initializeDb(opts);
      await statusMigration(opts);
      process.exit(0);
    } catch (error) {
      console.error(`Error dumping status: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program.parse();
