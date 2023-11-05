import { spawn, ChildProcess } from 'child_process';
import { traceError, traceInfo } from './logging';

/**
 * Run an arbitrary bash command and log the outputs.
 * 
 * @param cmd The command to run.
 * @param args The arguments for the command.
 * @param logFn Custom log function for stdout.
 * @param errorLogFn Custom log function for stderr.
 * @return Promise<{ logs: string, exitCode: number }> Returns an object containing the logs and the exit code.
 */
export async function runShellCommand(
    cmd: string, 
    args: string[], 
    logFn: (msg: string) => void, 
    errorLogFn: (msg: string) => void
): Promise<{ logs: string, exitCode: number }> {
    const process = spawn(cmd, args);
    let logs = '';

    // This function will capture the logs and errors from the process
    const processStream = (stream: NodeJS.ReadableStream, customLogFunction: (msg: string) => void) => {
        return new Promise((resolve, reject) => {
            stream.on('data', (data) => {
                const dataStr = data.toString();
                logs += dataStr; // accumulate logs
                customLogFunction(dataStr);
            });

            stream.on('end', resolve);
            stream.on('error', reject);
        });
    };

    const stdoutPromise = processStream(process.stdout, logFn);
    const stderrPromise = processStream(process.stderr, errorLogFn);

    await Promise.all([stdoutPromise, stderrPromise]);

    // Wait for the process to finish and return its exit code
    const exitCode = await new Promise<number>((resolve) => {
        process.on('exit', resolve);
    });

    return { logs, exitCode };
}


const defaultOnNonZeroExit = (exitCode: number, subprocess: ChildProcess) => {
    traceError(`Subprocess exited with non-zero status: ${exitCode}`);
    console.log(`Subprocess exited with non-zero status: ${exitCode}`);
    subprocess.kill();
    throw new Error(`Subprocess exited with non-zero status: ${exitCode}`);
}

/**
 * Start a bash command as a detached subprocess, react to logs as they come in, and handle non-zero exit status.
 * 
 * @param cmd The command to run.
 * @param args The arguments for the command.
 * @param logFn Custom log function for stdout.
 * @param errorLogFn Custom log function for stderr.
 * @param onNonZeroExit Custom function to execute when subprocess exits with a non-zero status.
 * @return Promise<{ subprocessPid: number }> Returns an object containing the PID of the subprocess.
 */
export function startDetachedSubprocess(
    cmd: string,
    args: string[],
    logFn: (msg: string) => void = traceInfo, 
    errorLogFn: (msg: string) => void = traceError,
    onNonZeroExit: (exitCode: number, subprocess: ChildProcess) => void = defaultOnNonZeroExit,
): Promise<{ subprocessPid: number }> {
    // Start the child process as detached
    const subprocess = spawn(cmd, args, {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']  // [stdin, stdout, stderr]
    });

    // Function to handle the data streams (stdout and stderr)
    const handleStream = (stream: NodeJS.ReadableStream, customLogFunction: (msg: string) => void) => {
        stream.on('data', (data) => {
            customLogFunction(data.toString());
        });
    };

    handleStream(subprocess.stdout, logFn);
    handleStream(subprocess.stderr, errorLogFn);

    // Handle non-zero exit status
    subprocess.on('exit', (exitCode) => {
        if (exitCode !== 0) {
            onNonZeroExit(exitCode!, subprocess);
        }
    });

    // Return the PID of the subprocess
    return Promise.resolve({ subprocessPid: subprocess.pid });
}
