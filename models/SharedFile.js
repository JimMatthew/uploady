const mongoose = require('mongoose')

const sharedFileSchema = new mongoose.Schema({
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    link: { type: String, required: true },
    token: {type: String, required: true },
    sharedAt: { type: Date, default: Date.now },
})

const SharedFile = mongoose.model('SharedFile', sharedFileSchema)

module.exports = SharedFile