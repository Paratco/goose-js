import type { Knex } from "knex";
import knex from "knex";
import type { MigrationOptions, MigrationRecord } from "@/core/migrate";
import { dsnParser } from "@/utils/dsn_parser";

let dbInstance: Knex | null = null;

/**
 * Initialize the database connection and create migrations table if it doesn't exist
 * @param options Database connection options
 * @returns Knex instance
 */
export async function initializeDb(options: MigrationOptions): Promise<Knex> {
  // Create a new database connection if it doesn't exist
  if (dbInstance === null) {
    const { driver, params, ...connection } = dsnParser(options.dbString, options.driver);

    if (options.verbose) {
      console.log(`Connecting to database with ${driver}`);
    }

    dbInstance = knex({
      client: driver,
      connection: {
        ...connection,
        ...params,
        supportBigNumbers: true,
        bigNumberStrings: true
      }
    });
  }

  // Create migrations table if it doesn't exist
  const tableExists = await dbInstance.schema.hasTable(options.table);

  if (!tableExists) {
    if (options.verbose) {
      console.log(`Creating migrations table: ${options.table}`);
    }

    await dbInstance.schema.createTable(options.table, (t) => {
      t.bigIncrements("id").notNullable()
        .primary();

      t.bigint("version_id").notNullable()
        .unique();

      t.tinyint("is_applied", 1).notNullable();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      t.timestamp("tstamp").defaultTo(dbInstance!.fn.now());
    });

    const first = await dbInstance.table(options.table)
      .select("id")
      .where("version_id", 0)
      .first() as MigrationRecord | undefined;

    if (first === undefined) {
      // Insert version 0 as initial state
      if (options.verbose) {
        console.log(`Adding version 0 as initial state`);
      }

      await dbInstance(options.table).insert({
        version_id: 0,
        is_applied: 1
      });
    }
  }

  return dbInstance;
}

/**
 * Get the database instance
 * @returns Knex instance
 */
export function getDb(): Knex {
  if (dbInstance === null) {
    throw new Error("Database not initialized. Call initializeDb first.");
  }

  return dbInstance;
}

/**
 * Close the database connection
 */
export async function closeDb(): Promise<void> {
  if (dbInstance !== null) {
    await dbInstance.destroy();
    dbInstance = null;
  }
}
