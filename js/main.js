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

// --- Слайдеры презентаций кейсов (фаза 12, автоплей — фаза 23) ---
// Универсально: .case-slider-wrapper → кнопки .prev/.next и .slide.
// Активный слайд: .active; по кругу (после последнего — первый).
// Автоплей каждые 10 с; пауза при наведении/касании и после клика по кнопке.

const SLIDER_AUTOPLAY_DELAY = 10000;

function nextSlide(container, direction = 1) {
  const slides = Array.from(container.querySelectorAll('.slide'));
  if (slides.length < 2) return;
  const current = slides.findIndex((slide) => slide.classList.contains('active'));
  const from = current < 0 ? 0 : current;
  const next = (from + direction + slides.length) % slides.length;
  slides[from].classList.remove('active');
  slides[next].classList.add('active');
}

document.querySelectorAll('.case-slider-wrapper').forEach((wrapper) => {
  const slider = wrapper.querySelector('.case-slider');
  if (!slider) return;
  const slides = Array.from(slider.querySelectorAll('.slide'));
  if (slides.length < 1) return;

  const prevBtn = wrapper.querySelector('.slider-btn.prev');
  const nextBtn = wrapper.querySelector('.slider-btn.next');
  let timer = null;
  let paused = false;

  const stopAutoplay = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  const startAutoplay = () => {
    stopAutoplay();
    timer = window.setInterval(() => {
      if (!paused && !document.hidden) nextSlide(slider, 1);
    }, SLIDER_AUTOPLAY_DELAY);
  };

  if (prevBtn) prevBtn.addEventListener('click', () => {
    nextSlide(slider, -1);
    startAutoplay();
  });

  if (nextBtn) nextBtn.addEventListener('click', () => {
    nextSlide(slider, 1);
    startAutoplay();
  });

  // Пауза, пока пользователь читает слайд: мышь над слайдером или палец на экране.
  wrapper.addEventListener('mouseenter', () => {
    paused = true;
    stopAutoplay();
  });

  wrapper.addEventListener('mouseleave', () => {
    paused = false;
    startAutoplay();
  });

  // Свайп: больше 50 px по горизонтали — переключаем слайд.
  const SWIPE_THRESHOLD = 50;
  let touchStartX = null;
  let touchStartY = null;

  wrapper.addEventListener('touchstart', (event) => {
    paused = true;
    stopAutoplay();
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  const resetTouch = () => {
    touchStartX = null;
    touchStartY = null;
    paused = false;
    startAutoplay();
  };

  wrapper.addEventListener('touchend', (event) => {
    if (touchStartX !== null && touchStartY !== null) {
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        nextSlide(slider, dx < 0 ? 1 : -1);
      }
    }
    resetTouch();
  }, { passive: true });

  wrapper.addEventListener('touchcancel', resetTouch, { passive: true });

  startAutoplay();
});

// --- Выпадающее меню «Кейсы» (фаза 16) ---
// Открытие по клику; закрытие по клику вне меню и по Escape.
document.querySelectorAll('.dropdown').forEach((dropdown) => {
  const toggle = dropdown.querySelector('.dropdown-toggle');
  const menu = dropdown.querySelector('.dropdown-menu');
  if (!toggle || !menu) return;

  const close = () => {
    menu.classList.remove('show');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = menu.classList.toggle('show');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) close();
  });

  document.addEventListener('click', (event) => {
    if (!dropdown.contains(event.target)) close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
});
