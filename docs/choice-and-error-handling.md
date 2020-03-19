
Ok, so sequences are pretty simple, they can be parsed to tuples initially.
Repetitions can be parsed to lists.
Optionals can be parsed to options.
Literals can be parsed to strings.
Character classes can be parsed to characters.

Choices are the tricky bit.
In TS we did it with union types, which was a very nice and flexible way to handle things.
Rust doesn't have union types, so we need to fundamentally rethink how we handle this.
The closest equivalent is enums, which is probably what we're going to have to use.
The only other alternative is trait objects, but the big problem there is that they are not exhaustive.

If we go with enums, the unfortunate part is that there is going to have to be another layer.
For example, say we have a choice `A | B`.
`A` and `B` each will have their own parse functions, and we will need to define an enum type for the choice.
That enum will have to have its own parse function which calls the parse functions for `A` and `B`.
Then whatever non-terminal contains the choice will call the enum's parse function.
There is no way for it to call `A` and `B` directly, so this makes it so that we can't really be 1:1 with the PEG syntax here.
If it did call `A` and `B` directly, it would need to include logic to wrap those results in the enum, which would get pretty messy.
I think we can make this work nicely enough.
The cool thing is that we'll be able to say `choice::<EnumType>()` and the logic will be hidden within 

Obviously the parser implemented in the actual language will be able to go back to the way that typescript was doing it.


Now we need a way to handle errors.
Each expression type must handle errors in a separate way:
* Sequences expect a sequence of other expressions.
  The "expected" value returned will simply be the "expected" of the first expression in the sequence that failed to parse.
  The "actual" value will be the "actual" returned by that expression.
* Repetitions can only fail if they are base-1. Trailing separators are allowed, so they cannot fail.
  The "expected" value returned is the "expected" of the repeated expression.
  The "actual" value is the "actual" of the repeated expression.
* Optionals cannot fail.
* Literals will fail if the token doesn't match.
  The "expected" value will be the expected literal.
  The "actual" value is the token that was found instead.
* Character classes will fail if the found character doesn't match one of the characters in the class.
  The "expected" value will be either the list of characters, or a semantic description if there are many characters in the class.
  The "actual" value will be the character that was found instead.
  Character classes are a low-level primitive that will likely defer to their caller for handling errors.
* "not" expressions will fail if the inner expression is found.
  The "expected" value will be set to the inner expression.
  The "actual" value will be set to the parsed expression found.
  This is very context-sensitive, so it will almost certainly defer to the caller.
* EOF will fail if there is no EOF at that location.
  The "expected" value is "the end of the file".
  The "actual" value is the token we found instead.

Once again, choices are the tricky bitch.
A choice will only fail if all of the expressions within in fail. Simple enough.
But what do we set the "expected" and "actual" to?
The different choices may have progressed to different positions in the string.
Do we simply look at the ones that progressed the furthest?
This may be another one that we defer to the caller.

Ok, here's what we're going to do.
The goal is to give the user at least something valuable.
The choice that they were going for was most likely the first one that went the furthest.
So we compare the token positions of all of the "actual"s.
Get the maximum position and pick the first choice with that position.
That will be the choice whose "expected" and "actual" we pick.
Callers can throw this out and provide a better message if they want.