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

function getFaultPath() {
  return defaultFaultPath.replaceAll('~', os.homedir());
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
    async run (context, project, filepath, property) {
      try {
        return readFaultProperty(project, filepath, property);
      } catch (e) {
        console.error(e);
      }
    }
}];
