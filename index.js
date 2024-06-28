const fs = require('fs');
const os = require('os');
const propertiesReader = require('properties-reader');
const defaultFaultPath = '~/.fault/'

function readFaultProperty(project, filepath, property) {
    const faultPath = getFaultPath();
    if (!fs.existsSync(faultPath)) {
        console.error('[insomnia-plugin-fault-variables] can not find fault directory, only searched within home directory ~/.fault/');
        return '[ERROR] Fault not mounted (Can not find fault in ~/.fault)!';
    }

    if (project === '0') {
        console.error('[insomnia-plugin-fault-variables] can not find fault projects');
        return '[ERROR] can not find fault projects!';
    }

    const projectPath = faultPath + project + '/';
    if (!fs.existsSync(projectPath)) {
        console.error('[insomnia-plugin-fault-variables] can not find project in: ' + projectPath);
        return '[ERROR] can not find project in ' + projectPath;
    }

    const propertyFile = projectPath + filepath;
    if (!fs.existsSync(propertyFile)) {
        console.error('[insomnia-plugin-fault-variables] can not find property file: ' + propertyFile);
        return '[ERROR] can not find property file in ' + propertyFile;
    }

    const properties = propertiesReader(propertyFile);
    const value = properties.get(property);
    if (value) {
        return value;
    }
    return '[ERROR] Not found';
}

function getFaultPath() {
    return defaultFaultPath.replaceAll('~', os.homedir());
}

function getFaultProjects() {
    const faultPath = getFaultPath();
    if (!fs.existsSync(faultPath)) {
        console.error('[insomnia-plugin-fault-variables] can not find fault directory, only searched within home directory ~/.fault/');
        return [{
            displayName: 'No fault projects found',
            value: '0'
        }]
    }

    const faultProjects = fs.readdirSync(faultPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    let projectsEnum = [];
    faultProjects.forEach(item => {
        projectsEnum.push({
            displayName: item,
            value: item
        });
    })
    return projectsEnum;
}

function getPropertyFiles(project) {
    console.log(project);
    return [{
        displayName: 'no',
        value: '0'
    }];
}

function getArgs() {
    const properties = (args => getPropertyFiles(args));
    console.log(properties);
    return [
        {
            displayName: 'Project',
            description: 'The fault project name.',
            type: 'enum',
            options: getFaultProjects()
        },
        {
            displayName: 'Filepath',
            description: 'The path to a file within the project',
            type: 'enum',
            options: getPropertyFiles()
        },
        {
            displayName: 'Property',
            description: 'The property that should be read',
            type: 'string',
            defaultValue: '',
            placeholder: 'service.password'
        }
    ];
}

module.exports.templateTags = [{
    name: 'faultVariable',
    displayName: 'Fault Variable',
    description: 'Inserts the content of a property stored within fault',
    args: getArgs(),
    async run(context, project, filepath, property) {
        try {
            return readFaultProperty(project, filepath, property);
        } catch (e) {
            console.error(e);
        }
    }
}];
