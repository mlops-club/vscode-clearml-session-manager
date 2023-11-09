export interface ClearMLConfig {
    api: ApiConfig;
}

interface ApiConfig {
    web_server: string;
    api_server: string;
    files_server: string;
    credentials: {
        access_key: string;
        secret_key: string;
    };
}

