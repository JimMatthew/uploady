const { Client } = require("ssh2")
const SftpServer = require("../models/SftpServer")

const ssh_session = (socket) => {
  let sshClient = new Client()

  socket.on("message", async (message) => {
    const { event, serverId, data } = JSON.parse(message)

    if (event === "startSession") {
      const serverInfo = await SftpServer.findById(serverId)
      if (!serverInfo) return

      const { host, username, password } = serverInfo

      sshClient.on("ready", () => {
        socket.send(JSON.stringify({ event: "output", data: "\r\n*** SSH CONNECTION ESTABLISHED ***\r\n" }))

        sshClient.shell({ term: "xterm-256color" }, (err, stream) => {
          if (err) return socket.send(JSON.stringify({ event: "output", data: "\r\n*** SSH SHELL ERROR ***\r\n" }))

          stream.on("data", (data) => {
            socket.send(JSON.stringify({ event: "output", data: data.toString() }))  // Send SSH output to client
            stream.setWindow(50,100)
          })

          socket.on("message", (message) => {
            const { event, data } = JSON.parse(message)
            if (event === "input") {
              stream.write(data)  // Send client input to SSH session
            }
          })

          stream.on("close", () => {
            sshClient.end()
          })
        })
      }).on("error", (err) => {
        socket.send(JSON.stringify({ event: "output", data: `\r\n*** SSH CONNECTION ERROR: ${err.message} ***\r\n` }))
      }).connect({
        host,
        port: 22,
        username,
        password,
      })
    }
  })

  socket.on("close", () => {
    if (sshClient) {
      sshClient.end()
    }
  })
}


module.exports = ssh_session