# Multi-prompt delimited continuations in JavaScript.


The library is intended to be used with
[@mfjs/compiler](https://github.com/awto/mfjs-compiler). It closes up the
circle of effects encoding. It is well known many monadic effects may
be encoded using delimited continuation, details are in [Andrzej Filinski from 1994][1].
There is also backward encoding namely, given in [another paper][2]. This library
implements interface from that paper.

So from time to time some people even wonder if functional programming matters
at all. It is enough if runtime system supports delimited continuation to embed
pretty all effects embeddable with mfjs transpiler, but without any
preprocessor. Well, I’m pretty sure browsers will never implement runtime support
for delimited continuations, as there is still no even tail calls optimization.
However there is one other thing. Monadic structure provides more information for
analyzing and generating more effective code. There is some elaboration about this
in `@mfjs/compiler’ docs. 

There is a `CC.makeMonad` function, taking `bind`, `pure` functions and predicate
for checking if the value is monadic and returning. The function returns a
fully compatible monad definition implemented on top of delimited continuation monad.
This seem to be an overhead, converting to CC interface and after converting to monad
interface, but, for some monads, like Rx.Observable this is still faster for parts
of code without effects.

For example:

```javascript
var
  M = require('@mfjs/core'),
  CC = require('@mfjs/cc'),
  RxM = CC.makeMonad(
    Rx.Observable.prototype.flatMapLatest,
    Rx.Observable.return,
    Rx.Observable.isObservable
    );
  M.profile('defaultFull');

  function f1() {
    var k = Rx.Observable.from([1,2,3,4]);
    var l = Rx.Observable.from([10,20,30,40]);
    return k + l;
  }
```

## Usage

```
$ npm install --save-dev @mfjs/compiler
$ npm install --save @mfjs/core @mfjs/cc
$ mfjsc input.js --output=out
# or for browser
$ browserify -t @mfjsc/compiler/monadify input.js -o index.js
```

## References

[1]: http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.43.8213
     "Representing Monads, Andrzej Filinski."
[2]: http://www.cs.indiana.edu/cgi-bin/techreports/TRNNN.cgi?trnum=TR615
     "A Monadic Framework for Delimited Continuations, R. Kent Dybvig, Simon Peyton Jones, Amr Sabry."

## License

Copyright © 2016 Vitaliy Akimov

Distributed under the terms of the [The MIT License (MIT)](LICENSE). 




