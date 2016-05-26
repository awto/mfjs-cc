var M = require("@mfjs/core");
M.profile('regenerator');
var CC = require("../");

var ArrM = CC.makeMonad(
    function(f) { return Array.prototype.concat.apply([],this.map(f)); },
    function(v) { return [v]; });

function eff(v) {
  return v;
}

describe('array using cc', function() {
  it('should return cross product', function() {
      var k = ArrM.run(function*() {
        var x = yield [1,2], y = yield [3,4]
        return x * y
      })
    expect(k).to.eql([3,4,6,8])
  });
  it('should respect other side effects', function() {
    var i = 0;
      var k = ArrM.run(function*() {
        var x = yield [1,2], y
        if (i++) {
          y = yield [3]
          z = yield [1000]
          return "then:"+x+":"+y+":"+z+":"+i;
        } else {
          y = yield [4]
          return "else:"+x+":"+y+":"+i;
        }
      })
    expect(k).to.eql(["else:1:4:1","then:2:3:1000:2"])
    })
  })

