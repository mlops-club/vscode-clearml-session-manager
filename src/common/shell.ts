import { spawn } from 'child_process';

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