# `vscode-clearml-session-manager`

A VS Code extension for listing, creating, deleting, and connecting to [ClearML Sessions](https://github.com/allegroai/clearml-session#readme). ClearML is self-hostable and has a free SaaS-hosted plan, meaning you can get a world-class data science development environment for _free_.

> 💬 We're looking for contributors to prep for our first release! See the [contributing](#contributing) section below.

## Watch and learn

- 2-minute [explainer video](https://share.descript.com/view/pjgR4yC04ai?transcript=false) of why DS should develop on remote workstations
- 60-second demo video of how it works, so far [here](https://share.descript.com/view/g0SLQTN6kAk)

[![soundless demo](https://github.com/mlops-club/vscode-clearml-session-manager/assets/32227767/e3b408d5-01c2-45b2-b401-09eae0e21de8)](https://share.descript.com/view/g0SLQTN6kAk)


## How this extension fits into a Cloud or on-prem Architecture

<img width="600" alt="image" src="https://github.com/mlops-club/vscode-clearml-session-manager/assets/32227767/6f01df5a-2646-4716-aa00-bb88ae290fd0">

<img width="600" alt="image" src="https://github.com/mlops-club/vscode-clearml-session-manager/assets/32227767/e65d7e7d-ae81-4067-9384-ea0311d273e9">
<img width="600" alt="image" src="https://github.com/mlops-club/vscode-clearml-session-manager/assets/32227767/72a526d8-21b9-4831-9699-55a44284fd55">

## Contributing

### Running the extension locally

VS Code makes it really easy to run extensions and try out code changes:

1. be sure you have NodeJS installed, some had issues because they had the wrong Node version
2. go to the `src/extension.ts` file and press `F5` to start a debugging session 

### Getting up to speed on ClearML and writing VS Code Extensions

Here are a few videos with progress updates. Watching these will step you through how we learned about authoring VS Code extensions and how we got to where we are now.

1. ~30 min - [Announcing the hackathon project](https://share.descript.com/view/00uoQltZHWt)
2. ~30 min - [How we got the extension to work with the Python interpreteer by forking the `vscode-black-formatter` extension](https://share.descript.com/view/yH3tagRokS4)
3. ~45 min - [Everything we created/learned during the all-nighter hackathon](https://share.descript.com/view/DPuECWiE69B)
   - how to hit the ClearML API
   - how to read the `~/clearml.conf` file with TypeScript
   - how we decided to hit the ClearML API from TypeScript rather than Python
   - how we got the list items to show up in the sidebar
4. [Pull request](https://github.com/mlops-club/vscode-clearml-session-manager/pull/3): giving ClearML it's own "View Container" i.e. item
in the leftmost sidebar. And how we got our icons to show up
in all the right places.
4. ~5 min - [How we got VS Code to open a new window SSH'ed into an already-attached-to ClearML session](https://share.descript.com/view/dRoWrZI5NB3)

### Roadmap

> Items marked with ✨ are high-impact, and important for our first release

- [ ] Query the ClearML API to display the most useful data about each session
   - [ ] Total CPU cores
   - [ ] Public IP address of the worker
   - [ ] Private IP address of the worker
   - [ ] Total RAM
   - [ ] Queue name
   - [ ] Username/email of creator
   - [ ] Human-readable format of how long it's been alive, e.g. 1d 2h 5m
- [ ] Add support for `settings.json` settings including
   - [ ] `clearml.clearmlConfigFpath` (string), defaults to `~/clearml.conf`
      - [ ] if `clearml.clearmlConfigFpath` is not set, and `~/clearml.conf` does not exist, prompt the user with instructions to start their own ClearML backend server and run `clearml-init`
   - [ ] `clearml.sessionPresets` (array of objects), lets you your favorite sets of arguments to the `clearml-session` CLI
- [ ] Add a `+` button that allows you to create a ClearML session
   - [ ] Implement a way for users to define and select presets for `clearml-sessions`. Ideas:
      - [ ] Use something like `launch.json`, basically, have users define presets in a JSON file at `.vscode/clearml.json`
      - [ ] Have a UI form to collect user input for the `clearml-session` arguments, e.g. by using a `Webview`. Do API calls to provide the user with autocompletion on anything we can, e.g. for which queues are available
   - [ ] Start the `clearml-session` as a subprocess
   - [ ] Log the exact `clearml-session` command somewhere that the user can see (useful for debugging and learning)
   - [ ] Pop a message with a button allowing the user to follow along with the `clearml-session` logs
   - [ ] Parse the logs of the subprocess to detect
      - [ ] ✨ Failure: When the process is stuck in a retry loop because of SSH connectivity issues
         - [ ] ✨ React to failure by killing the subprocess (maybe after 3 retries) and alerting the user, offering to show them the logs
      - [ ] ✨ Success: Capture the connection host info, e.g. `ssh root@localhost -p 8022` and the password, e.g. `[password: pass]`
      - [ ] ✨ Success: the process hangs because the SSH tunnel has been left open
         - [ ] React to success by automatically opening a new VS Code window
- [ ] ✨ Add a `docker-compose.yaml` and instructions for hosting ClearML locally for development. Here's their [official reference compose file](https://github.com/allegroai/clearml-server/blob/master/docker/docker-compose.yml).
- [ ] Add automated tests
   - [ ] ✨ test API call logic by running the `docker-compose.yaml`
   - [ ] test parsing logic of the `clearml.conf` file
- [ ] Suggestion from ClearML: shutdown idle instances. Determine which are idle by querying for the host metrics, e.g. CPU utilization.
- [ ] ✨ Add a CI pipeline
   - [ ] formatting, so all contributed code is uniform
   - [ ] linting
   - [ ] testing
- [ ] ✨ Add a CD pipeline
   - [ ] learn how to publish a VS Code extension on the marketplace
   - [ ] enable that for key maintainers to manually approve before the release goes out after each PR

<!-- # clearml-session-manager README

This is the README for your extension "clearml-session-manager". After writing up a brief description, we recommend including the following sections.

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!** -->
