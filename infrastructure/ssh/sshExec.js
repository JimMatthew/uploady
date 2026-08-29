const { Client } = require("ssh2");

/**
 * Opens an SSH connection, executes a command, returns stdout,
 * then closes the connection.
 *
 * @param {object} connectConfig
 * @param {string} command
 * @returns {Promise<string>}
 */
const sshExec = (connectConfig, command) =>
  new Promise((resolve, reject) => {
    const client = new Client();

    client.on("ready", () => {
      client.exec(command, (err, stream) => {
        if (err) {
          client.end();
          return reject(err);
        }

        let stdout = "";
        let stderr = "";

        stream.on("data", (data) => {
          stdout += data.toString();
        });

        stream.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        stream.on("close", (code) => {
          client.end();

          if (code !== 0) {
            return reject(
              new Error(
                `Command exited ${code}: ${stderr.trim()}`,
              ),
            );
          }

          resolve(stdout);
        });
      });
    });

    client.on("error", reject);
    client.connect(connectConfig);
  });

module.exports = {
  sshExec,
};