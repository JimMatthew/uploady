
const SftpClient = require("ssh2-sftp-client");
const path = require("path");
const SftpServer = require("../models/SftpServer");
const mongoose = require("mongoose");
const { PassThrough } = require("stream");
const Busboy = require("busboy");
const crypto = require("crypto");
const net = require("net");
const archiver = require("archiver");
const SharedFile = require("../models/SharedFile");
const { encrypt, decrypt } = require("../controllers/encryption");
//const { connectToSftp } = require("../lib/sftp"); 

class SftpError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = "SftpError";
    this.code = code || "SFTP_ERROR"; // your own codes
    this.details = details;           // raw error if needed
  }
}

async function withSftp(serverId, fn) {
  let sftp;
  try {
    sftp = await connectToSftp(serverId);
    return await fn(sftp);
  } catch (err) {
    // Wrap any library error in your own standardized error
    throw new SftpError("SFTP operation failed", err.code, err.message);
  } finally {
    if (sftp) {
      try {
        await sftp.end();
      } catch (_) {
        // swallow cleanup errors
      }
    }
  }
}
const connectToSftp = async (serverId) => {
  const server = await SftpServer.findById(serverId);
  if (!server) throw new Error("Server not found");

  const sftp = new SftpClient();

  const options = {
    host: server.host,
    port: 22,
    username: server.username,
  };

  if (server.authType === "password") {
    options.password = decrypt(server.credentials.password);
  } else if (server.authType === "key") {
    let privateKey = decrypt(server.credentials.privateKey).trim();

    if (privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n");
    }
    options.privateKey = privateKey;

    const passphrase =
      server.credentials.passphrase && server.credentials.passphrase.iv
        ? decrypt(server.credentials.passphrase)
        : undefined;

    if (passphrase) options.passphrase = passphrase;
  }
  await sftp.connect(options);
  return sftp;
};

async function createFolder(currentPath, folderName, serverId) {
  return withSftp(serverId, async (sftp) => {
    const folderPath = path.posix.join(currentPath, folderName);
    if (await sftp.exists(folderPath)) {
        throw new Error("Folder Already exists")
    }
    await sftp.mkdir(folderPath);
    return { path: folderPath };
  });
}

async function renameFile(serverId, currentPath, fileName, newFileName) {
    return withSftp(serverId, async (sftp) => {
        await sftp.rename(
          path.join(currentPath, fileName),
          path.join(currentPath, newFileName)
        );
    })
}

async function deleteFile(serverId, file) {
  return withSftp(serverId, async (sftp) => {
    await sftp.delete(file);
  })
}

async function deleteFolder(serverId, folder) {
  return withSftp(serverId, async (sftp) => {
    await sftp.rmdir(folder);
  })
}

const addFolderToArchive = async (sftp, archive, folderPath, zipFolderPath) => {
  const folderContents = await sftp.list(folderPath);

  for (const item of folderContents) {
    const itemPath = `${folderPath}/${item.name}`;
    const zipPath = `${zipFolderPath}/${item.name}`;

    if (item.type === "-") {
      if (item.size == 0) {
        continue;
      }
      const stream = await sftp.get(itemPath);
      archive.append(stream || Buffer.alloc(0), { name: zipPath });
      //archive.append(stream, { name: zipPath });
    } else if (item.type === "d") {
      archive.append(null, { name: `${zipPath}/` });
      await addFolderToArchive(sftp, archive, itemPath, zipPath);
    }
  }
};

async function archiveFolder(serverId, remotePath, res) {
    return withSftp(serverId, async (sftp) => {
      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.pipe(res);
  
      await addFolderToArchive(sftp, archive, remotePath, "/");
      archive.finalize();
    })
      
}
const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

async function listDirectory(serverId, currentDirectory) {
  return withSftp(serverId, async (sftp) => {
    
    const contents = await sftp.list(currentDirectory);
    const { files, folders } = contents.reduce(
      (acc, item) => {
        if (item.type === "d") {
          acc.folders.push({ name: item.name });
        } else {
          acc.files.push({
            name: item.name,
            size: (item.size / 1024).toFixed(2),
            date: formatDate(item.modifyTime),
          });
        }
        return acc;
      },
      { files: [], folders: [] }
    );
    return { files, folders }
  })
  
}

async function downloadFile(serverId, remotePath) {
  const sftp = await connectToSftp(serverId);
  const stream = new PassThrough();

  try {
    await sftp.get(remotePath, stream);

    const cleanup = async () => {
      try {
        await sftp.end();
      } catch (err) {
        console.error("Error closing SFTP:", err);
      }
    };

    return {
      stream,
      filename: remotePath.split("/").pop(),
      cleanup, 
    };
  } catch (err) {
    await sftp.end();
    throw new SftpError("Error downloading file", err.code, err.message);
  }
}



module.exports = {
  downloadFile,
};

module.exports = {
  createFolder,
  renameFile,
  archiveFolder,
  listDirectory,
  deleteFile,
  deleteFolder, 
  downloadFile
};