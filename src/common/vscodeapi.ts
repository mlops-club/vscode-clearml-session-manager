// eric: most of these function appear to be thin wrappers
// around vscode.* functions. I'm not sure why they are needed.

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    commands,
    ConfigurationScope,
    Disposable,
    DocumentFormattingEditProvider,
    languages,
    LanguageStatusItem,
    LogOutputChannel,
    Uri,
    window,
    workspace,
    WorkspaceConfiguration,
    WorkspaceFolder,
} from 'vscode';

export function createOutputChannel(name: string): LogOutputChannel {
    return window.createOutputChannel(name, { log: true });
}

export function getConfiguration(config: string, scope?: ConfigurationScope): WorkspaceConfiguration {
    return workspace.getConfiguration(config, scope);
}

export function registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable {
    return commands.registerCommand(command, callback, thisArg);
}

export const { onDidChangeConfiguration } = workspace;

export function isVirtualWorkspace(): boolean {
    const isVirtual = workspace.workspaceFolders && workspace.workspaceFolders.every((f) => f.uri.scheme !== 'file');
    return !!isVirtual;
}

export function getWorkspaceFolders(): readonly WorkspaceFolder[] {
    return workspace.workspaceFolders ?? [];
}

export function getWorkspaceFolder(uri: Uri): WorkspaceFolder | undefined {
    return workspace.getWorkspaceFolder(uri);
}

