#!/usr/bin/env node

const inquirer = require('inquirer');
const program = require('commander');
const { spawn } = require("child_process");
const yarnInfo = require('./yarn-info');

const selectWorkspace = async () => {
  const spaces = yarnInfo.getWorkspaces();
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
  const cmds = await yarnInfo.setSelectedWorkspace(workspace);
  if( Array.isArray(cmds) && cmds.length > 0 ){
    console.log(`Available Commands in ${workspace}:\n• ${cmds.join('\n• ')}`);
  }
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

  let workspace = await yarnInfo.getSelectedWorkspace();
  if (!workspace) {
    workspace = await selectWorkspace();
  }

  if (program.use) {
    workspace = await selectWorkspace();
  }
  else if(program.args && program.args.length >0 ){
    const cmd = program.args[0];
    //exec
    spawn('yarn',['workspace', workspace, ...program.args], { stdio: 'inherit', env: process.env });
    
  } else {
    console.log('Error Missing command name.')
  }
})();
