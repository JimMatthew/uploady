export type DatabaseType = "mongo" | "sqlite";

export interface AppConfig {
  server: {
    hostname: string;
    port: number;
    https:
      | {
          enabled: false;
        }
      | {
          enabled: true;
          certPath: string;
          keyPath: string;
        };
  };

  storage: {
    uploadsDirectory: string;
  };

  database:
    | {
        type: "mongo";
        uri: string;
      }
    | {
        type: "sqlite";
        path: string;
      };

  auth: {
    masterKey: string;
    jwtSecret: string;
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }

  return value;
}

function parseBoolean(
  name: string,
  value: string | undefined,
  defaultValue = false,
): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  switch (value.toLowerCase()) {
    case "true":
      return true;

    case "false":
      return false;

    default:
      throw new Error(`${name} must be "true" or "false"`);
  }
}

function parsePort(value: string | undefined, defaultValue = 3001): number {
  if (value === undefined) {
    return defaultValue;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return port;
}

function parseMasterKey(value: string): string {
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(
      "MASTER_KEY must be exactly 64 hexadecimal characters",
    );
  }

  return value;
}

function loadDatabaseConfig(): AppConfig["database"] {
  const type = requireEnv("DATABASE_TYPE");

  switch (type) {
    case "mongo":
      return {
        type,
        uri: requireEnv("DATABASE"),
      };

    case "sqlite":
      return {
        type,
        path: requireEnv("SQLITE_PATH"),
      };

    default:
      throw new Error(`Unsupported DATABASE_TYPE: ${type}`);
  }
}

function loadHttpsConfig(): AppConfig["server"]["https"] {
  const enabled = parseBoolean("USE_HTTPS", process.env.USE_HTTPS);

  if (!enabled) {
    return {
      enabled: false,
    };
  }

  return {
    enabled: true,
    certPath: requireEnv("HTTPS_CERT"),
    keyPath: requireEnv("HTTPS_KEY"),
  };
}

function loadConfig(): AppConfig {
  return {
    server: {
      hostname: requireEnv("HOSTNAME"),
      port: parsePort(process.env.PORT),
      https: loadHttpsConfig(),
    },

    storage: {
      uploadsDirectory: process.env.UPLOADS_DIRECTORY ?? "./uploads",
    },

    database: loadDatabaseConfig(),

    auth: {
      masterKey: parseMasterKey(requireEnv("MASTER_KEY")),
      jwtSecret: requireEnv("JWT_SECRET"),
    },
  };
}

function initializeConfig(): AppConfig {
  try {
    return loadConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error(`FATAL [CONFIG] ${message}`);
    process.exit(1);
  }
}

export const config = initializeConfig();
