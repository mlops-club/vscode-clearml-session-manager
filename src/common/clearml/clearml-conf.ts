import { getPathToActivePythonInterpreter } from '../python';
import { parseHoconFileWithPyhocon } from './hocon-parser';
import { ClearMLConfig } from './models/clearml-config';

export interface ClearMLAuthConfig {
    api_server: string;
    access_key: string;
    secret_key: string;
}

export const functionReadClearmlConfigFile = async (clearmlConfFpath: string): Promise<ClearMLConfig> => {
    const pythonInterpreterFpath: string = (await getPathToActivePythonInterpreter() as string)
    const clearmlConfig = await parseHoconFileWithPyhocon(pythonInterpreterFpath, clearmlConfFpath);
    return clearmlConfig;
}

/**
 * Read the content of a file, parse it as HOCON, and extract the specified values.
 * 
 * @param filePath - The path to the HOCON file.
 * @returns An object containing the extracted values.
 */
export async function readClearMLAuthSettingsFromConfigFile(clearmlConfFpath: string): Promise<ClearMLAuthConfig> {
    const clearmlConfig: any = await functionReadClearmlConfigFile(clearmlConfFpath)
    return {
        api_server: clearmlConfig.api.api_server,
        access_key: clearmlConfig.api.credentials.access_key,
        secret_key: clearmlConfig.api.credentials.secret_key
    }
}
