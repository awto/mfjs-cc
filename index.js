/**
 * # Monadic framework for delimited continuations

     var CC = require('@mfjs/cc');

     CC.run(function() {
     // .....
     });

*/

'use strict';
var M = require('@mfjs/core'),
    assert = require('assert');

function splitAt(seq, p) {
  var len, pref, v;
  for (var i = 0, len = seq.length; i < len; ++i) {
    v = seq[i];
    if (v.prompt === p) {
      pref = seq.splice(0, i);
      seq.shift();
      return pref;
    }
  }
  
  throw new Error("prompt" + p.descr() + " wasn't found");
}

function app(v, seq) {
  var n;
  if (!seq.length)
    return v;
  while (true) {
    n = seq.shift();
    if (n == null)
      return v;
    if (n.seg != null)
      return coerce(n.seg(v)).run(seq);
  }
};

function CCM() {}  
CCM.prototype.cc = true;

var promptId = 0;

function Prompt(name) {
  this.name = name;
  this.id = promptId++;
}

Prompt.prototype.descr = function() {
  var res = "{";
  if(this.name)
    res+=this.name + "@";
  res += this.id + "}";
  return res;
}

function coerce(v) {
  if ((v != null) && v.cc)
    return v;
  return pure(v);
};

function pure(v) {
  return new Pure(v);
}

function Pure(val) {
  this.val = val;
}
Pure.prototype = new CCM();

Pure.prototype.run = function(k) {
  return app(this.val, k);
};

function AppCC(ce, k) {
  this.ce = ce;
  this.k = k;
}

AppCC.prototype.runAppC = function() {
  return coerce(this.ce).run(this.k);
};

function appCC(ce, k) {
  return new AppCC(ce, k);
//  return coerce(ce).run(k);
}

function runCC(ce) {
  for(var v = appCC(ce,[]);v && v.runAppC;v = v.runAppC());
  return v;
}

function Bind(a, f) {
  this.a = a;
  this.f = f;
}

Bind.prototype = new CCM();

Bind.prototype.run = function(k) {
  k.unshift({seg: this.f});
  return appCC(this.a, k);
};

function Reify(f) {
  this.f = f;
}

Reify.prototype = new CCM();

Reify.prototype.run = function(k) {
  return coerce(this.f()).run(k);
};

function PushPrompt(p, e) {
  this.p = p;
  this.e = e;
}

PushPrompt.prototype = new CCM();

PushPrompt.prototype.run = function(k) {
  k.unshift({prompt: this.p});
  return appCC(this.e, k);
};

function WithSubCont(p, f) {
  this.p = p;
  this.f = f;
}

WithSubCont.prototype = new CCM();

WithSubCont.prototype.run = function(k) {
  return appCC(this.f(splitAt(k, this.p)), k);
};

function PushSubCont(subk, arg) {
  this.subk = subk;
  this.arg = arg;
}

PushSubCont.prototype = new CCM();

PushSubCont.prototype.run = function(k) {
  k.unshift.apply(k, this.subk);
  return appCC(this.arg, k);
};

function Unwind(val, tag) {
  this.val = val;
  this.tag = tag;
}

function CC() {
  this.topPrompt = new Prompt("top");
  this.errorPrompt = new Prompt("error");
}

CC.prototype = new M.MonadDict();

CC.prototype.coerce = coerce;

CC.prototype.pure = pure;

CC.prototype.reify = function(f) {
  return new Reify(f);
};

CC.prototype.bind = function(a, f) {
  return new Bind(a, f);
};

CC.prototype.apply = function(a, f) {
  return new Bind(a, f);
};

/**
* Creates a new prompt, distinct from all existing prompts
* @function CC.newPrompt
* @return {Prompt}
*/
CC.prototype.newPrompt = function(name) {
  return new Prompt(name);
};


/**
 * uses prompt in its first operand to delimit the current continuation during
 * the evaluation of its second operand.
 * @function CC.pushPrompt
 * @param {Prompt} p
 * @param {CC} e
 * @return {CC}
 */
CC.prototype.pushPrompt = function(p, e) {
  return new PushPrompt(p, e);
};

/**
* It captures a portion of the current continuation back to 
* but not including the activation of pushPrompt with prompt `p`, aborts the
* current continuation back to and including the activation of `pushPrompt`, and
* invokes `f`, passing it an abstract value representing the captured subcontinuation.
* If more than one activation of pushPrompt with prompt p is still active,
* the most recent enclosing activation, i.e., the one that delimits the smallest
* subcontinuation, is selected.
* @function CC.withSubCont
* @param {Prompt} p
* @param {Function} f
* @return {CC}
*/
CC.prototype.withSubCont = function(p, f) {
  assert.ok(p instanceof Prompt);
  return new WithSubCont(p, f);
};

CC.prototype.takeSubCont = CC.prototype.withSubCont;

