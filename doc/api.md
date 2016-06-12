

<!-- Start index.js -->

# Monadic framework for delimited continuations

     var CC = require('@mfjs/cc');

     CC.run(function() {
     // .....
     });

## CC.newPrompt()

Creates a new prompt, distinct from all existing prompts

### Return:

* **Prompt** 

## CC.pushPrompt(p, e)

uses prompt in its first operand to delimit the current continuation during
the evaluation of its second operand.

### Params:

* **Prompt** *p* 
* **CC** *e* 

### Return:

* **CC** 

## CC.withSubCont(p, f)

It captures a portion of the current continuation back to 
but not including the activation of pushPrompt with prompt `p`, aborts the
current continuation back to and including the activation of `pushPrompt`, and
invokes `f`, passing it an abstract value representing the captured subcontinuation.
If more than one activation of pushPrompt with prompt p is still active,
the most recent enclosing activation, i.e., the one that delimits the smallest
subcontinuation, is selected.

### Params:

* **Prompt** *p* 
* **Function** *f* 

### Return:

* **CC** 

## CC.pushSubCont(subk, e)

composes sub-continuation `subk` with current continuation and evaluates 
its second argument.

### Params:

* **SubCont** *subk* 
* **CC** *e* 

### Return:

* **CC** 

## CC.shift(p, f)

### Params:

* **Prompt** *p* 
* **Function** *f* 

### Return:

* **CC** 

## CC.control(p, f)

### Params:

* **Prompt** *p* 
* **Function** *f* 

### Return:

* **CC** 

## CC.shift0(p, f)

### Params:

* **Prompt** *p* 
* **Function** *f* 

### Return:

* **CC** 

## CC.control0(p, f)

### Params:

* **Prompt** *p* 
* **Function** *f* 

### Return:

* **CC** 

## CC.abort(p, f)

### Params:

* **Prompt** *p* 
* **Function** *f* 

### Return:

* **CC** 

## CC.reset(p, f)

### Params:

* **Prompt** *p* 
* **Function** *f* 

### Return:

* **CC** 

## CC.makeMonad(bind, pure, check)

Returns monad definitions suitable for @mfjs/compiler from `bind` and `pure`
implementation for it.

The generated monad definition will also contain `reflect` method for 
embedding inner monads 

### Params:

* **Function** *bind* 
* **Function** *pure* 
* **Function** *check* 

<!-- End index.js -->

