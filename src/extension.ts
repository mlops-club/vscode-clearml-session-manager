
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ISettings, getExtensionSettings, getInterpreterFromSetting, getWorkspaceSettings } from './common/settings';
import { registerLogger, traceLog } from './common/logging';
import { createOutputChannel } from './common/vscodeapi';
import * as consts from "./common/constants";
import { initializePython } from './common/python';
import { ensureClearMlSessionCliIsAvailable } from './common/clearml/install-cli';
import { ClearMlSessionsTreeDataProvider, ClearmlSession } from './common/ui/clearml-tree-view';
import { connectToRemoteSSH } from './common/remote-ssh-connect';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

export async function activate(context: vscode.ExtensionContext) {

	// Setup logging
	const outputChannel = createOutputChannel(consts.EXTENSION_NAME);
	context.subscriptions.push(outputChannel, registerLogger(outputChannel));
	
	const settings: ISettings[] = await getExtensionSettings(consts.SETTINGS_NAMESPACE);
			
	const clearmlSessionsTreeProvider = new ClearMlSessionsTreeDataProvider();
	vscode.window.registerTreeDataProvider('clearmlSessions', clearmlSessionsTreeProvider);
	vscode.commands.registerCommand('clearmlSessions.refreshEntry', () =>
		clearmlSessionsTreeProvider.refresh()
	);

	vscode.commands.registerCommand('clearmlSessions.openInBrowser', (session: ClearmlSession) => {
		console.log('openInBrowser, session: ', session);
		const clearmlTaskUrlinUi = `https://app.clear.ml/projects/${session.sessionTask.project.id}/experiments/${session.sessionTask.id}/execution?columns=selected&columns=type&columns=name&columns=tags&columns=status&columns=project.name&columns=users&columns=started&columns=last_update&columns=last_iteration&columns=parent.name&order=-last_update&filter=`
		vscode.env.openExternal(vscode.Uri.parse(clearmlTaskUrlinUi));
	})

	vscode.commands.registerCommand('clearmlSessions.attachToSession', async (session: ClearmlSession) => {
		// await initializePython(context.subscriptions);
		// startDetachedSubprocess(
		// 	interpreterFpath, ["-m", "clearml_session", "--attach", session.taskId], 
		// )
		await connectToRemoteSSH();
	})

	vscode.commands.registerCommand('clearmlSessions.copyValueToClipboard', async (treeItem: vscode.TreeItem) => {
		if (treeItem.description) {
			await vscode.env.clipboard.writeText(treeItem.description as string);
			vscode.window.showInformationMessage(`${treeItem.label} was copied to your clipboard`);
		}
	});

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('clearml-session-manager.installPythonDependencies', async () => {
		// The code you place here will be executed every time your command is executed
		await ensureClearMlSessionCliIsAvailable();
		vscode.window.showInformationMessage(`[${consts.EXTENSION_NAME}] Python dependencies installed successfully!`);
	});

	context.subscriptions.push(disposable);
	
	await loadPythonExtension(context);
	await clearmlSessionsTreeProvider.refresh()

	console.log('Congratulations, your extension "clearml-session-manager" is now active!');
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
};