/* ============================================================
   pJrAI — script.js
   ============================================================ */
(function () {
  "use strict";

  var API_URL = "https://api.zams.my.id/ai/chatgpt";
  var STORAGE_KEY = "pjrai_chat_history";

  /* ---------------- Theme ---------------- */
  var root = document.documentElement;
  var themeToggle = document.getElementById("themeToggle");
  var themeIcon = document.getElementById("themeIcon");

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem("pjrai_theme", theme); } catch (e) {}
    setThemeIcon(theme);
  }
  function setThemeIcon(theme) {
    // sun for light (click -> dark), moon for dark
    if (theme === "dark") {
      themeIcon.innerHTML =
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';
    } else {
      themeIcon.innerHTML =
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    }
  }
  var savedTheme = "light";
  try { savedTheme = localStorage.getItem("pjrai_theme") || "light"; } catch (e) {}
  applyTheme(savedTheme);

  themeToggle.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
  });

  /* ---------------- Mobile menu ---------------- */
  var menuToggle = document.getElementById("menuToggle");
  var nav = document.getElementById("nav");
  menuToggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    menuToggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
  });
  nav.querySelectorAll(".nav__link").forEach(function (link) {
    link.addEventListener("click", function () {
      nav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------------- Reveal on scroll ---------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------------- FAQ accordion ---------------- */
  document.querySelectorAll(".faq-item__q").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      var panel = btn.nextElementSibling;
      // close others
      document.querySelectorAll(".faq-item__q").forEach(function (other) {
        if (other !== btn) {
          other.setAttribute("aria-expanded", "false");
          other.nextElementSibling.style.maxHeight = null;
        }
      });
      if (expanded) {
        btn.setAttribute("aria-expanded", "false");
        panel.style.maxHeight = null;
      } else {
        btn.setAttribute("aria-expanded", "true");
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  });

  /* ---------------- Contact form ---------------- */
  var contactForm = document.getElementById("contactForm");
  var contactFeedback = document.getElementById("contactFeedback");
  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("name").value.trim();
    var email = document.getElementById("email").value.trim();
    var message = document.getElementById("message").value.trim();
    if (!name || !email || !message) {
      contactFeedback.style.color = "var(--pink)";
      contactFeedback.textContent = "Mohon lengkapi semua kolom terlebih dahulu.";
      return;
    }
    contactFeedback.style.color = "var(--blue)";
    contactFeedback.textContent = "Terima kasih, " + name + ". Pesan Anda telah kami terima.";
    contactForm.reset();
  });

  /* ---------------- Year ---------------- */
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ============================================================
     CHAT
     ============================================================ */
  var messagesEl = document.getElementById("messages");
  var input = document.getElementById("chatInput");
  var sendBtn = document.getElementById("sendBtn");
  var stopBtn = document.getElementById("stopBtn");
  var clearChatBtn = document.getElementById("clearChat");

  var history = [];          // {role, text, time}
  var activeController = null;
  var activeTyping = null;   // {cancel: fn}
  var isBusy = false;

  function loadHistory() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) history = JSON.parse(raw) || [];
    } catch (e) { history = []; }
  }
  function saveHistory() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch (e) {}
  }

  function formatTime(ts) {
    var d = new Date(ts);
    var h = String(d.getHours()).padStart(2, "0");
    var m = String(d.getMinutes()).padStart(2, "0");
    return h + ":" + m;
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Build a message element. Returns the .msg__body element for typing use.
  function renderMessage(role, text, time, opts) {
    opts = opts || {};
    var wrap = document.createElement("div");
    wrap.className = "msg msg--" + role;

    var body = document.createElement("div");
    body.className = "msg__body";
    if (opts.error) body.classList.add("msg__error");
    if (typeof text === "string") body.textContent = text;
    wrap.appendChild(body);

    var meta = document.createElement("div");
    meta.className = "msg__meta";
    var timeSpan = document.createElement("span");
    timeSpan.textContent = formatTime(time);
    meta.appendChild(timeSpan);

    if (role === "ai" && !opts.error && !opts.pending) {
      var copyBtn = document.createElement("button");
      copyBtn.className = "msg__copy";
      copyBtn.type = "button";
      copyBtn.textContent = "Salin";
      copyBtn.addEventListener("click", function () {
        var doneText = body.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(doneText);
        }
        copyBtn.textContent = "Tersalin";
        setTimeout(function () { copyBtn.textContent = "Salin"; }, 1500);
      });
      meta.appendChild(copyBtn);
    }
    wrap.appendChild(meta);
    messagesEl.appendChild(wrap);
    scrollToBottom();
    return { wrap: wrap, body: body, meta: meta };
  }

  function renderAll() {
    messagesEl.innerHTML = "";
    if (history.length === 0) {
      renderWelcome();
      return;
    }
    history.forEach(function (m) {
      renderMessage(m.role, m.text, m.time, { error: m.error });
    });
    scrollToBottom();
  }

  function renderWelcome() {
    var t = Date.now();
    renderMessage("ai", "Halo! Saya pJrAI, asisten AI bertenaga DeepSeek-R1. Ada yang bisa saya bantu hari ini?", t, {});
  }

  /* ---------- typing effect ---------- */
  function typeText(bodyEl, fullText, onDone) {
    var i = 0;
    var cancelled = false;
    var cursor = document.createElement("span");
    cursor.className = "cursor";
    cursor.innerHTML = "&nbsp;";

    function step() {
      if (cancelled) return;
      // type a few chars per tick for speed
      i += Math.max(1, Math.round(fullText.length / 220));
      if (i > fullText.length) i = fullText.length;
      bodyEl.textContent = fullText.slice(0, i);
      bodyEl.appendChild(cursor);
      scrollToBottom();
      if (i < fullText.length) {
        activeTyping.timer = setTimeout(step, 16);
      } else {
        if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
        if (onDone) onDone(false);
      }
    }
    activeTyping = {
      timer: null,
      cancel: function () {
        cancelled = true;
        if (activeTyping.timer) clearTimeout(activeTyping.timer);
        bodyEl.textContent = fullText.slice(0, i);
        if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
        if (onDone) onDone(true);
      }
    };
    step();
  }

  /* ---------- busy state ---------- */
  function setBusy(busy) {
    isBusy = busy;
    sendBtn.hidden = busy;
    stopBtn.hidden = !busy;
    input.disabled = false;
  }

  function extractAnswer(data, rawText) {
    if (data == null) return rawText || "";
    if (typeof data === "string") return data;
    // try common fields
    var keys = ["result", "answer", "response", "message", "data", "text", "reply", "output"];
    for (var i = 0; i < keys.length; i++) {
      if (data[keys[i]] != null) {
        var v = data[keys[i]];
        if (typeof v === "string") return v;
        if (typeof v === "object") {
          var nested = extractAnswer(v, null);
          if (nested) return nested;
        }
      }
    }
    return rawText || JSON.stringify(data);
  }

  /* ---------- send ---------- */
  function sendMessage() {
    var text = input.value.trim();
    if (!text || isBusy) return;

    // clear welcome-only state
    if (history.length === 0) messagesEl.innerHTML = "";

    var userTime = Date.now();
    history.push({ role: "user", text: text, time: userTime });
    saveHistory();
    renderMessage("user", text, userTime, {});

    input.value = "";
    autoResize();

    requestAI(text);
  }

  function requestAI(prompt) {
    setBusy(true);

    // pending bubble with typing dots
    var pendingTime = Date.now();
    var pending = renderMessage("ai", "", pendingTime, { pending: true });
    pending.body.innerHTML =
      '<span class="typing"><span></span><span></span><span></span></span>';

    activeController = new AbortController();
    var url = API_URL + "?q=" + encodeURIComponent(prompt);

    // Client-side timeout so the user isn't left waiting indefinitely.
    var timedOut = false;
    var timeoutId = setTimeout(function () {
      timedOut = true;
      if (activeController) activeController.abort();
    }, 75000);

    fetch(url, { signal: activeController.signal })
      .then(function (res) {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (raw) {
        var data = null;
        try { data = JSON.parse(raw); } catch (e) { data = null; }
        var answer = extractAnswer(data, raw);
        if (!answer || !answer.trim()) answer = "Maaf, saya tidak menerima jawaban yang valid. Silakan coba lagi.";
        answer = answer.trim();

        pending.body.innerHTML = "";
        // mark not pending so meta/copy added at end
        typeText(pending.body, answer, function () {
          activeTyping = null;
          // finalize message with copy button + save
          finalizeAiMessage(pending, answer, pendingTime);
          setBusy(false);
          activeController = null;
        });
      })
      .catch(function (err) {
        clearTimeout(timeoutId);
        activeController = null;
        if (err && err.name === "AbortError" && !timedOut) {
          // stopped by user
          pending.wrap.parentNode && pending.wrap.parentNode.removeChild(pending.wrap);
          setBusy(false);
          return;
        }
        renderError(pending, prompt, pendingTime, timedOut);
        setBusy(false);
      });
  }

  function finalizeAiMessage(pending, answer, time) {
    history.push({ role: "ai", text: answer, time: time });
    saveHistory();
    // add copy button to meta
    var copyBtn = document.createElement("button");
    copyBtn.className = "msg__copy";
    copyBtn.type = "button";
    copyBtn.textContent = "Salin";
    copyBtn.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(answer);
      }
      copyBtn.textContent = "Tersalin";
      setTimeout(function () { copyBtn.textContent = "Salin"; }, 1500);
    });
    pending.meta.appendChild(copyBtn);
    scrollToBottom();
  }

  function renderError(pending, prompt, time, timedOut) {
    pending.body.classList.add("msg__error");
    pending.body.textContent = timedOut
      ? "Server membutuhkan waktu terlalu lama untuk merespons. Silakan coba lagi."
      : "Terjadi kesalahan saat menghubungi server. Periksa koneksi Anda dan coba lagi.";
    var retryBtn = document.createElement("button");
    retryBtn.className = "btn btn--mini btn--primary msg__retry";
    retryBtn.type = "button";
    retryBtn.textContent = "Coba Lagi";
    retryBtn.addEventListener("click", function () {
      pending.wrap.parentNode && pending.wrap.parentNode.removeChild(pending.wrap);
      requestAI(prompt);
    });
    pending.wrap.appendChild(retryBtn);
    scrollToBottom();
  }

  /* ---------- stop ---------- */
  stopBtn.addEventListener("click", function () {
    if (activeController) {
      activeController.abort();
    } else if (activeTyping) {
      activeTyping.cancel();
    }
    setBusy(false);
  });

  /* ---------- clear all ---------- */
  clearChatBtn.addEventListener("click", function () {
    if (isBusy && activeController) activeController.abort();
    if (activeTyping) activeTyping.cancel();
    history = [];
    saveHistory();
    setBusy(false);
    renderAll();
  });

  /* ---------- input behaviour ---------- */
  function autoResize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 160) + "px";
  }
  input.addEventListener("input", autoResize);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  sendBtn.addEventListener("click", sendMessage);

  /* ---------- init ---------- */
  loadHistory();
  renderAll();
})();
