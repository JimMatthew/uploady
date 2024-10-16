const { Client } = require("ssh2");
const SftpServer = require("../models/SftpServer");

const ssh_session = (socket) => {
  let sshClient = new Client();

  socket.on("startSession", async (serverId) => {
    const serverInfo = await SftpServer.findById(serverId.serverId);
	if (!serverInfo){
		return
	}
    const { host, username, password } = serverInfo;
    sshClient
      .on("ready", () => {
        socket.emit("output", "\r\n*** SSH CONNECTION ESTABLISHED ***\r\n");
        sshClient.shell({ term: "xterm-256color" }, (err, stream) => {
          if (err)
            return socket.emit("output", "\r\n*** SSH SHELL ERROR ***\r\n");

          stream
            .on("data", (data) => {
              stream.setWindow(50, 120);
              socket.emit("output", data.toString());
            })
            .on("close", () => {
              sshClient.end();
            });

          socket.on("input", (data) => {
            stream.write(data); // Send input from client to SSH session
          });
        });
      })
      .on("error", (err) => {
        socket.emit(
          "output",
          `\r\n*** SSH CONNECTION ERROR: ${err.message} ***\r\n`
        );
      })
      .connect({
        host,
        port: 22,
        username,
        password,
      });
  });
  socket.on("disconnect", () => {
    if (sshClient) {
      sshClient.end();
    }
  });
};

module.exports = ssh_session;
