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
    console.log(`Project Commands in ${workspace}:\n• ${cmds.join('\n• ')}`);
  }
  return workspace;
}

const cleanExit = function() { process.exit() };
process.on('SIGINT', cleanExit); // catch ctrl-c
process.on('SIGTERM', cleanExit); // catch kill

program
  .option('use', 'Set Workspace')
  .option('info', 'Show Selected Workspace Information')
  .option('tree', 'Show Workspace Dependency Tree')
  .parse(process.argv);

(async function Main() {

  yarnInfo.doChecks();

  if (program.use) {
    await selectWorkspace();
    return;
  }
  let workspace = await yarnInfo.getSelectedWorkspace();

  if (program.info) {
    if(workspace){
      console.log(`Current Workspace: ${workspace}`);
      const cmds= await yarnInfo.getSelectedWorkspaceCommands();
      if( Array.isArray(cmds) && cmds.length > 0 ){
        console.log(`Project Commands in ${workspace}:\n• ${cmds.join('\n• ')}`);
      }
    } else {
      console.log(`You do not have any workspace selected!`);
    }
    return;
  } else if (program.use) {
    workspace = await selectWorkspace();
    return;
  }
  //for below commands we need workspace. so select it before executing
  if (!workspace) {
    workspace = await selectWorkspace();
  }

  if (program.tree) {
    console.log('Workspace Dependency Tree:')
    yarnInfo.showInfo();
  }
  else if(program.args && program.args.length >0 ){
    const cmd = program.args[0];
    //exec
    spawn('yarn',['workspace', workspace, ...program.args], { stdio: 'inherit', env: process.env });
    
  } else {
    console.log('Error Missing command name.')
  }
})();
