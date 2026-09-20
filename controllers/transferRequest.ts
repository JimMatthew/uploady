import type { TransferRequestFile } from "../shared/api/transfers";

export function parseTransferRequestFile(
  value: unknown,
  index: number,
): TransferRequestFile {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid file at index ${index}`);
  }

  const file = value as Record<string, unknown>;

  if (typeof file.file !== "string" || !file.file) {
    throw new Error(`Invalid file name at index ${index}`);
  }

  if (typeof file.path !== "string") {
    throw new Error(`Invalid path at index ${index}`);
  }

  if (typeof file.isDirectory !== "boolean") {
    throw new Error(`Invalid isDirectory at index ${index}`);
  }

  if (
    file.size !== undefined &&
    (typeof file.size !== "number" ||
      !Number.isFinite(file.size) ||
      file.size < 0)
  ) {
    throw new Error(`Invalid size at index ${index}`);
  }

  const base = {
    file: file.file,
    path: file.path,
    isDirectory: file.isDirectory,
    size: typeof file.size === "number" ? file.size : 0,
  };

  switch (file.source) {
    case "local":
      return {
        ...base,
        source: "local",
        serverId: null,
      };

    case "sftp":
      if (typeof file.serverId !== "string" || !file.serverId) {
        throw new Error(`Missing serverId at index ${index}`);
      }

      return {
        ...base,
        source: "sftp",
        serverId: file.serverId,
      };

    case "archive":
      if (typeof file.archivePath !== "string" || !file.archivePath) {
        throw new Error(`Missing archivePath at index ${index}`);
      }

      return {
        ...base,
        source: "archive",
        serverId: null,
        archivePath: file.archivePath,
      };

    default:
      throw new Error(`Invalid source at index ${index}`);
  }
}
