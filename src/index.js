#!/usr/bin/env node

const inquirer = require('inquirer');
const fs = require('fs');
const program = require('commander');
const { execSync, spawn } = require("child_process");

const CONFIG_FILE = 'ws.config.json';
let config = null;

const getConfig = () => {
  if(config) {
    return config;
  }
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return config;
  } catch (e) {
    return null;
  }
}
const saveConfig = (config) => {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config,null,2));
  } catch (e) {
    return null;
  }
}

const isYarnInstalled = () => {
  try {
    const version = execSync(`yarn --version`).toString().trim();
    //version > 1
    return true;
  } catch(e){
  }
  return false;
}
const getYarnWorkspaces = () => {
  try {
    const output = execSync(`yarn workspaces info --json`).toString().trim();
    return JSON.parse(output.substring(output.indexOf("\n")+1, output.lastIndexOf("\n")));
  } catch(e){
    console.error(`Cannot find yarn workspaces`, e);
  }
  return null;
}


const getWorkspace = () => getConfig() ? getConfig().workspace: null;

const setWorkspace = workspace => {
  saveConfig({...getConfig(), workspace})
};

const selectWorkspace = async () => {
  const spaces = getYarnWorkspaces();
  if(spaces === null || Object.keys(spaces).length === 0) {
    console.error(`Cannot find yarn workspaces!`);
    return null;
  }
  const choices = Object.keys(spaces).map(name => ({
    name: name,
    value: name
  }));
  const { workspace } = await inquirer.prompt({
    type: 'list',
    name: 'workspace',
    message: 'Select the workspace',
    choices
  });
  setWorkspace(workspace)
  return workspace;
}

const cleanExit = function() { process.exit() };
process.on('SIGINT', cleanExit); // catch ctrl-c
process.on('SIGTERM', cleanExit); // catch kill

program
  .option('use', 'Set Workspace')
  .parse(process.argv);

(async function Main() {

  if(!isYarnInstalled()) {
    console.error('Cannot find yarn!');
    return;
  }
  const allWorkSpaces = getYarnWorkspaces();
  let workspace = getWorkspace();
  if (!workspace || Object.keys(allWorkSpaces).indexOf(workspace) < 0) {
    workspace = await selectWorkspace();
  }

  if (program.use) {
    workspace = await selectWorkspace();
  }
  else if(program.args && program.args.length >0 ){
    const env = Object.assign({}, process.env, getConfig() ? getConfig().env : {});
    //exec
    spawn('yarn',['workspace', workspace, ...program.args], { stdio: 'inherit', env});
  } else {
    console.log('Error Missing command name.')
  }
})();
