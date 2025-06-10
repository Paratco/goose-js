import fs from "node:fs/promises";
import path from "node:path";

/**
 * Creates a new migration file with the given name
 * @param name The name of the migration
 * @param migrationType The migration type ("sql" OR "js")
 * @param migrationsDir The directory where migrations are stored
 * @returns The filename of the created migration
 */
export async function createMigration(name: string, migrationType: string, migrationsDir: string): Promise<string> {
  // Ensure migrations directory exists
  await fs.mkdir(migrationsDir, { recursive: true });

  // Format the filename with timestamp and name
  const timestamp = new Date().toISOString()
    .replaceAll(/[-:]/g, "")
    .replace("T", "")
    .split(".")[0];
  const formattedName = name.toLowerCase().replaceAll(/\s+/g, "_");
  const filename = `${timestamp}_${formattedName}.${migrationType}`;
  const filePath = path.join(migrationsDir, filename);

  // Create migration file with template
  const templateJs = `/**
 * Migration: ${name}
 * Created at: ${new Date().toISOString()}
 */

/**
 * Up migration
 * @param {import('knex').Knex} db - The database connection
 */
export async function up(db) {
  // Write your migration code here
  // Example:
  // await db.schema.createTable('users', (table) => {
  //   table.increments('id').primary();
  //   table.string('name').notNullable();
  //   table.string('email').notNullable().unique();
  //   table.timestamps(true, true);
  // });
}

/**
 * Down migration
 * optional
 * @param {import('knex').Knex} db - The database connection
 */
export async function down(db) {
  // Write your rollback code here
  // Example:
  // await db.schema.dropTable('users');
}

// optionally export a flag to indicate that this migration does not require a transaction (default is false)
//export const noTransaction = true;

// optionally export a flag to indicate that this migration is irreversible (default is false)
//export const irreversible = true;
`;

  const templateSql = `-- +goose Up
-- +goose StatementBegin
SELECT 'up SQL query';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
-- +goose StatementEnd
`;

  await fs.writeFile(filePath, migrationType === "sql" ? templateSql : templateJs, "utf8");

  return filename;
}
