'use strict';
var M = require('@mfjs/core');
var CC = require('../');
var K = require("@mfjs/core/test/kit/dist/noeff");

K(M,function(txt, f) {
  var args = K.defaultItArgs(CC);
  it(txt, function() {
    CC.run(function() {
      return f(args);
    })
  });
});

describe('order of execution', function() {
  M.option({ccTest:{CallExpression:{match:{qname:{'CC.run':true}},
                                    select:'matchCallName',
                                    cases:{true:{sub:'full'}}},compile:true}});
  M.profile('ccTest');
  var p = CC.newPrompt();
  var _state = [];
  var trec = function(v) {
    _state.push(v);
      // for no coerce ---
      // return Def.pure();
  };
  var check = function() {
    expect(_state).to.eql(Array.from(arguments));
    _state.length = 0;
  };
  it('should respect js semantics', function() {
    CC.run(function() {
      CC.pushPrompt(p, M.reify(function() {
        CC.withSubCont(p, function(sk) {
          CC.pushSubCont(sk, M.reify(function(){
            trec(1);
          }));
          trec(2);
          CC.pushSubCont(sk, M.reify(function(){
            trec(3);
          }));
          trec(4);
        });
        trec(5);
      }));
      trec(6);
    });
    check(1,5,2,3,5,4,6);
    CC.run(function() {
      CC.pushPrompt(p, M.reify(function() {
        CC.withSubCont(p, function(sk) {
          CC.pushSubCont(sk, M.reify(function(){
            trec(1);
            CC.pushSubCont(sk, M.reify(function(){
              trec(2);
            }));
            trec(3);
          }));
          trec(4);
        });
        trec(5);
      }));
      trec(6);
    });
    check(1,2,5,3,5,4,6);
  });
});

