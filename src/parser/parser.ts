import { FileRange, Diagnostic, CoreObject } from '~/core';
import { Token, TokenType } from '~/parser/lexer';
import { LazyList, NonEmptyLazyList, EmptyLazyList } from '~/utils/lazy-list';


type RepeatKey = '+' | '*';

export type ParseFunc<T> = (ctx: Parser) => ParseResult<T>;

export interface ParseResult<T> {
    result: Optional<T>;
    remaining: Parser;
}

interface ParseResultInternal<T> {
    result: Optional<T>;
    remaining: Parser;
}

// #region Parser

abstract class ParserBase extends CoreObject<ParserBase> {
    abstract readonly empty: boolean;
    abstract readonly tokens: LazyList<Token>;

    readonly failToken: Optional<Token> = null;
    readonly successLocation: Optional<FileRange> = null;

    fail(token: Optional<Token>): Parser {
        return this.clone({ failToken: token, successLocation: null }) as Parser;
    }

    succeed(location: Optional<FileRange>): Parser {
        return this.clone({ successLocation: location, failToken: null }) as Parser;
    }

    parse<T>(fn: ParseFunc<T>): { result: Optional<T>, diagnostics: ReadonlyArray<Diagnostic> } {
        const { result, remaining } = fn(this as Parser) as ParseResultInternal<T>;
        if (!remaining.empty) throw new Error('Unprocessed input remains, you likely need to include an EOF in your syntax definition');
        return {
            result,
            // TODO: proper error system
            diagnostics: remaining.failToken
                ? [new Diagnostic(`Unexpected "${remaining.failToken.image}" token`, remaining.failToken.location)]
                : []
        };
    }
}

class NonEmptyParser extends ParserBase {
    readonly empty: false = false;

    constructor(readonly tokens: NonEmptyLazyList<Token>) {
        super();
    }

    next(): { token: Token, remaining: Parser } {
        return { token: this.tokens.head, remaining: createParser(this.tokens.tail) };
    }
}

class EmptyParser extends ParserBase {
    readonly empty: true = true;

    constructor(readonly tokens: EmptyLazyList<Token>) {
        super();
    }
}

export type Parser = NonEmptyParser | EmptyParser;

export function createParser(tokenStream: LazyList<Token>): Parser {
    if (tokenStream.empty) {
        return new EmptyParser(tokenStream);
    } else {
        return new NonEmptyParser(tokenStream);
    }
}

// #endregion

export function optional<T>(fn: ParseFunc<T>): ParseFunc<Optional<T>> {
    return parser => {
        const { result, remaining } = fn(parser) as ParseResultInternal<T>;
        return { result, remaining: remaining.succeed(remaining.successLocation) };
    }
}

export function repeat<T>(fn: ParseFunc<T>, key: RepeatKey, sep?: ParseFunc<Token>): ParseFunc<T[]> {
    if (key === '+' && !sep) {
        // desugar: T+ => (T T*)
        return seq(
            fn,
            repeat(fn, '*'),
            ([first, rest]) => [first, ...rest])
    } else if (key === '*' && sep) {
        // desugar: T(* sep s) => (T (s T)*)?
        return optional(seq(
            fn,
            repeat(seq(
                sep,
                fn,
                ([_, res]) => res), '*'),
            ([first, rest]) => [first, ...rest]));
    } else if (key === '+' && sep) {
        // desugar: T(+ sep s) => (T (s T)*)
        return seq(
            fn,
            repeat(seq(
                sep,
                fn,
                ([_, res]) => res), '*'),
            ([first, rest]) => [first, ...rest]);
    } else {
        // base case, collect successful results repeatedly until first failure
        return parser => {
            const results: T[] = [];
            let next = parser;
            let location: Optional<FileRange> = null;
            while (true) {
                const { result, remaining } = fn(next) as ParseResultInternal<T>;
                if (result) {
                    results.push(result);
                    next = remaining;
                    location = location ? location.merge(remaining.successLocation!) : remaining.successLocation;
                } else {
                    return { result: results, remaining: next.succeed(location) };
                }
            }
        };
    }
}

