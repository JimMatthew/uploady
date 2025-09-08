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
const { encrypt, decrypt } = require("./encryption");
const domain = process.env.HOSTNAME;

const handleError = (res, message, status = 500) => {
  console.error(message);
  res.status(status).json({ error: message });
};

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

const sftp_rename_file_json_post = async (req, res) => {
  const { currentPath, fileName, newFileName, serverId } = req.body;
  if (!currentPath || !fileName || !newFileName || serverId) {
    return res
      .status(400)
      .send(JSON.stringify("Error: Missing required fields"));
  }
  let sftp;
  try {
    sftp = await connectToSftp(serverId);
    await sftp.rename(
      path.join(currentPath, fileName),
      path.join(currentPath, newFileName)
    );
    res.status(200).send(JSON.stringify("message: File renamed"));
  } catch (err) {
    return res.status(404).send(JSON.stringify("Error: Error creating folder"));
  } finally {
    if (sftp) await sftp.end();
  }
};

const sftp_create_folder_json_post = async (req, res) => {
  const { currentPath, folderName, serverId } = req.body;
  if (!currentPath || !folderName || !serverId) {
    return res
      .status(400)
      .send(JSON.stringify("Error: Missng required fields"));
  }
  let sftp;
  try {
    sftp = await connectToSftp(serverId);
    await sftp.mkdir(path.join(currentPath, folderName));
    res.status(200).send(JSON.stringify("message: Folder Created"));
  } catch (err) {
    return res.status(404).send(JSON.stringify("Error: Error creating folder"));
  } finally {
    if (sftp) await sftp.end();
  }
};

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

const sftp_get_archive_folder = async (req, res) => {
  const { serverId } = req.params;
  const relativePath = req.params[0] || "";
  const remotePath = relativePath ? `/${relativePath}` : "/";
  try {
    const sftp = await connectToSftp(serverId);
    res.setHeader("Content-Disposition", 'attachment; filename="folder.zip"');
    res.setHeader("Content-Type", "application/zip");

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    await addFolderToArchive(sftp, archive, remotePath, "/");
    archive.finalize();
  } catch (err) {
    handleError(res, "Failed to download folder");
  }
};

const share_sftp_file = async (req, res, next) => {
  const { serverId, remotePath } = req.body;
  if (!serverId || !remotePath) {
    return res
      .status(400)
      .send(JSON.stringify("Error: Missing required fields"));
  }
  const token = crypto.randomBytes(5).toString("hex");
  const fileName = remotePath.split("/").pop();
  const filePath = remotePath ? remotePath : "/";
  const link = `${req.protocol}://${domain}/share/${token}/${fileName}`;
  const server = await SftpServer.findById(serverId);

  const sharedFile = new SharedFile({
    fileName,
    filePath,
    link,
    token,
    isRemote: true,
    serverId,
    ...(server && { serverName: server.host }),
  });

  await sharedFile.save();
  return res.json({
    link: link,
  });
};

const sftp_download_file = async (serverId, remotePath, res) => {
  try {
    const sftp = await connectToSftp(serverId);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${remotePath.split("/").pop()}"`
    );
    res.setHeader("Content-Type", "application/octet-stream");
    const stream = new PassThrough();
    sftp
      .get(remotePath, stream)
      .then(() => sftp.end())
      .catch((err) => {
        sftp.end();
        return res.status(500).json({
          error: "Error downloading file",
        });
      });
    stream.pipe(res);
    res.on("close", () => {
      sftp.end();
    });
  } catch (error) {
    console.log("Error:", error);
    return res.status(500).json({
      error: "Error downloading",
    });
  }
};

const sftp_stream_download_get = async (req, res, next) => {
  const { serverId } = req.params;
  const relativePath = req.params[0] || "";
  const remotePath = relativePath ? `/${relativePath}` : "/";
  await sftp_download_file(serverId, remotePath, res);
};

const sftp_stream_upload_post = async (req, res, next) => {
  const busboy = Busboy({ headers: req.headers });
  let currentDirectory, serverId;

  busboy.on("field", (fieldname, value) => {
    if (fieldname === "currentDirectory") currentDirectory = value;
    if (fieldname === "serverId") serverId = value;
  });

  busboy.on("file", async (fieldname, file, filename) => {
    if (!serverId || !currentDirectory) {
      file.resume();
      return res.status(400).send("Missing directory or server ID");
    }

    let sftp;
    try {
      sftp = await connectToSftp(serverId);
      await sftp.put(file, `${currentDirectory}/${filename.filename}`);
      res.status(200).send("File uploaded successfully");
    } catch (error) {
      handleError(res, "Error uploading file");
    } finally {
      if (sftp) await sftp.end();
    }
  });

  busboy.on("error", (err) => {
    handleError(res, "Error processing upload");
  });

  req.pipe(busboy);
};

