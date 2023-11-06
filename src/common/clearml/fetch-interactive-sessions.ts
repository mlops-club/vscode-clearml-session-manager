import { ClearMLApiClient } from "./api-client";
import { Task } from "./models/tasks";
import * as os from 'os';

const getPathToClearmlConfigFile = (): string => {
    const homeDir = os.homedir();
    return `${homeDir}/clearml.conf`;
}

export const fetchInteractiveSessions = async (): Promise<Task[]> => {
    const clearmlConfigFpath: string = getPathToClearmlConfigFile();
    const clearmlClient = ClearMLApiClient.fromConfigFile(clearmlConfigFpath);
    await clearmlClient.auth();
    const interactiveSessions = await listInteractiveSessions(clearmlClient);
    return interactiveSessions;
}

const listInteractiveSessions = async (clearmlClient: ClearMLApiClient): Promise<Task[]> => {
    const devopsProjectId = await clearmlClient.getProjectIdByName("DevOps")
    const interactiveSessions = await clearmlClient.getTasks({projectIds: [devopsProjectId], name: "Interactive Session"});
    return interactiveSessions;
}