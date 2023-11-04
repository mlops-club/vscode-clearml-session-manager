import { ClearMLApiClient } from "./api-client";
import { Task } from "./models/tasks";

export const fetchInteractiveSessions = async (): Promise<Task[]> => {
    const clearmlClient = ClearMLApiClient.fromConfigFile("/Users/ericriddoch/clearml.conf");
    await clearmlClient.auth();
    const devopsProjectId = await clearmlClient.getProjectIdByName("DevOps")
    const interactiveSessions = await clearmlClient.getTasks({projectIds: [devopsProjectId], name: "Interactive Session"});
    return interactiveSessions;
}