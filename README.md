> 🚧 **Work in Progress**
>
> goose-js is currently in development use it for production with your responsibility.

A JavaScript implementation of the [goose](https://github.com/pressly/goose) database migration tool. Goose-js is
designed to be compatible with goose, but using JavaScript migration files instead of Go.

## Installation

```bash
# Using npm
npm install goose-js

# Using yarn
yarn add goose-js

# Using pnpm
pnpm add goose-js
```

## Usage

### Command Line Interface

goose-js provides a CLI that mimics the goose command-line interface:

```bash
# Create a new migration
goose-cli create add_users_table

# Apply all pending migrations
goose-cli up

# Apply only the next 2 migrations
goose-cli up 2

# Roll back the most recent migration
goose-cli down

# Roll back the 3 most recent migrations
goose-cli down 3

# Migrate up to a specific version
goose-cli up-to 20230101120000

# Migrate up a single migration from the current version
goose-cli up-by-one

# Roll back migrations to a specific version
goose-cli down-to 20230101120000

# Show migration status
goose-cli status

# roll back all migrations
goose-cli reset
```

### Options

```
Options:
  --dir <string>                directory with migration files, (GOOSE_MIGRATION_DIR env variable supported) (default: "./")
  --table <string>              migrations table name (default: "goose_migrations")
  -v, --verbose                 enable verbose mode (default: false)
  -h, --help                    display help for command
```

### Environment Variables

```
GOOSE_DRIVER=mysql2
GOOSE_DBSTRING=mysql2://admin:admin@localhost:5432/admin_db
GOOSE_MIGRATION_DIR=./migrations
GOOSE_TABLE=goose_migrations
```

### Drivers

Goose-js supports multiple database drivers. You can specify the driver using the `GOOSE_DRIVER` environment variable or
as start of GOOSE_DBSTRING `driver://**`. Supported drivers include:

```
mysql
mysql2
pg
pg-native
oracledb
tedious
sqlite3
better-sqlite3
```

### Migration Files

Migration files are JavaScript files with `up` and `down` (optional) functions that are exported:

```javascript
/**
 * Up migration
 * @param {import('knex').Knex} db - The database connection
 */
export async function up(db) {
    await db.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('email').notNullable().unique();
        table.timestamps(true, true);
    });
}

/**
 * Down migration
 * optional
 * @param {import('knex').Knex} db - The database connection
 */
export async function down(db) {
    await db.schema.dropTable('users');
}

// optionally export a flag to indicate that this migration does not require a transaction (default is false)
//export const noTransaction = true;

// optionally export a flag to indicate that this migration is irreversible (default is false)
//export const irreversible = true;
```
also with noTransaction and irreversible flags you can control the behavior of the migration:
- `noTransaction`: If exported as `true`, the migrator Runs the entire up (or down) outside of an enclosing transaction. Useful for DDL that MySQL won’t allow in a TXN or to avoid long-running locks
- `irreversible`: If exported as `true`, the migrator refuses to rollback (and halts further “down” migrations when stepping back), even if you’ve implemented a down() function. Acts like a hard save-point.

difference of irreversible and not exporting `down` is that: 
`irreversible migration will not be rolled back and stops below migrations too (act like save point in reset and down-to 0 commands), while not exporting down will just skip the rollback step.`

irreversible is a custom flag and not part of goose, you can use it in sql migrations too, just use `-- +goose IRREVERSIBLE` in top of file.

## Programmatic Usage

WIP

## Supported Databases

goose-js supports the following databases:

- PostgreSQL
- MySQL
- SQLite

## Database Connection Strings

goose-js supports various database connection string formats:

### PostgreSQL

```
pg://user:password@localhost:5432/mydb
pg-native://user:password@localhost:5432/mydb
```

### MySQL

```
mysql://user:password@localhost:3306/mydb
mysql2://user:password@localhost:3306/mydb
```

### SQLite

```
sqlite3://./mydb.sqlite
better-sqlite3://./mydb.sqlite
```

## License

Licensed under [MIT License](./LICENSE)
