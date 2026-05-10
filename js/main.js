/**
 * Лабораторна робота №2
 */

// Чекаємо повного завантаження HTML і побудови DOM — до цього елементів може не бути
document.addEventListener("DOMContentLoaded", () => {
  // Якщо підключена бібліотека Lucide, підмінюємо іконки в розмітці на SVG
  initLucideIcons();
  // Увімкнути автоформат «Кожне Слово З Великої» для полів із відповідним класом
  initTitleCaseInputs();
  // Слайдер у блоці hero: кадри, крапки, доступність (a11y)
  initHeroSlider();
  // Маска українського телефону + перевірки під час надсилання форми реєстрації
  initRegistrationFormValidation();
});

// Ініціалізуємо іконки безпечно: якщо скрипт Lucide не підвантажився — просто виходимо
function initLucideIcons() {
  // Перевіряємо глобальний об’єкт і наявність потрібного методу
  const hasLucide =
    typeof lucide !== "undefined" && typeof lucide.createIcons === "function";
  // Немає бібліотеки — не падаємо, сторінка працює без іконок
  if (!hasLucide) {
    return;
  }
  // Обхід DOM і вставлення SVG за data-lucide тощо (API пакета lucide)
  lucide.createIcons();
}

// Кожна послідовність непробільних символів — «слово»; першу літеру — велику, решту — малі
function titleCaseWords(text) {
  // прапорець g — усі збіги; [^\s]+ — усе до пробіла
  return text.replace(/[^\s]+/g, (word) => {
    // Захист від порожнього збігу
    if (!word.length) {
      return word;
    }
    // Перша літера велика за правилами української локалі
    const first = word.charAt(0).toLocaleUpperCase("uk");
    // Решта рядка — малими літерами
    const rest = word.slice(1).toLocaleLowerCase("uk");
    // Збираємо слово
    return first + rest;
  });
}

// Знаходимо всі поля з класом і вішаємо форматування на введення та blur
function initTitleCaseInputs() {
  // Статичний список елементів на момент виклику (це не «жива» колекція)
  const inputs = document.querySelectorAll(".js-title-case");

  // Цикл for..of зручно використовувати з NodeList і масивами
  for (const input of inputs) {
    // Подія input спрацьовує при кожній зміні значення в полі
    input.addEventListener("input", () => {
      // Одразу перезаписуємо value відформатованим рядком
      input.value = titleCaseWords(input.value);
    });

    // blur — поле втратило фокус (Tab, клік повз тощо)
    input.addEventListener("blur", () => {
      // trim прибирає пробіли по краях перед остаточним Title Case
      input.value = titleCaseWords(input.value.trim());
    });
  }
}

/**
 * Лабораторна робота №3
 */

// Карусель: один активний кадр і синхронізовані «крапки» навігації
function initHeroSlider() {
  // Корінь секції слайдера в HTML
  const root = document.querySelector(".hero-slider");
  // На цій сторінці блоку немає — «тихо» виходимо
  if (!root) {
    return;
  }

  // Усі слайди й індикатори шукаємо всередині root, не по всьому document
  const slides = root.querySelectorAll(".hero-slider__slide");
  const dots = root.querySelectorAll(".hero-slider__dot");
  // Кількість потрібна для циклічного індексу
  const slideCount = slides.length;

  // Без слайдів налаштовувати нічого
  if (slideCount === 0) {
    return;
  }

  // Зводимо будь-який індекс до діапазону 0 … slideCount − 1
  const clampIndex = (index) =>
    ((index % slideCount) + slideCount) % slideCount;

  // Клас активності й aria-hidden для скрінрідерів
  function syncSlides(activeIndex) {
    slides.forEach((slide, index) => {
      // Порівнюємо індекс кадру з поточним активним
      const isActive = index === activeIndex;
      // toggle з другим аргументом: явно увімкнути або вимкнути клас
      slide.classList.toggle("is-active", isActive);
      // Для допоміжних технологій: неактивні кадри «приховані»
      slide.setAttribute("aria-hidden", isActive ? "false" : "true");
    });
  }

  // Кнопки-крапки: яка обрана і порядок фокуса з Tab
  function syncDots(activeIndex) {
    dots.forEach((dot, index) => {
      const isActive = index === activeIndex;
      // Атрибути HTML завжди рядкові значення
      dot.setAttribute("aria-selected", String(isActive));
      // Лише активна крапка в ланцюжку Tab (0), решта −1 (пропуск)
      dot.tabIndex = isActive ? 0 : -1;
      dot.classList.toggle("is-active", isActive);
    });
  }

  // Одне «джерело істини»: номер кадру → оновили кадри й крапки
  function goToSlide(rawIndex) {
    const index = clampIndex(rawIndex);
    syncSlides(index);
    syncDots(index);
  }

  // Клік по крапці — читаємо data-slide-to з верстки
  for (const dot of dots) {
    dot.addEventListener("click", () => {
      // ?? "" якщо атрибута немає; radix 10 для parseInt
      const parsed = Number.parseInt(dot.dataset.slideTo ?? "", 10);
      // Якщо розбір дав не число (NaN) — ігноруємо
      if (!Number.isNaN(parsed)) {
        goToSlide(parsed);
      }
    });
  }

  // Стартуємо з першого слайда (індекс 0)
  goToSlide(0);
}

// Тексти помилок в одному місці — без дублювання рядків у коді
const REGISTRATION_MESSAGES = {
  phoneIncomplete:
    "Доведіть номер до кінця: після коду країни потрібні 10 цифр у форматі 0XX XXX XX XX.",
  codeRequired: "Вкажіть код товару.",
  codeRange: "Код має бути цілим числом від 1000 до 10000 включно.",
};

