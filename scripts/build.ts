import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { hostname as getHostname } from "node:os";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";

// -----------------------------------------------------------------------------
// Paths
// -----------------------------------------------------------------------------

const rootDir = process.cwd();
const clientDir = resolve(rootDir, "client");
const envPath = join(rootDir, ".env");

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

type DatabaseType = "mongo" | "sqlite";

interface SetupConfig {
  HOSTNAME: string;
  UPLOADS_DIRECTORY: string;
  DATABASE: string;
  DATABASE_TYPE: DatabaseType;
  SQLITE_PATH: string;
  USE_HTTPS: boolean;
  HTTPS_CERT: string;
  HTTPS_KEY: string;
  MASTER_KEY: string;
  JWT_SECRET: string;
}

const defaults: SetupConfig = {
  HOSTNAME: "",
  UPLOADS_DIRECTORY: "uploads",
  DATABASE: "",
  DATABASE_TYPE: "sqlite",
  SQLITE_PATH: "./data/uploady.db",
  USE_HTTPS: true,
  HTTPS_CERT: "./server.cert",
  HTTPS_KEY: "./server.key",
  MASTER_KEY: "",
  JWT_SECRET: "",
};

// -----------------------------------------------------------------------------
// Prompting
// -----------------------------------------------------------------------------

const rl = createInterface({
  input,
  output,
});

async function prompt(label: string, defaultValue = ""): Promise<string> {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";

  const answer = await rl.question(`${label}${suffix}: `);

  return answer.trim() || defaultValue;
}

async function promptBoolean(
  label: string,
  defaultValue: boolean,
): Promise<boolean> {
  const defaultLabel = defaultValue ? "Y/n" : "y/N";

  const answer = (await rl.question(`${label} [${defaultLabel}]: `))
    .trim()
    .toLowerCase();

  if (!answer) {
    return defaultValue;
  }

  return answer === "y" || answer === "yes";
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getDefaultHostname(): string {
  try {
    const hostname = getHostname().trim();
    if (hostname) {
      return `${hostname}:3001`;
    }
  } catch {
    // Fall back to localhost.
  }
  return "localhost:3001";
}

function resolveConfigPath(path: string): string {
  return isAbsolute(path) ? path : resolve(rootDir, path);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function runCommand(
  command: string,
  args: string[],
  cwd = rootDir,
): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);

    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(
        new Error(`${command} ${args.join(" ")} failed with exit code ${code}`),
      );
    });
  });
}

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

async function getConfig(): Promise<SetupConfig> {
  const databaseType = await prompt("Database type", defaults.DATABASE_TYPE);

  if (databaseType !== "mongo" && databaseType !== "sqlite") {
    throw new Error("Database type must be 'mongo' or 'sqlite'");
  }

  const config: SetupConfig = {
    HOSTNAME: await prompt("Hostname", getDefaultHostname()),

    UPLOADS_DIRECTORY: await prompt(
      "Uploads directory",
      defaults.UPLOADS_DIRECTORY,
    ),

    DATABASE_TYPE: databaseType,

    DATABASE:
      databaseType === "mongo" ? await prompt("MongoDB connection string") : "",

    SQLITE_PATH:
      databaseType === "sqlite"
        ? await prompt("SQLite database path", defaults.SQLITE_PATH)
        : "",

    USE_HTTPS: await promptBoolean("Use HTTPS", defaults.USE_HTTPS),

    HTTPS_CERT: "",
    HTTPS_KEY: "",

    MASTER_KEY: await prompt("Master key (blank to generate)"),

    JWT_SECRET: await prompt("JWT secret (blank to generate)"),
  };

  if (config.USE_HTTPS) {
    config.HTTPS_CERT = await prompt("HTTPS certificate", defaults.HTTPS_CERT);

    config.HTTPS_KEY = await prompt("HTTPS private key", defaults.HTTPS_KEY);
  }

  config.MASTER_KEY ||= randomBytes(32).toString("hex");

  config.JWT_SECRET ||= randomBytes(32).toString("hex");

  return config;
}

// -----------------------------------------------------------------------------
// Environment
// -----------------------------------------------------------------------------