const sftp_servers_json_get = async (req, res, next) => {
  try {
    const servers = await SftpServer.find().select("_id, host");
    return res.json({ servers });
  } catch (error) {
    return res.json({ status: "offline" });
  }
};

const server_status_get = async (req, res) => {
  const { serverId } = req.params;

  try {
    const server = await SftpServer.findById(serverId);
    if (!server) return res.json({ status: "offline" });

    const status = await checkServerStatus(server.host);
    return res.json({ status });
  } catch (error) {
    return res.json({ status: "offline" });
  }
};

const checkServerStatus = (host, port = 22) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(5000); // Set timeout to 5 seconds
    socket
      .connect(port, host, () => {
        socket.end();
        resolve("online");
      })
      .on("error", () => {
        resolve("offline");
      })
      .on("timeout", () => {
        socket.destroy();
        resolve("offline");
      });
  });
};

const sftp_save_server_json_post = async (req, res, next) => {
  const {
    host,
    username,
    password,
    authType = "password",
    key,
    passphrase,
  } = req.body;

  if (!host || !username || !authType) {
    return handleError(res, "Host, username, and AuthType required", 400);
  }

  const server = {
    host,
    username,
    authType,
    credentials: {},
  };

  if (authType === "password") {
    if (!password) {
      return handleError(res, "Password required for password auth", 400);
    }
    server.credentials.password = encrypt(password);
  } else if (authType === "key") {
    if (!key) {
      return handleError(res, "Key required for key Auth", 400);
    }
    server.credentials.privateKey = encrypt(key);
    if (passphrase) {
      server.credentials.passphrase = encrypt(passphrase);
    }
  }

  const newServer = new SftpServer(server);
  try {
    await newServer.save();
    res.status(200).send();
  } catch (error) {
    return handleError(res, "Cannot save Server", 400);
  }
};

const sftp_delete_server__json_post = async (req, res, next) => {
  const { serverId } = req.body;
  try {
    console.log("del serv " + serverId);
    await SftpServer.findByIdAndDelete(serverId);
    res.status(200).send("server dlelered");
  } catch (error) {
    return res.status(404).send("Error deleting server");
  }
};

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const sftp_id_list_files_json_get = async (req, res, next) => {
  const { serverId } = req.params;
  const currentDirectory = "/" + (req.params[0] || "/");
  if (!mongoose.Types.ObjectId.isValid(serverId)) {
    const err = new Error("Invalid server ID");
    err.status = 400;
    return next(err);
  }
  let sftp;
  try {
    const server = await SftpServer.findById(serverId);
    if (!server) {
      return res.status(404).json({
        error: "Server not found",
      });
    }
    const { host } = server;
    sftp = await connectToSftp(serverId);
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
    res.json({
      files,
      folders,
      currentDirectory,
      serverId,
      host,
    });
  } catch (error) {
    console.log(error);
    return res.status(404).send("Error listing directory");
  } finally {
    if (sftp) await sftp.end();
  }
};

const sftp_delete_file_json_post = async (req, res, next) => {
  const { serverId, currentDirectory, fileName } = req.body;
  if (serverId && currentDirectory && fileName) {
    try {
      const sftp = await connectToSftp(serverId);
      await sftp.delete(path.join(currentDirectory, fileName));
      return res.status(200).send(JSON.stringify("message: File Deleted"));
    } catch (error) {
      return res.status(400).send("Error deleting file");
    }
  }
  return res.status(404).send("server not found");
};

const sftp_delete_folder_json_post = async (req, res, next) => {
  const { serverId, currentDirectory, deleteDir } = req.body;
  try {
    const sftp = await connectToSftp(serverId);
    await sftp.rmdir(path.join(currentDirectory, deleteDir));
    res.status(200).send(JSON.stringify("message: Folder Deleted"));
  } catch (error) {
    res.status(400).send(JSON.stringify("Error: Failed to delete folder"));
  }
};

const progressClients = new Map(); // Map<transferId, res>

const get_transfer_progress = async (req, res) => {
  const { transferId } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write("\n");
  progressClients.set(transferId, res);
  res.write(`data: ${JSON.stringify({ ready: true })}\n\n`);
  req.on("close", () => {
    progressClients.delete(transferId);
  });
};

