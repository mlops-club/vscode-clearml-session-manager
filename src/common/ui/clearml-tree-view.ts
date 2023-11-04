import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Task } from '../clearml/models/tasks';
import { fetchInteractiveSessions } from '../clearml/fetch-interactive-sessions';

export class ClearMlSessionsTreeDataProvider implements vscode.TreeDataProvider<ClearmlSession> {
  constructor(private workspaceRoot: string, public interactiveSessions: Task[] = []) {}

  private _onDidChangeTreeData: vscode.EventEmitter<ClearmlSession | undefined | null | void> = new vscode.EventEmitter<ClearmlSession | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ClearmlSession | undefined | null | void> = this._onDidChangeTreeData.event;

  async refresh(): Promise<void> {
    this.interactiveSessions = await fetchInteractiveSessions();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ClearmlSession): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ClearmlSession): Thenable<ClearmlSession[]> {
    console.log('getChildren, element: ', element);

    if (!element) {
        return Promise.resolve(
          this.interactiveSessions.map((session: Task) => new ClearmlSession(
            session.id,
            session.user.name,
            vscode.TreeItemCollapsibleState.None,
            1
          ))
        )
    }

    return Promise.resolve([]);

    
    // if (!this.workspaceRoot) {
    //   vscode.window.showInformationMessage('No dependency in empty workspace');
    //   return Promise.resolve([]);
    // }

    // if (element) {
    //   return Promise.resolve(
    //     this.getDepsInPackageJson(
    //       path.join(this.workspaceRoot, 'node_modules', element.label, 'package.json')
    //     )
    //   );
    // } else {
    //   const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
    //   if (this.pathExists(packageJsonPath)) {
    //     return Promise.resolve(this.getDepsInPackageJson(packageJsonPath));
    //   } else {
    //     vscode.window.showInformationMessage('Workspace has no package.json');
    //     return Promise.resolve([]);
    //   }
    // }
  }

  /**
   * Given the path to package.json, read all its dependencies and devDependencies.
   */
  private getDepsInPackageJson(packageJsonPath: string): ClearmlSession[] {
    if (this.pathExists(packageJsonPath)) {
      const toDep = (moduleName: string, version: string): ClearmlSession => {
        if (this.pathExists(path.join(this.workspaceRoot, 'node_modules', moduleName))) {
          return new ClearmlSession(
            moduleName,
            version,
            vscode.TreeItemCollapsibleState.Collapsed,
            1
          );
        } else {
          return new ClearmlSession(moduleName, version, vscode.TreeItemCollapsibleState.None, 1);
        }
      };

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      const deps = packageJson.dependencies
        ? Object.keys(packageJson.dependencies).map(dep =>
            toDep(dep, packageJson.dependencies[dep])
          )
        : [];
      const devDeps = packageJson.devDependencies
        ? Object.keys(packageJson.devDependencies).map(dep =>
            toDep(dep, packageJson.devDependencies[dep])
          )
        : [];
      return deps.concat(devDeps);
    } else {
      return [];
    }
  }

  private pathExists(p: string): boolean {
    try {
      fs.accessSync(p);
    } catch (err) {
      return false;
    }
    return true;
  }
}

class ClearmlSession extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    private version: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly depth: number,
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}-${this.version}`;
    this.description = this.version;
    this.depth = depth;
  }

  iconPath = {
    light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
    dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
  };

  
}
