const defaultFaultPaths = ['~/.fault/', '/root/.fault/'];

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
      try {
        const fs = require('fs');
        const os = require('os');
        const { propertiesReader } = require('properties-reader');

        function getFaultPath() {
          for (let faultPath of defaultFaultPaths) {
            faultPath = faultPath.replaceAll('~', os.homedir());
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

        const projectPath = faultPath + project + '/';
        if (!fs.existsSync(projectPath)) {
          return '[ERROR] can not find project in ' + projectPath;
        }

        const propertyFile = projectPath + filepath;
        if (!fs.existsSync(propertyFile)) {
          return '[ERROR] can not find property file in ' + propertyFile;
        }

        const properties = propertiesReader({ sourceFile: propertyFile });
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
