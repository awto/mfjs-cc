/**
 * # Monadic framework for delimited continuations

     var CC = require('@mfjs/cc');

     CC.run(function() {
     // .....
     });

*/

'use strict';
var M = require('@mfjs/core'),
    assert = require('assert'),
    CC ;

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
      return n.seg(v).run(seq);
  }
};

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

function AppCC(ce, k) {
  this.ce = ce;
  this.k = k;
}

AppCC.prototype.runAppC = function() {
  return this.ce.run(this.k);
};

function appCC(ce, k) {
  // return new AppCC(ce, k);
  return ce.run(k);
}

function runCC(ce) {
  for(var v = appCC(ce,[]);v && v.runAppC;v = v.runAppC());
  return v;
}

function generate(opts) {
  var CC = {}, reify, reflect, bind, map, ibind, ipure, icheck,
      liftCtx, withCtx, needLift, exec, liftXH1, liftXH12, mprompt,
      lift, coerce, liftCH1, liftCH12, contCC,
      withSubContL, pushSubContL, pushPromptL, 
      topPrompt = new Prompt("top"),
      errorPrompt = new Prompt("error");
  if (!opts)
    opts = {};
  if (opts.coerce == null)
    opts.coerce = true;
  if (opts.context == null)
    opts.context = "run";
  if (opts.context === true) {
    needLift = true;
    liftCtx = function(f) {
      return function(a) {
        var save = M.setContext(CC);
        try {
          return coerce(f(a));
        } finally {
          M.setContext(save);
        }
      }
    };
    withCtx = function(f,a) {
      var save = M.setContext(CC);
      try {
        return coerce(f(a));
      } finally {
        M.setContext(save);
      }
    };
    liftXH1 = function(h) {
      return function(f) {
        return h(liftCtx(f));
      };
    };
    liftXH12 = function(h) {
      return function(a,f) {
        return h(a,liftCtx(f));
      };
    };
  } else {
    liftXH1 = liftXH12 = function(h) { return h; }
  }
  if (opts.inner) {
    mprompt = newPrompt("monad");
    ibind = opts.inner.bind;
    ipure = opts.inner.pure;
    icheck = opts.inner.check;
    reify = function reify(f) {
      return pushPrompt(mprompt,
                        map(new Reify(f),
                            function(v) { return ipure(v); }));
    };
    reflect = function reflect(v) {
      return CC.shift(mprompt, function(k) {
        return pure(ibind.call(v, function(vv) {
          return CC.exec(k(pure(vv)));
        }));
      });
    };
    if (icheck) {
      coerce = function coerce(v) {
        if (v) {
          if (v.top === CCM)
            return v;
          if (icheck(v))
            return reflect(v);
        }
        return pure(v);
      };
      opts.coerce = true;
    }
  } else {
    reify = function reify(f) { return new Reify(f); };
    reflect = function reflect(m) { return m; };
  }
  if (opts.coerce) {
    needLift = true;
    lift = withCtx ?
      function lift(f) {
        return function(a) {
          return coerce(withCtx(f,a));
        };
      } : liftCoerce;
    if (!coerce) {
      coerce = function coerce(v) {
        if ((v != null) && v.top === CCM)
          return v;
        return pure(v);
      };
    }
    liftCH1 = function(h) {
      return function(f) {
        return h(liftCoerce(f));
      };
    };
    liftCH12 = function(h) {
      return function(a,f) {
        return h(a,liftCoerce(f));
      };
    };
    CC.coerce = coerce;
  } else {
    liftCH12 = liftCH1 = CC.coerce = function(v) { return v; };
  }
  contCC = lift ? lift(runCC) : runCC;
  CC.options = opts;
  CC.pure = pure;
  CC.reify = lift ? function(f) { return reify(lift(f)); } : reify;
  CC.reflect = reflect;
  CC.bind = bind;
  CC.handle = liftCH12(handle);
  CC["finally"] = liftCH12(fin);
  CC.map = map;
  CC.newPrompt = newPrompt;
  CC.pushPrompt = pushPromptL = opts.coerce ?
    function(p, e) { return pushPrompt(p, coerce(e)); } : pushPrompt;
  CC.withSubCont = withSubContL = liftCH12(withSubCont);
  CC.takeSubCont = CC.withSubCont;
  CC.pushSubCont = pushSubContL = opts.coerce ?
    function(p, e) { return pushSubCont(p, coerce(e)); } : pushSubCont;
  CC.reset = liftXH1(reset);
  CC.shift = liftXH12(shift);
  CC.shift0 = liftXH12(shift0);
  CC.control = liftXH12(control);
  CC.control0 = liftXH12(control0);
  CC.generate = generate;
  exec = CC.exec = opts.context ? function exec(val) {
    try {
      var save = M.setContext(CC);
      return runCC(onUnwindBy(errorPrompt, val,
                              function(v) { throw v; }));
    } finally {
      M.setContext(save);
    }
  } : function exec(val) {
    return runCC(onUnwindBy(errorPrompt, val,
                            function(v) { throw v; }));
  }
  CC.run = function run(f) {
    return exec(CC.reify(f))
  }
  CC.cloneDefs = cloneDefs;
  CC.Ctor = CCM;
  CC.raise = raise;
  CC.block = liftCH1(block);
  CC.scope = liftCH1(block);
  CC.makeMonad = makeMonad;
  CC.abort = abort;
  CC.forPar = opts.coerce ?
    function(test, body, upd, arg) {
      return forPar(test, liftCoerce(body), upd, arg)
    } : forPar;
  CC.repeat = opts.coerce ?
    function(body, arg) {
      return repeat(liftCoerce(body), arg)
    } : repeat;

  function CCM() {}  
  CCM.prototype.top = CCM;
    
  function pure(v) {
    return new Pure(v);
  }

  function liftCoerce(f) {
    return function(a) { return coerce(f(a)); };
  }
   
  function Pure(val) {
    this.val = val;
  }
  
  Pure.prototype = new CCM();
  Pure.prototype.constructor = Pure;
  
  Pure.prototype.run = function(k) {
    return app(this.val, k);
  };
    
  Pure.prototype.mapply = function(f) {
    this.val = f(this.val);
    return this;
  };

  Pure.prototype.mbind =  opts.coerce ?
    function(f) { return coerce(f(this.val)); } : 
    function(f) { return f(this.val); };
  function Bind(a, f) {
    this.a = a;
    this.f = f;
  }
  
  Bind.prototype = new CCM();
  Bind.prototype.constructor = Bind;
  
  Bind.prototype.run = function(k) {
    k.unshift({seg: this.f});
    return appCC(this.a, k);
  };

  function Reify(f) {
    this.f = f;
  }
  
  Reify.prototype = new CCM();
  Reify.prototype.constructor = Reify;
  
  Reify.prototype.run = function(k) {
    return this.f().run(k);
  };

  function PushPrompt(p, e) {
    this.p = p;
    this.e = e;
  }

  PushPrompt.prototype = new CCM();
  PushPrompt.prototype.constructor = PushPrompt;

  PushPrompt.prototype.run = function(k) {
    k.unshift({prompt: this.p});
    return appCC(this.e, k);
  };
  
  function WithSubCont(p, f) {
    this.p = p;
    this.f = f;
  }
  
  WithSubCont.prototype = new CCM();
  WithSubCont.prototype.constructor = WithSubCont;
  
  WithSubCont.prototype.run = function(k) {
    return appCC(this.f(splitAt(k, this.p)), k);
  };

  function PushSubCont(subk, arg) {
    this.subk = subk;
    if (!arg || !arg.run)
      debugger;
    this.arg = arg;
  }

  PushSubCont.prototype = new CCM();
  PushSubCont.prototype.constructor = PushSubCont;

  PushSubCont.prototype.run = function(k) {
    k.unshift.apply(k, this.subk);
    return appCC(this.arg, k);
  };


  function Unwind(val, tag) {
    this.val = val;
    this.tag = tag;
    this.unwindToken = true;
  }

  CCM.prototype.mbind = opts.coerce ?
    function(f) { return new Bind(this, liftCoerce(f)); } :
    function(f) { return new Bind(this, f); };

  CCM.prototype.mapply = function(f) {
    return new Bind(this, function(v) { return pure(f(v)); });
  }

  function bind(a, f) {
    return a.mbind(f);
  }
  
  function map(a, f) {
    return a.mapply(f);
  }

  /**
   * Creates a new prompt, distinct from all existing prompts
   * @function CC.newPrompt
   * @return {Prompt}
   */
  function newPrompt(name) {
    return new Prompt(name);
  }

  /**
   * uses prompt in its first operand to delimit the current continuation during
   * the evaluation of its second operand.
   * @function CC.pushPrompt
   * @param {Prompt} p
   * @param {CC} e
   * @return {CC}
   */
  function pushPrompt(p, e) {
    return new PushPrompt(p, e);
  }

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
  function withSubCont(p, f) {
    return new WithSubCont(p, f);
  }
  

  /**
   * composes sub-continuation `subk` with current continuation and evaluates 
   * its second argument.
   * @function CC.pushSubCont
   * @param {SubCont} subk
   * @param {CC} e
   * @return {CC}
   */
  function pushSubCont(subk, e) {
    return new PushSubCont(subk, e);
  }


  function raise(e) {
    return abort(errorPrompt, e);
  }

  function onUnwindBy(p, a, f) {
    return reset(function(exit) {
      return bind(pushPrompt(p, bind(a, function(v) {
        return abort(exit, v);
      })), f);
    });
  }

  function onUnwindByCont(p, a, f) {
    return onUnwindBy(p, a, function(v) {
      return bind(f(v), function() {
        return abort(p, v);
      });
    });
  }

  function handle(a, f) {
    return onUnwindBy(errorPrompt, a, f);
  }
  
  function fin(a, f) {
    return bind(onUnwindByCont(errorPrompt, 
                               onUnwindByCont(topPrompt, a, f), f), f);
  }
  
  function block(f) {
    var tag = {};
    return bind(pushPrompt(topPrompt, f(function(arg) {
      return abort(topPrompt, new Unwind(arg, tag));
    })), function(v) {
      if (v != null && v.unwindToken) {
        if (v.tag === tag)
          return pure(v.val);
        return abort(topPrompt, v);
      }
      return pure(v);
    });
  }

  /**
   * @function CC.shift
   * @param {Prompt} p
   * @param {Function} f
   * @return {CC}
   */
  function shift(p, f) {
    return withSubCont(p, function(sk) {
      return pushPromptL(p, f(function(a) {
        return pushPrompt(p, pushSubContL(sk,a));
      }));
    });
  }

  /**
   * @function CC.control
   * @param {Prompt} p
   * @param {Function} f
   * @return {CC}
   */
  function control(p, f) {
    return withSubCont(p, function(sk) {
      return pushPromptL(p, f(function(a) {
        return pushSubContL(sk, a);
      }));
    });
  }

  /**
   * @function CC.shift0
   * @param {Prompt} p
   * @param {Function} f
   * @return {CC}
   */
  function shift0(p, f) {
    return withSubContL(p, function(sk) {
      return f(function(a) {
        return pushPrompt(p, pushSubContL(sk, a));
      });
    });
  }
  
  /**
   * @function CC.control0
   * @param {Prompt} p
   * @param {Function} f
   * @return {CC}
   */
  function control0(p, f) {
    return withSubContL(p, function(sk) {
      return f(function(a) {
        return pushSubContL(sk, a);
      });
    });
  }

  /**
   * @function CC.abort
   * @param {Prompt} p
   * @param {Function} f
   * @return {CC}
   */
  function abort(p, e) {
    return withSubCont(p, function() {
      return pure(e);
    });
  }
  
  /**
   * @function CC.reset
   * @param {Prompt} p
   * @param {Function} f
   * @return {CC}
   */
  function reset(f) {
    var p = newPrompt();
    return pushPromptL(p, f(p));
  }

  function Repeat(body, arg) {
    this.body = body;
    this.arg = arg;
  }

  Repeat.prototype = new CCM();
  Repeat.prototype.constructor = Repeat;
  
  Repeat.prototype.run = function (k) {
    var body = this.body;
    function iter(arg) {
      var i;
      k.unshift({seg:iter});
      for(;;) {
        i = coerce(body(arg)); // TODO: remove coerce
        if (i.constructor !== Pure)
          return i;
        arg = i.val;
      }
      return body(arg);
    }
    return appCC(iter(this.arg), k);
  }
  
  function repeat(body, arg) {
    return new Repeat(body, arg);
  }

  function ForPar(test, body, upd, arg) {
    this.test = test;
    this.body = body;
    this.upd = upd;
    this.arg = arg;
  }
  
  ForPar.prototype = new CCM();
  ForPar.prototype.constructor = ForPar;
  
  ForPar.prototype.run = function(k) {
    var test = this.test, upd = this.upd, body = this.body;
    if (!test(this.arg))
      return app(this.arg, k);
    function iter(arg) {
      var b;
      for(;;) {
        if (!test(arg))
          return pure(arg);
        b = coerce(body(arg)); // TODO: remove
        arg = upd(arg)
        if (b.constructor !== Pure)
          break;
      }
      k.unshift({seg:function() { return iter(arg); }});
      return b;
    }
    return appCC(iter(this.arg),k);
  }
  function forPar(test, body, upd, arg) {
    return new ForPar(test,body,upd,arg);
  }
  CC = cloneDefs(M.completeMonad(CC));
  M.completePrototype(CC,CCM.prototype);
  return CC;
}


/** 
 * Returns monad definitions suitable for @mfjs/compiler from `bind` and `pure`
 * implementation for it.
 * 
 * The generated monad definition will also contain `reflect` method for 
 * embedding inner monads 
 * @function CC.makeMonad
 * @param {Function} bind
 * @param {Function} pure
 * @param {Function} check
 */
function makeMonad(ibind, ipure, check) {
  return generate({inner:{bind:ibind,pure:ipure,check:check},
                   coerce:check != null});
};

function cloneDefs(from) {
  var to;
  if (!from)
    from = this;
  to = M.cloneDefs(from);
  to.makeMonad = from.makeMonad;
  to.newPrompt = from.newPrompt;
  to.abort = from.abort;
  to.reset = from.reset;
  to.control = from.control;
  to.shift = from.shift;
  to.control0 = from.control0;
  to.shift0 = from.shift0;
  to.pushPrompt = from.pushPrompt;
  to.onUnwindByCont = from.onUnwindByCont;
  to.onUnwindBy = from.onUnwindBy;
  to.pushSubCont = from.pushSubCont;
  to.takeSubCont = from.takeSubCont;
  to.withSubCont = from.withSubCont;
  return to;
}

module.exports = generate();

