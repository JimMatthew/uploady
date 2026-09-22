import { describe, expect, test } from "bun:test";
import { selectStrategy } from "../services/transferStrategies";

describe("selectStrategy", () => {
  test("selects local -> local", () => {
    const result = selectStrategy("local", null, null);

    expect(result).toBe("localToLocal");
  });

  test("selects local -> SFTP", () => {
    const result = selectStrategy("local", null, "server-b");

    expect(result).toBe("localToSftp");
  });

  test("selects SFTP -> local", () => {
    const result = selectStrategy("sftp", "server-a", null);

    expect(result).toBe("sftpToLocal");
  });

  test("selects SFTP -> same SFTP server", () => {
    const result = selectStrategy("sftp", "server-a", "server-a");

    expect(result).toBe("sftpSameServer");
  });

  test("selects SFTP -> different SFTP server", () => {
    const result = selectStrategy("sftp", "server-a", "server-b");

    expect(result).toBe("sftpCrossServer");
  });

  test("selects archive -> local", () => {
    const result = selectStrategy("archive", null, null);

    expect(result).toBe("archiveToLocal");
  });

  test("selects archive -> SFTP", () => {
    const result = selectStrategy("archive", null, "server-b");

    expect(result).toBe("archiveToSftp");
  });
});