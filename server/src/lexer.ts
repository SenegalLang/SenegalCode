import { Token, TokenType } from "./utils";

export class Lexer {
    source: string;
    index: number = 0;
    line: number = 0;
    lineIndex: number = 0;
    tokenStart: number = 0;

    constructor(source: string) {
        this.source = source;
    }

    /**
     * getNextToken, grab the next token from the source file
     */
    public getNextToken(): Token {
        this.skipWhitespaceAndComments();

        this.tokenStart = this.index;

        if (this.isAtEnd())
            return this.newToken(TokenType.SENEGAL_EOF);

        let c = this.advance();
        
        if (this.isDigit(c))
            return this.collectNumber();

        if (this.isAlpha(c) || c == '_')
            return this.collectId();

        switch (c) {
            case ':':
                return this.newToken(TokenType.SENEGAL_COLON);
          
              case '(':
                return this.newToken(TokenType.SENEGAL_LPAREN);
          
              case ')':
                return this.newToken(TokenType.SENEGAL_RPAREN);
          
              case '{':
                return this.newToken(TokenType.SENEGAL_LBRACE);
          
              case '}':
                return this.newToken(TokenType.SENEGAL_RBRACE);
          
              case '[':
                return this.newToken(TokenType.SENEGAL_LBRACKET);
          
              case ']':
                return this.newToken(TokenType.SENEGAL_RBRACKET);
          
              case ';':
                return this.newToken(TokenType.SENEGAL_SEMI);
          
              case '^':
                return this.newToken(TokenType.SENEGAL_CARET);
          
              case ',':
                return this.newToken(TokenType.SENEGAL_COMMA);
          
              case '.':
                return this.newToken(TokenType.SENEGAL_DOT);
          
              case '-':
                return this.newToken(this.match('-') ?
                TokenType.SENEGAL_MINUS_MINUS : this.match('=') ? TokenType.SENEGAL_MINUS_EQUAL : TokenType.SENEGAL_MINUS);
          
              case '+':
                return this.newToken(this.match('+') ?
                TokenType.SENEGAL_PLUS_PLUS : this.match('=') ? TokenType.SENEGAL_PLUS_EQUAL : TokenType.SENEGAL_PLUS);
          
              case '?':
                return this.newToken(TokenType.SENEGAL_QUESTION);
          
              case '/':
                return this.newToken(this.match('=') ? TokenType.SENEGAL_SLASH_EQUAL : TokenType.SENEGAL_SLASH);
          
              case '*':
                return this.newToken(this.match('*') ?
                TokenType.SENEGAL_STAR_STAR : this.match('=') ? TokenType.SENEGAL_STAR_EQUAL : TokenType.SENEGAL_STAR);
          
              case '~':
                return this.newToken(TokenType.SENEGAL_TILDE);
          
              case '&':
                return this.newToken(this.match('&') ? TokenType.SENEGAL_AMP_AMP : TokenType.SENEGAL_AMP);
          
              case '!':
                return this.newToken(this.match('=') ? TokenType.SENEGAL_BANG_EQUAL : TokenType.SENEGAL_BANG);
          
              case '=':
                return this.newToken(this.match('=') ?
                TokenType.SENEGAL_EQUAL_EQUAL : this.match('>') ? TokenType.SENEGAL_EQUAL_GREATER : TokenType.SENEGAL_EQUAL);
          
              case '<':
                return this.newToken(this.match('=') ? TokenType.SENEGAL_LESSER_EQUAL : TokenType.SENEGAL_LESSER);
          
              case '>':
                return this.newToken(this.match('=') ? TokenType.SENEGAL_GREATER_EQUAL : TokenType.SENEGAL_GREATER);
          
              case '|':
                return this.newToken(this.match('|') ? TokenType.SENEGAL_PIPE_PIPE : TokenType.SENEGAL_PIPE);
          
              case '"':
              case '\'':
                return this.collectString(c);
          
              default:
                return this.errorToken("Senegal encountered an unexpected token.");
        }

    }

