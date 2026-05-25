/* 首页主体交互：时段背景、照片聚焦、状态短句和想去地点 */
(function () {
  "use strict";

  var BG = {
    morning: "/assets/早晨草地.png",
    forenoon: "/assets/上午草地.png",
    noon: "/assets/中午草地.png",
    afternoon: "/assets/下午草地.jpg",
    dusk: "/assets/傍晚草地.png",
    evening: "/assets/晚上草地.png",
    midnight: "/assets/半夜草地.png"
  };
  var PLACES_KEY = "cuteblog.places.v1";
  var STATUS_KEY = "cuteblog.home.status.v1";
  var WEATHER_CACHE_MS = 30 * 60 * 1000;
  var DEFAULT_PLACES = [
    { name: "Kyoto", note: "Walk slowly through quiet alleys at dusk and find a warm little dinner spot.", tone: "night" },
    { name: "Dali", note: "Go somewhere breezy, watch the lake and clouds, and let the afternoon move slowly.", tone: "desert" },
    { name: "Iceland", note: "Wait for the aurora together and tuck the cold wind and stars into this year's wishes.", tone: "sea" }
  ];
  var QUOTES = {
    white: ["Keep the little things carefully today.", "Take it slowly; the nest will grow bit by bit.", "If the breeze is right, stay in the sun a little longer."],
    brown: ["Write down the places first; the road will appear slowly.", "Today is good for one small cute thing.", "Before leaving, tuck the anticipation into your pocket."]
  };
  var WEATHER_LABELS = {
    0: "Clear",
    1: "Mostly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Dense drizzle",
    56: "Freezing drizzle",
    57: "Heavy freezing drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Rain showers",
    81: "Heavy showers",
    82: "Violent showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Heavy thunderstorm with hail"
  };
  var quoteTimers = {};

  function periodForHour(h) {
    if (h >= 5 && h < 8) return "morning";
    if (h >= 8 && h < 11) return "forenoon";
    if (h >= 11 && h < 14) return "noon";
    if (h >= 14 && h < 17) return "afternoon";
    if (h >= 17 && h < 19) return "dusk";
    if (h >= 19 && h < 23) return "evening";
    return "midnight";
  }

  function setPeriod(key) {
    var bg = document.getElementById("homeBg");
    if (bg && BG[key]) bg.style.setProperty("--home-bg-url", 'url("' + BG[key] + '")');
  }

  function readJson(key, fallback) {
    try {
      var data = JSON.parse(localStorage.getItem(key) || "");
      return data || fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function todayStr() {
    var d = new Date();
    var pad = function (n) { return n < 10 ? "0" + n : String(n); };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function manualValue(saved, who, field) {
    var item = saved[who] && saved[who][field];
    return item && item.date === todayStr() ? String(item.value || "").trim() : "";
  }

  function storedWeatherText(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    return String(value.text || "").trim();
  }

  function saveManualValue(who, field, value) {
    var saved = readJson(STATUS_KEY, {});
    saved[who] = saved[who] || {};
    if (value) saved[who][field] = { date: todayStr(), value: value };
    else delete saved[who][field];
    writeJson(STATUS_KEY, saved);
  }

  function saveWeatherValue(who, weather) {
    var saved = readJson(STATUS_KEY, {});
    saved[who] = saved[who] || {};
    saved[who].weather = weather;
    writeJson(STATUS_KEY, saved);
  }

  function setWeatherText(who, text) {
    var prefix = who === "brown" ? "brown" : "white";
    var weather = document.getElementById(prefix + "Weather");
    if (weather && text) weather.textContent = text;
  }

  function serverWeatherFor(who) {
    var prefix = who === "brown" ? "brown" : "white";
    var el = document.getElementById(prefix + "Weather");
    return el ? (el.getAttribute("data-server-weather") || "") : "";
  }

  function serverFieldText(who, field) {
    var prefix = who === "brown" ? "brown" : "white";
    var suffix = field === "mood" ? "Mood" : "Doing";
    var el = document.getElementById(prefix + suffix);
    return el ? (el.getAttribute("data-server-text") || "") : "";
  }

  function postFieldToServer(field, value) {
    if (!window.fetch) return;
    try {
      fetch("/api/status/field", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ field: field, value: value })
      }).catch(function () {});
    } catch (e) {}
  }

  function currentWeatherWho() {
    var home = document.getElementById("home");
    var who = home && home.getAttribute("data-current-weather-who");
    return who === "white" || who === "brown" ? who : "";
  }

  function postWeatherToServer(text) {
    if (!window.fetch || !text) return;
    try {
      fetch("/api/status/weather", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text })
      }).catch(function () {});
    } catch (e) {}
  }

  function renderStatus() {
    var saved = readJson(STATUS_KEY, {});
    var meWho = currentWeatherWho();
    [
      { who: "white", prefix: "white", mood: "Softly happy", doing: "Sorting today's small notes" },
      { who: "brown", prefix: "brown", mood: "Full of energy", doing: "Planning the next outing" }
    ].forEach(function (item) {
      var mood = document.getElementById(item.prefix + "Mood");
      var doing = document.getElementById(item.prefix + "Doing");
      var weather = document.getElementById(item.prefix + "Weather");

      // mood / doing：自己那侧 localStorage 今日值优先（本人刚改的），否则用服务器 SSR 值（已按当天过滤）；
      // 对方那侧只读 SSR 值（本设备的 localStorage 可能是过期身份留下的，不可信）
      if (mood) {
        var serverMood = serverFieldText(item.who, "mood");
        if (meWho === item.who) {
          mood.textContent = manualValue(saved, item.who, "mood") || serverMood || item.mood;
        } else {
          mood.textContent = serverMood || item.mood;
        }
      }
      if (doing) {
        var serverDoing = serverFieldText(item.who, "doing");
        if (meWho === item.who) {
          doing.textContent = manualValue(saved, item.who, "doing") || serverDoing || item.doing;
        } else {
          doing.textContent = serverDoing || item.doing;
        }
      }

      // 天气：当前用户优先用本地缓存（更新鲜），其次服务器值；对方只看服务器值
      if (weather) {
        var serverText = serverWeatherFor(item.who);
        if (meWho === item.who) {
          var cached = storedWeatherText(saved[item.who] && saved[item.who].weather);
          weather.textContent = cached || serverText || "Location pending · Weather pending";
        } else {
          weather.textContent = serverText || "Location pending · Weather pending";
        }
      }
    });
  }

  function weatherLabel(code) {
    return WEATHER_LABELS[Number(code)] || "Weather";
  }

  function roundedTemp(value) {
    var num = Number(value);
    return Number.isFinite(num) ? Math.round(num) : null;
  }

  function buildLocationLabel(location) {
    if (!location) return "Current location";
    return (
      location.city ||
      location.locality ||
      location.principalSubdivision ||
      location.countryName ||
      "Current location"
    );
  }

  function fetchJson(url) {
    return fetch(url).then(function (response) {
      if (!response.ok) throw new Error("request failed");
      return response.json();
    });
  }

  function geocodeUrl(latitude, longitude) {
    var url = "https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=zh";
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      url += "&latitude=" + encodeURIComponent(latitude) + "&longitude=" + encodeURIComponent(longitude);
    }
    return url;
  }

  function browserPosition() {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        reject(new Error("geolocation unavailable"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (position) {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        reject,
        {
          enableHighAccuracy: false,
          maximumAge: WEATHER_CACHE_MS,
          timeout: 8000
        }
      );
    });
  }

  function detectLocation() {
    return browserPosition()
      .then(function (coords) {
        return fetchJson(geocodeUrl(coords.latitude, coords.longitude))
          .then(function (location) {
            return {
              latitude: coords.latitude,
              longitude: coords.longitude,
              label: buildLocationLabel(location)
            };
          })
          .catch(function () {
            return {
              latitude: coords.latitude,
              longitude: coords.longitude,
              label: "Current location"
            };
          });
      })
      .catch(function () {
        return fetchJson(geocodeUrl()).then(function (location) {
          return {
            latitude: Number(location.latitude),
            longitude: Number(location.longitude),
            label: buildLocationLabel(location)
          };
        });
      });
  }

  function fetchWeather(latitude, longitude) {
    var params = [
      "latitude=" + encodeURIComponent(latitude),
      "longitude=" + encodeURIComponent(longitude),
      "current=temperature_2m,apparent_temperature,weather_code",
      "timezone=auto",
      "forecast_days=1"
    ];
    return fetchJson("https://api.open-meteo.com/v1/forecast?" + params.join("&"));
  }

  function weatherText(location, weather) {
    var current = weather && weather.current;
    var temp = roundedTemp(current && current.temperature_2m);
    if (temp === null) return "";
    return location.label + " · " + weatherLabel(current.weather_code) + " " + temp + "°C";
  }

  function setupWeather() {
    var home = document.getElementById("home");
    var who = home && home.getAttribute("data-current-weather-who");
    if (who !== "white" && who !== "brown") return;

    var saved = readJson(STATUS_KEY, {});
    var cached = saved[who] && saved[who].weather;
    var cachedText = storedWeatherText(cached);
    if (cachedText) setWeatherText(who, cachedText);
    // 服务器若还没拿到我的天气（比如刚部署、对方第一次看），用本地缓存先 sync 一份
    var serverText = serverWeatherFor(who);
    if (cachedText && cachedText !== serverText) postWeatherToServer(cachedText);
    if (cached && typeof cached === "object" && Date.now() - Number(cached.updatedAt || 0) < WEATHER_CACHE_MS) return;
    if (!window.fetch) return;

    setWeatherText(who, cachedText || "Syncing local weather");
    detectLocation()
      .then(function (location) {
        if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
          throw new Error("missing coordinates");
        }
        return fetchWeather(location.latitude, location.longitude).then(function (weather) {
          return weatherText(location, weather);
        });
      })
      .then(function (text) {
        if (!text) throw new Error("empty weather");
        setWeatherText(who, text);
        saveWeatherValue(who, { text: text, updatedAt: Date.now() });
        // 同步到服务器，让对方在 ta 的设备上也能看到
        postWeatherToServer(text);
      })
      .catch(function () {
        if (!cachedText) setWeatherText(who, "Location pending · Weather pending");
      });
  }

  function typeQuote(id, text) {
    var el = document.getElementById(id);
    if (!el) return;
    if (quoteTimers[id]) window.clearInterval(quoteTimers[id]);
    el.setAttribute("data-full-text", text);
    var i = 0;
    el.textContent = "";
    quoteTimers[id] = window.setInterval(function () {
      i += 1;
      el.textContent = text.slice(0, i);
      if (i >= text.length) {
        window.clearInterval(quoteTimers[id]);
        quoteTimers[id] = null;
      }
    }, 48);
  }

  function pickAnother(list, current) {
    if (list.length === 1) return list[0];
    var next = list[Math.floor(Math.random() * list.length)];
    var guard = 0;
    while (next === current && guard < 8) {
      next = list[Math.floor(Math.random() * list.length)];
      guard += 1;
    }
    return next;
  }

  function setupStatusActions() {
    function statusName(who) {
      var title = document.querySelector('[data-status-name="' + who + '"]');
      return title && title.textContent.trim() ? title.textContent.trim() : (who === "brown" ? "Brown" : "White");
    }

    Array.prototype.slice.call(document.querySelectorAll(".home-status__edit")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var who = btn.getAttribute("data-who");
        var field = btn.getAttribute("data-field");
        var prefix = who === "brown" ? "brown" : "white";
        var label = field === "mood" ? "mood" : "current activity";
        var current = document.getElementById(prefix + (field === "mood" ? "Mood" : "Doing"));
        var value = window.prompt("Edit " + statusName(who) + "'s " + label + ". Leave blank to restore the default:", current ? current.textContent : "");
        if (value === null) return;
        var trimmed = value.trim();
        saveManualValue(who, field, trimmed);
        // 只有自己那侧才同步到服务器（SSR 已经保证按钮只在自己那侧出现，这里再防一手）
        if (currentWeatherWho() === who) {
          postFieldToServer(field, trimmed);
        }
        renderStatus();
      });
    });

    Array.prototype.slice.call(document.querySelectorAll(".home-status__quote")).forEach(function (quote) {
      var replay = function () {
        var who = quote.getAttribute("data-who") === "brown" ? "brown" : "white";
        typeQuote((who === "brown" ? "brown" : "white") + "Quote", pickAnother(QUOTES[who], quote.getAttribute("data-full-text") || quote.textContent));
      };
      quote.setAttribute("data-full-text", quote.textContent);
      quote.addEventListener("click", replay);
      quote.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          replay();
        }
      });
    });
  }

  function setupPhotos() {
    var stage = document.getElementById("homeRecentPhotos");
    if (!stage) return;
    var cards = Array.prototype.slice.call(stage.querySelectorAll(".home-photo-card"));
    function clear() {
      stage.classList.remove("is-active");
      cards.forEach(function (card) {
        card.classList.remove("is-focus");
        card.style.removeProperty("--lean");
        card.style.removeProperty("--pitch");
        card.style.removeProperty("--lean-x");
        card.style.removeProperty("--depth");
        card.style.removeProperty("--tilt");
      });
    }
    function focus(index) {
      stage.classList.add("is-active");
      cards.forEach(function (card, i) {
        var delta = index - i;
        var abs = Math.abs(delta);
        var side = i < index ? -1 : 1;
        card.classList.toggle("is-focus", i === index);
        if (i === index) return;
        card.style.setProperty("--lean", side * -15 + "deg");
        card.style.setProperty("--pitch", (2 + abs * 0.8).toFixed(1) + "deg");
        card.style.setProperty("--lean-x", String(side * Math.min(24, 6 + abs * 5)));
        card.style.setProperty("--depth", String(-34 - abs * 18));
        card.style.setProperty("--tilt", side * 1.2 + "deg");
      });
    }
    cards.forEach(function (card, index) {
      card.addEventListener("mouseenter", function () { focus(index); });
      card.addEventListener("focus", function () { focus(index); });
      card.addEventListener("click", function () { focus(index); });
    });
    stage.addEventListener("mouseleave", clear);
    stage.addEventListener("focusout", function (ev) {
      if (!stage.contains(ev.relatedTarget)) clear();
    });
  }

  function createPlaceCard(place) {
    var tone = place.tone || "night";
    var card = document.createElement("article");
    card.className = "place-card place-card--" + tone;
    card.tabIndex = 0;
    card.innerHTML =
      '<div class="place-card__art"><span class="' + (tone === "night" ? "place-card__moon" : "place-card__sun") + '"></span><span class="place-card__land"></span></div>' +
      '<div class="place-card__content"><h3 class="place-card__name"></h3><p class="place-card__note"></p></div>';
    card.querySelector(".place-card__name").textContent = place.name;
    card.querySelector(".place-card__note").textContent = place.note;
    return card;
  }

  function renderPlaces() {
    var list = document.getElementById("placeList");
    var count = document.getElementById("placeCount");
    if (!list) return;
    var saved = readJson(PLACES_KEY, []);
    var places = saved.concat(DEFAULT_PLACES);
    list.textContent = "";
    places.forEach(function (place) {
      list.appendChild(createPlaceCard(place));
    });
    if (count) count.textContent = places.length + " destinations";
  }

  function setupPlaces() {
    var toggle = document.getElementById("placeToggle");
    var form = document.getElementById("placeForm");
    var cancel = document.getElementById("placeCancel");
    var name = document.getElementById("placeName");
    var note = document.getElementById("placeNote");
    var tone = document.getElementById("placeTone");
    function setOpen(open) {
      if (!form || !toggle) return;
      form.classList.toggle("is-hidden", !open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "Close form" : "Add place";
      if (open && name) name.focus();
    }
    if (toggle && form) toggle.addEventListener("click", function () { setOpen(form.classList.contains("is-hidden")); });
    if (cancel) cancel.addEventListener("click", function () { setOpen(false); });
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        if (!name.value.trim() || !note.value.trim()) return;
        var saved = readJson(PLACES_KEY, []);
        saved.unshift({ name: name.value.trim(), note: note.value.trim(), tone: tone.value || "night", createdAt: Date.now() });
        writeJson(PLACES_KEY, saved);
        form.reset();
        setOpen(false);
        renderPlaces();
      });
    }
    renderPlaces();
  }

  setPeriod(periodForHour(new Date().getHours()));
  renderStatus();
  setupWeather();
  setupStatusActions();
  setupPhotos();
  setupPlaces();
})();
