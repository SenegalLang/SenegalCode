import * as path from 'path';
import * as vscode from 'vscode';

import {getSenegalFile, getSenegalFiles} from './files'

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';
import { SenegalDefinitionProvider } from './definition-provider/senegal-definition-provider';
import { SenegalCompletionProvider } from './completion-provider/senegal-completion-provider';

let client: LanguageClient;

const senegalDefProvider = new SenegalDefinitionProvider();
const senegalCompletionProvider = new SenegalCompletionProvider(senegalDefProvider);

const senegalDocFilter: vscode.DocumentFilter = {
    language: 'sgl',
    scheme: 'file'
};

export function activate(context: vscode.ExtensionContext) {
	let serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	let clientOptions: LanguageClientOptions = {
		documentSelector: [{ scheme: 'file', language: 'sgl' }],
		synchronize: {
			fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	client = new LanguageClient('sgl', 'Sgl Server', serverOptions, clientOptions);

	registerProviders(context);
	initalizeProviders();

	vscode.workspace.onDidSaveTextDocument(e => {
        getSenegalFile(e.uri.fsPath)
            .then(file => {
                const filePath: string = file[0] as string;
                senegalDefProvider.parseSingleFile(filePath);
            });
    }, null, context.subscriptions);

	client.start();
}

function registerProviders (context: vscode.ExtensionContext): void {
	context.subscriptions.push(vscode.languages.registerDefinitionProvider(senegalDocFilter, senegalDefProvider));
	context.subscriptions.push(vscode.languages.registerCompletionItemProvider(senegalDocFilter, senegalCompletionProvider, "."));
}

function initalizeProviders (): void {
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Senegal File Support',
        cancellable: false
    }, (progress: vscode.Progress<{increment?: number, message?: string}>, token: vscode.CancellationToken) => {
        progress.report({ message: 'Parsing workspace...' });

        return new Promise((resolve, reject) => {
            if (token.isCancellationRequested) {
                reject();
            }

            getSenegalFiles().then(wsFolders => {
                    senegalDefProvider.parseWorkspaceFolders(wsFolders);
                    resolve();
                });
        });
    });
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}