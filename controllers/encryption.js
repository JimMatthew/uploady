const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const MASTER_KEY = Buffer.from(process.env.MASTER_KEY, "hex");

 function encrypt(text) {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);

    let encypted = cipher.update(text, "utf-8", "hex");

    encypted+= cipher.final("hex")

    const authTag = cipher.getAuthTag().toString("hex")

    return {
        iv: iv.toString("hex"),
        content: encypted,
        tag: authTag
    }
}

function decrypt(encypted) {
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        MASTER_KEY,
        Buffer.from(encypted.iv, "hex")
    )

    decipher.setAuthTag(Buffer.from(encypted.tag, "hex"))

    let decrypted = decipher.update(encypted.content, "hex", "utf8")
    decrypted += decipher.final("utf-8")
    return decrypted;
}

module.exports = {
    encrypt,
    decrypt
}