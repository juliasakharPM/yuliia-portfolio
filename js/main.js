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

// --- Плавное раскрытие аккордеонов бизнес-логики (фаза 27) ---
// Нативный <details> открывается рывком; анимируем height вручную.
document.querySelectorAll('.logic-accordion').forEach((details) => {
  const summary = details.querySelector('.logic-summary');
  const content = details.querySelector('.logic-content');
  if (!summary || !content) return;

  let onEnd = null;
  let fallback = null;

  const cleanup = () => {
    if (onEnd) {
      details.removeEventListener('transitionend', onEnd);
      onEnd = null;
    }
    if (fallback !== null) {
      window.clearTimeout(fallback);
      fallback = null;
    }
  };

  const finish = (open) => {
    cleanup();
    details.open = open;
    details.style.height = null;
  };

  summary.addEventListener('click', (event) => {
    event.preventDefault();

    const startHeight = details.getBoundingClientRect().height;
    const willOpen = !details.open;

    cleanup();

    if (willOpen) {
      details.open = true;
      const endHeight = summary.offsetHeight + content.offsetHeight;
      details.style.height = `${startHeight}px`;
      details.offsetHeight; // принудительный reflow фиксирует стартовую высоту
      details.style.height = `${endHeight}px`;
    } else {
      const endHeight = summary.offsetHeight;
      details.style.height = `${startHeight}px`;
      details.offsetHeight;
      details.style.height = `${endHeight}px`;
    }

    onEnd = (e) => {
      if (e.target !== details || e.propertyName !== 'height') return;
      finish(willOpen);
    };
    details.addEventListener('transitionend', onEnd);
    // Страховка, если transitionend не придёт.
    fallback = window.setTimeout(() => finish(willOpen), 450);
  });
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

// --- Магнитные кнопки (фаза 53) ---
// Только на десктопе с точным указателем и шириной больше 768px.
const magneticQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

if (magneticQuery.matches && window.innerWidth > 768) {
  document.querySelectorAll('.btn').forEach((btn) => {
    btn.addEventListener('mousemove', (event) => {
      const rect = btn.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      if (Math.abs(x) < rect.width / 2 && Math.abs(y) < rect.height / 2) {
        btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
      }
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
    });
  });
}

// --- Глобальный поиск Cmd/Ctrl+K (фаза 53) ---
const searchData = [
  { title: 'Кейс Астрал (AI-бот)', url: 'case-astral.html', keywords: 'астрал ai бот поддержка 1962' },
  { title: 'Кейс Нейросборка', url: 'case-neirosborka.html', keywords: 'нейросборка комьюнити rag' },
  { title: 'Кейс StoryAxis', url: 'case-storyaxis.html', keywords: 'стори квесты платформа' },
  { title: 'Кейс DesignMatrix', url: 'case-designmatrix.html', keywords: 'дизайн 3d интерьер' },
  { title: 'Как я думаю', url: 'how-i-think.html', keywords: 'процесс мышление подход' }
];

const searchModal = document.getElementById('search-modal');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchOpeners = document.querySelectorAll('[data-search-open]');
const searchClosers = document.querySelectorAll('[data-search-close]');

let searchActiveIndex = -1;

function searchNorm(value) {
  return (value || '').toLowerCase().trim();
}

function renderSearchResults(query) {
  if (!searchResults) return;
  const q = searchNorm(query);
  const matches = q
    ? searchData.filter((item) => searchNorm(item.title).includes(q) || searchNorm(item.keywords).includes(q))
    : searchData;

  searchResults.innerHTML = '';
  searchActiveIndex = -1;

  if (matches.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'search-empty';
    empty.textContent = 'Ничего не найдено';
    searchResults.appendChild(empty);
    return;
  }

  matches.forEach((item) => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = item.url;
    link.textContent = item.title;
    li.appendChild(link);
    searchResults.appendChild(li);
  });
}

function openSearch() {
  if (!searchModal || !searchInput) return;
  searchModal.classList.add('open');
  searchModal.setAttribute('aria-hidden', 'false');
  renderSearchResults('');
  searchInput.value = '';
  requestAnimationFrame(() => searchInput.focus());
}

function closeSearch() {
  if (!searchModal) return;
  searchModal.classList.remove('open');
  searchModal.setAttribute('aria-hidden', 'true');
  searchActiveIndex = -1;
}

function moveSearchSelection(direction) {
  const links = Array.from(searchResults.querySelectorAll('a'));
  if (links.length === 0) return;
  links.forEach((link) => link.classList.remove('active'));
  searchActiveIndex = (searchActiveIndex + direction + links.length) % links.length;
  links[searchActiveIndex].classList.add('active');
  links[searchActiveIndex].scrollIntoView({ block: 'nearest' });
}

searchOpeners.forEach((btn) => btn.addEventListener('click', openSearch));
searchClosers.forEach((el) => el.addEventListener('click', closeSearch));

if (searchInput) {
  searchInput.addEventListener('input', () => renderSearchResults(searchInput.value));
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSearchSelection(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSearchSelection(-1);
    } else if (event.key === 'Enter') {
      const active = searchResults.querySelector('a.active') || searchResults.querySelector('a');
      if (active) {
        event.preventDefault();
        window.location.href = active.getAttribute('href');
      }
    }
  });
}

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if ((event.metaKey || event.ctrlKey) && key === 'k') {
    event.preventDefault();
    if (searchModal && searchModal.classList.contains('open')) {
      closeSearch();
    } else {
      openSearch();
    }
  }
  if (event.key === 'Escape' && searchModal && searchModal.classList.contains('open')) {
    closeSearch();
  }
});

// --- Котик в футере: сон → пробуждение → потягивание → сон (фаза 58) ---
document.addEventListener('DOMContentLoaded', () => {
  const cat = document.querySelector('.cat-container');
  const footer = document.querySelector('footer');

  if (cat && footer) {
    let sleepTimer = null;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        // Футер в зоне видимости — будим кота.
        if (sleepTimer !== null) {
          window.clearTimeout(sleepTimer);
          sleepTimer = null;
        }
        cat.classList.add('is-awake');

        // Через 5 секунд (после потягивания) кот засыпает снова.
        sleepTimer = window.setTimeout(() => {
          cat.classList.remove('is-awake');
          sleepTimer = null;
        }, 5000);
      });
    }, { threshold: 0.5 });

    observer.observe(footer);
  }
});
