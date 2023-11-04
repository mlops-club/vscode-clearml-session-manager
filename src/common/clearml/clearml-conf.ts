import fs from 'fs';

export interface ClearMLConfig {
    api_server: string | null;
    access_key: string | null;
    secret_key: string | null;
}

/**
 * Read the content of a file, parse it as HOCON, and extract the specified values.
 * @param filePath - The path to the HOCON file.
 * @returns An object containing the extracted values.
 */
export function readClearMLAuthSettingsFromConfigFile(filePath: string): ClearMLConfig {
    const content = fs.readFileSync(filePath, 'utf-8');
    return extractClearMLConfigFromHOCON(content);
}


/**
 * Extract values from a HOCON string.
 * @param content - The HOCON content.
 * @returns An object containing the extracted values.
 */
function extractClearMLConfigFromHOCON(content: string): ClearMLConfig {
    const apiServerMatch = content.match(/api_server:\s*(https:\/\/[^\s]+)/);
    const accessKeyMatch = content.match(/"access_key":\s*"([^"]+)"/);
    const secretKeyMatch = content.match(/"secret_key":\s*"([^"]+)"/);

    return {
        api_server: apiServerMatch ? apiServerMatch[1] : null,
        access_key: accessKeyMatch ? accessKeyMatch[1] : null,
        secret_key: secretKeyMatch ? secretKeyMatch[1] : null
    };
}

