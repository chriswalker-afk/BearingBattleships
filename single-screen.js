/* Scale the board within its available viewport space without distorting
   the 1000 x 650 canvas or changing bearing measurements. */
(() => {
  'use strict';
  const board = document.getElementById('board');
  const sea = document.getElementById('sea');
  const wrap = document.querySelector('.seaWrap');
  const footer = document.querySelector('.seafooter');
  if (!board || !sea || !wrap || !footer) return;
  const desktop = window.matchMedia('(min-width: 960px) and (min-height: 600px)');
  let queued = false;
  function fit() {
    queued = false;
    if (!desktop.matches) {
      sea.style.removeProperty('width');
      return;
    }
    const availableWidth = wrap.clientWidth;
    const borderWidth = parseFloat(getComputedStyle(sea).borderLeftWidth || 0) +
      parseFloat(getComputedStyle(sea).borderRightWidth || 0);
    const borderHeight = parseFloat(getComputedStyle(sea).borderTopWidth || 0) +
      parseFloat(getComputedStyle(sea).borderBottomWidth || 0);
    const availableHeight = wrap.clientHeight - footer.offsetHeight -
      (parseFloat(getComputedStyle(wrap).rowGap || 0) || 0) - 3;
    if (availableWidth <= 0 || availableHeight <= borderHeight) return;
    const contentRatio = board.width / board.height;
    const maxByHeight = (availableHeight - borderHeight) * contentRatio + borderWidth;
    const width = Math.max(1, Math.floor(Math.min(availableWidth - 2, maxByHeight)));
    sea.style.width = width + 'px';
  }
  function queueFit() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(fit);
  }
  window.addEventListener('resize', queueFit);
  window.addEventListener('load', queueFit);
  if (desktop.addEventListener) desktop.addEventListener('change', queueFit);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(queueFit);
    observer.observe(wrap);
    observer.observe(footer);
  }
  queueFit();
})();
