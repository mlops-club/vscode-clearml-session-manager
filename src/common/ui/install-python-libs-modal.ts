/**
 * Modal that prompts the user to install Python libraries into a specified Python environment.
 *
 * This is used to install the Python dependencies required for this extension to run.
 *
 * Flow:
 * 1. Check if the provided Python packages are installed in the specified environment.
 * 2. If they are not installed, prompt the user to install them.
 * 3. If the user agrees, install the missing packages.
 *    3.1 During installation, show a message and and loading bar to the user.
 *    3.2 If the installation fails, prompt the user to view the error logs.
 */

import * as vscode from 'vscode';
import { installPythonPackagesInEnv, isPythonPackageInstalledInEnv } from '../python';
import { EXTENSION_NAME } from '../constants';
import { traceError } from '../logging';
import { channel as CHANNEL } from '../logging';

/**
 * Check if the provided Python packages are installed in the specified environment.
 *
 * If they are not installed, prompt the user to install them.
 *
 * @param interpreterFpath Path to the Python interpreter.
 * @param packages List of Python packages to check.
 * @returns True if the packages were installed, false otherwise.
 */
export async function checkAndPromptToInstallPythonPackages(
  interpreterFpath: string,
  packages: string[]
): Promise<boolean> {
  // Get list of missing packages.
  const missingPackages = await getMissingPackages(interpreterFpath, packages);
  if (missingPackages.length === 0) {
    return false;
  }

  // Confirm with user if they want to install missing packages.
  const userWantsToInstall = await promptUserForInstallation(missingPackages);
  if (!userWantsToInstall) {
    return false;
  }

  // Install the missing packages.
  await handlePackageInstallation(interpreterFpath, missingPackages);
  return true;
}

/**
 * Check if the provided Python packages are installed in the specified environment.
 * @param interpreterFpath Path to the Python interpreter.
 * @param packages List of Python packages to check.
 * @returns List of missing packages.
 */
async function getMissingPackages(interpreterFpath: string, packages: string[]): Promise<string[]> {
  // Filter out packages that are already installed.
  const checks = await Promise.all(packages.map((pkg) => isPythonPackageInstalledInEnv(interpreterFpath, pkg)));
  return packages.filter((pkg, index) => !checks[index]);
}

/**
 * Prompt the user about missing Python packages and ask if they want to install them.
 * @param missingPackages List of missing Python packages.
 * @returns User's choice to install the packages or not.
 */
async function promptUserForInstallation(missingPackages: string[]): Promise<boolean> {
  // Convert the list of missing packages into a readable format for the user.
  const packageList = missingPackages.join(',\n');
  const installChoice = await vscode.window.showInformationMessage(
    `${EXTENSION_NAME} - The following required Python libraries are not installed:\n\n${packageList}\n\nWould you like to install them in the current Python environment?`,
    { modal: true },
    'Install',
    'Cancel'
  );
  return installChoice === 'Install';
}

/**
 * Handle the installation of Python packages.
 *
 * Show a loading bar popup, and direct the user to view the logs if there is an error.
 *
 * @param interpreterFpath Path to the Python interpreter.
 * @param missingPackages List of missing Python packages to install.
 */
async function handlePackageInstallation(interpreterFpath: string, missingPackages: string[]): Promise<void> {
  /**
   * Installation progress task that shows a loading spinner and handles the installation process.
   * @param interpreterFpath Path to the Python interpreter.
   * @param missingPackages List of missing Python packages to install.
   */
  async function installationProgressTask(interpreterFpath: string, missingPackages: string[]): Promise<boolean> {
    const installationWasSuccessful = await installPythonPackagesInEnv(interpreterFpath, missingPackages);
    return installationWasSuccessful;
  }

  /**
   * Handle errors after installation attempts.
   */
  async function handleInstallationError() {
    traceError(`Failed to install Python packages.`);
    const selection = await vscode.window.showErrorMessage(
      `Failed to install some packages. Check "${EXTENSION_NAME}" in the "Output" tab for more details.`,
      'View error logs'
    );
    if (selection === 'View error logs') {
      CHANNEL?.channel.show();
    }
  }

  // Run the installation progress tas
  const installationStatus = await vscode.window.withProgress(
    {
      // show the progress bar in the notification area (bottom-right popup)
      location: vscode.ProgressLocation.Notification,
      title: `${EXTENSION_NAME} - Installing Python packages... (${missingPackages.join(', ')}})`,
      cancellable: false, // no cancel button
    },
    () => installationProgressTask(interpreterFpath, missingPackages)
  );

  if (!installationStatus) {
    await handleInstallationError();
  }
}
