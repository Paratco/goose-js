import type { Knex } from "knex";
import type { MigrationModule } from "@/core/migrate";

/**
 * Parse a SQL migration file
 * @param sql The SQL content to parse
 * @returns Parsed migration with up and down functions
 */
export function parseSqlMigration(sql: string): MigrationModule {
  // Split the SQL into lines
  const lines = sql.split(/\r?\n/);

  let section: "none" | "up" | "down" = "none";
  let inStatement = false;
  let currentStatement = "";
  const upStatements: string[] = [];
  const downStatements: string[] = [];

  // Process each line
  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check for section markers
    if (trimmedLine === "-- +goose Up") {
      section = "up";
      continue;
    } else if (trimmedLine === "-- +goose Down") {
      section = "down";
      continue;
    }

    // Skip comments and empty lines outside of statements
    if (!inStatement && (trimmedLine === "" || trimmedLine.startsWith("--"))) {
      continue;
    }

    // Check for statement begin/end markers
    if (trimmedLine === "-- +goose StatementBegin") {
      inStatement = true;
      currentStatement = "";
      continue;
    } else if (trimmedLine === "-- +goose StatementEnd") {
      inStatement = false;

      if (section === "up") {
        upStatements.push(currentStatement);
      } else if (section === "down") {
        downStatements.push(currentStatement);
      }

      continue;
    }

    // Process the line based on current section and statement status
    if (inStatement) {
      // Inside a statement block, add the line as is
      currentStatement += line + "\n";
    } else if (section !== "none" && trimmedLine !== "" && !trimmedLine.startsWith("--")) {
      // Outside a statement block, collect lines until semicolon
      currentStatement += line + "\n";

      // If line ends with semicolon, add the statement to the appropriate collection
      if (trimmedLine.endsWith(";")) {
        if (section === "up") {
          upStatements.push(currentStatement);
        } else {
          downStatements.push(currentStatement);
        }

        currentStatement = "";
      }
    }
  }

  // Create the migration object
  return {
    up: async (db: Knex): Promise<void> => {
      for (const statement of upStatements) {
        await db.raw(statement);
      }
    },
    down: downStatements.length > 0
      ? async (db: Knex): Promise<void> => {
        for (const statement of downStatements) {
          await db.raw(statement);
        }
      }
      : undefined,
    noTransaction: sql.includes("-- +goose NO TRANSACTION"),
    irreversible: sql.includes("-- +goose IRREVERSIBLE")
  };
}
