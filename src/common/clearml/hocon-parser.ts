/**
 * Utility for parsing HOCON files.
 *
 * It turns out that none of the HOCON parsing libraries in the JavaScript
 * world support the flavor of HOCON used by ClearML's config files.
 *
 * In particular, they want all strings to have quotes around them.
 * The HOCON files used by ClearML do not have quotes around strings,
 * which breaks the various JavaScript HOCON parsers.
 *
 * The ClearML SDK actually uses a Python library called pyhocon to
 * do this parsing. Given that this extension already assumes that:
 *
 * - the Python extension is installed,
 * - a virtualenv is activated,
 * - and clearml is installed in the virtualenv,
 *
 * we can safely assume that pyhocon is available in the virtualenv, and
 * therefore, we can simply call pyhocon as a subprocess to parse the
 * user's clearml.conf file.
 */

import { traceError, traceInfo } from '../logging';
import { runShellCommand } from '../shell';

/**
 * Parse a HOCON file to a JSON object using pyhocon.
 *
 * @param pythonInterpreterFpath - The path to the Python interpreter; pyhocon is assumed to be installed in the same (virtual)env.
 * @param hoconFilePath - The path to the HOCON file.
 * @returns The parsed HOCON JSON object.
 */
export async function parseHoconFileWithPyhocon(pythonInterpreterFpath: string, hoconFilePath: string): Promise<any> {
  const args = ['-m', 'pyhocon.tool', '--compact', '--format', 'json', '--input', hoconFilePath];

  traceInfo(`Parsing clearml.conf using command: ${pythonInterpreterFpath} ${args.join(' ')}`);
  const { logs, exitCode } = await runShellCommand(pythonInterpreterFpath, args, (msg: string) => {}, traceError);

  if (exitCode !== 0) {
    throw new Error('Failed to parse HOCON file');
  }

  try {
    const hoconObj = JSON.parse(logs);
    return hoconObj;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    throw error;
  }
}