    private skipWhitespaceAndComments(): void {
        for (;;) {
            let c: string = this.peek();

            switch (c) {
                case ' ':
                case '\r':
                case '\t':
                    this.advance();
                    break;

                case '\n':
                    this.line++;
                    this.lineIndex = 0;
                    this.advance();
                    break;    

                case '/': {
                    let n: string = this.peekNext();

                    if (n == '/') {
                        while (this.peek() != '\n' && !this.isAtEnd())
                            this.advance();

                        break;
                    } else if (n == '*') {
                        while (this.peek() != '*' && this.peekNext() != '/' && !this.isAtEnd())
                            this.advance();

                        break;
                    }

                    return;
                }
                
                default:
                    return;
            }
        }
    }

    private peek(): string {
        return this.source[this.index];
    }

    private peekNext(): string {
        return this.source[this.index + 1];
    }

    private advance(): string {
        this.index++;
        this.lineIndex++;
        return this.source[this.index - 1];
    }

    public isAtEnd(): boolean {
        return this.index >= this.source.length;
    }

    private newToken(type: TokenType): Token {
        return {type: type, value: this.source.substring(this.tokenStart, this.index), line: this.line, lineIndex: this.lineIndex, index: this.tokenStart}
    }

    private errorToken(msg: string): Token {
        return {type: TokenType.SENEGAL_ERROR, value: msg, line: this.line, lineIndex: this.lineIndex, index: this.tokenStart};
    }

    private isAlpha(char: string): boolean {
        let pattern: RegExp = /[a-zA-Z]/;

        return pattern.test(char);
    }

    private isDigit(char: string): boolean {
        let pattern: RegExp = /[0-9]/;

        return pattern.test(char);
    }

    private isxDigit(char: string): boolean {
        let pattern: RegExp = /[0-9a-fA-F]/;

        return pattern.test(char);
    }

    private collectNumber(): Token {
        if (this.source[this.index - 1] == '0' && this.peek() == 'x') {
            this.advance();

            this.tokenStart = this.index;

            while (this.isxDigit(this.peek()))
            this.advance();

            return this.newToken(TokenType.SENEGAL_HEX);
        }

        while (this.isDigit(this.peek()))
            this.advance();

        if (this.peek() == '.' && this.isDigit(this.peekNext())) {
            this.advance();

            while (this.isDigit(this.peek()))
                this.advance();
        }

        return this.newToken(TokenType.SENEGAL_NUMBER);
    }

    private collectId(): Token {
        let c: string = this.peek();

        while (this.isAlpha(c) || this.isDigit(c) || c == '_') {
            this.advance();
            c = this.peek();
        }

        return this.newToken(this.idToken());
    }

