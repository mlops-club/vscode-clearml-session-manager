import * as vscode from 'vscode';

// export async function connectToRemoteSSH() {
//     // The command ID and the arguments you want to pass
//     const command = 'opensshremotes.openEmptyWindow';
//     const host = 'root@localhost:8898';

//     try {
//         await vscode.commands.executeCommand(command, host);
//         vscode.window.showInformationMessage('Successfully connected to Remote SSH!');
//     } catch (error) {
//         vscode.window.showErrorMessage(`Failed to connect to Remote SSH: ${error}`);
//     }
// }

export async function connectToRemoteSSH() {
    const sshName = "root@localhost:8022";
    try {
        await vscode.commands.executeCommand("vscode.newWindow", {
            remoteAuthority: `ssh-remote+${sshName}`
        });
        copyPasswordToClipboard();
        vscode.window.showInformationMessage(`Successfully connected to ${sshName}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to connect to ${sshName}: ${error.message}`);
    }
}

async function copyPasswordToClipboard() {
    const password = "pass";

    try {
        await vscode.env.clipboard.writeText(password);
        vscode.window.showInformationMessage('Password has been copied to the clipboard!');
    } catch (error) {
        vscode.window.showErrorMessage('Failed to copy password to the clipboard.');
    }
}
