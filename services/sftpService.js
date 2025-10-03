const SftpClient = require("ssh2-sftp-client");
const fs = require("fs");
const path = require("path");
const SftpServer = require("../models/SftpServer");
const { PassThrough } = require("stream");
const archiver = require("archiver");
const { decrypt } = require("../controllers/encryption");
const localFileService = require("./localFileService");
const {
  copySftpFolder,
  streamFolderSftpToSftp,
  streamFileSftpPair,
} = require("./sftpTransferService");
class SftpError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = "SftpError";
    this.code = code || "SFTP_ERROR";
    this.details = details;
  }
}

async function withSftp(serverId, fn) {
  let sftp;
  try {
    sftp = await connectToSftp(serverId);
    return await fn(sftp);
  } catch (err) {
    throw new SftpError("SFTP operation failed", err.code, err.message);
  } finally {
    if (sftp) {
      try {
        await sftp.end();
      } catch (_) {}
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
      throw new Error("Folder Already exists");
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
  });
}

async function deleteFile(serverId, file) {
  return withSftp(serverId, async (sftp) => {
    await sftp.delete(file);
  });
}

async function deleteFolder(serverId, folder) {
  return withSftp(serverId, async (sftp) => {
    await sftp.rmdir(folder);
  });
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
  });
}

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

async function listDirWithSftp({ sftp, currentDirectory }) {
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
  return { files, folders };
}

async function listDirectory(serverId, currentDirectory) {
  return withSftp(serverId, async (sftp) => {
    return listDirWithSftp({ sftp, currentDirectory });
  });
}

/*
  Download File from SFTP server
  Downloads file at remotePath from serverId
  Returns a stream. Once download finishes cleanup
  must be called to close sftp connection properly
*/
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

async function uploadFile(serverId, stream, remotePath) {
  const sftp = await connectToSftp(serverId);
  try {
    await sftp.put(stream, remotePath);
    const close = async () => {
      try {
        await sftp.end();
      } catch (err) {
        console.error("Error closing SFTP:", err);
      }
    };
    return { close };
  } catch (err) {
    await sftp.end();
    throw new SftpError("Error uploading file", err.code, err.message);
  }
}

const uploadsDir = path.join(__dirname, "../uploads");

async function uploadLocalFolderToSftp(localPath, destPath, sftpDest) {
  const { files, folders } = localFileService.listLocalDir(localPath);
  for (const file of files) {
    await uploadLocalFileToSftp(
      path.join(localPath, file.name),
      path.join(destPath, file.name),
      sftpDest
    );
  }
  for (const folder of folders) {
    const newLocalPath = path.join(localPath, folder.name);
    const newDestPath = path.join(destPath, folder.name);
    try {
      await sftpDest.mkdir(newDestPath);
    } catch (err) {
      if (!err.message.includes("already exists")) {
        throw err;
      }
    }
    await uploadLocalFolderToSftp(newLocalPath, newDestPath, sftpDest);
  }
}

const uploadLocalFileToSftp = async (localPath, destPath, sftpDest) => {
  const readStream = fs.createReadStream(localPath);
  const writeStream = await sftpDest.createWriteStream(destPath);

  await new Promise((resolve, reject) => {
    readStream
      .pipe(writeStream)
      .on("finish", resolve)
      .on("close", resolve)
      .on("end", resolve)
      .on("error", reject);
  });
};

/* 
  Copy items in filegroup to sftp server when filegroup contains
  files local to application
*/
const copyLocalToSftp = async ({ newServerId, fileGroup, newPath }) => {
  const sftpDest = await connectToSftp(newServerId);
  for (const file of fileGroup) {
    const localPath = path.join(uploadsDir, file.path, file.file);
    const destPath = path.join(newPath, file.file);
    if (file.isDirectory) {
      await sftpDest.mkdir(destPath);
      await uploadLocalFolderToSftp(localPath, destPath, sftpDest);
    } else {
      await uploadLocalFileToSftp(localPath, destPath, sftpDest);
    }
  }
  await sftpDest.end();
};

/*
  Copy items in filegroup from one location to another on sftp server
*/
const copySameSftp = async ({ serverId, fileGroup, newPath }) => {
  const sftpSource = await connectToSftp(serverId);
  for (const file of fileGroup) {
    const sourcePath = path.join(file.path, file.file);
    const destPath = path.join(newPath, file.file);
    if (file.isDirectory) {
      await copySftpFolder(sftpSource, sourcePath, destPath);
    } else {
      await sftpSource.rcopy(sourcePath, destPath);
    }
  }
  await sftpSource.end();
};

/*
  Copy items in filegroup from one sftp server to another sftp server
*/
const copyCrossServer = async ({
  serverId,
  newServerId,
  fileGroup,
  newPath,
  transferId,
}) => {
  const sftpSource = await connectToSftp(serverId);
  const sftpDest = await connectToSftp(newServerId);
  for (const file of fileGroup) {
    const sourcePath = path.join(file.path, file.file);
    const destPath = path.join(newPath, file.file);
    if (file.isDirectory) {
      await streamFolderSftpToSftp(
        sftpSource,
        sftpDest,
        sourcePath,
        destPath,
        transferId
      );
    } else {
      await streamFileSftpPair(
        sftpSource,
        sftpDest,
        sourcePath,
        destPath,
        file.file,
        transferId
      );
    }
  }
  await sftpSource.end();
  await sftpDest.end();
};

/*
  Copy files to newPath
  If copying files to same sftp server, leave newServerId undefined
  If copying to another server, provide newServerId and files will be
  copied to newPath and newServerId
*/

async function sftpCopyFilesBatch(files, newPath, newServerId, transferId) {
  const grouped = {};
  for (const item of files) {
    const key = item.serverId;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  for (const [serverId, fileGroup] of Object.entries(grouped)) {
    if (serverId === null || serverId === "null") {
      await copyLocalToSftp({ newServerId, fileGroup, newPath });
    } else if (!newServerId || newServerId === serverId) {
      await copySameSftp({ serverId, fileGroup, newPath });
    } else {
      await copyCrossServer({
        serverId,
        newServerId,
        fileGroup,
        newPath,
        transferId,
      });
    }
  }
}

module.exports = {
  createFolder,
  renameFile,
  archiveFolder,
  listDirectory,
  deleteFile,
  deleteFolder,
  downloadFile,
  uploadFile,
  connectToSftp,
  sftpCopyFilesBatch,
  connectToSftp,
  listDirWithSftp,
};
