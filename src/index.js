#!/usr/bin/env node
const inquirer = require("inquirer");
const program = require("commander");
const updateDotenv = require("update-dotenv");
const { spawn } = require("child_process");
const yarnInfo = require("./yarn-info");

const selectWorkspace = async (app, withCmd, setenv) => {
  const spaces = await yarnInfo.getWorkspaces();
  const spaceNames = Object.keys(spaces).filter(name => {
    if (typeof app === "string" && app !== "" ) {
      return name.includes(app)
    }

    return true;
  });

  let choices = [];
  if (spaceNames.length > 1 && typeof withCmd === "string" && withCmd !== "") {
    choices = await Promise.all(
      spaceNames.map(async (space) => {
        const cmds = await yarnInfo.getWorkspaceCommands(space);
        if (cmds.indexOf(withCmd) > -1) {
          return {
            name: space,
            value: space,
          };
        } else {
          return null;
        }
      })
    );
    choices = choices.filter(Boolean);
  } else {
    choices = spaceNames.map((name) => ({
      name: name,
      value: name,
    }));
  }

  let workspace = null;

  if (choices.length != 1) {
    const result = await inquirer.prompt({
      type: "list",
      name: "workspace",
      message: "Select the workspace",
      choices,
    });
    workspace = result.workspace;
  } else {
    workspace = choices[0].value;
    console.log(`auto-selecting workspace: ${workspace}`);
  }

  const cmds = await yarnInfo.setSelectedWorkspace(workspace);
  if (Array.isArray(cmds) && cmds.length > 0) {
    console.log(`Project Commands in ${workspace}:\n• ${cmds.join("\n• ")}`);
  }
  if (setenv) {
    const location = spaces[workspace] ? spaces[workspace].location : "";
    const packageDir =
      location.split("/").length > 1 ? location.split("/")[1] : "";
    const selectWorkspaceInfo = {
      WORKSPACE: workspace,
      WORKSPACE_LOCATION: location,
      WORKSPACE_PACKAGE_DIR: packageDir,
      WORKSPACE_DEPENDENCIES:
        spaces[workspace] &&
        Array.isArray(spaces[workspace].workspaceDependencies)
          ? spaces[workspace].workspaceDependencies.join(", ")
          : "",
    };
    try {
      await updateDotenv(selectWorkspaceInfo);
      console.log(`.env updated successfully`);
    } catch (e) {
      console.log(
        `Error setting ".env" file. Please create ".env" file manually with \n ${selectWorkspaceInfo}`
      );
    }
  }
  return workspace;
};

const cleanExit = function () {
  process.exit();
};
process.on("SIGINT", cleanExit); // catch ctrl-c
process.on("SIGTERM", cleanExit); // catch kill

(async function Main() {
  await yarnInfo.doChecks();

  await program
    .command("use")
    .description("Set Workspace")
    .option("-a, --app <app name>", "Select an app", "")
    .option("-e, --setenv", "Set env file", false)
    .option(
      "-w, --with <command name>",
      "Only select workspace with given command name",
      ""
    )
    .action(async (options) => {
      console.log(`Finding workspaces ...`);
      await selectWorkspace(options.app, options.with, !!options.setenv);
    });

  await program
    .command("info")
    .description("Show Selected Workspace Information")
    .action(async () => {
      let workspace = await yarnInfo.getSelectedWorkspace();
      if (workspace) {
        console.log(`Current Workspace: ${workspace}`);
        const cmds = await yarnInfo.getSelectedWorkspaceCommands();
        if (Array.isArray(cmds) && cmds.length > 0) {
          console.log(
            `Project Commands in ${workspace}:\n• ${cmds.join("\n• ")}`
          );
        }
      } else {
        console.log(`You do not have any workspace selected!`);
      }
    });

  await program
    .command("tree")
    .description("Show Workspace Dependency Tree")
    .action(async () => {
      console.log("Workspace Dependency Tree:");
      yarnInfo.showInfo();
    });

  program.arguments("<cmd> [env]").action(async () => {
    if (program.args && program.args.length > 0) {
      let workspace = await yarnInfo.getSelectedWorkspace();
      if (!workspace) {
        workspace = await selectWorkspace();
      }
      const cmd = program.args[0];
      //exec
      spawn("yarn", ["workspace", workspace, ...program.args], {
        stdio: "inherit",
        env: process.env,
      });
    } else {
      console.log("Error Missing command name.", program.args);
    }
  });
  program.parse(process.argv);
})();
