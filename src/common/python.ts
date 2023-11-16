/* eslint-disable @typescript-eslint/naming-convention */
import { commands, Disposable, Event, EventEmitter, extensions, Uri, WorkspaceFolder } from 'vscode';
import { traceError, traceInfo, traceLog } from './logging';
import * as vscode from 'vscode';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import { runShellCommand } from './shell';
import { getProjectRoot } from './utilities';
import { getWorkspaceSettings } from './settings';
import { SETTINGS_NAMESPACE } from './constants';
import * as consts from './constants';

const exec = promisify(execCb);

type Environment = EnvironmentPath & {
  /**
   * Carries details about python executable.
   */
  readonly executable: {
    /**
     * Uri of the python interpreter/executable. Carries `undefined` in case an executable does not belong to
     * the environment.
     */
    readonly uri: Uri | undefined;
    /**
     * Bitness if known at this moment.
     */
    readonly bitness: Bitness | undefined;
    /**
     * Value of `sys.prefix` in sys module if known at this moment.
     */
    readonly sysPrefix: string | undefined;
  };
  /**
   * Carries details if it is an environment, otherwise `undefined` in case of global interpreters and others.
   */
  readonly environment:
    | {
        /**
         * Type of the environment.
         */
        readonly type: EnvironmentType;
        /**
         * Name to the environment if any.
         */
        readonly name: string | undefined;
        /**
         * Uri of the environment folder.
         */
        readonly folderUri: Uri;
        /**
         * Any specific workspace folder this environment is created for.
         */
        readonly workspaceFolder: Uri | undefined;
      }
    | undefined;
  /**
   * Carries Python version information known at this moment.
   */
  readonly version: VersionInfo & {
    /**
     * Value of `sys.version` in sys module if known at this moment.
     */
    readonly sysVersion: string | undefined;
  };
  /**
   * Tools/plugins which created the environment or where it came from. First value in array corresponds
   * to the primary tool which manages the environment, which never changes over time.
   *
   * Array is empty if no tool is responsible for creating/managing the environment. Usually the case for
   * global interpreters.
   */
  readonly tools: readonly EnvironmentTools[];
};

/**
 * Derived form of {@link Environment} where certain properties can no longer be `undefined`. Meant to represent an
 * {@link Environment} with complete information.
 */
type ResolvedEnvironment = Environment & {
  /**
   * Carries complete details about python executable.
   */
  readonly executable: {
    /**
     * Uri of the python interpreter/executable. Carries `undefined` in case an executable does not belong to
     * the environment.
     */
    readonly uri: Uri | undefined;
    /**
     * Bitness of the environment.
     */
    readonly bitness: Bitness;
    /**
     * Value of `sys.prefix` in sys module.
     */
    readonly sysPrefix: string;
  };
  /**
   * Carries complete Python version information.
   */
  readonly version: ResolvedVersionInfo & {
    /**
     * Value of `sys.version` in sys module if known at this moment.
     */
    readonly sysVersion: string;
  };
};

type EnvironmentsChangeEvent = {
  readonly env: Environment;
  /**
   * * "add": New environment is added.
   * * "remove": Existing environment in the list is removed.
   * * "update": New information found about existing environment.
   */
  readonly type: 'add' | 'remove' | 'update';
};

type ActiveEnvironmentPathChangeEvent = EnvironmentPath & {
  /**
   * Workspace folder the environment changed for.
   */
  readonly resource: WorkspaceFolder | undefined;
};

/**
 * Uri of a file inside a workspace or workspace folder itself.
 */
type Resource = Uri | WorkspaceFolder;

type EnvironmentPath = {
  /**
   * The ID of the environment.
   */
  readonly id: string;
  /**
   * Path to environment folder or path to python executable that uniquely identifies an environment. Environments
   * lacking a python executable are identified by environment folder paths, whereas other envs can be identified
   * using python executable path.
   */
  readonly path: string;
};