export function seq<T1, T>(f1: ParseFunc<T1>, toResult: (s: T1, location: FileRange) => T): ParseFunc<T>;
export function seq<T1, T2, T>(f1: ParseFunc<T1>, f2: ParseFunc<T2>, toResult: (s: [T1, T2], location: FileRange) => T): ParseFunc<T>;
export function seq<T1, T2, T3, T>(f1: ParseFunc<T1>, f2: ParseFunc<T2>, f3: ParseFunc<T3>, toResult: (s: [T1, T2, T3], location: FileRange) => T): ParseFunc<T>;
export function seq<T1, T2, T3, T4, T>(f1: ParseFunc<T1>, f2: ParseFunc<T2>, f3: ParseFunc<T3>, f4: ParseFunc<T4>, toResult: (s: [T1, T2, T3, T4], location: FileRange) => T): ParseFunc<T>;
export function seq<T1, T2, T3, T4, T5, T>(f1: ParseFunc<T1>, f2: ParseFunc<T2>, f3: ParseFunc<T3>, f4: ParseFunc<T4>, f5: ParseFunc<T5>, toResult: (s: [T1, T2, T3, T4, T5], location: FileRange) => T): ParseFunc<T>;
export function seq<T1, T2, T3, T4, T5, T6, T>(f1: ParseFunc<T1>, f2: ParseFunc<T2>, f3: ParseFunc<T3>, f4: ParseFunc<T4>, f5: ParseFunc<T5>, f6: ParseFunc<T6>, toResult: (s: [T1, T2, T3, T4, T5, T6], location: FileRange) => T): ParseFunc<T>;
export function seq<T1, T2, T3, T4, T5, T6, T7, T>(f1: ParseFunc<T1>, f2: ParseFunc<T2>, f3: ParseFunc<T3>, f4: ParseFunc<T4>, f5: ParseFunc<T5>, f6: ParseFunc<T6>, f7: ParseFunc<T7>, toResult: (s: [T1, T2, T3, T4, T5, T6, T7], location: FileRange) => T): ParseFunc<T>;
export function seq<T>(...args: any[]): ParseFunc<T> {
    const fns = args.slice(0, args.length - 1) as ParseFunc<{}>[];
    const toResult = args[args.length - 1] as (s: Array<Optional<{}>>, location: FileRange) => T;

    return (parser) => {
        let next = parser;
        const results: Array<Optional<{}>> = [];
        let location: Optional<FileRange> = null;
        for (const fn of fns) {
            const { result, remaining } = fn(next) as ParseResultInternal<{}>;
            if (remaining.failToken) return { result: null, remaining }
            results.push(result);
            location = result ? location ? location.merge(remaining.successLocation!) : remaining.successLocation : location;
        }
        return { result: toResult(results, location!), remaining: next.succeed(location) };
    }
}

export function tok(image: string): ParseFunc<Token>;
export function tok(type: TokenType): ParseFunc<Token>;
export function tok(t: string | TokenType): ParseFunc<Token> {
    return (parser) => {
        if (parser.empty) throw new Error('token stream was empty');
        const { token, remaining } = parser.next();
        if (typeof t === 'string') {
            if (token.image !== t) return { result: null, remaining: parser.fail(token) };
        } else {
            if (token.type !== t) return { result: null, remaining: parser.fail(token) };
        }
        return { result: token, remaining: remaining.succeed(token.location) };
    }
}

export function select<T>(...fns: ParseFunc<T>[]): ParseFunc<T> {
    return (parser) => {
        for (const fn of fns) {
            const { result, remaining } = fn(parser) as ParseResultInternal<T>;
            if (remaining.failToken) continue;
            return { result, remaining: remaining.succeed(remaining.successLocation) };
        }
        if (parser.empty) throw new Error('token stream was empty');
        return { result: null, remaining: parser.fail(parser.next().token) };
    }
}
