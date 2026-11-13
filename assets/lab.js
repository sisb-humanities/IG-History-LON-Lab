/* G9 IGCSE History · League of Nations Lab
   Declarative lesson pages: each lessonN.html passes a config to LAB.start().
   Students write in their notebooks. Nothing typed on these pages is saved or sent.
   Optional logging: if window.SISB_TRACKER exists it receives log(category, action, detail). */
(function (global) {
  "use strict";
  var CAT = "G9 HIST LON";

  /* ---------- helpers ---------- */
  function h(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === false || v == null) return;
      if (k === "class") e.className = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) add(e, arguments[i]);
    return e;
  }
  function add(e, k) {
    if (k == null || k === false) return;
    if (Array.isArray(k)) { k.forEach(function (x) { add(e, x); }); return; }
    e.appendChild(k.nodeType ? k : document.createTextNode(String(k)));
  }
  function shuffle(a) {
    var b = a.slice();
    for (var i = b.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = b[i]; b[i] = b[j]; b[j] = t;
    }
    return b;
  }
  function log(action, detail) {
    try { if (global.SISB_TRACKER && global.SISB_TRACKER.log) global.SISB_TRACKER.log(CAT, action, detail); } catch (e) {}
  }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  function fb(ok, title, html) {
    return h("div", { class: "fb " + (ok ? "ok" : "no"), role: "status" },
      h("b", { class: "t" }, title), h("span", { html: html || "" }));
  }
  function fmt(s) { var m = Math.floor(s / 60), r = s % 60; return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r; }
  function timer(mins) {
    var total = mins * 60, left = total, t = null;
    var out = h("span", { class: "tm-out", "aria-live": "off" }, fmt(left));
    var go = h("button", { class: "btn small", onclick: toggle }, "Start");
    var reset = h("button", { class: "btn small alt", onclick: function () { stop(); left = total; out.textContent = fmt(left); out.className = "tm-out"; go.textContent = "Start"; } }, "Reset");
    function stop() { if (t) { clearInterval(t); t = null; } }
    function toggle() {
      if (t) { stop(); go.textContent = "Resume"; return; }
      if (left <= 0) left = total;
      go.textContent = "Pause";
      t = setInterval(function () {
        left--; out.textContent = fmt(Math.max(left, 0));
        if (left <= 0) { stop(); out.textContent = "Time!"; out.className = "tm-out up"; go.textContent = "Restart"; }
      }, 1000);
    }
    return h("div", { class: "timer" }, out, go, reset);
  }

  /* ---------- components ---------- */
  var C = {};

  C.info = function (cfg) { return h("div", { class: "info " + (cfg.kind || ""), html: cfg.html }); };

  /* flashcards: tap to flip, Got it / Again */
  C.flash = function (cfg, ctx) {
    var deck = shuffle(cfg.cards), i = 0, flipped = false, missed = {}, first = 0;
    var root = h("div", { class: "flash" });
    function draw() {
      root.innerHTML = "";
      if (i >= deck.length) {
        var n = cfg.cards.length;
        root.append(h("div", { class: "info" }, h("b", null, "Deck finished. "), "You knew " + first + " of " + n + " first time."),
          h("div", { class: "row" }, h("button", { class: "btn", onclick: function () { deck = shuffle(cfg.cards); i = 0; first = 0; missed = {}; flipped = false; draw(); } }, "Go again")));
        ctx.done(); log("flash", cfg.cards.length + " cards, first-time " + first); return;
      }
      var c = deck[i];
      root.append(
        h("div", { class: "prog" }, "Card " + (i + 1) + " of " + deck.length),
        h("button", { class: "card" + (flipped ? " flipped" : ""), "aria-label": "Flip the card", onclick: function () { flipped = !flipped; draw(); } },
          h("span", { class: "tag" }, flipped ? "Answer" : "Tap to flip"),
          h("span", { class: "big", html: flipped ? c.a : c.q })),
        h("div", { class: "row" },
          h("button", { class: "btn", disabled: !flipped, onclick: function () { if (!missed[c.q]) first++; i++; flipped = false; draw(); } }, "Got it"),
          h("button", { class: "btn alt", disabled: !flipped, onclick: function () { missed[c.q] = 1; deck.push(c); i++; flipped = false; draw(); } }, "Not yet: again later")));
    }
    draw(); return root;
  };

  /* multiple choice, one at a time */
  C.quiz = function (cfg, ctx) {
    var items = cfg.items, i = 0, score = 0, wrongIdx = [], root = h("div", { class: "quiz" });
    function draw() {
      root.innerHTML = "";
      if (i >= items.length) {
        root.append(h("div", { class: "info" }, h("b", null, "Score: " + score + " / " + items.length + ". "),
          wrongIdx.length ? "Look again at: " + wrongIdx.map(function (n) { return "Q" + (n + 1); }).join(", ") + "." : "Full marks."),
          h("div", { class: "row" }, h("button", { class: "btn", onclick: function () { i = 0; score = 0; wrongIdx = []; draw(); } }, "Try again")));
        ctx.done(); log("quiz", score + "/" + items.length); return;
      }
      var it = items[i], answered = false;
      var order = shuffle(it.opts.map(function (o, idx) { return { o: o, idx: idx }; }));
      var box = h("div", { class: "opts" }), fbk = h("div");
      order.forEach(function (x) {
        var b = h("button", { class: "opt", onclick: function () {
          if (answered) return; answered = true;
          var ok = x.idx === it.a; if (ok) score++; else wrongIdx.push(i);
          Array.prototype.forEach.call(box.children, function (btn, k) {
            btn.disabled = true;
            if (order[k].idx === it.a) btn.classList.add("right");
            else if (btn === b) btn.classList.add("wrong");
          });
          fbk.append(fb(ok, ok ? "✓ Correct" : "✗ Not quite", it.why));
          fbk.append(h("div", { class: "row" }, h("button", { class: "btn", onclick: function () { i++; draw(); } }, i + 1 < items.length ? "Next question" : "See score")));
        } }, x.o);
        box.append(b);
      });
      root.append(h("div", { class: "prog" }, "Question " + (i + 1) + " of " + items.length), h("div", { class: "card plain" }, h("span", { class: "big", html: it.q })), box, fbk);
    }
    draw(); return root;
  };

  /* sort one card at a time into bins (bin can accept an array) */
  C.sort = function (cfg, ctx) {
    var items = shuffle(cfg.items), i = 0, right = 0, missed = [], root = h("div", { class: "sort" });
    function binLabel(id) { var b = cfg.bins.filter(function (x) { return x.id === id; })[0]; return b ? b.label : id; }
    function draw() {
      root.innerHTML = "";
      if (i >= items.length) {
        root.append(h("div", { class: "info" }, h("b", null, right + " of " + items.length + " first time. "),
          missed.length ? "Revisit: " + missed.map(function (m) { return "“" + m.t.replace(/<[^>]+>/g, "") + "”"; }).join("; ") : "No slips."),
          h("div", { class: "row" }, h("button", { class: "btn", onclick: function () { items = shuffle(cfg.items); i = 0; right = 0; missed = []; draw(); } }, "Go again")));
        ctx.done(); log("sort", right + "/" + items.length); return;
      }
      var it = items[i], ok = Array.isArray(it.bin) ? it.bin : [it.bin], answered = false, fbk = h("div");
      var bins = h("div", { class: "bins" });
      cfg.bins.forEach(function (b) {
        var btn = h("button", { class: "bin", onclick: function () {
          if (answered) return; answered = true;
          var good = ok.indexOf(b.id) > -1; if (good) right++; else missed.push(it);
          Array.prototype.forEach.call(bins.children, function (x, k) {
            x.disabled = true;
            if (ok.indexOf(cfg.bins[k].id) > -1) x.classList.add("right");
            else if (x === btn) x.classList.add("wrong");
          });
          var where = ok.map(binLabel).join(" or ");
          fbk.append(fb(good, good ? "✓ Yes" : "✗ Not quite", (good ? "" : "It belongs in <b>" + where + "</b>. ") + (it.why || "") + (good && ok.length > 1 ? " (Also fits: " + ok.filter(function (z) { return z !== b.id; }).map(binLabel).join(", ") + ".)" : "")));
          fbk.append(h("div", { class: "row" }, h("button", { class: "btn", onclick: function () { i++; draw(); } }, i + 1 < items.length ? "Next card" : "Finish")));
        } }, b.label, b.sub ? h("small", null, b.sub) : null);
        bins.append(btn);
      });
      root.append(h("div", { class: "prog" }, "Card " + (i + 1) + " of " + items.length), h("div", { class: "card fact plain" }, h("span", { class: "big", html: it.t })), bins, fbk);
    }
    draw(); return root;
  };

  /* tap the cards in the right order */
  C.order = function (cfg, ctx) {
    var n = cfg.items.length, root = h("div", { class: "order" });
    function draw() {
      root.innerHTML = "";
      var pool = cfg.items.map(function (it, k) { return { it: it, k: k }; }), tries = 0;
      do { pool = shuffle(pool); tries++; } while (tries < 20 && pool.every(function (p, k) { return p.k === k; }));
      var next = 0, slips = 0;
      var seq = h("ol", { class: "seq" }), pl = h("div", { class: "pool" }), msg = h("div");
      pool.forEach(function (p) {
        var b = h("button", { class: "opt", html: p.it.t, onclick: function () {
          if (p.k === next) {
            seq.append(h("li", null, h("span", { html: p.it.t }), p.it.note ? h("small", { html: p.it.note }) : null));
            b.remove(); next++;
            if (next === n) { msg.append(fb(true, "✓ In order", (slips ? "You needed " + slips + " extra tap" + (slips > 1 ? "s" : "") + ". " : "No slips. ") + (cfg.after || ""))); ctx.done(); log("order", slips + " slips"); }
          } else { slips++; b.classList.add("shake"); setTimeout(function () { b.classList.remove("shake"); }, 350); }
        } });
        pl.append(b);
      });
      root.append(h("div", { class: "prog" }, cfg.prompt || "Tap the cards in the order they happened"), seq, pl, msg,
        h("div", { class: "row" }, h("button", { class: "btn small alt", onclick: draw }, "Shuffle and restart")));
    }
    draw(); return root;
  };

  /* chain of links: choose the next link; builds a visible causal chain */
  C.chain = function (cfg, ctx) {
    var step = 0, root = h("div", { class: "chainwrap" });
    function draw() {
      root.innerHTML = "";
      var ch = h("div", { class: "chain" });
      ch.append(h("div", { class: "link start", html: cfg.start }));
      for (var s = 0; s < step; s++) { ch.append(h("div", { class: "arrow" }, "↓"), h("div", { class: "link", html: cfg.steps[s].opts[cfg.steps[s].a] })); }
      root.append(ch);
      if (step >= cfg.steps.length) {
        root.append(fb(true, "✓ Chain complete", cfg.finish || "Say the chain aloud in one breath, then put it into your own words in your notebook."));
        root.append(h("div", { class: "row" }, h("button", { class: "btn small alt", onclick: function () { step = 0; draw(); } }, "Run it again")));
        ctx.done(); log("chain", cfg.start.slice(0, 40)); return;
      }
      var st = cfg.steps[step], answered = false, fbk = h("div");
      var opts = h("div", { class: "opts" });
      shuffle(st.opts.map(function (o, idx) { return { o: o, idx: idx }; })).forEach(function (x) {
        var b = h("button", { class: "opt", html: x.o, onclick: function () {
          if (answered) return;
          if (x.idx === st.a) { answered = true; step++; draw(); }
          else { b.classList.add("wrong"); b.disabled = true; fbk.innerHTML = ""; fbk.append(fb(false, "✗ Try another", st.hint || "That doesn’t follow. Re-read the question.")); }
        } });
        opts.append(b);
      });
      root.append(h("div", { class: "arrow" }, "↓"), h("div", { class: "prog" }, "Link " + (step + 1) + " of " + cfg.steps.length), h("p", { html: "<b>" + st.ask + "</b>" }), opts, fbk);
    }
    draw(); return root;
  };

  /* fact -> impact prompt cards. The student writes in the notebook, then compares. */
  C.prompt = function (cfg, ctx) {
    var i = 0, root = h("div", { class: "prompt" });
    function draw() {
      root.innerHTML = "";
      if (i >= cfg.items.length) { root.append(h("div", { class: "info" }, "All done. Keep the best sentence from today for your paragraph."), h("div", { class: "row" }, h("button", { class: "btn small alt", onclick: function () { i = 0; draw(); } }, "Go round again"))); ctx.done(); log("prompt", "done"); return; }
      var it = cfg.items[i], step = 0, box = h("div");
      root.append(h("div", { class: "prog" }, "Fact " + (i + 1) + " of " + cfg.items.length),
        h("div", { class: "card fact plain" }, h("span", { class: "big", html: it.fact })),
        h("p", { html: "<b>" + it.ask + "</b>" }), box);
      var b1 = h("button", { class: "btn", onclick: function () {
        b1.remove();
        box.append(h("div", { class: "info" }, h("b", null, "Check yours against these questions"), h("ul", null, it.hints.map(function (x) { return h("li", { html: x }); }))));
        var b2 = h("button", { class: "btn alt", onclick: function () {
          b2.remove();
          box.append(h("div", { class: "info warn" }, h("b", null, "One strong version: "), h("span", { html: it.example }), h("div", null, h("small", null, "Is yours as specific? Yours can be different and still be right."))));
          box.append(h("div", { class: "row" }, h("button", { class: "btn", onclick: function () { i++; draw(); } }, i + 1 < cfg.items.length ? "Next fact" : "Finish")));
        } }, "Show one strong version");
        box.append(b2);
      } }, "I’ve written mine in my notebook");
      box.append(h("div", { class: "row" }, b1));
    }
    draw(); return root;
  };

  /* agency test (Lesson 1) */
  C.agency = function (cfg, ctx) {
    var ag = null, rates = [null, null, null], root = h("div", { class: "agency" });
    function draw() {
      root.innerHTML = "";
      var pills = h("div", { class: "pills", role: "group", "aria-label": "Choose an agency" });
      cfg.agencies.forEach(function (a) {
        pills.append(h("button", { class: "pill", "aria-pressed": ag === a ? "true" : "false", onclick: function () { ag = a; rates = [null, null, null]; draw(); } }, a.name));
      });
      root.append(h("p", null, h("b", null, "1. Choose one agency to test.")), pills);
      if (!ag) return;
      root.append(h("details", { class: "facts", open: true }, h("summary", null, "Facts on p.40 you can use"), h("ul", null, ag.facts.map(function (f) { return h("li", { html: f }); }))));
      cfg.tests.forEach(function (t, k) {
        var row = h("div", { class: "rate", role: "group", "aria-label": t.name });
        ["Strong", "Mixed", "Weak"].forEach(function (lab) {
          row.append(h("button", { "aria-pressed": rates[k] === lab ? "true" : "false", onclick: function () { rates[k] = lab; draw(); } }, lab));
        });
        root.append(h("div", { class: "test" }, h("p", { html: "<b>Test " + (k + 1) + ": " + t.name + "</b><br>" + t.q + (ag.hint && ag.hint[k] ? "<br><small>Look at: " + ag.hint[k] + "</small>" : "") }), row));
      });
      if (rates.every(Boolean)) {
        var s = rates.filter(function (x) { return x === "Strong"; }).length, w = rates.filter(function (x) { return x === "Weak"; }).length;
        var word = s >= 2 ? "VERY important" : (w >= 2 ? "NOT VERY important" : "FAIRLY important");
        root.append(h("div", { class: "readout" }, "Your three tests point to: ", h("b", null, word), ". That word belongs in your first sentence. Now choose the two facts that prove it, and decide what each one meant."));
        ctx.done(); log("agency", ag.name + " " + word);
      } else root.append(h("div", { class: "info" }, "Rate all three tests to see which judgement word they point to."));
    }
    draw(); return root;
  };

  /* weigh factors with sliders (Lesson 4) */
  C.weigh = function (cfg, ctx) {
    var vals = {}, touched = {}; cfg.factors.forEach(function (f) { vals[f.id] = 5; });
    var root = h("div", { class: "weigh" }), bars = h("div", { class: "bars" }), read = h("div");
    cfg.factors.forEach(function (f) {
      var out = h("output", null, "5");
      var inp = h("input", { type: "range", min: 0, max: 10, value: 5, "aria-label": f.label, oninput: function () { vals[f.id] = +inp.value; touched[f.id] = 1; out.textContent = inp.value; update(); } });
      root.append(h("div", { class: "slider" }, h("label", null, f.label), inp, out),
        h("details", { class: "facts" }, h("summary", null, "Evidence for this one"), h("ul", null, f.facts.map(function (x) { return h("li", { html: x }); }))));
    });
    root.append(bars, read);
    function update() {
      bars.innerHTML = "";
      var order = cfg.factors.slice().sort(function (a, b) { return vals[b.id] - vals[a.id]; });
      order.forEach(function (f) { bars.append(h("div", { class: "bar" + (f.id === cfg.focus ? " focus" : "") }, h("span", null, f.label + " (" + vals[f.id] + ")"), h("i", { style: "width:" + (vals[f.id] * 10) + "%" }))); });
      var focusV = vals[cfg.focus], others = cfg.factors.filter(function (f) { return f.id !== cfg.focus; });
      var maxO = Math.max.apply(null, others.map(function (f) { return vals[f.id]; }));
      var top = others.filter(function (f) { return vals[f.id] === maxO; })[0];
      var word = focusV >= maxO + 2 ? "MAINLY" : (focusV >= maxO - 1 ? "PARTLY" : "ONLY SLIGHTLY");
      read.innerHTML = "";
      var done = Object.keys(touched).length >= 3;
      read.append(h("div", { class: "readout" }, "Your scales say the " + cfg.focusName + " was ", h("b", null, word), " responsible. The heaviest other factor is ", h("b", null, top.label), ". That is the one to weigh it against in your paragraph. Which mattered more, and why?"));
      if (done) { ctx.done(); }
    }
    update(); return root;
  };

  /* calibrate a mark out of 100 (Lesson 5) */
  C.calibrate = function (cfg, ctx) {
    var vals = {}, touched = {}; cfg.aims.forEach(function (a) { vals[a.id] = 12; });
    var root = h("div", { class: "calib" }), tot = h("div", { class: "total" }), heck = h("div");
    cfg.aims.forEach(function (a) {
      var out = h("output", null, "12");
      var inp = h("input", { type: "range", min: 0, max: 25, value: 12, "aria-label": a.label, oninput: function () { vals[a.id] = +inp.value; touched[a.id] = 1; out.textContent = inp.value; update(); } });
      root.append(h("div", { class: "slider" }, h("label", null, a.label), inp, out),
        h("details", { class: "facts" }, h("summary", null, "Remind me what happened"),
          h("ul", null, a.facts.map(function (x) { return h("li", { html: x }); }))));
    });
    root.append(tot, heck);
    function update() {
      var sum = 0, hi = null, lo = null;
      cfg.aims.forEach(function (a) { sum += vals[a.id]; if (!hi || vals[a.id] > vals[hi.id]) hi = a; if (!lo || vals[a.id] < vals[lo.id]) lo = a; });
      tot.innerHTML = ""; tot.append(sum, h("small", null, " / 100"));
      var q = sum >= 70 ? cfg.heck[0] : sum >= 50 ? cfg.heck[1] : sum >= 30 ? cfg.heck[2] : cfg.heck[3];
      heck.innerHTML = "";
      heck.append(h("div", { class: "readout" }, h("b", null, "Heckler: "), q, h("br"), h("small", null, "Highest: " + hi.label + " (" + vals[hi.id] + "). Lowest: " + lo.label + " (" + vals[lo.id] + ").")));
      if (Object.keys(touched).length >= 4) ctx.done();
    }
    update(); return root;
  };

  /* tap term then definition */
  C.match = function (cfg, ctx) {
    var n = cfg.pairs.length, locked = 0, sel = null, root = h("div"), slips = 0;
    var L = shuffle(cfg.pairs.map(function (p, k) { return { k: k, t: p.t }; })), R = shuffle(cfg.pairs.map(function (p, k) { return { k: k, t: p.d }; }));
    var left = h("div", { class: "opts" }), right = h("div", { class: "opts" }), msg = h("div");
    function mk(x, side) {
      var b = h("button", { class: "opt", html: x.t, onclick: function () {
        if (b.classList.contains("lock")) return;
        if (!sel) { sel = { x: x, side: side, b: b }; b.classList.add("sel"); return; }
        if (sel.side === side) { sel.b.classList.remove("sel"); sel = { x: x, side: side, b: b }; b.classList.add("sel"); return; }
        if (sel.x.k === x.k) {
          sel.b.classList.remove("sel"); sel.b.classList.add("lock"); b.classList.add("lock"); locked++; sel = null;
          if (locked === n) { msg.append(fb(true, "✓ All matched", slips ? slips + " wrong guess" + (slips > 1 ? "es" : "") + "." : "No slips.")); ctx.done(); log("match", slips + " slips"); }
        } else { slips++; sel.b.classList.remove("sel"); sel = null; b.classList.add("shake"); setTimeout(function () { b.classList.remove("shake"); }, 350); }
      } });
      return b;
    }
    L.forEach(function (x) { left.append(mk(x, "l")); }); R.forEach(function (x) { right.append(mk(x, "r")); });
    root.append(h("div", { class: "prog" }, "Tap a term, then its meaning"), h("div", { class: "match" }, left, right), msg);
    return root;
  };

  /* writing brief: tap the key words, nudges, timer */
  C.brief = function (cfg, ctx) {
    var root = h("div", { class: "brief" }), meaning = h("div", { class: "meaning", "aria-live": "polite" }, "Tap a highlighted word to see what the question is asking.");
    var qb = h("div", { class: "qbox" }), pressed = null, seen = 0;
    cfg.q.forEach(function (s) {
      if (typeof s === "string") { qb.append(s); return; }
      var b = h("button", { class: "w", "aria-pressed": "false", onclick: function () {
        if (pressed) pressed.setAttribute("aria-pressed", "false");
        pressed = b; b.setAttribute("aria-pressed", "true"); meaning.innerHTML = "<b>" + s.w + ":</b> " + s.m; seen++;
      } }, s.w);
      qb.append(b);
    });
    root.append(h("div", { class: "mhead" }, cfg.label || "The question"), qb, meaning);
    if (cfg.rules) root.append(h("ul", { class: "rules" }, cfg.rules.map(function (r) { return h("li", null, h("b", null, r[0]), r[1]); })));
    if (cfg.nudges) {
      var shown = 0, list = h("ul", { class: "nudges" });
      var nb = h("button", { class: "btn alt small", onclick: function () {
        list.append(h("li", { html: cfg.nudges[shown] })); shown++;
        if (shown >= cfg.nudges.length) nb.remove(); else nb.textContent = "Another nudge (" + shown + "/" + cfg.nudges.length + ")";
      } }, "I’m stuck: give me a nudge (0/" + cfg.nudges.length + ")");
      root.append(h("div", { class: "row" }, nb), list);
    }
    root.append(h("div", { class: "mhead" }, "Write it in your notebook · " + cfg.mins + " minutes"), timer(cfg.mins));
    var cb = h("input", { type: "checkbox", id: "ack-" + Math.random().toString(36).slice(2), onchange: function () { if (cb.checked) { ctx.done(); log("brief", cfg.label || "written"); } } });
    root.append(h("label", { class: "ack", for: cb.id }, cb, "I’ve finished writing in my notebook"));
    return root;
  };

  /* self-check list */
  C.check = function (cfg, ctx) {
    var root = h("div"), ul = h("ul", { class: "checks" }), band = h("div", { class: "band" }), n = cfg.items.length;
    var boxes = cfg.items.map(function (t, k) {
      var cb = h("input", { type: "checkbox", onchange: update });
      ul.append(h("li", null, h("label", null, cb, h("span", { html: t }))));
      return cb;
    });
    function update() {
      var c = boxes.filter(function (b) { return b.checked; }).length, m = null;
      cfg.bands.forEach(function (b) { if (c >= b.min) m = b; });
      band.innerHTML = "";
      band.append(cfg.mode === "mark" ? h("span", null, h("b", null, "About " + c + " / " + n + ". "), "This is your own estimate, not a mark scheme. ") : h("span", null, h("b", null, c + " of " + n + " ticked. ")), m ? m.t : "");
      if (c === n) { ctx.done(); log("check", c + "/" + n); }
    }
    root.append(ul, band); update(); return root;
  };

  /* annotated model, unlocked after writing */
  C.model = function (cfg, ctx) {
    var root = h("div"), body = h("div"), unlocked = false;
    var lock = h("div", { class: "lock" }, h("p", { html: "<b>Write first.</b> The model unlocks when you’ve written your own paragraph in your notebook." }),
      h("button", { class: "btn", onclick: function () { unlocked = true; lock.remove(); body.hidden = false; ctx.done(); log("model", "opened"); } }, "I’ve written mine: show the model"));
    body.hidden = true;
    var names = { p: "Judgement", e: "Evidence", x: "Explain", l: "Link", r: "Reason" };
    body.append(h("div", { class: "legend" }, h("span", { class: "j-p" }, "Judgement / point"), h("span", { class: "j-e" }, "Evidence"), h("span", { class: "j-x" }, "Explain"), h("span", { class: "j-l" }, "Link")));
    var allBtn = h("button", { class: "btn small alt", onclick: function () { body.classList.toggle("all"); allBtn.textContent = body.classList.contains("all") ? "Hide labels" : "Show all labels"; } }, "Show all labels");
    var note = h("div", { class: "notebox" }, "Tap any sentence to see the job it does. Do it before you look at all the labels.");
    body.append(h("div", { class: "row" }, allBtn));
    cfg.models.forEach(function (m) {
      body.append(h("div", { class: "mhead" }, m.title), h("p", { class: "mq" }, m.q));
      m.paras.forEach(function (p) {
        var para = h("div", { class: "para" });
        p.forEach(function (s, k) {
          var b = h("button", { class: "sent j-" + s.k, onclick: function () {
            b.classList.toggle("on");
            note.innerHTML = "<b>" + names[s.k] + ":</b> " + s.note;
          } }, h("span", { class: "tx", html: s.t }), h("sup", null, names[s.k]));
          para.append(b, " ");
        });
        body.append(para);
      });
    });
    body.append(note);
    if (cfg.after) body.append(h("div", { class: "info", html: cfg.after }));
    root.append(lock, body); return root;
  };

  /* twin question: same moves, new facts */
  C.twin = function (cfg, ctx) {
    var root = h("div"), count = 0;
    root.append(h("div", { class: "info", html: cfg.intro || "Write a <b>slightly different</b> version in your notebook: same moves, new facts." }));
    cfg.twins.forEach(function (t) {
      var cb = h("input", { type: "checkbox", id: "tw-" + Math.random().toString(36).slice(2), onchange: function () { if (cb.checked) { count++; log("twin", t.label); if (count >= cfg.twins.length) ctx.done(); } else count--; } });
      root.append(h("div", { class: "twin" }, h("h3", null, t.label), h("p", { class: "mq", html: t.q }),
        h("div", { class: "chg", html: "<b>What changes:</b> " + t.change }),
        t.facts ? h("details", { class: "facts" }, h("summary", null, "Facts you can use"), h("ul", null, t.facts.map(function (f) { return h("li", { html: f }); }))) : null,
        h("div", { class: "row" }, timer(t.mins || 8)),
        h("label", { class: "ack", for: cb.id }, cb, "I’ve written it in my notebook")));
    });
    return root;
  };

  /* ---------- shell ---------- */
  function ticker(items) {
    var track = h("div", { class: "track" });
    var one = items.map(function (i) { return "<span class='it'><b>" + i[0] + "</b> " + i[1] + "</span>"; }).join("<span class='sep'>◆</span>") + "<span class='sep'>◆</span>";
    track.innerHTML = one + one;
    var chars = items.reduce(function (n, i) { return n + i[0].length + i[1].length; }, 0);
    track.style.setProperty("--dur", Math.max(45, Math.round(chars * 0.34)) + "s");
    return h("div", { class: "ticker", "aria-hidden": "true" }, h("span", { class: "lab" }, "Wire"), h("div", { class: "win" }, track));
  }

  var LAB = {
    _cfg: null,
    start: function (cfg) {
      LAB._cfg = cfg;
      var app = document.getElementById("app");
      document.title = "Lesson " + cfg.n + " · " + cfg.title + " · G9 IGCSE History";
      app.append(h("header", { class: "top" }, h("div", { class: "wrap" },
        h("a", { class: "brand", href: "index.html" }, h("img", { class: "logo", src: "assets/sisb-logo.png", alt: "SISB School" }), h("span", { class: "sub" }, "Humanities")),
        h("div", { class: "crumb" }, h("a", { href: "index.html" }, "All lessons"), " · G9 IGCSE History · League of Nations Lab"))));
      var wrap = h("main", { class: "wrap" });
      wrap.append(h("div", { class: "hero" }, h("div", { class: "kicker" }, "Lesson " + cfg.n + " · " + cfg.pages), h("h1", null, cfg.title),
        h("div", { class: "target" }, h("b", null, "Today you write"), h("span", { html: cfg.target }))));
      if (cfg.wire) wrap.append(ticker(cfg.wire));
      var nav = h("div", { class: "tabs", role: "tablist" }), panels = [], tabBtns = [], tabDone = [];
      cfg.tabs.forEach(function (t, ti) {
        var panel = h("section", { class: "panel", id: "p-" + t.id, role: "tabpanel", hidden: true });
        var need = 0, got = 0;
        t.blocks.forEach(function (b, bi) {
          var tracked = b.type !== "info";
          if (tracked) need++;
          var box = h("div", { class: "block" + (b.theme ? " theme-" + b.theme : "") });
          var fired = false;
          var ctx = { done: function () { if (fired) return; fired = true; box.classList.add("is-done"); got++; if (got >= need) { tabBtns[ti].classList.add("done"); } } };
          if (b.h) box.append(h("h2", null, b.h, tracked ? h("span", { class: "done-mark" }, "Done") : null));
          if (b.intro) box.append(h("p", { class: "intro", html: b.intro }));
          box.append(C[b.type](b, ctx));
          panel.append(box);
        });
        var btn = h("button", { class: "tab", role: "tab", id: "t-" + t.id, "aria-selected": "false", "aria-controls": "p-" + t.id, onclick: function () { show(ti); } }, h("span", { class: "n" }, String(ti + 1)), t.label);
        nav.append(btn); tabBtns.push(btn); panels.push(panel);
      });
      wrap.append(nav); panels.forEach(function (p) { wrap.append(p); });
      wrap.append(h("div", { class: "foot" }, "You write in your notebook. Nothing you tap on this page is saved or sent to your teacher. Facts and page numbers are from Walsh, ", h("i", null, "Modern World History for Cambridge IGCSE"), "."));
      app.append(wrap);
      function show(i) {
        tabBtns.forEach(function (b, k) { b.setAttribute("aria-selected", k === i ? "true" : "false"); panels[k].hidden = k !== i; });
        store.set("g9lon:" + cfg.n, cfg.tabs[i].id);
        try { history.replaceState(null, "", "#" + cfg.tabs[i].id); } catch (e) {}
        window.scrollTo(0, 0);
      }
      var start = 0, want = (location.hash || "").replace("#", "") || store.get("g9lon:" + cfg.n, "");
      cfg.tabs.forEach(function (t, k) { if (t.id === want) start = k; });
      show(start); window.scrollTo(0, 0);
    }
  };
  global.LAB = LAB;
})(window);
