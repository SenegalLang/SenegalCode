import linenumber = require('linenumber');
import fs = require('fs');
import { VariablePathMap, VariablePathDescription } from '../interfaces';

function insertElementWithKey (variableName: string, element: VariablePathDescription, allVariablePathMaps: VariablePathMap): void {
    if (Array.isArray(allVariablePathMaps[variableName])) {
        allVariablePathMaps[variableName].push(element);
    } else {
        allVariablePathMaps[variableName] = new Array(element);
    }
}

export function parseFile (file: string, allVariablePathMaps: VariablePathMap) {
    const variablePattern: RegExp = /\s*var\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*/g;
    const classPattern: RegExp = /\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{.*\}/gm;
    const functionPattern: RegExp = /\s*function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(.*\)\s*\{.*\}/gm;
    let n: RegExpExecArray;

    const content: string = fs.readFileSync(file, 'utf8');

    while (n = variablePattern.exec(content)) {
        const lineNum = linenumber(content, n[0]);
        const variableName: string = n[1];

        const newItem: VariablePathDescription = {
            path: file,
            line: lineNum
        };

        insertElementWithKey(variableName, newItem, allVariablePathMaps);
    }

    while (n = classPattern.exec(content)) {
        const lineNum = linenumber(content, n[0]);
        const className: string = n[1];

        const newItem: VariablePathDescription = {
            path: file,
            line: lineNum
        };

        insertElementWithKey(className, newItem, allVariablePathMaps);
    }

    while (n = functionPattern.exec(content)) {
        const lineNum = linenumber(content, n[0]);
        const functionName: string = n[1];

        const newItem: VariablePathDescription = {
            path: file,
            line: lineNum
        };

        insertElementWithKey(functionName, newItem, allVariablePathMaps);
    }
}

export function parseFiles (wsFolders): VariablePathMap {
    const allVariablePathMaps: VariablePathMap = {};

    wsFolders.forEach(
        files => files.forEach(
            file => parseFile(file, allVariablePathMaps)
        )
    );

    return allVariablePathMaps;
}