import axios, { AxiosResponse } from 'axios';
import { ClearMLConfig, readClearMLAuthSettingsFromConfigFile } from './clearml-conf';
import { Task, Project } from './models/tasks';

// Interface for the response structure from the authentication endpoint.
interface AuthResponse {
    data: {
        token: string;
    };
}

export class ClearMLApiClient {
    private config: ClearMLConfig;
    private token: string | null = null;

    /**
     * Class constructor that initializes with a configuration.
     * @param config - ClearML configuration details.
     */
    constructor(config: ClearMLConfig) {
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

    private getHeaders(): any {
        return {
            "Authorization": `Bearer ${this.token}`
        }
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
        })
        const projects: Project[] = (await response.json()).data.projects as Project[];

        return projects[0].id;
    }

    async getTasks({ projectIds, name, statuses }: { projectIds?: string[], name?: string, statuses?: string[] }): Promise<Task[]> {
        if (!this.token) {
            throw new Error("Token is not set. Call the auth() method first.");
        }

        const payload: any = {}
        if (projectIds) { payload["project"] = projectIds }
        if (name) { payload["name"] = name }
        if (statuses) { payload["status"] = statuses }

        // with fetch
        const response = await fetch(this.config.api_server + "/tasks.get_all_ex", {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ ...payload })
        })
        const tasks: Task[] = (await response.json()).data.tasks as Task[];

        return tasks;
    }
}
