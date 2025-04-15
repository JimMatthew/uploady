const SftpClient = require("ssh2-sftp-client");
const fs = require("fs");
const path = require("path");
const SftpServer = require("../models/SftpServer");
const mongoose = require("mongoose");
const { PassThrough } = require("stream");
const Busboy = require("busboy");
const crypto = require("crypto");
const net = require("net");
const archiver = require("archiver");
const SharedFile = require("../models/SharedFile");
const domain = process.env.HOSTNAME;
module.exports = () => {
  const handleError = (res, message, status = 500) => {
    console.error(message);
    res.status(status).json({ error: message });
  };

  const connectToSftp = async (serverId) => {
    const server = await SftpServer.findById(serverId);
    if (!server) throw new Error("Server not found");
    const sftp = new SftpClient();
    await sftp.connect({
      host: server.host,
      username: server.username,
      password: server.password,
    });
    return sftp;
  };

  const sftp_rename_file_json_post = async (req, res) => {
    const { currentPath, fileName, newFileName, serverId } = req.body;
    let sftp;
    try {
      sftp = await connectToSftp(serverId);
      const fpath = path.join(currentPath, fileName);
      const npath = path.join(currentPath, newFileName);
      res.status(200).send("File Renamed");
      await sftp.rename(fpath, npath);
    } catch (err) {
      return res.status(404).send("Error renaming file");
    } finally {
      if (sftp) await sftp.end();
    }
  };

  const sftp_create_folder_json_post = async (req, res) => {
    const { currentPath, folderName, serverId } = req.body;
    const newPath = path.join(currentPath, folderName);
    let sftp;
    try {
      sftp = await connectToSftp(serverId);
      await sftp.mkdir(newPath);
      res.status(200).send("Folder Created");
    } catch (err) {
      return res.status(404).send("Error creating folder");
    } finally {
      if (sftp) await sftp.end();
    }
  };

  const addFolderToArchive = async (
    sftp,
    archive,
    folderPath,
    zipFolderPath
  ) => {
    const folderContents = await sftp.list(folderPath);

    for (const item of folderContents) {
      const itemPath = `${folderPath}/${item.name}`;
      const zipPath = `${zipFolderPath}/${item.name}`;

      if (item.type === "-") {
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
    const token = crypto.randomBytes(5).toString("hex");
    console.log(serverId + remotePath);
    const fileName = remotePath.split("/").pop();
    filePath = remotePath ? remotePath : "/";
    const link = `${req.protocol}://${domain}/share/${token}/${fileName}`;
    const sharedFile = new SharedFile({
      fileName,
      filePath,
      link,
      token,
      isRemote: true,
      serverId,
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
    const { host, username, password } = req.body;
    const newServer = new SftpServer({
      host,
      username,
      password,
    });
    try {
      await newServer.save();
      res.status(200).send();
    } catch (error) {
      handleError(res, "Cannot save Server", 400);
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
    return date.toLocaleString(); // Format to readable date and time
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
      const { host, username, password } = server;
      sftp = new SftpClient();
      await sftp.connect({
        host,
        username,
        password,
      });
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
      const fullPath = path.join(currentDirectory, fileName);
      try {
        const sftp = await connectToSftp(serverId);
        await sftp.delete(fullPath);
        return res.status(200).send("File Deleted");
      } catch (error) {
        return res.status(400).send("Error deleting file");
      }
    }
    return res.status(404).send("server not found");
  };

  const sftp_delete_folder_json_post = async (req, res, next) => {
    const { serverId, currentDirectory, deleteDir } = req.body;
    const fullPath = path.join(currentDirectory, deleteDir);
    try {
      const sftp = await connectToSftp(serverId);
      await sftp.rmdir(fullPath);
      res.status(200).send();
    } catch (error) {
      res.status(400).send();
    }
  };

  const progressClients = new Map(); // Map<transferId, res>


  const progress = require("progress-stream");

const streamFromSftpToSftp = async (sourceId, sourcePath, destId, destPath, onProgress, transferId) => {
  const source = await connectToSftp(sourceId);
  const dest = await connectToSftp(destId);

  const passthrough = new PassThrough();

  try {
    const { size: fileSize } = await source.stat(sourcePath);

    const prog = progress({
      length: fileSize,
      time: 100, // Emit progress every 100ms
    });

    prog.on("progress", (p) => {
      if (onProgress) onProgress(p); // Optional callback
      const client = progressClients.get(transferId);
      if (client) {
        client.write(`data: ${JSON.stringify({ percent: p.percentage })}\n\n`);
      }
      else console.log(`Progress: ${Math.round(p.percentage)}%`);
    });

    const download = source.get(sourcePath, passthrough);
    const upload = dest.put(passthrough.pipe(prog), destPath);

    await Promise.all([download, upload]);
    const client = progressClients.get(transferId);
    if (client) {
      client.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      client.end();
      progressClients.delete(transferId);
    }

    console.log("Transfer complete");
  } catch (err) {
    console.error("Error during SFTP stream:", err);
    throw err;
  } finally {
    await source.end();
    await dest.end();
  }
};

  async function streamBetweenSFTPs(sourceSftp, targetSftp, sourcePath, targetPath) {
    const pass = new PassThrough();
  
    // Start piping from source to pass-through
    const download = sourceSftp.get(sourcePath, pass); // this starts streaming into `pass`
  
    // Start uploading from pass-through to target
    const upload = targetSftp.put(pass, targetPath); // this starts consuming from `pass`
  
    await Promise.all([download, upload]);
  }

  const sftp_copy_file_json_post = async (req, res, next) => {
    const { filename, currentPath, newPath, serverId, newServerId, transferId } = req.body;

    const cfpath = path.join(currentPath, filename);
    const nfpath = path.join(newPath, filename);
    let sftp;
    let sourceSftp, targetSftp;
    
    if (!newServerId) {
      try {
        sftp = await connectToSftp(serverId);
        await sftp.rcopy(cfpath, nfpath);
        return res.status(200).send();
      } catch(err) {
        return res.status(400).send("Error copying file");
      }
    } else {
      try {
        await streamFromSftpToSftp(serverId, cfpath, newServerId, nfpath, (p) => console.log(`${Math.round(p.percentage)}% - ${p.transferred} / ${p.length} bytes`), transferId)
        //sourceSftp = await connectToSftp(serverId);
        //targetSftp = await connectToSftp(newServerId);

        //await streamBetweenSFTPs(sourceSftp, targetSftp, cfpath, nfpath);
        //const stream = new PassThrough();
        //await sourceSftp.get(cfpath, stream);
        //await targetSftp.put(stream, nfpath);
        //const readStream = await sourceSftp.get(cfpath);
        //await targetSftp.put(readStream, nfpath);
        res.status(202).send("File streamed successfully");
      } catch(err) {
        res.status(500).send("Streaming failed");
      }
    }
  }

  return {
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
    sftp_copy_file_json_post
  };
};
