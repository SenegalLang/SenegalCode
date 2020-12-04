import vscode = require('vscode');
import { VariablePathMap, VariablePathDescription } from '../interfaces';
import { parseFiles, parseFile } from './parse';


function createLocation(definitionInfo: VariablePathDescription) {
    if (definitionInfo == null || definitionInfo.path == null) { return null; }

    const definitionResource = vscode.Uri.file(definitionInfo.path);
    const pos = new vscode.Position(definitionInfo.line, 1);

    return new vscode.Location(definitionResource, pos);
}

export class SenegalDefinitionProvider implements vscode.DefinitionProvider {
    private variablePathMap: VariablePathMap;

    public parseWorkspaceFolders (wsFolders: string[][]): void {
        this.variablePathMap = parseFiles(wsFolders);
    }

    public parseSingleFile (documentPath: string): void {
        this.removeRecordsWithPath(documentPath);
        parseFile(documentPath, this.variablePathMap);
    }

    public provideDefinition (document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        Thenable<vscode.Location>  {
        if (!this.variablePathMap) {
            return Promise.resolve(null);
        }

        return this.definitionLocation(document, position)
            .then(definitionInfo => {
                if (definitionInfo) {
                    return definitionInfo.map(info => createLocation(info));
                }

                return null;
            }, err => {
                if (err) {
                    return Promise.reject(err);
                }
                return Promise.resolve(null);
            });
    }

    public getDefinitionList (): VariablePathMap {
        return JSON.parse(JSON.stringify(this.variablePathMap));
    }

    private removeRecordsWithPath (filePath: string): void {
        Object.keys(this.variablePathMap).forEach(key => {
            this.variablePathMap[key] = this.variablePathMap[key].filter(
                pathDescription => pathDescription.path !== filePath
            );
        });
    }

    private definitionLocation (document: vscode.TextDocument, position: vscode.Position): Promise<VariablePathDescription[]> {
        const wordRange: vscode.Range = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_]*/m);
        const lineText: string = document.lineAt(position.line).text;
        const variableToSearchFor: string = document.getText(wordRange);
        const variableData: VariablePathDescription[] = this.getVariableDescription(variableToSearchFor, document);

        if (!wordRange || lineText.startsWith('//')) {
            return Promise.resolve(null);
        }

        if (position.isEqual(wordRange.end) && position.isAfter(wordRange.start)) {
            position = position.translate(0, -1);
        }

        return Promise.resolve(variableData);
    }

    private getVariableDescription (variableToSearchFor: string, document: vscode.TextDocument): VariablePathDescription[]  {
        return this.variablePathMap[variableToSearchFor];
    }
}