    private idToken(): TokenType {
        switch (this.getOffsetFromCurrent(0)) {
            case 'a':
                if (this.index - this.tokenStart > 1) {
                    switch (this.getOffsetFromCurrent(1)) {
                        case 's':
                            return this.collectKeyword(2, 3, "ync", TokenType.SENEGAL_ASYNC);

                        case 'w':
                            return this.collectKeyword(2, 3, "ait", TokenType.SENEGAL_AWAIT);                            
                    }
                }

                break;

                case 'b':
      return this.collectKeyword(1, 4, "reak", TokenType.SENEGAL_BREAK);

    case 'c':
      if (this.index - this.tokenStart > 1) {
        switch (this.getOffsetFromCurrent(1)) {
          case 'a':
            return this.collectKeyword(2, 2, "se", TokenType.SENEGAL_CASE);

          case 'l':
            return this.collectKeyword(2, 3, "ass", TokenType.SENEGAL_CLASS);

          case 'o':
            return this.collectKeyword(2, 6, "ntinue", TokenType.SENEGAL_CONTINUE);
        }
      }

      break;

    case 'd':
      return this.collectKeyword(1, 6, "efault", TokenType.SENEGAL_DEFAULT);


    case 'e':
      if (this.index - this.tokenStart > 1) {
        switch (this.getOffsetFromCurrent(1)) {
          case 'l':
            return this.collectKeyword(2, 2, "se", TokenType.SENEGAL_ELSE);

          case 'x':
            return this.collectKeyword(2, 5, "tends", TokenType.SENEGAL_EXTENDS);
        }
      }
      break;

    case 'f':
      if (this.index - this.tokenStart > 1) {
        switch (this.getOffsetFromCurrent(1)) {
          case 'a':
            return this.collectKeyword(2, 3, "lse", TokenType.SENEGAL_FALSE);

          case 'i':
            return this.collectKeyword(2, 3, "nal", TokenType.SENEGAL_FINAL);

          case 'o':
            return this.collectKeyword(2, 1, "r", TokenType.SENEGAL_FOR);

          case 'u':
            return this.collectKeyword(2, 6, "nction", TokenType.SENEGAL_FUNCTION);
        }
      }
      break;

    case 'i':
      if (this.index - this.tokenStart > 1) {
        switch (this.getOffsetFromCurrent(1)) {
          case 'f':
            return this.collectKeyword(2, 0, "", TokenType.SENEGAL_IF);

          case 'm':
            return this.collectKeyword(2, 4, "port", TokenType.SENEGAL_IMPORT);
        }
      }

    case 'n':
      return this.collectKeyword(1, 3, "ull", TokenType.SENEGAL_NULL);

    case 'r':
      return this.collectKeyword(1, 5, "eturn", TokenType.SENEGAL_RETURN);

    case 's':
      if (this.index - this.tokenStart > 1) {
        switch (this.getOffsetFromCurrent(1)) {
          case 't':
            return this.collectKeyword(2, 4, "atic", TokenType.SENEGAL_STATIC);

          case 'u':
            return this.collectKeyword(2, 3, "per", TokenType.SENEGAL_SUPER);

          case 'w':
            return this.collectKeyword(2, 4, "itch", TokenType.SENEGAL_SWITCH);
        }
      }
      break;

    case 't':
      if (this.index - this.tokenStart > 1) {
        switch (this.getOffsetFromCurrent(1)) {
          case 'h':
            return this.collectKeyword(2, 2, "is", TokenType.SENEGAL_THIS);

          case 'r':
            return this.collectKeyword(2, 2, "ue", TokenType.SENEGAL_TRUE);
        }
      }

      break;

    case 'v':
      return this.collectKeyword(1, 2, "ar", TokenType.SENEGAL_VAR);

    case 'w':
      return this.collectKeyword(1, 4, "hile", TokenType.SENEGAL_WHILE);
        }

        return TokenType.SENEGAL_ID;
    }

    // Rename?
    private getOffsetFromCurrent(offset: number): string {
        return this.source[this.tokenStart + offset];
    }

    private collectKeyword(start: number, length: number, rest: string, type: TokenType): TokenType {
        if (this.index - this.tokenStart == start + length &&
            this.source.substring(this.tokenStart + start, this.tokenStart + start + length) == rest)
            return type;

        return TokenType.SENEGAL_ID;    
    }

    private collectString(quotation: string): Token {
        let string: string = "";

        for (;;) {
            let c = this.peek();

            if (c == quotation)
                break;

            if (this.isAtEnd())
                return this.errorToken("Unterminated String");

            if (c == '\n')
                this.line++;

            if (c == '\\') {
                switch (this.peekNext()) {
                    case '0':
                        this.advance();
                        string += '\0';
                        break;

                    case 'a':
                        this.advance();
                        string += '\a';
                        break;

                    case 'b':
                        this.advance();
                        string += '\b';
                        break;

                    case 'f':
                        this.advance();
                        string += '\f';
                        break;

                    case 'n':
                        this.advance();
                        string += '\n';
                        break;

                    case 'r':
                        this.advance();
                        string += '\r';
                        break;

                    case 't':
                        this.advance();
                        string += '\t';
                        break;

                    case 'v':
                        this.advance();
                        string += '\v';
                        break;
                }
            }

            this.advance();
        }

        if (this.isAtEnd())
            return this.errorToken("Unterminated String");

        this.advance();

        return {type: TokenType.SENEGAL_STRING, value: string, line: this.line, lineIndex: this.lineIndex, index: this.tokenStart};
    }

    private match(expected: string): boolean {
        if (this.isAtEnd() || this.peek() != expected)
            return false;

        this.index++;
        return true;
    }
}