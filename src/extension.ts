// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { getProjectRoot } from './common/utilities';
import { ISettings, getExtensionSettings, getInterpreterFromSetting, getWorkspaceSettings } from './common/settings';
import { updateStatus } from './common/status';
import { registerLogger, traceError, traceInfo, traceLog } from './common/logging';
import { createOutputChannel } from './common/vscodeapi';
import * as consts from "./common/constants"
import { initializePython, installPythonPackagesInEnv, isPythonPackageInstalledInEnv } from './common/python';
import { checkAndPromptToInstallPythonPackages } from './common/ui/install-python-libs-modal';

const SETTINGS_NAMESPACE = ""

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {


	const settings: ISettings[] = await getExtensionSettings(SETTINGS_NAMESPACE);

    // Setup logging
    const outputChannel = createOutputChannel(consts.EXTENSION_NAME);
    context.subscriptions.push(outputChannel, registerLogger(outputChannel));

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "clearml-session-manager" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('clearml-session-manager.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from ClearML Session Manager!');
	});

	const runServer = async () => {
        const projectRoot = await getProjectRoot();
        const workspaceSettings = await getWorkspaceSettings(SETTINGS_NAMESPACE, projectRoot, true);
		const interpreterNotSet = workspaceSettings.interpreter.length === 0;
        
		if (interpreterNotSet) {
            updateStatus(vscode.l10n.t('Please select a Python interpreter.'), vscode.LanguageStatusSeverity.Error);
            traceError(
                'Python interpreter missing:\r\n' +
                    '[Option 1] Select python interpreter using the ms-python.python.\r\n' +
                    `[Option 2] Set an interpreter using "${SETTINGS_NAMESPACE}.interpreter" setting.\r\n`,
                'Please use Python 3.8 or greater.',
            );
			return;
        } 
        
		// check to see if clearml-session is installed with pip, by running pip 
		const interpreterFpath = workspaceSettings.interpreter[0];
		const clearMLisInstalled: boolean = await isPythonPackageInstalledInEnv(interpreterFpath, "clearml")
		traceInfo(`ClearML is installed: ${clearMLisInstalled}`)
		
		await checkAndPromptToInstallPythonPackages(interpreterFpath, ["clearml", "clearml-session"])
    };

	vscode.commands.registerCommand('clearml-session-manager.startSession', async () => {
		console.log("This is going to be big")
		const projectRoot: vscode.WorkspaceFolder = await getProjectRoot();
		await runServer();
	})

	context.subscriptions.push(disposable);

	await loadPythonExtension(context)
}

// This method is called when your extension is deactivated
export function deactivate() {}

// Helper functions

const loadPythonExtension = async (context: vscode.ExtensionContext) => {
	const interpreter = getInterpreterFromSetting(SETTINGS_NAMESPACE);
	const interpreterNotSet = interpreter === undefined || interpreter.length === 0;
	if (interpreterNotSet) {
		traceLog(`Python extension loading`);
		await initializePython(context.subscriptions);
		traceLog(`Python extension loaded`);
	}
}