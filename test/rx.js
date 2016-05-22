try {
  var Rx = require('rx');
  var it_ = it
} catch(e) {
  it_ = it.skip;
}

var M = require("@mfjs/core");
M.option({
  ccTest:{
    CallExpression:{
      match:{name:{"run":true}},
      select:"matchCallName",
      cases:{true:{sub:"full"}}},
    compile:true
  }
});

M.profile("ccTest");
var CC = require("../");
if (Rx) {
  var RxM = CC.makeMonad(
    Rx.Observable.prototype.flatMapLatest,
    Rx.Observable.return,
    Rx.Observable.isObservable);
}

function eff(v) {
  return v;
}

function check(node,v,done) {
  if (done.async)
    done = done.async()
  node.toArray().subscribe(
    function(x) { expect(x).to.eql(v) },
    function(e) { expect().fail(e) },
    done)
}

describe('rx using cc with no effects', function() {
  context('simple loop', function() {
    it_('should return single value', function(done) {
      console.time("long")
      var k = RxM.run(function() {
            var cnt = 1000000;
            eff('b');
            for(var i = 0; i < cnt; i++) {
              eff(i);
            }
            eff('a');
            return true;
      })
      check(k,[true],function() {
        console.timeEnd("long");
        if (done.async)
          done = done.async()
        done()
      })
    })
  })
});

describe('rx using cc with effects', function() {
  context('with no reactive effects', function() {
    it_('should return single value', function(done) {
      var k = RxM.run(function() {
        eff(1)
        return eff(2)
      })
      check(k,[2],done)
    })
  })
  context('with yield', function() {
    it_('should answer its argument', function(done) {
      var k = RxM.run(function() {
        return Rx.Observable.from([1,2,3,4])
      })
      check(k,[1,2,3,4],done)
    })
    it_('should work like flatMapLatest', function(done) {
      var o1 = Rx.Observable.from([1,2,3,4]), o2 = Rx.Observable.from([10,20,30,40])
      var k = RxM.run(function() {
        var k = M(o1)
        var m = M(o2)
        return k + m;
      })
      check(k,[11,12,13,14,24,34,44],done)
    })
    it_('should revert local variables values on backtracking', function(done) {
      var k = RxM.run(function() {
        var i = 1, j = 1
        M.ref(j)
        var k = Rx.Observable.from([1,2,3,4])
        i++, j++
        expect(i).to.equal(2)
        var m = Rx.Observable.from([10,20,30,40])
        i++
        expect(i).to.equal(3)
        return k + m
      })
      check(k,[11,12,13,14,24,34,44],done)
    })
  })
})
