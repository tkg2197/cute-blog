/* ============================================================
   我们的小窝：页面角落陪伴小狗
   待机、随机说话、按钮联动、点击播放动作 GIF
   ============================================================ */
(function () {
  "use strict";

  var IDLE = {
    white: "/gif/白狗-待机.png",
    brown: "/gif/棕狗-待机.png"
  };

  var DOGS = [
    {
      key: "white",
      label: "White",
      idle: IDLE.white,
      actions: [
        { id: "white-code", src: "/gif/白狗-写出代码.gif", duration: 2500, line: "White is writing code with great focus." },
        { id: "white-sing", src: "/gif/白狗-唱歌.gif", duration: 2300, line: "White hums a tiny song for you." },
        { id: "white-heart", src: "/gif/白狗-抛出爱心.gif", duration: 2100, line: "White tosses out a heart.", after: "brown-catch-heart" },
        { id: "white-crawl", src: "/gif/白狗-爬行.gif", duration: 3600, line: "White quietly crawls over." },
        { id: "white-question", src: "/gif/白狗-翻身问号.gif", duration: 2600, line: "White rolls over: what happened?" },
        { id: "white-jump", src: "/gif/白狗-跳跳.gif", duration: 2300, line: "White jumps up happily." }
      ]
    },
    {
      key: "brown",
      label: "Brown",
      idle: IDLE.brown,
      actions: [
        { id: "brown-workout", src: "/gif/棕狗-健身.gif", duration: 2600, line: "Brown is getting a workout in." },
        { id: "brown-food", src: "/gif/棕狗-想开饭.gif", duration: 2600, line: "Brown is already thinking about dinner." },
        { id: "brown-heart", src: "/gif/棕狗-甩爱心.gif", duration: 2500, line: "Brown tosses out a heart too." },
        { id: "brown-leave", src: "/gif/棕狗-跳走.gif", duration: 2300, line: "Brown hops away to scout ahead." },
        { id: "brown-duck", src: "/gif/棕狗-鸭子跳跳.gif", duration: 2500, line: "Brown jumps along with the little duck." }
      ],
      hiddenActions: {
        "brown-catch-heart": { id: "brown-catch-heart", src: "/gif/棕狗-接住爱心.gif", duration: 2600, line: "Brown catches White's heart." }
      }
    }
  ];

  var RANDOM_LINES = [
    "Keep the little things tucked away with care today.",
    "The nest is glowing softly.",
    "Take a sip of water, then keep browsing.",
    "We're keeping you company from the corner.",
    "Today is good for saving a bit of joy.",
    "Take your time. The page can wait.",
    "White smells a new idea nearby.",
    "Brown thinks this place feels cozy.",
    "Want to peek at the latest photos?",
    "Some stories are better written later.",
    "Today can still be sweet.",
    "Corner patrol complete. All is well.",
    "The places you want to visit are getting closer.",
    "Remember to leave a photo for today.",
    "The breeze is soft. A good time to daydream.",
    "This is a tiny world for two.",
    "If you're tired, rest here for a while.",
    "We just found a good mood.",
    "Today's clouds look very touchable.",
    "The corner is carefully guarded.",
    "Writing a little still counts as moving forward.",
    "Now that you're here, the nest feels livelier.",
    "No rush. Good things arrive slowly.",
    "The corner pups have plenty of energy today."
  ];

  var FEATURE_LINES = [
    { test: /places|want to go/i, line: "Let's see the places you want to visit this year." },
    { test: /home|index/i, line: "Back home to Our Nest." },
    { test: /blog|stories/i, line: "Let's read the stories you wrote together." },
    { test: /records|life/i, line: "Today's little moods deserve a place to stay." },
    { test: /photos|photo/i, line: "Let's flip through the latest photos." },
    { test: /activity|timeline/i, line: "Let's see what happened in each part of the day." },
    { test: /upload|choose photo|file/i, line: "Adding something new to the nest?" },
    { test: /add|save|publish|write|submit/i, line: "Tuck the new little thing in carefully." },
    { test: /filter|all|white|brown/i, line: "Try another angle. There may be something new." },
    { test: /back/i, line: "Step back slowly. We'll keep you company." },
    { test: /cancel|close/i, line: "It is fine to tuck it away for now." }
  ];
  var SPEECH_HOLD_MS = 2000;

  var root = document.createElement("div");
  root.className = "corner-dogs";
  root.setAttribute("aria-label", "Corner pups");
  document.body.appendChild(root);

  var dogMap = {};
  var dogButtons = DOGS.map(function (dog) {
    var btn = document.createElement("button");
    btn.className = "corner-dog corner-dog--" + dog.key;
    btn.type = "button";
    btn.setAttribute("aria-label", dog.label + ", play a random action");

    var shadow = document.createElement("span");
    shadow.className = "corner-dog__shadow";

    var img = document.createElement("img");
    img.className = "corner-dog__img";
    img.src = dog.idle;
    img.alt = "";
    img.draggable = false;

    var bubble = document.createElement("span");
    bubble.className = "corner-dog__bubble";

    btn.appendChild(shadow);
    btn.appendChild(img);
    btn.appendChild(bubble);
    root.appendChild(btn);

    dog.el = btn;
    dog.img = img;
    dog.bubble = bubble;
    dogMap[dog.key] = dog;

    btn.addEventListener("click", function () {
      playRandomAction(dog);
    });

    return btn;
  });

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function randomDog() {
    return pick(DOGS);
  }

  function speak(dog, line, holdMs) {
    if (!dog || !dog.bubble) return;
    clearTimeout(dog._speechTimer);
    dog.bubble.textContent = line;
    dog.el.classList.add("is-speaking");
    dog._speechTimer = setTimeout(function () {
      dog.el.classList.remove("is-speaking");
    }, holdMs || SPEECH_HOLD_MS);
  }

  function scheduleRandomSpeech() {
    var delay = 30000 + Math.floor(Math.random() * 10001);
    clearTimeout(root._randomSpeechTimer);
    root._randomSpeechTimer = setTimeout(function () {
      speak(randomDog(), pick(RANDOM_LINES), SPEECH_HOLD_MS);
      scheduleRandomSpeech();
    }, delay);
  }

  function playRandomAction(dog) {
    playAction(dog, pick(dog.actions));
  }

  function playAction(dog, action) {
    if (!dog || !action) return;
    clearTimeout(dog._actionTimer);
    dog.el.classList.add("is-playing");
    speak(dog, action.line, SPEECH_HOLD_MS);
    dog.img.src = action.src + "?play=" + Date.now();
    dog._actionTimer = setTimeout(function () {
      dog.img.src = dog.idle;
      dog.el.classList.remove("is-playing");
      if (action.after === "brown-catch-heart") {
        playAction(dogMap.brown, dogMap.brown.hiddenActions["brown-catch-heart"]);
      }
    }, action.duration);
  }

  function featureLineFor(el) {
    var text = [
      el.textContent || "",
      el.getAttribute("aria-label") || "",
      el.getAttribute("href") || "",
      el.id || "",
      el.className || ""
    ].join(" ");
    for (var i = 0; i < FEATURE_LINES.length; i++) {
      if (FEATURE_LINES[i].test.test(text)) return FEATURE_LINES[i].line;
    }
    return "";
  }

  function bindFeatureTalk() {
    var selector = "a, button, [role='button']";
    Array.prototype.slice.call(document.querySelectorAll(selector)).forEach(function (el) {
      if (el.closest(".corner-dogs")) return;
      if (el._cornerDogTalkBound) return;
      var line = featureLineFor(el);
      if (!line) return;
      el._cornerDogTalkBound = true;
      el.addEventListener("mouseenter", function () {
        speak(randomDog(), line, SPEECH_HOLD_MS);
      });
      el.addEventListener("focus", function () {
        speak(randomDog(), line, SPEECH_HOLD_MS);
      });
    });
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  document.addEventListener("mousemove", function (ev) {
    dogButtons.forEach(function (btn) {
      var rect = btn.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var x = clamp((ev.clientX - cx) / 360, -1, 1);
      var y = clamp((ev.clientY - cy) / 300, -1, 1);
      btn.style.setProperty("--look-x", x.toFixed(3));
      btn.style.setProperty("--look-y", y.toFixed(3));
    });
  });

  bindFeatureTalk();
  scheduleRandomSpeech();
})();
