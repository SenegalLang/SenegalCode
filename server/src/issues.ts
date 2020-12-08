import {
    DiagnosticSeverity,
} from 'vscode-languageserver';

export interface Issue {
	severity: DiagnosticSeverity,
	pattern: RegExp,
	message: string,
	start?: number,

}

export const issues: Issue[] = [
	{ severity: DiagnosticSeverity.Warning, pattern: /\/\/[^\n]*(TO ?DO)/ig, message: 'needs to be worked on'},

	{ severity: DiagnosticSeverity.Warning, pattern: /(?:class)\s+([a-z])/g, message: 'class identifiers should be UpperCamelCase', start: 5},
	{ severity: DiagnosticSeverity.Warning, pattern: /(?:var|function)\s+([A-Z])/g, message: 'variable and function identifiers should be lowerCamelCase'},

	{ severity: DiagnosticSeverity.Error, pattern: /var\s+[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*(;)/gm, message: 'Senegal expected an expression'},
	{ severity: DiagnosticSeverity.Error, pattern: /var\s*(=\s*.+);/gm, message: 'Senegal expected a variable identifier'},
	{ severity: DiagnosticSeverity.Error, pattern: /var\s+[a-zA-Z_][a-zA-Z0-9_]*\s*([^=]+);/gm, message: 'Senegal expected an equal sign'},
	
	{ severity: DiagnosticSeverity.Error, pattern: /[a-zA-Z_][a-zA-Z0-9_]*\s*\(.+(,)\)/gm, message: 'Unexpected trailing comma'},

];