/** Залишає лише національні цифри (без +38); підтримує вставку повного міжнародного запису */
function extractNationalDigits(rawText) {
  // \D — усе не-цифрове символи; прибираємо
  let digits = rawText.replace(/\D/g, "");

  // Часті префікси при вводі українського номера «як є»
  if (digits.startsWith("380")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("38")) {
    digits = digits.slice(2);
  }

  // Національна частина не більше 10 цифр
  return digits.slice(0, 10);
}

/** Зібраний рядок +38 (0XX) XXX-XX-XX з вже вирізаних національних цифр */
function formatUkMobileMasked(nationalDigits) {
  // Ще раз лише цифри й обмеження довжини
  const digitsOnly = nationalDigits.replace(/\D/g, "").slice(0, 10);

  // Немає цифр — показуємо порожнє поле
  if (digitsOnly.length === 0) {
    return "";
  }

  // Початок маски перед першою групою
  let result = "+38 (";
  // До трьох цифр у дужках (код оператора)
  result += digitsOnly.slice(0, Math.min(3, digitsOnly.length));

  // Ввели лише початок — повертаємо без «закритої» частини маски далі по гілках
  if (digitsOnly.length <= 3) {
    return result;
  }

  result += ") ";
  result += digitsOnly.slice(3, Math.min(6, digitsOnly.length));

  if (digitsOnly.length <= 6) {
    return result;
  }

  result += "-";
  result += digitsOnly.slice(6, Math.min(8, digitsOnly.length));

  if (digitsOnly.length <= 8) {
    return result;
  }

  result += "-";
  result += digitsOnly.slice(8, 10);

  return result;
}

// true, якщо рівно 10 цифр, перша — 0, далі будь-які 9 цифр
function isCompleteUaMobileNational(digits10) {
  return /^0\d{9}$/.test(digits10);
}

// Підганяє відображення телефону під маску; після зміни value курсор у кінці
function initUaPhoneMask(input) {
  if (!input) {
    return;
  }

  // Спільна логіка після введення: скинути validity, сформатувати, курсор у кінець
  const syncFromField = () => {
    input.setCustomValidity("");
    const national = extractNationalDigits(input.value);
    input.value = formatUkMobileMasked(national);
    const end = input.value.length;
    input.setSelectionRange(end, end);
  };

  input.addEventListener("input", syncFromField);

  // Вставка з буфера — своя обробка, щоб спочатку прибрати «сміття» й застосувати маску
  input.addEventListener("paste", (event) => {
    event.preventDefault();
    input.setCustomValidity("");
    // clipboardData може бути недоступне; optional chaining безпечний
    const pasted = event.clipboardData?.getData("text/plain") ?? "";
    const national = extractNationalDigits(pasted);
    input.value = formatUkMobileMasked(national);
    const end = input.value.length;
    input.setSelectionRange(end, end);
  });
}

// Показ/приховування тексту помилки поруч із полем і aria-invalid для поля
function setFieldError(inputEl, messageEl, message) {
  if (!messageEl) {
    return;
  }

  const hasError = Boolean(message);

  messageEl.textContent = message;
  // hidden ховає блок без ручного display:none у CSS
  messageEl.hidden = !hasError;

  if (!inputEl) {
    return;
  }

  if (hasError) {
    inputEl.setAttribute("aria-invalid", "true");
  } else {
    inputEl.removeAttribute("aria-invalid");
  }
}

// Вхід у валідацію форми реєстрації на сторінці, де цей блок є в DOM
function initRegistrationFormValidation() {
  const form = document.querySelector(".registration-page__form.form-register");
  if (!form) {
    return;
  }

  const phoneInput = document.getElementById("reg-phone");
  const codeInput = document.getElementById("product-code");
  const codeError = document.getElementById("product-code-error");

  initUaPhoneMask(phoneInput);

  function validatePhoneLength() {
    if (!phoneInput) {
      return true;
    }

    const national = extractNationalDigits(phoneInput.value);

    if (!isCompleteUaMobileNational(national)) {
      // Користувач побачить це через reportValidity() при submit
      phoneInput.setCustomValidity(REGISTRATION_MESSAGES.phoneIncomplete);
      return false;
    }

    phoneInput.setCustomValidity("");
    return true;
  }

  function validateProductCode() {
    if (!codeInput || !codeError) {
      return true;
    }

    const raw = codeInput.value.trim();

    if (raw === "") {
      setFieldError(codeInput, codeError, REGISTRATION_MESSAGES.codeRequired);
      return false;
    }

    const num = Number(raw);
    // isInteger відсікає дроби та нецілі результат Number()
    const isValidInteger = Number.isInteger(num) && num >= 1000 && num <= 10000;

    if (!isValidInteger) {
      setFieldError(codeInput, codeError, REGISTRATION_MESSAGES.codeRange);
      return false;
    }

    setFieldError(codeInput, codeError, "");
    return true;
  }

  // Якщо codeInput немає, через ?. цей рядок просто не виконається
  codeInput?.addEventListener("input", () => {
    setFieldError(codeInput, codeError, "");
  });

  form.addEventListener("submit", (event) => {
    const phoneOk = validatePhoneLength();

    if (!phoneOk) {
      event.preventDefault();
      phoneInput?.reportValidity();
      phoneInput?.focus();
      return;
    }

    const codeOk = validateProductCode();

    if (!codeOk) {
      event.preventDefault();
      codeInput?.focus();
    }
  });

  // reset скидає поля після поточної черги подій; microtask виконається вже «після» скидання
  form.addEventListener("reset", () => {
    queueMicrotask(() => {
      phoneInput?.setCustomValidity("");
      setFieldError(codeInput, codeError, "");
    });
  });
}