function serializeEnv(config: SetupConfig): string {
  return [
    `HOSTNAME=${config.HOSTNAME}`,
    `UPLOADS_DIRECTORY=${config.UPLOADS_DIRECTORY}`,
    `DATABASE=${config.DATABASE}`,
    `DATABASE_TYPE=${config.DATABASE_TYPE}`,
    `SQLITE_PATH=${config.SQLITE_PATH}`,
    `USE_HTTPS=${config.USE_HTTPS}`,
    `HTTPS_CERT=${config.HTTPS_CERT}`,
    `HTTPS_KEY=${config.HTTPS_KEY}`,
    `MASTER_KEY=${config.MASTER_KEY}`,
    `JWT_SECRET=${config.JWT_SECRET}`,
    "",
  ].join("\n");
}

async function writeEnv(config: SetupConfig): Promise<void> {
  await writeFile(envPath, serializeEnv(config), "utf8");

  console.log(`Wrote ${envPath}`);
}

// -----------------------------------------------------------------------------
// Directories
// -----------------------------------------------------------------------------

async function createDirectories(config: SetupConfig): Promise<void> {
  const uploadsDir = resolveConfigPath(config.UPLOADS_DIRECTORY);

  await mkdir(uploadsDir, {
    recursive: true,
  });

  console.log(`Ensured ${uploadsDir}`);

  if (config.DATABASE_TYPE !== "sqlite") {
    return;
  }

  const sqliteFile = resolveConfigPath(config.SQLITE_PATH);

  const sqliteDir = dirname(sqliteFile);

  await mkdir(sqliteDir, {
    recursive: true,
  });

  console.log(`Ensured ${sqliteDir}`);
}

// -----------------------------------------------------------------------------
// HTTPS
// -----------------------------------------------------------------------------

async function ensureHttpsCertificate(config: SetupConfig): Promise<void> {
  if (!config.USE_HTTPS) {
    return;
  }

  const certPath = resolveConfigPath(config.HTTPS_CERT);

  const keyPath = resolveConfigPath(config.HTTPS_KEY);

  const certExists = await fileExists(certPath);
  const keyExists = await fileExists(keyPath);

  if (certExists && keyExists) {
    console.log("HTTPS certificate and key already exist.");
    return;
  }

  console.log("\nHTTPS certificate or private key is missing.");

  const generate = await promptBoolean(
    "Generate a self-signed certificate",
    true,
  );

  if (!generate) {
    return;
  }

  await mkdir(dirname(certPath), {
    recursive: true,
  });

  await mkdir(dirname(keyPath), {
    recursive: true,
  });

  const certificateHostname = config.HOSTNAME.replace(/:\d+$/, "");

  const san = isIP(certificateHostname)
    ? `IP:${certificateHostname}`
    : `DNS:${certificateHostname}`;

  console.log(`\nGenerating certificate for ${certificateHostname}...\n`);

  await runCommand("openssl", [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-sha256",
    "-nodes",
    "-keyout",
    keyPath,
    "-out",
    certPath,
    "-days",
    "3650",
    "-subj",
    `/CN=${certificateHostname}`,
    "-addext",
    `subjectAltName=${san}`,
  ]);

  console.log(`Created ${certPath}`);
  console.log(`Created ${keyPath}`);
}

// -----------------------------------------------------------------------------
// Dependencies and build
// -----------------------------------------------------------------------------

async function installBackend(): Promise<void> {
  console.log("\nInstalling backend dependencies...\n");

  await runCommand("bun", ["install", "--omit=optional"]);
}

async function installFrontend(): Promise<void> {
  console.log("\nInstalling frontend dependencies...\n");

  await runCommand("bun", ["install"], clientDir);
}

async function buildFrontend(): Promise<void> {
  console.log("\nBuilding frontend...\n");

  await runCommand("bun", ["run", "build"], clientDir);
}

async function setupApplication(): Promise<void> {
  const config = await getConfig();

  console.log("\nPreparing Uploady...\n");

  await createDirectories(config);
  await ensureHttpsCertificate(config);
  await writeEnv(config);

  await installBackend();
  await installFrontend();
  await buildFrontend();
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main(): Promise<void> {
  try {
    console.log("\nUploady Setup\n");

    await setupApplication();

    console.log("\nUploady setup completed successfully.");

    console.log("Run with: bun --env-file=.env app.js\n");
  } catch (error) {
    console.error("\nUploady setup failed:");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main();
