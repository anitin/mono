const inquirer = require('inquirer');
const fs = require('fs');
const program = require('commander');
const { execSync, spawn } = require("child_process");

const CONFIG_FILE = '.mono';

const isYarnInstalled = () => {
  try {
    const version = execSync(`yarn --version`).toString().trim();
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
const getWorkspace = () => {
  try {
    return fs.readFileSync(CONFIG_FILE, 'utf8');
  } catch (e) {
    return null;
  }
};
const setWorkspace = workspace => {
  try {
    fs.writeFileSync(CONFIG_FILE, workspace);
  } catch (e) {
    return null;
  }
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
  else{
    //exec
    spawn(`yarn workspace ${workspace} ${program.args.join(' ')}`, { stdio: 'inherit' });
  }
})();
