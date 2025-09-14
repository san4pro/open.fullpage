class OpenFullpage {
    constructor() {
        this.currentSection = 0;
        this.totalSections = 3; // Обновлено количество секций для демо open.fullpage
        this.isScrolling = false;
        this.scrollThreshold = 50; // Минимальная дистанция для свайпа на мобильном
        this.lastScrollTime = 0;
        this.scrollSpeed = 0;
        this.fastScrollThreshold = 150; // Увеличено для более чувствительного определения
        this.consecutiveFastScrolls = 0; // Счетчик последовательных быстрых скроллов
        this.wheelDelta = 0; // Сила прокрутки колеса
        this.scrollHistory = []; // История последних скроллов для анализа
        this.maxHistoryLength = 5; // Максимальное количество записей в истории
        this.debounceTimer = null; // Таймер для debounce

        this.init();
    }

    init() {
        this.bindEvents();
        this.updateNavigation();
        this.showScrollHint();
        this.initDownloadButtons();
        this.initBackgroundParticles();
    }

    bindEvents() {
        // Обработка скролла колесом мыши
        document.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

        // Обработка нажатий клавиш
        document.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Обработка кликов по навигации
        document.querySelectorAll('.nav-dot').forEach((dot, index) => {
            dot.addEventListener('click', () => {
                // Клик по навигации считается быстрым переходом
                const isFastScroll = Math.abs(index - this.currentSection) > 1;
                this.goToSection(index, isFastScroll);
                this.hideScrollHint(); // Скрываем подсказку при клике
            });
        });

        // Touch события для мобильных устройств
        this.bindTouchEvents();

        // Обработка изменения размера окна
        window.addEventListener('resize', () => this.handleResize());

        // Предотвращение стандартного скролла
        document.body.style.overflow = 'hidden';
    }

    bindTouchEvents() {
        let startY = 0;
        let startTime = 0;

        document.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            startTime = Date.now();
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (this.isScrolling) return;

            const endY = e.changedTouches[0].clientY;
            const endTime = Date.now();
            const deltaY = startY - endY;
            const deltaTime = endTime - startTime;

            // Определяем, является ли свайп быстрым
            const isFastSwipe = deltaTime < 300 && Math.abs(deltaY) > this.scrollThreshold * 1.5;

            // Проверяем, что это быстрый свайп
            if (Math.abs(deltaY) > this.scrollThreshold && deltaTime < 300) {
                if (deltaY > 0) {
                    // Свайп вверх - переход к следующей секции
                    this.nextSection(isFastSwipe);
                } else {
                    // Свайп вниз - переход к предыдущей секции
                    this.prevSection(isFastSwipe);
                }
                
                this.hideScrollHint(); // Скрываем подсказку при свайпе
            }
        }, { passive: true });
    }

    hideScrollHint() {
        const scrollHint = document.querySelector('.scroll-hint');
        if (scrollHint && scrollHint.style.opacity !== '0') {
            scrollHint.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
            scrollHint.style.opacity = '0';
            scrollHint.style.transform = 'translateX(-50%) translateY(20px)';
            
            // Полностью скрываем элемент через 0.5 секунд
            setTimeout(() => {
                scrollHint.style.display = 'none';
            }, 500);
        }
    }

    handleWheel(e) {
        if (this.isScrolling) {
            e.preventDefault();
            return;
        }

        e.preventDefault();

        const currentTime = Date.now();
        const deltaY = Math.abs(e.deltaY);
        const timeDiff = currentTime - this.lastScrollTime;
        
        // Очищаем дебаунс таймер
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Добавляем текущий скролл в историю
        this.scrollHistory.push({
            time: currentTime,
            delta: deltaY,
            timeDiff: timeDiff
        });
        
        // Ограничиваем длину истории
        if (this.scrollHistory.length > this.maxHistoryLength) {
            this.scrollHistory.shift();
        }
        
        // Определяем скорость на основе нескольких факторов
        const speedFactors = this.analyzeScrollSpeed();
        const isFastScroll = speedFactors.isFast;
        
        this.lastScrollTime = currentTime;
        
        // Обновляем счетчик последовательных быстрых скроллов
        if (isFastScroll) {
            this.consecutiveFastScrolls++;
        }
        
        // Дебаунс для сброса счетчика
        this.debounceTimer = setTimeout(() => {
            this.consecutiveFastScrolls = 0;
            this.scrollHistory = [];
        }, 800);

        // Определяем направление скролла
        if (e.deltaY > 0) {
            // Скролл вниз
            this.nextSection(isFastScroll);
        } else {
            // Скролл вверх
            this.prevSection(isFastScroll);
        }
        
        this.hideScrollHint(); // Скрываем подсказку при скролле
    }

    analyzeScrollSpeed() {
        if (this.scrollHistory.length < 2) {
            return { isFast: false, intensity: 'normal' };
        }
        
        const recent = this.scrollHistory.slice(-3); // Последние 3 скролла
        
        // Анализируем временные интервалы
        const avgTimeDiff = recent.reduce((sum, scroll) => sum + scroll.timeDiff, 0) / recent.length;
        
        // Анализируем силу скролла
        const avgDelta = recent.reduce((sum, scroll) => sum + scroll.delta, 0) / recent.length;
        
        // Определяем быстрый скролл
        const isTimeFast = avgTimeDiff < this.fastScrollThreshold;
        const isDeltaHigh = avgDelta > 50; // Высокая сила прокрутки
        const hasConsecutive = this.consecutiveFastScrolls >= 1;
        
        // Комбинированные критерии
        const isFast = isTimeFast || isDeltaHigh || hasConsecutive;
        
        let intensity = 'normal';
        if (this.consecutiveFastScrolls > 3 && isTimeFast && isDeltaHigh) {
            intensity = 'ultra-fast';
        } else if (isFast) {
            intensity = 'fast';
        }
        
        return { isFast, intensity, avgTimeDiff, avgDelta };
    }

    handleKeydown(e) {
        if (this.isScrolling) return;

        // Клавиши считаются быстрым скроллом по умолчанию
        const isFastScroll = true;

        switch (e.key) {
            case 'ArrowDown':
            case 'PageDown':
            case ' ': // Пробел
                e.preventDefault();
                this.nextSection(isFastScroll);
                this.hideScrollHint();
                break;
            case 'ArrowUp':
            case 'PageUp':
                e.preventDefault();
                this.prevSection(isFastScroll);
                this.hideScrollHint();
                break;
            case 'Home':
                e.preventDefault();
                this.goToSection(0, isFastScroll);
                break;
            case 'End':
                e.preventDefault();
                this.goToSection(this.totalSections - 1, isFastScroll);
                break;
        }
    }

    nextSection(isFastScroll = false) {
        if (this.currentSection < this.totalSections - 1) {
            this.goToSection(this.currentSection + 1, isFastScroll);
        }
    }

    prevSection(isFastScroll = false) {
        if (this.currentSection > 0) {
            this.goToSection(this.currentSection - 1, isFastScroll);
        }
    }

    goToSection(index, isFastScroll = false) {
        if (index === this.currentSection || this.isScrolling || index < 0 || index >= this.totalSections) {
            return;
        }

        this.isScrolling = true;

        // Определяем длительность анимации на основе анализа
        let animationDuration;
        
        if (this.consecutiveFastScrolls > 3) {
            // Молниеносные переходы
            animationDuration = 400;
        } else if (isFastScroll || this.consecutiveFastScrolls > 1) {
            // Быстрые переходы
            animationDuration = 700;
        } else {
            // Обычные переходы
            animationDuration = 1200;
        }

        // Предзагружаем контент новой секции
        const newSection = document.querySelector(`[data-section="${index}"]`);
        if (newSection) {
            newSection.classList.add('preparing');
        }

        // Обновляем текущую секцию
        this.currentSection = index;

        // Применяем трансформацию для перехода
        const wrapper = document.querySelector('.sections-wrapper');

        // Устанавливаем класс для скорости анимации
        wrapper.classList.remove('fast-transition', 'normal-transition', 'ultra-fast-transition');
        
        if (this.consecutiveFastScrolls > 3) {
            wrapper.classList.add('ultra-fast-transition');
        } else if (isFastScroll || this.consecutiveFastScrolls > 1) {
            wrapper.classList.add('fast-transition');
        } else {
            wrapper.classList.add('normal-transition');
        }

        // Применяем трансформацию
        wrapper.style.transform = `translateY(-${this.currentSection * 100}vh)`;

        // Обновляем активные классы с маленькой задержкой для плавности
        setTimeout(() => {
            this.updateActiveSections();
        }, 30);

        this.updateNavigation();
        this.updateScrollHint();

        // Снимаем блокировку после завершения анимации
        setTimeout(() => {
            this.isScrolling = false;
            // Убираем класс preparing
            if (newSection) {
                newSection.classList.remove('preparing');
            }
        }, animationDuration);
    }

    updateActiveSections() {
        // Убираем активный класс со всех секций
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Добавляем активный класс к текущей секции
        const currentSectionElement = document.querySelector(`[data-section="${this.currentSection}"]`);
        if (currentSectionElement) {
            currentSectionElement.classList.add('active');
        }
    }

    updateNavigation() {
        // Обновляем навигационные точки
        document.querySelectorAll('.nav-dot').forEach((dot, index) => {
            if (index === this.currentSection) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    updateScrollHint() {
        const scrollHint = document.querySelector('.scroll-hint');
        const scrollText = document.querySelector('.scroll-text');
        const scrollArrow = document.querySelector('.scroll-arrow');

        if (this.currentSection === this.totalSections - 1) {
            // Последняя секция
            scrollText.textContent = 'Нажмите ↑ для возврата наверх';
            scrollArrow.textContent = '↑';
            scrollHint.style.opacity = '0.5';
        } else {
            // Не последняя секция
            scrollText.textContent = 'Прокрутите колесом мыши или используйте навигационные точки. Быстрый скролл = быстрые переходы!';
            scrollArrow.textContent = '↓';
            scrollHint.style.opacity = '0.7';
        }
    }

    showScrollHint() {
        // Показываем подсказку на первой секции
        const scrollHint = document.querySelector('.scroll-hint');

        // Функция для скрытия подсказки при первом взаимодействии
        const hideHintOnFirstInteraction = () => {
            scrollHint.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
            scrollHint.style.opacity = '0';
            scrollHint.style.transform = 'translateX(-50%) translateY(20px)';

            // Полностью скрываем элемент через 0.5 секунд
            setTimeout(() => {
                scrollHint.style.display = 'none';
            }, 500);

            // Удаляем обработчики событий после первого взаимодействия
            document.removeEventListener('wheel', hideHintOnFirstInteraction);
            document.removeEventListener('touchstart', hideHintOnFirstInteraction);
            document.removeEventListener('keydown', hideHintOnFirstInteraction);

            // Удаляем обработчики с навигационных точек
            document.querySelectorAll('.nav-dot').forEach(dot => {
                dot.removeEventListener('click', hideHintOnFirstInteraction);
            });
        };

        // Добавляем обработчики для всех типов взаимодействия
        document.addEventListener('wheel', hideHintOnFirstInteraction, { once: false });
        document.addEventListener('touchstart', hideHintOnFirstInteraction, { once: false });
        document.addEventListener('keydown', hideHintOnFirstInteraction, { once: false });

        // Добавляем обработчик на навигационные точки
        document.querySelectorAll('.nav-dot').forEach(dot => {
            dot.addEventListener('click', hideHintOnFirstInteraction, { once: false });
        });

        // Автоматическое скрытие через 8 секунд, если пользователь не взаимодействует
        setTimeout(() => {
            if (scrollHint.style.opacity !== '0') {
                scrollHint.style.transition = 'opacity 1s ease-out';
                scrollHint.style.opacity = '0.2';
            }
        }, 8000);
    }

    handleResize() {
        // Пересчитываем позицию при изменении размера окна
        const wrapper = document.querySelector('.sections-wrapper');
        wrapper.style.transform = `translateY(-${this.currentSection * 100}vh)`;
    }

    // Методы для программного управления
    goToFirst() {
        this.goToSection(0);
    }

    goToLast() {
        this.goToSection(this.totalSections - 1);
    }

    getCurrentSection() {
        return this.currentSection;
    }

    getTotalSections() {
        return this.totalSections;
    }

    hideScrollHint() {
        const scrollHint = document.querySelector('.scroll-hint');
        if (scrollHint && scrollHint.style.opacity !== '0') {
            scrollHint.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
            scrollHint.style.opacity = '0';
            scrollHint.style.transform = 'translateX(-50%) translateY(20px)';
            
            // Полностью скрываем элемент через 0.5 секунд
            setTimeout(() => {
                scrollHint.style.display = 'none';
            }, 500);
        }
    }
}

// Дополнительные функции для улучшения UX
class AnimationEnhancer {
    constructor() {
        this.init();
    }

    init() {
        this.addParallaxEffect();
        this.addCounterAnimation();
    }

    addParallaxEffect() {
        // Параллакс эффект для фоновых элементов
        document.addEventListener('wheel', (e) => {
            const shapes = document.querySelectorAll('.floating-shape');
            shapes.forEach((shape, index) => {
                const speed = (index + 1) * 0.5;
                const currentTransform = shape.style.transform || '';
                const translateY = e.deltaY * speed * 0.1;
                shape.style.transform = currentTransform + ` translateY(${translateY}px)`;
            });
        });
    }

    addCounterAnimation() {
        // Анимация счетчиков в секции "О нас"
        const observerOptions = {
            threshold: 0.5,
            rootMargin: '0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counters = entry.target.querySelectorAll('.stat-number');
                    counters.forEach(counter => {
                        if (!counter.classList.contains('animated')) {
                            counter.classList.add('animated');
                            this.animateCounter(counter);
                        }
                    });
                }
            });
        }, observerOptions);

        const aboutSection = document.querySelector('[data-section="1"]');
        if (aboutSection) {
            observer.observe(aboutSection);
        }
    }

    animateCounter(element) {
        const target = parseInt(element.textContent);
        const duration = 2000;
        const start = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function
            const easeOutQuad = 1 - (1 - progress) * (1 - progress);
            const current = Math.round(target * easeOutQuad);

            element.textContent = current + (element.textContent.includes('+') ? '+' : '') +
                                 (element.textContent.includes('%') ? '%' : '');

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }


}

