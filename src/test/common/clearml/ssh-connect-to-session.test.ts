import * as assert from 'assert';
import { parseSshDetailsFromLogs, SshDetails } from '../../../common/clearml/ssh-connect-to-session';

suite('SSH Connect to Session Tests', () => {
    test('Parse valid SSH log string', async () => {
        const validLogString = `
            #
            # SSH Server running on ip-172-31-26-64.us-west-2.compute.internal [172.31.26.64] port 10022
            # LOGIN u:root p:pass
            #
        `;
        const expected: SshDetails = {
            ipAddress: '172.31.26.64',
            port: '10022',
            username: 'root',
            password: 'pass'
        };
        const result = await parseSshDetailsFromLogs(validLogString);
        assert.deepStrictEqual(result, expected);
    });

    test('Return null for invalid log string', async () => {
        const invalidLogString = `This is an invalid log string.`;
        const result = await parseSshDetailsFromLogs(invalidLogString);
        assert.strictEqual(result, null);
    });

    test('Return null for empty log string', async () => {
        const emptyLogString = ``;
        const result = await parseSshDetailsFromLogs(emptyLogString);
        assert.strictEqual(result, null);
    });
});
