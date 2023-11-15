import { ClearMLAuthConfig, readClearMLAuthSettingsFromConfigFile } from './clearml-conf';
import { Task, Project } from './models/tasks';
import { TaskLogRequestParams, TaskLogResponse } from './models/task-logs';

interface AuthResponse {
    data: {
        token: string;
    };
}

export class ClearMLApiClient {
    private config: ClearMLAuthConfig;
    private token: string | null = null;

    constructor(config: ClearMLAuthConfig) {
        this.config = config;
    }

    static async fromConfigFile(clearmlConfFpath: string): Promise<ClearMLApiClient> {
        const config: ClearMLAuthConfig = await readClearMLAuthSettingsFromConfigFile(clearmlConfFpath);
        return new ClearMLApiClient(config);
    }

    public isAuthed(): boolean {
        return this.token !== null;
    }

    private getHeaders(): { "Authorization": string } {
        return {
            "Authorization": `Bearer ${this.token}`
        };
    }

    async auth(): Promise<void> {
        const authString = `${this.config.access_key}:${this.config.secret_key}`;
        const encodedAuth = Buffer.from(authString).toString('base64');
    
        const response = await fetch(this.config.api_server + "/auth.login", {
            method: 'GET',
            headers: {
                "Authorization": `Basic ${encodedAuth}`
            }
        });
    
        if (!response.ok) {
            throw new Error("Failed to authenticate with ClearML.");
        }
    
        const responseData = await response.json() as AuthResponse;
    
        this.token = responseData.data.token;
    }

    async getProjectIdByName(name: string): Promise<string> {
        if (!this.token) {
            throw new Error("Token is not set. Call the auth() method first.");
        }

        const url = this.config.api_server + "/projects.get_all";
        const response = await fetch(url, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ name })
        });

        if (!response.ok) {
            throw new Error(`Failed to retrieve project ID for project name: ${name}.`);
        }

        const responseJson = await response.json() as any;
        const projects: Project[] = responseJson.data.projects as Project[];

        return projects[0].id;
    }

    async getTasks({ projectIds, name, statuses }: { projectIds?: string[], name?: string, statuses?: string[] }): Promise<Task[]> {
        if (!this.token) {
            throw new Error("Token is not set. Call the auth() method first.");
        }

        const payload: any = {};
        if (projectIds) { payload["project"] = projectIds; }
        if (name) { payload["name"] = name; }
        if (statuses) { payload["status"] = statuses; }

        const response = await fetch(this.config.api_server + "/tasks.get_all_ex", {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ ...payload })
        });

        if (!response.ok) {
            throw new Error("Failed to retrieve tasks.");
        }

        const responseJson = await response.json() as any;
        return responseJson.data.tasks as Task[];
    }

    async getTaskLogs(params: TaskLogRequestParams): Promise<TaskLogResponse> {
        if (!this.token) {
            throw new Error("Token is not set. Call the auth() method first.");
        }

        const response = await fetch(this.config.api_server + "/events.get_task_log", {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            throw new Error("Failed to retrieve task logs.");
        }

        return response.json() as Promise<TaskLogResponse>;
    }
}
