import { ClearMLApiClient } from './api-client';
import { LogEvent, TaskLogResponse } from './models/task-logs';

/**
 * Interface for SSH connection details extracted from logs.
 */
export interface SshDetails {
  /**
   * IP address of the SSH server.
   */
  ipAddress: string;

  /**
   * Port number of the SSH server.
   */
  port: string;

  /**
   * Username for the SSH connection.
   */
  username: string;

  /**
   * Password for the SSH connection.
   */
  password: string;
}

// Assuming the ClearMLApiClient and related interfaces, SshDetails, and parseSshDetailsFromLogs function are defined as previously discussed

/**
 * Fetches and parses SSH details from task logs in ClearML.
 *
 * @param clientId Optional. An instance of ClearMLApiClient.
 * @param taskId The ID of the task to fetch logs for. This should be a task corresponding to a ClearML Session.
 * @returns Parsed SSH details or null if not found.
 */
export async function querySshDetailsForSession(
  clearmlClient: ClearMLApiClient,
  taskId: string
): Promise<SshDetails | null> {
  if (!clearmlClient.isAuthed()) {
    await clearmlClient.auth();
  }

  const logsResponse: TaskLogResponse = await clearmlClient.getTaskLogs({ task: taskId, batch_size: 10000 });
  const concatenatedLogs = logsResponse.data.events.map((log: LogEvent) => log.msg).join(' ');

  // Parse the SSH details from the logs
  return parseSshDetailsFromLogs(concatenatedLogs);
}

/**
 * Parses the IP Address, Port, Username, and Password from the task logs.
 * @param logs - The array of log messages.
 * @returns The parsed SSH details or null if not found.
 */
export async function parseSshDetailsFromLogs(logs: string): Promise<SshDetails | null> {
  const pattern = /SSH Server running on .+?\[(\d+\.\d+\.\d+\.\d+)\]\s*port\s*(\d+).*?LOGIN u:(\w+) p:(\w+)/s;
  const match = logs.match(pattern);

  if (match) {
    const [, ipAddress, port, username, password] = match;
    return { ipAddress, port, username, password };
  } else {
    return null;
  }
}
