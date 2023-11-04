
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ISettings, getExtensionSettings, getInterpreterFromSetting } from './common/settings';
import { registerLogger, traceLog } from './common/logging';
import { createOutputChannel } from './common/vscodeapi';
import * as consts from "./common/constants"
import { initializePython } from './common/python';
import { ensureClearMlSessionCliIsAvailable } from './common/clearml/install-cli';
import { NodeDependenciesProvider } from './common/ui/tree-view';
import { ClearMlSessionsTreeDataProvider } from './common/ui/clearml-tree-view';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
Fake data next step:
-- Go through each input from the api call (or this fake data) and create tree nodes

 {
	SessionId : 'abcdef',
	CPU: 8,
	GPU: 1,
	RAM: '4 GB',
	Queue: 'on-prem'
 }
 */

export async function activate(context: vscode.ExtensionContext) {

	const rootPath =
		vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;
			
	console.log(`rootPath: ${rootPath}`);
	const nodeDependenciesProvider = new NodeDependenciesProvider(rootPath);
	vscode.window.registerTreeDataProvider('nodeDependencies', nodeDependenciesProvider);
	vscode.commands.registerCommand('nodeDependencies.refreshEntry', () =>
		nodeDependenciesProvider.refresh()
	);
	
	const clearmlSessionsTreeProvider = new ClearMlSessionsTreeDataProvider(rootPath);
	vscode.window.registerTreeDataProvider('clearmlSessions', clearmlSessionsTreeProvider);
	vscode.commands.registerCommand('clearmlSessions.refreshEntry', () =>
		clearmlSessionsTreeProvider.refresh()
	);
	

	const settings: ISettings[] = await getExtensionSettings(consts.SETTINGS_NAMESPACE);

	// Setup logging
	const outputChannel = createOutputChannel(consts.EXTENSION_NAME);
	context.subscriptions.push(outputChannel, registerLogger(outputChannel));

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "clearml-session-manager" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('clearml-session-manager.installPythonDependencies', async () => {
		// The code you place here will be executed every time your command is executed
		await ensureClearMlSessionCliIsAvailable();
		vscode.window.showInformationMessage(`[${consts.EXTENSION_NAME}] Python dependencies installed successfully!`);
	})

	context.subscriptions.push(disposable);

	await loadPythonExtension(context)
}

// This method is called when your extension is deactivated
export function deactivate() { }


/**
 * Ensure the Python extension is installed.
 * 
 * It is required for this extension to run, because this extension uses the Python extension's API
 * to find the active Python interpreter.
 * 
 * @param context
 */
const loadPythonExtension = async (context: vscode.ExtensionContext) => {
	const interpreter = getInterpreterFromSetting(consts.SETTINGS_NAMESPACE);
	const interpreterNotSet = interpreter === undefined || interpreter.length === 0;
	if (interpreterNotSet) {
		traceLog(`Python extension loading`);
		await initializePython(context.subscriptions);
		traceLog(`Python extension loaded`);
	}
}