/**
 * Tool/plugin where the environment came from. It can be {@link KnownEnvironmentTools} or custom string which
 * was contributed.
 */
type EnvironmentTools = KnownEnvironmentTools | string;
/**
 * Tools or plugins the Python extension currently has built-in support for. Note this list is expected to shrink
 * once tools have their own separate extensions.
 */
type KnownEnvironmentTools =
  | 'Conda'
  | 'Pipenv'
  | 'Poetry'
  | 'VirtualEnv'
  | 'Venv'
  | 'VirtualEnvWrapper'
  | 'Pyenv'
  | 'Unknown';

/**
 * Type of the environment. It can be {@link KnownEnvironmentTypes} or custom string which was contributed.
 */
type EnvironmentType = KnownEnvironmentTypes | string;
/**
 * Environment types the Python extension is aware of. Note this list is expected to shrink once tools have their
 * own separate extensions, in which case they're expected to provide the type themselves.
 */
type KnownEnvironmentTypes = 'VirtualEnvironment' | 'Conda' | 'Unknown';

/**
 * Carries bitness for an environment.
 */
type Bitness = '64-bit' | '32-bit' | 'Unknown';

/**
 * The possible Python release levels.
 */
type PythonReleaseLevel = 'alpha' | 'beta' | 'candidate' | 'final';

/**
 * Release information for a Python version.
 */
type PythonVersionRelease = {
  readonly level: PythonReleaseLevel;
  readonly serial: number;
};

type VersionInfo = {
  readonly major: number | undefined;
  readonly minor: number | undefined;
  readonly micro: number | undefined;
  readonly release: PythonVersionRelease | undefined;
};

type ResolvedVersionInfo = {
  readonly major: number;
  readonly minor: number;
  readonly micro: number;
  readonly release: PythonVersionRelease;
};

interface IExtensionApi {
  ready: Promise<void>;
  debug: {
    getRemoteLauncherCommand(host: string, port: number, waitUntilDebuggerAttaches: boolean): Promise<string[]>;
    getDebuggerPackagePath(): Promise<string | undefined>;
  };
  environments: {
    getActiveEnvironmentPath(resource?: Resource): EnvironmentPath;
    resolveEnvironment(environment: Environment | EnvironmentPath | string): Promise<ResolvedEnvironment | undefined>;
    readonly onDidChangeActiveEnvironmentPath: Event<ActiveEnvironmentPathChangeEvent>;
  };
}

export interface IInterpreterDetails {
  path?: string[];
  resource?: Uri;
}

const onDidChangePythonInterpreterEvent = new EventEmitter<IInterpreterDetails>();
export const onDidChangePythonInterpreter: Event<IInterpreterDetails> = onDidChangePythonInterpreterEvent.event;

async function activateExtension() {
  const extension = extensions.getExtension('ms-python.python');
  if (extension) {
    if (!extension.isActive) {
      await extension.activate();
    }
  }
  return extension;
}

async function getPythonExtensionAPI(): Promise<IExtensionApi | undefined> {
  const extension = await activateExtension();
  return extension?.exports as IExtensionApi;
}

export async function initializePython(disposables: Disposable[]): Promise<void> {
  try {
    const api = await getPythonExtensionAPI();

    if (api) {
      disposables.push(
        api.environments.onDidChangeActiveEnvironmentPath((e) => {
          onDidChangePythonInterpreterEvent.fire({ path: [e.path], resource: e.resource?.uri });
        })
      );

      traceLog('Waiting for interpreter from python extension.');
      onDidChangePythonInterpreterEvent.fire(await getInterpreterDetails());
    }
  } catch (error) {
    traceError('Error initializing python: ', error);
  }
}

export async function resolveInterpreter(interpreter: string[]): Promise<ResolvedEnvironment | undefined> {
  const api = await getPythonExtensionAPI();
  return api?.environments.resolveEnvironment(interpreter[0]);
}

