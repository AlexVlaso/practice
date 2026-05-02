/** Ініціалізація усіх скриптів після побудови DOM */
document.addEventListener("DOMContentLoaded", () => {
  initLucideIcons();
  initTitleCaseInputs();
  initHeroSlider();
  initRegistrationFormValidation();
});

function initLucideIcons() {
  const hasLucide =
    typeof lucide !== "undefined" && typeof lucide.createIcons === "function";
  if (!hasLucide) {
    return;
  }
  lucide.createIcons();
}

function titleCaseWords(text) {
  return text.replace(/[^\s]+/g, (word) => {
    if (!word.length) {
      return word;
    }
    const first = word.charAt(0).toLocaleUpperCase("uk");
    const rest = word.slice(1).toLocaleLowerCase("uk");
    return first + rest;
  });
}

function initTitleCaseInputs() {
  const inputs = document.querySelectorAll(".js-title-case");

  for (const input of inputs) {
    input.addEventListener("input", () => {
      input.value = titleCaseWords(input.value);
    });

    input.addEventListener("blur", () => {
      input.value = titleCaseWords(input.value.trim());
    });
  }
}

function initHeroSlider() {
  const root = document.querySelector(".hero-slider");
  if (!root) {
    return;
  }

  const slides = root.querySelectorAll(".hero-slider__slide");
  const dots = root.querySelectorAll(".hero-slider__dot");
  const slideCount = slides.length;

  if (slideCount === 0) {
    return;
  }

  const clampIndex = (index) =>
    ((index % slideCount) + slideCount) % slideCount;

  function syncSlides(activeIndex) {
    slides.forEach((slide, index) => {
      const isActive = index === activeIndex;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", isActive ? "false" : "true");
    });
  }

  function syncDots(activeIndex) {
    dots.forEach((dot, index) => {
      const isActive = index === activeIndex;
      dot.setAttribute("aria-selected", String(isActive));
      dot.tabIndex = isActive ? 0 : -1;
      dot.classList.toggle("is-active", isActive);
    });
  }

  function goToSlide(rawIndex) {
    const index = clampIndex(rawIndex);
    syncSlides(index);
    syncDots(index);
  }

  for (const dot of dots) {
    dot.addEventListener("click", () => {
      const parsed = Number.parseInt(dot.dataset.slideTo ?? "", 10);
      if (!Number.isNaN(parsed)) {
        goToSlide(parsed);
      }
    });
  }

  goToSlide(0);
}

const REGISTRATION_MESSAGES = {
  phoneIncomplete:
    "Доведіть номер до кінця: після коду країни потрібні 10 цифр у форматі 0XX XXX XX XX.",
  codeRequired: "Вкажіть код товару.",
  codeRange:
    "Код має бути цілим числом від 1000 до 10000 включно.",
};

/** Залишає лише національні цифри (без +38); підтримує вставку повного міжнародного запису */
function extractNationalDigits(rawText) {
  let digits = rawText.replace(/\D/g, "");

  if (digits.startsWith("380")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("38")) {
    digits = digits.slice(2);
  }

  return digits.slice(0, 10);
}

/** Зібраний рядок +38 (0XX) XXX-XX-XX з уже вирізаних національних цифр */
function formatUkMobileMasked(nationalDigits) {
  const digitsOnly = nationalDigits.replace(/\D/g, "").slice(0, 10);

  if (digitsOnly.length === 0) {
    return "";
  }

  let result = "+38 (";
  result += digitsOnly.slice(0, Math.min(3, digitsOnly.length));

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

function isCompleteUaMobileNational(digits10) {
  return /^0\d{9}$/.test(digits10);
}

function initUaPhoneMask(input) {
  if (!input) {
    return;
  }

  const syncFromField = () => {
    input.setCustomValidity("");
    const national = extractNationalDigits(input.value);
    input.value = formatUkMobileMasked(national);
    const end = input.value.length;
    input.setSelectionRange(end, end);
  };

  input.addEventListener("input", syncFromField);

  input.addEventListener("paste", (event) => {
    event.preventDefault();
    input.setCustomValidity("");
    const pasted = event.clipboardData?.getData("text/plain") ?? "";
    const national = extractNationalDigits(pasted);
    input.value = formatUkMobileMasked(national);
    const end = input.value.length;
    input.setSelectionRange(end, end);
  });
}

function setFieldError(inputEl, messageEl, message) {
  if (!messageEl) {
    return;
  }

  const hasError = Boolean(message);

  messageEl.textContent = message;
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
    const isValidInteger =
      Number.isInteger(num) && num >= 1000 && num <= 10000;

    if (!isValidInteger) {
      setFieldError(codeInput, codeError, REGISTRATION_MESSAGES.codeRange);
      return false;
    }

    setFieldError(codeInput, codeError, "");
    return true;
  }

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

  form.addEventListener("reset", () => {
    queueMicrotask(() => {
      phoneInput?.setCustomValidity("");
      setFieldError(codeInput, codeError, "");
    });
  });
}
