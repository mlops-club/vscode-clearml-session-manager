/**
 * Define the settings for this extension and how they are read.
 *
 * Settings might come from
 * - the user's **global settings**, e.g. from `~/Library/Application Support/Code/User/settings.json`
 * - the **workspace settings**, e.g. from a `.code-workspace` file,
 * - workspace folder settings, e.g. from `.vscode/settings.json`
 *
 * The settings used by this extension are defined in the `package.json` file under the
 * `contributes.configuration` section.
 */

import { ConfigurationChangeEvent, ConfigurationScope, WorkspaceConfiguration, WorkspaceFolder } from 'vscode';
import { getInterpreterDetails } from './python';
import { getConfiguration, getWorkspaceFolders } from './vscodeapi';
import { traceLog } from './logging';
import * as consts from './constants';

export interface ClearmlExtensionSettings {
  clearmlConfigFilePath: string;
  interpreter: string[];
}

/**
 * Retrieves the extension settings, merging global settings with workspace-specific overrides.
 *
 * This function fetches the global settings for the extension and then, if a workspace is provided,
 * fetches the workspace-specific settings. It performs a deep merge of these settings, ensuring that
 * workspace settings override global settings at every level.
 *
 * @param {string} namespace - The namespace of the extension.
 * @param {WorkspaceFolder} [workspace] - An optional workspace to fetch settings for. If not provided,
 *                                        the function uses the first available workspace.
 * @returns {Promise<ClearmlExtensionSettings>} - A promise that resolves to the deeply merged settings object.
 */
export async function getExtensionSettings(workspace?: WorkspaceFolder): Promise<ClearmlExtensionSettings> {
  const globalSettings: ClearmlExtensionSettings = await getGlobalSettings(consts.SETTINGS_NAMESPACE);

  // Use the first available workspace if none is provided
  if (!workspace) {
    const workspaces = getWorkspaceFolders();
    workspace = workspaces.length > 0 ? workspaces[0] : undefined;
  }

  if (workspace) {
    const includeInterpreter = true;
    const workspaceSettings: ClearmlExtensionSettings = await getWorkspaceSettings(
      consts.SETTINGS_NAMESPACE,
      workspace,
      includeInterpreter
    );
    return deepMergeSettings(globalSettings, workspaceSettings);
  }

  return globalSettings;
}

export function getInterpreterFromSetting(namespace: string, scope?: ConfigurationScope): string[] | undefined {
  const config: WorkspaceConfiguration = getConfiguration(namespace, scope);
  const intepreterSetting: string[] | undefined = config.get<string[]>('interpreter');
  return intepreterSetting;
}

/**
 * Workspace settings refer to settings specified in a .vscode/settings.json or .code-workspace file.
 *
 * Note: Passing an empty string as the namespace allows you to get ALL workspace settings for the workspace,
 * including those from other extensions and vanilla VS Code.
 *
 * @param namespace
 * @param workspace
 * @param includeInterpreter
 * @returns
 */
export async function getWorkspaceSettings(
  namespace: string,
  workspace: WorkspaceFolder,
  includeInterpreter?: boolean
): Promise<ClearmlExtensionSettings> {
  const config: WorkspaceConfiguration = getConfiguration(namespace, workspace.uri);

  let interpreter: string[] = [];
  if (includeInterpreter) {
    interpreter = getInterpreterFromSetting(namespace, workspace) ?? [];
    if (interpreter.length === 0) {
      traceLog(`No interpreter found from setting ${namespace}.interpreter`);
      traceLog(`Getting interpreter from ms-python.python extension for workspace ${workspace.uri.fsPath}`);
      interpreter = (await getInterpreterDetails(workspace.uri)).path ?? [];
      if (interpreter.length > 0) {
        traceLog(
          `Interpreter from ms-python.python extension for ${workspace.uri.fsPath}:`,
          `${interpreter.join(' ')}`
        );
      }
    } else {
      traceLog(`Interpreter from setting ${namespace}.interpreter: ${interpreter.join(' ')}`);
    }

    if (interpreter.length === 0) {
      traceLog(`No interpreter found for ${workspace.uri.fsPath} in settings or from ms-python.python extension`);
    }
  }

  const clearmlConfigFilePath: string = resolveSetting(
    config.get<string>('clearmlConfigFilePath', getDefaultClearmlConfigFilePath()),
    workspace
  );
  const workspaceSettings: ClearmlExtensionSettings = {
    clearmlConfigFilePath: clearmlConfigFilePath,
    interpreter: resolveSettings(interpreter, workspace),
  };
  return workspaceSettings;
}

