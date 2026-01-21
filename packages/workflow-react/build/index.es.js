import Tl, { createContext as jo, useContext as Wo, useRef as Cl, useMemo as kl, useEffect as Ll } from "react";
var Xn = { exports: {} }, bn = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var ks;
function _l() {
  if (ks) return bn;
  ks = 1;
  var t = Symbol.for("react.transitional.element"), e = Symbol.for("react.fragment");
  function n(r, i, s) {
    var o = null;
    if (s !== void 0 && (o = "" + s), i.key !== void 0 && (o = "" + i.key), "key" in i) {
      s = {};
      for (var a in i)
        a !== "key" && (s[a] = i[a]);
    } else s = i;
    return i = s.ref, {
      $$typeof: t,
      type: r,
      key: o,
      ref: i !== void 0 ? i : null,
      props: s
    };
  }
  return bn.Fragment = e, bn.jsx = n, bn.jsxs = n, bn;
}
var wn = {};
/**
 * @license React
 * react-jsx-runtime.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Ls;
function Nl() {
  return Ls || (Ls = 1, process.env.NODE_ENV !== "production" && (function() {
    function t(D) {
      if (D == null) return null;
      if (typeof D == "function")
        return D.$$typeof === b ? null : D.displayName || D.name || null;
      if (typeof D == "string") return D;
      switch (D) {
        case y:
          return "Fragment";
        case x:
          return "Profiler";
        case w:
          return "StrictMode";
        case I:
          return "Suspense";
        case R:
          return "SuspenseList";
        case m:
          return "Activity";
      }
      if (typeof D == "object")
        switch (typeof D.tag == "number" && console.error(
          "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
        ), D.$$typeof) {
          case v:
            return "Portal";
          case T:
            return (D.displayName || "Context") + ".Provider";
          case P:
            return (D._context.displayName || "Context") + ".Consumer";
          case L:
            var W = D.render;
            return D = D.displayName, D || (D = W.displayName || W.name || "", D = D !== "" ? "ForwardRef(" + D + ")" : "ForwardRef"), D;
          case f:
            return W = D.displayName || null, W !== null ? W : t(D.type) || "Memo";
          case p:
            W = D._payload, D = D._init;
            try {
              return t(D(W));
            } catch {
            }
        }
      return null;
    }
    function e(D) {
      return "" + D;
    }
    function n(D) {
      try {
        e(D);
        var W = !1;
      } catch {
        W = !0;
      }
      if (W) {
        W = console;
        var st = W.error, at = typeof Symbol == "function" && Symbol.toStringTag && D[Symbol.toStringTag] || D.constructor.name || "Object";
        return st.call(
          W,
          "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
          at
        ), e(D);
      }
    }
    function r(D) {
      if (D === y) return "<>";
      if (typeof D == "object" && D !== null && D.$$typeof === p)
        return "<...>";
      try {
        var W = t(D);
        return W ? "<" + W + ">" : "<...>";
      } catch {
        return "<...>";
      }
    }
    function i() {
      var D = S.A;
      return D === null ? null : D.getOwner();
    }
    function s() {
      return Error("react-stack-top-frame");
    }
    function o(D) {
      if (M.call(D, "key")) {
        var W = Object.getOwnPropertyDescriptor(D, "key").get;
        if (W && W.isReactWarning) return !1;
      }
      return D.key !== void 0;
    }
    function a(D, W) {
      function st() {
        U || (U = !0, console.error(
          "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
          W
        ));
      }
      st.isReactWarning = !0, Object.defineProperty(D, "key", {
        get: st,
        configurable: !0
      });
    }
    function c() {
      var D = t(this.type);
      return A[D] || (A[D] = !0, console.error(
        "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
      )), D = this.props.ref, D !== void 0 ? D : null;
    }
    function u(D, W, st, at, q, K, et, Q) {
      return st = K.ref, D = {
        $$typeof: g,
        type: D,
        key: W,
        props: K,
        _owner: q
      }, (st !== void 0 ? st : null) !== null ? Object.defineProperty(D, "ref", {
        enumerable: !1,
        get: c
      }) : Object.defineProperty(D, "ref", { enumerable: !1, value: null }), D._store = {}, Object.defineProperty(D._store, "validated", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: 0
      }), Object.defineProperty(D, "_debugInfo", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: null
      }), Object.defineProperty(D, "_debugStack", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: et
      }), Object.defineProperty(D, "_debugTask", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: Q
      }), Object.freeze && (Object.freeze(D.props), Object.freeze(D)), D;
    }
    function h(D, W, st, at, q, K, et, Q) {
      var Y = W.children;
      if (Y !== void 0)
        if (at)
          if (_(Y)) {
            for (at = 0; at < Y.length; at++)
              l(Y[at]);
            Object.freeze && Object.freeze(Y);
          } else
            console.error(
              "React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead."
            );
        else l(Y);
      if (M.call(W, "key")) {
        Y = t(D);
        var rt = Object.keys(W).filter(function(nt) {
          return nt !== "key";
        });
        at = 0 < rt.length ? "{key: someKey, " + rt.join(": ..., ") + ": ...}" : "{key: someKey}", N[Y + at] || (rt = 0 < rt.length ? "{" + rt.join(": ..., ") + ": ...}" : "{}", console.error(
          `A props object containing a "key" prop is being spread into JSX:
  let props = %s;
  <%s {...props} />
React keys must be passed directly to JSX without using spread:
  let props = %s;
  <%s key={someKey} {...props} />`,
          at,
          Y,
          rt,
          Y
        ), N[Y + at] = !0);
      }
      if (Y = null, st !== void 0 && (n(st), Y = "" + st), o(W) && (n(W.key), Y = "" + W.key), "key" in W) {
        st = {};
        for (var lt in W)
          lt !== "key" && (st[lt] = W[lt]);
      } else st = W;
      return Y && a(
        st,
        typeof D == "function" ? D.displayName || D.name || "Unknown" : D
      ), u(
        D,
        Y,
        K,
        q,
        i(),
        st,
        et,
        Q
      );
    }
    function l(D) {
      typeof D == "object" && D !== null && D.$$typeof === g && D._store && (D._store.validated = 1);
    }
    var d = Tl, g = Symbol.for("react.transitional.element"), v = Symbol.for("react.portal"), y = Symbol.for("react.fragment"), w = Symbol.for("react.strict_mode"), x = Symbol.for("react.profiler"), P = Symbol.for("react.consumer"), T = Symbol.for("react.context"), L = Symbol.for("react.forward_ref"), I = Symbol.for("react.suspense"), R = Symbol.for("react.suspense_list"), f = Symbol.for("react.memo"), p = Symbol.for("react.lazy"), m = Symbol.for("react.activity"), b = Symbol.for("react.client.reference"), S = d.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, M = Object.prototype.hasOwnProperty, _ = Array.isArray, F = console.createTask ? console.createTask : function() {
      return null;
    };
    d = {
      react_stack_bottom_frame: function(D) {
        return D();
      }
    };
    var U, A = {}, C = d.react_stack_bottom_frame.bind(
      d,
      s
    )(), k = F(r(s)), N = {};
    wn.Fragment = y, wn.jsx = function(D, W, st, at, q) {
      var K = 1e4 > S.recentlyCreatedOwnerStacks++;
      return h(
        D,
        W,
        st,
        !1,
        at,
        q,
        K ? Error("react-stack-top-frame") : C,
        K ? F(r(D)) : k
      );
    }, wn.jsxs = function(D, W, st, at, q) {
      var K = 1e4 > S.recentlyCreatedOwnerStacks++;
      return h(
        D,
        W,
        st,
        !0,
        at,
        q,
        K ? Error("react-stack-top-frame") : C,
        K ? F(r(D)) : k
      );
    };
  })()), wn;
}
var _s;
function Ml() {
  return _s || (_s = 1, process.env.NODE_ENV === "production" ? Xn.exports = _l() : Xn.exports = Nl()), Xn.exports;
}
var br = Ml(), Il = Object.defineProperty, Xt = (t, e) => {
  for (var n in e) Il(t, n, {
    get: e[n],
    enumerable: !0
  });
};
const { round: Ol, floor: Rl, PI: Ho } = Math, Dl = { linear: function(t, e, n) {
  var r = t[1] - t[0], i = e[1] - e[0];
  return (n - t[0]) / r * i + e[0] || 0;
} }, Qt = function(t) {
  return t % 360 + (t < 0 ? 360 : 0);
}, Be = function(t, e) {
  return e * Ol(t / e);
}, Lr = function(t) {
  return 180 * t / Ho % 360;
}, Ut = function(t, e) {
  return e = e || !1, t = e ? t : t % 360, t * Ho / 180;
}, fi = function(t, e) {
  if (e === void 0)
    e = t === void 0 ? 1 : t, t = 0;
  else if (e < t) {
    const n = t;
    t = e, e = n;
  }
  return Rl(Math.random() * (e - t + 1) + t);
}, { cos: Jn, sin: Xr, atan2: Fl } = Math, $o = function(t, e) {
  var n = Ut(t.y), r = Ut(e.y), i = t.x, s = e.x, o = Ut(s - i), a = Xr(o) * Jn(r), c = Jn(n) * Xr(r) - Xr(n) * Jn(r) * Jn(o), u = Lr(Fl(a, c)), h = [
    "NE",
    "E",
    "SE",
    "S",
    "SW",
    "W",
    "NW",
    "N"
  ], l = u - 22.5;
  return l < 0 && (l += 360), l = parseInt(l / 45), h[l];
}, Gi = function(t, e) {
  var n = t.x, r = t.y, i = e.x, s = e.y;
  return (n -= i) * n + (r -= s) * r;
}, qo = function(t, e) {
  return Math.sqrt(Gi(t, e));
}, ct = {
  Point: 1,
  Line: 2,
  Ellipse: 3,
  Rect: 4,
  Polyline: 5,
  Polygon: 6,
  Curve: 7,
  Path: 8
}, { abs: wr, cos: di, sin: gi, sqrt: Ns, min: Ms, max: Is, atan2: Bl, round: Os, pow: Vl, PI: Rs } = Math, E = function(t, e) {
  if (!(this instanceof E)) return new E(t, e);
  if (typeof t == "string") {
    var n = t.split(t.indexOf("@") === -1 ? " " : "@");
    t = parseFloat(n[0]), e = parseFloat(n[1]);
  } else Object(t) === t && (e = t.y, t = t.x);
  this.x = t === void 0 ? 0 : t, this.y = e === void 0 ? 0 : e;
};
E.fromPolar = function(t, e, n) {
  n = new E(n);
  var r = wr(t * di(e)), i = wr(t * gi(e)), s = Qt(Lr(e));
  return s < 90 ? i = -i : s < 180 ? (r = -r, i = -i) : s < 270 && (r = -r), new E(n.x + r, n.y + i);
};
E.random = function(t, e, n, r) {
  return new E(fi(t, e), fi(n, r));
};
E.prototype = {
  type: ct.Point,
  chooseClosest: function(t) {
    var e = t.length;
    if (e === 1) return new E(t[0]);
    for (var n = null, r = 1 / 0, i = 0; i < e; i++) {
      var s = new E(t[i]), o = this.squaredDistance(s);
      o < r && (n = s, r = o);
    }
    return n;
  },
  adhereToRect: function(t) {
    return t.containsPoint(this) ? this : (this.x = Ms(Is(this.x, t.x), t.x + t.width), this.y = Ms(Is(this.y, t.y), t.y + t.height), this);
  },
  angleBetween: function(t, e) {
    var n = this.equals(t) || this.equals(e) ? NaN : this.theta(e) - this.theta(t);
    return n < 0 && (n += 360), n;
  },
  bearing: function(t) {
    return $o(this, t);
  },
  changeInAngle: function(t, e, n) {
    return this.clone().offset(-t, -e).theta(n) - this.theta(n);
  },
  clone: function() {
    return new E(this);
  },
  cross: function(t, e) {
    return t && e ? (e.x - this.x) * (t.y - this.y) - (e.y - this.y) * (t.x - this.x) : NaN;
  },
  difference: function(t, e) {
    return Object(t) === t && (e = t.y, t = t.x), new E(this.x - (t || 0), this.y - (e || 0));
  },
  distance: function(t) {
    return qo(this, t);
  },
  dot: function(t) {
    return t ? this.x * t.x + this.y * t.y : NaN;
  },
  equals: function(t) {
    return !!t && this.x === t.x && this.y === t.y;
  },
  lerp: function(t, e) {
    var n = this.x, r = this.y;
    return new E((1 - e) * n + e * t.x, (1 - e) * r + e * t.y);
  },
  magnitude: function() {
    return Ns(this.x * this.x + this.y * this.y) || 0.01;
  },
  manhattanDistance: function(t) {
    return wr(t.x - this.x) + wr(t.y - this.y);
  },
  move: function(t, e) {
    var n = Ut(new E(t).theta(this)), r = this.offset(di(n) * e, -gi(n) * e);
    return r;
  },
  normalize: function(t) {
    var e = (t || 1) / this.magnitude();
    return this.scale(e, e);
  },
  offset: function(t, e) {
    return Object(t) === t && (e = t.y, t = t.x), this.x += t || 0, this.y += e || 0, this;
  },
  reflection: function(t) {
    return new E(t).move(this, this.distance(t));
  },
  rotate: function(t, e) {
    if (e === 0) return this;
    t = t || new E(0, 0), e = Ut(Qt(-e));
    var n = di(e), r = gi(e), i = n * (this.x - t.x) - r * (this.y - t.y) + t.x, s = r * (this.x - t.x) + n * (this.y - t.y) + t.y;
    return this.x = i, this.y = s, this;
  },
  round: function(t) {
    let e = 1;
    if (t) switch (t) {
      case 1:
        e = 10;
        break;
      case 2:
        e = 100;
        break;
      case 3:
        e = 1e3;
        break;
      default:
        e = Vl(10, t);
        break;
    }
    return this.x = Os(this.x * e) / e, this.y = Os(this.y * e) / e, this;
  },
  scale: function(t, e, n) {
    return n = n && new E(n) || new E(0, 0), this.x = n.x + t * (this.x - n.x), this.y = n.y + e * (this.y - n.y), this;
  },
  snapToGrid: function(t, e) {
    return this.x = Be(this.x, t), this.y = Be(this.y, e || t), this;
  },
  squaredDistance: function(t) {
    return Gi(this, t);
  },
  theta: function(t) {
    t = new E(t);
    var e = -(t.y - this.y), n = t.x - this.x, r = Bl(e, n);
    return r < 0 && (r = 2 * Rs + r), 180 * r / Rs;
  },
  toJSON: function() {
    return {
      x: this.x,
      y: this.y
    };
  },
  toPolar: function(t) {
    t = t && new E(t) || new E(0, 0);
    var e = this.x, n = this.y;
    return this.x = Ns((e - t.x) * (e - t.x) + (n - t.y) * (n - t.y)), this.y = Ut(t.theta(new E(e, n))), this;
  },
  toString: function() {
    return this.x + "@" + this.y;
  },
  serialize: function() {
    return this.x + "," + this.y;
  },
  update: function(t, e) {
    return Object(t) === t && (e = t.y, t = t.x), this.x = t || 0, this.y = e || 0, this;
  },
  vectorAngle: function(t) {
    var e = new E(0, 0);
    return e.angleBetween(this, t);
  }
};
E.prototype.translate = E.prototype.offset;
const xr = E, { max: Jr, min: Kr } = Math, H = function(t, e) {
  if (!(this instanceof H)) return new H(t, e);
  if (t instanceof H) return new H(t.start, t.end);
  this.start = new E(t), this.end = new E(e);
};
H.prototype = {
  type: ct.Line,
  angle: function() {
    var t = new E(this.start.x + 1, this.start.y);
    return this.start.angleBetween(this.end, t);
  },
  bbox: function() {
    var t = Kr(this.start.x, this.end.x), e = Kr(this.start.y, this.end.y), n = Jr(this.start.x, this.end.x), r = Jr(this.start.y, this.end.y);
    return new j(t, e, n - t, r - e);
  },
  bearing: function() {
    return $o(this.start, this.end);
  },
  clone: function() {
    return new H(this.start, this.end);
  },
  closestPoint: function(t) {
    return this.pointAt(this.closestPointNormalizedLength(t));
  },
  closestPointLength: function(t) {
    return this.closestPointNormalizedLength(t) * this.length();
  },
  closestPointNormalizedLength: function(t) {
    var e = this.vector().dot(new H(this.start, t).vector()), n = Kr(1, Jr(0, e / this.squaredLength()));
    return n !== n ? 0 : n;
  },
  closestPointTangent: function(t) {
    return this.tangentAt(this.closestPointNormalizedLength(t));
  },
  containsPoint: function(t) {
    var e = this.start, n = this.end;
    if (e.cross(t, n) !== 0) return !1;
    var r = this.length();
    return !(new H(e, t).length() > r || new H(t, n).length() > r);
  },
  divideAt: function(t) {
    var e = this.pointAt(t);
    return [new H(this.start, e), new H(e, this.end)];
  },
  divideAtLength: function(t) {
    var e = this.pointAtLength(t);
    return [new H(this.start, e), new H(e, this.end)];
  },
  equals: function(t) {
    return !!t && this.start.x === t.start.x && this.start.y === t.start.y && this.end.x === t.end.x && this.end.y === t.end.y;
  },
  intersect: function(t, e) {
    if (t && t.intersectionWithLine) {
      var n = t.intersectionWithLine(this, e);
      return n && t instanceof H && (n = n[0]), n;
    }
    return null;
  },
  intersectionWithLine: function(t) {
    var e = new E(this.end.x - this.start.x, this.end.y - this.start.y), n = new E(t.end.x - t.start.x, t.end.y - t.start.y), r = e.x * n.y - e.y * n.x, i = new E(t.start.x - this.start.x, t.start.y - this.start.y), s = i.x * n.y - i.y * n.x, o = i.x * e.y - i.y * e.x;
    if (r === 0 || s * r < 0 || o * r < 0) return null;
    if (r > 0) {
      if (s > r || o > r) return null;
    } else if (s < r || o < r) return null;
    return [new E(this.start.x + s * e.x / r, this.start.y + s * e.y / r)];
  },
  isDifferentiable: function() {
    return !this.start.equals(this.end);
  },
  length: function() {
    return qo(this.start, this.end);
  },
  midpoint: function() {
    return new E((this.start.x + this.end.x) / 2, (this.start.y + this.end.y) / 2);
  },
  parallel: function(t) {
    const e = this.clone();
    if (!this.isDifferentiable()) return e;
    const { start: n, end: r } = e, i = n.clone().rotate(r, 270), s = r.clone().rotate(n, 90);
    return n.move(s, t), r.move(i, t), e;
  },
  pointAt: function(t) {
    var e = this.start, n = this.end;
    return t <= 0 ? e.clone() : t >= 1 ? n.clone() : e.lerp(n, t);
  },
  pointAtLength: function(t) {
    var e = this.start, n = this.end, r = !0;
    t < 0 && (r = !1, t = -t);
    var i = this.length();
    return t >= i ? r ? n.clone() : e.clone() : this.pointAt((r ? t : i - t) / i);
  },
  pointOffset: function(t) {
    t = new E(t);
    var e = this.start, n = this.end, r = (n.x - e.x) * (t.y - e.y) - (n.y - e.y) * (t.x - e.x);
    return r / this.length();
  },
  rotate: function(t, e) {
    return this.start.rotate(t, e), this.end.rotate(t, e), this;
  },
  round: function(t) {
    return this.start.round(t), this.end.round(t), this;
  },
  scale: function(t, e, n) {
    return this.start.scale(t, e, n), this.end.scale(t, e, n), this;
  },
  setLength: function(t) {
    var e = this.length();
    if (!e) return this;
    var n = t / e;
    return this.scale(n, n, this.start);
  },
  squaredLength: function() {
    return Gi(this.start, this.end);
  },
  tangentAt: function(t) {
    if (!this.isDifferentiable()) return null;
    var e = this.start, n = this.end, r = this.pointAt(t), i = new H(e, n);
    return i.translate(r.x - e.x, r.y - e.y), i;
  },
  tangentAtLength: function(t) {
    if (!this.isDifferentiable()) return null;
    var e = this.start, n = this.end, r = this.pointAtLength(t), i = new H(e, n);
    return i.translate(r.x - e.x, r.y - e.y), i;
  },
  toString: function() {
    return this.start.toString() + " " + this.end.toString();
  },
  serialize: function() {
    return this.start.serialize() + " " + this.end.serialize();
  },
  translate: function(t, e) {
    return this.start.translate(t, e), this.end.translate(t, e), this;
  },
  vector: function() {
    return new E(this.end.x - this.start.x, this.end.y - this.start.y);
  }
};
H.prototype.intersection = H.prototype.intersect;
const Re = H, { sqrt: Ds, round: Kn, pow: Gl } = Math, Vt = function(t, e, n) {
  if (!(this instanceof Vt)) return new Vt(t, e, n);
  if (t instanceof Vt) return new Vt(new E(t.x, t.y), t.a, t.b);
  t = new E(t), this.x = t.x, this.y = t.y, this.a = e, this.b = n;
};
Vt.fromRect = function(t) {
  return t = new j(t), new Vt(t.center(), t.width / 2, t.height / 2);
};
Vt.prototype = {
  type: ct.Ellipse,
  bbox: function() {
    return new j(this.x - this.a, this.y - this.b, 2 * this.a, 2 * this.b);
  },
  center: function() {
    return new E(this.x, this.y);
  },
  clone: function() {
    return new Vt(this);
  },
  containsPoint: function(t) {
    return this.normalizedDistance(t) <= 1;
  },
  equals: function(t) {
    return !!t && t.x === this.x && t.y === this.y && t.a === this.a && t.b === this.b;
  },
  inflate: function(t, e) {
    return t === void 0 && (t = 0), e === void 0 && (e = t), this.a += 2 * t, this.b += 2 * e, this;
  },
  intersectionWithLine: function(t) {
    var e = [], n = t.start, r = t.end, i = this.a, s = this.b, o = t.vector(), a = n.difference(new E(this)), c = new E(o.x / (i * i), o.y / (s * s)), u = new E(a.x / (i * i), a.y / (s * s)), h = o.dot(c), l = o.dot(u), d = a.dot(u) - 1, g = l * l - h * d;
    if (g < 0) return null;
    if (g > 0) {
      var v = Ds(g), y = (-l - v) / h, w = (-l + v) / h;
      if ((y < 0 || 1 < y) && (w < 0 || 1 < w)) return null;
      0 <= y && y <= 1 && e.push(n.lerp(r, y)), 0 <= w && w <= 1 && e.push(n.lerp(r, w));
    } else {
      var x = -l / h;
      if (0 <= x && x <= 1) e.push(n.lerp(r, x));
      else return null;
    }
    return e;
  },
  intersectionWithLineFromCenterToPoint: function(t, e) {
    t = new E(t), e && t.rotate(new E(this.x, this.y), e);
    var n = t.x - this.x, r = t.y - this.y, i;
    if (n === 0)
      return i = this.bbox().pointNearestToPoint(t), e ? i.rotate(new E(this.x, this.y), -e) : i;
    var s = r / n, o = s * s, a = this.a * this.a, c = this.b * this.b, u = Ds(1 / (1 / a + o / c));
    u = n < 0 ? -u : u;
    var h = s * u;
    return i = new E(this.x + u, this.y + h), e ? i.rotate(new E(this.x, this.y), -e) : i;
  },
  normalizedDistance: function(t) {
    var e = t.x, n = t.y, r = this.a, i = this.b, s = this.x, o = this.y;
    return (e - s) * (e - s) / (r * r) + (n - o) * (n - o) / (i * i);
  },
  round: function(t) {
    let e = 1;
    if (t) switch (t) {
      case 1:
        e = 10;
        break;
      case 2:
        e = 100;
        break;
      case 3:
        e = 1e3;
        break;
      default:
        e = Gl(10, t);
        break;
    }
    return this.x = Kn(this.x * e) / e, this.y = Kn(this.y * e) / e, this.a = Kn(this.a * e) / e, this.b = Kn(this.b * e) / e, this;
  },
  tangentTheta: function(t) {
    var e = 30, n = t.x, r = t.y, i = this.a, s = this.b, o = this.bbox().center(), a = o.x, c = o.y, u = n > o.x + i / 2, h = n < o.x - i / 2, l, d;
    return u || h ? (l = n > o.x ? r - e : r + e, d = i * i / (n - a) - i * i * (r - c) * (l - c) / (s * s * (n - a)) + a) : (d = r > o.y ? n + e : n - e, l = s * s / (r - c) - s * s * (n - a) * (d - a) / (i * i * (r - c)) + c), new E(d, l).theta(t);
  },
  toString: function() {
    return new E(this.x, this.y).toString() + " " + this.a + " " + this.b;
  }
};
const zl = Vt, { abs: Fs, cos: Ul, sin: jl, min: xn, max: Bs, round: Zn, pow: Wl } = Math, j = function(t, e, n, r) {
  if (!(this instanceof j)) return new j(t, e, n, r);
  Object(t) === t && (e = t.y, n = t.width, r = t.height, t = t.x), this.x = t === void 0 ? 0 : t, this.y = e === void 0 ? 0 : e, this.width = n === void 0 ? 0 : n, this.height = r === void 0 ? 0 : r;
};
j.fromEllipse = function(t) {
  return t = new Vt(t), new j(t.x - t.a, t.y - t.b, 2 * t.a, 2 * t.b);
};
j.fromPointUnion = function(...t) {
  if (t.length === 0) return null;
  const e = new E();
  let n, r, i, s;
  n = r = 1 / 0, i = s = -1 / 0;
  for (let o = 0; o < t.length; o++) {
    e.update(t[o]);
    const a = e.x, c = e.y;
    a < n && (n = a), a > i && (i = a), c < r && (r = c), c > s && (s = c);
  }
  return new j(n, r, i - n, s - r);
};
j.fromRectUnion = function(...t) {
  if (t.length === 0) return null;
  const e = new j();
  let n, r, i, s;
  n = r = 1 / 0, i = s = -1 / 0;
  for (let o = 0; o < t.length; o++) {
    e.update(t[o]);
    const a = e.x, c = e.y, u = a + e.width, h = c + e.height;
    a < n && (n = a), u > i && (i = u), c < r && (r = c), h > s && (s = h);
  }
  return new j(n, r, i - n, s - r);
};
j.prototype = {
  type: ct.Rect,
  bbox: function(t) {
    return this.clone().rotateAroundCenter(t);
  },
  rotateAroundCenter: function(t) {
    if (!t) return this;
    const { width: e, height: n } = this, r = Ut(t), i = Fs(jl(r)), s = Fs(Ul(r)), o = e * s + n * i, a = e * i + n * s;
    return this.x += (e - o) / 2, this.y += (n - a) / 2, this.width = o, this.height = a, this;
  },
  bottomLeft: function() {
    return new E(this.x, this.y + this.height);
  },
  bottomLine: function() {
    return new H(this.bottomLeft(), this.bottomRight());
  },
  bottomMiddle: function() {
    return new E(this.x + this.width / 2, this.y + this.height);
  },
  center: function() {
    return new E(this.x + this.width / 2, this.y + this.height / 2);
  },
  clone: function() {
    return new j(this);
  },
  containsPoint: function(t, e) {
    let n, r;
    return !t || typeof t == "string" ? { x: n, y: r } = new E(t) : { x: n = 0, y: r = 0 } = t, e && e.strict ? n > this.x && n < this.x + this.width && r > this.y && r < this.y + this.height : n >= this.x && n <= this.x + this.width && r >= this.y && r <= this.y + this.height;
  },
  containsRect: function(t) {
    var e = new j(this).normalize(), n = new j(t).normalize(), r = e.width, i = e.height, s = n.width, o = n.height;
    if (!r || !i || !s || !o) return !1;
    var a = e.x, c = e.y, u = n.x, h = n.y;
    return s += u, r += a, o += h, i += c, a <= u && s <= r && c <= h && o <= i;
  },
  corner: function() {
    return new E(this.x + this.width, this.y + this.height);
  },
  equals: function(t) {
    var e = new j(this).normalize(), n = new j(t).normalize();
    return e.x === n.x && e.y === n.y && e.width === n.width && e.height === n.height;
  },
  inflate: function(t, e) {
    return t === void 0 && (t = 0), e === void 0 && (e = t), this.x -= t, this.y -= e, this.width += 2 * t, this.height += 2 * e, this;
  },
  intersect: function(t) {
    var e = this.origin(), n = this.corner(), r = t.origin(), i = t.corner();
    if (i.x <= e.x || i.y <= e.y || r.x >= n.x || r.y >= n.y) return null;
    var s = Bs(e.x, r.x), o = Bs(e.y, r.y);
    return new j(s, o, xn(n.x, i.x) - s, xn(n.y, i.y) - o);
  },
  intersectionWithLine: function(t) {
    var e = this, n = [
      e.topLine(),
      e.rightLine(),
      e.bottomLine(),
      e.leftLine()
    ], r = [], i = [], s, o, a = n.length;
    for (o = 0; o < a; o++)
      s = t.intersect(n[o]), s !== null && i.indexOf(s.toString()) < 0 && (r.push(s), i.push(s.toString()));
    return r.length > 0 ? r : null;
  },
  intersectionWithLineFromCenterToPoint: function(t, e) {
    t = new E(t);
    var n = new E(this.x + this.width / 2, this.y + this.height / 2), r;
    e && t.rotate(n, e);
    for (var i = [
      this.topLine(),
      this.rightLine(),
      this.bottomLine(),
      this.leftLine()
    ], s = new H(n, t), o = i.length - 1; o >= 0; --o) {
      var a = i[o].intersection(s);
      if (a !== null) {
        r = a;
        break;
      }
    }
    return r && e && r.rotate(n, -e), r;
  },
  leftLine: function() {
    return new H(this.topLeft(), this.bottomLeft());
  },
  leftMiddle: function() {
    return new E(this.x, this.y + this.height / 2);
  },
  maxRectScaleToFit: function(t, e) {
    t = new j(t), e || (e = t.center());
    var n, r, i, s, o, a, c, u, h = e.x, l = e.y;
    n = r = i = s = o = a = c = u = 1 / 0;
    var d = t.topLeft();
    d.x < h && (n = (this.x - h) / (d.x - h)), d.y < l && (o = (this.y - l) / (d.y - l));
    var g = t.bottomRight();
    g.x > h && (r = (this.x + this.width - h) / (g.x - h)), g.y > l && (a = (this.y + this.height - l) / (g.y - l));
    var v = t.topRight();
    v.x > h && (i = (this.x + this.width - h) / (v.x - h)), v.y < l && (c = (this.y - l) / (v.y - l));
    var y = t.bottomLeft();
    return y.x < h && (s = (this.x - h) / (y.x - h)), y.y > l && (u = (this.y + this.height - l) / (y.y - l)), {
      sx: xn(n, r, i, s),
      sy: xn(o, a, c, u)
    };
  },
  maxRectUniformScaleToFit: function(t, e) {
    var n = this.maxRectScaleToFit(t, e);
    return xn(n.sx, n.sy);
  },
  moveAndExpand: function(t) {
    return this.x += t.x || 0, this.y += t.y || 0, this.width += t.width || 0, this.height += t.height || 0, this;
  },
  normalize: function() {
    var t = this.x, e = this.y, n = this.width, r = this.height;
    return this.width < 0 && (t = this.x + this.width, n = -this.width), this.height < 0 && (e = this.y + this.height, r = -this.height), this.x = t, this.y = e, this.width = n, this.height = r, this;
  },
  offset: function(t, e) {
    return E.prototype.offset.call(this, t, e);
  },
  origin: function() {
    return new E(this.x, this.y);
  },
  pointNearestToPoint: function(t) {
    if (t = new E(t), this.containsPoint(t)) {
      var e = this.sideNearestToPoint(t);
      switch (e) {
        case "right":
          return new E(this.x + this.width, t.y);
        case "left":
          return new E(this.x, t.y);
        case "bottom":
          return new E(t.x, this.y + this.height);
        case "top":
          return new E(t.x, this.y);
      }
    }
    return t.adhereToRect(this);
  },
  rightLine: function() {
    return new H(this.topRight(), this.bottomRight());
  },
  rightMiddle: function() {
    return new E(this.x + this.width, this.y + this.height / 2);
  },
  round: function(t) {
    let e = 1;
    if (t) switch (t) {
      case 1:
        e = 10;
        break;
      case 2:
        e = 100;
        break;
      case 3:
        e = 1e3;
        break;
      default:
        e = Wl(10, t);
        break;
    }
    return this.x = Zn(this.x * e) / e, this.y = Zn(this.y * e) / e, this.width = Zn(this.width * e) / e, this.height = Zn(this.height * e) / e, this;
  },
  scale: function(t, e, n) {
    return n = this.origin().scale(t, e, n), this.x = n.x, this.y = n.y, this.width *= t, this.height *= e, this;
  },
  sideNearestToPoint: function(t) {
    t = new E(t);
    var e = t.x - this.x, n = this.x + this.width - t.x, r = t.y - this.y, i = this.y + this.height - t.y, s = e, o = "left";
    return n < s && (s = n, o = "right"), r < s && (s = r, o = "top"), i < s && (o = "bottom"), o;
  },
  snapToGrid: function(t, e) {
    var n = this.origin().snapToGrid(t, e), r = this.corner().snapToGrid(t, e);
    return this.x = n.x, this.y = n.y, this.width = r.x - n.x, this.height = r.y - n.y, this;
  },
  toJSON: function() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  },
  topLine: function() {
    return new H(this.topLeft(), this.topRight());
  },
  topMiddle: function() {
    return new E(this.x + this.width / 2, this.y);
  },
  topRight: function() {
    return new E(this.x + this.width, this.y);
  },
  toString: function() {
    return this.origin().toString() + " " + this.corner().toString();
  },
  union: function(t) {
    return j.fromRectUnion(this, t);
  },
  update: function(t, e, n, r) {
    return Object(t) === t && (e = t.y, n = t.width, r = t.height, t = t.x), this.x = t || 0, this.y = e || 0, this.width = n || 0, this.height = r || 0, this;
  }
};
j.prototype.bottomRight = j.prototype.corner;
j.prototype.topLeft = j.prototype.origin;
j.prototype.translate = j.prototype.offset;
const Hl = j;
function Yo(t) {
  const e = t.trim();
  if (e === "") return [];
  const n = [], r = e.split(/\b\s*,\s*|,\s*|\s+/), i = r.length;
  for (let s = 0; s < i; s += 2) n.push({
    x: +r[s],
    y: +r[s + 1]
  });
  return n;
}
function Xo(t) {
  const e = t.length;
  if (e === 0) return [];
  const n = [];
  for (let r = 0; r < e; r++) {
    const i = t[r].clone();
    n.push(i);
  }
  return n;
}
function Jo(t) {
  const { abs: e } = Math;
  var n, r, i = t.length;
  if (i === 0) return [];
  var s;
  for (n = 0; n < i; n++) (s === void 0 || t[n].y < s.y || t[n].y === s.y && t[n].x > s.x) && (s = t[n]);
  var o = [];
  for (n = 0; n < i; n++) {
    var a = s.theta(t[n]);
    a === 0 && (a = 360);
    var c = [
      t[n],
      n,
      a
    ];
    o.push(c);
  }
  if (o.sort(function(_, F) {
    var U = _[2] - F[2];
    return U === 0 && (U = F[1] - _[1]), U;
  }), o.length > 2) {
    var u = o[o.length - 1];
    o.unshift(u);
  }
  for (var h = {}, l = [], d, g, v, y, w, x; o.length !== 0; )
    if (d = o.pop(), g = d[0], !h.hasOwnProperty(d[0] + "@@" + d[1]))
      for (var P = !1; !P; ) if (l.length < 2)
        l.push(d), P = !0;
      else {
        v = l.pop(), y = v[0], w = l.pop(), x = w[0];
        var T = x.cross(y, g);
        if (T < 0)
          l.push(w), l.push(v), l.push(d), P = !0;
        else if (T === 0) {
          var L = 1e-10, I = y.angleBetween(x, g);
          e(I - 180) < L || y.equals(g) || x.equals(y) ? (h[v[0] + "@@" + v[1]] = y, l.push(w)) : e((I + 1) % 360 - 1) < L && (l.push(w), o.push(v));
        } else
          h[v[0] + "@@" + v[1]] = y, l.push(w);
      }
  l.length > 2 && l.pop();
  var R, f = -1;
  for (r = l.length, n = 0; n < r; n++) {
    var p = l[n][1];
    (R === void 0 || p < R) && (R = p, f = n);
  }
  var m = [];
  if (f > 0) {
    var b = l.slice(f), S = l.slice(0, f);
    m = b.concat(S);
  } else m = l;
  var M = [];
  for (r = m.length, n = 0; n < r; n++) M.push(m[n][0]);
  return M;
}
const St = function(t) {
  if (!(this instanceof St)) return new St(t);
  if (typeof t == "string") return new St.parse(t);
  this.points = Array.isArray(t) ? t.map(E) : [];
};
St.parse = function(t) {
  return new St(Yo(t));
};
St.fromRect = function(t) {
  return new St([
    t.topLeft(),
    t.topRight(),
    t.bottomRight(),
    t.bottomLeft(),
    t.topLeft()
  ]);
};
St.prototype = {
  type: ct.Polyline,
  bbox: function() {
    var t = 1 / 0, e = -1 / 0, n = 1 / 0, r = -1 / 0, i = this.points, s = i.length;
    if (s === 0) return null;
    for (var o = 0; o < s; o++) {
      var a = i[o], c = a.x, u = a.y;
      c < t && (t = c), c > e && (e = c), u < n && (n = u), u > r && (r = u);
    }
    return new j(t, n, e - t, r - n);
  },
  clone: function() {
    return new St(Xo(this.points));
  },
  closestPoint: function(t) {
    var e = this.closestPointLength(t);
    return this.pointAtLength(e);
  },
  closestPointLength: function(t) {
    var e = this.lengthPoints(), n = e.length;
    if (n === 0 || n === 1) return 0;
    for (var r, i = 1 / 0, s = 0, o = n - 1, a = 0; a < o; a++) {
      var c = new H(e[a], e[a + 1]), u = c.length(), h = c.closestPointNormalizedLength(t), l = c.pointAt(h), d = l.squaredDistance(t);
      d < i && (i = d, r = s + h * u), s += u;
    }
    return r;
  },
  closestPointNormalizedLength: function(t) {
    var e = this.closestPointLength(t);
    if (e === 0) return 0;
    var n = this.length();
    return n === 0 ? 0 : e / n;
  },
  closestPointTangent: function(t) {
    var e = this.closestPointLength(t);
    return this.tangentAtLength(e);
  },
  containsPoint: function(t) {
    var e = this.points, n = e.length;
    if (n === 0) return !1;
    for (var r = t.x, i = t.y, s = n - 1, o = 0, a = 0, c = new H(), u = new H(), h = new E(); o < n; o++) {
      var l = e[s], d = e[o];
      if (t.equals(l) || (c.start = l, c.end = d, c.containsPoint(t))) return !0;
      if (i <= l.y && i > d.y || i > l.y && i <= d.y) {
        var g = l.x - r > d.x - r ? l.x - r : d.x - r;
        g >= 0 && (h.x = r + g, h.y = i, u.start = t, u.end = h, c.intersect(u) && a++);
      }
      s = o;
    }
    return a % 2 === 1;
  },
  close: function() {
    const { start: t, end: e, points: n } = this;
    return t && e && !t.equals(e) && n.push(t.clone()), this;
  },
  lengthPoints: function() {
    return this.points;
  },
  convexHull: function() {
    return new St(Jo(this.points));
  },
  equals: function(t) {
    if (!t) return !1;
    var e = this.points, n = t.points, r = e.length;
    if (n.length !== r) return !1;
    for (var i = 0; i < r; i++) {
      var s = e[i], o = t.points[i];
      if (!s.equals(o)) return !1;
    }
    return !0;
  },
  intersectionWithLine: function(t) {
    for (var e = new H(t), n = [], r = this.lengthPoints(), i = new H(), s = 0, o = r.length - 1; s < o; s++) {
      i.start = r[s], i.end = r[s + 1];
      var a = e.intersectionWithLine(i);
      a && n.push(a[0]);
    }
    return n.length > 0 ? n : null;
  },
  isDifferentiable: function() {
    var t = this.points, e = t.length;
    if (e === 0) return !1;
    for (var n = new H(), r = e - 1, i = 0; i < r; i++)
      if (n.start = t[i], n.end = t[i + 1], n.isDifferentiable()) return !0;
    return !1;
  },
  length: function() {
    var t = this.lengthPoints(), e = t.length;
    if (e === 0) return 0;
    for (var n = 0, r = e - 1, i = 0; i < r; i++) n += t[i].distance(t[i + 1]);
    return n;
  },
  pointAt: function(t) {
    var e = this.lengthPoints(), n = e.length;
    if (n === 0) return null;
    if (n === 1 || t <= 0) return e[0].clone();
    if (t >= 1) return e[n - 1].clone();
    var r = this.length(), i = r * t;
    return this.pointAtLength(i);
  },
  pointAtLength: function(t) {
    var e = this.lengthPoints(), n = e.length;
    if (n === 0) return null;
    if (n === 1) return e[0].clone();
    var r = !0;
    t < 0 && (r = !1, t = -t);
    for (var i = 0, s = n - 1, o = 0; o < s; o++) {
      var a = r ? o : s - 1 - o, c = e[a], u = e[a + 1], h = new H(c, u), l = c.distance(u);
      if (t <= i + l) return h.pointAtLength((r ? 1 : -1) * (t - i));
      i += l;
    }
    var d = r ? e[n - 1] : e[0];
    return d.clone();
  },
  round: function(t) {
    for (var e = this.points, n = e.length, r = 0; r < n; r++) e[r].round(t);
    return this;
  },
  scale: function(t, e, n) {
    for (var r = this.points, i = r.length, s = 0; s < i; s++) r[s].scale(t, e, n);
    return this;
  },
  simplify: function(t = {}) {
    const e = this.points;
    if (e.length < 3) return this;
    const n = t.threshold || 1e-10;
    let r = 0;
    for (; e[r + 2]; ) {
      const i = r, s = r + 1, o = r + 2, a = e[i], c = e[s], u = e[o];
      new H(a, u).closestPoint(c).distance(c) <= n ? e.splice(s, 1) : r += 1;
    }
    return this;
  },
  tangentAt: function(t) {
    var e = this.lengthPoints(), n = e.length;
    if (n === 0 || n === 1) return null;
    t < 0 && (t = 0), t > 1 && (t = 1);
    var r = this.length(), i = r * t;
    return this.tangentAtLength(i);
  },
  tangentAtLength: function(t) {
    var e = this.lengthPoints(), n = e.length;
    if (n === 0 || n === 1) return null;
    var r = !0;
    t < 0 && (r = !1, t = -t);
    for (var i, s = 0, o = n - 1, a = 0; a < o; a++) {
      var c = r ? a : o - 1 - a, u = e[c], h = e[c + 1], l = new H(u, h), d = u.distance(h);
      if (l.isDifferentiable()) {
        if (t <= s + d) return l.tangentAtLength((r ? 1 : -1) * (t - s));
        i = l;
      }
      s += d;
    }
    if (i) {
      var g = r ? 1 : 0;
      return i.tangentAt(g);
    }
    return null;
  },
  toString: function() {
    return this.points + "";
  },
  translate: function(t, e) {
    for (var n = this.points, r = n.length, i = 0; i < r; i++) n[i].translate(t, e);
    return this;
  },
  serialize: function() {
    var t = this.points, e = t.length;
    if (e === 0) return "";
    for (var n = "", r = 0; r < e; r++) {
      var i = t[r];
      n += i.x + "," + i.y + " ";
    }
    return n.trim();
  }
};
Object.defineProperty(St.prototype, "start", {
  configurable: !0,
  enumerable: !0,
  get: function() {
    var t = this.points, e = t.length;
    return e === 0 ? null : this.points[0];
  }
});
Object.defineProperty(St.prototype, "end", {
  configurable: !0,
  enumerable: !0,
  get: function() {
    var t = this.points, e = t.length;
    return e === 0 ? null : this.points[e - 1];
  }
});
const { abs: Qn, sqrt: $l, min: Vs, max: Gs, pow: Zr } = Math, mt = function(t, e, n, r) {
  if (!(this instanceof mt)) return new mt(t, e, n, r);
  if (t instanceof mt) return new mt(t.start, t.controlPoint1, t.controlPoint2, t.end);
  this.start = new E(t), this.controlPoint1 = new E(e), this.controlPoint2 = new E(n), this.end = new E(r);
};
mt.throughPoints = /* @__PURE__ */ (function() {
  function t(n) {
    var r = [], i = [], s = n.length - 1, o;
    if (s == 1)
      return r[0] = new E((2 * n[0].x + n[1].x) / 3, (2 * n[0].y + n[1].y) / 3), i[0] = new E(2 * r[0].x - n[0].x, 2 * r[0].y - n[0].y), [r, i];
    var a = [];
    for (o = 1; o < s - 1; o++) a[o] = 4 * n[o].x + 2 * n[o + 1].x;
    a[0] = n[0].x + 2 * n[1].x, a[s - 1] = (8 * n[s - 1].x + n[s].x) / 2;
    var c = e(a);
    for (o = 1; o < s - 1; ++o) a[o] = 4 * n[o].y + 2 * n[o + 1].y;
    a[0] = n[0].y + 2 * n[1].y, a[s - 1] = (8 * n[s - 1].y + n[s].y) / 2;
    var u = e(a);
    for (o = 0; o < s; o++)
      r.push(new E(c[o], u[o])), o < s - 1 ? i.push(new E(2 * n[o + 1].x - c[o + 1], 2 * n[o + 1].y - u[o + 1])) : i.push(new E((n[s].x + c[s - 1]) / 2, (n[s].y + u[s - 1]) / 2));
    return [r, i];
  }
  function e(n) {
    var r = n.length, i = [], s = [], o = 2;
    i[0] = n[0] / o;
    for (var a = 1; a < r; a++)
      s[a] = 1 / o, o = (a < r - 1 ? 4 : 3.5) - s[a], i[a] = (n[a] - i[a - 1]) / o;
    for (a = 1; a < r; a++) i[r - a - 1] -= s[r - a] * i[r - a];
    return i;
  }
  return function(n) {
    if (!n || Array.isArray(n) && n.length < 2) throw new Error("At least 2 points are required");
    for (var r = t(n), i = [], s = r[0].length, o = 0; o < s; o++) {
      var a = new E(r[0][o].x, r[0][o].y), c = new E(r[1][o].x, r[1][o].y);
      i.push(new mt(n[o], a, c, n[o + 1]));
    }
    return i;
  };
})();
mt.prototype = {
  type: ct.Curve,
  bbox: function() {
    for (var t = this.start, e = this.controlPoint1, n = this.controlPoint2, r = this.end, i = t.x, s = t.y, o = e.x, a = e.y, c = n.x, u = n.y, h = r.x, l = r.y, d = new Array(), g = new Array(), v = [new Array(), new Array()], y, w, x, P, T, L, I, R, f = 0; f < 2; ++f) {
      if (f === 0 ? (w = 6 * i - 12 * o + 6 * c, y = -3 * i + 9 * o - 9 * c + 3 * h, x = 3 * o - 3 * i) : (w = 6 * s - 12 * a + 6 * u, y = -3 * s + 9 * a - 9 * u + 3 * l, x = 3 * a - 3 * s), Qn(y) < 1e-12) {
        if (Qn(w) < 1e-12) continue;
        P = -x / w, 0 < P && P < 1 && g.push(P);
        continue;
      }
      I = w * w - 4 * x * y, R = $l(I), !(I < 0) && (T = (-w + R) / (2 * y), 0 < T && T < 1 && g.push(T), L = (-w - R) / (2 * y), 0 < L && L < 1 && g.push(L));
    }
    for (var p = g.length, m = p, b, S, M; p--; )
      P = g[p], b = 1 - P, S = b * b * b * i + 3 * b * b * P * o + 3 * b * P * P * c + P * P * P * h, v[0][p] = S, M = b * b * b * s + 3 * b * b * P * a + 3 * b * P * P * u + P * P * P * l, v[1][p] = M, d[p] = {
        X: S,
        Y: M
      };
    g[m] = 0, g[m + 1] = 1, d[m] = {
      X: i,
      Y: s
    }, d[m + 1] = {
      X: h,
      Y: l
    }, v[0][m] = i, v[1][m] = s, v[0][m + 1] = h, v[1][m + 1] = l, g.length = m + 2, v[0].length = m + 2, v[1].length = m + 2, d.length = m + 2;
    var _ = Vs.apply(null, v[0]), F = Vs.apply(null, v[1]), U = Gs.apply(null, v[0]), A = Gs.apply(null, v[1]);
    return new j(_, F, U - _, A - F);
  },
  clone: function() {
    return new mt(this.start, this.controlPoint1, this.controlPoint2, this.end);
  },
  closestPoint: function(t, e) {
    return this.pointAtT(this.closestPointT(t, e));
  },
  closestPointLength: function(t, e) {
    e = e || {};
    var n = e.precision === void 0 ? this.PRECISION : e.precision, r = e.subdivisions === void 0 ? this.getSubdivisions({ precision: n }) : e.subdivisions, i = {
      precision: n,
      subdivisions: r
    };
    return this.lengthAtT(this.closestPointT(t, i), i);
  },
  closestPointNormalizedLength: function(t, e) {
    e = e || {};
    var n = e.precision === void 0 ? this.PRECISION : e.precision, r = e.subdivisions === void 0 ? this.getSubdivisions({ precision: n }) : e.subdivisions, i = {
      precision: n,
      subdivisions: r
    }, s = this.closestPointLength(t, i);
    if (!s) return 0;
    var o = this.length(i);
    return o === 0 ? 0 : s / o;
  },
  closestPointT: function(t, e) {
    e = e || {};
    for (var n = e.precision === void 0 ? this.PRECISION : e.precision, r = e.subdivisions === void 0 ? this.getSubdivisions({ precision: n }) : e.subdivisions, i, s, o, a, c, u, h, l = r.length, d = l ? 1 / l : 0, g = 0; g < l; g++) {
      var v = r[g], y = v.start.distance(t), w = v.end.distance(t), x = y + w;
      (!h || x < h) && (i = v, s = g * d, o = (g + 1) * d, a = y, c = w, u = v.start.distance(v.end), h = x);
    }
    for (var P = Zr(10, -n); ; ) {
      var T = a ? Qn(a - c) / a : 0, L = c ? Qn(a - c) / c : 0, I = T < P || L < P, R = a ? a < u * P : !0, f = c ? c < u * P : !0, p = R || f;
      if (I || p) return a <= c ? s : o;
      var m = i.divide(0.5);
      d /= 2;
      var b = m[0].start.distance(t), S = m[0].end.distance(t), M = b + S, _ = m[1].start.distance(t), F = m[1].end.distance(t), U = _ + F;
      M <= U ? (i = m[0], o -= d, a = b, c = S) : (i = m[1], s += d, a = _, c = F);
    }
  },
  closestPointTangent: function(t, e) {
    return this.tangentAtT(this.closestPointT(t, e));
  },
  containsPoint: function(t, e) {
    var n = this.toPolyline(e);
    return n.containsPoint(t);
  },
  divideAt: function(t, e) {
    if (t <= 0) return this.divideAtT(0);
    if (t >= 1) return this.divideAtT(1);
    var n = this.tAt(t, e);
    return this.divideAtT(n);
  },
  divideAtLength: function(t, e) {
    var n = this.tAtLength(t, e);
    return this.divideAtT(n);
  },
  divideAtT: function(t) {
    var e = this.start, n = this.controlPoint1, r = this.controlPoint2, i = this.end;
    if (t <= 0) return [new mt(e, e, e, e), new mt(e, n, r, i)];
    if (t >= 1) return [new mt(e, n, r, i), new mt(i, i, i, i)];
    var s = this.getSkeletonPoints(t), o = s.startControlPoint1, a = s.startControlPoint2, c = s.divider, u = s.dividerControlPoint1, h = s.dividerControlPoint2;
    return [new mt(e, o, a, c), new mt(c, u, h, i)];
  },
  endpointDistance: function() {
    return this.start.distance(this.end);
  },
  equals: function(t) {
    return !!t && this.start.x === t.start.x && this.start.y === t.start.y && this.controlPoint1.x === t.controlPoint1.x && this.controlPoint1.y === t.controlPoint1.y && this.controlPoint2.x === t.controlPoint2.x && this.controlPoint2.y === t.controlPoint2.y && this.end.x === t.end.x && this.end.y === t.end.y;
  },
  getSkeletonPoints: function(t) {
    var e = this.start, n = this.controlPoint1, r = this.controlPoint2, i = this.end;
    if (t <= 0) return {
      startControlPoint1: e.clone(),
      startControlPoint2: e.clone(),
      divider: e.clone(),
      dividerControlPoint1: n.clone(),
      dividerControlPoint2: r.clone()
    };
    if (t >= 1) return {
      startControlPoint1: n.clone(),
      startControlPoint2: r.clone(),
      divider: i.clone(),
      dividerControlPoint1: i.clone(),
      dividerControlPoint2: i.clone()
    };
    var s = new H(e, n).pointAt(t), o = new H(n, r).pointAt(t), a = new H(r, i).pointAt(t), c = new H(s, o).pointAt(t), u = new H(o, a).pointAt(t), h = new H(c, u).pointAt(t), l = {
      startControlPoint1: s,
      startControlPoint2: c,
      divider: h,
      dividerControlPoint1: u,
      dividerControlPoint2: a
    };
    return l;
  },
  getSubdivisions: function(t) {
    t = t || {};
    var e = t.precision === void 0 ? this.PRECISION : t.precision, n = this.start, r = this.controlPoint1, i = this.controlPoint2, s = this.end, o = [new mt(n, r, i, s)];
    if (e === 0) return o;
    var a = !this.isDifferentiable();
    if (a) return o;
    var c = this.endpointDistance(), u = Zr(10, -e), h = 2, l = r.cross(n, s) === 0 && i.cross(n, s) === 0;
    l && (h = 2 * e);
    for (var d = 0; ; ) {
      d += 1;
      for (var g = [], v = o.length, y = 0; y < v; y++) {
        var w = o[y], x = w.divide(0.5);
        g.push(x[0], x[1]);
      }
      for (var P = 0, T = g.length, L = 0; L < T; L++) {
        var I = g[L];
        P += I.endpointDistance();
      }
      if (d >= h) {
        var R = P !== 0 ? (P - c) / P : 0;
        if (R < u) return g;
      }
      o = g, c = P;
    }
  },
  isDifferentiable: function() {
    var t = this.start, e = this.controlPoint1, n = this.controlPoint2, r = this.end;
    return !(t.equals(e) && e.equals(n) && n.equals(r));
  },
  length: function(t) {
    t = t || {};
    for (var e = t.precision === void 0 ? this.PRECISION : t.precision, n = t.subdivisions === void 0 ? this.getSubdivisions({ precision: e }) : t.subdivisions, r = 0, i = n.length, s = 0; s < i; s++) {
      var o = n[s];
      r += o.endpointDistance();
    }
    return r;
  },
  lengthAtT: function(t, e) {
    if (t <= 0) return 0;
    e = e || {};
    var n = e.precision === void 0 ? this.PRECISION : e.precision, r = this.divide(t)[0], i = r.length({ precision: n });
    return i;
  },
  pointAt: function(t, e) {
    if (t <= 0) return this.start.clone();
    if (t >= 1) return this.end.clone();
    var n = this.tAt(t, e);
    return this.pointAtT(n);
  },
  pointAtLength: function(t, e) {
    var n = this.tAtLength(t, e);
    return this.pointAtT(n);
  },
  pointAtT: function(t) {
    return t <= 0 ? this.start.clone() : t >= 1 ? this.end.clone() : this.getSkeletonPoints(t).divider;
  },
  PRECISION: 3,
  round: function(t) {
    return this.start.round(t), this.controlPoint1.round(t), this.controlPoint2.round(t), this.end.round(t), this;
  },
  scale: function(t, e, n) {
    return this.start.scale(t, e, n), this.controlPoint1.scale(t, e, n), this.controlPoint2.scale(t, e, n), this.end.scale(t, e, n), this;
  },
  tangentAt: function(t, e) {
    if (!this.isDifferentiable()) return null;
    t < 0 ? t = 0 : t > 1 && (t = 1);
    var n = this.tAt(t, e);
    return this.tangentAtT(n);
  },
  tangentAtLength: function(t, e) {
    if (!this.isDifferentiable()) return null;
    var n = this.tAtLength(t, e);
    return this.tangentAtT(n);
  },
  tangentAtT: function(t) {
    if (!this.isDifferentiable()) return null;
    t < 0 ? t = 0 : t > 1 && (t = 1);
    var e = this.getSkeletonPoints(t), n = e.startControlPoint2, r = e.dividerControlPoint1, i = e.divider, s = new H(n, r);
    return s.translate(i.x - n.x, i.y - n.y), s;
  },
  tAt: function(t, e) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    e = e || {};
    var n = e.precision === void 0 ? this.PRECISION : e.precision, r = e.subdivisions === void 0 ? this.getSubdivisions({ precision: n }) : e.subdivisions, i = {
      precision: n,
      subdivisions: r
    }, s = this.length(i), o = s * t;
    return this.tAtLength(o, i);
  },
  tAtLength: function(t, e) {
    var n = !0;
    t < 0 && (n = !1, t = -t), e = e || {};
    for (var r = e.precision === void 0 ? this.PRECISION : e.precision, i = e.subdivisions === void 0 ? this.getSubdivisions({ precision: r }) : e.subdivisions, s = {
      precision: r,
      subdivisions: i
    }, o, a, c, u, h, l = 0, d = i.length, g = 1 / d, v = 0; v < d; v++) {
      var y = n ? v : d - 1 - v, w = i[v], x = w.endpointDistance();
      if (t <= l + x) {
        o = w, a = y * g, c = (y + 1) * g, u = n ? t - l : x + l - t, h = n ? x + l - t : t - l;
        break;
      }
      l += x;
    }
    if (!o) return n ? 1 : 0;
    for (var P = this.length(s), T = Zr(10, -r); ; ) {
      var L;
      if (L = P !== 0 ? u / P : 0, L < T) return a;
      if (L = P !== 0 ? h / P : 0, L < T) return c;
      var I, R, f = o.divide(0.5);
      g /= 2;
      var p = f[0].endpointDistance(), m = f[1].endpointDistance();
      u <= p ? (o = f[0], c -= g, I = u, R = p - I) : (o = f[1], a += g, I = u - p, R = m - I), u = I, h = R;
    }
  },
  toPoints: function(t) {
    t = t || {};
    for (var e = t.precision === void 0 ? this.PRECISION : t.precision, n = t.subdivisions === void 0 ? this.getSubdivisions({ precision: e }) : t.subdivisions, r = [n[0].start.clone()], i = n.length, s = 0; s < i; s++) {
      var o = n[s];
      r.push(o.end.clone());
    }
    return r;
  },
  toPolyline: function(t) {
    return new St(this.toPoints(t));
  },
  toString: function() {
    return this.start + " " + this.controlPoint1 + " " + this.controlPoint2 + " " + this.end;
  },
  translate: function(t, e) {
    return this.start.translate(t, e), this.controlPoint1.translate(t, e), this.controlPoint2.translate(t, e), this.end.translate(t, e), this;
  }
};
mt.prototype.divide = mt.prototype.divideAtT;
function Vn(t) {
  var e, n, r = [];
  for (n = arguments.length, e = 1; e < n; e++) r.push(arguments[e]);
  if (!t) throw new Error("Missing a parent object.");
  var i = Object.create(t);
  for (n = r.length, e = 0; e < n; e++) {
    var s = r[e], o, a;
    for (a in s) s.hasOwnProperty(a) && (delete i[a], o = Object.getOwnPropertyDescriptor(s, a), Object.defineProperty(i, a, o));
  }
  return i;
}
const Z = function(t) {
  if (!(this instanceof Z)) return new Z(t);
  if (typeof t == "string") return new Z.parse(t);
  this.segments = [];
  var e, n;
  if (t) if (Array.isArray(t) && t.length !== 0)
    if (t = t.reduce(function(a, c) {
      return a.concat(c);
    }, []), n = t.length, t[0].isSegment) for (e = 0; e < n; e++) {
      var r = t[e];
      this.appendSegment(r);
    }
    else {
      var i = null;
      for (e = 0; e < n; e++) {
        var s = t[e];
        if (!(s instanceof H || s instanceof mt)) throw new Error("Cannot construct a path segment from the provided object.");
        e === 0 && this.appendSegment(Z.createSegment("M", s.start)), i && !i.end.equals(s.start) && this.appendSegment(Z.createSegment("M", s.start)), s instanceof H ? this.appendSegment(Z.createSegment("L", s.end)) : s instanceof mt && this.appendSegment(Z.createSegment("C", s.controlPoint1, s.controlPoint2, s.end)), i = s;
      }
    }
  else if (t.isSegment) this.appendSegment(t);
  else if (t instanceof H)
    this.appendSegment(Z.createSegment("M", t.start)), this.appendSegment(Z.createSegment("L", t.end));
  else if (t instanceof mt)
    this.appendSegment(Z.createSegment("M", t.start)), this.appendSegment(Z.createSegment("C", t.controlPoint1, t.controlPoint2, t.end));
  else if (t instanceof St) {
    if (!(t.points && t.points.length !== 0)) return;
    for (n = t.points.length, e = 0; e < n; e++) {
      var o = t.points[e];
      e === 0 ? this.appendSegment(Z.createSegment("M", o)) : this.appendSegment(Z.createSegment("L", o));
    }
  } else throw new Error("Cannot construct a path from the provided object.");
};
Z.parse = function(t) {
  if (!t) return new Z();
  for (var e = new Z(), n = /(?:[a-zA-Z] *)(?:(?:-?\d+(?:\.\d+)?(?:e[-+]?\d+)? *,? *)|(?:-?\.\d+ *,? *))+|(?:[a-zA-Z] *)(?! |\d|-|\.)/g, r = t.match(n), i = r.length, s = 0; s < i; s++) {
    var o = r[s], a = /(?:[a-zA-Z])|(?:(?:-?\d+(?:\.\d+)?(?:e[-+]?\d+)?))|(?:(?:-?\.\d+))/g, c = o.match(a), u = Z.createSegment.apply(this, c);
    e.appendSegment(u);
  }
  return e;
};
Z.createSegment = function(t) {
  if (!t) throw new Error("Type must be provided.");
  var e = Z.segmentTypes[t];
  if (!e) throw new Error(t + " is not a recognized path segment type.");
  for (var n = [], r = arguments.length, i = 1; i < r; i++) n.push(arguments[i]);
  return he(e, n);
};
Z.prototype = {
  type: ct.Path,
  appendSegment: function(t) {
    var e = this.segments, n = e.length, r, i = n !== 0 ? e[n - 1] : null, s = null;
    if (Array.isArray(t)) {
      if (t = t.reduce(function(u, h) {
        return u.concat(h);
      }, []), !t[0].isSegment) throw new Error("Segments required.");
      for (var o = t.length, a = 0; a < o; a++) {
        var c = t[a];
        r = this.prepareSegment(c, i, s), e.push(r), i = r;
      }
    } else {
      if (!t || !t.isSegment) throw new Error("Segment required.");
      r = this.prepareSegment(t, i, s), e.push(r);
    }
  },
  bbox: function() {
    var t = this.segments, e = t.length;
    if (e === 0) return null;
    for (var n, r = 0; r < e; r++) {
      var i = t[r];
      if (i.isVisible) {
        var s = i.bbox();
        n = n ? n.union(s) : s;
      }
    }
    if (n) return n;
    var o = t[e - 1];
    return new j(o.end.x, o.end.y, 0, 0);
  },
  clone: function() {
    for (var t = this.segments, e = t.length, n = new Z(), r = 0; r < e; r++) {
      var i = t[r].clone();
      n.appendSegment(i);
    }
    return n;
  },
  closestPoint: function(t, e) {
    var n = this.closestPointT(t, e);
    return n ? this.pointAtT(n) : null;
  },
  closestPointLength: function(t, e) {
    e = e || {};
    var n = e.precision === void 0 ? this.PRECISION : e.precision, r = e.segmentSubdivisions === void 0 ? this.getSegmentSubdivisions({ precision: n }) : e.segmentSubdivisions, i = {
      precision: n,
      segmentSubdivisions: r
    }, s = this.closestPointT(t, i);
    return s ? this.lengthAtT(s, i) : 0;
  },
  closestPointNormalizedLength: function(t, e) {
    e = e || {};
    var n = e.precision === void 0 ? this.PRECISION : e.precision, r = e.segmentSubdivisions === void 0 ? this.getSegmentSubdivisions({ precision: n }) : e.segmentSubdivisions, i = {
      precision: n,
      segmentSubdivisions: r
    }, s = this.closestPointLength(t, i);
    if (s === 0) return 0;
    var o = this.length(i);
    return o === 0 ? 0 : s / o;
  },
  closestPointT: function(t, e) {
    var n = this.segments, r = n.length;
    if (r === 0) return null;
    e = e || {};
    for (var i = e.precision === void 0 ? this.PRECISION : e.precision, s = e.segmentSubdivisions === void 0 ? this.getSegmentSubdivisions({ precision: i }) : e.segmentSubdivisions, o, a = 1 / 0, c = 0; c < r; c++) {
      var u = n[c], h = s[c];
      if (u.isVisible) {
        var l = u.closestPointT(t, {
          precision: i,
          subdivisions: h
        }), d = u.pointAtT(l), g = new H(d, t).squaredLength();
        g < a && (o = {
          segmentIndex: c,
          value: l
        }, a = g);
      }
    }
    return o || {
      segmentIndex: r - 1,
      value: 1
    };
  },
  closestPointTangent: function(t, e) {
    var n = this.segments, r = n.length;
    if (r === 0) return null;
    e = e || {};
    for (var i = e.precision === void 0 ? this.PRECISION : e.precision, s = e.segmentSubdivisions === void 0 ? this.getSegmentSubdivisions({ precision: i }) : e.segmentSubdivisions, o, a = 1 / 0, c = 0; c < r; c++) {
      var u = n[c], h = s[c];
      if (u.isDifferentiable()) {
        var l = u.closestPointT(t, {
          precision: i,
          subdivisions: h
        }), d = u.pointAtT(l), g = new H(d, t).squaredLength();
        g < a && (o = u.tangentAtT(l), a = g);
      }
    }
    return o || null;
  },
  containsPoint: function(t, e) {
    var n = this.toPolylines(e);
    if (!n) return !1;
    for (var r = n.length, i = 0, s = 0; s < r; s++) {
      var o = n[s];
      o.containsPoint(t) && i++;
    }
    return i % 2 === 1;
  },
  divideAt: function(t, e) {
    var n = this.segments, r = n.length;
    if (r === 0) return null;
    t < 0 && (t = 0), t > 1 && (t = 1), e = e || {};
    var i = e.precision === void 0 ? this.PRECISION : e.precision, s = e.segmentSubdivisions === void 0 ? this.getSegmentSubdivisions({ precision: i }) : e.segmentSubdivisions, o = {
      precision: i,
      segmentSubdivisions: s
    }, a = this.length(o), c = a * t;
    return this.divideAtLength(c, o);
  },
  divideAtLength: function(t, e) {
    var n = this.segments.length;
    if (n === 0) return null;
    var r = !0;
    t < 0 && (r = !1, t = -t), e = e || {};
    var i = e.precision === void 0 ? this.PRECISION : e.precision, s = e.segmentSubdivisions === void 0 ? this.getSegmentSubdivisions({ precision: i }) : e.segmentSubdivisions, o, a, c = 0, u, h, l, d, g;
    for (o = 0; o < n; o++) {
      var v = r ? o : n - 1 - o;
      a = this.getSegment(v);
      var y = s[v], w = a.length({
        precision: i,
        subdivisions: y
      });
      if (a.isDifferentiable() && (l = a, d = v, t <= c + w)) {
        h = v, u = a.divideAtLength((r ? 1 : -1) * (t - c), {
          precision: i,
          subdivisions: y
        });
        break;
      }
      c += w;
    }
    if (!l) return null;
    u || (h = d, g = r ? 1 : 0, u = l.divideAtT(g));
    var x = this.clone();
    x.replaceSegment(h, u);
    var P = h, T = h + 1, L = h + 2;
    u[0].isDifferentiable() || (x.removeSegment(P), T -= 1, L -= 1);
    var I = x.getSegment(T).start;
    x.insertSegment(T, Z.createSegment("M", I)), L += 1, u[1].isDifferentiable() || (x.removeSegment(L - 1), L -= 1);
    var R = L - P - 1;
    for (o = L; o < x.segments.length; o++) {
      var f = this.getSegment(o - R);
      if (a = x.getSegment(o), a.type === "Z" && !f.subpathStartSegment.end.equals(a.subpathStartSegment.end)) {
        var p = Z.createSegment("L", f.end);
        x.replaceSegment(o, p);
      }
    }
    var m = new Z(x.segments.slice(0, T)), b = new Z(x.segments.slice(T));
    return [m, b];
  },
  equals: function(t) {
    if (!t) return !1;
    var e = this.segments, n = t.segments, r = e.length;
    if (n.length !== r) return !1;
    for (var i = 0; i < r; i++) {
      var s = e[i], o = n[i];
      if (s.type !== o.type || !s.equals(o)) return !1;
    }
    return !0;
  },
  getSegment: function(t) {
    var e = this.segments, n = e.length;
    if (n === 0) throw new Error("Path has no segments.");
    if (t < 0 && (t = n + t), t >= n || t < 0) throw new Error("Index out of range.");
    return e[t];
  },
  getSegmentSubdivisions: function(t) {
    var e = this.segments, n = e.length;
    t = t || {};
    for (var r = t.precision === void 0 ? this.PRECISION : t.precision, i = [], s = 0; s < n; s++) {
      var o = e[s], a = o.getSubdivisions({ precision: r });
      i.push(a);
    }
    return i;
  },
  getSubpaths: function() {
    const e = this.clone().validate().segments, n = e.length, r = [];
    for (let i = 0; i < n; i++) {
      const s = e[i];
      s.isSubpathStart ? r.push(new Z(s)) : r[r.length - 1].appendSegment(s);
    }
    return r;
  },
  insertSegment: function(t, e) {
    var n = this.segments, r = n.length;
    if (t < 0 && (t = r + t + 1), t > r || t < 0) throw new Error("Index out of range.");
    var i, s = null, o = null;
    if (r !== 0 && (t >= 1 ? (s = n[t - 1], o = s.nextSegment) : o = n[0]), Array.isArray(e)) {
      if (e = e.reduce(function(h, l) {
        return h.concat(l);
      }, []), !e[0].isSegment) throw new Error("Segments required.");
      for (var a = e.length, c = 0; c < a; c++) {
        var u = e[c];
        i = this.prepareSegment(u, s, o), n.splice(t + c, 0, i), s = i;
      }
    } else {
      if (!e || !e.isSegment) throw new Error("Segment required.");
      i = this.prepareSegment(e, s, o), n.splice(t, 0, i);
    }
  },
  intersectionWithLine: function(t, e) {
    var n = null, r = this.toPolylines(e);
    if (!r) return null;
    for (var i = 0, s = r.length; i < s; i++) {
      var o = r[i], a = t.intersect(o);
      a && (n || (n = []), Array.isArray(a) ? Array.prototype.push.apply(n, a) : n.push(a));
    }
    return n;
  },
  isDifferentiable: function() {
    for (var t = this.segments, e = t.length, n = 0; n < e; n++) {
      var r = t[n];
      if (r.isDifferentiable()) return !0;
    }
    return !1;
  },
  isValid: function() {
    var t = this.segments, e = t.length === 0 || t[0].type === "M";
    return e;
  },
  length: function(t) {
    var e = this.segments, n = e.length;
    if (n === 0) return 0;
    t = t || {};
    for (var r = t.precision === void 0 ? this.PRECISION : t.precision, i = t.segmentSubdivisions === void 0 ? this.getSegmentSubdivisions({ precision: r }) : t.segmentSubdivisions, s = 0, o = 0; o < n; o++) {
      var a = e[o], c = i[o];
      s += a.length({ subdivisions: c });
    }
    return s;
  },
  lengthAtT: function(t, e) {
    var n = this.segments, r = n.length;
    if (r === 0) return 0;
    var i = t.segmentIndex;
    if (i < 0) return 0;
    var s = t.value;
    i >= r ? (i = r - 1, s = 1) : s < 0 ? s = 0 : s > 1 && (s = 1), e = e || {};
    for (var o = e.precision === void 0 ? this.PRECISION : e.precision, a = e.segmentSubdivisions === void 0 ? this.getSegmentSubdivisions({ precision: o }) : e.segmentSubdivisions, c, u = 0, h = 0; h < i; h++) {
      var l = n[h];
      c = a[h], u += l.length({
        precisison: o,
        subdivisions: c
      });
    }
    return l = n[i], c = a[i], u += l.lengthAtT(s, {
      precisison: o,
      subdivisions: c
    }), u;
  },
  pointAt: function(t, e) {
    var n = this.segments, r = n.length;
    if (r === 0) return null;
    if (t <= 0) return this.start.clone();
    if (t >= 1) return this.end.clone();
    e = e || {};
    var i = e.precision === void 0 ? this.PRECISION : e.precision, s = e.segmentSubdivisions === void 0 ? this.getSegmentSubdivisions({ precision: i }) : e.segmentSubdivisions, o = {
      precision: i,
      segmentSubdivisions: s
    }, a = this.length(o), c = a * t;
    return this.pointAtLength(c, o);
  },
  pointAtLength: function(t, e) {
    var n = this.segments, r = n.length;
    if (r === 0) return null;
    if (t === 0) return this.start.clone();
    var i = !0;
    t < 0 && (i = !1, t = -t), e = e || {};
    for (var s = e.precision === void 0 ? this.PRECISION : e.precision, o = e.segmentSubdivisions === void 0 ? this.getSegmentSubdivisions({ precision: s }) : e.segmentSubdivisions, a, c = 0, u = 0; u < r; u++) {
      var h = i ? u : r - 1 - u, l = n[h], d = o[h], g = l.length({
        precision: s,
        subdivisions: d
      });
      if (l.isVisible) {
        if (t <= c + g) return l.pointAtLength((i ? 1 : -1) * (t - c), {
          precision: s,
          subdivisions: d
        });
        a = l;
      }
      c += g;
    }
    if (a) return i ? a.end : a.start;
    var v = n[r - 1];
    return v.end.clone();
  },
  pointAtT: function(t) {
    var e = this.segments, n = e.length;
    if (n === 0) return null;
    var r = t.segmentIndex;
    if (r < 0) return e[0].pointAtT(0);
    if (r >= n) return e[n - 1].pointAtT(1);
    var i = t.value;
    return i < 0 ? i = 0 : i > 1 && (i = 1), e[r].pointAtT(i);
  },
  PRECISION: 3,
  prepareSegment: function(t, e, n) {
    t.previousSegment = e, t.nextSegment = n, e && (e.nextSegment = t), n && (n.previousSegment = t);
    var r = t;
    return t.isSubpathStart && (t.subpathStartSegment = t, r = n), r && this.updateSubpathStartSegment(r), t;
  },
  removeSegment: function(t) {
    var e = this.segments, n = e.length;
    if (n === 0) throw new Error("Path has no segments.");
    if (t < 0 && (t = n + t), t >= n || t < 0) throw new Error("Index out of range.");
    var r = e.splice(t, 1)[0], i = r.previousSegment, s = r.nextSegment;
    i && (i.nextSegment = s), s && (s.previousSegment = i), r.isSubpathStart && s && this.updateSubpathStartSegment(s);
  },
  replaceSegment: function(t, e) {
    var n = this.segments, r = n.length;
    if (r === 0) throw new Error("Path has no segments.");
    if (t < 0 && (t = r + t), t >= r || t < 0) throw new Error("Index out of range.");
    var i, s = n[t], o = s.previousSegment, a = s.nextSegment, c = s.isSubpathStart;
    if (Array.isArray(e)) {
      if (e = e.reduce(function(d, g) {
        return d.concat(g);
      }, []), !e[0].isSegment) throw new Error("Segments required.");
      n.splice(t, 1);
      for (var u = e.length, h = 0; h < u; h++) {
        var l = e[h];
        i = this.prepareSegment(l, o, a), n.splice(t + h, 0, i), o = i, c && i.isSubpathStart && (c = !1);
      }
    } else {
      if (!e || !e.isSegment) throw new Error("Segment required.");
      i = this.prepareSegment(e, o, a), n.splice(t, 1, i), c && i.isSubpathStart && (c = !1);
    }
    c && a && this.updateSubpathStartSegment(a);
  },
  round: function(t) {
    for (var e = this.segments, n = e.length, r = 0; r < n; r++) {
      var i = e[r];
      i.round(t);
    }
    return this;
  },
  scale: function(t, e, n) {
    for (var r = this.segments, i = r.length, s = 0; s < i; s++) {
      var o = r[s];
      o.scale(t, e, n);
    }
    return this;
  },
  segmentAt: function(t, e) {
    var n = this.segmentIndexAt(t, e);
    return n ? this.getSegment(n) : null;
  },
  segmentAtLength: function(t, e) {
    var n = this.segmentIndexAtLength(t, e);
    return n ? this.getSegment(n) : null;
  },
  segmentIndexAt: function(t, e) {
    var n = this.segments, r = n.length;
    if (r === 0) return null;
    t < 0 && (t = 0), t > 1 && (t = 1), e = e || {};
    var i = e.precision === void 0 ? this.PRECISION : e.precision, s = e.segmentSubdivisions === void 0 ? this.getSegmentSubdivisions({ precision: i }) : e.segmentSubdivisions, o = {
      precision: i,
      segmentSubdivisions: s
    }, a = this.length(o), c = a * t;
    return this.segmentIndexAtLength(c, o);
  },
  segmentIndexAtLength: function(t, e) {
    var n = this.segments, r = n.length;
    if (r === 0) return null;
    var i = !0;
    t < 0 && (i = !1, t = -t), e = e || {};
    for (var s = e.precision === void 0 ? this.PRECISION : e.precision, o = e.segmentSubdivisions === void 0 ? this.getSegmentSubdivisions({ precision: s }) : e.segmentSubdivisions, a = null, c = 0, u = 0; u < r; u++) {
      var h = i ? u : r - 1 - u, l = n[h], d = o[h], g = l.length({
        precision: s,
        subdivisions: d
      });
      if (l.isVisible) {
        if (t <= c + g) return h;
        a = h;
      }
      c += g;
    }
    return a;
  },
  serialize: function() {
    if (!this.isValid()) throw new Error("Invalid path segments.");
    return this.toString();
  },
  tangentAt: function(t, e) {
    var n = this.segments, r = n.length;
    if (r === 0) return null;
    t < 0 && (t = 0), t > 1 && (t = 1), e = e || {};
    var i = e.precision === void 0 ? this.PRECISION : e.precision, s = e.segmentSubdivisions === void 0 ? this.getSegmentSubdivisions({ precision: i }) : e.segmentSubdivisions, o = {
      precision: i,
      segmentSubdivisions: s
    }, a = this.length(o), c = a * t;
    return this.tangentAtLength(c, o);
  },
  tangentAtLength: function(t, e) {
    var n = this.segments, r = n.length;
    if (r === 0) return null;
    var i = !0;
    t < 0 && (i = !1, t = -t), e = e || {};
    for (var s = e.precision === void 0 ? this.PRECISION : e.precision, o = e.segmentSubdivisions === void 0 ? this.getSegmentSubdivisions({ precision: s }) : e.segmentSubdivisions, a, c = 0, u = 0; u < r; u++) {
      var h = i ? u : r - 1 - u, l = n[h], d = o[h], g = l.length({
        precision: s,
        subdivisions: d
      });
      if (l.isDifferentiable()) {
        if (t <= c + g) return l.tangentAtLength((i ? 1 : -1) * (t - c), {
          precision: s,
          subdivisions: d
        });
        a = l;
      }
      c += g;
    }
    if (a) {
      var v = i ? 1 : 0;
      return a.tangentAtT(v);
    }
    return null;
  },
  tangentAtT: function(t) {
    var e = this.segments, n = e.length;
    if (n === 0) return null;
    var r = t.segmentIndex;
    if (r < 0) return e[0].tangentAtT(0);
    if (r >= n) return e[n - 1].tangentAtT(1);
    var i = t.value;
    return i < 0 ? i = 0 : i > 1 && (i = 1), e[r].tangentAtT(i);
  },
  toPoints: function(t) {
    var e = this.segments, n = e.length;
    if (n === 0) return null;
    t = t || {};
    for (var r = t.precision === void 0 ? this.PRECISION : t.precision, i = t.segmentSubdivisions === void 0 ? this.getSegmentSubdivisions({ precision: r }) : t.segmentSubdivisions, s = [], o = [], a = 0; a < n; a++) {
      var c = e[a];
      if (c.isVisible) {
        var u = i[a];
        if (u.length > 0) {
          var h = u.map(function(l) {
            return l.start;
          });
          Array.prototype.push.apply(o, h);
        } else o.push(c.start);
      } else o.length > 0 && (o.push(e[a - 1].end), s.push(o), o = []);
    }
    return o.length > 0 && (o.push(this.end), s.push(o)), s;
  },
  toPolylines: function(t) {
    var e = [], n = this.toPoints(t);
    if (!n) return null;
    for (var r = 0, i = n.length; r < i; r++) e.push(new St(n[r]));
    return e;
  },
  toString: function() {
    for (var t = this.segments, e = t.length, n = "", r = 0; r < e; r++) {
      var i = t[r];
      n += i.serialize() + " ";
    }
    return n.trim();
  },
  translate: function(t, e) {
    for (var n = this.segments, r = n.length, i = 0; i < r; i++) {
      var s = n[i];
      s.translate(t, e);
    }
    return this;
  },
  updateSubpathStartSegment: function(t) {
    for (var e = t.previousSegment; t && !t.isSubpathStart; )
      e ? t.subpathStartSegment = e.subpathStartSegment : t.subpathStartSegment = null, e = t, t = t.nextSegment;
  },
  validate: function() {
    return this.isValid() || this.insertSegment(0, Z.createSegment("M", 0, 0)), this;
  }
};
Object.defineProperty(Z.prototype, "start", {
  configurable: !0,
  enumerable: !0,
  get: function() {
    var t = this.segments, e = t.length;
    if (e === 0) return null;
    for (var n = 0; n < e; n++) {
      var r = t[n];
      if (r.isVisible) return r.start;
    }
    return t[e - 1].end;
  }
});
Object.defineProperty(Z.prototype, "end", {
  configurable: !0,
  enumerable: !0,
  get: function() {
    var t = this.segments, e = t.length;
    if (e === 0) return null;
    for (var n = e - 1; n >= 0; n--) {
      var r = t[n];
      if (r.isVisible) return r.end;
    }
    return t[e - 1].end;
  }
});
function he(t, e) {
  return e.unshift(null), new (Function.prototype.bind.apply(t, e))();
}
var Ue = {
  bbox: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  clone: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  closestPoint: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  closestPointLength: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  closestPointNormalizedLength: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  closestPointT: function(t) {
    if (this.closestPointNormalizedLength) return this.closestPointNormalizedLength(t);
    throw new Error("Neither closestPointT() nor closestPointNormalizedLength() function is implemented.");
  },
  closestPointTangent: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  divideAt: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  divideAtLength: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  divideAtT: function(t) {
    if (this.divideAt) return this.divideAt(t);
    throw new Error("Neither divideAtT() nor divideAt() function is implemented.");
  },
  equals: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  getSubdivisions: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  isDifferentiable: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  isSegment: !0,
  isSubpathStart: !1,
  isVisible: !0,
  length: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  lengthAtT: function(t) {
    if (t <= 0) return 0;
    var e = this.length();
    return t >= 1 ? e : e * t;
  },
  nextSegment: null,
  pointAt: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  pointAtLength: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  pointAtT: function(t) {
    if (this.pointAt) return this.pointAt(t);
    throw new Error("Neither pointAtT() nor pointAt() function is implemented.");
  },
  previousSegment: null,
  round: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  subpathStartSegment: null,
  scale: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  serialize: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  tangentAt: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  tangentAtLength: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  tangentAtT: function(t) {
    if (this.tangentAt) return this.tangentAt(t);
    throw new Error("Neither tangentAtT() nor tangentAt() function is implemented.");
  },
  toString: function() {
    throw new Error("Declaration missing for virtual function.");
  },
  translate: function() {
    throw new Error("Declaration missing for virtual function.");
  }
};
Object.defineProperty(Ue, "end", {
  configurable: !0,
  enumerable: !0,
  writable: !0
});
Object.defineProperty(Ue, "start", {
  configurable: !0,
  enumerable: !0,
  get: function() {
    if (!this.previousSegment) throw new Error("Missing previous segment. (This segment cannot be the first segment of a path; OR segment has not yet been added to a path.)");
    return this.previousSegment.end;
  }
});
Object.defineProperty(Ue, "type", {
  configurable: !0,
  enumerable: !0,
  get: function() {
    throw new Error("Bad segment declaration. No type specified.");
  }
});
var Mt = function() {
  for (var t = [], e = arguments.length, n = 0; n < e; n++) t.push(arguments[n]);
  if (!(this instanceof Mt)) return he(Mt, t);
  if (e === 0) throw new Error("Lineto constructor expects a line, 1 point, or 2 coordinates (none provided).");
  var r;
  if (t[0] instanceof H) {
    if (e === 1)
      return this.end = t[0].end.clone(), this;
    throw new Error("Lineto constructor expects a line, 1 point, or 2 coordinates (" + e + " lines provided).");
  } else if (typeof t[0] == "string" || typeof t[0] == "number") {
    if (e === 2)
      return this.end = new E(+t[0], +t[1]), this;
    if (e < 2) throw new Error("Lineto constructor expects a line, 1 point, or 2 coordinates (" + e + " coordinates provided).");
    var i;
    for (r = [], n = 0; n < e; n += 2)
      i = t.slice(n, n + 2), r.push(he(Mt, i));
    return r;
  } else {
    if (e === 1)
      return this.end = new E(t[0]), this;
    var s;
    for (r = [], n = 0; n < e; n += 1)
      s = t[n], r.push(new Mt(s));
    return r;
  }
}, Ko = {
  clone: function() {
    return new Mt(this.end);
  },
  divideAt: function(t) {
    var e = new H(this.start, this.end), n = e.divideAt(t);
    return [new Mt(n[0]), new Mt(n[1])];
  },
  divideAtLength: function(t) {
    var e = new H(this.start, this.end), n = e.divideAtLength(t);
    return [new Mt(n[0]), new Mt(n[1])];
  },
  getSubdivisions: function() {
    return [];
  },
  isDifferentiable: function() {
    return this.previousSegment ? !this.start.equals(this.end) : !1;
  },
  round: function(t) {
    return this.end.round(t), this;
  },
  scale: function(t, e, n) {
    return this.end.scale(t, e, n), this;
  },
  serialize: function() {
    var t = this.end;
    return this.type + " " + t.x + " " + t.y;
  },
  toString: function() {
    return this.type + " " + this.start + " " + this.end;
  },
  translate: function(t, e) {
    return this.end.translate(t, e), this;
  }
};
Object.defineProperty(Ko, "type", {
  configurable: !0,
  enumerable: !0,
  value: "L"
});
Mt.prototype = Vn(Ue, H.prototype, Ko);
var Ht = function() {
  for (var t = [], e = arguments.length, n = 0; n < e; n++) t.push(arguments[n]);
  if (!(this instanceof Ht)) return he(Ht, t);
  if (e === 0) throw new Error("Curveto constructor expects a curve, 3 points, or 6 coordinates (none provided).");
  var r;
  if (t[0] instanceof mt) {
    if (e === 1)
      return this.controlPoint1 = t[0].controlPoint1.clone(), this.controlPoint2 = t[0].controlPoint2.clone(), this.end = t[0].end.clone(), this;
    throw new Error("Curveto constructor expects a curve, 3 points, or 6 coordinates (" + e + " curves provided).");
  } else if (typeof t[0] == "string" || typeof t[0] == "number") {
    if (e === 6)
      return this.controlPoint1 = new E(+t[0], +t[1]), this.controlPoint2 = new E(+t[2], +t[3]), this.end = new E(+t[4], +t[5]), this;
    if (e < 6) throw new Error("Curveto constructor expects a curve, 3 points, or 6 coordinates (" + e + " coordinates provided).");
    var i;
    for (r = [], n = 0; n < e; n += 6)
      i = t.slice(n, n + 6), r.push(he(Ht, i));
    return r;
  } else {
    if (e === 3)
      return this.controlPoint1 = new E(t[0]), this.controlPoint2 = new E(t[1]), this.end = new E(t[2]), this;
    if (e < 3) throw new Error("Curveto constructor expects a curve, 3 points, or 6 coordinates (" + e + " points provided).");
    var s;
    for (r = [], n = 0; n < e; n += 3)
      s = t.slice(n, n + 3), r.push(he(Ht, s));
    return r;
  }
}, Zo = {
  clone: function() {
    return new Ht(this.controlPoint1, this.controlPoint2, this.end);
  },
  divideAt: function(t, e) {
    var n = new mt(this.start, this.controlPoint1, this.controlPoint2, this.end), r = n.divideAt(t, e);
    return [new Ht(r[0]), new Ht(r[1])];
  },
  divideAtLength: function(t, e) {
    var n = new mt(this.start, this.controlPoint1, this.controlPoint2, this.end), r = n.divideAtLength(t, e);
    return [new Ht(r[0]), new Ht(r[1])];
  },
  divideAtT: function(t) {
    var e = new mt(this.start, this.controlPoint1, this.controlPoint2, this.end), n = e.divideAtT(t);
    return [new Ht(n[0]), new Ht(n[1])];
  },
  isDifferentiable: function() {
    if (!this.previousSegment) return !1;
    var t = this.start, e = this.controlPoint1, n = this.controlPoint2, r = this.end;
    return !(t.equals(e) && e.equals(n) && n.equals(r));
  },
  round: function(t) {
    return this.controlPoint1.round(t), this.controlPoint2.round(t), this.end.round(t), this;
  },
  scale: function(t, e, n) {
    return this.controlPoint1.scale(t, e, n), this.controlPoint2.scale(t, e, n), this.end.scale(t, e, n), this;
  },
  serialize: function() {
    var t = this.controlPoint1, e = this.controlPoint2, n = this.end;
    return this.type + " " + t.x + " " + t.y + " " + e.x + " " + e.y + " " + n.x + " " + n.y;
  },
  toString: function() {
    return this.type + " " + this.start + " " + this.controlPoint1 + " " + this.controlPoint2 + " " + this.end;
  },
  translate: function(t, e) {
    return this.controlPoint1.translate(t, e), this.controlPoint2.translate(t, e), this.end.translate(t, e), this;
  }
};
Object.defineProperty(Zo, "type", {
  configurable: !0,
  enumerable: !0,
  value: "C"
});
Ht.prototype = Vn(Ue, mt.prototype, Zo);
var _e = function() {
  for (var t = [], e = arguments.length, n = 0; n < e; n++) t.push(arguments[n]);
  if (!(this instanceof _e)) return he(_e, t);
  if (e === 0) throw new Error("Moveto constructor expects a line, a curve, 1 point, or 2 coordinates (none provided).");
  var r;
  if (t[0] instanceof H) {
    if (e === 1)
      return this.end = t[0].end.clone(), this;
    throw new Error("Moveto constructor expects a line, a curve, 1 point, or 2 coordinates (" + e + " lines provided).");
  } else if (t[0] instanceof mt) {
    if (e === 1)
      return this.end = t[0].end.clone(), this;
    throw new Error("Moveto constructor expects a line, a curve, 1 point, or 2 coordinates (" + e + " curves provided).");
  } else if (typeof t[0] == "string" || typeof t[0] == "number") {
    if (e === 2)
      return this.end = new E(+t[0], +t[1]), this;
    if (e < 2) throw new Error("Moveto constructor expects a line, a curve, 1 point, or 2 coordinates (" + e + " coordinates provided).");
    var i;
    for (r = [], n = 0; n < e; n += 2)
      i = t.slice(n, n + 2), n === 0 ? r.push(he(_e, i)) : r.push(he(Mt, i));
    return r;
  } else {
    if (e === 1)
      return this.end = new E(t[0]), this;
    var s;
    for (r = [], n = 0; n < e; n += 1)
      s = t[n], n === 0 ? r.push(new _e(s)) : r.push(new Mt(s));
    return r;
  }
}, zi = {
  bbox: function() {
    return null;
  },
  clone: function() {
    return new _e(this.end);
  },
  closestPoint: function() {
    return this.end.clone();
  },
  closestPointNormalizedLength: function() {
    return 0;
  },
  closestPointLength: function() {
    return 0;
  },
  closestPointT: function() {
    return 1;
  },
  closestPointTangent: function() {
    return null;
  },
  divideAt: function() {
    return [this.clone(), this.clone()];
  },
  divideAtLength: function() {
    return [this.clone(), this.clone()];
  },
  equals: function(t) {
    return this.end.equals(t.end);
  },
  getSubdivisions: function() {
    return [];
  },
  isDifferentiable: function() {
    return !1;
  },
  isSubpathStart: !0,
  isVisible: !1,
  length: function() {
    return 0;
  },
  lengthAtT: function() {
    return 0;
  },
  pointAt: function() {
    return this.end.clone();
  },
  pointAtLength: function() {
    return this.end.clone();
  },
  pointAtT: function() {
    return this.end.clone();
  },
  round: function(t) {
    return this.end.round(t), this;
  },
  scale: function(t, e, n) {
    return this.end.scale(t, e, n), this;
  },
  serialize: function() {
    var t = this.end;
    return this.type + " " + t.x + " " + t.y;
  },
  tangentAt: function() {
    return null;
  },
  tangentAtLength: function() {
    return null;
  },
  tangentAtT: function() {
    return null;
  },
  toString: function() {
    return this.type + " " + this.end;
  },
  translate: function(t, e) {
    return this.end.translate(t, e), this;
  }
};
Object.defineProperty(zi, "start", {
  configurable: !0,
  enumerable: !0,
  get: function() {
    throw new Error("Illegal access. Moveto segments should not need a start property.");
  }
});
Object.defineProperty(zi, "type", {
  configurable: !0,
  enumerable: !0,
  value: "M"
});
_e.prototype = Vn(Ue, zi);
var cn = function() {
  for (var t = [], e = arguments.length, n = 0; n < e; n++) t.push(arguments[n]);
  if (!(this instanceof cn)) return he(cn, t);
  if (e > 0) throw new Error("Closepath constructor expects no arguments.");
  return this;
}, Ui = {
  clone: function() {
    return new cn();
  },
  divideAt: function(t) {
    var e = new H(this.start, this.end), n = e.divideAt(t);
    return [n[1].isDifferentiable() ? new Mt(n[0]) : this.clone(), new Mt(n[1])];
  },
  divideAtLength: function(t) {
    var e = new H(this.start, this.end), n = e.divideAtLength(t);
    return [n[1].isDifferentiable() ? new Mt(n[0]) : this.clone(), new Mt(n[1])];
  },
  getSubdivisions: function() {
    return [];
  },
  isDifferentiable: function() {
    return !this.previousSegment || !this.subpathStartSegment ? !1 : !this.start.equals(this.end);
  },
  round: function() {
    return this;
  },
  scale: function() {
    return this;
  },
  serialize: function() {
    return this.type;
  },
  toString: function() {
    return this.type + " " + this.start + " " + this.end;
  },
  translate: function() {
    return this;
  }
};
Object.defineProperty(Ui, "end", {
  configurable: !0,
  enumerable: !0,
  get: function() {
    if (!this.subpathStartSegment) throw new Error("Missing subpath start segment. (This segment needs a subpath start segment (e.g. Moveto); OR segment has not yet been added to a path.)");
    return this.subpathStartSegment.end;
  }
});
Object.defineProperty(Ui, "type", {
  configurable: !0,
  enumerable: !0,
  value: "Z"
});
cn.prototype = Vn(Ue, H.prototype, Ui);
var ql = Z.segmentTypes = {
  L: Mt,
  C: Ht,
  M: _e,
  Z: cn,
  z: cn
};
Z.regexSupportedData = /* @__PURE__ */ new RegExp("^[\\s\\d" + Object.keys(ql).join("") + ",.]*$");
Z.isDataSupported = function(t) {
  return typeof t != "string" ? !1 : this.regexSupportedData.test(t);
};
const Yl = {
  curveThroughPoints: function(t) {
    return console.warn("deprecated"), new Z(mt.throughPoints(t)).serialize();
  },
  getCurveControlPoints: function(t) {
    console.warn("deprecated");
    var e = [], n = [], r = t.length - 1, i;
    if (r == 1)
      return e[0] = new E((2 * t[0].x + t[1].x) / 3, (2 * t[0].y + t[1].y) / 3), n[0] = new E(2 * e[0].x - t[0].x, 2 * e[0].y - t[0].y), [e, n];
    var s = [];
    for (i = 1; i < r - 1; i++) s[i] = 4 * t[i].x + 2 * t[i + 1].x;
    s[0] = t[0].x + 2 * t[1].x, s[r - 1] = (8 * t[r - 1].x + t[r].x) / 2;
    var o = this.getFirstControlPoints(s);
    for (i = 1; i < r - 1; ++i) s[i] = 4 * t[i].y + 2 * t[i + 1].y;
    s[0] = t[0].y + 2 * t[1].y, s[r - 1] = (8 * t[r - 1].y + t[r].y) / 2;
    var a = this.getFirstControlPoints(s);
    for (i = 0; i < r; i++)
      e.push(new E(o[i], a[i])), i < r - 1 ? n.push(new E(2 * t[i + 1].x - o[i + 1], 2 * t[i + 1].y - a[i + 1])) : n.push(new E((t[r].x + o[r - 1]) / 2, (t[r].y + a[r - 1]) / 2));
    return [e, n];
  },
  getCurveDivider: function(t, e, n, r) {
    console.warn("deprecated");
    var i = new mt(t, e, n, r);
    return function(o) {
      var a = i.divide(o);
      return [{
        p0: a[0].start,
        p1: a[0].controlPoint1,
        p2: a[0].controlPoint2,
        p3: a[0].end
      }, {
        p0: a[1].start,
        p1: a[1].controlPoint1,
        p2: a[1].controlPoint2,
        p3: a[1].end
      }];
    };
  },
  getFirstControlPoints: function(t) {
    console.warn("deprecated");
    var e = t.length, n = [], r = [], i = 2;
    n[0] = t[0] / i;
    for (var s = 1; s < e; s++)
      r[s] = 1 / i, i = (s < e - 1 ? 4 : 3.5) - r[s], n[s] = (t[s] - n[s - 1]) / i;
    for (s = 1; s < e; s++) n[e - s - 1] -= r[e - s] * n[e - s];
    return n;
  },
  getInversionSolver: function(t, e, n, r) {
    console.warn("deprecated");
    var i = new mt(t, e, n, r);
    return function(o) {
      return i.closestPointT(o);
    };
  }
}, jt = function(t) {
  if (!(this instanceof jt)) return new jt(t);
  if (typeof t == "string") return new jt.parse(t);
  this.points = Array.isArray(t) ? t.map(E) : [];
};
jt.parse = function(t) {
  return new jt(Yo(t));
};
jt.fromRect = function(t) {
  return new jt([
    t.topLeft(),
    t.topRight(),
    t.bottomRight(),
    t.bottomLeft()
  ]);
};
jt.prototype = Vn(St.prototype, {
  type: ct.Polygon,
  clone: function() {
    return new jt(Xo(this.points));
  },
  convexHull: function() {
    return new jt(Jo(this.points));
  },
  lengthPoints: function() {
    const { start: t, end: e, points: n } = this;
    return n.length <= 1 || t.equals(e) ? n : [...n, t.clone()];
  }
});
var Qo = {};
Xt(Qo, {
  ellipseWithEllipse: () => ea,
  ellipseWithLine: () => ji,
  exists: () => ta,
  lineWithLine: () => Ne,
  pathWithEllipse: () => ua,
  pathWithLine: () => la,
  pathWithPath: () => fa,
  pathWithPolygon: () => Mr,
  pathWithPolyline: () => qi,
  pathWithRect: () => ha,
  polygonWithEllipse: () => Nr,
  polygonWithLine: () => $i,
  polygonWithPolygon: () => ca,
  polygonWithPolyline: () => aa,
  polygonWithRect: () => oa,
  polylineWithEllipse: () => Hi,
  polylineWithLine: () => _r,
  polylineWithPolyline: () => sa,
  polylineWithRect: () => ia,
  rectWithEllipse: () => ra,
  rectWithLine: () => na,
  rectWithRect: () => Wi
});
function ta(t, e, n, r) {
  switch (t.type) {
    case ct.Line:
      switch (e.type) {
        case ct.Line:
          return Ne(t, e);
      }
      break;
    case ct.Ellipse:
      switch (e.type) {
        case ct.Line:
          return ji(t, e);
        case ct.Ellipse:
          return ea(t, e);
      }
      break;
    case ct.Rect:
      switch (e.type) {
        case ct.Line:
          return na(t, e);
        case ct.Ellipse:
          return ra(t, e);
        case ct.Rect:
          return Wi(t, e);
      }
      break;
    case ct.Polyline:
      switch (e.type) {
        case ct.Line:
          return _r(t, e);
        case ct.Ellipse:
          return Hi(t, e);
        case ct.Rect:
          return ia(t, e);
        case ct.Polyline:
          return sa(t, e);
      }
      break;
    case ct.Polygon:
      switch (e.type) {
        case ct.Line:
          return $i(t, e);
        case ct.Ellipse:
          return Nr(t, e);
        case ct.Rect:
          return oa(t, e);
        case ct.Polyline:
          return aa(t, e);
        case ct.Polygon:
          return ca(t, e);
      }
      break;
    case ct.Path:
      switch (e.type) {
        case ct.Line:
          return la(t, e, n);
        case ct.Ellipse:
          return ua(t, e, n);
        case ct.Rect:
          return ha(t, e, n);
        case ct.Polyline:
          return qi(t, e, n);
        case ct.Polygon:
          return Mr(t, e, n);
        case ct.Path:
          return fa(t, e, n, r);
      }
      break;
  }
  switch (e.type) {
    case ct.Ellipse:
    case ct.Rect:
    case ct.Polyline:
    case ct.Polygon:
    case ct.Path:
      return ta(e, t, r, n);
    default:
      throw Error(`The intersection for ${t} and ${e} could not be found.`);
  }
}
function Ne(t, e) {
  const n = t.start.x, r = t.start.y, i = t.end.x, s = t.end.y, o = e.start.x, a = e.start.y, c = e.end.x, u = e.end.y, h = i - n, l = s - r, d = c - o, g = u - a, v = n - o, y = r - a, w = h * g - d * l, x = (h * y - l * v) / w, P = (d * y - g * v) / w;
  return x >= 0 && x <= 1 && P >= 0 && P <= 1;
}
function ji(t, e) {
  const n = t.a, r = t.b, i = t.x, s = t.y, o = e.start.x - i, a = e.end.x - i, c = e.start.y - s, u = e.end.y - s, h = n * n, l = r * r, d = a - o, g = u - c, v = d * d / h + g * g / l, y = 2 * o * d / h + 2 * c * g / l, w = o * o / h + c * c / l - 1, x = y * y - 4 * v * w;
  if (x === 0) {
    const P = -y / 2 / v;
    return P >= 0 && P <= 1;
  } else if (x > 0) {
    const P = Math.sqrt(x), T = (-y + P) / 2 / v, L = (-y - P) / 2 / v;
    return T >= 0 && T <= 1 || L >= 0 && L <= 1;
  }
  return !1;
}
function ea(t, e) {
  return Xl(t, 0, e, 0);
}
function na(t, e) {
  const { start: n, end: r } = e, { x: i, y: s, width: o, height: a } = t;
  return n.x > i + o && r.x > i + o || n.x < i && r.x < i || n.y > s + a && r.y > s + a || n.y < s && r.y < s ? !1 : t.containsPoint(e.start) || t.containsPoint(e.end) ? !0 : Ne(t.topLine(), e) || Ne(t.rightLine(), e) || Ne(t.bottomLine(), e) || Ne(t.leftLine(), e);
}
function ra(t, e) {
  return Wi(t, j.fromEllipse(e)) ? Nr(jt.fromRect(t), e) : !1;
}
function Wi(t, e) {
  return t.x < e.x + e.width && t.x + t.width > e.x && t.y < e.y + e.height && t.y + t.height > e.y;
}
function _r(t, e) {
  return da(t, e, { interior: !1 });
}
function Hi(t, e) {
  return ga(t, e, { interior: !1 });
}
function ia(t, e) {
  return pa(t, e, { interior: !1 });
}
function sa(t, e) {
  return Ir(t, e, { interior: !1 });
}
function $i(t, e) {
  return da(t, e, { interior: !0 });
}
function Nr(t, e) {
  return ga(t, e, { interior: !0 });
}
function oa(t, e) {
  return pa(t, e, { interior: !0 });
}
function aa(t, e) {
  return Ir(t, e, { interior: !0 });
}
function ca(t, e) {
  return Yi(t, e, { interior: !0 });
}
function la(t, e, n) {
  return t.getSubpaths().some((r) => {
    const [i] = r.toPolylines(n), { type: s } = r.getSegment(-1);
    return s === "Z" ? $i(i, e) : _r(i, e);
  });
}
function ua(t, e, n) {
  return t.getSubpaths().some((r) => {
    const [i] = r.toPolylines(n), { type: s } = r.getSegment(-1);
    return s === "Z" ? Nr(i, e) : Hi(i, e);
  });
}
function ha(t, e, n) {
  return Mr(t, jt.fromRect(e), n);
}
function qi(t, e, n) {
  return va(t, e, n, { interior: !1 });
}
function Mr(t, e, n) {
  return va(t, e, n, { interior: !0 });
}
function fa(t, e, n, r) {
  return t.getSubpaths().some((i) => {
    const [s] = i.toPolylines(n), { type: o } = i.getSegment(-1);
    return o === "Z" ? Mr(e, s, r) : qi(e, s, r);
  });
}
function da(t, e, n = {}) {
  const { interior: r = !1 } = n;
  let i;
  if (r) {
    if (t.containsPoint(e.start)) return !0;
    const { start: a, end: c, points: u } = t;
    i = c.equals(a) ? u : [...u, a];
  } else i = t.points;
  const { length: s } = i, o = new H();
  for (let a = 0; a < s - 1; a++)
    if (o.start = i[a], o.end = i[a + 1], Ne(e, o)) return !0;
  return !1;
}
function ga(t, e, n = {}) {
  const { start: r, end: i, points: s } = t;
  if (e.containsPoint(r)) return !0;
  let o;
  const { interior: a = !1 } = n;
  if (a) {
    if (t.containsPoint(e.center())) return !0;
    o = i.equals(r) ? s : [...s, r];
  } else o = s;
  const { length: c } = o, u = new H();
  for (let h = 0; h < c - 1; h++)
    if (u.start = o[h], u.end = o[h + 1], ji(e, u)) return !0;
  return !1;
}
function pa(t, e, n) {
  const r = jt.fromRect(e);
  return Yi(t, r, n);
}
function va(t, e, n, r) {
  return t.getSubpaths().some((i) => {
    const [s] = i.toPolylines(n), { type: o } = i.getSegment(-1);
    return o === "Z" ? Yi(e, s, r) : Ir(e, s, r);
  });
}
function Ir(t, e, n = {}) {
  const { interior: r = !1 } = n;
  let i;
  if (r) {
    const { start: c } = e;
    if (t.containsPoint(c)) return !0;
    i = t.clone().close();
  } else i = t;
  const s = e.points, { length: o } = s, a = new H();
  for (let c = 0; c < o - 1; c++)
    if (a.start = s[c], a.end = s[c + 1], _r(i, a)) return !0;
  return !1;
}
function Yi(t, e, n) {
  return e.containsPoint(t.start) || Ir(t, e.clone().close(), n);
}
function Xl(t, e, n, r) {
  const { cos: i, sin: s } = Math, o = s(e), a = i(e), c = s(r), u = i(r), h = o * o, l = a * a, d = o * a, g = c * c, v = u * u, y = c * u, w = t.a * t.a, x = t.b * t.b, P = n.a * n.a, T = n.b * n.b, L = w * h + x * l, I = P * g + T * v, R = w * l + x * h, f = P * v + T * g;
  let p = 2 * (x - w) * d, m = 2 * (T - P) * y, b = -2 * L * t.x - p * t.y, S = -2 * I * n.x - m * n.y, M = -p * t.x - 2 * R * t.y, _ = -m * n.x - 2 * f * n.y;
  const F = L * t.x * t.x + R * t.y * t.y + p * t.x * t.y - w * x, U = I * n.x * n.x + f * n.y * n.y + m * n.x * n.y - P * T;
  p = p / 2, m = m / 2, b = b / 2, S = S / 2, M = M / 2, _ = _ / 2;
  const A = ye([
    [
      L,
      p,
      b
    ],
    [
      p,
      R,
      M
    ],
    [
      b,
      M,
      F
    ]
  ]), C = ye([
    [
      I,
      m,
      S
    ],
    [
      m,
      f,
      _
    ],
    [
      S,
      _,
      U
    ]
  ]), k = 0.33333333 * (ye([
    [
      I,
      p,
      b
    ],
    [
      m,
      R,
      M
    ],
    [
      S,
      M,
      F
    ]
  ]) + ye([
    [
      L,
      m,
      b
    ],
    [
      p,
      f,
      M
    ],
    [
      b,
      _,
      F
    ]
  ]) + ye([
    [
      L,
      p,
      S
    ],
    [
      p,
      R,
      _
    ],
    [
      b,
      M,
      U
    ]
  ])), N = 0.33333333 * (ye([
    [
      L,
      m,
      S
    ],
    [
      p,
      f,
      _
    ],
    [
      b,
      _,
      U
    ]
  ]) + ye([
    [
      I,
      p,
      S
    ],
    [
      m,
      R,
      _
    ],
    [
      S,
      M,
      U
    ]
  ]) + ye([
    [
      I,
      m,
      b
    ],
    [
      m,
      f,
      M
    ],
    [
      S,
      _,
      F
    ]
  ])), D = tr([[A, k], [k, N]]), W = tr([[A, N], [k, C]]), st = tr([[k, N], [N, C]]);
  return !(tr([[2 * D, W], [W, 2 * st]]) > 0 && (N > 0 || k > 0));
}
function tr(t) {
  return t[0][0] * t[1][1] - t[0][1] * t[1][0];
}
function ye(t) {
  return t[0][0] * t[1][1] * t[2][2] - t[0][0] * t[1][2] * t[2][1] - t[0][1] * t[1][0] * t[2][2] + t[0][1] * t[1][2] * t[2][0] + t[0][2] * t[1][0] * t[2][1] - t[0][2] * t[1][1] * t[2][0];
}
var ma = {};
Xt(ma, {
  Curve: () => mt,
  Ellipse: () => Vt,
  Line: () => H,
  Path: () => Z,
  Point: () => E,
  Polygon: () => jt,
  Polyline: () => St,
  Rect: () => j,
  bezier: () => Yl,
  ellipse: () => zl,
  intersection: () => Me,
  line: () => Re,
  normalizeAngle: () => Qt,
  point: () => xr,
  random: () => fi,
  rect: () => Hl,
  scale: () => Dl,
  snapToGrid: () => Be,
  toDeg: () => Lr,
  toRad: () => Ut,
  types: () => ct
});
const Me = Qo, Jl = (function() {
  var t = typeof window == "object" && !!window.SVGAngle;
  if (!t) return function() {
    throw new Error("SVG is required to use Vectorizer.");
  };
  var e = {
    svg: "http://www.w3.org/2000/svg",
    xmlns: "http://www.w3.org/2000/xmlns/",
    xml: "http://www.w3.org/XML/1998/namespace",
    xlink: "http://www.w3.org/1999/xlink",
    xhtml: "http://www.w3.org/1999/xhtml"
  }, n = "1.1", r = Math, i = r.PI, s = r.atan2, o = r.sqrt, a = r.min, c = r.max, u = r.cos, h = r.sin, l = function(f, p, m) {
    if (!(this instanceof l)) return l.apply(Object.create(l.prototype), arguments);
    if (f) {
      if (l.isV(f) && (f = f.node), p = p || {}, l.isString(f)) {
        if (f = f.trim(), f.toLowerCase() === "svg") f = l.createSvgDocument();
        else if (f[0] === "<") {
          var b = l.createSvgDocument(f);
          if (b.childNodes.length > 1) {
            var S = [], M, _;
            for (M = 0, _ = b.childNodes.length; M < _; M++) {
              var F = b.childNodes[M];
              S.push(new l(document.importNode(F, !0)));
            }
            return S;
          }
          f = document.importNode(b.firstChild, !0);
        } else f = document.createElementNS(e.svg, f);
        l.ensureId(f);
      }
      return this.node = f, this.setAttributes(p), m && this.append(m), this;
    }
  }, d = l.prototype;
  Object.defineProperty(d, "id", {
    enumerable: !0,
    get: function() {
      return this.node.id;
    },
    set: function(f) {
      this.node.id = f;
    }
  }), d.getTransformToElement = function(f) {
    var p = this.node;
    if (l.isSVGGraphicsElement(f) && l.isSVGGraphicsElement(p)) {
      var m = l.toNode(f).getScreenCTM(), b = p.getScreenCTM();
      if (m && b) return m.inverse().multiply(b);
    }
    return l.createSVGMatrix();
  }, d.transform = function(f, p) {
    var m = this.node;
    if (l.isUndefined(f)) return l.transformStringToMatrix(this.attr("transform"));
    if (p && p.absolute) return this.attr("transform", l.matrixToTransformString(f));
    var b = l.createSVGTransform(f);
    return m.transform.baseVal.appendItem(b), this;
  }, d.translate = function(f, p, m) {
    m = m || {}, p = p || 0;
    var b = this.attr("transform") || "", S = l.parseTransformString(b);
    if (b = S.value, l.isUndefined(f)) return S.translate;
    b = b.replace(/translate\([^)]*\)/g, "").trim();
    var M = m.absolute ? f : S.translate.tx + f, _ = m.absolute ? p : S.translate.ty + p, F = "translate(" + M + "," + _ + ")";
    return this.attr("transform", (F + " " + b).trim()), this;
  }, d.rotate = function(f, p, m, b) {
    b = b || {};
    var S = this.attr("transform") || "", M = l.parseTransformString(S);
    if (S = M.value, l.isUndefined(f)) return M.rotate;
    S = S.replace(/rotate\([^)]*\)/g, "").trim(), f %= 360;
    var _ = b.absolute ? f : M.rotate.angle + f, F = p !== void 0 && m !== void 0 ? "," + p + "," + m : "", U = "rotate(" + _ + F + ")";
    return this.attr("transform", (S + " " + U).trim()), this;
  }, d.scale = function(f, p) {
    p = l.isUndefined(p) ? f : p;
    var m = this.attr("transform") || "", b = l.parseTransformString(m);
    if (m = b.value, l.isUndefined(f)) return b.scale;
    m = m.replace(/scale\([^)]*\)/g, "").trim();
    var S = "scale(" + f + "," + p + ")";
    return this.attr("transform", (m + " " + S).trim()), this;
  }, d.bbox = function(f, p) {
    var m, b = this.node, S = b.ownerSVGElement;
    if (!S) return new j(0, 0, 0, 0);
    try {
      m = b.getBBox();
    } catch {
      m = {
        x: b.clientLeft,
        y: b.clientTop,
        width: b.clientWidth,
        height: b.clientHeight
      };
    }
    if (f) return new j(m);
    var M = this.getTransformToElement(p || S);
    return l.transformRect(m, M);
  }, d.getBBox = function(f) {
    var p = {}, m, b = this.node, S = b.ownerSVGElement;
    if (!S || !l.isSVGGraphicsElement(b)) return new j(0, 0, 0, 0);
    if (f && (f.target && (p.target = l.toNode(f.target)), f.recursive && (p.recursive = f.recursive)), p.recursive) {
      var _ = this.children(), F = _.length;
      if (F === 0) return this.getBBox({
        target: p.target,
        recursive: !1
      });
      p.target || (p.target = this);
      for (var U = 0; U < F; U++) {
        var A = _[U], C;
        A.children().length === 0 ? C = A.getBBox({
          target: p.target,
          recursive: !1
        }) : C = A.getBBox({
          target: p.target,
          recursive: !0
        }), m ? m = m.union(C) : m = C;
      }
      return m;
    } else {
      try {
        m = b.getBBox();
      } catch {
        m = {
          x: b.clientLeft,
          y: b.clientTop,
          width: b.clientWidth,
          height: b.clientHeight
        };
      }
      if (p.target) {
        var M = this.getTransformToElement(p.target);
        return l.transformRect(m, M);
      } else
        return new j(m);
    }
  };
  function g(f, p) {
    f || (f = {});
    var m = l("textPath"), b = f.d;
    if (b && f["xlink:href"] === void 0) {
      var S = l("path").attr("d", b).appendTo(p.defs());
      m.attr("xlink:href", "#" + S.id);
    }
    return l.isObject(f) && m.attr(f), m.node;
  }
  function v(f, p, m) {
    m || (m = {});
    for (var b = m.includeAnnotationIndices, S = m.eol, M = m.lineHeight, _ = m.baseSize, F = 0, U = {}, A = p.length - 1, C = 0; C <= A; C++) {
      var k = p[C], N = null;
      if (l.isObject(k)) {
        var D = k.attrs, W = l("tspan", D), st = W.node, at = k.t;
        S && C === A && (at += S), st.textContent = at;
        var q = D.class;
        q && W.addClass(q), b && W.attr("annotations", k.annotations), N = parseFloat(D["font-size"]), isFinite(N) || (N = _), N && N > F && (F = N);
      } else
        S && C === A && (k += S), st = document.createTextNode(k || " "), _ && _ > F && (F = _);
      f.appendChild(st);
    }
    return F && (U.maxFontSize = F), M ? U.lineHeight = M : F && (U.lineHeight = F * 1.2), U;
  }
  var y = /em$/;
  function w(f, p) {
    var m = parseFloat(f);
    return y.test(f) ? m * p : m;
  }
  function x(f, p, m, b) {
    if (!Array.isArray(p)) return 0;
    var S = p.length;
    if (!S) return 0;
    for (var M = p[0], _ = w(M.maxFontSize, m) || m, F = 0, U = w(b, m), A = 1; A < S; A++) {
      M = p[A];
      var C = w(M.lineHeight, m) || U;
      F += C;
    }
    var k = w(M.maxFontSize, m) || m, N;
    switch (f) {
      case "middle":
        N = _ / 2 - 0.15 * k - F / 2;
        break;
      case "bottom":
        N = -(0.25 * k) - F;
        break;
      case "top":
      default:
        N = 0.8 * _;
        break;
    }
    return N;
  }
  d.text = function(f, p) {
    if (f && typeof f != "string") throw new Error("Vectorizer: text() expects the first argument to be a string.");
    f = l.sanitizeText(f), p || (p = {});
    var m = p.displayEmpty, b = p.eol, S = p.textPath, M = p.textVerticalAnchor, _ = M === "middle" || M === "bottom" || M === "top", F = p.x;
    F === void 0 && (F = this.attr("x") || 0);
    var U = p.includeAnnotationIndices, A = p.annotations;
    A && !l.isArray(A) && (A = [A]);
    var C = p.lineHeight, k = C === "auto", N = k ? "1.5em" : C || "1em";
    this.empty(), this.attr({
      "xml:space": "preserve",
      display: f || m ? null : "none"
    });
    var D = parseFloat(this.attr("font-size"));
    D || (D = 16, (_ || A) && this.attr("font-size", D));
    var W = document, st;
    S ? (typeof S == "string" && (S = { d: S }), st = g(S, this)) : st = W.createDocumentFragment();
    for (var at = 0, q = f.split(`
`), K = [], et, Q = 0, Y = q.length - 1; Q <= Y; Q++) {
      var rt = N, lt = "v-line", nt = W.createElementNS(e.svg, "tspan"), vt = q[Q], ot;
      if (vt) if (A) {
        var it = l.annotateString(vt, A, {
          offset: -at,
          includeAnnotationIndices: U
        });
        ot = v(nt, it, {
          includeAnnotationIndices: U,
          eol: Q !== Y && b,
          lineHeight: k ? null : N,
          baseSize: D
        });
        var ut = ot.lineHeight;
        ut && k && Q !== 0 && (rt = ut), Q === 0 && (et = ot.maxFontSize * 0.8);
      } else
        b && Q !== Y && (vt += b), nt.textContent = vt;
      else {
        nt.textContent = "-", lt += " v-empty-line";
        var X = nt.style;
        if (X.fillOpacity = 0, X.strokeOpacity = 0, A) {
          ot = {}, it = l.findAnnotationsAtIndex(A, at);
          let G = D;
          for (let V = it.length; V > 0; V--) {
            const tt = it[V - 1].attrs;
            if (!tt || !("font-size" in tt)) continue;
            const At = parseFloat(tt["font-size"]);
            if (isFinite(At)) {
              G = At;
              break;
            }
          }
          k && (Q > 0 ? rt = G * 1.2 : et = G * 0.8), nt.setAttribute("font-size", G), ot.maxFontSize = G;
        }
      }
      ot && K.push(ot), Q > 0 && nt.setAttribute("dy", rt), (Q > 0 || S) && nt.setAttribute("x", F), nt.className.baseVal = lt, st.appendChild(nt), at += vt.length + 1;
    }
    if (_) if (A) rt = x(M, K, D, N);
    else if (M === "top") rt = "0.8em";
    else {
      var O;
      switch (Y > 0 ? (O = parseFloat(N) || 1, O *= Y, y.test(N) || (O /= D)) : O = 0, M) {
        case "middle":
          rt = 0.3 - O / 2 + "em";
          break;
        case "bottom":
          rt = -O - 0.3 + "em";
          break;
      }
    }
    else M === 0 ? rt = "0em" : M ? rt = M : (rt = 0, this.attr("y") === null && this.attr("y", et || "0.8em"));
    return st.firstChild.setAttribute("dy", rt), this.append(st), this;
  }, d.removeAttr = function(f) {
    const p = I[f], { ns: m, local: b } = l.qualifyAttr(p), S = this.node;
    return m ? S.hasAttributeNS(m, b) && S.removeAttributeNS(m, b) : S.hasAttribute(p) && S.removeAttribute(p), this;
  }, d.attr = function(f, p) {
    if (l.isUndefined(f)) {
      for (var m = this.node.attributes, b = {}, S = 0; S < m.length; S++) b[m[S].name] = m[S].value;
      return b;
    }
    if (l.isString(f) && l.isUndefined(p)) return this.node.getAttribute(I[f]);
    if (typeof f == "object")
      for (var M in f) f.hasOwnProperty(M) && this.setAttribute(M, f[M]);
    else this.setAttribute(f, p);
    return this;
  }, d.normalizePath = function() {
    var f = this.tagName();
    return f === "PATH" && this.attr("d", l.normalizePathData(this.attr("d"))), this;
  }, d.remove = function() {
    return this.node.parentNode && this.node.parentNode.removeChild(this.node), this;
  }, d.empty = function() {
    for (; this.node.firstChild; ) this.node.removeChild(this.node.firstChild);
    return this;
  }, d.setAttributes = function(f) {
    for (var p in f) f.hasOwnProperty(p) && this.setAttribute(p, f[p]);
    return this;
  }, d.append = function(f) {
    l.isArray(f) || (f = [f]);
    for (var p = 0, m = f.length; p < m; p++) this.node.appendChild(l.toNode(f[p]));
    return this;
  }, d.prepend = function(f) {
    var p = this.node.firstChild;
    return p ? l(p).before(f) : this.append(f);
  }, d.before = function(f) {
    var p = this.node, m = p.parentNode;
    if (m) {
      l.isArray(f) || (f = [f]);
      for (var b = 0, S = f.length; b < S; b++) m.insertBefore(l.toNode(f[b]), p);
    }
    return this;
  }, d.appendTo = function(f) {
    return l.toNode(f).appendChild(this.node), this;
  }, d.svg = function() {
    return this.node instanceof window.SVGSVGElement ? this : l(this.node.ownerSVGElement);
  }, d.tagName = function() {
    return this.node.tagName.toUpperCase();
  }, d.defs = function() {
    var f = this.svg() || this, p = f.node.getElementsByTagName("defs")[0];
    return p ? l(p) : l("defs").appendTo(f);
  }, d.clone = function() {
    var f = l(this.node.cloneNode(!0));
    return f.node.id = l.uniqueId(), f;
  }, d.findOne = function(f) {
    var p = this.node.querySelector(f);
    return p ? l(p) : void 0;
  }, d.find = function(f) {
    var p = [], m = this.node.querySelectorAll(f);
    if (m) for (var b = 0; b < m.length; b++) p.push(l(m[b]));
    return p;
  }, d.children = function() {
    for (var f = this.node.childNodes, p = [], m = 0; m < f.length; m++) {
      var b = f[m];
      b.nodeType === 1 && p.push(l(f[m]));
    }
    return p;
  }, d.parent = function() {
    return l(this.node.parentNode) || null;
  }, d.index = function() {
    for (var f = 0, p = this.node.previousSibling; p; )
      p.nodeType === 1 && f++, p = p.previousSibling;
    return f;
  }, d.findParentByClass = function(f, p) {
    for (var m = this.node.ownerSVGElement, b = this.node.parentNode; b && b !== p && b !== m; ) {
      var S = l(b);
      if (S.hasClass(f)) return S;
      b = b.parentNode;
    }
    return null;
  }, d.contains = function(f) {
    var p = this.node, m = l.toNode(f), b = m && m.parentNode;
    return p === b || !!(b && b.nodeType === 1 && p.compareDocumentPosition(b) & 16);
  }, d.toLocalPoint = function(f, p) {
    var m = this.svg().node, b = m.createSVGPoint();
    b.x = f, b.y = p;
    try {
      var S = b.matrixTransform(m.getScreenCTM().inverse()), M = this.getTransformToElement(m).inverse();
    } catch {
      return b;
    }
    return S.matrixTransform(M);
  }, d.translateCenterToPoint = function(f) {
    var p = this.getBBox({ target: this.svg() }), m = p.center();
    return this.translate(f.x - m.x, f.y - m.y), this;
  }, d.translateAndAutoOrient = function(f, p, m) {
    f = new E(f), p = new E(p), m || (m = this.svg());
    var b = this.scale();
    this.attr("transform", "");
    var S = this.getBBox({ target: m }).scale(b.sx, b.sy), M = l.createSVGTransform();
    M.setTranslate(-S.x - S.width / 2, -S.y - S.height / 2);
    var _ = l.createSVGTransform(), F = f.angleBetween(p, f.clone().offset(1, 0));
    F && _.setRotate(F, 0, 0);
    var U = l.createSVGTransform(), A = f.clone().move(p, S.width / 2);
    U.setTranslate(2 * f.x - A.x, 2 * f.y - A.y);
    var C = this.getTransformToElement(m), k = l.createSVGTransform();
    return k.setMatrix(U.matrix.multiply(_.matrix.multiply(M.matrix.multiply(C.scale(b.sx, b.sy))))), this.attr("transform", l.matrixToTransformString(k.matrix)), this;
  }, d.animateAlongPath = function(f, p) {
    p = l.toNode(p);
    var m = l.ensureId(p), b = l("animateMotion", f), S = l("mpath", { "xlink:href": "#" + m });
    b.append(S), this.append(b);
    try {
      b.node.beginElement();
    } catch {
      if (document.documentElement.getAttribute("smiling") === "fake") {
        var M = b.node;
        M.animators = [];
        var _ = M.getAttribute("id");
        _ && (id2anim[_] = M);
        for (var F = getTargets(M), U = 0, A = F.length; U < A; U++) {
          var C = F[U], k = new Animator(M, C, U);
          animators.push(k), M.animators[U] = k, k.register();
        }
      }
    }
    return this;
  };
  const P = /[^\x20\t\r\n\f]+/g;
  function T(f) {
    return l.isString(f) ? f.trim().match(P) || [] : [];
  }
  d.hasClass = function(f) {
    return l.isString(f) ? this.node.classList.contains(f.trim()) : !1;
  }, d.addClass = function(f) {
    return this.node.classList.add(...T(f)), this;
  }, d.removeClass = function(f) {
    return this.node.classList.remove(...T(f)), this;
  }, d.toggleClass = function(f, p) {
    const m = T(f);
    for (let b = 0; b < m.length; b++) this.node.classList.toggle(m[b], p);
    return this;
  }, d.sample = function(f) {
    f = f || 1;
    for (var p = this.node, m = p.getTotalLength(), b = [], S = 0, M; S < m; )
      M = p.getPointAtLength(S), b.push({
        x: M.x,
        y: M.y,
        distance: S
      }), S += f;
    return b;
  }, d.convertToPath = function() {
    var f = l("path");
    f.attr(this.attr());
    var p = this.convertToPathData();
    return p && f.attr("d", p), f;
  }, d.convertToPathData = function() {
    var f = this.tagName();
    switch (f) {
      case "PATH":
        return this.attr("d");
      case "LINE":
        return l.convertLineToPathData(this.node);
      case "POLYGON":
        return l.convertPolygonToPathData(this.node);
      case "POLYLINE":
        return l.convertPolylineToPathData(this.node);
      case "ELLIPSE":
        return l.convertEllipseToPathData(this.node);
      case "CIRCLE":
        return l.convertCircleToPathData(this.node);
      case "RECT":
        return l.convertRectToPathData(this.node);
    }
    throw new Error(f + " cannot be converted to PATH.");
  }, l.prototype.toGeometryShape = function() {
    var f, p, m, b, S, M, _, F, U, A, C, k, N, D, W;
    switch (this.tagName()) {
      case "RECT":
        return f = parseFloat(this.attr("x")) || 0, p = parseFloat(this.attr("y")) || 0, m = parseFloat(this.attr("width")) || 0, b = parseFloat(this.attr("height")) || 0, new j(f, p, m, b);
      case "CIRCLE":
        return S = parseFloat(this.attr("cx")) || 0, M = parseFloat(this.attr("cy")) || 0, _ = parseFloat(this.attr("r")) || 0, new Vt({
          x: S,
          y: M
        }, _, _);
      case "ELLIPSE":
        return S = parseFloat(this.attr("cx")) || 0, M = parseFloat(this.attr("cy")) || 0, F = parseFloat(this.attr("rx")) || 0, U = parseFloat(this.attr("ry")) || 0, new Vt({
          x: S,
          y: M
        }, F, U);
      case "POLYLINE":
        return A = l.getPointsFromSvgNode(this), new St(A);
      case "POLYGON":
        return A = l.getPointsFromSvgNode(this), A.length > 1 && A.push(A[0]), new St(A);
      case "PATH":
        return C = this.attr("d"), Z.isDataSupported(C) || (C = l.normalizePathData(C)), new Z(C);
      case "LINE":
        return k = parseFloat(this.attr("x1")) || 0, D = parseFloat(this.attr("y1")) || 0, N = parseFloat(this.attr("x2")) || 0, W = parseFloat(this.attr("y2")) || 0, new H({
          x: k,
          y: D
        }, {
          x: N,
          y: W
        });
    }
    return this.getBBox();
  }, d.findIntersection = function(f, p) {
    var m = this.svg().node;
    p = p || m;
    var b = this.getBBox({ target: p }), S = b.center();
    if (b.intersectionWithLineFromCenterToPoint(f)) {
      var M, _ = this.tagName();
      if (_ === "RECT") {
        var F = new j(parseFloat(this.attr("x") || 0), parseFloat(this.attr("y") || 0), parseFloat(this.attr("width")), parseFloat(this.attr("height"))), U = this.getTransformToElement(p), A = l.decomposeMatrix(U), C = m.createSVGTransform();
        C.setRotate(-A.rotation, S.x, S.y);
        var k = l.transformRect(F, C.matrix.multiply(U));
        M = new j(k).intersectionWithLineFromCenterToPoint(f, A.rotation);
      } else if (_ === "PATH" || _ === "POLYGON" || _ === "POLYLINE" || _ === "CIRCLE" || _ === "ELLIPSE") {
        var N = _ === "PATH" ? this : this.convertToPath(), D = N.sample(), W = 1 / 0, st = [], at, q, K, et, Q, Y;
        for (at = 0; at < D.length; at++)
          q = D[at], K = l.createSVGPoint(q.x, q.y), K = K.matrixTransform(this.getTransformToElement(p)), q = new E(K), et = q.distance(S), Q = q.distance(f) * 1.1, Y = et + Q, Y < W ? (W = Y, st = [{
            sample: q,
            refDistance: Q
          }]) : Y < W + 1 && st.push({
            sample: q,
            refDistance: Q
          });
        st.sort(function(rt, lt) {
          return rt.refDistance - lt.refDistance;
        }), st[0] && (M = st[0].sample);
      }
      return M;
    }
  }, d.setAttribute = function(f, p) {
    const m = this.node;
    if (p === null)
      return this.removeAttr(f), this;
    const b = I[f], { ns: S } = l.qualifyAttr(b);
    return S ? m.setAttributeNS(S, b, p) : b === "id" ? m.id = p : m.setAttribute(b, p), this;
  }, l.createSvgDocument = function(f) {
    if (f) {
      const m = `<svg xmlns="${e.svg}" xmlns:xlink="${e.xlink}" version="${n}">${f}</svg>`, { documentElement: b } = l.parseXML(m, { async: !1 });
      return b;
    }
    const p = document.createElementNS(e.svg, "svg");
    return p.setAttributeNS(e.xmlns, "xmlns:xlink", e.xlink), p.setAttribute("version", n), p;
  }, l.createSVGStyle = function(f) {
    const { node: p } = l("style", { type: "text/css" }, [l.createCDATASection(f)]);
    return p;
  }, l.createCDATASection = function(f = "") {
    return document.implementation.createDocument(null, "xml", null).createCDATASection(f);
  }, l.idCounter = 0, l.uniqueId = function() {
    return "v-" + ++l.idCounter;
  }, l.toNode = function(f) {
    return l.isV(f) ? f.node : f.nodeName && f || f[0];
  }, l.ensureId = function(f) {
    return f = l.toNode(f), f.id || (f.id = l.uniqueId());
  }, l.sanitizeText = function(f) {
    return (f || "").replace(/ /g, " ");
  }, l.isUndefined = function(f) {
    return typeof f > "u";
  }, l.isString = function(f) {
    return typeof f == "string";
  }, l.isObject = function(f) {
    return f && typeof f == "object";
  }, l.isArray = Array.isArray, l.parseXML = function(f, p) {
    p = p || {};
    var m;
    try {
      var b = new DOMParser();
      l.isUndefined(p.async) || (b.async = p.async), m = b.parseFromString(f, "text/xml");
    } catch {
      m = void 0;
    }
    if (!m || m.getElementsByTagName("parsererror").length) throw new Error("Invalid XML: " + f);
    return m;
  };
  const L = /* @__PURE__ */ Object.create(null);
  [
    "baseFrequency",
    "baseProfile",
    "clipPathUnits",
    "contentScriptType",
    "contentStyleType",
    "diffuseConstant",
    "edgeMode",
    "externalResourcesRequired",
    "filterRes",
    "filterUnits",
    "gradientTransform",
    "gradientUnits",
    "kernelMatrix",
    "kernelUnitLength",
    "keyPoints",
    "lengthAdjust",
    "limitingConeAngle",
    "markerHeight",
    "markerUnits",
    "markerWidth",
    "maskContentUnits",
    "maskUnits",
    "numOctaves",
    "pathLength",
    "patternContentUnits",
    "patternTransform",
    "patternUnits",
    "pointsAtX",
    "pointsAtY",
    "pointsAtZ",
    "preserveAlpha",
    "preserveAspectRatio",
    "primitiveUnits",
    "refX",
    "refY",
    "requiredExtensions",
    "requiredFeatures",
    "specularConstant",
    "specularExponent",
    "spreadMethod",
    "startOffset",
    "stdDeviation",
    "stitchTiles",
    "surfaceScale",
    "systemLanguage",
    "tableValues",
    "targetX",
    "targetY",
    "textLength",
    "viewBox",
    "viewTarget",
    "xChannelSelector",
    "yChannelSelector",
    "zoomAndPan"
  ].forEach((f) => L[f] = f), L.xlinkShow = "xlink:show", L.xlinkRole = "xlink:role", L.xlinkActuate = "xlink:actuate", L.xlinkHref = "xlink:href", L.xlinkType = "xlink:type", L.xlinkTitle = "xlink:title", L.xmlBase = "xml:base", L.xmlLang = "xml:lang", L.xmlSpace = "xml:space";
  const I = new Proxy(L, { get(f, p) {
    return l.supportCamelCaseAttributes ? p in f ? f[p] : f[p] = p.replace(/[A-Z]/g, "-$&").toLowerCase() : p;
  } });
  Object.defineProperty(l, "attributeNames", {
    enumerable: !0,
    value: I,
    writable: !1
  }), Object.defineProperty(l, "supportCamelCaseAttributes", {
    enumerable: !0,
    value: !0,
    writable: !0
  }), l.qualifyAttr = function(f) {
    if (f.indexOf(":") !== -1) {
      var p = f.split(":");
      return {
        ns: e[p[0]],
        local: p[1]
      };
    }
    return {
      ns: null,
      local: f
    };
  }, l.transformSeparatorRegex = /[ ,]+/, l.transformRegex = /\b\w+\([^()]+\)/g, l.transformFunctionRegex = /\b(\w+)\(([^()]+)\)/, l.transformTranslateRegex = /\btranslate\(([^()]+)\)/, l.transformRotateRegex = /\brotate\(([^()]+)\)/, l.transformScaleRegex = /\bscale\(([^()]+)\)/, l.transformStringToMatrix = function(f) {
    let p = l.createSVGMatrix();
    const m = f && f.match(l.transformRegex);
    if (!m) return p;
    const b = m.length;
    for (let S = 0; S < b; S++) {
      const _ = m[S].match(l.transformFunctionRegex);
      if (_) {
        let F, U, A, C, k, N = l.createSVGMatrix();
        const D = _[1].toLowerCase(), W = _[2].split(l.transformSeparatorRegex);
        switch (D) {
          case "scale":
            F = parseFloat(W[0]), U = W[1] === void 0 ? F : parseFloat(W[1]), N = N.scaleNonUniform(F, U);
            break;
          case "translate":
            A = parseFloat(W[0]), C = parseFloat(W[1]), N = N.translate(A, C);
            break;
          case "rotate":
            k = parseFloat(W[0]), A = parseFloat(W[1]) || 0, C = parseFloat(W[2]) || 0, A !== 0 || C !== 0 ? N = N.translate(A, C).rotate(k).translate(-A, -C) : N = N.rotate(k);
            break;
          case "skewx":
            k = parseFloat(W[0]), N = N.skewX(k);
            break;
          case "skewy":
            k = parseFloat(W[0]), N = N.skewY(k);
            break;
          case "matrix":
            N.a = parseFloat(W[0]), N.b = parseFloat(W[1]), N.c = parseFloat(W[2]), N.d = parseFloat(W[3]), N.e = parseFloat(W[4]), N.f = parseFloat(W[5]);
            break;
          default:
            continue;
        }
        p = p.multiply(N);
      }
    }
    return p;
  }, l.matrixToTransformString = function(f) {
    return f || (f = !0), "matrix(" + (f.a !== void 0 ? f.a : 1) + "," + (f.b !== void 0 ? f.b : 0) + "," + (f.c !== void 0 ? f.c : 0) + "," + (f.d !== void 0 ? f.d : 1) + "," + (f.e !== void 0 ? f.e : 0) + "," + (f.f !== void 0 ? f.f : 0) + ")";
  }, l.parseTransformString = function(f) {
    var p, m, b;
    if (f) {
      var S = l.transformSeparatorRegex;
      if (f.trim().indexOf("matrix") >= 0) {
        var M = l.transformStringToMatrix(f), _ = l.decomposeMatrix(M);
        p = [_.translateX, _.translateY], b = [_.scaleX, _.scaleY], m = [_.rotation];
        var F = [];
        (p[0] !== 0 || p[1] !== 0) && F.push("translate(" + p + ")"), (b[0] !== 1 || b[1] !== 1) && F.push("scale(" + b + ")"), m[0] !== 0 && F.push("rotate(" + m + ")"), f = F.join(" ");
      } else {
        const A = f.match(l.transformTranslateRegex);
        A && (p = A[1].split(S));
        const C = f.match(l.transformRotateRegex);
        C && (m = C[1].split(S));
        const k = f.match(l.transformScaleRegex);
        k && (b = k[1].split(S));
      }
    }
    var U = b && b[0] ? parseFloat(b[0]) : 1;
    return {
      value: f,
      translate: {
        tx: p && p[0] ? parseInt(p[0], 10) : 0,
        ty: p && p[1] ? parseInt(p[1], 10) : 0
      },
      rotate: {
        angle: m && m[0] ? parseInt(m[0], 10) : 0,
        cx: m && m[1] ? parseInt(m[1], 10) : void 0,
        cy: m && m[2] ? parseInt(m[2], 10) : void 0
      },
      scale: {
        sx: U,
        sy: b && b[1] ? parseFloat(b[1]) : U
      }
    };
  }, l.deltaTransformPoint = function(f, p) {
    var m = p.x * f.a + p.y * f.c + 0, b = p.x * f.b + p.y * f.d + 0;
    return {
      x: m,
      y: b
    };
  }, l.decomposeMatrix = function(f) {
    var p = l.deltaTransformPoint(f, {
      x: 0,
      y: 1
    }), m = l.deltaTransformPoint(f, {
      x: 1,
      y: 0
    }), b = 180 / i * s(p.y, p.x) - 90, S = 180 / i * s(m.y, m.x);
    return {
      translateX: f.e,
      translateY: f.f,
      scaleX: o(f.a * f.a + f.b * f.b),
      scaleY: o(f.c * f.c + f.d * f.d),
      skewX: b,
      skewY: S,
      rotation: b
    };
  }, l.matrixToScale = function(f) {
    var p, m, b, S;
    return f ? (p = l.isUndefined(f.a) ? 1 : f.a, S = l.isUndefined(f.d) ? 1 : f.d, m = f.b, b = f.c) : p = S = 1, {
      sx: m ? o(p * p + m * m) : p,
      sy: b ? o(b * b + S * S) : S
    };
  }, l.matrixToRotate = function(f) {
    var p = {
      x: 0,
      y: 1
    };
    return f && (p = l.deltaTransformPoint(f, p)), { angle: Qt(Lr(s(p.y, p.x)) - 90) };
  }, l.matrixToTranslate = function(f) {
    return {
      tx: f && f.e || 0,
      ty: f && f.f || 0
    };
  }, l.isV = function(f) {
    return f instanceof l;
  }, l.isVElement = l.isV, l.isSVGGraphicsElement = function(f) {
    return f ? (f = l.toNode(f), f instanceof SVGElement && typeof f.getScreenCTM == "function") : !1;
  };
  var R = l("svg").node;
  return l.createSVGMatrix = function(f) {
    var p = R.createSVGMatrix();
    for (var m in f) p[m] = f[m];
    return p;
  }, l.createSVGTransform = function(f) {
    return l.isUndefined(f) ? R.createSVGTransform() : (f instanceof SVGMatrix || (f = l.createSVGMatrix(f)), R.createSVGTransformFromMatrix(f));
  }, l.createSVGPoint = function(f, p) {
    var m = R.createSVGPoint();
    return m.x = f, m.y = p, m;
  }, l.transformRect = function(f, p) {
    var m = R.createSVGPoint();
    m.x = f.x, m.y = f.y;
    var b = m.matrixTransform(p);
    m.x = f.x + f.width, m.y = f.y;
    var S = m.matrixTransform(p);
    m.x = f.x + f.width, m.y = f.y + f.height;
    var M = m.matrixTransform(p);
    m.x = f.x, m.y = f.y + f.height;
    var _ = m.matrixTransform(p), F = a(b.x, S.x, M.x, _.x), U = c(b.x, S.x, M.x, _.x), A = a(b.y, S.y, M.y, _.y), C = c(b.y, S.y, M.y, _.y);
    return new j(F, A, U - F, C - A);
  }, l.transformPoint = function(f, p) {
    return new E(l.createSVGPoint(f.x, f.y).matrixTransform(p));
  }, l.transformLine = function(f, p) {
    return new H(l.transformPoint(f.start, p), l.transformPoint(f.end, p));
  }, l.transformPolyline = function(f, p) {
    var m = f instanceof St ? f.points : f;
    l.isArray(m) || (m = []);
    for (var b = [], S = 0, M = m.length; S < M; S++) b[S] = l.transformPoint(m[S], p);
    return new St(b);
  }, l.styleToObject = function(f) {
    for (var p = {}, m = f.split(";"), b = 0; b < m.length; b++) {
      var S = m[b], M = S.split("=");
      p[M[0].trim()] = M[1].trim();
    }
    return p;
  }, l.createSlicePathData = function(f, p, m, b) {
    var S = 2 * i - 1e-6, M = f, _ = p, F = m, U = b, A = (U < F && (A = F, F = U, U = A), U - F), C = A < i ? "0" : "1", k = u(F), N = h(F), D = u(U), W = h(U);
    return A >= S ? M ? "M0," + _ + "A" + _ + "," + _ + " 0 1,1 0," + -_ + "A" + _ + "," + _ + " 0 1,1 0," + _ + "M0," + M + "A" + M + "," + M + " 0 1,0 0," + -M + "A" + M + "," + M + " 0 1,0 0," + M + "Z" : "M0," + _ + "A" + _ + "," + _ + " 0 1,1 0," + -_ + "A" + _ + "," + _ + " 0 1,1 0," + _ + "Z" : M ? "M" + _ * k + "," + _ * N + "A" + _ + "," + _ + " 0 " + C + ",1 " + _ * D + "," + _ * W + "L" + M * D + "," + M * W + "A" + M + "," + M + " 0 " + C + ",0 " + M * k + "," + M * N + "Z" : "M" + _ * k + "," + _ * N + "A" + _ + "," + _ + " 0 " + C + ",1 " + _ * D + "," + _ * W + "L0,0Z";
  }, l.mergeAttrs = function(f, p) {
    for (var m in p) m === "class" ? f[m] = f[m] ? f[m] + " " + p[m] : p[m] : m === "style" ? l.isObject(f[m]) && l.isObject(p[m]) ? f[m] = l.mergeAttrs(f[m], p[m]) : l.isObject(f[m]) ? f[m] = l.mergeAttrs(f[m], l.styleToObject(p[m])) : l.isObject(p[m]) ? f[m] = l.mergeAttrs(l.styleToObject(f[m]), p[m]) : f[m] = l.mergeAttrs(l.styleToObject(f[m]), l.styleToObject(p[m])) : f[m] = p[m];
    return f;
  }, l.annotateString = function(f, p, m) {
    p = p || [], m = m || {};
    for (var b = m.offset || 0, S = [], M, _ = [], F, U, A = 0; A < f.length; A++) {
      F = _[A] = f[A];
      for (var C = 0; C < p.length; C++) {
        var k = p[C], N = k.start + b, D = k.end + b;
        A >= N && A < D && (l.isObject(F) ? F.attrs = l.mergeAttrs(l.mergeAttrs({}, F.attrs), k.attrs) : F = _[A] = {
          t: f[A],
          attrs: k.attrs
        }, m.includeAnnotationIndices && (F.annotations || (F.annotations = [])).push(C));
      }
      U = _[A - 1], U ? l.isObject(F) && l.isObject(U) ? JSON.stringify(F.attrs) === JSON.stringify(U.attrs) ? M.t += F.t : (S.push(M), M = F) : l.isObject(F) || l.isObject(U) ? (S.push(M), M = F) : M = (M || "") + F : M = F;
    }
    return M && S.push(M), S;
  }, l.findAnnotationsAtIndex = function(f, p) {
    var m = [];
    return f && f.forEach(function(b) {
      b.start < p && p <= b.end && m.push(b);
    }), m;
  }, l.findAnnotationsBetweenIndexes = function(f, p, m) {
    var b = [];
    return f && f.forEach(function(S) {
      (p >= S.start && p < S.end || m > S.start && m <= S.end || S.start >= p && S.end < m) && b.push(S);
    }), b;
  }, l.shiftAnnotations = function(f, p, m) {
    return f && f.forEach(function(b) {
      b.start < p && b.end >= p ? b.end += m : b.start >= p && (b.start += m, b.end += m);
    }), f;
  }, l.convertLineToPathData = function(f) {
    f = l(f);
    var p = [
      "M",
      f.attr("x1"),
      f.attr("y1"),
      "L",
      f.attr("x2"),
      f.attr("y2")
    ].join(" ");
    return p;
  }, l.convertPolygonToPathData = function(f) {
    var p = l.getPointsFromSvgNode(f);
    return p.length === 0 ? null : l.svgPointsToPath(p) + " Z";
  }, l.convertPolylineToPathData = function(f) {
    var p = l.getPointsFromSvgNode(f);
    return p.length === 0 ? null : l.svgPointsToPath(p);
  }, l.svgPointsToPath = function(f) {
    for (var p = 0, m = f.length; p < m; p++) f[p] = f[p].x + " " + f[p].y;
    return "M " + f.join(" L");
  }, l.getPointsFromSvgNode = function(f) {
    f = l.toNode(f);
    var p = [], m = f.points;
    if (m) for (var b = 0, S = m.numberOfItems; b < S; b++) p.push(m.getItem(b));
    return p;
  }, l.KAPPA = 0.551784, l.convertCircleToPathData = function(f) {
    f = l(f);
    var p = parseFloat(f.attr("cx")) || 0, m = parseFloat(f.attr("cy")) || 0, b = parseFloat(f.attr("r")), S = b * l.KAPPA, M = [
      "M",
      p,
      m - b,
      "C",
      p + S,
      m - b,
      p + b,
      m - S,
      p + b,
      m,
      "C",
      p + b,
      m + S,
      p + S,
      m + b,
      p,
      m + b,
      "C",
      p - S,
      m + b,
      p - b,
      m + S,
      p - b,
      m,
      "C",
      p - b,
      m - S,
      p - S,
      m - b,
      p,
      m - b,
      "Z"
    ].join(" ");
    return M;
  }, l.convertEllipseToPathData = function(f) {
    f = l(f);
    var p = parseFloat(f.attr("cx")) || 0, m = parseFloat(f.attr("cy")) || 0, b = parseFloat(f.attr("rx")), S = parseFloat(f.attr("ry")) || b, M = b * l.KAPPA, _ = S * l.KAPPA, F = [
      "M",
      p,
      m - S,
      "C",
      p + M,
      m - S,
      p + b,
      m - _,
      p + b,
      m,
      "C",
      p + b,
      m + _,
      p + M,
      m + S,
      p,
      m + S,
      "C",
      p - M,
      m + S,
      p - b,
      m + _,
      p - b,
      m,
      "C",
      p - b,
      m - _,
      p - M,
      m - S,
      p,
      m - S,
      "Z"
    ].join(" ");
    return F;
  }, l.convertRectToPathData = function(f) {
    return f = l(f), l.rectToPath({
      x: parseFloat(f.attr("x")) || 0,
      y: parseFloat(f.attr("y")) || 0,
      width: parseFloat(f.attr("width")) || 0,
      height: parseFloat(f.attr("height")) || 0,
      rx: parseFloat(f.attr("rx")) || 0,
      ry: parseFloat(f.attr("ry")) || 0
    });
  }, l.rectToPath = function(f) {
    var p, m = f.x, b = f.y, S = f.width, M = f.height, _ = a(f.rx || f["top-rx"] || 0, S / 2), F = a(f.rx || f["bottom-rx"] || 0, S / 2), U = a(f.ry || f["top-ry"] || 0, M / 2), A = a(f.ry || f["bottom-ry"] || 0, M / 2);
    return _ || F || U || A ? p = [
      "M",
      m,
      b + U,
      "v",
      M - U - A,
      "a",
      F,
      A,
      0,
      0,
      0,
      F,
      A,
      "h",
      S - 2 * F,
      "a",
      F,
      A,
      0,
      0,
      0,
      F,
      -A,
      "v",
      -(M - A - U),
      "a",
      _,
      U,
      0,
      0,
      0,
      -_,
      -U,
      "h",
      -(S - 2 * _),
      "a",
      _,
      U,
      0,
      0,
      0,
      -_,
      U,
      "Z"
    ] : p = [
      "M",
      m,
      b,
      "H",
      m + S,
      "V",
      b + M,
      "H",
      m,
      "V",
      b,
      "Z"
    ], p.join(" ");
  }, l.normalizePathData = (function() {
    var f = `	
\v\f\r   ᠎             　\u2028\u2029`, p = new RegExp("([a-z])[" + f + ",]*((-?\\d*\\.?\\d*(?:e[\\-+]?\\d+)?[" + f + "]*,?[" + f + "]*)+)", "ig"), m = new RegExp("(-?\\d*\\.?\\d*(?:e[\\-+]?\\d+)?)[" + f + "]*,?[" + f + "]*", "ig"), b = Math, S = b.PI, M = b.sin, _ = b.cos, F = b.tan, U = b.asin, A = b.sqrt, C = b.abs;
    function k(q, K, et, Q, Y, rt) {
      var lt = 0.3333333333333333, nt = 2 / 3;
      return [
        lt * q + nt * et,
        lt * K + nt * Q,
        lt * Y + nt * et,
        lt * rt + nt * Q,
        Y,
        rt
      ];
    }
    function N(q, K, et) {
      var Q = q * _(et) - K * M(et), Y = q * M(et) + K * _(et);
      return {
        x: Q,
        y: Y
      };
    }
    function D(q, K, et, Q, Y, rt, lt, nt, vt, ot) {
      var it = S * 120 / 180, ut = S / 180 * (+Y || 0), X = [], O;
      if (ot)
        _t = ot[0], Et = ot[1], mn = ot[2], yn = ot[3];
      else {
        O = N(q, K, -ut), q = O.x, K = O.y, O = N(nt, vt, -ut), nt = O.x, vt = O.y;
        var G = (q - nt) / 2, V = (K - vt) / 2, tt = G * G / (et * et) + V * V / (Q * Q);
        tt > 1 && (tt = A(tt), et = tt * et, Q = tt * Q);
        var At = et * et, yt = Q * Q, qr = (rt == lt ? -1 : 1) * A(C((At * yt - At * V * V - yt * G * G) / (At * V * V + yt * G * G)));
        if (!Number.isFinite(qr)) return [
          q,
          K,
          nt,
          vt,
          nt,
          vt
        ];
        var mn = qr * et * V / Q + (q + nt) / 2, yn = qr * -Q * G / et + (K + vt) / 2, _t = U(((K - yn) / Q).toFixed(9)), Et = U(((vt - yn) / Q).toFixed(9));
        _t = q < mn ? S - _t : _t, Et = nt < mn ? S - Et : Et, _t < 0 && (_t = S * 2 + _t), Et < 0 && (Et = S * 2 + Et), lt && _t > Et && (_t = _t - S * 2), !lt && Et > _t && (Et = Et - S * 2);
      }
      var Yr = Et - _t;
      if (C(Yr) > it) {
        var yl = Et, bl = nt, wl = vt;
        Et = _t + it * (lt && Et > _t ? 1 : -1), nt = mn + et * _(Et), vt = yn + Q * M(Et), X = D(nt, vt, et, Q, Y, 0, lt, bl, wl, [
          Et,
          yl,
          mn,
          yn
        ]);
      }
      Yr = Et - _t;
      var xl = _(_t), Sl = M(_t), Al = _(Et), Pl = M(Et), xs = F(Yr / 4), Ss = 4 / 3 * (et * xs), As = 4 / 3 * (Q * xs), Ps = [q, K], $e = [q + Ss * Sl, K - As * xl], Es = [nt + Ss * Pl, vt - As * Al], Ts = [nt, vt];
      if ($e[0] = 2 * Ps[0] - $e[0], $e[1] = 2 * Ps[1] - $e[1], ot) return [
        $e,
        Es,
        Ts
      ].concat(X);
      X = [
        $e,
        Es,
        Ts
      ].concat(X).join().split(",");
      for (var Cs = [], El = X.length, me = 0; me < El; me++) Cs[me] = me % 2 ? N(X[me - 1], X[me], ut).y : N(X[me], X[me + 1], ut).x;
      return Cs;
    }
    function W(q) {
      if (!q) return null;
      var K = {
        a: 7,
        c: 6,
        h: 1,
        l: 2,
        m: 2,
        q: 4,
        s: 4,
        t: 2,
        v: 1,
        z: 0
      }, et = [];
      return String(q).replace(p, function(Q, Y, rt) {
        var lt = [], nt = Y.toLowerCase();
        for (rt.replace(m, function(vt, ot) {
          ot && lt.push(+ot);
        }), nt === "m" && lt.length > 2 && (et.push([Y].concat(lt.splice(0, 2))), nt = "l", Y = Y === "m" ? "l" : "L"); lt.length >= K[nt] && (et.push([Y].concat(lt.splice(0, K[nt]))), !!K[nt]); )
          ;
      }), et;
    }
    function st(q) {
      if ((!Array.isArray(q) || !Array.isArray(q && q[0])) && (q = W(q)), !q || !q.length) return [[
        "M",
        0,
        0
      ]];
      for (var K = [], et = 0, Q = 0, Y = 0, rt = 0, lt = 0, nt, vt = q.length, ot = lt; ot < vt; ot++) {
        var it = [];
        K.push(it);
        var ut = q[ot];
        if (nt = ut[0], nt != nt.toUpperCase()) {
          it[0] = nt.toUpperCase();
          var X, O;
          switch (it[0]) {
            case "A":
              it[1] = ut[1], it[2] = ut[2], it[3] = ut[3], it[4] = ut[4], it[5] = ut[5], it[6] = +ut[6] + et, it[7] = +ut[7] + Q;
              break;
            case "V":
              it[1] = +ut[1] + Q;
              break;
            case "H":
              it[1] = +ut[1] + et;
              break;
            case "M":
              for (Y = +ut[1] + et, rt = +ut[2] + Q, X = ut.length, O = 1; O < X; O++) it[O] = +ut[O] + (O % 2 ? et : Q);
              break;
            default:
              for (X = ut.length, O = 1; O < X; O++) it[O] = +ut[O] + (O % 2 ? et : Q);
              break;
          }
        } else
          for (var G = ut.length, V = 0; V < G; V++) it[V] = ut[V];
        switch (it[0]) {
          case "Z":
            et = +Y, Q = +rt;
            break;
          case "H":
            et = it[1];
            break;
          case "V":
            Q = it[1];
            break;
          case "M":
            Y = it[it.length - 2], rt = it[it.length - 1], et = it[it.length - 2], Q = it[it.length - 1];
            break;
          default:
            et = it[it.length - 2], Q = it[it.length - 1];
            break;
        }
      }
      return K;
    }
    function at(q) {
      var K = st(q), et = {
        x: 0,
        y: 0,
        bx: 0,
        by: 0,
        X: 0,
        Y: 0,
        qx: null,
        qy: null
      };
      function Q(X, O, G) {
        var V, tt;
        if (!X) return [
          "C",
          O.x,
          O.y,
          O.x,
          O.y,
          O.x,
          O.y
        ];
        switch (X[0] in {
          T: 1,
          Q: 1
        } || (O.qx = null, O.qy = null), X[0]) {
          case "M":
            O.X = X[1], O.Y = X[2];
            break;
          case "A":
            parseFloat(X[1]) === 0 || parseFloat(X[2]) === 0 ? X = [
              "L",
              X[6],
              X[7]
            ] : X = ["C"].concat(D.apply(0, [O.x, O.y].concat(X.slice(1))));
            break;
          case "S":
            G === "C" || G === "S" ? (V = O.x * 2 - O.bx, tt = O.y * 2 - O.by) : (V = O.x, tt = O.y), X = [
              "C",
              V,
              tt
            ].concat(X.slice(1));
            break;
          case "T":
            G === "Q" || G === "T" ? (O.qx = O.x * 2 - O.qx, O.qy = O.y * 2 - O.qy) : (O.qx = O.x, O.qy = O.y), X = ["C"].concat(k(O.x, O.y, O.qx, O.qy, X[1], X[2]));
            break;
          case "Q":
            O.qx = X[1], O.qy = X[2], X = ["C"].concat(k(O.x, O.y, X[1], X[2], X[3], X[4]));
            break;
          case "H":
            X = ["L"].concat(X[1], O.y);
            break;
          case "V":
            X = ["L"].concat(O.x, X[1]);
            break;
        }
        return X;
      }
      function Y(X, O) {
        if (X[O].length > 7) {
          X[O].shift();
          for (var G = X[O]; G.length; )
            rt[O] = "A", X.splice(O++, 0, ["C"].concat(G.splice(0, 6)));
          X.splice(O, 1), vt = K.length;
        }
      }
      for (var rt = [], lt = "", nt = "", vt = K.length, ot = 0; ot < vt; ot++) {
        K[ot] && (lt = K[ot][0]), lt !== "C" && (rt[ot] = lt, ot > 0 && (nt = rt[ot - 1])), K[ot] = Q(K[ot], et, nt), rt[ot] !== "A" && lt === "C" && (rt[ot] = "C"), Y(K, ot);
        var it = K[ot], ut = it.length;
        et.x = it[ut - 2], et.y = it[ut - 1], et.bx = parseFloat(it[ut - 4]) || et.x, et.by = parseFloat(it[ut - 3]) || et.y;
      }
      return (!K[0][0] || K[0][0] !== "M") && K.unshift([
        "M",
        0,
        0
      ]), K;
    }
    return function(q) {
      return at(q).join(",").split(",").join(" ");
    };
  })(), l.namespace = e, l.g = ma, l;
})();
var B = Jl;
const In = "[object Arguments]", pi = "[object Array]", Or = "[object Boolean]", Xi = "[object Date]", ya = "[object Error]", Kl = "[object Function]", Gn = "[object Map]", Rr = "[object Number]", Zl = "[object Null]", nn = "[object Object]", Ji = "[object RegExp]", zn = "[object Set]", Dr = "[object String]", Fr = "[object Symbol]", Ql = "[object Undefined]", tu = "[object WeakMap]", Ki = "[object ArrayBuffer]", Zi = "[object DataView]", ba = "[object Float32Array]", wa = "[object Float64Array]", xa = "[object Int8Array]", Sa = "[object Int16Array]", Aa = "[object Int32Array]", Pa = "[object Uint8Array]", Ea = "[object Uint8ClampedArray]", Ta = "[object Uint16Array]", Ca = "[object Uint32Array]", eu = {
  [In]: !0,
  [pi]: !0,
  [Ki]: !0,
  [Zi]: !0,
  [Or]: !0,
  [Xi]: !0,
  [ba]: !0,
  [wa]: !0,
  [xa]: !0,
  [Sa]: !0,
  [Aa]: !0,
  [Gn]: !0,
  [Rr]: !0,
  [nn]: !0,
  [Ji]: !0,
  [zn]: !0,
  [Dr]: !0,
  [Fr]: !0,
  [Pa]: !0,
  [Ea]: !0,
  [Ta]: !0,
  [Ca]: !0,
  [ya]: !1,
  [Kl]: !1,
  [tu]: !1
}, Qi = "\\ud800-\\udfff", nu = "\\u0300-\\u036f", ru = "\\ufe20-\\ufe2f", iu = "\\u20d0-\\u20ff", su = "\\u1ab0-\\u1aff", ou = "\\u1dc0-\\u1dff", au = nu + ru + iu + su + ou, ka = "\\u2700-\\u27bf", La = "a-z\\xdf-\\xf6\\xf8-\\xff", cu = "\\xac\\xb1\\xd7\\xf7", lu = "\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf", uu = "\\u2000-\\u206f", hu = " \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000", _a = "A-Z\\xc0-\\xd6\\xd8-\\xde", fu = "\\ufe0e\\ufe0f", Na = cu + lu + uu + hu, Ma = "['’]", zs = `[${Na}]`, ts = `[${au}]`, Ia = "\\d", du = `[${ka}]`, Oa = `[${La}]`, Ra = `[^${Qi}${Na + Ia + ka + La + _a}]`, vi = "\\ud83c[\\udffb-\\udfff]", gu = `(?:${ts}|${vi})`, Da = `[^${Qi}]`, es = "(?:\\ud83c[\\udde6-\\uddff]){2}", ns = "[\\ud800-\\udbff][\\udc00-\\udfff]", Ze = `[${_a}]`, pu = "\\u200d", Us = `(?:${Oa}|${Ra})`, vu = `(?:${Ze}|${Ra})`, js = `(?:${Ma}(?:d|ll|m|re|s|t|ve))?`, Ws = `(?:${Ma}(?:D|LL|M|RE|S|T|VE))?`, Fa = `${gu}?`, Ba = `[${fu}]?`, mu = `(?:${pu}(?:${[
  Da,
  es,
  ns
].join("|")})${Ba + Fa})*`, yu = "\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])", bu = "\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])", Va = Ba + Fa + mu, wu = `(?:${[
  du,
  es,
  ns
].join("|")})${Va}`, xu = RegExp([
  `${Ze}?${Oa}+${js}(?=${[
    zs,
    Ze,
    "$"
  ].join("|")})`,
  `${vu}+${Ws}(?=${[
    zs,
    Ze + Us,
    "$"
  ].join("|")})`,
  `${Ze}?${Us}+${js}`,
  `${Ze}+${Ws}`,
  bu,
  yu,
  `${Ia}+`,
  wu
].join("|"), "g"), rs = 200, mi = "__hash_undefined__", Su = /^\[object (?:Float(?:32|64)|(?:Int|Uint)(?:8|16|32)|Uint8Clamped)Array\]$/, Au = `[${Qi}]`, Pu = `${Da}${ts}?`, Eu = `(?:${[
  Pu,
  ts,
  es,
  ns,
  Au
].join("|")})`, Ga = RegExp(`${vi}(?=${vi})|${Eu + Va}`, "g"), Tu = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, Cu = /^\w*$/, ku = 46, Lu = /\\(\\)?/g, _u = RegExp(`[^.[\\]]+|\\[(?:([^"'][^[]*)|(["'])((?:(?!\\2)[^\\\\]|\\\\.)*?)\\2)\\]|(?=(?:\\.|\\[\\])(?:\\.|\\[\\]|$))`, "g"), Nu = /^(?:0|[1-9]\d*)$/, Mu = RegExp.prototype.test.bind(/[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/), Iu = 4294967294, Ou = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g, za = (t) => Ga.test(t), Ru = (t) => t.match(Ga) || [], Du = (t) => t.split(""), Ua = (t) => za(t) ? Ru(t) : Du(t), Fu = (t) => t == null ? [] : Un(t).map((e) => t[e]), Un = (t) => ee(t) ? ja(t) : Object.keys(Object(t)), Bu = (t) => {
  if (!Br(t)) return Object.keys(t);
  var e = [];
  for (var n in Object(t)) hasOwnProperty.call(t, n) && n != "constructor" && e.push(n);
  return e;
}, ja = (t, e) => {
  const n = Array.isArray(t), r = !n && se(t) && te(t) === In, i = !n && !r && Wn(t), s = n || r || i, o = t.length, a = new Array(s ? o : 0);
  let c = s ? -1 : o;
  for (; ++c < o; ) a[c] = `${c}`;
  for (const u in t) (e || hasOwnProperty.call(t, u)) && !(s && (u === "length" || cs(u, o))) && a.push(u);
  return a;
}, er = (t, e) => {
  let { length: n } = t;
  for (; n--; ) if (pn(t[n][0], e)) return n;
  return -1;
}, pn = (t, e) => t === e || t !== t && e !== e, se = (t) => t != null && typeof t == "object", Sr = (t, e, n) => {
  if (!gt(n)) return !1;
  const r = typeof e;
  return (r == "number" ? ee(n) && e > -1 && e < n.length : r == "string" && e in n) ? pn(n[e], t) : !1;
}, Vu = (t) => se(t) && te(t) == zn, Gu = (t) => se(t) && te(t) == Gn, Br = (t) => {
  const e = t && t.constructor, n = typeof e == "function" && e.prototype || Object.prototype;
  return t === n;
}, vn = (t, e, n) => {
  const r = t[e];
  (!(hasOwnProperty.call(t, e) && pn(r, n)) || n === void 0 && !(e in t)) && (t[e] = n);
}, jn = (t, e, n) => {
  let r = -1;
  const i = e.length;
  for (; ++r < i; ) {
    const s = e[r];
    vn(n, s, t[s]);
  }
  return n;
}, ee = (t) => t != null && typeof t != "function" && typeof t.length == "number" && t.length > -1 && t.length % 1 === 0, ln = (t) => typeof t == "symbol" || se(t) && te(t) === Fr, zu = (t) => {
  const e = t.length;
  let n = new t.constructor(e);
  return e && typeof t[0] == "string" && hasOwnProperty.call(t, "index") && (n.index = t.index, n.input = t.input), n;
}, is = (t, e) => {
  let n = -1;
  const r = t.length;
  for (e || (e = new Array(r)); ++n < r; ) e[n] = t[n];
  return e;
}, te = (t) => t == null ? t === void 0 ? Ql : Zl : Object.prototype.toString.call(t), ss = (t) => {
  const e = new t.constructor(t.byteLength);
  return new Uint8Array(e).set(new Uint8Array(t)), e;
}, Wa = (t, e) => {
  const n = e ? ss(t.buffer) : t.buffer;
  return new t.constructor(n, t.byteOffset, t.length);
}, Uu = (t) => {
  const e = new t.constructor(t.source, /\w*$/.exec(t));
  return e.lastIndex = t.lastIndex, e;
}, Ha = (t) => typeof t.constructor == "function" && !Br(t) ? Object.create(Object.getPrototypeOf(t)) : {}, os = (t) => t == null ? [] : (t = Object(t), Object.getOwnPropertySymbols(t).filter((n) => propertyIsEnumerable.call(t, n))), ju = (t, e) => jn(t, os(t), e);
function Wu(t, e) {
  const n = e ? ss(t.buffer) : t.buffer;
  return new t.constructor(n, t.byteOffset, t.byteLength);
}
const Hu = (t, e, n) => {
  const r = t.constructor;
  switch (e) {
    case Ki:
      return ss(t);
    case Or:
    case Xi:
      return new r(+t);
    case Zi:
      return Wu(t, n);
    case ba:
    case wa:
    case xa:
    case Sa:
    case Aa:
    case Pa:
    case Ea:
    case Ta:
    case Ca:
      return Wa(t, n);
    case Gn:
      return new r(t);
    case Rr:
    case Dr:
      return new r(t);
    case Ji:
      return Uu(t);
    case zn:
      return new r();
    case Fr:
      return Symbol.prototype.valueOf ? Object(Symbol.prototype.valueOf.call(t)) : {};
  }
}, Wn = (t) => se(t) && Su.test(te(t)), yi = (t) => {
  const e = Object.keys(t);
  return !Array.isArray(t) && t != null && e.push(...os(Object(t))), e;
}, $a = (t) => {
  const e = [];
  for (; t; )
    e.push(...os(t)), t = Object.getPrototypeOf(Object(t));
  return e;
}, qa = (t) => {
  const e = [];
  for (const n in t) e.push(n);
  return Array.isArray(t) || e.push(...$a(t)), e;
}, nr = ({ __data__: t }, e) => {
  const n = t;
  return rh(e) ? n[typeof e == "string" ? "string" : "hash"] : n.map;
}, $u = (t, e, n, r) => {
  const i = yi(t), s = i.length, a = yi(e).length;
  if (s != a) return !1;
  let c, u = s;
  for (; u--; )
    if (c = i[u], !hasOwnProperty.call(e, c)) return !1;
  const h = r.get(t), l = r.get(e);
  if (h && l) return h == e && l == t;
  let d = !0;
  r.set(t, e), r.set(e, t);
  let g;
  for (; ++u < s; ) {
    c = i[u];
    const v = t[c], y = e[c];
    if (!(v === y || n(v, y, r))) {
      d = !1;
      break;
    }
    g || (g = c == "constructor");
  }
  if (d && !g) {
    const v = t.constructor, y = e.constructor;
    v != y && "constructor" in t && "constructor" in e && !(typeof v == "function" && v instanceof v && typeof y == "function" && y instanceof y) && (d = !1);
  }
  return r.delete(t), r.delete(e), d;
}, Vr = (t, e, n) => t === e ? !0 : t == null || e == null || !se(t) && !se(e) ? t !== t && e !== e : qu(t, e, Vr, n), qu = (t, e, n, r) => {
  let i = Array.isArray(t);
  const s = Array.isArray(e);
  let o = i ? pi : te(t), a = s ? pi : te(e);
  o = o == In ? nn : o, a = a == In ? nn : a;
  let c = o == nn;
  const u = a == nn, h = o == a;
  if (h && !c)
    return r || (r = new on()), i || Wn(t) ? Ya(t, e, !1, n, r) : Ju(t, e, o, n, r);
  const l = c && hasOwnProperty.call(t, "__wrapped__"), d = u && hasOwnProperty.call(e, "__wrapped__");
  if (l || d) {
    const g = l ? t.value() : t, v = d ? e.value() : e;
    return r || (r = new on()), n(g, v, r);
  }
  return h ? (r || (r = new on()), $u(t, e, n, r)) : !1;
}, Ya = (t, e, n, r, i) => {
  const s = t.length, o = e.length;
  if (s != o) return !1;
  const a = i.get(t), c = i.get(e);
  if (a && c) return a == e && c == t;
  let u = -1, h = !0;
  const l = n ? new Rn() : void 0;
  for (i.set(t, e), i.set(e, t); ++u < s; ) {
    const d = t[u], g = e[u];
    if (l) {
      if (!Yu(e, (v, y) => {
        if (!Xu(l, y) && (d === v || r(d, v, i))) return l.push(y);
      })) {
        h = !1;
        break;
      }
    } else if (!(d === g || r(d, g, i))) {
      h = !1;
      break;
    }
  }
  return i.delete(t), i.delete(e), h;
}, Yu = (t, e) => {
  let n = -1;
  const r = t == null ? 0 : t.length;
  for (; ++n < r; ) if (e(t[n], n, t)) return !0;
  return !1;
}, Xu = (t, e) => t.has(e), Hs = (t, e, n, r) => !(t.byteLength != e.byteLength || !n(new Uint8Array(t), new Uint8Array(e), r)), Ju = (t, e, n, r, i) => {
  switch (n) {
    case Zi:
      return t.byteLength != e.byteLength || t.byteOffset != e.byteOffset ? !1 : (t = t.buffer, e = e.buffer, Hs(t, e, r, i));
    case Ki:
      return Hs(t, e, r, i);
    case Or:
    case Xi:
    case Rr:
      return pn(+t, +e);
    case ya:
      return t.name == e.name && t.message == e.message;
    case Ji:
    case Dr:
      return t == `${e}`;
    case Gn:
      var s = Xa;
    case zn:
      if (s || (s = Gr), t.size != e.size) return !1;
      const o = i.get(t);
      if (o) return o == e;
      i.set(t, e);
      const a = Ya(s(t), s(e), !0, r, i);
      return i.delete(t), a;
    case Fr:
      return Symbol.prototype.valueOf.call(t) == Symbol.prototype.valueOf.call(e);
  }
  return !1;
}, Xa = (t) => {
  let e = -1, n = Array(t.size);
  return t.forEach((r, i) => {
    n[++e] = [i, r];
  }), n;
}, Gr = (t) => {
  let e = -1;
  const n = new Array(t.size);
  return t.forEach((r) => {
    n[++e] = r;
  }), n;
}, as = (t, e) => {
  if (Array.isArray(t)) return !1;
  const n = typeof t;
  return n === "number" || n === "boolean" || t == null || ln(t) ? !0 : Cu.test(t) || !Tu.test(t) || e != null && t in Object(e);
}, Ku = (t) => {
  const e = [];
  return t.charCodeAt(0) === ku && e.push(""), t.replace(_u, (n, r, i, s) => {
    let o = n;
    i ? o = s.replace(Lu, "$1") : r && (o = r.trim()), e.push(o);
  }), e;
}, Te = (t, e) => Array.isArray(t) ? t : as(t, e) ? [t] : Ku(`${t}`), Hn = (t, e) => {
  e = Te(e, t);
  let n = 0;
  const r = e.length;
  for (; t != null && n < r; )
    t = t[Ce(e[n])], n++;
  return n && n == r ? t : void 0;
};
function Zu(t, e) {
  if (t !== e) {
    const n = t !== void 0, r = t === null, i = t === t, s = ln(t), o = e !== void 0, a = e === null, c = e === e, u = ln(e);
    if (!a && !u && !s && t > e || s && o && c && !a && !u || r && o && c || !n && c || !i) return 1;
    if (!r && !s && !u && t < e || u && n && i && !r && !s || a && n && i || !o && i || !c) return -1;
  }
  return 0;
}
function Qu(t, e, n) {
  let r = -1;
  const i = t.criteria, s = e.criteria, o = i.length, a = n.length;
  for (; ++r < o; ) {
    const c = r < a ? n[r] : null, h = (c && typeof c == "function" ? c : Zu)(i[r], s[r]);
    if (h)
      return c && typeof c != "function" ? h * (c == "desc" ? -1 : 1) : h;
  }
  return t.index - e.index;
}
const Ja = (t, e) => {
  let n = (o, a) => !!(o == null ? 0 : o.length) && o.indexOf(a) > -1, r = !0;
  const i = [], s = e.length;
  if (!t.length) return i;
  e.length >= rs && (n = (o, a) => o.has(a), r = !1, e = new Rn(e));
  t: for (let o in t) {
    let a = t[o];
    const c = a;
    if (a = a !== 0 ? a : 0, r && c === c) {
      let u = s;
      for (; u--; ) if (e[u] === c) continue t;
      i.push(a);
    } else n(e, c) || i.push(a);
  }
  return i;
}, Ce = (t) => {
  if (typeof t == "string" || ln(t)) return t;
  const e = `${t}`;
  return e == "0" && 1 / t == -1 / 0 ? "-0" : e;
}, De = (t, e = !1, n = !1, r = !0, i, s, o, a) => {
  let c;
  if (i && (c = o ? i(t, s, o, a) : i(t)), c !== void 0) return c;
  if (!gt(t)) return t;
  const u = Array.isArray(t), h = te(t);
  if (u) {
    if (c = zu(t), !e) return is(t, c);
  } else {
    const v = typeof t == "function";
    if (h === nn || h === In || v && !o) {
      if (c = n || v ? {} : Ha(t), !e) return n ? th(t, jn(t, Object.keys(t), c)) : ju(t, Object.assign(c, t));
    } else {
      if (v || !eu[h]) return o ? t : {};
      c = Hu(t, h, e);
    }
  }
  a || (a = new on());
  const l = a.get(t);
  if (l) return l;
  if (a.set(t, c), Gu(t))
    return t.forEach((v, y) => {
      c.set(y, De(v, e, n, r, i, y, t, a));
    }), c;
  if (Vu(t))
    return t.forEach((v) => {
      c.add(De(v, e, n, r, i, v, t, a));
    }), c;
  if (Wn(t)) return c;
  const g = u ? void 0 : (r ? n ? qa : yi : n ? Za : Un)(t);
  return (g || t).forEach((v, y) => {
    g && (y = v, v = t[y]), vn(c, y, De(v, e, n, r, i, y, t, a));
  }), c;
}, th = (t, e) => jn(t, $a(t), e), Ka = (t, e) => e.length < 2 ? t : Hn(t, e.slice(0, -1)), eh = (t, e, n) => {
  if (!gt(t)) return t;
  e = Te(e, t);
  const r = e.length, i = r - 1;
  let s = -1, o = t;
  for (; o != null && ++s < r; ) {
    const a = Ce(e[s]);
    let c = n;
    if (s != i) {
      const u = o[a];
      c = void 0, c === void 0 && (c = gt(u) ? u : cs(e[s + 1]) ? [] : {});
    }
    vn(o, a, c), o = o[a];
  }
  return t;
}, cs = (t, e) => {
  const n = typeof t;
  return e = e ?? Number.MAX_SAFE_INTEGER, !!e && (n === "number" || n !== "symbol" && Nu.test(t)) && t > -1 && t % 1 == 0 && t < e;
}, nh = (t, e) => {
  e = Te(e, t), t = Ka(t, e);
  const n = e[e.length - 1];
  return t == null || delete t[Ce(n)];
}, rh = (t) => {
  const e = typeof t;
  return e === "string" || e === "number" || e === "symbol" || e === "boolean" ? t !== "__proto__" : t === null;
}, Za = (t) => {
  const e = [];
  for (const n in t) e.push(n);
  return e;
}, ih = (t) => {
  t = Object(t);
  const e = {};
  for (const n in t) e[n] = t[n];
  return e;
}, $s = (t, e) => {
  if (!(e === "constructor" && typeof t[e] == "function") && e != "__proto__")
    return t[e];
};
function Qa(t, e = !1) {
  return (n, ...r) => {
    let i = -1, s = r.length, o = s > 1 ? r[s - 1] : void 0;
    const a = s > 2 ? r[2] : void 0;
    for (o = t.length > 3 && typeof o == "function" ? (s--, o) : e ? (c, u) => {
      if (Array.isArray(c) && !Array.isArray(u)) return u;
    } : void 0, a && Sr(r[0], r[1], a) && (o = s < 3 ? void 0 : o, s = 1), n = Object(n); ++i < s; ) {
      const c = r[i];
      c && t(n, c, i, o);
    }
    return n;
  };
}
const ls = (t, e, n, r, i) => {
  t !== e && ce(e, (s, o) => {
    if (gt(s))
      i || (i = new on()), sh(t, e, o, n, ls, r, i);
    else {
      let a = r ? r(t[o], s, `${o}`, t, e, i) : void 0;
      a === void 0 && (a = s), bi(t, o, a);
    }
  });
}, sh = (t, e, n, r, i, s, o) => {
  const a = $s(t, n), c = $s(e, n), u = o.get(c);
  if (u) {
    bi(t, n, u);
    return;
  }
  let h = s ? s(a, c, `${n}`, t, e, o) : void 0, l = h === void 0;
  if (l) {
    const d = Array.isArray(c), g = !d && Wn(c);
    h = c, d || g ? Array.isArray(a) ? h = a : se(a) && ee(a) ? h = is(a) : g ? (l = !1, h = Wa(c, !0)) : h = [] : Tt(c) || On(c) ? (h = a, On(a) ? h = ih(a) : (typeof a == "function" || !gt(a)) && (h = Ha(c))) : l = !1;
  }
  l && (o.set(c, h), i(h, c, r, s, o), o.delete(c)), bi(t, n, h);
}, bi = (t, e, n) => {
  (n !== void 0 && !pn(t[e], n) || n === void 0 && !(e in t)) && vn(t, e, n);
};
function oh(t, e, n) {
  const r = Object(t), i = n(t);
  let { length: s } = i, o = -1;
  for (; s--; ) {
    const a = i[++o];
    if (e(r[a], a, r) === !1) break;
  }
  return t;
}
const ah = (t, e) => t && oh(t, e, Un), us = (t, e) => {
  if (t == null) return t;
  if (!ee(t)) return ah(t, e);
  const n = t.length, r = Object(t);
  let i = -1;
  for (; ++i < n && e(r[i], i, r) !== !1; ) ;
  return t;
};
function ch(t) {
  const e = t == null ? 0 : t.length;
  return e ? t[e - 1] : void 0;
}
const lh = Set && 1 / Gr(/* @__PURE__ */ new Set([void 0, -0]))[1] == 1 / 0 ? (t) => new Set(t) : () => {
};
function tc(t, e, n, r, i, s) {
  return gt(t) && gt(e) && (s.set(e, t), ls(t, e, void 0, tc, s), s.delete(e)), t;
}
function uh(t, e, n) {
  e.length ? e = e.map((o) => Array.isArray(o) ? (a) => Hn(a, o.length === 1 ? o[0] : o) : o) : e = [(o) => o];
  let r = -1, i = -1;
  const s = ee(t) ? new Array(t.length) : [];
  return us(t, (o) => {
    const a = e.map((c) => c(o));
    s[++i] = {
      criteria: a,
      index: ++r,
      value: o
    };
  }), hh(s, (o, a) => Qu(o, a, n));
}
function hh(t, e) {
  let { length: n } = t;
  for (t.sort(e); n--; ) t[n] = t[n].value;
  return t;
}
function ec(t) {
  return t === t && !gt(t);
}
function nc(t, e) {
  return (n) => n == null ? !1 : n[t] === e && (e !== void 0 || t in Object(n));
}
function rc(t, e) {
  return t != null && Ch(t, e, Th);
}
function fh(t, e) {
  return as(t) && ec(e) ? nc(Ce(t), e) : (n) => {
    const r = Hn(n, t);
    return r === void 0 && r === e ? rc(n, t) : Vr(e, r);
  };
}
function ic(t) {
  const e = dh(t);
  return e.length === 1 && e[0][2] ? nc(e[0][0], e[0][1]) : (n) => n === t || gh(n, t, e);
}
function dh(t) {
  const e = Un(t);
  let n = e.length;
  for (; n--; ) {
    const r = e[n], i = t[r];
    e[n] = [
      r,
      i,
      ec(i)
    ];
  }
  return e;
}
function gh(t, e, n, r) {
  let i = n.length;
  const s = i;
  if (t == null) return !s;
  let o;
  for (t = Object(t); i--; )
    if (o = n[i], o[2] ? o[1] !== t[o[0]] : !(o[0] in t)) return !1;
  for (; ++i < s; ) {
    o = n[i];
    const a = o[0], c = t[a], u = o[1];
    if (o[2]) {
      if (c === void 0 && !(a in t)) return !1;
    } else {
      const h = new on();
      if (!Vr(u, c, h)) return !1;
    }
  }
  return !0;
}
function ph(t) {
  return as(t) ? vh(Ce(t)) : mh(t);
}
function vh(t) {
  return (e) => e?.[t];
}
function mh(t) {
  return (e) => Hn(e, t);
}
function yh(t) {
  return typeof t == "function" ? t : t == null ? (e) => e : typeof t == "object" ? Array.isArray(t) ? fh(t[0], t[1]) : ic(t) : ph(t);
}
function zr() {
  const t = yh;
  return arguments.length ? t(arguments[0]) : t;
}
const bh = (t, e, n, r) => {
  let i = -1;
  const s = t == null ? 0 : t.length;
  for (r && s && (n = t[++i]); ++i < s; ) n = e(n, t[i], i, t);
  return n;
}, wh = (t, e, n, r, i) => (i(t, (s, o, a) => {
  n = r ? (r = !1, s) : e(n, s, o, a);
}), n);
function xh(t, e, n) {
  const r = Array.isArray(t) ? bh : wh, i = arguments.length < 3;
  return r(t, e, n, i, us);
}
const Sh = (t) => Array.isArray(t) || On(t) || !!(t && t[Symbol.isConcatSpreadable]);
function sc(t, e, n, r, i) {
  let s = -1;
  const o = t.length;
  for (n || (n = Sh), i || (i = []); ++s < o; ) {
    var a = t[s];
    e > 0 && n(a) ? e > 1 ? sc(a, e - 1, n, r, i) : i.push(...a) : i[i.length] = a;
  }
  return i;
}
const On = (t) => se(t) && te(t) == "[object Arguments]", Ah = (t, e) => Ph(t, e, (n, r) => rc(t, r)), Ph = (t, e, n) => {
  let r = -1;
  const i = e.length, s = {};
  for (; ++r < i; ) {
    const o = e[r], a = Hn(t, o);
    n(a, o) && eh(s, Te(o, t), a);
  }
  return s;
}, Eh = (t) => typeof t == "number" && t > -1 && t % 1 == 0 && t <= Number.MAX_SAFE_INTEGER, Th = (t, e) => t != null && e in Object(t), Ch = (t, e, n) => {
  e = Te(e, t);
  for (var r = -1, i = e.length, s = !1; ++r < i; ) {
    var o = Ce(e[r]);
    if (!(s = t != null && n(t, o))) break;
    t = t[o];
  }
  return s || ++r != i ? s : (i = t == null ? 0 : t.length, !!i && Eh(i) && cs(o, i) && (Array.isArray(t) || On(t)));
}, kh = (t) => t.match(Ou), Lh = (t) => t.match(xu), _h = (t, e) => (Mu(t) ? Lh(t) : kh(t)) || [], Nh = (t, e, n) => {
  const { length: r } = t;
  return n = n === void 0 ? r : n, !e && n >= r ? t : t.slice(e, n);
}, Mh = Ih("toUpperCase");
function Ih(t) {
  return (e) => {
    if (!e) return "";
    const n = za(e) ? Ua(e) : void 0, r = n ? n[0] : e[0], i = n ? Nh(n, 1).join("") : e.slice(1);
    return r[t]() + i;
  };
}
function Oh(t) {
  return ic(De(t, !0));
}
var on = class {
  constructor(t) {
    const e = this.__data__ = new Qr(t);
    this.size = e.size;
  }
  clear() {
    this.__data__ = new Qr(), this.size = 0;
  }
  delete(t) {
    const e = this.__data__, n = e.delete(t);
    return this.size = e.size, n;
  }
  get(t) {
    return this.__data__.get(t);
  }
  has(t) {
    return this.__data__.has(t);
  }
  set(t, e) {
    let n = this.__data__;
    if (n instanceof Qr) {
      const r = n.__data__;
      if (r.length < rs - 1)
        return r.push([t, e]), this.size = ++n.size, this;
      n = this.__data__ = new oc(r);
    }
    return n.set(t, e), this.size = n.size, this;
  }
}, Qr = class {
  constructor(t) {
    let e = -1;
    const n = t == null ? 0 : t.length;
    for (this.clear(); ++e < n; ) {
      const r = t[e];
      this.set(r[0], r[1]);
    }
  }
  clear() {
    this.__data__ = [], this.size = 0;
  }
  delete(t) {
    const e = this.__data__, n = er(e, t);
    if (n < 0) return !1;
    const r = e.length - 1;
    return n == r ? e.pop() : e.splice(n, 1), --this.size, !0;
  }
  get(t) {
    const e = this.__data__, n = er(e, t);
    return n < 0 ? void 0 : e[n][1];
  }
  has(t) {
    return er(this.__data__, t) > -1;
  }
  set(t, e) {
    const n = this.__data__, r = er(n, t);
    return r < 0 ? (++this.size, n.push([t, e])) : n[r][1] = e, this;
  }
}, oc = class {
  constructor(t) {
    let e = -1;
    const n = t == null ? 0 : t.length;
    for (this.clear(); ++e < n; ) {
      const r = t[e];
      this.set(r[0], r[1]);
    }
  }
  clear() {
    this.size = 0, this.__data__ = {
      hash: new qs(),
      map: /* @__PURE__ */ new Map(),
      string: new qs()
    };
  }
  delete(t) {
    const e = nr(this, t).delete(t);
    return this.size -= e ? 1 : 0, e;
  }
  get(t) {
    return nr(this, t).get(t);
  }
  has(t) {
    return nr(this, t).has(t);
  }
  set(t, e) {
    const n = nr(this, t), r = n.size;
    return n.set(t, e), this.size += n.size == r ? 0 : 1, this;
  }
}, qs = class {
  constructor(t) {
    let e = -1;
    const n = t == null ? 0 : t.length;
    for (this.clear(); ++e < n; ) {
      const r = t[e];
      this.set(r[0], r[1]);
    }
  }
  clear() {
    this.__data__ = /* @__PURE__ */ Object.create(null), this.size = 0;
  }
  delete(t) {
    const e = this.has(t) && delete this.__data__[t];
    return this.size -= e ? 1 : 0, e;
  }
  get(t) {
    const n = this.__data__[t];
    return n === mi ? void 0 : n;
  }
  has(t) {
    return this.__data__[t] !== void 0;
  }
  set(t, e) {
    const n = this.__data__;
    return this.size += this.has(t) ? 0 : 1, n[t] = e === void 0 ? mi : e, this;
  }
}, Rn = class {
  constructor(t) {
    let e = -1;
    const n = t == null ? 0 : t.length;
    for (this.__data__ = new oc(); ++e < n; ) this.add(t[e]);
  }
  add(t) {
    return this.__data__.set(t, mi), this;
  }
  has(t) {
    return this.__data__.has(t);
  }
};
Rn.prototype.push = Rn.prototype.add;
const Rh = function(t) {
  var e = Object.prototype.toString;
  return t === !0 || t === !1 || !!t && typeof t == "object" && e.call(t) === Or;
}, gt = function(t) {
  return !!t && (typeof t == "object" || typeof t == "function");
}, Ft = function(t) {
  var e = Object.prototype.toString;
  return typeof t == "number" || !!t && typeof t == "object" && e.call(t) === Rr;
}, Ct = function(t) {
  var e = Object.prototype.toString;
  return typeof t == "string" || !!t && typeof t == "object" && e.call(t) === Dr;
}, $ = Qa((t, e) => {
  if (Br(e) || ee(e)) {
    jn(e, Un(e), t);
    return;
  }
  for (var n in e) hasOwnProperty.call(e, n) && vn(t, n, e[n]);
}), Dh = (t, ...e) => {
  let n = -1, r = e.length;
  const i = r > 2 ? e[2] : void 0;
  for (i && Sr(e[0], e[1], i) && (r = 1); ++n < r; ) {
    const s = e[n];
    if (s == null) continue;
    const o = Object.keys(s), a = o.length;
    let c = -1;
    for (; ++c < a; ) {
      const u = o[c], h = t[u];
      (h === void 0 || pn(h, Object.prototype[u]) && !hasOwnProperty.call(t, u)) && (t[u] = s[u]);
    }
  }
  return t;
}, qt = Dh, Fh = function(...e) {
  return e.push(void 0, tc), kt.apply(void 0, e);
}, Ur = Fh, le = (t, e, ...n) => {
  let r = -1;
  const i = typeof e == "function", s = ee(t) ? new Array(t.length) : [];
  return us(t, (o) => {
    s[++r] = i ? e.apply(o, n) : Bh(o, e, ...n);
  }), s;
}, Bh = (t, e, ...n) => {
  e = Te(e, t), t = Ka(t, e);
  const r = t == null ? t : t[Ce(ch(e))];
  return r?.apply(t, n);
}, ac = (t, e, n) => {
  let r = 0, i = t == null ? 0 : t.length;
  if (i == 0) return 0;
  n = zr(n, 2), e = n(e);
  const s = e !== e, o = e === null, a = ln(e), c = e === void 0;
  for (; r < i; ) {
    let u;
    const h = Math.floor((r + i) / 2), l = n(t[h]), d = l !== void 0, g = l === null, v = l === l, y = ln(l);
    s ? u = v : c ? u = v && d : o ? u = v && d && !g : a ? u = v && d && !g && !y : g || y ? u = !1 : u = l < e, u ? r = h + 1 : i = h;
  }
  return Math.min(i, Iu);
}, Ve = (t, e) => {
  let n = -1, r = (c, u) => !!(c == null ? 0 : c.length) && c.indexOf(u) > -1;
  e = zr(e, 2);
  let i = !0;
  const { length: s } = t, o = [];
  let a = o;
  if (s >= rs) {
    const c = e ? null : lh(t);
    if (c) return Gr(c);
    i = !1, r = (u, h) => u.has(h), a = new Rn();
  } else a = e ? [] : o;
  t: for (; ++n < s; ) {
    let c = t[n];
    const u = e ? e(c) : c;
    if (c = c !== 0 ? c : 0, i && u === u) {
      let h = a.length;
      for (; h--; ) if (a[h] === u) continue t;
      e && a.push(u), o.push(c);
    } else r(a, u) || (a !== o && a.push(u), o.push(c));
  }
  return o;
}, Ot = (t) => De(t), $t = (t) => De(t, !0), Yt = (t) => {
  if (t == null) return !0;
  if (ee(t) && (Array.isArray(t) || typeof t == "string" || typeof t.splice == "function" || Wn(t) || On(t))) return !t.length;
  const e = te(t);
  if (e == "[object Map]" || e == "[object Set]") return !t.size;
  if (Br(t)) return !Bu(t).length;
  for (const n in t) if (hasOwnProperty.call(t, n)) return !1;
  return !0;
}, Pe = (t, e) => Vr(t, e), bt = (t) => typeof t == "function", Tt = (t) => {
  if (!se(t) || te(t) != "[object Object]") return !1;
  if (Object.getPrototypeOf(t) === null) return !0;
  let e = t;
  for (; Object.getPrototypeOf(e) !== null; ) e = Object.getPrototypeOf(e);
  return Object.getPrototypeOf(t) === e;
}, pt = (t) => {
  if (!t) return [];
  if (ee(t)) return Ct(t) ? Ua(t) : is(t);
  if (Symbol.iterator && Symbol.iterator in Object(t)) {
    const r = t[Symbol.iterator]();
    let i;
    const s = [];
    for (; !(i = r.next()).done; ) s.push(i.value);
    return s;
  }
  const e = te(t);
  return (e == Gn ? Xa : e == zn ? Gr : Fu)(t);
};
function Vh(t, e, n) {
  if (typeof t != "function") throw new TypeError("Expected a function");
  let r, i, s, o, a, c, u = 0, h = !1, l = !1, d = !0;
  const g = !e && e !== 0 && window && typeof window.requestAnimationFrame == "function";
  e = +e || 0, gt(n) && (h = !!n.leading, l = "maxWait" in n, s = l ? Math.max(20, e) : s, d = "trailing" in n ? !!n.trailing : d);
  function v(f) {
    const p = r, m = i;
    return r = i = void 0, u = f, o = t.apply(m, p), o;
  }
  function y(f, p) {
    return g ? (window.cancelAnimationFrame(a), window.requestAnimationFrame(f)) : setTimeout(f, p);
  }
  function w(f) {
    if (g) return window.cancelAnimationFrame(f);
    clearTimeout(f);
  }
  function x(f) {
    return u = f, a = y(L, e), h ? v(f) : o;
  }
  function P(f) {
    const p = f - c, m = f - u, b = e - p;
    return l ? Math.min(b, s - m) : b;
  }
  function T(f) {
    const p = f - c, m = f - u;
    return c === void 0 || p >= e || p < 0 || l && m >= s;
  }
  function L() {
    const f = Date.now();
    if (T(f)) return I(f);
    a = y(L, P(f));
  }
  function I(f) {
    return a = void 0, d && r ? v(f) : (r = i = void 0, o);
  }
  function R(...f) {
    const p = Date.now(), m = T(p);
    if (r = f, i = this, c = p, m) {
      if (a === void 0) return x(c);
      if (l)
        return a = y(L, e), v(c);
    }
    return a === void 0 && (a = y(L, e)), o;
  }
  return R.cancel = () => {
    a !== void 0 && w(a), u = 0, r = c = i = a = void 0;
  }, R.flush = () => a === void 0 ? o : I(Date.now()), R.pending = () => a !== void 0, R;
}
const Gh = (t, e) => (e = zr(e, 2), xh(t, (n, r) => {
  const i = e(r);
  return hasOwnProperty.call(n, i) ? n[i].push(r) : vn(n, i, [r]), n;
}, {})), fr = (t, e = []) => {
  if (t == null) return [];
  const n = e.length;
  return n > 1 && Sr(t, e[0], e[1]) ? e = [] : n > 2 && Sr(e[0], e[1], e[2]) && (e = [e[0]]), Array.isArray(e) || (e = [zr(e, 2)]), uh(t, e.flat(1), []);
}, zh = (t) => (t == null ? 0 : t.length) ? sc(t, 1 / 0) : [], Ys = (t, ...e) => ee(t) ? Ja(t, e) : [], Uh = (t, ...e) => se(t) && ee(t) ? Ja(t, e.flat(1)) : [], wi = (...t) => {
  const e = t.flat(1);
  return Ve(e);
}, ue = (t, e) => {
  if (t == null) return !1;
  typeof e == "string" && (e = e.split("."));
  let n = -1, r = t;
  for (; ++n < e.length; ) {
    if (!r || !hasOwnProperty.call(r, e[n])) return !1;
    r = r[e[n]];
  }
  return !0;
}, wt = (t, e, n) => {
  e = Te(e, t);
  let r = -1, i = e.length;
  for (i || (i = 1, t = void 0); ++r < i; ) {
    let s = t?.[Ce(e[r])];
    s === void 0 && (r = i, s = n), t = typeof s == "function" ? s.call(t) : s;
  }
  return t;
}, $n = (t, ...e) => {
  let n = {};
  if (t == null) return n;
  let r = !1;
  e = e.flat(1).map((s) => (s = Te(s, t), r || (r = s.length > 1), s)), jn(t, qa(t), n), r && (n = De(n, !0, !0, !0, (s) => Tt(s) ? void 0 : s));
  let i = e.length;
  for (; i--; ) nh(n, e[i]);
  return n;
}, jh = (t, ...e) => t == null ? {} : Ah(t, e.flat(1 / 0)), ce = (t, e = (n) => n) => {
  let n = -1;
  const r = Object(t), i = ee(t) ? ja(t, !0) : Za(t);
  let s = i.length;
  for (; s--; ) {
    const o = i[++n];
    if (e(r[o], o, r) === !1) break;
  }
}, cc = (t = "") => _h(`${t}`.replace(/['\u2019]/g, "")).reduce((e, n, r) => (n = n.toLowerCase(), e + (r ? Mh(n) : n)), "");
let Wh = 0;
const Dn = (t = "") => {
  const e = ++Wh;
  return `${t}` + e;
}, kt = Qa((t, e, n, r) => {
  ls(t, e, n, r);
}, !0);
var Hh = class {
  constructor() {
    this.map = /* @__PURE__ */ new WeakMap();
  }
  has(t, e) {
    return e === void 0 ? this.map.has(t) : e in this.map.get(t);
  }
  create(t) {
    return this.has(t) || this.map.set(t, /* @__PURE__ */ Object.create(null)), this.get(t);
  }
  get(t, e) {
    if (!this.has(t)) return;
    const n = this.map.get(t);
    return e === void 0 ? n : n[e];
  }
  set(t, e, n) {
    if (e === void 0) return;
    const r = this.create(t);
    typeof e == "string" ? r[e] = n : Object.assign(r, e);
  }
  remove(t, e) {
    if (this.has(t))
      if (e === void 0) this.map.delete(t);
      else {
        const n = this.map.get(t);
        delete n[e];
      }
  }
}, lc = Hh;
const ie = new lc(), uc = new lc(), Ge = function(t, e) {
  if (!(this instanceof Ge)) return new Ge(t, e);
  t && t.type ? (this.originalEvent = t, this.type = t.type, this.isDefaultPrevented = t.defaultPrevented ? dr : gr, this.target = t.target, this.currentTarget = t.currentTarget, this.relatedTarget = t.relatedTarget) : this.type = t, e && Object.assign(this, e), this.timeStamp = t && t.timeStamp || Date.now(), this.envelope = !0;
};
Ge.prototype = {
  constructor: Ge,
  isDefaultPrevented: gr,
  isPropagationStopped: gr,
  isImmediatePropagationStopped: gr,
  preventDefault: function() {
    const t = this.originalEvent;
    this.isDefaultPrevented = dr, t && t.preventDefault();
  },
  stopPropagation: function() {
    const t = this.originalEvent;
    this.isPropagationStopped = dr, t && t.stopPropagation();
  },
  stopImmediatePropagation: function() {
    const t = this.originalEvent;
    this.isImmediatePropagationStopped = dr, t && t.stopImmediatePropagation(), this.stopPropagation();
  }
};
[
  "altKey",
  "bubbles",
  "cancelable",
  "changedTouches",
  "ctrlKey",
  "detail",
  "eventPhase",
  "metaKey",
  "pageX",
  "pageY",
  "shiftKey",
  "view",
  "char",
  "code",
  "charCode",
  "key",
  "keyCode",
  "button",
  "buttons",
  "clientX",
  "clientY",
  "offsetX",
  "offsetY",
  "pointerId",
  "pointerType",
  "screenX",
  "screenY",
  "targetTouches",
  "toElement",
  "touches",
  "which"
].forEach((t) => $h(t));
function $h(t) {
  Object.defineProperty(Ge.prototype, t, {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return this.originalEvent ? this.originalEvent[t] : void 0;
    },
    set: function(e) {
      Object.defineProperty(this, t, {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: e
      });
    }
  });
}
function dr() {
  return !0;
}
function gr() {
  return !1;
}
const un = typeof window < "u" ? window.document : null, qh = un && un.documentElement, hc = /^([^.]*)(?:\.(.+)|)/, fc = /[^\x20\t\r\n\f]+/g, J = function(t) {
  return new J.Dom(t);
};
J.fn = J.prototype = {
  constructor: J,
  length: 0
};
J.guid = 1;
J.data = uc;
J.merge = function(t, e) {
  let n = +e.length, r = t.length;
  for (let i = 0; i < n; i++) t[r++] = e[i];
  return t.length = r, t;
};
J.parseHTML = function(t) {
  const e = un.implementation.createHTMLDocument(), n = e.createElement("base");
  n.href = un.location.href, e.head.appendChild(n), e.body.innerHTML = t;
  const r = e.getElementsByTagName("script");
  for (let i = 0; i < r.length; i++) r[i].remove();
  return Array.from(e.body.childNodes);
};
typeof Symbol == "function" && (J.fn[Symbol.iterator] = Array.prototype[Symbol.iterator]);
J.fn.toArray = function() {
  return Array.from(this);
};
J.fn.pushStack = function(t) {
  const e = J.merge(this.constructor(), t);
  return e.prevObject = this, e;
};
J.fn.find = function(t) {
  const [e] = this, n = this.pushStack([]);
  if (!e) return n;
  const { nodeType: r } = e;
  return r !== 1 && r !== 9 && r !== 11 || (typeof t != "string" ? e !== t && e.contains(t) && J.merge(n, [t]) : J.merge(n, e.querySelectorAll(t))), n;
};
J.fn.add = function(t) {
  const e = J(t).toArray(), n = this.toArray(), r = this.pushStack([]);
  return J.merge(r, Ve(n.concat(e))), r;
};
J.fn.addBack = function() {
  return this.add(this.prevObject);
};
J.fn.filter = function(t) {
  const e = [];
  for (let n = 0; n < this.length; n++) {
    const r = this[n];
    r.matches(t) && e.push(r);
  }
  return this.pushStack(e);
};
const Yh = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/;
function Xh(t) {
  return t[0] === "<" && t[t.length - 1] === ">" && t.length >= 3;
}
const dc = function(t) {
  if (!t) return this;
  if (typeof t == "function") throw new Error("function not supported");
  if (arguments.length > 1) throw new Error("selector with context not supported");
  if (t.nodeType)
    return this[0] = t, this.length = 1, this;
  let e;
  if (Xh(t + "")) e = [
    null,
    t,
    null
  ];
  else if (typeof t == "string") e = Yh.exec(t);
  else return J.merge(this, t);
  if (!e || !e[1]) return Jh.find(t);
  if (e[1])
    return J.merge(this, J.parseHTML(e[1])), this;
  const n = un.getElementById(e[2]);
  return n && (this[0] = n, this.length = 1), this;
};
J.Dom = dc;
dc.prototype = J.fn;
J.Event = Ge;
J.event = { special: /* @__PURE__ */ Object.create(null) };
J.event.has = function(t, e) {
  const n = ie.get(t, "events");
  return n ? e ? Array.isArray(n[e]) && n[e].length > 0 : !0 : !1;
};
J.event.on = function(t, e, n, r, i, s) {
  if (typeof e == "object") {
    typeof n != "string" && (r = r || n, n = void 0);
    for (let o in e) J.event.on(t, o, n, r, e[o], s);
    return t;
  }
  if (r == null && i == null ? (i = n, r = n = void 0) : i == null && (typeof n == "string" ? (i = r, r = void 0) : (i = r, r = n, n = void 0)), !i) return t;
  if (s === 1) {
    const o = i;
    i = function(a) {
      return J().off(a), o.apply(this, arguments);
    }, i.guid = o.guid || (o.guid = J.guid++);
  }
  for (let o = 0; o < t.length; o++) J.event.add(t[o], e, i, r, n);
};
J.event.add = function(t, e, n, r, i) {
  if (typeof t != "object") return;
  const s = ie.create(t);
  let o;
  n.handler && (o = n, n = o.handler, i = o.selector), i && qh.matches(i), n.guid || (n.guid = J.guid++);
  let a;
  (a = s.events) || (a = s.events = /* @__PURE__ */ Object.create(null));
  let c;
  (c = s.handle) || (c = s.handle = function(l) {
    return typeof J < "u" ? J.event.dispatch.apply(t, arguments) : void 0;
  });
  const u = (e || "").match(fc) || [""];
  let h = u.length;
  for (; h--; ) {
    const [, l, d = ""] = hc.exec(u[h]);
    if (!l) continue;
    const g = d.split(".").sort();
    let v = J.event.special[l];
    const y = v && (i ? v.delegateType : v.bindType) || l;
    v = J.event.special[y];
    const w = Object.assign({
      type: y,
      origType: l,
      data: r,
      handler: n,
      guid: n.guid,
      selector: i,
      namespace: g.join(".")
    }, o);
    let x;
    (x = a[y]) || (x = a[y] = [], x.delegateCount = 0, (!v || !v.setup || v.setup.call(t, r, g, c) === !1) && t.addEventListener && t.addEventListener(y, c)), v && v.add && (v.add.call(t, w), w.handler.guid || (w.handler.guid = n.guid)), i ? x.splice(x.delegateCount++, 0, w) : x.push(w);
  }
};
J.event.remove = function(t, e, n, r, i) {
  const s = ie.get(t);
  if (!s || !s.events) return;
  const o = s.events, a = (e || "").match(fc) || [""];
  let c = a.length;
  for (; c--; ) {
    const [, u, h = ""] = hc.exec(a[c]);
    if (!u) {
      for (const P in o) J.event.remove(t, P + a[c], n, r, !0);
      continue;
    }
    const l = J.event.special[u], d = l && (r ? l.delegateType : l.bindType) || u, g = o[d];
    if (!g || g.length === 0) continue;
    const v = h.split(".").sort(), y = h ? /* @__PURE__ */ new RegExp("(^|\\.)" + v.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, w = g.length;
    let x = w;
    for (; x--; ) {
      const P = g[x];
      (i || u === P.origType) && (!n || n.guid === P.guid) && (!y || y.test(P.namespace)) && (!r || r === P.selector || r === "**" && P.selector) && (g.splice(x, 1), P.selector && g.delegateCount--, l && l.remove && l.remove.call(t, P));
    }
    w && g.length === 0 && ((!l || !l.teardown || l.teardown.call(t, v, s.handle) === !1) && t.removeEventListener && t.removeEventListener(d, s.handle), delete o[d]);
  }
  Yt(o) && (ie.remove(t, "handle"), ie.remove(t, "events"));
};
J.event.dispatch = function(t) {
  const e = this, n = J.event.fix(t);
  n.delegateTarget = e;
  const r = Array.from(arguments);
  r[0] = n;
  const i = ie.get(e, "events"), s = i && i[n.type] || [], o = J.event.special[n.type];
  if (o && o.preDispatch && o.preDispatch.call(e, n) === !1)
    return;
  const a = J.event.handlers.call(e, n, s);
  let c = 0, u;
  for (; (u = a[c++]) && !n.isPropagationStopped(); ) {
    n.currentTarget = u.elem;
    let h = 0, l;
    for (; (l = u.handlers[h++]) && !n.isImmediatePropagationStopped(); ) {
      n.handleObj = l, n.data = l.data;
      const d = J.event.special[l.origType];
      let g;
      d && d.handle ? g = d.handle : g = l.handler;
      const v = g.apply(u.elem, r);
      v !== void 0 && (n.result = v) === !1 && (n.preventDefault(), n.stopPropagation());
    }
  }
  return o && o.postDispatch && o.postDispatch.call(e, n), n.result;
};
J.event.handlers = function(t, e) {
  const n = e.delegateCount, r = [];
  if (n && !(t.type === "click" && t.button >= 1)) {
    for (let i = t.target; i !== this; i = i.parentNode || this) if (i.nodeType === 1 && !(t.type === "click" && i.disabled === !0)) {
      const s = [], o = {};
      for (let a = 0; a < n; a++) {
        const c = e[a], u = c.selector + " ";
        o[u] === void 0 && (o[u] = i.matches(u)), o[u] && s.push(c);
      }
      s.length && r.push({
        elem: i,
        handlers: s
      });
    }
  }
  return n < e.length && r.push({
    elem: this,
    handlers: e.slice(n)
  }), r;
};
J.event.fix = function(t) {
  return t.envelope ? t : new Ge(t);
};
const Jh = J(un);
var gc = {};
Xt(gc, {
  addClass: () => hf,
  append: () => nf,
  appendTo: () => sf,
  children: () => gf,
  clone: () => tf,
  closest: () => pf,
  css: () => cf,
  data: () => lf,
  detach: () => Zh,
  empty: () => Qh,
  hasClass: () => df,
  height: () => wf,
  html: () => ef,
  off: () => yf,
  offset: () => Sf,
  on: () => vf,
  one: () => mf,
  position: () => xf,
  prepend: () => rf,
  prependTo: () => of,
  remove: () => Kh,
  removeClass: () => uf,
  toggleClass: () => ff,
  width: () => bf
});
function hs(t) {
  let e = t.length;
  for (; e--; ) pc(t[e]);
}
function pc(t) {
  J.event.remove(t), ie.remove(t), uc.remove(t);
}
function vc(t) {
  for (let e = 0; e < t.length; e++) {
    const n = t[e];
    n.parentNode && n.parentNode.removeChild(n);
  }
}
function Kh() {
  for (let t = 0; t < this.length; t++) {
    const e = this[t];
    pc(e), hs(e.getElementsByTagName("*"));
  }
  return vc(this), this;
}
function Zh() {
  return vc(this), this;
}
function Qh() {
  for (let t = 0; t < this.length; t++) {
    const e = this[t];
    e.nodeType === 1 && (hs(e.getElementsByTagName("*")), e.textContent = "");
  }
  return this;
}
function tf() {
  const t = [];
  for (let e = 0; e < this.length; e++) t.push(this[e].cloneNode(!0));
  return this.pushStack(t);
}
function ef(t) {
  const [e] = this;
  if (!e) return null;
  if (arguments.length === 0) return e.innerHTML;
  if (t === void 0) return this;
  if (hs(e.getElementsByTagName("*")), typeof t == "string" || typeof t == "number") e.innerHTML = t;
  else
    return e.innerHTML = "", this.append(t);
  return this;
}
function nf(...t) {
  const [e] = this;
  return e ? (t.forEach((n) => {
    n && (typeof n == "string" ? e.append(...J.parseHTML(n)) : n.toString() === "[object Object]" ? this.append(...Array.from(n)) : Array.isArray(n) ? this.append(...n) : e.appendChild(n));
  }), this) : this;
}
function rf(...t) {
  const [e] = this;
  return e ? (t.forEach((n) => {
    n && (typeof n == "string" ? e.prepend(...J.parseHTML(n)) : n.toString() === "[object Object]" ? this.prepend(...Array.from(n)) : Array.isArray(n) ? this.prepend(...n) : e.insertBefore(n, e.firstChild));
  }), this) : this;
}
function sf(t) {
  return J(t).append(this), this;
}
function of(t) {
  return J(t).prepend(this), this;
}
const mc = {};
[
  "width",
  "height",
  "top",
  "bottom",
  "left",
  "right",
  "padding",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight"
].forEach((t) => {
  mc[t] = !0;
});
function af(t, e, n) {
  typeof n == "number" && mc[cc(e)] && (n += "px"), t.style[e] = n;
}
function cf(t, e) {
  let n;
  if (typeof t == "string") if (e === void 0) {
    const [r] = this;
    return r ? r.style[t] : null;
  } else n = { [t]: e };
  else if (t) n = t;
  else throw new Error("no styles provided");
  for (let r in n) if (n.hasOwnProperty(r)) for (let i = 0; i < this.length; i++) af(this[i], r, n[r]);
  return this;
}
function lf(t, e) {
  if (arguments.length < 2) {
    const [n] = this;
    return n ? t === void 0 ? n.dataset : n.dataset[t] : null;
  }
  for (let n = 0; n < this.length; n++) this[n].dataset[t] = e;
  return this;
}
function fs(t, e, n) {
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    B.prototype[t].apply({ node: i }, n);
  }
}
function uf() {
  return fs("removeClass", this, arguments), this;
}
function hf() {
  return fs("addClass", this, arguments), this;
}
function ff() {
  return fs("toggleClass", this, arguments), this;
}
function df() {
  const [t] = this;
  return t ? B.prototype.hasClass.apply({ node: t }, arguments) : !1;
}
function gf(t) {
  const e = [];
  for (let n = 0; n < this.length; n++) {
    const r = this[n];
    let i = Array.from(r.children);
    typeof t == "string" && (i = i.filter((s) => s.matches(t))), e.push(...i);
  }
  return this.pushStack(e);
}
function pf(t) {
  const e = [];
  for (let n = 0; n < this.length; n++) {
    const r = this[n];
    if (typeof t == "string") {
      const i = r.closest(t);
      i && e.push(i);
    } else {
      const [i] = J(t);
      i && i.contains(r) && e.push(i);
    }
  }
  return this.pushStack(e);
}
function vf(t, e, n, r) {
  return J.event.on(this, t, e, n, r), this;
}
function mf(t, e, n, r) {
  return J.event.on(this, t, e, n, r, 1), this;
}
function yf(t, e, n) {
  if (t && t.preventDefault && t.handleObj) {
    const r = t.handleObj;
    return J(t.delegateTarget).off(r.namespace ? r.origType + "." + r.namespace : r.origType, r.selector, r.handler), this;
  }
  if (typeof t == "object") {
    for (let r in t) this.off(r, e, t[r]);
    return this;
  }
  (e === !1 || typeof e == "function") && (n = e, e = void 0);
  for (let r = 0; r < this.length; r++) J.event.remove(this[r], t, n, e);
  return this;
}
function bf() {
  const [t] = this;
  if (t === window) return t.document.documentElement.clientWidth;
  if (!t) return;
  const e = window.getComputedStyle(t), n = t.offsetWidth, r = parseFloat(e.borderTopWidth), i = parseFloat(e.borderBottomWidth), s = parseFloat(e.paddingTop), o = parseFloat(e.paddingBottom);
  return n - i - r - s - o;
}
function wf() {
  const [t] = this;
  if (t === window) return t.document.documentElement.clientHeight;
  if (!t) return;
  const e = window.getComputedStyle(t), n = t.offsetHeight, r = parseFloat(e.borderLeftWidth), i = parseFloat(e.borderRightWidth), s = parseFloat(e.paddingLeft), o = parseFloat(e.paddingRight);
  return n - r - i - s - o;
}
function xf() {
  const [t] = this;
  if (!t) return;
  let e = J(t), n, r, i, s = {
    top: 0,
    left: 0
  };
  if (e.css("position") === "fixed") r = t.getBoundingClientRect();
  else {
    r = e.offset(), i = t.ownerDocument, n = t.offsetParent || i.documentElement;
    const c = (u) => {
      const { position: h } = getComputedStyle(u);
      return h === "static";
    };
    for (; n && n !== i.documentElement && c(n); ) n = n.offsetParent || i.documentElement;
    if (n && n !== t && n.nodeType === 1 && !c(n)) {
      const u = window.getComputedStyle(n), h = parseFloat(u.borderTopWidth) || 0, l = parseFloat(u.borderLeftWidth) || 0;
      s = J(n).offset(), s.top += h, s.left += l;
    }
  }
  const o = parseFloat(window.getComputedStyle(t).marginTop) || 0, a = parseFloat(window.getComputedStyle(t).marginLeft) || 0;
  return {
    top: r.top - s.top - o,
    left: r.left - s.left - a
  };
}
function Sf(t) {
  const [e] = this;
  if (t === void 0) {
    if (!e) return null;
    if (!e.getClientRects().length) return {
      top: 0,
      left: 0
    };
    const o = e.getBoundingClientRect();
    return {
      top: o.top + window.scrollY,
      left: o.left + window.scrollX
    };
  }
  if (!e) return this;
  const n = window.getComputedStyle(e);
  n.position === "static" && this.css("position", "relative");
  const r = this.offset(), i = t.top - r.top, s = t.left - r.left;
  return this.css({
    top: (parseFloat(n.top) || 0) + i + "px",
    left: (parseFloat(n.left) || 0) + s + "px"
  }), this;
}
var yc = {};
Xt(yc, {
  animate: () => Af,
  stop: () => Ef
});
const Ar = "animationFrameId", oe = {};
oe["transition-property"] = oe["transition-duration"] = oe["transition-delay"] = oe["transition-timing-function"] = oe["animation-name"] = oe["animation-duration"] = oe["animation-delay"] = oe["animation-timing-function"] = "";
function Af(t, e = {}) {
  this.stop();
  for (let n = 0; n < this.length; n++) Pf(this[n], t, e);
  return this;
}
function Pf(t, e, n = {}) {
  let { duration: r = 400, easing: i = "ease-in-out", delay: s = 0, complete: o } = n;
  const a = setTimeout(function() {
    const c = J(t);
    let u = !1, h = "transitionend";
    r = r / 1e3, s = s / 1e3;
    const l = {};
    if (typeof e == "string")
      l["animation-name"] = e, l["animation-duration"] = r + "s", l["animation-delay"] = s + "s", l["animation-timing-function"] = i, h = "animationend";
    else {
      const v = [];
      for (var d in e) e.hasOwnProperty(d) && (l[d] = e[d], v.push(d));
      r > 0 && (l["transition-property"] = v.join(", "), l["transition-duration"] = r + "s", l["transition-delay"] = s + "s", l["transition-timing-function"] = i);
    }
    const g = function(v) {
      if (v) {
        if (v.target !== v.currentTarget) return;
        v.target.removeEventListener(h, g);
      } else t.removeEventListener(h, g);
      u = !0, c.css(oe), o && o.call(t);
    };
    if (r > 0) {
      t.addEventListener(h, g);
      const v = setTimeout(function() {
        u || g(null);
      }, (r + s) * 1e3 + 25);
      ie.set(t, Ar, {
        id: v,
        stop: () => {
          clearTimeout(v), t.removeEventListener(h, g);
        }
      });
    }
    c.css(l), r <= 0 && g(null);
  });
  ie.set(t, Ar, { stop: () => clearTimeout(a) });
}
function Ef() {
  for (let t = 0; t < this.length; t++) {
    const e = this[t], n = ie.get(e, Ar);
    n && (n.stop(), ie.remove(e, Ar));
  }
  return this.css(oe), this;
}
const Xs = {
  outerWidth: "offsetWidth",
  outerHeight: "offsetHeight",
  innerWidth: "clientWidth",
  innerHeight: "clientHeight",
  scrollLeft: "scrollLeft",
  scrollTop: "scrollTop",
  val: "value",
  text: "textContent"
}, Js = {
  disabled: "disabled",
  value: "value",
  text: "textContent"
};
function Tf(t, e) {
  if (!t) throw new Error("no property provided");
  if (arguments.length === 1) {
    const [n] = this;
    return n ? n[t] : null;
  }
  if (e === void 0) return this;
  for (let n = 0; n < this.length; n++) this[n][t] = e;
  return this;
}
function Cf(t, e) {
  let n;
  if (typeof t == "string") if (e === void 0) {
    const [r] = this;
    return r ? r.getAttribute(t) : null;
  } else n = { [t]: e };
  else if (t) n = t;
  else throw new Error("no attributes provided");
  for (let r in n) if (n.hasOwnProperty(r)) {
    const i = n[r];
    if (Js[r]) {
      this.prop(Js[r], i);
      continue;
    }
    for (let s = 0; s < this.length; s++) i === null ? this[s].removeAttribute(r) : this[s].setAttribute(r, i);
  }
  return this;
}
const bc = {
  prop: Tf,
  attr: Cf
};
Object.keys(Xs).forEach((t) => {
  bc[t] = function(...e) {
    return this.prop(Xs[t], ...e);
  };
});
var kf = bc;
const Fe = {
  useCSSSelectors: !1,
  classNamePrefix: "joint-",
  defaultTheme: "default",
  doubleTapInterval: 300
}, jr = /* @__PURE__ */ Object.create(null);
var Lf = jr;
jr.load = { noBubble: !0 };
[
  ["mouseenter", "mouseover"],
  ["mouseleave", "mouseout"],
  ["pointerenter", "pointerover"],
  ["pointerleave", "pointerout"]
].forEach(([t, e]) => {
  jr[t] = {
    delegateType: e,
    bindType: e,
    handle: function(n) {
      const r = this, i = n.relatedTarget, s = n.handleObj;
      let o;
      return (!i || !r.contains(i)) && (n.type = s.origType, o = s.handler.apply(r, arguments), n.type = e), o;
    }
  };
});
const _f = Fe.doubleTapInterval, Nf = 30;
jr.dbltap = {
  bindType: "touchend",
  delegateType: "touchend",
  handle: function(t, ...e) {
    const { handleObj: n, target: r } = t, i = J.data.create(r), s = (/* @__PURE__ */ new Date()).getTime(), o = "lastTouch" in i ? s - i.lastTouch : 0;
    o < _f && o > Nf ? (i.lastTouch = null, t.type = n.origType, n.handler.call(this, t, ...e)) : i.lastTouch = s;
  }
};
Object.assign(J.fn, gc);
Object.assign(J.fn, yc);
Object.assign(J.fn, kf);
Object.assign(J.event.special, Lf);
var xt = J;
const pe = function(t) {
  return t && t.toString().split(" ").map(function(e) {
    return e.substr(0, Fe.classNamePrefix.length) !== Fe.classNamePrefix && (e = Fe.classNamePrefix + e), e;
  }).join(" ");
}, Pr = function(t, e) {
  const n = {}, r = {}, i = B.namespace.svg, s = e || i, o = document.createDocumentFragment(), a = function(c, u, h) {
    for (let l = 0; l < c.length; l++) {
      const d = c[l];
      if (typeof d == "string") {
        const I = document.createTextNode(d);
        u.appendChild(I);
        continue;
      }
      if (!d.hasOwnProperty("tagName")) throw new Error("json-dom-parser: missing tagName");
      const g = d.tagName;
      let v;
      const y = d.hasOwnProperty("namespaceURI") ? d.namespaceURI : h;
      v = document.createElementNS(y, g);
      const w = y === i, x = w ? B(v) : xt(v), P = d.attributes;
      P && x.attr(P);
      const T = d.style;
      if (T && xt(v).css(T), d.hasOwnProperty("className")) {
        const I = d.className;
        w ? v.className.baseVal = I : v.className = I;
      }
      if (d.hasOwnProperty("textContent") && (v.textContent = d.textContent), d.hasOwnProperty("selector")) {
        const I = d.selector;
        if (n[I]) throw new Error("json-dom-parser: selector must be unique");
        n[I] = v, x.attr("joint-selector", I);
      }
      if (d.hasOwnProperty("groupSelector")) {
        let I = d.groupSelector;
        Array.isArray(I) || (I = [I]);
        for (let R = 0; R < I.length; R++) {
          const f = I[R];
          let p = r[f];
          p || (p = r[f] = []), p.push(v);
        }
      }
      u.appendChild(v);
      const L = d.children;
      Array.isArray(L) && a(L, v, y);
    }
  };
  return a(t, o, s), {
    fragment: o,
    selectors: n,
    groupSelectors: r
  };
}, rr = function(t) {
  let e = 0;
  if (t.length === 0) return e;
  for (let n = 0; n < t.length; n++) {
    const r = t.charCodeAt(n);
    e = (e << 5) - e + r, e = e & e;
  }
  return e;
}, hn = function(t, e, n) {
  for (var r = Array.isArray(e) ? e : e.split(n || "/"), i, s = 0, o = r.length; s < o; )
    if (i = r[s++], Object(t) === t && i in t) t = t[i];
    else return;
  return t;
}, wc = function(t, e) {
  return typeof e != "string" && typeof e != "number" && (e = String(e)), !(e === "constructor" && typeof t[e] == "function" || e === "__proto__");
}, Ks = function(t, e, n, r) {
  const i = Array.isArray(e) ? e : e.split(r || "/"), s = i.length - 1;
  let o = t, a = 0;
  for (; a < s; a++) {
    const c = i[a];
    if (!wc(o, c)) return t;
    o = o[c] || (o[c] = {});
  }
  return o[i[s]] = n, t;
}, Zs = function(t, e, n) {
  const r = Array.isArray(e) ? e : e.split(n), i = r.length - 1;
  let s = t, o = 0;
  for (; o < i; o++) {
    const a = r[o];
    if (!wc(s, a)) return t;
    const c = s[a];
    if (!c) return t;
    s = c;
  }
  return delete s[r[i]], t;
}, Mf = function() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(t) {
    var e = Math.random() * 16 | 0, n = t === "x" ? e : e & 3 | 8;
    return n.toString(16);
  });
}, rn = function(t) {
  return rn.id = rn.id || 1, t === void 0 ? "j_" + rn.id++ : (t.id = t.id === void 0 ? "j_" + rn.id++ : t.id, t.id);
}, Nt = function(t) {
  if (t.normalized) return t;
  const { originalEvent: e, target: n } = t, r = e && e.changedTouches && e.changedTouches[0];
  if (r)
    for (let i in r) t[i] === void 0 && (t[i] = r[i]);
  if (n) {
    const i = n.correspondingUseElement;
    i && (t.target = i);
  }
  return t.normalized = !0, t;
}, If = function(t) {
  let i = 0, s = 0, o = 0, a = 0;
  return "detail" in t && (s = t.detail), "wheelDelta" in t && (s = -t.wheelDelta / 120), "wheelDeltaY" in t && (s = -t.wheelDeltaY / 120), "wheelDeltaX" in t && (i = -t.wheelDeltaX / 120), "axis" in t && t.axis === t.HORIZONTAL_AXIS && (i = s, s = 0), o = "deltaX" in t ? t.deltaX : i * 10, a = "deltaY" in t ? t.deltaY : s * 10, (o || a) && t.deltaMode && (t.deltaMode == 1 ? (o *= 40, a *= 40) : (o *= 800, a *= 800)), t.deltaX === 0 && t.deltaY !== 0 && t.shiftKey && (o = a, a = 0, i = s, s = 0), o && !i && (i = o < 1 ? -1 : 1), a && !s && (s = a < 1 ? -1 : 1), {
    spinX: i,
    spinY: s,
    deltaX: o,
    deltaY: a
  };
}, Of = function(t, e) {
  return t > e ? e : t < -e ? -e : t;
}, xi = (function() {
  var t;
  if (typeof window < "u" && (t = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame), !t) {
    var e = 0;
    t = function(n) {
      var r = (/* @__PURE__ */ new Date()).getTime(), i = Math.max(0, 16 - (r - e)), s = setTimeout(function() {
        n(r + i);
      }, i);
      return e = r + i, s;
    };
  }
  return function(n, r, ...i) {
    return t(r !== void 0 ? n.bind(r, ...i) : n);
  };
})(), pr = (function() {
  var t, e = typeof window < "u";
  return e && (t = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.webkitCancelRequestAnimationFrame || window.msCancelAnimationFrame || window.msCancelRequestAnimationFrame || window.oCancelAnimationFrame || window.oCancelRequestAnimationFrame || window.mozCancelAnimationFrame || window.mozCancelRequestAnimationFrame), t = t || clearTimeout, e ? t.bind(window) : t;
})(), Wt = function(t) {
  return Ct(t) && t.slice(-1) === "%";
}, Rf = function(t, e) {
  function n(a) {
    var c = (/* @__PURE__ */ new RegExp("(?:\\d+(?:\\.\\d+)*)(" + a + ")$")).exec(t);
    return c ? c[1] : null;
  }
  var r = parseFloat(t);
  if (Number.isNaN(r)) return null;
  var i = {};
  i.value = r;
  var s;
  if (e == null) s = "[A-Za-z]*";
  else if (Array.isArray(e)) {
    if (e.length === 0) return null;
    s = e.join("|");
  } else Ct(e) && (s = e);
  var o = n(s);
  return o === null ? null : (i.unit = o, i);
}, Tn = 0;
function Df(t, e) {
  const n = t.split(e);
  let r = 1;
  for (let i = 0, s = n.length - 1; i < s; i++) {
    const o = [];
    (i > 0 || n[0] !== "") && o.push(Tn), o.push(e), (i < s - 1 || n[s] !== "") && o.push(Tn), n.splice(r, 0, ...o), r += o.length + 1;
  }
  return n.filter((i) => i !== "");
}
function Qs(t, e) {
  if (t === null) return e.getBBox().height;
  switch (t.unit) {
    case "em":
      return e.getBBox().height * t.value;
    case "px":
    case "":
      return t.value;
  }
}
const Ff = function(t, e, n = {}, r = {}) {
  var i = e.width, s = e.height, o = r.svgDocument || B("svg").node, a = B("tspan").node, c = B("text").attr(n).append(a).node, u = document.createTextNode("");
  c.style.opacity = 0, c.style.display = "block", a.style.display = "block", a.appendChild(u), o.appendChild(c), r.svgDocument || document.body.appendChild(o);
  const h = r.preserveSpaces, l = " ", d = r.separator || r.separator === "" ? r.separator : l, g = typeof d == "string" ? d : l;
  var v = r.eol || `
`, y = r.hyphen ? new RegExp(r.hyphen) : /[^\w\d\u00C0-\u1FFF\u2800-\uFFFD]/, w = r.maxLineCount;
  Ft(w) || (w = 1 / 0);
  var x = t.split(d), P = [], T = [], L, I, R;
  h && B(a).attr("xml:space", "preserve");
  for (var f = 0, p = 0, m = x.length; f < m; f++) {
    var b = x[f];
    if (!(!b && !h) && typeof b == "string") {
      var S = !1;
      if (b.indexOf(v) >= 0) if (b.length > 1) {
        const D = Df(x[f], v);
        x.splice(f, 1, ...D), f--, m = x.length;
        continue;
      } else {
        if (h && typeof x[f - 1] == "string") {
          x.splice(f, Tn, "", Tn), m += 2, f--;
          continue;
        }
        T[++p] = !h || typeof x[f + 1] == "string" ? "" : void 0, S = !0;
      }
      if (!S) {
        let D;
        if (h ? D = T[p] !== void 0 ? T[p] + g + b : b : D = T[p] ? T[p] + g + b : b, u.data = D, a.getComputedTextLength() <= i)
          T[p] = D, (L || I) && (P[p++] = !0, L = 0, I = 0);
        else {
          if (!T[p] || L) {
            var M = !!L;
            if (L = b.length - 1, M || !L) {
              if (!L) {
                if (!T[p]) {
                  T = [];
                  break;
                }
                x.splice(f, 2, b + x[f + 1]), m--, P[p++] = !0, f--;
                continue;
              }
              x[f] = b.substring(0, L);
              const W = x[f + 1];
              x[f + 1] = b.substring(L) + (W === void 0 || W === Tn ? "" : W);
            } else {
              if (I)
                x.splice(f, 2, x[f] + x[f + 1]), I = 0;
              else {
                var _ = b.search(y);
                _ > -1 && _ !== b.length - 1 && _ !== 0 && (I = _ + 1, L = 0), x.splice(f, 1, b.substring(0, I || L), b.substring(I || L)), m++;
              }
              p && !P[p - 1] && p--;
            }
            (!h || T[p] !== "") && f--;
            continue;
          }
          p++, f--;
        }
      }
      var F = null;
      if (T.length > w) F = w - 1;
      else if (s !== void 0) {
        if (R === void 0 && u.data !== "") if (n.lineHeight === "auto") R = Qs({
          value: 1.5,
          unit: "em"
        }, c);
        else {
          const D = Rf(n.lineHeight, [
            "em",
            "px",
            ""
          ]);
          R = Qs(D, c);
        }
        R * T.length > s && (F = Math.floor(s / R) - 1);
      }
      if (F !== null) {
        T.splice(F + 1);
        var U = r.ellipsis;
        if (!U || F < 0) break;
        typeof U != "string" && (U = "…");
        var A = T[F];
        if (!A && !S) break;
        var C = A.length, k, N;
        do {
          if (N = A[C], k = A.substring(0, C), N ? N.match(d) && (k += N) : k += g, k += U, u.data = k, a.getComputedTextLength() <= i) {
            T[F] = k;
            break;
          }
          C--;
        } while (C >= 0);
        break;
      }
    }
  }
  return r.svgDocument ? o.removeChild(c) : document.body.removeChild(o), T.join(v);
}, Bf = function(t, e) {
  t = xt(t).toArray();
  var n = t.map(function(i) {
    var s = i.parentNode, o = s.insertBefore(document.createTextNode(""), i.nextSibling);
    return function() {
      if (s === this) throw new Error("You can't sort elements if any one is a descendant of another.");
      s.insertBefore(this, o), s.removeChild(o);
    };
  });
  t.sort(e);
  for (var r = 0; r < n.length; r++) n[r].call(t[r]);
  return t;
}, ze = function(t) {
  if (Object(t) !== t) {
    var e = 0;
    return isFinite(t) && (e = +t), {
      top: e,
      right: e,
      bottom: e,
      left: e
    };
  }
  var n, r, i, s;
  return n = r = i = s = 0, isFinite(t.vertical) && (n = i = +t.vertical), isFinite(t.horizontal) && (r = s = +t.horizontal), isFinite(t.top) && (n = +t.top), isFinite(t.right) && (r = +t.right), isFinite(t.bottom) && (i = +t.bottom), isFinite(t.left) && (s = +t.left), {
    top: n,
    right: r,
    bottom: i,
    left: s
  };
}, Vf = {
  linear: function(t) {
    return t;
  }
}, xc = {
  number: function(t, e) {
    var n = e - t;
    return function(r) {
      return t + n * r;
    };
  },
  object: function(t, e) {
    var n = Object.keys(t);
    return function(r) {
      var i, s, o = {};
      for (i = n.length - 1; i != -1; i--)
        s = n[i], o[s] = t[s] + (e[s] - t[s]) * r;
      return o;
    };
  }
}, Gf = {
  outline: function(t) {
    var e = '<filter><feFlood flood-color="${color}" flood-opacity="${opacity}" result="colored"/><feMorphology in="SourceAlpha" result="morphedOuter" operator="dilate" radius="${outerRadius}" /><feMorphology in="SourceAlpha" result="morphedInner" operator="dilate" radius="${innerRadius}" /><feComposite result="morphedOuterColored" in="colored" in2="morphedOuter" operator="in"/><feComposite operator="xor" in="morphedOuterColored" in2="morphedInner" result="outline"/><feMerge><feMergeNode in="outline"/><feMergeNode in="SourceGraphic"/></feMerge></filter>', n = Number.isFinite(t.margin) ? t.margin : 2, r = Number.isFinite(t.width) ? t.width : 1;
    return ne(e)({
      color: t.color || "blue",
      opacity: Number.isFinite(t.opacity) ? t.opacity : 1,
      outerRadius: n + r,
      innerRadius: n
    });
  },
  highlight: function(t) {
    var e = '<filter><feFlood flood-color="${color}" flood-opacity="${opacity}" result="colored"/><feMorphology result="morphed" in="SourceGraphic" operator="dilate" radius="${width}"/><feComposite result="composed" in="colored" in2="morphed" operator="in"/><feGaussianBlur result="blured" in="composed" stdDeviation="${blur}"/><feBlend in="SourceGraphic" in2="blured" mode="normal"/></filter>';
    return ne(e)({
      color: t.color || "red",
      width: Number.isFinite(t.width) ? t.width : 1,
      blur: Number.isFinite(t.blur) ? t.blur : 0,
      opacity: Number.isFinite(t.opacity) ? t.opacity : 1
    });
  },
  blur: function(t) {
    var e = Number.isFinite(t.x) ? t.x : 2;
    return ne('<filter><feGaussianBlur stdDeviation="${stdDeviation}"/></filter>')({ stdDeviation: Number.isFinite(t.y) ? [e, t.y] : e });
  },
  dropShadow: function(t) {
    var e = "SVGFEDropShadowElement" in window ? '<filter><feDropShadow stdDeviation="${blur}" dx="${dx}" dy="${dy}" flood-color="${color}" flood-opacity="${opacity}"/></filter>' : '<filter><feGaussianBlur in="SourceAlpha" stdDeviation="${blur}"/><feOffset dx="${dx}" dy="${dy}" result="offsetblur"/><feFlood flood-color="${color}"/><feComposite in2="offsetblur" operator="in"/><feComponentTransfer><feFuncA type="linear" slope="${opacity}"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    return ne(e)({
      dx: t.dx || 0,
      dy: t.dy || 0,
      opacity: Number.isFinite(t.opacity) ? t.opacity : 1,
      color: t.color || "black",
      blur: Number.isFinite(t.blur) ? t.blur : 4
    });
  },
  grayscale: function(t) {
    var e = Number.isFinite(t.amount) ? t.amount : 1;
    return ne('<filter><feColorMatrix type="matrix" values="${a} ${b} ${c} 0 0 ${d} ${e} ${f} 0 0 ${g} ${b} ${h} 0 0 0 0 0 1 0"/></filter>')({
      a: 0.2126 + 0.7874 * (1 - e),
      b: 0.7152 - 0.7152 * (1 - e),
      c: 0.0722 - 0.0722 * (1 - e),
      d: 0.2126 - 0.2126 * (1 - e),
      e: 0.7152 + 0.2848 * (1 - e),
      f: 0.0722 - 0.0722 * (1 - e),
      g: 0.2126 - 0.2126 * (1 - e),
      h: 0.0722 + 0.9278 * (1 - e)
    });
  },
  sepia: function(t) {
    var e = Number.isFinite(t.amount) ? t.amount : 1;
    return ne('<filter><feColorMatrix type="matrix" values="${a} ${b} ${c} 0 0 ${d} ${e} ${f} 0 0 ${g} ${h} ${i} 0 0 0 0 0 1 0"/></filter>')({
      a: 0.393 + 0.607 * (1 - e),
      b: 0.769 - 0.769 * (1 - e),
      c: 0.189 - 0.189 * (1 - e),
      d: 0.349 - 0.349 * (1 - e),
      e: 0.686 + 0.314 * (1 - e),
      f: 0.168 - 0.168 * (1 - e),
      g: 0.272 - 0.272 * (1 - e),
      h: 0.534 - 0.534 * (1 - e),
      i: 0.131 + 0.869 * (1 - e)
    });
  },
  saturate: function(t) {
    var e = Number.isFinite(t.amount) ? t.amount : 1;
    return ne('<filter><feColorMatrix type="saturate" values="${amount}"/></filter>')({ amount: 1 - e });
  },
  hueRotate: function(t) {
    return ne('<filter><feColorMatrix type="hueRotate" values="${angle}"/></filter>')({ angle: t.angle || 0 });
  },
  invert: function(t) {
    var e = Number.isFinite(t.amount) ? t.amount : 1;
    return ne('<filter><feComponentTransfer><feFuncR type="table" tableValues="${amount} ${amount2}"/><feFuncG type="table" tableValues="${amount} ${amount2}"/><feFuncB type="table" tableValues="${amount} ${amount2}"/></feComponentTransfer></filter>')({
      amount: e,
      amount2: 1 - e
    });
  },
  brightness: function(t) {
    return ne('<filter><feComponentTransfer><feFuncR type="linear" slope="${amount}"/><feFuncG type="linear" slope="${amount}"/><feFuncB type="linear" slope="${amount}"/></feComponentTransfer></filter>')({ amount: Number.isFinite(t.amount) ? t.amount : 1 });
  },
  contrast: function(t) {
    var e = Number.isFinite(t.amount) ? t.amount : 1;
    return ne('<filter><feComponentTransfer><feFuncR type="linear" slope="${amount}" intercept="${amount2}"/><feFuncG type="linear" slope="${amount}" intercept="${amount2}"/><feFuncB type="linear" slope="${amount}" intercept="${amount2}"/></feComponentTransfer></filter>')({
      amount: e,
      amount2: 0.5 - e / 2
    });
  }
}, ne = function(t) {
  var e = /<%= ([^ ]+) %>|\$\{ ?([^{} ]+) ?\}|\{\{([^{} ]+)\}\}/g;
  return function(n) {
    return n = n || {}, t.replace(e, function(r) {
      for (var i = Array.from(arguments), s = i.slice(1, 4).find(function(c) {
        return !!c;
      }), o = s.split("."), a = n[o.shift()]; a !== void 0 && o.length; ) a = a[o.shift()];
      return a !== void 0 ? a : "";
    });
  };
};
function Sc(t, e, n, r) {
  if (n === r) return {};
  const i = {};
  return Object.keys(t).forEach((s) => {
    const o = t[s], a = e[s];
    if (!Array.isArray(o) && !Array.isArray(a) && gt(o) && gt(a)) {
      const c = n + 1, u = Sc(o, a, c, r);
      Object.keys(u).length > 0 ? i[s] = u : (n === 0 || c === r) && (i[s] = {});
    } else Pe(o, a) || (i[s] = o);
  }), i;
}
function zf(t, e, n) {
  const { maxDepth: r = Number.POSITIVE_INFINITY } = n || {};
  return Sc(t, e, 0, r);
}
var Lt = {}, to = /\s+/, Se, je = function(t, e, n, r, i) {
  var s = 0, o;
  if (n && typeof n == "object")
    for (r !== void 0 && ("context" in i) && i.context === void 0 && (i.context = r), o = Object.keys(n); s < o.length; s++) e = je(t, e, o[s], n[o[s]], i);
  else if (n && to.test(n)) for (o = n.split(to); s < o.length; s++) e = t(e, o[s], r, i);
  else e = t(e, n, r, i);
  return e;
};
Lt.on = function(t, e, n) {
  if (this._events = je(Uf, this._events || {}, t, e, {
    context: n,
    ctx: this,
    listening: Se
  }), Se) {
    var r = this._listeners || (this._listeners = {});
    r[Se.id] = Se, Se.interop = !1;
  }
  return this;
};
Lt.listenTo = function(t, e, n) {
  if (!t) return this;
  var r = t._listenId || (t._listenId = Dn("l")), i = this._listeningTo || (this._listeningTo = {}), s = Se = i[r];
  s || (this._listenId || (this._listenId = Dn("l")), s = Se = i[r] = new Wr(this, t));
  var o = jf(t, e, n, this);
  if (Se = void 0, o) throw o;
  return s.interop && s.on(e, n), this;
};
var Uf = function(t, e, n, r) {
  if (n) {
    var i = t[e] || (t[e] = []), s = r.context, o = r.ctx, a = r.listening;
    a && a.count++, i.push({
      callback: n,
      context: s,
      ctx: s || o,
      listening: a
    });
  }
  return t;
}, jf = function(t, e, n, r) {
  try {
    t.on(e, n, r);
  } catch (i) {
    return i;
  }
};
Lt.off = function(t, e, n) {
  return this._events ? (this._events = je(Ac, this._events, t, e, {
    context: n,
    listeners: this._listeners
  }), this) : this;
};
Lt.stopListening = function(t, e, n) {
  var r = this._listeningTo;
  if (!r) return this;
  for (var i = t ? [t._listenId] : Object.keys(r), s = 0; s < i.length; s++) {
    var o = r[i[s]];
    if (!o) break;
    o.obj.off(e, n, this), o.interop && o.off(e, n);
  }
  return Yt(r) && (this._listeningTo = void 0), this;
};
var Ac = function(t, e, n, r) {
  if (t) {
    var i = r.context, s = r.listeners, o = 0, a;
    if (!e && !i && !n) {
      if (s != null) for (a = Object.keys(s); o < a.length; o++) s[a[o]].cleanup();
      return;
    }
    for (a = e ? [e] : Object.keys(t); o < a.length; o++) {
      e = a[o];
      var c = t[e];
      if (!c) break;
      for (var u = [], h = 0; h < c.length; h++) {
        var l = c[h];
        if (n && n !== l.callback && n !== l.callback._callback || i && i !== l.context) u.push(l);
        else {
          var d = l.listening;
          d && d.off(e, n);
        }
      }
      u.length ? t[e] = u : delete t[e];
    }
    return t;
  }
};
Lt.once = function(t, e, n) {
  var r = je(Pc, {}, t, e, this.off.bind(this));
  return typeof t == "string" && n == null && (e = void 0), this.on(r, e, n);
};
Lt.listenToOnce = function(t, e, n) {
  var r = je(Pc, {}, e, n, this.stopListening.bind(this, t));
  return this.listenTo(t, r);
};
var Pc = function(t, e, n, r) {
  if (n) {
    var i = t[e] = Wf(function() {
      r(e, i), n.apply(this, arguments);
    });
    i._callback = n;
  }
  return t;
}, Wf = function(t) {
  var e;
  if (typeof t != "function") throw new TypeError("Expected a function");
  var n = 2;
  return function() {
    return --n > 0 && (e = t.apply(this, arguments)), n <= 1 && (t = void 0), e;
  };
};
Lt.trigger = function(t) {
  if (!this._events) return this;
  for (var e = Math.max(0, arguments.length - 1), n = Array(e), r = 0; r < e; r++) n[r] = arguments[r + 1];
  return je(Hf, this._events, t, void 0, n), this;
};
var Hf = function(t, e, n, r) {
  if (t) {
    var i = t[e], s = t.all;
    i && s && (s = s.slice()), i && eo(i, r), s && eo(s, [e].concat(r));
  }
  return t;
}, eo = function(t, e) {
  var n, r = -1, i = t.length, s = e[0], o = e[1], a = e[2];
  switch (e.length) {
    case 0:
      for (; ++r < i; ) (n = t[r]).callback.call(n.ctx);
      return;
    case 1:
      for (; ++r < i; ) (n = t[r]).callback.call(n.ctx, s);
      return;
    case 2:
      for (; ++r < i; ) (n = t[r]).callback.call(n.ctx, s, o);
      return;
    case 3:
      for (; ++r < i; ) (n = t[r]).callback.call(n.ctx, s, o, a);
      return;
    default:
      for (; ++r < i; ) (n = t[r]).callback.apply(n.ctx, e);
      return;
  }
}, Wr = function(t, e) {
  this.id = t._listenId, this.listener = t, this.obj = e, this.interop = !0, this.count = 0, this._events = void 0;
};
Wr.prototype.on = Lt.on;
Wr.prototype.off = function(t, e) {
  var n;
  this.interop ? (this._events = je(Ac, this._events, t, e, {
    context: void 0,
    listeners: void 0
  }), n = !this._events) : (this.count--, n = this.count === 0), n && this.cleanup();
};
Wr.prototype.cleanup = function() {
  delete this.listener._listeningTo[this.obj._listenId], this.interop || delete this.obj._listeners[this.id];
};
Lt.bind = Lt.on;
Lt.unbind = Lt.off;
var ds = function(t, e) {
  var n = this, r;
  return t && ue(t, "constructor") ? r = t.constructor : r = function() {
    return n.apply(this, arguments);
  }, $(r, n, e), r.prototype = Object.assign(Object.create(n.prototype), t), r.prototype.constructor = r, r.__super__ = n.prototype, r;
}, $f = function(t, e, n, r) {
  switch (e) {
    case 1:
      return function() {
        return t[n](this[r]);
      };
    case 2:
      return function(i) {
        return t[n](this[r], i);
      };
    case 3:
      return function(i, s) {
        return t[n](this[r], no(i, this), s);
      };
    case 4:
      return function(i, s, o) {
        return t[n](this[r], no(i, this), s, o);
      };
    default:
      return function() {
        var i = Array.prototype.slice.call(arguments);
        return i.unshift(this[r]), t[n].apply(t, i);
      };
  }
}, qf = function(t, e, n, r) {
  ce(n, function(i, s) {
    e[s] && (t.prototype[s] = $f(e, i, s, r));
  });
}, no = function(t, e) {
  return bt(t) ? t : gt(t) && !e._isModel(t) ? Yf(t) : Ct(t) ? function(n) {
    return n.get(t);
  } : t;
}, Yf = function(t) {
  var e = Oh(t);
  return function(n) {
    return e(n.attributes);
  };
}, Kt = function(t, e) {
  var n = t || {};
  e || (e = {}), this.preinitialize.apply(this, arguments), this.cid = Dn(this.cidPrefix), this.attributes = {}, e.collection && (this.collection = e.collection);
  var r = wt(this, "defaults");
  n = qt($({}, r, n), r), this.set(n, e), this.changed = {}, this.initialize.apply(this, arguments);
};
$(Kt.prototype, Lt, {
  changed: null,
  validationError: null,
  idAttribute: "id",
  cidPrefix: "c",
  preinitialize: function() {
  },
  initialize: function() {
  },
  toJSON: function(t) {
    return Ot(this.attributes);
  },
  get: function(t) {
    return this.attributes[t];
  },
  has: function(t) {
    return this.get(t) != null;
  },
  set: function(t, e, n) {
    if (t == null) return this;
    var r;
    if (typeof t == "object" ? (r = t, n = e) : (r = {})[t] = e, n || (n = {}), !this._validate(r, n)) return !1;
    var i = n.unset, s = n.silent, o = [], a = this._changing;
    this._changing = !0, a || (this._previousAttributes = Ot(this.attributes), this.changed = {});
    var c = this.attributes, u = this.changed, h = this._previousAttributes;
    for (var l in r)
      e = r[l], Pe(c[l], e) || o.push(l), Pe(h[l], e) ? delete u[l] : u[l] = e, i ? delete c[l] : c[l] = e;
    if (this.idAttribute in r) {
      var d = this.id;
      this.id = this.get(this.idAttribute), this.trigger("changeId", this, d, n);
    }
    if (!s) {
      o.length && (this._pending = n);
      for (var g = 0; g < o.length; g++) this.trigger("change:" + o[g], this, c[o[g]], n);
    }
    if (a) return this;
    if (!s) for (; this._pending; )
      n = this._pending, this._pending = !1, this.trigger("change", this, n);
    return this._pending = !1, this._changing = !1, this;
  },
  unset: function(t, e) {
    return this.set(t, void 0, $({}, e, { unset: !0 }));
  },
  clear: function(t) {
    var e = {};
    for (var n in this.attributes) e[n] = void 0;
    return this.set(e, $({}, t, { unset: !0 }));
  },
  hasChanged: function(t) {
    return t == null ? !Yt(this.changed) : ue(this.changed, t);
  },
  changedAttributes: function(t) {
    if (!t) return this.hasChanged() ? Ot(this.changed) : !1;
    var e = this._changing ? this._previousAttributes : this.attributes, n = {}, r;
    for (var i in t) {
      var s = t[i];
      Pe(e[i], s) || (n[i] = s, r = !0);
    }
    return r ? n : !1;
  },
  previous: function(t) {
    return t == null || !this._previousAttributes ? null : this._previousAttributes[t];
  },
  previousAttributes: function() {
    return Ot(this._previousAttributes);
  },
  clone: function() {
    return new this.constructor(this.attributes);
  },
  isValid: function(t) {
    return this._validate({}, $({}, t, { validate: !0 }));
  },
  _validate: function(t, e) {
    if (!e.validate || !this.validate) return !0;
    t = $({}, this.attributes, t);
    var n = this.validationError = this.validate(t, e) || null;
    return n ? (this.trigger("invalid", this, n, $(e, { validationError: n })), !1) : !0;
  }
});
Kt.extend = ds;
function Ec(t) {
  t = Ve(t);
  const e = pt(t).reduce(function(n, r) {
    return n[r.id] = r.clone(), n;
  }, {});
  return pt(t).forEach(function(n) {
    const r = e[n.id];
    if (r.isLink()) {
      const o = r.source(), a = r.target();
      o.id && e[o.id] && r.prop("source/id", e[o.id].id), a.id && e[a.id] && r.prop("target/id", e[a.id].id);
    }
    const i = n.get("parent");
    i && e[i] && r.set("parent", e[i].id);
    const s = pt(n.get("embeds")).reduce(function(o, a) {
      return e[a] && o.push(e[a].id), o;
    }, []);
    Yt(s) || r.set("embeds", s);
  }), e;
}
const Xf = [
  "checked",
  "selected",
  "disabled",
  "readOnly",
  "contentEditable",
  "value",
  "indeterminate"
], Jf = Xf.reduce((t, e) => (t[e] = !0, t), {}), Kf = {
  qualify: function(t) {
    return Tt(t);
  },
  set: function(t, e, n) {
    Object.keys(t).forEach(function(r) {
      if (Jf[r] && r in n) {
        const i = t[r];
        n.tagName === "SELECT" && Array.isArray(i) ? Array.from(n.options).forEach(function(s, o) {
          s.selected = i.includes(s.value);
        }) : n[r] = i;
      }
    });
  }
};
var Zf = Kf;
function ir(t, e, n) {
  return function(r, i) {
    var s = Wt(r);
    r = parseFloat(r), s && (r /= 100);
    var o;
    if (isFinite(r)) {
      var a = i[n]();
      s || r > 0 && r < 1 ? o = a[t] + i[e] * r : o = a[t] + r;
    }
    var c = E();
    return c[t] = o || 0, c;
  };
}
function be(t, e) {
  return function(n, r) {
    var i = Wt(n);
    n = parseFloat(n), i && (n /= 100);
    var s = {};
    if (isFinite(n)) {
      var o = i || n >= 0 && n <= 1 ? n * r[e] : Math.max(n + r[e], 0);
      s[t] = o;
    }
    return s;
  };
}
const zt = {
  "ref-x": { position: ir("x", "width", "origin") },
  "ref-y": { position: ir("y", "height", "origin") },
  "ref-dx": { position: ir("x", "width", "corner") },
  "ref-dy": { position: ir("y", "height", "corner") },
  "ref-width": { set: be("width", "width") },
  "ref-height": { set: be("height", "height") },
  "ref-rx": { set: be("rx", "width") },
  "ref-ry": { set: be("ry", "height") },
  "ref-cx": { set: be("cx", "width") },
  "ref-cy": { set: be("cy", "height") },
  "ref-r-inscribed": { set: (function(t) {
    var e = be(t, "width"), n = be(t, "height");
    return function(r, i) {
      var s = i.height > i.width ? e : n;
      return s(r, i);
    };
  })("r") },
  "ref-r-circumscribed": { set: function(t, e) {
    var n = Wt(t);
    t = parseFloat(t), n && (t /= 100);
    var r = Math.sqrt(e.height * e.height + e.width * e.width), i;
    return isFinite(t) && (n || t >= 0 && t <= 1 ? i = t * r : i = Math.max(t + r, 0)), { r: i };
  } }
};
zt.refX = zt["ref-x"];
zt.refY = zt["ref-y"];
zt["ref-x2"] = zt["ref-x"];
zt["ref-y2"] = zt["ref-y"];
zt["ref-width2"] = zt["ref-width"];
zt["ref-height2"] = zt["ref-height"];
zt["ref-r"] = zt["ref-r-inscribed"];
var Qf = zt;
const de = {
  x: "x",
  y: "y",
  width: "w",
  height: "h",
  minimum: "s",
  maximum: "l",
  diagonal: "d"
}, td = Object.keys(de).map((t) => de[t]).join(""), ti = "[-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?", ed = /\s/g, ro = new RegExp(`^(${ti}\\*)?([${td}])(/${ti})?([-+]{1,2}${ti})?$`, "g");
function Tc(t) {
  throw new Error(`Invalid calc() expression: ${t}`);
}
function nd(t, e) {
  const n = ro.exec(t.replace(ed, ""));
  n || Tc(t), ro.lastIndex = 0;
  const [, r, i, s, o] = n, { x: a, y: c, width: u, height: h } = e;
  let l = 0;
  switch (i) {
    case de.width:
      l = u;
      break;
    case de.height:
      l = h;
      break;
    case de.x:
      l = a;
      break;
    case de.y:
      l = c;
      break;
    case de.minimum:
      l = Math.min(h, u);
      break;
    case de.maximum:
      l = Math.max(h, u);
      break;
    case de.diagonal:
      l = Math.sqrt(h * h + u * u);
      break;
  }
  return r && (l *= parseFloat(r)), s && (l /= parseFloat(s.slice(1))), o && (l += rd(o)), l;
}
function rd(t) {
  if (!t) return 0;
  const [e] = t;
  switch (e) {
    case "+":
      return parseFloat(t.substr(1));
    case "-":
      return -parseFloat(t.substr(1));
  }
  return parseFloat(t);
}
function fn(t) {
  return typeof t == "string" && t.includes("calc");
}
const id = "calc(", io = 5;
function dn(t, e) {
  let n = t, r = 0;
  do {
    let i = n.indexOf(id, r);
    if (i === -1) return n;
    let s = i + io, o = 1;
    t: do {
      switch (n[s]) {
        case "(":
          o++;
          break;
        case ")":
          if (o--, o === 0) break t;
          break;
        case void 0:
          Tc(n);
      }
      s++;
    } while (!0);
    let a = n.slice(i + io, s);
    fn(a) && (a = dn(a, e));
    const c = String(nd(a, e));
    n = n.slice(0, i) + c + n.slice(s + 1), r = i + c.length;
  } while (!0);
}
function qe(t, e, n) {
  return n.text !== void 0;
}
const ei = [
  "font-weight",
  "font-family",
  "font-size",
  "letter-spacing",
  "text-transform"
], Cc = {
  "line-height": { qualify: qe },
  "text-vertical-anchor": { qualify: qe },
  "text-path": { qualify: qe },
  annotations: { qualify: qe },
  eol: { qualify: qe },
  "display-empty": { qualify: qe },
  text: {
    qualify: function(t, e, n) {
      const r = n["text-wrap"];
      return !r || !Tt(r);
    },
    unset: function(t) {
      t.textContent = "";
    },
    set: function(t, e, n, r) {
      const i = "joint-text", s = xt.data.get(n, i), o = r["line-height"], a = r["text-vertical-anchor"], c = r["display-empty"], u = r["font-size"], h = r.annotations, l = r.eol, d = r.x;
      let g = r["text-path"];
      const v = JSON.stringify([
        t,
        o,
        h,
        a,
        l,
        c,
        g,
        d,
        u
      ]);
      if (s === void 0 || s !== v) {
        if (u && n.setAttribute("font-size", u), gt(g)) {
          const y = g.selector;
          if (typeof y == "string") {
            const w = this.findNode(y);
            w instanceof SVGPathElement && (g = $({ "xlink:href": "#" + w.id }, g));
          }
        }
        B(n).text("" + t, {
          lineHeight: o,
          annotations: h,
          textPath: g,
          x: d,
          textVerticalAnchor: a,
          eol: l,
          displayEmpty: c
        }), xt.data.set(n, i, v);
      }
    }
  },
  "text-wrap": {
    qualify: Tt,
    set: function(t, e, n, r) {
      var i = {}, s = t.width || 0;
      Wt(s) ? i.width = e.width * parseFloat(s) / 100 : fn(s) ? i.width = Number(dn(s, e)) : t.width === null ? i.width = 1 / 0 : s <= 0 ? i.width = e.width + s : i.width = s;
      var o = t.height || 0;
      Wt(o) ? i.height = e.height * parseFloat(o) / 100 : fn(o) ? i.height = Number(dn(o, e)) : t.height === null || (o <= 0 ? i.height = e.height + o : i.height = o);
      var a, c = t.text;
      if (c === void 0 && (c = r.text), c !== void 0) {
        const u = t.breakText || Ff, h = getComputedStyle(n), l = {};
        for (let d = 0; d < ei.length; d++) {
          const g = ei[d];
          g in r && n.setAttribute(g, r[g]), l[g] = h[g];
        }
        l.lineHeight = r["line-height"], a = u("" + c, i, l, {
          svgDocument: this.paper.svg,
          ellipsis: t.ellipsis,
          hyphen: t.hyphen,
          separator: t.separator,
          maxLineCount: t.maxLineCount,
          preserveSpaces: t.preserveSpaces
        });
      } else a = "";
      Cc.text.set.call(this, a, e, n, r);
    },
    FONT_ATTRIBUTES: ei
  },
  title: {
    qualify: function(t, e) {
      return e instanceof SVGElement;
    },
    unset: function(t) {
      xt.data.remove(t, "joint-title");
      const e = t.firstElementChild;
      e && e.remove();
    },
    set: function(t, e, n) {
      var r = "joint-title", i = xt.data.get(n, r);
      if (i === void 0 || i !== t) {
        if (xt.data.set(n, r, t), n.tagName === "title") {
          n.textContent = t;
          return;
        }
        var s = n.firstElementChild;
        if (s && s.tagName === "title") s.textContent = t;
        else {
          var o = document.createElementNS(n.namespaceURI, "title");
          o.textContent = t, n.insertBefore(o, s);
        }
      }
    }
  }
};
var sd = Cc;
function sr(t, e) {
  var n = new E(1, 0);
  return function(r) {
    var i, s, o = this[t](r);
    return o ? (s = e.rotate ? o.vector().vectorAngle(n) : 0, i = o.start) : (i = this.path.start, s = 0), s === 0 ? { transform: "translate(" + i.x + "," + i.y + ")" } : { transform: "translate(" + i.x + "," + i.y + ") rotate(" + s + ")" };
  };
}
function Sn() {
  return this.model.isLink();
}
const Fn = {
  connection: {
    qualify: Sn,
    unset: "d",
    set: function({ stubs: t = 0 }) {
      let e;
      if (isFinite(t) && t !== 0) {
        let n;
        t < 0 ? n = (this.getConnectionLength() + t) / 2 : n = t;
        const r = this.getConnection(), i = this.getConnectionSubdivisions(), s = r.divideAtLength(n, { segmentSubdivisions: i }), o = r.divideAtLength(-n, { segmentSubdivisions: i });
        s && o && (e = `${s[0].serialize()} ${o[1].serialize()}`);
      }
      return { d: e || this.getSerializedConnection() };
    }
  },
  "at-connection-length-keep-gradient": {
    qualify: Sn,
    unset: "transform",
    set: sr("getTangentAtLength", { rotate: !0 })
  },
  "at-connection-length-ignore-gradient": {
    qualify: Sn,
    unset: "transform",
    set: sr("getTangentAtLength", { rotate: !1 })
  },
  "at-connection-ratio-keep-gradient": {
    qualify: Sn,
    unset: "transform",
    set: sr("getTangentAtRatio", { rotate: !0 })
  },
  "at-connection-ratio-ignore-gradient": {
    qualify: Sn,
    unset: "transform",
    set: sr("getTangentAtRatio", { rotate: !1 })
  }
};
Fn["at-connection-length"] = Fn["at-connection-length-keep-gradient"];
Fn["at-connection-ratio"] = Fn["at-connection-ratio-keep-gradient"];
var od = Fn;
function kc(t, e) {
  var n = "joint-shape", r = e && e.resetOffset;
  return function(i, s, o) {
    var a = xt.data.get(o, n);
    if (!a || a.value !== i) {
      var c = t(i);
      a = {
        value: i,
        shape: c,
        shapeBBox: c.bbox()
      }, xt.data.set(o, n, a);
    }
    var u = a.shape.clone(), h = a.shapeBBox.clone(), l = h.origin(), d = s.origin();
    h.x = d.x, h.y = d.y;
    var g = s.maxRectScaleToFit(h, d), v = h.width === 0 || s.width === 0 ? 1 : g.sx, y = h.height === 0 || s.height === 0 ? 1 : g.sy;
    return u.scale(v, y, l), r && u.translate(-l.x, -l.y), u;
  };
}
function so(t) {
  function e(r) {
    return new Z(B.normalizePathData(r));
  }
  var n = kc(e, t);
  return function(r, i, s) {
    var o = n(r, i, s);
    return { d: o.serialize() };
  };
}
function oo(t) {
  var e = kc(St, t);
  return function(n, r, i) {
    var s = e(n, r, i);
    return { points: s.serialize() };
  };
}
const Bn = {
  "ref-d-reset-offset": {
    unset: "d",
    set: so({ resetOffset: !0 })
  },
  "ref-d-keep-offset": {
    unset: "d",
    set: so({ resetOffset: !1 })
  },
  "ref-points-reset-offset": {
    unset: "points",
    set: oo({ resetOffset: !0 })
  },
  "ref-points-keep-offset": {
    unset: "points",
    set: oo({ resetOffset: !1 })
  }
};
Bn["ref-d"] = Bn["ref-d-reset-offset"];
Bn["ref-points"] = Bn["ref-points-reset-offset"];
var ad = Bn;
function ni(t) {
  var e = {}, n = t.stroke;
  typeof n == "string" && (e.stroke = n, e.fill = n);
  var r = t["stroke-opacity"];
  return r === void 0 && (r = t.opacity), r !== void 0 && (e["stroke-opacity"] = r, e["fill-opacity"] = r), e;
}
function ao(t) {
  const { paper: e } = this;
  return `url(#${t.type === "pattern" ? e.definePattern(t) : e.defineGradient(t)})`;
}
const cd = {
  "source-marker": {
    qualify: Tt,
    unset: "marker-start",
    set: function(t, e, n, r) {
      return t = $(ni(r), t), { "marker-start": "url(#" + this.paper.defineMarker(t) + ")" };
    }
  },
  "target-marker": {
    qualify: Tt,
    unset: "marker-end",
    set: function(t, e, n, r) {
      return t = $(ni(r), { transform: "rotate(180)" }, t), { "marker-end": "url(#" + this.paper.defineMarker(t) + ")" };
    }
  },
  "vertex-marker": {
    qualify: Tt,
    unset: "marker-mid",
    set: function(t, e, n, r) {
      return t = $(ni(r), t), { "marker-mid": "url(#" + this.paper.defineMarker(t) + ")" };
    }
  },
  fill: {
    qualify: Tt,
    set: ao
  },
  stroke: {
    qualify: Tt,
    set: ao
  },
  filter: {
    qualify: Tt,
    set: function(t) {
      return "url(#" + this.paper.defineFilter(t) + ")";
    }
  }
};
var ld = cd;
function co(t, e, n) {
  return function(r, i) {
    var s;
    r === "middle" ? s = i[e] / 2 : r === n ? s = i[e] : isFinite(r) ? s = r > -1 && r < 1 ? -i[e] * r : -r : Wt(r) ? s = i[e] * parseFloat(r) / 100 : s = 0;
    var o = new E();
    return o[t] = -(i[t] + s), o;
  };
}
const ud = {
  "x-alignment": { offset: co("x", "width", "right") },
  "y-alignment": { offset: co("y", "height", "bottom") },
  "reset-offset": { offset: function(t, e) {
    return t ? {
      x: -e.x,
      y: -e.y
    } : {
      x: 0,
      y: 0
    };
  } }
};
var hd = ud;
function lo(t) {
  return function(n, r, i) {
    const s = B(i);
    s.attr(t) !== n && s.attr(t, n);
  };
}
const We = {
  ref: {},
  href: { set: lo("href") },
  "xlink:href": { set: lo("xlink:href") },
  port: { set: function(t) {
    return t === null || t.id === void 0 ? t : t.id;
  } },
  style: {
    qualify: Tt,
    set: function(t, e, n) {
      xt(n).css(t);
    }
  },
  html: {
    unset: function(t) {
      xt(t).empty();
    },
    set: function(t, e, n) {
      xt(n).html(t + "");
    }
  },
  props: Zf
};
$(We, Qf);
$(We, sd);
$(We, od);
$(We, ad);
$(We, ld);
$(We, hd);
const Lc = We, fd = function(t, e) {
  if (Array.isArray(t)) return e;
};
function uo(t) {
  for (const e in t) {
    const n = t[e];
    gt(n) && !Array.isArray(n) && Yt(n) && delete t[e];
  }
}
const fe = Kt.extend({
  constructor: function(t, e) {
    var n, r = t || {};
    if (typeof this.preinitialize == "function" && this.preinitialize.apply(this, arguments), this.cid = Dn("c"), this.attributes = {}, e && e.collection && (this.collection = e.collection), e && e.parse && (r = this.parse(r, e) || {}), n = wt(this, "defaults")) {
      const i = e && e.mergeArrays === !0 ? !1 : fd;
      r = kt({}, n, r, i);
    }
    this.set(r, e), this.changed = {}, this.initialize.apply(this, arguments);
  },
  translate: function(t, e, n) {
    throw new Error("Must define a translate() method.");
  },
  toJSON: function(t) {
    const { ignoreDefaults: e, ignoreEmptyAttributes: n = !1 } = t || {}, r = wt(this.constructor.prototype, "defaults");
    if (e === !1) {
      const a = $t(this.attributes);
      return n && uo(a), a;
    }
    let i = {}, s = $t(this.attributes);
    e === !0 ? i = r : (Array.isArray(e) ? e : ["attrs"]).forEach((c) => {
      i[c] = r[c] || {};
    });
    const o = zf(s, $n(i, "id", "type"), { maxDepth: 4 });
    return n && uo(o), o;
  },
  initialize: function(t) {
    const e = this.getIdAttribute();
    (!t || t[e] === void 0) && this.set(e, this.generateId(), { silent: !0 }), this._transitionIds = {}, this._scheduledTransitionIds = {}, this.processPorts(), this.on("change:attrs", this.processPorts, this);
  },
  getIdAttribute: function() {
    return this.idAttribute || "id";
  },
  generateId: function() {
    return Mf();
  },
  processPorts: function() {
    var t = this.ports, e = {};
    ce(this.get("attrs"), function(s, o) {
      s && s.port && (s.port.id !== void 0 ? e[s.port.id] = s.port : e[s.port] = { id: s.port });
    });
    var n = {};
    if (ce(t, function(s, o) {
      e[o] || (n[o] = !0);
    }), this.graph && !Yt(n)) {
      var r = this.graph.getConnectedLinks(this, { inbound: !0 });
      r.forEach(function(s) {
        n[s.get("target").port] && s.remove();
      });
      var i = this.graph.getConnectedLinks(this, { outbound: !0 });
      i.forEach(function(s) {
        n[s.get("source").port] && s.remove();
      });
    }
    this.ports = e;
  },
  remove: function(t = {}) {
    const { graph: e, collection: n } = this;
    if (!e)
      return n && n.remove(this, t), this;
    e.startBatch("remove");
    const r = this.getParentCell();
    r && r.unembed(this, t);
    const i = this.getEmbeddedCells();
    for (let s = 0, o = i.length; s < o; s++) {
      const a = i[s];
      a && a.remove(t);
    }
    return this.trigger("remove", this, e.attributes.cells, t), e.stopBatch("remove"), this;
  },
  toFront: function(t) {
    var e = this.graph;
    if (e) {
      t = qt(t || {}, { foregroundEmbeds: !0 });
      let n;
      t.deep ? (n = this.getEmbeddedCells({
        deep: !0,
        breadthFirst: t.breadthFirst !== !1,
        sortSiblings: t.foregroundEmbeds
      }), n.unshift(this)) : n = [this];
      const r = t.foregroundEmbeds ? n : fr(n, (c) => c.z());
      let s = e.maxZIndex() - n.length + 1;
      const o = e.get("cells");
      let a = o.toArray().indexOf(r[0]) !== o.length - n.length;
      a || (a = r.some(function(c, u) {
        return c.z() !== s + u;
      })), a && (this.startBatch("to-front"), s = s + n.length, r.forEach(function(c, u) {
        c.set("z", s + u, t);
      }), this.stopBatch("to-front"));
    }
    return this;
  },
  toBack: function(t) {
    var e = this.graph;
    if (e) {
      t = qt(t || {}, { foregroundEmbeds: !0 });
      let r;
      t.deep ? (r = this.getEmbeddedCells({
        deep: !0,
        breadthFirst: t.breadthFirst !== !1,
        sortSiblings: t.foregroundEmbeds
      }), r.unshift(this)) : r = [this];
      const i = t.foregroundEmbeds ? r : fr(r, (a) => a.z());
      let s = e.minZIndex();
      var n = e.get("cells");
      let o = n.toArray().indexOf(i[0]) !== 0;
      o || (o = i.some(function(a, c) {
        return a.z() !== s + c;
      })), o && (this.startBatch("to-back"), s -= r.length, i.forEach(function(a, c) {
        a.set("z", s + c, t);
      }), this.stopBatch("to-back"));
    }
    return this;
  },
  parent: function(t, e) {
    return t === void 0 ? this.get("parent") : this.set("parent", t, e);
  },
  embed: function(t, e = {}) {
    const n = Array.isArray(t) ? t : [t];
    if (!this.canEmbed(n)) throw new Error("Recursive embedding not allowed.");
    if (e.reparent)
      Ve(n.map((i) => i.getParentCell())).forEach((i) => {
        i && i._unembedCells(n, e);
      });
    else if (n.some((r) => r.isEmbedded() && this.id !== r.parent())) throw new Error("Embedding of already embedded cells is not allowed.");
    return this._embedCells(n, e), this;
  },
  unembed: function(t, e) {
    const n = Array.isArray(t) ? t : [t];
    return this._unembedCells(n, e), this;
  },
  canEmbed: function(t) {
    return (Array.isArray(t) ? t : [t]).every((n) => this !== n && !this.isEmbeddedIn(n));
  },
  _embedCells: function(t, e) {
    const n = "embed";
    this.startBatch(n);
    const r = $([], this.get("embeds"));
    t.forEach((i) => {
      r[i.isLink() ? "unshift" : "push"](i.id), i.parent(this.id, e);
    }), this.set("embeds", Ve(r), e), this.stopBatch(n);
  },
  _unembedCells: function(t, e) {
    const n = "unembed";
    this.startBatch(n), t.forEach((r) => r.unset("parent", e)), this.set("embeds", Ys(this.get("embeds"), ...t.map((r) => r.id)), e), this.stopBatch(n);
  },
  getParentCell: function() {
    var t = this.parent(), e = this.graph;
    return t && e && e.getCell(t) || null;
  },
  getAncestors: function() {
    var t = [];
    if (!this.graph) return t;
    for (var e = this.getParentCell(); e; )
      t.push(e), e = e.getParentCell();
    return t;
  },
  getEmbeddedCells: function(t) {
    if (t = t || {}, !this.graph) return [];
    if (t.deep) return t.breadthFirst ? this._getEmbeddedCellsBfs(t.sortSiblings) : this._getEmbeddedCellsDfs(t.sortSiblings);
    const e = this.get("embeds");
    if (Yt(e)) return [];
    let n = e.map(this.graph.getCell, this.graph);
    return t.sortSiblings && (n = fr(n, (r) => r.z())), n;
  },
  _getEmbeddedCellsBfs: function(t) {
    const e = [], n = [];
    for (n.push(this); n.length > 0; ) {
      const r = n.shift();
      e.push(r);
      const i = r.getEmbeddedCells({ sortSiblings: t });
      n.push(...i);
    }
    return e.shift(), e;
  },
  _getEmbeddedCellsDfs: function(t) {
    const e = [], n = [];
    for (n.push(this); n.length > 0; ) {
      const r = n.pop();
      e.push(r);
      const i = r.getEmbeddedCells({ sortSiblings: t });
      for (let s = i.length - 1; s >= 0; --s) n.push(i[s]);
    }
    return e.shift(), e;
  },
  isEmbeddedIn: function(t, e) {
    var n = Ct(t) ? t : t.id, r = this.parent();
    if (e = $({ deep: !0 }, e), this.graph && e.deep) {
      for (; r; ) {
        if (r === n) return !0;
        r = this.graph.getCell(r).parent();
      }
      return !1;
    } else return r === n;
  },
  isEmbedded: function() {
    return !!this.parent();
  },
  clone: function(t) {
    if (t = t || {}, t.deep)
      return pt(Ec([this].concat(this.getEmbeddedCells({ deep: !0 }))));
    var e = Kt.prototype.clone.apply(this, arguments);
    return e.set(this.getIdAttribute(), this.generateId()), e.unset("embeds"), e.unset("parent"), e;
  },
  prop: function(t, e, n) {
    var r = "/", i = Ct(t);
    if (i || Array.isArray(t)) if (arguments.length > 1) {
      var s, o;
      i ? (s = t, o = s.split("/")) : (s = t.join(r), o = t.slice());
      var a = o[0], c = o.length;
      const T = n || {};
      T.propertyPath = s, T.propertyValue = e, T.propertyPathArray = o, "rewrite" in T || (T.rewrite = !1);
      for (var u = {}, h = u, l = a, d = 1; d < c; d++) {
        var g = o[d], v = Number.isFinite(i ? Number(g) : g);
        h = h[l] = v ? [] : {}, l = g;
      }
      u = Ks(u, o, e, "/");
      var y = kt({}, this.attributes);
      T.rewrite && Zs(y, s, "/");
      var w = kt(y, u);
      return this.set(a, w[a], T);
    } else return hn(this.attributes, t, r);
    const x = e || {};
    x.propertyPath = null, x.propertyValue = t, x.propertyPathArray = [], "rewrite" in x || (x.rewrite = !1);
    const P = {};
    for (const T in t) {
      const { changedValue: L } = kt({}, { changedValue: this.attributes[T] }, { changedValue: t[T] });
      P[T] = L;
    }
    return this.set(P, x);
  },
  removeProp: function(t, e) {
    e = e || {};
    var n = Array.isArray(t) ? t : t.split("/"), r = n[0];
    if (r === "attrs" && (e.dirty = !0), n.length === 1) return this.unset(t, e);
    var i = n.slice(1), s = this.get(r);
    return s == null ? this : (s = $t(s), Zs(s, i, "/"), this.set(r, s, e));
  },
  attr: function(t, e, n) {
    var r = Array.from(arguments);
    return r.length === 0 ? this.get("attrs") : (Array.isArray(t) ? r[0] = ["attrs"].concat(t) : Ct(t) ? r[0] = "attrs/" + t : r[0] = { attrs: t }, this.prop.apply(this, r));
  },
  removeAttr: function(t, e) {
    return Array.isArray(t) ? this.removeProp(["attrs"].concat(t)) : this.removeProp("attrs/" + t, e);
  },
  transition: function(t, e, n, r) {
    r = r || "/";
    var i = {
      duration: 100,
      delay: 10,
      timingFunction: Vf.linear,
      valueFunction: xc.number
    };
    n = $(i, n);
    var s = 0, o, a = (function(l) {
      var d, g, v;
      s = s || l, l -= s, g = l / n.duration, g < 1 ? this._transitionIds[t] = d = xi(a) : (g = 1, delete this._transitionIds[t]), v = o(n.timingFunction(g)), n.transitionId = d, this.prop(t, v, n), d || this.trigger("transition:end", this, t);
    }).bind(this);
    const { _scheduledTransitionIds: c } = this;
    let u;
    var h = (l) => {
      c[t] && (c[t] = Ys(c[t], u), c[t].length === 0 && delete c[t]), this.stopPendingTransitions(t, r), o = n.valueFunction(hn(this.attributes, t, r), e), this._transitionIds[t] = xi(l), this.trigger("transition:start", this, t);
    };
    return u = setTimeout(h, n.delay, a), c[t] || (c[t] = []), c[t].push(u), u;
  },
  getTransitions: function() {
    return wi(Object.keys(this._transitionIds), Object.keys(this._scheduledTransitionIds));
  },
  stopScheduledTransitions: function(t, e = "/") {
    const { _scheduledTransitionIds: n = {} } = this;
    let r = Object.keys(n);
    if (t) {
      const i = t.split(e);
      r = r.filter((s) => Pe(i, s.split(e).slice(0, i.length)));
    }
    return r.forEach((i) => {
      n[i].forEach((o) => clearTimeout(o)), delete n[i];
    }), this;
  },
  stopPendingTransitions(t, e = "/") {
    const { _transitionIds: n = {} } = this;
    let r = Object.keys(n);
    if (t) {
      const i = t.split(e);
      r = r.filter((s) => Pe(i, s.split(e).slice(0, i.length)));
    }
    r.forEach((i) => {
      const s = n[i];
      pr(s), delete n[i], this.trigger("transition:end", this, i);
    });
  },
  stopTransitions: function(t, e = "/") {
    return this.stopScheduledTransitions(t, e), this.stopPendingTransitions(t, e), this;
  },
  addTo: function(t, e) {
    return t.addCell(this, e), this;
  },
  findView: function(t) {
    return t.findViewByModel(this);
  },
  isElement: function() {
    return !1;
  },
  isLink: function() {
    return !1;
  },
  startBatch: function(t, e) {
    return this.graph && this.graph.startBatch(t, $({}, e, { cell: this })), this;
  },
  stopBatch: function(t, e) {
    return this.graph && this.graph.stopBatch(t, $({}, e, { cell: this })), this;
  },
  getChangeFlag: function(t) {
    var e = 0;
    if (!t) return e;
    for (var n in t)
      !t.hasOwnProperty(n) || !this.hasChanged(n) || (e |= t[n]);
    return e;
  },
  angle: function() {
    return 0;
  },
  position: function() {
    return new E(0, 0);
  },
  z: function() {
    return this.get("z") || 0;
  },
  getPointFromConnectedLink: function() {
    return new E();
  },
  getBBox: function() {
    return new j(0, 0, 0, 0);
  },
  getPointRotatedAroundCenter(t, e, n) {
    const r = new E(e, n);
    return t && r.rotate(this.getBBox().center(), t), r;
  },
  getAbsolutePointFromRelative(t, e) {
    return this.getPointRotatedAroundCenter(-this.angle(), this.position().offset(t, e));
  },
  getRelativePointFromAbsolute(t, e) {
    return this.getPointRotatedAroundCenter(this.angle(), t, e).difference(this.position());
  }
}, {
  getAttributeDefinition: function(t) {
    var e = this.attributes, n = Lc;
    return e && e[t] || n[t];
  },
  define: function(t, e, n, r) {
    n = $({ defaults: Ur({ type: t }, e, this.prototype.defaults) }, n);
    var i = this.extend(n, r);
    return typeof joint < "u" && ue(joint, "shapes") && Ks(joint.shapes, t, i, "."), i;
  }
}), dd = function(t, e, n) {
  if (Ct(n)) {
    if (!Si[n]) throw new Error('Unknown wrapper: "' + n + '"');
    n = Si[n];
  }
  if (!bt(n)) throw new Error("Wrapper must be a function.");
  pt(e).forEach(function(r) {
    t[r] = n(t[r]);
  });
}, Si = { cells: function(t) {
  return function() {
    var e = Array.from(arguments), n = e.length, r = n > 0 && e[0] || [], i = n > 1 && e[n - 1] || {};
    return Array.isArray(r) || (i instanceof fe ? r = e : r instanceof fe && (e.length > 1 && e.pop(), r = e)), i instanceof fe && (i = {}), t.call(this, r, i);
  };
} };
function gd(t, ...e) {
  const n = [];
  return t.forEach((i, s) => {
    n.push(i), s in e && n.push(e[s]);
  }), pd(n.join(""));
}
function pd(t) {
  const e = new DOMParser(), n = `<svg>${t.trim()}</svg>`;
  if (e.parseFromString(n.replace(/@/g, ""), "application/xml").getElementsByTagName("parsererror")[0]) throw new Error("Invalid SVG markup");
  const s = e.parseFromString(n, "text/html").querySelector("svg");
  return vd(s);
}
function _c(t) {
  const e = {}, { tagName: n, attributes: r, namespaceURI: i, style: s, childNodes: o } = t;
  e.namespaceURI = i, e.tagName = i === B.namespace.xhtml ? n.toLowerCase() : n;
  const a = {};
  for (var c = s.length; c--; ) {
    var u = s[c];
    a[u] = s.getPropertyValue(u);
  }
  e.style = a;
  const h = r.getNamedItem("@selector");
  h && (e.selector = h.value, r.removeNamedItem("@selector"));
  const l = r.getNamedItem("@group-selector");
  if (l) {
    const y = l.value.split(",");
    e.groupSelector = y.map((w) => w.trim()), r.removeNamedItem("@group-selector");
  }
  const d = r.getNamedItem("class");
  d && (e.className = d.value);
  const g = [];
  o.forEach((y) => {
    switch (y.nodeType) {
      case Node.TEXT_NODE: {
        const w = y.data.replace(/\s\s+/g, " ");
        w.trim() && g.push(w);
        break;
      }
      case Node.ELEMENT_NODE:
        g.push(_c(y));
        break;
    }
  }), g.length && (e.children = g);
  const v = {};
  return Array.from(r).forEach((y) => {
    const { name: w, value: x } = y;
    v[w] = x;
  }), Object.keys(v).length > 0 && (e.attributes = v), e;
}
function vd(t) {
  const e = [];
  return Array.from(t.children).forEach((n) => {
    e.push(_c(n));
  }), e;
}
const Pt = {
  TOP: "top",
  RIGHT: "right",
  BOTTOM: "bottom",
  LEFT: "left",
  TOP_LEFT: "top-left",
  TOP_RIGHT: "top-right",
  BOTTOM_LEFT: "bottom-left",
  BOTTOM_RIGHT: "bottom-right",
  CENTER: "center"
};
function Nc(t, e) {
  const n = new j(t);
  switch (e) {
    case void 0:
      throw new Error("Position required");
    case Pt.LEFT:
    case "leftMiddle":
      return n.leftMiddle();
    case Pt.RIGHT:
    case "rightMiddle":
      return n.rightMiddle();
    case Pt.TOP:
    case "topMiddle":
      return n.topMiddle();
    case Pt.BOTTOM:
    case "bottomMiddle":
      return n.bottomMiddle();
    case Pt.TOP_LEFT:
    case "topLeft":
    case "origin":
      return n.topLeft();
    case Pt.TOP_RIGHT:
    case "topRight":
      return n.topRight();
    case Pt.BOTTOM_LEFT:
    case "bottomLeft":
      return n.bottomLeft();
    case Pt.BOTTOM_RIGHT:
    case "bottomRight":
    case "corner":
      return n.bottomRight();
    case Pt.CENTER:
      return n.center();
    default:
      throw new Error(`Unknown position: ${e}`);
  }
}
var Mc = {};
Xt(Mc, {
  absolute: () => md,
  bottom: () => Ad,
  ellipse: () => Ed,
  ellipseSpread: () => Pd,
  fn: () => yd,
  left: () => wd,
  line: () => bd,
  right: () => xd,
  top: () => Sd
});
function Ic(t, e, n) {
  var r = t.toJSON();
  return r.angle = e || 0, qt({}, n, r);
}
function qn(t, e, n, r) {
  return t.map(function(i, s, o) {
    var a = this.pointAt((s + 0.5) / o.length);
    return (i.dx || i.dy) && a.offset(i.dx || 0, i.dy || 0), Ic(a.round(), 0, gs(r, i));
  }, Re(e, n));
}
function Oc(t, e, n, r) {
  var i = e.center(), s = e.width / e.height, o = e.topMiddle(), a = Vt.fromRect(e);
  return t.map(function(c, u, h) {
    var l = n + r(u, h.length), d = o.clone().rotate(i, -l).scale(s, 1, i), g = c.compensateRotation ? -a.tangentTheta(d) : 0;
    return (c.dx || c.dy) && d.offset(c.dx || 0, c.dy || 0), c.dr && d.move(i, c.dr), Ic(d.round(), g, gs(e, c));
  });
}
function gs(t, e) {
  let { x: n, y: r, angle: i } = e;
  return Wt(n) ? n = parseFloat(n) / 100 * t.width : fn(n) && (n = Number(dn(n, t))), Wt(r) ? r = parseFloat(r) / 100 * t.height : fn(r) && (r = Number(dn(r, t))), {
    x: n,
    y: r,
    angle: i
  };
}
function Ai(t, e) {
  const { x: n, y: r } = gs(t, e);
  return new E(n || 0, r || 0);
}
const md = function(t, e) {
  return t.map((n) => {
    const r = Ai(e, n).round().toJSON();
    return r.angle = n.angle || 0, r;
  });
}, yd = function(t, e, n) {
  return n.fn(t, e, n);
}, bd = function(t, e, n) {
  var r = Ai(e, n.start || e.origin()), i = Ai(e, n.end || e.corner());
  return qn(t, r, i, e);
}, wd = function(t, e, n) {
  return qn(t, e.origin(), e.bottomLeft(), e);
}, xd = function(t, e, n) {
  return qn(t, e.topRight(), e.corner(), e);
}, Sd = function(t, e, n) {
  return qn(t, e.origin(), e.topRight(), e);
}, Ad = function(t, e, n) {
  return qn(t, e.bottomLeft(), e.corner(), e);
}, Pd = function(t, e, n) {
  var r = n.startAngle || 0, i = n.step || 360 / t.length;
  return Oc(t, e, r, function(s) {
    return s * i;
  });
}, Ed = function(t, e, n) {
  var r = n.startAngle || 0, i = n.step || 20;
  return Oc(t, e, r, function(s, o) {
    return (s + 0.5 - o / 2) * i;
  });
};
var Rc = {};
Xt(Rc, {
  bottom: () => _d,
  inside: () => Od,
  insideOriented: () => Id,
  left: () => Cd,
  manual: () => Td,
  outside: () => Md,
  outsideOriented: () => Nd,
  radial: () => Rd,
  radialOriented: () => Dd,
  right: () => kd,
  top: () => Ld
});
function ke(t, e) {
  return Ur({}, t, e, {
    x: 0,
    y: 0,
    angle: 0,
    attrs: {}
  });
}
function Dc(t) {
  var e = t.center(), n = e.theta(t.origin()), r = e.theta(t.bottomLeft()), i = e.theta(t.corner()), s = e.theta(t.topRight());
  return [
    n,
    s,
    i,
    r
  ];
}
function Fc(t, e, n, r) {
  r = qt({}, r, { offset: 15 });
  var i = e.center().theta(t), s, o, a, c, u = r.offset, h = 0;
  const [l, d, g, v] = Dc(e);
  i < d || i > g ? (a = ".3em", s = u, o = 0, c = "start") : i < l ? (s = 0, o = -u, n ? (h = -90, c = "start", a = ".3em") : (c = "middle", a = "0")) : i < v ? (a = ".3em", s = -u, o = 0, c = "end") : (s = 0, o = u, n ? (h = 90, c = "start", a = ".3em") : (c = "middle", a = ".6em"));
  var y = Math.round;
  return ke(r, {
    x: y(s),
    y: y(o),
    angle: h,
    attrs: { labelText: {
      y: a,
      textAnchor: c
    } }
  });
}
function Bc(t, e, n, r) {
  r = qt({}, r, { offset: 15 });
  var i = e.center().theta(t), s, o, a, c, u = r.offset, h = 0;
  const [l, d, g, v] = Dc(e);
  i < d || i > g ? (a = ".3em", s = -u, o = 0, c = "end") : i < l ? (s = 0, o = u, n ? (h = 90, c = "start", a = ".3em") : (c = "middle", a = ".6em")) : i < v ? (a = ".3em", s = u, o = 0, c = "start") : (s = 0, o = -u, n ? (h = -90, c = "start", a = ".3em") : (c = "middle", a = "0"));
  var y = Math.round;
  return ke(r, {
    x: y(s),
    y: y(o),
    angle: h,
    attrs: { labelText: {
      y: a,
      textAnchor: c
    } }
  });
}
function Vc(t, e, n) {
  n = qt({}, n, { offset: 20 });
  var r = xr(0, 0), i = -t.theta(r), s = i, o = t.clone().move(r, n.offset).difference(t).round(), a = ".3em", c;
  (i + 90) % 180 === 0 ? (c = e ? "end" : "middle", !e && i === -270 && (a = "0em")) : i > -270 && i < -90 ? (c = "start", s = i - 180) : c = "end";
  var u = Math.round;
  return ke(n, {
    x: u(o.x),
    y: u(o.y),
    angle: e ? s : 0,
    attrs: { labelText: {
      y: a,
      textAnchor: c
    } }
  });
}
const Td = function(t, e, n) {
  return ke(n);
}, Cd = function(t, e, n) {
  return ke(n, {
    x: -15,
    attrs: { labelText: {
      y: ".3em",
      textAnchor: "end"
    } }
  });
}, kd = function(t, e, n) {
  return ke(n, {
    x: 15,
    attrs: { labelText: {
      y: ".3em",
      textAnchor: "start"
    } }
  });
}, Ld = function(t, e, n) {
  return ke(n, {
    y: -15,
    attrs: { labelText: {
      y: "0",
      textAnchor: "middle"
    } }
  });
}, _d = function(t, e, n) {
  return ke(n, {
    y: 15,
    attrs: { labelText: {
      y: ".6em",
      textAnchor: "middle"
    } }
  });
}, Nd = function(t, e, n) {
  return Fc(t, e, !0, n);
}, Md = function(t, e, n) {
  return Fc(t, e, !1, n);
}, Id = function(t, e, n) {
  return Bc(t, e, !0, n);
}, Od = function(t, e, n) {
  return Bc(t, e, !1, n);
}, Rd = function(t, e, n) {
  return Vc(t.difference(e.center()), !1, n);
}, Dd = function(t, e, n) {
  return Vc(t.difference(e.center()), !0, n);
};
var Gc = function(t) {
  var e = $t(t) || {};
  this.ports = [], this.groups = {}, this.portLayoutNamespace = Mc, this.portLabelLayoutNamespace = Rc, this._init(e);
};
Gc.prototype = {
  getPorts: function() {
    return this.ports;
  },
  getGroup: function(t) {
    return this.groups[t] || {};
  },
  getPortsByGroup: function(t) {
    return this.ports.filter(function(e) {
      return e.group === t;
    });
  },
  getGroupPortsMetrics: function(t, e) {
    var n = this.getGroup(t), r = this.getPortsByGroup(t), i = n.position || {}, s = i.name, o = this.portLayoutNamespace;
    o[s] || (s = "left");
    var a = i.args || {}, c = r.map(function(l) {
      return l && l.position && l.position.args;
    }), u = o[s](c, e, a), h = {
      ports: r,
      result: []
    };
    return pt(u).reduce((function(l, d, g) {
      var v = l.ports[g];
      return l.result.push({
        portId: v.id,
        portTransformation: d,
        labelTransformation: this._getPortLabelLayout(v, E(d), e),
        portAttrs: v.attrs,
        portSize: v.size,
        labelSize: v.label.size
      }), l;
    }).bind(this), h), h.result;
  },
  _getPortLabelLayout: function(t, e, n) {
    var r = this.portLabelLayoutNamespace, i = t.label.position.name || "left";
    return r[i] ? r[i](e, n, t.label.position.args) : null;
  },
  _init: function(t) {
    if (gt(t.groups))
      for (var e = Object.keys(t.groups), n = 0, r = e.length; n < r; n++) {
        var i = e[n];
        this.groups[i] = this._evaluateGroup(t.groups[i]);
      }
    for (var s = pt(t.items), o = 0, a = s.length; o < a; o++) this.ports.push(this._evaluatePort(s[o]));
  },
  _evaluateGroup: function(t) {
    return kt(t, {
      position: this._getPosition(t.position, !0),
      label: this._getLabel(t, !0)
    });
  },
  _evaluatePort: function(t) {
    var e = $({}, t), n = this.getGroup(t.group);
    return e.markup = e.markup || n.markup, e.attrs = kt({}, n.attrs, e.attrs), e.position = this._createPositionNode(n, e), e.label = kt({}, n.label, this._getLabel(e)), e.z = this._getZIndex(n, e), e.size = $({}, n.size, e.size), e;
  },
  _getZIndex: function(t, e) {
    return Ft(e.z) ? e.z : Ft(t.z) || t.z === "auto" ? t.z : "auto";
  },
  _createPositionNode: function(t, e) {
    return kt({
      name: "left",
      args: {}
    }, t.position, { args: e.args });
  },
  _getPosition: function(t, e) {
    var n = {}, r;
    bt(t) ? (r = "fn", n.fn = t) : Ct(t) ? r = t : t === void 0 ? r = e ? "left" : null : Array.isArray(t) ? (r = "absolute", n.x = t[0], n.y = t[1]) : gt(t) && (r = t.name, $(n, t.args));
    var i = { args: n };
    return r && (i.name = r), i;
  },
  _getLabel: function(t, e) {
    var n = t.label || {}, r = n;
    return r.position = this._getPosition(n.position, e), r;
  }
};
const Fd = {
  _initializePorts: function() {
    this._createPortData(), this.on("change:ports", function() {
      this._processRemovedPort(), this._createPortData();
    }, this);
  },
  _processRemovedPort: function() {
    var t = this.get("ports") || {}, e = {};
    pt(t.items).forEach(function(a) {
      e[a.id] = !0;
    });
    var n = this.previous("ports") || {}, r = {};
    pt(n.items).forEach(function(a) {
      e[a.id] || (r[a.id] = !0);
    });
    var i = this.graph;
    if (i && !Yt(r)) {
      var s = i.getConnectedLinks(this, { inbound: !0 });
      s.forEach(function(a) {
        r[a.get("target").port] && a.remove();
      });
      var o = i.getConnectedLinks(this, { outbound: !0 });
      o.forEach(function(a) {
        r[a.get("source").port] && a.remove();
      });
    }
  },
  hasPorts: function() {
    var t = this.prop("ports/items");
    return Array.isArray(t) && t.length > 0;
  },
  hasPort: function(t) {
    return this.getPortIndex(t) !== -1;
  },
  getPorts: function() {
    return $t(this.prop("ports/items")) || [];
  },
  getGroupPorts: function(t) {
    const e = pt(this.prop(["ports", "items"])).filter((n) => n.group === t);
    return $t(e);
  },
  getPort: function(t) {
    return $t(pt(this.prop("ports/items")).find(function(e) {
      return e.id && e.id === t;
    }));
  },
  getPortGroupNames: function() {
    return Object.keys(this._portSettingsData.groups);
  },
  getPortsPositions: function(t) {
    var e = this._portSettingsData.getGroupPortsMetrics(t, j(this.size()));
    return e.reduce(function(n, r) {
      var i = r.portTransformation;
      return n[r.portId] = {
        x: i.x,
        y: i.y,
        angle: i.angle
      }, n;
    }, {});
  },
  getPortIndex: function(t) {
    var e = gt(t) ? t.id : t;
    return this._isValidPortId(e) ? pt(this.prop("ports/items")).findIndex(function(n) {
      return n.id === e;
    }) : -1;
  },
  addPort: function(t, e) {
    if (!gt(t) || Array.isArray(t)) throw new Error("Element: addPort requires an object.");
    var n = $([], this.prop("ports/items"));
    return n.push(t), this.prop("ports/items", n, e), this;
  },
  insertPort: function(t, e, n) {
    const r = typeof t == "number" ? t : this.getPortIndex(t);
    if (!gt(e) || Array.isArray(e)) throw new Error("dia.Element: insertPort requires an object.");
    const i = $([], this.prop("ports/items"));
    return i.splice(r, 0, e), this.prop("ports/items", i, n), this;
  },
  portProp: function(t, e, n, r) {
    var i = this.getPortIndex(t);
    if (i === -1) throw new Error("Element: unable to find port with id " + t);
    var s = Array.prototype.slice.call(arguments, 1);
    return Array.isArray(e) ? s[0] = [
      "ports",
      "items",
      i
    ].concat(e) : Ct(e) ? s[0] = [
      "ports/items/",
      i,
      "/",
      e
    ].join("") : (s = ["ports/items/" + i], Tt(e) && (s.push(e), s.push(n))), this.prop.apply(this, s);
  },
  _validatePorts: function() {
    var t = this.get("ports") || {}, e = [];
    t = t || {};
    var n = pt(t.items);
    return n.forEach(function(r) {
      typeof r != "object" && e.push("Element: invalid port ", r), this._isValidPortId(r.id) || (r.id = this.generatePortId());
    }, this), Ve(n, "id").length !== n.length && e.push("Element: found id duplicities in ports."), e;
  },
  generatePortId: function() {
    return this.generateId();
  },
  _isValidPortId: function(t) {
    return t != null && !gt(t);
  },
  addPorts: function(t, e) {
    return t.length && this.prop("ports/items", $([], this.prop("ports/items")).concat(t), e), this;
  },
  removePort: function(t, e) {
    const n = e || {}, r = this.getPortIndex(t);
    if (r !== -1) {
      const i = $([], this.prop(["ports", "items"]));
      i.splice(r, 1), n.rewrite = !0, this.startBatch("port-remove"), this.prop(["ports", "items"], i, n), this.stopBatch("port-remove");
    }
    return this;
  },
  removePorts: function(t, e) {
    let n, r;
    if (Array.isArray(t)) {
      if (n = e || {}, t.length === 0) return this.this;
      r = $([], this.prop(["ports", "items"])).filter(function(s) {
        return !t.some(function(o) {
          const a = gt(o) ? o.id : o;
          return s.id === a;
        });
      });
    } else
      n = t || {}, r = [];
    return this.startBatch("port-remove"), n.rewrite = !0, this.prop(["ports", "items"], r, n), this.stopBatch("port-remove"), this;
  },
  _createPortData: function() {
    var t = this._validatePorts();
    if (t.length > 0)
      throw this.set("ports", this.previous("ports")), new Error(t.join(" "));
    var e;
    this._portSettingsData && (e = this._portSettingsData.getPorts()), this._portSettingsData = new Gc(this.get("ports"));
    var n = this._portSettingsData.getPorts();
    if (e) {
      var r = n.filter(function(s) {
        if (!e.find(function(o) {
          return o.id === s.id;
        })) return s;
      }), i = e.filter(function(s) {
        if (!n.find(function(o) {
          return o.id === s.id;
        })) return s;
      });
      i.length > 0 && this.trigger("ports:remove", this, i), r.length > 0 && this.trigger("ports:add", this, r);
    }
  }
}, Bd = {
  portContainerMarkup: "g",
  portMarkup: [{
    tagName: "circle",
    selector: "circle",
    attributes: {
      r: 10,
      fill: "#FFFFFF",
      stroke: "#000000"
    }
  }],
  portLabelMarkup: [{
    tagName: "text",
    selector: "text",
    attributes: { fill: "#000000" }
  }],
  _portElementsCache: null,
  _initializePorts: function() {
    this._cleanPortsCache();
  },
  _refreshPorts: function() {
    this._removePorts(), this._cleanPortsCache(), this._renderPorts();
  },
  _cleanPortsCache: function() {
    this._portElementsCache = {};
  },
  _renderPorts: function() {
    for (var t = [], e = this._getContainerElement(), n = 0, r = e.node.childNodes.length; n < r; n++) t.push(e.node.childNodes[n]);
    var i = Gh(this.model._portSettingsData.getPorts(), "z"), s = "auto";
    pt(i[s]).forEach(function(h) {
      var l = this._getPortElement(h);
      e.append(l), t.push(l);
    }, this);
    for (var o = Object.keys(i), a = 0; a < o.length; a++) {
      var c = o[a];
      if (c !== s) {
        var u = parseInt(c, 10);
        this._appendPorts(i[c], u, t);
      }
    }
    this._updatePorts();
  },
  _getContainerElement: function() {
    return this.rotatableNode || this.vel;
  },
  _appendPorts: function(t, e, n) {
    var r = this._getContainerElement(), i = pt(t).map(this._getPortElement, this);
    n[e] || e < 0 ? B(n[Math.max(e, 0)]).before(i) : r.append(i);
  },
  _getPortElement: function(t) {
    return this._portElementsCache[t.id] ? this._portElementsCache[t.id].portElement : this._createPortElement(t);
  },
  findPortNodes: function(t, e) {
    const n = this._portElementsCache[t];
    if (!n) return [];
    if (!e) return [n.portContentElement.node];
    const r = n.portElement.node, i = n.portSelectors;
    return this.findBySelector(e, r, i);
  },
  findPortNode: function(t, e) {
    const [n = null] = this.findPortNodes(t, e);
    return n;
  },
  _updatePorts: function() {
    this._updatePortGroup(void 0);
    var t = Object.keys(this.model._portSettingsData.groups);
    t.forEach(this._updatePortGroup, this);
  },
  _removePorts: function() {
    le(this._portElementsCache, "portElement.remove");
  },
  _createPortElement: function(t) {
    let e, n, r, i;
    var s = B(this.portContainerMarkup).addClass("joint-port"), o = this._getPortMarkup(t);
    if (Array.isArray(o)) {
      var a = this.parseDOMJSON(o, s.node), c = a.fragment;
      c.childNodes.length > 1 ? e = B("g").append(c) : e = B(c.firstChild), i = a.selectors;
    } else
      e = B(o), Array.isArray(e) && (e = B("g").append(e));
    if (!e) throw new Error("ElementView: Invalid port markup.");
    e.attr({
      port: t.id,
      "port-group": t.group
    }), Ft(t.id) && e.attr("port-id-type", "number");
    const u = this._getPortLabelMarkup(t.label);
    if (Array.isArray(u)) {
      const { fragment: y, selectors: w } = this.parseDOMJSON(u, s.node), x = y.childNodes.length;
      x > 0 && (r = w, n = x === 1 ? B(y.firstChild) : B("g").append(y));
    } else
      n = B(u), Array.isArray(n) && (n = B("g").append(n));
    var h;
    if (i && r) {
      for (var l in r) if (i[l] && l !== this.selector) throw new Error("ElementView: selectors within port must be unique.");
      h = $({}, i, r);
    } else h = i || r || {};
    const d = "portRoot", g = "labelRoot", v = "labelText";
    if (d in h || (h[d] = e.node), n) {
      const y = n.node;
      if (g in h || (h[g] = y), !(v in h)) {
        const w = n.tagName() === "TEXT" ? y : Array.from(y.querySelectorAll("text"));
        h[v] = w, r || (r = {}), r[v] = w;
      }
    }
    return s.append(e.addClass("joint-port-body")), n && s.append(n.addClass("joint-port-label")), this._portElementsCache[t.id] = {
      portElement: s,
      portLabelElement: n,
      portSelectors: h,
      portLabelSelectors: r,
      portContentElement: e,
      portContentSelectors: i
    }, s;
  },
  _updatePortGroup: function(t) {
    for (var e = j(this.model.size()), n = this.model._portSettingsData.getGroupPortsMetrics(t, e), r = 0, i = n.length; r < i; r++) {
      var s = n[r], o = s.portId, a = this._portElementsCache[o] || {}, c = s.portTransformation, u = s.labelTransformation;
      u && a.portLabelElement && (this.updateDOMSubtreeAttributes(a.portLabelElement.node, u.attrs, {
        rootBBox: new j(s.labelSize),
        selectors: a.portLabelSelectors
      }), this.applyPortTransform(a.portLabelElement, u, -c.angle || 0)), this.updateDOMSubtreeAttributes(a.portElement.node, s.portAttrs, {
        rootBBox: new j(s.portSize),
        selectors: a.portSelectors
      }), this.applyPortTransform(a.portElement, c);
    }
  },
  applyPortTransform: function(t, e, n) {
    var r = B.createSVGMatrix().rotate(n || 0).translate(e.x || 0, e.y || 0).rotate(e.angle || 0);
    t.transform(r, { absolute: !0 });
  },
  _getPortMarkup: function(t) {
    return t.markup || this.model.get("portMarkup") || this.model.portMarkup || this.portMarkup;
  },
  _getPortLabelMarkup: function(t) {
    return t.markup || this.model.get("portLabelMarkup") || this.model.portLabelMarkup || this.portLabelMarkup;
  }
}, It = fe.extend({
  defaults: {
    position: {
      x: 0,
      y: 0
    },
    size: {
      width: 1,
      height: 1
    },
    angle: 0
  },
  initialize: function() {
    this._initializePorts(), fe.prototype.initialize.apply(this, arguments);
  },
  _initializePorts: function() {
  },
  _refreshPorts: function() {
  },
  isElement: function() {
    return !0;
  },
  position: function(t, e, n) {
    const r = Ft(e);
    n = (r ? n : t) || {};
    const { parentRelative: i, deep: s, restrictedArea: o } = n;
    let a;
    if (i) {
      if (!this.graph) throw new Error("Element must be part of a graph.");
      const c = this.getParentCell();
      c && !c.isLink() && (a = c.get("position"));
    }
    if (r) {
      if (a && (t += a.x, e += a.y), s || o) {
        const { x: c, y: u } = this.get("position");
        this.translate(t - c, e - u, n);
      } else this.set("position", {
        x: t,
        y: e
      }, n);
      return this;
    } else {
      const c = E(this.get("position"));
      return i ? c.difference(a) : c;
    }
  },
  translate: function(t, e, n) {
    if (t = t || 0, e = e || 0, t === 0 && e === 0) return this;
    n = n || {}, n.translateBy = n.translateBy || this.id;
    var r = this.get("position") || {
      x: 0,
      y: 0
    }, i = n.restrictedArea;
    if (i && n.translateBy === this.id) if (typeof i == "function") {
      var s = i.call(this, r.x + t, r.y + e, n);
      t = s.x - r.x, e = s.y - r.y;
    } else {
      var o = this.getBBox({ deep: !0 }), a = r.x - o.x, c = r.y - o.y, u = Math.max(i.x + a, Math.min(i.x + i.width + a - o.width, r.x + t)), h = Math.max(i.y + c, Math.min(i.y + i.height + c - o.height, r.y + e));
      t = u - r.x, e = h - r.y;
    }
    var l = {
      x: r.x + t,
      y: r.y + e
    };
    return n.tx = t, n.ty = e, n.transition ? (gt(n.transition) || (n.transition = {}), this.transition("position", l, $({}, n.transition, { valueFunction: xc.object })), le(this.getEmbeddedCells(), "translate", t, e, n)) : (this.startBatch("translate", n), this.set("position", l, n), le(this.getEmbeddedCells(), "translate", t, e, n), this.stopBatch("translate", n)), this;
  },
  size: function(t, e, n) {
    var r = this.get("size");
    return t === void 0 ? {
      width: r.width,
      height: r.height
    } : (gt(t) && (n = e, e = Ft(t.height) ? t.height : r.height, t = Ft(t.width) ? t.width : r.width), this.resize(t, e, n));
  },
  resize: function(t, e, n) {
    if (n = n || {}, this.startBatch("resize", n), n.direction) {
      var r = this.get("size");
      switch (n.direction) {
        case "left":
        case "right":
          e = r.height;
          break;
        case "top":
        case "bottom":
          t = r.width;
          break;
      }
      var i = Qt(this.get("angle") || 0), s = this.getBBox(), o;
      if (i) {
        var a = {
          "top-right": 0,
          right: 0,
          "top-left": 1,
          top: 1,
          "bottom-left": 2,
          left: 2,
          "bottom-right": 3,
          bottom: 3
        }[n.direction];
        n.absolute && (a += Math.floor((i + 45) / 90), a %= 4);
        var c = s[[
          "bottomLeft",
          "corner",
          "topRight",
          "origin"
        ][a]](), u = E(c).rotate(s.center(), -i), h = Math.sqrt(t * t + e * e) / 2, l = a * Math.PI / 2;
        l += Math.atan(a % 2 == 0 ? e / t : t / e), l -= Ut(i);
        var d = E.fromPolar(h, l, u);
        o = E(d).offset(t / -2, e / -2);
      } else
        switch (o = s.topLeft(), n.direction) {
          case "top":
          case "top-right":
            o.offset(0, s.height - e);
            break;
          case "left":
          case "bottom-left":
            o.offset(s.width - t, 0);
            break;
          case "top-left":
            o.offset(s.width - t, s.height - e);
            break;
        }
      this.set("size", {
        width: t,
        height: e
      }, n), this.position(o.x, o.y, n);
    } else this.set("size", {
      width: t,
      height: e
    }, n);
    return this.stopBatch("resize", n), this;
  },
  scale: function(t, e, n, r) {
    var i = this.getBBox().scale(t, e, n);
    return this.startBatch("scale", r), this.position(i.x, i.y, r), this.resize(i.width, i.height, r), this.stopBatch("scale"), this;
  },
  fitEmbeds: function(t) {
    return this.fitToChildren(t);
  },
  fitToChildren: function(t = {}) {
    const { graph: e } = this;
    if (!e) throw new Error("Element must be part of a graph.");
    const n = this.getEmbeddedCells().filter((r) => r.isElement());
    return n.length === 0 ? this : (this.startBatch("fit-embeds", t), t.deep && le(n, "fitToChildren", t), this._fitToElements(Object.assign({ elements: n }, t)), this.stopBatch("fit-embeds"), this);
  },
  fitParent: function(t = {}) {
    const { graph: e } = this;
    if (!e) throw new Error("Element must be part of a graph.");
    if (t.deep && t.terminator && (t.terminator === this || t.terminator === this.id)) return this;
    const n = this.getParentCell();
    if (!n || !n.isElement()) return this;
    const r = n.getEmbeddedCells().filter((i) => i.isElement());
    return r.length === 0 ? this : (this.startBatch("fit-parent", t), n._fitToElements(Object.assign({ elements: r }, t)), t.deep && n.fitParent(t), this.stopBatch("fit-parent"), this);
  },
  _fitToElements: function(t = {}) {
    const e = this.graph.getCellsBBox(t.elements);
    if (!e) return;
    const { expandOnly: n, shrinkOnly: r } = t;
    if (n && r) return;
    let { x: i, y: s, width: o, height: a } = e;
    const { left: c, right: u, top: h, bottom: l } = ze(t.padding);
    i -= c, s -= h, o += c + u, a += l + h;
    let d = new j(i, s, o, a);
    if (n) d = this.getBBox().union(d);
    else if (r) {
      const g = this.getBBox().intersect(d);
      if (!g) return;
      d = g;
    }
    this.set({
      position: {
        x: d.x,
        y: d.y
      },
      size: {
        width: d.width,
        height: d.height
      }
    }, t);
  },
  rotate: function(t, e, n, r) {
    if (n) {
      var i = this.getBBox().center(), s = this.get("size"), o = this.get("position");
      i.rotate(n, this.get("angle") - t);
      var a = i.x - s.width / 2 - o.x, c = i.y - s.height / 2 - o.y;
      this.startBatch("rotate", {
        angle: t,
        absolute: e,
        origin: n
      }), this.position(o.x + a, o.y + c, r), this.rotate(t, e, null, r), this.stopBatch("rotate");
    } else this.set("angle", e ? t : (this.get("angle") + t) % 360, r);
    return this;
  },
  angle: function() {
    return Qt(this.get("angle") || 0);
  },
  getBBox: function(t = {}) {
    const { graph: e, attributes: n } = this, { deep: r, rotate: i } = t;
    if (r && e) {
      const l = this.getEmbeddedCells({
        deep: !0,
        breadthFirst: !0
      });
      return l.push(this), e.getCellsBBox(l, t);
    }
    const { angle: s = 0, position: { x: o, y: a }, size: { width: c, height: u } } = n, h = new j(o, a, c, u);
    return i && h.rotateAroundCenter(s), h;
  },
  getPointFromConnectedLink: function(t, e) {
    var n = this.getBBox(), r = n.center(), i = t.get(e);
    if (!i) return r;
    var s = i.port;
    if (!s || !this.hasPort(s)) return r;
    var o = this.portProp(s, ["group"]), a = this.getPortsPositions(o), c = new E(a[s]).offset(n.origin()), u = this.angle();
    return u && c.rotate(r, -u), c;
  }
});
$(It.prototype, Fd);
const gn = fe.extend({
  defaultLabel: void 0,
  labelMarkup: void 0,
  _builtins: { defaultLabel: {
    markup: [{
      tagName: "rect",
      selector: "rect"
    }, {
      tagName: "text",
      selector: "text"
    }],
    attrs: {
      text: {
        fill: "#000000",
        fontSize: 14,
        textAnchor: "middle",
        textVerticalAnchor: "middle",
        pointerEvents: "none"
      },
      rect: {
        ref: "text",
        fill: "#ffffff",
        rx: 3,
        ry: 3,
        x: "calc(x)",
        y: "calc(y)",
        width: "calc(w)",
        height: "calc(h)"
      }
    },
    position: { distance: 0.5 }
  } },
  defaults: {
    source: {},
    target: {}
  },
  isLink: function() {
    return !0;
  },
  disconnect: function(t) {
    return this.set({
      source: {
        x: 0,
        y: 0
      },
      target: {
        x: 0,
        y: 0
      }
    }, t);
  },
  source: function(t, e, n) {
    if (t === void 0) return Ot(this.get("source"));
    var r, i, s = t instanceof fe;
    if (s)
      return r = Ot(e) || {}, r.id = t.id, i = n, this.set("source", r, i);
    var o = !Tt(t);
    return o ? (r = Ot(e) || {}, r.x = t.x, r.y = t.y, i = n, this.set("source", r, i)) : (r = t, i = e, this.set("source", r, i));
  },
  target: function(t, e, n) {
    if (t === void 0) return Ot(this.get("target"));
    var r, i, s = t instanceof fe;
    if (s)
      return r = Ot(e) || {}, r.id = t.id, i = n, this.set("target", r, i);
    var o = !Tt(t);
    return o ? (r = Ot(e) || {}, r.x = t.x, r.y = t.y, i = n, this.set("target", r, i)) : (r = t, i = e, this.set("target", r, i));
  },
  router: function(t, e, n) {
    if (t === void 0) {
      var r = this.get("router");
      return r ? typeof r == "object" ? Ot(r) : r : null;
    }
    var i = typeof t == "object" || typeof t == "function", s = i ? t : {
      name: t,
      args: e
    }, o = i ? e : n;
    return this.set("router", s, o);
  },
  connector: function(t, e, n) {
    if (t === void 0) {
      var r = this.get("connector");
      return r ? typeof r == "object" ? Ot(r) : r : null;
    }
    var i = typeof t == "object" || typeof t == "function", s = i ? t : {
      name: t,
      args: e
    }, o = i ? e : n;
    return this.set("connector", s, o);
  },
  label: function(t, e, n) {
    var r = this.labels();
    return t = isFinite(t) && t !== null ? t | 0 : 0, t < 0 && (t = r.length + t), arguments.length <= 1 ? this.prop(["labels", t]) : this.prop(["labels", t], e, n);
  },
  labels: function(t, e) {
    return arguments.length === 0 ? (t = this.get("labels"), Array.isArray(t) ? t.slice() : []) : (Array.isArray(t) || (t = []), this.set("labels", t, e));
  },
  hasLabels: function() {
    const { labels: t } = this.attributes;
    return Array.isArray(t) && t.length > 0;
  },
  insertLabel: function(t, e, n) {
    if (!e) throw new Error("dia.Link: no label provided");
    var r = this.labels(), i = r.length;
    return t = isFinite(t) && t !== null ? t | 0 : i, t < 0 && (t = i + t + 1), r.splice(t, 0, e), this.labels(r, n);
  },
  appendLabel: function(t, e) {
    return this.insertLabel(-1, t, e);
  },
  removeLabel: function(t, e) {
    var n = this.labels();
    return t = isFinite(t) && t !== null ? t | 0 : -1, n.splice(t, 1), this.labels(n, e);
  },
  vertex: function(t, e, n) {
    var r = this.vertices();
    if (t = isFinite(t) && t !== null ? t | 0 : 0, t < 0 && (t = r.length + t), arguments.length <= 1) return this.prop(["vertices", t]);
    var i = this._normalizeVertex(e);
    return this.prop(["vertices", t], i, n);
  },
  vertices: function(t, e) {
    if (arguments.length === 0)
      return t = this.get("vertices"), Array.isArray(t) ? t.slice() : [];
    Array.isArray(t) || (t = []);
    for (var n = [], r = 0; r < t.length; r++) {
      var i = t[r], s = this._normalizeVertex(i);
      n.push(s);
    }
    return this.set("vertices", n, e);
  },
  insertVertex: function(t, e, n) {
    if (!e) throw new Error("dia.Link: no vertex provided");
    var r = this.vertices(), i = r.length;
    t = isFinite(t) && t !== null ? t | 0 : i, t < 0 && (t = i + t + 1);
    var s = this._normalizeVertex(e);
    return r.splice(t, 0, s), this.vertices(r, n);
  },
  removeVertex: function(t, e) {
    var n = this.vertices();
    return t = isFinite(t) && t !== null ? t | 0 : -1, n.splice(t, 1), this.vertices(n, e);
  },
  _normalizeVertex: function(t) {
    var e = !Tt(t);
    return e ? {
      x: t.x,
      y: t.y
    } : t;
  },
  translate: function(t, e, n) {
    return n = n || {}, n.translateBy = n.translateBy || this.id, n.tx = t, n.ty = e, this.applyToPoints(function(r) {
      return {
        x: (r.x || 0) + t,
        y: (r.y || 0) + e
      };
    }, n);
  },
  scale: function(t, e, n, r) {
    return this.applyToPoints(function(i) {
      return E(i).scale(t, e, n).toJSON();
    }, r);
  },
  applyToPoints: function(t, e) {
    if (!bt(t)) throw new TypeError("dia.Link: applyToPoints expects its first parameter to be a function.");
    var n = {}, { source: r, target: i } = this.attributes;
    r.id || (n.source = t(r)), i.id || (n.target = t(i));
    var s = this.vertices();
    return s.length > 0 && (n.vertices = s.map(t)), this.set(n, e);
  },
  getSourcePoint: function() {
    var t = this.getSourceCell();
    return t ? t.getPointFromConnectedLink(this, "source") : new E(this.source());
  },
  getTargetPoint: function() {
    var t = this.getTargetCell();
    return t ? t.getPointFromConnectedLink(this, "target") : new E(this.target());
  },
  getPointFromConnectedLink: function() {
    return this.getPolyline().pointAt(0.5);
  },
  getPolyline: function() {
    const t = [
      this.getSourcePoint(),
      ...this.vertices().map(E),
      this.getTargetPoint()
    ];
    return new St(t);
  },
  getBBox: function() {
    return this.getPolyline().bbox();
  },
  reparent: function(t) {
    var e;
    if (this.graph) {
      var n = this.getSourceElement(), r = this.getTargetElement(), i = this.getParentCell();
      n && r && (n === r || n.isEmbeddedIn(r) ? e = r : r.isEmbeddedIn(n) ? e = n : e = this.graph.getCommonAncestor(n, r)), i && (!e || e.id !== i.id) && i.unembed(this, t), e && e.embed(this, t);
    }
    return e;
  },
  hasLoop: function(t) {
    t = t || {};
    var { source: e, target: n } = this.attributes, r = e.id, i = n.id;
    if (!r || !i) return !1;
    var s = r === i;
    if (!s && t.deep && this.graph) {
      var o = this.getSourceCell(), a = this.getTargetCell();
      s = o.isEmbeddedIn(a) || a.isEmbeddedIn(o);
    }
    return s;
  },
  getSourceCell: function() {
    const { graph: t, attributes: e } = this;
    var n = e.source;
    return n && n.id && t && t.getCell(n.id) || null;
  },
  getSourceElement: function() {
    var t = this, e = {};
    do {
      if (e[t.id]) return null;
      e[t.id] = !0, t = t.getSourceCell();
    } while (t && t.isLink());
    return t;
  },
  getTargetCell: function() {
    const { graph: t, attributes: e } = this;
    var n = e.target;
    return n && n.id && t && t.getCell(n.id) || null;
  },
  getTargetElement: function() {
    var t = this, e = {};
    do {
      if (e[t.id]) return null;
      e[t.id] = !0, t = t.getTargetCell();
    } while (t && t.isLink());
    return t;
  },
  getRelationshipAncestor: function() {
    var t;
    if (this.graph) {
      var e = [
        this,
        this.getSourceElement(),
        this.getTargetElement()
      ].filter(function(n) {
        return !!n;
      });
      t = this.graph.getCommonAncestor.apply(this.graph, e);
    }
    return t || null;
  },
  isRelationshipEmbeddedIn: function(t) {
    var e = Ct(t) || Ft(t) ? t : t.id, n = this.getRelationshipAncestor();
    return !!n && (n.id === e || n.isEmbeddedIn(e));
  },
  _getDefaultLabel: function() {
    var t = this.get("defaultLabel") || this.defaultLabel || {}, e = {};
    return e.markup = t.markup || this.get("labelMarkup") || this.labelMarkup, e.position = t.position, e.attrs = t.attrs, e.size = t.size, e;
  }
}, { endsEqual: function(t, e) {
  var n = t.port === e.port || !t.port && !e.port;
  return t.id === e.id && n;
} }), zc = {
  _results: {},
  _tests: {
    svgforeignobject: function() {
      return !!document.createElementNS && /SVGForeignObject/.test({}.toString.call(document.createElementNS("http://www.w3.org/2000/svg", "foreignObject")));
    },
    isSafari: function() {
      return /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
    }
  },
  addTest: function(t, e) {
    return this._tests[t] = e;
  },
  test: function(t) {
    var e = this._tests[t];
    if (!e) throw new Error('Test not defined ("' + t + '"). Use `joint.env.addTest(name, fn) to add a new test.`');
    var n = this._results[t];
    if (typeof n < "u") return n;
    try {
      n = e();
    } catch {
      n = !1;
    }
    return this._results[t] = n, n;
  }
};
var Uc = {};
Xt(Uc, {
  BorderedImage: () => $d,
  Circle: () => Gd,
  Cylinder: () => Jd,
  DoubleLink: () => eg,
  Ellipse: () => zd,
  EmbeddedImage: () => qd,
  HeaderedRectangle: () => Xd,
  Image: () => Hd,
  InscribedImage: () => Yd,
  Link: () => Pi,
  Path: () => Ud,
  Polygon: () => jd,
  Polyline: () => Wd,
  Rectangle: () => Vd,
  ShadowLink: () => ng,
  TextBlock: () => tg
});
const Vd = It.define("standard.Rectangle", { attrs: {
  root: { cursor: "move" },
  body: {
    width: "calc(w)",
    height: "calc(h)",
    strokeWidth: 2,
    stroke: "#000000",
    fill: "#FFFFFF"
  },
  label: {
    textVerticalAnchor: "middle",
    textAnchor: "middle",
    x: "calc(w/2)",
    y: "calc(h/2)",
    fontSize: 14,
    fill: "#333333"
  }
} }, { markup: [{
  tagName: "rect",
  selector: "body"
}, {
  tagName: "text",
  selector: "label"
}] }), Gd = It.define("standard.Circle", { attrs: {
  root: { cursor: "move" },
  body: {
    cx: "calc(s/2)",
    cy: "calc(s/2)",
    r: "calc(s/2)",
    strokeWidth: 2,
    stroke: "#333333",
    fill: "#FFFFFF"
  },
  label: {
    textVerticalAnchor: "middle",
    textAnchor: "middle",
    x: "calc(w/2)",
    y: "calc(h/2)",
    fontSize: 14,
    fill: "#333333"
  }
} }, { markup: [{
  tagName: "circle",
  selector: "body"
}, {
  tagName: "text",
  selector: "label"
}] }), zd = It.define("standard.Ellipse", { attrs: {
  root: { cursor: "move" },
  body: {
    cx: "calc(w/2)",
    cy: "calc(h/2)",
    rx: "calc(w/2)",
    ry: "calc(h/2)",
    strokeWidth: 2,
    stroke: "#333333",
    fill: "#FFFFFF"
  },
  label: {
    textVerticalAnchor: "middle",
    textAnchor: "middle",
    x: "calc(w/2)",
    y: "calc(h/2)",
    fontSize: 14,
    fill: "#333333"
  }
} }, { markup: [{
  tagName: "ellipse",
  selector: "body"
}, {
  tagName: "text",
  selector: "label"
}] }), Ud = It.define("standard.Path", { attrs: {
  root: { cursor: "move" },
  body: {
    d: "M 0 0 H calc(w) V calc(h) H 0 Z",
    strokeWidth: 2,
    stroke: "#333333",
    fill: "#FFFFFF"
  },
  label: {
    textVerticalAnchor: "middle",
    textAnchor: "middle",
    x: "calc(w/2)",
    y: "calc(h/2)",
    fontSize: 14,
    fill: "#333333"
  }
} }, { markup: [{
  tagName: "path",
  selector: "body"
}, {
  tagName: "text",
  selector: "label"
}] }), jd = It.define("standard.Polygon", { attrs: {
  root: { cursor: "move" },
  body: {
    points: "0 0 calc(w) 0 calc(w) calc(h) 0 calc(h)",
    strokeWidth: 2,
    stroke: "#333333",
    fill: "#FFFFFF"
  },
  label: {
    textVerticalAnchor: "middle",
    textAnchor: "middle",
    x: "calc(w/2)",
    y: "calc(h/2)",
    fontSize: 14,
    fill: "#333333"
  }
} }, { markup: [{
  tagName: "polygon",
  selector: "body"
}, {
  tagName: "text",
  selector: "label"
}] }), Wd = It.define("standard.Polyline", { attrs: {
  root: { cursor: "move" },
  body: {
    points: "0 0 calc(w) 0 calc(w) calc(h) 0 calc(h)",
    strokeWidth: 2,
    stroke: "#333333",
    fill: "#FFFFFF"
  },
  label: {
    textVerticalAnchor: "middle",
    textAnchor: "middle",
    x: "calc(w/2)",
    y: "calc(h/2)",
    fontSize: 14,
    fill: "#333333"
  }
} }, { markup: [{
  tagName: "polyline",
  selector: "body"
}, {
  tagName: "text",
  selector: "label"
}] }), Hd = It.define("standard.Image", { attrs: {
  root: { cursor: "move" },
  image: {
    width: "calc(w)",
    height: "calc(h)"
  },
  label: {
    textVerticalAnchor: "top",
    textAnchor: "middle",
    x: "calc(w/2)",
    y: "calc(h+10)",
    fontSize: 14,
    fill: "#333333"
  }
} }, { markup: [{
  tagName: "image",
  selector: "image"
}, {
  tagName: "text",
  selector: "label"
}] }), $d = It.define("standard.BorderedImage", { attrs: {
  root: { cursor: "move" },
  border: {
    width: "calc(w)",
    height: "calc(h)",
    stroke: "#333333",
    strokeWidth: 2
  },
  background: {
    width: "calc(w-1)",
    height: "calc(h-1)",
    x: 0.5,
    y: 0.5,
    fill: "#FFFFFF"
  },
  image: {
    width: "calc(w-1)",
    height: "calc(h-1)",
    x: 0.5,
    y: 0.5
  },
  label: {
    textVerticalAnchor: "top",
    textAnchor: "middle",
    x: "calc(w/2)",
    y: "calc(h+10)",
    fontSize: 14,
    fill: "#333333"
  }
} }, { markup: [
  {
    tagName: "rect",
    selector: "background",
    attributes: { stroke: "none" }
  },
  {
    tagName: "image",
    selector: "image"
  },
  {
    tagName: "rect",
    selector: "border",
    attributes: { fill: "none" }
  },
  {
    tagName: "text",
    selector: "label"
  }
] }), qd = It.define("standard.EmbeddedImage", { attrs: {
  root: { cursor: "move" },
  body: {
    width: "calc(w)",
    height: "calc(h)",
    stroke: "#333333",
    fill: "#FFFFFF",
    strokeWidth: 2
  },
  image: {
    width: "calc(0.3*w)",
    height: "calc(h-20)",
    x: 10,
    y: 10,
    preserveAspectRatio: "xMidYMin"
  },
  label: {
    textVerticalAnchor: "top",
    textAnchor: "left",
    x: "calc(0.3*w+20)",
    y: 10,
    fontSize: 14,
    fill: "#333333"
  }
} }, { markup: [
  {
    tagName: "rect",
    selector: "body"
  },
  {
    tagName: "image",
    selector: "image"
  },
  {
    tagName: "text",
    selector: "label"
  }
] }), Yd = It.define("standard.InscribedImage", { attrs: {
  root: { cursor: "move" },
  border: {
    rx: "calc(w/2)",
    ry: "calc(h/2)",
    cx: "calc(w/2)",
    cy: "calc(h/2)",
    stroke: "#333333",
    strokeWidth: 2
  },
  background: {
    rx: "calc(w/2)",
    ry: "calc(h/2)",
    cx: "calc(w/2)",
    cy: "calc(h/2)",
    fill: "#FFFFFF"
  },
  image: {
    width: "calc(0.68*w)",
    height: "calc(0.68*h)",
    x: "calc(0.16*w)",
    y: "calc(0.16*h)",
    preserveAspectRatio: "xMidYMid"
  },
  label: {
    textVerticalAnchor: "top",
    textAnchor: "middle",
    x: "calc(w/2)",
    y: "calc(h+10)",
    fontSize: 14,
    fill: "#333333"
  }
} }, { markup: [
  {
    tagName: "ellipse",
    selector: "background"
  },
  {
    tagName: "image",
    selector: "image"
  },
  {
    tagName: "ellipse",
    selector: "border",
    attributes: { fill: "none" }
  },
  {
    tagName: "text",
    selector: "label"
  }
] }), Xd = It.define("standard.HeaderedRectangle", { attrs: {
  root: { cursor: "move" },
  body: {
    width: "calc(w)",
    height: "calc(h)",
    strokeWidth: 2,
    stroke: "#000000",
    fill: "#FFFFFF"
  },
  header: {
    width: "calc(w)",
    height: 30,
    strokeWidth: 2,
    stroke: "#000000",
    fill: "#FFFFFF"
  },
  headerText: {
    textVerticalAnchor: "middle",
    textAnchor: "middle",
    x: "calc(w/2)",
    y: 15,
    fontSize: 16,
    fill: "#333333"
  },
  bodyText: {
    textVerticalAnchor: "middle",
    textAnchor: "middle",
    x: "calc(w/2)",
    y: "calc(h/2+15)",
    fontSize: 14,
    fill: "#333333"
  }
} }, { markup: [
  {
    tagName: "rect",
    selector: "body"
  },
  {
    tagName: "rect",
    selector: "header"
  },
  {
    tagName: "text",
    selector: "headerText"
  },
  {
    tagName: "text",
    selector: "bodyText"
  }
] });
var ri = 10;
const Jd = It.define("standard.Cylinder", { attrs: {
  root: { cursor: "move" },
  body: {
    lateralArea: ri,
    fill: "#FFFFFF",
    stroke: "#333333",
    strokeWidth: 2
  },
  top: {
    cx: "calc(w/2)",
    cy: ri,
    rx: "calc(w/2)",
    ry: ri,
    fill: "#FFFFFF",
    stroke: "#333333",
    strokeWidth: 2
  },
  label: {
    textVerticalAnchor: "middle",
    textAnchor: "middle",
    x: "calc(w/2)",
    y: "calc(h+15)",
    fontSize: 14,
    fill: "#333333"
  }
} }, {
  markup: [
    {
      tagName: "path",
      selector: "body"
    },
    {
      tagName: "ellipse",
      selector: "top"
    },
    {
      tagName: "text",
      selector: "label"
    }
  ],
  topRy: function(t, e) {
    if (t === void 0) return this.attr("body/lateralArea");
    var n = { lateralArea: t }, r = Wt(t), i = r ? `calc(${parseFloat(t) / 100}*h)` : t, s = {
      cy: i,
      ry: i
    };
    return this.attr({
      body: n,
      top: s
    }, e);
  }
}, { attributes: { "lateral-area": {
  set: function(t, e) {
    var n = Wt(t);
    n && (t = parseFloat(t) / 100);
    var r = e.x, i = e.y, s = e.width, o = e.height, a = s / 2, c = n ? o * t : t, u = B.KAPPA, h = u * a, l = u * (n ? o * t : t), d = r, g = r + s / 2, v = r + s, y = i + c, w = y - c, x = i + o - c, P = i + o, T = [
      "M",
      d,
      y,
      "L",
      d,
      x,
      "C",
      r,
      x + l,
      g - h,
      P,
      g,
      P,
      "C",
      g + h,
      P,
      v,
      x + l,
      v,
      x,
      "L",
      v,
      y,
      "C",
      v,
      y - l,
      g + h,
      w,
      g,
      w,
      "C",
      g - h,
      w,
      d,
      y - l,
      d,
      y,
      "Z"
    ];
    return { d: T.join(" ") };
  },
  unset: "d"
} } });
var Kd = {
  tagName: "foreignObject",
  selector: "foreignObject",
  attributes: { overflow: "hidden" },
  children: [{
    tagName: "div",
    namespaceURI: "http://www.w3.org/1999/xhtml",
    selector: "label",
    style: {
      width: "100%",
      height: "100%",
      position: "static",
      backgroundColor: "transparent",
      textAlign: "center",
      margin: 0,
      padding: "0px 5px",
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }]
}, Zd = {
  tagName: "text",
  selector: "label",
  attributes: { "text-anchor": "middle" }
}, Qd = zc.test("svgforeignobject") ? Kd : Zd;
const tg = It.define("standard.TextBlock", { attrs: {
  root: { cursor: "move" },
  body: {
    width: "calc(w)",
    height: "calc(h)",
    stroke: "#333333",
    fill: "#ffffff",
    strokeWidth: 2
  },
  foreignObject: {
    width: "calc(w)",
    height: "calc(h)"
  },
  label: { style: { fontSize: 14 } }
} }, { markup: [{
  tagName: "rect",
  selector: "body"
}, Qd] }, { attributes: { text: {
  set: function(t, e, n, r) {
    if (n instanceof HTMLElement) n.textContent = t;
    else {
      var i = r.style || {}, s = {
        text: t,
        width: -5,
        height: "100%"
      }, o = $({ "text-vertical-anchor": "middle" }, i);
      return Lc["text-wrap"].set.call(this, s, e, n, o), { fill: i.color || null };
    }
  },
  unset: function(t) {
    if (t.textContent = "", t instanceof SVGElement) return "fill";
  },
  position: function(t, e, n) {
    if (n instanceof SVGElement) return e.center();
  }
} } }), Pi = gn.define("standard.Link", { attrs: {
  line: {
    connection: !0,
    stroke: "#333333",
    strokeWidth: 2,
    strokeLinejoin: "round",
    targetMarker: {
      type: "path",
      d: "M 10 -5 0 0 10 5 z"
    }
  },
  wrapper: {
    connection: !0,
    strokeWidth: 10,
    strokeLinejoin: "round"
  }
} }, { markup: [{
  tagName: "path",
  selector: "wrapper",
  attributes: {
    fill: "none",
    cursor: "pointer",
    stroke: "transparent",
    "stroke-linecap": "round"
  }
}, {
  tagName: "path",
  selector: "line",
  attributes: {
    fill: "none",
    "pointer-events": "none"
  }
}] }), eg = gn.define("standard.DoubleLink", { attrs: {
  line: {
    connection: !0,
    stroke: "#DDDDDD",
    strokeWidth: 4,
    strokeLinejoin: "round",
    targetMarker: {
      type: "path",
      stroke: "#000000",
      d: "M 10 -3 10 -10 -2 0 10 10 10 3"
    }
  },
  outline: {
    connection: !0,
    stroke: "#000000",
    strokeWidth: 6,
    strokeLinejoin: "round"
  }
} }, { markup: [{
  tagName: "path",
  selector: "outline",
  attributes: {
    fill: "none",
    cursor: "pointer"
  }
}, {
  tagName: "path",
  selector: "line",
  attributes: {
    fill: "none",
    "pointer-events": "none"
  }
}] }), ng = gn.define("standard.ShadowLink", { attrs: {
  line: {
    connection: !0,
    stroke: "#FF0000",
    strokeWidth: 20,
    strokeLinejoin: "round",
    targetMarker: {
      type: "path",
      stroke: "none",
      d: "M 0 -10 -10 0 0 10 z"
    },
    sourceMarker: {
      type: "path",
      stroke: "none",
      d: "M -10 -10 0 0 -10 10 0 10 0 -10 z"
    }
  },
  shadow: {
    connection: !0,
    transform: "translate(3,6)",
    stroke: "#000000",
    strokeOpacity: 0.2,
    strokeWidth: 20,
    strokeLinejoin: "round",
    targetMarker: {
      type: "path",
      d: "M 0 -10 -10 0 0 10 z",
      stroke: "none"
    },
    sourceMarker: {
      type: "path",
      stroke: "none",
      d: "M -10 -10 0 0 -10 10 0 10 0 -10 z"
    }
  }
} }, { markup: [{
  tagName: "path",
  selector: "shadow",
  attributes: {
    fill: "none",
    "pointer-events": "none"
  }
}, {
  tagName: "path",
  selector: "line",
  attributes: {
    fill: "none",
    cursor: "pointer"
  }
}] }), Qe = {
  POINT: "point",
  CUBIC: "cubic",
  LINE: "line",
  GAP: "gap"
}, rg = Object.values(Qe), ig = 10, sg = 1, ps = function(t, e, n = [], r = {}) {
  const { cornerType: i = Qe.POINT, cornerRadius: s = ig, cornerPreserveAspectRatio: o = !1, precision: a = sg, raw: c = !1 } = r;
  if (rg.indexOf(i) === -1) throw new Error("Invalid `cornerType` provided to `straight` connector.");
  let u;
  if (i === Qe.POINT || !s) {
    const h = [t].concat(n).concat([e]), l = new St(h);
    u = new Z(l);
  } else {
    u = new Z(), u.appendSegment(Z.createSegment("M", t));
    let h;
    const l = n.length;
    for (let d = 0; d < l; d++) {
      const g = new E(n[d]), v = n[d - 1] || t, y = n[d + 1] || e, w = h || g.distance(v) / 2;
      h = g.distance(y) / 2;
      let x, P;
      o ? x = P = -Math.min(s, w, h) : (x = -Math.min(s, w), P = -Math.min(s, h));
      const T = g.clone().move(v, x).round(a), L = g.clone().move(y, P).round(a);
      switch (u.appendSegment(Z.createSegment("L", T)), i) {
        case Qe.CUBIC: {
          const I = 0.3333333333333333, R = 2 / 3, f = new E(I * T.x + R * g.x, R * g.y + I * T.y), p = new E(I * L.x + R * g.x, R * g.y + I * L.y);
          u.appendSegment(Z.createSegment("C", f, p, L));
          break;
        }
        case Qe.LINE:
          u.appendSegment(Z.createSegment("L", L));
          break;
        case Qe.GAP:
          u.appendSegment(Z.createSegment("M", L));
          break;
      }
    }
    u.appendSegment(Z.createSegment("L", e));
  }
  return c ? u : u.serialize();
};
var og = 5, ho = [
  "arc",
  "gap",
  "cubic"
], ag = 0, fo = 1, cg = ["smooth"], or = 1 / 3, ar = 2 / 3;
function go(t, e) {
  let { x: n, y: r } = t, { x: i, y: s } = e;
  if (n > i) {
    let o = n;
    n = i, i = o, o = r, r = s, s = o;
  }
  if (r > s) {
    let o = n;
    n = i, i = o, o = r, r = s, s = o;
  }
  return [new E(n, r), new E(i, s)];
}
function lg(t, e) {
  const [{ x: n, y: r }, { x: i, y: s }] = go(t.start, t.end), [{ x: o, y: a }, { x: c, y: u }] = go(e.start, e.end), h = n <= c && o <= i, l = r <= u && a <= s;
  return h && l;
}
function ii(t, e, n) {
  var r = [].concat(t, n, e);
  return r.reduce(function(i, s, o) {
    var a = r[o + 1];
    return a != null && (i[o] = Re(s, a)), i;
  }, []);
}
function ug(t) {
  var e = t.paper, n = e._jumpOverUpdateList;
  if (n == null) {
    n = e._jumpOverUpdateList = [];
    var r = e.model;
    r.on("batch:stop", function() {
      this.hasActiveBatch() || hg(e);
    }), r.on("reset", function() {
      n = e._jumpOverUpdateList = [];
    });
  }
  n.indexOf(t) < 0 && (n.push(t), t.listenToOnce(t.model, "change:connector remove", function() {
    n.splice(n.indexOf(t), 1);
  }));
}
function hg(t) {
  for (var e = t._jumpOverUpdateList, n = 0; n < e.length; n++) {
    const r = e[n], i = r.getFlag(r.constructor.Flags.CONNECTOR);
    r.requestUpdate(i);
  }
}
function fg(t, e) {
  return pt(e).reduce(function(n, r) {
    var i = t.intersection(r);
    return i && n.push(i), n;
  }, []);
}
function po(t, e) {
  return Re(t, e).squaredLength();
}
function dg(t, e, n) {
  return e.reduce(function(r, i, s) {
    if (i.skip === !0) return r;
    var o = r.pop() || t, a = xr(i).move(o.start, -n), c = xr(i).move(o.start, +n), u = e[s + 1];
    if (u != null) {
      var h = c.distance(u);
      h <= n && (c = u.move(o.start, h), u.skip = !0);
    } else {
      var l = a.distance(o.end);
      if (l < n * 2 + fo)
        return r.push(o), r;
    }
    var d = c.distance(o.start);
    if (d < n * 2 + fo)
      return r.push(o), r;
    var g = Re(a, c);
    return g.isJump = !0, r.push(Re(o.start, a), g, Re(c, o.end)), r;
  }, []);
}
function vo(t, e, n, r) {
  var i = new Z(), s;
  return s = Z.createSegment("M", t[0].start), i.appendSegment(s), pt(t).forEach(function(o, a) {
    if (o.isJump) {
      var c, u, h, l;
      if (n === "arc") {
        c = -90, u = o.start.difference(o.end);
        var d = +(u.x < 0 || u.x === 0 && u.y < 0);
        d && (c += 180);
        var g = o.midpoint(), v = new H(g, o.end).rotate(g, c), y;
        y = new H(o.start, g), h = y.pointAt(2 / 3).rotate(o.start, c), l = v.pointAt(1 / 3).rotate(v.end, -c), s = Z.createSegment("C", h, l, v.end), i.appendSegment(s), y = new H(g, o.end), h = v.pointAt(1 / 3).rotate(v.end, c), l = y.pointAt(1 / 3).rotate(o.end, -c), s = Z.createSegment("C", h, l, o.end), i.appendSegment(s);
      } else if (n === "gap")
        s = Z.createSegment("M", o.end), i.appendSegment(s);
      else if (n === "cubic") {
        c = o.start.theta(o.end);
        var w = e * 0.6, x = e * 1.35;
        u = o.start.difference(o.end), d = +(u.x < 0 || u.x === 0 && u.y < 0), d && (x *= -1), h = E(o.start.x + w, o.start.y + x).rotate(o.start, c), l = E(o.end.x - w, o.end.y + x).rotate(o.end, c), s = Z.createSegment("C", h, l, o.end), i.appendSegment(s);
      }
    } else {
      var P = t[a + 1];
      r == 0 || !P || P.isJump ? (s = Z.createSegment("L", o.end), i.appendSegment(s)) : gg(r, i, o.end, o.start, P.end);
    }
  }), i;
}
function gg(t, e, n, r, i) {
  var s = n.distance(r) / 2, o = n.distance(i) / 2, a = -Math.min(t, s), c = -Math.min(t, o), u = n.clone().move(r, a).round(), h = n.clone().move(i, c).round(), l = new E(or * u.x + ar * n.x, ar * n.y + or * u.y), d = new E(or * h.x + ar * n.x, ar * n.y + or * h.y), g;
  g = Z.createSegment("L", u), e.appendSegment(g), g = Z.createSegment("C", l, d, h), e.appendSegment(g);
}
const pg = function(t, e, n, r) {
  ug(this);
  var i = r.raw, s = r.size || og, o = r.jump && ("" + r.jump).toLowerCase(), a = r.radius || ag, c = r.ignoreConnectors || cg;
  ho.indexOf(o) === -1 && (o = ho[0]);
  var u = this.paper, h = u.model, l = h.getLinks();
  if (l.length === 1) return vo(ii(t, e, n), s, o, a);
  var d = this.model, g = l.indexOf(d), v = u.options.defaultConnector || {}, y = l.filter(function(I, R) {
    var f = I.get("connector") || v;
    return pt(c).includes(f.name) ? !1 : R > g ? f.name !== "jumpover" : !0;
  }), w = y.map(function(I) {
    return u.findViewByModel(I);
  }), x = ii(t, e, n), P = w.map(function(I) {
    return I == null ? [] : I === this ? x : ii(I.sourcePoint, I.targetPoint, I.route);
  }, this), T = x.reduce(function(I, R) {
    var f = y.reduce(function(p, m, b) {
      if (m !== d) {
        const S = P[b].slice(), M = S.findIndex((F) => lg(R, F));
        M > -1 && R.containsPoint(S[M].end) && S.splice(M + 1, 1);
        const _ = fg(R, S);
        p.push.apply(p, _);
      }
      return p;
    }, []).sort(function(p, m) {
      return po(R.start, p) - po(R.start, m);
    });
    return f.length > 0 ? I.push.apply(I, dg(R, f, s)) : I.push(R), I;
  }, []), L = vo(T, s, o, a);
  return i ? L : L.serialize();
}, vg = function(t, e, n = [], r = {}) {
  const { raw: i } = r;
  return ps(t, e, n, {
    cornerType: "point",
    raw: i
  });
}, mg = 10, yg = 0, bg = function(t, e, n = [], r = {}) {
  const { radius: i = mg, raw: s } = r;
  return ps(t, e, n, {
    cornerType: "cubic",
    cornerRadius: i,
    precision: yg,
    raw: s
  });
}, wg = function(t, e, n, r) {
  var i = r && r.raw, s;
  if (n && n.length !== 0) {
    var o = [t].concat(n).concat([e]), a = mt.throughPoints(o);
    s = new Z(a);
  } else {
    s = new Z();
    var c;
    if (c = Z.createSegment("M", t), s.appendSegment(c), Math.abs(t.x - e.x) >= Math.abs(t.y - e.y)) {
      var u = (t.x + e.x) / 2;
      c = Z.createSegment("C", u, t.y, u, e.y, e.x, e.y), s.appendSegment(c);
    } else {
      var h = (t.y + e.y) / 2;
      c = Z.createSegment("C", t.x, h, e.x, h, e.x, e.y), s.appendSegment(c);
    }
  }
  return i ? s : s.serialize();
}, Zt = {
  AUTO: "auto",
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical",
  CLOSEST_POINT: "closest-point",
  OUTWARDS: "outwards"
}, Bt = {
  UP: "up",
  DOWN: "down",
  LEFT: "left",
  RIGHT: "right",
  AUTO: "auto",
  CLOSEST_POINT: "closest-point",
  OUTWARDS: "outwards"
}, Ae = function(t, e, n = [], r = {}, i) {
  const s = !!r.raw, { direction: o = Zt.AUTO, precision: a = 3 } = r, c = {
    coeff: r.distanceCoefficient || 0.6,
    angleTangentCoefficient: r.angleTangentCoefficient || 80,
    tau: r.tension || 0.5,
    sourceTangent: r.sourceTangent ? new E(r.sourceTangent) : null,
    targetTangent: r.targetTangent ? new E(r.targetTangent) : null,
    rotate: !!r.rotate
  };
  typeof r.sourceDirection == "string" ? c.sourceDirection = r.sourceDirection : typeof r.sourceDirection == "number" ? c.sourceDirection = new E(1, 0).rotate(null, r.sourceDirection) : c.sourceDirection = r.sourceDirection ? new E(r.sourceDirection).normalize() : null, typeof r.targetDirection == "string" ? c.targetDirection = r.targetDirection : typeof r.targetDirection == "number" ? c.targetDirection = new E(1, 0).rotate(null, r.targetDirection) : c.targetDirection = r.targetDirection ? new E(r.targetDirection).normalize() : null;
  const u = [
    t,
    ...n,
    e
  ].map((y) => new E(y));
  let h;
  if (c.sourceTangent) h = c.sourceTangent;
  else {
    const y = Eg(i, u, o, c), w = u[0].distance(u[1]) * c.coeff, x = u[1].difference(u[0]).normalize(), P = Ei(y, x);
    if (P > Math.PI / 4) {
      const T = w + (P - Math.PI / 4) * c.angleTangentCoefficient;
      h = y.clone().scale(T, T);
    } else h = y.clone().scale(w, w);
  }
  let l;
  if (c.targetTangent) l = c.targetTangent;
  else {
    const y = Tg(i, u, o, c), w = u.length - 1, x = u[w - 1].distance(u[w]) * c.coeff, P = u[w - 1].difference(u[w]).normalize(), T = Ei(y, P);
    if (T > Math.PI / 4) {
      const L = x + (T - Math.PI / 4) * c.angleTangentCoefficient;
      l = y.clone().scale(L, L);
    } else l = y.clone().scale(x, x);
  }
  const g = kg(u, h, l, c).map((y) => Lg(y, c)), v = new Z(g).round(a);
  return s ? v : v.serialize();
};
Ae.Directions = Zt;
Ae.TangentDirections = Bt;
function xg(t, e, n) {
  const { sourceBBox: r } = t;
  let i, s;
  if (!t.sourceView) r.x > e[1].x ? i = "right" : i = "left";
  else if (s = t.sourceView.model.angle(), n.rotate && s) {
    const a = t.sourceView.getNodeUnrotatedBBox(t.sourceView.el), c = e[0].clone();
    c.rotate(r.center(), s), i = a.sideNearestToPoint(c);
  } else i = r.sideNearestToPoint(e[0]);
  let o;
  switch (i) {
    case "left":
      o = new E(-1, 0);
      break;
    case "right":
    default:
      o = new E(1, 0);
      break;
  }
  return n.rotate && s && o.rotate(null, -s), o;
}
function Sg(t, e, n) {
  const { targetBBox: r } = t;
  let i, s;
  if (!t.targetView) r.x > e[e.length - 2].x ? i = "left" : i = "right";
  else if (s = t.targetView.model.angle(), n.rotate && s) {
    const a = t.targetView.getNodeUnrotatedBBox(t.targetView.el), c = e[e.length - 1].clone();
    c.rotate(r.center(), s), i = a.sideNearestToPoint(c);
  } else i = r.sideNearestToPoint(e[e.length - 1]);
  let o;
  switch (i) {
    case "left":
      o = new E(-1, 0);
      break;
    case "right":
    default:
      o = new E(1, 0);
      break;
  }
  return n.rotate && s && o.rotate(null, -s), o;
}
function Ag(t, e, n) {
  const { sourceBBox: r } = t;
  let i, s;
  if (!t.sourceView) r.y > e[1].y ? i = "bottom" : i = "top";
  else if (s = t.sourceView.model.angle(), n.rotate && s) {
    const a = t.sourceView.getNodeUnrotatedBBox(t.sourceView.el), c = e[0].clone();
    c.rotate(r.center(), s), i = a.sideNearestToPoint(c);
  } else i = r.sideNearestToPoint(e[0]);
  let o;
  switch (i) {
    case "top":
      o = new E(0, -1);
      break;
    case "bottom":
    default:
      o = new E(0, 1);
      break;
  }
  return n.rotate && s && o.rotate(null, -s), o;
}
function Pg(t, e, n) {
  const { targetBBox: r } = t;
  let i, s;
  if (!t.targetView) r.y > e[e.length - 2].y ? i = "top" : i = "bottom";
  else if (s = t.targetView.model.angle(), n.rotate && s) {
    const a = t.targetView.getNodeUnrotatedBBox(t.targetView.el), c = e[e.length - 1].clone();
    c.rotate(r.center(), s), i = a.sideNearestToPoint(c);
  } else i = r.sideNearestToPoint(e[e.length - 1]);
  let o;
  switch (i) {
    case "top":
      o = new E(0, -1);
      break;
    case "bottom":
    default:
      o = new E(0, 1);
      break;
  }
  return n.rotate && s && o.rotate(null, -s), o;
}
function mo(t, e, n) {
  const { sourceBBox: r } = t;
  let i, s;
  if (!t.sourceView) i = r.sideNearestToPoint(e[1]);
  else if (s = t.sourceView.model.angle(), n.rotate && s) {
    const a = t.sourceView.getNodeUnrotatedBBox(t.sourceView.el), c = e[0].clone();
    c.rotate(r.center(), s), i = a.sideNearestToPoint(c);
  } else i = r.sideNearestToPoint(e[0]);
  let o;
  switch (i) {
    case "top":
      o = new E(0, -1);
      break;
    case "bottom":
      o = new E(0, 1);
      break;
    case "right":
      o = new E(1, 0);
      break;
    case "left":
      o = new E(-1, 0);
      break;
  }
  return n.rotate && s && o.rotate(null, -s), o;
}
function yo(t, e, n) {
  const { targetBBox: r } = t;
  let i, s;
  if (!t.targetView) i = r.sideNearestToPoint(e[e.length - 2]);
  else if (s = t.targetView.model.angle(), n.rotate && s) {
    const a = t.targetView.getNodeUnrotatedBBox(t.targetView.el), c = e[e.length - 1].clone();
    c.rotate(r.center(), s), i = a.sideNearestToPoint(c);
  } else i = r.sideNearestToPoint(e[e.length - 1]);
  let o;
  switch (i) {
    case "top":
      o = new E(0, -1);
      break;
    case "bottom":
      o = new E(0, 1);
      break;
    case "right":
      o = new E(1, 0);
      break;
    case "left":
      o = new E(-1, 0);
      break;
  }
  return n.rotate && s && o.rotate(null, -s), o;
}
function bo(t, e, n) {
  return e[1].difference(e[0]).normalize();
}
function wo(t, e, n) {
  const r = e.length - 1;
  return e[r - 1].difference(e[r]).normalize();
}
function xo(t, e, n) {
  const { sourceBBox: r } = t, i = r.center();
  return e[0].difference(i).normalize();
}
function So(t, e, n) {
  const { targetBBox: r } = t, i = r.center();
  return e[e.length - 1].difference(i).normalize();
}
function Eg(t, e, n, r) {
  if (r.sourceDirection) switch (r.sourceDirection) {
    case Bt.UP:
      return new E(0, -1);
    case Bt.DOWN:
      return new E(0, 1);
    case Bt.LEFT:
      return new E(-1, 0);
    case Bt.RIGHT:
      return new E(1, 0);
    case Bt.AUTO:
      return mo(t, e, r);
    case Bt.CLOSEST_POINT:
      return bo(t, e);
    case Bt.OUTWARDS:
      return xo(t, e);
    default:
      return r.sourceDirection;
  }
  switch (n) {
    case Zt.HORIZONTAL:
      return xg(t, e, r);
    case Zt.VERTICAL:
      return Ag(t, e, r);
    case Zt.CLOSEST_POINT:
      return bo(t, e);
    case Zt.OUTWARDS:
      return xo(t, e);
    case Zt.AUTO:
    default:
      return mo(t, e, r);
  }
}
function Tg(t, e, n, r) {
  if (r.targetDirection) switch (r.targetDirection) {
    case Bt.UP:
      return new E(0, -1);
    case Bt.DOWN:
      return new E(0, 1);
    case Bt.LEFT:
      return new E(-1, 0);
    case Bt.RIGHT:
      return new E(1, 0);
    case Bt.AUTO:
      return yo(t, e, r);
    case Bt.CLOSEST_POINT:
      return wo(t, e);
    case Bt.OUTWARDS:
      return So(t, e);
    default:
      return r.targetDirection;
  }
  switch (n) {
    case Zt.HORIZONTAL:
      return Sg(t, e, r);
    case Zt.VERTICAL:
      return Pg(t, e, r);
    case Zt.CLOSEST_POINT:
      return wo(t, e);
    case Zt.OUTWARDS:
      return So(t, e);
    case Zt.AUTO:
    default:
      return yo(t, e, r);
  }
}
function Cg(t, e) {
  const n = Math.cos(e), r = Math.sin(e), i = n * t.x - r * t.y, s = r * t.x + n * t.y;
  t.x = i, t.y = s;
}
function Ei(t, e) {
  let n = t.dot(e) / (t.magnitude() * e.magnitude());
  return n < -1 && (n = -1), n > 1 && (n = 1), Math.acos(n);
}
function Ao(t, e) {
  return t.x * e.y - t.y * e.x;
}
function kg(t, e, n, r) {
  const { tau: i, coeff: s } = r, o = [], a = [], c = [], u = t.length - 1;
  for (let h = 0; h < u; h++) o[h] = t[h].distance(t[h + 1]);
  a[0] = e, a[u] = n;
  for (let h = 1; h < u; h++) {
    let l, d;
    h === 1 ? l = t[h - 1].clone().offset(a[h - 1].x, a[h - 1].y) : l = t[h - 1].clone(), h === u - 1 ? d = t[h + 1].clone().offset(a[h + 1].x, a[h + 1].y) : d = t[h + 1].clone();
    const g = l.difference(t[h]).normalize(), v = d.difference(t[h]).normalize(), y = Ei(g, v);
    let w = (Math.PI - y) / 2, x;
    const P = Ao(g, v);
    let T;
    T = Ao(t[h].difference(t[h + 1]), t[h].difference(t[h - 1])), P < 0 && (w = -w), y < Math.PI / 2 && (w < 0 && T < 0 || w > 0 && T > 0) && (w = w - Math.PI), x = v.clone(), Cg(x, w);
    const L = x.clone(), I = x.clone(), R = o[h - 1] * s, f = o[h] * s;
    L.scale(R, R), I.scale(f, f), a[h] = [L, I];
  }
  for (let h = 0; h < u; h++) {
    let l, d;
    h === 0 ? l = t[h + 1].difference(a[h].x / i, a[h].y / i) : l = t[h + 1].difference(a[h][1].x / i, a[h][1].y / i), h === u - 1 ? d = t[h].clone().offset(a[h + 1].x / i, a[h + 1].y / i) : d = t[h].difference(a[h + 1][0].x / i, a[h + 1][0].y / i), c[h] = [
      l,
      t[h],
      t[h + 1],
      d
    ];
  }
  return c;
}
function Lg(t, e) {
  const { tau: n } = e, r = new E();
  r.x = t[1].x + (t[2].x - t[0].x) / (6 * n), r.y = t[1].y + (t[2].y - t[0].y) / (6 * n);
  const i = new E();
  return i.x = t[2].x + (t[3].x - t[1].x) / (6 * n), i.y = t[2].y + (t[3].y - t[1].y) / (6 * n), new mt(t[1], r, i, t[2]);
}
var jc = {};
Xt(jc, {
  curve: () => Ae,
  jumpover: () => pg,
  normal: () => vg,
  rounded: () => bg,
  smooth: () => wg,
  straight: () => ps
});
var Ie = function(t) {
  this.cid = Dn("view"), this.preinitialize.apply(this, arguments), $(this, jh(t, Ng)), this._ensureElement(), this.initialize.apply(this, arguments);
}, _g = /^(\S+)\s*(.*)$/, Ng = [
  "model",
  "collection",
  "el",
  "id",
  "attributes",
  "className",
  "tagName",
  "events",
  "style"
];
$(Ie.prototype, Lt, {
  tagName: "div",
  $: function(t) {
    return this.$el.find(t);
  },
  preinitialize: function() {
  },
  initialize: function() {
  },
  render: function() {
    return this;
  },
  remove: function() {
    return this._removeElement(), this.stopListening(), this;
  },
  _removeElement: function() {
    this.$el.remove();
  },
  setElement: function(t) {
    return this.undelegateEvents(), this._setElement(t), this.delegateEvents(), this;
  },
  _setElement: function(t) {
    this.$el = t instanceof xt ? t : xt(t), this.el = this.$el[0];
  },
  delegateEvents: function(t) {
    if (t || (t = wt(this, "events")), !t) return this;
    this.undelegateEvents();
    for (var e in t) {
      var n = t[e];
      if (bt(n) || (n = this[n]), !!n) {
        var r = e.match(_g);
        this.delegate(r[1], r[2], n.bind(this));
      }
    }
    return this;
  },
  delegate: function(t, e, n) {
    return this.$el.on(t + ".delegateEvents" + this.cid, e, n), this;
  },
  undelegateEvents: function() {
    return this.$el && this.$el.off(".delegateEvents" + this.cid), this;
  },
  undelegate: function(t, e, n) {
    return this.$el.off(t + ".delegateEvents" + this.cid, e, n), this;
  },
  _createElement: function(t) {
    return document.createElement(t);
  },
  _ensureElement: function() {
    if (this.el)
      this.setElement(wt(this, "el"));
    else {
      var t = $({}, wt(this, "attributes"));
      this.id && (t.id = wt(this, "id")), this.className && (t.class = wt(this, "className")), this.setElement(this._createElement(wt(this, "tagName"))), this._setAttributes(t);
    }
  },
  _setAttributes: function(t) {
    this.$el.attr(t);
  }
});
Ie.extend = ds;
const Le = {}, an = Ie.extend({
  options: {},
  theme: null,
  themeClassNamePrefix: pe("theme-"),
  requireSetThemeOverride: !1,
  defaultTheme: Fe.defaultTheme,
  children: null,
  childNodes: null,
  DETACHABLE: !0,
  UPDATE_PRIORITY: 2,
  FLAG_INSERT: 1 << 30,
  FLAG_REMOVE: 1 << 29,
  FLAG_INIT: 1 << 28,
  constructor: function(t) {
    this.requireSetThemeOverride = t && !!t.theme, this.options = $({}, this.options, t), Ie.call(this, t);
  },
  initialize: function() {
    Le[this.cid] = this, this.setTheme(this.options.theme || this.defaultTheme), this.init();
  },
  unmount: function() {
    this.svgElement ? this.vel.remove() : this.$el.remove();
  },
  isMounted: function() {
    return this.el.parentNode !== null;
  },
  renderChildren: function(t) {
    if (t || (t = wt(this, "children")), t) {
      var e = this.svgElement, n = B.namespace[e ? "svg" : "xhtml"], r = Pr(t, n);
      (e ? this.vel : this.$el).empty().append(r.fragment), this.childNodes = r.selectors;
    }
    return this;
  },
  findAttributeNode: function(t, e) {
    let n = e;
    for (; n && n.nodeType === 1; ) {
      if (n.getAttribute(t)) return n;
      if (n === this.el) return null;
      n = n.parentNode;
    }
    return null;
  },
  findAttribute: function(t, e) {
    const n = this.findAttributeNode(t, e);
    return n && n.getAttribute(t);
  },
  _ensureElement: function() {
    if (this.el)
      this.setElement(wt(this, "el"));
    else {
      var t = wt(this, "tagName"), e = $({}, wt(this, "attributes")), n = $({}, wt(this, "style"));
      this.id && (e.id = wt(this, "id")), this.setElement(this._createElement(t)), this._setAttributes(e), this._setStyle(n);
    }
    this._ensureElClassName();
  },
  _setAttributes: function(t) {
    this.svgElement ? this.vel.attr(t) : this.$el.attr(t);
  },
  _setStyle: function(t) {
    this.$el.css(t);
  },
  _createElement: function(t) {
    return this.svgElement ? document.createElementNS(B.namespace.svg, t) : document.createElement(t);
  },
  _setElement: function(t) {
    this.$el = t instanceof xt ? t : xt(t), this.el = this.$el[0], this.svgElement && (this.vel = B(this.el));
  },
  _ensureElClassName: function() {
    var t = wt(this, "className");
    if (t) {
      var e = pe(t);
      this.svgElement ? this.vel.removeClass(t).addClass(e) : this.$el.removeClass(t).addClass(e);
    }
  },
  init: function() {
  },
  onRender: function() {
  },
  confirmUpdate: function() {
    return 0;
  },
  setTheme: function(t, e) {
    return e = e || {}, this.theme && this.requireSetThemeOverride && !e.override ? this : (this.removeThemeClassName(), this.addThemeClassName(t), this.onSetTheme(this.theme, t), this.theme = t, this);
  },
  addThemeClassName: function(t) {
    if (t = t || this.theme, !t) return this;
    var e = this.themeClassNamePrefix + t;
    return this.svgElement ? this.vel.addClass(e) : this.$el.addClass(e), this;
  },
  removeThemeClassName: function(t) {
    t = t || this.theme;
    var e = this.themeClassNamePrefix + t;
    return this.svgElement ? this.vel.removeClass(e) : this.$el.removeClass(e), this;
  },
  onSetTheme: function(t, e) {
  },
  remove: function() {
    return this.onRemove(), this.undelegateDocumentEvents(), Le[this.cid] = null, Ie.prototype.remove.apply(this, arguments), this;
  },
  onRemove: function() {
  },
  getEventNamespace: function() {
    return ".joint-event-ns-" + this.cid;
  },
  delegateElementEvents: function(t, e, n) {
    if (!e) return this;
    n || (n = {});
    var r = this.getEventNamespace();
    for (var i in e) {
      var s = e[i];
      typeof s != "function" && (s = this[s]), s && xt(t).on(i + r, n, s.bind(this));
    }
    return this;
  },
  undelegateElementEvents: function(t) {
    return xt(t).off(this.getEventNamespace()), this;
  },
  delegateDocumentEvents: function(t, e) {
    return t || (t = wt(this, "documentEvents")), this.delegateElementEvents(document, t, e);
  },
  undelegateDocumentEvents: function() {
    return this.undelegateElementEvents(document);
  },
  eventData: function(t, e) {
    if (!t) throw new Error("eventData(): event object required.");
    var n = t.data, r = "__" + this.cid + "__";
    return e === void 0 ? n ? n[r] || {} : {} : (n || (n = t.data = {}), n[r] || (n[r] = {}), $(n[r], e), this);
  },
  stopPropagation: function(t) {
    return this.eventData(t, { propagationStopped: !0 }), this;
  },
  isPropagationStopped: function(t) {
    return !!this.eventData(t).propagationStopped;
  }
}, { extend: function() {
  var t = Array.from(arguments), e = t[0] && $({}, t[0]) || {}, n = t[1] && $({}, t[1]) || {}, r = e.render || this.prototype && this.prototype.render || null;
  return e.render = function() {
    return typeof r == "function" && r.apply(this, arguments), this.render.__render__ === r && this.onRender(), this;
  }, e.render.__render__ = r, Ie.extend.call(this, e, n);
} });
var Hr = class {
  constructor(...t) {
    this.callbackArguments = t;
  }
  listenTo(t, e, ...n) {
    const { callbackArguments: r } = this;
    if (e && typeof e == "object") {
      const [i = null] = n;
      Object.entries(e).forEach(([s, o]) => {
        typeof o == "function" && ((i || r.length > 0) && (o = o.bind(i, ...r)), Lt.listenTo.call(this, t, s, o));
      });
    } else if (typeof e == "string" && typeof n[0] == "function") {
      let [i, s = null] = n;
      (s || r.length > 0) && (i = i.bind(s, ...r)), Lt.listenTo.call(this, t, e, i);
    }
  }
  stopListening() {
    Lt.stopListening.call(this);
  }
}, Ee = function(t, e) {
  e || (e = {}), this.preinitialize.apply(this, arguments), e.model && (this.model = e.model), e.comparator !== void 0 && (this.comparator = e.comparator), this._reset(), this.initialize.apply(this, arguments), t && this.reset(t, $({ silent: !0 }, e));
}, Mg = {
  add: !0,
  remove: !0,
  merge: !0
}, Ig = {
  add: !0,
  remove: !1
}, Po = function(t, e, n) {
  n = Math.min(Math.max(n, 0), t.length);
  var r = Array(t.length - n), i = e.length, s;
  for (s = 0; s < r.length; s++) r[s] = t[s + n];
  for (s = 0; s < i; s++) t[s + n] = e[s];
  for (s = 0; s < r.length; s++) t[s + i + n] = r[s];
};
$(Ee.prototype, Lt, {
  model: Kt,
  preinitialize: function() {
  },
  initialize: function() {
  },
  toJSON: function(t) {
    return this.map(function(e) {
      return e.toJSON(t);
    });
  },
  add: function(t, e) {
    return this.set(t, $({ merge: !1 }, e, Ig));
  },
  remove: function(t, e) {
    e = $({}, e);
    var n = !Array.isArray(t);
    t = n ? [t] : t.slice();
    var r = this._removeModels(t, e);
    return !e.silent && r.length && (e.changes = {
      added: [],
      merged: [],
      removed: r
    }, this.trigger("update", this, e)), n ? r[0] : r;
  },
  set: function(t, e) {
    if (t != null) {
      e = $({}, Mg, e);
      var n = !Array.isArray(t);
      t = n ? [t] : t.slice();
      var r = e.at;
      r != null && (r = +r), r > this.length && (r = this.length), r < 0 && (r += this.length + 1);
      var i = [], s = [], o = [], a = [], c = {}, u = e.add, h = e.merge, l = e.remove, d = !1, g = this.comparator && r == null && e.sort !== !1, v = Ct(this.comparator) ? this.comparator : null, y, w;
      for (w = 0; w < t.length; w++) {
        y = t[w];
        var x = this.get(y);
        if (x) {
          if (h && y !== x) {
            var P = this._isModel(y) ? y.attributes : y;
            x.set(P, e), o.push(x), g && !d && (d = x.hasChanged(v));
          }
          c[x.cid] || (c[x.cid] = !0, i.push(x)), t[w] = x;
        } else u && (y = t[w] = this._prepareModel(y, e), y && (s.push(y), this._addReference(y, e), c[y.cid] = !0, i.push(y)));
      }
      if (l) {
        for (w = 0; w < this.length; w++)
          y = this.models[w], c[y.cid] || a.push(y);
        a.length && this._removeModels(a, e);
      }
      var T = !1, L = !g && u && l;
      if (i.length && L ? (T = this.length !== i.length || this.models.some(function(I, R) {
        return I !== i[R];
      }), this.models.length = 0, Po(this.models, i, 0), this.length = this.models.length) : s.length && (g && (d = !0), Po(this.models, s, r ?? this.length), this.length = this.models.length), d && this.sort({ silent: !0 }), !e.silent) {
        for (w = 0; w < s.length; w++)
          r != null && (e.index = r + w), y = s[w], y.trigger("add", y, this, e);
        (d || T) && this.trigger("sort", this, e), (s.length || a.length || o.length) && (e.changes = {
          added: s,
          removed: a,
          merged: o
        }, this.trigger("update", this, e));
      }
      return n ? t[0] : t;
    }
  },
  reset: function(t, e) {
    e = e ? Ot(e) : {};
    for (var n = 0; n < this.models.length; n++) this._removeReference(this.models[n], e);
    return e.previousModels = this.models, this._reset(), t = this.add(t, $({ silent: !0 }, e)), e.silent || this.trigger("reset", this, e), t;
  },
  push: function(t, e) {
    return this.add(t, $({ at: this.length }, e));
  },
  pop: function(t) {
    var e = this.at(this.length - 1);
    return this.remove(e, t);
  },
  unshift: function(t, e) {
    return this.add(t, $({ at: 0 }, e));
  },
  shift: function(t) {
    var e = this.at(0);
    return this.remove(e, t);
  },
  slice: function() {
    return Array.prototype.slice.apply(this.models, arguments);
  },
  get: function(t) {
    if (t != null)
      return this._byId[t] || this._byId[this.modelId(this._isModel(t) ? t.attributes : t, t.idAttribute)] || t.cid && this._byId[t.cid];
  },
  has: function(t) {
    return this.get(t) != null;
  },
  at: function(t) {
    return t < 0 && (t += this.length), this.models[t];
  },
  sort: function(t) {
    var e = this.comparator;
    if (!e) throw new Error("Cannot sort a set without a comparator");
    t || (t = {});
    var n = e.length;
    return bt(e) && (e = e.bind(this)), n === 1 || Ct(e) ? this.models = this.sortBy(e) : this.models.sort(e), t.silent || this.trigger("sort", this, t), this;
  },
  clone: function() {
    return new this.constructor(this.models, {
      model: this.model,
      comparator: this.comparator
    });
  },
  modelId: function(t, e) {
    return t[e || this.model.prototype.idAttribute || "id"];
  },
  values: function() {
    return new Cn(this, Wc);
  },
  keys: function() {
    return new Cn(this, Hc);
  },
  entries: function() {
    return new Cn(this, Og);
  },
  each: function(t, e) {
    this.models.forEach(t, e);
  },
  filter: function(t, e) {
    return this.models.filter(t, e);
  },
  find: function(t, e) {
    return this.models.find(t, e);
  },
  findIndex: function(t, e) {
    return this.models.findIndex(t, e);
  },
  first: function() {
    return this.models[0];
  },
  includes: function(t) {
    return this.models.includes(t);
  },
  last: function() {
    return this.models[this.models.length - 1];
  },
  isEmpty: function() {
    return !this.models.length;
  },
  map: function(t, e) {
    return this.models.map(t, e);
  },
  reduce: function(t, e = this.first()) {
    return this.models.reduce(t, e);
  },
  _reset: function() {
    this.length = 0, this.models = [], this._byId = {};
  },
  _prepareModel: function(t, e) {
    if (this._isModel(t))
      return t.collection || (t.collection = this), t;
    e = e ? Ot(e) : {}, e.collection = this;
    var n;
    return this.model.prototype ? n = new this.model(t, e) : n = this.model(t, e), n.validationError ? (this.trigger("invalid", this, n.validationError, e), !1) : n;
  },
  _removeModels: function(t, e) {
    for (var n = [], r = 0; r < t.length; r++) {
      var i = this.get(t[r]);
      if (i) {
        var s = this.models.indexOf(i);
        this.models.splice(s, 1), this.length--, delete this._byId[i.cid];
        var o = this.modelId(i.attributes, i.idAttribute);
        o != null && delete this._byId[o], e.silent || (e.index = s, i.trigger("remove", i, this, e)), n.push(i), this._removeReference(i, e);
      }
    }
    return t.length > 0 && !e.silent && delete e.index, n;
  },
  _isModel: function(t) {
    return t instanceof Kt;
  },
  _addReference: function(t, e) {
    this._byId[t.cid] = t;
    var n = this.modelId(t.attributes, t.idAttribute);
    n != null && (this._byId[n] = t), t.on("all", this._onModelEvent, this);
  },
  _removeReference: function(t, e) {
    delete this._byId[t.cid];
    var n = this.modelId(t.attributes, t.idAttribute);
    n != null && delete this._byId[n], this === t.collection && delete t.collection, t.off("all", this._onModelEvent, this);
  },
  _onModelEvent: function(t, e, n, r) {
    if (e) {
      if ((t === "add" || t === "remove") && n !== this) return;
      if (t === "changeId") {
        var i = this.modelId(e.previousAttributes(), e.idAttribute), s = this.modelId(e.attributes, e.idAttribute);
        i != null && delete this._byId[i], s != null && (this._byId[s] = e);
      }
    }
    this.trigger.apply(this, arguments);
  }
});
var Er = typeof Symbol == "function" && Symbol.iterator;
Er && (Ee.prototype[Er] = Ee.prototype.values);
var Cn = function(t, e) {
  this._collection = t, this._kind = e, this._index = 0;
}, Wc = 1, Hc = 2, Og = 3;
Er && (Cn.prototype[Er] = function() {
  return this;
});
Cn.prototype.next = function() {
  if (this._collection) {
    if (this._index < this._collection.length) {
      var t = this._collection.at(this._index);
      this._index++;
      var e;
      if (this._kind === Wc) e = t;
      else {
        var n = this._collection.modelId(t.attributes, t.idAttribute);
        this._kind === Hc ? e = n : e = [n, t];
      }
      return {
        value: e,
        done: !1
      };
    }
    this._collection = void 0;
  }
  return {
    value: void 0,
    done: !0
  };
};
var Rg = {
  toArray: 1,
  sortBy: 3
}, Dg = [
  Ee,
  Rg,
  "models"
];
function Fg(t) {
  var e = t[0], n = t[1], r = t[2];
  qf(e, {
    sortBy: fr,
    toArray: pt
  }, n, r);
}
Fg(Dg);
Ee.extend = ds;
function An(t) {
  return t ? Array.isArray(t) ? t : [t] : [];
}
const re = an.extend({
  tagName: "g",
  svgElement: !0,
  className: "highlight",
  HIGHLIGHT_FLAG: 1,
  UPDATE_PRIORITY: 3,
  DETACHABLE: !1,
  UPDATABLE: !0,
  MOUNTABLE: !0,
  cellView: null,
  nodeSelector: null,
  node: null,
  updateRequested: !1,
  postponedUpdate: !1,
  transformGroup: null,
  detachedTransformGroup: null,
  requestUpdate(t, e) {
    const { paper: n } = t;
    this.cellView = t, this.nodeSelector = e, n && (this.updateRequested = !0, n.requestViewUpdate(this, this.HIGHLIGHT_FLAG, this.UPDATE_PRIORITY));
  },
  confirmUpdate() {
    this.updateRequested = !1;
    const { cellView: t, nodeSelector: e } = this;
    return t.isMounted() ? (this.update(t, e), this.mount(), this.transform()) : this.postponedUpdate = !0, 0;
  },
  findNode(t, e = null) {
    let n;
    if (typeof e == "string") n = t.findNode(e);
    else if (Tt(e)) {
      const r = t.model.isLink(), { label: i = null, port: s, selector: o } = e;
      r && i !== null ? n = t.findLabelNode(i, o) : !r && s ? n = t.findPortNode(s, o) : n = t.findNode(o);
    } else e && (n = B.toNode(e), n instanceof SVGElement || (n = null));
    return n || null;
  },
  getNodeMatrix(t, e) {
    const { options: n } = this, { layer: r } = n, { rotatableNode: i } = t, s = t.getNodeMatrix(e);
    return i ? r ? i.contains(e) ? s : t.getRootRotateMatrix().inverse().multiply(s) : t.getNodeRotateMatrix(e).multiply(s) : s;
  },
  mount() {
    const { MOUNTABLE: t, cellView: e, el: n, options: r, transformGroup: i, detachedTransformGroup: s, postponedUpdate: o, nodeSelector: a } = this;
    if (!t || i) return;
    if (o) {
      this.update(e, a), this.transform();
      return;
    }
    const { vel: c, paper: u } = e, { layer: h } = r;
    if (h) {
      let l;
      s ? (l = s, this.detachedTransformGroup = null) : l = B("g").addClass("highlight-transform").append(n), this.transformGroup = l, u.getLayerView(h).insertSortedNode(l.node, r.z);
    } else (!n.parentNode || n.nextSibling) && c.append(n);
  },
  unmount() {
    const { MOUNTABLE: t, transformGroup: e, vel: n } = this;
    t && (e ? (this.transformGroup = null, this.detachedTransformGroup = e, e.remove()) : n.remove());
  },
  transform() {
    const { transformGroup: t, cellView: e, updateRequested: n } = this;
    if (!t || e.model.isLink() || n) return;
    const r = e.getRootTranslateMatrix(), i = e.getRootRotateMatrix(), s = r.multiply(i);
    t.attr("transform", B.matrixToTransformString(s));
  },
  update() {
    const { node: t, cellView: e, nodeSelector: n, updateRequested: r, id: i } = this;
    if (r) return;
    this.postponedUpdate = !1;
    const s = this.node = this.findNode(e, n);
    t && this.unhighlight(e, t), s ? (this.highlight(e, s), this.mount()) : (this.unmount(), e.notify("cell:highlight:invalid", i, this));
  },
  onRemove() {
    const { node: t, cellView: e, id: n, constructor: r } = this;
    t && this.unhighlight(e, t), this.unmount(), r._removeRef(e, n);
  },
  highlight(t, e) {
  },
  unhighlight(t, e) {
  },
  listenToUpdateAttributes(t) {
    const e = wt(this, "UPDATE_ATTRIBUTES");
    !Array.isArray(e) || e.length === 0 || this.listenTo(t.model, "change", this.onCellAttributeChange);
  },
  onCellAttributeChange() {
    const { cellView: t } = this;
    if (!t) return;
    const { model: e, paper: n } = t;
    wt(this, "UPDATE_ATTRIBUTES").some((i) => e.hasChanged(i)) && n.requestViewUpdate(this, this.HIGHLIGHT_FLAG, this.UPDATE_PRIORITY);
  }
}, {
  _views: {},
  highlight: function(t, e, n) {
    const r = this.uniqueId(e, n);
    this.add(t, e, r, n);
  },
  unhighlight: function(t, e, n) {
    const r = this.uniqueId(e, n);
    this.remove(t, r);
  },
  get(t, e = null) {
    const { cid: n } = t, { _views: r } = this, i = r[n];
    if (e === null) {
      const s = [];
      if (!i) return s;
      for (let o in i) {
        const a = i[o];
        a instanceof this && s.push(a);
      }
      return s;
    } else {
      if (!i) return null;
      if (e in i) {
        const s = i[e];
        if (s instanceof this) return s;
      }
      return null;
    }
  },
  add(t, e, n, r = {}) {
    if (!n) throw new Error("dia.HighlighterView: An ID required.");
    const i = re.get(t, n);
    i && i.remove();
    const s = new this(r);
    return s.id = n, this._addRef(t, n, s), s.requestUpdate(t, e), s.listenToUpdateAttributes(t), s;
  },
  _addRef(t, e, n) {
    const { cid: r } = t, { _views: i } = this;
    let s = i[r];
    s || (s = i[r] = {}), s[e] = n;
  },
  _removeRef(t, e) {
    const { cid: n } = t, { _views: r } = this, i = r[n];
    if (i) {
      e && delete i[e];
      for (let s in i) return;
      delete r[n];
    }
  },
  remove(t, e = null) {
    An(this.get(t, e)).forEach((n) => {
      n.remove();
    });
  },
  getAll(t, e = null) {
    const n = [], { _views: r } = this;
    for (let i in r) for (let s in r[i]) {
      const o = r[i][s];
      o.cellView.paper === t && o instanceof this && (e === null || s === e) && n.push(o);
    }
    return n;
  },
  removeAll(t, e = null) {
    this.getAll(t, e).forEach((n) => n.remove());
  },
  update(t, e = null, n = !1) {
    An(this.get(t, e)).forEach((r) => {
      (n || r.UPDATABLE) && r.update();
    });
  },
  transform(t, e = null) {
    An(this.get(t, e)).forEach((n) => {
      n.UPDATABLE && n.transform();
    });
  },
  unmount(t, e = null) {
    An(this.get(t, e)).forEach((n) => n.unmount());
  },
  mount(t, e = null) {
    An(this.get(t, e)).forEach((n) => n.mount());
  },
  uniqueId(t, e = "") {
    return B.ensureId(t) + JSON.stringify(e);
  }
}), Bg = re.extend({
  tagName: "path",
  className: "highlight-stroke",
  attributes: {
    "pointer-events": "none",
    fill: "none"
  },
  options: {
    padding: 3,
    rx: 0,
    ry: 0,
    useFirstSubpath: !1,
    attrs: {
      "stroke-width": 3,
      stroke: "#FEB663"
    }
  },
  getPathData(t, e) {
    const { options: n } = this, { useFirstSubpath: r } = n;
    let i;
    try {
      const s = B(e);
      if (i = s.convertToPathData().trim(), s.tagName() === "PATH" && r) {
        const o = i.search(/.M/i) + 1;
        o > 0 && (i = i.substr(0, o));
      }
    } catch {
      const o = t.getNodeBoundingRect(e);
      i = B.rectToPath($({}, n, o.toJSON()));
    }
    return i;
  },
  highlightConnection(t) {
    this.vel.attr("d", t.getSerializedConnection());
  },
  highlightNode(t, e) {
    const { vel: n, options: r } = this, { padding: i, layer: s } = r;
    let o = this.getNodeMatrix(t, e);
    if (i) {
      !s && e === t.el && n.remove();
      let a = t.getNodeBoundingRect(e);
      const c = a.x + a.width / 2, u = a.y + a.height / 2;
      a = B.transformRect(a, o);
      const h = Math.max(a.width, 1), l = Math.max(a.height, 1), d = (h + i) / h, g = (l + i) / l, v = B.createSVGMatrix({
        a: d,
        b: 0,
        c: 0,
        d: g,
        e: c - d * c,
        f: u - g * u
      });
      o = o.multiply(v);
    }
    n.attr({
      d: this.getPathData(t, e),
      transform: B.matrixToTransformString(o)
    });
  },
  highlight(t, e) {
    const { vel: n, options: r } = this;
    n.attr(r.attrs), r.nonScalingStroke && n.attr("vector-effect", "non-scaling-stroke"), t.isNodeConnection(e) ? this.highlightConnection(t) : this.highlightNode(t, e);
  }
}), Eo = 20;
function Vg(t, e) {
  const n = t.children();
  for (; n.length > 0; ) {
    const r = n.shift();
    e(r) && n.push(...r.children());
  }
}
const tn = re.extend({
  tagName: "rect",
  className: "highlight-mask",
  attributes: { "pointer-events": "none" },
  options: {
    padding: 3,
    maskClip: Eo,
    deep: !1,
    attrs: {
      stroke: "#FEB663",
      "stroke-width": 3,
      "stroke-linecap": "butt",
      "stroke-linejoin": "miter"
    }
  },
  VISIBLE: "white",
  INVISIBLE: "black",
  MASK_ROOT_ATTRIBUTE_BLACKLIST: [
    "marker-start",
    "marker-end",
    "marker-mid",
    "transform",
    "stroke-dasharray",
    "class"
  ],
  MASK_CHILD_ATTRIBUTE_BLACKLIST: [
    "stroke",
    "fill",
    "stroke-width",
    "stroke-opacity",
    "stroke-dasharray",
    "fill-opacity",
    "marker-start",
    "marker-end",
    "marker-mid",
    "class"
  ],
  MASK_REPLACE_TAGS: [
    "FOREIGNOBJECT",
    "IMAGE",
    "USE",
    "TEXT",
    "TSPAN",
    "TEXTPATH"
  ],
  MASK_REMOVE_TAGS: [
    "TEXT",
    "TSPAN",
    "TEXTPATH"
  ],
  transformMaskChild(t, e) {
    const { MASK_CHILD_ATTRIBUTE_BLACKLIST: n, MASK_REPLACE_TAGS: r, MASK_REMOVE_TAGS: i } = this, s = e.tagName();
    if (!B.isSVGGraphicsElement(e) || i.includes(s))
      return e.remove(), !1;
    if (r.includes(s)) {
      const o = t.vel.findOne(`#${e.id}`);
      if (o) {
        const { node: a } = o;
        let c = t.getNodeBoundingRect(a);
        t.model.isElement() && (c = B.transformRect(c, t.getNodeMatrix(a)));
        const u = B("rect", c.toJSON()), { x: h, y: l } = c.center(), { angle: d, cx: g = h, cy: v = l } = o.rotate();
        d && u.rotate(d, g, v), e.parent().append(u);
      }
      return e.remove(), !1;
    }
    return n.forEach((o) => {
      o === "fill" && e.attr("fill") === "none" || e.removeAttr(o);
    }), !0;
  },
  transformMaskRoot(t, e) {
    const { MASK_ROOT_ATTRIBUTE_BLACKLIST: n } = this;
    n.forEach((r) => {
      e.removeAttr(r);
    });
  },
  getMaskShape(t, e) {
    const { options: n, MASK_REPLACE_TAGS: r } = this, { deep: i } = n, s = e.tagName();
    let o;
    if (s === "G") {
      if (!i) return null;
      o = e.clone(), Vg(o, (a) => this.transformMaskChild(t, a));
    } else {
      if (r.includes(s)) return null;
      o = e.clone();
    }
    return this.transformMaskRoot(t, o), o;
  },
  getMaskId() {
    return `highlight-mask-${this.cid}`;
  },
  getMask(t, e) {
    const { VISIBLE: n, INVISIBLE: r, options: i } = this, { padding: s, attrs: o } = i, a = parseFloat(B("g").attr(o).attr("stroke-width")), c = e.attr("fill") !== "none";
    let u = parseFloat(e.attr("stroke-width"));
    isNaN(u) && (u = 1);
    const h = u + s * 2, l = h + a * 2;
    let d = this.getMaskShape(t, e);
    if (!d) {
      const g = t.getNodeBoundingRect(e.node);
      g.inflate(g.width ? 0 : 0.5, g.height ? 0 : 0.5), d = B("rect", g.toJSON());
    }
    return d.attr(o), B("mask", { id: this.getMaskId() }).append([d.clone().attr({
      fill: c ? n : "none",
      stroke: n,
      "stroke-width": l
    }), d.clone().attr({
      fill: c ? r : "none",
      stroke: r,
      "stroke-width": h
    })]);
  },
  removeMask(t) {
    const e = t.svg.getElementById(this.getMaskId());
    e && t.defs.removeChild(e);
  },
  addMask(t, e) {
    t.defs.appendChild(e.node);
  },
  highlight(t, e) {
    const { options: n, vel: r } = this, { padding: i, attrs: s, maskClip: o = Eo, layer: a } = n, c = "stroke" in s ? s.stroke : "#000000";
    !a && e === t.el && r.remove();
    const u = t.getNodeBoundingRect(e).inflate(i + o), h = this.getNodeMatrix(t, e), l = this.getMask(t, B(e));
    this.addMask(t.paper, l), r.attr(u.toJSON()), r.attr({
      transform: B.matrixToTransformString(h),
      mask: `url(#${l.id})`,
      fill: c
    });
  },
  unhighlight(t) {
    this.removeMask(t.paper);
  }
}), Gg = re.extend({
  UPDATABLE: !1,
  MOUNTABLE: !1,
  highlight: function(t, e) {
    const { alphaValue: n = 0.3 } = this.options;
    e.style.opacity = n;
  },
  unhighlight: function(t, e) {
    e.style.opacity = "";
  }
}), To = pe("highlighted"), zg = re.extend({
  UPDATABLE: !1,
  MOUNTABLE: !1,
  options: { className: To },
  highlight: function(t, e) {
    B(e).addClass(this.options.className);
  },
  unhighlight: function(t, e) {
    B(e).removeClass(this.options.className);
  }
}, { className: To }), si = {
  ROW: "row",
  COLUMN: "column"
}, Ug = re.extend({
  tagName: "g",
  MOUNTABLE: !0,
  UPDATE_ATTRIBUTES: function() {
    return [this.options.attribute];
  },
  _prevItems: null,
  highlight(t, e) {
    const n = t.model, { attribute: r, size: i = 20, gap: s = 5, direction: o = si.ROW } = this.options;
    if (!r) throw new Error("List: attribute is required");
    const a = typeof i == "number" ? {
      width: i,
      height: i
    } : i, c = o === si.ROW, u = c ? a.width : a.height;
    let h = n.get(r);
    Array.isArray(h) || (h = []);
    const l = this._prevItems || [], d = h.map((w, x) => Pe(l[x], h[x]));
    if (l.length !== h.length || d.some((w) => !w)) {
      const w = this.vel.children(), x = h.map((P, T) => {
        const L = T in w ? w[T].node : null;
        if (d[T]) return L;
        const I = this.createListItem(P, a, L);
        if (!I) return null;
        if (!(I instanceof SVGElement)) throw new Error("List: item must be an SVGElement");
        I.dataset.index = T, I.dataset.attribute = r;
        const R = T * (u + s);
        return I.setAttribute("transform", c ? `translate(${R}, 0)` : `translate(0, ${R})`), I;
      });
      this.vel.empty().append(x), this._prevItems = h;
    }
    const g = h.length, v = g === 0 ? 0 : g * u + (g - 1) * s, y = c ? {
      width: v,
      height: a.height
    } : {
      width: a.width,
      height: v
    };
    this.position(n, y);
  },
  position(t, e) {
    const { vel: n, options: r } = this, { margin: i = 5, position: s = "top-left" } = r, { width: o, height: a } = t.size(), { left: c, right: u, top: h, bottom: l } = ze(i), d = new j(c, h, o - (c + u), a - (h + l));
    let { x: g, y: v } = Nc(d, s);
    switch (s) {
      case Pt.CENTER:
      case Pt.TOP:
      case Pt.BOTTOM:
        g -= e.width / 2;
        break;
      case Pt.RIGHT:
      case Pt.BOTTOM_RIGHT:
      case Pt.TOP_RIGHT:
        g -= e.width;
        break;
    }
    switch (s) {
      case Pt.CENTER:
      case Pt.RIGHT:
      case Pt.LEFT:
        v -= e.height / 2;
        break;
      case Pt.BOTTOM:
      case Pt.BOTTOM_RIGHT:
      case Pt.BOTTOM_LEFT:
        v -= e.height;
        break;
    }
    n.attr("transform", `translate(${g}, ${v})`);
  }
}, {
  Directions: si,
  Positions: Pt
});
var $c = {};
Xt($c, {
  addClass: () => zg,
  list: () => Ug,
  mask: () => tn,
  opacity: () => Gg,
  stroke: () => Bg
});
var qc = {};
Xt(qc, {
  anchor: () => Yg,
  bbox: () => Xg,
  boundary: () => Kg,
  rectangle: () => Jg
});
function $r(t, e, n) {
  if (Tt(n)) {
    const { x: i, y: s } = n;
    if (isFinite(s)) {
      const o = new H(e, t), { start: a, end: c } = o.parallel(s);
      e = a, t = c;
    }
    n = i;
  }
  if (!isFinite(n)) return t;
  var r = t.distance(e);
  return n === 0 && r > 0 ? t : t.move(e, -Math.min(n, r - 1));
}
function vs(t) {
  var e = t.getAttribute("stroke-width");
  return e === null ? 0 : parseFloat(e) || 0;
}
function jg(t, e, n = 0) {
  let r, i, s, o;
  const { start: a, end: c } = t;
  switch (e) {
    case "left":
      r = "x", i = c, s = a, o = -1;
      break;
    case "right":
      r = "x", i = a, s = c, o = 1;
      break;
    case "top":
      r = "y", i = c, s = a, o = -1;
      break;
    case "bottom":
      r = "y", i = a, s = c, o = 1;
      break;
    default:
      return;
  }
  a[r] < c[r] ? i[r] = s[r] : s[r] = i[r], isFinite(n) && (i[r] += o * n, s[r] += o * n);
}
function Wg(t, e, n, r) {
  let { offset: i, alignOffset: s, align: o } = r;
  return o && jg(t, o, s), $r(t.end, t.start, i);
}
function Yc(t, e, n, r) {
  var i = e.getNodeBBox(n);
  r.stroke && i.inflate(vs(n) / 2);
  var s = t.intersect(i), o = s ? t.start.chooseClosest(s) : t.end;
  return $r(o, t.start, r.offset);
}
function Hg(t, e, n, r) {
  var i = e.model.angle();
  if (i === 0) return Yc(t, e, n, r);
  var s = e.getNodeUnrotatedBBox(n);
  r.stroke && s.inflate(vs(n) / 2);
  var o = s.center(), a = t.clone().rotate(o, i), c = a.setLength(1e6).intersect(s), u = c ? a.start.chooseClosest(c).rotate(o, -i) : t.end;
  return $r(u, t.start, r.offset);
}
function $g(t) {
  if (!t) return null;
  var e = t;
  do {
    var n = e.tagName;
    if (typeof n != "string") return null;
    if (n = n.toUpperCase(), n === "G") e = e.firstElementChild;
    else if (n === "TITLE") e = e.nextElementSibling;
    else break;
  } while (e);
  return e;
}
var oi = "segmentSubdivisons", ai = "shapeBBox";
function qg(t, e, n, r) {
  var i, s, o = r.selector, a = t.end;
  if (typeof o == "string" ? i = e.findNode(o) : o === !1 ? i = n : Array.isArray(o) ? i = hn(n, o) : i = $g(n), !B.isSVGGraphicsElement(i)) {
    if (i === n || !B.isSVGGraphicsElement(n)) return a;
    i = n;
  }
  var c = e.getNodeShape(i), u = e.getNodeMatrix(i), h = e.getRootTranslateMatrix(), l = e.getRootRotateMatrix(), d = h.multiply(l).multiply(u), g = d.inverse(), v = B.transformLine(t, g), y = v.start.clone(), w = e.getNodeData(i);
  if (r.insideout === !1) {
    w[ai] || (w[ai] = c.bbox());
    var x = w[ai];
    if (x.containsPoint(y)) return a;
  }
  var P;
  if (c instanceof Z) {
    var T = r.precision || 2;
    w[oi] || (w[oi] = c.getSegmentSubdivisions({ precision: T })), P = {
      precision: T,
      segmentSubdivisions: w[oi]
    };
  }
  r.extrapolate === !0 && v.setLength(1e6), s = v.intersect(c, P), s ? B.isArray(s) && (s = y.chooseClosest(s)) : r.sticky === !0 && (c instanceof j ? s = c.pointNearestToPoint(y) : c instanceof Vt ? s = c.intersectionWithLineFromCenterToPoint(y) : s = c.closestPoint(y, P));
  var L = s ? B.transformPoint(s, d) : a, I = r.offset || 0;
  return r.stroke && (I += vs(i) / 2), $r(L, t.start, I);
}
const Yg = Wg, Xg = Yc, Jg = Hg, Kg = qg, Zg = function(t, e, n) {
  return t;
}, Qg = function(t, e, n) {
  var r = e.side || "bottom", i = ze(e.padding || 40), s = n.sourceBBox, o = n.targetBBox, a = s.center(), c = o.center(), u, h, l;
  switch (r) {
    case "bottom":
      l = 1, u = "y", h = "height";
      break;
    case "top":
      l = -1, u = "y", h = "height";
      break;
    case "left":
      l = -1, u = "x", h = "width";
      break;
    case "right":
      l = 1, u = "x", h = "width";
      break;
    default:
      throw new Error("Router: invalid side");
  }
  return a[u] += l * (s[h] / 2 + i[r]), c[u] += l * (o[h] / 2 + i[r]), l * (a[u] - c[u]) > 0 ? c[u] = a[u] : a[u] = c[u], [a].concat(t, c);
};
var tp = {
  N: "S",
  S: "N",
  E: "W",
  W: "E"
}, ep = {
  N: -Math.PI / 2 * 3,
  S: -Math.PI / 2,
  E: 0,
  W: Math.PI
};
function Tr(t, e, n) {
  var r = new E(t.x, e.y);
  return n.containsPoint(r) && (r = new E(e.x, t.y)), r;
}
function Ti(t, e) {
  return t[e === "W" || e === "E" ? "width" : "height"];
}
function Gt(t, e) {
  return t.x === e.x ? t.y > e.y ? "N" : "S" : t.y === e.y ? t.x > e.x ? "W" : "E" : null;
}
function cr(t) {
  return new j(t.x, t.y, 0, 0);
}
function Cr(t) {
  var e = ze(t.padding || t.elementPadding || 20);
  return {
    x: -e.left,
    y: -e.top,
    width: e.left + e.right,
    height: e.top + e.bottom
  };
}
function Xc(t, e) {
  return t.sourceBBox.clone().moveAndExpand(Cr(e));
}
function Jc(t, e) {
  return t.targetBBox.clone().moveAndExpand(Cr(e));
}
function np(t, e) {
  if (t.sourceAnchor) return t.sourceAnchor;
  var n = Xc(t, e);
  return n.center();
}
function rp(t, e) {
  if (t.targetAnchor) return t.targetAnchor;
  var n = Jc(t, e);
  return n.center();
}
function Kc(t, e, n) {
  var r = new E(t.x, e.y), i = new E(e.x, t.y), s = Gt(t, r), o = Gt(t, i), a = tp[n], c = s === n || s !== a && (o === a || o !== n) ? r : i;
  return {
    points: [c],
    direction: Gt(c, e)
  };
}
function vr(t, e, n) {
  var r = Tr(t, e, n);
  return {
    points: [r],
    direction: Gt(r, e)
  };
}
function ip(t, e, n, r) {
  var i = {}, s = [new E(t.x, e.y), new E(e.x, t.y)], o = s.filter(function(l) {
    return !n.containsPoint(l);
  }), a = o.filter(function(l) {
    return Gt(l, t) !== r;
  }), c;
  if (a.length > 0)
    c = a.filter(function(l) {
      return Gt(t, l) === r;
    }).pop(), c = c || a[0], i.points = [c], i.direction = Gt(c, e);
  else {
    c = Uh(s, o)[0];
    var u = new E(e).move(c, -Ti(n, r) / 2), h = Tr(u, t, n);
    i.points = [h, u], i.direction = Gt(u, e);
  }
  return i;
}
function sp(t, e, n, r) {
  var i = vr(e, t, r), s = i.points[0];
  if (n.containsPoint(s)) {
    i = vr(t, e, n);
    var o = i.points[0];
    if (r.containsPoint(o)) {
      var a = new E(t).move(o, -Ti(n, Gt(t, o)) / 2), c = new E(e).move(s, -Ti(r, Gt(e, s)) / 2), u = new H(a, c).midpoint(), h = vr(t, u, n), l = Kc(u, e, h.direction);
      i.points = [h.points[0], l.points[0]], i.direction = l.direction;
    }
  }
  return i;
}
function ci(t, e, n, r, i) {
  var s = {}, o = n.union(r).inflate(1), a = o.center().distance(e) > o.center().distance(t), c = a ? e : t, u = a ? t : e, h, l, d;
  return i ? (h = E.fromPolar(o.width + o.height, ep[i], c), h = o.pointNearestToPoint(h).move(h, -1)) : h = o.pointNearestToPoint(c).move(c, 1), l = Tr(h, u, o), h.round().equals(l.round()) ? (l = E.fromPolar(o.width + o.height, Ut(h.theta(c)) + Math.PI / 2, u), l = o.pointNearestToPoint(l).move(u, 1).round(), d = Tr(h, l, o), s.points = a ? [
    l,
    d,
    h
  ] : [
    h,
    d,
    l
  ]) : s.points = a ? [l, h] : [h, l], s.direction = Gt(a ? h : l, e), s;
}
function Ci(t, e, n) {
  var r = Xc(n, e), i = Jc(n, e), s = np(n, e), o = rp(n, e);
  r = r.union(cr(s)), i = i.union(cr(o)), t = pt(t).map(E), t.unshift(s), t.push(o);
  for (var a, c = [], u = 0, h = t.length - 1; u < h; u++) {
    var l = null, d = t[u], g = t[u + 1], v = !!Gt(d, g);
    if (u === 0)
      u + 1 === h ? r.intersect(i.clone().inflate(1)) ? l = ci(d, g, r, i) : v || (l = sp(d, g, r, i)) : r.containsPoint(g) ? l = ci(d, g, r, cr(g).moveAndExpand(Cr(e))) : v || (l = vr(d, g, r));
    else if (u + 1 === h) {
      var y = v && Gt(g, d) === a;
      i.containsPoint(d) || y ? l = ci(d, g, cr(d).moveAndExpand(Cr(e)), i, a) : v || (l = ip(d, g, i, a));
    } else v || (l = Kc(d, g, a));
    l ? (Array.prototype.push.apply(c, l.points), a = l.direction) : a = Gt(d, g), u + 1 < h && c.push(g);
  }
  return c;
}
var Zc = {
  step: 10,
  maximumLoops: 2e3,
  precision: 1,
  maxAllowedDirectionChange: 90,
  perpendicular: !0,
  excludeEnds: [],
  excludeTypes: [],
  startDirections: [
    "top",
    "right",
    "bottom",
    "left"
  ],
  endDirections: [
    "top",
    "right",
    "bottom",
    "left"
  ],
  directionMap: {
    top: {
      x: 0,
      y: -1
    },
    right: {
      x: 1,
      y: 0
    },
    bottom: {
      x: 0,
      y: 1
    },
    left: {
      x: -1,
      y: 0
    }
  },
  cost: function() {
    return this.step;
  },
  directions: function() {
    var t = this.step, e = this.cost();
    return [
      {
        offsetX: t,
        offsetY: 0,
        cost: e
      },
      {
        offsetX: -t,
        offsetY: 0,
        cost: e
      },
      {
        offsetX: 0,
        offsetY: t,
        cost: e
      },
      {
        offsetX: 0,
        offsetY: -t,
        cost: e
      }
    ];
  },
  penalties: function() {
    return {
      0: 0,
      45: this.step / 2,
      90: this.step / 2
    };
  },
  paddingBox: function() {
    var t = this.step;
    return {
      x: -t,
      y: -t,
      width: 2 * t,
      height: 2 * t
    };
  },
  isPointObstacle: null,
  fallbackRouter: function(t, e, n) {
    if (!bt(Ci)) throw new Error("Manhattan requires the orthogonal router as default fallback.");
    return Ci(t, $({}, Zc, e), n);
  },
  fallbackRoute: function(t, e, n) {
    return null;
  },
  draggingRoute: null
};
function ms(t) {
  this.map = {}, this.options = t, this.mapGridSize = 100;
}
ms.prototype.build = function(t, e) {
  var n = this.options, r = pt(n.excludeEnds).reduce(function(c, u) {
    var h = e.get(u);
    if (h) {
      var l = t.getCell(h.id);
      l && c.push(l);
    }
    return c;
  }, []), i = [], s = t.getCell(e.get("source").id);
  s && (i = wi(i, s.getAncestors().map(function(c) {
    return c.id;
  })));
  var o = t.getCell(e.get("target").id);
  o && (i = wi(i, o.getAncestors().map(function(c) {
    return c.id;
  })));
  var a = this.mapGridSize;
  return t.getElements().reduce(function(c, u) {
    var h = pt(n.excludeTypes).includes(u.get("type")), l = r.find(function(L) {
      return L.id === u.id;
    }), d = i.includes(u.id), g = h || l || d;
    if (!g)
      for (var v = u.getBBox().moveAndExpand(n.paddingBox), y = v.origin().snapToGrid(a), w = v.corner().snapToGrid(a), x = y.x; x <= w.x; x += a) for (var P = y.y; P <= w.y; P += a) {
        var T = x + "@" + P;
        c[T] = c[T] || [], c[T].push(v);
      }
    return c;
  }, this.map), this;
};
ms.prototype.isPointAccessible = function(t) {
  var e = t.clone().snapToGrid(this.mapGridSize).toString();
  return pt(this.map[e]).every(function(n) {
    return !n.containsPoint(t);
  });
};
function He() {
  this.items = [], this.hash = {}, this.values = {}, this.OPEN = 1, this.CLOSE = 2;
}
He.prototype.add = function(t, e) {
  this.hash[t] ? this.items.splice(this.items.indexOf(t), 1) : this.hash[t] = this.OPEN, this.values[t] = e;
  var n = ac(this.items, t, (function(r) {
    return this.values[r];
  }).bind(this));
  this.items.splice(n, 0, t);
};
He.prototype.remove = function(t) {
  this.hash[t] = this.CLOSE;
};
He.prototype.isOpen = function(t) {
  return this.hash[t] === this.OPEN;
};
He.prototype.isClose = function(t) {
  return this.hash[t] === this.CLOSE;
};
He.prototype.isEmpty = function() {
  return this.items.length === 0;
};
He.prototype.pop = function() {
  var t = this.items.shift();
  return this.remove(t), t;
};
function Qc(t, e) {
  return e && e.paddingBox ? t.sourceBBox.clone().moveAndExpand(e.paddingBox) : t.sourceBBox.clone();
}
function tl(t, e) {
  return e && e.paddingBox ? t.targetBBox.clone().moveAndExpand(e.paddingBox) : t.targetBBox.clone();
}
function el(t, e) {
  if (t.sourceAnchor) return t.sourceAnchor;
  var n = Qc(t, e);
  return n.center();
}
function op(t, e) {
  if (t.targetAnchor) return t.targetAnchor;
  var n = tl(t, e);
  return n.center();
}
function li(t, e, n, r, i) {
  var s = 360 / n, o = t.theta(ap(t, e, r, i)), a = Qt(o + s / 2);
  return s * Math.floor(a / s);
}
function ap(t, e, n, r) {
  var i = r.step, s = e.x - t.x, o = e.y - t.y, a = s / n.x, c = o / n.y, u = a * i, h = c * i;
  return new E(t.x + u, t.y + h);
}
function Co(t, e) {
  var n = Math.abs(t - e);
  return n > 180 ? 360 - n : n;
}
function cp(t, e, n) {
  var r = n.step;
  pt(n.directions).forEach(function(i) {
    i.gridOffsetX = i.offsetX / r * e.x, i.gridOffsetY = i.offsetY / r * e.y;
  });
}
function lp(t, e, n) {
  return {
    source: e.clone(),
    x: ko(n.x - e.x, t),
    y: ko(n.y - e.y, t)
  };
}
function ko(t, e) {
  if (!t) return e;
  var n = Math.abs(t), r = Math.round(n / e);
  if (!r) return n;
  var i = r * e, s = n - i, o = s / r;
  return e + o;
}
function up(t, e) {
  var n = e.source, r = Be(t.x - n.x, e.x) + n.x, i = Be(t.y - n.y, e.y) + n.y;
  return new E(r, i);
}
function En(t, e) {
  return t.round(e);
}
function mr(t, e, n) {
  return En(up(t.clone(), e), n);
}
function kn(t) {
  return t.clone().toString();
}
function ui(t) {
  return new E(t.x === 0 ? 0 : Math.abs(t.x) / t.x, t.y === 0 ? 0 : Math.abs(t.y) / t.y);
}
function hp(t, e, n, r, i, s, o) {
  for (var a = [], c = ui(i.difference(n)), u = kn(n), h = t[u], l; h; ) {
    l = e[u];
    var d = ui(l.difference(h));
    d.equals(c) || (a.unshift(l), c = d), u = kn(h), h = t[u];
  }
  var g = e[u], v = ui(g.difference(r));
  return v.equals(c) || a.unshift(g), a;
}
function Lo(t, e) {
  for (var n = 1 / 0, r = 0, i = e.length; r < i; r++) {
    var s = t.manhattanDistance(e[r]);
    s < n && (n = s);
  }
  return n;
}
function _o(t, e, n, r, i) {
  var s = i.precision, o = i.directionMap, a = t.difference(e.center()), c = gt(o) ? Object.keys(o) : [], u = pt(n), h = c.reduce(function(l, d) {
    if (u.includes(d)) {
      for (var g = o[d], v = new E(t.x + g.x * (Math.abs(a.x) + e.width), t.y + g.y * (Math.abs(a.y) + e.height)), y = new H(t, v), w = y.intersect(e) || [], x = w.length, P, T = null, L = 0; L < x; L++) {
        var I = w[L], R = t.squaredDistance(I);
        (P === void 0 || R > P) && (P = R, T = I);
      }
      if (T) {
        var f = mr(T, r, s);
        e.containsPoint(f) && (f = mr(f.offset(g.x * r.x, g.y * r.y), r, s)), l.push(f);
      }
    }
    return l;
  }, []);
  return e.containsPoint(t) || h.push(mr(t, r, s)), h;
}
function fp(t, e, n, r) {
  var i = r.precision, s, o;
  t instanceof j ? s = En(el(this, r).clone(), i) : s = En(t.clone(), i), e instanceof j ? o = En(op(this, r).clone(), i) : o = En(e.clone(), i);
  var a = lp(r.step, s, o), c, u, h, l;
  if (t instanceof j ? (c = s, h = _o(c, t, r.startDirections, a, r)) : (c = s, h = [c]), e instanceof j ? (u = o, l = _o(o, e, r.endDirections, a, r)) : (u = o, l = [u]), h = h.filter((nt) => !n(nt)), l = l.filter((nt) => !n(nt)), h.length > 0 && l.length > 0) {
    for (var d = new He(), g = {}, v = {}, y = {}, w = 0, x = h.length; w < x; w++) {
      var P = h[w], T = kn(P);
      d.add(T, Lo(P, l)), g[T] = P, y[T] = 0;
    }
    var L = r.previousDirectionAngle, I = L === void 0, R, f, p = r.directions;
    cp(p, a, r);
    for (var m = p.length, b = pt(l).reduce(function(nt, vt) {
      var ot = kn(vt);
      return nt.push(ot), nt;
    }, []), S = r.maximumLoops; !d.isEmpty() && S > 0; ) {
      var M = d.pop(), _ = g[M], F = v[M], U = y[M], A = F === void 0, C = _.equals(c), k;
      A ? I ? C ? k = null : k = li(c, _, m, a, r) : k = L : k = li(F, _, m, a, r);
      var N = h.length === l.length;
      if (N) {
        for (var D = 0; D < h.length; D++) if (!h[D].equals(l[D])) {
          N = !1;
          break;
        }
      }
      var W = A && N;
      if (!W && b.indexOf(M) >= 0)
        return r.previousDirectionAngle = k, hp(v, g, _, c, u);
      for (w = 0; w < m; w++) {
        R = p[w];
        var st = R.angle;
        if (f = Co(k, st), !(!(I && C) && f > r.maxAllowedDirectionChange)) {
          var at = mr(_.clone().offset(R.gridOffsetX, R.gridOffsetY), a, i), q = kn(at);
          if (!(d.isClose(q) || n(at))) {
            if (b.indexOf(q) >= 0) {
              var K = at.equals(u);
              if (!K) {
                var et = li(at, u, m, a, r), Q = Co(st, et);
                if (Q > r.maxAllowedDirectionChange) continue;
              }
            }
            var Y = R.cost, rt = C ? 0 : r.penalties[f], lt = U + Y + rt;
            (!d.isOpen(q) || lt < y[q]) && (g[q] = at, v[q] = _, y[q] = lt, d.add(q, lt + Lo(at, l)));
          }
        }
      }
      S--;
    }
  }
  return r.fallbackRoute.call(this, c, u, r);
}
function dp(t) {
  if (t.directions = wt(t, "directions"), t.penalties = wt(t, "penalties"), t.paddingBox = wt(t, "paddingBox"), t.padding = wt(t, "padding"), t.padding) {
    var e = ze(t.padding);
    t.paddingBox = {
      x: -e.left,
      y: -e.top,
      width: e.left + e.right,
      height: e.top + e.bottom
    };
  }
  pt(t.directions).forEach(function(n) {
    var r = new E(0, 0), i = new E(n.offsetX, n.offsetY);
    n.angle = Qt(r.theta(i));
  });
}
function gp(t, e, n) {
  dp(e), n.options.perpendicular = !!e.perpendicular;
  var r = Qc(n, e), i = tl(n, e), s = el(n, e);
  let o;
  if (typeof e.isPointObstacle == "function") o = e.isPointObstacle;
  else {
    const T = new ms(e);
    T.build(n.paper.model, n.model), o = (L) => !T.isPointAccessible(L);
  }
  for (var a = pt(t).map(E), c = [], u = s, h, l, d = 0, g = a.length; d <= g; d++) {
    var v = null;
    if (l = h || r, h = a[d], !h) {
      h = i;
      var y = !n.model.get("source").id || !n.model.get("target").id;
      if (y && bt(e.draggingRoute)) {
        var w = l === r ? s : l, x = h.origin();
        v = e.draggingRoute.call(n, w, x, e);
      }
    }
    if (v = v || fp.call(n, l, h, o, e), v === null) return e.fallbackRouter(t, e, n);
    var P = v[0];
    P && P.equals(u) && v.shift(), u = v[v.length - 1] || u, Array.prototype.push.apply(c, v);
  }
  return c;
}
const ki = function(t, e, n) {
  return gp(t, $({}, Zc, e), n);
};
var pp = {
  maxAllowedDirectionChange: 45,
  diagonalCost: function() {
    var t = this.step;
    return Math.ceil(Math.sqrt(t * t << 1));
  },
  directions: function() {
    var t = this.step, e = this.cost(), n = this.diagonalCost();
    return [
      {
        offsetX: t,
        offsetY: 0,
        cost: e
      },
      {
        offsetX: t,
        offsetY: t,
        cost: n
      },
      {
        offsetX: 0,
        offsetY: t,
        cost: e
      },
      {
        offsetX: -t,
        offsetY: t,
        cost: n
      },
      {
        offsetX: -t,
        offsetY: 0,
        cost: e
      },
      {
        offsetX: -t,
        offsetY: -t,
        cost: n
      },
      {
        offsetX: 0,
        offsetY: -t,
        cost: e
      },
      {
        offsetX: t,
        offsetY: -t,
        cost: n
      }
    ];
  },
  fallbackRoute: function(t, e, n) {
    var r = t.theta(e), i = [], s = {
      x: e.x,
      y: t.y
    }, o = {
      x: t.x,
      y: e.y
    };
    if (r % 180 > 90) {
      var a = s;
      s = o, o = a;
    }
    var c = r % 90 < 45 ? s : o, u = new H(t, c), h = 90 * Math.ceil(r / 90), l = E.fromPolar(u.squaredLength(), Ut(h + 135), c), d = new H(e, l), g = u.intersection(d), v = g || e, y = g ? v : t, w = 360 / n.directions.length, x = y.theta(e), P = Qt(x + w / 2), T = w * Math.floor(P / w);
    return n.previousDirectionAngle = T, v && i.push(v.round()), i.push(e), i;
  }
};
const vp = function(t, e, n) {
  if (!bt(ki)) throw new Error("Metro requires the manhattan router.");
  return ki(t, $({}, pp, e), n);
}, z = {
  AUTO: "auto",
  LEFT: "left",
  RIGHT: "right",
  TOP: "top",
  BOTTOM: "bottom",
  ANCHOR_SIDE: "anchor-side",
  MAGNET_SIDE: "magnet-side"
}, No = [
  z.LEFT,
  z.RIGHT,
  z.TOP,
  z.BOTTOM
], ge = {
  [z.LEFT]: z.RIGHT,
  [z.RIGHT]: z.LEFT,
  [z.TOP]: z.BOTTOM,
  [z.BOTTOM]: z.TOP
}, mp = [z.TOP, z.BOTTOM], xe = {
  0: z.RIGHT,
  180: z.LEFT,
  270: z.TOP,
  90: z.BOTTOM
};
function ae(t) {
  return t.angle();
}
function Ye(t) {
  return new St(t).simplify({ threshold: 1 }).points;
}
function Ln(t, e) {
  const { point: n, x0: r, y0: i, view: s, bbox: o, direction: a } = t, { point: c, x0: u, y0: h, view: l, bbox: d, direction: g } = e;
  let v;
  if (s)
    s.model.isLink() ? v = Mo(c, n, s) : a === z.ANCHOR_SIDE ? v = o.sideNearestToPoint(n) : a === z.MAGNET_SIDE ? v = s.model.getBBox().sideNearestToPoint(n) : v = a;
  else {
    const w = new j(r, i, 0, 0);
    v = No.includes(a) ? a : w.sideNearestToPoint(c);
  }
  let y;
  if (l)
    l.model.isLink() ? y = Mo(n, c, l) : g === z.ANCHOR_SIDE ? y = d.sideNearestToPoint(c) : g === z.MAGNET_SIDE ? y = l.model.getBBox().sideNearestToPoint(c) : y = g;
  else {
    const w = new j(u, h, 0, 0);
    y = No.includes(g) ? g : w.sideNearestToPoint(n);
  }
  return [v, y];
}
function yp(t, e, n) {
  const { x0: r, y0: i, width: s, height: o, point: a, margin: c } = t, u = r + s, h = i + o, l = r - c, d = u + c, g = i - c, { x: v } = a, { x0: y, y0: w } = e;
  return y === v && w < i ? z.BOTTOM : y < v && w < g ? n.point.x === v ? z.BOTTOM : z.RIGHT : y > v && w < g ? n.point.x === v ? z.BOTTOM : z.LEFT : y < l && w > g || y > d && w > g ? z.TOP : y >= l && y <= v && w > h || y <= d && y >= v && w > h ? n.point.x < y ? z.RIGHT : z.LEFT : z.BOTTOM;
}
function bp(t, e, n) {
  const { x0: r, y0: i, width: s, height: o, point: a, margin: c } = t, u = r + s, h = i + o, l = r - c, d = u + c, g = h + c, { x: v } = a, { x0: y, y0: w } = e;
  return y === v && w > h ? z.TOP : y < v && w > g ? n.point.x === v ? z.TOP : z.RIGHT : y > v && w > g ? n.point.x === v ? z.TOP : z.LEFT : y < l && w < g || y > d && w < g ? z.BOTTOM : y >= l && y <= v && w < i || y <= d && y >= v && w < i ? n.point.x < y ? z.RIGHT : z.LEFT : z.TOP;
}
function wp(t, e, n) {
  const { y0: r, x0: i, width: s, height: o, point: a, margin: c } = t, u = i + s, h = r + o, l = i - c, d = r - c, g = h + c, { x: v, y } = a, { x0: w, y0: x } = e;
  return w < v && x === y ? z.RIGHT : w <= l && x < y ? z.BOTTOM : w <= l && x > y ? z.TOP : w >= l && x < d || w >= l && x > g ? z.LEFT : w > u && x >= d && x <= y || w > u && x <= g && x >= y ? n.point.y < x ? z.BOTTOM : z.TOP : z.RIGHT;
}
function xp(t, e, n) {
  const { y0: r, x0: i, width: s, height: o, point: a, margin: c } = t, u = i + s, h = r + o, l = u + c, d = r - c, g = h + c, { x: v, y } = a, { x0: w, y0: x } = e;
  return w > v && x === y ? z.LEFT : w >= l && x < y ? z.BOTTOM : w >= l && x > y ? z.TOP : w <= l && x < d || w <= l && x > g ? z.RIGHT : w < i && x >= d && x <= y || w < i && x <= g && x >= y ? n.point.y < x ? z.BOTTOM : z.TOP : z.LEFT;
}
function Sp(t, e, n) {
  const [r] = Ln(t, e);
  switch (r) {
    case z.TOP:
      return yp(t, e, n);
    case z.RIGHT:
      return xp(t, e, n);
    case z.BOTTOM:
      return bp(t, e, n);
    case z.LEFT:
      return wp(t, e, n);
  }
}
function Mo(t, e, n) {
  const r = n.getTangentAtLength(n.getClosestPointLength(e)), i = Math.round(ae(r) / 90) * 90;
  if (i % 180 === 0 && t.y === e.y) return t.x < e.x ? z.LEFT : z.RIGHT;
  if (t.x === e.x) return t.y < e.y ? z.TOP : z.BOTTOM;
  switch (i) {
    case 0:
    case 180:
    case 360:
      return t.y < e.y ? z.TOP : z.BOTTOM;
    case 90:
    case 270:
      return t.x < e.x ? z.LEFT : z.RIGHT;
  }
}
function Io(t, e, n, r, i, s, o) {
  r === z.AUTO && (r = i ? z.MAGNET_SIDE : z.ANCHOR_SIDE);
  const a = t && t.model.isElement(), { x: c, y: u, width: h = 0, height: l = 0 } = a ? j.fromRectUnion(n, t.model.getBBox()) : s;
  return {
    point: e,
    x0: c,
    y0: u,
    view: t,
    bbox: n,
    width: h,
    height: l,
    direction: r,
    margin: a ? o : 0
  };
}
function Ap({ x: t, y: e }) {
  const n = new E(t, e);
  return {
    point: n,
    x0: n.x,
    y0: n.y,
    view: null,
    bbox: new j(t, e, 0, 0),
    width: 0,
    height: 0,
    direction: null,
    margin: 0
  };
}
function kr(t, e, n) {
  const r = e.point.clone(), { x0: i, y0: s, width: o, height: a } = e;
  switch (t) {
    case "left":
      r.x = i - n;
      break;
    case "right":
      r.x = i + o + n;
      break;
    case "top":
      r.y = s - n;
      break;
    case "bottom":
      r.y = s + a + n;
      break;
  }
  return r;
}
function Li(t, e, { dx: n = 0, dy: r = 0 }) {
  const i = {
    x: t.point.x + n,
    y: t.point.y + r
  }, s = {
    x: e.point.x + n,
    y: e.point.y + r
  };
  return [
    t.point,
    i,
    s,
    e.point
  ];
}
function Oo(t, e, n, r) {
  const i = Qt(n - 90);
  let s = 0, o = 0;
  i === 90 ? o = -r : i === 180 ? s = -r : i === 270 ? o = r : i === 0 && (s = r);
  const a = Li(t, e, {
    dx: s,
    dy: o
  }), c = a[2], u = new H(e.point, c), h = xe[ae(u)];
  return {
    loopRoute: a,
    continueDirection: h
  };
}
function Pp(t, e) {
  const { x0: n, x1: r, outsidePoint: i } = t, { x0: s, x1: o, outsidePoint: a } = e;
  let c = Math.min(n, s), u = Math.max(r, o);
  if (t.direction === e.direction) {
    const P = t.y0 < e.y0 ? t : e, T = P === t ? e : t, L = t.direction === z.TOP ? P : T;
    c = L.x0, u = L.x1;
  }
  const { x: h } = i, { x: l } = a, d = Math.abs(h - c), g = Math.abs(l - c), v = d + g, y = Math.abs(h - u), w = Math.abs(l - u), x = y + w;
  return [v, x];
}
function Ep(t, e) {
  const { y0: n, y1: r, outsidePoint: i } = t, { y0: s, y1: o, outsidePoint: a } = e;
  let c = Math.min(n, s), u = Math.max(r, o);
  if (t.direction === e.direction) {
    const P = t.x0 < e.x0 ? t : e, T = P === t ? e : t, L = t.direction === z.LEFT ? P : T;
    c = L.y0, u = L.y1;
  }
  const { y: h } = i, { y: l } = a, d = Math.abs(h - c), g = Math.abs(l - c), v = d + g, y = Math.abs(h - u), w = Math.abs(l - u), x = y + w;
  return [v, x];
}
function Ro(t, e, n) {
  switch (e) {
    case z.LEFT:
      t.inflate(0, n).moveAndExpand({
        x: -n,
        width: n
      });
      break;
    case z.RIGHT:
      t.inflate(0, n).moveAndExpand({ width: n });
      break;
    case z.TOP:
      t.inflate(n, 0).moveAndExpand({
        y: -n,
        height: n
      });
      break;
    case z.BOTTOM:
      t.inflate(n, 0).moveAndExpand({ height: n });
      break;
  }
  return t;
}
function we(t, e, n = {}) {
  const { point: r, x0: i, y0: s, width: o, height: a, margin: c } = t, { point: u, x0: h, y0: l, width: d, height: g, margin: v } = e, { targetInSourceBBox: y = !1 } = n, w = h + d, x = l + g, P = i + o, T = s + a, L = i - c, I = P + c, R = s - c, f = T + c, p = h - v, m = w + v, b = l - v, S = x + v, [M, _] = Ln(t, e), F = kr(M, {
    point: r,
    x0: i,
    y0: s,
    width: o,
    height: a
  }, c), U = kr(_, {
    point: u,
    x0: h,
    y0: l,
    width: d,
    height: g
  }, v), { x: A, y: C } = F, { x: k, y: N } = U, D = (h + w) / 2, W = (l + x) / 2, st = (i + P) / 2, at = (s + T) / 2, q = (st < D ? P + h : w + i) / 2, K = (at < W ? T + l : x + s) / 2, et = new j(i, s, o, a), Q = new j(h, l, d, g), Y = et.clone().inflate(c), rt = Q.clone().inflate(v), lt = Object.assign({}, t, {
    x1: P,
    y1: T,
    outsidePoint: F,
    direction: M
  }), nt = Object.assign({}, e, {
    x1: w,
    y1: x,
    outsidePoint: U,
    direction: _
  }), [vt, ot] = Pp(lt, nt), [it, ut] = Ep(lt, nt);
  if (M === "left" && _ === "right") {
    const X = Y.containsPoint(U), O = rt.containsPoint(F);
    if (X || O) {
      const V = (C + N) / 2;
      return [
        {
          x: A,
          y: C
        },
        {
          x: A,
          y: V
        },
        {
          x: k,
          y: V
        },
        {
          x: k,
          y: N
        }
      ];
    }
    if (L < k) {
      let V = K, tt = A, At = k;
      const yt = it < ut;
      return (V >= R && V <= f || V >= b && V <= S) && (f >= b && yt ? V = Math.min(b, R) : R <= S && !yt && (V = Math.max(S, f)), tt = Math.min(A, p), At = Math.max(k, I), yt && C < l || !yt && C > x ? tt = A : (yt && N < s || !yt && N > T) && (At = k)), [
        {
          x: tt,
          y: C
        },
        {
          x: tt,
          y: V
        },
        {
          x: At,
          y: V
        },
        {
          x: At,
          y: N
        }
      ];
    }
    const G = (A + k) / 2;
    return [{
      x: G,
      y: C
    }, {
      x: G,
      y: N
    }];
  } else if (M === "right" && _ === "left") {
    const X = Y.containsPoint(U), O = rt.containsPoint(F);
    if (X || O) {
      const V = (C + N) / 2;
      return [
        {
          x: A,
          y: C
        },
        {
          x: A,
          y: V
        },
        {
          x: k,
          y: V
        },
        {
          x: k,
          y: N
        }
      ];
    }
    if (I > k) {
      let V = K, tt = A, At = k;
      const yt = it < ut;
      return (V >= R && V <= f || V >= b && V <= S) && (f >= b && yt ? V = Math.min(b, R) : R <= S && !yt && (V = Math.max(S, f)), tt = Math.max(A, m), At = Math.min(k, L), yt && C < l || !yt && C > x ? tt = A : (yt && N < s || !yt && N > T) && (At = k)), [
        {
          x: tt,
          y: C
        },
        {
          x: tt,
          y: V
        },
        {
          x: At,
          y: V
        },
        {
          x: At,
          y: N
        }
      ];
    }
    const G = (A + k) / 2;
    return [{
      x: G,
      y: C
    }, {
      x: G,
      y: N
    }];
  } else if (M === "top" && _ === "bottom") {
    const X = Y.containsPoint(U), O = rt.containsPoint(F);
    if (X || O) {
      const V = (A + k) / 2;
      return [
        {
          x: A,
          y: C
        },
        {
          x: V,
          y: C
        },
        {
          x: V,
          y: N
        },
        {
          x: k,
          y: N
        }
      ];
    }
    if (R < N) {
      let V = q, tt = C, At = N;
      const yt = vt < ot;
      return (V >= L && V <= I || V >= p && V <= m) && (I >= p && yt ? V = Math.min(p, L) : L <= m && !yt && (V = Math.max(m, I)), tt = Math.min(C, b), At = Math.max(N, f), yt && A < h || !yt && A > w ? tt = C : (yt && k < i || !yt && k > P) && (At = N)), [
        {
          x: A,
          y: tt
        },
        {
          x: V,
          y: tt
        },
        {
          x: V,
          y: At
        },
        {
          x: k,
          y: At
        }
      ];
    }
    const G = (C + N) / 2;
    return [{
      x: A,
      y: G
    }, {
      x: k,
      y: G
    }];
  } else if (M === "bottom" && _ === "top") {
    const X = Y.containsPoint(U), O = rt.containsPoint(F);
    if (X || O) {
      const V = (A + k) / 2;
      return [
        {
          x: A,
          y: C
        },
        {
          x: V,
          y: C
        },
        {
          x: V,
          y: N
        },
        {
          x: k,
          y: N
        }
      ];
    }
    if (f > N) {
      let V = q, tt = C, At = N;
      const yt = vt < ot;
      return (V >= L && V <= I || V >= p && V <= m) && (I >= p && yt ? V = Math.min(p, L) : L <= m && !yt && (V = Math.max(m, I)), tt = Math.max(C, S), At = Math.min(N, R), yt && A < h || !yt && A > w ? tt = C : (yt && k < i || !yt && k > P) && (At = N)), [
        {
          x: A,
          y: tt
        },
        {
          x: V,
          y: tt
        },
        {
          x: V,
          y: At
        },
        {
          x: k,
          y: At
        }
      ];
    }
    const G = (C + N) / 2;
    return [{
      x: A,
      y: G
    }, {
      x: k,
      y: G
    }];
  } else if (M === "top" && _ === "top") {
    if ((y || Me.rectWithRect(Y, Q) || C <= l && (Y.bottomRight().x <= k || Y.bottomLeft().x >= k) || C >= l && (rt.bottomRight().x <= A || rt.bottomLeft().x >= A)) && A !== k) return [{
      x: A,
      y: Math.min(C, N)
    }, {
      x: k,
      y: Math.min(C, N)
    }];
    let O, G = Math.min((T + l) / 2, N), V = Math.min((s + x) / 2, C);
    return N < C ? ot > vt ? O = Math.min(A, p) : O = Math.max(A, m) : ot > vt ? O = Math.min(k, L) : O = Math.max(k, I), [
      {
        x: A,
        y: V
      },
      {
        x: O,
        y: V
      },
      {
        x: O,
        y: G
      },
      {
        x: k,
        y: G
      }
    ];
  } else if (M === "bottom" && _ === "bottom") {
    if ((y || Me.rectWithRect(Y, Q) || C >= N && (Y.topRight().x <= k || Y.topLeft().x >= k) || C <= N && (rt.topRight().x <= A || rt.topLeft().x >= A)) && A !== k) return [{
      x: A,
      y: Math.max(C, N)
    }, {
      x: k,
      y: Math.max(C, N)
    }];
    let O, G = Math.max((s + x) / 2, N), V = Math.max((T + l) / 2, C);
    return N > C ? ot > vt ? O = Math.min(A, p) : O = Math.max(A, m) : ot > vt ? O = Math.min(k, L) : O = Math.max(k, I), [
      {
        x: A,
        y: V
      },
      {
        x: O,
        y: V
      },
      {
        x: O,
        y: G
      },
      {
        x: k,
        y: G
      }
    ];
  } else if (M === "left" && _ === "left") {
    if ((y || Me.rectWithRect(Y, Q) || A <= k && (Y.bottomRight().y <= N || Y.topRight().y >= N) || A >= k && (rt.bottomRight().y <= C || rt.topRight().y >= C)) && C !== N) return [{
      x: Math.min(A, k),
      y: C
    }, {
      x: Math.min(A, k),
      y: N
    }];
    let O, G = Math.min((P + h) / 2, k), V = Math.min((i + w) / 2, A);
    return k > A ? it <= ut ? O = Math.min(R, N) : O = Math.max(f, N) : it <= ut ? O = Math.min(b, C) : O = Math.max(S, C), [
      {
        x: V,
        y: C
      },
      {
        x: V,
        y: O
      },
      {
        x: G,
        y: O
      },
      {
        x: G,
        y: N
      }
    ];
  } else if (M === "right" && _ === "right") {
    if ((y || Me.rectWithRect(Y, Q) || A >= k && (Y.bottomLeft().y <= N || Y.topLeft().y >= N) || A <= k && (rt.bottomLeft().y <= C || rt.topLeft().y >= C)) && C !== N) return [{
      x: Math.max(A, k),
      y: C
    }, {
      x: Math.max(A, k),
      y: N
    }];
    let O, G = Math.max((i + w) / 2, k), V = Math.max((P + h) / 2, A);
    return k <= A ? it <= ut ? O = Math.min(R, N) : O = Math.max(f, N) : it <= ut ? O = Math.min(b, C) : O = Math.max(S, C), [
      {
        x: V,
        y: C
      },
      {
        x: V,
        y: O
      },
      {
        x: G,
        y: O
      },
      {
        x: G,
        y: N
      }
    ];
  } else if (M === "top" && _ === "right") {
    if (Y.containsPoint(u)) {
      if (A <= m) {
        const V = Math.max(A + c, k), tt = Math.min(R, b);
        return [
          {
            x: A,
            y: tt
          },
          {
            x: V,
            y: tt
          },
          {
            x: V,
            y: N
          }
        ];
      }
      const G = (A - c + k) / 2;
      return [
        {
          x: A,
          y: C
        },
        {
          x: G,
          y: C
        },
        {
          x: G,
          y: N
        }
      ];
    }
    if (R > N) {
      if (A < k) {
        let G = b;
        return S <= R && m >= A && (G = K), [
          {
            x: A,
            y: G
          },
          {
            x: k,
            y: G
          },
          {
            x: k,
            y: N
          }
        ];
      }
      return [{
        x: A,
        y: N
      }];
    }
    const O = Math.max(q, m);
    if (A > k && T >= N) return [
      {
        x: A,
        y: C
      },
      {
        x: O,
        y: C
      },
      {
        x: O,
        y: N
      }
    ];
    if (O > L && C < x) {
      const G = Math.min(R, b), V = Math.max(I, m);
      return [
        {
          x: A,
          y: G
        },
        {
          x: V,
          y: G
        },
        {
          x: V,
          y: N
        }
      ];
    }
    return [
      {
        x: A,
        y: C
      },
      {
        x: O,
        y: C
      },
      {
        x: O,
        y: N
      }
    ];
  } else if (M === "top" && _ === "left") {
    if (Y.containsPoint(u)) {
      if (A >= p) {
        const V = Math.min(A - c, k), tt = Math.min(R, b);
        return [
          {
            x: A,
            y: tt
          },
          {
            x: V,
            y: tt
          },
          {
            x: V,
            y: N
          }
        ];
      }
      const G = (A + c + k) / 2;
      return [
        {
          x: A,
          y: C
        },
        {
          x: G,
          y: C
        },
        {
          x: G,
          y: N
        }
      ];
    }
    if (R > N) {
      if (A > k) {
        let G = b;
        return S <= R && p <= A && (G = K), [
          {
            x: A,
            y: G
          },
          {
            x: k,
            y: G
          },
          {
            x: k,
            y: N
          }
        ];
      }
      return [{
        x: A,
        y: N
      }];
    }
    const O = Math.min(p, q);
    if (A < k && T >= N) return [
      {
        x: A,
        y: C
      },
      {
        x: O,
        y: C
      },
      {
        x: O,
        y: N
      }
    ];
    if (O < I && C < x) {
      const G = Math.min(R, b), V = Math.min(L, p);
      return [
        {
          x: A,
          y: G
        },
        {
          x: V,
          y: G
        },
        {
          x: V,
          y: N
        }
      ];
    }
    return [
      {
        x: A,
        y: C
      },
      {
        x: O,
        y: C
      },
      {
        x: O,
        y: N
      }
    ];
  } else if (M === "bottom" && _ === "right") {
    if (Y.containsPoint(u)) {
      if (A <= m) {
        const V = Math.max(A + c, k), tt = Math.max(f, S);
        return [
          {
            x: A,
            y: tt
          },
          {
            x: V,
            y: tt
          },
          {
            x: V,
            y: N
          }
        ];
      }
      const G = (A - c + k) / 2;
      return [
        {
          x: A,
          y: C
        },
        {
          x: G,
          y: C
        },
        {
          x: G,
          y: N
        }
      ];
    }
    if (f < N) {
      if (A < k) {
        let G = S;
        return b >= f && m >= A && (G = K), [
          {
            x: A,
            y: G
          },
          {
            x: k,
            y: G
          },
          {
            x: k,
            y: N
          }
        ];
      }
      return [{
        x: A,
        y: N
      }];
    }
    const O = Math.max(q, m);
    if (A > k && s <= N) return [
      {
        x: A,
        y: C
      },
      {
        x: O,
        y: C
      },
      {
        x: O,
        y: N
      }
    ];
    if (O > L && C > l) {
      const G = Math.max(f, S), V = Math.max(I, m);
      return [
        {
          x: A,
          y: G
        },
        {
          x: V,
          y: G
        },
        {
          x: V,
          y: N
        }
      ];
    }
    return [
      {
        x: A,
        y: C
      },
      {
        x: O,
        y: C
      },
      {
        x: O,
        y: N
      }
    ];
  } else if (M === "bottom" && _ === "left") {
    if (Y.containsPoint(u)) {
      if (A >= p) {
        const V = Math.min(A - c, k), tt = Math.max(f, S);
        return [
          {
            x: A,
            y: tt
          },
          {
            x: V,
            y: tt
          },
          {
            x: V,
            y: N
          }
        ];
      }
      const G = (A + c + k) / 2;
      return [
        {
          x: A,
          y: C
        },
        {
          x: G,
          y: C
        },
        {
          x: G,
          y: N
        }
      ];
    }
    if (f < N) {
      if (A > k) {
        let G = S;
        return b >= f && p <= A && (G = K), [
          {
            x: A,
            y: G
          },
          {
            x: k,
            y: G
          },
          {
            x: k,
            y: N
          }
        ];
      }
      return [{
        x: A,
        y: N
      }];
    }
    const O = Math.min(p, q);
    if (A < k && s <= N) return [
      {
        x: A,
        y: C
      },
      {
        x: O,
        y: C
      },
      {
        x: O,
        y: N
      }
    ];
    if (O < I && C > l) {
      const G = Math.max(f, S), V = Math.min(L, p);
      return [
        {
          x: A,
          y: G
        },
        {
          x: V,
          y: G
        },
        {
          x: V,
          y: N
        }
      ];
    }
    return [
      {
        x: A,
        y: C
      },
      {
        x: O,
        y: C
      },
      {
        x: O,
        y: N
      }
    ];
  } else if (M === "left" && _ === "bottom") {
    if (Y.containsPoint(u)) {
      if (C <= S) {
        const V = Math.min(L, p), tt = Math.max(C + c, N);
        return [
          {
            x: V,
            y: C
          },
          {
            x: V,
            y: tt
          },
          {
            x: k,
            y: tt
          }
        ];
      }
      const G = (C - c + N) / 2;
      return [
        {
          x: A,
          y: C
        },
        {
          x: A,
          y: G
        },
        {
          x: k,
          y: G
        }
      ];
    }
    if (L > k) {
      if (C < N) {
        let G = p;
        return m <= L && S >= C && (G = q), [
          {
            x: G,
            y: C
          },
          {
            x: G,
            y: N
          },
          {
            x: k,
            y: N
          }
        ];
      }
      return [{
        x: k,
        y: C
      }];
    }
    const O = Math.max(S, K);
    if (C > N && P >= k) return [
      {
        x: A,
        y: C
      },
      {
        x: A,
        y: O
      },
      {
        x: k,
        y: O
      }
    ];
    if (O > R && A < w) {
      const G = Math.min(L, p), V = Math.max(f, S);
      return [
        {
          x: G,
          y: C
        },
        {
          x: G,
          y: V
        },
        {
          x: k,
          y: V
        }
      ];
    }
    return [
      {
        x: A,
        y: C
      },
      {
        x: A,
        y: O
      },
      {
        x: k,
        y: O
      }
    ];
  } else if (M === "left" && _ === "top") {
    if (Y.containsPoint(u)) {
      if (C >= b) {
        const V = Math.min(C - c, N), tt = Math.min(L, p);
        return [
          {
            x: tt,
            y: C
          },
          {
            x: tt,
            y: V
          },
          {
            x: k,
            y: V
          }
        ];
      }
      const G = (C + c + N) / 2;
      return [
        {
          x: A,
          y: C
        },
        {
          x: A,
          y: G
        },
        {
          x: k,
          y: G
        }
      ];
    }
    if (L > k) {
      if (C > N) {
        let G = p;
        return m <= L && b <= C && (G = q), [
          {
            x: G,
            y: C
          },
          {
            x: G,
            y: N
          },
          {
            x: k,
            y: N
          }
        ];
      }
      return [{
        x: k,
        y: C
      }];
    }
    const O = Math.min(b, K);
    if (C < N && P >= k) return [
      {
        x: A,
        y: C
      },
      {
        x: A,
        y: O
      },
      {
        x: k,
        y: O
      }
    ];
    if (O < f && A < w) {
      const G = Math.min(L, p), V = Math.min(R, b);
      return [
        {
          x: G,
          y: C
        },
        {
          x: G,
          y: V
        },
        {
          x: k,
          y: V
        }
      ];
    }
    return [
      {
        x: A,
        y: C
      },
      {
        x: A,
        y: O
      },
      {
        x: k,
        y: O
      }
    ];
  } else if (M === "right" && _ === "top") {
    if (Y.containsPoint(u)) {
      if (C >= b) {
        const V = Math.max(I, m), tt = Math.min(C - c, N);
        return [
          {
            x: V,
            y: C
          },
          {
            x: V,
            y: tt
          },
          {
            x: k,
            y: tt
          }
        ];
      }
      const G = (C + c + N) / 2;
      return [
        {
          x: A,
          y: C
        },
        {
          x: A,
          y: G
        },
        {
          x: k,
          y: G
        }
      ];
    }
    if (I < k) {
      if (C > N) {
        let G = m;
        return p >= I && b <= C && (G = q), [
          {
            x: G,
            y: C
          },
          {
            x: G,
            y: N
          },
          {
            x: k,
            y: N
          }
        ];
      }
      return [{
        x: k,
        y: C
      }];
    }
    const O = Math.min(b, K);
    if (C < N && i <= k) return [
      {
        x: A,
        y: C
      },
      {
        x: A,
        y: O
      },
      {
        x: k,
        y: O
      }
    ];
    if (O < f && A > h) {
      const G = Math.max(I, m), V = Math.min(R, b);
      return [
        {
          x: G,
          y: C
        },
        {
          x: G,
          y: V
        },
        {
          x: k,
          y: V
        }
      ];
    }
    return [
      {
        x: A,
        y: C
      },
      {
        x: A,
        y: O
      },
      {
        x: k,
        y: O
      }
    ];
  } else if (M === "right" && _ === "bottom") {
    if (Y.containsPoint(u)) {
      if (C <= S) {
        const V = Math.max(I, m), tt = Math.max(C + c, N);
        return [
          {
            x: V,
            y: C
          },
          {
            x: V,
            y: tt
          },
          {
            x: k,
            y: tt
          }
        ];
      }
      const G = (C - c + N) / 2;
      return [
        {
          x: A,
          y: C
        },
        {
          x: A,
          y: G
        },
        {
          x: k,
          y: G
        }
      ];
    }
    if (I < k) {
      if (C < N) {
        let G = m;
        return p >= I && S >= C && (G = q), [
          {
            x: G,
            y: C
          },
          {
            x: G,
            y: N
          },
          {
            x: k,
            y: N
          }
        ];
      }
      return [{
        x: k,
        y: C
      }];
    }
    const O = Math.max(S, K);
    if (C > N && i <= k) return [
      {
        x: A,
        y: C
      },
      {
        x: A,
        y: O
      },
      {
        x: k,
        y: O
      }
    ];
    if (O > R && A > h) {
      const G = Math.max(I, m), V = Math.max(f, S);
      return [
        {
          x: G,
          y: C
        },
        {
          x: G,
          y: V
        },
        {
          x: k,
          y: V
        }
      ];
    }
    return [
      {
        x: A,
        y: C
      },
      {
        x: A,
        y: O
      },
      {
        x: k,
        y: O
      }
    ];
  }
}
function Do(t, e, n) {
  const r = t === z.LEFT || t === z.RIGHT;
  let i = 0, s = 0;
  switch (Qt(Math.round(e))) {
    case 0:
    case 90:
      i = r ? 0 : n, s = r ? n : 0;
      break;
    case 180:
    case 270:
      i = r ? 0 : -n, s = r ? -n : 0;
      break;
  }
  return {
    dx: i,
    dy: s
  };
}
function nl(t, e, n) {
  const { sourceDirection: r = z.AUTO, targetDirection: i = z.AUTO } = e, s = e.margin || 20, o = e.useVertices || !1, a = !!n.model.source().port, c = Io(n.sourceView, n.sourceAnchor, n.sourceBBox, r, a, n.sourceAnchor, s), u = !!n.model.target().port, h = Io(n.targetView, n.targetAnchor, n.targetBBox, i, u, n.targetAnchor, s);
  let l = [];
  if (!o || t.length === 0) return Ye(we(c, h));
  const d = t.map((T) => Ap(T)), [g] = d, [v] = Ln(c, g), y = c.view && c.view.model.isElement(), w = y ? Ro(c.view.model.getBBox(), v, s) : null, x = y ? w.containsPoint(g.point) : !1;
  if (x) {
    const T = kr(v, c, s), L = T.equals(g.point), I = c.point.x === g.point.x, R = c.point.y === g.point.y, f = I && (v === z.TOP || v === z.BOTTOM), p = R && (v === z.LEFT || v === z.RIGHT), m = new H(c.point, T), b = m.containsPoint(g.point), S = x && (p || f);
    if (L)
      l.push(c.point, g.point), g.direction = ge[v];
    else if (b || S) {
      const M = ae(b ? m : new H(c.point, g.point)), { dx: _, dy: F } = Do(v, M, s), U = Li({ point: T }, g, {
        dx: _,
        dy: F
      }), A = U[2], C = new H(g.point, A), k = xe[ae(C)];
      g.direction = k, l.push(...U);
    } else
      g.direction = v, g.margin = s, l.push(...we(c, g, { targetInSourceBBox: !0 }), g.point);
  } else {
    const T = d[1] || h, L = Sp(c, g, T);
    g.direction = L, l.push(...we(c, g), g.point);
  }
  for (let T = 0; T < d.length - 1; T++) {
    const L = d[T], I = d[T + 1], R = new H(L.point, I.point), f = ae(R);
    if (f % 90 === 0) {
      const b = xe[f], S = Ye([...l, L.point]), M = new H(S[S.length - 2], S[S.length - 1]), _ = xe[Math.round(ae(M))];
      if (b !== ge[_]) {
        l.push(L.point, I.point);
        const [, F] = Ln(L, I);
        I.direction = F;
      } else {
        const { loopRoute: F, continueDirection: U } = Oo(L, I, f, s);
        I.direction = U, l.push(...F);
      }
      continue;
    }
    const [p, m] = Fo(L, I);
    L.direction = p, I.direction = m, l.push(...we(L, I), I.point);
  }
  const P = d[d.length - 1];
  if (h.view && h.view.model.isElement()) {
    const [, T] = Ln(P, h), L = kr(T, h, s), I = Ye([...l, P.point]), R = new H(I[I.length - 2], I[I.length - 1]), f = Math.round(ae(R)), p = xe[f], m = L.equals(P.point);
    if (!m || m && p === T) {
      P.direction = p;
      let b = we(P, h);
      const [S, M] = Ye([...b, h.point]), _ = new H(S, M), F = Math.round(ae(_)), U = xe[F], A = Ro(h.view.model.getBBox(), T, s), C = P.point.x === h.point.x, k = P.point.y === h.point.y, N = A.containsPoint(P.point), D = C && (T === z.TOP || T === z.BOTTOM), W = k && (T === z.LEFT || T === z.RIGHT);
      if (!m && N && (W || D)) {
        const { dx: st, dy: at } = Do(T, f, s);
        b = Li(P, { point: L }, {
          dx: st,
          dy: at
        });
      } else N && T !== ge[p] ? (P.margin = s, P.direction = T, b = we(P, h)) : U !== p && p === ge[U] && (P.margin = s, b = we(P, h));
      l.push(...b);
    }
  } else {
    const T = P, L = h, I = new H(T.point, L.point), R = ae(I);
    if (R % 90 === 0) {
      const f = xe[R], p = Ye(l), m = new H(p[p.length - 2], T.point), b = xe[Math.round(ae(m))];
      if (f !== ge[b]) l.push(T.point);
      else {
        const { loopRoute: S } = Oo(T, L, R, s);
        S.pop(), l.push(...S);
      }
    } else {
      const [f, p] = Fo(T, L);
      T.direction = f, L.direction = p, l.push(...we(T, L));
    }
  }
  return Ye(l);
}
function Fo(t, e) {
  const n = t.direction, r = mp.includes(n);
  let i = t.direction, s = e.direction;
  if (r) {
    const o = t.point.y > e.point.y, a = e.point.x - t.point.x;
    n === z.BOTTOM ? (i = o ? ge[n] : a >= 0 ? z.RIGHT : z.LEFT, a > 0 ? s = o ? z.LEFT : z.TOP : a < 0 && (s = o ? z.RIGHT : z.TOP)) : (i = o ? a >= 0 ? z.RIGHT : z.LEFT : ge[n], a > 0 ? s = o ? z.BOTTOM : z.LEFT : a < 0 && (s = o ? z.BOTTOM : z.RIGHT));
  } else {
    const o = t.point.x > e.point.x, a = e.point.y - t.point.y;
    n === z.RIGHT ? (i = o ? ge[n] : a >= 0 ? z.BOTTOM : z.TOP, a > 0 ? s = o ? z.TOP : z.LEFT : a < 0 && (s = o ? z.BOTTOM : z.LEFT)) : (i = o ? a >= 0 ? z.BOTTOM : z.TOP : ge[n], a > 0 ? s = o ? z.RIGHT : z.TOP : a < 0 && (s = o ? z.RIGHT : z.BOTTOM));
  }
  return [i, s];
}
nl.Directions = z;
const Tp = nl;
var rl = {};
Xt(rl, {
  manhattan: () => ki,
  metro: () => vp,
  normal: () => Zg,
  oneSide: () => Qg,
  orthogonal: () => Ci,
  rightAngle: () => Tp
});
var il = {};
Xt(il, {
  connectionClosest: () => ol,
  connectionLength: () => kp,
  connectionPerpendicular: () => Np,
  connectionRatio: () => Cp,
  resolveRef: () => Yn
});
function Cp(t, e, n, r) {
  var i = "ratio" in r ? r.ratio : 0.5;
  return t.getPointAtRatio(i);
}
function kp(t, e, n, r) {
  var i = "length" in r ? r.length : 20;
  return t.getPointAtLength(i);
}
function Lp(t, e, n, r) {
  var i = 1e6, s = t.getConnection(), o = t.getConnectionSubdivisions(), a = new H(n.clone().offset(0, i), n.clone().offset(0, -i)), c = new H(n.clone().offset(i, 0), n.clone().offset(-i, 0)), u = a.intersect(s, { segmentSubdivisions: o }), h = c.intersect(s, { segmentSubdivisions: o }), l = [];
  return u && Array.prototype.push.apply(l, u), h && Array.prototype.push.apply(l, h), l.length > 0 ? n.chooseClosest(l) : "fallbackAt" in r ? sl(t, r.fallbackAt) : ol(t, e, n, r);
}
function _p(t, e, n, r) {
  var i = t.getClosestPoint(n);
  return i || new E();
}
function Yn(t) {
  return function(e, n, r, i) {
    if (r instanceof Element) {
      var s = this.paper.findView(r), o;
      if (s) if (s.isNodeConnection(r)) {
        var a = "fixedAt" in i ? i.fixedAt : "50%";
        o = sl(s, a);
      } else o = s.getNodeBBox(r).center();
      else o = new E();
      return t.call(this, e, n, o, i);
    }
    return t.apply(this, arguments);
  };
}
function sl(t, e) {
  var n = parseFloat(e);
  return Wt(e) ? t.getPointAtRatio(n / 100) : t.getPointAtLength(n);
}
const Np = Yn(Lp), ol = Yn(_p);
var al = {};
Xt(al, {
  bottom: () => Fp,
  bottomLeft: () => Gp,
  bottomRight: () => zp,
  center: () => Rp,
  left: () => cl,
  midSide: () => jp,
  modelCenter: () => Wp,
  perpendicular: () => Up,
  right: () => ll,
  top: () => Dp,
  topLeft: () => Bp,
  topRight: () => Vp
});
function ve(t) {
  return function(e, n, r, i) {
    var s = !!i.rotate, o = s ? e.getNodeUnrotatedBBox(n) : e.getNodeBBox(n), a = o[t](), c = i.dx;
    if (c) {
      var u = Wt(c);
      c = parseFloat(c), isFinite(c) && (u && (c /= 100, c *= o.width), a.x += c);
    }
    var h = i.dy;
    if (h) {
      var l = Wt(h);
      h = parseFloat(h), isFinite(h) && (l && (h /= 100, h *= o.height), a.y += h);
    }
    return s ? a.rotate(e.model.getBBox().center(), -e.model.angle()) : a;
  };
}
function Mp(t, e, n, r) {
  var i = t.model.angle(), s = t.getNodeBBox(e), o = s.center(), a = s.origin(), c = s.corner(), u = r.padding;
  if (isFinite(u) || (u = 0), a.y + u <= n.y && n.y <= c.y - u) {
    var h = n.y - o.y;
    o.x += i === 0 || i === 180 ? 0 : h * 1 / Math.tan(Ut(i)), o.y += h;
  } else if (a.x + u <= n.x && n.x <= c.x - u) {
    var l = n.x - o.x;
    o.y += i === 90 || i === 270 ? 0 : l * Math.tan(Ut(i)), o.x += l;
  }
  return o;
}
function Ip(t, e, n, r) {
  var i = !!r.rotate, s, o, a;
  i ? (s = t.getNodeUnrotatedBBox(e), a = t.model.getBBox().center(), o = t.model.angle()) : s = t.getNodeBBox(e);
  var c = r.padding;
  isFinite(c) && s.inflate(c), i && n.rotate(a, o);
  var u = s.sideNearestToPoint(n), h;
  switch (u) {
    case "left":
      h = s.leftMiddle();
      break;
    case "right":
      h = s.rightMiddle();
      break;
    case "top":
      h = s.topMiddle();
      break;
    case "bottom":
      h = s.bottomMiddle();
      break;
  }
  return i ? h.rotate(a, -o) : h;
}
function Op(t, e, n, r, i) {
  return t.model.getPointFromConnectedLink(this.model, i).offset(r.dx, r.dy);
}
const Rp = ve("center"), Dp = ve("topMiddle"), Fp = ve("bottomMiddle"), cl = ve("leftMiddle"), ll = ve("rightMiddle"), Bp = ve("origin"), Vp = ve("topRight"), Gp = ve("bottomLeft"), zp = ve("corner"), Up = Yn(Mp), jp = Yn(Ip), Wp = Op, Hp = Ee.extend({
  initialize: function(t, e) {
    e.cellNamespace ? this.cellNamespace = e.cellNamespace : this.cellNamespace = typeof joint < "u" && ue(joint, "shapes") ? joint.shapes : null, this.graph = e.graph;
  },
  model: function(t, e) {
    const r = e.collection.cellNamespace, { type: i } = t, s = hn(r, i, ".");
    if (!s) throw new Error(`dia.Graph: Could not find cell constructor for type: '${i}'. Make sure to add the constructor to 'cellNamespace'.`);
    return new s(t, e);
  },
  _addReference: function(t, e) {
    Ee.prototype._addReference.apply(this, arguments), !e.dry && !t.graph && (t.graph = this.graph);
  },
  _removeReference: function(t, e) {
    Ee.prototype._removeReference.apply(this, arguments), !e.dry && t.graph === this.graph && (t.graph = null);
  },
  comparator: function(t) {
    return t.get("z") || 0;
  }
}), ys = Kt.extend({
  initialize: function(t, e) {
    e = e || {};
    var n = new Hp([], {
      model: e.cellModel,
      cellNamespace: e.cellNamespace,
      graph: this
    });
    Kt.prototype.set.call(this, "cells", n), n.on("all", this.trigger, this), this.on("change:z", this._sortOnChangeZ, this), this._out = {}, this._in = {}, this._nodes = {}, this._edges = {}, this._batches = {}, n.on("add", this._restructureOnAdd, this), n.on("remove", this._restructureOnRemove, this), n.on("reset", this._restructureOnReset, this), n.on("change:source", this._restructureOnChangeSource, this), n.on("change:target", this._restructureOnChangeTarget, this), n.on("remove", this._removeCell, this);
  },
  _sortOnChangeZ: function() {
    this.get("cells").sort();
  },
  _restructureOnAdd: function(t) {
    if (t.isLink()) {
      this._edges[t.id] = !0;
      var { source: e, target: n } = t.attributes;
      e.id && ((this._out[e.id] || (this._out[e.id] = {}))[t.id] = !0), n.id && ((this._in[n.id] || (this._in[n.id] = {}))[t.id] = !0);
    } else this._nodes[t.id] = !0;
  },
  _restructureOnRemove: function(t) {
    if (t.isLink()) {
      delete this._edges[t.id];
      var { source: e, target: n } = t.attributes;
      e.id && this._out[e.id] && this._out[e.id][t.id] && delete this._out[e.id][t.id], n.id && this._in[n.id] && this._in[n.id][t.id] && delete this._in[n.id][t.id];
    } else delete this._nodes[t.id];
  },
  _restructureOnReset: function(t) {
    t = t.models, this._out = {}, this._in = {}, this._nodes = {}, this._edges = {}, t.forEach(this._restructureOnAdd, this);
  },
  _restructureOnChangeSource: function(t) {
    var e = t.previous("source");
    e.id && this._out[e.id] && delete this._out[e.id][t.id];
    var n = t.attributes.source;
    n.id && ((this._out[n.id] || (this._out[n.id] = {}))[t.id] = !0);
  },
  _restructureOnChangeTarget: function(t) {
    var e = t.previous("target");
    e.id && this._in[e.id] && delete this._in[e.id][t.id];
    var n = t.get("target");
    n.id && ((this._in[n.id] || (this._in[n.id] = {}))[t.id] = !0);
  },
  getOutboundEdges: function(t) {
    return this._out && this._out[t] || {};
  },
  getInboundEdges: function(t) {
    return this._in && this._in[t] || {};
  },
  toJSON: function(t = {}) {
    var e = Kt.prototype.toJSON.apply(this, arguments);
    return e.cells = this.get("cells").toJSON(t.cellAttributes), e;
  },
  fromJSON: function(t, e) {
    if (!t.cells) throw new Error("Graph JSON must contain cells array.");
    return this.set(t, e);
  },
  set: function(t, e, n) {
    var r;
    return typeof t == "object" ? (r = t, n = e) : (r = {})[t] = e, r.hasOwnProperty("cells") && (this.resetCells(r.cells, n), r = $n(r, "cells")), Kt.prototype.set.call(this, r, n);
  },
  clear: function(t) {
    t = $({}, t, { clear: !0 });
    var e = this.get("cells");
    if (e.length === 0) return this;
    this.startBatch("clear", t);
    var n = e.sortBy(function(r) {
      return r.isLink() ? 1 : 2;
    });
    do
      n.shift().remove(t);
    while (n.length > 0);
    return this.stopBatch("clear"), this;
  },
  _prepareCell: function(t) {
    let e;
    if (t instanceof Kt ? e = t.attributes : e = t, !Ct(e.type)) throw new TypeError("dia.Graph: cell type must be a string.");
    return t;
  },
  minZIndex: function() {
    var t = this.get("cells").first();
    return t && t.get("z") || 0;
  },
  maxZIndex: function() {
    var t = this.get("cells").last();
    return t && t.get("z") || 0;
  },
  addCell: function(t, e) {
    return Array.isArray(t) ? this.addCells(t, e) : (t instanceof Kt ? t.has("z") || t.set("z", this.maxZIndex() + 1) : t.z === void 0 && (t.z = this.maxZIndex() + 1), this.get("cells").add(this._prepareCell(t, e), e || {}), this);
  },
  addCells: function(t, e) {
    return t.length === 0 ? this : (t = zh(t), e.maxPosition = e.position = t.length - 1, this.startBatch("add", e), t.forEach(function(n) {
      this.addCell(n, e), e.position--;
    }, this), this.stopBatch("add", e), this);
  },
  resetCells: function(t, e) {
    var n = pt(t).map(function(r) {
      return this._prepareCell(r, e);
    }, this);
    return this.get("cells").reset(n, e), this;
  },
  removeCells: function(t, e) {
    return t.length && (this.startBatch("remove"), le(t, "remove", e), this.stopBatch("remove")), this;
  },
  _removeCell: function(t, e, n) {
    n = n || {}, n.clear || (n.disconnectLinks ? this.disconnectLinks(t, n) : this.removeLinks(t, n)), this.get("cells").remove(t, { silent: !0 });
  },
  transferCellEmbeds: function(t, e, n = {}) {
    const r = "transfer-embeds";
    this.startBatch(r);
    const i = t.getEmbeddedCells();
    e.embed(i, {
      ...n,
      reparent: !0
    }), this.stopBatch(r);
  },
  transferCellConnectedLinks: function(t, e, n = {}) {
    const r = "transfer-connected-links";
    this.startBatch(r), this.getConnectedLinks(t, n).forEach((s) => {
      s.getSourceCell() === t && s.prop(["source", "id"], e.id, n), s.getTargetCell() === t && s.prop(["target", "id"], e.id, n);
    }), this.stopBatch(r);
  },
  getCell: function(t) {
    return this.get("cells").get(t);
  },
  getCells: function() {
    return this.get("cells").toArray();
  },
  getElements: function() {
    return this.get("cells").toArray().filter((t) => t.isElement());
  },
  getLinks: function() {
    return this.get("cells").toArray().filter((t) => t.isLink());
  },
  getFirstCell: function() {
    return this.get("cells").first();
  },
  getLastCell: function() {
    return this.get("cells").last();
  },
  getConnectedLinks: function(t, e) {
    e = e || {};
    var n = e.indirect, r = e.inbound, i = e.outbound;
    r === void 0 && i === void 0 && (r = i = !0);
    var s = [], o = {};
    i && a(this, t), r && c(this, t);
    function a(l, d) {
      if (ce(l.getOutboundEdges(d.id), (function(v, y) {
        if (!o[y]) {
          var w = l.getCell(y);
          s.push(w), o[y] = !0, n && (r && c(l, w), i && a(l, w));
        }
      }).bind(l)), n && d.isLink()) {
        var g = d.getTargetCell();
        g && g.isLink() && (o[g.id] || (s.push(g), a(l, g)));
      }
    }
    function c(l, d) {
      if (ce(l.getInboundEdges(d.id), (function(v, y) {
        if (!o[y]) {
          var w = l.getCell(y);
          s.push(w), o[y] = !0, n && (r && c(l, w), i && a(l, w));
        }
      }).bind(l)), n && d.isLink()) {
        var g = d.getSourceCell();
        g && g.isLink() && (o[g.id] || (s.push(g), c(l, g)));
      }
    }
    if (e.deep) {
      var u = t.getEmbeddedCells({ deep: !0 }), h = {};
      u.forEach(function(l) {
        l.isElement() && (h[l.id] = !0);
      }), u.forEach(function(l) {
        l.isLink() || (i && ce(this.getOutboundEdges(l.id), (function(d, g) {
          if (!o[g]) {
            var v = this.getCell(g), { source: y, target: w } = v.attributes, x = y.id, P = w.id;
            if (!e.includeEnclosed && x && h[x] && P && h[P]) return;
            s.push(this.getCell(g)), o[g] = !0;
          }
        }).bind(this)), r && ce(this.getInboundEdges(l.id), (function(d, g) {
          if (!o[g]) {
            var v = this.getCell(g), { source: y, target: w } = v.attributes, x = y.id, P = w.id;
            if (!e.includeEnclosed && x && h[x] && P && h[P]) return;
            s.push(this.getCell(g)), o[g] = !0;
          }
        }).bind(this)));
      }, this);
    }
    return s;
  },
  getNeighbors: function(t, e) {
    e || (e = {});
    var n = e.inbound, r = e.outbound;
    n === void 0 && r === void 0 && (n = r = !0);
    var i = this.getConnectedLinks(t, e).reduce((function(a, c) {
      var { source: u, target: h } = c.attributes, l = c.hasLoop(e);
      if (n && ue(u, "id") && !a[u.id]) {
        var d = this.getCell(u.id);
        d.isElement() && (l || d && d !== t && (!e.deep || !d.isEmbeddedIn(t))) && (a[u.id] = d);
      }
      if (r && ue(h, "id") && !a[h.id]) {
        var g = this.getCell(h.id);
        g.isElement() && (l || g && g !== t && (!e.deep || !g.isEmbeddedIn(t))) && (a[h.id] = g);
      }
      return a;
    }).bind(this), {});
    if (t.isLink()) {
      if (n) {
        var s = t.getSourceCell();
        s && s.isElement() && !i[s.id] && (i[s.id] = s);
      }
      if (r) {
        var o = t.getTargetCell();
        o && o.isElement() && !i[o.id] && (i[o.id] = o);
      }
    }
    return pt(i);
  },
  getCommonAncestor: function() {
    var t = Array.from(arguments).map(function(n) {
      for (var r = [], i = n.get("parent"); i; )
        r.push(i), i = this.getCell(i).get("parent");
      return r;
    }, this);
    t = t.sort(function(n, r) {
      return n.length - r.length;
    });
    var e = pt(t.shift()).find(function(n) {
      return t.every(function(r) {
        return r.includes(n);
      });
    });
    return this.getCell(e);
  },
  getSuccessors: function(t, e) {
    e = e || {};
    var n = [];
    return this.search(t, function(r) {
      r !== t && n.push(r);
    }, $({}, e, { outbound: !0 })), n;
  },
  cloneCells: Ec,
  cloneSubgraph: function(t, e) {
    var n = this.getSubgraph(t, e);
    return this.cloneCells(n);
  },
  getSubgraph: function(t, e) {
    e = e || {};
    var n = [], r = {}, i = [], s = [];
    return pt(t).forEach(function(o) {
      if (r[o.id] || (n.push(o), r[o.id] = o, o.isLink() ? s.push(o) : i.push(o)), e.deep) {
        var a = o.getEmbeddedCells({ deep: !0 });
        a.forEach(function(c) {
          r[c.id] || (n.push(c), r[c.id] = c, c.isLink() ? s.push(c) : i.push(c));
        });
      }
    }), s.forEach(function(o) {
      var { source: a, target: c } = o.attributes;
      if (a.id && !r[a.id]) {
        var u = this.getCell(a.id);
        n.push(u), r[u.id] = u, i.push(u);
      }
      if (c.id && !r[c.id]) {
        var h = this.getCell(c.id);
        n.push(this.getCell(c.id)), r[h.id] = h, i.push(h);
      }
    }, this), i.forEach(function(o) {
      var a = this.getConnectedLinks(o, e);
      a.forEach(function(c) {
        var { source: u, target: h } = c.attributes;
        !r[c.id] && u.id && r[u.id] && h.id && r[h.id] && (n.push(c), r[c.id] = c);
      });
    }, this), n;
  },
  getPredecessors: function(t, e) {
    e = e || {};
    var n = [];
    return this.search(t, function(r) {
      r !== t && n.push(r);
    }, $({}, e, { inbound: !0 })), n;
  },
  search: function(t, e, n) {
    n = n || {}, n.breadthFirst ? this.bfs(t, e, n) : this.dfs(t, e, n);
  },
  bfs: function(t, e, n = {}) {
    const r = {}, i = {}, s = [];
    for (s.push(t), i[t.id] = 0; s.length > 0; ) {
      var o = s.shift();
      if (r[o.id] || (r[o.id] = !0, e.call(this, o, i[o.id]) === !1)) continue;
      const a = this.getNeighbors(o, n);
      for (let c = 0, u = a.length; c < u; c++) {
        const h = a[c];
        i[h.id] = i[o.id] + 1, s.push(h);
      }
    }
  },
  dfs: function(t, e, n = {}) {
    const r = {}, i = {}, s = [];
    for (s.push(t), i[t.id] = 0; s.length > 0; ) {
      const o = s.pop();
      if (r[o.id] || (r[o.id] = !0, e.call(this, o, i[o.id]) === !1)) continue;
      const a = this.getNeighbors(o, n), c = s.length;
      for (let u = 0, h = a.length; u < h; u++) {
        const l = a[u];
        i[l.id] = i[o.id] + 1, s.splice(c, 0, l);
      }
    }
  },
  getSources: function() {
    var t = [];
    return ce(this._nodes, (function(e, n) {
      (!this._in[n] || Yt(this._in[n])) && t.push(this.getCell(n));
    }).bind(this)), t;
  },
  getSinks: function() {
    var t = [];
    return ce(this._nodes, (function(e, n) {
      (!this._out[n] || Yt(this._out[n])) && t.push(this.getCell(n));
    }).bind(this)), t;
  },
  isSource: function(t) {
    return !this._in[t.id] || Yt(this._in[t.id]);
  },
  isSink: function(t) {
    return !this._out[t.id] || Yt(this._out[t.id]);
  },
  isSuccessor: function(t, e) {
    var n = !1;
    return this.search(t, function(r) {
      if (r === e && r !== t)
        return n = !0, !1;
    }, { outbound: !0 }), n;
  },
  isPredecessor: function(t, e) {
    var n = !1;
    return this.search(t, function(r) {
      if (r === e && r !== t)
        return n = !0, !1;
    }, { inbound: !0 }), n;
  },
  isNeighbor: function(t, e, n) {
    n = n || {};
    var r = n.inbound, i = n.outbound;
    r === void 0 && i === void 0 && (r = i = !0);
    var s = !1;
    return this.getConnectedLinks(t, n).forEach(function(o) {
      var { source: a, target: c } = o.attributes;
      if (r && ue(a, "id") && a.id === e.id || i && ue(c, "id") && c.id === e.id)
        return s = !0, !1;
    }), s;
  },
  disconnectLinks: function(t, e) {
    this.getConnectedLinks(t).forEach(function(n) {
      n.set(n.attributes.source.id === t.id ? "source" : "target", {
        x: 0,
        y: 0
      }, e);
    });
  },
  removeLinks: function(t, e) {
    le(this.getConnectedLinks(t), "remove", e);
  },
  findElementsAtPoint: function(t, e) {
    return this._filterAtPoint(this.getElements(), t, e);
  },
  findLinksAtPoint: function(t, e) {
    return this._filterAtPoint(this.getLinks(), t, e);
  },
  findCellsAtPoint: function(t, e) {
    return this._filterAtPoint(this.getCells(), t, e);
  },
  _filterAtPoint: function(t, e, n = {}) {
    return t.filter((r) => r.getBBox({ rotate: !0 }).containsPoint(e, n));
  },
  findElementsInArea: function(t, e = {}) {
    return this._filterInArea(this.getElements(), t, e);
  },
  findLinksInArea: function(t, e = {}) {
    return this._filterInArea(this.getLinks(), t, e);
  },
  findCellsInArea: function(t, e = {}) {
    return this._filterInArea(this.getCells(), t, e);
  },
  _filterInArea: function(t, e, n = {}) {
    const r = new j(e), { strict: i = !1 } = n, s = i ? "containsRect" : "intersect";
    return t.filter((o) => r[s](o.getBBox({ rotate: !0 })));
  },
  findElementsUnderElement: function(t, e) {
    return this._filterCellsUnderElement(this.getElements(), t, e);
  },
  findLinksUnderElement: function(t, e) {
    return this._filterCellsUnderElement(this.getLinks(), t, e);
  },
  findCellsUnderElement: function(t, e) {
    return this._filterCellsUnderElement(this.getCells(), t, e);
  },
  _isValidElementUnderElement: function(t, e) {
    return t.id !== e.id && !t.isEmbeddedIn(e);
  },
  _isValidLinkUnderElement: function(t, e) {
    return t.source().id !== e.id && t.target().id !== e.id && !t.isEmbeddedIn(e);
  },
  _validateCellsUnderElement: function(t, e) {
    return t.filter((n) => n.isLink() ? this._isValidLinkUnderElement(n, e) : this._isValidElementUnderElement(n, e));
  },
  _getFindUnderElementGeometry: function(t, e = "bbox") {
    const n = t.getBBox({ rotate: !0 });
    return e !== "bbox" ? Nc(n, e) : n;
  },
  _filterCellsUnderElement: function(t, e, n = {}) {
    const r = this._getFindUnderElementGeometry(e, n.searchBy), i = r.type === ct.Point ? this._filterAtPoint(t, r) : this._filterInArea(t, r, n);
    return this._validateCellsUnderElement(i, e);
  },
  findModelsInArea: function(t, e) {
    return this.findElementsInArea(t, e);
  },
  findModelsFromPoint: function(t) {
    return this.findElementsAtPoint(t);
  },
  findModelsUnderElement: function(t, e) {
    return this.findElementsUnderElement(t, e);
  },
  getBBox: function() {
    return this.getCellsBBox(this.getCells());
  },
  getCellsBBox: function(t, e = {}) {
    const { rotate: n = !0 } = e;
    return pt(t).reduce(function(r, i) {
      const s = i.getBBox({ rotate: n });
      return s ? r ? r.union(s) : s : r;
    }, null);
  },
  translate: function(t, e, n) {
    var r = this.getCells().filter(function(i) {
      return !i.isEmbedded();
    });
    return le(r, "translate", t, e, n), this;
  },
  resize: function(t, e, n) {
    return this.resizeCells(t, e, this.getCells(), n);
  },
  resizeCells: function(t, e, n, r) {
    var i = this.getCellsBBox(n);
    if (i) {
      var s = Math.max(t / i.width, 0), o = Math.max(e / i.height, 0);
      le(n, "scale", s, o, i.origin(), r);
    }
    return this;
  },
  startBatch: function(t, e) {
    return e = e || {}, this._batches[t] = (this._batches[t] || 0) + 1, this.trigger("batch:start", $({}, e, { batchName: t }));
  },
  stopBatch: function(t, e) {
    return e = e || {}, this._batches[t] = (this._batches[t] || 0) - 1, this.trigger("batch:stop", $({}, e, { batchName: t }));
  },
  hasActiveBatch: function(t) {
    const e = this._batches;
    let n;
    return arguments.length === 0 ? n = Object.keys(e) : Array.isArray(t) ? n = t : n = [t], n.some((r) => e[r] > 0);
  }
}, { validations: {
  multiLinks: function(t, e) {
    var { source: n, target: r } = e.attributes;
    if (n.id && r.id) {
      var i = e.getSourceCell();
      if (i) {
        var s = t.getConnectedLinks(i, { outbound: !0 }), o = s.filter(function(a) {
          var { source: c, target: u } = a.attributes;
          return c && c.id === n.id && (!c.port || c.port === n.port) && u && u.id === r.id && (!u.port || u.port === r.port);
        });
        if (o.length > 1) return !1;
      }
    }
    return !0;
  },
  linkPinning: function(t, e) {
    var { source: n, target: r } = e.attributes;
    return n.id && r.id;
  }
} });
dd(ys.prototype, [
  "resetCells",
  "addCells",
  "removeCells"
], Si.cells);
const Dt = {
  GRID: "grid",
  CELLS: "cells",
  BACK: "back",
  FRONT: "front",
  TOOLS: "tools",
  LABELS: "labels"
}, _i = an.extend({
  tagName: "g",
  svgElement: !0,
  pivotNodes: null,
  defaultTheme: null,
  options: { name: "" },
  className: function() {
    return pe(`${this.options.name}-layer`);
  },
  init: function() {
    this.pivotNodes = {};
  },
  insertSortedNode: function(t, e) {
    this.el.insertBefore(t, this.insertPivot(e));
  },
  insertNode: function(t) {
    const { el: e } = this;
    t.parentNode !== e && e.appendChild(t);
  },
  insertPivot: function(t) {
    const { el: e, pivotNodes: n } = this;
    t = +t, t || (t = 0);
    let r = n[t];
    if (r) return r;
    r = n[t] = document.createComment("z-index:" + (t + 1));
    let i = -1 / 0;
    for (let s in n)
      s = +s, s < t && s > i && (i = s, t - 1);
    if (i !== -1 / 0) {
      const s = n[i];
      e.insertBefore(r, s.nextSibling);
    } else e.insertBefore(r, e.firstChild);
    return r;
  },
  removePivots: function() {
    const { el: t, pivotNodes: e } = this;
    for (let n in e) t.removeChild(e[n]);
    this.pivotNodes = {};
  }
}), $p = [
  "transform",
  "x",
  "y",
  "cx",
  "cy",
  "dx",
  "dy",
  "x1",
  "y1",
  "x2",
  "y2",
  "points",
  "d",
  "r",
  "rx",
  "ry",
  "width",
  "height",
  "stroke-width",
  "font-size"
], qp = [
  "r",
  "rx",
  "ry",
  "width",
  "height",
  "stroke-width",
  "font-size"
], Yp = $p.reduce((t, e) => (t[e] = !0, t), {}), Xp = qp.reduce((t, e) => (t[e] = !0, t), {});
function Bo(t, e) {
  const n = {};
  for (let r in t)
    t.hasOwnProperty(r) && (n[r] = ul(r, t[r], e));
  return n;
}
function ul(t, e, n) {
  if (t in Yp && fn(e)) {
    let r = dn(e, n);
    return t in Xp && (r = Math.max(0, r)), r;
  }
  return e;
}
const Xe = {
  DEFAULT: "default",
  EMBEDDING: "embedding",
  CONNECTING: "connecting",
  MAGNET_AVAILABILITY: "magnetAvailability",
  ELEMENT_AVAILABILITY: "elementAvailability"
}, Jp = { TOOLS: "TOOLS" }, ht = an.extend({
  tagName: "g",
  svgElement: !0,
  selector: "root",
  metrics: null,
  className: function() {
    var t = ["cell"], e = this.model.get("type");
    return e && e.toLowerCase().split(".").forEach(function(n, r, i) {
      t.push("type-" + i.slice(0, r + 1).join("-"));
    }), t.join(" ");
  },
  _presentationAttributes: null,
  _flags: null,
  setFlags: function() {
    var t = {}, e = {}, n = 0, r, i, s, o = wt(this, "presentationAttributes");
    for (var a in o)
      if (o.hasOwnProperty(a)) {
        var c = o[a];
        for (Array.isArray(c) || (c = [c]), r = 0, i = c.length; r < i; r++) {
          s = c[r];
          var u = t[s];
          u || (u = t[s] = 1 << n++), e[a] |= u;
        }
      }
    var h = wt(this, "initFlag");
    for (Array.isArray(h) || (h = [h]), r = 0, i = h.length; r < i; r++)
      s = h[r], t[s] || (t[s] = 1 << n++);
    if (n > 25) throw new Error("dia.CellView: Maximum number of flags exceeded.");
    this._flags = t, this._presentationAttributes = e;
  },
  hasFlag: function(t, e) {
    return t & this.getFlag(e);
  },
  removeFlag: function(t, e) {
    return t ^ t & this.getFlag(e);
  },
  getFlag: function(t) {
    var e = this._flags;
    if (!e) return 0;
    var n = 0;
    if (Array.isArray(t)) for (var r = 0, i = t.length; r < i; r++) n |= e[t[r]];
    else n |= e[t];
    return n;
  },
  attributes: function() {
    var t = this.model;
    return {
      "model-id": t.id,
      "data-type": t.attributes.type
    };
  },
  constructor: function(t) {
    t.id = t.id || rn(this), an.call(this, t);
  },
  initialize: function() {
    this.setFlags(), an.prototype.initialize.apply(this, arguments), this.cleanNodesCache(), this.startListening();
  },
  startListening: function() {
    this.listenTo(this.model, "change", this.onAttributesChange);
  },
  onAttributesChange: function(t, e) {
    var n = t.getChangeFlag(this._presentationAttributes);
    e.updateHandled || !n || (e.dirty && this.hasFlag(n, "UPDATE") && (n |= this.getFlag("RENDER")), e.tool && (e.async = !1), this.requestUpdate(n, e));
  },
  requestUpdate: function(t, e) {
    const { paper: n } = this;
    n && t > 0 && n.requestViewUpdate(this, t, this.UPDATE_PRIORITY, e);
  },
  parseDOMJSON: function(t, e) {
    var n = Pr(t), r = n.selectors, i = n.groupSelectors;
    for (var s in i) {
      if (r[s]) throw new Error("dia.CellView: ambiguous group selector");
      r[s] = i[s];
    }
    if (e) {
      var o = this.selector;
      if (r[o]) throw new Error("dia.CellView: ambiguous root selector.");
      r[o] = e;
    }
    return {
      fragment: n.fragment,
      selectors: r
    };
  },
  can: function(t) {
    var e = bt(this.options.interactive) ? this.options.interactive(this) : this.options.interactive;
    return gt(e) && e[t] !== !1 || Rh(e) && e !== !1;
  },
  findBySelector: function(t, e, n) {
    if (!t || t === ".") return [e];
    if (n) {
      var r = n[t];
      if (r)
        return Array.isArray(r) ? r : [r];
    }
    return this.useCSSSelectors ? xt(e).find(t).toArray() : [];
  },
  findNodes: function(t) {
    return this.findBySelector(t, this.el, this.selectors);
  },
  findNode: function(t) {
    const [e = null] = this.findNodes(t);
    return e;
  },
  notify: function(t) {
    if (this.paper) {
      var e = Array.prototype.slice.call(arguments, 1);
      this.trigger.apply(this, [t].concat(e)), this.paper.trigger.apply(this.paper, [t, this].concat(e));
    }
  },
  getBBox: function(t) {
    var e;
    if (t && t.useModelGeometry) {
      var n = this.model;
      e = n.getBBox().bbox(n.angle());
    } else e = this.getNodeBBox(this.el);
    return this.paper.localToPaperRect(e);
  },
  getNodeBBox: function(t) {
    const e = this.getNodeBoundingRect(t), n = this.getRootTranslateMatrix().multiply(this.getNodeRotateMatrix(t)), r = this.getNodeMatrix(t);
    return B.transformRect(e, n.multiply(r));
  },
  getNodeRotateMatrix(t) {
    return !this.rotatableNode || this.rotatableNode.contains(t) ? this.getRootRotateMatrix() : B.createSVGMatrix();
  },
  getNodeUnrotatedBBox: function(t) {
    var e = this.getNodeBoundingRect(t), n = this.getNodeMatrix(t), r = this.getRootTranslateMatrix();
    return B.transformRect(e, r.multiply(n));
  },
  getRootTranslateMatrix: function() {
    var t = this.model, e = t.position(), n = B.createSVGMatrix().translate(e.x, e.y);
    return n;
  },
  getRootRotateMatrix: function() {
    var t = B.createSVGMatrix(), e = this.model, n = e.angle();
    if (n) {
      var r = e.getBBox(), i = r.width / 2, s = r.height / 2;
      t = t.translate(i, s).rotate(n).translate(-i, -s);
    }
    return t;
  },
  _notifyHighlight: function(t, e, n = {}) {
    const { el: r } = this;
    let i;
    if (typeof e == "string" ? i = this.findNode(e) || r : [i = r] = this.$(e), n.partial = i !== r, n.type === void 0) {
      let s;
      switch (!0) {
        case n.embedding:
          s = Xe.EMBEDDING;
          break;
        case n.connecting:
          s = Xe.CONNECTING;
          break;
        case n.magnetAvailability:
          s = Xe.MAGNET_AVAILABILITY;
          break;
        case n.elementAvailability:
          s = Xe.ELEMENT_AVAILABILITY;
          break;
        default:
          s = Xe.DEFAULT;
          break;
      }
      n.type = s;
    }
    return this.notify(t, i, n), this;
  },
  highlight: function(t, e) {
    return this._notifyHighlight("cell:highlight", t, e);
  },
  unhighlight: function(t, e = {}) {
    return this._notifyHighlight("cell:unhighlight", t, e);
  },
  findMagnet: function(t) {
    const e = this.el;
    let n = this.$(t)[0];
    n || (n = e);
    do {
      const r = n.getAttribute("magnet"), i = n === e;
      if ((r || i) && r !== "false") return n;
      if (i) return;
      n = n.parentNode;
    } while (n);
  },
  findProxyNode: function(t, e) {
    t || (t = this.el);
    const n = t.getAttribute(`${e}-selector`);
    if (n) {
      const r = this.findNode(n);
      if (r) return r;
    }
    return t;
  },
  getSelector: function(t, e) {
    var n;
    if (t === this.el)
      return typeof e == "string" && (n = ":scope > " + e), n;
    if (t) {
      var r = B(t).index() + 1;
      n = t.tagName + ":nth-child(" + r + ")", e && (n += " > " + e), n = this.getSelector(t.parentNode, n);
    }
    return n;
  },
  addLinkFromMagnet: function(t, e, n) {
    var r = this.paper, i = r.model, s = r.getDefaultLink(this, t);
    return s.set({
      source: this.getLinkEnd(t, e, n, s, "source"),
      target: {
        x: e,
        y: n
      }
    }).addTo(i, {
      async: !1,
      ui: !0
    }), s.findView(r);
  },
  getLinkEnd: function(t, ...e) {
    const n = this.model, r = n.id, i = this.findAttributeNode("port", t), s = t.getAttribute("joint-selector"), o = { id: r };
    if (s != null && (o.magnet = s), i != null) {
      let a = i.getAttribute("port");
      i.getAttribute("port-id-type") === "number" && (a = parseInt(a, 10)), o.port = a, !n.hasPort(a) && !s && (o.selector = this.getSelector(t));
    } else s == null && this.el !== t && (o.selector = this.getSelector(t));
    return this.customizeLinkEnd(o, t, ...e);
  },
  customizeLinkEnd: function(t, e, n, r, i, s) {
    const { paper: o } = this, { connectionStrategy: a } = o.options;
    if (typeof a == "function") {
      var c = a.call(o, t, this, e, new E(n, r), i, s, o);
      if (c) return c;
    }
    return t;
  },
  getMagnetFromLinkEnd: function(t) {
    var e = t.port, n = t.magnet, r = this.model, i;
    return e != null && r.isElement() && r.hasPort(e) ? i = this.findPortNode(e, n) || this.el : (n || (n = t.selector), !n && e != null && (n = '[port="' + e + '"]'), i = this.findNode(n)), this.findProxyNode(i, "magnet");
  },
  dragLinkStart: function(t, e, n, r) {
    this.model.startBatch("add-link");
    const i = this.addLinkFromMagnet(e, n, r);
    i.notifyPointerdown(t, n, r), i.eventData(t, i.startArrowheadMove("target", { whenNotAllowed: "remove" })), this.eventData(t, { linkView: i });
  },
  dragLink: function(t, e, n) {
    var r = this.eventData(t), i = r.linkView;
    if (i) i.pointermove(t, e, n);
    else {
      var s = this.paper, o = s.options.magnetThreshold, a = this.getEventTarget(t), c = r.targetMagnet;
      if (o === "onleave") {
        if (c === a || B(c).contains(a)) return;
      } else if (s.eventData(t).mousemoved <= o) return;
      this.dragLinkStart(t, c, e, n);
    }
  },
  dragLinkEnd: function(t, e, n) {
    var r = this.eventData(t), i = r.linkView;
    i && (i.pointerup(t, e, n), this.model.stopBatch("add-link"));
  },
  getAttributeDefinition: function(t) {
    return this.model.constructor.getAttributeDefinition(t);
  },
  setNodeAttributes: function(t, e) {
    Yt(e) || (t instanceof SVGElement ? B(t).attr(e) : xt(t).attr(e));
  },
  processNodeAttributes: function(t, e) {
    var n, r, i, s, o, a, c, u, h, l = [];
    const d = {};
    for (n in e)
      e.hasOwnProperty(n) && (d[B.attributeNames[n]] = e[n]);
    for (n in d)
      if (d.hasOwnProperty(n))
        if (r = d[n], i = this.getAttributeDefinition(n), i) if (r === null) {
          let g;
          if (bt(i.unset) ? g = i.unset.call(this, t, d, this) : g = i.unset, !g && Ct(i.set) && (g = i.set), g || (g = n), Ct(g) && g) {
            if (a || (a = {}), g in a) continue;
            a[g] = r;
          } else if (Array.isArray(g) && g.length > 0)
            for (a || (a = {}), s = 0, o = g.length; s < o; s++) {
              const v = g[s];
              v in a || (a[v] = r);
            }
        } else !bt(i.qualify) || i.qualify.call(this, r, t, d, this) ? (Ct(i.set) && (a || (a = {}), a[i.set] = r), l.push(n, i)) : (a || (a = {}), a[n] = r);
        else
          a || (a = {}), a[n] = r;
    for (s = 0, o = l.length; s < o; s += 2)
      n = l[s], i = l[s + 1], r = e[n], bt(i.set) && (c || (c = {}), c[n] = r), bt(i.position) && (u || (u = {}), u[n] = r), bt(i.offset) && (h || (h = {}), h[n] = r);
    return {
      raw: d,
      normal: a,
      set: c,
      position: u,
      offset: h
    };
  },
  updateRelativeAttributes: function(t, e, n, r) {
    r || (r = {});
    var i, s, o, a = Bo(e.raw || {}, n), c = e.normal || {};
    for (const p in c) c[p] = a[p];
    var u = e.set, h = e.position, l = e.offset;
    for (i in u) {
      s = a[i], o = this.getAttributeDefinition(i);
      var d = o.set.call(this, s, n.clone(), t, a, this);
      gt(d) ? $(c, d) : d !== void 0 && (c[i] = d);
    }
    if (t instanceof HTMLElement) {
      this.setNodeAttributes(t, c);
      return;
    }
    var g = c.transform, v = B.transformStringToMatrix(g), y = E(v.e, v.f);
    g && (c = $n(c, "transform"), v.e = v.f = 0);
    var w, x, P;
    if (h || l) {
      var T = this.getNodeScale(t, r.scalableNode);
      w = T.sx, x = T.sy;
    }
    var L = !1;
    for (i in h)
      s = a[i], o = this.getAttributeDefinition(i), P = o.position.call(this, s, n.clone(), t, a, this), P && (y.offset(E(P).scale(w, x)), L || (L = !0));
    this.setNodeAttributes(t, c);
    var I = !1;
    if (l) {
      var R = this.getNodeBoundingRect(t);
      if (R.width > 0 && R.height > 0) {
        var f = B.transformRect(R, v).scale(1 / w, 1 / x);
        for (i in l)
          s = a[i], o = this.getAttributeDefinition(i), P = o.offset.call(this, s, f, t, a, this), P && (y.offset(E(P).scale(w, x)), I || (I = !0));
      }
    }
    (g !== void 0 || L || I) && (y.round(1), v.e = y.x, v.f = y.y, t.setAttribute("transform", B.matrixToTransformString(v)));
  },
  getNodeScale: function(t, e) {
    var n, r;
    if (e && e.contains(t)) {
      var i = e.scale();
      n = 1 / i.sx, r = 1 / i.sy;
    } else
      n = 1, r = 1;
    return {
      sx: n,
      sy: r
    };
  },
  cleanNodesCache: function() {
    this.metrics = {};
  },
  cleanNodeCache: function(t) {
    const e = t.id;
    e && delete this.metrics[e];
  },
  nodeCache: function(t) {
    var e = this.metrics;
    if (!e) return {};
    var n = B.ensureId(t), r = e[n];
    return r || (r = e[n] = {}), r;
  },
  getNodeData: function(t) {
    var e = this.nodeCache(t);
    return e.data || (e.data = {}), e.data;
  },
  getNodeBoundingRect: function(t) {
    var e = this.nodeCache(t);
    return e.boundingRect === void 0 && (e.boundingRect = B(t).getBBox()), new j(e.boundingRect);
  },
  getNodeMatrix: function(t) {
    const e = this.nodeCache(t);
    if (e.magnetMatrix === void 0) {
      const { rotatableNode: n, el: r } = this;
      let i;
      n && n.contains(t) ? i = n : i = r, e.magnetMatrix = B(t).getTransformToElement(i);
    }
    return B.createSVGMatrix(e.magnetMatrix);
  },
  getNodeShape: function(t) {
    var e = this.nodeCache(t);
    return e.geometryShape === void 0 && (e.geometryShape = B(t).toGeometryShape()), e.geometryShape.clone();
  },
  isNodeConnection: function(t) {
    return this.model.isLink() && (!t || t === this.el);
  },
  findNodesAttributes: function(t, e, n, r) {
    var i, s, o, a, c = {}, u = [];
    for (var h in t)
      if (t.hasOwnProperty(h) && (o = t[h], !!Tt(o))) {
        var l = n[h] = this.findBySelector(h, e, r);
        for (i = 0, s = l.length; i < s; i++) {
          var d = l[i];
          a = B.ensureId(d);
          var g = r && r[h] === d, v = c[a];
          if (v) {
            v.array || (u.push(a), v.array = !0, v.attributes = [v.attributes], v.selectedLength = [v.selectedLength]);
            var y = v.attributes, w = v.selectedLength;
            if (g)
              y.unshift(o), w.unshift(-1);
            else {
              var x = ac(w, s);
              y.splice(x, 0, o), w.splice(x, 0, s);
            }
          } else c[a] = {
            attributes: o,
            selectedLength: g ? -1 : s,
            node: d,
            array: !1
          };
        }
      }
    for (i = 0, s = u.length; i < s; i++)
      a = u[i], o = c[a], o.attributes = kt({}, ...o.attributes.reverse());
    return c;
  },
  getEventTarget: function(t, e = {}) {
    const { target: n, type: r, clientX: i = 0, clientY: s = 0 } = t;
    return e.fromPoint || r === "touchmove" || r === "touchend" || "pointerId" in t && n.hasPointerCapture(t.pointerId) ? document.elementFromPoint(i, s) : n;
  },
  updateDOMSubtreeAttributes: function(t, e, n) {
    n || (n = {}), n.rootBBox || (n.rootBBox = j()), n.selectors || (n.selectors = this.selectors);
    var r = {}, i = {}, s = [], o = [], a, c, u, h, l, d = n.roAttributes, g = this.findNodesAttributes(d || e, t, r, n.selectors), v = d ? this.findNodesAttributes(e, t, r, n.selectors) : g;
    for (var y in g)
      if (h = g[y], u = h.attributes, c = h.node, l = this.processNodeAttributes(c, u), !l.set && !l.position && !l.offset && !l.raw.ref) this.setNodeAttributes(c, Bo(l.normal, n.rootBBox));
      else {
        var w = v[y] && v[y].attributes, x = w && u.ref === void 0 ? w.ref : u.ref, P;
        if (x) {
          if (P = (r[x] || this.findBySelector(x, t, n.selectors))[0], !P) throw new Error('dia.CellView: "' + x + '" reference does not exist.');
        } else P = null;
        if (a = {
          node: c,
          refNode: P,
          processedAttributes: l,
          allAttributes: w
        }, P) {
          var T = o.findIndex(function(L) {
            return L.refNode === c;
          });
          T > -1 ? o.splice(T, 0, a) : o.push(a);
        } else s.push(a);
      }
    s.push(...o);
    for (let L = 0, I = s.length; L < I; L++) {
      a = s[L], c = a.node, P = a.refNode;
      const R = P ? B.ensureId(P) : "";
      let f = i[R];
      f || (f = i[R] = P ? B(P).getBBox({ target: Kp(c, P) }) : n.rootBBox), d ? (l = this.processNodeAttributes(c, a.allAttributes), this.mergeProcessedAttributes(l, a.processedAttributes)) : l = a.processedAttributes, this.updateRelativeAttributes(c, l, f, n);
    }
  },
  mergeProcessedAttributes: function(t, e) {
    t.set || (t.set = {}), t.position || (t.position = {}), t.offset || (t.offset = {}), $(t.set, e.set), $(t.position, e.position), $(t.offset, e.offset);
    var n = t.normal && t.normal.transform;
    n !== void 0 && e.normal && (e.normal.transform = n), t.normal = e.normal;
  },
  onMount(t) {
    t || (this.mountTools(), re.mount(this));
  },
  onDetach() {
    this.unmountTools(), re.unmount(this);
  },
  onRemove: function() {
    this.removeTools(), this.removeHighlighters();
  },
  _toolsView: null,
  hasTools: function(t) {
    var e = this._toolsView;
    return e ? t ? e.getName() === t : !0 : !1;
  },
  addTools: function(t) {
    return this.removeTools(), t && (this._toolsView = t, t.configure({ relatedView: this }), t.listenTo(this.paper, "tools:event", this.onToolEvent.bind(this))), this;
  },
  unmountTools() {
    const t = this._toolsView;
    return t && t.unmount(), this;
  },
  mountTools() {
    const t = this._toolsView;
    return t && !t.isMounted() && t.mount(), this;
  },
  updateTools: function(t) {
    var e = this._toolsView;
    return e && e.update(t), this;
  },
  removeTools: function() {
    var t = this._toolsView;
    return t && (t.remove(), this._toolsView = null), this;
  },
  hideTools: function() {
    var t = this._toolsView;
    return t && t.hide(), this;
  },
  showTools: function() {
    var t = this._toolsView;
    return t && t.show(), this;
  },
  onToolEvent: function(t) {
    switch (t) {
      case "remove":
        this.removeTools();
        break;
      case "hide":
        this.hideTools();
        break;
      case "show":
        this.showTools();
        break;
    }
  },
  removeHighlighters: function() {
    re.remove(this);
  },
  updateHighlighters: function(t = !1) {
    re.update(this, null, t);
  },
  transformHighlighters: function() {
    re.transform(this);
  },
  preventDefaultInteraction(t) {
    this.eventData(t, { defaultInteractionPrevented: !0 });
  },
  isDefaultInteractionPrevented(t) {
    const { defaultInteractionPrevented: e = !1 } = this.eventData(t);
    return e;
  },
  pointerdblclick: function(t, e, n) {
    this.notify("cell:pointerdblclick", t, e, n);
  },
  pointerclick: function(t, e, n) {
    this.notify("cell:pointerclick", t, e, n);
  },
  contextmenu: function(t, e, n) {
    this.notify("cell:contextmenu", t, e, n);
  },
  pointerdown: function(t, e, n) {
    const { model: r } = this, { graph: i } = r;
    i && (r.startBatch("pointer"), this.eventData(t, { graph: i })), this.notify("cell:pointerdown", t, e, n);
  },
  pointermove: function(t, e, n) {
    this.notify("cell:pointermove", t, e, n);
  },
  pointerup: function(t, e, n) {
    const { graph: r } = this.eventData(t);
    this.notify("cell:pointerup", t, e, n), r && r.stopBatch("pointer", { cell: this.model });
  },
  mouseover: function(t) {
    this.notify("cell:mouseover", t);
  },
  mouseout: function(t) {
    this.notify("cell:mouseout", t);
  },
  mouseenter: function(t) {
    this.notify("cell:mouseenter", t);
  },
  mouseleave: function(t) {
    this.notify("cell:mouseleave", t);
  },
  mousewheel: function(t, e, n, r) {
    this.notify("cell:mousewheel", t, e, n, r);
  },
  onevent: function(t, e, n, r) {
    this.notify(e, t, n, r);
  },
  onmagnet: function() {
  },
  magnetpointerdblclick: function() {
  },
  magnetcontextmenu: function() {
  },
  checkMouseleave(t) {
    const { paper: e, model: n } = this;
    if (e.isAsync()) {
      if (n.isLink()) {
        const s = n.getSourceElement();
        if (s) {
          const a = e.findViewByModel(s);
          a && (e.dumpView(a), e.checkViewVisibility(a));
        }
        const o = n.getTargetElement();
        if (o) {
          const a = e.findViewByModel(o);
          a && (e.dumpView(a), e.checkViewVisibility(a));
        }
      }
      e.dumpView(this), e.checkViewVisibility(this);
    }
    const r = this.getEventTarget(t, { fromPoint: !0 }), i = e.findView(r);
    i !== this && (this.mouseleave(t), i && i.mouseenter(t));
  },
  setInteractivity: function(t) {
    this.options.interactive = t;
  },
  isIntersecting: function(t, e) {
    return Me.exists(t, this.getNodeBBox(this.el), e);
  },
  isEnclosedIn: function(t) {
    return t.containsRect(this.getNodeBBox(this.el));
  },
  isInArea: function(t, e = {}) {
    return e.strict ? this.isEnclosedIn(t) : this.isIntersecting(t);
  },
  isAtPoint: function(t, e) {
    return this.getNodeBBox(this.el).containsPoint(t, e);
  }
}, {
  Flags: Jp,
  Highlighting: Xe,
  addPresentationAttributes: function(t) {
    return kt({}, wt(this.prototype, "presentationAttributes"), t, function(e, n) {
      if (!(!e || !n) && (typeof e == "string" && (e = [e]), typeof n == "string" && (n = [n]), Array.isArray(e) && Array.isArray(n)))
        return Ve(e.concat(n));
    });
  },
  evalAttribute: ul
});
Object.defineProperty(ht.prototype, "useCSSSelectors", { get() {
  const t = this.model.useCSSSelectors;
  return t !== void 0 ? t : Fe.useCSSSelectors;
} });
function Kp(t, e) {
  let n = t;
  do {
    if (n.contains(e)) return n;
    n = n.parentNode;
  } while (n);
  return null;
}
const dt = {
  TOOLS: ht.Flags.TOOLS,
  UPDATE: "UPDATE",
  TRANSLATE: "TRANSLATE",
  RESIZE: "RESIZE",
  PORTS: "PORTS",
  ROTATE: "ROTATE",
  RENDER: "RENDER"
}, Je = {
  MOVE: "move",
  MAGNET: "magnet"
}, _n = ht.extend({
  _removePorts: function() {
  },
  _renderPorts: function() {
  },
  className: function() {
    var t = ht.prototype.className.apply(this).split(" ");
    return t.push("element"), t.join(" ");
  },
  initialize: function() {
    ht.prototype.initialize.apply(this, arguments), this._initializePorts();
  },
  presentationAttributes: {
    attrs: [dt.UPDATE],
    position: [dt.TRANSLATE, dt.TOOLS],
    size: [
      dt.RESIZE,
      dt.PORTS,
      dt.TOOLS
    ],
    angle: [dt.ROTATE, dt.TOOLS],
    markup: [dt.RENDER],
    ports: [dt.PORTS]
  },
  initFlag: [dt.RENDER],
  UPDATE_PRIORITY: 0,
  confirmUpdate: function(t, e) {
    const { useCSSSelectors: n } = this;
    this.hasFlag(t, dt.PORTS) && (this._removePorts(), this._cleanPortsCache());
    let r = !1;
    if (this.hasFlag(t, dt.RENDER))
      this.render(), this.updateTools(e), this.updateHighlighters(!0), r = !0, t = this.removeFlag(t, [
        dt.RENDER,
        dt.UPDATE,
        dt.RESIZE,
        dt.TRANSLATE,
        dt.ROTATE,
        dt.PORTS,
        dt.TOOLS
      ]);
    else {
      let i = !1;
      this.hasFlag(t, dt.RESIZE) && (this.resize(e), i = !0, t = this.removeFlag(t, [dt.RESIZE, dt.UPDATE]), n && (t = this.removeFlag(t, dt.PORTS))), this.hasFlag(t, dt.UPDATE) && (this.update(this.model, null, e), t = this.removeFlag(t, dt.UPDATE), i = !0, n && (t = this.removeFlag(t, dt.PORTS))), this.hasFlag(t, dt.TRANSLATE) && (this.translate(), t = this.removeFlag(t, dt.TRANSLATE), r = !0), this.hasFlag(t, dt.ROTATE) && (this.rotate(), t = this.removeFlag(t, dt.ROTATE), r = !0), this.hasFlag(t, dt.PORTS) && (this._renderPorts(), i = !0, t = this.removeFlag(t, dt.PORTS)), i && this.updateHighlighters(!1);
    }
    return r && this.transformHighlighters(), this.hasFlag(t, dt.TOOLS) && (this.updateTools(e), t = this.removeFlag(t, dt.TOOLS)), t;
  },
  _initializePorts: function() {
  },
  update: function(t, e) {
    this.cleanNodesCache();
    const { useCSSSelectors: n } = this;
    n && this._removePorts();
    var r = this.model, i = r.attr();
    this.updateDOMSubtreeAttributes(this.el, i, {
      rootBBox: new j(r.size()),
      selectors: this.selectors,
      scalableNode: this.scalableNode,
      rotatableNode: this.rotatableNode,
      roAttributes: e === i ? null : e
    }), n && this._renderPorts();
  },
  rotatableSelector: "rotatable",
  scalableSelector: "scalable",
  scalableNode: null,
  rotatableNode: null,
  renderMarkup: function() {
    var t = this.model, e = t.get("markup") || t.markup;
    if (!e) throw new Error("dia.ElementView: markup required");
    if (Array.isArray(e)) return this.renderJSONMarkup(e);
    if (typeof e == "string") return this.renderStringMarkup(e);
    throw new Error("dia.ElementView: invalid markup");
  },
  renderJSONMarkup: function(t) {
    var e = this.parseDOMJSON(t, this.el), n = this.selectors = e.selectors;
    this.rotatableNode = B(n[this.rotatableSelector]) || null, this.scalableNode = B(n[this.scalableSelector]) || null, this.vel.append(e.fragment);
  },
  renderStringMarkup: function(t) {
    var e = this.vel;
    e.append(B(t)), this.rotatableNode = e.findOne(".rotatable"), this.scalableNode = e.findOne(".scalable");
    var n = this.selectors = {};
    n[this.selector] = this.el;
  },
  render: function() {
    return this.vel.empty(), this.renderMarkup(), this.scalableNode && this.update(), this.resize(), this.rotatableNode ? (this.rotate(), this.translate()) : this.updateTransformation(), this.useCSSSelectors || this._renderPorts(), this;
  },
  resize: function(t) {
    if (this.scalableNode) return this.sgResize(t);
    this.model.attributes.angle && this.rotate(), this.update();
  },
  translate: function() {
    if (this.rotatableNode) return this.rgTranslate();
    this.updateTransformation();
  },
  rotate: function() {
    if (this.rotatableNode) {
      this.rgRotate(), this.update();
      return;
    }
    this.updateTransformation();
  },
  updateTransformation: function() {
    var t = this.getTranslateString(), e = this.getRotateString();
    e && (t += " " + e), this.vel.attr("transform", t);
  },
  getTranslateString: function() {
    const { x: t, y: e } = this.model.position();
    return `translate(${t},${e})`;
  },
  getRotateString: function() {
    const t = this.model.angle();
    if (!t) return null;
    const { width: e, height: n } = this.model.size();
    return `rotate(${t},${e / 2},${n / 2})`;
  },
  rgRotate: function() {
    this.rotatableNode.attr("transform", this.getRotateString());
  },
  rgTranslate: function() {
    this.vel.attr("transform", this.getTranslateString());
  },
  sgResize: function(t) {
    var e = this.model, n = e.angle(), r = e.size(), i = this.scalableNode, s = !1;
    i.node.getElementsByTagName("path").length > 0 && (s = !0);
    var o = i.getBBox({ recursive: s }), a = r.width / (o.width || 1), c = r.height / (o.height || 1);
    i.attr("transform", "scale(" + a + "," + c + ")");
    var u = this.rotatableNode, h = u && u.attr("transform");
    if (h) {
      u.attr("transform", h + " rotate(" + -n + "," + r.width / 2 + "," + r.height / 2 + ")");
      var l = i.getBBox({ target: this.paper.cells });
      e.set("position", {
        x: l.x,
        y: l.y
      }, $({ updateHandled: !0 }, t)), this.translate(), this.rotate();
    }
    this.update();
  },
  prepareEmbedding: function(t = {}) {
    const e = t.model || this.model, r = (t.paper || this.paper).model, i = t.initialZIndices = {}, s = e.getEmbeddedCells({ deep: !0 }), o = r.getConnectedLinks(e, {
      deep: !0,
      includeEnclosed: !0
    });
    [
      e,
      ...s,
      ...o
    ].forEach((u) => i[u.id] = u.attributes.z), e.startBatch("to-front"), e.toFront({
      deep: !0,
      ui: !0
    });
    const a = r.getElements().reduce((u, h) => Math.max(u, h.attributes.z || 0), 0);
    o.forEach((u) => {
      u.attributes.z <= a && u.set("z", a + 1, { ui: !0 });
    }), e.stopBatch("to-front");
    const c = e.parent();
    c ? (r.getCell(c).unembed(e, { ui: !0 }), t.initialParentId = c) : t.initialParentId = null;
  },
  processEmbedding: function(t = {}, e, n, r) {
    const i = t.model || this.model, s = t.paper || this.paper, o = s.model, { findParentBy: a, frontParentOnly: c, validateEmbedding: u } = s.options;
    let h;
    bt(a) ? h = pt(a.call(o, this, e, n, r)) : a === "pointer" ? h = o.findElementsAtPoint({
      x: n,
      y: r
    }) : h = o.findElementsUnderElement(i, { searchBy: a }), h = h.filter((g) => g instanceof fe && i.id !== g.id && !g.isEmbeddedIn(i)), c && (h = h.slice(-1));
    let l = null;
    const d = t.candidateEmbedView;
    for (let g = h.length - 1; g >= 0; g--) {
      const v = h[g];
      if (d && d.model.id == v.id) {
        l = d;
        break;
      } else {
        const y = v.findView(s);
        if (!bt(u) || u.call(s, this, y)) {
          l = y;
          break;
        }
      }
    }
    l && l != d && (this.clearEmbedding(t), t.candidateEmbedView = l.highlight(l.findProxyNode(null, "container"), { embedding: !0 })), !l && d && this.clearEmbedding(t);
  },
  clearEmbedding: function(t) {
    t || (t = {});
    var e = t.candidateEmbedView;
    e && (e.unhighlight(e.findProxyNode(null, "container"), { embedding: !0 }), t.candidateEmbedView = null);
  },
  finalizeEmbedding: function(t = {}) {
    const e = t.candidateEmbedView, n = t.model || this.model, r = t.paper || this.paper;
    if (e)
      e.model.embed(n, { ui: !0 }), e.unhighlight(e.findProxyNode(null, "container"), { embedding: !0 }), t.candidateEmbedView = null;
    else {
      const { validateUnembedding: i } = r.options, { initialParentId: s } = t;
      if (s && typeof i == "function" && !i.call(r, this)) {
        this._disallowUnembed(t);
        return;
      }
    }
    r.model.getConnectedLinks(n, { deep: !0 }).forEach((i) => {
      i.reparent({ ui: !0 });
    });
  },
  _disallowUnembed: function(t) {
    const { model: e, whenNotAllowed: n = "revert" } = t, r = e || this.model, s = (t.paper || this.paper).model;
    switch (n) {
      case "remove":
        r.remove({ ui: !0 });
        break;
      case "revert": {
        const { initialParentId: o, initialPosition: a, initialZIndices: c } = t;
        if (a) {
          const { x: h, y: l } = a;
          r.position(h, l, {
            deep: !0,
            ui: !0
          });
        }
        c && Object.keys(c).forEach((h) => {
          const l = s.getCell(h);
          l && l.set("z", c[h], { ui: !0 });
        });
        const u = s.getCell(o);
        u && u.embed(r, { ui: !0 });
        break;
      }
    }
  },
  getTargetParentView: function(t) {
    const { candidateEmbedView: e = null } = this.eventData(t);
    return e;
  },
  getDelegatedView: function() {
    for (var t = this, e = t.model, n = t.paper; t && !e.isLink(); ) {
      if (!e.isEmbedded() || t.can("stopDelegation")) return t;
      e = e.getParentCell(), t = n.findViewByModel(e);
    }
    return null;
  },
  findProxyNode: function(t, e) {
    t || (t = this.el);
    const n = t.getAttribute(`${e}-selector`);
    if (n) {
      const r = this.findAttribute("port", t);
      if (r) {
        const i = this.findPortNode(r, n);
        if (i) return i;
      } else {
        const i = this.findNode(n);
        if (i) return i;
      }
    }
    return t;
  },
  notifyPointerdown(t, e, n) {
    ht.prototype.pointerdown.call(this, t, e, n), this.notify("element:pointerdown", t, e, n);
  },
  notifyPointermove(t, e, n) {
    ht.prototype.pointermove.call(this, t, e, n), this.notify("element:pointermove", t, e, n);
  },
  notifyPointerup(t, e, n) {
    this.notify("element:pointerup", t, e, n), ht.prototype.pointerup.call(this, t, e, n);
  },
  pointerdblclick: function(t, e, n) {
    ht.prototype.pointerdblclick.apply(this, arguments), this.notify("element:pointerdblclick", t, e, n);
  },
  pointerclick: function(t, e, n) {
    ht.prototype.pointerclick.apply(this, arguments), this.notify("element:pointerclick", t, e, n);
  },
  contextmenu: function(t, e, n) {
    ht.prototype.contextmenu.apply(this, arguments), this.notify("element:contextmenu", t, e, n);
  },
  pointerdown: function(t, e, n) {
    this.notifyPointerdown(t, e, n), this.dragStart(t, e, n);
  },
  pointermove: function(t, e, n) {
    const r = this.eventData(t), { targetMagnet: i, action: s, delegatedView: o } = r;
    switch (i && this.magnetpointermove(t, i, e, n), s) {
      case Je.MAGNET:
        this.dragMagnet(t, e, n);
        break;
      case Je.MOVE:
        (o || this).drag(t, e, n);
      default:
        if (r.preventPointerEvents) break;
        this.notifyPointermove(t, e, n);
        break;
    }
    this.eventData(t, r);
  },
  pointerup: function(t, e, n) {
    const r = this.eventData(t), { targetMagnet: i, action: s, delegatedView: o } = r;
    switch (i && this.magnetpointerup(t, i, e, n), s) {
      case Je.MAGNET:
        this.dragMagnetEnd(t, e, n);
        break;
      case Je.MOVE:
        (o || this).dragEnd(t, e, n);
      default:
        if (r.preventPointerEvents) break;
        this.notifyPointerup(t, e, n);
    }
    i && this.magnetpointerclick(t, i, e, n), this.checkMouseleave(t);
  },
  mouseover: function(t) {
    ht.prototype.mouseover.apply(this, arguments), this.notify("element:mouseover", t);
  },
  mouseout: function(t) {
    ht.prototype.mouseout.apply(this, arguments), this.notify("element:mouseout", t);
  },
  mouseenter: function(t) {
    ht.prototype.mouseenter.apply(this, arguments), this.notify("element:mouseenter", t);
  },
  mouseleave: function(t) {
    ht.prototype.mouseleave.apply(this, arguments), this.notify("element:mouseleave", t);
  },
  mousewheel: function(t, e, n, r) {
    ht.prototype.mousewheel.apply(this, arguments), this.notify("element:mousewheel", t, e, n, r);
  },
  onmagnet: function(t, e, n) {
    const { currentTarget: r } = t;
    this.magnetpointerdown(t, r, e, n), this.eventData(t, { targetMagnet: r }), this.dragMagnetStart(t, e, n);
  },
  magnetpointerdown: function(t, e, n, r) {
    this.notify("element:magnet:pointerdown", t, e, n, r);
  },
  magnetpointermove: function(t, e, n, r) {
    this.notify("element:magnet:pointermove", t, e, n, r);
  },
  magnetpointerup: function(t, e, n, r) {
    this.notify("element:magnet:pointerup", t, e, n, r);
  },
  magnetpointerdblclick: function(t, e, n, r) {
    this.notify("element:magnet:pointerdblclick", t, e, n, r);
  },
  magnetcontextmenu: function(t, e, n, r) {
    this.notify("element:magnet:contextmenu", t, e, n, r);
  },
  dragStart: function(t, e, n) {
    if (this.isDefaultInteractionPrevented(t)) return;
    var r = this.getDelegatedView();
    if (!r || !r.can("elementMove")) return;
    this.eventData(t, {
      action: Je.MOVE,
      delegatedView: r
    });
    const i = r.model.position();
    r.eventData(t, {
      initialPosition: i,
      pointerOffset: i.difference(e, n),
      restrictedArea: this.paper.getRestrictedArea(r, e, n)
    });
  },
  dragMagnetStart: function(t, e, n) {
    const { paper: r } = this, i = t.isPropagationStopped();
    if (i && this.eventData(t, { preventPointerEvents: !0 }), this.isDefaultInteractionPrevented(t) || !this.can("addLinkFromMagnet")) return;
    const { targetMagnet: s = t.currentTarget } = this.eventData(t);
    if (t.stopPropagation(), !r.options.validateMagnet.call(r, this, s, t)) {
      i ? this.dragStart(t, e, n) : this.pointerdown(t, e, n);
      return;
    }
    r.options.magnetThreshold <= 0 && this.dragLinkStart(t, s, e, n), this.eventData(t, { action: Je.MAGNET });
  },
  snapToGrid: function(t, e, n) {
    const r = this.paper.options.gridSize;
    return {
      x: Be(e, r),
      y: Be(n, r)
    };
  },
  drag: function(t, e, n) {
    var r = this.paper, i = this.model, s = this.eventData(t), { pointerOffset: o, restrictedArea: a, embedding: c } = s;
    const { x: u, y: h } = this.snapToGrid(t, e + o.x, n + o.y);
    i.position(u, h, {
      restrictedArea: a,
      deep: !0,
      ui: !0
    }), r.options.embeddingMode && (c || (this.prepareEmbedding(s), c = !0), this.processEmbedding(s, t, e, n)), this.eventData(t, { embedding: c });
  },
  dragMagnet: function(t, e, n) {
    this.dragLink(t, e, n);
  },
  dragEnd: function(t, e, n) {
    var r = this.eventData(t);
    r.embedding && this.finalizeEmbedding(r);
  },
  dragMagnetEnd: function(t, e, n) {
    this.dragLinkEnd(t, e, n);
  },
  magnetpointerclick: function(t, e, n, r) {
    var i = this.paper;
    i.eventData(t).mousemoved > i.options.clickThreshold || this.notify("element:magnet:pointerclick", t, e, n, r);
  }
}, { Flags: dt });
$(_n.prototype, Bd);
const ft = {
  TOOLS: ht.Flags.TOOLS,
  RENDER: "RENDER",
  UPDATE: "UPDATE",
  LABELS: "LABELS",
  SOURCE: "SOURCE",
  TARGET: "TARGET",
  CONNECTOR: "CONNECTOR"
}, Nn = ht.extend({
  className: function() {
    var t = ht.prototype.className.apply(this).split(" ");
    return t.push("link"), t.join(" ");
  },
  _labelCache: null,
  _labelSelectors: null,
  _V: null,
  _dragData: null,
  metrics: null,
  decimalsRounding: 2,
  initialize: function() {
    ht.prototype.initialize.apply(this, arguments), this._labelCache = {}, this._labelSelectors = {}, this._V = {}, this.cleanNodesCache();
  },
  presentationAttributes: {
    markup: [ft.RENDER],
    attrs: [ft.UPDATE],
    router: [ft.UPDATE],
    connector: [ft.CONNECTOR],
    labels: [ft.LABELS, ft.TOOLS],
    labelMarkup: [ft.LABELS],
    vertices: [ft.UPDATE],
    source: [ft.SOURCE, ft.UPDATE],
    target: [ft.TARGET, ft.UPDATE]
  },
  initFlag: [
    ft.RENDER,
    ft.SOURCE,
    ft.TARGET,
    ft.TOOLS
  ],
  UPDATE_PRIORITY: 1,
  EPSILON: 1e-6,
  confirmUpdate: function(t, e) {
    if (e || (e = {}), this.hasFlag(t, ft.SOURCE)) {
      if (!this.updateEndProperties("source")) return t;
      t = this.removeFlag(t, ft.SOURCE);
    }
    if (this.hasFlag(t, ft.TARGET)) {
      if (!this.updateEndProperties("target")) return t;
      t = this.removeFlag(t, ft.TARGET);
    }
    const { paper: n, sourceView: r, targetView: i } = this;
    if (n && (r && !n.isViewMounted(r) || i && !n.isViewMounted(i))) return t;
    if (this.hasFlag(t, ft.RENDER))
      return this.render(), this.updateHighlighters(!0), this.updateTools(e), t = this.removeFlag(t, [
        ft.RENDER,
        ft.UPDATE,
        ft.LABELS,
        ft.TOOLS,
        ft.CONNECTOR
      ]), zc.test("isSafari") && this.__fixSafariBug268376(), t;
    let s = !1;
    const { model: o } = this, { attributes: a } = o;
    let c = this.hasFlag(t, ft.LABELS);
    c && (this.onLabelsChange(o, a.labels, e), t = this.removeFlag(t, ft.LABELS), s = !0);
    const u = this.hasFlag(t, ft.UPDATE), h = this.hasFlag(t, ft.CONNECTOR);
    return (u || h) && (u ? e.translateBy && o.isRelationshipEmbeddedIn(e.translateBy) ? this.translate(e.tx, e.ty) : this.update() : (this.updatePath(), this.updateDOM()), this.updateTools(e), t = this.removeFlag(t, [
      ft.UPDATE,
      ft.TOOLS,
      ft.CONNECTOR
    ]), c = !1, s = !0), c && this.updateLabelPositions(), s && this.updateHighlighters(), this.hasFlag(t, ft.TOOLS) && (this.updateTools(e), t = this.removeFlag(t, ft.TOOLS)), t;
  },
  __fixSafariBug268376: function() {
    const { el: t } = this, e = Array.from(t.childNodes), n = document.createDocumentFragment();
    for (let r = 0, i = e.length; r < i; r++)
      t.removeChild(e[r]), n.appendChild(e[r]);
    t.appendChild(n);
  },
  requestConnectionUpdate: function(t) {
    this.requestUpdate(this.getFlag(ft.UPDATE), t);
  },
  isLabelsRenderRequired: function(t = {}) {
    const e = this.model.previous("labels");
    if (!e) return !0;
    if ("propertyPathArray" in t && "propertyValue" in t) {
      var n = t.propertyPathArray || [], r = n.length;
      if (r > 1) {
        var i = !!e[n[1]];
        if (i) {
          if (r === 2) return "markup" in Object(t.propertyValue);
          if (n[2] !== "markup") return !1;
        }
      }
    }
    return !0;
  },
  onLabelsChange: function(t, e, n) {
    this.isLabelsRenderRequired(n) ? this.renderLabels() : this.updateLabels();
  },
  render: function() {
    return this.vel.empty(), this.unmountLabels(), this._V = {}, this.renderMarkup(), this.renderLabels(), this.update(), this;
  },
  renderMarkup: function() {
    var t = this.model, e = t.get("markup") || t.markup;
    if (!e) throw new Error("dia.LinkView: markup required");
    if (Array.isArray(e)) return this.renderJSONMarkup(e);
    if (typeof e == "string") return this.renderStringMarkup(e);
    throw new Error("dia.LinkView: invalid markup");
  },
  renderJSONMarkup: function(t) {
    var e = this.parseDOMJSON(t, this.el);
    this.selectors = e.selectors, this.vel.append(e.fragment);
  },
  renderStringMarkup: function(t) {
    var e = B(t);
    Array.isArray(e) || (e = [e]), this.vel.append(e);
  },
  _getLabelMarkup: function(t) {
    if (t) {
      if (Array.isArray(t)) return this.parseDOMJSON(t, null);
      if (typeof t == "string") return this._getLabelStringMarkup(t);
      throw new Error("dia.linkView: invalid label markup");
    }
  },
  _getLabelStringMarkup: function(t) {
    var e = B(t), n = document.createDocumentFragment();
    if (!Array.isArray(e)) n.appendChild(e.node);
    else for (var r = 0, i = e.length; r < i; r++) {
      var s = e[r].node;
      n.appendChild(s);
    }
    return {
      fragment: n,
      selectors: {}
    };
  },
  _normalizeLabelMarkup: function(t) {
    if (t) {
      var e = t.fragment;
      if (!(t.fragment instanceof DocumentFragment) || !t.fragment.hasChildNodes()) throw new Error("dia.LinkView: invalid label markup.");
      var n, r = e.childNodes;
      return r.length > 1 || r[0].nodeName.toUpperCase() !== "G" ? n = B("g").append(e) : n = B(r[0]), n.addClass("label"), {
        node: n.node,
        selectors: t.selectors
      };
    }
  },
  renderLabels: function() {
    var t = this._V, e = t.labels, n = this._labelCache = {}, r = this._labelSelectors = {}, i = this.model, s = i.attributes.labels || [], o = s.length;
    if (o === 0)
      return e && e.remove(), this;
    e ? e.empty() : (e = t.labels = B("g").addClass("labels"), this.options.labelsLayer && (e.addClass(pe(wt(this, "className"))), e.attr("model-id", i.id)));
    for (var a = 0; a < o; a++) {
      var c = s[a], u = this._normalizeLabelMarkup(this._getLabelMarkup(c.markup)), h, l;
      if (u)
        h = u.node, l = u.selectors;
      else {
        var d = i._builtins.defaultLabel, g = this._normalizeLabelMarkup(this._getLabelMarkup(d.markup)), v = i._getDefaultLabel(), y = this._normalizeLabelMarkup(this._getLabelMarkup(v.markup)), w = y || g;
        h = w.node, l = w.selectors;
      }
      h.setAttribute("label-idx", a), e.append(h), n[a] = h;
      var x = this.selector;
      if (l[x]) throw new Error("dia.LinkView: ambiguous label root selector.");
      l[x] = h, r[a] = l;
    }
    return e.parent() || this.mountLabels(), this.updateLabels(), this;
  },
  mountLabels: function() {
    const { el: t, paper: e, model: n, _V: r, options: i } = this, { labels: s } = r;
    if (!s || !n.hasLabels()) return;
    const { node: o } = s;
    i.labelsLayer ? e.getLayerView(i.labelsLayer).insertSortedNode(o, n.get("z")) : o.parentNode !== t && t.appendChild(o);
  },
  unmountLabels: function() {
    const { options: t, _V: e } = this;
    if (!e) return;
    const { labels: n } = e;
    n && t.labelsLayer && n.remove();
  },
  findLabelNodes: function(t, e) {
    const n = this._labelCache[t];
    if (!n) return [];
    const r = this._labelSelectors[t];
    return this.findBySelector(e, n, r);
  },
  findLabelNode: function(t, e) {
    const [n = null] = this.findLabelNodes(t, e);
    return n;
  },
  _mergeLabelAttrs: function(t, e, n, r) {
    return e === null ? null : e === void 0 ? n === null ? null : n === void 0 ? t ? void 0 : r : t ? n : kt({}, r, n) : t ? kt({}, n, e) : kt({}, r, n, e);
  },
  _mergeLabelSize: function(t, e) {
    return t === null ? null : t === void 0 ? e === null ? null : e === void 0 ? void 0 : e : kt({}, e, t);
  },
  updateLabels: function() {
    if (!this._V.labels) return this;
    this.paper.options.labelLayer || this.cleanNodeCache(this.el);
    for (var t = this.model, e = t.get("labels") || [], n = this.can("labelMove"), r = t._builtins.defaultLabel, i = r.attrs, s = t._getDefaultLabel(), o = s.markup, a = s.attrs, c = s.size, u = 0, h = e.length; u < h; u++) {
      var l = this._labelCache[u];
      l.setAttribute("cursor", n ? "move" : "default");
      var d = this._labelSelectors[u], g = e[u], v = g.markup, y = g.attrs, w = g.size, x = this._mergeLabelAttrs(v || o, y, a, i), P = this._mergeLabelSize(w, c);
      this.updateDOMSubtreeAttributes(l, x, {
        rootBBox: new j(P),
        selectors: d
      });
    }
    return this;
  },
  removeRedundantLinearVertices: function(t) {
    const n = this.model, r = n.vertices(), i = [
      this.sourceAnchor,
      ...r,
      this.targetAnchor
    ], s = i.length, o = new St(i);
    o.simplify({ threshold: 1e-3 });
    const a = o.points.map((u) => u.toJSON()), c = a.length;
    return s === c ? 0 : (n.vertices(a.slice(1, c - 1), t), s - c);
  },
  getEndView: function(t) {
    switch (t) {
      case "source":
        return this.sourceView || null;
      case "target":
        return this.targetView || null;
      default:
        throw new Error("dia.LinkView: type parameter required.");
    }
  },
  getEndAnchor: function(t) {
    switch (t) {
      case "source":
        return new E(this.sourceAnchor);
      case "target":
        return new E(this.targetAnchor);
      default:
        throw new Error("dia.LinkView: type parameter required.");
    }
  },
  getEndConnectionPoint: function(t) {
    switch (t) {
      case "source":
        return new E(this.sourcePoint);
      case "target":
        return new E(this.targetPoint);
      default:
        throw new Error("dia.LinkView: type parameter required.");
    }
  },
  getEndMagnet: function(t) {
    switch (t) {
      case "source":
        var e = this.sourceView;
        if (!e) break;
        return this.sourceMagnet || e.el;
      case "target":
        var n = this.targetView;
        if (!n) break;
        return this.targetMagnet || n.el;
      default:
        throw new Error("dia.LinkView: type parameter required.");
    }
    return null;
  },
  update: function() {
    return this.updateRoute(), this.updatePath(), this.updateDOM(), this;
  },
  translate: function(t = 0, e = 0) {
    const { route: n, path: r } = this;
    if (!n || !r) return;
    const i = new St(n);
    i.translate(t, e), this.route = i.points, this.sourcePoint.offset(t, e), this.targetPoint.offset(t, e), this.sourceAnchor.offset(t, e), this.targetAnchor.offset(t, e), r.translate(t, e), this.updateDOM();
  },
  updateDOM() {
    const { el: t, model: e, selectors: n } = this;
    this.cleanNodesCache(), this.updateDOMSubtreeAttributes(t, e.attr(), { selectors: n }), this.updateLabelPositions(), this.options.perpendicular = null;
  },
  updateRoute: function() {
    const { model: t } = this, e = t.vertices(), n = this.findAnchors(e), r = this.sourceAnchor = n.source, i = this.targetAnchor = n.target, s = this.findRoute(e);
    this.route = s;
    var o = this.findConnectionPoints(s, r, i);
    this.sourcePoint = o.source, this.targetPoint = o.target;
  },
  updatePath: function() {
    const { route: t, sourcePoint: e, targetPoint: n } = this, r = this.findPath(t, e.clone(), n.clone());
    this.path = r;
  },
  findAnchorsOrdered: function(t, e, n, r) {
    var i, s, o, a, c = this.model, u = c.get(t), h = c.get(n), l = this.getEndView(t), d = this.getEndView(n), g = this.getEndMagnet(t), v = this.getEndMagnet(n);
    l ? (e ? o = new E(e) : d ? o = v : o = new E(h), i = this.getAnchor(u.anchor, l, g, o, t)) : i = new E(u), d ? (a = new E(r || i), s = this.getAnchor(h.anchor, d, v, a, n)) : s = new E(h);
    var y = {};
    return y[t] = i, y[n] = s, y;
  },
  findAnchors: function(t) {
    var e = this.model, n = t[0], r = t[t.length - 1];
    return e.target().priority && !e.source().priority ? this.findAnchorsOrdered("target", r, "source", n) : this.findAnchorsOrdered("source", n, "target", r);
  },
  findConnectionPoints: function(t, e, n) {
    var r = t[0], i = t[t.length - 1], s = this.model, o = s.get("source"), a = s.get("target"), c = this.sourceView, u = this.targetView, h = this.paper.options, l, d, g;
    if (c && !c.isNodeConnection(this.sourceMagnet)) {
      l = this.sourceMagnet || c.el;
      var v = o.connectionPoint || h.defaultConnectionPoint, y = r || n, w = new H(y, e);
      g = this.getConnectionPoint(v, c, l, w, "source");
    } else g = e;
    var x;
    if (u && !u.isNodeConnection(this.targetMagnet)) {
      d = this.targetMagnet || u.el;
      var P = a.connectionPoint || h.defaultConnectionPoint, T = i || e, L = new H(T, n);
      x = this.getConnectionPoint(P, u, d, L, "target");
    } else x = n;
    return {
      source: g,
      target: x
    };
  },
  getAnchor: function(t, e, n, r, i) {
    var s = e.isNodeConnection(n), o = this.paper.options;
    if (t || (s ? t = o.defaultLinkAnchor : this.options.perpendicular ? t = { name: "perpendicular" } : t = o.defaultAnchor), !t) throw new Error("Anchor required.");
    var a;
    if (typeof t == "function") a = t;
    else {
      var c = t.name, u = s ? "linkAnchorNamespace" : "anchorNamespace";
      if (a = o[u][c], typeof a != "function") throw new Error("Unknown anchor: " + c);
    }
    var h = a.call(this, e, n, r, t.args || {}, i, this);
    return h ? h.round(this.decimalsRounding) : new E();
  },
  getConnectionPoint: function(t, e, n, r, i) {
    var s, o = r.end, a = this.paper.options;
    if (!t) return o;
    var c;
    if (typeof t == "function") c = t;
    else {
      var u = t.name;
      if (c = a.connectionPointNamespace[u], typeof c != "function") throw new Error("Unknown connection point: " + u);
    }
    return s = c.call(this, r, e, n, t.args || {}, i, this), s ? s.round(this.decimalsRounding) : o;
  },
  isIntersecting: function(t, e) {
    const n = this.getConnection();
    return n ? Me.exists(t, n, e, { segmentSubdivisions: this.getConnectionSubdivisions() }) : !1;
  },
  isEnclosedIn: function(t) {
    const e = this.getConnection();
    if (!e) return !1;
    const n = e.bbox();
    return n ? t.containsRect(n) : !1;
  },
  isAtPoint: function(t) {
    const e = new j(t);
    return e.inflate(this.EPSILON), this.isIntersecting(e);
  },
  _getDefaultLabelPositionProperty: function() {
    var t = this.model, e = t._builtins.defaultLabel, n = e.position, r = t._getDefaultLabel(), i = this._normalizeLabelPosition(r.position);
    return kt({}, n, i);
  },
  _normalizeLabelPosition: function(t) {
    return typeof t == "number" ? {
      distance: t,
      offset: null,
      angle: 0,
      args: null
    } : t;
  },
  _mergeLabelPositionProperty: function(t, e) {
    return t === null ? null : t === void 0 ? e === null ? null : e : kt({}, e, t);
  },
  updateLabelPositions: function() {
    if (!this._V.labels) return this;
    var t = this.path;
    if (!t) return this;
    var e = this.model, n = e.get("labels") || [];
    if (!n.length) return this;
    for (var r = this._getDefaultLabelPositionProperty(), i = 0, s = n.length; i < s; i++) {
      var o = this._labelCache[i];
      if (o) {
        var a = n[i], c = this._normalizeLabelPosition(a.position), u = this._mergeLabelPositionProperty(c, r), h = this._getLabelTransformationMatrix(u);
        o.setAttribute("transform", B.matrixToTransformString(h)), this._cleanLabelMatrices(i);
      }
    }
    return this;
  },
  _cleanLabelMatrices: function(t) {
    const { metrics: e, _labelSelectors: n } = this, r = n[t];
    if (r)
      for (let i in r) {
        const { id: s } = r[i];
        s && s in e && delete e[s].magnetMatrix;
      }
  },
  updateEndProperties: function(t) {
    const { model: e, paper: n } = this, r = `${t}View`, i = e.get(t), s = i && i.id;
    if (!s)
      return this[r] = null, this.updateEndMagnet(t), !0;
    const o = n.getModelById(s);
    if (!o) throw new Error("LinkView: invalid " + t + " cell.");
    const a = o.findView(n);
    return a ? (this[r] = a, this.updateEndMagnet(t), !0) : !1;
  },
  updateEndMagnet: function(t) {
    const e = `${t}Magnet`, n = this.getEndView(t);
    if (n) {
      let r = n.getMagnetFromLinkEnd(this.model.get(t));
      r === n.el && (r = null), this[e] = r;
    } else this[e] = null;
  },
  _getLabelPositionProperty: function(t) {
    return this.model.label(t).position || {};
  },
  _getLabelPositionAngle: function(t) {
    var e = this._getLabelPositionProperty(t);
    return e.angle || 0;
  },
  _getLabelPositionArgs: function(t) {
    var e = this._getLabelPositionProperty(t);
    return e.args;
  },
  _getDefaultLabelPositionArgs: function() {
    var t = this.model._getDefaultLabel(), e = t.position || {};
    return e.args;
  },
  _mergeLabelPositionArgs: function(t, e) {
    return t === null ? null : t === void 0 ? e === null ? null : e : kt({}, e, t);
  },
  addLabel: function(t, e, n, r) {
    var i, s, o = 0, a;
    typeof t != "number" ? (i = t.x, s = t.y, typeof e == "number" ? (o = e, a = n) : a = e) : (i = t, s = e, typeof n == "number" ? (o = n, a = r) : a = n);
    var c = this._getDefaultLabelPositionArgs(), u = a, h = this._mergeLabelPositionArgs(u, c), l = { position: this.getLabelPosition(i, s, o, h) }, d = -1;
    return this.model.insertLabel(d, l, a), d;
  },
  addVertex: function(t, e, n) {
    var r = typeof t != "number", i = r ? t.x : t, s = r ? t.y : e, o = r ? e : n, a = {
      x: i,
      y: s
    }, c = this.getVertexIndex(i, s);
    return this.model.insertVertex(c, a, o), c;
  },
  sendToken: function(t, e, n) {
    function r(l, d) {
      return function() {
        l.remove(), typeof d == "function" && d();
      };
    }
    var i, s, o;
    gt(e) ? (i = e.duration, s = e.direction === "reverse", o = e.connection) : (i = e, s = !1, o = null), i = i || 1e3;
    var a = {
      dur: i + "ms",
      repeatCount: 1,
      calcMode: "linear",
      fill: "freeze"
    };
    s && (a.keyPoints = "1;0", a.keyTimes = "0;1");
    var c = B(t), u;
    if (typeof o == "string") u = this.findNode(o);
    else {
      var h = this._V;
      u = h.connection ? h.connection.node : this.el.querySelector("path");
    }
    if (!(u instanceof SVGPathElement)) throw new Error("dia.LinkView: token animation requires a valid connection path.");
    c.appendTo(this.paper.cells).animateAlongPath(a, u), setTimeout(r(c, n), i);
  },
  findRoute: function(t) {
    t || (t = []);
    var e = this.paper.options.routerNamespace || rl, n = this.model.router(), r = this.paper.options.defaultRouter;
    if (!n) if (r) n = r;
    else return t.map(E);
    var i = bt(n) ? n : e[n.name];
    if (!bt(i)) throw new Error('dia.LinkView: unknown router: "' + n.name + '".');
    var s = n.args || {}, o = i.call(this, t, s, this);
    return o || t.map(E);
  },
  findPath: function(t, e, n) {
    var r = this.paper.options.connectorNamespace || jc, i = this.model.connector(), s = this.paper.options.defaultConnector;
    i || (i = s || {});
    var o = bt(i) ? i : r[i.name];
    if (!bt(o)) throw new Error('dia.LinkView: unknown connector: "' + i.name + '".');
    var a = Ot(i.args || {});
    a.raw = !0;
    var c = o.call(this, e, n, t, a, this);
    return typeof c == "string" && (c = new Z(B.normalizePathData(c))), c;
  },
  getConnection: function() {
    var t = this.path;
    return t ? t.clone() : null;
  },
  getSerializedConnection: function() {
    var t = this.path;
    if (!t) return null;
    var e = this.metrics;
    if (e.hasOwnProperty("data")) return e.data;
    var n = t.serialize();
    return e.data = n, n;
  },
  getConnectionSubdivisions: function() {
    var t = this.path;
    if (!t) return null;
    var e = this.metrics;
    if (e.hasOwnProperty("segmentSubdivisions")) return e.segmentSubdivisions;
    var n = t.getSegmentSubdivisions();
    return e.segmentSubdivisions = n, n;
  },
  getConnectionLength: function() {
    var t = this.path;
    if (!t) return 0;
    var e = this.metrics;
    if (e.hasOwnProperty("length")) return e.length;
    var n = t.length({ segmentSubdivisions: this.getConnectionSubdivisions() });
    return e.length = n, n;
  },
  getPointAtLength: function(t) {
    var e = this.path;
    return e ? e.pointAtLength(t, { segmentSubdivisions: this.getConnectionSubdivisions() }) : null;
  },
  getPointAtRatio: function(t) {
    var e = this.path;
    return e ? (Wt(t) && (t = parseFloat(t) / 100), e.pointAt(t, { segmentSubdivisions: this.getConnectionSubdivisions() })) : null;
  },
  getTangentAtLength: function(t) {
    var e = this.path;
    return e ? e.tangentAtLength(t, { segmentSubdivisions: this.getConnectionSubdivisions() }) : null;
  },
  getTangentAtRatio: function(t) {
    var e = this.path;
    return e ? e.tangentAt(t, { segmentSubdivisions: this.getConnectionSubdivisions() }) : null;
  },
  getClosestPoint: function(t) {
    var e = this.path;
    return e ? e.closestPoint(t, { segmentSubdivisions: this.getConnectionSubdivisions() }) : null;
  },
  getClosestPointLength: function(t) {
    var e = this.path;
    return e ? e.closestPointLength(t, { segmentSubdivisions: this.getConnectionSubdivisions() }) : null;
  },
  getClosestPointRatio: function(t) {
    var e = this.path;
    return e ? e.closestPointNormalizedLength(t, { segmentSubdivisions: this.getConnectionSubdivisions() }) : null;
  },
  getLabelPosition: function(t, e, n, r) {
    var i = {}, s = 0, o;
    typeof n == "number" ? (s = n, o = r) : o = n, o && (i.args = o);
    var a = !(o && o.absoluteDistance), c = o && o.absoluteDistance && o.reverseDistance, u = o && o.absoluteOffset, h = this.path, l = { segmentSubdivisions: this.getConnectionSubdivisions() }, d = new E(t, e), g = h.closestPointT(d, l), v = h.lengthAtT(g, l);
    a && (v = v / this.getConnectionLength() || 0), c && (v = -1 * (this.getConnectionLength() - v) || 1), i.distance = v;
    var y;
    u || (y = h.tangentAtT(g));
    var w;
    if (y) w = y.pointOffset(d);
    else {
      var x = h.pointAtT(g), P = d.difference(x);
      w = {
        x: P.x,
        y: P.y
      };
    }
    return i.offset = w, i.angle = s, i;
  },
  _getLabelTransformationMatrix: function(t) {
    var e, n = 0, r = {};
    if (typeof t == "number") e = t;
    else if (typeof t.distance == "number")
      r = t.args || {}, e = t.distance, n = t.angle || 0;
    else throw new Error("dia.LinkView: invalid label position distance.");
    var i = e > 0 && e <= 1, s = 0, o = {
      x: 0,
      y: 0
    };
    if (t.offset) {
      var a = t.offset;
      typeof a == "number" && (s = a), a.x && (o.x = a.x), a.y && (o.y = a.y);
    }
    var c = o.x !== 0 || o.y !== 0 || s === 0, u = r.keepGradient, h = r.ensureLegibility, l = this.path, d = { segmentSubdivisions: this.getConnectionSubdivisions() }, g = i ? e * this.getConnectionLength() : e, v = l.tangentAtLength(g, d), y, w = n;
    if (v) {
      if (c)
        y = v.start.clone(), y.offset(o);
      else {
        var x = v.clone();
        x.rotate(v.start, -90), x.setLength(s), y = x.end;
      }
      u && (w = v.angle() + n, h && (w = Qt((w + 90) % 180 - 90)));
    } else
      y = l.start.clone(), c && y.offset(o);
    return B.createSVGMatrix().translate(y.x, y.y).rotate(w);
  },
  getLabelCoordinates: function(t) {
    var e = this._getLabelTransformationMatrix(t);
    return new E(e.e, e.f);
  },
  getVertexIndex: function(t, e) {
    for (var n = this.model, r = n.vertices(), i = this.getClosestPointLength(new E(t, e)), s = 0, o = r.length; s < o; s++) {
      var a = r[s], c = this.getClosestPointLength(a);
      if (i < c) break;
    }
    return s;
  },
  notifyPointerdown(t, e, n) {
    ht.prototype.pointerdown.call(this, t, e, n), this.notify("link:pointerdown", t, e, n);
  },
  notifyPointermove(t, e, n) {
    ht.prototype.pointermove.call(this, t, e, n), this.notify("link:pointermove", t, e, n);
  },
  notifyPointerup(t, e, n) {
    this.notify("link:pointerup", t, e, n), ht.prototype.pointerup.call(this, t, e, n);
  },
  pointerdblclick: function(t, e, n) {
    ht.prototype.pointerdblclick.apply(this, arguments), this.notify("link:pointerdblclick", t, e, n);
  },
  pointerclick: function(t, e, n) {
    ht.prototype.pointerclick.apply(this, arguments), this.notify("link:pointerclick", t, e, n);
  },
  contextmenu: function(t, e, n) {
    ht.prototype.contextmenu.apply(this, arguments), this.notify("link:contextmenu", t, e, n);
  },
  pointerdown: function(t, e, n) {
    this.notifyPointerdown(t, e, n), this.dragStart(t, e, n);
  },
  pointermove: function(t, e, n) {
    var r = this._dragData;
    r && this.eventData(t, r);
    var i = this.eventData(t);
    switch (i.action) {
      case "label-move":
        this.dragLabel(t, e, n);
        break;
      case "arrowhead-move":
        this.dragArrowhead(t, e, n);
        break;
      case "move":
        this.drag(t, e, n);
        break;
    }
    r && $(r, this.eventData(t)), this.notifyPointermove(t, e, n);
  },
  pointerup: function(t, e, n) {
    var r = this._dragData;
    r && (this.eventData(t, r), this._dragData = null);
    var i = this.eventData(t);
    switch (i.action) {
      case "label-move":
        this.dragLabelEnd(t, e, n);
        break;
      case "arrowhead-move":
        this.dragArrowheadEnd(t, e, n);
        break;
      case "move":
        this.dragEnd(t, e, n);
    }
    this.notifyPointerup(t, e, n), this.checkMouseleave(t);
  },
  mouseover: function(t) {
    ht.prototype.mouseover.apply(this, arguments), this.notify("link:mouseover", t);
  },
  mouseout: function(t) {
    ht.prototype.mouseout.apply(this, arguments), this.notify("link:mouseout", t);
  },
  mouseenter: function(t) {
    ht.prototype.mouseenter.apply(this, arguments), this.notify("link:mouseenter", t);
  },
  mouseleave: function(t) {
    ht.prototype.mouseleave.apply(this, arguments), this.notify("link:mouseleave", t);
  },
  mousewheel: function(t, e, n, r) {
    ht.prototype.mousewheel.apply(this, arguments), this.notify("link:mousewheel", t, e, n, r);
  },
  onlabel: function(t, e, n) {
    this.notifyPointerdown(t, e, n), this.dragLabelStart(t, e, n);
    var r = this.eventData(t).stopPropagation;
    r && t.stopPropagation();
  },
  dragLabelStart: function(t, e, n) {
    if (this.can("labelMove")) {
      if (this.isDefaultInteractionPrevented(t)) return;
      var r = t.currentTarget, i = parseInt(r.getAttribute("label-idx"), 10), s = this._getDefaultLabelPositionProperty(), o = this._normalizeLabelPosition(this._getLabelPositionProperty(i)), a = this._mergeLabelPositionProperty(o, s), c = this.getLabelCoordinates(a), u = c.x - e, h = c.y - n, l = this._getLabelPositionAngle(i), d = this._getLabelPositionArgs(i), g = this._getDefaultLabelPositionArgs(), v = this._mergeLabelPositionArgs(d, g);
      this.eventData(t, {
        action: "label-move",
        labelIdx: i,
        dx: u,
        dy: h,
        positionAngle: l,
        positionArgs: v,
        stopPropagation: !0
      });
    } else this.eventData(t, { stopPropagation: !0 });
    this.paper.delegateDragEvents(this, t.data);
  },
  dragArrowheadStart: function(t, e, n) {
    if (this.can("arrowheadMove")) {
      var r = t.target, i = r.getAttribute("end"), s = this.startArrowheadMove(i, { ignoreBackwardsCompatibility: !0 });
      this.eventData(t, s);
    }
  },
  dragStart: function(t, e, n) {
    this.isDefaultInteractionPrevented(t) || this.can("linkMove") && this.eventData(t, {
      action: "move",
      dx: e,
      dy: n
    });
  },
  dragLabel: function(t, e, n) {
    var r = this.eventData(t), i = { position: this.getLabelPosition(e + r.dx, n + r.dy, r.positionAngle, r.positionArgs) };
    this.paper.options.snapLabels && delete i.position.offset;
    const s = { ui: !0 };
    this.paper.isAsync() && t.type === "touchmove" && (s.async = !1), this.model.label(r.labelIdx, i, s);
  },
  dragArrowhead: function(t, e, n) {
    this.paper.options.snapLinks ? !this._snapArrowhead(t, e, n) && this.paper.options.snapLinksSelf && this._snapArrowheadSelf(t, e, n) : this.paper.options.snapLinksSelf ? this._snapArrowheadSelf(t, e, n) : this._connectArrowhead(this.getEventTarget(t), e, n, this.eventData(t));
  },
  drag: function(t, e, n) {
    var r = this.eventData(t);
    this.model.translate(e - r.dx, n - r.dy, { ui: !0 }), this.eventData(t, {
      dx: e,
      dy: n
    });
  },
  dragLabelEnd: function() {
  },
  dragArrowheadEnd: function(t, e, n) {
    var r = this.eventData(t), i = this.paper;
    i.options.snapLinks ? this._snapArrowheadEnd(r) : this._connectArrowheadEnd(r, e, n), i.linkAllowed(this) ? (this._finishEmbedding(r), this._notifyConnectEvent(r, t)) : this._disallow(r), this._afterArrowheadMove(r);
  },
  dragEnd: function() {
  },
  _disallow: function(t) {
    switch (t.whenNotAllowed) {
      case "remove":
        this.model.remove({ ui: !0 });
        break;
      case "revert":
      default:
        this.model.set(t.arrowhead, t.initialEnd, { ui: !0 });
        break;
    }
  },
  _finishEmbedding: function(t) {
    this.paper.options.embeddingMode && this.model.reparent() && (t.z = null);
  },
  _notifyConnectEvent: function(t, e) {
    var n = t.arrowhead, r = t.initialEnd, i = this.model.prop(n), s = i && !gn.endsEqual(r, i);
    if (s) {
      var o = this.paper;
      r.id && this.notify("link:disconnect", e, o.findViewByModel(r.id), t.initialMagnet, n), i.id && this.notify("link:connect", e, o.findViewByModel(i.id), t.magnetUnderPointer, n);
    }
  },
  _snapToPoints: function(t, e, n) {
    let r = null, i = 1 / 0, s = null, o = 1 / 0, a = t.x, c = t.y;
    for (let u = 0; u < e.length; u++) {
      const h = Math.abs(e[u].x - t.x);
      h < i && (i = h, r = e[u]);
      const l = Math.abs(e[u].y - t.y);
      l < o && (o = l, s = e[u]);
    }
    return i < n && (a = r.x), o < n && (c = s.y), {
      x: a,
      y: c
    };
  },
  _snapArrowheadSelf: function(t, e, n) {
    const { paper: r, model: i } = this, { snapLinksSelf: s } = r.options, o = this.eventData(t), a = s.radius || 20, c = this.getEndAnchor(o.arrowhead === "source" ? "target" : "source"), u = i.vertices(), h = [c, ...u], l = this._snapToPoints({
      x: e,
      y: n
    }, h, a), d = r.localToClientPoint(l);
    this._connectArrowhead(document.elementFromPoint(d.x, d.y), l.x, l.y, this.eventData(t));
  },
  _snapArrowhead: function(t, e, n) {
    const { paper: r } = this, { snapLinks: i, connectionStrategy: s } = r.options, o = this.eventData(t);
    let a = !1;
    var c = i.radius || 50, u = r.findElementViewsInArea({
      x: e - c,
      y: n - c,
      width: 2 * c,
      height: 2 * c
    }, i.findInAreaOptions), h = o.closestView || null, l = o.closestMagnet || null, d = o.magnetProxy || null;
    o.closestView = o.closestMagnet = o.magnetProxy = null;
    var g = Number.MAX_VALUE, v = new E(e, n);
    u.forEach(function(I) {
      const R = [];
      I.el.getAttribute("magnet") !== "false" && R.push({
        bbox: I.model.getBBox(),
        magnet: I.el
      }), I.$("[magnet]").toArray().forEach((f) => {
        R.push({
          bbox: I.getNodeBBox(f),
          magnet: f
        });
      }), R.forEach((f) => {
        const { magnet: p, bbox: m } = f, b = m.center().squaredDistance(v);
        b < g && (l === p || r.options.validateConnection.apply(r, o.validateConnectionArgs(I, I.el === p ? null : p))) && (g = b, o.closestView = I, o.closestMagnet = p);
      });
    }, this);
    var y, w = null, x = o.closestView, P = o.closestMagnet;
    P && (w = o.magnetProxy = x.findProxyNode(P, "highlighter"));
    var T = o.arrowhead, L = l !== P;
    if (h && L && h.unhighlight(d, {
      connecting: !0,
      snapping: !0
    }), x) {
      const { prevEnd: I, prevX: R, prevY: f } = o;
      if (o.prevX = e, o.prevY = n, a = !0, !L && (typeof s != "function" || R === e && f === n) || (y = x.getLinkEnd(P, e, n, this.model, T), !L && Pe(I, y))) return a;
      o.prevEnd = y, L && x.highlight(w, {
        connecting: !0,
        snapping: !0
      });
    } else y = {
      x: e,
      y: n
    };
    return this.model.set(T, y || {
      x: e,
      y: n
    }, { ui: !0 }), h && this.notify("link:snap:disconnect", t, h, l, T), x && this.notify("link:snap:connect", t, x, P, T), a;
  },
  _snapArrowheadEnd: function(t) {
    var e = t.closestView, n = t.closestMagnet;
    e && n && (e.unhighlight(t.magnetProxy, {
      connecting: !0,
      snapping: !0
    }), t.magnetUnderPointer = e.findMagnet(n)), t.closestView = t.closestMagnet = null;
  },
  _connectArrowhead: function(t, e, n, r) {
    const { paper: i, model: s } = this;
    if (r.eventTarget !== t) {
      r.magnetProxy && r.viewUnderPointer.unhighlight(r.magnetProxy, { connecting: !0 });
      const o = r.viewUnderPointer = i.findView(t);
      if (o) {
        const a = r.magnetUnderPointer = o.findMagnet(t), c = r.magnetProxy = o.findProxyNode(a, "highlighter");
        a && this.paper.options.validateConnection.apply(i, r.validateConnectionArgs(o, a)) ? c && o.highlight(c, { connecting: !0 }) : (r.magnetUnderPointer = null, r.magnetProxy = null);
      } else
        r.magnetUnderPointer = null, r.magnetProxy = null;
    }
    r.eventTarget = t, s.set(r.arrowhead, {
      x: e,
      y: n
    }, { ui: !0 });
  },
  _connectArrowheadEnd: function(t = {}, e, n) {
    const { model: r } = this, { viewUnderPointer: i, magnetUnderPointer: s, magnetProxy: o, arrowhead: a } = t;
    if (!s || !o || !i) return;
    i.unhighlight(o, { connecting: !0 });
    const c = i.getLinkEnd(s, e, n, r, a);
    r.set(a, c, { ui: !0 });
  },
  _beforeArrowheadMove: function(t) {
    t.z = this.model.get("z"), this.model.toFront();
    var e = this.el.style;
    t.pointerEvents = e.pointerEvents, e.pointerEvents = "none", this.paper.options.markAvailable && this._markAvailableMagnets(t);
  },
  _afterArrowheadMove: function(t) {
    t.z !== null && (this.model.set("z", t.z, { ui: !0 }), t.z = null), this.el.style.pointerEvents = t.pointerEvents, this.paper.options.markAvailable && this._unmarkAvailableMagnets(t);
  },
  _createValidateConnectionArgs: function(t) {
    var e = [];
    e[4] = t, e[5] = this;
    var n, r = 0, i = 0;
    t === "source" ? (r = 2, n = "target") : (i = 2, n = "source");
    var s = this.model.get(n);
    if (s.id) {
      var o = e[r] = this.paper.findViewByModel(s.id), a = o.getMagnetFromLinkEnd(s);
      a === o.el && (a = void 0), e[r + 1] = a;
    }
    function c(u, h) {
      return e[i] = u, e[i + 1] = u.el === h ? void 0 : h, e;
    }
    return c;
  },
  _markAvailableMagnets: function(t) {
    function e(l, d) {
      var g = l.paper, v = g.options.validateConnection;
      return v.apply(g, this.validateConnectionArgs(l, d));
    }
    var n = this.paper, r = n.model.getCells();
    t.marked = {};
    for (var i = 0, s = r.length; i < s; i++) {
      var o = r[i].findView(n);
      if (o) {
        var a = Array.prototype.slice.call(o.el.querySelectorAll("[magnet]"));
        o.el.getAttribute("magnet") !== "false" && a.push(o.el);
        var c = a.filter(e.bind(t, o));
        if (c.length > 0) {
          for (var u = 0, h = c.length; u < h; u++) o.highlight(c[u], { magnetAvailability: !0 });
          o.highlight(null, { elementAvailability: !0 }), t.marked[o.model.id] = c;
        }
      }
    }
  },
  _unmarkAvailableMagnets: function(t) {
    for (var e = Object.keys(t.marked), n, r, i = 0, s = e.length; i < s; i++) {
      n = e[i], r = t.marked[n];
      var o = this.paper.findViewByModel(n);
      if (o) {
        for (var a = 0, c = r.length; a < c; a++) o.unhighlight(r[a], { magnetAvailability: !0 });
        o.unhighlight(null, { elementAvailability: !0 });
      }
    }
    t.marked = null;
  },
  startArrowheadMove: function(t, e) {
    e || (e = {});
    var n = {
      action: "arrowhead-move",
      arrowhead: t,
      whenNotAllowed: e.whenNotAllowed || "revert",
      initialMagnet: this[t + "Magnet"] || (this[t + "View"] ? this[t + "View"].el : null),
      initialEnd: Ot(this.model.get(t)),
      validateConnectionArgs: this._createValidateConnectionArgs(t)
    };
    return this._beforeArrowheadMove(n), e.ignoreBackwardsCompatibility !== !0 && (this._dragData = n), n;
  },
  onMount: function() {
    ht.prototype.onMount.apply(this, arguments), this.mountLabels();
  },
  onDetach: function() {
    ht.prototype.onDetach.apply(this, arguments), this.unmountLabels();
  },
  onRemove: function() {
    ht.prototype.onRemove.apply(this, arguments), this.unmountLabels();
  }
}, { Flags: ft });
Object.defineProperty(Nn.prototype, "sourceBBox", {
  enumerable: !0,
  get: function() {
    var t = this.sourceView;
    if (!t) {
      var e = this.model.source();
      return new j(e.x, e.y);
    }
    var n = this.sourceMagnet;
    return t.isNodeConnection(n) ? new j(this.sourceAnchor) : t.getNodeBBox(n || t.el);
  }
});
Object.defineProperty(Nn.prototype, "targetBBox", {
  enumerable: !0,
  get: function() {
    var t = this.targetView;
    if (!t) {
      var e = this.model.target();
      return new j(e.x, e.y);
    }
    var n = this.targetMagnet;
    return t.isNodeConnection(n) ? new j(this.targetAnchor) : t.getNodeBBox(n || t.el);
  }
});
const Zp = _i.extend({
  style: { "pointer-events": "none" },
  _gridCache: null,
  _gridSettings: null,
  init() {
    _i.prototype.init.apply(this, arguments);
    const { options: { paper: t } } = this;
    this._gridCache = null, this._gridSettings = [], this.listenTo(t, "transform resize", this.updateGrid);
  },
  setGrid(t) {
    this._gridSettings = this.getGridSettings(t), this.renderGrid();
  },
  getGridSettings(t) {
    const e = [];
    return t && (Array.isArray(t) ? t : [t || {}]).forEach((r) => {
      e.push(...this._resolveDrawGridOption(r));
    }), e;
  },
  removeGrid() {
    const { _gridCache: t } = this;
    t && (t.root.remove(), this._gridCache = null);
  },
  renderGrid() {
    const { options: { paper: t } } = this, { _gridSettings: e } = this;
    if (this.removeGrid(), e.length === 0) return;
    const n = t.options.drawGridSize || t.options.gridSize;
    if (n <= 1) return;
    const r = this._getGridRefs();
    e.forEach((i, s) => {
      const o = this._getPatternId(s), a = kt({}, i), { scaleFactor: c = 1 } = a;
      a.width = n * c || 1, a.height = n * c || 1;
      let u;
      r.exist(o) ? u = r.get(o) : (u = B("pattern", {
        id: o,
        patternUnits: "userSpaceOnUse"
      }, B(a.markup)), r.add(o, u)), bt(a.render) && a.render(u.node.firstChild, a, t), u.attr({
        width: a.width,
        height: a.height
      });
    }), r.root.appendTo(this.el), this.updateGrid();
  },
  updateGrid() {
    const { _gridCache: t, _gridSettings: e, options: { paper: n } } = this;
    if (!t) return;
    const { root: r, patterns: i } = t, { x: s, y: o, width: a, height: c } = n.getArea();
    r.attr({
      x: s,
      y: o,
      width: a,
      height: c
    });
    for (const u in i)
      i[u].attr({
        x: -s,
        y: -o
      });
    e.forEach((u, h) => {
      if (bt(u.update)) {
        const l = i[this._getPatternId(h)];
        u.update(l.node.firstChild, u, n);
      }
    });
  },
  _getPatternId(t) {
    return `pattern_${this.options.paper.cid}_${t}`;
  },
  _getGridRefs() {
    let { _gridCache: t } = this;
    if (t) return t;
    const e = B("defs"), n = B("svg", {
      width: "100%",
      height: "100%"
    }, [e]);
    return t = this._gridCache = {
      root: n,
      patterns: {},
      add: function(r, i) {
        const s = B("rect", {
          width: "100%",
          height: "100%",
          fill: `url(#${r})`
        });
        e.append(i), n.append(s), this.patterns[r] = i;
      },
      get: function(r) {
        return this.patterns[r];
      },
      exist: function(r) {
        return this.patterns[r] !== void 0;
      }
    }, t;
  },
  _resolveDrawGridOption(t) {
    var e = this.options.patterns;
    if (Ct(t) && Array.isArray(e[t])) return e[t].map(function(c) {
      return $({}, c);
    });
    var n = t || { args: [{}] }, r = Array.isArray(n), i = n.name;
    if (!r && !i && !n.markup && (i = "dot"), i && Array.isArray(e[i])) {
      var s = e[i].map(function(c) {
        return $({}, c);
      }), o = Array.isArray(n.args) ? n.args : [n.args || {}];
      qt(o[0], $n(t, "args"));
      for (var a = 0; a < o.length; a++) s[a] && $(s[a], o[a]);
      return s;
    }
    return r ? n : [n];
  }
}), Ke = {
  NONE: "sorting-none",
  APPROX: "sorting-approximate",
  EXACT: "sorting-exact"
}, Qp = 50, Vo = 20, Go = 1e3, tv = 1 / 0, lr = 9007199254740991, hi = ht.Highlighting, zo = {
  [hi.DEFAULT]: {
    name: "stroke",
    options: { padding: 3 }
  },
  [hi.MAGNET_AVAILABILITY]: {
    name: "addClass",
    options: { className: "available-magnet" }
  },
  [hi.ELEMENT_AVAILABILITY]: {
    name: "addClass",
    options: { className: "available-cell" }
  }
}, ev = [
  { name: Dt.GRID },
  { name: Dt.BACK },
  { name: Dt.CELLS },
  { name: Dt.LABELS },
  { name: Dt.FRONT },
  { name: Dt.TOOLS }
], ur = an.extend({
  className: "paper",
  options: {
    width: 800,
    height: 600,
    gridSize: 1,
    drawGrid: !1,
    drawGridSize: null,
    background: !1,
    elementView: _n,
    linkView: Nn,
    snapLabels: !1,
    snapLinks: !1,
    snapLinksSelf: !1,
    labelsLayer: !1,
    multiLinks: !0,
    guard: function(t, e) {
      return !1;
    },
    highlighting: zo,
    preventContextMenu: !0,
    preventDefaultBlankAction: !0,
    preventDefaultViewAction: !0,
    restrictTranslate: !1,
    markAvailable: !1,
    defaultLink: function() {
      const { cellNamespace: t } = this.model.get("cells"), e = hn(t, ["standard", "Link"]);
      if (!e) throw new Error("dia.Paper: no default link model found. Use `options.defaultLink` to specify a default link model.");
      return new e();
    },
    defaultConnector: { name: "normal" },
    defaultRouter: { name: "normal" },
    defaultAnchor: { name: "center" },
    defaultLinkAnchor: { name: "connectionRatio" },
    defaultConnectionPoint: { name: "boundary" },
    connectionStrategy: null,
    validateMagnet: function(t, e, n) {
      return e.getAttribute("magnet") !== "passive";
    },
    validateConnection: function(t, e, n, r, i, s) {
      return (i === "target" ? n : t) instanceof _n;
    },
    embeddingMode: !1,
    validateEmbedding: function(t, e) {
      return !0;
    },
    validateUnembedding: function(t) {
      return !0;
    },
    findParentBy: "bbox",
    frontParentOnly: !0,
    interactive: { labelMove: !1 },
    linkPinning: !0,
    allowLink: null,
    clickThreshold: 0,
    moveThreshold: 0,
    magnetThreshold: 0,
    sorting: Ke.APPROX,
    frozen: !1,
    autoFreeze: !1,
    onViewUpdate: function(t, e, n, r, i) {
      e & (t.FLAG_INSERT | t.FLAG_REMOVE) || r.mounting || r.isolate || i.requestConnectedLinksUpdate(t, n, r);
    },
    onViewPostponed: function(t, e, n) {
      return n.forcePostponedViewUpdate(t, e);
    },
    beforeRender: null,
    afterRender: null,
    viewport: null,
    cellViewNamespace: null,
    routerNamespace: null,
    connectorNamespace: null,
    highlighterNamespace: $c,
    anchorNamespace: al,
    linkAnchorNamespace: il,
    connectionPointNamespace: qc,
    overflow: !1
  },
  events: {
    dblclick: "pointerdblclick",
    dbltap: "pointerdblclick",
    contextmenu: "contextmenu",
    mousedown: "pointerdown",
    touchstart: "pointerdown",
    mouseover: "mouseover",
    mouseout: "mouseout",
    mouseenter: "mouseenter",
    mouseleave: "mouseleave",
    wheel: "mousewheel",
    "mouseenter .joint-cell": "mouseenter",
    "mouseleave .joint-cell": "mouseleave",
    "mouseenter .joint-tools": "mouseenter",
    "mouseleave .joint-tools": "mouseleave",
    "dblclick .joint-cell [magnet]": "magnetpointerdblclick",
    "contextmenu .joint-cell [magnet]": "magnetcontextmenu",
    "mousedown .joint-link .label": "onlabel",
    "touchstart .joint-link .label": "onlabel",
    "dragstart .joint-cell image": "onImageDragStart"
  },
  documentEvents: {
    mousemove: "pointermove",
    touchmove: "pointermove",
    mouseup: "pointerup",
    touchend: "pointerup",
    touchcancel: "pointerup"
  },
  stylesheet: `
        .joint-element .scalable * {
            vector-effect: non-scaling-stroke;
        }
    `,
  svg: null,
  viewport: null,
  defs: null,
  tools: null,
  layers: null,
  _viewportMatrix: null,
  _viewportTransformString: null,
  _updates: null,
  _layers: null,
  SORT_DELAYING_BATCHES: [
    "add",
    "to-front",
    "to-back"
  ],
  UPDATE_DELAYING_BATCHES: ["translate"],
  FORM_CONTROL_TAG_NAMES: [
    "TEXTAREA",
    "INPUT",
    "BUTTON",
    "SELECT",
    "OPTION"
  ],
  GUARDED_TAG_NAMES: ["SELECT"],
  MIN_SCALE: 1e-6,
  DEFAULT_FIND_BUFFER: 200,
  init: function() {
    const { options: t } = this;
    t.cellViewNamespace || (t.cellViewNamespace = typeof joint < "u" && ue(joint, "shapes") ? joint.shapes : null);
    const e = this.model = t.model || new ys();
    this._layers = {}, this.cloneOptions(), this.render(), this._setDimensions(), this.startListening(), this._views = {}, this._mw_evt_buffer = {
      event: null,
      deltas: []
    }, this.resetViews(e.attributes.cells.models), !this.isFrozen() && this.isAsync() && this.updateViewsAsync();
  },
  _resetUpdates: function() {
    return this._updates && this._updates.id && pr(this._updates.id), this._updates = {
      id: null,
      priorities: [
        {},
        {},
        {}
      ],
      unmountedCids: [],
      mountedCids: [],
      unmounted: {},
      mounted: {},
      count: 0,
      keyFrozen: !1,
      freezeKey: null,
      sort: !1,
      disabled: !1,
      idle: !1
    };
  },
  startListening: function() {
    var t = this.model;
    this.listenTo(t, "add", this.onCellAdded).listenTo(t, "remove", this.onCellRemoved).listenTo(t, "change", this.onCellChange).listenTo(t, "reset", this.onGraphReset).listenTo(t, "sort", this.onGraphSort).listenTo(t, "batch:stop", this.onGraphBatchStop), this.on("cell:highlight", this.onCellHighlight).on("cell:unhighlight", this.onCellUnhighlight).on("transform", this.update);
  },
  onCellAdded: function(t, e, n) {
    var r = n.position;
    this.isAsync() || !Ft(r) ? this.renderView(t, n) : (n.maxPosition === r && this.freeze({ key: "addCells" }), this.renderView(t, n), r === 0 && this.unfreeze({ key: "addCells" }));
  },
  onCellRemoved: function(t, e, n) {
    const r = this.findViewByModel(t);
    r && this.requestViewUpdate(r, r.FLAG_REMOVE, r.UPDATE_PRIORITY, n);
  },
  onCellChange: function(t, e) {
    if (t !== this.model.attributes.cells && t.hasChanged("z") && this.options.sorting === Ke.APPROX) {
      const n = this.findViewByModel(t);
      n && this.requestViewUpdate(n, n.FLAG_INSERT, n.UPDATE_PRIORITY, e);
    }
  },
  onGraphReset: function(t, e) {
    this.resetLayers(), this.resetViews(t.models, e);
  },
  onGraphSort: function() {
    this.model.hasActiveBatch(this.SORT_DELAYING_BATCHES) || this.sortViews();
  },
  onGraphBatchStop: function(t) {
    if (!this.isFrozen()) {
      var e = t && t.batchName, n = this.model;
      if (!this.isAsync()) {
        var r = this.UPDATE_DELAYING_BATCHES;
        r.includes(e) && !n.hasActiveBatch(r) && this.updateViews(t);
      }
      var i = this.SORT_DELAYING_BATCHES;
      i.includes(e) && !n.hasActiveBatch(i) && this.sortViews();
    }
  },
  cloneOptions: function() {
    const { options: t } = this, { defaultConnector: e, defaultRouter: n, defaultConnectionPoint: r, defaultAnchor: i, defaultLinkAnchor: s, highlighting: o, cellViewNamespace: a, interactive: c } = t;
    !a && typeof joint < "u" && ue(joint, "shapes") && (t.cellViewNamespace = joint.shapes), bt(e) || (t.defaultConnector = $t(e)), bt(n) || (t.defaultRouter = $t(n)), bt(r) || (t.defaultConnectionPoint = $t(r)), bt(i) || (t.defaultAnchor = $t(i)), bt(s) || (t.defaultLinkAnchor = $t(s)), Tt(c) && (t.interactive = $({}, c)), Tt(o) && (t.highlighting = Ur({}, o, zo));
  },
  children: function() {
    var t = B.namespace;
    return [{
      namespaceURI: t.xhtml,
      tagName: "div",
      className: pe("paper-background"),
      selector: "background",
      style: {
        position: "absolute",
        inset: 0
      }
    }, {
      namespaceURI: t.svg,
      tagName: "svg",
      attributes: {
        width: "100%",
        height: "100%",
        "xmlns:xlink": t.xlink
      },
      selector: "svg",
      style: {
        position: "absolute",
        inset: 0
      },
      children: [{
        tagName: "defs",
        selector: "defs"
      }, {
        tagName: "g",
        className: pe("layers"),
        selector: "layers"
      }]
    }];
  },
  hasLayerView(t) {
    return t in this._layers;
  },
  getLayerView(t) {
    const { _layers: e } = this;
    if (t in e) return e[t];
    throw new Error(`dia.Paper: Unknown layer "${t}"`);
  },
  getLayerNode(t) {
    return this.getLayerView(t).el;
  },
  render: function() {
    this.renderChildren();
    const { el: t, childNodes: e, options: n, stylesheet: r } = this, { svg: i, defs: s, layers: o } = e;
    return t.style.position = "relative", i.style.overflow = n.overflow ? "visible" : "hidden", this.svg = i, this.defs = s, this.layers = o, this.renderLayers(), B.ensureId(i), this.addStylesheet(r), n.background && this.drawBackground(n.background), n.drawGrid && this.setGrid(n.drawGrid), this;
  },
  addStylesheet: function(t) {
    t && B(this.svg).prepend(B.createSVGStyle(t));
  },
  createLayer(t) {
    switch (t) {
      case Dt.GRID:
        return new Zp({
          name: t,
          paper: this,
          patterns: this.constructor.gridPatterns
        });
      default:
        return new _i({ name: t });
    }
  },
  renderLayers: function(t = ev) {
    this.removeLayers(), t.forEach(({ name: i, sorted: s }) => {
      const o = this.createLayer(i);
      this.layers.appendChild(o.el), this._layers[i] = o;
    });
    const e = this.getLayerView(Dt.CELLS), n = this.getLayerView(Dt.TOOLS), r = this.getLayerView(Dt.LABELS);
    this.tools = n.el, this.cells = this.viewport = e.el, e.vel.addClass(pe("viewport")), r.vel.addClass(pe("viewport")), e.el.style.webkitUserSelect = "none", e.el.style.userSelect = "none", r.el.style.webkitUserSelect = "none", r.el.style.userSelect = "none";
  },
  removeLayers: function() {
    const { _layers: t } = this;
    Object.keys(t).forEach((e) => {
      t[e].remove(), delete t[e];
    });
  },
  resetLayers: function() {
    const { _layers: t } = this;
    Object.keys(t).forEach((e) => {
      t[e].removePivots();
    });
  },
  update: function() {
    return this._background && this.updateBackgroundImage(this._background), this;
  },
  scale: function(t, e, n) {
    const r = this.matrix();
    return t === void 0 ? B.matrixToScale(r) : (e === void 0 && (e = t), t = Math.max(t || 0, this.MIN_SCALE), e = Math.max(e || 0, this.MIN_SCALE), r.a = t, r.d = e, this.matrix(r, n), this);
  },
  scaleUniformAtPoint: function(t, e, n) {
    const { a: r, d: i, e: s, f: o } = this.matrix();
    if (t = Math.max(t || 0, this.MIN_SCALE), t === r && t === i) return this;
    const a = B.createSVGMatrix().translate(s - e.x * (t - r), o - e.y * (t - i)).scale(t, t);
    return this.matrix(a, n), this;
  },
  translate: function(t, e, n) {
    const r = this.matrix();
    return t === void 0 ? B.matrixToTranslate(r) : (t || (t = 0), e || (e = 0), r.e === t && r.f === e ? this : (r.e = t, r.f = e, this.matrix(r, n), this));
  },
  matrix: function(t, e = {}) {
    var n = this.layers;
    if (t === void 0) {
      var r = n.getAttribute("transform");
      return (this._viewportTransformString || null) === r ? t = this._viewportMatrix : (t = n.getCTM(), this._viewportMatrix = t, this._viewportTransformString = r), B.createSVGMatrix(t);
    }
    const i = this.matrix(), s = B.createSVGMatrix(t), o = this._viewportTransformString, a = B.matrixToTransformString(s);
    if (a === o) return this;
    if (!o && B.matrixToTransformString() === a) return this;
    const { a: c, d: u, e: h, f: l } = s;
    return n.setAttribute("transform", a), this._viewportMatrix = s, this._viewportTransformString = n.getAttribute("transform"), (c !== i.a || u !== i.d) && this.trigger("scale", c, u, e), (h !== i.e || l !== i.f) && this.trigger("translate", h, l, e), this.trigger("transform", s, e), this;
  },
  clientMatrix: function() {
    return B.createSVGMatrix(this.cells.getScreenCTM());
  },
  requestConnectedLinksUpdate: function(t, e, n) {
    if (t instanceof ht)
      for (var r = t.model, i = this.model.getConnectedLinks(r), s = 0, o = i.length; s < o; s++) {
        var a = i[s], c = this.findViewByModel(a);
        if (c) {
          var u = ["UPDATE"];
          a.getTargetCell() === r && u.push("TARGET"), a.getSourceCell() === r && u.push("SOURCE");
          var h = Math.max(e + 1, c.UPDATE_PRIORITY);
          this.scheduleViewUpdate(c, c.getFlag(u), h, n);
        }
      }
  },
  forcePostponedViewUpdate: function(t, e) {
    if (!t || !(t instanceof ht)) return !1;
    var n = t.model;
    if (n.isElement()) return !1;
    if ((e & t.getFlag(["SOURCE", "TARGET"])) === 0) {
      var r = { silent: !0 }, i = 0, s = this.findViewByModel(n.getSourceCell());
      s && !this.isViewMounted(s) && (i = this.dumpView(s, r), t.updateEndMagnet("source"));
      var o = 0, a = this.findViewByModel(n.getTargetCell());
      if (a && !this.isViewMounted(a) && (o = this.dumpView(a, r), t.updateEndMagnet("target")), i === 0 && o === 0) return !this.dumpView(t, r);
    }
    return !1;
  },
  requestViewUpdate: function(t, e, n, r) {
    r || (r = {}), this.scheduleViewUpdate(t, e, n, r);
    var i = this.isAsync();
    if (!(this.isFrozen() || i && r.async !== !1) && !this.model.hasActiveBatch(this.UPDATE_DELAYING_BATCHES)) {
      var s = this.updateViews(r);
      i && this.notifyAfterRender(s, r);
    }
  },
  scheduleViewUpdate: function(t, e, n, r) {
    const { _updates: i, options: s } = this;
    i.idle && s.autoFreeze && (i.idle = !1, this.unfreeze());
    const { FLAG_REMOVE: o, FLAG_INSERT: a, UPDATE_PRIORITY: c, cid: u } = t;
    let h = i.priorities[n];
    if (h || (h = i.priorities[n] = {}), n > c) for (let g = n - 1; g >= c; g--) {
      const v = i.priorities[g];
      !v || !(u in v) || (h[u] |= v[u], delete v[u]);
    }
    let l = h[u] || 0;
    if ((l & e) === e) return;
    l || i.count++, e & o && l & a ? h[u] ^= a : e & a && l & o && (h[u] ^= o), h[u] |= e;
    const d = s.onViewUpdate;
    typeof d == "function" && d.call(this, t, e, n, r || {}, this);
  },
  dumpViewUpdate: function(t) {
    if (!t) return 0;
    var e = this._updates, n = t.cid, r = e.priorities[t.UPDATE_PRIORITY], i = this.registerMountedView(t) | r[n];
    return delete r[n], i;
  },
  dumpView: function(t, e = {}) {
    const n = this.dumpViewUpdate(t);
    if (!n) return 0;
    const r = !e.silent;
    r && this.notifyBeforeRender(e);
    const i = this.updateView(t, n, e);
    if (r) {
      const s = {
        updated: 1,
        priority: t.UPDATE_PRIORITY
      };
      this.notifyAfterRender(s, e);
    }
    return i;
  },
  updateView: function(t, e, n) {
    if (!t) return 0;
    const { FLAG_REMOVE: r, FLAG_INSERT: i, FLAG_INIT: s, model: o } = t;
    if (t instanceof ht) {
      if (e & r)
        return this.removeView(o), 0;
      if (e & i) {
        const a = !!(e & s);
        a && (e ^= s), this.insertView(t, a), e ^= i;
      }
    }
    return e ? t.confirmUpdate(e, n || {}) : 0;
  },
  requireView: function(t, e) {
    var n = this.findViewByModel(t);
    return n ? (this.dumpView(n, e), n) : null;
  },
  registerUnmountedView: function(t) {
    var e = t.cid, n = this._updates;
    if (e in n.unmounted) return 0;
    var r = n.unmounted[e] |= t.FLAG_INSERT;
    return n.unmountedCids.push(e), delete n.mounted[e], r;
  },
  registerMountedView: function(t) {
    var e = t.cid, n = this._updates;
    if (e in n.mounted) return 0;
    n.mounted[e] = !0, n.mountedCids.push(e);
    var r = n.unmounted[e] || 0;
    return delete n.unmounted[e], r;
  },
  isViewMounted: function(t) {
    if (!t) return !1;
    var e = t.cid, n = this._updates;
    return e in n.mounted;
  },
  dumpViews: function(t) {
    var e = qt({}, t, { viewport: null });
    this.checkViewport(e), this.updateViews(e);
  },
  updateViews: function(t) {
    this.notifyBeforeRender(t);
    let e, n = 0, r = 0, i = lr;
    do
      r++, e = this.updateViewsBatch(t), n += e.updated, i = Math.min(e.priority, i);
    while (!e.empty);
    const s = {
      updated: n,
      batches: r,
      priority: i
    };
    return this.notifyAfterRender(s, t), s;
  },
  hasScheduledUpdates: function() {
    const t = this._updates.priorities, e = Object.keys(t);
    let n = e.length;
    for (; n > 0 && n--; ) for (let r in t[e[n]]) return !0;
    return !1;
  },
  updateViewsAsync: function(t, e) {
    t || (t = {}), e || (e = {
      processed: 0,
      priority: lr
    });
    const { _updates: n, options: r } = this, i = n.id;
    if (i) {
      pr(i), e.processed === 0 && this.hasScheduledUpdates() && this.notifyBeforeRender(t);
      const s = this.updateViewsBatch(t), o = qt({}, t, {
        mountBatchSize: Go - s.mounted,
        unmountBatchSize: Go - s.unmounted
      }), a = this.checkViewport(o), c = a.unmounted, u = a.mounted;
      let h = e.processed;
      const l = n.count;
      s.updated > 0 ? (h += s.updated + s.unmounted, s.processed = h, e.priority = Math.min(s.priority, e.priority), s.empty && u === 0 ? (s.unmounted += c, s.mounted += u, s.priority = e.priority, this.notifyAfterRender(s, t), e.processed = 0, e.priority = lr, n.count = 0) : e.processed = h) : n.idle || r.autoFreeze && (this.freeze(), n.idle = !0, this.trigger("render:idle", t));
      const d = t.progress;
      if (l && typeof d == "function" && d.call(this, s.empty, h, l, s, this), n.id !== i) return;
    }
    if (n.disabled) throw new Error("dia.Paper: can not unfreeze the paper after it was removed");
    n.id = xi(this.updateViewsAsync, this, t, e);
  },
  notifyBeforeRender: function(t = {}) {
    let e = t.beforeRender;
    typeof e != "function" && (e = this.options.beforeRender, typeof e != "function") || e.call(this, t, this);
  },
  notifyAfterRender: function(t, e = {}) {
    let n = e.afterRender;
    typeof n != "function" && (n = this.options.afterRender), typeof n == "function" && n.call(this, t, e, this), this.trigger("render:done", t, e);
  },
  updateViewsBatch: function(t) {
    t || (t = {});
    var e = t.batchSize || tv, n = this._updates, r = 0, i = 0, s = 0, o = 0, a = lr, c = !0, u = this.options, h = n.priorities, l = "viewport" in t ? t.viewport : u.viewport;
    typeof l != "function" && (l = null);
    var d = u.onViewPostponed;
    typeof d != "function" && (d = null);
    var g = Object.keys(h);
    t: for (var v = 0, y = g.length; v < y; v++) {
      var w = +g[v], x = h[w];
      for (var P in x) {
        if (r >= e) {
          c = !1;
          break t;
        }
        var T = Le[P];
        if (!T) {
          delete x[P];
          continue;
        }
        var L = x[P];
        if ((L & T.FLAG_REMOVE) === 0) {
          var I = P in n.unmounted;
          if (T.DETACHABLE && l && !l.call(this, T, !I, this)) {
            I || (this.registerUnmountedView(T), this.detachView(T)), n.unmounted[P] |= L, delete x[P], s++;
            continue;
          }
          I && (L |= T.FLAG_INSERT, o++), L |= this.registerMountedView(T);
        }
        var R = this.updateView(T, L, t);
        if (R > 0 && (x[P] = R, !d || !d.call(this, T, R, this) || x[P])) {
          i++, c = !1;
          continue;
        }
        a > w && (a = w), r++, delete x[P];
      }
    }
    return {
      priority: a,
      updated: r,
      postponed: i,
      unmounted: s,
      mounted: o,
      empty: c
    };
  },
  getUnmountedViews: function() {
    const t = this._updates, e = Object.keys(t.unmounted), n = e.length, r = new Array(n);
    for (var i = 0; i < n; i++) r[i] = Le[e[i]];
    return r;
  },
  getMountedViews: function() {
    const t = this._updates, e = Object.keys(t.mounted), n = e.length, r = new Array(n);
    for (var i = 0; i < n; i++) r[i] = Le[e[i]];
    return r;
  },
  checkUnmountedViews: function(t, e) {
    e || (e = {});
    var n = 0;
    typeof t != "function" && (t = null);
    for (var r = ("mountBatchSize" in e) ? e.mountBatchSize : 1 / 0, i = this._updates, s = i.unmountedCids, o = i.unmounted, a = 0, c = Math.min(s.length, r); a < c; a++) {
      var u = s[a];
      if (u in o) {
        var h = Le[u];
        if (h) {
          if (h.DETACHABLE && t && !t.call(this, h, !1, this)) {
            s.push(u);
            continue;
          }
          n++;
          var l = this.registerMountedView(h);
          l && this.scheduleViewUpdate(h, l, h.UPDATE_PRIORITY, { mounting: !0 });
        }
      }
    }
    return s.splice(0, a), n;
  },
  checkMountedViews: function(t, e) {
    e || (e = {});
    var n = 0;
    if (typeof t != "function") return n;
    for (var r = ("unmountBatchSize" in e) ? e.unmountBatchSize : 1 / 0, i = this._updates, s = i.mountedCids, o = i.mounted, a = 0, c = Math.min(s.length, r); a < c; a++) {
      var u = s[a];
      if (u in o) {
        var h = Le[u];
        if (h) {
          if (!h.DETACHABLE || t.call(this, h, !0, this)) {
            s.push(u);
            continue;
          }
          n++;
          var l = this.registerUnmountedView(h);
          l && this.detachView(h);
        }
      }
    }
    return s.splice(0, a), n;
  },
  checkViewVisibility: function(t, e = {}) {
    let n = "viewport" in e ? e.viewport : this.options.viewport;
    typeof n != "function" && (n = null);
    const r = this._updates, { mounted: i, unmounted: s } = r, o = !t.DETACHABLE || !n || n.call(this, t, !1, this);
    let a = !1, c = !1;
    if (t.cid in i && !o) {
      this.registerUnmountedView(t) && this.detachView(t);
      const l = r.mountedCids.indexOf(t.cid);
      r.mountedCids.splice(l, 1), a = !0;
    }
    if (!a && t.cid in s && o) {
      const h = r.unmountedCids.indexOf(t.cid);
      r.unmountedCids.splice(h, 1);
      var u = this.registerMountedView(t);
      u && this.scheduleViewUpdate(t, u, t.UPDATE_PRIORITY, { mounting: !0 }), c = !0;
    }
    return {
      mounted: c ? 1 : 0,
      unmounted: a ? 1 : 0
    };
  },
  checkViewport: function(t) {
    var e = qt({}, t, {
      mountBatchSize: 1 / 0,
      unmountBatchSize: 1 / 0
    }), n = "viewport" in e ? e.viewport : this.options.viewport, r = this.checkMountedViews(n, e);
    if (r > 0) {
      var i = this._updates.unmountedCids;
      e.mountBatchSize = Math.min(i.length - r, e.mountBatchSize);
    }
    var s = this.checkUnmountedViews(n, e);
    return {
      mounted: s,
      unmounted: r
    };
  },
  freeze: function(t) {
    t || (t = {});
    var e = this._updates, n = t.key, r = this.options.frozen, i = e.freezeKey;
    if (n && n !== i) {
      if (r && i) return;
      e.freezeKey = n, e.keyFrozen = r;
    }
    this.options.frozen = !0;
    var s = e.id;
    e.id = null, this.isAsync() && s && pr(s);
  },
  unfreeze: function(t) {
    t || (t = {});
    var e = this._updates, n = t.key, r = e.freezeKey;
    n && r && n !== r || (e.freezeKey = null, !(n && n === r && e.keyFrozen) && (this.isAsync() ? (this.freeze(), this.updateViewsAsync(t)) : this.updateViews(t), this.options.frozen = e.keyFrozen = !1, e.sort && (this.sortViews(), e.sort = !1)));
  },
  isAsync: function() {
    return !!this.options.async;
  },
  isFrozen: function() {
    return !!this.options.frozen;
  },
  isExactSorting: function() {
    return this.options.sorting === Ke.EXACT;
  },
  onRemove: function() {
    this.freeze(), this._updates.disabled = !0, this.removeLayers(), this.removeViews();
  },
  getComputedSize: function() {
    var t = this.options, e = t.width, n = t.height;
    return Ft(e) || (e = this.el.clientWidth), Ft(n) || (n = this.el.clientHeight), {
      width: e,
      height: n
    };
  },
  setDimensions: function(t, e, n = {}) {
    const { options: r } = this, { width: i, height: s } = r;
    let o = t === void 0 ? i : t, a = e === void 0 ? s : e;
    if (i === o && s === a) return;
    r.width = o, r.height = a, this._setDimensions();
    const c = this.getComputedSize();
    this.trigger("resize", c.width, c.height, n);
  },
  _setDimensions: function() {
    const { options: t } = this;
    let e = t.width, n = t.height;
    Ft(e) && (e = `${Math.round(e)}px`), Ft(n) && (n = `${Math.round(n)}px`), this.$el.css({
      width: e === null ? "" : e,
      height: n === null ? "" : n
    });
  },
  fitToContent: function(t, e, n, r) {
    gt(t) ? r = t : r = $({
      gridWidth: t,
      gridHeight: e,
      padding: n
    }, r);
    const { x: i, y: s, width: o, height: a } = this.getFitToContentArea(r), { sx: c, sy: u } = this.scale();
    return this.translate(-i * c, -s * u, r), this.setDimensions(o * c, a * u, r), new j(i, s, o, a);
  },
  getFitToContentArea: function(t = {}) {
    const e = t.gridWidth || 1, n = t.gridHeight || 1, r = ze(t.padding || 0), i = Math.max(t.minWidth || 0, e), s = Math.max(t.minHeight || 0, n), o = t.maxWidth || Number.MAX_VALUE, a = t.maxHeight || Number.MAX_VALUE, c = t.allowNewOrigin, u = "contentArea" in t ? new j(t.contentArea) : this.getContentArea(t), { sx: h, sy: l } = this.scale();
    u.x *= h, u.y *= l, u.width *= h, u.height *= l;
    let d = Math.ceil((u.width + u.x) / e), g = Math.ceil((u.height + u.y) / n);
    t.allowNegativeBottomRight || (d = Math.max(d, 1), g = Math.max(g, 1)), d *= e, g *= n;
    let v = 0;
    (c === "negative" && u.x < 0 || c === "positive" && u.x >= 0 || c === "any") && (v = Math.ceil(-u.x / e) * e, v += r.left, d += v);
    let y = 0;
    return (c === "negative" && u.y < 0 || c === "positive" && u.y >= 0 || c === "any") && (y = Math.ceil(-u.y / n) * n, y += r.top, g += y), d += r.right, g += r.bottom, d = Math.max(d, i), g = Math.max(g, s), d = Math.min(d, o), g = Math.min(g, a), new j(-v / h, -y / l, d / h, g / l);
  },
  transformToFitContent: function(t) {
    t || (t = {});
    let e, n;
    if ("contentArea" in t) {
      const T = t.contentArea;
      e = this.localToPaperRect(T), n = new E(T);
    } else
      e = this.getContentBBox(t), n = this.paperToLocalPoint(e);
    if (!e.width || !e.height) return;
    qt(t, {
      padding: 0,
      preserveAspectRatio: !0,
      scaleGrid: null,
      minScale: 0,
      maxScale: Number.MAX_VALUE,
      verticalAlign: "top",
      horizontalAlign: "left"
    });
    const r = ze(t.padding), i = t.minScaleX || t.minScale, s = t.maxScaleX || t.maxScale, o = t.minScaleY || t.minScale, a = t.maxScaleY || t.maxScale;
    let c;
    if (t.fittingBBox) c = t.fittingBBox;
    else {
      const T = this.translate(), L = this.getComputedSize();
      c = {
        x: T.tx,
        y: T.ty,
        width: L.width,
        height: L.height
      };
    }
    c = new j(c).moveAndExpand({
      x: r.left,
      y: r.top,
      width: -r.left - r.right,
      height: -r.top - r.bottom
    });
    const u = this.matrix(), { a: h, d: l, e: d, f: g } = u;
    let v = c.width / e.width * h, y = c.height / e.height * l;
    if (t.preserveAspectRatio && (v = y = Math.min(v, y)), t.scaleGrid) {
      const T = t.scaleGrid;
      v = T * Math.floor(v / T), y = T * Math.floor(y / T);
    }
    v = Math.min(s, Math.max(i, v)), y = Math.min(a, Math.max(o, y));
    const w = {
      x: v / h,
      y: y / l
    };
    let x = c.x - n.x * v - d, P = c.y - n.y * y - g;
    switch (t.verticalAlign) {
      case "middle":
        P = P + (c.height - e.height * w.y) / 2;
        break;
      case "bottom":
        P = P + (c.height - e.height * w.y);
        break;
    }
    switch (t.horizontalAlign) {
      case "middle":
        x = x + (c.width - e.width * w.x) / 2;
        break;
      case "right":
        x = x + (c.width - e.width * w.x);
        break;
    }
    u.a = v, u.d = y, u.e = x, u.f = P, this.matrix(u, t);
  },
  scaleContentToFit: function(t) {
    this.transformToFitContent(t);
  },
  getContentArea: function(t) {
    return t && t.useModelGeometry ? this.model.getBBox() || new j() : B(this.cells).getBBox();
  },
  getContentBBox: function(t) {
    return this.localToPaperRect(this.getContentArea(t));
  },
  getArea: function() {
    return this.paperToLocalRect(this.getComputedSize());
  },
  getRestrictedArea: function(...t) {
    const { restrictTranslate: e } = this.options;
    let n;
    return bt(e) ? n = e.apply(this, t) : e === !0 ? n = this.getArea() : e ? n = new j(e) : n = null, n;
  },
  createViewForModel: function(t) {
    const { options: e } = this;
    var n, r, i = e.cellViewNamespace, s = t.get("type") + "View", o = hn(i, s, ".");
    t.isLink() ? (n = e.linkView, r = Nn) : (n = e.elementView, r = _n);
    var a = n.prototype instanceof Ie ? o || n : n.call(this, t) || o || r;
    return new a({
      model: t,
      interactive: e.interactive,
      labelsLayer: e.labelsLayer === !0 ? Dt.LABELS : e.labelsLayer
    });
  },
  removeView: function(t) {
    const { id: e } = t, { _views: n, _updates: r } = this, i = n[e];
    if (i) {
      var { cid: s } = i;
      const { mounted: o, unmounted: a } = r;
      i.remove(), delete n[e], delete o[s], delete a[s];
    }
    return i;
  },
  renderView: function(t, e) {
    const { id: n } = t, r = this._views;
    let i, s, o = !0;
    return n in r && (i = r[n], i.model === t ? (s = i.FLAG_INSERT, o = !1) : this.removeView(t)), o && (i = r[n] = this.createViewForModel(t), i.paper = this, s = this.registerUnmountedView(i) | this.FLAG_INIT | i.getFlag(wt(i, "initFlag"))), this.requestViewUpdate(i, s, i.UPDATE_PRIORITY, e), i;
  },
  onImageDragStart: function() {
    return !1;
  },
  resetViews: function(t, e) {
    e || (e = {}), t || (t = []), this._resetUpdates(), this.removeViews();
    const n = this.options.autoFreeze ? null : "reset";
    this.freeze({ key: n });
    for (var r = 0, i = t.length; r < i; r++) this.renderView(t[r], e);
    this.unfreeze({ key: n }), this.sortViews();
  },
  removeViews: function() {
    le(this._views, "remove"), this._views = {};
  },
  sortViews: function() {
    if (this.isExactSorting()) {
      if (this.isFrozen()) {
        this._updates.sort = !0;
        return;
      }
      this.sortViewsExact();
    }
  },
  sortViewsExact: function() {
    var t = Array.from(this.cells.childNodes).filter((n) => n.getAttribute("model-id")), e = this.model.get("cells");
    Bf(t, function(n, r) {
      var i = e.get(n.getAttribute("model-id")), s = e.get(r.getAttribute("model-id")), o = i.attributes.z || 0, a = s.attributes.z || 0;
      return o === a ? 0 : o < a ? -1 : 1;
    });
  },
  insertView: function(t, e) {
    const n = this.getLayerView(Dt.CELLS), { el: r, model: i } = t;
    switch (this.options.sorting) {
      case Ke.APPROX:
        n.insertSortedNode(r, i.get("z"));
        break;
      case Ke.EXACT:
      default:
        n.insertNode(r);
        break;
    }
    t.onMount(e);
  },
  detachView(t) {
    t.unmount(), t.onDetach();
  },
  findView: function(t) {
    var e = Ct(t) ? this.cells.querySelector(t) : t instanceof xt ? t[0] : t, n = this.findAttribute("model-id", e);
    if (n) return this._views[n];
  },
  findViewByModel: function(t) {
    var e = Ct(t) || Ft(t) ? t : t && t.id;
    return this._views[e];
  },
  findViewsFromPoint: function(t) {
    t = new E(t);
    var e = this.model.getElements().map(this.findViewByModel, this);
    return e.filter(function(n) {
      return n && n.vel.getBBox({ target: this.cells }).containsPoint(t);
    }, this);
  },
  findViewsInArea: function(t, e) {
    e = qt(e || {}, { strict: !1 }), t = new j(t);
    var n = this.model.getElements().map(this.findViewByModel, this), r = e.strict ? "containsRect" : "intersect";
    return n.filter(function(i) {
      return i && t[r](i.vel.getBBox({ target: this.cells }));
    }, this);
  },
  findElementViewsInArea(t, e) {
    return this._filterViewsInArea(t, (n, r) => this.model.findElementsInArea(n, r), e);
  },
  findLinkViewsInArea: function(t, e) {
    return this._filterViewsInArea(t, (n, r) => this.model.findLinksInArea(n, r), e);
  },
  findCellViewsInArea: function(t, e) {
    return this._filterViewsInArea(t, (n, r) => this.model.findCellsInArea(n, r), e);
  },
  findElementViewsAtPoint: function(t, e) {
    return this._filterViewsAtPoint(t, (n) => this.model.findElementsInArea(n), e);
  },
  findLinkViewsAtPoint: function(t, e) {
    return this._filterViewsAtPoint(t, (n) => this.model.findLinksInArea(n), e);
  },
  findCellViewsAtPoint: function(t, e) {
    return this._filterViewsAtPoint(t, (n) => this.model.findCellsInArea(n), e);
  },
  _findInExtendedArea: function(t, e, n = {}) {
    const { buffer: r = this.DEFAULT_FIND_BUFFER } = n, i = new j(t).inflate(r);
    return e(i, n).map((o) => this.findViewByModel(o));
  },
  _filterViewsInArea: function(t, e, n = {}) {
    const r = new j(t);
    return this._findInExtendedArea(r, e, n).filter((o) => o ? o.isInArea(r, n) : !1);
  },
  _filterViewsAtPoint: function(t, e, n = {}) {
    const r = new j(t);
    return this._findInExtendedArea(r, e, n).filter((o) => o ? o.isAtPoint(t, n) : !1);
  },
  removeTools: function() {
    return this.dispatchToolsEvent("remove"), this;
  },
  hideTools: function() {
    return this.dispatchToolsEvent("hide"), this;
  },
  showTools: function() {
    return this.dispatchToolsEvent("show"), this;
  },
  dispatchToolsEvent: function(t, ...e) {
    typeof t == "string" && this.trigger("tools:event", t, ...e);
  },
  getModelById: function(t) {
    return this.model.getCell(t);
  },
  snapToGrid: function(t, e) {
    return this.clientToLocalPoint(t, e).snapToGrid(this.options.gridSize);
  },
  localToPaperPoint: function(t, e) {
    var n = new E(t, e), r = B.transformPoint(n, this.matrix());
    return r;
  },
  localToPaperRect: function(t, e, n, r) {
    var i = new j(t, e, n, r), s = B.transformRect(i, this.matrix());
    return s;
  },
  paperToLocalPoint: function(t, e) {
    var n = new E(t, e), r = B.transformPoint(n, this.matrix().inverse());
    return r;
  },
  paperToLocalRect: function(t, e, n, r) {
    var i = new j(t, e, n, r), s = B.transformRect(i, this.matrix().inverse());
    return s;
  },
  localToClientPoint: function(t, e) {
    var n = new E(t, e), r = B.transformPoint(n, this.clientMatrix());
    return r;
  },
  localToClientRect: function(t, e, n, r) {
    var i = new j(t, e, n, r), s = B.transformRect(i, this.clientMatrix());
    return s;
  },
  clientToLocalPoint: function(t, e) {
    var n = new E(t, e), r = B.transformPoint(n, this.clientMatrix().inverse());
    return r;
  },
  clientToLocalRect: function(t, e, n, r) {
    var i = new j(t, e, n, r), s = B.transformRect(i, this.clientMatrix().inverse());
    return s;
  },
  localToPagePoint: function(t, e) {
    return this.localToPaperPoint(t, e).offset(this.pageOffset());
  },
  localToPageRect: function(t, e, n, r) {
    return this.localToPaperRect(t, e, n, r).offset(this.pageOffset());
  },
  pageToLocalPoint: function(t, e) {
    var n = new E(t, e), r = n.difference(this.pageOffset());
    return this.paperToLocalPoint(r);
  },
  pageToLocalRect: function(t, e, n, r) {
    var i = this.pageOffset(), s = new j(t, e, n, r);
    return s.x -= i.x, s.y -= i.y, this.paperToLocalRect(s);
  },
  clientOffset: function() {
    var t = this.svg.getBoundingClientRect();
    return new E(t.left, t.top);
  },
  pageOffset: function() {
    return this.clientOffset().offset(window.scrollX, window.scrollY);
  },
  linkAllowed: function(t) {
    if (!(t instanceof Nn)) throw new Error("Must provide a linkView.");
    var e = t.model, n = this.options, r = this.model, i = r.constructor.validations;
    return !(!n.multiLinks && !i.multiLinks.call(this, r, e) || !n.linkPinning && !i.linkPinning.call(this, r, e) || typeof n.allowLink == "function" && !n.allowLink.call(this, t, this));
  },
  getDefaultLink: function(t, e) {
    return bt(this.options.defaultLink) ? this.options.defaultLink.call(this, t, e) : this.options.defaultLink.clone();
  },
  resolveHighlighter: function(t = {}) {
    let { highlighter: e, type: n } = t;
    const { highlighting: r, highlighterNamespace: i } = this.options;
    if (e === void 0) {
      if (!r || n && (e = r[n], e === !1))
        return !1;
      e || (e = r.default);
    }
    if (!e) return !1;
    Ct(e) && (e = { name: e });
    const s = e.name, o = i[s];
    if (!o) throw new Error('Unknown highlighter ("' + s + '")');
    if (typeof o.highlight != "function") throw new Error('Highlighter ("' + s + '") is missing required highlight() method');
    if (typeof o.unhighlight != "function") throw new Error('Highlighter ("' + s + '") is missing required unhighlight() method');
    return {
      highlighter: o,
      options: e.options || {},
      name: s
    };
  },
  onCellHighlight: function(t, e, n) {
    const r = this.resolveHighlighter(n);
    if (!r) return;
    const { highlighter: i, options: s } = r;
    i.highlight(t, e, s);
  },
  onCellUnhighlight: function(t, e, n) {
    const r = this.resolveHighlighter(n);
    if (!r) return;
    const { highlighter: i, options: s } = r;
    i.unhighlight(t, e, s);
  },
  pointerdblclick: function(t) {
    t.preventDefault(), t = Nt(t);
    var e = this.findView(t.target);
    if (!this.guard(t, e)) {
      var n = this.snapToGrid(t.clientX, t.clientY);
      e ? e.pointerdblclick(t, n.x, n.y) : this.trigger("blank:pointerdblclick", t, n.x, n.y);
    }
  },
  pointerclick: function(t) {
    var e = this.eventData(t);
    if (e.mousemoved <= this.options.clickThreshold) {
      t = Nt(t);
      var n = this.findView(t.target);
      if (this.guard(t, n)) return;
      var r = this.snapToGrid(t.clientX, t.clientY);
      n ? n.pointerclick(t, r.x, r.y) : this.trigger("blank:pointerclick", t, r.x, r.y);
    }
  },
  contextmenu: function(t) {
    if (this.options.preventContextMenu && t.preventDefault(), this.contextMenuFired) {
      this.contextMenuFired = !1;
      return;
    }
    t = Nt(t), this.contextMenuTrigger(t);
  },
  contextMenuTrigger: function(t) {
    var e = this.findView(t.target);
    if (!this.guard(t, e)) {
      var n = this.snapToGrid(t.clientX, t.clientY);
      e ? e.contextmenu(t, n.x, n.y) : this.trigger("blank:contextmenu", t, n.x, n.y);
    }
  },
  pointerdown: function(t) {
    t = Nt(t);
    const { target: e, button: n } = t, r = this.findView(e), i = n === 2;
    if (r) {
      if (!i && this.guard(t, r)) return;
      const s = this.FORM_CONTROL_TAG_NAMES.includes(e.tagName);
      this.options.preventDefaultViewAction && !s && t.preventDefault(), s && r.preventDefaultInteraction(t);
      const o = this.customEventTrigger(t, r);
      if (o) {
        if (o.isPropagationStopped()) return;
        t.data = o.data;
      }
      const a = e.closest("[magnet]");
      if (a && r.el !== a && r.el.contains(a)) {
        const c = Nt(new xt.Event(t.originalEvent, {
          data: t.data,
          currentTarget: a
        }));
        if (this.onmagnet(c), c.isDefaultPrevented() && t.preventDefault(), c.isPropagationStopped()) {
          if (i) return;
          this.delegateDragEvents(r, c.data);
          return;
        }
        t.data = c.data;
      }
    }
    if (i) {
      this.contextMenuFired = !0;
      const s = new xt.Event(t.originalEvent, {
        type: "contextmenu",
        data: t.data
      });
      this.contextMenuTrigger(s);
    } else {
      const s = this.snapToGrid(t.clientX, t.clientY);
      r ? r.pointerdown(t, s.x, s.y) : (this.options.preventDefaultBlankAction && t.preventDefault(), this.trigger("blank:pointerdown", t, s.x, s.y)), this.delegateDragEvents(r, t.data);
    }
  },
  pointermove: function(t) {
    var e = this.eventData(t);
    e.mousemoved || (e.mousemoved = 0, this.undelegateEvents());
    var n = ++e.mousemoved;
    if (!(n <= this.options.moveThreshold)) {
      t = Nt(t);
      var r = this.snapToGrid(t.clientX, t.clientY), i = e.sourceView;
      i ? i.pointermove(t, r.x, r.y) : this.trigger("blank:pointermove", t, r.x, r.y), this.eventData(t, e);
    }
  },
  pointerup: function(t) {
    this.undelegateDocumentEvents();
    var e = Nt(t), n = this.snapToGrid(e.clientX, e.clientY), r = this.eventData(t).sourceView;
    r ? r.pointerup(e, n.x, n.y) : this.trigger("blank:pointerup", e, n.x, n.y), e.isPropagationStopped() || this.pointerclick(new xt.Event(t.originalEvent, {
      type: "click",
      data: t.data
    })), this.delegateEvents();
  },
  mouseover: function(t) {
    t = Nt(t);
    var e = this.findView(t.target);
    if (!this.guard(t, e))
      if (e) e.mouseover(t);
      else {
        if (this.el === t.target) return;
        this.trigger("blank:mouseover", t);
      }
  },
  mouseout: function(t) {
    t = Nt(t);
    var e = this.findView(t.target);
    if (!this.guard(t, e))
      if (e) e.mouseout(t);
      else {
        if (this.el === t.target) return;
        this.trigger("blank:mouseout", t);
      }
  },
  mouseenter: function(t) {
    t = Nt(t);
    const { target: e, relatedTarget: n, currentTarget: r } = t, i = this.findView(e);
    if (this.guard(t, i)) return;
    const s = this.findView(n);
    i && (s === i || (i.mouseenter(t), this.el.contains(n))) || s || r === this.el && this.trigger("paper:mouseenter", t);
  },
  mouseleave: function(t) {
    t = Nt(t);
    const { target: e, relatedTarget: n, currentTarget: r } = t, i = this.findView(e);
    if (this.guard(t, i)) return;
    const s = this.findView(n);
    i && (s === i || (i.mouseleave(t), this.el.contains(n))) || s || r === this.el && this.trigger("paper:mouseleave", t);
  },
  _processMouseWheelEvtBuf: Vh(function() {
    const { event: t, deltas: e } = this._mw_evt_buffer, n = e.reduce((o, a) => o + Of(a, Qp), 0), r = Math.pow(0.995, n), { x: i, y: s } = this.clientToLocalPoint(t.clientX, t.clientY);
    this.trigger("paper:pinch", t, i, s, r), this._mw_evt_buffer = {
      event: null,
      deltas: []
    };
  }, Vo, { maxWait: Vo }),
  mousewheel: function(t) {
    t = Nt(t);
    const e = this.findView(t.target);
    if (this.guard(t, e)) return;
    const n = t.originalEvent, r = this.snapToGrid(n.clientX, n.clientY), { deltaX: i, deltaY: s } = If(n), o = this._events["paper:pinch"];
    if (t.ctrlKey && o && o.length > 0)
      n.preventDefault(), this._mw_evt_buffer.event = t, this._mw_evt_buffer.deltas.push(s), this._processMouseWheelEvtBuf();
    else {
      const a = Math.max(-1, Math.min(1, n.wheelDelta));
      e ? e.mousewheel(t, r.x, r.y, a) : this.trigger("blank:mousewheel", t, r.x, r.y, a), this.trigger("paper:pan", t, i, s);
    }
  },
  onevent: function(t) {
    var e = t.currentTarget, n = e.getAttribute("event");
    if (n) {
      var r = this.findView(e);
      if (r) {
        if (t = Nt(t), this.guard(t, r)) return;
        var i = this.snapToGrid(t.clientX, t.clientY);
        r.onevent(t, n, i.x, i.y);
      }
    }
  },
  magnetEvent: function(t, e) {
    var n = t.currentTarget, r = n.getAttribute("magnet");
    if (r) {
      var i = this.findView(n);
      if (i) {
        if (t = Nt(t), this.guard(t, i)) return;
        var s = this.snapToGrid(t.clientX, t.clientY);
        e.call(this, i, t, n, s.x, s.y);
      }
    }
  },
  onmagnet: function(t) {
    if (t.button === 2) {
      this.contextMenuFired = !0, this.magnetContextMenuFired = !0;
      const e = new xt.Event(t.originalEvent, {
        type: "contextmenu",
        data: t.data,
        currentTarget: t.currentTarget
      });
      this.magnetContextMenuTrigger(e), e.isPropagationStopped() && t.stopPropagation();
    } else this.magnetEvent(t, function(e, n, r, i, s) {
      e.onmagnet(n, i, s);
    });
  },
  magnetpointerdblclick: function(t) {
    this.magnetEvent(t, function(e, n, r, i, s) {
      e.magnetpointerdblclick(n, r, i, s);
    });
  },
  magnetcontextmenu: function(t) {
    if (this.options.preventContextMenu && t.preventDefault(), this.magnetContextMenuFired) {
      this.magnetContextMenuFired = !1;
      return;
    }
    this.magnetContextMenuTrigger(t);
  },
  magnetContextMenuTrigger: function(t) {
    this.magnetEvent(t, function(e, n, r, i, s) {
      e.magnetcontextmenu(n, r, i, s);
    });
  },
  onlabel: function(t) {
    var e = t.currentTarget, n = this.findView(e);
    if (!n || (t = Nt(t), this.guard(t, n))) return;
    const r = this.customEventTrigger(t, n, e);
    if (r) {
      if (r.isPropagationStopped()) return;
      t.data = r.data;
    }
    var i = this.snapToGrid(t.clientX, t.clientY);
    n.onlabel(t, i.x, i.y);
  },
  getPointerArgs(t) {
    const e = Nt(t), { x: n, y: r } = this.snapToGrid(e.clientX, e.clientY);
    return [
      e,
      n,
      r
    ];
  },
  delegateDragEvents: function(t, e) {
    e || (e = {}), this.eventData({ data: e }, {
      sourceView: t || null,
      mousemoved: 0
    }), this.delegateDocumentEvents(null, e);
  },
  guard: function(t, e) {
    if (t.type === "mousedown" && t.button === 2 || this.options.guard && this.options.guard(t, e)) return !0;
    if (t.data && t.data.guarded !== void 0) return t.data.guarded;
    const { target: n } = t;
    return this.GUARDED_TAG_NAMES.includes(n.tagName) ? !0 : !(e && e.model && e.model instanceof fe || this.el === n || this.svg.contains(n));
  },
  setGridSize: function(t) {
    const { options: e } = this;
    return e.gridSize = t, e.drawGrid && !e.drawGridSize && this.getLayerView(Dt.GRID).renderGrid(), this;
  },
  setGrid: function(t) {
    return this.getLayerView(Dt.GRID).setGrid(t), this;
  },
  updateBackgroundImage: function(t) {
    t = t || {};
    var e = t.position || "center", n = t.size || "auto auto", r = this.scale(), i = this.translate();
    if (gt(e)) {
      var s = i.tx + r.sx * (e.x || 0), o = i.ty + r.sy * (e.y || 0);
      e = s + "px " + o + "px";
    }
    gt(n) && (n = new j(n).scale(r.sx, r.sy), n = n.width + "px " + n.height + "px");
    const { background: a } = this.childNodes;
    a.style.backgroundSize = n, a.style.backgroundPosition = e;
  },
  drawBackgroundImage: function(t, e) {
    if (!(t instanceof HTMLImageElement)) {
      this.childNodes.background.style.backgroundImage = "";
      return;
    }
    if (!(!this._background || this._background.id !== e.id)) {
      e = e || {};
      var n, r = e.size, i = e.repeat || "no-repeat", s = e.opacity || 1, o = Math.abs(e.quality) || 1, a = this.constructor.backgroundPatterns[cc(i)];
      if (bt(a)) {
        t.width *= o, t.height *= o;
        var c = a(t, e);
        if (!(c instanceof HTMLCanvasElement)) throw new Error("dia.Paper: background pattern must return an HTML Canvas instance");
        n = c.toDataURL("image/png"), i = "repeat", gt(r) ? (r.width *= c.width / t.width, r.height *= c.height / t.height) : r === void 0 && (e.size = {
          width: c.width / o,
          height: c.height / o
        });
      } else
        n = t.src, r === void 0 && (e.size = {
          width: t.width,
          height: t.height
        });
      this.childNodes.background.style.opacity = s, this.childNodes.background.style.backgroundRepeat = i, this.childNodes.background.style.backgroundImage = `url(${n})`, this.updateBackgroundImage(e);
    }
  },
  updateBackgroundColor: function(t) {
    this.$el.css("backgroundColor", t || "");
  },
  drawBackground: function(t) {
    if (t = t || {}, this.updateBackgroundColor(t.color), t.image) {
      t = this._background = $t(t), rn(t);
      var e = document.createElement("img");
      e.onload = this.drawBackgroundImage.bind(this, e, t), e.src = t.image;
    } else
      this.drawBackgroundImage(null), this._background = null;
    return this;
  },
  setInteractivity: function(t) {
    this.options.interactive = t, le(this._views, "setInteractivity", t);
  },
  isDefined: function(t) {
    return !!this.svg.getElementById(t);
  },
  defineFilter: function(t) {
    if (!gt(t)) throw new TypeError("dia.Paper: defineFilter() requires 1. argument to be an object.");
    var e = t.id, n = t.name;
    if (e || (e = n + this.svg.id + rr(JSON.stringify(t))), !this.isDefined(e)) {
      var r = Gf, i = r[n] && r[n](t.args || {});
      if (!i) throw new Error("Non-existing filter " + n);
      var s = $({ filterUnits: "userSpaceOnUse" }, t.attrs, { id: e });
      B(i, s).appendTo(this.defs);
    }
    return e;
  },
  defineGradient: function(t) {
    if (!gt(t)) throw new TypeError("dia.Paper: defineGradient() requires 1. argument to be an object.");
    const { svg: e, defs: n } = this, { type: r, id: i = r + e.id + rr(JSON.stringify(t)), stops: s, attrs: o = {} } = t;
    if (this.isDefined(i)) return i;
    const a = pt(s).map(({ offset: u, color: h, opacity: l }) => B("stop").attr({
      offset: u,
      "stop-color": h,
      "stop-opacity": Number.isFinite(l) ? l : 1
    })), c = B(r, o, a);
    return c.id = i, c.appendTo(n), i;
  },
  definePattern: function(t) {
    if (!gt(t)) throw new TypeError("dia.Paper: definePattern() requires 1. argument to be an object.");
    const { svg: e, defs: n } = this, { id: r = e.id + rr(JSON.stringify(t)), markup: i, attrs: s = {} } = t;
    if (!i) throw new TypeError("dia.Paper: definePattern() requires markup.");
    if (this.isDefined(r)) return r;
    const o = B("pattern", { patternUnits: "userSpaceOnUse" });
    if (o.id = r, o.attr(s), typeof i == "string") o.append(B(i));
    else {
      const { fragment: a } = Pr(i);
      o.append(a);
    }
    return o.appendTo(n), r;
  },
  defineMarker: function(t) {
    if (!gt(t)) throw new TypeError("dia.Paper: defineMarker() requires the first argument to be an object.");
    const { svg: e, defs: n } = this, { id: r = e.id + rr(JSON.stringify(t)), markup: i, attrs: s = {}, markerUnits: o = "userSpaceOnUse" } = t;
    if (this.isDefined(r)) return r;
    const a = B("marker", {
      orient: "auto",
      overflow: "visible",
      markerUnits: o
    });
    a.id = r, a.attr(s);
    let c;
    if (i) {
      let l;
      if (typeof i == "string")
        l = B(i), l = Array.isArray(l) ? l : [l];
      else {
        const { fragment: d } = Pr(i);
        l = B(d).children();
      }
      l.length > 1 ? c = B("g").append(l) : c = l[0];
    } else {
      const { type: l = "path" } = t;
      c = B(l);
    }
    const u = $n(t, "type", "id", "markup", "attrs", "markerUnits");
    return Object.keys(u).forEach((l) => {
      const d = u[l], g = c.attr(l);
      if (g == null) c.attr(l, d);
      else switch (l) {
        case "transform":
          c.attr(l, d + " " + g);
          break;
      }
    }), c.appendTo(a), a.appendTo(n), r;
  },
  customEventTrigger: function(t, e, n = e.el) {
    const r = t.target.closest("[event]");
    if (r && n !== r && e.el.contains(r)) {
      const i = Nt(new xt.Event(t.originalEvent, {
        data: t.data,
        currentTarget: r
      }));
      return this.onevent(i), i.isDefaultPrevented() && t.preventDefault(), i;
    }
    return null;
  }
}, {
  sorting: Ke,
  Layers: Dt,
  backgroundPatterns: {
    flipXy: function(t) {
      var e = document.createElement("canvas"), n = t.width, r = t.height;
      e.width = 2 * n, e.height = 2 * r;
      var i = e.getContext("2d");
      return i.drawImage(t, 0, 0, n, r), i.setTransform(-1, 0, 0, -1, e.width, e.height), i.drawImage(t, 0, 0, n, r), i.setTransform(-1, 0, 0, 1, e.width, 0), i.drawImage(t, 0, 0, n, r), i.setTransform(1, 0, 0, -1, 0, e.height), i.drawImage(t, 0, 0, n, r), e;
    },
    flipX: function(t) {
      var e = document.createElement("canvas"), n = t.width, r = t.height;
      e.width = n * 2, e.height = r;
      var i = e.getContext("2d");
      return i.drawImage(t, 0, 0, n, r), i.translate(2 * n, 0), i.scale(-1, 1), i.drawImage(t, 0, 0, n, r), e;
    },
    flipY: function(t) {
      var e = document.createElement("canvas"), n = t.width, r = t.height;
      e.width = n, e.height = r * 2;
      var i = e.getContext("2d");
      return i.drawImage(t, 0, 0, n, r), i.translate(0, 2 * r), i.scale(1, -1), i.drawImage(t, 0, 0, n, r), e;
    },
    watermark: function(t, e) {
      e = e || {};
      var n = t.width, r = t.height, i = document.createElement("canvas");
      i.width = n * 3, i.height = r * 3;
      for (var s = i.getContext("2d"), o = Ft(e.watermarkAngle) ? -e.watermarkAngle : -20, a = Ut(o), c = i.width / 4, u = i.height / 4, h = 0; h < 4; h++) for (var l = 0; l < 4; l++) (h + l) % 2 > 0 && (s.setTransform(1, 0, 0, 1, (2 * h - 1) * c, (2 * l - 1) * u), s.rotate(a), s.drawImage(t, -n / 2, -r / 2, n, r));
      return i;
    }
  },
  gridPatterns: {
    dot: [{
      color: "#AAAAAA",
      thickness: 1,
      markup: "rect",
      render: function(t, e) {
        B(t).attr({
          width: e.thickness,
          height: e.thickness,
          fill: e.color
        });
      }
    }],
    fixedDot: [{
      color: "#AAAAAA",
      thickness: 1,
      markup: "rect",
      render: function(t, e) {
        B(t).attr({ fill: e.color });
      },
      update: function(t, e, n) {
        const { sx: r, sy: i } = n.scale(), s = r <= 1 ? e.thickness : e.thickness / r, o = i <= 1 ? e.thickness : e.thickness / i;
        B(t).attr({
          width: s,
          height: o
        });
      }
    }],
    mesh: [{
      color: "#AAAAAA",
      thickness: 1,
      markup: "path",
      render: function(t, e) {
        var n, r = e.width, i = e.height, s = e.thickness;
        r - s >= 0 && i - s >= 0 ? n = [
          "M",
          r,
          0,
          "H0 M0 0 V0",
          i
        ].join(" ") : n = "M 0 0 0 0", B(t).attr({
          d: n,
          stroke: e.color,
          "stroke-width": e.thickness
        });
      }
    }],
    doubleMesh: [{
      color: "#AAAAAA",
      thickness: 1,
      markup: "path",
      render: function(t, e) {
        var n, r = e.width, i = e.height, s = e.thickness;
        r - s >= 0 && i - s >= 0 ? n = [
          "M",
          r,
          0,
          "H0 M0 0 V0",
          i
        ].join(" ") : n = "M 0 0 0 0", B(t).attr({
          d: n,
          stroke: e.color,
          "stroke-width": e.thickness
        });
      }
    }, {
      color: "#000000",
      thickness: 3,
      scaleFactor: 4,
      markup: "path",
      render: function(t, e) {
        var n, r = e.width, i = e.height, s = e.thickness;
        r - s >= 0 && i - s >= 0 ? n = [
          "M",
          r,
          0,
          "H0 M0 0 V0",
          i
        ].join(" ") : n = "M 0 0 0 0", B(t).attr({
          d: n,
          stroke: e.color,
          "stroke-width": e.thickness
        });
      }
    }]
  }
});
function nv(t, e = "system-ui, Avenir, Helvetica, Arial, sans-serif", n) {
  const i = document.createElement("canvas").getContext("2d");
  i.font = `${t}px ${e}`;
  const s = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ";
  for (const o of s) n[o] = i.measureText(o).width;
}
function rv(t) {
  const e = {};
  return e[t] || (e[t] = { default: t * 0.5 }, nv(t, "system-ui, Avenir, Helvetica, Arial, sans-serif", e[t])), e[t];
}
function Pn(t, e) {
  let n = 0;
  const r = rv(e);
  for (const i of t) /[\u4e00-\u9fa5]/.test(i) ? n += e : n += r[i] ?? r.default;
  return n;
}
function bs(t, ...e) {
  return t.reduce((r, i, s) => r + i + (e[s] ?? ""), "").replace(/\s+/g, " ").trim();
}
var hl = class extends It {
  constructor(t = {}, e = {}) {
    const n = t.style || {}, r = t.nodeType, i = [{
      tagName: "rect",
      groupSelector: "base-node-body"
    }, {
      tagName: "g",
      groupSelector: "base-node-title"
    }];
    r === "switch" && i.push({
      tagName: "g",
      groupSelector: "switch-plus",
      children: [{
        tagName: "rect",
        groupSelector: "switch-plus-rect"
      }, {
        tagName: "path",
        groupSelector: "switch-plus-icon"
      }]
    });
    const s = n.ports?.layout?.rowHeight ?? 20, o = n.ports?.layout?.gap ?? 8, a = n.ports?.output?.port?.stroke ?? "rgba(255, 255, 255, 0.8)";
    super(Ur(t, {
      type: "custom.BlueprintNode",
      size: {
        width: 300,
        height: 100
      },
      inputs: [],
      outputs: [],
      attrs: {
        "base-node-body": {
          refWidth: "100%",
          refHeight: "100%",
          fill: n.background ?? "rgba(41, 44, 47, 0.9)",
          stroke: n.background ?? "rgba(41, 44, 47, 0.9)",
          strokeWidth: 1,
          rx: n.borderRadius ?? 8,
          ry: n.borderRadius ?? 8
        },
        "switch-plus": {
          cursor: "pointer",
          refX: "100%",
          refY: "100%",
          transform: "translate(-22, -" + (o + s * 0.5) + ")"
        },
        "switch-plus-rect": {
          width: 12,
          height: 12,
          fill: "transparent",
          stroke: "transparent",
          strokeWidth: 1
        },
        "switch-plus-icon": {
          d: "M2 6 L10 6 M6 2 L6 10",
          stroke: a,
          strokeWidth: 1.5,
          pointerEvents: "none"
        }
      },
      markup: i,
      ports: { groups: {
        in: {
          position: {
            name: "absolute",
            args: { x: 16 }
          },
          attrs: {
            portBody: {
              fill: n.ports?.input?.port?.fill ?? "rgba(255, 255, 255, 0.5)",
              stroke: n.ports?.input?.port?.stroke ?? "rgba(255, 255, 255, 0.8)",
              strokeWidth: n.ports?.input?.port?.strokeWidth ?? 1,
              r: 6,
              magnet: "inout",
              cursor: "crosshair"
            },
            portLabel: {
              x: 12,
              y: "0.3em",
              textAnchor: "start",
              fontSize: n.ports?.input?.label?.fontSize ?? 12,
              fill: n.ports?.input?.label?.color ?? "#fff"
            }
          }
        },
        out: {
          position: {
            name: "absolute",
            args: { x: "calc(w - 16)" }
          },
          attrs: {
            portBody: {
              fill: n.ports?.output?.port?.fill ?? "rgba(255, 255, 255, 0.5)",
              stroke: n.ports?.output?.port?.stroke ?? "rgba(255, 255, 255, 0.8)",
              strokeWidth: n.ports?.output?.port?.strokeWidth ?? 1,
              r: 6,
              magnet: "inout",
              cursor: "crosshair"
            },
            portLabel: {
              x: -12,
              y: "0.3em",
              textAnchor: "end",
              fontSize: n.ports?.output?.label?.fontSize ?? 12,
              fill: n.ports?.output?.label?.color ?? "#fff"
            }
          }
        }
      } }
    }), e);
  }
  initialize(...t) {
    super.initialize(...t), this.getPorts().length === 0 && this.buildPortItems(), this.on("change:inputs change:outputs", (e, n, r) => this.buildPortItems(r));
  }
  title(t) {
    this.set("title", t);
    const e = t.length > 0 ? Pn(t, this.get("style")?.header?.fontSize || 12) : 0, n = this.get("size"), r = n?.width || 0;
    if (e + 35 > r) {
      this.resize(e + 35, n?.height || 100);
      return;
    }
    this.updateSizeByContent();
  }
  setStyle(t) {
    this.set("style", t);
  }
  setValues(t) {
    this.set("values", t);
  }
  buildPortItems(t = {}) {
    const e = [], n = this.get("inputs") || [], r = this.get("outputs") || [], i = this.get("style") || {}, s = i.header?.height ?? 24, o = i.ports?.layout?.rowHeight ?? 20, a = i.ports?.layout?.gap ?? 8, c = i.ports?.layout?.top ?? 0;
    for (const [u, h] of n.entries())
      h.type !== "spacer" && e.push({
        ...this.buildPortItem(h, "in"),
        id: h.id,
        group: "in",
        args: { y: s + u * o + (u + 1) * a + o / 2 + c }
      });
    for (const [u, h] of r.entries())
      h.type !== "spacer" && e.push({
        ...this.buildPortItem(h, "out"),
        id: h.id,
        group: "out",
        args: { y: s + u * o + (u + 1) * a + o / 2 + c }
      });
    this.startBatch("update-ports"), this.prop(["ports", "items"], e, {
      ...t,
      rewrite: !0
    }), this.stopBatch("update-ports"), this.updateSizeByContent();
  }
  buildPortItem(t, e) {
    const n = this.get("style") || {}, r = n.ports?.layout?.rowHeight ?? 20, i = e === "in", s = i ? n.ports?.input : n.ports?.output, o = s?.label?.fontSize ?? 12, a = s?.label?.color ?? "#fff", c = this.get("ports")?.groups?.in.attrs?.portLabel?.x || 12, u = i ? Pn(t.label || "", o) : 0;
    let h = t.showPort !== !1;
    t.type === "select" && t.showPort !== !0 && (h = !1);
    const l = {
      height: r,
      attrs: {
        portLabel: { text: t.label || "" },
        portForm: {
          x: c + u + 4,
          y: -r / 2,
          width: n.ports?.input?.editor?.box?.width || 80,
          height: r
        },
        portFormSvg: { transform: `translate(${c + u + 4}, ${-r / 2})` },
        portFormWrap: { style: {
          textAlign: i ? "left" : "right",
          fontSize: o + "px",
          color: a
        } },
        field: { name: t.name }
      }
    }, d = i ? this.renderFormWrap(t) : "";
    return l.markup = gd`
      ${h ? iv(t.type) : ""}
      <text @selector='portLabel' />
      ${d || ""}
    `, l;
  }
  renderFormWrap(t) {
    if (!(t.showInput !== !1)) return "";
    const n = this.get("style") || {}, r = this.get("values") || {};
    switch (t.type) {
      case "string":
        return ov(t, n, r);
      case "number":
        return av(t, n, r);
      case "select":
        return cv(t, n, r);
      case "boolean":
        return lv(t, n, r);
      default:
        return "";
    }
  }
  updateSizeByContent() {
    const t = this.getPorts(), e = this.get("style") || {}, n = this.get("title") || "", r = this.get("nodeType") || "", i = e.header?.fontSize ?? 12, s = t.filter((R) => R.group === "in"), o = t.filter((R) => R.group === "out"), a = s.length > o.length ? s.length : o.length, c = e.header?.height ?? 24, u = e.ports?.layout?.rowHeight ?? 20, h = e.ports?.layout?.gap ?? 8, l = e.ports?.layout?.top ?? 0, d = e.ports?.layout?.bottom ?? 20, g = e.ports?.input?.editor?.box?.width || 0;
    let v = a > 0 ? a * u + (a + 1) * h : 0;
    r === "switch" && (v += u * 0.3 + h);
    const y = n.length > 0 ? Pn(n, i) : 0, w = s.length > 0 ? Math.max(...s.map((R) => {
      const f = R.attrs?.portLabel?.text ?? "", p = R.markup || [], m = e.ports?.input?.label?.fontSize || 12, S = p.some((_) => _.selector === "portForm") ? g + 8 : 0;
      return (f.length > 0 ? Pn(f, m) : 0) + 25 + S;
    })) : 0, x = o.length > 0 ? Math.max(...o.map((R) => {
      const f = R.attrs?.portLabel?.text ?? "", p = e.ports?.output?.label?.fontSize || 12;
      return (f.length > 0 ? Pn(f, p) : 0) + 25;
    })) : 0, P = 120, L = Math.max(60, c + v + l + d), I = Math.max(P, y + 35, w + x + 14);
    this.resize(I, L);
  }
};
function iv(t) {
  switch (t) {
    case "exec":
      return `
      <path @selector='portBody' d="${sv(12, 12)}" />
      <title>${t}</title>`;
    default:
      return `<circle @selector="portBody" r="6" />
      <title>${t}</title>`;
  }
}
function sv(t, e) {
  const n = Math.max(t * 0.4, 0), r = t / 2, i = e / 2;
  return [
    `M${0 - r},${0 - i}`,
    `L${t - n - r},${0 - i}`,
    `L${t - r},${e / 2 - i}`,
    `L${t - n - r},${e - i}`,
    `L${0 - r},${e - i} Z`
  ].join(" ");
}
function ov(t, e, n) {
  const r = e.ports?.input?.editor?.box, i = e.ports?.layout?.rowHeight ?? 20, s = bs`
    outline: none;
    padding-left: 4px;
    padding-right: 4px;
    box-sizing: border-box;
    width: 100%;
    height: 22px;
    line-height: 22px;
    border: none;
    background: ${r?.background ?? "transparent"};
    color: ${r?.color ?? "#fff"};
    font-size: ${r?.fontSize ?? 12}px;
    border: 1px solid ${r?.borderColor ?? "rgba(255, 255, 255, 0.2)"};
    border-radius: ${r?.borderRadius ?? 4}px;
  `;
  return `
    <foreignObject @selector="portForm">
      <div @selector="portFormWrap"
        xmlns="http://www.w3.org/1999/xhtml"
        style="width:100%; height:100%;line-height: ${i - 2}px;">
          <input @selector="field"
            xmlns="http://www.w3.org/1999/xhtml"
            type="text"
            style="${s}"
            value="${n[t.name] || ""}"
            />
      </div>
    </foreignObject>
  `;
}
function av(t, e, n) {
  const r = e.ports?.input?.editor?.box, i = e.ports?.layout?.rowHeight ?? 20, s = bs`
    outline: none;
    padding-left: 4px;
    padding-right: 4px;
    box-sizing: border-box;
    width: 100%;
    height: 22px;
    line-height: 22px;
    border: none;
    background: ${r?.background ?? "transparent"};
    color: ${r?.color ?? "#fff"};
    font-size: ${r?.fontSize ?? 12}px;
    border: 1px solid ${r?.borderColor ?? "rgba(255, 255, 255, 0.2)"};
    border-radius: ${r?.borderRadius ?? 4}px;
  `;
  return `
    <foreignObject @selector="portForm">
      <div @selector="portFormWrap"
        xmlns="http://www.w3.org/1999/xhtml"
        style="width:100%; height:100%;line-height: ${i - 2}px;">
          <input @selector="field"
            xmlns="http://www.w3.org/1999/xhtml"
            type="text"
            style="${s}"
            value="${n[t.name] || ""}"
            />
        <svg width="12" height="20" style="position:absolute; right:2px; top:0;" viewBox="0 0 12 20">
          <rect width="12" height="11" y="0" fill="transparent" cursor="pointer" @selector="upArrow" />
          <rect width="12" height="11" y="11" fill="transparent" cursor="pointer" @selector="downArrow" />
          <path d="M2 8 L6 4 L10 8" stroke="currentColor" stroke-width="1.2" fill="transparent" pointer-events="none" />
          <path d="M2 3 L6 7 L10 3" stroke="currentColor" stroke-width="1.2" fill="transparent" pointer-events="none" transform="translate(0,11)" />
        </svg>
      </div>
    </foreignObject>
  `;
}
function cv(t, e, n) {
  const r = e.ports?.input?.editor?.box, i = e.ports?.layout?.rowHeight ?? 20, s = bs`
    outline: none;
    padding-left: 4px;
    padding-right: 16px;
    box-sizing: border-box;
    width: 100%;
    height: 22px;
    line-height: 22px;
    border: none;
    background: ${r?.background ?? "transparent"};
    color: ${r?.color ?? "#fff"};
    font-size: ${r?.fontSize ?? 12}px;
    border: 1px solid ${r?.borderColor ?? "rgba(255, 255, 255, 0.2)"};
    border-radius: ${r?.borderRadius ?? 4}px;
    cursor: pointer;
  `, o = n[t.name], c = (t._options || []).find((u) => u.value === o)?.label || "";
  return `
    <foreignObject @selector="portForm">
      <div @selector="portFormWrap"
        xmlns="http://www.w3.org/1999/xhtml"
        style="width:100%; height:100%;line-height: ${i - 2}px;">
          <input @selector="field"
            xmlns="http://www.w3.org/1999/xhtml"
            type="text"
            title="${c || ""}"
            style="${s}"
            value="${c || ""}"
            />
          <svg width="12" height="12" style="position:absolute; right:4px; top:6px; pointer-events:none;" viewBox="0 0 12 12">
            <path d="M2 4 L6 8 L10 4" stroke="currentColor" stroke-width="1.5" fill="transparent" />
          </svg>
      </div>
    </foreignObject>
    `;
}
function lv(t, e, n) {
  return `
    <g @selector="portFormSvg">
      <rect
        @selector="field"
        xmlns="http://www.w3.org/2000/svg"
        x="0" y="4"
        width="16" height="16"
        rx="${e.ports?.input?.editor?.box?.borderRadius ?? 3}"
        ry="${e.ports?.input?.editor?.box?.borderRadius ?? 3}"
        fill="${n[t.name] ? e.ports?.input?.editor?.box?.background ?? "#ff6666" : "transparent"}"
        stroke="${e.ports?.input?.editor?.box?.borderColor ?? "rgba(255, 255, 255, 0.2)"}"
        stroke-width="1"
        cursor="pointer"
      />
      <polyline
        points="4,11 7,14 12,8"
        fill="none"
        cursor="pointer"
        stroke="${e.ports?.input?.editor?.box?.color ?? "#fff"}"
        stroke-width="1"
        visibility="${n[t.name] ? "visible" : "hidden"}"
      />
    </g>
  `;
}
var uv = class extends _n {
  highlightedPorts = /* @__PURE__ */ new Set();
  dropdownElMap = /* @__PURE__ */ new Map();
  currentlyOpenDropdown = null;
  initialize(...t) {
    this.paper?.el.addEventListener("click", this.hideDropdown), super.initialize(...t), this.listenTo(this.model, "change:title", this.refreshTitle), this.listenTo(this.model, "change:inputs change:outputs", this.applyPortHighlights);
  }
  onRender() {
    this.paper?.el.removeEventListener("click", this.otherClick), this.paper?.el.addEventListener("click", this.otherClick), (this.model.get("inputs") || []).forEach((n) => {
      const r = this.findPortNode(n.id, "field");
      if (r)
        if (n.type === "boolean") r.addEventListener("click", this.updateFieldValue(n.type));
        else if (n.type === "select")
          this.createDropdown(n.id, n.name, n._options), r.addEventListener("focus", this.showDropdown), r.addEventListener("input", this.filterDropdown);
        else if (n.type === "number") {
          r.addEventListener("input", this.validateNumber(!1)), r.addEventListener("blur", this.validateNumber(!0));
          const i = this.findPortNode(n.id, "upArrow"), s = this.findPortNode(n.id, "downArrow");
          i?.addEventListener("click", () => {
            const o = this.findPortNode(n.id, "field");
            o.value = String(Number(o.value || 0) + 1), o.dispatchEvent(new Event("blur"));
          }), s?.addEventListener("click", () => {
            const o = this.findPortNode(n.id, "field");
            o.value = String(Number(o.value || 0) - 1), o.dispatchEvent(new Event("blur"));
          }), r.addEventListener("input", this.updateFieldValue(n.type));
        } else n.type === "string" && r.addEventListener("input", this.updateFieldValue(n.type));
    });
    const e = this.findNode("switch-plus-rect");
    e && e.addEventListener("click", (n) => {
      n.stopPropagation(), this.model.graph.trigger("node:switch:add-case", this.model);
    });
  }
  otherClick = (t) => {
    const e = t.target;
    e.tagName === "INPUT" || e.tagName === "TEXTAREA" || e.getAttribute("role") === "option" || this.currentlyOpenDropdown && this.hideDropdown();
  };
  createDropdown(t, e, n) {
    const i = (this.model.get("style") || {}).ports?.input?.editor?.dropdown || {};
    if (this.dropdownElMap.delete(e), !n || n.length === 0) return;
    const s = document.createElement("div");
    s.addEventListener("wheel", (o) => {
      o.stopPropagation(), o.preventDefault();
    }), s.classList.add("bpgraph-node-dropdown"), s.style.cssText = `
      background: ${i.background || "#222"};
      border: 1px solid ${i.borderColor || "rgba(120, 130, 140, 0.3)"};
      color: ${i.color || "#fff"};
      border-radius: ${i.borderRadius || 4}px;
      z-index: 9999;
      font-size: 12px;
      max-height: 200px;
      overflow: auto;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      position: absolute;
    `, n.forEach((o) => {
      const a = document.createElement("div");
      a.classList.add("bpgraph-node-dropdown-option"), a.setAttribute("style", `
            padding: 2px 4px;
            cursor: pointer;
          `), a.setAttribute("data-value", o.value), a.textContent = o.label, a.addEventListener("click", (c) => {
        c.preventDefault(), c.stopPropagation(), this.setInputValue(e, c.target.dataset.value), this.findPortNode(t), this.hideDropdown();
        const u = this.findPortNode(t, "field");
        u && (u.value = c.target.textContent || ""), u.title = String(u.value);
      }), s.appendChild(a);
    }), this.dropdownElMap.set(e, s);
  }
  updateOptions(t, e, n) {
    const r = this.dropdownElMap.get(e);
    r && (r.innerHTML = "", n.forEach((i) => {
      const s = document.createElement("div");
      s.classList.add("bpgraph-node-dropdown-option"), s.setAttribute("style", `
            padding: 2px 4px;
            cursor: pointer;
          `), s.setAttribute("data-value", i.value), s.textContent = i.label, s.addEventListener("click", (o) => {
        o.preventDefault(), o.stopPropagation(), this.setInputValue(e, o.target.dataset.value), this.findPortNode(t), this.hideDropdown();
        const a = this.findPortNode(t, "field");
        a && (a.value = o.target.textContent || ""), a.title = String(a.value);
      }), r.appendChild(s);
    }));
  }
  showDropdown = (t) => {
    this.currentlyOpenDropdown && this.hideDropdown();
    const e = t.target, n = e.getAttribute("name");
    if (!n) return;
    const r = this.dropdownElMap.get(n);
    if (!r) return;
    const i = e.getBoundingClientRect();
    r.style.minWidth = `${i.width}px`, r.style.top = `${i.bottom + 4}px`, r.style.left = `${i.left}px`, this.currentlyOpenDropdown = n, this.paper?.el.appendChild(r);
  };
  hideDropdown = () => {
    const t = this.currentlyOpenDropdown;
    if (document.activeElement && document.activeElement.getAttribute("name") === t) return;
    const e = this.dropdownElMap.get(t || "");
    this.currentlyOpenDropdown = null, e && this.paper?.el.removeChild(e);
  };
  filterDropdown = (t) => {
    const e = t.target, n = e.getAttribute("name");
    if (!n) return;
    const r = this.dropdownElMap.get(n);
    if (!r) return;
    const s = e.value.toLowerCase().split("").map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*"), o = new RegExp(s, "i");
    Array.from(r.children).forEach((a) => {
      const c = a, u = c.textContent || "";
      o.test(u) ? c.style.display = "block" : c.style.display = "none";
    });
  };
  renderMarkup() {
    super.renderMarkup();
    const t = this.findNode("base-node-title");
    return t && hv(t, this.model), this;
  }
  validateNumber(t = !1) {
    return (e) => {
      const n = e.target, r = n.value;
      if (t) {
        if (r) {
          const i = Number(n.value);
          if (isNaN(i)) n.style.borderColor = "red";
          else {
            const o = (this.model.get("style") || {}).ports?.input?.editor?.box || {};
            n.style.borderColor = o.borderColor || "";
          }
        }
      } else if (r) {
        const i = r.replace(/[^\d.-]/g, "");
        i !== r && (n.value = i);
      }
    };
  }
  updateFieldValue(t) {
    return (e) => {
      const n = e.target, r = this.model.get("values") || {}, i = n.getAttribute("name");
      if (!i) return;
      let s = n.value;
      t === "number" ? s = n.value ? Number(n.value) : NaN : t === "boolean" && (s = !r[i]), n.title = String(s), this.setInputValue(i, s);
    };
  }
  setInputValue(t, e) {
    this.model.set("values", {
      ...this.model.get("values"),
      [t]: e
    }), this.model.graph.trigger("node:values:changed", this, t, e);
  }
  applyPortHighlights() {
    requestAnimationFrame(() => {
      setTimeout(() => {
        this._applyPortHighlights();
      }, 0);
    });
  }
  _applyPortHighlights() {
    const e = this.model.getPorts().map((r) => r.id), n = [];
    for (const r of this.highlightedPorts) {
      if (!e.includes(r)) {
        n.push(r);
        continue;
      }
      this.highlightPort(r);
    }
    for (const r of n)
      this.highlightedPorts.delete(r), this.unhighlightPort(r);
  }
  refreshTitle() {
    const t = this.findNode("base-node-title");
    if (t) {
      const e = this.model.get("title") || "", n = t.querySelector("text");
      n && (n.textContent = e);
    }
  }
  refreshDomValue(t, e = 0) {
    const n = this.model.get("values") || {}, i = (this.model.get("inputs") || []).find((a) => a.name === t);
    if (!i) return;
    const s = this.findPortNode(i.id, "field");
    if (e < 10 && requestAnimationFrame(() => {
      setTimeout(() => {
        this.refreshDomValue(t, e + 1);
      }, 0);
    }), !s) return;
    let o = n[i.name];
    switch (i.type) {
      case "string":
        if (typeof o != "string") return;
        break;
      case "number":
        if (typeof o != "number") return;
        o = isNaN(o) ? s.value : String(o);
        break;
      case "boolean":
        if (s instanceof SVGElement) {
          const a = s.parentNode?.children[1];
          if (!a) return;
          a.setAttribute("visibility", o ? "visible" : "hidden");
          return;
        }
        return;
      case "select":
        if (typeof o != "string") return;
        o = i._options?.find((a) => a.value === o)?.label || "";
        break;
    }
    s.value !== o && (s.value = o, s.title = String(o));
  }
  highlightPort(t, e = 0) {
    this.highlightedPorts.has(t) || this.highlightedPorts.add(t);
    const n = this.findPortNode(t, "portBody");
    if (n) {
      const r = this.model.get("style") || {}, i = (t.startsWith("in-") ? r.ports?.input : r.ports?.output) || {}, s = i.port?.highlightFill || "rgba(255, 255, 255, 0.8)", o = i.port?.highlightStroke || "rgba(255, 255, 255, 1)", a = i.port?.highlightStrokeWidth ?? 1;
      n.setAttribute("fill", s), n.setAttribute("stroke", o), n.setAttribute("stroke-width", String(a));
    } else e < 10 && requestAnimationFrame(() => {
      setTimeout(() => {
        this.highlightPort(t, e + 1);
      }, 0);
    });
  }
  unhighlightPort(t) {
    const e = this.findPortNode(t, "portBody");
    if (e) {
      const n = this.model.get("style") || {}, r = (t.startsWith("in-") ? n.ports?.input : n.ports?.output) || {}, i = r.port?.fill || "rgba(255, 255, 255, 0.5)", s = r.port?.stroke || "rgba(255, 255, 255, 0.8)", o = r.port?.strokeWidth ?? 1;
      e.setAttribute("fill", i), e.setAttribute("stroke", s), e.setAttribute("stroke-width", String(o));
    }
  }
};
function hv(t, e) {
  const n = e.get("title") || "", r = e.size(), i = e.get("attrs") || {}, s = i["base-node-body"]?.rx ?? 4, o = i["base-node-body"]?.ry ?? 4, a = e.get("style") || {}, c = a.header?.height ?? 24, u = a.header?.fontSize ?? 12, h = a.header?.title?.y ?? 0, l = a.header?.title?.x ?? 0, d = a.header?.textAlign ?? "left", g = B("path", {
    d: `
      M0,${c}
      L0,${o}
      Q0,0 ${s},0
      L${r.width - s},0
      Q${r.width},0 ${r.width},${o}
      L${r.width},${c}
      Z
    `,
    fill: a.header?.background ?? "#373C44"
  }).node, v = d === "left" ? "start" : d === "right" ? "end" : "middle";
  let y = 0;
  switch (d) {
    case "left":
      y = 10;
      break;
    case "right":
      y = r.width - 10;
      break;
    case "center":
      y = r.width / 2;
      break;
  }
  const w = B("text", {
    x: y + l,
    y: c / 2 + u / 2 - 3 + h,
    fill: "#fff",
    fontSize: u,
    textAnchor: v
  }).node;
  w.textContent = n, t.appendChild(g), t.appendChild(w);
}
var fv = class extends Hr {
  _viewport = {
    x: 0,
    y: 0,
    scale: 1
  };
  _isDragging = !1;
  _lastClientX = 0;
  _lastClientY = 0;
  _spacePressed = !1;
  static ZOOM_SENSITIVITY = 5e-3;
  get isDragging() {
    return this._isDragging;
  }
  get viewport() {
    return this._viewport;
  }
  get scale() {
    return this._viewport.scale;
  }
  set scale(e) {
    this._viewport.scale = e, this.updatePaperTransform();
  }
  get position() {
    return {
      x: this._viewport.x,
      y: this._viewport.y
    };
  }
  set position(e) {
    this._viewport.x = e.x, this._viewport.y = e.y, this.updatePaperTransform();
  }
  startListening() {
    const [{ paper: e }] = this.callbackArguments;
    e.el.addEventListener("keydown", this.onKeyDown), e.el.addEventListener("keyup", this.onKeyUp), e.el.addEventListener("selectstart", this.onSelectStart), this.initPaperEvents();
  }
  initPaperEvents() {
    const [{ paper: e }] = this.callbackArguments, n = e.el;
    n.addEventListener("mousedown", this.onMouseDown), n.addEventListener("mousemove", this.onMouseMove), n.addEventListener("mouseup", this.onMouseUp), e.el.addEventListener("selectstart", this.onSelectStart), n.addEventListener("wheel", this.onMouseWheel, { passive: !0 });
  }
  onKeyDown = (e) => {
    const [{ paper: n }] = this.callbackArguments;
    e.target === n.el && e.code === "Space" && (this._spacePressed = !0, n.el.style.cursor = "grab");
  };
  onKeyUp = (e) => {
    const [{ paper: n }] = this.callbackArguments;
    e.code === "Space" && (this._spacePressed = !1, n.el.style.cursor = "");
  };
  onMouseDown = (e) => {
    const [{ paper: n }] = this.callbackArguments, r = n.el;
    (e.button === 0 && this._spacePressed || e.button === 2 && !this._spacePressed) && (e.stopPropagation(), e.preventDefault(), this._isDragging = !0, this._lastClientX = e.clientX, this._lastClientY = e.clientY, r.style.cursor = "grabbing");
  };
  onMouseMove = (e) => {
    const [{ paper: n, graph: r }] = this.callbackArguments;
    if (!this.isDragging) return;
    const i = e.clientX - this._lastClientX, s = e.clientY - this._lastClientY;
    this._viewport.x += i, this._viewport.y += s, n.translate(this._viewport.x, this._viewport.y), r.emit("viewport:change", this._viewport), this._lastClientX = e.clientX, this._lastClientY = e.clientY;
  };
  onMouseUp = () => {
    const [{ paper: e }] = this.callbackArguments;
    this.isDragging && (this._isDragging = !1, this._spacePressed ? e.el.style.cursor = "grab" : e.el.style.cursor = "");
  };
  onMouseWheel = (e) => {
    const [{ paper: n, graph: r }] = this.callbackArguments;
    if (this.isDragging) return;
    const i = n.el.getBoundingClientRect(), s = {
      x: e.clientX - i.left,
      y: e.clientY - i.top
    }, o = n.clientToLocalPoint(s);
    this.viewport.scale += e.deltaY * -5e-3, this.viewport.scale = Math.min(Math.max(0.2, this.viewport.scale), 5), n.scale(this.viewport.scale, this.viewport.scale);
    const a = n.clientToLocalPoint(s);
    this.viewport.x += (a.x - o.x) * this.viewport.scale, this.viewport.y += (a.y - o.y) * this.viewport.scale, n.translate(this.viewport.x, this.viewport.y), n.setGridSize(10 / this.viewport.scale), r.emit("viewport:change", this._viewport);
  };
  updatePaperTransform() {
    const [{ paper: e }] = this.callbackArguments;
    e.scale(this.viewport.scale, this.viewport.scale), e.translate(this.viewport.x, this.viewport.y), e.setGridSize(10 / this.viewport.scale);
  }
  onSelectStart = (e) => {
    this.isDragging && e.preventDefault();
  };
  stopListening() {
    super.stopListening();
    const [{ paper: e }] = this.callbackArguments, n = e.el;
    n.removeEventListener("mousedown", this.onMouseDown), n.removeEventListener("mousemove", this.onMouseMove), n.removeEventListener("mouseup", this.onMouseUp), e.el.removeEventListener("selectstart", this.onSelectStart), n.removeEventListener("wheel", this.onMouseWheel), e.el.removeEventListener("keydown", this.onKeyDown), e.el.removeEventListener("keyup", this.onKeyUp);
  }
}, dv = class yr extends Hr {
  rect;
  startPoint;
  pointerDownTime = 0;
  hasMovedEnough = !1;
  static MIN_MOVE_DISTANCE = 3;
  static MIN_PRESS_DURATION = 100;
  startListening() {
    const [{ paper: e }] = this.callbackArguments;
    this.listenTo(e, "blank:pointerdown", this.onPointerDown, this), this.listenTo(e, "blank:pointermove", this.onPointerMove, this), this.listenTo(e, "blank:pointerup", this.onPointerUp, this);
  }
  onPointerDown({ paper: e }, n) {
    const r = n.clientX, i = n.clientY, s = e.clientToLocalPoint(r, i);
    this.startPoint = e.localToPagePoint(s.x, s.y), this.pointerDownTime = Date.now(), this.hasMovedEnough = !1;
  }
  onPointerMove({ paper: e, className: n }, r) {
    if (!this.startPoint) return;
    const i = r.clientX, s = r.clientY, o = e.clientToLocalPoint(i, s), a = e.localToPagePoint(o.x, o.y), c = Math.abs(a.x - this.startPoint.x), u = Math.abs(a.y - this.startPoint.y), h = c > yr.MIN_MOVE_DISTANCE || u > yr.MIN_MOVE_DISTANCE;
    if (!this.hasMovedEnough && h && Date.now() - (this.pointerDownTime ?? 0) > yr.MIN_PRESS_DURATION && (this.rect = B("rect", {
      x: this.startPoint.x,
      y: this.startPoint.y,
      width: 1,
      height: 1,
      class: n ?? "",
      stroke: "#3498db",
      "stroke-width": 1,
      fill: "rgba(52,152,219,0.15)"
    }).node, e.svg.appendChild(this.rect), this.hasMovedEnough = !0), this.rect && this.hasMovedEnough) {
      const l = Math.min(this.startPoint.x, a.x), d = Math.min(this.startPoint.y, a.y), g = Math.max(this.startPoint.x, a.x), v = Math.max(this.startPoint.y, a.y);
      B(this.rect).attr({
        x: l,
        y: d,
        width: g - l,
        height: v - d
      });
    }
  }
  onPointerUp({ paper: e, onSelected: n }, r) {
    if (!this.rect || !this.startPoint) return;
    const i = r.clientX, s = r.clientY, o = e.clientToLocalPoint(i, s), a = e.pageToLocalPoint(this.startPoint.x, this.startPoint.y), c = Math.min(a.x, o.x), u = Math.min(a.y, o.y), h = Math.max(a.x, o.x), l = Math.max(a.y, o.y), d = new j(c, u, h - c, l - u), g = e.model.getElements(), v = e.model.getLinks(), y = g.filter((x) => d.intersect(x.getBBox())), w = v.filter((x) => {
      const P = e.findViewByModel(x);
      if (!P) return !1;
      const T = P.findNode("line");
      return T ? gv(T, d) : !1;
    });
    n([...y, ...w]), this.rect.remove(), this.rect = void 0, this.startPoint = void 0;
  }
};
function gv(t, e) {
  const n = t.getTotalLength(), r = 5;
  for (let i = 0; i <= n; i += r) {
    const s = t.getPointAtLength(i);
    if (s.x >= e.x && s.x <= e.x + e.width && s.y >= e.y && s.y <= e.y + e.height) return !0;
  }
  return !1;
}
var pv = class extends Hr {
  rect;
  cells = [];
  nodes = [];
  dragStartPoint;
  dragStartClientPoint;
  cellsStartPositions = /* @__PURE__ */ new Map();
  rectStartPos;
  moveNodes = [];
  startListening() {
    const [{ paper: t }] = this.callbackArguments;
    this.listenTo(t, "element:pointerdown", this.onElementPointerDown, this), this.listenTo(t, "element:pointerup", this.onElementPointerUp, this), this.listenTo(t, "element:pointermove", this.onElementPointerMove, this), this.listenTo(t, "scale", this.onScale, this), this.listenTo(t, "translate", this.onTranslate, this);
  }
  onScale() {
    this.cells.length <= 1 || (this.clearGroupEffect(), this.drawGroupEffect());
  }
  onTranslate() {
    this.cells.length <= 1 || (this.clearGroupEffect(), this.drawGroupEffect());
  }
  onElementPointerDown({ paper: t, adapter: e }, n) {
    n.model.isElement() && (this.dragStartPoint = {
      x: n.model.position().x,
      y: n.model.position().y
    }, this.moveNodes = [n.model], this.rectStartPos = void 0, this.nodes.includes(n.model) && (this.moveNodes = this.nodes, this.rectStartPos = {
      x: this.rect ? parseFloat(this.rect.getAttribute("x") || "0") : 0,
      y: this.rect ? parseFloat(this.rect.getAttribute("y") || "0") : 0
    }, this.dragStartClientPoint = t.localToClientPoint(this.dragStartPoint.x, this.dragStartPoint.y)), this.moveNodes.forEach((r) => {
      if (!r.isElement()) return;
      this.cellsStartPositions.set(r.id, r.position());
      const i = e.cellsMap.get(r.id)?.cell;
      !i || !("position" in i) || e.graph.emit("node:dragstart", i);
    }));
  }
  onElementPointerMove({ adapter: t, paper: e }, n) {
    if (!this.moveNodes.length || !this.dragStartPoint) return;
    const r = n.model.position(), i = e.localToClientPoint(r.x, r.y), s = i.x - (this.dragStartClientPoint?.x ?? 0), o = i.y - (this.dragStartClientPoint?.y ?? 0), a = r.x - (this.dragStartPoint?.x ?? 0), c = r.y - (this.dragStartPoint?.y ?? 0);
    this.moveNodes.forEach((u) => {
      const h = t.cellsMap.get(u.id)?.cell;
      if (u.id !== n.model.id) {
        const l = this.cellsStartPositions.get(u.id);
        u.position(l.x + a, l.y + c);
      }
      if (h && "position" in h) {
        const l = t.getElementBBox(n);
        h._bbox = l, t.graph.emit("node:dragmove", h);
      }
    }), this.rect && this.rectStartPos && (this.rect.setAttribute("x", String(this.rectStartPos.x + s)), this.rect.setAttribute("y", String(this.rectStartPos.y + o)));
  }
  onElementPointerUp({ adapter: t, paper: e }, n) {
    if (!this.moveNodes.length) return;
    const r = this.dragStartPoint;
    if (this.dragStartPoint = void 0, !r) return;
    const i = n.model.position(), s = i.x - (r?.x ?? 0), o = i.y - (r?.y ?? 0), a = e.localToClientPoint(i.x, i.y), c = a.x - (this.dragStartClientPoint?.x ?? 0), u = a.y - (this.dragStartClientPoint?.y ?? 0);
    (i.x !== r.x || i.y !== r.y) && (t.graph.startTransaction(), this.moveNodes.forEach((h) => {
      const l = this.cellsStartPositions.get(h.id);
      h.position(l.x + s, l.y + o);
      const d = t.cellsMap.get(h.id)?.cell;
      if (d && "position" in d) {
        d.position = {
          x: l.x + s,
          y: l.y + o
        };
        const g = t.getElementBBox(n);
        d._bbox = g, t.graph.emit("node:dragend", d);
      }
    }), t.graph.commitTransaction(), this.rect && this.rectStartPos && (this.rect.setAttribute("x", String(this.rectStartPos.x + c)), this.rect.setAttribute("y", String(this.rectStartPos.y + u))), this.rectStartPos = void 0, this.moveNodes = [], this.cellsStartPositions.clear());
  }
  groupCells(t) {
    this.cells = t, this.nodes = t.filter((e) => e.isElement()), this.updateGroupEffect(), this.updateCellsHighlight();
  }
  ungroupCells(t) {
    this.cells = this.cells.filter((e) => !t.includes(e)), this.nodes = this.cells.filter((e) => e.isElement()), this.updateGroupEffect(), this.updateCellsHighlight();
  }
  clearGroups() {
    this.cells = [], this.nodes = [], this.updateGroupEffect(), this.updateCellsHighlight();
  }
  updateCellsHighlight() {
    const [{ adapter: t }] = this.callbackArguments;
    t.joint.clearHighlights(), t.joint.highlightCells(this.cells);
  }
  drawGroupEffect() {
    const t = this.calculateBoundingBox(), [{ paper: e }] = this.callbackArguments;
    this.rect || (this.rect = B("rect", {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      class: "selection-effect",
      stroke: "#3c3ce7ff",
      "stroke-width": 2,
      fill: "rgba(60, 60, 60, 0.15)",
      rx: 4,
      ry: 4,
      "pointer-events": "none"
    }).node, e.svg.appendChild(this.rect)), this.rect.setAttribute("x", String(t.x - 10)), this.rect.setAttribute("y", String(t.y - 10)), this.rect.setAttribute("width", String(t.width + 20)), this.rect.setAttribute("height", String(t.height + 20));
  }
  updateGroupEffect() {
    this.nodes.length > 1 ? this.drawGroupEffect() : this.clearGroupEffect();
  }
  clearGroupEffect() {
    this.rect && (this.rect.remove(), this.rect = void 0);
  }
  calculateBoundingBox() {
    let t = 1 / 0, e = 1 / 0, n = -1 / 0, r = -1 / 0;
    const [{ paper: i }] = this.callbackArguments;
    return this.nodes.forEach((s) => {
      const o = i.localToPaperRect(s.getBBox());
      t = Math.min(t, o.x), e = Math.min(e, o.y), n = Math.max(n, o.x + o.width), r = Math.max(r, o.y + o.height);
    }), {
      x: t,
      y: e,
      width: n - t,
      height: r - e
    };
  }
};
Fe.classNamePrefix = "bpgraph-";
const fl = {
  BlueprintNode: hl,
  BlueprintNodeView: uv
}, vv = {
  custom: fl,
  standard: Uc
};
var mv = class {
  graph;
  paper;
  scrollerController;
  selectionController;
  groupEffectController;
  adapter;
  constructor(t, e) {
    this.adapter = t, this.graph = new ys({}), this.paper = new ur({
      model: this.graph,
      cellViewNamespace: vv,
      frozen: !1,
      async: !0,
      clickThreshold: 5,
      snapLinks: { radius: 20 },
      linkPinning: !1,
      preventDefaultViewAction: !1,
      preventDefaultBlankAction: !1,
      sorting: ur.sorting.APPROX,
      interactive: function(n) {
        return n.model.isElement();
      },
      defaultAnchor: (n, r, ...i) => (n.findAttribute("port-group", r) === "in" ? cl : ll)(n, r, ...i),
      defaultConnectionPoint: { name: "anchor" },
      defaultConnector: (n, r, i, s, o) => {
        const c = o.model.get("source").port, u = c?.startsWith("in-"), h = c?.startsWith("out-");
        return u ? (s.sourceDirection = Ae.TangentDirections.LEFT, s.targetDirection = Ae.TangentDirections.RIGHT) : h && (s.sourceDirection = Ae.TangentDirections.RIGHT, s.targetDirection = Ae.TangentDirections.LEFT), Ae(n, r, i, s, o);
      },
      validateMagnet: () => (this.adapter.graph.emit("start:connecting"), !0),
      defaultLink: () => new Pi({ attrs: { line: {
        strokeWidth: this.adapter.graph.nodeRegistry.linkStyle.strokeWidth || 1,
        stroke: this.adapter.graph.nodeRegistry.linkStyle.stroke || "rgba(255,255,255,0.5)",
        targetMarker: { type: "none" }
      } } }),
      validateConnection: (n, r, i, s) => {
        if (n === i || i.model.isLink()) return !1;
        const a = n.findAttribute("port-group", r), c = i.findAttribute("port-group", s);
        if (a === "in" && c !== "out" || a === "out" && c !== "in") return !1;
        if (n && r && s && i) {
          const u = n.findAttribute("port", r) || "", h = i.findAttribute("port", s) || "", l = u.startsWith("out-") ? n.model.get("outputs")?.find((y) => y.id === u) : n.model.get("inputs")?.find((y) => y.id === u), d = h.startsWith("in-") ? i.model.get("inputs")?.find((y) => y.id === h) : i.model.get("outputs")?.find((y) => y.id === h), g = this.adapter.findNode(n.model.id), v = this.adapter.findNode(i.model.id);
          if (l && d) return this.adapter.graph.validateConnection(g, l, v, d);
        }
        return !0;
      },
      ...e
    }), this.initialize();
  }
  initialize() {
    this.scrollerController = new fv({
      paper: this.paper,
      graph: this.adapter.graph
    }), this.selectionController = new dv({
      paper: this.paper,
      onSelected: (t) => {
        this.paper.trigger("selection:changed", t);
      }
    }), this.groupEffectController = new pv({
      adapter: this.adapter,
      paper: this.paper,
      className: "selection-rectangle"
    }), this.initializeControllers(), this.paper.on("link:connect", (t) => {
      const e = t.model.get("source"), n = t.model.get("target"), r = this.paper.findViewByModel(e.id), i = this.paper.findViewByModel(n.id), s = e.port, o = n.port;
      r && s && i && o && (r.highlightPort(s), i.highlightPort(o));
    }), this.graph.on("remove", (t) => {
      if (t.isLink()) {
        const e = t, n = e.get("source"), r = e.get("target"), i = this.paper.findViewByModel(n.id), s = this.paper.findViewByModel(r.id), o = n.port, a = r.port;
        if (!o || !a) return;
        const c = this.graph.getConnectedLinks(i.model, {
          inbound: !0,
          outbound: !0
        }), u = this.graph.getConnectedLinks(s.model, {
          inbound: !0,
          outbound: !0
        }), h = c.some((d) => d.get("source").port === o || d.get("target").port === o), l = u.some((d) => d.get("source").port === a || d.get("target").port === a);
        i && o && !h && i.unhighlightPort(o), s && a && !l && s.unhighlightPort(a);
      }
    });
  }
  initializeControllers() {
    this.paper.el && (this.scrollerController.stopListening(), this.selectionController.stopListening(), this.groupEffectController.stopListening(), this.scrollerController.startListening(), this.selectionController.startListening(), this.groupEffectController.startListening(), this.paper.el.removeEventListener("keydown", this.onKeyDown), this.paper.el.removeEventListener("keyup", this.onKeyUp), this.paper.el.addEventListener("keydown", this.onKeyDown), this.paper.el.addEventListener("keyup", this.onKeyUp));
  }
  addNode(t, e) {
    const n = t.inputs, r = t.outputs, i = new fl.BlueprintNode({
      id: t.id,
      title: t.title ?? "",
      position: {
        x: t.position?.x ?? 0,
        y: t.position?.y ?? 0
      },
      style: e ?? {},
      inputs: n,
      outputs: r,
      nodeType: t.type,
      values: { ...t.values }
    });
    return this.graph.addCell(i), i;
  }
  setContainer(t) {
    this.paper.setElement(t), this.paper.render(), this.initializeControllers();
  }
  addLink(t, e) {
    const n = new Pi({
      id: t.id,
      source: {
        id: t.source.id,
        port: t.source.port
      },
      target: {
        id: t.target.id,
        port: t.target.port
      },
      attrs: { line: {
        stroke: e?.stroke ?? "#ffffff",
        strokeWidth: e?.strokeWidth ?? 2,
        targetMarker: { type: "none" }
      } }
    }), r = n.get("source"), i = n.get("target"), s = this.paper.findViewByModel(r.id), o = this.paper.findViewByModel(i.id), a = r.port, c = i.port;
    return s && a && o && c && (s.highlightPort(a), o.highlightPort(c)), this.graph.addCell(n), n;
  }
  removeCells(t) {
    this.graph.removeCells(t), this.ungroupCells(t);
  }
  findNode(t) {
    return this.graph.getCell(t);
  }
  highlightCells(t) {
    const e = this.adapter.graph.nodeRegistry.nodeStyle, n = this.adapter.graph.nodeRegistry.linkStyle;
    t.forEach((r) => {
      if (r instanceof It) {
        const i = this.paper.findViewByModel(r);
        if (!i) return;
        tn.add(i, "base-node-body", "highlighter-selected", {
          layer: ur.Layers.FRONT,
          padding: 2,
          attrs: {
            stroke: e.highlightStroke ?? "#0077B6",
            "stroke-width": e.highlightStrokeWidth ?? 1
          }
        });
      } else if (r instanceof gn) {
        const i = this.paper.findViewByModel(r);
        if (!i) return;
        tn.add(i, "line", "highlighter-selected", {
          layer: ur.Layers.FRONT,
          padding: 2,
          attrs: {
            stroke: n.highlightStroke ?? "#0077B6",
            "stroke-width": n.highlightStrokeWidth ?? 1
          }
        });
      }
    });
  }
  unhighlightCells(t) {
    t.forEach((e) => {
      if (e instanceof It) {
        const n = this.paper.findViewByModel(e);
        if (!n) return;
        tn.remove(n);
      } else if (e instanceof gn) {
        const n = this.paper.findViewByModel(e);
        if (!n) return;
        tn.remove(n);
      }
    });
  }
  groupCells(t) {
    this.groupEffectController.groupCells(t);
  }
  ungroupCells(t) {
    this.groupEffectController.ungroupCells(t);
  }
  clearGroups() {
    this.groupEffectController.clearGroups();
  }
  clearHighlights() {
    tn.removeAll(this.paper);
  }
  destroy() {
    this.scrollerController.stopListening(), this.selectionController.stopListening(), this.groupEffectController.stopListening(), this.graph.clear(), this.paper.remove(), window.removeEventListener("keydown", this.onKeyDown), window.removeEventListener("keyup", this.onKeyUp);
  }
  clear() {
    this.graph.clear(), this.clearHighlights();
  }
  onKeyDown = (t) => {
    t.code === "Space" && this.selectionController.stopListening();
  };
  onKeyUp = (t) => {
    t.code === "Space" && this.selectionController.startListening();
  };
}, ws = class {
  listeners = {};
  /**
  * Adds an event listener for the specified event.
  * @param event The event name.
  * @param handler The event handler.
  * @returns The EventEmitter instance.
  */
  on(e, n) {
    return this.listeners[e] || (this.listeners[e] = /* @__PURE__ */ new Set()), this.listeners[e].add(n), this;
  }
  /**
  * Adds a one-time event listener for the specified event.
  * @param event The event name.
  * @param handler The event handler.
  * @returns The EventEmitter instance.
  */
  once(e, n) {
    const r = (...i) => {
      this.off(e, r), n(...i);
    };
    return this.on(e, r);
  }
  /**
  * Removes an event listener for the specified event.
  * @param event The event name.
  * @param handler The event handler.
  * @returns The EventEmitter instance.
  */
  off(e, n) {
    return this.listeners[e] ? (n ? this.listeners[e].delete(n) : delete this.listeners[e], this) : this;
  }
  /**
  * Emits an event with the specified payload.
  * @param event The event name.
  * @param payload The event payload.
  * @returns The EventEmitter instance.
  */
  emit(e, ...n) {
    if (!this.listeners[e]) return this;
    for (const r of this.listeners[e]) r(...n);
    return this;
  }
};
function Ni(t) {
  const e = [];
  for (const n of t) {
    const r = {
      position: { ...n.position },
      id: n.id,
      type: n.type,
      nodeType: n.nodeType,
      values: { ...n.values },
      inputs: n.inputs.map((i) => ({
        name: i.name,
        id: i.id
      })),
      outputs: n.outputs.map((i) => ({
        name: i.name,
        id: i.id
      }))
    };
    n.data && (r.data = n.data), n.states.title && (r.title = n.states.title), n.states.style && (r.style = n.states.style), n.subgraphId && (r.subgraphId = n.subgraphId), n.states.inputs && (r.inputs = n.states.inputs.map((i) => {
      const s = {
        id: i.id,
        name: i.name,
        type: i.type
      };
      return i.label && (s.label = i.label), Array.isArray(i.options) && (s.options = i.options ? Array.from(i.options) : void 0), i.showInput !== void 0 && (s.showInput = i.showInput), i.showPort !== void 0 && (s.showPort = i.showPort), s;
    })), n.states.outputs && (r.outputs = n.states.outputs.map((i) => {
      const s = {
        id: i.id,
        name: i.name,
        type: i.type
      };
      return i.label && (s.label = i.label), s;
    })), e.push(r);
  }
  return e;
}
function Mi(t) {
  const e = [];
  for (const n of t) {
    const r = {
      id: n.id,
      source: { ...n.source },
      target: { ...n.target }
    };
    n.style && (r.style = n.style), e.push(r);
  }
  return e;
}
function yv(t) {
  const e = {
    nodes: [],
    links: [],
    variables: [],
    subgraphs: {},
    viewport: {
      x: t.root.viewport.x,
      y: t.root.viewport.y,
      zoom: t.root.viewport.scale
    }
  }, n = t.root.nodes, r = t.root.links, i = t.variableManager.getAllVariables(), s = t.subgraphs;
  e.nodes = Ni(n);
  for (const [o, a] of s) {
    const c = a.nodes, u = a.links;
    e.subgraphs[o] = {
      nodes: Ni(c),
      links: Mi(u),
      viewport: {
        x: a.viewport.x,
        y: a.viewport.y,
        zoom: a.viewport.scale
      }
    };
  }
  for (const o of i) e.variables.push({
    name: o.name,
    type: o.type,
    value: o.value
  });
  return e.links = Mi(r), e;
}
function Ii(t, e) {
  const n = [];
  for (const r of e) {
    const i = t.createNodeInstance(r.nodeType, {
      position: { ...r.position },
      title: r.title,
      data: r.data,
      values: { ...r.values },
      id: r.id,
      style: r.style,
      subgraphId: r.subgraphId,
      inputs: r.inputs.some((s) => s.type) ? r.inputs.map((s) => ({
        ...s,
        type: s.type
      })) : void 0,
      outputs: r.outputs.some((s) => s.type) ? r.outputs.map((s) => ({
        ...s,
        type: s.type
      })) : void 0
    });
    if (!i.states.inputs) for (const s of r.inputs) {
      const o = i.inputs.find((a) => a.name === s.name);
      o && (o.id = s.id);
    }
    if (!i.states.outputs) for (const s of r.outputs) {
      const o = i.outputs.find((a) => a.name === s.name);
      o && (o.id = s.id);
    }
    n.push(i);
  }
  return n;
}
function Oi(t, e) {
  const n = [];
  for (const r of e) {
    const i = t.createLinkInstance(r);
    r.id && (i.id = r.id), r.source && (i.source = { ...r.source }), r.target && (i.target = { ...r.target }), r.style && (i.style = r.style), n.push(i);
  }
  return n;
}
function bv(t, e) {
  typeof e == "string" && (e = JSON.parse(e));
  const n = e.nodes, r = e.links, i = e.variables, s = e.subgraphs, o = Ii(t, n), a = Oi(t, r), c = {};
  for (const u in s) {
    c[u] = {
      nodes: [],
      links: [],
      viewport: {
        x: 0,
        y: 0,
        zoom: 1
      }
    };
    const h = s[u];
    c[u].nodes = Ii(t, h.nodes), c[u].links = Oi(t, h.links), c[u].viewport = {
      x: h.viewport.x,
      y: h.viewport.y,
      zoom: h.viewport.zoom
    };
  }
  return {
    nodes: o,
    links: a,
    subgraphs: c,
    variables: i,
    viewport: e.viewport
  };
}
function Jt(t, e) {
  const n = { ...t };
  for (const r in e) Array.isArray(e[r]) ? n[r] = [...e[r]] : typeof e[r] == "object" && e[r] !== null ? n[r] = Jt(t[r] ?? {}, e[r]) : n[r] = e[r];
  return n;
}
const sn = {
  mergeDeep: Jt,
  toJSON: yv,
  fromJSON: bv,
  serializeLinks: Mi,
  serializeNodes: Ni,
  deserializeLinks: Oi,
  deserializeNodes: Ii
};
function wv() {
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}
var xv = class {
  shortcuts = /* @__PURE__ */ new Map();
  enabled = !0;
  container;
  constructor(t) {
    this.container = t || document, this.container.addEventListener("keydown", this.onKeyDown);
  }
  registerShortcut(t, e) {
    const n = this.normalizeCombo(t);
    this.shortcuts.set(n, e);
  }
  unregisterShortcut(t) {
    const e = this.normalizeCombo(t);
    this.shortcuts.delete(e);
  }
  enable() {
    this.enabled = !0;
  }
  disable() {
    this.enabled = !1;
  }
  normalizeCombo(t) {
    return t.includes("mod") ? t.replace("mod", wv() ? "meta" : "ctrl").toLowerCase() : t.toLowerCase();
  }
  onKeyDown = (t) => {
    if (!this.enabled || t.target !== this.container) return;
    const e = [];
    t.ctrlKey && e.push("ctrl"), t.metaKey && e.push("meta"), t.altKey && e.push("alt"), t.shiftKey && e.push("shift"), e.push(t.key.toLowerCase());
    const n = e.join("+"), r = this.shortcuts.get(n);
    r && (t.preventDefault(), r(t));
  };
  destroy() {
    this.container.removeEventListener("keydown", this.onKeyDown), this.shortcuts.clear();
  }
}, Sv = class extends ws {
  joint;
  cellsMap = /* @__PURE__ */ new Map();
  selection = /* @__PURE__ */ new Set();
  keyboardManager;
  graph;
  jointSelection = /* @__PURE__ */ new Set();
  constructor(t, e) {
    super(), this.graph = t;
    const n = {
      el: e?.container,
      width: e?.width ?? "100%",
      height: e?.height ?? "100%",
      gridSize: e?.gridSize ?? 10,
      drawGridSize: e?.drawGrid?.size ?? 10,
      background: { color: e?.background ?? "#fff" },
      drawGrid: e?.drawGrid ? {
        color: e.drawGrid.color ?? "#bbb",
        thickness: e.drawGrid.thickness ?? 1
      } : !1
    };
    this.joint = new mv(this, n), this.initGraphEvents(), this.initializeTools();
  }
  get scale() {
    return this.joint.scrollerController.scale;
  }
  set scale(t) {
    this.joint.scrollerController.scale = t;
  }
  get position() {
    return this.joint.scrollerController.position;
  }
  set position(t) {
    this.joint.scrollerController.position = t;
  }
  initializeTools() {
    this.joint.paper.el && (this.keyboardManager && this.keyboardManager.destroy(), this.keyboardManager = new xv(this.joint.paper.el), this.initKeyboardShortcuts());
  }
  setContainer(t) {
    this.joint.setContainer(t), this.initializeTools();
  }
  select(t) {
    const e = typeof t == "string" ? t : t.id || "", n = this.cellsMap.get(e);
    if (n) {
      const r = n.cell;
      this.selection.has(r) || this.selection.add(r), this.jointSelection.has(n.jointCell) || this.jointSelection.add(n.jointCell);
    }
    this.joint.groupCells([...this.jointSelection]);
  }
  selectCollection(t) {
    this.selection.clear(), this.jointSelection.clear(), t.forEach((e) => {
      const n = this.cellsMap.get(e.id || "");
      if (n) {
        const r = n.cell;
        this.selection.has(r) || this.selection.add(r), this.jointSelection.has(n.jointCell) || this.jointSelection.add(n.jointCell);
      }
    }), this.joint.groupCells([...this.jointSelection]);
  }
  unselect(t) {
    const e = typeof t == "string" ? t : t.id || "", n = this.cellsMap.get(e);
    if (n) {
      const r = n.cell;
      this.selection.has(r) && this.selection.delete(r), this.jointSelection.has(n.jointCell) && this.jointSelection.delete(n.jointCell);
    }
    this.joint.groupCells([...this.jointSelection]);
  }
  clearSelection() {
    this.selection.clear(), this.jointSelection.clear(), this.joint.clearGroups();
  }
  addNode(t, e) {
    t.id = t.id || this.generateNodeId();
    for (const r of t.inputs || []) r.id = this.generatePortId(t.inputs, "in", r.id);
    for (const r of t.outputs || []) r.id = this.generatePortId(t.outputs, "out", r.id);
    const n = this.joint.addNode(t, e);
    t._bbox = this.getElementBBox(this.joint.paper.findViewByModel(n)), this.cellsMap.set(t.id, {
      cell: t,
      jointCell: n
    });
  }
  addLink(t, e) {
    t.id = t.id || this.generateLinkId();
    const n = this.joint.addLink(t, e);
    this.cellsMap.set(t.id, {
      cell: t,
      jointCell: n
    });
  }
  removeCells(t) {
    const e = [];
    t.forEach((n) => {
      const r = this.cellsMap.get(n.id || "");
      r && (e.push(r.jointCell), this.cellsMap.delete(n.id || ""), this.selection.delete(n), this.jointSelection.delete(r.jointCell));
    }), this.joint.removeCells(e), this.selectionChanged();
  }
  destroy() {
    this.keyboardManager?.destroy(), this.joint.destroy(), this.joint = null;
  }
  getLinks() {
    const t = [];
    return this.cellsMap.forEach(({ cell: e }) => {
      e instanceof Rt.LinkInstance && t.push(e);
    }), t;
  }
  getNodes() {
    const t = [];
    return this.cellsMap.forEach(({ cell: e }) => {
      e instanceof Rt.NodeInstance && t.push(e);
    }), t;
  }
  findNode(t) {
    const e = this.cellsMap.get(t);
    if (e && e.cell instanceof Rt.NodeInstance) return e.cell;
  }
  findLink(t) {
    const e = this.cellsMap.get(t);
    if (e && e.cell instanceof Rt.LinkInstance) return e.cell;
  }
  zoomIn() {
    this.joint.scrollerController.scale += 0.1;
  }
  zoomOut() {
    this.joint.scrollerController.scale -= 0.1;
  }
  zoom(t) {
    this.joint.scrollerController.scale = t;
  }
  resetZoom(t = 1) {
    this.joint.scrollerController.scale = t, this.joint.scrollerController.position = {
      x: 0,
      y: 0
    };
  }
  clientToGraphPoint(t, e) {
    return this.joint.paper.clientToLocalPoint(t, e);
  }
  initKeyboardShortcuts() {
    this.keyboardManager && (this.keyboardManager.registerShortcut("delete", () => {
      this.graph.deleteSelection();
    }), this.keyboardManager.registerShortcut("backspace", () => {
      this.graph.deleteSelection();
    }), this.keyboardManager.registerShortcut("mod+z", () => {
      this.graph.undoManager.undo();
    }), this.keyboardManager.registerShortcut("mod+y", () => {
      this.graph.undoManager.redo();
    }), this.keyboardManager.registerShortcut("mod+shift+z", () => {
      this.graph.undoManager.redo();
    }), this.keyboardManager.registerShortcut("mod+a", (t) => {
      t.preventDefault(), this.clearSelection();
      const e = this.getNodes(), n = this.getLinks();
      this.selectCollection([...e, ...n]), this.selectionChanged();
    }), this.keyboardManager.registerShortcut("mod+c", (t) => {
      t.target === this.graph.container && (t.preventDefault(), this.graph.copySelection());
    }), this.keyboardManager.registerShortcut("mod+v", (t) => {
      t.target === this.graph.container && (t.preventDefault(), this.graph.pasteClipboard());
    }));
  }
  generatePortId(t, e, n = "") {
    if (n)
      return n.startsWith(e + "-") || (n = e + "-" + n), n;
    const r = `${e}-${Math.random().toString(36).slice(2, 11)}`;
    return t.some((i) => i.id === r) ? this.generatePortId(t, e) : r;
  }
  generateNodeId() {
    const t = "node-" + Math.random().toString(36).slice(2, 11);
    return this.cellsMap.has(t) ? this.generateNodeId() : t;
  }
  generateLinkId() {
    const t = "link-" + Math.random().toString(36).slice(2, 11);
    return this.cellsMap.has(t) ? this.generateLinkId() : t;
  }
  setOptions(t) {
    t.width && (this.joint.paper.options.width = t.width), t.height && (this.joint.paper.options.height = t.height), t.gridSize !== void 0 && (this.joint.paper.options.gridSize = t.gridSize), t.background && (this.joint.paper.options.background = { color: t.background }), t.drawGrid && (this.joint.paper.options.drawGridSize = t.drawGrid.size ?? 10, this.joint.paper.options.drawGrid = {
      color: t.drawGrid.color ?? "#bbb",
      thickness: t.drawGrid.thickness ?? 1
    });
  }
  initGraphEvents() {
    this.graph.on("node:mounted", (r) => {
      r.inputs.forEach(async (i) => {
        if (i.type !== "select") return;
        const s = this.cellsMap.get(r.id || "")?.jointCell;
        if (!s) return;
        const o = this.joint.paper.findViewByModel(s);
        if (typeof i.options == "function") {
          const a = await i.options(r.values);
          if (a === i._options || !Array.isArray(a)) return;
          i._options = a, s.get("inputs").find((c) => c.name === i.name)._options = i._options, o.updateOptions(i.id || "", i.name, i._options || []), r.values[i.name] || (r.values[i.name] = i._options?.[0]?.value), o.refreshDomValue(i.name);
        }
      });
    }), this.graph.on("node:changed", (r, i, s, o) => {
      const a = this.cellsMap.get(r.id);
      if (!a) return;
      const { jointCell: c } = a;
      if (c)
        switch (i) {
          case "position":
            c.position(r.position.x, r.position.y), r._bbox = this.getElementBBox(this.joint.paper.findViewByModel(c));
            break;
          case "title":
            c.title(r.title);
            break;
          case "style":
            c.setStyle(Jt(c.get("style") ?? {}, r.style ?? {}));
            break;
          case "values":
            c.setValues(r.values);
            {
              const u = this.joint.paper.findViewByModel(c);
              for (const h of Object.keys(o || {}))
                u.refreshDomValue(h), r.inputs.forEach(async (l) => {
                  if (l.type === "select" && l.name !== h && typeof l.options == "function") {
                    const d = await l.options(r.values);
                    if (d === l._options || !Array.isArray(d)) return;
                    l._options = d, c.get("inputs").find((g) => g.name === l.name)._options = l._options, u.updateOptions(l.id || "", l.name, l._options || []), r.values = { [l.name]: l._options?.[0]?.value };
                  }
                });
            }
            break;
          case "inputs":
            c.set("inputs", r.inputs);
            break;
          case "outputs":
            c.set("outputs", r.outputs);
            break;
        }
    });
    const t = new Hr();
    t.listenTo(this.joint.graph, "node:switch:add-case", (r) => {
      const i = this.cellsMap.get(r.id)?.cell;
      if (!i) return;
      const s = i.inputs.filter((o) => o.name.startsWith("case_")).length;
      i.inputs = [...i.inputs, {
        name: `case_${s + 1}_value`,
        type: "string",
        id: this.generatePortId(i.inputs, "in")
      }], i.outputs = [...i.outputs, {
        name: `case_${s + 1}`,
        type: "exec",
        id: this.generatePortId(i.outputs, "out")
      }];
    }), t.listenTo(this.joint.graph, "node:values:changed", (r, i, s) => {
      const o = this.cellsMap.get(r.model.id)?.cell;
      o.values = { [i]: s };
    }), t.listenTo(this.joint.paper, "element:pointerclick", (r, i) => {
      const s = r.model, o = this.cellsMap.get(s.id)?.cell;
      if (o && (this.emit("node:click", o, i), !(!i.shiftKey && this.selection.has(o) && this.selection.size === 1))) {
        if (i.shiftKey && this.selection.has(o)) {
          this.unselect(o), this.selectionChanged();
          return;
        }
        i.shiftKey || this.clearSelection(), this.select(o), this.selectionChanged();
      }
    }), t.listenTo(this.joint.paper, "element:pointerdblclick", (r, i) => {
      const s = r.model, o = this.cellsMap.get(s.id)?.cell;
      o && (this.emit("node:dblclick", o, i), o.subgraphId && this.graph.model.hasSubgraph(o.subgraphId) && this.graph.enterSubgraph(o.subgraphId));
    }), t.listenTo(this.joint.paper, "blank:pointerclick", (r) => {
      this.emit("blank:click", r), r.shiftKey || this.selection.size > 0 && (this.clearSelection(), this.selectionChanged());
    }), t.listenTo(this.joint.paper, "blank:pointerdblclick", (r) => {
      this.emit("blank:dblclick", r);
    }), t.listenTo(this.joint.paper, "link:pointerclick", (r, i) => {
      const s = r.model, o = this.cellsMap.get(s.id)?.cell;
      if (o && (this.emit("link:click", o, i), !(!i.shiftKey && this.selection.has(o) && this.selection.size === 1))) {
        if (i.shiftKey && this.selection.has(o)) {
          this.unselect(o), this.selectionChanged();
          return;
        }
        i.shiftKey || this.clearSelection(), this.select(o), this.selectionChanged();
      }
    }), t.listenTo(this.joint.paper, "link:pointerdblclick", (r, i) => {
      const s = r.model, o = this.cellsMap.get(s.id)?.cell;
      o && this.emit("link:dblclick", o, i);
    }), t.listenTo(this.joint.paper, "link:connect", (r) => {
      const i = r.model.get("source"), s = r.model.get("target"), o = this.graph.createLinkInstance({
        id: r.model.id,
        source: {
          id: i.id,
          port: i.port
        },
        target: {
          id: s.id,
          port: s.port
        }
      });
      this.cellsMap.set(o.id, {
        cell: o,
        jointCell: r.model
      });
      const a = this.cellsMap.get(i.id), c = this.cellsMap.get(s.id), u = a?.jointCell, h = c?.jointCell;
      if (!u || !h) return;
      const l = a?.cell, d = c?.cell, g = i.port, v = s.port, y = g.startsWith("in-") ? l.inputs?.find((x) => x.id === g) : l.outputs?.find((x) => x.id === g), w = v.startsWith("out-") ? d.outputs?.find((x) => x.id === v) : d.inputs?.find((x) => x.id === v);
      r.model.attr("line/stroke", this.graph.getLinkColor(l, d, y, w)), o.style = Jt(o.style ?? {}, {
        stroke: r.model.attr("line/stroke"),
        strokeWidth: r.model.attr("line/strokeWidth")
      }), this.graph.startTransaction(), this.graph.model.addLinks([o]), this.graph.commitTransaction();
    }), t.listenTo(this.joint.paper, "selection:changed", (r) => {
      this.clearSelection(), this.selectCollection(r.map((i) => this.cellsMap.get(i.id)?.cell).filter((i) => !!i)), this.selectionChanged();
    });
    const e = /* @__PURE__ */ new Set();
    this.joint.paper.on("cell:mouseover", (r, i) => {
      if (!(r.model instanceof hl)) return;
      const s = r.model.id;
      e.has(s) || (e.add(s), this.graph.emit("node:mouseenter", this.cellsMap.get(s)?.cell, i));
    }), this.joint.paper.on("cell:mouseout", (r, i) => {
      const s = r.model.id, o = i;
      e.has(s) && !r.el.contains(o.relatedTarget) && (e.delete(s), this.graph.emit("node:mouseleave", this.cellsMap.get(s)?.cell, o));
    });
    let n = 0;
    t.listenTo(this.joint.paper, "blank:contextmenu", (r) => {
      const i = Date.now();
      i - n < 400 ? (this.graph.exitSubgraph(), n = 0) : n = i, r.preventDefault();
    });
  }
  getElementBBox(t) {
    const e = t.model.position(), n = t.model.size(), r = this.joint.scrollerController.scale, i = this.joint.scrollerController.position, o = this.joint.paper.el.getBoundingClientRect(), a = o.left + e.x * r + i.x, c = o.top + e.y * r + i.y, u = n.width * r, h = n.height * r;
    return {
      left: a,
      top: c,
      width: u,
      height: h,
      x: a,
      y: c
    };
  }
  selectionChanged() {
    this.graph.emit("selection:changed", Array.from(this.selection)), this.joint.groupCells(Array.from(this.jointSelection));
  }
  clear() {
    this.cellsMap.clear(), this.selection.clear(), this.jointSelection.clear(), this.joint.clear();
  }
};
const Oe = {
  Property: 1,
  Insert: 2,
  Delete: 3
};
var Mn = class dl {
  static Property = Oe.Property;
  static Insert = Oe.Insert;
  static Delete = Oe.Delete;
  _change;
  _graph;
  _propertyName;
  _oldValue;
  _newValue;
  _object;
  get change() {
    return this._change;
  }
  set change(e) {
    this._change = e, this._propertyName = "";
  }
  get graph() {
    return this._graph;
  }
  set graph(e) {
    this._graph = e;
  }
  get propertyName() {
    return this._propertyName;
  }
  set propertyName(e) {
    this._propertyName = e;
  }
  get oldValue() {
    return this._oldValue;
  }
  set oldValue(e) {
    this._oldValue = e;
  }
  get newValue() {
    return this._newValue;
  }
  set newValue(e) {
    this._newValue = e;
  }
  get object() {
    return this._object;
  }
  set object(e) {
    this._object = e;
  }
  constructor() {
    this._change = dl.Property, this._propertyName = "", this._oldValue = null, this._newValue = null, this._object = null;
  }
}, Av = class {
  graph;
  nodes;
  constructor(t, e) {
    this.graph = t, this.nodes = e;
  }
  undo() {
    this.graph.removeNodes(this.nodes);
  }
  redo() {
    this.graph.addNodes(this.nodes);
  }
}, Pv = class {
  graph;
  nodes;
  constructor(t, e) {
    this.graph = t, this.nodes = e;
  }
  undo() {
    this.graph.addNodes(this.nodes);
  }
  redo() {
    this.graph.removeNodes(this.nodes);
  }
}, Ev = class {
  graph;
  links;
  constructor(t, e) {
    this.graph = t, this.links = e;
  }
  undo() {
    this.graph.removeLinks(this.links);
  }
  redo() {
    this.graph.addLinks(this.links);
  }
}, Tv = class {
  graph;
  links;
  constructor(t, e) {
    this.graph = t, this.links = e;
  }
  undo() {
    this.graph.addLinks(this.links);
  }
  redo() {
    this.graph.removeLinks(this.links);
  }
}, Cv = class {
  node;
  property;
  from;
  to;
  constructor(t, e, n, r) {
    this.node = t, this.property = e, this.from = n, this.to = r;
  }
  undo() {
    this.node[this.property] = this.from;
  }
  redo() {
    this.node[this.property] = this.to;
  }
}, kv = class {
  undoStack = [];
  redoStack = [];
  transactionStack = [];
  _isUndoingRedoing = !1;
  graph;
  constructor(t) {
    this.graph = t;
  }
  get isUndoingRedoing() {
    return this._isUndoingRedoing;
  }
  record(t) {
    this._isUndoingRedoing || this.graph.skipsUndoManager || this.transactionStack.length > 0 && this.transactionStack[this.transactionStack.length - 1].push(t);
  }
  /**
  * Start a transaction to group multiple commands into one.
  */
  startTransaction() {
    this.transactionStack.push([]);
  }
  /**
  * Commit the current transaction.
  */
  commitTransaction() {
    const t = this.transactionStack.pop();
    if (!t || t.length === 0) return;
    const e = {
      redo: () => t.forEach((n) => n.redo()),
      undo: () => t.slice().reverse().forEach((n) => n.undo())
    };
    this.transactionStack.length > 0 ? this.transactionStack[this.transactionStack.length - 1].push(e) : (this.undoStack.push(e), this.redoStack.length = 0);
  }
  commit(t) {
    this.startTransaction();
    try {
      t(), this.commitTransaction();
    } catch (e) {
      throw this.transactionStack.pop(), e;
    }
  }
  createCommand(t, e, n, r, i) {
    switch (t) {
      case "addNodes":
        return new Av(this.graph, n);
      case "removeNodes":
        return new Pv(this.graph, n);
      case "propertyChange":
        if (!r || !i) throw new Error("PropertyChangeCommand requires oldvalue and newvalue options");
        return new Cv(n, e, r, i);
      case "addLinks":
        return new Ev(this.graph, n);
      case "removeLinks":
        return new Tv(this.graph, n);
    }
  }
  handleChanged(t) {
    if (!this._isUndoingRedoing)
      switch (t.change) {
        case Mn.Insert:
          if (t.object instanceof Rt.NodeInstance || Array.isArray(t.object) && t.object[0] instanceof Rt.NodeInstance) {
            const e = this.createCommand("addNodes", t.propertyName, Array.isArray(t.object) ? t.object : [t.object]);
            this.record(e);
          }
          if (t.object instanceof Rt.LinkInstance || Array.isArray(t.object) && t.object[0] instanceof Rt.LinkInstance) {
            const e = this.createCommand("addLinks", t.propertyName, Array.isArray(t.object) ? t.object : [t.object]);
            this.record(e);
          }
          break;
        case Mn.Delete:
          if (t.object instanceof Rt.NodeInstance || Array.isArray(t.object) && t.object[0] instanceof Rt.NodeInstance) {
            const e = this.createCommand("removeNodes", t.propertyName, Array.isArray(t.object) ? t.object : [t.object]);
            this.record(e);
          }
          if (t.object instanceof Rt.LinkInstance || Array.isArray(t.object) && t.object[0] instanceof Rt.LinkInstance) {
            const e = this.createCommand("removeLinks", t.propertyName, Array.isArray(t.object) ? t.object : [t.object]);
            this.record(e);
          }
          break;
        case Mn.Property:
          if (t.propertyName === "position") {
            const e = this.createCommand("propertyChange", t.propertyName, t.object, t.oldValue, t.newValue);
            this.record(e);
          }
          break;
      }
  }
  undo() {
    const t = this.undoStack.pop();
    t && (this._isUndoingRedoing = !0, t.undo(), this._isUndoingRedoing = !1, this.redoStack.push(t));
  }
  canUndo() {
    return this.undoStack.length > 0;
  }
  redo() {
    const t = this.redoStack.pop();
    t && (this._isUndoingRedoing = !0, t.redo(), this._isUndoingRedoing = !1, this.undoStack.push(t));
  }
  canRedo() {
    return this.redoStack.length > 0;
  }
  clear() {
    this.undoStack = [], this.redoStack = [], this.transactionStack = [];
  }
}, gl = class {
  static definition = {
    inputs: [],
    outputs: [],
    title: "",
    style: {}
  };
}, pl = class {
  _values = {};
  definition;
  id = "";
  data = null;
  subgraphId;
  _bbox = null;
  states = { position: {
    x: 0,
    y: 0
  } };
  graph;
  toolsView = null;
  constructor(t, e) {
    const { inputs: n, ...r } = t.definition;
    this.definition = {
      ...structuredClone(r),
      inputs: n.map((c) => ({ ...c }))
    }, this.states.position = e?.position ?? {
      x: 0,
      y: 0
    }, this.data = e?.data ?? null;
    const i = this.definition.type || "default", s = t.type, o = Object.getOwnPropertyDescriptor(this, "type");
    (!o || o.configurable) && Object.defineProperty(this, "type", {
      get() {
        return i;
      },
      configurable: !1,
      enumerable: !0
    });
    const a = Object.getOwnPropertyDescriptor(this, "nodeType");
    if ((!a || a.configurable) && Object.defineProperty(this, "nodeType", {
      get() {
        return s;
      },
      configurable: !1,
      enumerable: !0
    }), e?.values && (this._values = { ...e.values }), e?.data && (this.data = e.data), e?.title && (this.states.title = e.title), e?.id && (this.id = e.id), e?.style && (this.style = e.style), e?.subgraphId && (this.subgraphId = e.subgraphId), e?.position && (this.states.position = e.position), e?.inputs && (this.states.inputs = e.inputs.map((c) => {
      const u = {
        id: c.id,
        name: c.name,
        type: c.type
      };
      return c.label !== void 0 && (u.label = c.label), c.showInput !== void 0 && (u.showInput = c.showInput), c.showPort !== void 0 && (u.showPort = c.showPort), c.options && (u.options = c.options ? c.options : void 0, u._options = Array.isArray(c.options) ? c.options : void 0), u;
    })), e?.outputs && (this.states.outputs = e.outputs.map((c) => {
      const u = {
        id: c.id,
        name: c.name,
        type: c.type
      };
      return c.label && (u.label = c.label), c.showPort && (u.showPort = c.showPort), u;
    })), this.inputs.forEach((c) => {
      Array.isArray(c.options) ? c._options = c.options : typeof c.options == "function" && (c._options = []);
    }), !this.states.inputs) for (const c of this.inputs) {
      const u = c.name, h = e?.values?.[u];
      if (c.type === "select") {
        if (h === void 0 && Array.isArray(c.options)) {
          const l = c.options || [];
          this._values[u] = l.length > 0 ? l[0].value : "";
          const d = { ...this._values }, g = { [c.name]: this._values[u] };
          this.raiseChangedEvent("values", d, g);
        }
      } else h !== void 0 && (this._values[u] = h);
    }
  }
  get bbox() {
    return this._bbox;
  }
  get position() {
    return this.states.position;
  }
  set position(t) {
    if (typeof t != "object" || t === null || isNaN(t.x) || isNaN(t.y)) throw new Error("Position must be an object with numeric x and y properties.");
    if (this.states.position.x === t.x && this.states.position.y === t.y) return;
    const e = { ...this.states.position };
    this.states.position = t;
    const n = { ...this.states.position };
    this.raiseChangedEvent("position", e, n);
  }
  get title() {
    return this.states.title ?? this.definition.title ?? "";
  }
  set title(t) {
    const e = this.states.title;
    e !== t && (this.states.title = t, this.raiseChangedEvent("title", e, t));
  }
  get values() {
    return this._values;
  }
  set values(t) {
    this.checkValues(t);
    const e = { ...this._values };
    this._values = {
      ...this._values,
      ...t
    }, this.raiseChangedEvent("values", e, t);
  }
  get inputs() {
    return this.states.inputs || this.definition.inputs;
  }
  set inputs(t) {
    const e = /* @__PURE__ */ new Set();
    for (const r of t) {
      if (e.has(r.name)) throw new Error(`Input name "${r.name}" is duplicated.`);
      e.add(r.name);
    }
    const n = [...this.inputs || []];
    this.states.inputs = t, this.raiseChangedEvent("inputs", n, this.inputs);
  }
  get outputs() {
    return this.states.outputs || this.definition.outputs;
  }
  set outputs(t) {
    const e = /* @__PURE__ */ new Set();
    for (const r of t) {
      if (e.has(r.name)) throw new Error(`Output name "${r.name}" is duplicated.`);
      e.add(r.name);
    }
    const n = [...this.outputs || []];
    this.states.outputs = t, this.raiseChangedEvent("outputs", n, this.outputs);
  }
  get style() {
    return this.states.style || this.definition.style;
  }
  set style(t) {
    const e = { ...this.states.style || {} };
    this.states.style = Jt(this.states.style ?? {}, t), this.raiseChangedEvent("style", e, this.states.style);
  }
  showTools() {
    this.toolsView?.show();
  }
  hideTools() {
    this.toolsView?.hide();
  }
  addTools(t) {
    this.toolsView = t, this.toolsView.configure(this);
  }
  removeTools() {
    this.toolsView?.remove(), this.toolsView = null;
  }
  getInput(t) {
    return this.definition.inputs.find((e) => e.name === t);
  }
  getOutput(t) {
    return this.definition.outputs.find((e) => e.name === t);
  }
  setGraph(t) {
    this.graph = t, this.graph.emit("node:mounted", this);
  }
  toString() {
    return `Node#${this.id}(${this.nodeType})`;
  }
  checkValues(t) {
    for (const e in t) {
      const n = this.inputs.find((i) => i.name === e);
      if (!n) throw new Error(`Input "${e}" not found in node definition.`);
      const r = t[e];
      switch (n.type) {
        case "string":
          if (typeof r != "string") throw new Error(`Input "${e}" must be a string.`);
          break;
        case "number":
          if (typeof r != "number" || isNaN(r)) throw new Error(`Input "${e}" must be a number.`);
          break;
        case "boolean":
          if (typeof r != "boolean") throw new Error(`Input "${e}" must be a boolean.`);
          break;
        case "array":
          if (!Array.isArray(r)) throw new Error(`Input "${e}" must be an array.`);
          break;
        case "object":
          if (typeof r != "object" || r === null || Array.isArray(r)) throw new Error(`Input "${e}" must be an object.`);
          break;
        case "select":
          if (typeof r != "string") throw new Error(`Input "${e}" must be a string.`);
          break;
        case "textarea":
          if (typeof r != "string") throw new Error(`Input "${e}" must be a string.`);
          break;
        default:
          return console.warn(`Unknown input type "${n.type}" for input "${e}".`), !1;
      }
    }
    return !0;
  }
  raiseChangedEvent(t, e, n) {
    const r = this.graph;
    r && (r.emit("node:changed", this, t, e, n), r.raiseChangedEvent(Mn.Property, t, this, e, n));
  }
}, Lv = class {
  variables = /* @__PURE__ */ new Map();
  setVariable(t) {
    return this.variables.set(t.name, t), this;
  }
  setVariableValue(t, e) {
    const n = this.variables.get(t);
    if (!n) throw new Error(`Variable "${t}" does not exist.`);
    switch (n.type) {
      case "string":
        if (typeof e != "string") throw new Error(`Variable "${t}" expects a string value.`);
        break;
      case "number":
        if (typeof e != "number") throw new Error(`Variable "${t}" expects a number value.`);
        break;
      case "boolean":
        if (typeof e != "boolean") throw new Error(`Variable "${t}" expects a boolean value.`);
        break;
      case "array":
        if (!Array.isArray(e)) throw new Error(`Variable "${t}" expects an array value.`);
        break;
      case "object":
        if (typeof e != "object" || Array.isArray(e) || e === null) throw new Error(`Variable "${t}" expects an object value.`);
        break;
      case "any":
        break;
      default:
        throw new Error(`Unknown variable type for "${t}".`);
    }
    return this.variables.set(t, {
      ...n,
      value: e
    }), this;
  }
  getVariable(t) {
    return this.variables.get(t);
  }
  getVariableValue(t) {
    const e = this.variables.get(t);
    if (e)
      return e.value;
  }
  deleteVariable(t) {
    return this.variables.delete(t), this;
  }
  getAllVariables() {
    return Array.from(this.variables.values());
  }
  clear() {
    return this.variables.clear(), this;
  }
}, hr = class {
  undoStack = [];
  redoStack = [];
  id;
  nodes = [];
  links = [];
  viewport = {
    x: 0,
    y: 0,
    scale: 1
  };
  constructor(t = "", e = [], n = []) {
    this.id = t, this.nodes = e, this.links = n;
  }
}, Uo = class vl extends ws {
  variableManager = new Lv();
  activeGraph;
  graphStack;
  graph = null;
  _isSettingGraph = !1;
  root = new hr("root");
  subgraphs = /* @__PURE__ */ new Map();
  constructor(e = new hr(), n = /* @__PURE__ */ new Map()) {
    super(), this.subgraphs = n, this.root = e, this.activeGraph = e, this.graphStack = [e];
  }
  get isSettingGraph() {
    return this._isSettingGraph;
  }
  get subgraphStack() {
    return this.graphStack;
  }
  get currentModel() {
    return this.activeGraph;
  }
  get nodes() {
    return this.activeGraph.nodes;
  }
  setGraph(e) {
    if (this.graph !== e && (this.graph && this.graph.off("viewport:change", this.onViewportChange), this.graph = e, this.graph)) {
      if (this.graph.on("viewport:change", this.onViewportChange), this.graph.undoManager.clear(), this.graph.position = {
        x: this.activeGraph.viewport.x,
        y: this.activeGraph.viewport.y
      }, this.graph.scale = this.activeGraph.viewport.scale, !this.activeGraph.nodes.length) return;
      this._isSettingGraph = !0;
      const n = this.graph.skipsUndoManager;
      this.graph.skipsUndoManager = !1, this.graph.startTransaction(), this.graph.addNodes(this.activeGraph.nodes);
      try {
        this.activeGraph.links = this.graph.addLinks(this.activeGraph.links);
      } catch (r) {
        console.error("Error adding links to graph:", r);
      }
      this.graph.commitTransaction(), this.graph.skipsUndoManager = n, this._isSettingGraph = !1;
    }
  }
  onViewportChange = (e) => {
    this.activeGraph.viewport = {
      x: e.x,
      y: e.y,
      scale: e.scale
    };
  };
  enterSubgraph(e) {
    const n = this.subgraphs.get(e);
    if (!n || !this.graph) return;
    this._isSettingGraph = !0;
    const r = this.graph.undoManager.undoStack, i = this.graph.undoManager.redoStack;
    this.activeGraph.undoStack = r, this.activeGraph.redoStack = i, this.graph.undoManager.clear();
    const s = this.graph.getNodes(), o = this.graph.getLinks(), a = this.graph.skipsUndoManager;
    this.graph.skipsUndoManager = !0, this.activeGraph = n, this.graph.position = {
      x: this.activeGraph.viewport.x,
      y: this.activeGraph.viewport.y
    }, this.graph.scale = this.activeGraph.viewport.scale, this.graph.removeNodes(s), this.graph.removeLinks(o), this.graph.addNodes(this.activeGraph.nodes), this.graph.addLinks(this.activeGraph.links), this.graph.undoManager.undoStack = this.activeGraph.undoStack, this.graph.undoManager.redoStack = this.activeGraph.redoStack, this.graph.skipsUndoManager = a, this.graphStack.push(n), this._isSettingGraph = !1;
  }
  exitSubgraph() {
    if (this.graphStack.length > 1) {
      if (this._isSettingGraph = !0, !this.graph) return;
      this.activeGraph.undoStack = this.graph.undoManager.undoStack, this.graphStack.pop();
      const e = this.graphStack[this.graphStack.length - 1];
      if (!this.graph) return;
      this.graph.undoManager.clear();
      const n = this.graph.getNodes(), r = this.graph.getLinks();
      this.activeGraph = e;
      const i = this.graph.skipsUndoManager;
      this.graph.position = {
        x: this.activeGraph.viewport.x,
        y: this.activeGraph.viewport.y
      }, this.graph.scale = this.activeGraph.viewport.scale, this.graph.skipsUndoManager = !0, this.graph.removeNodes(n), this.graph.removeLinks(r), this.graph.addNodes(e.nodes), this.graph.addLinks(e.links), this.graph.undoManager.undoStack = this.activeGraph.undoStack, this.graph.undoManager.redoStack = this.activeGraph.redoStack, this.graph.skipsUndoManager = i, this._isSettingGraph = !1;
    }
  }
  hasSubgraph(e) {
    return this.subgraphs.has(e);
  }
  createSubgraph(e) {
    if (!this.subgraphs.has(e)) {
      const n = new hr(e);
      this.subgraphs.set(e, n);
      const r = this.graph?.nodeRegistry.getStartNodeClass(), i = this.graph.createNodeInstance(r), s = this.graph?.nodeRegistry.getEndNodeClass(), o = this.graph.createNodeInstance(s);
      return i.id = "start-" + e, i.position = {
        x: 300,
        y: 300
      }, o.id = "end-" + e, o.position = {
        x: 600,
        y: 300
      }, i.outputs = [{
        id: "exec",
        name: "exec",
        type: "exec",
        label: ""
      }, {
        id: "param",
        name: "param",
        type: "any",
        label: "param"
      }], o.inputs = [...o.inputs, {
        id: "result",
        name: "result",
        type: "any",
        label: "result"
      }], n.nodes.push(i), n.nodes.push(o), n;
    }
  }
  removeSubgraph(e) {
    this.subgraphs.delete(e);
  }
  resetToRoot() {
    this.graphStack = [this.root], this.activeGraph = this.root;
  }
  findNode(e) {
    return this.activeGraph.nodes.find((n) => n.id === e);
  }
  findLink(e) {
    return this.activeGraph.links.find((n) => n.id === e);
  }
  getNodes() {
    return this.activeGraph.nodes;
  }
  getLinks() {
    return this.activeGraph.links;
  }
  addNodes(e) {
    if (!this.isSettingGraph && e.length !== 0 && this.graph) {
      this.activeGraph.nodes.push(...e);
      for (const n of e) n.definition.type === "subgraph" && this.handleSubgraphNode(n);
      this.raiseChanged(Oe.Insert, "nodes", e, null, e);
    }
  }
  removeNodes(e) {
    if (this.isSettingGraph || e.length === 0 || !this.graph) return;
    const n = [], r = this.getLinks(), i = [];
    e.forEach((a) => {
      r.forEach((c) => {
        (c.source.id === a.id || c.target.id === a.id) && n.push(c);
      }), a.subgraphId && this.hasSubgraph(a.subgraphId) && i.push(a.subgraphId);
    });
    const o = this.getAllNodes().filter((a) => !e.includes(a));
    if (i.length > 0) {
      for (const a of o) if (a.subgraphId && i.includes(a.subgraphId)) {
        const c = i.indexOf(a.subgraphId);
        c > -1 && i.splice(c, 1);
      }
      i.forEach((a) => this.removeSubgraph(a));
    }
    this.activeGraph.nodes = this.activeGraph.nodes.filter((a) => !e.includes(a)), this.graph && (this.graph.startTransaction(), n.length > 0 && this.graph.removeLinks(n), this.graph.commitTransaction(), this.raiseChanged(Oe.Delete, "nodes", e, e, null));
  }
  addLinks(e) {
    this.isSettingGraph || e.length !== 0 && this.graph && (this.activeGraph.links.push(...e), this.raiseChanged(Oe.Insert, "links", e, null, e));
  }
  removeLinks(e) {
    this.isSettingGraph || e.length !== 0 && this.graph && (this.activeGraph.links = this.activeGraph.links.filter((n) => !e.includes(n)), this.raiseChanged(Oe.Delete, "links", e, e, null));
  }
  getAllNodes() {
    const e = [];
    e.push(...this.root.nodes);
    for (const n of this.subgraphs.values()) e.push(...n.nodes);
    return e;
  }
  getAllLinks() {
    const e = [];
    e.push(...this.root.links);
    for (const n of this.subgraphs.values()) e.push(...n.links);
    return e;
  }
  clear() {
    this.isSettingGraph || (this.activeGraph.id !== this.root.id && (this.activeGraph = this.root), this.root.nodes = [], this.root.links = [], this.subgraphs.clear());
  }
  toJSON() {
    return sn.toJSON(this);
  }
  static fromJSON(e, n) {
    const r = new vl();
    typeof n == "string" && (n = JSON.parse(n));
    const { subgraphs: i, nodes: s, links: o, variables: a, viewport: c } = sn.fromJSON(e, n);
    r.root.nodes = s, r.root.links = o, r.root.viewport = {
      x: c.x,
      y: c.y,
      scale: c.zoom
    };
    for (const u of a) r.variableManager.setVariable({
      name: u.name,
      type: u.type,
      value: u.value
    });
    for (const u in i) {
      const h = i[u], l = new hr(u, h.nodes, h.links);
      l.viewport = {
        x: h.viewport.x,
        y: h.viewport.y,
        scale: h.viewport.zoom
      }, r.subgraphs.set(u, l);
    }
    return r;
  }
  raiseChanged(e, n, r, i, s) {
    this.graph && this.graph.raiseChangedEvent(e, n, r, i, s);
  }
  generateSubgraphId() {
    const e = "sg_" + Math.random().toString(36).slice(2, 11);
    return this.subgraphs.has(e) ? this.generateSubgraphId() : e;
  }
  handleSubgraphNode(e) {
    e.subgraphId = e.subgraphId || this.generateSubgraphId();
    const n = e.subgraphId;
    this.hasSubgraph(n) || this.createSubgraph(n);
  }
}, Rt = class en extends ws {
  undoManager = new kv(this);
  skipsUndoManager = !1;
  container;
  _model;
  nodeRegistry;
  _defaultScale = 1;
  adapter;
  options;
  static NodeInstance;
  static LinkInstance;
  clipboard = {
    nodes: [],
    links: []
  };
  constructor(e, n) {
    super(), this.options = n || {}, this.nodeRegistry = e, this.container = n?.container, this.container && (this.container.setAttribute("tabindex", "0"), this.container.style.outline = "none", this.container.focus()), this.adapter = new Sv(this, n), this.model = new Uo(), this.initialize();
  }
  get selection() {
    return this.adapter.selection || /* @__PURE__ */ new Set();
  }
  get scale() {
    return this.adapter.scale || 1;
  }
  set scale(e) {
    this.adapter && (this.adapter.scale = e);
  }
  get position() {
    return this.adapter.position || {
      x: 0,
      y: 0
    };
  }
  set position(e) {
    this.adapter && (this.adapter.position = e);
  }
  get defaultScale() {
    return this._defaultScale;
  }
  set defaultScale(e) {
    this._defaultScale = e;
  }
  get model() {
    return this._model;
  }
  set model(e) {
    this.clear(), this._model = e, e.setGraph(this);
  }
  initialize() {
    this.initAdapterEvents();
  }
  /** @inheritdoc {@link IGraph.addNode} */
  addNode(e, n) {
    const r = e instanceof pl ? e : this.createNodeInstance(e, n), i = Jt(Jt(this.nodeRegistry.nodeStyle, r.definition.style ?? {}), r.style ?? {});
    return this._validateNodes([r]), this.adapter.addNode(r, i), r.setGraph(this), this.model.addNodes([r]), r;
  }
  /** @inheritdoc {@link IGraph.addLink} */
  addLink(e) {
    const n = e instanceof Ri ? e : this.createLinkInstance(e), r = Jt(this.nodeRegistry.linkStyle, n.style ?? {});
    return this._validateLinkConnection(n) && (this.adapter.addLink(n, r), this.model.addLinks([n])), n;
  }
  /** Adds multiple nodes to the graph. */
  addNodes(e) {
    return this._validateNodes(e), e.forEach((n) => {
      const r = Jt(Jt(this.nodeRegistry.nodeStyle, n.definition.style ?? {}), n.style || {});
      this.adapter.addNode(n, r), n.setGraph(this);
    }), this.model.addNodes(e), e;
  }
  /** Adds multiple links to the graph. */
  addLinks(e) {
    const n = [];
    if (e = e.filter((r) => {
      try {
        return this._validateLinkConnection(r);
      } catch (i) {
        return n.push(i), !1;
      }
    }), e.forEach((r) => {
      const i = Jt(this.nodeRegistry.linkStyle, r.style ?? {});
      this.adapter.addLink(r, i);
    }), this.model.addLinks(e), n.length > 0) throw new Error(`Some links could not be added:
${n.map((r) => r.message).join(`
`)}`);
    return e;
  }
  /** @inheritdoc {@link IGraph.select} */
  select(e) {
    this.adapter.select(e);
  }
  /** @inheritdoc {@link IGraph.selectCollection} */
  selectCollection(e) {
    this.adapter.selectCollection(e);
  }
  clearSelection() {
    this.adapter.clearSelection();
  }
  /** @inheritdoc {@link IGraph.destroy} */
  destroy() {
    this.clear(), this.adapter && this.adapter.destroy();
  }
  /** @inheritdoc {@link IGraph.setContainer} */
  setContainer(e) {
    e.setAttribute("tabindex", "0"), e.style.outline = "none", e.focus(), this.container = e, this.adapter && this.adapter.setContainer(e);
  }
  /** @inheritdoc {@link IGraph.deleteSelection} */
  deleteSelection() {
    const e = Array.from(this.selection), n = e.filter((s) => s instanceof en.NodeInstance), r = e.filter((s) => s instanceof en.LinkInstance), i = this.skipsUndoManager;
    i || this.startTransaction(), this.removeNodes(n), this.removeLinks(r), i || this.commitTransaction();
  }
  /** @inheritdoc {@link IGraph.removeNodes} */
  removeNodes(e) {
    this.model.currentModel.id !== this.model.root.id && (e = e.filter((n) => !((n.type === "start" || n.type === "end") && !this.model.isSettingGraph))), this.adapter && this.adapter.removeCells(e), this.model.removeNodes(e);
  }
  /** @inheritdoc {@link IGraph.removeLinks} */
  removeLinks(e) {
    this.adapter && this.adapter.removeCells(e), this.model.removeLinks(e);
  }
  copySelection() {
    this.copyCells([...this.selection]);
  }
  copyCells(e) {
    const n = e.filter((o) => o instanceof en.NodeInstance), r = e.filter((o) => o instanceof en.LinkInstance).filter((o) => n.find((a) => a.id === o.source.id) && n.find((a) => a.id === o.target.id)), i = sn.serializeNodes(n), s = sn.serializeLinks(r);
    this.clipboard.nodes = i, this.clipboard.links = s;
  }
  pasteClipboard() {
    if (this.clipboard.nodes.length === 0 || !this.adapter) return;
    const e = /* @__PURE__ */ new Map(), n = sn.deserializeNodes(this, this.clipboard.nodes.map((i) => {
      const s = i.id, o = this.adapter.generateNodeId();
      return e.set(s, o), i.position = {
        x: i.position.x + 20,
        y: i.position.y + 20
      }, {
        ...i,
        id: o
      };
    })), r = sn.deserializeLinks(this, this.clipboard.links.map((i) => {
      i.id = this.adapter.generateLinkId();
      const s = e.get(i.source.id), o = e.get(i.target.id);
      return {
        id: i.id,
        source: {
          id: s,
          port: i.source.port
        },
        target: {
          id: o,
          port: i.target.port
        }
      };
    }));
    this.clearSelection(), this.startTransaction(), this.addNodes(n), this.addLinks(r), this.selectCollection([...n, ...r]), this.commitTransaction();
  }
  /** @inheritdoc {@link IGraph.getLinks} */
  getLinks() {
    return this.model.getLinks();
  }
  /** @inheritdoc {@link IGraph.getNodes} */
  getNodes() {
    return this.model.getNodes();
  }
  /** @inheritdoc {@link IGraph.findLink} */
  findNode(e) {
    return this.model.findNode(e);
  }
  /** @inheritdoc {@link IGraph.findLink} */
  findLink(e) {
    return this.model.findLink(e);
  }
  /** @inheritdoc {@link IGraph.zoomIn} */
  zoomIn() {
    this.adapter && this.adapter.zoomIn();
  }
  /** @inheritdoc {@link IGraph.zoomOut} */
  zoomOut() {
    this.adapter && this.adapter.zoomOut();
  }
  /** @inheritdoc {@link IGraph.zoom} */
  zoom(e) {
    this.adapter && this.adapter.zoom(e);
  }
  /** @inheritdoc {@link IGraph.resetZoom} */
  resetZoom() {
    this.adapter && this.adapter.resetZoom(this.defaultScale);
  }
  /** @inheritdoc {@link IGraph.createNodeInstance} */
  createNodeInstance(e, n) {
    if (!this.nodeRegistry.isRegistered(e)) {
      if (typeof e == "string") throw new Error(`Node type "${e}" is not registered.`);
      if (e.constructor && "name" in e.constructor) throw new Error(`Node type "${e.constructor.name}" is not registered.`);
    }
    let r;
    return typeof e == "string" ? r = this.nodeRegistry.get(e) : r = e, new en.NodeInstance(r, n);
  }
  /** @inheritdoc {@link IGraph.createLinkInstance} */
  createLinkInstance(e) {
    const n = new Ri(e.source, e.target);
    return Object.assign(n, e);
  }
  /** @inheritdoc {@link IGraph.getLinkColor} */
  getLinkColor(e, n, r, i) {
    const s = this.nodeRegistry.linkStyle;
    if (s.byPortType) {
      const o = _v(s.byPortType, r, i);
      if (o) return o;
    }
    return s.stroke || "rgba(255,255,255,0.5)";
  }
  enterSubgraph(e) {
    this.model.enterSubgraph(e), this.emit("subgraph:enter", e);
  }
  exitSubgraph() {
    const e = this.model.activeGraph.id;
    e !== this.model.root.id && (this.model.exitSubgraph(), this.emit("subgraph:exit", e));
  }
  clientToGraphPoint(e, n) {
    return this.adapter ? this.adapter.clientToGraphPoint(e, n) : {
      x: e,
      y: n
    };
  }
  /** @inheritdoc {@link IGraph.startTransaction} */
  startTransaction() {
    this.undoManager.startTransaction();
  }
  /** @inheritdoc {@link IGraph.commitTransaction} */
  commitTransaction() {
    this.undoManager.commitTransaction();
  }
  /** @inheritdoc {@link IGraph.commit} */
  commit(...e) {
    this.undoManager.commit(...e);
  }
  /** @inheritdoc {@link IGraph.validateConnection} */
  validateConnection(e, n, r, i) {
    const s = n.type, o = i.type;
    switch (s) {
      case "exec":
        if (o !== "exec") return !1;
        break;
      case "number":
        if (o !== "number" && o !== "any") return !1;
        break;
      case "boolean":
        if (o !== "boolean" && o !== "any") return !1;
        break;
      case "array":
        if (o !== "array" && o !== "any") return !1;
        break;
      case "object":
        if (o !== "object" && o !== "any") return !1;
        break;
      case "spacer":
        return !1;
      case "any":
        if (o === "exec") return !1;
        break;
      case "string":
        if (o !== "string" && o !== "any" && o !== "textarea") return !1;
        break;
      case "textarea":
        if (o !== "textarea" && o !== "string" && o !== "any") return !1;
        break;
    }
    return !0;
  }
  raiseChangedEvent(e, n, r, i, s) {
    const o = new Mn();
    o.change = e, o.graph = this, o.propertyName = n, o.oldValue = i, o.newValue = s, o.object = r, this.callChangedListeners(o);
  }
  setOptions(e = {}) {
    this.options = Jt(this.options, e), this.adapter && this.adapter.setOptions(this.options), e.container && this.setContainer(e.container);
  }
  toString(e = 0) {
    let n = "";
    this.container && this.container.id && (n = this.container.id);
    let r = `Graph "${n ? "" + n : ""}"`;
    if (e > 0) {
      const i = this.getNodes(), s = this.getLinks(), o = i.length + s.length;
      r += `
 ` + o + ": ", r += i.length + " Nodes ", r += s.length + " Links";
      for (const a of i) r += `
   Node#` + a.id + `(${a.nodeType})`;
      for (const a of s) r += `
   Link#` + a.id + `(${a.source.id} ${a.target.id}) ${a.source.port} ${a.target.port}`;
    }
    return r;
  }
  /** @inheritdoc {@link IGraph.toJSON} */
  toJSON() {
    return this.model.toJSON();
  }
  /** @inheritdoc {@link IGraph.fromJSON} */
  fromJSON(e) {
    return this.model.setGraph(null), this.model = Uo.fromJSON(this, e), this.model;
  }
  /** @inheritdoc {@link IGraph.clear} */
  clear() {
    this.model && this.model.clear(), this.adapter && this.adapter.clear(), this.undoManager.clear();
  }
  initAdapterEvents() {
    this.adapter.on("node:click", (e, n) => {
      this.emit("node:click", e, n);
    }), this.adapter.on("node:dblclick", (e, n) => {
      this.emit("node:dblclick", e, n);
    }), this.adapter.on("blank:click", (e) => {
      this.emit("blank:click", e);
    }), this.adapter.on("blank:dblclick", (e) => {
      this.emit("blank:dblclick", e);
    }), this.adapter.on("link:click", (e, n) => {
      this.emit("link:click", e, n);
    }), this.adapter.on("link:dblclick", (e, n) => {
      this.emit("link:dblclick", e, n);
    });
  }
  callChangedListeners(e) {
    this.skipsUndoManager || this.undoManager.handleChanged(e), this.emit("changed", e);
  }
  _validateLinkConnection(e) {
    const n = this.findNode(e.source.id), r = this.findNode(e.target.id);
    if (!n) throw new Error(`Source node with id "${e.source.id}" not found.`);
    if (!r) throw new Error(`Target node with id "${e.target.id}" not found.`);
    if (n.id === r.id) throw new Error(`Cannot connect a node to itself: "${n.id}".`);
    const i = e.source.port, s = e.target.port;
    if (!i || !s) throw new Error("Both source port and target port must be specified in the link.");
    if (i.startsWith("in-") && s.startsWith("in-")) throw new Error(`Cannot connect two input ports: "${i}" and "${s}".`);
    if (i.startsWith("out-") && s.startsWith("out-")) throw new Error(`Cannot connect two output ports: "${i}" and "${s}".`);
    const o = i.startsWith("out-") ? n.outputs.find((c) => c.id === i) : n.inputs.find((c) => c.id === i);
    if (!o) throw new Error(`Source port "${e.source.port}" not found in node "${n}".`);
    const a = s.startsWith("in-") ? r.inputs.find((c) => c.id === s) : r.outputs.find((c) => c.id === s);
    if (!a) throw new Error(`Target port "${e.target.port}" not found in node "${r}".`);
    if (!this.validateConnection(n, o, r, a)) throw new Error(`Port type mismatch: cannot connect ${n} [${o.name}:${o.type}] to ${r} [${a.name}:${a.type}].`);
    return !0;
  }
  _validateNodes(e) {
    if (this.model.subgraphStack.length > 1 && e.some((n) => n.type === "start") && this.getNodes().some((n) => n.type === "start"))
      throw new Error("A subgraph cannot contain another start node.");
    return !0;
  }
}, Ri = class {
  style;
  id;
  source;
  target;
  constructor(t, e) {
    this.source = t, this.target = e;
  }
  toString() {
    return `Link#${this.id}(${this.source.id} ${this.target.id}) ${this.source.port} ${this.target.port}`;
  }
};
Rt.NodeInstance = pl;
Rt.LinkInstance = Ri;
const _v = /* @__PURE__ */ (() => {
  const t = {}, e = {};
  return (n, r, i) => {
    const s = (r.id || "").startsWith("out-") ? r : i, o = (i.id || "").startsWith("in-") ? i : r;
    if (!Array.isArray(n[s.type]) || !Array.isArray(n[o.type])) return;
    const a = s.id || "", c = o.id || "", u = t[a + c];
    if (u) return u;
    const h = t[a], l = t[c];
    if (h)
      return t[a + c] = h, h;
    if (l)
      return t[a + c] = l, l;
    e[s.type] = e[s.type] || 0;
    const d = n[s.type][e[s.type]];
    return t[a] = d, t[c] = d, e[s.type] = (e[s.type] + 1) % n[s.type].length, d;
  };
})();
var Di = class extends gl {
  static definition = {
    inputs: [],
    outputs: [{
      name: "start",
      type: "exec"
    }, {
      name: "result",
      type: "any"
    }],
    style: { header: {
      background: "#4CAF50",
      color: "#FFFFFF"
    } },
    title: "Start",
    type: "start"
  };
  static type = "start";
}, Fi = class extends gl {
  static definition = {
    inputs: [{
      name: "subgraph",
      type: "exec"
    }, {
      name: "input",
      type: "any",
      label: ""
    }],
    outputs: [{
      name: "subgraph",
      type: "exec"
    }, {
      name: "input",
      type: "any",
      label: "Result"
    }],
    style: { header: {
      background: "#2196F3",
      color: "#FFFFFF"
    } },
    title: "Subgraph",
    type: "subgraph"
  };
  static type = "subgraph";
};
Object.defineProperty(Di, "type", {
  writable: !1,
  configurable: !1
});
Object.defineProperty(Fi, "type", {
  writable: !1,
  configurable: !1
});
Di.type + "", Fi.type + "";
function Vv(t, e) {
  const n = jo(null);
  function r({ children: s }) {
    const o = new Rt(t, e);
    return /* @__PURE__ */ br.jsx(n.Provider, { value: o, children: s });
  }
  function i() {
    const s = Wo(n);
    if (!s) throw new Error("GraphContext not found");
    return s;
  }
  return { GraphProvider: r, useGraph: i };
}
var Nv = class {
  listeners = {};
  /**
  * Adds an event listener for the specified event.
  * @param event The event name.
  * @param handler The event handler.
  * @returns The EventEmitter instance.
  */
  on(t, e) {
    return this.listeners[t] || (this.listeners[t] = /* @__PURE__ */ new Set()), this.listeners[t].add(e), this;
  }
  /**
  * Adds a one-time event listener for the specified event.
  * @param event The event name.
  * @param handler The event handler.
  * @returns The EventEmitter instance.
  */
  once(t, e) {
    const n = (...r) => {
      this.off(t, n), e(...r);
    };
    return this.on(t, n);
  }
  /**
  * Removes an event listener for the specified event.
  * @param event The event name.
  * @param handler The event handler.
  * @returns The EventEmitter instance.
  */
  off(t, e) {
    return this.listeners[t] ? (e ? this.listeners[t].delete(e) : delete this.listeners[t], this) : this;
  }
  /**
  * Emits an event with the specified payload.
  * @param event The event name.
  * @param payload The event payload.
  * @returns The EventEmitter instance.
  */
  emit(t, ...e) {
    if (!this.listeners[t]) return this;
    for (const n of this.listeners[t]) n(...e);
    return this;
  }
}, Mv = class extends Nv {
  portConnectionValueMap = /* @__PURE__ */ new Map();
  errorNodes = /* @__PURE__ */ new Set();
  entryPorts = /* @__PURE__ */ new Set();
  subEntryPort = /* @__PURE__ */ new Map();
  flowStackGraph = /* @__PURE__ */ new Map();
  waitingGraph = /* @__PURE__ */ new Map();
  readyGraph = /* @__PURE__ */ new Map();
  subFlowStackGraph = /* @__PURE__ */ new Map();
  subWaitingGraph = /* @__PURE__ */ new Map();
  subReadyGraph = /* @__PURE__ */ new Map();
  runtime;
  options;
  constructor(t, e) {
    super(), this.runtime = t, this.options = e || { ctx: {} };
  }
  /**
  * Executes a node in the graph.
  * @param node The node instance to execute.
  * @param ctx The execution context.
  */
  async executeNode(t, e) {
    const n = this.buildExecContext(t, e);
    return this.runtime.executeNode(t, n), this;
  }
  /**
  * Runs a node in the graph.
  * @param args The arguments to pass to the node.
  */
  async runNode(t, e, n) {
    const r = this.createNodeInstance(t, e);
    return this.executeNode(r, n);
  }
  /**
  * Creates a new node instance. {@link Runtime.createNodeInstance}
  * @param args The arguments to pass to createNodeInstance.
  * @returns The created node instance.
  */
  createNodeInstance(...t) {
    return this.runtime.createNodeInstance(...t);
  }
  /**
  * Processes a JSON graph.
  * @param json The JSON representation of the graph.
  */
  fromJSON(t) {
    this.portConnectionValueMap.clear(), this.errorNodes.clear(), typeof t == "string" && (t = JSON.parse(t)), this.flowStackGraph.clear(), this.waitingGraph.clear(), this.readyGraph.clear(), this.subFlowStackGraph.clear(), this.subWaitingGraph.clear(), this.subReadyGraph.clear();
    const { nodes: e, links: n, subgraphs: r } = this.runtime.fromJSON(t), i = this.findStartNodes(e), s = /* @__PURE__ */ new Set();
    for (const o of i) {
      const { subgraphIds: a } = this.generateDependencies(o, e, n, this.flowStackGraph);
      a.forEach((c) => s.has(c) || s.add(c)), this.entryPorts.add(o.id + ":" + (o.outputs.find((c) => c.type === "exec")?.id || ""));
    }
    do {
      const o = s.values().next().value;
      if (s.delete(o), this.subFlowStackGraph.has(o)) continue;
      const a = r[o];
      if (!a) continue;
      this.subWaitingGraph.set(o, /* @__PURE__ */ new Map()), this.subReadyGraph.set(o, /* @__PURE__ */ new Map()), this.subWaitingGraph.set(o, /* @__PURE__ */ new Map());
      const { nodes: c, links: u } = a, h = this.findStartNodes(c)[0];
      this.subEntryPort.set(o, h.id + ":" + (h.outputs.find((g) => g.type === "exec")?.id || ""));
      const l = /* @__PURE__ */ new Map(), { subgraphIds: d } = this.generateDependencies(h, c, u, l);
      d.forEach((g) => s.has(g) || s.add(g)), this.subFlowStackGraph.set(o, l);
    } while (s.size > 0);
  }
  /**
  * Processes the input data through the graph.
  * @param input The input data to process through the graph.
  */
  process(t) {
    this.waitingGraph.clear(), this.readyGraph.clear(), this.subWaitingGraph.forEach((n, r) => this.subWaitingGraph.set(r, /* @__PURE__ */ new Map())), this.subReadyGraph.forEach((n, r) => this.subReadyGraph.set(r, /* @__PURE__ */ new Map()));
    const e = this.readyGraph;
    for (const n of this.entryPorts) {
      const r = this.flowStackGraph.get(n);
      if (!r) continue;
      const i = r.node;
      i.outputs.length > 1 && i.setOutput(i.outputs[1].name, t), e.set(i.id, r), this.executeEntry(n, void 0, t);
    }
  }
  async executeSubgraph(t, e, n) {
    const { node: r, dataInputs: i } = t, s = r.subgraphId, o = this.subEntryPort.get(s), a = this.subFlowStackGraph.get(s);
    if (a.has(o)) {
      const h = a.get(o);
      if (i) for (const l of Object.values(i)) {
        const d = l.split(":")[0], g = e.get(d)?.node;
        if (g) {
          const v = l.split(":")[1], y = g.outputs.find((x) => x.id === v)?.name || "", w = h.node.outputs.find((x) => x.type !== "exec")?.name || "";
          g.getOutput(y) && w && h.node.setOutput(w, g.getOutput(y));
        }
      }
      this.subReadyGraph.get(s).set(h.node.id, h), await this.executeEntry(o, s, n);
      for (const l of a.values()) if (l.node.id === r.id && l.port.id.startsWith("out-")) for (const d of l.next) await this.executeEntry(d, s, n);
    }
    const c = r.outputs.find((h) => h.type === "exec");
    if (!c) return;
    const u = r.id + ":" + c.id;
    this.executeEntry(u, "", n);
  }
  async executeEntry(t, e = "", n) {
    const r = e ? this.subFlowStackGraph.get(e) : this.flowStackGraph, i = e ? this.subWaitingGraph.get(e) : this.waitingGraph, s = e ? this.subReadyGraph.get(e) : this.readyGraph, o = r.get(t);
    if (!o) return;
    const { node: a, port: c, dataInputs: u } = o;
    if (c.id.startsWith("in-")) {
      if (a.type === "subgraph" && a.subgraphId) {
        await this.executeSubgraph(o, s, n);
        return;
      } else if (a.type === "end") {
        if (e) {
          const l = this.getNodeBySubgraphId(e);
          for (const d of r.values()) if (d.node.id === l.id && d.port.id.startsWith("out-")) for (const g of d.next) await this.executeEntry(g, "", n);
        }
        return;
      }
      if (u) for (const l of Object.values(u)) {
        const d = l.split(":")[0];
        if (!s.has(d)) {
          i.set(t, o);
          return;
        }
      }
      const h = async (l) => {
        if (s.set(a.id, o), i.delete(t), l && l.length > 0) {
          const g = a.outputs.filter((v) => v.type === "exec" && l.includes(v.name)).map((v) => {
            const y = a.id + ":" + v.id;
            return this.executeEntry(y, e, n);
          });
          await Promise.all(g);
        } else {
          const g = a.outputs.filter((v) => v.type === "exec").map((v) => {
            const y = a.id + ":" + v.id;
            return this.executeEntry(y, e, n);
          });
          await Promise.all(g);
        }
      };
      try {
        this.prepareInputs(o, s);
        const l = {
          ctx: this.options.ctx || {},
          error: n,
          next: h
        }, d = this.buildExecContext(a, l);
        d.next = h, await this.runtime.executeNode(a, d), d.next = () => {
        };
      } catch (l) {
        n = l, console.error(`Node ${t} execution failed`, l), this.errorNodes.add(a.id);
      }
    } else if (c.id.startsWith("out-")) {
      const h = o.next.map((l) => this.executeEntry(l, e, n));
      await Promise.all(h);
    }
  }
  setOptions(t) {
    this.options = t || {};
  }
  setCtx(t) {
    this.options.ctx = t;
  }
  getNodeBySubgraphId(t) {
    for (const e of this.flowStackGraph.values()) if (e.node.type === "subgraph" && e.node.subgraphId === t) return e.node;
    throw new Error(`Cannot find subgraph node for subgraphId: ${t}`);
  }
  generateDependencies(t, e, n, r) {
    r = r || /* @__PURE__ */ new Map();
    const i = /* @__PURE__ */ new Map();
    for (const a of e) {
      for (const c of a.inputs) i.set(a.id + ":" + c.id, {
        node: a,
        port: c,
        nexts: [],
        prevs: []
      });
      for (const c of a.outputs) i.set(a.id + ":" + c.id, {
        node: a,
        port: c,
        nexts: [],
        prevs: []
      });
    }
    for (const a of n) {
      const c = a.source.port.startsWith("out-") ? a.source : a.target, u = a.source.port.startsWith("out-") ? a.target : a.source, h = i.get(c.id + ":" + c.port), l = i.get(u.id + ":" + u.port);
      h.nexts.push({
        node: l.node,
        port: l.port
      }), l.prevs.push({
        node: h.node,
        port: h.port
      });
    }
    const s = /* @__PURE__ */ new Set(), o = (a) => {
      a.inputs.forEach((u) => {
        if (u.type === "exec") return;
        const h = a.id + ":" + u.id, l = i.get(h);
        l.prevs.length > 0 && l.prevs.forEach((d) => {
          this.generateDataDependencies(d.node, a, d.port, u, r);
        });
      });
      const c = /* @__PURE__ */ new Set();
      a.outputs.forEach((u) => {
        if (u.type !== "exec") return;
        const h = a.id + ":" + u.id, l = i.get(h);
        l.nexts.length > 0 && l.nexts.forEach((d) => {
          this.generateFlowStackGraph(a, d.node, u, d.port, r), d.node.type === "subgraph" && d.node.subgraphId && s.add(d.node.subgraphId), c.has(d.node) || c.add(d.node);
        });
      });
      for (const u of c) o(u);
    };
    return o(t), {
      flowMap: r,
      subgraphIds: s
    };
  }
  emit(...t) {
    return super.emit(...t), this.handleNodeEvents(...t), this;
  }
  handleNodeEvents(...t) {
    const e = t[0], n = t.slice(1);
    this.runtime.nodeListeners.forEach(async (r, i) => {
      const s = r.subgraphId, o = r.onEvent;
      if (o) {
        const a = s ? this.subFlowStackGraph.get(s) : this.flowStackGraph;
        if (!a) return;
        const c = this.buildExecContext(r, {
          error: r.error,
          ctx: this.options.ctx || {}
        }), u = o(e, ...n, c);
        if (u && u.trigger) {
          const h = [];
          for (const l of a.values()) if (l.node.id === i && l.port.id.startsWith("in-")) {
            const d = l.prev, g = l.node.id + ":" + l.port.id;
            for (const v of d) {
              const w = a.get(v).node.error;
              h.push(this.executeEntry(g, s, w));
            }
          }
          await Promise.all(h);
        }
      }
    });
  }
  /** Builds the execution context for a node. */
  buildExecContext(t, e = {}) {
    const n = new WeakRef(t), r = t.inputs.filter((s) => s.type !== "exec" && s.type !== "spacer"), i = t.outputs.filter((s) => s.type !== "exec" && s.type !== "spacer");
    return {
      getInput: (s) => {
        const o = n.deref();
        if (!o) throw new Error("Node instance has been garbage collected.");
        return o.getInput(s);
      },
      setOutput: (s, o) => {
        const a = n.deref();
        if (!a) throw new Error("Node instance has been garbage collected.");
        a.setOutput(s, o);
      },
      services: { get: (s) => this.runtime.getService(s) },
      emitEvent: (s, ...o) => {
        this.emit(s, ...o);
      },
      next: () => {
      },
      data: t.data,
      ctx: e.ctx,
      error: e.error,
      inputs: r,
      outputs: i
    };
  }
  prepareInputs(t, e) {
    const { dataInputs: n, node: r } = t;
    if (n) for (const [i, s] of Object.entries(n)) {
      const o = s.split(":")[0], a = e.get(o)?.node;
      if (a) {
        const c = i, u = r.inputs.find((d) => d.id === c)?.name || "", h = s.split(":")[1], l = a.outputs.find((d) => d.id === h)?.name || "";
        a.getOutput(l) && r.setInput(u, a.getOutput(l));
      }
    }
  }
  generateFlowStackGraph(t, e, n, r, i = /* @__PURE__ */ new Map()) {
    const s = t.id + ":" + n.id, o = e.id + ":" + r.id;
    i.has(s) ? i.get(s).next.push(o) : i.set(s, {
      node: t,
      port: {
        name: n.name,
        type: n.type,
        id: n.id || ""
      },
      next: [o],
      prev: [],
      dataInputs: {}
    }), i.has(o) ? i.get(o).prev.push(s) : i.set(o, {
      node: e,
      port: {
        name: r.name,
        type: r.type,
        id: r.id || ""
      },
      prev: [s],
      next: [],
      dataInputs: {}
    });
  }
  generateDataDependencies(t, e, n, r, i = /* @__PURE__ */ new Map()) {
    const s = t.id + ":" + n.id, o = e.inputs.filter((a) => a.type === "exec").map((a) => a.id);
    for (const a of o) {
      const c = e.id + ":" + a, u = i.get(c);
      u && (u.dataInputs[r.id] = s);
    }
  }
  findStartNodes(t) {
    return t.filter((e) => e.type === "start");
  }
}, ml = class {
  static definition = {
    inputs: [],
    outputs: [],
    title: "",
    style: {}
  };
}, Bi = class extends ml {
  static definition = {
    inputs: [],
    outputs: [{
      name: "start",
      type: "exec"
    }, {
      name: "result",
      type: "any"
    }],
    style: { header: {
      background: "#4CAF50",
      color: "#FFFFFF"
    } },
    title: "Start",
    type: "start"
  };
  static type = "start";
}, Vi = class extends ml {
  static definition = {
    inputs: [{
      name: "subgraph",
      type: "exec"
    }, {
      name: "input",
      type: "any",
      label: ""
    }],
    outputs: [{
      name: "subgraph",
      type: "exec"
    }, {
      name: "input",
      type: "any",
      label: "Result"
    }],
    style: { header: {
      background: "#2196F3",
      color: "#FFFFFF"
    } },
    title: "Subgraph",
    type: "subgraph"
  };
  static type = "subgraph";
};
Object.defineProperty(Bi, "type", {
  writable: !1,
  configurable: !1
});
Object.defineProperty(Vi, "type", {
  writable: !1,
  configurable: !1
});
Bi.type + "", Vi.type + "";
function zv(t, e) {
  const n = jo(null);
  function r({ children: s }) {
    const o = new Mv(t, e);
    return /* @__PURE__ */ br.jsx(n.Provider, { value: o, children: s });
  }
  function i() {
    const s = Wo(n);
    if (!s) throw new Error("EngineContext not found");
    return s;
  }
  return { EngineProvider: r, useEngine: i };
}
function Uv({
  width: t = "100%",
  height: e = "100%",
  graph: n,
  className: r,
  children: i,
  options: s,
  onNodeClick: o,
  onNodeDoubleClick: a,
  onNodeSelection: c,
  onBlankClick: u,
  onBlankDoubleClick: h,
  onLinkClick: l,
  onDragStart: d,
  onDrag: g,
  onDragEnd: v,
  onStartConnecting: y,
  onKeyDown: w
}) {
  const x = Cl(null), P = (_, F) => {
    o?.(_, F);
  }, T = (_, F) => {
    a?.(_, F);
  }, L = (_) => {
    c?.(_.filter((F) => F instanceof Rt.NodeInstance));
  }, I = (_) => {
    u?.(_);
  }, R = (_) => {
    h?.(_);
  }, f = (_, F) => {
    l?.(_, F);
  }, p = (_) => {
    d?.(_);
  }, m = (_) => {
    g?.(_);
  }, b = (_) => {
    v?.(_);
  }, S = () => {
    y?.();
  }, M = (_) => {
    w?.(_);
  };
  return kl(() => {
    n && n.setOptions(s);
  }, []), Ll(() => {
    if (!(!n || !x.current))
      return n.setContainer(x.current), n.on("node:click", P), n.on("node:dblclick", T), n.on("selection:changed", L), n.on("blank:click", I), n.on("blank:dblclick", R), n.on("link:click", f), n.on("node:dragstart", p), n.on("node:dragmove", m), n.on("node:dragend", b), n.on("start:connecting", S), () => {
        n.off("node:click", P), n.off("node:dblclick", T), n.off("selection:changed", L), n.off("blank:click", I), n.off("blank:dblclick", R), n.off("link:click", f), n.off("node:dragstart", p), n.off("node:dragmove", m), n.off("node:dragend", b), n.off("start:connecting", S);
      };
  }, []), /* @__PURE__ */ br.jsxs("div", { style: { position: "relative", width: t, height: e }, children: [
    /* @__PURE__ */ br.jsx(
      "div",
      {
        style: { width: "100%", height: "100%" },
        className: r,
        onKeyDown: M,
        ref: x
      }
    ),
    i
  ] });
}
export {
  Uv as GraphView,
  zv as createEngineContext,
  Vv as createGraphContext
};
