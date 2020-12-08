import {
    createConnection,
    TextDocuments,
    Diagnostic,
    DiagnosticSeverity,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    CompletionItem,
    TextDocumentSyncKind,
    InitializeResult,
    CompletionItemKind,
    TextDocumentPositionParams,
    Location,
    Declaration,
    Range,
    Position,
    NotificationType
} from 'vscode-languageserver';

import {
    TextDocument
} from 'vscode-languageserver-textdocument';
import { Lexer } from './lexer';
import { DeclarationType, Parser } from './parse';
import { TokenType } from './utils';

let connection = createConnection(ProposedFeatures.all);

let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;

let parser: Parser;

function handleCompletionItem(data: number, item: (CompletionItem | undefined)): CompletionItem {
    if (item == undefined)
        item = CompletionItem.create('new');

        return item;
}

connection.onInitialize((params: InitializeParams) => {
    let capabilities = params.capabilities;

    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            definitionProvider: true,
            completionProvider: {
                resolveProvider: true
            }
       }
    };
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true
            }
        };
    }

    return result;
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            
        });
    }
});

documents.onDidSave(doc => {
    let lexer: Lexer = new Lexer(doc.document.getText());
    parser = new Parser(lexer);

    connection.window.showInformationMessage("Parsing File...");

    while (parser.current.type != TokenType.SENEGAL_EOF && parser != undefined) {
        parser.parseDeclarationOrStatement();
    }

    validateTextDocument(doc.document);
});

documents.onDidOpen(doc => {
    let lexer: Lexer = new Lexer(doc.document.getText());
    parser = new Parser(lexer);

    connection.window.showInformationMessage("Parsing File...");

    while (parser.current.type != TokenType.SENEGAL_EOF && parser != undefined) {
        parser.parseDeclarationOrStatement();
    }

    validateTextDocument(doc.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    let diagnostics: Diagnostic[] = [];

    diagnostics.push({
        severity: DiagnosticSeverity.Hint,
        range: {
            start: textDocument.positionAt(0),
            end: textDocument.positionAt(1),
        },
        message: parser.declarations.size.toString()
    });

    parser.errors.forEach((e) => {
        diagnostics.push(
            {
                severity: e.severity,
                range: {
                    start: textDocument.positionAt(e.start),
                    end: textDocument.positionAt(e.end)
                },
                message: e.msg,
                source: textDocument.uri.substring(textDocument.uri.lastIndexOf("/") + 1)
            }
        );
    });

    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onCompletion(
    (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {

        let tempCompletionItems = [];

        parser.declarations.forEach((d, k) => {
            let declarationType: CompletionItemKind;

            switch(d.type) {
                case DeclarationType.VAR:
                    declarationType = CompletionItemKind.Function;
                    break;

                case DeclarationType.FUNCTION:
                    declarationType = CompletionItemKind.Function;

                case DeclarationType.CLASS:
                    declarationType = CompletionItemKind.Class;
            }
            tempCompletionItems.push(
                {label: d.id, kind: declarationType, data: tempCompletionItems.length}
            );
        });


        return tempCompletionItems;
    }
);

connection.onCompletionResolve(
    (item: CompletionItem): CompletionItem => {
        return handleCompletionItem(item.data, item);
    }
);

connection.onDefinition((tdPos: TextDocumentPositionParams): Location[] => {
    let locations: Location[] = [];

    let idPattern = /[a-zA-Z_][a-zA-Z0-9_]*/;

    let doc = documents.get(tdPos.textDocument.uri)!;

    let id = idPattern.exec(doc.getText().substring(doc.offsetAt(Position.create(tdPos.position.line, 0))))[0];

    while (id.length < tdPos.position.character) {
        id = idPattern.exec(doc.getText().substring(doc.offsetAt(Position.create(tdPos.position.line, id.length))))[0];
    }

    parser.declarations.forEach((d, k) => {
        if (k.match(id)) {
            locations.push(Location.create(
                tdPos.textDocument.uri,
                {
                  start: Position.create(d.line, d.char),
                  end: Position.create(d.line, d.char)
                }
            ));
        }
    });

    return locations;
})

documents.listen(connection);

connection.listen();