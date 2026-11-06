// ============================================================
// main.js — общий скрипт (фаза 2)
// 1) Плавное появление блоков при скролле (.fade-in → .visible)
// 2) Анимация счётчиков [data-counter] — 2s, ease-out (spec/01-design.md)
// Все интерактивы страниц — в отдельных js-файлах.
// ============================================================

// --- Плавное появление блоков при скролле ---
const fadeEls = document.querySelectorAll('.fade-in');

if (fadeEls.length > 0) {
  const fadeObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  fadeEls.forEach((el) => fadeObserver.observe(el));
}

// --- Счётчики ---
// data-counter="1962" · data-counter-suffix="%"
// data-counter-format="money" — тысячи через пробел (981 324)
const counters = document.querySelectorAll('[data-counter]');

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const formatCounterValue = (value, format) => {
  if (format === 'money') {
    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  return String(Math.round(value));
};

const runCounter = (el) => {
  const target = parseFloat(el.dataset.counter);
  const suffix = el.dataset.counterSuffix || '';
  const format = el.dataset.counterFormat || '';
  const duration = 2000;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const value = formatCounterValue(target * easeOutCubic(progress), format) + suffix;
    el.textContent = value;
    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
};

if (counters.length > 0) {
  const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        runCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  counters.forEach((el) => counterObserver.observe(el));
}

// --- Слайдеры презентаций кейсов (фаза 12) ---
// Универсально: .case-slider-wrapper → кнопки .prev/.next и .slide.
// Активный слайд: .active; по кругу (после последнего — первый).

document.querySelectorAll('.case-slider-wrapper').forEach((wrapper) => {
  const slider = wrapper.querySelector('.case-slider');
  if (!slider) return;
  const slides = Array.from(slider.querySelectorAll('.slide'));
  if (slides.length < 1) return;

  let index = 0;

  const show = (i) => {
    slides.forEach((slide, n) => slide.classList.toggle('active', n === i));
  };

  const prevBtn = wrapper.querySelector('.slider-btn.prev');
  const nextBtn = wrapper.querySelector('.slider-btn.next');

  if (prevBtn) prevBtn.addEventListener('click', () => {
    index = (index + slides.length - 1) % slides.length;
    show(index);
  });

  if (nextBtn) nextBtn.addEventListener('click', () => {
    index = (index + 1) % slides.length;
    show(index);
  });
});
