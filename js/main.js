/* Lucide: відмалювати data-lucide */
document.addEventListener("DOMContentLoaded", function () {
  if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }

  function titleCaseWords(str) {
    return str.replace(/[^\s]+/g, function (w) {
      if (!w.length) return w;
      return w.charAt(0).toLocaleUpperCase("uk") + w.slice(1).toLocaleLowerCase("uk");
    });
  }

  document.querySelectorAll(".js-title-case").forEach(function (input) {
    input.addEventListener("blur", function () {
      input.value = titleCaseWords(input.value.trim());
    });
  });
});