/**
* composes sub-continuation `subk` with current continuation and evaluates 
* its second argument.
* @function CC.pushSubCont
* @param {SubCont} subk
* @param {CC} e
* @return {CC}
*/
CC.prototype.pushSubCont = function(subk, e) {
  return new PushSubCont(subk, e);
};

CC.prototype.exec = function(val) {
  var m = this;
  return M.withContext(m, function() {
    return runCC(m.onUnwindBy(m.errorPrompt, val,
      function(v) { throw v; }));
  });
}

CC.prototype.run = function(f) {
  return this.exec(this.reify(f))
};

CC.prototype.raise = function(e) {
  return this.abort(this.errorPrompt, e);
};

CC.prototype.onUnwindBy = function(p, a, f) {
  var m;
  m = this;
  return m.reset(function(exit) {
    return m.bind(m.pushPrompt(p, m.bind(a, function(v) {
      return m.abort(exit, v);
    })), f);
  });
};

CC.prototype.onUnwindByCont = function(p, a, f) {
  var m = this;
  return m.onUnwindBy(p, a, function(v) {
    return m.bind(f(v), function() {
      return m.abort(p, v);
    });
  });
};

CC.prototype.handle = function(a, f) {
  return this.onUnwindBy(this.errorPrompt, a, f);
};

CC.prototype['finally'] = function(a, f) {
  var m = this;
  return this.bind(this.onUnwindByCont(m.errorPrompt, 
    this.onUnwindByCont(m.topPrompt, a, f), f), f);
};

CC.prototype.block = function(f) {
  var m = this, tag = {};
  return m.bind(m.pushPrompt(m.topPrompt, f(function(arg) {
    return m.abort(m.topPrompt, new Unwind(arg, tag));
  })), function(v) {
    if (v instanceof Unwind) {
      if (v.tag === tag)
        return m.pure(v.val);
      return m.abort(m.topPrompt, v);
    }
    return m.pure(v);
  });
};

/**
* @function CC.shift
* @param {Prompt} p
* @param {Function} f
* @return {CC}
*/
CC.prototype.shift = function(p, f) {
  var m = this;
  return m.withSubCont(p, function(sk) {
    return m.pushPrompt(p, f(function(a) {
      return m.pushPrompt(p, m.pushSubCont(sk, a));
    }));
  });
};


/**
* @function CC.control
* @param {Prompt} p
* @param {Function} f
* @return {CC}
*/
CC.prototype.control = function(p, f) {
  var m = this;
  return m.withSubCont(p, function(sk) {
    return m.pushPrompt(p, f(function(a) {
      return m.pushSubCont(sk, a);
    }));
  });
};

/**
* @function CC.shift0
* @param {Prompt} p
* @param {Function} f
* @return {CC}
*/
CC.prototype.shift0 = function(p, f) {
  var m = this;
  return m.withSubCont(p, function(sk) {
    return f(function(a) {
      return m.pushPrompt(p, m.pushSubCont(sk, a));
    });
  });
};

/**
* @function CC.control0
* @param {Prompt} p
* @param {Function} f
* @return {CC}
*/
CC.prototype.control0 = function(p, f) {
  var m = this;
  return m.withSubCont(p, function(sk) {
    return f(function(a) {
      return m.pushSubCont(sk, a);
    });
  });
};

/**
* @function CC.abort
* @param {Prompt} p
* @param {Function} f
* @return {CC}
*/
CC.prototype.abort = function(p, e) {
  var m = this;
  return this.withSubCont(p, function() {
    return m.pure(e);
  });
};

/**
* @function CC.reset
* @param {Prompt} p
* @param {Function} f
* @return {CC}
*/
CC.prototype.reset = function(f) {
  var p = this.newPrompt();
  return this.pushPrompt(p, f(p));
};

/** 
 * Returns monad definitions suitable for @mfjs/compiler from `bind` and `pure`
 * implementation for it.
 * 
 * The generated monad definition will also contain `reflectM` method for 
 * embedding inner monads 
 * @function CC.makeMonad
 * @param {Function} bind
 * @param {Function} pure
 * @param {Function} check
 */
CC.prototype.makeMonad = function(bind, pure, check) {
  var prompt = new Prompt("monad"), res, lift, nxt;
  function Impl() {
    CC.call(this);
  }
  Impl.prototype = new CC();
  Impl.prototype.reify = function(f) {
    return this.pushPrompt(prompt, 
                           this.bind(this.coerce(f()),
                                     function(v) { return pure(v); }));
  };
  Impl.prototype.reflect = function(v) {
    var m = this;
    return this.shift(prompt, function(k) {
      return bind.call(v,
        M.liftContext(m,function(vv) { return runCC(k(vv)); }));
    });
  };
  if (check) {
    Impl.prototype.coerce = function(v) {
      if (v) {
        if (v.cc)
          return v;
        if (check(v))
          return this.reflect(v);
      }
      return this.pure(v);
    };
  }
  return M.addContext(new Impl());
};

CC.prototype.ctor = CCM;

var defs = new CC();

defs.Defs = CC;

M.completePrototype(defs, CCM.prototype);

module.exports = defs;

