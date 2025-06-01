const SQLITE_DRIVERS = ["sqlite3", "better-sqlite3"] as const;
const NON_SQLITE_DRIVERS = ["pg", "pg-native", "mysql", "mysql2", "oracledb", "tedious"] as const;
const ALL_DRIVERS = new Set([...SQLITE_DRIVERS, ...NON_SQLITE_DRIVERS]);

type SQLiteDriver = typeof SQLITE_DRIVERS[number];
type NonSQLiteDriver = typeof NON_SQLITE_DRIVERS[number];
type Driver = SQLiteDriver | NonSQLiteDriver;

interface BaseConnectionParams {
  driver: Driver;
  params: Record<string, string>;
}

interface SQLiteConnection extends BaseConnectionParams {
  driver: SQLiteDriver;
  filename: string;
}

interface NonSQLiteConnection extends BaseConnectionParams {
  driver: NonSQLiteDriver;
  user?: string;
  password?: string;
  database?: string;
  host?: string;
  port?: number;
}

type ConnectionParams = SQLiteConnection | NonSQLiteConnection;

export function dsnParser(dsn?: string, driver?: string): ConnectionParams {
  if (dsn === undefined || dsn.trim() === "") {
    throw new Error("db string is required");
  }

  dsn = dsn.trim();

  const matchedDriver = (/^([a-z0-9-]+):\/\//i).exec(dsn);

  if (matchedDriver === null) {
    if (driver === undefined) {
      throw new Error("Driver is required when db string does not specify one");
    }

    if (!ALL_DRIVERS.has(driver as Driver)) {
      throw new Error(`Unsupported driver: ${driver}`);
    }

    dsn = `${driver}://${dsn}`;
  }

  let url: URL;

  try {
    url = new URL(dsn.trim());
  } catch {
    throw new Error(`Invalid db string format: ${dsn}`);
  }

  // Remove trailing ':'
  driver = url.protocol.slice(0, -1);

  if (!ALL_DRIVERS.has(driver as Driver)) {
    throw new Error(`Unsupported driver: ${driver}`);
  }

  if (SQLITE_DRIVERS.includes(driver as SQLiteDriver)) {
    return {
      driver: driver as SQLiteDriver,
      filename: decodeURI(`${url.host}${url.pathname}`),
      params: Object.fromEntries(url.searchParams)
    };
  }

  return {
    driver: driver as NonSQLiteDriver,
    user: url.username === "" ? undefined : decodeURI(url.username),
    password: url.password === "" ? undefined : decodeURI(url.password),
    host: decodeURI(url.hostname),
    port: url.port !== "" ? Number.parseInt(url.port) : undefined,
    database: decodeURI(url.pathname).slice(1),
    params: Object.fromEntries(url.searchParams)
  };
}
