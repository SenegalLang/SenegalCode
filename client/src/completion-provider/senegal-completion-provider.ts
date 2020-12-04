import {
    CompletionItemProvider,
    TextDocument,
    Position,
    CancellationToken,
    CompletionContext,
    ProviderResult,
    CompletionItem,
    CompletionList,
    Range
} from 'vscode';
import { CompletionItemKind, CompletionTriggerKind } from 'vscode-languageclient';
import { SenegalDefinitionProvider } from '../definition-provider/senegal-definition-provider';
import { VariablePathMap } from '../interfaces';

export class SenegalCompletionProvider implements CompletionItemProvider {
    private senegalDefinitionProvider: SenegalDefinitionProvider;

    constructor (senegalDefinitionProvider: SenegalDefinitionProvider) {
        this.senegalDefinitionProvider = senegalDefinitionProvider;
    }

    public provideCompletionItems (document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): ProviderResult<CompletionList> {
        return new Promise((resolve) => {
            if (token.isCancellationRequested) {
                resolve(null);
            }

            const wordRange:Range = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_]*/);
            const items = this.getCompletionItemsData(document.getText(wordRange));


            resolve(new CompletionList(
                
                items.map(
                    variableName => this.buildCompletionItem(variableName)
                ),
                    false
                ));

 

            resolve(null);
        });
    }

    private buildCompletionItem (variableName: string): CompletionItem {
        return {
            label: variableName,
            kind: CompletionItemKind.Function,
            insertText: variableName
        } as CompletionItem;
    }

    private getCompletionItemsData (variableNameStart: string): string[] {
        const definitionList: VariablePathMap = this.senegalDefinitionProvider.getDefinitionList();

        if (!definitionList) {
            return [];
        }

        return Object.keys(definitionList).filter(variableName => variableName.startsWith(variableNameStart));
    }
}