const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const execFileAsync = promisify(execFile);
async function generateSshKeyPair() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "uploady-key-"));
  const keyPath = path.join(dir, "id_ed25519");

  try {
    await execFileAsync("ssh-keygen", [
      "-t",
      "ed25519",
      "-N",
      "",
      "-f",
      keyPath,
      "-q",
    ]);

    const privateKey = await fs.readFile(keyPath, "utf8");
    const publicKey = await fs.readFile(`${keyPath}.pub`, "utf8");

    return {
      privateKey,
      publicKey: publicKey.trim(),
    };
  } finally {
    await fs.rm(dir, {
      recursive: true,
      force: true,
    });
  }
}
module.exports = {generateSshKeyPair}