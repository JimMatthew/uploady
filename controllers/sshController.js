const { Client } = require('ssh2')
const SftpServer = require('../models/SftpServer')
const socketIO = require('socket.io')
const pty = require('node-pty');
const ssh_session = (socket) => {
	let sshClient = new Client()

	socket.on('startSession', async (serverId) => {
		const serverInfo = await SftpServer.findById(serverId.serverId)
		const { host, username, password } = serverInfo
		sshClient
			.on('ready', () => {
				socket.emit('output', '\r\n*** SSH CONNECTION ESTABLISHED ***\r\n')

				sshClient.shell((err, stream) => {
					if (err) return socket.emit('output', '\r\n*** SSH SHELL ERROR ***\r\n')

					stream.write('TERM=xterm-256color\r\n') //hack - fix later
					
					//stream.write('export TERM=xterm-256color > /dev/null 2>&1\r\n')
					stream
						.on('data', (data) => {
							socket.emit('output', data.toString())
						})
						.on('close', () => {
							sshClient.end()
						})

					socket.on('input', (data) => {
						stream.write(data)  // Send input from client to SSH session
					})
				})
			})
			.on('error', (err) => {
				socket.emit('output', `\r\n*** SSH CONNECTION ERROR: ${err.message} ***\r\n`)
			})
			.connect({
				host,
				port: 22,
				username,
				password
			})
	})
	socket.on('disconnect', () => {
		if (sshClient) {
			sshClient.end()
		}
	})
}

module.exports = ssh_session