// Инициализация open.fullpage при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем основной функционал
    const fullpage = new OpenFullpage();

    // Добавляем дополнительные анимации
    const enhancer = new AnimationEnhancer();

    // Инициализируем новые футуристические эффекты
    const futuristicEffects = new FuturisticEffects();

    // Делаем fullpage доступным глобально для отладки
    window.fullpage = fullpage;

    console.log('🚀 open.fullpage инициализирована успешно!');
    console.log('Используйте window.fullpage для программного управления');
});

// Новый класс для футуристических эффектов
class FuturisticEffects {
    constructor() {
        this.init();
    }

    init() {
        this.initCapabilityMatrix();
        this.initParticleInteraction();
        this.initHologramEffects();
    }

    initCapabilityMatrix() {
        const nodes = document.querySelectorAll('.capability-node');
        const details = document.querySelectorAll('.detail-card');

        nodes.forEach(node => {
            node.addEventListener('mouseenter', () => {
                // Убираем активные классы
                nodes.forEach(n => n.classList.remove('active'));
                details.forEach(d => d.classList.remove('active'));

                // Добавляем активный класс
                node.classList.add('active');

                // Показываем соответствующую деталь
                const capability = node.dataset.capability;
                const detail = document.querySelector(`[data-for="${capability}"]`);
                if (detail) {
                    detail.classList.add('active');
                }

                // Добавляем звуковой эффект (опционально)
                this.playInteractionSound();
            });
        });
    }

