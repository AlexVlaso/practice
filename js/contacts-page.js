/**
 * Лабораторна робота №4
 */

// Старт лише після побудови DOM — інакше getElementById поверне null
document.addEventListener("DOMContentLoaded", () => {
  initContactsLocationsAjax();
});

// Екрануємо текст для вставки в innerHTML — теги з даних не стануть активною розміткою
function escapeHtml(text) {
  // Тимчасовий елемент не обов’язково додавати в документ — створюємо в пам’яті
  const div = document.createElement("div");
  // textContent трактує спецсимволи як текст
  div.textContent = text;
  // innerHTML вже містить екрановані сутності (&lt; для < тощо)
  return div.innerHTML;
}

// Збираємо HTML картки однієї точки з даних JSON
function renderLocationDetail(data) {
  // Масив рядків телефонів → список <li> з посиланнями tel:
  const phones = data.phones
    .map((phone) => {
      // У href залишаємо лише цифри й плюс — зручно для телефону на смартфоні
      const telHref = phone.replace(/[^\d+]/g, "");
      return `<li><a href="tel:${telHref}">${escapeHtml(phone)}</a></li>`;
    })
    // З’єднуємо без розділювача — між <li> він не потрібен
    .join("");

  // Шаблонний рядок: безпечно підставляємо escapeHtml(...)
  return `
    <h3 class="contacts-location-detail__title">${escapeHtml(data.title)}</h3>
    <dl class="contacts-location-detail__dl">
      <dt>Адреса</dt>
      <dd>${escapeHtml(data.address)}</dd>
      <dt>Години роботи</dt>
      <dd>${escapeHtml(data.hours)}</dd>
      <dt>Як дістатися</dt>
      <dd>${escapeHtml(data.howToGet)}</dd>
      <dt>Телефони</dt>
      <dd><ul class="contacts-location-detail__phones">${phones}</ul></dd>
    </dl>
  `;
}

// Завантаження списку точок, карта Leaflet і догрузка деталей по кліку
function initContactsLocationsAjax() {
  const mapEl = document.getElementById("contacts-map");
  const listEl = document.getElementById("contacts-location-list");
  const detailEl = document.getElementById("contacts-location-detail");
  const statusEl = document.getElementById("contacts-location-status");

  // Без потрібних вузлів або без глобального L (Leaflet) — вихід
  if (!mapEl || !listEl || !detailEl || typeof L === "undefined") {
    return;
  }

  // Карту створюємо «ліниво» під час першої потреби
  let map = null;
  // Шар маркерів — зручно очистити всі точки однією командою
  let markersLayer = null;

  function ensureMap(lat, lng, zoom) {
    if (!map) {
      // L.map(контейнер); setView — центр і масштаб
      map = L.map(mapEl).setView([lat, lng], zoom);
      // Тайли OpenStreetMap — зовнішній сервіс карт
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      // layerGroup тримає маркери як групу
      markersLayer = L.layerGroup().addTo(map);
    } else {
      // Карта вже є — лише зміщуємо центр при зміні точки
      map.setView([lat, lng], zoom);
    }
    return map;
  }

  function updateMapCenter(data) {
    const zoom = 15;
    ensureMap(data.lat, data.lng, zoom);
    markersLayer.clearLayers();
    // Один маркер на обрану локацію
    L.marker([data.lat, data.lng])
      .addTo(markersLayer)
      .bindPopup(
        `<strong>${escapeHtml(data.title)}</strong><br>${escapeHtml(data.address)}`,
      );
    // Після зміни верстки перерахувати розмір полотна карти
    requestAnimationFrame(() => {
      map.invalidateSize();
    });
  }

  // GET одного JSON за id (наприклад api/locations/kyiv.json)
  async function fetchLocationDetail(id) {
    const response = await fetch(
      `api/locations/${encodeURIComponent(id)}.json`,
      {
        headers: { Accept: "application/json" },
      },
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }

  async function selectLocation(id, activeButton) {
    // Показуємо рядок статусу завантаження
    statusEl.hidden = false;
    statusEl.textContent = "Завантаження даних точки…";
    detailEl.innerHTML =
      '<p class="contacts-location-detail__loading">Отримуємо дані з сервера…</p>';

    // Підсвічуємо натиснуту кнопку й оновлюємо aria-selected у списку
    listEl.querySelectorAll(".contacts-page__location-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn === activeButton);
      btn.setAttribute("aria-selected", String(btn === activeButton));
    });

    try {
      const data = await fetchLocationDetail(id);
      detailEl.innerHTML = renderLocationDetail(data);
      statusEl.hidden = true;
      statusEl.textContent = "";
      updateMapCenter(data);
    } catch {
      // Мережа або код відповіді не ok — людне повідомлення
      detailEl.innerHTML = "";
      statusEl.hidden = false;
      statusEl.textContent =
        "Не вдалося завантажити дані точки. Переконайтеся, що сторінку відкрито через HTTP-сервер (наприклад Live Server), а не протокол file://.";
    }
  }

  async function bootstrapLocationList() {
    try {
      const response = await fetch("api/locations/index.json", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      /** @type {{ locations: { id: string; shortName: string }[] }} */
      const index = await response.json();
      listEl.innerHTML = "";

      index.locations.forEach((loc, i) => {
        const li = document.createElement("li");
        li.className = "contacts-page__location-item";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "contacts-page__location-btn";
        // dataset.locationId відповідає data-location-id у HTML для збереження id
        btn.dataset.locationId = loc.id;
        btn.textContent = loc.shortName;
        btn.setAttribute("aria-selected", i === 0 ? "true" : "false");
        btn.addEventListener("click", () => selectLocation(loc.id, btn));
        li.appendChild(btn);
        listEl.appendChild(li);
      });

      const firstBtn = listEl.querySelector(".contacts-page__location-btn");
      if (firstBtn) {
        await selectLocation(firstBtn.dataset.locationId, firstBtn);
      }
    } catch {
      listEl.innerHTML = "";
      detailEl.innerHTML = "";
      statusEl.hidden = false;
      statusEl.textContent =
        "Не вдалося завантажити список точок. Відкрийте сайт через локальний веб-сервер.";
    }
  }

  bootstrapLocationList();

  // Після зміни ширини вікна Leaflet потрібно перерахувати розмір
  window.addEventListener("resize", () => {
    if (map) {
      map.invalidateSize();
    }
  });
}
