const mongoose = require('mongoose')

const sftpServerSchema = new mongoose.Schema({
    host: { type: String, required: true},
    username: { type: String, required: true },
    password: { type: String, required: true }
})

const SftpServer = mongoose.model('SftpServer', sftpServerSchema)

module.exports = SftpServer