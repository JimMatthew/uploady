import SftpClient from "ssh2-sftp-client";
import { getServerOptions } from "./serverService";

/**
 * Connects to an SFTP server and returns the client instance.
 *
 * Caller is responsible for calling sftp.end() when done.
 */
export async function connectToSftp(serverId: string): Promise<SftpClient> {
  const sftp = new SftpClient();

  const options = await getServerOptions(serverId);

  await sftp.connect(options);

  return sftp;
}
