import axios, { AxiosResponse } from 'axios';
import { ClearMLAuthConfig, readClearMLAuthSettingsFromConfigFile } from './clearml-conf';
import { Task, Project } from './models/tasks';
import { TaskLogRequestParams, TaskLogResponse } from './models/task-logs';
import { ClearMLConfig } from './models/clearml-config';

// Interface for the response structure from the authentication endpoint.
interface AuthResponse {
    data: {
        token: string;
    };
}

export class ClearMLApiClient {
    private config: ClearMLAuthConfig;
    private token: string | null = null;

    /**
     * Class constructor that initializes with a configuration.
     * @param config - ClearML configuration details.
     */
    constructor(config: ClearMLAuthConfig) {
        this.config = config;
    }

    /**
     * Static factory method to create an instance of ClearML class using a configuration file.
     * @param clearmlConfFpath - Path to the ClearML configuration file.
     * @returns A new instance of ClearML class.
     */
    static async fromConfigFile(clearmlConfFpath: string): Promise<ClearMLApiClient> {
        const config = await readClearMLAuthSettingsFromConfigFile(clearmlConfFpath);
        return new ClearMLApiClient(config);
    }

    public isAuthed(): boolean {
        return this.token !== null;
    }

    private getHeaders(): any {
        return {
            "Authorization": `Bearer ${this.token}`
        };
    }

    /**
     * Authenticate with the ClearML server and store the authentication token internally.
     */
    async auth(): Promise<void> {
        const loginResponse: AxiosResponse<AuthResponse> = await axios.get(this.config.api_server + "/auth.login", {
            auth: {
                username: this.config.access_key,
                password: this.config.secret_key
            }
        });

        if (!loginResponse.data || !loginResponse.data.data || !loginResponse.data.data.token) {
            throw new Error("Failed to retrieve token from ClearML.");
        }

        this.token = loginResponse.data.data.token;
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
            throw new Error(`Failed to retrieve project ID for project name: ${name}. Response: ${await response.json()}`);
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

        // with fetch
        const response = await fetch(this.config.api_server + "/tasks.get_all_ex", {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ ...payload })
        });

        if (!response.ok) {
            throw new Error(`Failed to retrieve tasks. Response: ${await response.json()}`);
        }

        const responseJson: any = await response.json();
        const tasks: Task[] = responseJson.data.tasks as Task[];

        // write tasks to disk as a json file, use 2-space indenting
        const tasksJson = JSON.stringify(tasks, null, 2);

        
        // const tasksJsonFpath = "/Users/ericriddoch/repos/extra/hello-world-vscode-ext/clearml-session-manager/tasks.json";
        // const fs = require('fs').promises;
        // await fs.writeFile(tasksJsonFpath, tasksJson);


        return tasks;
    }

    async getTaskLogs(params: TaskLogRequestParams): Promise<TaskLogResponse> {
        if (!this.token) {
            throw new Error("Token is not set. Call the auth() method first.");
        }

        const taskLogResponse: AxiosResponse<TaskLogResponse> = await axios.post(
            this.config.api_server + "/events.get_task_log", 
            params,
            {
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            }
        );

        return taskLogResponse.data;
    }
}
