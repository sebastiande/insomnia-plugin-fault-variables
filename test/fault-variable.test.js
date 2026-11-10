const {describe, it, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const [faultVariable] = require('../index.js').templateTags;

const project = 'com.example.demo-service';

const files = {
    'secrets-qa.yml': [
        'toolbox:',
        '  security:',
        '    username: dummy-security-user',
        '  credentials:',
        '    live:',
        '      username: dummy-live-user',
        '      password: dummy-live-password',
        '      pin: 0123',
        ''
    ].join('\n'),
    'multi-document.yml': [
        '---',
        'first:',
        '  key: dummy-first-value',
        'shared:',
        '  key: dummy-shared-first',
        '---',
        'second:',
        '  key: dummy-second-value',
        'shared:',
        '  key: dummy-shared-second',
        ''
    ].join('\n'),
    'secrets.YAML': [
        'service:',
        '  password: dummy-yaml-password',
        ''
    ].join('\n'),
    'invalid.yml': [
        'service:',
        '  password: dummy-leaked-secret',
        'broken: [unclosed',
        ''
    ].join('\n'),
    'service.properties': 'service.password=dummy-properties-password\n'
};

describe('faultVariable', () => {
    // os.homedir() reads HOME on POSIX and USERPROFILE on Windows
    const homeVariables = ['HOME', 'USERPROFILE'];
    let tempHome;
    let originalEnv;

    before(() => {
        tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'fault-variable-test-'));
        fs.mkdirSync(projectDir(), {recursive: true});
        for (const [name, content] of Object.entries(files)) {
            fs.writeFileSync(path.join(projectDir(), name), content);
        }
        originalEnv = Object.fromEntries(homeVariables.map(name => [name, process.env[name]]));
        homeVariables.forEach(name => process.env[name] = tempHome);
    });

    after(() => {
        for (const [name, value] of Object.entries(originalEnv)) {
            if (value === undefined) {
                delete process.env[name];
            } else {
                process.env[name] = value;
            }
        }
        fs.rmSync(tempHome, {recursive: true, force: true});
    });

    function projectDir() {
        return path.join(tempHome, '.fault', project);
    }

    function run(filepath, property) {
        return faultVariable.run({}, project, filepath, property);
    }

    function notFound(filepath, property) {
        return '[ERROR] Property "' + property + '" not found in ' + path.join(projectDir(), filepath);
    }

    describe('YAML files', () => {
        it('resolves a nested dot path', async () => {
            assert.equal(await run('secrets-qa.yml', 'toolbox.credentials.live.username'), 'dummy-live-user');
        });

        it('returns unquoted numeric-looking values verbatim', async () => {
            assert.equal(await run('secrets-qa.yml', 'toolbox.credentials.live.pin'), '0123');
        });

        it('reads the first document of a multi-document file', async () => {
            assert.equal(await run('multi-document.yml', 'first.key'), 'dummy-first-value');
        });

        it('reads a later document of a multi-document file', async () => {
            assert.equal(await run('multi-document.yml', 'second.key'), 'dummy-second-value');
        });

        it('prefers the first document when several documents have the path', async () => {
            assert.equal(await run('multi-document.yml', 'shared.key'), 'dummy-shared-first');
        });

        it('reads files with a .yaml extension case-insensitively', async () => {
            assert.equal(await run('secrets.YAML', 'service.password'), 'dummy-yaml-password');
        });

        it('reports a missing key', async () => {
            const property = 'toolbox.credentials.qa.username';
            assert.equal(await run('secrets-qa.yml', property), notFound('secrets-qa.yml', property));
        });

        it('reports a path that points at an object', async () => {
            const property = 'toolbox.credentials';
            assert.equal(await run('secrets-qa.yml', property), notFound('secrets-qa.yml', property));
        });

        it('does not resolve inherited object members', async () => {
            const property = 'toolbox.constructor';
            assert.equal(await run('secrets-qa.yml', property), notFound('secrets-qa.yml', property));
        });

        it('reports invalid YAML as an error without quoting the file content', async () => {
            const result = await run('invalid.yml', 'service.password');
            assert.match(result, /^\[ERROR\] /);
            assert.doesNotMatch(result, /dummy-leaked-secret/);
        });
    });

    describe('properties files', () => {
        it('still reads a property', async () => {
            assert.equal(await run('service.properties', 'service.password'), 'dummy-properties-password');
        });

        it('reports a missing property', async () => {
            assert.equal(await run('service.properties', 'missing.key'), notFound('service.properties', 'missing.key'));
        });
    });
});
