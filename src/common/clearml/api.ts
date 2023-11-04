import axios, { AxiosResponse } from 'axios';
import fs from 'fs';
import { ClearMLConfig, readClearMLAuthSettingsFromConfigFile } from './clearml-conf';

// Interface for the response structure from the authentication endpoint.
interface AuthResponse {
    data: {
        token: string;
    };
}

// Interface for the response structure from the projects endpoint. 
// This can be expanded upon if you have more specific details about the response.
interface ProjectsResponse {
    [key: string]: any;
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
    static fromConfigFile(clearmlConfFpath: string): ClearMLApiClient {
        const config = readClearMLAuthSettingsFromConfigFile(clearmlConfFpath);
        return new ClearMLApiClient(config);
    }

    /**
     * Authenticate with the ClearML server and store the authentication token internally.
     */
    async auth(): Promise<void> {
        if (!this.config.api_server || !this.config.access_key || !this.config.secret_key) {
            throw new Error('Configuration is not complete.');
        }

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

    /**
     * Fetch projects data using the stored authentication token.
     * @returns The projects data.
     */
    async getTasks(): Promise<ProjectsResponse> {
        if (!this.token) {
            throw new Error("Token is not set. Call the auth() method first.");
        }

        const projectsResponse: AxiosResponse<ProjectsResponse> = await axios.get(this.config.api_server + "/tasks.get_all_ex", {
            headers: {
                "Authorization": `Bearer ${this.token}`
            }
        });

        return projectsResponse.data;
    }
    
}
