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

// --- Котик в футере: сон → пробуждение → потягивание → сон (фаза 71) ---
document.addEventListener('DOMContentLoaded', () => {
  const cat = document.getElementById('portfolio-cat') || document.querySelector('.cat-container');
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

        // Через пару секунд (после потягивания) кот засыпает снова.
        sleepTimer = window.setTimeout(() => {
          cat.classList.remove('is-awake');
          sleepTimer = null;
        }, 4300);
      });
    }, { threshold: 0.25 });

    observer.observe(footer);
  }
});

// ============================================================
// Фаза 62. Автодетект языка (RU/EN)
// ============================================================

const i18n = {
  ru: {
    nav_home: "Главная", nav_cases: "Кейсы", nav_resume: "Резюме", nav_contacts: "Контакты", nav_how_i_think: "Как я думаю",
    mindmap_title: "Как я думаю", mindmap_subtitle: "Мой процесс", back_to_home: "← Вернуться на главную",
    mindmap_hint: "Выберите кейс, чтобы развернуть <span style=\"color: var(--accent); font-style: italic;\">нейронную сеть</span> моих компетенций",
    comp_strategy: "Product Strategy",
    comp_strategy_text: `
      <p><strong>1. Точка входа (Инсайт):</strong> Идея нейроквестов родилась на обучающем вебинаре. Увидев восторженные отзывы пользователей, я поняла, что этот формат можно масштабировать.</p>
      <p><strong>2. Эволюция видения:</strong> Изначально я рассматривала продукт как маркетинговый инструмент (прогрев к покупке или концерту). Позже добавился социально-психологический слой. Ключевое осознание: мозгу не важно, играете вы или проживаете опыт в реальности. VR стал логичной финальной ступенью, но я сразу заложила fallback-сценарии для пользователей без VR-очков.</p>
      <p><strong>3. Декомпозиция и «Система нулевых ошибок»:</strong> ИИ дал оценку, что в одиночку разработать такой продукт нереально. Я приняла это как вызов: декомпозировала задачу и спроектировала модульную архитектуру. План: запуск MVP своими силами → помодульная пересборка с фрилансерами. Принцип «системы нулевых ошибок» родился из реалий: нейросети склонны «мусорить» в коде, плюс существуют риски хакерских атак. Для меня критично сохранить идеальный UX: любая техническая ошибка разрушает магию квеста.</p>
      <p><strong>4. Главный вызов:</strong> Самым сложным было остановиться в улучшениях — постоянно хотелось добавить больше фич. Второй барьер — отсутствие времени на самостоятельную реализацию MVP.</p>
    `,
    comp_ai: "AI Architecture",
    comp_ai_text: `
      <p><strong>1. Гибкость и экономика (AIOrchestrator):</strong> Смена LLM (от OpenAI до локальных моделей) была спроектирована не просто так. Пользователи (включая франчайзи) должны иметь возможность подобрать модель под свой бюджет — от более качественных и дорогих до дешевых/бесплатных в рамках лимитов. Это экономически эффективно. С точки зрения UX: если одна нейросеть перестает работать, я просто подключаю другую модель без переписывания ядра.</p>
      <p><strong>2. Борьба с галлюцинациями в коде:</strong> Главным вызовом стало то, что я не пишу код сама. Самое сложное — отследить галлюцинации ИИ при генерации. Я заложила в архитектуру возможность помодульной переписки: если нейросеть сгенерировала нестабильный код, модуль можно изолировать и переписать с нуля, не ломая всю систему.</p>
      <p><strong>3. Архитектура промптинга (3 шага):</strong> Для минимизации мусора в коде я выстроила жесткую систему:<br>
      1. Создание задачи.<br>
      2. Отслеживание логики микрозадач.<br>
      3. Анализ одной и той же задачи несколькими нейросетями (кросс-валидация), проверка и доработка.<br>
      И только после этой цепочки — этап вайбкодинга.</p>
    `,
    comp_econ: "Экономика и воронка",
    comp_econ_text: `
      <p><strong>1. Стратегия монетизации (от B2C к экосистеме):</strong> Путь начался с B2C-сегмента. Затем я искала способы извлечь больше прибыли и расширила воронку на B2B (как логичное продолжение). Следующим шагом стало открытие админки для других авторов (Creator Economy). Моя логика проста: чем выше экономическая выгода проекта, тем больше фич и ценности я смогу в него внедрить. Также прорабатывала партнерства с производителями VR и смежными сегментами рынка.</p>
      <p><strong>2. Кросс-платформенность как драйвер удержания:</strong> Изначально кроссплатформенность была ценностью для блогеров и инфлюенсеров, которым нужно «перетаскивать» аудиторию за собой. Позже я сместила фокус на удобство обычных пользователей: не все друзья сидят в одной соцсети.</p>
      <p><strong>3. Экосистемная воронка:</strong> Архитектура предусматривает Web, Mobile и Desktop версии. Долгосрочная стратегия — дать каждому пространству свою уникальную фичу, чтобы пользователю было <em>интересно</em> переключаться между платформами, а не просто <em>вынужденно</em> мигрировать.</p>
    `,
    comp_data: "Данные и UX",
    comp_data_text: `
      <p><strong>1. CustDev и психотипы пользователей:</strong> Я понимала, что к моменту выхода продукта рынок может перенасытиться однотипными ИИ-новеллами. Моей целью было создать адаптивный сценарий, который подстраивается под пользователя. Это усиливало эффект как в маркетинговых квестах, так и в развлекательных играх. Опыт должен быть максимально приближен к реальности. Для этого планировалась разработка сценариев совместно с командой психологов — чтобы исключить любой вред для ментального здоровья пользователей.</p>
      <p><strong>2. Архитектура Entry Points (Точек входа):</strong> Если человек играет в квест и хочет сменить устройство (например, с телефона на ПК), зачем ему начинать заново и проходить все шаги с нуля? Это ломает опыт. Поэтому я заложила архитектуру Entry Points. Это логичное развитие в сторону мощного, персонализированного опыта, который не привязан к одному гаджету.</p>
      <p><strong>3. Событийная модель и A/B-тесты:</strong> Возможность заходить с любого шага (через deep-links) дает нам инфраструктуру для запуска A/B-тестов гипотез и демо-версий без изменения ядра кода. Плюс заложена событийная модель трекинга (<code>quest_started</code>, <code>choice_made</code> и т.д.) для отслеживания воронки и точек оттока.</p>
    `,
    comp_security: "Безопасность",
    comp_security_text: `
      <p><strong>1. 4 уровня деградации (Zero-Error UX):</strong> Мне было критически важно создать «систему нулевых ошибок»: пользователь не должен знать, что что-то сломалось. При сбое он получал «оболочку» в виде базового сценария, разработанного с учетом психотипов. Мы сознательно шли на небольшое ухудшение качества (снижение персонализации), но человек не замечал подмены и не выпадал из иммерсивного опыта. В это же время сигнал об ошибке мгновенно поступал мне как владельцу продукта для оперативного исправления.</p>
      <p><strong>2. Этическая защита («Красная кнопка»):</strong> Эта идея продумывалась как защита пользователей и соблюдение законодательных норм. Человек может в любой момент выйти из пугающей или травмирующей сцены и продолжить игру без вреда для психики. Это гарантирует, что продукт не нанесет эмоционального ущерба.</p>
    `,
    comp_process: "Процессы",
    comp_process_text: `
      <p><strong>1. База знаний и снижение нагрузки на саппорт:</strong> Для сложной платформы требовалась подробная документация. Я инициировала создание базы знаний с пошаговыми видеоинструкциями. Это решало две задачи: креаторы могли самостоятельно и быстро обучиться работе с платформой, а нагрузка на техническую поддержку снижалась за счет понятных гайдов.</p>
      <p><strong>2. Ролевая модель и аудит (Governance):</strong> Для работы с B2B-клиентами и франчайзи я спроектировала строгую систему разграничения прав доступа:<br>
      • <strong>Owner (Владелец):</strong> полный доступ, управление биллингом и настройками.<br>
      • <strong>Editor (Редактор):</strong> создание и редактирование контента/сценариев.<br>
      • <strong>Viewer (Зритель):</strong> только просмотр и потребление контента.<br>
      • <em>Безопасность:</em> Заложен аудит действий администраторов (Action Logs), чтобы владелец всегда видел, кто и что менял на платформе.</p>
    `,
    // --- DesignMatrix (dm_*) ---
    dm_strategy: "Product Strategy",
    dm_strategy_text: `
      <p><strong>1. Точка входа (Инсайт):</strong> Идея родилась из личного опыта: я попыталась сделать качественную 3D-модель интерьера и поняла, насколько это сложно и сколько требует обучения. В процессе общения с владелицей дизайн-агентства я подтвердила гипотезу: на рынке нет полноценных AI-решений, а порог входа крайне высок.</p>
      <p><strong>2. Эволюция видения (Закрытый цикл):</strong> Я сразу поняла, что мало просто спроектировать дизайн — незакрытый цикл рушит ценность продукта. Пользователю нужно найти материалы для реализации. Поэтому я заложила в архитектуру встроенный маркетплейс, который упрощает и укорачивает путь от идеи до покупки.</p>
      <p><strong>3. Социальная миссия (Образование):</strong> Вузы и колледжи — это не только монетизация и господдержка. Это социальная функция: дизайнеры выходят на рынок уже с портфолио. В долгосрочной стратегии (хоть это и не описано в ТЗ) я закладывала трансформацию платформы в площадку для фриланса и практики студентов.</p>
    `,
    dm_ai: "AI Architecture",
    dm_ai_text: `
      <p><strong>1. Мультиагентный подход:</strong> Я спроектировала систему из нескольких AI-агентов, чтобы закрыть разные боли пользователя:<br>
      • <em>Юридический агент:</em> тонко настроенный ассистент, который говорит, какие нужны документы для перепланировки и куда идти.<br>
      • <em>AI-дизайнер:</em> помогает человеку без профильного образования красиво обставить квартиру.<br>
      • <em>Умный рекомендатель:</em> подбирает товары на маркетплейсе строго под бюджет пользователя.</p>
      <p><strong>2. Технические вызовы (WebGL):</strong> Самым сложным было спроектировать платформу, учитывая тяжесть 3D-графики. Заложены требования к рендерингу в браузере и оптимизации, чтобы приложение не «висело».</p>
      <p><strong>3. Бюджетирование (12-50 млн ₽):</strong> Разброс бюджета обоснован не функционалом, а локацией команды. Стоимость разработки напрямую зависит от региона: удаленка или регионы (12-20 млн) против Москвы и СПб (до 50 млн), где ФОТ значительно выше.</p>
    `,
    dm_econ: "Экономика и воронка",
    dm_econ_text: `
      <p><strong>1. Тарифная сетка (Доступность vs Ценность):</strong> Изначально тарифы разрабатывались с прицелом на максимальную доступность. Но при глубокой проработке я поняла, что продукт не для ежедневного использования (ремонт — процесс редкий). Поэтому цены стоит ставить выше при реализации концепта. Также важно не «забирать хлеб» у профессиональных дизайнеров, а позиционировать платформу как ассистента для DIY-сегмента.</p>
      <p><strong>2. Комиссия маркетплейса (10–15%):</strong> Заложена как среднерыночное значение. Это баланс между ценностью, которую получает поставщик (прямой контакт с покупателем), и доходом экосистемы.</p>
      <p><strong>3. Прогноз окупаемости (18–24 месяца):</strong> Расчет строился на прогнозируемой востребованности продукта и гипотезах о готовности аудитории платить установленные цены. Это модель, которая требует валидации на реальных пользователях.</p>
    `,
    dm_data: "Данные и UX",
    dm_data_text: `
      <p><strong>1. CustDev:</strong> Провела серию интервью с владелицей дизайн-агентства для валидации главной боли и подтверждения отсутствия комплексных AI-решений на рынке.</p>
      <p><strong>2. Ключевые метрики:</strong> В качестве главных показателей успеха (North Star Metric) я заложила MAU (активную аудиторию) и конверсию в покупку через встроенный маркетплейс.</p>
    `,
    dm_security: "Безопасность",
    dm_security_text: `
      <p><strong>1. Масштабирование (Отказоустойчивость):</strong> Поскольку 3D-рендеринг в браузере требует много ресурсов, я заложила в архитектуру требования по балансировке нагрузки и отказоустойчивости.</p>
      <p><strong>2. Кэширование и CDN:</strong> Для ускорения загрузки тяжелых 3D-моделей и текстур предусмотрено многоуровневое кэширование и использование CDN (сетей доставки контента). Это снижает нагрузку на серверы и ускоряет отклик для пользователя.</p>
    `,
    dm_process: "Процессы",
    dm_process_text: `
      <p><strong>1. Открытый API и интеграции:</strong> Для масштабирования продукта я заложила открытый API. Это позволяет интегрировать платформу с CAD-системами (для профессиональных дизайнеров), CRM-системами (для мебельных компаний) и образовательными платформами.</p>
      <p><strong>2. Работа с поставщиками:</strong> Для функционирования маркетплейса выстроена логика работы с поставщиками мебели и материалов, включая партнерские программы. Это создает дополнительную ценность для B2B-сегмента.</p>
    `
  },
  en: {
    nav_home: "Home", nav_cases: "Cases", nav_resume: "Resume", nav_contacts: "Contacts", nav_how_i_think: "How I Think",
    mindmap_title: "How I Think", mindmap_subtitle: "My Process", back_to_home: "← Back to Home",
    mindmap_hint: "Select a case to unfold the <span style=\"color: var(--accent); font-style: italic;\">neural network</span> of my competencies",
    comp_strategy: "Product Strategy",
    comp_strategy_text: `
      <p><strong>1. Entry point (Insight):</strong> The idea of neuro-quests was born at an educational webinar. Seeing enthusiastic user reviews, I realized the format could be scaled.</p>
      <p><strong>2. Evolution of the vision:</strong> Initially I saw the product as a marketing tool (warming up for a purchase or a concert). Later a socio-psychological layer was added. The key realization: the brain doesn't care whether you are playing or living an experience in reality. VR became the logical final stage, but I immediately built in fallback scenarios for users without VR headsets.</p>
      <p><strong>3. Decomposition and the "zero-error system":</strong> AI estimated that building such a product solo was unrealistic. I took it as a challenge: decomposed the task and designed a modular architecture. The plan: launch an MVP on my own → rebuild module by module with freelancers. The "zero-error system" principle was born from reality: neural networks tend to "litter" code, plus there are hacker attack risks. For me it is critical to preserve a perfect UX: any technical error destroys the magic of the quest.</p>
      <p><strong>4. Main challenge:</strong> The hardest part was to stop improving — I constantly wanted to add more features. The second barrier was the lack of time to implement the MVP myself.</p>
    `,
    comp_ai: "AI Architecture",
    comp_ai_text: `
      <p><strong>1. Flexibility and economics (AIOrchestrator):</strong> Switching LLMs (from OpenAI to local models) was designed for a reason. Users (including franchisees) must be able to choose a model that fits their budget — from higher-quality and more expensive to cheap/free within limits. This is cost-effective. From a UX perspective: if one neural network stops working, I simply connect another model without rewriting the core.</p>
      <p><strong>2. Combating code hallucinations:</strong> The main challenge was that I do not write code myself. The hardest part is tracking AI hallucinations during generation. I built module-level rewritability into the architecture: if a neural network generates unstable code, the module can be isolated and rewritten from scratch without breaking the whole system.</p>
      <p><strong>3. Prompting architecture (3 steps):</strong> To minimize code garbage, I built a strict system:<br>
      1. Task creation.<br>
      2. Tracking the logic of micro-tasks.<br>
      3. Analyzing the same task with several neural networks (cross-validation), checking and refining.<br>
      And only after this chain — the vibe-coding stage.</p>
    `,
    comp_econ: "Economics & Funnel",
    comp_econ_text: `
      <p><strong>1. Monetization strategy (from B2C to an ecosystem):</strong> The journey started with the B2C segment. Then I looked for ways to extract more profit and expanded the funnel to B2B (as a logical continuation). The next step was opening an admin panel for other creators (Creator Economy). My logic is simple: the higher the project's economic benefit, the more features and value I can bring into it. I also explored partnerships with VR manufacturers and adjacent market segments.</p>
      <p><strong>2. Cross-platform as a retention driver:</strong> Initially cross-platform was valuable for bloggers and influencers who need to "pull" their audience along. Later I shifted the focus to convenience for regular users: not all friends are on the same social network.</p>
      <p><strong>3. Ecosystem funnel:</strong> The architecture provides for Web, Mobile and Desktop versions. The long-term strategy is to give each space its own unique feature so that users are <em>interested</em> in switching between platforms, rather than <em>forced</em> to migrate.</p>
    `,
    comp_data: "Data & UX",
    comp_data_text: `
      <p><strong>1. CustDev and user psychotypes:</strong> I understood that by the time the product launched, the market might be saturated with look-alike AI novels. My goal was to create an adaptive scenario that adjusts to the user. This strengthened the effect both in marketing quests and in entertainment games. The experience should be as close to reality as possible. To achieve this, scenario development was planned together with a team of psychologists — to exclude any harm to users' mental health.</p>
      <p><strong>2. Entry Points architecture:</strong> If a person is playing a quest and wants to change devices (for example, from a phone to a PC), why should they start over and go through all the steps again? That breaks the experience. So I built the Entry Points architecture. It is a logical step toward a powerful, personalized experience that is not tied to a single gadget.</p>
      <p><strong>3. Event model and A/B tests:</strong> The ability to enter from any step (via deep links) gives us the infrastructure to run A/B tests of hypotheses and demo versions without changing the code core. An event tracking model is also built in (<code>quest_started</code>, <code>choice_made</code>, etc.) to track the funnel and churn points.</p>
    `,
    comp_security: "Security",
    comp_security_text: `
      <p><strong>1. 4 levels of degradation (Zero-Error UX):</strong> It was critical for me to create a "zero-error system": the user should not know that something broke. On failure, they received a "shell" in the form of a basic scenario designed with psychotypes in mind. We deliberately accepted a slight quality drop (reduced personalization), but the person did not notice the substitution and did not fall out of the immersive experience. At the same time, an error signal was instantly sent to me as the product owner for prompt fixing.</p>
      <p><strong>2. Ethical protection ("Red Button"):</strong> This idea was designed as user protection and compliance with legal norms. A person can exit a frightening or traumatic scene at any moment and continue the game without harm to their mental health. This ensures the product will not cause emotional damage.</p>
    `,
    comp_process: "Processes",
    comp_process_text: `
      <p><strong>1. Knowledge base and reduced support workload:</strong> A complex platform required detailed documentation. I initiated the creation of a knowledge base with step-by-step video instructions. This solved two problems: creators could learn the platform independently and quickly, and the technical support workload decreased thanks to clear guides.</p>
      <p><strong>2. Role model and audit (Governance):</strong> To work with B2B clients and franchisees, I designed a strict access-control system:<br>
      • <strong>Owner:</strong> full access, billing and settings management.<br>
      • <strong>Editor:</strong> creating and editing content/scenarios.<br>
      • <strong>Viewer:</strong> view and consume content only.<br>
      • <em>Security:</em> Administrator action logs (Action Logs) are built in, so the owner always sees who changed what on the platform.</p>
    `,
    // --- DesignMatrix (dm_*) ---
    dm_strategy: "Product Strategy",
    dm_strategy_text: `
      <p><strong>1. Entry point (Insight):</strong> The idea came from personal experience: I tried to create a high-quality 3D interior model and realized how complex it is and how much learning it requires. Talking to the owner of a design agency confirmed the hypothesis: there are no comprehensive AI solutions on the market, and the entry barrier is extremely high.</p>
      <p><strong>2. Evolution of the vision (Closed loop):</strong> I immediately understood that designing the interior alone is not enough — an unclosed loop destroys the product's value. The user still needs to source materials for implementation. That is why I built an integrated marketplace into the architecture, simplifying and shortening the path from idea to purchase.</p>
      <p><strong>3. Social mission (Education):</strong> Universities and colleges are not only about monetization and government support. This is a social function: designers enter the market already with a portfolio. In the long-term strategy (even though it was not described in the brief), I envisioned transforming the platform into a space for student freelance work and practice.</p>
    `,
    dm_ai: "AI Architecture",
    dm_ai_text: `
      <p><strong>1. Multi-agent approach:</strong> I designed a system of several AI agents to address different user pains:<br>
      • <em>Legal agent:</em> a finely tuned assistant that explains which documents are needed for re-planning and where to go.<br>
      • <em>AI designer:</em> helps people without a professional background furnish their apartment beautifully.<br>
      • <em>Smart recommender:</em> selects marketplace products strictly within the user's budget.</p>
      <p><strong>2. Technical challenges (WebGL):</strong> The hardest part was designing the platform around the weight of 3D graphics. Requirements for in-browser rendering and optimization were built in so the application would not freeze.</p>
      <p><strong>3. Budgeting (12–50M ₽):</strong> The budget range is driven not by functionality but by the team's location. Development cost depends directly on the region: remote work or the regions (12–20M) versus Moscow and St. Petersburg (up to 50M), where payroll is significantly higher.</p>
    `,
    dm_econ: "Economics & Funnel",
    dm_econ_text: `
      <p><strong>1. Pricing tiers (Accessibility vs Value):</strong> The tariffs were initially designed for maximum accessibility. But deeper work showed that the product is not for daily use (renovation is a rare process). Therefore prices should be set higher when implementing the concept. It is also important not to "take bread" from professional designers, but to position the platform as an assistant for the DIY segment.</p>
      <p><strong>2. Marketplace commission (10–15%):</strong> Set at the market average. It is a balance between the value the supplier receives (direct contact with the buyer) and the ecosystem's revenue.</p>
      <p><strong>3. Payback forecast (18–24 months):</strong> The calculation was based on projected product demand and hypotheses about the audience's willingness to pay the set prices. This is a model that requires validation with real users.</p>
    `,
    dm_data: "Data & UX",
    dm_data_text: `
      <p><strong>1. CustDev:</strong> I conducted a series of interviews with the owner of a design agency to validate the main pain and confirm the absence of comprehensive AI solutions on the market.</p>
      <p><strong>2. Key metrics:</strong> As the main success indicators (North Star Metric), I set MAU (active audience) and conversion to purchase through the integrated marketplace.</p>
    `,
    dm_security: "Security",
    dm_security_text: `
      <p><strong>1. Scaling (Fault tolerance):</strong> Since in-browser 3D rendering is resource-intensive, I built requirements for load balancing and fault tolerance into the architecture.</p>
      <p><strong>2. Caching and CDN:</strong> To speed up loading of heavy 3D models and textures, multi-level caching and CDN (content delivery networks) are provided. This reduces server load and improves response time for the user.</p>
    `,
    dm_process: "Processes",
    dm_process_text: `
      <p><strong>1. Open API and integrations:</strong> To scale the product, I built in an open API. This allows the platform to integrate with CAD systems (for professional designers), CRM systems (for furniture companies) and educational platforms.</p>
      <p><strong>2. Working with suppliers:</strong> To operate the marketplace, the logic for working with furniture and material suppliers was designed, including partner programs. This creates additional value for the B2B segment.</p>
    `
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const langBtn = document.getElementById('lang-switcher');

  // АВТОДЕТЕКТ ЯЗЫКА
  let savedLang = localStorage.getItem('site_lang');
  let currentLang = savedLang;

  if (!currentLang) {
    const browserLang = (navigator.language || navigator.userLanguage).toLowerCase();
    // Если браузер английский, ставим EN, иначе RU
    currentLang = browserLang.startsWith('en') ? 'en' : 'ru';
  }

  function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('site_lang', lang);
    document.documentElement.lang = lang;
    if (langBtn) langBtn.textContent = lang === 'ru' ? 'EN' : 'RU';

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (i18n[lang] && i18n[lang][key]) el.innerHTML = i18n[lang][key];
    });
  }

  // Делаем переключатель доступным другим скриптам (нейронный мозг).
  window.setLanguage = setLanguage;
  window.getSiteLanguage = () => currentLang;

  if (langBtn) {
    langBtn.addEventListener('click', () => setLanguage(currentLang === 'ru' ? 'en' : 'ru'));
    setLanguage(currentLang); // Инициализация при загрузке
  }
});

