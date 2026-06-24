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
            description: 'The property that should be read',
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
            const fs = require('fs');
            const os = require('os');
            const path = require('path');
            const {propertiesReader} = require('properties-reader');

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

            const properties = propertiesReader({sourceFile: propertyFile});
            const value = properties.get(property);
            if (value !== null && value !== undefined) {
                return String(value);
            }
            return '[ERROR] Property "' + property + '" not found in ' + propertyFile;
        } catch (e) {
            return '[ERROR] ' + (e.message || String(e));
        }
    }
}];
