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

export async function connectToRemoteSSH(username: string, host: string, port: number) {
    const sshName = `${username}@${host}:${port}`;
    try {
        // show progress saying "Connecting to <sshName>..."
        let prog = vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Connecting to ${sshName}...`,
            cancellable: false
        }, async () => {
            await vscode.commands.executeCommand("vscode.newWindow", {
                remoteAuthority: `ssh-remote+${sshName}`,
            });
            vscode.window.showInformationMessage(`Successfully connected to ${sshName}`);
            
            // sleep for 3 seconds, for effect
            await new Promise(resolve => setTimeout(resolve, 3000));
        });


        
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to connect to ${sshName}: ${error}`);
    }
}

export async function copyPasswordToClipboard(password: string) {
    try {
        await vscode.env.clipboard.writeText(password);
        vscode.window.showInformationMessage('Password has been copied to the clipboard!');
    } catch (error) {
        vscode.window.showErrorMessage('Failed to copy password to the clipboard.');
    }
}