// ============================================================
// Фаза 64. Нейронная карта StoryAxis: узлы, плашки, модальное окно
// ============================================================

const nodesData = [
  { id: 'strategy', x: 200, y: 200 }, // Верх-лево
  { id: 'ai',       x: 600, y: 200 }, // Верх-право
  { id: 'econ',     x: 700, y: 400 }, // Право
  { id: 'data',     x: 600, y: 600 }, // Низ-право
  { id: 'security', x: 200, y: 600 }, // Низ-лево
  { id: 'process',  x: 100, y: 400 }  // Лево
];

document.addEventListener('DOMContentLoaded', () => {
  const activeNodes = document.querySelectorAll('.brain-svg .case-node.active');
  const connectionsLayer = document.getElementById('connections-layer');
  const mindmapContainer = document.querySelector('.mindmap-container');
  const brainSvg = document.querySelector('.brain-svg');
  const modal = document.getElementById('mindmap-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalText = document.getElementById('modal-text');
  const closeModalBtn = document.getElementById('close-mindmap-modal');

  if (!activeNodes.length || !connectionsLayer || !mindmapContainer) return;

  const getLang = () => (
    (window.getSiteLanguage && window.getSiteLanguage()) ||
    localStorage.getItem('site_lang') ||
    'ru'
  );

  // --- Модальное окно ---
  function openModal(prefix, id) {
    if (!modal || !modalTitle || !modalText) return;
    const lang = getLang();
    const dict = i18n[lang] || i18n.ru;
    const key = `${prefix}${id}`;

    modalTitle.textContent = dict[key] || '';
    modalText.innerHTML = dict[`${key}_text`] || '';
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && modal.style.display === 'flex') {
      closeModal();
    }
  });

  // --- Позиционирование HTML-плашек поверх SVG ---
  function positionNodeLabels() {
    const svgRect = brainSvg.getBoundingClientRect();
    const containerRect = mindmapContainer.getBoundingClientRect();

    mindmapContainer.querySelectorAll('.mindmap-node-label').forEach((label) => {
      const x = parseFloat(label.dataset.x);
      const y = parseFloat(label.dataset.y);
      const left = (svgRect.left - containerRect.left) + (x / 800) * svgRect.width;
      const top = (svgRect.top - containerRect.top) + (y / 800) * svgRect.height;
      label.style.left = `${left}px`;
      label.style.top = `${top}px`;
    });
  }

  window.addEventListener('resize', positionNodeLabels);

  // --- Проращивание карты выбранного кейса ---
  function growNetwork(caseNode) {
    const caseType = caseNode.getAttribute('data-case');
    // StoryAxis использует ключи comp_*, DesignMatrix — dm_*.
    const prefix = caseType === 'storyaxis' ? 'comp_' : 'dm_';
    const startX = parseFloat(caseNode.getAttribute('cx'));
    const startY = parseFloat(caseNode.getAttribute('cy'));
    const lang = getLang();
    const dict = i18n[lang] || i18n.ru;

    connectionsLayer.innerHTML = '';
    mindmapContainer.querySelectorAll('.mindmap-node-label').forEach((label) => label.remove());

    nodesData.forEach((node, index) => {
      // Прямая линия от выбранной точки к узлу.
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${startX} ${startY} L ${node.x} ${node.y}`);
      path.setAttribute('class', 'neuron-path');
      path.setAttribute('filter', 'url(#neon-glow)');
      connectionsLayer.appendChild(path);

      // Кружок-узел на конце линии.
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', node.x);
      circle.setAttribute('cy', node.y);
      circle.setAttribute('r', '6');
      circle.setAttribute('fill', 'var(--metric)');
      circle.setAttribute('class', 'mindmap-node mindmap-node-point');
      circle.setAttribute('filter', 'url(#neon-glow)');
      circle.dataset.node = node.id;
      circle.dataset.case = caseType;
      circle.style.cursor = 'pointer';
      circle.style.opacity = '0';
      circle.addEventListener('click', () => openModal(prefix, node.id));
      connectionsLayer.appendChild(circle);

      // HTML-плашка с названием компетенции.
      const label = document.createElement('div');
      label.className = 'mindmap-node-label';
      label.dataset.node = node.id;
      label.dataset.case = caseType;
      label.dataset.x = node.x;
      label.dataset.y = node.y;
      label.dataset.i18n = `${prefix}${node.id}`;
      label.textContent = dict[`${prefix}${node.id}`] || node.id;
      label.addEventListener('click', () => openModal(prefix, node.id));
      mindmapContainer.appendChild(label);

      setTimeout(() => {
        path.style.transition = 'stroke-dashoffset 0.8s ease-out';
        path.style.strokeDashoffset = 0;
        circle.style.transition = 'opacity 0.35s ease';
        circle.style.opacity = 1;
        label.classList.add('visible');
      }, index * 100);
    });

    positionNodeLabels();
    requestAnimationFrame(positionNodeLabels);
  }

  activeNodes.forEach((node) => {
    node.addEventListener('click', () => growNetwork(node));
  });
});
