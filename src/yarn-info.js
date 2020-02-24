const { execSync } = require("child_process");
const cache = require("./cache");
const treeify = require('treeify');
const fs = require('fs');

let inMemCachedWorkspaces = null;
let rootPackageName = null;
let rootPackageDependencies = null;

const getRootPackageDependencies = ()=>{
  if(rootPackageDependencies) return rootPackageDependencies;
  try {
    const data = fs.readFileSync('package.json', 'utf8')
    const {name, dependencies={},devDependencies={}, optionalDependencies={}, bundledDependencies={}} = JSON.parse(data);
    rootPackageName = name ? `${name} (root)`: `package.json (root)`
    rootPackageDependencies = [].concat(
      Object.keys(dependencies),
      Object.keys(devDependencies),
      Object.keys(optionalDependencies),
      Object.keys(bundledDependencies)
    );
  } catch (err) {
    rootPackageDependencies=[];
  }
  return rootPackageDependencies;
}
const isYarnInstalled = () => {
  try {
    const version = execSync(`yarn --version`, {stdio : 'pipe' }).toString().trim();
    //version > 1
    return true;
  } catch(e){
  }
  return false;
}


const getObject = str => {
  try {
    return JSON.parse(str);
  } catch(e) {
    return null;
  }
};

const getYarnWorkspaces = () => {
  if(inMemCachedWorkspaces) {
    return Object.keys(inMemCachedWorkspaces);
  }

  try {
    const output = execSync(`yarn workspaces info --json`, {stdio : 'pipe' }).toString().trim();
    const parsed = getObject(output);
    inMemCachedWorkspaces = parsed ? parsed : JSON.parse(output.substring(output.indexOf("\n")+1, output.lastIndexOf("\n")));
    return Object.keys(inMemCachedWorkspaces);
  } catch(e){
    console.error(`Cannot find yarn workspaces`, e);
  }
  return null;
}

const getYarnWorkspaceCommands = workspace => {
  const workspaces = getYarnWorkspaces();
  if(Array.isArray(workspaces) && workspaces.indexOf(workspace) > -1) {
    try {
      const result = execSync(`yarn workspace ${workspace} run --json`, {stdio : 'pipe' }).toString().trim();
      const output = result.split('\n');
      for(let i=0; i<output.length; i++) {
        const obj = getObject(output[i]);
        if(obj!== null && obj.type === 'list' && obj.data && obj.data.type === 'possibleCommands') {
          return obj.data.items;
        }
      }
    } catch(e){}
  }
  return [];
}

const setSelectedWorkspace = async selectedWorkspace => {
  const spaces = getYarnWorkspaces();
    if(spaces === null || Object.keys(spaces).length === 0) {
      throw new Error(`Cannot find yarn workspaces!`);
    }
    if(spaces.indexOf(selectedWorkspace) <0) {
      throw new Error(`Cannot find selected workspace ${selectedWorkspace}!`);
    }
    const cmds = getYarnWorkspaceCommands(selectedWorkspace);
    await cache.save([
      {
        key : "workspace",
        value: selectedWorkspace
      },
      {
        key : "workspace.commands",
        value: cmds
      }
    ]);
    return cmds;
};

const isValidWorkspaceCommand = async cmd => {
  const cmds = await cache.get("workspace.commands") || [];
  return cmds.indexOf(cmd) > -1;
};

const getDependencies = name => {
  const spaces = getYarnWorkspaces();
  const deps = spaces.filter( space => Array.isArray(inMemCachedWorkspaces[space].workspaceDependencies) && inMemCachedWorkspaces[space].workspaceDependencies.indexOf(name) > -1);
  if(getRootPackageDependencies().indexOf(name) > -1) {
    deps.push(rootPackageName);
  }
  if(deps.length >0) {
    return deps.reduce((acc,dep)=>({...acc, [dep]: getDependencies(dep)}),{});
  }

  return null;
}
const getDependencyTree = () => {
  const spaces = getYarnWorkspaces();
  const roots = spaces.filter( space => !Array.isArray(inMemCachedWorkspaces[space].workspaceDependencies)|| inMemCachedWorkspaces[space].workspaceDependencies.length === 0);
  if(roots.length >0) {
    const tree = roots.reduce((acc,dep)=>({...acc, [dep]: getDependencies(dep)}),{});
    console.log(treeify.asTree(tree, true));
  }
}

module.exports = {
  doChecks: ()=> {
    if(!isYarnInstalled()) {
      throw new Error('Cannot find yarn installed!');
    }
    const spaces = getYarnWorkspaces();
    if(spaces === null || Object.keys(spaces).length === 0) {
      throw new Error(`Cannot find yarn workspaces!`);
    }
  },
  getWorkspaces: getYarnWorkspaces,
  getSelectedWorkspace: () => cache.get("workspace"),
  setSelectedWorkspace,
  isValidWorkspaceCommand,
  showInfo: getDependencyTree
}