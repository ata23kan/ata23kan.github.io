// Home-page hero: a triangular mesh deforming around a pitching and plunging body.
// Nodes near the body move rigidly with it; the motion is blended smoothly to zero
// farther away, as in a simple ALE mesh-motion scheme. Cells are shaded by the log
// of their area ratio (expansion warm, compression cool).
(function () {
  var canvas = document.querySelector('[data-mesh]');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var button = document.querySelector('[data-mesh-toggle]');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var PERIOD = 7; // seconds per pitch-plunge cycle

  var width = 0, height = 0, L = 0;
  var ref = [];  // reference node positions
  var cur = [];  // deformed node positions
  var tris = []; // [p, q, r, reference area]
  var body = {};
  var colors = {};
  var t = 1.2;
  var last = null;
  var raf = null;
  var visible = true;
  var paused = reduceMotion.matches;

  function signedArea(a, b, c) {
    return 0.5 * ((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]));
  }

  function insideBody(p) {
    var x = (p[0] - body.cx) / body.a;
    var y = (p[1] - body.cy) / body.b;
    return x * x + y * y < 1;
  }

  // 1 inside rIn (rigid), 0 beyond rOut (fixed), cosine ramp in between.
  function blend(r) {
    if (r <= body.rIn) return 1;
    if (r >= body.rOut) return 0;
    var s = (r - body.rIn) / (body.rOut - body.rIn);
    return 0.5 * (1 + Math.cos(Math.PI * s));
  }

  function motion(time) {
    var w = (2 * Math.PI * time) / PERIOD;
    return {
      dx: 0.035 * L * Math.sin(2 * w),       // small surge: figure-eight path
      dy: 0.13 * L * Math.sin(w),            // plunge
      th: 0.4 * Math.sin(w + Math.PI / 2)    // pitch, 90 degrees ahead of plunge
    };
  }

  function readColors() {
    var s = getComputedStyle(document.documentElement);
    colors = {
      line: s.getPropertyValue('--mesh-line').trim(),
      warm: s.getPropertyValue('--mesh-warm').trim(),
      cool: s.getPropertyValue('--mesh-cool').trim(),
      body: s.getPropertyValue('--accent').trim()
    };
  }

  function build() {
    var rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    if (!width || !height) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    L = Math.min(width, height);
    body = { cx: width * 0.5, cy: height * 0.5, a: 0.2 * L, b: 0.05 * L, rIn: 0.24 * L, rOut: 0.66 * L };

    // Equilateral lattice, padded by one cell so boundary motion never shows a gap.
    var dx = L / 15;
    var dy = dx * Math.sqrt(3) / 2;
    var cols = Math.ceil(width / dx) + 3;
    var rows = Math.ceil(height / dy) + 3;
    var x0 = (width - (cols - 1.5) * dx) / 2;
    var y0 = (height - (rows - 1) * dy) / 2;
    ref = [];
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        ref.push([x0 + (i + (j % 2) * 0.5) * dx, y0 + j * dy]);
      }
    }
    cur = ref.map(function (p) { return p.slice(); });

    function id(i, j) { return j * cols + i; }
    tris = [];
    for (j = 0; j < rows - 1; j++) {
      for (i = 0; i < cols - 1; i++) {
        var pair = j % 2 === 0
          ? [[id(i, j), id(i + 1, j), id(i, j + 1)], [id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)]]
          : [[id(i, j), id(i + 1, j + 1), id(i, j + 1)], [id(i, j), id(i + 1, j), id(i + 1, j + 1)]];
        for (var k = 0; k < 2; k++) {
          var tri = pair[k];
          if (insideBody(ref[tri[0]]) && insideBody(ref[tri[1]]) && insideBody(ref[tri[2]])) continue;
          tris.push([tri[0], tri[1], tri[2], signedArea(ref[tri[0]], ref[tri[1]], ref[tri[2]])]);
        }
      }
    }
  }

  function deform(m) {
    var c = Math.cos(m.th), s = Math.sin(m.th);
    for (var n = 0; n < ref.length; n++) {
      var x = ref[n][0], y = ref[n][1];
      var rx = x - body.cx, ry = y - body.cy;
      var w = blend(Math.sqrt(rx * rx + ry * ry));
      cur[n][0] = x + w * (body.cx + m.dx + c * rx - s * ry - x);
      cur[n][1] = y + w * (body.cy + m.dy + s * rx + c * ry - y);
    }
  }

  function draw() {
    if (!width || !height) return;
    var m = motion(t);
    deform(m);
    ctx.clearRect(0, 0, width, height);

    for (var n = 0; n < tris.length; n++) {
      var tri = tris[n];
      var a = cur[tri[0]], b = cur[tri[1]], c = cur[tri[2]];
      var v = Math.log(signedArea(a, b, c) / tri[3]);
      var alpha = Math.min(Math.abs(v) * 1.4, 0.5);
      if (alpha < 0.015) continue;
      ctx.fillStyle = 'rgb(' + (v > 0 ? colors.warm : colors.cool) + ' / ' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(c[0], c[1]);
      ctx.fill();
    }

    ctx.beginPath();
    for (n = 0; n < tris.length; n++) {
      var p = cur[tris[n][0]], q = cur[tris[n][1]], r = cur[tris[n][2]];
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
      ctx.lineTo(r[0], r[1]);
      ctx.closePath();
    }
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.save();
    ctx.translate(body.cx + m.dx, body.cy + m.dy);
    ctx.rotate(m.th);
    ctx.beginPath();
    ctx.ellipse(0, 0, body.a, body.b, 0, 0, 2 * Math.PI);
    ctx.fillStyle = colors.body;
    ctx.fill();
    ctx.restore();
  }

  function playing() {
    return visible && !paused;
  }

  function frame(now) {
    raf = null;
    if (last !== null) t += Math.min((now - last) / 1000, 0.1);
    last = now;
    draw();
    if (playing()) raf = requestAnimationFrame(frame);
    else last = null;
  }

  function update() {
    if (button) {
      button.dataset.paused = String(paused);
      button.setAttribute('aria-label', paused ? 'Play animation' : 'Pause animation');
    }
    if (playing() && !raf) raf = requestAnimationFrame(frame);
  }

  if (button) {
    button.addEventListener('click', function () {
      paused = !paused;
      update();
    });
  }

  new ResizeObserver(function () { build(); draw(); }).observe(canvas);
  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    update();
  }).observe(canvas);
  document.addEventListener('themechange', function () { readColors(); draw(); });
  reduceMotion.addEventListener('change', function () {
    paused = reduceMotion.matches;
    update();
  });

  readColors();
  build();
  draw();
  update();
})();