function getGlobalValue<T>(config: WorkspaceConfiguration, key: string): T | undefined {
  const inspect = config.inspect<T>(key);
  return inspect?.globalValue ?? inspect?.defaultValue;
}

/**
 * Global settings refer to User settings, not in ./vscode/settings.json
 *
 * Note: Passing an empty string as the namespace allows you to get ALL workspace settings for the workspace,
 * including those from other extensions and vanilla VS Code.
 *
 * @param namespace
 * @returns
 */
export async function getGlobalSettings(namespace: string): Promise<ClearmlExtensionSettings> {
  const config = getConfiguration(namespace);

  let interpreter = getGlobalValue<string[]>(config, 'interpreter') ?? [];
  if (interpreter === undefined || interpreter.length === 0) {
    interpreter = (await getInterpreterDetails()).path ?? [];
  }

  const settings: ClearmlExtensionSettings = {
    clearmlConfigFilePath:
      getGlobalValue<string>(config, 'clearmlConfigFilePath') ?? getDefaultClearmlConfigFilePath(),
    interpreter: interpreter ?? [],
  };
  return settings;
}

export function checkIfConfigurationChanged(
  e: ConfigurationChangeEvent,
  namespace: string = consts.SETTINGS_NAMESPACE
): boolean {
  const thisExtensionSettings = [`${namespace}.clearmlConfigFilePath`];
  const changed = thisExtensionSettings.map((s) => e.affectsConfiguration(s));
  return changed.includes(true);
}

function resolveSettings(value: string[], workspace?: WorkspaceFolder): string[] {
  return value.map((v) => resolveSetting(v, workspace));
}

/**
 * Resolves and substitutes environment and workspace variables in a given string.
 *
 * This is meant to give the user flexibility in how they specify
 * configuration values for this extension in their settings.json file.
 *
 * This is actually a common pattern for VS Code extensions.
 *
 * The following variables are supported:
 *
 * - ${userHome} - the user's home directory
 * - ${workspaceFolder} - the current workspace folder
 * - ${workspaceFolder:<name>} - the workspace folder with the given name
 * - ${cwd} - the current working directory
 *
 * @example
 * ```json
 * // raw settings.json
 * {
 *   "clearml-session-manager.clearmlConfigFilePath": "${userHome}/clearml.conf",
 * }
 *
 * // would be resolved to something like
 * {
 *   "clearml-session-manager.clearmlConfigFilePath": "/home/eric/clearml.conf",
 * }
 * ```
 *
 * @param {string} value - The string containing placeholders to be replaced.
 * @param {WorkspaceFolder} [workspace] - The current workspace folder. If provided, it allows for the
 *                                        substitution of the '${workspaceFolder}' placeholder.
 * @returns {string} - The string with placeholders substituted with actual values.
 */
function resolveSetting(value: string, workspace?: WorkspaceFolder): string {
  const substitutions = new Map<string, string>();

  const home = process.env.HOME || process.env.USERPROFILE;
  if (home) {
    substitutions.set('${userHome}', home);
    substitutions.set('~', home);
  }

  if (workspace) {
    substitutions.set('${workspaceFolder}', workspace.uri.fsPath);
  }

  substitutions.set('${cwd}', process.cwd());
  getWorkspaceFolders().forEach((w: WorkspaceFolder) => {
    substitutions.set('${workspaceFolder:' + w.name + '}', w.uri.fsPath);
  });

  for (const [key, val] of substitutions) {
    value = value.replace(key, val);
  }

  return value;
}

const getDefaultClearmlConfigFilePath = (): string => {
  const userHome = process.env.HOME || process.env.USERPROFILE;
  const defaultClearmlConfigFilePath = `${userHome}/clearml.conf`;
  return defaultClearmlConfigFilePath;
};

/**
 * Deeply merges two settings objects, with the second object taking precedence over the first.
 *
 * @param {any} target - The target object to be merged into.
 * @param {any} source - The source object from which properties are merged.
 * @returns {any} - The merged object.
 */
function deepMergeSettings(target: any, source: any): any {
  if (!source) {
    return target;
  }

  const output = { ...target };
  if (typeof target === 'object' && typeof source === 'object') {
    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        output[key] = deepMergeSettings(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    }
  }
  return output;
}
