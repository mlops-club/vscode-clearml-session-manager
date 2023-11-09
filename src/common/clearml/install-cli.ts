import { checkAndPromptToInstallPythonPackages } from "../ui/install-python-libs-modal";
import { getPathToActivePythonInterpreter, promptIfPythonInterpreterIsNotConfigured } from "../python";


export const ensureClearMlSessionCliIsAvailable = async () => {
    const pythonInterpreterIsConfigured: boolean = await promptIfPythonInterpreterIsNotConfigured();
    if (!pythonInterpreterIsConfigured) {
        return;
    }

    // check to see if clearml-session is installed with pip, by running pip 
    const interpreterFpath = await getPathToActivePythonInterpreter() as string;
    await checkAndPromptToInstallPythonPackages(interpreterFpath, ["clearml", "clearml-session", "pyhocon"])
};
