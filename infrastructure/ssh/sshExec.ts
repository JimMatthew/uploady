import { Client, type ConnectConfig } from "ssh2";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SshExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// ─── Command Execution ────────────────────────────────────────────────────────

/**
 * Opens an SSH connection, executes a command, captures its output,
 * then closes the connection.
 */
export function sshExec(
  connectConfig: ConnectConfig,
  command: string,
): Promise<SshExecResult> {
  return new Promise<SshExecResult>((resolve, reject) => {
    const client = new Client();

    client.on("ready", () => {
      client.exec(command, (err, stream) => {
        if (err) {
          client.end();
          reject(err);
          return;
        }

        let stdout = "";
        let stderr = "";

        stream.on("data", (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });

        stream.on("close", (exitCode: number) => {
          client.end();

          resolve({
            stdout,
            stderr,
            exitCode,
          });
        });
      });
    });

    client.on("error", reject);

    client.connect(connectConfig);
  });
}