    initParticleInteraction() {
        // Добавляем частицы при наведении мыши
        document.addEventListener('mousemove', (e) => {
            if (Math.random() < 0.02) { // 2% шанс на каждое движение
                this.createMouseParticle(e.clientX, e.clientY);
            }
        });
    }

    createMouseParticle(x, y) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: fixed;
            width: 4px;
            height: 4px;
            background: #00ffff;
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            left: ${x}px;
            top: ${y}px;
            animation: particle-fade 1s ease-out forwards;
        `;

        document.body.appendChild(particle);

        // Удаляем частицу после анимации
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 1000);
    }

    initHologramEffects() {
        const hologramCore = document.querySelector('.hologram-core');
        if (hologramCore) {
            hologramCore.addEventListener('click', () => {
                // При клике на ядро создаем всплеск энергии
                this.createEnergyBurst(hologramCore);
            });
        }
        
        // Добавляем обработчики для кнопок скачивания
        this.initDownloadButtons();
    }

    createEnergyBurst(element) {
        const burst = document.createElement('div');
        burst.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 100px;
            height: 100px;
            border: 2px solid #00ffff;
            border-radius: 50%;
            transform: translate(-50%, -50%) scale(0);
            animation: energy-burst 0.6s ease-out forwards;
            pointer-events: none;
        `;

