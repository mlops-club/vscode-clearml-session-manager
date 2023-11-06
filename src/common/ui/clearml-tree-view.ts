import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Task } from '../clearml/models/tasks';
import { fetchInteractiveSessions } from '../clearml/fetch-interactive-sessions';

export class ClearMlSessionsTreeDataProvider implements vscode.TreeDataProvider<ClearmlSession | vscode.TreeItem> {
  constructor(private workspaceRoot: string, public interactiveSessions: Task[] = []) { }

  private _onDidChangeTreeData: vscode.EventEmitter<ClearmlSession | undefined | null | void> = new vscode.EventEmitter<ClearmlSession | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ClearmlSession | undefined | null | void> = this._onDidChangeTreeData.event;

  async refresh(): Promise<void> {
    this.interactiveSessions = await fetchInteractiveSessions();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ClearmlSession): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ClearmlSession): Thenable<ClearmlSession[] | vscode.TreeItem[]> {
    console.log('getChildren, element: ', element);

    // when the tree view is first opened, element is undefined. This means
    // this function needs to return the top-level items.
    if (!element) {
      return Promise.resolve(
        this.interactiveSessions.map((session: Task) => new ClearmlSession(
          `Session ID: ${session.id.slice(0, 8)}`,
          session.name,
          vscode.TreeItemCollapsibleState.Collapsed,
          1,
          session.project.id,
          session.id,
          session.comment,
        ))
      )
    }

    // otherwise, the element is a ClearmlSession, so expanding it should reveal
    // a list of its details. We show the details as tree items nested underneath.
    const clearmlSessionDetails: vscode.TreeItem[] = (element as ClearmlSession).getClearmlSessionDetailsAsTreeItems();
    return Promise.resolve(clearmlSessionDetails);
  }
}

export class ClearmlSession extends vscode.TreeItem {

  iconPath = {
    light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
    dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
  };

  constructor(
    public readonly label: string,
    private version: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly depth: number,
    public readonly projectId: string,
    public readonly taskId: string,
    public readonly comment: string
  ) {
    super(label, collapsibleState);
    this.description = this.version;
    this.depth = depth;
    this.projectId = projectId;
    this.taskId = taskId;
    this.tooltip = `
    Comment: ${this.comment}
    Project ID: ${this.projectId}
    Task ID: ${this.taskId}
    `
  }

  getClearmlSessionDetailsAsTreeItems = (): vscode.TreeItem[] => {
    
    
    const makeTreeItem = (label: string, description: string): vscode.TreeItem => {
      const treeItem = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
      treeItem.description = description;
      return treeItem;
    }


    return [
      makeTreeItem(`Project ID`, this.projectId),
      makeTreeItem(`Task ID`, this.taskId),
      makeTreeItem(`Comment`, this.comment),
    ]
  }
}