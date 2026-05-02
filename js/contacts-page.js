/**
 * Лабораторна робота №4
 */

document.addEventListener("DOMContentLoaded", () => {
  initContactsLocationsAjax();
});

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderLocationDetail(data) {
  const phones = data.phones
    .map((phone) => {
      const telHref = phone.replace(/[^\d+]/g, "");
      return `<li><a href="tel:${telHref}">${escapeHtml(phone)}</a></li>`;
    })
    .join("");

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

function initContactsLocationsAjax() {
  const mapEl = document.getElementById("contacts-map");
  const listEl = document.getElementById("contacts-location-list");
  const detailEl = document.getElementById("contacts-location-detail");
  const statusEl = document.getElementById("contacts-location-status");

  if (!mapEl || !listEl || !detailEl || typeof L === "undefined") {
    return;
  }

  let map = null;
  let markersLayer = null;

  function ensureMap(lat, lng, zoom) {
    if (!map) {
      map = L.map(mapEl).setView([lat, lng], zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      markersLayer = L.layerGroup().addTo(map);
    } else {
      map.setView([lat, lng], zoom);
    }
    return map;
  }

  function updateMapCenter(data) {
    const zoom = 15;
    ensureMap(data.lat, data.lng, zoom);
    markersLayer.clearLayers();
    L.marker([data.lat, data.lng])
      .addTo(markersLayer)
      .bindPopup(
        `<strong>${escapeHtml(data.title)}</strong><br>${escapeHtml(data.address)}`,
      );
    requestAnimationFrame(() => {
      map.invalidateSize();
    });
  }

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
    statusEl.hidden = false;
    statusEl.textContent = "Завантаження даних точки…";
    detailEl.innerHTML =
      '<p class="contacts-location-detail__loading">Отримуємо дані з сервера…</p>';

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

  window.addEventListener("resize", () => {
    if (map) {
      map.invalidateSize();
    }
  });
}