export async function getInterpreterDetails(resource?: Uri): Promise<IInterpreterDetails> {
  const api = await getPythonExtensionAPI();
  const environment = await api?.environments.resolveEnvironment(api?.environments.getActiveEnvironmentPath(resource));
  if (environment?.executable.uri && checkVersion(environment)) {
    return { path: [environment?.executable.uri.fsPath], resource };
  }
  return { path: undefined, resource };
}

export async function getDebuggerPath(): Promise<string | undefined> {
  const api = await getPythonExtensionAPI();
  return api?.debug.getDebuggerPackagePath();
}

export async function runPythonExtensionCommand(command: string, ...rest: any[]) {
  await activateExtension();
  return await commands.executeCommand(command, ...rest);
}

export function checkVersion(resolved: ResolvedEnvironment | undefined): boolean {
  const version = resolved?.version;
  if (version?.major === 3 && version?.minor >= 8) {
    return true;
  }
  traceError(`Python version ${version?.major}.${version?.minor} is not supported.`);
  traceError(`Selected python path: ${resolved?.executable.uri?.fsPath}`);
  traceError('Supported versions are 3.8 and above.');
  return false;
}

// eric

/**
 * Return true if the python package is installed in the environment.
 *
 * The check is done by running the `pip show <packageName>` command.
 *
 * @param interpreterPath Path to the Python interpreter.
 * @param packageName Name of the package to check.
 * @return boolean True if the package is installed, false otherwise.
 */
export async function isPythonPackageInstalledInEnv(interpreterPath: string, packageName: string): Promise<boolean> {
  try {
    // Construct the pip command using the provided interpreter path
    const pipCmd = `${interpreterPath} -m pip show ${packageName}`;

    // Execute the command
    const { stdout } = await exec(pipCmd);

    // If the output contains the package name, it's installed
    return stdout.includes(`Name: ${packageName}`);
  } catch (error) {
    // If an error occurs (e.g., package not found), return false
    return false;
  }
}

/**
 * Install a list of python packages in the environment.
 *
 * The installation is done using the `pip install <packageName>` command.
 *
 * @param interpreterPath Path to the Python interpreter.
 * @param packageNames List of package names to install.
 * @param logFn Optional custom log function for stdout.
 * @param errorLogFn Optional custom log function for stderr.
 * @return Promise<void>
 */
export async function installPythonPackagesInEnv(
  interpreterPath: string,
  packageNames: string[],
  logFn: (msg: string) => void = traceInfo,
  errorLogFn: (msg: string) => void = traceError
): Promise<boolean> {
  const args = ['-m', 'pip', 'install', ...packageNames];
  const result = await runShellCommand(interpreterPath, args, logFn, errorLogFn);
  traceInfo(`Install result: ${result.logs}`);
  return result.exitCode === 0;
}

export const getPathToActivePythonInterpreter = async (): Promise<string | undefined> => {
  const projectRoot = await getProjectRoot();
  const workspaceSettings = await getWorkspaceSettings(SETTINGS_NAMESPACE, projectRoot, true);
  return workspaceSettings.interpreter[0];
};

export const promptIfPythonInterpreterIsNotConfigured = async (): Promise<boolean> => {
  const pathToActivePythonInterpreter: string | undefined = await getPathToActivePythonInterpreter();
  const interpreterNotSet = pathToActivePythonInterpreter === undefined || pathToActivePythonInterpreter.length === 0;

  if (interpreterNotSet) {
    // updateStatus(vscode.l10n.t('Please select a Python interpreter.'), vscode.LanguageStatusSeverity.Error);
    traceError(
      'Python interpreter missing:\r\n' +
        '[Option 1] Select python interpreter using the ms-python.python.\r\n' +
        `[Option 2] Set an interpreter using "${SETTINGS_NAMESPACE}.interpreter" setting.\r\n`,
      'Please use Python 3.8 or greater.'
    );
    // display an error message to the user
    vscode.window.showErrorMessage(`[${consts.EXTENSION_NAME}] Please select a Python interpreter.`);
    return false;
  }
  return true;
};
