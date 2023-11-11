
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ClearmlExtensionSettings, getExtensionSettings, getInterpreterFromSetting } from './common/settings';
import { registerLogger, traceLog } from './common/logging';
import { createOutputChannel } from './common/vscodeapi';
import * as consts from "./common/constants";
import { initializePython } from './common/python';
import { ensureClearMlSessionCliIsAvailable } from './common/clearml/install-cli';
import { ClearMlSessionsTreeDataProvider, ClearmlSession } from './common/ui/clearml-tree-view';
import { connectToRemoteSSH } from './common/remote-ssh-connect';
import { functionReadClearmlConfigFile } from './common/clearml/clearml-conf';
import { getPathToClearmlConfigFile } from './common/clearml/fetch-interactive-sessions';


export async function activate(context: vscode.ExtensionContext) {

	/**
	 * Set up the logger.
	 * 
	 * traceInfo(), traceError(), traceWarn(), and traceDebug() will
	 * show up in a special "output channel" in the VS Code "Panel".
	 * 
	 * To view these logs in a VS Code window where this extension is activated,
	 * 
	 * 1. Open the panel with `Ctrl + ~`
	 * 2. Click on the "Output" tab
	 * 3. Select "ClearML Session Manager" output channel from the dropdown
	 */
	const outputChannel = createOutputChannel(consts.EXTENSION_NAME);
	context.subscriptions.push(outputChannel, registerLogger(outputChannel));
	
	/**
	 * Read the extension settings.
	 * 
	 * Settings are registered in the package.json file under the `contributes.configuration` section.
	 * 
	 * The user of the extension can define settings in their .vscode/settings.json or global settings.
	 */
	await loadPythonExtension(context);
	const clearmlExtensionSettings: ClearmlExtensionSettings = await getExtensionSettings();
	console.log(clearmlExtensionSettings)

	// print settings whenever they change
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e) => {
        console.log("New Settings:", await getExtensionSettings())
    }));
	
	/**
	 * Register the ClearML Session tree view.
	 * 
	 * VS Code Terminology:
	 * - a "View Container" is a sidebar item in VS Code, e.g. "Explorer", "Search", "Source Control", etc.
	 *   This extension contributes a View Container with the ClearML logo.
	 * - a "View" is a collapsible dropdown menu within a View Container. For the file explorer view, these
	 *   would be "Open Editors", "Outline", etc. This extension contributes a "Tree View" to the ClearML View Container.
	 * 
	 * This tree view allows the user to browse ClearML Sessions. The UI elements, e.g. the icons are
	 * defined in the package.json file.
	 */
	const clearmlSessionsTreeProvider = new ClearMlSessionsTreeDataProvider();
	vscode.window.registerTreeDataProvider('clearmlSessions', clearmlSessionsTreeProvider);

	/**
	 * Register the commands that are used by this extension.
	 * 
	 * Any of the buttons that you see in the tree view, trigger commands.
	 * Other commands can be invoked via the command palette, e.g. `Ctrl + Shift + P`.
	 * 
	 * These commands are defined in the package.json file.
	 */
	vscode.commands.registerCommand('clearmlSessions.refreshEntry', async () => {
		await loadPythonExtension(context);
		clearmlSessionsTreeProvider.refresh()
	});

	vscode.commands.registerCommand('clearmlSessions.openInBrowser', async (session: ClearmlSession) => {
		const clearmlConfFpath: string = getPathToClearmlConfigFile()
		const clearmlConfig = await functionReadClearmlConfigFile(clearmlConfFpath)
		const clearmlTaskUrlinUi = `${clearmlConfig.api.web_server}/projects/${session.sessionTask.project.id}/experiments/${session.sessionTask.id}/execution?columns=selected&columns=type&columns=name&columns=tags&columns=status&columns=project.name&columns=users&columns=started&columns=last_update&columns=last_iteration&columns=parent.name&order=-last_update&filter=`
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

	let disposable = vscode.commands.registerCommand('clearml-session-manager.installPythonDependencies', async () => {
		// The code you place here will be executed every time your command is executed
		await ensureClearMlSessionCliIsAvailable();
		vscode.window.showInformationMessage(`[${consts.EXTENSION_NAME}] Python dependencies installed successfully!`);
	});

	context.subscriptions.push(disposable);

	// Perform initial load of clearml sessions to display in the sidebar
	await clearmlSessionsTreeProvider.refresh()

	// notify the user that the extension activated successfully
	vscode.window.showInformationMessage(`[${consts.EXTENSION_NAME}] extension loaded!`);
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