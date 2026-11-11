import {identityTimeline, ICE_FRAMES} from './identity-timeline.js?v=20261110-photo-after-turn';

const story = document.querySelector('.identity-story');
const canvas = document.querySelector('#identity-canvas');
if (story && canvas) {
  const context = canvas.getContext('2d', {alpha: true});
  const stage = story.querySelector('.identity-stage');
  const scenes = ['intro', 'ip', 'photo'].map(name => story.querySelector(`.identity-${name}`));
  const cue = story.querySelector('.scroll-invitation span');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const staticRequested = new URLSearchParams(location.search).get('motion') === 'off';
  let ice = [], ready = false, loading = null, pending = 0;

  function staticView() {
    ready = false;
    cancelAnimationFrame(pending); pending = 0;
    story.classList.remove('sequence-ready');
    canvas.dataset.state = 'static';
    scenes.forEach(scene => {
      scene.style.removeProperty('opacity'); scene.style.removeProperty('transform');
      scene.removeAttribute('aria-hidden'); scene.inert = false;
    });
  }

  function render() {
    pending = 0;
    if (!ready || reduced.matches || staticRequested || document.hidden) return;
    const rect = story.getBoundingClientRect();
    const width = stage.clientWidth, height = stage.clientHeight;
    if (!width || !height || rect.bottom < 0 || rect.top > innerHeight) return;
    const state = identityTimeline(-rect.top / Math.max(1, rect.height - height));
    const mobile = width <= 900;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const bufferWidth = Math.round(width * dpr), bufferHeight = Math.round(height * dpr);
    if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
      canvas.width = bufferWidth; canvas.height = bufferHeight;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = '#08090d';
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = 'lighten';
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
    function draw(image, alpha, w, h, cx, cy) {
      if (alpha <= .001) return;
      context.globalAlpha = alpha;
      context.drawImage(image, cx - w / 2, cy - h / 2, w, h);
    }
    const iceSize = mobile ? Math.min(width * 1.35, height * .70) : Math.min(width * .76, height * 1.02, 960);
    draw(ice[state.iceFrame], state.iceAlpha, iceSize, iceSize, width * .5, height * (mobile ? .61 : .53));
    context.globalAlpha = 1;
    [state.intro, state.ip, state.photo].forEach((alpha, index) => {
      scenes[index].style.opacity = alpha.toFixed(3);
      scenes[index].style.transform = `translateY(${(1-alpha) * (index === 0 ? -18 : 18)}px)`;
      scenes[index].setAttribute('aria-hidden', String(alpha < .05));
      scenes[index].inert = alpha < .05;
    });
    cue.textContent = state.progress < .60 ? '向下滚动，让 IP 转起来' : state.progress < .84 ? '继续向下，认识 Paulus' : '向下探索我的作品';
    canvas.dataset.state = 'ready';
    canvas.dataset.progress = state.progress.toFixed(4);
    canvas.dataset.iceFrame = String(state.iceFrame);
    canvas.dataset.scene = state.photo > .5 ? 'photo' : 'ice';
  }
  function schedule() {
    if (ready && !pending && !document.hidden) pending = requestAnimationFrame(render);
  }
  async function loadFrames(directory, count) {
    return Promise.all(Array.from({length: count}, (_, index) => new Promise((resolve, reject) => {
      const image = new Image(); image.decoding = 'async';
      image.onload = () => resolve(image); image.onerror = reject;
      image.src = `assets/identity/${directory}/${String(index).padStart(2, '0')}.webp`;
    })));
  }
  async function enable() {
    if (reduced.matches || staticRequested || !context) { staticView(); return; }
    try {
      loading ||= loadFrames('ice-sequence', ICE_FRAMES);
      ice = await loading;
      if (reduced.matches || staticRequested) return;
      ready = true; story.classList.add('sequence-ready'); schedule();
      document.dispatchEvent(new Event('identity:ready'));
    } catch { staticView(); }
  }
  addEventListener('scroll', schedule, {passive: true});
  addEventListener('resize', schedule, {passive: true});
  new ResizeObserver(schedule).observe(stage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(pending); pending = 0; }
    else schedule();
  });
  reduced.addEventListener('change', () => reduced.matches ? staticView() : enable());
  enable();
}
