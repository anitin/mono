#!/usr/bin/env node

const inquirer = require('inquirer');
const program = require('commander');
const { spawn } = require("child_process");
const yarnInfo = require('./yarn-info');

// const CONFIG_FILE = 'ws.config.json';
// let config = null;

// const getConfig = () => {
//   if(config) {
//     return config;
//   }
//   try {
//     config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
//     return config;
//   } catch (e) {
//     return null;
//   }
// }
// const saveConfig = (config) => {
//   try {
//     fs.writeFileSync(CONFIG_FILE, JSON.stringify(config,null,2));
//   } catch (e) {
//     return null;
//   }
// }

// const isYarnInstalled = () => {
//   try {
//     const version = execSync(`yarn --version`).toString().trim();
//     //version > 1
//     return true;
//   } catch(e){
//   }
//   return false;
// }
// const getYarnWorkspaces = () => {
//   try {
//     const output = execSync(`yarn workspaces info --json`).toString().trim();
//     return JSON.parse(output.substring(output.indexOf("\n")+1, output.lastIndexOf("\n")));
//   } catch(e){
//     console.error(`Cannot find yarn workspaces`, e);
//   }
//   return null;
// }


// const getWorkspace = () => getConfig() ? getConfig().workspace: null;

// const setWorkspace = workspace => {
//   saveConfig({...getConfig(), workspace})
// };

const selectWorkspace = async () => {
  const spaces = yarnInfo.getWorkspaces()();
  const choices = spaces.map(name => ({
    name: name,
    value: name
  }));
  const { workspace } = await inquirer.prompt({
    type: 'list',
    name: 'workspace',
    message: 'Select the workspace',
    choices
  });
  const cmds = yarnInfo.setSelectedWorkspace(workspace);
  console.log(`Available Commands in ${workspace}:\n${cmds.join('\n')}`);
  return workspace;
}

const cleanExit = function() { process.exit() };
process.on('SIGINT', cleanExit); // catch ctrl-c
process.on('SIGTERM', cleanExit); // catch kill

program
  .option('use', 'Set Workspace')
  .parse(process.argv);

(async function Main() {

  yarnInfo.doChecks();

  let workspace = yarnInfo.getSelectedWorkspace();
  if (!workspace) {
    workspace = await selectWorkspace();
  }

  if (program.use) {
    workspace = await selectWorkspace();
  }
  else if(program.args && program.args.length >0 ){
    const env = Object.assign({}, process.env, getConfig() ? getConfig().env : {});
    const cmd = program.args[0];
    console.log(yarnInfo.isValidWorkspaceCommand(cmd));
    //exec
    spawn('yarn',['workspace', workspace, ...program.args], { stdio: 'inherit', env});
  } else {
    console.log('Error Missing command name.')
  }
})();
