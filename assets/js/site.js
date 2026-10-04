// Light/dark toggle. The saved choice is applied before paint by an inline script in head.html.
(function () {
  var root = document.documentElement;
  var button = document.querySelector('[data-theme-toggle]');
  var media = window.matchMedia('(prefers-color-scheme: dark)');

  function current() {
    return root.dataset.theme || (media.matches ? 'dark' : 'light');
  }

  function notify() {
    document.dispatchEvent(new Event('themechange'));
  }

  if (button) {
    button.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
      notify();
    });
  }

  media.addEventListener('change', function () {
    if (!root.dataset.theme) notify();
  });
})();

// Videos marked data-autoplay play only while on screen. With reduced motion
// they stay paused on their poster and get controls instead.
(function () {
  var videos = document.querySelectorAll('video[data-autoplay]');
  if (!videos.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    videos.forEach(function (v) { v.controls = true; });
    return;
  }

  var onScreen = new Set();

  function play(v) {
    v.muted = true;
    var p = v.play();
    // Only a blocked autoplay needs controls; interrupted plays (scrolling, background tabs) are harmless.
    if (p) p.catch(function (e) { if (e.name === 'NotAllowedError') v.controls = true; });
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var v = entry.target;
      if (entry.isIntersecting) {
        onScreen.add(v);
        play(v);
      } else {
        onScreen.delete(v);
        v.pause();
      }
    });
  }, { threshold: 0.25 });

  videos.forEach(function (v) { observer.observe(v); });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') onScreen.forEach(play);
  });
})();
