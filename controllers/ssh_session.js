const { Client } = require("ssh2");
const SftpServer = require("../models/SftpServer");
const { decrypt } = require("./encryption");

const ssh_session = (socket) => {
  let sshClient = new Client();

  socket.on("message", async (message) => {
    const { event, serverId } = JSON.parse(message);

    if (event === "startSession") {
      const serverInfo = await SftpServer.findById(serverId);
      if (!serverInfo) return;

      const { host, username, authType } = serverInfo;

      const connectConfig = {
        host,
        port: 22,
        username,
      };

      if (authType === "password") {
        connectConfig.password = decrypt(serverInfo.credentials.password);
      } else if (authType === "key") {
        let privateKey = decrypt(serverInfo.credentials.privateKey);

        if (privateKey.includes("\\n")) {
          privateKey = privateKey.replace(/\\n/g, "\n");
        }

        connectConfig.privateKey = privateKey;

        if (serverInfo.credentials.passphrase) {
          //connectConfig.passphrase = decrypt(serverInfo.credentials.passphrase);
        }
      }

      sshClient
        .on("ready", () => {
          socket.send(
            JSON.stringify({
              event: "output",
              data: "\r\n*** SSH CONNECTION ESTABLISHED ***\r\n",
            })
          );

          sshClient.shell({ term: "xterm-256color" }, (err, stream) => {
            if (err) {
              return socket.send(
                JSON.stringify({
                  event: "output",
                  data: "\r\n*** SSH SHELL ERROR ***\r\n",
                })
              );
            }

            stream.on("data", (data) => {
              socket.send(
                JSON.stringify({ event: "output", data: data.toString() })
              );
            });

            socket.on("message", (message) => {
              const { event, data, rows, cols } = JSON.parse(message);

              if (event === "resize") {
                if (rows && cols) {
                  stream.setWindow(rows, cols);
                }
              } else if (event === "input") {
                stream.write(data);
              }
            });

            stream.on("close", () => {
              sshClient.end();
            });
          });
        })
        .on("error", (err) => {
          socket.send(
            JSON.stringify({
              event: "output",
              data: `\r\n*** SSH CONNECTION ERROR: ${err.message} ***\r\n`,
            })
          );
        })
        .connect(connectConfig);
    }
  });

  socket.on("close", () => {
    if (sshClient) {
      sshClient.end();
    }
  });
};

module.exports = ssh_session;
