const fs = require('fs');
const os = require('os');
const path = require('path');

const defaultFaultPaths = ['~/.fault/', '/root/.fault/'];

function isUnresolvedRef(v) {
    return typeof v === 'string' && /^_[.\[]/.test(v);
}

function resolveRef(context, value) {
    if (!isUnresolvedRef(value)) return value;
    const m = value.match(/^_\.(.+)$/) || value.match(/^_\[['"](.+)['"]\]$/);
    const varName = m && m[1];
    const env = context && context.context;
    return (env && env[varName] != null) ? String(env[varName]) : value;
}

function isYamlFile(filepath) {
    return /\.ya?ml$/i.test(filepath);
}

function isScalar(value) {
    return value !== null && value !== undefined && typeof value !== 'object';
}

function resolveDotPath(document, dotPath) {
    return dotPath.split('.').reduce(
        (node, key) => (node !== null && typeof node === 'object' && Object.hasOwn(node, key)) ? node[key] : undefined,
        document
    );
}

// The failsafe schema keeps every scalar as the string written in the file, so secrets like 0123 are not turned into numbers.
function parseYamlDocuments(content) {
    const {loadAll, FAILSAFE_SCHEMA, YAMLException} = require('js-yaml');
    try {
        return loadAll(content, {schema: FAILSAFE_SCHEMA});
    } catch (e) {
        // The default message quotes the surrounding lines of the file, which may contain secrets.
        if (e instanceof YAMLException) {
            throw new Error(e.toString(true));
        }
        throw e;
    }
}

// Returns the first scalar found at the dot path, searching the documents of the file in order.
function readYamlProperty(file, property) {
    const documents = parseYamlDocuments(fs.readFileSync(file, 'utf8'));
    const values = documents.map(document => resolveDotPath(document, property));
    return values.find(isScalar);
}

function readPropertiesProperty(file, property) {
    const {propertiesReader} = require('properties-reader');
    return propertiesReader({sourceFile: file}).get(property);
}

module.exports.templateTags = [{
    name: 'faultVariable',
    displayName: 'Fault Variable',
    description: 'Inserts the content of a property stored within fault',
    args: [
        {
            displayName: 'Project',
            description: 'The fault project name.',
            type: 'string',
            defaultValue: '',
            placeholder: 'com.ionos.myproject:service-name'
        },
        {
            displayName: 'Filepath',
            description: 'The path to a file within the project',
            type: 'string',
            defaultValue: '',
            placeholder: 'prod/.properties'
        },
        {
            displayName: 'Property',
            description: 'The property that should be read (a dot path like toolbox.credentials.username for YAML files)',
            type: 'string',
            defaultValue: '',
            placeholder: 'service.password'
        }
    ],
    async run(context, project, filepath, property) {
        project = resolveRef(context, project);
        filepath = resolveRef(context, filepath);
        property = resolveRef(context, property);
        try {
            // Windows does not allow colons in paths; fault stores 'group:artifact' as 'groupartifact'
            function resolveProject(proj) {
                return os.platform() === 'win32' ? proj.replace(/:/g, '') : proj;
            }

            function getFaultPath() {
                for (let faultPath of defaultFaultPaths) {
                    faultPath = faultPath.replace('~', os.homedir());
                    if (fs.existsSync(faultPath)) {
                        return faultPath;
                    }
                }
                return null;
            }

            const faultPath = getFaultPath();
            if (faultPath === null) {
                return '[ERROR] Fault not mounted (Can not find fault in ~/.fault)!';
            }

            const projectPath = path.join(faultPath, resolveProject(project));
            if (!fs.existsSync(projectPath)) {
                return '[ERROR] can not find project in ' + projectPath;
            }

            const propertyFile = path.join(projectPath, filepath);
            if (!fs.existsSync(propertyFile)) {
                return '[ERROR] can not find property file in ' + propertyFile;
            }

            const value = isYamlFile(filepath)
                ? readYamlProperty(propertyFile, property)
                : readPropertiesProperty(propertyFile, property);
            if (value !== null && value !== undefined) {
                return String(value);
            }
            return '[ERROR] Property "' + property + '" not found in ' + propertyFile;
        } catch (e) {
            return '[ERROR] ' + (e.message || String(e));
        }
    }
}];