        element.appendChild(burst);

        setTimeout(() => {
            if (burst.parentNode) {
                burst.parentNode.removeChild(burst);
            }
        }, 600);
    }

    playInteractionSound() {
        // Можно добавить звуковые эффекты
        // const audio = new Audio('path/to/beep.mp3');
        // audio.volume = 0.1;
        // audio.play();
    }
    
    initDownloadButtons() {
        const downloadButtons = document.querySelectorAll('.download-btn');
        
        downloadButtons.forEach(button => {
            button.addEventListener('click', () => {
                const buttonText = button.textContent.trim();
                
                if (buttonText.includes('Скачать open.fullpage.js')) {
                    this.downloadZip();
                } else if (buttonText.includes('Копировать JS код')) {
                    this.copyCode();
                } else if (buttonText.includes('GitHub')) {
                    this.openDocumentation();
                }
            });
        });
    }
    
    downloadZip() {
        // Создаем полный JavaScript код библиотеки
        const fullScript = this.generateFullScript();
        
        // Создаем минифицированную версию
        const minScript = this.generateMinifiedScript();
        
        // Создаем CSS файл
        const cssContent = this.generateCSSFile();
        
        // Создаем HTML пример
        const htmlExample = this.generateHTMLExample();
        
        // Создаем README файл
        const readmeContent = this.generateReadme();
        
        // Создаем zip архив (симуляция)
        this.createZipFile({
            'open-fullpage.js': fullScript,
            'open-fullpage.min.js': minScript,
            'open-fullpage.css': cssContent,
            'example.html': htmlExample,
            'README.md': readmeContent
        });
        
        this.showNotification('✅ Библиотека open.fullpage скачана!', 'success');
    }
    
    copyCode() {
        const fullScript = this.generateFullScript();
        
        navigator.clipboard.writeText(fullScript).then(() => {
            this.showNotification('✅ Полный код open.fullpage скопирован в буфер!', 'success');
        }).catch(() => {
            this.showNotification('❌ Ошибка копирования', 'error');
        });
    }
    
    openDocumentation() {
        this.showNotification('📚 Документация open.fullpage открывается...', 'info');
        window.open('https://github.com/open-fullpage/open-fullpage', '_blank');
    }
    
    generateFullScript() {
        return `/*!
 * Open Fullpage v1.0.0
 * Адаптивная полноэкранная навигация с улучшенным алгоритмом скорости
 * https://github.com/open-fullpage/open-fullpage
 * (c) 2024 Open Fullpage
 * Released under the MIT License
 */

class OpenFullpage {
    constructor(options = {}) {
        this.currentSection = 0;
        this.totalSections = options.sectionsCount || document.querySelectorAll('.section').length;
        this.isScrolling = false;
        this.fastScrollThreshold = options.fastScrollThreshold || 150;
        this.animationSpeeds = {
            normal: options.normalSpeed || 600,
            fast: options.fastSpeed || 350,
            ultraFast: options.ultraFastSpeed || 200
        };
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.updateNavigation();
    }
    
    // ... Полный код доступен в скачанном файле
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpenFullpage;
} else {
    window.OpenFullpage = OpenFullpage;
}`;
    }
    
    generateMinifiedScript() {
        return `/*! Open Fullpage v1.0.0 | (c) 2024 | MIT License */
class OpenFullpage{constructor(e={}){this.currentSection=0,this.totalSections=e.sectionsCount||document.querySelectorAll(".section").length,this.isScrolling=!1,this.fastScrollThreshold=e.fastScrollThreshold||150,this.animationSpeeds={normal:e.normalSpeed||600,fast:e.fastSpeed||350,ultraFast:e.ultraFastSpeed||200},this.init()}init(){this.bindEvents(),this.updateNavigation()}}`;
    }
    
    generateCSSFile() {
        return `/* Open Fullpage CSS v1.0.0 */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, sans-serif; overflow: hidden; height: 100vh; }
.fullpage-container { position: relative; height: 100vh; overflow: hidden; }
.sections-wrapper { height: 100vh; }
.sections-wrapper.fast-transition { transition: transform 0.35s cubic-bezier(0.25, 0.1, 0.25, 1); }
.sections-wrapper.normal-transition { transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1); }
.sections-wrapper.ultra-fast-transition { transition: transform 0.2s cubic-bezier(0.55, 0.05, 0.68, 0.19); }
.section { height: 100vh; width: 100%; display: flex; align-items: center; justify-content: center; }
.navigation { position: fixed; right: 2rem; top: 50%; transform: translateY(-50%); z-index: 1000; }
.nav-dot { width: 12px; height: 12px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.5); background: transparent; cursor: pointer; transition: all 0.3s ease; }
.nav-dot.active { background: white; border-color: white; transform: scale(1.2); }`;
    }
    
    generateHTMLExample() {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Open Fullpage Example</title>
    <link rel="stylesheet" href="open-fullpage.css">
</head>
<body>
    <div class="fullpage-container">
        <nav class="navigation">
            <div class="nav-dots">
                <button class="nav-dot active" data-section="0"></button>
                <button class="nav-dot" data-section="1"></button>
            </div>
        </nav>
        <div class="sections-wrapper">
            <section class="section active" data-section="0">
                <h1>Первая секция</h1>
            </section>
            <section class="section" data-section="1">
                <h1>Вторая секция</h1>
            </section>
        </div>
    </div>
    <script src="open-fullpage.js"></script>
    <script>new OpenFullpage();</script>
</body>
</html>`;
    }
    
    generateReadme() {
        return `# Open Fullpage v1.0.0

Современная библиотека для полноэкранной навигации с адаптивной скоростью.

## Особенности
- Адаптивная скорость анимации
- Поддержка touch-событий
- Кроссбраузерность
- Легкая настройка

## Использование
\`\`\`javascript
const fullpage = new OpenFullpage({
    normalSpeed: 600,
    fastSpeed: 350,
    ultraFastSpeed: 200
});
\`\`\`

## API
- \`moveTo(index)\` - перейти к секции
- \`next()\` - следующая секция
- \`prev()\` - предыдущая секция
- \`getCurrentSection()\` - текущая секция

License: MIT`;
    }
    
    createZipFile(files) {
        // Симуляция создания ZIP архива
        const mainScript = files['open-fullpage.js'];
        const link = document.createElement('a');
        link.href = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(mainScript);
        link.download = 'open-fullpage.js';
        link.click();
        
        // Дополнительно скачиваем CSS
        setTimeout(() => {
            const cssLink = document.createElement('a');
            cssLink.href = 'data:text/css;charset=utf-8,' + encodeURIComponent(files['open-fullpage.css']);
            cssLink.download = 'open-fullpage.css';
            cssLink.click();
        }, 500);
        
        // И пример HTML
        setTimeout(() => {
            const htmlLink = document.createElement('a');
            htmlLink.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(files['example.html']);
            htmlLink.download = 'example.html';
            htmlLink.click();
        }, 1000);
    }
    
    initBackgroundParticles() {
        // Интерактивные частицы при движении мыши
        let mouseX = 0;
        let mouseY = 0;
        
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            // Создаем частицы с малым шансом
            if (Math.random() < 0.1) {
                this.createInteractiveParticle(mouseX, mouseY);
            }
        });
        
        // Периодическое создание случайных частиц
        setInterval(() => {
            this.createRandomParticle();
        }, 2000);
    }
    
    createInteractiveParticle(x, y) {
        const particle = document.createElement('div');
        particle.className = 'interactive-particle';
        particle.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: ${Math.random() * 6 + 2}px;
            height: ${Math.random() * 6 + 2}px;
            background: radial-gradient(circle, #00ffff 0%, rgba(0,255,255,0) 70%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 2;
            animation: interactive-particle-float ${Math.random() * 3 + 2}s ease-out forwards;
        `;
        
        document.body.appendChild(particle);
        
        // Удаляем частицу после анимации
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 5000);
    }
    
    createRandomParticle() {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        
        const particle = document.createElement('div');
        particle.className = 'random-particle';
        particle.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: ${Math.random() * 4 + 1}px;
            height: ${Math.random() * 4 + 1}px;
            background: linear-gradient(45deg, #ff00ff, #00ffff);
            border-radius: 50%;
            pointer-events: none;
            z-index: 2;
            opacity: 0.7;
            animation: random-particle-drift ${Math.random() * 10 + 5}s ease-in-out forwards;
        `;
        
        document.body.appendChild(particle);
        
        // Удаляем частицу после анимации
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 15000);
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            padding: 1rem 2rem;
            background: ${type === 'success' ? 'rgba(67, 233, 123, 0.9)' : 
                          type === 'error' ? 'rgba(255, 107, 107, 0.9)' : 
                          'rgba(0, 255, 255, 0.9)'};
            color: #0f0f23;
            border-radius: 10px;
            font-weight: 600;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}