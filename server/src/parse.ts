import { DiagnosticSeverity } from 'vscode-languageserver';
import {coreDeclarations, FunctionTypes, Local, ParseFunc, ParseRule, Precedence, Token, TokenType} from './utils'
import { Lexer } from './lexer';

export enum DeclarationType {
    FUNCTION,
    CLASS,
    VAR
}

export interface Declaration {
    type: DeclarationType,
    line: number,
    char: number,
    id: string
}

export interface Error {
    line: number,
    start: number,
    end: number,
    msg: string,
    severity: DiagnosticSeverity
}

export class Parser {

    rules: Map<TokenType, ParseRule>;
    lexer: Lexer;
    previous: Token;
    current: Token;

    locals: Local[] = [];
    depth: number = 0;

    inLoop: boolean = false;
    deepestLoopDepth: number = 0;

    inClass: boolean = false;
    hasSuper: boolean = false;

    type: FunctionTypes = FunctionTypes.GLOBAL;

    declarations: Map<String, Declaration> = coreDeclarations;
    errors: Error[] = [];

    constructor(lexer: Lexer) {
        this.lexer = lexer;
        this.previous = this.current = this.lexer.getNextToken();

        this.rules = new Map([
            [TokenType.SENEGAL_LPAREN, {prefix: this.parseGroup, infix: this.parseFunctionCall, precedence: Precedence.CALL}],
            [TokenType.SENEGAL_RPAREN, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_LBRACE, {prefix: this.parseMap, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_RBRACE, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_LBRACKET, {prefix: this.parseList, infix: this.parseAccess, precedence: Precedence.CALL}],
            [TokenType.SENEGAL_RBRACKET, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_COMMA, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_COLON, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_CASE, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_DEFAULT, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_SWITCH, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_DOT, {prefix: this.skip, infix: this.parseDot, precedence: Precedence.CALL}],
            [TokenType.SENEGAL_MINUS, {prefix: this.parseUnary, infix: this.parseBinary, precedence: Precedence.TERM}],
            [TokenType.SENEGAL_MINUS_EQUAL, {prefix: this.skip, infix: this.skip, precedence: Precedence.TERM}],
            [TokenType.SENEGAL_MINUS_MINUS, {prefix: this.skip, infix: this.skip, precedence: Precedence.TERM}],
            [TokenType.SENEGAL_PLUS, {prefix: this.skip, infix: this.parseBinary, precedence: Precedence.TERM}],
            [TokenType.SENEGAL_PLUS_EQUAL, {prefix: this.skip, infix: this.skip, precedence: Precedence.TERM}],
            [TokenType.SENEGAL_PLUS_PLUS, {prefix: this.skip, infix: this.skip, precedence: Precedence.TERM}],
            [TokenType.SENEGAL_QUESTION, {prefix: this.skip, infix: this.parseTernary, precedence: Precedence.ASSIGNMENT}],
            [TokenType.SENEGAL_SEMI, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_SLASH, {prefix: this.skip, infix: this.parseBinary, precedence: Precedence.FACTOR}],
            [TokenType.SENEGAL_SLASH_EQUAL, {prefix: this.skip, infix: this.skip, precedence: Precedence.FACTOR}],
            [TokenType.SENEGAL_STAR, {prefix: this.skip, infix: this.parseBinary, precedence: Precedence.FACTOR}],
            [TokenType.SENEGAL_STAR_EQUAL, {prefix: this.skip, infix: this.skip, precedence: Precedence.FACTOR}],
            [TokenType.SENEGAL_STAR_STAR, {prefix: this.skip, infix: this.skip, precedence: Precedence.FACTOR}],
            [TokenType.SENEGAL_BANG, {prefix: this.parseUnary, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_BANG_EQUAL, {prefix: this.skip, infix: this.parseBinary, precedence: Precedence.EQUALITY}],
            [TokenType.SENEGAL_EQUAL, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_EQUAL_EQUAL, {prefix: this.skip, infix: this.parseBinary, precedence: Precedence.EQUALITY}],
            [TokenType.SENEGAL_GREATER, {prefix: this.skip, infix: this.parseBinary, precedence: Precedence.COMPARISON}],
            [TokenType.SENEGAL_GREATER_GREATER, {prefix: this.skip, infix: this.parseBinary, precedence: Precedence.BIT_SHIFT}],
            [TokenType.SENEGAL_GREATER_EQUAL, {prefix: this.skip, infix: this.parseBinary, precedence: Precedence.ASSIGNMENT}],
            [TokenType.SENEGAL_LESSER, {prefix: this.skip, infix: this.parseBinary, precedence: Precedence.COMPARISON}],
            [TokenType.SENEGAL_LESSER_LESSER, {prefix: this.skip, infix: this.parseBinary, precedence: Precedence.BIT_SHIFT}],
            [TokenType.SENEGAL_LESSER_EQUAL, {prefix: this.skip, infix: this.parseBinary, precedence: Precedence.ASSIGNMENT}],
            [TokenType.SENEGAL_ID, {prefix: this.parseIdentifier, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_STRING, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_NUMBER, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_HEX, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_AMP, {prefix: this.skip, infix: this.parseBinary, precedence: Precedence.BIT_AND}],
            [TokenType.SENEGAL_AMP_AMP, {prefix: this.skip, infix: this.parseAnd, precedence: Precedence.PREC_AND}],
            [TokenType.SENEGAL_CLASS, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_CARET, {prefix: this.skip, infix: this.parseBinary, precedence: Precedence.BIT_XOR}],
            [TokenType.SENEGAL_ELSE, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_FALSE, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_FOR, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_FUNCTION, {prefix: this.skip, infix: this.skip, precedence: Precedence. NONE}],
            [TokenType.SENEGAL_IF, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_NULL, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_PIPE, {prefix: this.skip, infix: this.parseBinary, precedence: Precedence.BIT_OR}],
            [TokenType.SENEGAL_PIPE_PIPE, {prefix: this.skip, infix: this.parseOr, precedence: Precedence.PREC_OR}],
            [TokenType.SENEGAL_RETURN, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_SUPER, {prefix: this.parseSuper, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_THIS, {prefix: this.parseThis, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_TILDE, {prefix: this.parseUnary, infix: this.skip, precedence: Precedence.UNARY}],
            [TokenType.SENEGAL_TRUE, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_VAR, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_WHILE, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_ERROR, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}],
            [TokenType.SENEGAL_EOF, {prefix: this.skip, infix: this.skip, precedence: Precedence.NONE}]
        ]);
    }

    private check(type: TokenType): boolean {
        return this.current.type == type;
    }

    public match(type: TokenType): boolean {
        if (!this.check(type))
            return false;

        this.advance();
        return true;
    }

    public parseDeclarationOrStatement() {
        let isFinal: boolean = this.match(TokenType.SENEGAL_FINAL);

        if (this.match(TokenType.SENEGAL_CLASS)) {
            // parse class
        } else if (this.match(TokenType.SENEGAL_FUNCTION)) {
            // parse function
        } else if (this.match(TokenType.SENEGAL_VAR)) {
            this.parseVariableDeclaration();
        } else {
            this.parseStatement();
        }
    }

    private parseStatement() {
        switch(this.current.type) {
            case TokenType.SENEGAL_BREAK: {
                this.advance();
                if (!this.inLoop)
                    this.error(this.previous, "Unable to break outside loops", DiagnosticSeverity.Error);

                this.consume(TokenType.SENEGAL_SEMI, "Expected ;");

                break;
            }

            case TokenType.SENEGAL_CONTINUE: {
                this.advance();

                if (!this.inLoop)
                    this.error(this.previous, "Unable to continue outside loops", DiagnosticSeverity.Error);

                this.consume(TokenType.SENEGAL_SEMI, "Expected ;");
                
                break;
            }

            case TokenType.SENEGAL_LBRACE:
                this.advance();
                this.startScope();
                this.parseBlock();
                this.endScope();
                break;

            case TokenType.SENEGAL_IF: {
                this.advance();
                this.consume(TokenType.SENEGAL_LPAREN, "Expected (");
                
                // Condition
                this.parseExpression();
                
                this.consume(TokenType.SENEGAL_RPAREN, "Expected )");
                
                this.parseStatement();

                if (this.match(TokenType.SENEGAL_ELSE))
                    this.parseStatement();

                break;
            }

            case TokenType.SENEGAL_RETURN: {
                this.advance();

                if (this.type == FunctionTypes.GLOBAL)
                    this.error(this.previous, "Cannot return from global scope.",  DiagnosticSeverity.Error);

                if (!this.match(TokenType.SENEGAL_SEMI)) {
                    if (this.type == FunctionTypes.CONSTRUCTOR)
                        this.error(this.previous, "Cannot return from a constructor.", DiagnosticSeverity.Error);

                    this.parseExpression();
                    this.consume(TokenType.SENEGAL_SEMI, "Expected ;");
                }

                break;
            }

            // TODO
            case TokenType.SENEGAL_SWITCH: {}

            case TokenType.SENEGAL_WHILE: {
                this.advance();

                let enclosingDepth: number = this.deepestLoopDepth;
                this.inLoop = true;
                this.deepestLoopDepth = this.depth;

                this.consume(TokenType.SENEGAL_LPAREN, "Expected (");
                this.parseExpression();
                this.consume(TokenType.SENEGAL_RPAREN, "Expected )");

                this.parseStatement();

                this.inLoop = false;
                this.deepestLoopDepth = enclosingDepth;
                break;
            }

            case TokenType.SENEGAL_FOR: {
                this.advance();
                this.startScope();

                this.consume(TokenType.SENEGAL_LPAREN, "Expected (");

                if (this.match(TokenType.SENEGAL_VAR)) {
                    this.parseVariableDeclaration();
                } else if (!this.match(TokenType.SENEGAL_SEMI)) {
                    this.parseExpressionStatement();
                }

                let enclosingDepth: number = this.deepestLoopDepth;
                this.inLoop = true;
                this.deepestLoopDepth = this.depth;

                if (!this.match(TokenType.SENEGAL_SEMI)) {
                    this.parseExpression();
                    this.consume(TokenType.SENEGAL_SEMI, "Expected ;");
                }

                if (!this.match(TokenType.SENEGAL_RPAREN)) {
                    this.parseExpression();
                    this.consume(TokenType.SENEGAL_RPAREN, "Expected )");
                }

                this.parseStatement();

                this.inLoop = false;
                this.deepestLoopDepth = enclosingDepth;
                this.endScope();
                break;
            }

            default:
                this.parseExpressionStatement();
                break;
        }
    }

    private parseExpressionStatement() {
        this.parseExpression();
        this.consume(TokenType.SENEGAL_SEMI, "Expected ;");
    }

    private startScope() {
        this.depth++;
    }

    private parseBlock() {
        while (!this.check(TokenType.SENEGAL_RBRACE) && !this.check(TokenType.SENEGAL_EOF))
            this.parseDeclarationOrStatement();

        this.consume(TokenType.SENEGAL_RBRACE, "Expected block to be closed by }");
    }

    private endScope() {
        this.depth--;
    }

    private parseVariableDeclaration() {
        this.parseVariable("Expected an identifier.");
        
        if (this.match(TokenType.SENEGAL_EQUAL))
        this.parseExpression();
        
        this.consume(TokenType.SENEGAL_SEMI, `Expected ;`);
        this.defineVariable();
    }

    private parseVariable(msg: string) {
        this.consume(TokenType.SENEGAL_ID, msg);
        this.declareVariable();
    }

    private declareVariable() {
        let id: Token = this.previous;

        if (!this.declarations.has(id.value))
            this.declare(id, DeclarationType.VAR);

        if (this.depth == 0)
            return;


        for (let i: number = this.locals.length - 1; i >= 0; i--) {
            let local: Local = this.locals[i];

            if (local.depth != -1 && local.depth < this.depth)
                break;

            if (id.value == local.id.value)
                this.error(this.current, "Redeclaring existent variable", DiagnosticSeverity.Error);
        }

        this.addLocal(id);
    }

    private addLocal(id: Token) {
        this.locals.push(
            {id: id, depth: -1, isCaptured: false}
        );
    }

    private defineVariable() {
        if (this.depth == 0)
            return;

        this.locals[this.locals.length - 1].depth = this.depth;
    }

    private parseExpression() {
        this.parsePrecedence(Precedence.ASSIGNMENT)
    }

    private parsePrecedence(precedence: Precedence) {
        this.advance();

        if (this.previous.type == TokenType.SENEGAL_ERROR)
            this.error(this.previous, this.previous.value, DiagnosticSeverity.Error);

        const prefixRule: ParseFunc = this.rules.get(this.previous.type).prefix;

        if (prefixRule == null) {
            this.error(this.previous, "Expected an expression", DiagnosticSeverity.Error);
            return;
        }

        const canAssign: boolean = precedence <= Precedence.ASSIGNMENT;
        prefixRule(this, canAssign);

        while (precedence <= this.rules.get(this.current.type).precedence) {
            this.advance();

            if (this.previous.type == TokenType.SENEGAL_ERROR)
                this.error(this.previous, this.previous.value, DiagnosticSeverity.Error);

            const infixRule: ParseFunc = this.rules.get(this.previous.type).infix;
            infixRule(this, canAssign);
        }

        if (canAssign && this.match(TokenType.SENEGAL_EQUAL)) {
            this.error(this.previous, "Invalid assignment target", DiagnosticSeverity.Error);
        }
    }

    private parseGroup(parser: Parser, canAssign: boolean) {
        parser.parseExpression();
        parser.consume(TokenType.SENEGAL_LPAREN, "Expected group to be closed by a )");
    }

    private parseFunctionCall(parser: Parser, canAssign: boolean) {
        parser.argumentList();
    }

    private argumentList(): number {
        let argCount: number = 0;

        if (!this.check(TokenType.SENEGAL_RPAREN)) {
            do {
                this.parseExpression();

                if (argCount == 255)
                    this.error(this.previous, "Too many function call arguments", DiagnosticSeverity.Error);

                argCount++;
            } while(this.match(TokenType.SENEGAL_COMMA));
        }

        this.consume(TokenType.SENEGAL_RPAREN, "Expected function call to be followed by )");
        return argCount;
    }

    private parseMap(parser: Parser, canAssign: boolean) {
        parser.match(TokenType.SENEGAL_LBRACE);

        do {
            // Key
            parser.parseExpression();

            parser.consume(TokenType.SENEGAL_COLON, "Expected colon after key.");

            // Value
            parser.parseExpression();
        } while (parser.match(TokenType.SENEGAL_COMMA));

        parser.consume(TokenType.SENEGAL_RBRACE, "Expected Map initialization to be closed with }.");
    }

    private parseList(parser: Parser, canAssign: boolean) {
        parser.match(TokenType.SENEGAL_LBRACKET);

        do {
            // Elements
            parser.parseExpression();
        } while (parser.match(TokenType.SENEGAL_COMMA));

        parser.consume(TokenType.SENEGAL_RBRACKET, "Expected List initialization to be closed with ].");
    }

    private skip(parser: Parser, canAssign: boolean) {}

    private parseAccess(parser: Parser, canAssign: boolean) {
        parser.parseExpression();
        parser.consume(TokenType.SENEGAL_RBRACKET, "Expected access to be closed by ]");

        if (parser.match(TokenType.SENEGAL_EQUAL))
            parser.parseExpression();
    }

    private parseDot(parser: Parser, canAssign: boolean) {
        parser.consume(TokenType.SENEGAL_ID, "Expected method or property");
        
        if (canAssign && parser.match(TokenType.SENEGAL_EQUAL))
            parser.parseExpression();
        else if (parser.match(TokenType.SENEGAL_LPAREN))
            parser.argumentList();
    }

    private parseUnary(parser: Parser, canAssign: boolean) {
        parser.parsePrecedence(Precedence.UNARY);
    }

    private parseBinary(parser: Parser, canAssign: boolean) {
        parser.parsePrecedence(parser.rules.get(parser.previous.type).precedence + 1);
    }

    private parseTernary(parser: Parser, canAssign: boolean) {
        // True case
        parser.parseExpression();

        parser.consume(TokenType.SENEGAL_COLON, "Expected :");

        // False case
        parser.parseExpression();
    }

    private parseIdentifier(parser: Parser, canAssign: boolean) {
        if (!parser.declarations.has(parser.previous.value))
            parser.error(parser.previous, `Undefined variable ${parser.previous.value}`, DiagnosticSeverity.Error);

        parser.parseVariableAccess(parser.previous, canAssign);
    }

    private parseVariableAccess(name: Token, canAssign: boolean) {
        this.resolveLocal(name);

        if (canAssign) {
            switch (this.current.type) {
                case TokenType.SENEGAL_EQUAL:
                    this.advance();
                    this.parseExpression();
                    break;

                case TokenType.SENEGAL_PLUS_PLUS:
                case TokenType.SENEGAL_MINUS_MINUS:
                    this.advance();
                    break;

                case TokenType.SENEGAL_STAR_STAR:
                    this.advance();

                    if (!this.check(TokenType.SENEGAL_NUMBER))
                        this.error(this.previous, "Cannot raise to the power of a non-number value", DiagnosticSeverity.Error);

                    this.parseExpression();
                    break;

                case TokenType.SENEGAL_PLUS_EQUAL:
                case TokenType.SENEGAL_MINUS_EQUAL:
                case TokenType.SENEGAL_STAR_EQUAL:
                case TokenType.SENEGAL_SLASH_EQUAL:
                    this.advance();
                    break;
            }
        }
    }

    private resolveLocal(name: Token): number {
        for (let i: number = this.locals.length - 1; i >= 0; i--) {
            let local: Local = this.locals[i];

            if (local.id.value == name.value) {
                if (local.depth == -1)
                    this.error(this.previous, "Cannot access a variable in its own initializer", DiagnosticSeverity.Error);

                return i;
            }
        }

        return -1;
    }

    private parseAnd(parser: Parser, canAssign: boolean) {
        parser.parsePrecedence(Precedence.PREC_AND);
    }

    private parseOr(parser: Parser, canAssign: boolean) {
        parser.parsePrecedence(Precedence.PREC_OR);
    }

    private parseSuper(parser: Parser, canAssign: boolean) {
        if (!parser.inClass)
            parser.error(parser.previous, "Cannot access super outside class", DiagnosticSeverity.Error);
        else if (!parser.hasSuper)
            parser.error(parser.previous, "Cannot access super without a superclass", DiagnosticSeverity.Error);

        parser.consume(TokenType.SENEGAL_DOT, "Expected '.'");
        parser.consume(TokenType.SENEGAL_ID, "Expected superclass property");

        parser.parseVariableAccess(parser.syntheticToken("this", TokenType.SENEGAL_THIS), false);
        
        if (parser.match(TokenType.SENEGAL_LPAREN)) {
            parser.argumentList();
            parser.parseVariableAccess(parser.syntheticToken("super", TokenType.SENEGAL_SUPER), false);
        } else {
            parser.parseVariableAccess(parser.syntheticToken("super", TokenType.SENEGAL_SUPER), false);
        }
    }

    private parseThis(parser: Parser, canAssign: boolean) {
        if (!parser.inClass) {
            parser.error(parser.previous, "Cannot access this outside class", DiagnosticSeverity.Error);
            return;
        }

        parser.parseVariableAccess(parser.previous, false);
    }

    private syntheticToken(name: string, type: TokenType): Token {
        return {type: type, value: name, line: 0, lineIndex: 0, index: 0};
    }

    private consume(type: TokenType, msg: string) {
        if (this.current.type == type) {
            this.advance();
            return;
        }
        
        this.error(this.current, msg, DiagnosticSeverity.Error);
    }

    private advance() {
        this.previous = this.current;

        for (;;) {
            this.current = this.lexer.getNextToken();

            if (this.current.type != TokenType.SENEGAL_ERROR)
                break;

            this.error(this.current, this.current.value, DiagnosticSeverity.Error);
        }
    }

    private declare(id: Token, type: DeclarationType) {
        this.declarations.set(
            id.value,
            {
                type: type,
                line: id.line,
                char: id.lineIndex,
                id: id.value
            }
        );
    }

    private error(token: Token, msg: string, severity: DiagnosticSeverity) {
        this.errors.push({
            line: token.line,
            start: token.index,
            end: token.index + token.value.length,
            msg: msg,
            severity: severity
        });

        while (this.previous.type != TokenType.SENEGAL_SEMI)
            this.advance();
    }
}
