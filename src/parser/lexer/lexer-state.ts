import { FilePosition, CoreObject } from '~/core';
import { TokenType, Token } from './token';
import { CharStream, EmptyCharStream, NonEmptyCharStream } from './char-stream';


export interface TokenResult {
    final: Token;
    remaining: CharStream;
}

class IfHasNextOperation extends CoreObject {
    constructor(
        private readonly previous: LexerState,
        readonly result: Optional<LexerState> = null
    ) { super(); }

    /**
     * In the event of a false result for the previous ifHasNext(), try again with a different predicate.
     * This method can chain so that the first successful predicate will propagate through to the last else.
     */
    elseIf(count: number, pred: (values: string[]) => boolean, then: (state: LexerState, accepted: string) => LexerState): IfHasNextOperation {
        // If we already have a result, then skip this else-if and return it so it propagates to the end.
        if (this.result) return this;
        // Otherwise, execute ifHasNext() on the original with the new parameters.
        return this.previous.ifHasNext(count, pred, then);
    }

    /**
     * In the event of a false result for the previous ifHasNext(), return an alternate result.
     * This method will end a chain, so the first successful result will return from this method.
     */
    else(fn: (state: LexerState) => LexerState): LexerState {
        // End of the chain, if a previous predicate yielded a result, return it.
        if (this.result) return this.result;
        // Otherwise return the alternate.
        return fn(this.previous);
    }
}

/**
 * Tracks the state for the consumption of one token.
 * EmptyLexerState and NonEmptyLexerState have the same properties, except:
 * - empty is true for Empty, false for NonEmpty (the discriminant)
 * - stream is empty for Empty, non-empty for NonEmpty
 * - consume() is available for NonEmpty, not for Empty
 */
export type LexerState = EmptyLexerState | NonEmptyLexerState;

export function LexerState(position: FilePosition, char: string, stream: CharStream): LexerState {
    if (stream.empty) return new EmptyLexerState(position, char, stream);
    return new NonEmptyLexerState(position, char, stream);
}

abstract class LexerStateBase extends CoreObject {
    abstract readonly empty: boolean;
    abstract readonly stream: CharStream;

    /** The expected resulting type of token, can be changed with setType() */
    readonly type: TokenType = TokenType.NONE;
    /** The progressing image of the consumed token, can be appended to with consume() */
    readonly image: string;
    /** The expeceted resulting value of the token, can be set with setValue() */
    readonly value?: any;

    constructor(
        /** The start position of the token */
        readonly position: FilePosition,
        char: string,
    ) {
        super();
        this.image = char;
    }

    /** Returns a new LexerState with the provided type */
    setType(type: TokenType): LexerState {
        return this.clone({ type }) as LexerState;
    }

    /** Returns a new LexerState with a value based on the current image  */
    setValue(fn: (image: string) => any): LexerState {
        return this.clone({ value: fn(this.image) }) as LexerState;
    }

    /** Returns a new LexerState with a value based on the current value */
    mapValue(fn: (value: any) => any): LexerState {
        return this.clone({ value: fn(this.value) }) as LexerState;
    }

    /**
     * This is a very useful tool to handle conditional consumption.
     * First, specify the number of characters from the stream you wish to analyze.
     * Then, provide a predicate that will be called with those characters ONLY if there were that many available.
     * That predicate should return true if the characters should be consumed, and false if not.
     * Then, provide a 'then' function that will be called with the resulting consumed state
     * and the string of the accepted characters, which should return the state to return from the operation.
     * This method will return a chainable object that can be used to append more checks in the instance that one fails.
     */
    ifHasNext(
        count: number,
        pred: (values: string[]) => boolean,
        then: (state: LexerState, accepted: string) => LexerState
    ): IfHasNextOperation {
        const state = this as LexerState;
        // not enough chars
        if (state.empty) return new IfHasNextOperation(state);
        const { chars, stream } = state.stream.forceRead(count);
        // not enough chars
        if (chars.length !== count) return new IfHasNextOperation(state);
        // predicate deemed it not so
        if (!pred([...chars])) return new IfHasNextOperation(state);
        // predicate deemed it so
        const image = state.image + chars;
        const result = (stream.empty
            ? { ...state, empty: true, image, stream }
            : { ...state, empty: false, image, stream }) as LexerState;
        return new IfHasNextOperation(state, then(result, chars));
    }

    
    /** Returns a completed token and remaining stream based on this LexerState */
    finish(): TokenResult {
        return {
            final: new Token(this.type, this.position, this.image, this.value),
            remaining: this.stream
        };
    }
}

class EmptyLexerState extends LexerStateBase {
    /** Determines whether this LexerState is empty */
    readonly empty = true;

    constructor(
        position: FilePosition,
        char: string,
        /** The remaining available character stream */
        readonly stream: EmptyCharStream
    ) { super(position, char); }
}

class NonEmptyLexerState extends LexerStateBase {
    /** Determines whether this LexerState is empty */
    readonly empty = false;

    constructor(
        position: FilePosition,
        char: string,
        /** The remaining available character stream */
        readonly stream: NonEmptyCharStream
    ) { super(position, char); }

    consume(count = 1): LexerState {
        let chars: string, stream: CharStream;
        if (count === 1) {
            ({ char: chars, stream } = this.stream.read());
        } else {
            ({ chars, stream } = this.stream.forceRead(count));
        }
        const image = this.image + chars;
        return stream.empty
            ? new EmptyLexerState(this.position, image, stream)
            : this.clone({ empty: false, image, stream }) as LexerState;
    }
}
