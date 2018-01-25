import { FilePosition } from '~/core';
import { TokenType, Token } from './token';
import { CharStream, EmptyCharStream, NonEmptyCharStream } from './char-stream';


export interface TokenResult {
    final: Token;
    remaining: CharStream;
}

// #region IfHasNextOperation

interface IfHasNextOperation {
    readonly previous: LexerState;
    readonly result: Optional<LexerState>;
    /**
     * In the event of a false result for the previous ifHasNext(), try again with a different predicate.
     * This method can chain so that the first successful predicate will propagate through to the last else.
     */
    readonly elseIf: (count: number, pred: (values: string[]) => boolean,
        then: (state: LexerState, accepted: string) => LexerState
    ) => IfHasNextOperation;
    /**
     * In the event of a false result for the previous ifHasNext(), return an alternate result.
     * This method will end a chain, so the first successful result will return from this method.
     */
    readonly else: (fn: (state: LexerState) => LexerState) => LexerState;
}

function IfHasNextOperation(previous: LexerState, result: Optional<LexerState> = null): IfHasNextOperation {
    return { previous, result, elseIf: IfHasNextOperation.elseIf, else: IfHasNextOperation._else };
}

namespace IfHasNextOperation {
    /**
     * If we already have a result, then skip this else-if and return it so it propagates to the end.
     * Otherwise, execute ifHasNext() on the original with the new parameters.
     */
    export function elseIf(this: IfHasNextOperation, count: number, pred: (values: string[]) => boolean,
        then: (state: LexerState, accepted: string) => LexerState
    ) {
        if (this.result) return this;
        return this.previous.ifHasNext(count, pred, then);
    }

    /**
     * End of the chain, if a previous predicate yielded a result, return it.
     * Otherwise return the alternate.
     */
    export function _else(this: IfHasNextOperation, fn: (state: LexerState) => LexerState) {
        if (this.result) return this.result;
        return fn(this.previous);
    }
}

// #endregion

export type LexerState = EmptyLexerState | NonEmptyLexerState;

interface LexerStateBase {
    /** The expected resulting type of token, can be changed with setType() */
    readonly type: TokenType;
    /** The start position of the token */
    readonly position: FilePosition;
    /** The progressing image of the consumed token, can be appended to with consume() */
    readonly image: string;
    /** The expeceted resulting value of the token, can be set with setValue() */
    readonly value?: any;
    /** Returns a new LexerState with the provided type */
    readonly setType: (type: TokenType) => LexerState;
    /** Returns a new LexerState with a value based on the current image  */
    readonly setValue: (fn: (image: string) => any) => LexerState;
    /** Returns a new LexerState with a value based on the current value */
    readonly mapValue: (fn: (value: any) => any) => LexerState;
    /**
     * This is a very useful tool to handle conditional consumption.
     * First, specify the number of characters from the stream you wish to analyze.
     * Then, provide a predicate that will be called with those characters ONLY if there were that many available.
     * That predicate should return true if the characters should be consumed, and false if not.
     * Then, provide a 'then' function that will be called with the resulting consumed state
     * and the string of the accepted characters, which should return the state to return from the operation.
     * This method will return a chainable object that can be used to append more checks in the instance that one fails.
     */
    readonly ifHasNext: (count: number, pred: (values: string[]) => boolean,
        then: (state: LexerState, accepted: string) => LexerState
    ) => IfHasNextOperation;
    /** Returns a completed token and remaining stream based on this LexerState */
    readonly finish: () => TokenResult;
}

interface EmptyLexerState extends LexerStateBase {
    /** Determines whether this LexerState is empty */
    readonly empty: true;
    /** The remaining available character stream */
    readonly stream: EmptyCharStream;
}

interface NonEmptyLexerState extends LexerStateBase {
    /** Determines whether this LexerState is empty */
    readonly empty: false;
    /** The remaining available character stream */
    readonly stream: NonEmptyCharStream;
    /** Consumes at least one character from the stream and appends it to the image, returning a new LexerState */
    readonly consume: (count?: number) => LexerState;
}

/**
 * Tracks the state for the consumption of one token.
 * EmptyLexerState and NonEmptyLexerState have the same properties, except:
 * - empty is true for Empty, false for NonEmpty (the discriminant)
 * - stream is empty for Empty, non-empty for NonEmpty
 * - consume() is available for NonEmpty, not for Empty
 */
export function LexerState(position: FilePosition, char: string, stream: CharStream) {
    return LexerState.init(position, char, stream);
}

export namespace LexerState {
    export function init(position: FilePosition, char: string, stream: CharStream): LexerState {
        const base = { type: TokenType.NONE, position, image: char, setType, setValue, mapValue, ifHasNext, finish };
        if (stream.empty) return { ...base, empty: true, stream };
        return { ...base, empty: false, stream, consume };
    }

    function consume(this: NonEmptyLexerState, count = 1): LexerState {
        let chars: string, stream: CharStream;
        if (count === 1) {
            ({ char: chars, stream } = this.stream.read());
        } else {
            ({ chars, stream } = this.stream.forceRead(count));
        }
        const image = this.image + chars;
        return (stream.empty
            ? { ...this, empty: true, image, stream }
            : { ...this, empty: false, image, stream }) as LexerState;
    }

    function setType(this: LexerState, type: TokenType): LexerState {
        return { ...this, type };
    }

    function setValue(this: LexerState, fn: (image: string) => any): LexerState {
        return { ...this, value: fn(this.image) };
    }

    function mapValue(this: LexerState, fn: (value: any) => any): LexerState {
        return { ...this, value: fn(this.value) };
    }

    function ifHasNext(this: LexerState, count: number, pred: (values: string[]) => boolean,
        then: (state: LexerState, accepted: string) => LexerState
    ): IfHasNextOperation {
        const state = this;
        // not enough chars
        if (state.empty) return IfHasNextOperation(state);
        const { chars, stream } = state.stream.forceRead(count);
        // not enough chars
        if (chars.length !== count) return IfHasNextOperation(state);
        // predicate deemed it not so
        if (!pred([...chars])) return IfHasNextOperation(state);
        // predicate deemed it so
        const image = state.image + chars;
        const result = (stream.empty
            ? { ...state, empty: true, image, stream }
            : { ...state, empty: false, image, stream }) as LexerState;
        return IfHasNextOperation(state, then(result, chars));
    }

    function finish(this: LexerState) {
        return { final: Token(this.type, this.position, this.image, this.value), remaining: this.stream };
    }
}
