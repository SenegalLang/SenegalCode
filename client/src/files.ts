import vscode = require('vscode');
import fg = require('fast-glob');
import path = require('path');

export function getSenegalFiles(): Thenable<string[][]> {
    const promises = [];

    vscode.workspace.workspaceFolders.forEach(wsFolder => {
        const globalSenegalFilesPath = path.join(wsFolder.uri.fsPath, '**', '*.sgl');

        promises.push(fg.async([globalSenegalFilesPath]));
    });

    return Promise.all(promises);
}

export function getSenegalFile(filePath: string): Thenable<string[]> {
    return fg.async(filePath);
}