const streamFileStfpPair = async (
  source,
  dest,
  sourcePath,
  destPath,
  filename,
  transferId
) => {
  const passthrough = new PassThrough();

  try {
    const { size: totalSize } = await source.stat(sourcePath);
    let transferred = 0;
    let lastUpdate = Date.now();
    // Track the number of bytes as they pass through
    passthrough.on("data", (chunk) => {
      transferred += chunk.length;
      const now = Date.now();

      if (now - lastUpdate > 100) {
        lastUpdate = now;
        const percent = Math.min((transferred / totalSize) * 100, 100);
        const client = progressClients.get(transferId);
        if (client) {
          client.write(
            `data: ${JSON.stringify({
              file: filename,
              percent: percent.toFixed(2),
            })}\n\n`
          );
        }
      }
    });
    const download = source.get(sourcePath, passthrough);
    const upload = dest.put(passthrough, destPath);

    await Promise.all([download, upload]);

    const client = progressClients.get(transferId);
    if (client) {
      client.write(
        `data: ${JSON.stringify({ file: filename, done: true })}\n\n`
      );
    }
  } catch (err) {
    console.error("Error during transfer:", err);
    throw err;
  }
};

const stream_sftp_folder_to_sftp = async (
  source,
  dest,
  sourcePath,
  destPath,
  foldername,
  transferId
) => {
  const files = await source.list(sourcePath);
  await dest.mkdir(destPath, false);
  for (const file of files) {
    const srcFile = path.join(sourcePath, file.name);
    const dstFile = path.join(destPath, file.name);
    if (file.type === "-") {
      await streamFileStfpPair(source, dest, srcFile, dstFile, file.name);
    } else if (file.type === "d") {
      await stream_sftp_folder_to_sftp(
        source,
        dest,
        srcFile,
        dstFile,
        foldername,
        transferId
      );
    }
  }
};

const copy_sftp_folder = async (sftpServer, sourcePath, destPath) => {
  const files = await sftpServer.list(sourcePath);
  await sftpServer.mkdir(destPath, false);
  for (const file of files) {
    srcFolder = path.join(sourcePath, file.name);
    dstFolder = path.join(destPath, file.name);
    if (file.type === "-") {
      await sftpServer.rcopy(srcFolder, dstFolder);
    } else if (file.type === "d") {
      await copy_sftp_folder(sftpServer, srcFolder, dstFolder);
    }
  }
};

const sftp_copy_files_batch_json_post = async (req, res, next) => {
  const { files, newPath, newServerId, transferId } = req.body;
  const client = progressClients.get(transferId);
  const grouped = {};
  for (const item of files) {
    const key = item.serverId;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }
  try {
    for (const [serverId, fileGroup] of Object.entries(grouped)) {
      let sftpSource, sftpDest;

      if (!newServerId || newServerId === serverId) {
        // Same server copy
        sftpSource = await connectToSftp(serverId);

        for (const file of fileGroup) {
          const sourcePath = path.join(file.path, file.file);
          const destPath = path.join(newPath, file.file);
          if (file.isDirectory) {
            await copy_sftp_folder(sftpSource, sourcePath, destPath);
          } else {
            await sftpSource.rcopy(sourcePath, destPath);
          }
        }

        sftpSource.end();
      } else {
        // Cross-server copy
        sftpSource = await connectToSftp(serverId);
        sftpDest = await connectToSftp(newServerId);

        for (const file of fileGroup) {
          const sourcePath = path.join(file.path, file.file);
          const destPath = path.join(newPath, file.file);
          if (file.isDirectory) {
            await stream_sftp_folder_to_sftp(
              sftpSource,
              sftpDest,
              sourcePath,
              destPath,
              file.file,
              transferId
            );
          } else {
            await streamFileStfpPair(
              sftpSource,
              sftpDest,
              sourcePath,
              destPath,
              file.file,
              transferId
            );
          }
        }
        sftpSource.end();
        sftpDest.end();
      }
    }
    if (client) {
      client.write(`data: ${JSON.stringify({ allDone: true })}\n\n`);
      client.end();
      progressClients.delete(transferId);
    }

    return res.status(200).send("Batch transfer complete");
  } catch (err) {
    console.error(err);
    console.error("YOU FUCKED UP");
    return res.status(500).send("Batch transfer failed");
  }
};

module.exports = {
  sftp_stream_download_get,
  sftp_stream_upload_post,
  server_status_get,
  sftp_servers_json_get,
  sftp_id_list_files_json_get,
  sftp_delete_server__json_post,
  sftp_save_server_json_post,
  sftp_delete_file_json_post,
  sftp_delete_folder_json_post,
  sftp_create_folder_json_post,
  sftp_get_archive_folder,
  share_sftp_file,
  sftp_download_file,
  sftp_rename_file_json_post,
  get_transfer_progress,
  sftp_copy_files_batch_json_post,
};
