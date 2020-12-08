import { Declaration, DeclarationType, Parser } from "./parse";

export enum TokenType {
    SENEGAL_ASYNC, SENEGAL_AWAIT, SENEGAL_BREAK, SENEGAL_CASE, SENEGAL_CLASS, SENEGAL_CONTINUE,
    SENEGAL_DEFAULT, SENEGAL_ELSE, SENEGAL_EXTENDS, SENEGAL_FALSE,
    SENEGAL_FINAL, SENEGAL_FOR, SENEGAL_FUNCTION, SENEGAL_IF, SENEGAL_IMPORT, SENEGAL_STATIC,
    SENEGAL_RETURN, SENEGAL_NULL, SENEGAL_SUPER, SENEGAL_SWITCH, SENEGAL_THIS, SENEGAL_TRUE, SENEGAL_VAR, SENEGAL_WHILE,

    SENEGAL_ID, SENEGAL_STRING, SENEGAL_NUMBER, SENEGAL_HEX,

    SENEGAL_AMP, SENEGAL_AMP_AMP, SENEGAL_BANG, SENEGAL_BANG_EQUAL, SENEGAL_EQUAL, SENEGAL_EQUAL_EQUAL, SENEGAL_EQUAL_GREATER,
    SENEGAL_GREATER, SENEGAL_GREATER_GREATER, SENEGAL_GREATER_EQUAL, SENEGAL_LESSER, SENEGAL_LESSER_LESSER,
    SENEGAL_LESSER_EQUAL, SENEGAL_PIPE, SENEGAL_PIPE_PIPE, SENEGAL_TILDE,

    SENEGAL_LPAREN, SENEGAL_RPAREN, SENEGAL_LBRACE, SENEGAL_RBRACE, SENEGAL_LBRACKET, SENEGAL_RBRACKET,

    SENEGAL_CARET, SENEGAL_COMMA, SENEGAL_COLON, SENEGAL_DOT, SENEGAL_MINUS, SENEGAL_MINUS_EQUAL,
    SENEGAL_MINUS_MINUS, SENEGAL_PLUS, SENEGAL_PLUS_EQUAL, SENEGAL_PLUS_PLUS, SENEGAL_QUESTION, SENEGAL_SEMI,
    SENEGAL_SLASH, SENEGAL_SLASH_EQUAL, SENEGAL_STAR, SENEGAL_STAR_EQUAL, SENEGAL_STAR_STAR,

    SENEGAL_ERROR, SENEGAL_EOF
}

export interface Token {
    type: TokenType,
    value: string,
    line: number,
    lineIndex: number,
    index: number
}

export interface Local {
    id: Token,
    depth: number,
    isCaptured: boolean
}

export enum Precedence {
    NONE,

    // =, ||, &&, ==
    ASSIGNMENT, PREC_OR, PREC_AND, EQUALITY,
    
    // (< <= > >=), (| ^ &), (+, -), (*, /), (!, -, ~), (., ())
    COMPARISON, BIT_OR, BIT_XOR, BIT_AND, BIT_SHIFT, TERM, FACTOR ,UNARY, CALL,
    
    PRIMARY
}

export type ParseFunc = (parser: Parser, canAssign: boolean) => void;

export interface ParseRule {
    prefix?: ParseFunc;
    infix?: ParseFunc;
    precedence: Precedence;
}

export enum FunctionTypes {
    CONSTRUCTOR,
    FUNCTION,
    METHOD,
    GLOBAL
}

export let coreDeclarations: Map<String, Declaration> = new Map([
    ['println', {id: 'println', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['assert', {id: 'assert', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['type', {id: 'type', type: DeclarationType.VAR, line: 0, char: 0}],
    ['fromByte', {id: 'fromByte', type: DeclarationType.FUNCTION,line: 0, char: 0}],
    ['at', {id: 'at', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['contains', {id: 'contains', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['endsWith', {id: 'endsWith', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['indexOf', {id: 'indexOf', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['startsWith', {id: 'startsWith', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['isEmpty', {id: 'isEmpty', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['isNotEmpty', {id: 'isNotEmpty', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['length', {id: 'length', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['toNum', {id: 'toNum', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['asNum', {id: 'asNum', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['toString', {id: 'toString', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['isFinite', {id: 'isFinite', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['isInfinite', {id: 'isInfinite', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['isNaN', {id: 'isNaN', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['isNeg', {id: 'isNeg', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['abs', {id: 'abs', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['ceil', {id: 'ceil', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['clamp', {id: 'clamp', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['compareTo', {id: 'compareTo', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['floor', {id: 'floor', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['floor', {id: 'floor', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['remainder', {id: 'remainder', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['nan', {id: 'nan', type: DeclarationType.VAR, line: 0, char: 0}],
    ['infinity', {id: 'infinity', type: DeclarationType.VAR, line: 0, char: 0}],
    ['negInfinity', {id: 'negInfinity', type: DeclarationType.VAR, line: 0, char: 0}],
    ['maxFinite', {id: 'maxFinite', type: DeclarationType.VAR, line: 0, char: 0}],
    ['minPositive', {id: 'minPositive', type: DeclarationType.VAR, line: 0, char: 0}],
    ['filled', {id: 'filled', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['add', {id: 'add', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['clear', {id: 'clear', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['insert', {id: 'insert', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['removeAt', {id: 'removeAt', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['remove', {id: 'remove', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['print', {id: 'print', type: DeclarationType.FUNCTION, line: 0, char: 0}],
    ['String', {id: 'String', type: DeclarationType.CLASS, line: 0, char: 0}],
    ['bool', {id: 'bool', type: DeclarationType.CLASS, line: 0, char: 0}],
    ['num', {id: 'num', type: DeclarationType.CLASS, line: 0, char: 0}],
    ['List', {id: 'List', type: DeclarationType.CLASS, line: 0, char: 0}],
    ['Map', {id: 'Map', type: DeclarationType.CLASS, line: 0, char: 0}]
    ]);