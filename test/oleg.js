'use strict';
// tests ported from http://okmij.org/ftp/continuations/CCmonad/CC_Test.hs
var M = require("@mfjs/core");
M.option({ccTest:{
  CallExpression:{
    match:{qname:{"CC.run":true}},
    select:"matchCallName",
    cases:{true:{sub:"full"}}},
  compile:true}});
M.profile("ccTest");
var CC = require("../");

describe('Oleg', function() {
  var p = CC.newPrompt();
  it('test1', function() {
    var r = CC.run(function() {
      return 4 + CC.pushPrompt(p, M.reify(function() {
        return CC.pushPrompt(p, 5);
      }));
    });
    expect(r).to.equal(9);
  });
  it('test2', function() {
    var r = CC.run(function() {
      return 4 + CC.pushPrompt(p, M.reify(function() {
          return CC.pushPrompt(p, M.reify(function() {
            return 6 + CC.abort(p, 5);
          }));
        }));
    });
    expect(r).to.equal(9);
  });
  it("test3", function() {
    var r = CC.run(function() {
      return 4 + CC.pushPrompt(p, M.reify(function() {
          return 6 + CC.abort(p, 5);
        }));
    });
    r = CC.run(function() {
      return 20 + CC.pushPrompt(p, M.reify(function() {
        var v1 = CC.pushPrompt(p, M.reify(function () {
          return 6 + CC.abort(p, 5);
        })),
        v2 = CC.abort(p, 7);
        return v1 + v2 + 10;
      }));
    });
    expect(r).to.equal(27);
    try {
      CC.run(function() {
        var v = CC.pushPrompt(p, M.reify(function() {
          var v1 = CC.pushPrompt(p, M.reify(function () {
            return 6 + CC.abort(p, 5);
          })),
          v2 = CC.abort(p, 7);
          return v1 + v2 + 10;
        }));
        v = CC.abort(p, 9);
        return v + 20;
      });
      fail('should throw');
    } catch(e) {
      expect(e.message).to.equal("prompt" + p.descr() + " wasn't found");
    }
  });
  it("test4", function() {
    var r = CC.run(function() {
      return 20 + CC.pushPrompt(p, M.reify(function() {
        return 10 + CC.withSubCont(p, function(sk) {
          return CC.pushPrompt(p, M.reify(function() {
            CC.pushSubCont(sk,5);
          }));
        });
      }));
    });
    expect(r).to.equal(35); 
    r = CC.run(function() {
      return 20 + CC.pushPrompt(p, M.reify(function() {
        return 10 + CC.withSubCont(p, function(sk) {
          return CC.pushSubCont(sk, M.reify(function() { 
            return CC.pushPrompt(p, M.reify(function() {
              return CC.pushSubCont(sk, M.reify(function() {
                return CC.abort(p, 5);
              }));
            }));
          }));
        });
      }));
    });
    expect(r).to.equal(35);
  });
  it("test5", function() {
    var r = CC.run(function() {
      return 10 + CC.pushPrompt(p, M.reify(function() {
        return 2 + CC.shift(p, function(sk) {
          return 100 + sk(M.reify(function() { return sk(3); }));
        });
      }));
    });
    expect(r).to.equal(117);
    var p2L = CC.newPrompt();
    var p2R = CC.newPrompt();
    r = CC.run(function() {
      return 10 + CC.pushPrompt(p2L, M.reify(function(){
        return 2 + CC.shift(p2L, function(sk) {
          return 100 + sk(M.reify(function(){
            return CC.pushPrompt(p2R, M.reify(function() {
              return sk(M.reify(function() {
                return sk(M.reify(function() {
                  return CC.abort(p2R, 3);
                  }));
                }));
              }));
            }));
          });
        }));
      });
    expect(r).to.equal(115);
  });
  it("test6", function() {
    var p1 = CC.newPrompt();
    var p2 = CC.newPrompt();
    var r = CC.run(function() {
      function pushtwice(sk) {
        return CC.pushSubCont(sk, M.reify(function() { CC.pushSubCont(sk,3); }));
      }
      return 10 + CC.pushPrompt(p1, M.reify(function() {
        return 1 + CC.pushPrompt(p2, M.reify(function() {
          return CC.withSubCont(p1, pushtwice);
        }));
      }));
    }); 
    expect(r).to.equal(15);
  });
  it("test7", function() {
    var p1 = CC.newPrompt();
    var p2 = CC.newPrompt();
    var p3 = CC.newPrompt();
    var r = CC.run(function() {
      function pushtwice(sk) {
        return CC.pushSubCont(sk, M.reify(function() { 
          CC.pushSubCont(sk,M.reify(function() {
            return CC.withSubCont(p2,function(sk2) {
              return CC.pushSubCont(sk2, M.reify(function() {
                return CC.pushSubCont(sk2, 3);
              }));
            });
          })); 
        }));
      }
      return 100 + CC.pushPrompt(p1, M.reify(function() {
        return 1 + CC.pushPrompt(p2, M.reify(function() {
          return 10 + CC.pushPrompt(p3, M.reify(function() { 
            return CC.withSubCont(p1, pushtwice); 
          }));
        }));
      }));
    });
    expect(r).to.equal(135);
    r = CC.run(function() {
      function pushtwice(f) {
        return f(M.reify(function() { 
          return f(M.reify(function() { 
            return CC.shift(p2, function(f2) { return f2(f2(3)); });
            }));
          }));
      };
      return 100 + CC.pushPrompt(p1, M.reify(function() {
        return 1 + CC.pushPrompt(p2, M.reify(function() {
          return 10 + CC.pushPrompt(p3, M.reify(function() { 
            return CC.shift(p1, pushtwice); 
          }));
        }));
      }));
    });
    expect(r).to.equal(135);
    r = CC.run(function() {
      function pushtwice(f) {
        return f(M.reify(function() { 
          return f(M.reify(function() { 
            return CC.shift0(p2, function(f2) { return f2(f2(3)); });
            }));
          }));
      }; 
      return 100 + CC.pushPrompt(p1, M.reify(function() {
        return 1 + CC.pushPrompt(p2, M.reify(function() {
          return 10 + CC.pushPrompt(p3, M.reify(function() { 
            return CC.shift0(p1, pushtwice); 
          }));
        }));
      }));
    });
    expect(r).to.equal(135);
  });
  it("test shift", function() {
    var r = CC.run(function() {
      return CC.pushPrompt(p, M.reify(function() {
        var x = CC.shift(p, function(f) { ["a"].concat(f([]));});
        return CC.shift(p, function() {return x;});
        }));
      });
    expect(r).to.eql(["a"]);
  });
  it("test shift0", function() {
    var r = CC.run(function() {
      return CC.pushPrompt(p, M.reify(function() {
        return ["a"].concat(
          CC.pushPrompt(p, M.reify(function() {
            return CC.shift0(p, function() {
              return CC.shift0(p, function() {
                return [];
              });
            });
          })));
      }));
    });
    expect(r).to.eql([]);
    r = CC.run(function() {
      return CC.pushPrompt(p, M.reify(function() {
        return ["a"].concat(
          CC.pushPrompt(p, M.reify(function() {
            return CC.shift0(p, function(f) {
              return f(M.reify(function() {
                return CC.shift0(p, function() {
                  return [];
                });
              }));
            });
          })));
      }));
    });
    expect(r).to.eql(["a"]);
  });
  it("test control", function() {
    var r = CC.run(function() {
      return CC.pushPrompt(p, M.reify(function() {
        var xv = CC.control(p, function(f) { return ["a"].concat(f([]));});
        return CC.control(p, function() {return xv;});
        }));
      });
    expect(r).to.eql([]);
    r = CC.run(function() {
      return CC.pushPrompt(p, M.reify(function() {
        var xv = CC.control(p, function(f) { ["a"].concat(f([]));});
        return CC.control(p, function(g) {return g(xv);});
        }));
      });
    expect(r).to.eql(["a"]);
  });
  it("test control0", function() {
    var r = CC.run(function() {
      return CC.pushPrompt(p, M.reify(function() {
        CC.withSubCont(p, function(sk) {
          CC.pushPrompt(p, M.reify(function() {
            return CC.pushSubCont(sk, 1);
            }));
          });
        CC.withSubCont(p, function(sk) {
            return CC.pushSubCont(sk, 2);
        });
      }));
    });
    expect(r).to.equal(2);
  });
});
