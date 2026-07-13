// ==UserScript==
// @name         MaruMori Even More Gamified - Updated
// @namespace    marumori-gamify
// @version      3.9.0
// @description  Gamifies MaruMori review sessions with arcade combo audio, score multipliers, screen shake, floating damage numbers, and more
// @match        https://marumori.io/*
// @author       matskye & Mikhail2577
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_getResourceURL
// @resource     mmShrineGarden https://raw.githubusercontent.com/Mikhail2577/marumori-userscripts/f997afc94074989ec324590d7df08960a2633f52/even-more-gamified/assets/shrine-garden.jpg
// @resource     mmNightview https://raw.githubusercontent.com/Mikhail2577/marumori-userscripts/f997afc94074989ec324590d7df08960a2633f52/even-more-gamified/assets/nightview.png
// @icon         https://www.google.com/s2/favicons?sz=64&domain=marumori.io
// @license      WTFPL
// @downloadURL https://update.greasyfork.org/scripts/566950/MaruMori%20Even%20More%20Gamified.user.js
// @updateURL https://update.greasyfork.org/scripts/566950/MaruMori%20Even%20More%20Gamified.meta.js
// ==/UserScript==

// GENERATED FILE — DO NOT EDIT DIRECTLY.
// Edit files under src/ and run npm run build.
"use strict";
(() => {
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

  // src/config/constants.js
  var BACKGROUND_THEME_IDS = Object.freeze([
    "default",
    "starfield",
    "nebula",
    "grid",
    "gamecenter",
    "shrine",
    "nightview",
    "matrix",
    "void"
  ]);
  var THEME_ALIASES = Object.freeze({
    game_center: "gamecenter",
    gameCenter: "gamecenter",
    game_center_theme: "gamecenter"
  });
  var REMOVED_BACKGROUND_THEME_FALLBACKS = Object.freeze({
    aurora: "starfield",
    rain: "default",
    constellation: "starfield",
    snow: "default"
  });
  var MUSIC_STYLES = Object.freeze(["lofi", "retro"]);
  var MUSIC_STYLE_LABELS = Object.freeze({ lofi: "LO-FI", retro: "RETRO" });
  var PERFORMANCE_PROFILES = Object.freeze(["max", "balanced", "lite"]);
  var PERFORMANCE_PROFILE_LABELS = Object.freeze({
    max: "MAX",
    balanced: "BALANCED",
    lite: "LITE"
  });
  var TIMER_SECONDS_PRESETS = Object.freeze([10, 15, 30, 45, 60, 90]);
  var RECORD_WINDOW_DAYS = 7;
  var MAX_TIMED_XP_MULTIPLIER = 1.75;
  var SPEED_XP_TIERS = Object.freeze(
    [
      {
        minRemainingPct: 0.8,
        segment: 5,
        key: "lightning",
        label: "Lightning",
        multiplier: 1.5
      },
      {
        minRemainingPct: 0.6,
        segment: 4,
        key: "fast",
        label: "Fast",
        multiplier: 1.35
      },
      {
        minRemainingPct: 0.4,
        segment: 3,
        key: "steady",
        label: "Steady",
        multiplier: 1.2
      },
      {
        minRemainingPct: 0.2,
        segment: 2,
        key: "close",
        label: "Close",
        multiplier: 1.1
      },
      {
        minRemainingPct: 0,
        segment: 1,
        key: "barely",
        label: "Barely",
        multiplier: 1.03
      },
      {
        minRemainingPct: -1,
        segment: 0,
        key: "expired",
        label: "Timeout",
        multiplier: 1
      }
    ].map(Object.freeze)
  );
  var TIMER_TIER_CLASSES = Object.freeze(SPEED_XP_TIERS.map((tier) => tier.key));
  var MILESTONES = Object.freeze({
    10: "ON FIRE!",
    25: "UNSTOPPABLE!",
    50: "LEGENDARY!",
    100: "GODLIKE!"
  });

  // src/config/audio-presets.js
  var SOUND_PRESETS = {
    arcade: {
      correct: [
        {
          freq: 440,
          streakScale: 20,
          maxFreq: 1200,
          duration: 0.09,
          volume: 0.12,
          volumeStreakScale: 3e-3,
          maxVolume: 0.22,
          type: "square",
          endFreqScale: 1.04
        },
        {
          freq: 660,
          streakScale: 30,
          maxFreq: 1800,
          duration: 0.12,
          volume: 0.15,
          type: "square",
          delay: 0.04,
          endFreqScale: 1.1,
          every: 5,
          skipLite: true
        },
        {
          freq: 880,
          streakScale: 40,
          maxFreq: 2400,
          duration: 0.15,
          volume: 0.12,
          type: "triangle",
          delay: 0.08,
          every: 10,
          skipLite: true
        },
        {
          freq: 1100,
          streakScale: 50,
          maxFreq: 2600,
          duration: 0.2,
          volume: 0.28,
          type: "sine",
          delay: 0.03,
          chance: 0.07,
          skipLite: true
        }
      ],
      incorrect: [
        { freq: 300, duration: 0.15, volume: 0.25, type: "sawtooth", endFreqScale: 0.7 },
        {
          freq: 180,
          duration: 0.2,
          volume: 0.2,
          type: "sawtooth",
          delay: 0.12,
          skipLite: true
        }
      ],
      wordComplete: [
        {
          freq: 523,
          wordScale: 6,
          maxFreq: 643,
          duration: 0.18,
          volume: 0.22,
          type: "triangle"
        },
        {
          freq: 659,
          wordScale: 6,
          maxFreq: 779,
          duration: 0.18,
          volume: 0.22,
          type: "triangle",
          delay: 0.12,
          skipLite: true
        },
        {
          freq: 784,
          wordScale: 6,
          maxFreq: 904,
          duration: 0.18,
          volume: 0.22,
          type: "triangle",
          delay: 0.24,
          skipLite: true
        }
      ],
      multiplierUp: [
        {
          freqByMultiplier: [330, 440, 550, 660, 880],
          duration: 0.1,
          volume: 0.2,
          type: "square"
        },
        {
          freqByMultiplier: [495, 660, 825, 990, 1320],
          duration: 0.14,
          volume: 0.18,
          type: "square",
          delay: 0.06,
          skipLite: true
        },
        {
          freqByMultiplier: [660, 880, 1100, 1320, 1760],
          duration: 0.18,
          volume: 0.14,
          type: "triangle",
          delay: 0.12,
          skipLite: true
        }
      ],
      comboBreak: [
        { freq: 400, duration: 0.18, volume: 0.22, type: "sawtooth", skipLite: true },
        { freq: 300, duration: 0.18, volume: 0.22, type: "sawtooth", delay: 0.08 },
        {
          freq: 200,
          duration: 0.18,
          volume: 0.22,
          type: "sawtooth",
          delay: 0.16,
          skipLite: true
        }
      ],
      timeout: [
        { freq: 260, duration: 0.16, volume: 0.18, type: "sawtooth" },
        {
          freq: 180,
          duration: 0.18,
          volume: 0.16,
          type: "triangle",
          delay: 0.1,
          skipLite: true
        }
      ],
      sessionComplete: [
        { freq: 523, duration: 0.22, volume: 0.2, type: "triangle" },
        { freq: 659, duration: 0.22, volume: 0.2, type: "triangle", delay: 0.14 },
        { freq: 784, duration: 0.22, volume: 0.2, type: "triangle", delay: 0.28 },
        { freq: 1047, duration: 0.4, volume: 0.25, type: "sine", delay: 0.65, skipLite: true }
      ]
    },
    starfield: {
      correct: [
        {
          freq: 740,
          streakScale: 8,
          maxFreq: 1120,
          duration: 0.1,
          volume: 0.13,
          type: "sine",
          detune: -5
        },
        {
          freq: 1110,
          streakScale: 12,
          maxFreq: 1660,
          duration: 0.16,
          volume: 0.08,
          type: "triangle",
          delay: 0.08,
          detune: 7,
          skipLite: true
        },
        {
          freq: 1480,
          streakScale: 10,
          maxFreq: 2200,
          duration: 0.22,
          volume: 0.045,
          type: "sine",
          delay: 0.16,
          chance: 0.28,
          skipLite: true
        }
      ],
      incorrect: [
        { freq: 220, duration: 0.18, volume: 0.13, type: "triangle" },
        {
          freq: 165,
          duration: 0.2,
          volume: 0.1,
          type: "sine",
          delay: 0.12,
          endFreqScale: 0.82,
          skipLite: true
        }
      ],
      wordComplete: [
        { freq: 587, wordScale: 4, duration: 0.18, volume: 0.13, type: "sine", detune: -4 },
        {
          freq: 880,
          wordScale: 4,
          duration: 0.22,
          volume: 0.1,
          type: "triangle",
          delay: 0.16,
          detune: 5,
          skipLite: true
        },
        {
          freq: 1175,
          wordScale: 4,
          duration: 0.28,
          volume: 0.055,
          type: "sine",
          delay: 0.34,
          skipLite: true
        }
      ],
      multiplierUp: [
        {
          freqByMultiplier: [440, 554, 659, 880, 1175],
          duration: 0.14,
          volume: 0.13,
          type: "sine"
        },
        {
          freqByMultiplier: [880, 1108, 1318, 1760, 2350],
          duration: 0.18,
          volume: 0.08,
          type: "triangle",
          delay: 0.1,
          skipLite: true
        }
      ],
      comboBreak: [{ freq: 185, duration: 0.24, volume: 0.12, type: "triangle" }],
      timeout: [{ freq: 196, duration: 0.22, volume: 0.12, type: "sine" }],
      sessionComplete: [
        { freq: 659, duration: 0.2, volume: 0.12, type: "sine" },
        { freq: 988, duration: 0.28, volume: 0.1, type: "triangle", delay: 0.18 }
      ]
    },
    nebula: {
      correct: [
        {
          freq: 659,
          streakScale: 10,
          maxFreq: 1280,
          duration: 0.12,
          volume: 0.13,
          type: "sine",
          detune: -6
        },
        {
          freq: 987,
          streakScale: 14,
          maxFreq: 1920,
          duration: 0.18,
          volume: 0.09,
          type: "sine",
          delay: 0.09,
          detune: 8,
          skipLite: true
        },
        {
          freq: 1318,
          streakScale: 16,
          maxFreq: 2400,
          duration: 0.2,
          volume: 0.052,
          type: "triangle",
          delay: 0.2,
          chance: 0.34,
          skipLite: true
        }
      ],
      incorrect: [
        { freq: 277, duration: 0.16, volume: 0.15, type: "triangle", endFreqScale: 0.88 },
        {
          freq: 208,
          duration: 0.22,
          volume: 0.1,
          type: "sine",
          delay: 0.1,
          detune: -8,
          skipLite: true
        }
      ],
      wordComplete: [
        { freq: 523, wordScale: 5, duration: 0.18, volume: 0.13, type: "sine" },
        { freq: 784, wordScale: 5, duration: 0.2, volume: 0.11, type: "sine", delay: 0.14 },
        {
          freq: 1175,
          wordScale: 5,
          duration: 0.22,
          volume: 0.08,
          type: "triangle",
          delay: 0.28,
          skipLite: true
        }
      ],
      multiplierUp: [
        {
          freqByMultiplier: [392, 523, 659, 784, 1047],
          duration: 0.16,
          volume: 0.13,
          type: "sine"
        },
        {
          freqByMultiplier: [784, 1047, 1318, 1568, 2093],
          duration: 0.2,
          volume: 0.08,
          type: "triangle",
          delay: 0.12,
          skipLite: true
        }
      ],
      comboBreak: [{ freq: 247, duration: 0.24, volume: 0.12, type: "triangle" }],
      timeout: [{ freq: 220, duration: 0.22, volume: 0.11, type: "sine" }],
      sessionComplete: [
        { freq: 523, duration: 0.2, volume: 0.12, type: "sine" },
        { freq: 784, duration: 0.24, volume: 0.11, type: "sine", delay: 0.18 },
        { freq: 1175, duration: 0.3, volume: 0.09, type: "triangle", delay: 0.38 }
      ]
    },
    grid: {
      correct: [
        {
          freq: 660,
          streakScale: 18,
          maxFreq: 1500,
          duration: 0.07,
          volume: 0.16,
          type: "square",
          endFreqScale: 1.35
        },
        {
          freq: 990,
          streakScale: 24,
          maxFreq: 2100,
          duration: 0.08,
          volume: 0.12,
          type: "triangle",
          delay: 0.04,
          endFreqScale: 1.18,
          skipLite: true
        }
      ],
      incorrect: [
        { freq: 220, duration: 0.12, volume: 0.2, type: "sawtooth", endFreqScale: 0.48 },
        {
          freq: 132,
          duration: 0.18,
          volume: 0.16,
          type: "square",
          delay: 0.08,
          skipLite: true
        }
      ],
      wordComplete: [
        { freq: 440, wordScale: 8, duration: 0.1, volume: 0.16, type: "square" },
        {
          freq: 880,
          wordScale: 8,
          duration: 0.12,
          volume: 0.12,
          type: "triangle",
          delay: 0.08,
          skipLite: true
        }
      ],
      multiplierUp: [
        {
          freqByMultiplier: [392, 523, 659, 784, 1047],
          duration: 0.1,
          volume: 0.16,
          type: "square"
        },
        {
          freqByMultiplier: [784, 1047, 1318, 1568, 2093],
          duration: 0.12,
          volume: 0.11,
          type: "square",
          delay: 0.06,
          skipLite: true
        }
      ],
      comboBreak: [
        { freq: 330, duration: 0.1, volume: 0.18, type: "sawtooth" },
        {
          freq: 165,
          duration: 0.16,
          volume: 0.14,
          type: "square",
          delay: 0.08,
          skipLite: true
        }
      ],
      timeout: [{ freq: 185, duration: 0.18, volume: 0.15, type: "square" }],
      sessionComplete: [
        { freq: 523, duration: 0.12, volume: 0.14, type: "square" },
        { freq: 784, duration: 0.12, volume: 0.13, type: "square", delay: 0.1 },
        { freq: 1047, duration: 0.18, volume: 0.11, type: "triangle", delay: 0.22 }
      ]
    },
    gamecenter: {
      correct: [
        {
          freq: 784,
          streakScale: 18,
          maxFreq: 1600,
          duration: 0.08,
          volume: 0.17,
          type: "square",
          endFreqScale: 1.18
        },
        {
          freq: 1175,
          streakScale: 28,
          maxFreq: 2300,
          duration: 0.08,
          volume: 0.13,
          type: "square",
          delay: 0.05,
          skipLite: true
        },
        {
          freq: 1568,
          streakScale: 28,
          maxFreq: 2700,
          duration: 0.08,
          volume: 0.09,
          type: "square",
          delay: 0.11,
          every: 3,
          skipLite: true
        }
      ],
      incorrect: [
        { freq: 262, duration: 0.13, volume: 0.22, type: "sawtooth" },
        {
          freq: 175,
          duration: 0.19,
          volume: 0.17,
          type: "sawtooth",
          delay: 0.1,
          skipLite: true
        }
      ],
      wordComplete: [
        { freq: 659, wordScale: 7, duration: 0.12, volume: 0.18, type: "square" },
        { freq: 880, wordScale: 7, duration: 0.12, volume: 0.16, type: "square", delay: 0.11 },
        {
          freq: 1318,
          wordScale: 7,
          duration: 0.16,
          volume: 0.12,
          type: "triangle",
          delay: 0.22,
          skipLite: true
        }
      ],
      multiplierUp: [
        {
          freqByMultiplier: [523, 659, 784, 988, 1318],
          duration: 0.09,
          volume: 0.18,
          type: "square"
        },
        {
          freqByMultiplier: [1047, 1318, 1568, 1976, 2637],
          duration: 0.12,
          volume: 0.12,
          type: "square",
          delay: 0.08,
          skipLite: true
        }
      ],
      comboBreak: [
        { freq: 392, duration: 0.14, volume: 0.2, type: "sawtooth" },
        { freq: 262, duration: 0.18, volume: 0.16, type: "sawtooth", delay: 0.09 }
      ],
      timeout: [{ freq: 247, duration: 0.18, volume: 0.16, type: "sawtooth" }],
      sessionComplete: [
        { freq: 659, duration: 0.12, volume: 0.17, type: "square" },
        { freq: 784, duration: 0.12, volume: 0.16, type: "square", delay: 0.12 },
        { freq: 1047, duration: 0.16, volume: 0.14, type: "square", delay: 0.24 },
        {
          freq: 1568,
          duration: 0.22,
          volume: 0.12,
          type: "triangle",
          delay: 0.42,
          skipLite: true
        }
      ]
    },
    shrine: {
      correct: [
        {
          freq: 659,
          streakScale: 5,
          maxFreq: 880,
          duration: 0.16,
          volume: 0.12,
          type: "sine",
          detune: -7
        },
        {
          freq: 988,
          streakScale: 5,
          maxFreq: 1320,
          duration: 0.24,
          volume: 0.08,
          type: "triangle",
          delay: 0.12,
          detune: 6,
          skipLite: true
        }
      ],
      incorrect: [
        { freq: 196, duration: 0.16, volume: 0.12, type: "triangle", endFreqScale: 0.92 },
        { freq: 147, duration: 0.18, volume: 0.09, type: "sine", delay: 0.12, skipLite: true }
      ],
      wordComplete: [
        { freq: 523, wordScale: 3, duration: 0.18, volume: 0.12, type: "sine" },
        {
          freq: 659,
          wordScale: 3,
          duration: 0.22,
          volume: 0.1,
          type: "triangle",
          delay: 0.18,
          skipLite: true
        },
        {
          freq: 1047,
          wordScale: 2,
          duration: 0.34,
          volume: 0.055,
          type: "sine",
          delay: 0.38,
          skipLite: true
        }
      ],
      multiplierUp: [
        {
          freqByMultiplier: [330, 392, 523, 659, 784],
          duration: 0.18,
          volume: 0.12,
          type: "sine"
        },
        {
          freqByMultiplier: [660, 784, 1046, 1318, 1568],
          duration: 0.22,
          volume: 0.08,
          type: "triangle",
          delay: 0.16,
          skipLite: true
        }
      ],
      comboBreak: [{ freq: 174, duration: 0.22, volume: 0.09, type: "triangle" }],
      timeout: [{ freq: 164, duration: 0.24, volume: 0.08, type: "sine" }],
      sessionComplete: [
        { freq: 523, duration: 0.24, volume: 0.1, type: "sine" },
        { freq: 659, duration: 0.28, volume: 0.09, type: "triangle", delay: 0.22 }
      ]
    },
    nightview: {
      correct: [
        {
          freq: 587,
          streakScale: 3,
          maxFreq: 740,
          duration: 0.18,
          volume: 0.09,
          type: "sine",
          detune: -8
        },
        {
          freq: 784,
          streakScale: 4,
          maxFreq: 988,
          duration: 0.28,
          volume: 0.052,
          type: "triangle",
          delay: 0.14,
          detune: 5,
          skipLite: true
        }
      ],
      incorrect: [
        { freq: 185, duration: 0.18, volume: 0.085, type: "triangle", endFreqScale: 0.9 },
        { freq: 139, duration: 0.26, volume: 0.052, type: "sine", delay: 0.16, skipLite: true }
      ],
      wordComplete: [
        { freq: 440, wordScale: 2, duration: 0.24, volume: 0.085, type: "sine" },
        {
          freq: 659,
          wordScale: 2,
          duration: 0.3,
          volume: 0.062,
          type: "triangle",
          delay: 0.2,
          skipLite: true
        },
        {
          freq: 880,
          wordScale: 2,
          duration: 0.42,
          volume: 0.038,
          type: "sine",
          delay: 0.46,
          skipLite: true
        }
      ],
      multiplierUp: [
        {
          freqByMultiplier: [330, 392, 440, 523, 659],
          duration: 0.2,
          volume: 0.08,
          type: "sine"
        },
        {
          freqByMultiplier: [494, 587, 659, 784, 988],
          duration: 0.32,
          volume: 0.046,
          type: "triangle",
          delay: 0.18,
          skipLite: true
        }
      ],
      comboBreak: [{ freq: 164, duration: 0.24, volume: 0.06, type: "triangle" }],
      timeout: [{ freq: 147, duration: 0.28, volume: 0.055, type: "sine" }],
      sessionComplete: [
        { freq: 440, duration: 0.26, volume: 0.074, type: "sine" },
        { freq: 587, duration: 0.34, volume: 0.06, type: "triangle", delay: 0.24 },
        { freq: 880, duration: 0.56, volume: 0.04, type: "sine", delay: 0.58 }
      ]
    },
    matrix: {
      correct: [
        {
          freq: 880,
          streakScale: 12,
          maxFreq: 1480,
          duration: 0.055,
          volume: 0.13,
          type: "square",
          endFreqScale: 0.62
        },
        {
          freq: 1320,
          streakScale: 18,
          maxFreq: 2200,
          duration: 0.06,
          volume: 0.09,
          type: "square",
          delay: 0.045,
          endFreqScale: 1.42,
          skipLite: true
        }
      ],
      incorrect: [
        { freq: 180, duration: 0.09, volume: 0.16, type: "sawtooth", endFreqScale: 0.42 },
        {
          freq: 90,
          duration: 0.12,
          volume: 0.11,
          type: "square",
          delay: 0.08,
          endFreqScale: 1.8,
          skipLite: true
        }
      ],
      wordComplete: [
        { freq: 660, wordScale: 6, duration: 0.08, volume: 0.13, type: "square" },
        {
          freq: 990,
          wordScale: 6,
          duration: 0.08,
          volume: 0.1,
          type: "square",
          delay: 0.06,
          skipLite: true
        }
      ],
      multiplierUp: [
        {
          freqByMultiplier: [440, 660, 880, 990, 1320],
          duration: 0.075,
          volume: 0.13,
          type: "square"
        },
        {
          freqByMultiplier: [880, 1320, 1760, 1980, 2640],
          duration: 0.08,
          volume: 0.09,
          type: "square",
          delay: 0.06,
          skipLite: true
        }
      ],
      comboBreak: [
        { freq: 220, duration: 0.08, volume: 0.14, type: "sawtooth" },
        { freq: 110, duration: 0.12, volume: 0.1, type: "square", delay: 0.06 }
      ],
      timeout: [{ freq: 120, duration: 0.12, volume: 0.12, type: "square" }],
      sessionComplete: [
        { freq: 660, duration: 0.08, volume: 0.11, type: "square" },
        { freq: 990, duration: 0.08, volume: 0.1, type: "square", delay: 0.08 },
        { freq: 1320, duration: 0.1, volume: 0.08, type: "square", delay: 0.16 }
      ]
    },
    void: {
      correct: [{ freq: 620, duration: 0.06, volume: 0.08, type: "sine", detune: -12 }],
      incorrect: [{ freq: 155, duration: 0.08, volume: 0.07, type: "triangle" }],
      wordComplete: [{ freq: 440, duration: 0.08, volume: 0.07, type: "sine" }],
      multiplierUp: [
        {
          freqByMultiplier: [330, 392, 440, 494, 587],
          duration: 0.08,
          volume: 0.07,
          type: "sine"
        }
      ],
      comboBreak: [{ freq: 130, duration: 0.1, volume: 0.06, type: "triangle" }],
      timeout: [{ freq: 110, duration: 0.1, volume: 0.06, type: "triangle" }],
      sessionComplete: [{ freq: 523, duration: 0.12, volume: 0.07, type: "sine" }]
    }
  };
  var MUSIC_PRESETS = {
    arcadeLofi: { scheduler: "style", volumeScale: 1 },
    starfieldAmbient: {
      scheduler: "ambient",
      bpm: 48,
      root: 196,
      volumeScale: 0.58,
      type: "sine",
      cutoff: 900,
      chords: [
        [-8, 0, 4],
        [-10, 2, 5],
        [-9, 1, 4],
        [-12, 0, 5]
      ],
      melody: [null, 7, null, null, 5, null, null, 4]
    },
    nebulaAmbient: {
      scheduler: "ambient",
      bpm: 56,
      root: 174.61,
      volumeScale: 0.68,
      type: "triangle",
      cutoff: 1250,
      chords: [
        [-8, 2, 5],
        [-10, 1, 4],
        [-9, 3, 6],
        [-12, 0, 5]
      ],
      melody: [5, null, 7, null, null, 4, null, 6]
    },
    gridPulse: {
      scheduler: "pulse",
      bpm: 116,
      root: 110,
      volumeScale: 0.78,
      type: "square",
      cutoff: 1800,
      pattern: [0, null, 4, 7, null, 4, 11, null, 7, null, 4, 0, null, 12, 11, 7]
    },
    gameCenterChiptune: {
      scheduler: "chiptune",
      bpm: 132,
      root: 130.81,
      volumeScale: 0.92,
      type: "square",
      cutoff: 2300,
      pattern: [0, 2, 4, 7, null, 7, 4, 2, 5, 7, 9, 12, null, 9, 7, 4]
    },
    shrineBells: {
      scheduler: "bells",
      bpm: 62,
      root: 220,
      volumeScale: 0.55,
      type: "sine",
      cutoff: 1450,
      pattern: [0, null, null, 2, null, 4, null, null, 7, null, 5, null, null, 4, null, null]
    },
    nightviewMinyo: {
      scheduler: "minyo",
      bpm: 58,
      root: 220,
      volumeScale: 0.5,
      type: "sine",
      cutoff: 1180,
      drone: [-12, 0],
      pattern: [0, null, 2, null, 4, null, 7, 5, null, 4, 2, null, 0, null, -3, null],
      reply: [null, null, 7, null, 5, null, 4, null, null, 2, null, 0]
    },
    matrixPulse: {
      scheduler: "pulse",
      bpm: 94,
      root: 82.41,
      volumeScale: 0.58,
      type: "square",
      cutoff: 1250,
      glitch: true,
      pattern: [0, null, 7, null, 0, 11, null, 7, null, 0, null, 4, 11, null, 7, null]
    },
    voidSilence: {
      scheduler: "void",
      root: 110,
      volumeScale: 0.2,
      type: "sine",
      cutoff: 360,
      duration: 5.2
    }
  };
  var AUDIO_WARN_THROTTLE_MS = 5e3;
  var MUSIC_PROGRESSIONS = [
    [
      [220, 261.63, 329.63],
      [174.61, 220, 261.63],
      [196, 246.94, 293.66],
      [164.81, 207.65, 246.94]
    ],
    [
      [196, 246.94, 293.66],
      [146.83, 196, 246.94],
      [164.81, 207.65, 261.63],
      [174.61, 220, 261.63]
    ],
    [
      [164.81, 207.65, 246.94],
      [196, 246.94, 293.66],
      [146.83, 185, 220],
      [174.61, 220, 261.63]
    ],
    [
      [174.61, 220, 261.63],
      [164.81, 207.65, 246.94],
      [130.81, 164.81, 196],
      [146.83, 185, 220]
    ]
  ];
  var LOFI_MELODIES = [
    [null, 4, null, 2, null, null, 5, null, 4, null, null, 1, null, 2, null, null],
    [2, null, null, 4, null, 5, null, null, null, 4, null, 2, null, null, 1, null],
    [null, null, 5, null, 4, null, null, 2, null, 1, null, null, 2, null, null, 4],
    [4, null, 2, null, null, 1, null, null, 5, null, null, 4, null, 2, null, null]
  ];
  var RETRO_MELODIES = [
    [0, 2, 4, null, 7, 4, 2, null, 0, 2, 5, null, 4, 2, 0, null],
    [4, null, 2, 0, 2, null, 5, 4, 7, null, 5, 4, 2, null, 0, null]
  ];
  var NOTE_RATIOS = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8, 2];

  // src/config/defaults.js
  var SETTINGS_VERSION = 2;
  var DEFAULT_SETTINGS = Object.freeze({
    settingsVersion: SETTINGS_VERSION,
    sfxEnabled: true,
    visualsEnabled: true,
    hudEnabled: true,
    shakeEnabled: true,
    floatEnabled: true,
    flashEnabled: true,
    failureFlashEnabled: true,
    crtEnabled: true,
    timerEnabled: true,
    timerSeconds: 15,
    timedXpBonusEnabled: true,
    timeoutFailureEnabled: false,
    fontChallengeEnabled: false,
    performanceProfile: "balanced",
    musicEnabled: false,
    musicStyle: "lofi",
    musicVolume: 0.16,
    backgroundTheme: "default",
    pinnedBackgroundTheme: "default",
    volume: 0.5,
    hudPosition: null,
    hudCollapsed: false
  });
  var DEFAULTS = DEFAULT_SETTINGS;
  var BOOLEAN_SETTING_KEYS = Object.freeze([
    "sfxEnabled",
    "visualsEnabled",
    "hudEnabled",
    "shakeEnabled",
    "floatEnabled",
    "flashEnabled",
    "failureFlashEnabled",
    "crtEnabled",
    "timerEnabled",
    "timedXpBonusEnabled",
    "timeoutFailureEnabled",
    "fontChallengeEnabled",
    "musicEnabled",
    "hudCollapsed"
  ]);

  // src/config/theme-presets.js
  function mergeEventPreset(preset = {}, eventType = "default") {
    const source = preset && typeof preset === "object" ? preset : {};
    const { base = {}, events = {}, ...root } = source;
    return {
      ...base,
      ...root,
      ...events.default || {},
      ...events[eventType] || {}
    };
  }

  // src/config/themes.js
  var THEME_DEFINITIONS = {
    default: {
      id: "default",
      label: "Default",
      identity: "Modern arcade",
      mood: "Fast, energetic, satisfying",
      colors: {
        accent: "#ff9900",
        secondary: "#77ccff",
        success: "#77ff77",
        failure: "#ff5555",
        hudGlow: "#ff9900",
        flash: "rgba(100,255,150,0.18)",
        failureFlash: "rgba(255,70,90,0.18)",
        notification: "#ffe066",
        timerFast: "#ffe066",
        timerMedium: "#62d7ff",
        timerLow: "#ff9b42",
        timerCritical: "#ff5252",
        floatingText: "#ffe066",
        floatingShadow: "0 2px 6px rgba(0,0,0,0.8)",
        progress: "linear-gradient(90deg, #00cc88, #00ffcc)",
        button: "#ff9900",
        buttonSoft: "rgba(255,153,0,0.1)",
        banner: "#ffffff",
        bannerGlow: "#ff9900"
      },
      presets: {
        sound: "arcade",
        floatingText: "arcadeClassic",
        particles: "arcadeBurst",
        combo: "arcadePop",
        celebration: "arcadePop",
        music: "arcadeLofi"
      },
      intensity: { particles: 1, flash: 1, shake: 1, sound: 1, celebration: 1 },
      motion: { shakeScale: 1, effectIntensity: 1, allowIdle: true },
      background: { renderer: "default", allowCanvasEffects: false, shootingStars: false }
    },
    starfield: {
      id: "starfield",
      label: "Starfield",
      identity: "Space exploration",
      mood: "Calm, futuristic, floating",
      colors: {
        accent: "#7dd3fc",
        secondary: "#e0f2fe",
        success: "#86efac",
        failure: "#fb7185",
        hudGlow: "#7dd3fc",
        flash: "rgba(125,211,252,0.2)",
        failureFlash: "rgba(251,113,133,0.14)",
        notification: "#dbeafe",
        timerFast: "#f8fafc",
        timerMedium: "#7dd3fc",
        timerLow: "#38bdf8",
        timerCritical: "#fb7185",
        floatingText: "#dbeafe",
        floatingShadow: "0 0 12px rgba(125,211,252,0.75)",
        progress: "linear-gradient(90deg, #38bdf8, #e0f2fe)",
        button: "#7dd3fc",
        buttonSoft: "rgba(125,211,252,0.12)",
        banner: "#f8fafc",
        bannerGlow: "#38bdf8"
      },
      presets: {
        sound: "starfield",
        floatingText: "softBlue",
        particles: "starSparkles",
        combo: "constellation",
        celebration: "starfieldOrbit",
        music: "starfieldAmbient"
      },
      intensity: { particles: 0.72, flash: 0.72, shake: 0.48, sound: 0.86, celebration: 0.72 },
      motion: { shakeScale: 0.35, effectIntensity: 0.78, allowIdle: true },
      background: { renderer: "starfield", allowCanvasEffects: true, shootingStars: true }
    },
    nebula: {
      id: "nebula",
      label: "Nebula",
      identity: "Cosmic magic",
      mood: "Mystical, celestial, beautiful",
      colors: {
        accent: "#f0abfc",
        secondary: "#93c5fd",
        success: "#c4b5fd",
        failure: "#fb7185",
        hudGlow: "#d946ef",
        flash: "rgba(216,180,254,0.2)",
        failureFlash: "rgba(251,113,133,0.14)",
        notification: "#f5d0fe",
        timerFast: "#f0abfc",
        timerMedium: "#93c5fd",
        timerLow: "#f59e0b",
        timerCritical: "#fb7185",
        floatingText: "#f5d0fe",
        floatingShadow: "0 0 14px rgba(217,70,239,0.72)",
        progress: "linear-gradient(90deg, #a78bfa, #f0abfc, #93c5fd)",
        button: "#d946ef",
        buttonSoft: "rgba(217,70,239,0.12)",
        banner: "#f5d0fe",
        bannerGlow: "#a855f7"
      },
      presets: {
        sound: "nebula",
        floatingText: "cosmicGlow",
        particles: "cosmicDust",
        combo: "nebulaWave",
        celebration: "nebulaBloom",
        music: "nebulaAmbient"
      },
      intensity: { particles: 0.92, flash: 0.82, shake: 0.72, sound: 0.9, celebration: 0.95 },
      motion: { shakeScale: 0.55, effectIntensity: 0.95, allowIdle: true },
      background: { renderer: "nebula", allowCanvasEffects: true, shootingStars: false }
    },
    grid: {
      id: "grid",
      label: "Grid",
      identity: "Cyberpunk / Tron",
      mood: "Fast digital combat",
      colors: {
        accent: "#00e5ff",
        secondary: "#38bdf8",
        success: "#22d3ee",
        failure: "#ff477e",
        hudGlow: "#00e5ff",
        flash: "rgba(0,229,255,0.2)",
        failureFlash: "rgba(255,71,126,0.16)",
        notification: "#67e8f9",
        timerFast: "#00e5ff",
        timerMedium: "#2563eb",
        timerLow: "#f97316",
        timerCritical: "#ff477e",
        floatingText: "#67e8f9",
        floatingShadow: "0 0 12px rgba(0,229,255,0.82)",
        progress: "linear-gradient(90deg, #06b6d4, #2563eb)",
        button: "#00e5ff",
        buttonSoft: "rgba(0,229,255,0.11)",
        banner: "#e0faff",
        bannerGlow: "#00e5ff"
      },
      presets: {
        sound: "grid",
        floatingText: "electricCyan",
        particles: "pixelFragments",
        combo: "scanPulse",
        celebration: "gridScanBurst",
        music: "gridPulse"
      },
      intensity: { particles: 1.08, flash: 0.96, shake: 1, sound: 1, celebration: 1.08 },
      motion: { shakeScale: 0.9, effectIntensity: 1.05, allowIdle: true },
      background: { renderer: "grid", allowCanvasEffects: true, shootingStars: false }
    },
    gamecenter: {
      id: "gamecenter",
      label: "Game Center",
      identity: "1980s Japanese arcade",
      mood: "Bright, nostalgic, energetic",
      colors: {
        accent: "#ff2bd6",
        secondary: "#00d9ff",
        success: "#fff05a",
        failure: "#ff4b4b",
        hudGlow: "#ff2bd6",
        flash: "rgba(255,240,90,0.2)",
        failureFlash: "rgba(255,75,75,0.16)",
        notification: "#fff05a",
        timerFast: "#fff05a",
        timerMedium: "#00d9ff",
        timerLow: "#ff8a00",
        timerCritical: "#ff4b4b",
        floatingText: "#fff05a",
        floatingShadow: "0 0 12px rgba(255,43,214,0.78)",
        progress: "linear-gradient(90deg, #ff2bd6, #fff05a, #00d9ff)",
        button: "#ff2bd6",
        buttonSoft: "rgba(255,43,214,0.12)",
        banner: "#fff05a",
        bannerGlow: "#ff2bd6"
      },
      presets: {
        sound: "gamecenter",
        floatingText: "pixelScore",
        particles: "confettiPixels",
        combo: "arcadeMarquee",
        celebration: "gameCenterJackpot",
        music: "gameCenterChiptune"
      },
      intensity: { particles: 1.18, flash: 1, shake: 1.05, sound: 1.04, celebration: 1.22 },
      motion: { shakeScale: 1.15, effectIntensity: 1.15, allowIdle: true },
      background: { renderer: "gamecenter", allowCanvasEffects: true, shootingStars: false }
    },
    shrine: {
      id: "shrine",
      label: "Shrine",
      identity: "Traditional Japan",
      mood: "Peaceful, spiritual, elegant",
      colors: {
        accent: "#f6d36b",
        secondary: "#fff7d6",
        success: "#facc6b",
        failure: "#dc6b5a",
        hudGlow: "#f6d36b",
        flash: "rgba(246,211,107,0.18)",
        failureFlash: "rgba(220,107,90,0.12)",
        notification: "#fff2b8",
        timerFast: "#fff2b8",
        timerMedium: "#f6d36b",
        timerLow: "#d97706",
        timerCritical: "#dc6b5a",
        floatingText: "#fff2b8",
        floatingShadow: "0 0 10px rgba(246,211,107,0.58)",
        progress: "linear-gradient(90deg, #b7791f, #f6d36b, #fff7d6)",
        button: "#f6d36b",
        buttonSoft: "rgba(246,211,107,0.1)",
        banner: "#fff7d6",
        bannerGlow: "#f6d36b"
      },
      presets: {
        sound: "shrine",
        floatingText: "goldLeaf",
        particles: "sakuraPetals",
        combo: "lanternGlow",
        celebration: "shrineDrift",
        music: "shrineBells"
      },
      intensity: { particles: 0.58, flash: 0.52, shake: 0.42, sound: 0.74, celebration: 0.56 },
      motion: { shakeScale: 0.35, effectIntensity: 0.68, allowIdle: true },
      background: { renderer: "shrine", allowCanvasEffects: true, shootingStars: false }
    },
    nightview: {
      id: "nightview",
      label: "Night View",
      identity: "Moonlit Japanese folk festival",
      mood: "Soothing, lantern-lit, nostalgic",
      colors: {
        accent: "#f8d27a",
        secondary: "#9cc8ff",
        success: "#bfe8ff",
        failure: "#e46f75",
        hudGlow: "#9cc8ff",
        flash: "rgba(156,200,255,0.18)",
        failureFlash: "rgba(228,111,117,0.12)",
        notification: "#f8d27a",
        timerFast: "#f8f2c8",
        timerMedium: "#9cc8ff",
        timerLow: "#f0b35d",
        timerCritical: "#e46f75",
        floatingText: "#dcecff",
        floatingShadow: "0 0 13px rgba(156,200,255,0.72)",
        progress: "linear-gradient(90deg, #274a7a, #9cc8ff, #f8d27a)",
        button: "#f8d27a",
        buttonSoft: "rgba(248,210,122,0.11)",
        banner: "#f8f2c8",
        bannerGlow: "#8bbcff"
      },
      presets: {
        sound: "nightview",
        floatingText: "moonlitSilver",
        particles: "fireflyWisps",
        combo: "moonlitGate",
        celebration: "nightviewGlow",
        music: "nightviewMinyo"
      },
      intensity: { particles: 0.64, flash: 0.58, shake: 0.34, sound: 0.72, celebration: 0.62 },
      motion: { shakeScale: 0.28, effectIntensity: 0.7, allowIdle: true },
      background: { renderer: "nightview", allowCanvasEffects: true, shootingStars: false }
    },
    matrix: {
      id: "matrix",
      label: "Matrix",
      identity: "Cyber infiltration",
      mood: "Hacking into a system",
      colors: {
        accent: "#00ff88",
        secondary: "#00cc66",
        success: "#4ade80",
        failure: "#ef4444",
        hudGlow: "#00ff88",
        flash: "rgba(0,255,136,0.2)",
        failureFlash: "rgba(239,68,68,0.13)",
        notification: "#00ff88",
        timerFast: "#4ade80",
        timerMedium: "#22c55e",
        timerLow: "#a3e635",
        timerCritical: "#ef4444",
        floatingText: "#00ff88",
        floatingShadow: "0 0 12px rgba(0,255,136,0.82)",
        progress: "linear-gradient(90deg, #007a3d, #00ff88)",
        button: "#00ff88",
        buttonSoft: "rgba(0,255,136,0.1)",
        banner: "#bbf7d0",
        bannerGlow: "#00ff88"
      },
      presets: {
        sound: "matrix",
        floatingText: "terminalGreen",
        particles: "matrixCode",
        combo: "glitch",
        celebration: "matrixGlitch",
        music: "matrixPulse"
      },
      intensity: { particles: 0.86, flash: 0.74, shake: 0.74, sound: 0.92, celebration: 0.82 },
      motion: { shakeScale: 0.6, effectIntensity: 0.82, allowIdle: true },
      background: { renderer: "matrix", allowCanvasEffects: true, shootingStars: false }
    },
    void: {
      id: "void",
      label: "Void",
      identity: "Minimalism",
      mood: "Silent focus",
      colors: {
        accent: "#e5e7eb",
        secondary: "#9ca3af",
        success: "#f9fafb",
        failure: "#9ca3af",
        hudGlow: "#e5e7eb",
        flash: "rgba(229,231,235,0.08)",
        failureFlash: "rgba(156,163,175,0.08)",
        notification: "#f9fafb",
        timerFast: "#f9fafb",
        timerMedium: "#d1d5db",
        timerLow: "#9ca3af",
        timerCritical: "#6b7280",
        floatingText: "#f9fafb",
        floatingShadow: "0 2px 8px rgba(0,0,0,0.5)",
        progress: "linear-gradient(90deg, #6b7280, #f9fafb)",
        button: "#e5e7eb",
        buttonSoft: "rgba(229,231,235,0.08)",
        banner: "#f9fafb",
        bannerGlow: "#9ca3af"
      },
      presets: {
        sound: "void",
        floatingText: "voidMinimal",
        particles: "voidDust",
        combo: "minimal",
        celebration: "voidPulse",
        music: "voidSilence"
      },
      intensity: { particles: 0.24, flash: 0.22, shake: 0.12, sound: 0.38, celebration: 0.25 },
      motion: { shakeScale: 0.1, effectIntensity: 0.22, allowIdle: false },
      background: { renderer: "void", allowCanvasEffects: false, shootingStars: false }
    }
  };
  var THEME_PRESENTATION_STYLES = {
    default: {
      panelBg: "rgba(5,7,16,0.86)",
      panelBorder: "rgba(255,153,0,0.34)",
      panelText: "#f8fafc",
      panelMuted: "rgba(226,232,240,0.54)",
      panelDivider: "rgba(255,255,255,0.13)",
      panelShadow: "0 0 0 1px rgba(255,153,0,0.08), 0 10px 28px rgba(0,0,0,0.36)",
      controlBg: "rgba(255,153,0,0.08)",
      controlBorder: "rgba(255,153,0,0.32)",
      fieldBg: "rgba(2,5,14,0.72)",
      fieldBorder: "rgba(119,204,255,0.62)",
      fieldGlow: "rgba(0,220,255,0.18)",
      counterShadow: "0 0 8px rgba(255,224,102,0.58)",
      scanlineOpacity: "1",
      scanlineColor: "rgba(0,0,0,0.18)",
      floatLabelBg: "rgba(255,153,0,0.14)",
      floatLabelColor: "#fff6cc"
    },
    starfield: {
      panelBg: "rgba(3,10,27,0.78)",
      panelBorder: "rgba(125,211,252,0.36)",
      panelMuted: "rgba(219,234,254,0.52)",
      panelShadow: "0 0 0 1px rgba(125,211,252,0.08), 0 0 24px rgba(56,189,248,0.14)",
      controlBg: "rgba(125,211,252,0.09)",
      controlBorder: "rgba(125,211,252,0.34)",
      fieldBg: "rgba(1,7,23,0.74)",
      fieldBorder: "rgba(224,242,254,0.54)",
      fieldGlow: "rgba(125,211,252,0.22)",
      counterShadow: "0 0 10px rgba(125,211,252,0.62)",
      scanlineOpacity: "0.55",
      floatLabelBg: "rgba(56,189,248,0.16)",
      floatLabelColor: "#f8fafc"
    },
    nebula: {
      panelBg: "rgba(16,6,32,0.78)",
      panelBorder: "rgba(240,171,252,0.36)",
      panelMuted: "rgba(245,208,254,0.5)",
      panelShadow: "0 0 0 1px rgba(217,70,239,0.09), 0 0 30px rgba(147,51,234,0.16)",
      controlBg: "rgba(217,70,239,0.1)",
      controlBorder: "rgba(240,171,252,0.32)",
      fieldBg: "rgba(10,5,24,0.72)",
      fieldBorder: "rgba(147,197,253,0.5)",
      fieldGlow: "rgba(217,70,239,0.24)",
      counterShadow: "0 0 11px rgba(240,171,252,0.58)",
      scanlineOpacity: "0.6",
      floatLabelBg: "rgba(217,70,239,0.16)",
      floatLabelColor: "#f5d0fe"
    },
    grid: {
      panelBg: "rgba(0,10,20,0.82)",
      panelBorder: "rgba(0,229,255,0.44)",
      panelMuted: "rgba(103,232,249,0.54)",
      panelShadow: "0 0 0 1px rgba(0,229,255,0.1), 0 0 26px rgba(0,229,255,0.18)",
      controlBg: "rgba(0,229,255,0.09)",
      controlBorder: "rgba(0,229,255,0.38)",
      fieldBg: "rgba(0,8,18,0.78)",
      fieldBorder: "rgba(0,229,255,0.62)",
      fieldGlow: "rgba(0,229,255,0.24)",
      counterShadow: "0 0 9px rgba(0,229,255,0.65)",
      scanlineOpacity: "0.78",
      floatLabelBg: "rgba(0,229,255,0.14)",
      floatLabelColor: "#e0faff"
    },
    gamecenter: {
      panelBg: "rgba(13,7,28,0.8)",
      panelBorder: "rgba(255,43,214,0.42)",
      panelMuted: "rgba(255,240,90,0.5)",
      panelShadow: "0 0 0 1px rgba(255,43,214,0.09), 0 0 30px rgba(255,43,214,0.16)",
      controlBg: "rgba(255,43,214,0.1)",
      controlBorder: "rgba(255,43,214,0.36)",
      fieldBg: "rgba(12,5,22,0.76)",
      fieldBorder: "rgba(0,217,255,0.58)",
      fieldGlow: "rgba(255,43,214,0.24)",
      counterShadow: "0 0 10px rgba(255,240,90,0.68)",
      scanlineOpacity: "0.82",
      floatLabelBg: "rgba(255,43,214,0.18)",
      floatLabelColor: "#fff05a"
    },
    shrine: {
      panelBg: "rgba(28,16,8,0.66)",
      panelBorder: "rgba(246,211,107,0.4)",
      panelMuted: "rgba(255,247,214,0.54)",
      panelShadow: "0 0 0 1px rgba(246,211,107,0.08), 0 12px 32px rgba(35,18,4,0.32)",
      controlBg: "rgba(246,211,107,0.09)",
      controlBorder: "rgba(246,211,107,0.34)",
      fieldBg: "rgba(20,12,7,0.62)",
      fieldBorder: "rgba(255,247,214,0.5)",
      fieldGlow: "rgba(246,211,107,0.2)",
      counterShadow: "0 0 9px rgba(246,211,107,0.58)",
      scanlineOpacity: "0.34",
      scanlineColor: "rgba(41,20,4,0.16)",
      floatLabelBg: "rgba(246,211,107,0.14)",
      floatLabelColor: "#fff7d6"
    },
    nightview: {
      panelBg: "rgba(3,9,20,0.74)",
      panelBorder: "rgba(156,200,255,0.34)",
      panelMuted: "rgba(220,235,255,0.52)",
      panelShadow: "0 0 0 1px rgba(156,200,255,0.08), 0 12px 32px rgba(2,7,18,0.38)",
      controlBg: "rgba(248,210,122,0.08)",
      controlBorder: "rgba(156,200,255,0.28)",
      fieldBg: "rgba(3,8,18,0.72)",
      fieldBorder: "rgba(156,200,255,0.48)",
      fieldGlow: "rgba(129,181,255,0.2)",
      counterShadow: "0 0 10px rgba(248,210,122,0.48)",
      scanlineOpacity: "0.38",
      scanlineColor: "rgba(3,12,30,0.2)",
      floatLabelBg: "rgba(156,200,255,0.13)",
      floatLabelColor: "#f8f2c8"
    },
    matrix: {
      panelBg: "rgba(0,9,5,0.84)",
      panelBorder: "rgba(0,255,136,0.38)",
      panelMuted: "rgba(0,255,136,0.48)",
      panelShadow: "0 0 0 1px rgba(0,255,136,0.08), 0 0 24px rgba(0,255,136,0.12)",
      controlBg: "rgba(0,255,136,0.08)",
      controlBorder: "rgba(0,255,136,0.34)",
      fieldBg: "rgba(0,6,3,0.78)",
      fieldBorder: "rgba(0,255,136,0.54)",
      fieldGlow: "rgba(0,255,136,0.18)",
      counterShadow: "0 0 9px rgba(0,255,136,0.62)",
      scanlineOpacity: "0.68",
      scanlineColor: "rgba(0,20,10,0.22)",
      floatLabelBg: "rgba(0,255,136,0.12)",
      floatLabelColor: "#bbf7d0"
    },
    void: {
      panelBg: "rgba(4,5,7,0.72)",
      panelBorder: "rgba(229,231,235,0.18)",
      panelMuted: "rgba(209,213,219,0.42)",
      panelDivider: "rgba(229,231,235,0.08)",
      panelShadow: "0 8px 22px rgba(0,0,0,0.28)",
      controlBg: "rgba(229,231,235,0.04)",
      controlBorder: "rgba(229,231,235,0.16)",
      fieldBg: "rgba(3,4,6,0.68)",
      fieldBorder: "rgba(156,163,175,0.22)",
      fieldGlow: "rgba(229,231,235,0.06)",
      counterShadow: "0 0 6px rgba(229,231,235,0.28)",
      scanlineOpacity: "0.18",
      scanlineColor: "rgba(229,231,235,0.08)",
      floatLabelBg: "rgba(229,231,235,0.08)",
      floatLabelColor: "#e5e7eb"
    }
  };
  var THEME_ALIASES2 = {
    game_center: "gamecenter",
    gameCenter: "gamecenter",
    game_center_theme: "gamecenter"
  };
  var BACKGROUND_THEMES = Object.freeze(Object.keys(THEME_DEFINITIONS));
  var CANVAS_BACKGROUND_THEMES = Object.freeze(
    BACKGROUND_THEMES.filter((theme) => THEME_DEFINITIONS[theme].background.allowCanvasEffects)
  );
  var SHOOTING_STAR_THEMES = Object.freeze(
    BACKGROUND_THEMES.filter((theme) => THEME_DEFINITIONS[theme].background.shootingStars)
  );
  var MUSIC_STYLES2 = ["lofi", "retro"];
  var MUSIC_STYLE_LABELS2 = { lofi: "LO-FI", retro: "RETRO" };
  var THEME_MUSIC_MODE_LABELS = {
    arcadeLofi: "STYLE",
    starfieldAmbient: "AMBIENT",
    nebulaAmbient: "AMBIENT",
    gridPulse: "PULSE",
    gameCenterChiptune: "CHIPTUNE",
    shrineBells: "BELLS",
    nightviewMinyo: "MINYO",
    matrixPulse: "PULSE",
    voidSilence: "FOCUS"
  };
  var PERFORMANCE_PROFILES2 = ["max", "balanced", "lite"];
  var PERFORMANCE_PROFILE_LABELS2 = {
    max: "MAX",
    balanced: "BALANCED",
    lite: "LITE"
  };
  var TIMER_SECONDS_PRESETS2 = [10, 15, 30, 45, 60, 90];
  var BACKGROUND_THEME_LABELS = Object.freeze(
    Object.fromEntries(
      BACKGROUND_THEMES.map((theme) => [theme, THEME_DEFINITIONS[theme].label.toUpperCase()])
    )
  );
  var REMOVED_BACKGROUND_THEME_FALLBACKS2 = {
    aurora: "starfield",
    rain: "default",
    constellation: "starfield",
    snow: "default"
  };
  var SHRINE_IMAGE_URL = "https://raw.githubusercontent.com/Mikhail2577/marumori-userscripts/f997afc94074989ec324590d7df08960a2633f52/even-more-gamified/assets/shrine-garden.jpg";
  var NIGHTVIEW_IMAGE_URL = "https://raw.githubusercontent.com/Mikhail2577/marumori-userscripts/f997afc94074989ec324590d7df08960a2633f52/even-more-gamified/assets/nightview.png";
  var FLOATING_TEXT_PRESETS = {
    arcadeClassic: {
      base: { color: "var(--mm-theme-floating-text)", shadow: "var(--mm-theme-floating-shadow)" },
      events: {
        incorrect: { color: "var(--mm-theme-failure)", label: "MISS" },
        wordComplete: { color: "var(--mm-theme-success)", fontSize: "16px", label: "CLEAR" },
        milestone: { color: "var(--mm-theme-banner)", fontSize: "20px", label: "BONUS" },
        rewind: { color: "var(--mm-theme-secondary)" }
      }
    },
    softBlue: {
      base: {
        color: "#dbeafe",
        shadow: "0 0 12px rgba(125,211,252,0.78)",
        motion: "drift"
      },
      events: {
        correct: { label: "ORBIT" },
        incorrect: {
          color: "#fb7185",
          shadow: "0 0 9px rgba(251,113,133,0.48)",
          label: "DRIFT"
        },
        wordComplete: { color: "#f8fafc", fontSize: "16px", label: "CHARTED" },
        multiplierUp: { label: "ALIGN" },
        milestone: { color: "#f8fafc", fontSize: "20px", label: "STELLAR" }
      }
    },
    cosmicGlow: {
      base: {
        color: "#f5d0fe",
        shadow: "0 0 14px rgba(217,70,239,0.75)",
        motion: "wave"
      },
      events: {
        correct: { label: "AURA" },
        incorrect: { color: "#fb7185", label: "RIFT" },
        wordComplete: { color: "#c4b5fd", fontSize: "16px", label: "BLOOM" },
        multiplierUp: { label: "NOVA" },
        milestone: { color: "#f0abfc", fontSize: "20px", label: "ASCEND" }
      }
    },
    electricCyan: {
      base: {
        color: "#67e8f9",
        shadow: "0 0 12px rgba(0,229,255,0.82)",
        motion: "snap"
      },
      events: {
        correct: { label: "SYNC" },
        incorrect: { color: "#ff477e", label: "FAULT" },
        wordComplete: { color: "#22d3ee", fontSize: "16px", label: "ROUTE" },
        multiplierUp: { label: "BOOST" },
        milestone: { color: "#e0faff", fontSize: "20px", label: "OVERCLOCK" }
      }
    },
    pixelScore: {
      base: {
        color: "#fff05a",
        shadow: "0 0 13px rgba(255,43,214,0.75)",
        motion: "snap"
      },
      events: {
        correct: { label: "BONUS" },
        incorrect: { color: "#ff4b4b", label: "MISS" },
        wordComplete: { color: "#00d9ff", fontSize: "16px", label: "STAGE" },
        multiplierUp: { label: "JACKPOT" },
        milestone: { color: "#fff05a", fontSize: "20px", label: "HI-SCORE" }
      }
    },
    goldLeaf: {
      base: {
        color: "#fff2b8",
        shadow: "0 0 10px rgba(246,211,107,0.58)",
        motion: "drift"
      },
      events: {
        correct: { label: "清明" },
        incorrect: { color: "#dc6b5a", label: "乱" },
        wordComplete: { color: "#f6d36b", fontSize: "16px", label: "満開" },
        multiplierUp: { label: "灯" },
        milestone: { color: "#fff7d6", fontSize: "19px", label: "成就" }
      }
    },
    moonlitSilver: {
      base: {
        color: "#fff2c6",
        shadow: "0 0 11px rgba(248,210,122,0.58)",
        motion: "drift"
      },
      events: {
        correct: { label: "灯" },
        incorrect: { color: "#e46f75", label: "影" },
        wordComplete: { color: "#bfe8ff", fontSize: "16px", label: "月明" },
        multiplierUp: { color: "#f8d27a", label: "祭囃子" },
        milestone: { color: "#f8f2c8", fontSize: "19px", label: "宵祭" }
      }
    },
    terminalGreen: {
      base: {
        color: "#00ff88",
        shadow: "0 0 12px rgba(0,255,136,0.82)",
        fontFamily: "Consolas, Monaco, monospace",
        motion: "glitch"
      },
      events: {
        correct: { label: "ACCESS" },
        incorrect: {
          color: "#ef4444",
          shadow: "0 0 10px rgba(239,68,68,0.58)",
          label: "TRACE"
        },
        wordComplete: { color: "#bbf7d0", fontSize: "16px", label: "DECRYPT" },
        multiplierUp: { label: "ROOT" },
        milestone: { color: "#bbf7d0", fontSize: "20px", label: "BREACH" }
      }
    },
    voidMinimal: {
      base: {
        color: "#f9fafb",
        shadow: "0 2px 8px rgba(0,0,0,0.5)",
        fontSize: "12px",
        motion: "minimal"
      },
      events: {
        correct: { label: "OK" },
        incorrect: { color: "#9ca3af", label: "NO" },
        wordComplete: { color: "#e5e7eb", fontSize: "13px", label: "DONE" },
        multiplierUp: { label: "+" },
        milestone: { color: "#f9fafb", fontSize: "16px", label: "PEAK" }
      }
    }
  };
  var PARTICLE_PRESETS = {
    arcadeBurst: {
      shape: "dot",
      motion: "burst",
      color: "var(--mm-theme-notification)",
      count: 8,
      liteCount: 2,
      lifetimeMs: 700,
      spread: 72,
      size: 5,
      events: {
        incorrect: { color: "var(--mm-theme-failure)", count: 5, liteCount: 1 },
        wordComplete: { color: "var(--mm-theme-success)", count: 10, liteCount: 2 },
        milestone: { count: 14, liteCount: 3, spread: 110, size: 6 },
        timeout: { color: "var(--mm-theme-failure)", count: 4, liteCount: 1 }
      }
    },
    starSparkles: {
      shape: "star",
      motion: "drift",
      color: "#dbeafe",
      count: 7,
      liteCount: 1,
      lifetimeMs: 950,
      spread: 85,
      size: 6,
      events: {
        milestone: { count: 12, spread: 120 },
        incorrect: { color: "#fb7185", count: 3 }
      }
    },
    cosmicDust: {
      shape: "ring",
      motion: "drift",
      color: "#f0abfc",
      count: 9,
      liteCount: 1,
      lifetimeMs: 1050,
      spread: 96,
      size: 7,
      events: {
        wordComplete: { color: "#c4b5fd", count: 11 },
        incorrect: { color: "#fb7185", count: 4 }
      }
    },
    pixelFragments: {
      shape: "pixel",
      motion: "burst",
      color: "#00e5ff",
      count: 9,
      liteCount: 2,
      lifetimeMs: 760,
      spread: 86,
      size: 5,
      events: {
        incorrect: { color: "#ff477e", count: 6 },
        timeout: { color: "#ff477e", count: 4 }
      }
    },
    confettiPixels: {
      shape: "pixel",
      motion: "burst",
      color: "#fff05a",
      count: 12,
      liteCount: 2,
      lifetimeMs: 850,
      spread: 100,
      size: 5,
      events: {
        correct: { count: 9 },
        multiplierUp: { color: "#ff2bd6", count: 12 },
        milestone: { count: 16, spread: 128 },
        incorrect: { color: "#ff4b4b", count: 5 }
      }
    },
    sakuraPetals: {
      shape: "petal",
      motion: "fall",
      color: "#f6d36b",
      count: 6,
      liteCount: 1,
      lifetimeMs: 1150,
      spread: 78,
      size: 7,
      events: {
        incorrect: { color: "#dc6b5a", count: 2, lifetimeMs: 850 },
        milestone: { count: 10, spread: 105 }
      }
    },
    fireflyWisps: {
      shape: "dot",
      motion: "drift",
      color: "#f8d27a",
      count: 4,
      liteCount: 1,
      lifetimeMs: 1350,
      spread: 64,
      size: 4,
      events: {
        correct: { count: 3, lifetimeMs: 1250 },
        wordComplete: { color: "#f8f2c8", count: 6, spread: 74, lifetimeMs: 1500 },
        multiplierUp: { color: "#f8d27a", count: 5, spread: 70 },
        milestone: { color: "#f8f2c8", count: 8, spread: 92, size: 5 },
        incorrect: { color: "#e46f75", count: 2, lifetimeMs: 900 },
        timeout: { color: "#e46f75", count: 2, lifetimeMs: 860 },
        comboBreak: { color: "#e46f75", count: 2 }
      }
    },
    matrixCode: {
      shape: "glyph",
      motion: "glitch",
      color: "#00ff88",
      glyphs: "01日月火水木金土",
      count: 7,
      liteCount: 1,
      lifetimeMs: 760,
      spread: 76,
      size: 12,
      events: {
        incorrect: { color: "#ef4444", glyphs: "01", count: 4 },
        comboBreak: { color: "#ef4444", glyphs: "0101", count: 5 }
      }
    },
    voidDust: {
      shape: "dot",
      motion: "drift",
      color: "#e5e7eb",
      count: 2,
      liteCount: 0,
      lifetimeMs: 650,
      spread: 32,
      size: 3,
      events: {
        milestone: { count: 4, liteCount: 1 },
        incorrect: { color: "#9ca3af", count: 1 }
      }
    }
  };
  var COMBO_EFFECT_PRESETS = {
    arcadePop: {
      style: "pop",
      color: "var(--mm-theme-banner)",
      shadow: "0 0 20px var(--mm-theme-banner-glow), 0 0 40px var(--mm-theme-banner-glow)",
      celebrations: ["🎉", "✨", "⚡", "🔥", "💫", "🎊", "🌟", "💥", "⭐", "💎", "🏆"]
    },
    constellation: {
      style: "float",
      color: "#f8fafc",
      shadow: "0 0 22px rgba(125,211,252,0.95), 0 0 46px rgba(56,189,248,0.55)",
      celebrations: ["✦", "✧", "⋆", "★"]
    },
    nebulaWave: {
      style: "wave",
      color: "#f5d0fe",
      shadow: "0 0 22px rgba(217,70,239,0.9), 0 0 46px rgba(147,197,253,0.55)",
      celebrations: ["✦", "✧", "◇", "◆"]
    },
    scanPulse: {
      style: "scan",
      color: "#e0faff",
      shadow: "0 0 20px rgba(0,229,255,0.95), 0 0 42px rgba(37,99,235,0.65)",
      celebrations: ["▣", "◆", "◇", "✦"]
    },
    arcadeMarquee: {
      style: "marquee",
      color: "#fff05a",
      shadow: "0 0 20px rgba(255,43,214,0.95), 0 0 42px rgba(0,217,255,0.65)",
      celebrations: ["🎉", "✨", "⚡", "🎊", "🌟", "💥", "⭐", "🏆"]
    },
    lanternGlow: {
      style: "calm",
      color: "#fff7d6",
      shadow: "0 0 18px rgba(246,211,107,0.75), 0 0 34px rgba(183,121,31,0.35)",
      celebrations: ["✦", "◇", "◆", "花"]
    },
    moonlitGate: {
      style: "calm",
      color: "#f8f2c8",
      shadow: "0 0 16px rgba(248,210,122,0.64), 0 0 32px rgba(156,200,255,0.28)",
      celebrations: ["月", "灯", "祭", "花"]
    },
    glitch: {
      style: "glitch",
      color: "#bbf7d0",
      shadow: "0 0 18px rgba(0,255,136,0.9), 0 0 36px rgba(0,204,102,0.55)",
      celebrations: ["0", "1", "日", "月"]
    },
    minimal: {
      style: "minimal",
      color: "#f9fafb",
      shadow: "0 0 12px rgba(229,231,235,0.38)",
      celebrations: ["•", "·", "✦"]
    }
  };
  var CELEBRATION_CHOREOGRAPHY_PRESETS = {
    arcadePop: {
      effects: ["pop", "rise", "burst", "spin"],
      count: 1,
      liteCount: 1,
      spread: 72,
      size: 52,
      durationMs: 850,
      answerAccent: "pop"
    },
    starfieldOrbit: {
      effects: ["orbit", "drift", "rise"],
      count: 2,
      liteCount: 1,
      spread: 92,
      size: 44,
      durationMs: 1100,
      answerAccent: "orbit"
    },
    nebulaBloom: {
      effects: ["bloom", "drift", "pulse"],
      count: 2,
      liteCount: 1,
      spread: 98,
      size: 48,
      durationMs: 1120,
      answerAccent: "bloom"
    },
    gridScanBurst: {
      effects: ["scan", "burst", "glitch"],
      count: 2,
      liteCount: 1,
      spread: 86,
      size: 46,
      durationMs: 760,
      answerAccent: "scan"
    },
    gameCenterJackpot: {
      effects: ["pop", "burst", "spin"],
      count: 3,
      liteCount: 1,
      spread: 112,
      size: 54,
      durationMs: 820,
      answerAccent: "jackpot"
    },
    shrineDrift: {
      effects: ["calm", "drift", "rise"],
      count: 1,
      liteCount: 1,
      spread: 58,
      size: 43,
      durationMs: 1280,
      answerAccent: "shimmer"
    },
    nightviewGlow: {
      effects: ["calm", "drift", "rise"],
      count: 1,
      liteCount: 1,
      spread: 54,
      size: 40,
      durationMs: 1320,
      answerAccent: "shimmer"
    },
    matrixGlitch: {
      effects: ["glitch", "scan", "burst"],
      count: 2,
      liteCount: 1,
      spread: 74,
      size: 45,
      durationMs: 720,
      answerAccent: "glitch"
    },
    voidPulse: {
      effects: ["pulse", "calm"],
      count: 1,
      liteCount: 0,
      spread: 28,
      size: 34,
      durationMs: 620,
      answerAccent: "pulse"
    }
  };
  var CSS_THEME_VARIABLES = {
    accent: "--mm-theme-accent",
    secondary: "--mm-theme-secondary",
    success: "--mm-theme-success",
    failure: "--mm-theme-failure",
    hudGlow: "--mm-theme-hud-glow",
    flash: "--mm-theme-flash",
    failureFlash: "--mm-theme-failure-flash",
    notification: "--mm-theme-notification",
    timerFast: "--mm-theme-timer-fast",
    timerMedium: "--mm-theme-timer-medium",
    timerLow: "--mm-theme-timer-low",
    timerCritical: "--mm-theme-timer-critical",
    floatingText: "--mm-theme-floating-text",
    floatingShadow: "--mm-theme-floating-shadow",
    progress: "--mm-theme-progress",
    button: "--mm-theme-button",
    buttonSoft: "--mm-theme-button-soft",
    banner: "--mm-theme-banner",
    bannerGlow: "--mm-theme-banner-glow"
  };
  var CSS_THEME_PRESENTATION_VARIABLES = {
    panelBg: "--mm-theme-panel-bg",
    panelBorder: "--mm-theme-panel-border",
    panelText: "--mm-theme-panel-text",
    panelMuted: "--mm-theme-panel-muted",
    panelDivider: "--mm-theme-panel-divider",
    panelShadow: "--mm-theme-panel-shadow",
    controlBg: "--mm-theme-control-bg",
    controlBorder: "--mm-theme-control-border",
    fieldBg: "--mm-theme-field-bg",
    fieldBorder: "--mm-theme-field-border",
    fieldGlow: "--mm-theme-field-glow",
    counterShadow: "--mm-theme-counter-shadow",
    scanlineOpacity: "--mm-theme-scanline-opacity",
    scanlineColor: "--mm-theme-scanline-color",
    floatLabelBg: "--mm-theme-float-label-bg",
    floatLabelColor: "--mm-theme-float-label-color"
  };
  var TEMP_EFFECT_SELECTOR = ".mm-float, .mm-celebrate, .mm-theme-particle, .mm-answer-accent";
  var THEME_PRESET_REGISTRY = {
    sound: SOUND_PRESETS,
    floatingText: FLOATING_TEXT_PRESETS,
    particles: PARTICLE_PRESETS,
    combo: COMBO_EFFECT_PRESETS,
    celebration: CELEBRATION_CHOREOGRAPHY_PRESETS,
    music: MUSIC_PRESETS
  };

  // src/utils/clamp.js
  function clamp(value, minimum, maximum, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
  }

  // src/config/theme-manager.js
  var hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }
  function mergeThemeObjects(base = {}, override = {}) {
    const next = { ...base };
    for (const [key, value] of Object.entries(override || {})) {
      next[key] = isPlainObject(value) && isPlainObject(next[key]) ? mergeThemeObjects(next[key], value) : value;
    }
    return next;
  }
  function normalizeThemeId(theme, fallback = DEFAULTS.backgroundTheme) {
    const raw = typeof theme === "string" ? theme.trim() : "";
    const alias = THEME_ALIASES2[raw] || THEME_ALIASES2[raw.toLowerCase()];
    const candidate = alias || raw;
    if (hasOwn(THEME_DEFINITIONS, candidate)) return candidate;
    if (hasOwn(REMOVED_BACKGROUND_THEME_FALLBACKS2, candidate)) {
      return REMOVED_BACKGROUND_THEME_FALLBACKS2[candidate];
    }
    return hasOwn(THEME_DEFINITIONS, fallback) ? fallback : DEFAULTS.backgroundTheme;
  }
  function getPreset(collection, presetName, fallbackName) {
    return collection[presetName] || collection[fallbackName];
  }
  function validateThemeRegistry({
    themeDefinitions = THEME_DEFINITIONS,
    presetRegistry = THEME_PRESET_REGISTRY,
    cssThemeVariables = CSS_THEME_VARIABLES,
    celebrationPresets = CELEBRATION_CHOREOGRAPHY_PRESETS,
    musicPresets = MUSIC_PRESETS,
    warn = (...args) => console.warn(...args)
  } = {}) {
    const issues = [];
    const requiredIntensityKeys = ["particles", "flash", "shake", "sound", "celebration"];
    const requiredMotionKeys = ["shakeScale", "effectIntensity", "allowIdle"];
    const validMusicSchedulers = [
      "style",
      "ambient",
      "pulse",
      "chiptune",
      "bells",
      "minyo",
      "void"
    ];
    for (const [themeId, theme] of Object.entries(themeDefinitions)) {
      for (const [presetKey, collection] of Object.entries(presetRegistry)) {
        const presetName = theme.presets?.[presetKey];
        if (!presetName) {
          issues.push(`${themeId}.presets.${presetKey} is missing`);
        } else if (!collection[presetName]) {
          issues.push(`${themeId}.presets.${presetKey} -> ${presetName} is unknown`);
        }
      }
      for (const colorKey of Object.keys(cssThemeVariables)) {
        if (theme.colors?.[colorKey] === void 0) {
          issues.push(`${themeId}.colors.${colorKey} is missing`);
        }
      }
      for (const key of requiredIntensityKeys) {
        if (!Number.isFinite(Number(theme.intensity?.[key]))) {
          issues.push(`${themeId}.intensity.${key} must be numeric`);
        }
      }
      for (const key of requiredMotionKeys) {
        if (key === "allowIdle") {
          if (typeof theme.motion?.allowIdle !== "boolean") {
            issues.push(`${themeId}.motion.allowIdle must be boolean`);
          }
        } else if (!Number.isFinite(Number(theme.motion?.[key]))) {
          issues.push(`${themeId}.motion.${key} must be numeric`);
        }
      }
    }
    for (const [presetId, preset] of Object.entries(celebrationPresets)) {
      if (!Array.isArray(preset.effects) || preset.effects.length === 0) {
        issues.push(`celebration.${presetId}.effects must contain at least one effect`);
      }
      if (!preset.answerAccent) {
        issues.push(`celebration.${presetId}.answerAccent is missing`);
      }
    }
    for (const [presetId, preset] of Object.entries(musicPresets)) {
      if (!validMusicSchedulers.includes(preset.scheduler)) {
        issues.push(`music.${presetId}.scheduler -> ${preset.scheduler} is unknown`);
      }
    }
    if (issues.length) {
      warn("[MMGamify] Theme registry check found issues:", issues);
    }
    return issues;
  }
  function createThemeManager({
    document: documentRef,
    getSettings,
    saveSettings: saveSettings2 = () => {
    },
    isLiteMode: isLiteMode2 = () => false,
    isMaxMode: isMaxMode2 = () => false
  } = {}) {
    const resolvedThemeCache = /* @__PURE__ */ new Map();
    let lastAppliedCssThemeId = null;
    function getBackgroundTheme() {
      return getSettings?.()?.backgroundTheme ?? DEFAULTS.backgroundTheme;
    }
    function resolveThemeDefinition(themeId) {
      const normalized = normalizeThemeId(themeId);
      const cached = resolvedThemeCache.get(normalized);
      if (cached) return cached;
      const theme = normalized === DEFAULTS.backgroundTheme ? THEME_DEFINITIONS[DEFAULTS.backgroundTheme] : mergeThemeObjects(
        THEME_DEFINITIONS[DEFAULTS.backgroundTheme],
        THEME_DEFINITIONS[normalized]
      );
      const resolved = { ...theme, id: normalized };
      resolvedThemeCache.set(normalized, resolved);
      return resolved;
    }
    return {
      getThemeIds() {
        return BACKGROUND_THEMES;
      },
      getThemeId(themeId = getBackgroundTheme()) {
        return normalizeThemeId(themeId);
      },
      getThemeLabel(themeId = getBackgroundTheme()) {
        return BACKGROUND_THEME_LABELS[this.getThemeId(themeId)] || this.getActiveTheme(themeId).label.toUpperCase();
      },
      getActiveTheme(themeId = getBackgroundTheme()) {
        return resolveThemeDefinition(themeId);
      },
      getThemeValue(path, fallback = null) {
        const parts = String(path || "").split(".").filter(Boolean);
        let value = this.getActiveTheme();
        for (const part of parts) {
          value = value?.[part];
          if (value === void 0) return fallback;
        }
        return value;
      },
      getSoundPreset(eventType) {
        const theme = this.getActiveTheme();
        const preset = getPreset(SOUND_PRESETS, theme.presets.sound, "arcade");
        return preset[eventType] || SOUND_PRESETS.arcade[eventType] || [];
      },
      getFloatingTextPreset(eventType) {
        const theme = this.getActiveTheme();
        return mergeEventPreset(
          getPreset(FLOATING_TEXT_PRESETS, theme.presets.floatingText, "arcadeClassic"),
          eventType
        );
      },
      getParticlePreset(eventType) {
        const theme = this.getActiveTheme();
        return mergeEventPreset(
          getPreset(PARTICLE_PRESETS, theme.presets.particles, "arcadeBurst"),
          eventType
        );
      },
      getComboPreset(eventType) {
        const theme = this.getActiveTheme();
        const preset = getPreset(COMBO_EFFECT_PRESETS, theme.presets.combo, "arcadePop");
        return mergeEventPreset(preset, eventType);
      },
      getCelebrationPreset(eventType) {
        const theme = this.getActiveTheme();
        const preset = getPreset(
          CELEBRATION_CHOREOGRAPHY_PRESETS,
          theme.presets.celebration,
          "arcadePop"
        );
        return mergeEventPreset(preset, eventType);
      },
      getMusicPreset(themeId = getBackgroundTheme()) {
        const theme = this.getActiveTheme(themeId);
        const presetName = theme.presets.music || "arcadeLofi";
        const preset = getPreset(MUSIC_PRESETS, presetName, "arcadeLofi");
        return { ...preset, id: presetName };
      },
      getEffectPreset(eventType) {
        return {
          floatingText: this.getFloatingTextPreset(eventType),
          particles: this.getParticlePreset(eventType),
          combo: this.getComboPreset(eventType),
          celebration: this.getCelebrationPreset(eventType),
          budget: this.getEffectBudget(eventType)
        };
      },
      getEffectBudget(_eventType) {
        const theme = this.getActiveTheme();
        const intensity = theme.intensity || {};
        const profileScale = isMaxMode2() ? 1 : isLiteMode2() ? 0.25 : 0.72;
        const particles = Number(intensity.particles) || 1;
        const celebration = Number(intensity.celebration) || 1;
        return {
          intensity: theme.motion.effectIntensity * particles * profileScale,
          celebrationScale: theme.motion.effectIntensity * celebration * profileScale,
          flashScale: clamp(intensity.flash, 0.08, 1, 1),
          soundScale: clamp(intensity.sound, 0.08, 1.4, 1),
          spreadScale: clamp(0.68 + particles * 0.32, 0.45, 1.18, 1),
          shakeScale: theme.motion.shakeScale * clamp(intensity.shake, 0.08, 1.3, 1) * (isLiteMode2() ? 0.35 : 1),
          allowIdle: theme.motion.allowIdle && !isLiteMode2()
        };
      },
      applyTheme(themeId, { persist = true, save = false } = {}) {
        const normalized = normalizeThemeId(themeId);
        if (persist) getSettings().backgroundTheme = normalized;
        const theme = this.applyCssVariables(normalized);
        if (documentRef.body) {
          documentRef.body.dataset.mmTheme = normalized;
          documentRef.body.dataset.mmBg = normalized;
        }
        if (persist && save) saveSettings2();
        return theme;
      },
      applyCssVariables(themeId = getBackgroundTheme()) {
        const theme = this.getActiveTheme(themeId);
        if (lastAppliedCssThemeId === theme.id) return theme;
        const presentation = mergeThemeObjects(
          THEME_PRESENTATION_STYLES.default,
          THEME_PRESENTATION_STYLES[theme.id] || {}
        );
        const root = documentRef.documentElement;
        for (const [key, cssVar] of Object.entries(CSS_THEME_VARIABLES)) {
          root.style.setProperty(cssVar, theme.colors[key]);
        }
        for (const [key, cssVar] of Object.entries(CSS_THEME_PRESENTATION_VARIABLES)) {
          root.style.setProperty(cssVar, presentation[key]);
        }
        lastAppliedCssThemeId = theme.id;
        return theme;
      },
      clearPresentation() {
        const root = documentRef.documentElement;
        [
          ...Object.values(CSS_THEME_VARIABLES),
          ...Object.values(CSS_THEME_PRESENTATION_VARIABLES)
        ].forEach((cssVar) => {
          root.style.removeProperty(cssVar);
        });
        lastAppliedCssThemeId = null;
        delete documentRef.body?.dataset.mmTheme;
        delete documentRef.body?.dataset.mmBg;
      }
    };
  }

  // src/utils/scheduling.js
  function debounce(callback, wait = 120, scheduler = globalThis) {
    if (typeof callback !== "function") throw new TypeError("debounce expects a callback");
    let timer = null;
    const debounced = function(...args) {
      if (timer !== null) scheduler.clearTimeout(timer);
      timer = scheduler.setTimeout(() => {
        timer = null;
        callback.apply(this, args);
      }, wait);
    };
    debounced.cancel = () => {
      if (timer !== null) scheduler.clearTimeout(timer);
      timer = null;
    };
    return debounced;
  }

  // inline-userscript-css:src/backgrounds/arcade.css
  var cssText = "/* ── PHOSPHOR PALETTE SHIFT ── */\nbody.mm-arcade:not([data-mm-bg='default']) {\n    background-color: #02040a !important;\n}\n\nbody.mm-arcade:not([data-mm-bg='default']) #__nuxt,\nbody.mm-arcade:not([data-mm-bg='default']) #app,\nbody.mm-arcade:not([data-mm-bg='default']) [data-v-app],\nbody.mm-arcade:not([data-mm-bg='default']) main,\nbody.mm-arcade:not([data-mm-bg='default']) #main {\n    background-color: transparent !important;\n}\n\nbody.mm-arcade #__nuxt,\nbody.mm-arcade #app,\nbody.mm-arcade [data-v-app] {\n    position: relative;\n    z-index: 1;\n}\n\nbody.mm-arcade.mm-arcade-resolved:not([data-mm-bg='default']) {\n    color: rgba(245, 248, 255, 0.9);\n}\n\nbody.mm-arcade.mm-arcade-resolved:not([data-mm-bg='default']) #__nuxt,\nbody.mm-arcade.mm-arcade-resolved:not([data-mm-bg='default']) #app,\nbody.mm-arcade.mm-arcade-resolved:not([data-mm-bg='default']) [data-v-app],\nbody.mm-arcade.mm-arcade-resolved:not([data-mm-bg='default']) main,\nbody.mm-arcade.mm-arcade-resolved:not([data-mm-bg='default']) #main,\nbody.mm-arcade.mm-arcade-resolved:not([data-mm-bg='default']) [class*='page'],\nbody.mm-arcade.mm-arcade-resolved:not([data-mm-bg='default']) [class*='layout'],\nbody.mm-arcade.mm-arcade-resolved:not([data-mm-bg='default']) [class*='content'],\nbody.mm-arcade.mm-arcade-resolved:not([data-mm-bg='default']) [class*='review'] {\n    background-color: transparent !important;\n    color: rgba(245, 248, 255, 0.9) !important;\n}\n\nbody.mm-arcade.mm-arcade-resolved:not([data-mm-bg='default']) h1,\nbody.mm-arcade.mm-arcade-resolved:not([data-mm-bg='default']) h2,\nbody.mm-arcade.mm-arcade-resolved:not([data-mm-bg='default']) h3,\nbody.mm-arcade.mm-arcade-resolved:not([data-mm-bg='default']) h4 {\n    color: rgba(245, 248, 255, 0.94) !important;\n}\n\nbody.mm-arcade.mm-arcade-resolved #mm-starfield {\n    opacity: 0.5;\n}\n\nbody.mm-arcade.mm-arcade-resolved[data-mm-bg='default'] #mm-starfield,\nbody.mm-arcade.mm-arcade-resolved[data-mm-bg='void'] #mm-starfield {\n    display: none !important;\n}\n\n/* Phosphor tint + subtle bloom on the whole viewport */\n#mm-crt-tint {\n    position: fixed;\n    inset: 0;\n    pointer-events: none;\n    z-index: 9990;\n    background: radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0, 10, 30, 0.55) 100%);\n    mix-blend-mode: multiply;\n    animation: mmCrtFlicker 8s infinite;\n}\n\n/* Scanlines */\n#mm-scanlines {\n    position: fixed;\n    inset: 0;\n    pointer-events: none;\n    z-index: 9991;\n    opacity: var(--mm-theme-scanline-opacity, 1);\n    background: repeating-linear-gradient(\n        to bottom,\n        transparent 0px,\n        transparent 2px,\n        var(--mm-theme-scanline-color, rgba(0, 0, 0, 0.18)) 2px,\n        var(--mm-theme-scanline-color, rgba(0, 0, 0, 0.18)) 4px\n    );\n}\nbody:not(.mm-crt-enabled) #mm-crt-tint,\nbody:not(.mm-crt-enabled) #mm-scanlines {\n    display: none !important;\n}\n\n/* Arcade backdrop sits behind page content */\n#mm-starfield {\n    position: fixed;\n    inset: 0;\n    width: 100vw;\n    height: 100vh;\n    pointer-events: none;\n    z-index: -1;\n}\n\n/* CRT curvature flicker — very subtle brightness pulse */\n@keyframes mmCrtFlicker {\n    0%,\n    100% {\n        opacity: 1;\n    }\n    92% {\n        opacity: 1;\n    }\n    93% {\n        opacity: 0.96;\n    }\n    94% {\n        opacity: 1;\n    }\n    97% {\n        opacity: 0.98;\n    }\n    98% {\n        opacity: 1;\n    }\n}\nbody.mm-arcade {\n    isolation: isolate;\n}\nbody.mm-arcade.mm-crt-enabled[data-mm-bg='shrine'] #mm-crt-tint,\nbody.mm-arcade.mm-crt-enabled[data-mm-bg='nightview'] #mm-crt-tint {\n    animation: none;\n}\nbody.mm-performance-mode.mm-arcade #mm-crt-tint {\n    animation: none;\n}\n@media (prefers-reduced-motion: reduce) {\n    #mm-crt-tint {\n        animation: none !important;\n    }\n}\n\n/* ── PHOSPHOR GLOW on the main card area ── */\nbody.mm-arcade.mm-crt-enabled .input-wrapper,\nbody.mm-arcade.mm-crt-enabled [class*='question'],\nbody.mm-arcade.mm-crt-enabled [class*='card'],\nbody.mm-arcade.mm-crt-enabled [class*='review'] {\n    box-shadow:\n        0 0 24px var(--mm-theme-field-glow, rgba(0, 220, 255, 0.12)),\n        0 0 2px var(--mm-theme-field-glow, rgba(0, 220, 255, 0.08)) !important;\n}\nbody.mm-performance-mode.mm-arcade .input-wrapper,\nbody.mm-performance-mode.mm-arcade [class*='question'],\nbody.mm-performance-mode.mm-arcade [class*='card'],\nbody.mm-performance-mode.mm-arcade [class*='review'] {\n    box-shadow: none !important;\n}\n\n/* Glow on text inputs */\nbody.mm-arcade input[type='text'],\nbody.mm-arcade input:not([type]) {\n    color: var(--mm-theme-secondary, #00ffcc) !important;\n    caret-color: var(--mm-theme-secondary, #00ffcc) !important;\n    background: var(--mm-theme-field-bg, rgba(0, 0, 0, 0.6)) !important;\n    border-color: var(--mm-theme-field-border, rgba(0, 200, 255, 0.4)) !important;\n}\nbody.mm-arcade.mm-crt-enabled input[type='text'],\nbody.mm-arcade.mm-crt-enabled input:not([type]) {\n    text-shadow: 0 0 8px var(--mm-theme-field-glow, rgba(0, 255, 200, 0.6)) !important;\n}\nbody.mm-arcade input[type='text']::placeholder,\nbody.mm-arcade input:not([type])::placeholder {\n    color: var(--mm-theme-secondary, rgba(0, 200, 255, 0.35)) !important;\n}\nbody.mm-performance-mode.mm-arcade input[type='text'],\nbody.mm-performance-mode.mm-arcade input:not([type]) {\n    text-shadow: none !important;\n}\n\n/* ── CORNER BRACKETS on the main card ── */\nbody.mm-arcade .input-wrapper::before,\nbody.mm-arcade .input-wrapper::after {\n    content: '';\n    position: absolute;\n    width: 18px;\n    height: 18px;\n    border-color: var(--mm-theme-field-border, rgba(0, 220, 255, 0.55));\n    border-style: solid;\n    pointer-events: none;\n    z-index: 2;\n}\nbody.mm-arcade .input-wrapper {\n    position: relative;\n}\nbody.mm-arcade .input-wrapper::before {\n    top: -4px;\n    left: -4px;\n    border-width: 2px 0 0 2px;\n}\nbody.mm-arcade .input-wrapper::after {\n    bottom: -4px;\n    right: -4px;\n    border-width: 0 2px 2px 0;\n}\n\n/* ── PROGRESS BAR — phosphor green ── */\nbody.mm-arcade [role='progressbar'] > *,\nbody.mm-arcade .progress-bar,\nbody.mm-arcade .progress > * {\n    background: var(--mm-theme-progress, linear-gradient(90deg, #00cc88, #00ffcc)) !important;\n}\nbody.mm-arcade.mm-crt-enabled [role='progressbar'] > *,\nbody.mm-arcade.mm-crt-enabled .progress-bar,\nbody.mm-arcade.mm-crt-enabled .progress > * {\n    box-shadow: 0 0 8px var(--mm-theme-success, rgba(0, 255, 180, 0.5)) !important;\n}\n\n/* ── TOP COUNTER — arcade colour ── */\nbody.mm-arcade .top_middle {\n    font-family: var(--mm-arcade-font) !important;\n    color: var(--mm-theme-notification, #ffe066) !important;\n    letter-spacing: 2px !important;\n}\nbody.mm-arcade.mm-crt-enabled .top_middle {\n    text-shadow: var(--mm-theme-counter-shadow, 0 0 8px rgba(255, 220, 0, 0.6)) !important;\n}\n\n/* ── CORRECT / INCORRECT state tints ── */\nbody.mm-arcade .input-wrapper.correct {\n    box-shadow:\n        0 0 32px var(--mm-theme-field-glow, rgba(0, 255, 150, 0.35)),\n        0 0 4px var(--mm-theme-success, rgba(0, 255, 150, 0.2)) !important;\n}\nbody.mm-arcade .input-wrapper.incorrect {\n    box-shadow:\n        0 0 32px var(--mm-theme-failure, rgba(255, 40, 80, 0.4)),\n        0 0 4px var(--mm-theme-failure, rgba(255, 40, 80, 0.2)) !important;\n}\nbody.mm-performance-mode.mm-arcade .input-wrapper.correct,\nbody.mm-performance-mode.mm-arcade .input-wrapper.incorrect,\nbody.mm-performance-mode.mm-arcade [role='progressbar'] > *,\nbody.mm-performance-mode.mm-arcade .progress-bar,\nbody.mm-performance-mode.mm-arcade .progress > * {\n    box-shadow: none !important;\n}\nbody.mm-performance-mode.mm-arcade .top_middle {\n    text-shadow: none !important;\n}\n";
  var arcade_default = cssText;

  // src/backgrounds/canvas-runtime.js
  var CANVAS_PIXEL_BUDGETS = Object.freeze({
    lite: 15e5,
    balanced: 3686400,
    max: 8294400
  });
  function calculateCanvasSize(viewportWidth, viewportHeight, { scale = 1, maxPixels = CANVAS_PIXEL_BUDGETS.balanced } = {}) {
    const width = Math.max(1, Number(viewportWidth) || 1);
    const height = Math.max(1, Number(viewportHeight) || 1);
    const requestedScale = clamp(scale, 0.1, 1, 1);
    const pixelBudget = Math.max(1, Number(maxPixels) || CANVAS_PIXEL_BUDGETS.balanced);
    const budgetScale = Math.sqrt(pixelBudget / (width * height));
    const effectiveScale = Math.min(requestedScale, budgetScale);
    return Object.freeze({
      width: Math.max(1, Math.floor(width * effectiveScale)),
      height: Math.max(1, Math.floor(height * effectiveScale)),
      scale: effectiveScale
    });
  }
  function compactInPlace(items, keep) {
    if (!Array.isArray(items)) throw new TypeError("compactInPlace expects an array");
    if (typeof keep !== "function") throw new TypeError("compactInPlace expects a predicate");
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < items.length; readIndex += 1) {
      const item = items[readIndex];
      if (!keep(item, readIndex)) continue;
      items[writeIndex] = item;
      writeIndex += 1;
    }
    items.length = writeIndex;
    return items;
  }

  // src/backgrounds/renderers/render-primitives.js
  function randomBell() {
    const u = Math.max(Number.EPSILON, Math.random());
    const v = Math.max(Number.EPSILON, Math.random());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
  }
  function paintEllipticalGlow(target, x, y, radiusX, radiusY, rotation, stops) {
    target.save();
    target.translate(x, y);
    target.rotate(rotation);
    target.scale(radiusX, radiusY);
    const gradient = target.createRadialGradient(0, 0, 0, 0, 0, 1);
    stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
    target.fillStyle = gradient;
    target.fillRect(-1, -1, 2, 2);
    target.restore();
  }
  function drawStarPoint(target, star, alpha = star.alpha) {
    target.fillStyle = `hsla(${star.hue},80%,88%,${alpha})`;
    target.beginPath();
    target.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    target.fill();
  }
  function drawBrightStar(target, star, alpha) {
    const glowRadius = star.radius * 8;
    const glow = target.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowRadius);
    glow.addColorStop(0, `hsla(${star.hue},90%,96%,${alpha})`);
    glow.addColorStop(0.18, `hsla(${star.hue},90%,82%,${alpha * 0.42})`);
    glow.addColorStop(1, `hsla(${star.hue},90%,68%,0)`);
    target.fillStyle = glow;
    target.beginPath();
    target.arc(star.x, star.y, glowRadius, 0, Math.PI * 2);
    target.fill();
    target.strokeStyle = `hsla(${star.hue},90%,92%,${alpha * 0.32})`;
    target.lineWidth = 0.7;
    target.beginPath();
    target.moveTo(star.x - star.radius * 6, star.y);
    target.lineTo(star.x + star.radius * 6, star.y);
    target.moveTo(star.x, star.y - star.radius * 4);
    target.lineTo(star.x, star.y + star.radius * 4);
    target.stroke();
  }

  // src/backgrounds/renderers/gamecenter-renderer.js
  function createGameCenterRenderer(runtime) {
    const { ctx, theme, createBackdropTexture } = runtime;
    let gameCenterTexture;
    let gameCenterCabinets = [];
    let gameCenterLights = [];
    function drawGameCenterPanel(target, x, y, width, height, hue, label, sublabel = "") {
      target.save();
      target.fillStyle = "rgba(5,4,18,0.92)";
      target.strokeStyle = `hsla(${hue},100%,58%,0.52)`;
      target.shadowColor = `hsla(${hue},100%,56%,0.4)`;
      target.shadowBlur = Math.max(3, height * 0.09);
      target.lineWidth = Math.max(1, height * 0.035);
      target.fillRect(x, y, width, height);
      target.strokeRect(x, y, width, height);
      target.shadowBlur = Math.max(2, height * 0.05);
      target.fillStyle = `hsla(${hue},100%,70%,0.72)`;
      const labelSize = Math.max(
        6,
        Math.min(height * 0.34, width / Math.max(4, label.length * 0.72))
      );
      target.font = `700 ${labelSize}px sans-serif`;
      target.textAlign = "center";
      target.textBaseline = "middle";
      target.fillText(label, x + width / 2, y + height * (sublabel ? 0.42 : 0.52));
      if (sublabel) {
        target.shadowBlur = 0;
        target.fillStyle = "rgba(220,245,255,0.52)";
        const sublabelSize = Math.max(
          5,
          Math.min(height * 0.16, width / Math.max(5, sublabel.length * 0.68))
        );
        target.font = `600 ${sublabelSize}px sans-serif`;
        target.fillText(sublabel, x + width / 2, y + height * 0.76);
      }
      target.restore();
    }
    function initGameCenter() {
      gameCenterTexture = createBackdropTexture();
      const textureCtx = gameCenterTexture.getContext("2d");
      if (!textureCtx) return;
      const horizon = runtime.height * 0.53;
      const vanishingX = runtime.width / 2;
      const vanishingY = runtime.height * 0.4;
      const room = textureCtx.createRadialGradient(
        vanishingX,
        vanishingY,
        0,
        vanishingX,
        vanishingY,
        Math.max(runtime.width, runtime.height) * 0.78
      );
      room.addColorStop(0, "#141025");
      room.addColorStop(0.46, "#080818");
      room.addColorStop(1, "#02040a");
      textureCtx.fillStyle = room;
      textureCtx.fillRect(0, 0, runtime.width, runtime.height);
      const leftWall = textureCtx.createLinearGradient(0, 0, runtime.width * 0.34, 0);
      leftWall.addColorStop(0, "rgba(7,12,25,0.98)");
      leftWall.addColorStop(1, "rgba(25,8,38,0.74)");
      textureCtx.fillStyle = leftWall;
      textureCtx.beginPath();
      textureCtx.moveTo(0, 0);
      textureCtx.lineTo(runtime.width * 0.3, runtime.height * 0.18);
      textureCtx.lineTo(runtime.width * 0.34, horizon);
      textureCtx.lineTo(0, runtime.height * 0.72);
      textureCtx.closePath();
      textureCtx.fill();
      const rightWall = textureCtx.createLinearGradient(
        runtime.width,
        0,
        runtime.width * 0.66,
        0
      );
      rightWall.addColorStop(0, "rgba(7,12,25,0.98)");
      rightWall.addColorStop(1, "rgba(28,7,32,0.74)");
      textureCtx.fillStyle = rightWall;
      textureCtx.beginPath();
      textureCtx.moveTo(runtime.width, 0);
      textureCtx.lineTo(runtime.width * 0.7, runtime.height * 0.18);
      textureCtx.lineTo(runtime.width * 0.66, horizon);
      textureCtx.lineTo(runtime.width, runtime.height * 0.72);
      textureCtx.closePath();
      textureCtx.fill();
      textureCtx.fillStyle = "rgba(5,7,16,0.96)";
      textureCtx.fillRect(
        runtime.width * 0.3,
        runtime.height * 0.18,
        runtime.width * 0.4,
        horizon - runtime.height * 0.18
      );
      textureCtx.strokeStyle = "rgba(0,205,255,0.07)";
      textureCtx.lineWidth = 1;
      for (let panel = 0; panel <= 8; panel++) {
        const x = runtime.width * 0.3 + panel * runtime.width * 0.05;
        textureCtx.beginPath();
        textureCtx.moveTo(x, runtime.height * 0.18);
        textureCtx.lineTo(x, horizon);
        textureCtx.stroke();
      }
      textureCtx.strokeStyle = "rgba(70,150,220,0.06)";
      for (let beam = 0; beam <= 12; beam++) {
        textureCtx.beginPath();
        textureCtx.moveTo(vanishingX, vanishingY);
        textureCtx.lineTo(beam * runtime.width / 12, 0);
        textureCtx.stroke();
      }
      for (let row = 0; row < 5; row++) {
        const y = runtime.height * 0.04 + row * runtime.height * 0.055;
        const spread = runtime.width * (0.5 - row * 0.065);
        textureCtx.beginPath();
        textureCtx.moveTo(vanishingX - spread, y);
        textureCtx.lineTo(vanishingX + spread, y);
        textureCtx.stroke();
      }
      const floor = textureCtx.createLinearGradient(0, horizon, 0, runtime.height);
      floor.addColorStop(0, "#0c071c");
      floor.addColorStop(0.52, "#080919");
      floor.addColorStop(1, "#03050d");
      textureCtx.fillStyle = floor;
      textureCtx.fillRect(0, horizon, runtime.width, runtime.height - horizon);
      const floorRows = 13;
      const floorColumns = 20;
      for (let row = 0; row < floorRows; row++) {
        const p1 = row / floorRows;
        const p2 = (row + 1) / floorRows;
        const y1 = horizon + Math.pow(p1, 1.82) * (runtime.height - horizon);
        const y2 = horizon + Math.pow(p2, 1.82) * (runtime.height - horizon);
        for (let column = -floorColumns / 2; column < floorColumns / 2; column++) {
          const x11 = vanishingX + column * runtime.width / floorColumns * p1;
          const x12 = vanishingX + (column + 1) * runtime.width / floorColumns * p1;
          const x21 = vanishingX + column * runtime.width / floorColumns * p2;
          const x22 = vanishingX + (column + 1) * runtime.width / floorColumns * p2;
          textureCtx.fillStyle = (row + column) % 2 === 0 ? "rgba(42,17,62,0.12)" : "rgba(3,38,53,0.08)";
          textureCtx.beginPath();
          textureCtx.moveTo(x11, y1);
          textureCtx.lineTo(x12, y1);
          textureCtx.lineTo(x22, y2);
          textureCtx.lineTo(x21, y2);
          textureCtx.closePath();
          textureCtx.fill();
        }
      }
      textureCtx.strokeStyle = "rgba(0,205,255,0.055)";
      for (let column = -10; column <= 10; column++) {
        textureCtx.beginPath();
        textureCtx.moveTo(vanishingX, horizon);
        textureCtx.lineTo(vanishingX + column * runtime.width / 20, runtime.height);
        textureCtx.stroke();
      }
      for (let row = 1; row <= floorRows; row++) {
        const p = row / floorRows;
        const y = horizon + Math.pow(p, 1.82) * (runtime.height - horizon);
        textureCtx.beginPath();
        textureCtx.moveTo(0, y);
        textureCtx.lineTo(runtime.width, y);
        textureCtx.stroke();
      }
      drawGameCenterPanel(
        textureCtx,
        runtime.width * 0.055,
        runtime.height * 0.18,
        runtime.width * 0.13,
        runtime.height * 0.05,
        190,
        "音ゲー",
        "RHYTHM"
      );
      drawGameCenterPanel(
        textureCtx,
        runtime.width * 0.815,
        runtime.height * 0.18,
        runtime.width * 0.13,
        runtime.height * 0.05,
        320,
        "UFO キャッチャー",
        "PRIZE"
      );
      const cabinetLabels = ["音", "UFO", "対戦", "RACE", "太鼓", "GAME", "景品"];
      const cabinetCount = 5;
      gameCenterCabinets = [];
      for (let index = 0; index < cabinetCount; index++) {
        const p = (index + 1) / cabinetCount;
        const depth = Math.pow(p, 1.28);
        const width = Math.min(
          runtime.width * 0.085,
          runtime.height * 0.12,
          30 + depth * runtime.width * 0.045
        );
        const height = width * 1.55;
        const baseY = horizon + depth * (runtime.height - horizon) * 0.94;
        const offset = runtime.width * (0.19 + depth * 0.285);
        for (const side of [-1, 1]) {
          gameCenterCabinets.push({
            x: vanishingX + side * offset,
            baseY,
            width,
            height,
            side,
            hue: [190, 315, 28, 48][(index + (side > 0 ? 1 : 0)) % 4],
            phase: Math.random() * Math.PI * 2,
            label: cabinetLabels[(index + (side > 0 ? 2 : 0)) % cabinetLabels.length]
          });
        }
      }
      gameCenterLights = Array.from({ length: 9 }, (_, index) => ({
        x: runtime.width * (0.1 + index * 0.1),
        y: runtime.height * (0.075 + Math.abs(index - 4) * 0.012),
        radius: Math.max(3, Math.min(runtime.width, runtime.height) * 6e-3),
        hue: [28, 190, 315][index % 3],
        phase: Math.random() * Math.PI * 2
      }));
    }
    function drawGameCenterCabinet(machine, t) {
      const flicker = 0.78 + Math.sin(t * 2.4 + machine.phase) * 0.16 + Math.sin(t * 6.7 + machine.phase) * 0.06;
      const { width, height } = machine;
      ctx.save();
      ctx.translate(machine.x, machine.baseY);
      ctx.fillStyle = "rgba(3,5,13,0.97)";
      ctx.strokeStyle = `hsla(${machine.hue},100%,58%,0.52)`;
      ctx.shadowColor = `hsla(${machine.hue},100%,54%,0.38)`;
      ctx.shadowBlur = Math.max(2, width * 0.04);
      ctx.lineWidth = Math.max(1, width * 0.018);
      ctx.beginPath();
      ctx.moveTo(-width * 0.43, -height);
      ctx.lineTo(width * 0.43, -height);
      ctx.lineTo(width * 0.5, 0);
      ctx.lineTo(-width * 0.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = `hsla(${machine.hue},85%,22%,0.95)`;
      ctx.fillRect(-width * 0.4, -height * 0.94, width * 0.8, height * 0.15);
      ctx.fillStyle = `hsla(${machine.hue},100%,76%,${0.72 * flicker})`;
      ctx.font = `700 ${Math.max(6, width * 0.15)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(machine.label, 0, -height * 0.865);
      const screenX = -width * 0.32;
      const screenY = -height * 0.72;
      const screenW = width * 0.64;
      const screenH = height * 0.3;
      const screen = ctx.createLinearGradient(
        screenX,
        screenY,
        screenX + screenW,
        screenY + screenH
      );
      screen.addColorStop(0, `hsla(${machine.hue},100%,62%,${0.16 * flicker})`);
      screen.addColorStop(0.5, `hsla(${machine.hue + 75},100%,55%,${0.42 * flicker})`);
      screen.addColorStop(1, "rgba(2,8,18,0.95)");
      ctx.fillStyle = screen;
      ctx.fillRect(screenX, screenY, screenW, screenH);
      ctx.strokeRect(screenX, screenY, screenW, screenH);
      ctx.save();
      ctx.beginPath();
      ctx.rect(screenX, screenY, screenW, screenH);
      ctx.clip();
      ctx.strokeStyle = `hsla(${machine.hue + 55},100%,78%,${0.24 * flicker})`;
      ctx.lineWidth = Math.max(0.6, width * 8e-3);
      for (let stripe = -2; stripe < 5; stripe++) {
        const offset = (t * 18 + stripe * screenW * 0.28) % (screenW * 1.4) - screenW * 0.2;
        ctx.beginPath();
        ctx.moveTo(screenX + offset, screenY + screenH);
        ctx.lineTo(screenX + offset + screenW * 0.4, screenY);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = "rgba(20,18,32,0.98)";
      ctx.beginPath();
      ctx.moveTo(-width * 0.36, -height * 0.36);
      ctx.lineTo(width * 0.36, -height * 0.36);
      ctx.lineTo(width * 0.46, -height * 0.24);
      ctx.lineTo(-width * 0.46, -height * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = `hsla(${machine.hue},100%,66%,0.62)`;
      ctx.beginPath();
      ctx.arc(-width * 0.16, -height * 0.3, Math.max(1.5, width * 0.035), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,80,145,0.65)";
      ctx.beginPath();
      ctx.arc(width * 0.12, -height * 0.3, Math.max(1.2, width * 0.028), 0, Math.PI * 2);
      ctx.arc(width * 0.21, -height * 0.3, Math.max(1.2, width * 0.028), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(15,18,26,0.96)";
      ctx.fillRect(-width * 0.32, -height * 0.18, width * 0.64, height * 0.12);
      ctx.fillStyle = `hsla(${machine.hue},100%,62%,0.34)`;
      ctx.fillRect(-width * 0.08, -height * 0.14, width * 0.16, height * 0.025);
      ctx.restore();
    }
    function drawGameCenter(t) {
      if (theme !== "gamecenter") return;
      const horizon = runtime.height * 0.53;
      const vanishingX = runtime.width / 2;
      ctx.save();
      ctx.drawImage(gameCenterTexture, 0, 0, runtime.width, runtime.height);
      ctx.globalCompositeOperation = "lighter";
      for (const light of gameCenterLights) {
        const pulse = 0.72 + Math.sin(t * 1.3 + light.phase) * 0.2;
        const glow = ctx.createRadialGradient(
          light.x,
          light.y,
          0,
          light.x,
          light.y,
          light.radius * 8
        );
        glow.addColorStop(0, `hsla(${light.hue},100%,78%,${0.38 * pulse})`);
        glow.addColorStop(0.2, `hsla(${light.hue},100%,60%,${0.12 * pulse})`);
        glow.addColorStop(1, `hsla(${light.hue},100%,50%,0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(light.x, light.y, light.radius * 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `hsla(${light.hue},100%,82%,${0.58 * pulse})`;
        ctx.fillRect(
          light.x - light.radius * 1.8,
          light.y - light.radius * 0.65,
          light.radius * 3.6,
          light.radius * 1.3
        );
      }
      for (const machine of gameCenterCabinets) {
        const reflection = ctx.createLinearGradient(
          machine.x,
          machine.baseY,
          machine.x,
          Math.min(runtime.height, machine.baseY + machine.height * 0.72)
        );
        reflection.addColorStop(0, `hsla(${machine.hue},100%,58%,0.055)`);
        reflection.addColorStop(1, `hsla(${machine.hue},100%,45%,0)`);
        ctx.fillStyle = reflection;
        ctx.beginPath();
        ctx.moveTo(machine.x - machine.width * 0.34, machine.baseY);
        ctx.lineTo(machine.x + machine.width * 0.34, machine.baseY);
        ctx.lineTo(machine.x + machine.width * 0.18, runtime.height);
        ctx.lineTo(machine.x - machine.width * 0.18, runtime.height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      gameCenterCabinets.forEach((machine) => drawGameCenterCabinet(machine, t));
      const focusShade = ctx.createRadialGradient(
        vanishingX,
        runtime.height * 0.35,
        0,
        vanishingX,
        runtime.height * 0.35,
        Math.min(runtime.width, runtime.height) * 0.42
      );
      focusShade.addColorStop(0, "rgba(1,3,10,0.34)");
      focusShade.addColorStop(0.56, "rgba(1,3,10,0.12)");
      focusShade.addColorStop(1, "rgba(1,3,10,0)");
      ctx.fillStyle = focusShade;
      ctx.fillRect(0, 0, runtime.width, runtime.height);
      ctx.globalCompositeOperation = "lighter";
      for (let index = 0; index < 8; index++) {
        const progress = (index / 8 + t * 0.12) % 1;
        const y = horizon + Math.pow(progress, 1.85) * (runtime.height - horizon);
        const spread = runtime.width * (0.025 + progress * 0.18);
        const alpha = 0.1 + progress * 0.22;
        for (const side of [-1, 1]) {
          ctx.fillStyle = `rgba(255,92,42,${alpha})`;
          ctx.shadowColor = "#ff5c2a";
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(vanishingX + side * spread, y, 0.8 + progress * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    return Object.freeze({ init: initGameCenter, draw: drawGameCenter });
  }

  // src/backgrounds/renderers/grid-renderer.js
  function createGridRenderer(runtime) {
    const { ctx, theme, isLiteMode: isLiteMode2, createBackdropTexture, drawStarPoint: drawStarPoint2, drawBrightStar: drawBrightStar2 } = runtime;
    let gridTexture;
    let gridStars = [];
    let gridMountainLayers = [];
    let gridPalms = [];
    function makeGridMountainLayer(baseY, step, minHeight, maxHeight, color, fill) {
      const points = [];
      const count = Math.ceil(runtime.width / step) + 2;
      for (let index = -1; index <= count; index++) {
        const peakBoost = index % 3 === 0 ? 1.25 : 1;
        const height = (minHeight + Math.random() * (maxHeight - minHeight)) * peakBoost;
        points.push({ x: index * step, y: baseY - height });
      }
      return { baseY, points, color, fill };
    }
    function initGrid() {
      const horizon = runtime.height * 0.56;
      gridTexture = createBackdropTexture();
      const textureCtx = gridTexture.getContext("2d");
      if (!textureCtx) return;
      const sky = textureCtx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, "#030416");
      sky.addColorStop(0.48, "#12072d");
      sky.addColorStop(0.78, "#32104b");
      sky.addColorStop(1, "#651452");
      textureCtx.fillStyle = sky;
      textureCtx.fillRect(0, 0, runtime.width, horizon + 1);
      const horizonGlow = textureCtx.createRadialGradient(
        runtime.width * 0.5,
        horizon,
        0,
        runtime.width * 0.5,
        horizon,
        Math.max(runtime.width * 0.52, runtime.height * 0.34)
      );
      horizonGlow.addColorStop(0, "rgba(255,50,180,0.24)");
      horizonGlow.addColorStop(0.38, "rgba(115,30,180,0.10)");
      horizonGlow.addColorStop(1, "rgba(10,4,32,0)");
      textureCtx.fillStyle = horizonGlow;
      textureCtx.fillRect(0, 0, runtime.width, horizon + 1);
      const starCount = isLiteMode2() ? Math.max(55, Math.min(130, Math.floor(runtime.width * runtime.height / 12e3))) : Math.max(100, Math.min(280, Math.floor(runtime.width * runtime.height / 6200)));
      for (let index = 0; index < starCount; index++) {
        const star = {
          x: Math.random() * runtime.width,
          y: Math.random() * horizon * 0.88,
          radius: 0.25 + Math.random() * 0.8,
          alpha: 0.18 + Math.random() * 0.52,
          hue: Math.random() < 0.72 ? 202 : 312
        };
        drawStarPoint2(textureCtx, star);
      }
      gridStars = Array.from({ length: isLiteMode2() ? 12 : 26 }, () => ({
        x: runtime.width * (0.04 + Math.random() * 0.92),
        y: horizon * (0.08 + Math.random() * 0.72),
        radius: 0.65 + Math.random() * 0.85,
        alpha: 0.32 + Math.random() * 0.4,
        hue: Math.random() < 0.62 ? 196 : 315,
        phase: Math.random() * Math.PI * 2,
        speed: 0.35 + Math.random() * 0.8
      }));
      gridMountainLayers = [
        makeGridMountainLayer(
          horizon + 8,
          Math.max(62, runtime.width / 22),
          runtime.height * 0.075,
          runtime.height * 0.18,
          "rgba(0,205,255,0.64)",
          "rgba(3,5,28,0.88)"
        ),
        makeGridMountainLayer(
          horizon + 24,
          Math.max(44, runtime.width / 30),
          runtime.height * 0.045,
          runtime.height * 0.13,
          "rgba(255,0,210,0.62)",
          "rgba(9,3,30,0.94)"
        )
      ];
      const palmSize = Math.min(runtime.width, runtime.height);
      gridPalms = [
        { x: runtime.width * 0.055, size: palmSize * 0.19, lean: -0.18 },
        { x: runtime.width * 0.15, size: palmSize * 0.13, lean: 0.12 },
        { x: runtime.width * 0.85, size: palmSize * 0.13, lean: -0.1 },
        { x: runtime.width * 0.945, size: palmSize * 0.2, lean: 0.17 }
      ];
    }
    function drawGridSun(t, horizon) {
      const sunX = runtime.width * 0.5 + Math.sin(t * 0.16) * 4;
      const sunR = Math.min(runtime.width, runtime.height) * 0.145;
      const sunY = horizon - sunR * 0.34;
      const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.15, sunX, sunY, sunR * 1.7);
      glow.addColorStop(0, "rgba(255,210,105,0.32)");
      glow.addColorStop(0.42, "rgba(255,65,165,0.18)");
      glow.addColorStop(1, "rgba(255,0,185,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR * 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      ctx.clip();
      const sun = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
      sun.addColorStop(0, "#ffd47a");
      sun.addColorStop(0.46, "#ff6e8f");
      sun.addColorStop(1, "#ff149f");
      ctx.fillStyle = sun;
      ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
      ctx.fillStyle = "rgba(16,3,38,0.74)";
      for (let stripe = 0; stripe < 10; stripe++) {
        const y = sunY - sunR * 0.34 + stripe * sunR * 0.145;
        ctx.fillRect(sunX - sunR, y, sunR * 2, 2.5 + stripe * 0.85);
      }
      ctx.restore();
    }
    function drawGridMountain(layer) {
      ctx.save();
      ctx.fillStyle = layer.fill;
      ctx.strokeStyle = layer.color;
      ctx.lineJoin = "round";
      ctx.shadowColor = layer.color;
      ctx.shadowBlur = 9;
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.moveTo(layer.points[0].x, layer.baseY);
      layer.points.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.lineTo(layer.points[layer.points.length - 1].x, layer.baseY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 0.65;
      ctx.globalAlpha = 0.58;
      for (const point of layer.points) {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.x, layer.baseY);
        ctx.stroke();
      }
      for (const depth of [0.28, 0.52, 0.74]) {
        ctx.beginPath();
        layer.points.forEach((point, index) => {
          const y = point.y + (layer.baseY - point.y) * depth;
          if (index === 0) ctx.moveTo(point.x, y);
          else ctx.lineTo(point.x, y);
        });
        ctx.stroke();
      }
      ctx.restore();
    }
    function drawGridPalm(palm, horizon) {
      const baseY = horizon + 19;
      const crownX = palm.x + palm.size * palm.lean;
      const crownY = baseY - palm.size;
      ctx.save();
      ctx.strokeStyle = "rgba(255,0,205,0.24)";
      ctx.shadowColor = "#ff00c8";
      ctx.shadowBlur = 8;
      ctx.lineCap = "round";
      ctx.lineWidth = palm.size * 0.09;
      ctx.beginPath();
      ctx.moveTo(palm.x, baseY);
      ctx.quadraticCurveTo(
        palm.x + palm.size * palm.lean * 0.34,
        baseY - palm.size * 0.52,
        crownX,
        crownY
      );
      ctx.stroke();
      ctx.strokeStyle = "rgba(2,2,16,0.98)";
      ctx.shadowBlur = 0;
      ctx.lineWidth = palm.size * 0.065;
      ctx.stroke();
      const frondLength = palm.size * 0.48;
      for (let index = 0; index < 9; index++) {
        const angle = Math.PI * (1.03 + index * 0.115);
        const endX = crownX + Math.cos(angle) * frondLength;
        const endY = crownY + Math.sin(angle) * frondLength * 0.72;
        const bend = index < 4 ? -1 : 1;
        ctx.lineWidth = palm.size * 0.035;
        ctx.beginPath();
        ctx.moveTo(crownX, crownY);
        ctx.quadraticCurveTo(
          crownX + Math.cos(angle) * frondLength * 0.58,
          crownY + Math.sin(angle) * frondLength * 0.36 - bend * palm.size * 0.05,
          endX,
          endY + palm.size * 0.06
        );
        ctx.stroke();
      }
      ctx.restore();
    }
    function drawGrid(t) {
      if (theme !== "grid") return;
      const horizon = runtime.height * 0.56;
      ctx.save();
      ctx.drawImage(gridTexture, 0, 0, runtime.width, runtime.height);
      ctx.globalCompositeOperation = "lighter";
      for (const star of gridStars) {
        const pulse = 0.62 + Math.sin(t * star.speed + star.phase) * 0.38;
        drawBrightStar2(ctx, star, star.alpha * pulse);
      }
      ctx.globalCompositeOperation = "source-over";
      drawGridSun(t, horizon);
      gridMountainLayers.forEach(drawGridMountain);
      gridPalms.forEach((palm) => drawGridPalm(palm, horizon));
      const floor = ctx.createLinearGradient(0, horizon, 0, runtime.height);
      floor.addColorStop(0, "rgba(24,2,46,0.97)");
      floor.addColorStop(0.42, "rgba(7,3,26,0.98)");
      floor.addColorStop(1, "rgba(2,3,16,1)");
      ctx.fillStyle = floor;
      ctx.fillRect(0, horizon, runtime.width, runtime.height - horizon);
      const horizonBloom = ctx.createLinearGradient(0, horizon - 10, 0, horizon + 42);
      horizonBloom.addColorStop(0, "rgba(255,0,200,0)");
      horizonBloom.addColorStop(0.42, "rgba(255,35,190,0.34)");
      horizonBloom.addColorStop(1, "rgba(80,0,150,0)");
      ctx.fillStyle = horizonBloom;
      ctx.fillRect(0, horizon - 10, runtime.width, 52);
      ctx.save();
      ctx.strokeStyle = "rgba(255,0,215,0.5)";
      ctx.shadowColor = "#ff00d4";
      ctx.shadowBlur = 7;
      ctx.lineWidth = 1;
      const travel = t * 1.4 % 1;
      for (let index = 0; index < 25; index++) {
        const progress = (index + travel) / 25;
        const y = horizon + Math.pow(progress, 2.2) * (runtime.height - horizon);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(runtime.width, y);
        ctx.stroke();
      }
      const vanishingX = runtime.width / 2;
      for (let index = -16; index <= 16; index++) {
        const x = runtime.width / 2 + index * runtime.width * 0.078;
        ctx.strokeStyle = index % 2 === 0 ? "rgba(0,220,255,0.40)" : "rgba(255,0,215,0.32)";
        ctx.shadowColor = index % 2 === 0 ? "#00d8ff" : "#ff00d4";
        ctx.beginPath();
        ctx.moveTo(vanishingX, horizon);
        ctx.lineTo(x, runtime.height);
        ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = "rgba(255,145,52,0.84)";
      ctx.shadowColor = "#ff6b1a";
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(vanishingX + side * 4, horizon);
        ctx.lineTo(vanishingX + side * runtime.width * 0.105, runtime.height);
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
    }
    return Object.freeze({ init: initGrid, draw: drawGrid });
  }

  // src/backgrounds/renderers/matrix-renderer.js
  var MATRIX_FONT_SIZE = 18;
  var MATRIX_GLYPHS = "日月火水木金土山川人大小日本語学習01";
  function createMatrixRenderer(runtime) {
    const { ctx, theme, isLiteMode: isLiteMode2 } = runtime;
    let matrixDrops = [];
    function initMatrix() {
      const columns = Math.ceil(runtime.width / MATRIX_FONT_SIZE);
      matrixDrops = Array.from({ length: columns }, () => -Math.random() * 18);
    }
    function drawMatrix(t) {
      if (theme !== "matrix") return;
      ctx.save();
      ctx.font = `${MATRIX_FONT_SIZE}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      matrixDrops.forEach((drop, column) => {
        const x = column * MATRIX_FONT_SIZE + MATRIX_FONT_SIZE / 2;
        const headY = drop * MATRIX_FONT_SIZE;
        const trailLength = isLiteMode2() ? 6 : 12;
        for (let trail = 0; trail < trailLength; trail++) {
          const y = headY - trail * MATRIX_FONT_SIZE;
          if (y < -MATRIX_FONT_SIZE || y > runtime.height + MATRIX_FONT_SIZE) continue;
          const alpha = Math.max(0, 0.28 - trail * 0.022);
          const charIndex = Math.floor(t * 8 + column * 7 + trail * 3) % MATRIX_GLYPHS.length;
          ctx.fillStyle = trail === 0 ? "rgba(210,255,240,0.38)" : `rgba(0,255,180,${alpha})`;
          ctx.fillText(MATRIX_GLYPHS[charIndex], x, y);
        }
        matrixDrops[column] += (0.32 + column % 5 * 0.045) * runtime.frameScale;
        if (headY > runtime.height + MATRIX_FONT_SIZE * 12 && Math.random() < 0.04) {
          matrixDrops[column] = -Math.random() * 16;
        }
      });
      ctx.restore();
    }
    return Object.freeze({ init: initMatrix, draw: drawMatrix });
  }

  // src/backgrounds/renderers/nebula-renderer.js
  function createNebulaRenderer(runtime) {
    const {
      ctx,
      theme,
      isLiteMode: isLiteMode2,
      createBackdropTexture,
      randomBell: randomBell2,
      paintEllipticalGlow: paintEllipticalGlow2,
      drawStarPoint: drawStarPoint2,
      drawBrightStar: drawBrightStar2
    } = runtime;
    let nebulaTexture;
    let nebulaStars = [];
    let nebulaWisps = [];
    function getNebulaSpine(p) {
      return {
        x: runtime.width * (-0.08 + p * 1.16),
        y: runtime.height * (0.74 - p * 0.48) + Math.sin(p * Math.PI * 3.2) * runtime.height * 0.065
      };
    }
    function getNebulaHue(p) {
      if (p < 0.28) return 18 + p * 80;
      if (p < 0.58) return 326 - (p - 0.28) * 110;
      return 214 - (p - 0.58) * 52;
    }
    function initNebula() {
      nebulaTexture = createBackdropTexture();
      const textureCtx = nebulaTexture.getContext("2d");
      if (!textureCtx) return;
      const sky = textureCtx.createRadialGradient(
        runtime.width * 0.56,
        runtime.height * 0.42,
        0,
        runtime.width * 0.56,
        runtime.height * 0.42,
        Math.max(runtime.width, runtime.height) * 0.88
      );
      sky.addColorStop(0, "#100b1f");
      sky.addColorStop(0.48, "#050612");
      sky.addColorStop(1, "#010206");
      textureCtx.fillStyle = sky;
      textureCtx.fillRect(0, 0, runtime.width, runtime.height);
      textureCtx.globalCompositeOperation = "lighter";
      for (let i = 0; i < (isLiteMode2() ? 110 : 260); i++) {
        const p = Math.random();
        const spine = getNebulaSpine(p);
        const spread = runtime.height * (0.035 + 0.16 * Math.sin(p * Math.PI));
        const x = spine.x + randomBell2() * spread * 0.72;
        const y = spine.y + randomBell2() * spread;
        const radius = Math.min(runtime.width, runtime.height) * (0.018 + Math.random() * 0.075);
        const hue = getNebulaHue(p) + randomBell2() * 14;
        const alpha = 0.016 + Math.random() * 0.046;
        paintEllipticalGlow2(
          textureCtx,
          x,
          y,
          radius * (1.2 + Math.random() * 1.8),
          radius * (0.42 + Math.random() * 0.72),
          -0.46 + randomBell2() * 0.48,
          [
            [0, `hsla(${hue},96%,68%,${alpha})`],
            [0.34, `hsla(${hue + 18},94%,52%,${alpha * 0.72})`],
            [0.72, `hsla(${hue - 24},90%,32%,${alpha * 0.22})`],
            [1, `hsla(${hue},88%,20%,0)`]
          ]
        );
      }
      textureCtx.filter = "blur(1.4px)";
      textureCtx.lineCap = "round";
      for (let filament = 0; filament < (isLiteMode2() ? 14 : 34); filament++) {
        const offset = randomBell2() * runtime.height * 0.08;
        const hue = getNebulaHue(Math.random());
        textureCtx.strokeStyle = `hsla(${hue},96%,72%,${0.025 + Math.random() * 0.05})`;
        textureCtx.lineWidth = 0.7 + Math.random() * 2.4;
        textureCtx.beginPath();
        for (let step = 0; step <= 28; step++) {
          const p = step / 28;
          const spine = getNebulaSpine(p);
          const taper = Math.sin(p * Math.PI);
          const ripple = Math.sin(p * (10 + filament % 6) + filament) * runtime.height * 0.018;
          const x = spine.x + ripple * 0.75 + offset * taper * 0.35;
          const y = spine.y + ripple + offset * taper;
          if (step === 0) textureCtx.moveTo(x, y);
          else textureCtx.lineTo(x, y);
        }
        textureCtx.stroke();
      }
      textureCtx.filter = "none";
      textureCtx.globalCompositeOperation = "source-over";
      textureCtx.filter = "blur(5px)";
      for (let i = 0; i < (isLiteMode2() ? 42 : 105); i++) {
        const p = Math.random();
        const spine = getNebulaSpine(p);
        const spread = runtime.height * (0.025 + Math.sin(p * Math.PI) * 0.09);
        const x = spine.x + randomBell2() * spread;
        const y = spine.y + randomBell2() * spread * 0.65;
        const radius = Math.min(runtime.width, runtime.height) * (8e-3 + Math.random() * 0.045);
        textureCtx.fillStyle = `rgba(0,1,8,${0.07 + Math.random() * 0.18})`;
        textureCtx.beginPath();
        textureCtx.ellipse(
          x,
          y,
          radius * (1.4 + Math.random() * 2.4),
          radius,
          -0.48 + randomBell2() * 0.38,
          0,
          Math.PI * 2
        );
        textureCtx.fill();
      }
      textureCtx.filter = "none";
      textureCtx.globalCompositeOperation = "lighter";
      const clusterCenters = [
        { x: 0.24, y: 0.62, hue: 24 },
        { x: 0.51, y: 0.45, hue: 318 },
        { x: 0.74, y: 0.32, hue: 202 }
      ];
      for (const cluster of clusterCenters) {
        paintEllipticalGlow2(
          textureCtx,
          cluster.x * runtime.width,
          cluster.y * runtime.height,
          Math.min(runtime.width, runtime.height) * 0.09,
          Math.min(runtime.width, runtime.height) * 0.065,
          -0.35,
          [
            [0, `hsla(${cluster.hue},100%,90%,0.16)`],
            [0.18, `hsla(${cluster.hue},100%,68%,0.10)`],
            [1, `hsla(${cluster.hue},95%,45%,0)`]
          ]
        );
      }
      const baseStarCount = isLiteMode2() ? Math.max(200, Math.min(520, Math.floor(runtime.width * runtime.height / 2800))) : Math.max(420, Math.min(1100, Math.floor(runtime.width * runtime.height / 1300)));
      for (let i = 0; i < baseStarCount; i++) {
        const star = {
          x: Math.random() * runtime.width,
          y: Math.random() * runtime.height,
          radius: 0.18 + Math.random() * 0.62,
          alpha: 0.12 + Math.random() * 0.46,
          hue: Math.random() < 0.86 ? 210 : 40
        };
        drawStarPoint2(textureCtx, star);
      }
      nebulaStars = Array.from({ length: isLiteMode2() ? 14 : 30 }, (_, index) => {
        const cluster = clusterCenters[index % clusterCenters.length];
        return {
          x: cluster.x * runtime.width + randomBell2() * Math.min(runtime.width, runtime.height) * 0.1,
          y: cluster.y * runtime.height + randomBell2() * Math.min(runtime.width, runtime.height) * 0.08,
          radius: 0.65 + Math.random() * 0.95,
          alpha: 0.42 + Math.random() * 0.38,
          hue: index % 5 === 0 ? cluster.hue : 210,
          phase: Math.random() * Math.PI * 2,
          speed: 0.35 + Math.random() * 0.8
        };
      });
      const wispCount = isLiteMode2() ? 5 : 11;
      nebulaWisps = Array.from({ length: wispCount }, (_, index) => {
        const p = (index + 0.5 + Math.random() * 0.45) / wispCount;
        const spine = getNebulaSpine(p);
        const radius = Math.min(runtime.width, runtime.height) * (0.045 + Math.random() * 0.055);
        return {
          x: spine.x + randomBell2() * runtime.height * 0.035,
          y: spine.y + randomBell2() * runtime.height * 0.045,
          radiusX: radius * (1.35 + Math.random() * 1.2),
          radiusY: radius * (0.42 + Math.random() * 0.38),
          rotation: -0.48 + randomBell2() * 0.28,
          hue: getNebulaHue(p) + randomBell2() * 12,
          alpha: 0.04 + Math.random() * 0.05,
          phase: Math.random() * Math.PI * 2,
          speed: 0.18 + Math.random() * 0.16,
          driftX: 10 + Math.random() * 14,
          driftY: 7 + Math.random() * 10
        };
      });
    }
    function drawNebula(t) {
      if (theme !== "nebula") return;
      ctx.save();
      const driftX = Math.sin(t * 0.12) * 8;
      const driftY = Math.cos(t * 0.09) * 6;
      const breathe = 1 + Math.sin(t * 0.16) * 8e-3;
      ctx.save();
      ctx.translate(runtime.width / 2, runtime.height / 2);
      ctx.scale(breathe, breathe);
      ctx.drawImage(
        nebulaTexture,
        -runtime.width / 2 + driftX - 3,
        -runtime.height / 2 + driftY - 3,
        runtime.width + 6,
        runtime.height + 6
      );
      ctx.restore();
      ctx.globalCompositeOperation = "lighter";
      for (const wisp of nebulaWisps) {
        const pulse = 0.55 + Math.sin(t * wisp.speed + wisp.phase) * 0.45;
        const x = wisp.x + Math.sin(t * wisp.speed * 0.72 + wisp.phase) * wisp.driftX;
        const y = wisp.y + Math.cos(t * wisp.speed * 0.58 + wisp.phase) * wisp.driftY;
        paintEllipticalGlow2(
          ctx,
          x,
          y,
          wisp.radiusX * (0.94 + pulse * 0.1),
          wisp.radiusY * (0.94 + pulse * 0.08),
          wisp.rotation + Math.sin(t * wisp.speed * 0.4 + wisp.phase) * 0.04,
          [
            [0, `hsla(${wisp.hue},96%,68%,${wisp.alpha * pulse})`],
            [0.46, `hsla(${wisp.hue + 18},92%,48%,${wisp.alpha * pulse * 0.55})`],
            [1, `hsla(${wisp.hue},90%,28%,0)`]
          ]
        );
      }
      for (const star of nebulaStars) {
        const pulse = 0.68 + Math.sin(t * star.speed + star.phase) * 0.32;
        drawBrightStar2(ctx, star, star.alpha * pulse);
      }
      ctx.restore();
    }
    return Object.freeze({ init: initNebula, draw: drawNebula });
  }

  // src/backgrounds/renderers/nightview-renderer.js
  var NIGHTVIEW_LANTERN_POINTS = Object.freeze([
    Object.freeze({ x: 0.077, y: 0.69, radius: 0.95, phase: 0.4 }),
    Object.freeze({ x: 0.67, y: 0.88, radius: 0.72, phase: 1.7 }),
    Object.freeze({ x: 0.744, y: 0.585, radius: 0.52, phase: 2.8 }),
    Object.freeze({ x: 0.402, y: 0.59, radius: 0.42, phase: 3.6 })
  ]);
  function createNightviewRenderer(runtime) {
    const { ctx, theme, document: document2, isLiteMode: isLiteMode2, prefersReducedMotion: prefersReducedMotion2, requestRender } = runtime;
    let nightviewImage;
    let nightviewImageReady = false;
    let nightviewDirectFallbackTried = false;
    let nightviewFireflies = [];
    let nightviewStars = [];
    function resetNightviewFirefly(firefly = {}, randomY = false) {
      firefly.x = Math.random() * runtime.width;
      firefly.y = randomY ? runtime.height * (0.52 + Math.random() * 0.43) : runtime.height + 8 + Math.random() * runtime.height * 0.16;
      firefly.size = 1.1 + Math.random() * 1.8;
      firefly.speed = 0.08 + Math.random() * 0.18;
      firefly.drift = 0.18 + Math.random() * 0.38;
      firefly.alpha = 0.14 + Math.random() * 0.24;
      firefly.phase = Math.random() * Math.PI * 2;
      firefly.hue = Math.random() < 0.72 ? 48 : 205;
      return firefly;
    }
    function initNightview() {
      const fireflyCount = isLiteMode2() ? 0 : Math.max(10, Math.min(24, Math.floor(runtime.width / 95)));
      nightviewFireflies = Array.from(
        { length: fireflyCount },
        () => resetNightviewFirefly({}, true)
      );
      const starCount = isLiteMode2() ? 0 : Math.max(12, Math.min(34, Math.floor(runtime.width / 72)));
      nightviewStars = Array.from({ length: starCount }, () => ({
        x: runtime.width * (0.08 + Math.random() * 0.84),
        y: runtime.height * (0.055 + Math.random() * 0.28),
        radius: 0.55 + Math.random() * 1.25,
        alpha: 0.1 + Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2,
        speed: 0.55 + Math.random() * 1.25,
        hue: Math.random() < 0.7 ? 212 : 46
      }));
      if (nightviewImage) return;
      nightviewImage = document2.createElement("img");
      nightviewImage.decoding = "async";
      nightviewImage.onload = () => {
        nightviewImageReady = true;
        if (prefersReducedMotion2() || isLiteMode2()) {
          requestRender();
        }
      };
      const loadNightviewDirectly = () => {
        if (nightviewDirectFallbackTried) {
          nightviewImageReady = false;
          console.warn("[MMGamify] Night View background resource failed to load.");
          return;
        }
        nightviewDirectFallbackTried = true;
        nightviewImage.crossOrigin = "anonymous";
        nightviewImage.src = NIGHTVIEW_IMAGE_URL;
      };
      nightviewImage.onerror = loadNightviewDirectly;
      try {
        Promise.resolve(GM_getResourceURL("mmNightview")).then((resourceUrl) => {
          if (!resourceUrl) throw new Error("Empty nightview resource URL");
          nightviewImage.src = resourceUrl;
        }).catch(loadNightviewDirectly);
      } catch {
        loadNightviewDirectly();
      }
    }
    function drawNightviewImage(t) {
      if (!nightviewImageReady) {
        const fallback = ctx.createLinearGradient(0, 0, 0, runtime.height);
        fallback.addColorStop(0, "#071326");
        fallback.addColorStop(0.55, "#050b18");
        fallback.addColorStop(1, "#02050a");
        ctx.fillStyle = fallback;
        ctx.fillRect(0, 0, runtime.width, runtime.height);
        return;
      }
      const imageRatio = nightviewImage.naturalWidth / nightviewImage.naturalHeight;
      const viewportRatio = runtime.width / runtime.height;
      const animated = !isLiteMode2() && !prefersReducedMotion2();
      const scale = 1.01 + (animated ? Math.sin(t * 0.06) * 2e-3 : 0);
      let drawWidth;
      let drawHeight;
      if (imageRatio > viewportRatio) {
        drawHeight = runtime.height * scale;
        drawWidth = drawHeight * imageRatio;
      } else {
        drawWidth = runtime.width * scale;
        drawHeight = drawWidth / imageRatio;
      }
      const driftX = animated ? Math.sin(t * 0.03) * 2.1 : 0;
      const driftY = animated ? Math.cos(t * 0.026) * 1.2 : 0;
      ctx.drawImage(
        nightviewImage,
        (runtime.width - drawWidth) / 2 + driftX,
        (runtime.height - drawHeight) / 2 + driftY,
        drawWidth,
        drawHeight
      );
    }
    function drawNightviewMoonGlow(t) {
      const pulse = prefersReducedMotion2() ? 1 : 0.88 + Math.sin(t * 0.52) * 0.12;
      const moonX = runtime.width * 0.305;
      const moonY = runtime.height * 0.16;
      const radius = Math.min(runtime.width, runtime.height) * 0.13;
      const glow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, radius);
      glow.addColorStop(0, `rgba(235,244,255,${0.16 * pulse})`);
      glow.addColorStop(0.34, `rgba(140,186,255,${0.055 * pulse})`);
      glow.addColorStop(1, "rgba(80,130,220,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    function drawNightviewLanternGlow(t) {
      const radius = Math.min(runtime.width, runtime.height) * 0.075;
      for (const lantern of NIGHTVIEW_LANTERN_POINTS) {
        const x = runtime.width * lantern.x;
        const y = runtime.height * lantern.y;
        const pulse = prefersReducedMotion2() ? 1 : 0.82 + Math.sin(t * 1.08 + lantern.phase) * 0.11 + Math.sin(t * 5.1 + lantern.phase) * 0.035;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * lantern.radius);
        glow.addColorStop(0, `rgba(255,202,102,${0.12 * pulse})`);
        glow.addColorStop(0.34, `rgba(255,156,58,${0.045 * pulse})`);
        glow.addColorStop(1, "rgba(255,120,35,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, radius * lantern.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    function drawNightviewStarFlickers(t) {
      if (isLiteMode2() || prefersReducedMotion2()) return;
      for (const star of nightviewStars) {
        const pulse = 0.52 + Math.sin(t * star.speed + star.phase) * 0.34 + Math.sin(t * star.speed * 2.7 + star.phase) * 0.14;
        const alpha = Math.max(0, star.alpha * pulse);
        ctx.save();
        ctx.fillStyle = `hsla(${star.hue},90%,88%,${alpha})`;
        ctx.shadowColor = `hsla(${star.hue},95%,78%,${alpha * 0.72})`;
        ctx.shadowBlur = 5 + star.radius * 4;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    function drawNightviewFireflies(t) {
      if (isLiteMode2() || prefersReducedMotion2()) return;
      for (const firefly of nightviewFireflies) {
        firefly.y -= firefly.speed * runtime.frameScale;
        firefly.x += Math.sin(t * 0.75 + firefly.phase) * firefly.drift * runtime.frameScale;
        if (firefly.y < runtime.height * 0.48 || firefly.x < -12 || firefly.x > runtime.width + 12) {
          resetNightviewFirefly(firefly);
        }
        const pulse = 0.58 + Math.sin(t * 1.8 + firefly.phase) * 0.42;
        ctx.save();
        ctx.fillStyle = `hsla(${firefly.hue},95%,72%,${firefly.alpha * pulse})`;
        ctx.shadowColor = `hsla(${firefly.hue},95%,68%,${0.42 * pulse})`;
        ctx.shadowBlur = 8 + firefly.size * 4;
        ctx.beginPath();
        ctx.arc(firefly.x, firefly.y, firefly.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    function drawNightview(t) {
      if (theme !== "nightview") return;
      ctx.save();
      drawNightviewImage(t);
      ctx.globalCompositeOperation = "lighter";
      drawNightviewStarFlickers(t);
      drawNightviewMoonGlow(t);
      drawNightviewLanternGlow(t);
      drawNightviewFireflies(t);
      ctx.restore();
    }
    return Object.freeze({ init: initNightview, draw: drawNightview });
  }

  // src/backgrounds/renderers/shooting-stars.js
  function createShootingStarSystem({
    window: window2,
    settings: settings2,
    isLiteMode: isLiteMode2,
    prefersReducedMotion: prefersReducedMotion2,
    isAnswerResolved: isAnswerResolved2,
    hasShootingStars
  }) {
    let stars = [];
    function trigger() {
      if (isLiteMode2() || !settings2.visualsEnabled || prefersReducedMotion2() || isAnswerResolved2() || !hasShootingStars()) {
        return false;
      }
      stars.push({
        x: window2.innerWidth * (0.65 + Math.random() * 0.45),
        y: window2.innerHeight * (0.06 + Math.random() * 0.38),
        vx: -9 - Math.random() * 7,
        vy: 4 + Math.random() * 4,
        life: 1,
        hue: Math.random() < 0.55 ? 190 : 310,
        length: 90 + Math.random() * 100
      });
      return true;
    }
    function draw(ctx, frameScale) {
      compactInPlace(stars, (star) => star.life > 0);
      for (const star of stars) {
        const tailX = star.x - star.vx * star.length / 12;
        const tailY = star.y - star.vy * star.length / 12;
        const gradient = ctx.createLinearGradient(star.x, star.y, tailX, tailY);
        gradient.addColorStop(0, `hsla(${star.hue},100%,82%,${star.life})`);
        gradient.addColorStop(0.16, `hsla(${star.hue},100%,66%,${star.life * 0.62})`);
        gradient.addColorStop(1, `hsla(${star.hue},100%,60%,0)`);
        ctx.save();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
        ctx.fillStyle = `hsla(${star.hue},100%,88%,${star.life})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        star.x += star.vx * frameScale;
        star.y += star.vy * frameScale;
        star.life -= 0.018 * frameScale;
      }
    }
    function clear() {
      stars = [];
    }
    return Object.freeze({ trigger, draw, clear });
  }

  // src/backgrounds/renderers/shrine-renderer.js
  var SHRINE_LANTERN_POINTS = Object.freeze([
    Object.freeze({ x: 0.68, y: 0.44 }),
    Object.freeze({ x: 0.812, y: 0.468 }),
    Object.freeze({ x: 0.835, y: 0.318 })
  ]);
  function createShrineRenderer(runtime) {
    const { ctx, theme, document: document2, isLiteMode: isLiteMode2, prefersReducedMotion: prefersReducedMotion2, requestRender } = runtime;
    let shrineImage;
    let shrineImageReady = false;
    let shrineDirectFallbackTried = false;
    let shrinePetals = [];
    function resetShrinePetal(petal = {}, randomY = false) {
      petal.x = Math.random() * runtime.width;
      petal.y = randomY ? Math.random() * runtime.height : -12 - Math.random() * runtime.height * 0.18;
      petal.size = 1.8 + Math.random() * 2.8;
      petal.speed = 0.16 + Math.random() * 0.25;
      petal.drift = 0.14 + Math.random() * 0.24;
      petal.alpha = 0.16 + Math.random() * 0.22;
      petal.phase = Math.random() * Math.PI * 2;
      petal.spin = 0.35 + Math.random() * 0.75;
      petal.hue = 36 + Math.random() * 16;
      return petal;
    }
    function initShrine() {
      const petalCount = isLiteMode2() ? 0 : Math.max(8, Math.min(18, Math.floor(runtime.width / 130)));
      shrinePetals = Array.from({ length: petalCount }, () => resetShrinePetal({}, true));
      if (shrineImage) return;
      shrineImage = document2.createElement("img");
      shrineImage.decoding = "async";
      shrineImage.onload = () => {
        shrineImageReady = true;
        if (prefersReducedMotion2() || isLiteMode2()) {
          requestRender();
        }
      };
      const loadShrineDirectly = () => {
        if (shrineDirectFallbackTried) {
          shrineImageReady = false;
          console.warn("[MMGamify] Shrine background resource failed to load.");
          return;
        }
        shrineDirectFallbackTried = true;
        shrineImage.crossOrigin = "anonymous";
        shrineImage.src = SHRINE_IMAGE_URL;
      };
      shrineImage.onerror = loadShrineDirectly;
      try {
        Promise.resolve(GM_getResourceURL("mmShrineGarden")).then((resourceUrl) => {
          if (!resourceUrl) throw new Error("Empty shrine resource URL");
          shrineImage.src = resourceUrl;
        }).catch(loadShrineDirectly);
      } catch {
        loadShrineDirectly();
      }
    }
    function drawShrineImage(t) {
      if (!shrineImageReady) {
        const fallback = ctx.createLinearGradient(0, 0, 0, runtime.height);
        fallback.addColorStop(0, "#17212a");
        fallback.addColorStop(1, "#05090a");
        ctx.fillStyle = fallback;
        ctx.fillRect(0, 0, runtime.width, runtime.height);
        return;
      }
      const imageRatio = shrineImage.naturalWidth / shrineImage.naturalHeight;
      const viewportRatio = runtime.width / runtime.height;
      const animated = !isLiteMode2() && !prefersReducedMotion2();
      const scale = 1.012 + (animated ? Math.sin(t * 0.08) * 2e-3 : 0);
      let drawWidth;
      let drawHeight;
      if (imageRatio > viewportRatio) {
        drawHeight = runtime.height * scale;
        drawWidth = drawHeight * imageRatio;
      } else {
        drawWidth = runtime.width * scale;
        drawHeight = drawWidth / imageRatio;
      }
      const driftX = animated ? Math.sin(t * 0.035) * 2.5 : 0;
      const driftY = animated ? Math.cos(t * 0.028) * 1.5 : 0;
      ctx.drawImage(
        shrineImage,
        (runtime.width - drawWidth) / 2 + driftX,
        (runtime.height - drawHeight) / 2 + driftY,
        drawWidth,
        drawHeight
      );
    }
    function drawShrineLanternGlow(t) {
      if (runtime.width / runtime.height < 1.15) return;
      const pulse = prefersReducedMotion2() ? 1 : 0.88 + Math.sin(t * 1.15) * 0.12;
      const radius = Math.min(runtime.width, runtime.height) * 0.075;
      for (const point of SHRINE_LANTERN_POINTS) {
        const x = runtime.width * point.x;
        const y = runtime.height * point.y;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
        glow.addColorStop(0, `rgba(255,178,82,${0.085 * pulse})`);
        glow.addColorStop(0.28, `rgba(255,126,46,${0.035 * pulse})`);
        glow.addColorStop(1, "rgba(255,100,35,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    function drawShrinePetals(t) {
      if (isLiteMode2() || prefersReducedMotion2()) return;
      for (const petal of shrinePetals) {
        petal.y += petal.speed * runtime.frameScale;
        petal.x += Math.sin(t * petal.spin + petal.phase) * petal.drift * runtime.frameScale;
        if (petal.y > runtime.height + 12 || petal.x < -12 || petal.x > runtime.width + 12) {
          resetShrinePetal(petal);
        }
        ctx.save();
        ctx.translate(petal.x, petal.y);
        ctx.rotate(Math.sin(t * petal.spin + petal.phase) * 1.4);
        ctx.fillStyle = `hsla(${petal.hue},90%,58%,${petal.alpha})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, petal.size, petal.size * 0.42, 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    function drawShrine(t) {
      if (theme !== "shrine") return;
      ctx.save();
      drawShrineImage(t);
      ctx.globalCompositeOperation = "lighter";
      drawShrineLanternGlow(t);
      drawShrinePetals(t);
      ctx.restore();
    }
    return Object.freeze({ init: initShrine, draw: drawShrine });
  }

  // src/backgrounds/renderers/starfield-renderer.js
  function createStarfieldRenderer(runtime) {
    const {
      ctx,
      theme,
      isLiteMode: isLiteMode2,
      createBackdropTexture,
      randomBell: randomBell2,
      paintEllipticalGlow: paintEllipticalGlow2,
      drawStarPoint: drawStarPoint2,
      drawBrightStar: drawBrightStar2
    } = runtime;
    let starfieldTexture;
    let starfieldStars = [];
    let starfieldSparkles = [];
    let nextStarfieldSparkleAt = 0;
    function getGalaxyBandY(x) {
      return runtime.height * (0.84 - 0.58 * x / runtime.width) + Math.sin(x / Math.max(160, runtime.width * 0.16)) * runtime.height * 0.035;
    }
    function initStarfield() {
      starfieldTexture = createBackdropTexture();
      const textureCtx = starfieldTexture.getContext("2d");
      if (!textureCtx) return;
      const sky = textureCtx.createRadialGradient(
        runtime.width * 0.55,
        runtime.height * 0.48,
        0,
        runtime.width * 0.55,
        runtime.height * 0.48,
        Math.max(runtime.width, runtime.height) * 0.78
      );
      sky.addColorStop(0, "#081226");
      sky.addColorStop(0.48, "#030817");
      sky.addColorStop(1, "#010207");
      textureCtx.fillStyle = sky;
      textureCtx.fillRect(0, 0, runtime.width, runtime.height);
      textureCtx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 42; i++) {
        const x = i / 41 * runtime.width + randomBell2() * runtime.width * 0.018;
        const y = getGalaxyBandY(x) + randomBell2() * runtime.height * 0.035;
        const width = runtime.width * (0.1 + Math.random() * 0.09);
        const height = runtime.height * (0.055 + Math.random() * 0.055);
        const hue = Math.random() < 0.72 ? 215 : 278;
        paintEllipticalGlow2(textureCtx, x, y, width, height, -0.55, [
          [0, `hsla(${hue},75%,66%,${0.018 + Math.random() * 0.024})`],
          [0.48, `hsla(${hue + 24},70%,45%,0.012)`],
          [1, `hsla(${hue},70%,28%,0)`]
        ]);
      }
      const area = runtime.width * runtime.height;
      const densityDivisor = isLiteMode2() ? 1500 : 720;
      const starCount = Math.max(
        isLiteMode2() ? 420 : 850,
        Math.min(isLiteMode2() ? 1e3 : 2100, Math.floor(area / densityDivisor))
      );
      for (let i = 0; i < starCount; i++) {
        const inBand = Math.random() < 0.58;
        const x = Math.random() * runtime.width;
        const y = inBand ? getGalaxyBandY(x) + randomBell2() * runtime.height * 0.105 : Math.random() * runtime.height;
        if (y < 0 || y > runtime.height) continue;
        const radiusRoll = Math.random();
        const star = {
          x,
          y,
          radius: radiusRoll > 0.985 ? 1.35 : 0.22 + Math.random() * 0.62,
          alpha: 0.2 + Math.random() * (inBand ? 0.66 : 0.48),
          hue: Math.random() < 0.82 ? 210 : Math.random() < 0.55 ? 42 : 4
        };
        drawStarPoint2(textureCtx, star);
      }
      textureCtx.globalCompositeOperation = "source-over";
      for (let i = 0; i < 170; i++) {
        const x = Math.random() * runtime.width;
        const y = getGalaxyBandY(x) + randomBell2() * runtime.height * 0.06;
        if (y < 0 || y > runtime.height) continue;
        textureCtx.fillStyle = `rgba(0,0,8,${0.035 + Math.random() * 0.08})`;
        textureCtx.beginPath();
        textureCtx.ellipse(
          x,
          y,
          8 + Math.random() * 34,
          2 + Math.random() * 9,
          -0.55 + randomBell2() * 0.18,
          0,
          Math.PI * 2
        );
        textureCtx.fill();
      }
      starfieldStars = Array.from({ length: isLiteMode2() ? 10 : 22 }, () => {
        const x = Math.random() * runtime.width;
        const nearBand = Math.random() < 0.66;
        return {
          x,
          y: nearBand ? Math.max(
            12,
            Math.min(
              runtime.height - 12,
              getGalaxyBandY(x) + randomBell2() * runtime.height * 0.13
            )
          ) : 12 + Math.random() * Math.max(1, runtime.height - 24),
          radius: 0.8 + Math.random() * 0.75,
          alpha: 0.44 + Math.random() * 0.34,
          hue: Math.random() < 0.78 ? 210 : 42,
          phase: Math.random() * Math.PI * 2,
          speed: 0.45 + Math.random() * 0.85
        };
      });
      starfieldSparkles = [];
      nextStarfieldSparkleAt = performance.now() / 1e3 + 0.8 + Math.random() * 1.6;
    }
    function drawStarfield(t) {
      if (theme !== "starfield") return;
      ctx.save();
      const driftX = Math.sin(t * 0.012) * 1.5;
      const driftY = Math.cos(t * 0.01) * 1.5;
      ctx.drawImage(
        starfieldTexture,
        driftX - 2,
        driftY - 2,
        runtime.width + 4,
        runtime.height + 4
      );
      ctx.globalCompositeOperation = "lighter";
      for (const star of starfieldStars) {
        const pulse = 0.72 + Math.sin(t * star.speed + star.phase) * 0.28;
        drawBrightStar2(ctx, star, star.alpha * pulse);
      }
      drawStarfieldSparkles(t);
      ctx.restore();
    }
    function drawStarfieldSparkles(t) {
      if (isLiteMode2()) return;
      if (t >= nextStarfieldSparkleAt && starfieldStars.length > 0) {
        const source = starfieldStars[Math.floor(Math.random() * starfieldStars.length)];
        starfieldSparkles.push({
          x: source.x,
          y: source.y,
          hue: Math.random() < 0.76 ? source.hue : 315,
          radius: source.radius * (1.25 + Math.random() * 0.75),
          start: t,
          duration: 0.48 + Math.random() * 0.34
        });
        nextStarfieldSparkleAt = t + 0.9 + Math.random() * 2.1;
      }
      compactInPlace(starfieldSparkles, (sparkle) => {
        const progress = (t - sparkle.start) / sparkle.duration;
        if (progress < 0 || progress >= 1) return false;
        const strength = Math.sin(progress * Math.PI);
        const length = sparkle.radius * (4 + strength * 5);
        const alpha = strength * 0.72;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = `hsla(${sparkle.hue},100%,92%,${alpha})`;
        ctx.fillStyle = `hsla(${sparkle.hue},100%,94%,${alpha})`;
        ctx.shadowColor = `hsla(${sparkle.hue},100%,72%,${alpha})`;
        ctx.shadowBlur = 8 + strength * 10;
        ctx.lineWidth = 0.65 + strength * 0.75;
        ctx.beginPath();
        ctx.moveTo(sparkle.x - length, sparkle.y);
        ctx.lineTo(sparkle.x + length, sparkle.y);
        ctx.moveTo(sparkle.x, sparkle.y - length * 0.72);
        ctx.lineTo(sparkle.x, sparkle.y + length * 0.72);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sparkle.x, sparkle.y, sparkle.radius * (0.7 + strength), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      });
    }
    return Object.freeze({ init: initStarfield, draw: drawStarfield });
  }

  // src/backgrounds/canvas-background-controller.js
  var RENDERER_FACTORIES = Object.freeze({
    starfield: createStarfieldRenderer,
    nebula: createNebulaRenderer,
    grid: createGridRenderer,
    gamecenter: createGameCenterRenderer,
    shrine: createShrineRenderer,
    nightview: createNightviewRenderer,
    matrix: createMatrixRenderer
  });
  function createCanvasBackgroundController({
    document: document2,
    window: window2,
    settings: settings2,
    themeManager: ThemeManager2,
    crtController: crtController2,
    isLiteMode: isLiteMode2,
    isMaxMode: isMaxMode2,
    prefersReducedMotion: prefersReducedMotion2,
    isAnswerResolved: isAnswerResolved2,
    requestFrame = requestAnimationFrame,
    cancelFrame = cancelAnimationFrame,
    setTimer = setTimeout,
    clearTimer = clearTimeout,
    performanceNow = () => performance.now()
  }) {
    let starRaf = null;
    let starFrameTimer = null;
    let starResizeHandler = null;
    let starVisibilityHandler = null;
    let starGeneration = 0;
    function injectArcadeStyles() {
      if (document2.getElementById("mm-arcade-styles")) return;
      const style = document2.createElement("style");
      style.id = "mm-arcade-styles";
      style.textContent = arcade_default;
      document2.head.appendChild(style);
    }
    function hasCanvasBackdrop(theme = settings2.backgroundTheme) {
      const resolved = ThemeManager2.getActiveTheme(theme);
      return resolved.background.allowCanvasEffects && CANVAS_BACKGROUND_THEMES.includes(resolved.background.renderer);
    }
    function hasShootingStars(theme = settings2.backgroundTheme) {
      const resolved = ThemeManager2.getActiveTheme(theme);
      return resolved.background.shootingStars && SHOOTING_STAR_THEMES.includes(resolved.id);
    }
    const shootingStars = createShootingStarSystem({
      window: window2,
      settings: settings2,
      isLiteMode: isLiteMode2,
      prefersReducedMotion: prefersReducedMotion2,
      isAnswerResolved: isAnswerResolved2,
      hasShootingStars
    });
    function stopArcadeBackdrop() {
      starGeneration++;
      if (starRaf) {
        cancelFrame(starRaf);
        starRaf = null;
      }
      if (starFrameTimer) {
        clearTimer(starFrameTimer);
        starFrameTimer = null;
      }
      if (starResizeHandler) {
        window2.removeEventListener("resize", starResizeHandler);
        starResizeHandler.cancel?.();
        starResizeHandler = null;
      }
      if (starVisibilityHandler) {
        document2.removeEventListener("visibilitychange", starVisibilityHandler);
        starVisibilityHandler = null;
      }
      shootingStars.clear();
      document2.getElementById("mm-starfield")?.remove();
    }
    function restartArcadeBackdrop2() {
      ThemeManager2.applyTheme(settings2.backgroundTheme, { persist: false });
      if (!settings2.visualsEnabled) return;
      stopArcadeBackdrop();
      syncArcadePresentation2();
    }
    function triggerShootingStar2() {
      return shootingStars.trigger();
    }
    function buildStarfield() {
      const currentRenderer = ThemeManager2.getActiveTheme().background.renderer;
      const isStaticImageTheme = currentRenderer === "shrine" || currentRenderer === "nightview";
      if (!hasCanvasBackdrop() || prefersReducedMotion2() && !isStaticImageTheme) {
        return;
      }
      document2.getElementById("mm-starfield")?.remove();
      const canvas = document2.createElement("canvas");
      canvas.id = "mm-starfield";
      document2.body.appendChild(canvas);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        canvas.remove();
        return;
      }
      const factory = RENDERER_FACTORIES[currentRenderer];
      if (!factory) {
        canvas.remove();
        return;
      }
      let width = 0;
      let height = 0;
      let lastRenderAt = 0;
      let nextFrameDue = 0;
      let frameScale = 1;
      const generation = ++starGeneration;
      const frameInterval = isLiteMode2() ? 1e3 / 12 : 1e3 / 60;
      const renderScale = isLiteMode2() ? 0.7 : 1;
      const pixelBudget = CANVAS_PIXEL_BUDGETS[settings2.performanceProfile] || CANVAS_PIXEL_BUDGETS.balanced;
      const shootingStarsEnabled = hasShootingStars(currentRenderer);
      function resize() {
        const size = calculateCanvasSize(window2.innerWidth, window2.innerHeight, {
          scale: renderScale,
          maxPixels: pixelBudget
        });
        width = canvas.width = size.width;
        height = canvas.height = size.height;
      }
      function createBackdropTexture() {
        const texture = document2.createElement("canvas");
        texture.width = width;
        texture.height = height;
        return texture;
      }
      const renderer = factory({
        ctx,
        theme: currentRenderer,
        document: document2,
        get width() {
          return width;
        },
        get height() {
          return height;
        },
        get frameScale() {
          return frameScale;
        },
        isLiteMode: isLiteMode2,
        prefersReducedMotion: prefersReducedMotion2,
        createBackdropTexture,
        randomBell,
        paintEllipticalGlow,
        drawStarPoint,
        drawBrightStar,
        requestRender: () => tick()
      });
      function scheduleNextFrame() {
        if (prefersReducedMotion2() || isLiteMode2() && isStaticImageTheme || document2.hidden) {
          return;
        }
        if (isLiteMode2()) {
          if (starFrameTimer) return;
          const delay = Math.max(0, frameInterval - (performanceNow() - lastRenderAt));
          starFrameTimer = setTimer(() => {
            starFrameTimer = null;
            if (!starRaf) starRaf = requestFrame(tick);
          }, delay);
        } else if (!starRaf) {
          starRaf = requestFrame(tick);
        }
      }
      function tick(now = performanceNow(), force = false) {
        starRaf = null;
        if (generation !== starGeneration) return;
        if (document2.hidden && !force) return;
        if (!force && !isLiteMode2() && !isMaxMode2()) {
          if (nextFrameDue && now + 0.5 < nextFrameDue) {
            scheduleNextFrame();
            return;
          }
          if (!nextFrameDue) nextFrameDue = now + frameInterval;
          while (nextFrameDue <= now) nextFrameDue += frameInterval;
        }
        const elapsed = lastRenderAt ? Math.min(100, now - lastRenderAt) : 1e3 / 60;
        frameScale = elapsed / (1e3 / 60);
        lastRenderAt = now;
        ctx.clearRect(0, 0, width, height);
        const time = now / 1e3;
        renderer.draw(time);
        if (shootingStarsEnabled && Math.random() < 25e-4 * frameScale) {
          triggerShootingStar2();
        }
        shootingStars.draw(ctx, frameScale);
        scheduleNextFrame();
      }
      starResizeHandler = debounce(() => {
        resize();
        renderer.init();
        if (prefersReducedMotion2() || isLiteMode2() && isStaticImageTheme) {
          tick();
        }
      }, 180);
      starVisibilityHandler = () => {
        if (document2.hidden) {
          if (starRaf) cancelFrame(starRaf);
          starRaf = null;
          if (starFrameTimer) clearTimer(starFrameTimer);
          starFrameTimer = null;
          return;
        }
        lastRenderAt = 0;
        nextFrameDue = 0;
        if (!starRaf) tick();
      };
      window2.addEventListener("resize", starResizeHandler);
      document2.addEventListener("visibilitychange", starVisibilityHandler);
      resize();
      renderer.init();
      tick();
    }
    function syncCrtEffects2() {
      const enabled = settings2.visualsEnabled && settings2.crtEnabled && !isLiteMode2();
      crtController2.sync({ enabled });
    }
    function arcadeOn(theme = ThemeManager2.getActiveTheme()) {
      if (!settings2.visualsEnabled) return;
      const resolved = isAnswerResolved2();
      injectArcadeStyles();
      document2.body.classList.add("mm-arcade");
      document2.body.classList.toggle("mm-arcade-resolved", resolved);
      document2.body.dataset.mmBg = theme.id;
      if (hasCanvasBackdrop()) {
        if (!document2.getElementById("mm-starfield")) buildStarfield();
      } else {
        stopArcadeBackdrop();
      }
      syncCrtEffects2();
    }
    function arcadeOff2() {
      document2.body.classList.remove("mm-arcade", "mm-arcade-resolved");
      crtController2.cleanup();
      delete document2.body.dataset.mmBg;
      stopArcadeBackdrop();
      ["mm-starfield", "mm-arcade-styles"].forEach((id) => document2.getElementById(id)?.remove());
    }
    function syncArcadePresentation2() {
      const theme = ThemeManager2.applyTheme(settings2.backgroundTheme, {
        persist: false
      });
      if (settings2.visualsEnabled) {
        arcadeOn(theme);
      } else {
        arcadeOff2();
      }
    }
    return Object.freeze({
      injectStyles: injectArcadeStyles,
      stop: stopArcadeBackdrop,
      restart: restartArcadeBackdrop2,
      hasCanvasBackdrop,
      hasShootingStars,
      triggerShootingStar: triggerShootingStar2,
      build: buildStarfield,
      syncCrtEffects: syncCrtEffects2,
      on: arcadeOn,
      off: arcadeOff2,
      sync: syncArcadePresentation2
    });
  }

  // src/adapters/audio-context.js
  var RUNNING = "running";
  var CLOSED = "closed";
  function defaultCreateContext() {
    const AudioContextConstructor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    return AudioContextConstructor ? new AudioContextConstructor() : null;
  }
  function report(onError, error, operation) {
    try {
      onError(error, operation);
    } catch {
    }
  }
  var AudioContextAdapter = class {
    constructor({ createContext = defaultCreateContext, onError = () => {
    } } = {}) {
      if (typeof createContext !== "function") {
        throw new TypeError("Audio context creation must be a function");
      }
      this.createContext = createContext;
      this.onError = onError;
      this.context = null;
      this.unlockAttempt = null;
      this.intentGeneration = 0;
      this.stateListeners = /* @__PURE__ */ new Set();
      this.removeStateListener = null;
    }
    get state() {
      return this.context?.state ?? "unavailable";
    }
    get currentContext() {
      return this.context;
    }
    get runningContext() {
      return this.context?.state === RUNNING ? this.context : null;
    }
    isRunning(context = this.context) {
      return Boolean(context && context === this.context && context.state === RUNNING);
    }
    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("Audio state listener must be a function");
      }
      this.stateListeners.add(listener);
      return () => this.stateListeners.delete(listener);
    }
    emitState(context) {
      if (context !== this.context) return;
      for (const listener of this.stateListeners) {
        try {
          listener(context.state, context);
        } catch (error) {
          report(this.onError, error, "state-listener");
        }
      }
    }
    attachContext(context) {
      this.removeStateListener?.();
      this.removeStateListener = null;
      this.context = context;
      if (context?.addEventListener && context?.removeEventListener) {
        const handleStateChange = () => this.emitState(context);
        context.addEventListener("statechange", handleStateChange);
        this.removeStateListener = () => context.removeEventListener("statechange", handleStateChange);
      }
    }
    getOrCreateContext() {
      if (this.context?.state === CLOSED) {
        this.attachContext(null);
        this.unlockAttempt = null;
      }
      if (this.context) return this.context;
      try {
        const context = this.createContext();
        if (!context) return null;
        this.attachContext(context);
        return context;
      } catch (error) {
        report(this.onError, error, "create");
        return null;
      }
    }
    unlock() {
      this.intentGeneration += 1;
      const context = this.getOrCreateContext();
      if (!context) return Promise.resolve(null);
      if (context.state === RUNNING) return Promise.resolve(context);
      if (this.unlockAttempt?.context === context) {
        return this.unlockAttempt.promise;
      }
      if (typeof context.resume !== "function") return Promise.resolve(null);
      let resumeResult;
      try {
        resumeResult = context.resume();
      } catch (error) {
        report(this.onError, error, "resume");
        return Promise.resolve(null);
      }
      const attempt = { context, promise: null };
      attempt.promise = Promise.resolve(resumeResult).then(() => this.isRunning(context) ? context : null).catch((error) => {
        report(this.onError, error, "resume");
        return null;
      }).finally(() => {
        if (this.unlockAttempt === attempt) this.unlockAttempt = null;
      });
      this.unlockAttempt = attempt;
      return attempt.promise;
    }
    suspend() {
      const intent = ++this.intentGeneration;
      const pendingUnlock = this.unlockAttempt?.promise ?? Promise.resolve();
      return pendingUnlock.then(async () => {
        if (intent !== this.intentGeneration) return false;
        const context = this.context;
        if (!context || context.state !== RUNNING) return false;
        if (typeof context.suspend !== "function") return false;
        try {
          await context.suspend();
          return context.state !== RUNNING;
        } catch (error) {
          report(this.onError, error, "suspend");
          return false;
        }
      });
    }
  };
  function createAudioContextAdapter(options) {
    return new AudioContextAdapter(options);
  }

  // src/adapters/marumori-dom.js
  var DOM_RESOLUTION = Object.freeze({
    UNKNOWN: "unknown",
    UNRESOLVED: "unresolved",
    CORRECT: "correct",
    INCORRECT: "incorrect"
  });
  var DEFAULT_SELECTORS = Object.freeze({
    reviewRoot: "[data-review-session], [data-review-root], [data-testid='review-session'], #time-me",
    questionPrompt: "#main .main_form, #main > span",
    inputWrapper: ".input-wrapper",
    counter: ".top_middle",
    progress: "progress, [role='progressbar']"
  });
  var CONTROL_NAMES = Object.freeze({
    rewind: /* @__PURE__ */ new Set(["undo", "redo", "rewind"]),
    submit: /* @__PURE__ */ new Set(["check", "submit"]),
    wrong: /* @__PURE__ */ new Set(["wrong"]),
    next: /* @__PURE__ */ new Set(["next", "continue"])
  });
  var CONTROL_ACTIONS = Object.freeze({
    rewind: /* @__PURE__ */ new Set(["undo", "redo", "rewind"]),
    submit: /* @__PURE__ */ new Set(["check", "submit", "answer"]),
    wrong: /* @__PURE__ */ new Set(["wrong", "incorrect"]),
    next: /* @__PURE__ */ new Set(["next", "continue"])
  });
  var QUESTION_ID_ATTRIBUTES = Object.freeze([
    "data-question-id",
    "data-review-id",
    "data-item-id",
    "data-item-key"
  ]);
  var QUESTION_LAYOUT_CLASSES = Object.freeze([
    "reading",
    "meaning",
    "unscramble",
    "fill-in-the-blank"
  ]);
  var SESSION_ID_ATTRIBUTES = Object.freeze(["data-review-session", "data-session-id"]);
  var HOST_DECORATION_CLASSES = /* @__PURE__ */ new Set(["mm-bounce", "mm-progress-glow"]);
  function normalizeText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  }
  function isUserscriptOwned(element) {
    let current = element;
    while (current?.nodeType === 1) {
      if (current.hasAttribute("data-mm-owned")) return true;
      if (current.id?.startsWith("mm-")) return true;
      if (current.localName !== "body" && [...current.classList].some(
        (className) => className.startsWith("mm-") && !HOST_DECORATION_CLASSES.has(className)
      )) {
        return true;
      }
      if (current.localName === "body") break;
      current = current.parentElement;
    }
    return false;
  }
  function defaultVisibilityCheck(element) {
    if (!element?.isConnected || element.hidden || element.closest("[hidden]")) {
      return false;
    }
    if (element.getAttribute("aria-hidden") === "true") return false;
    const view = element.ownerDocument?.defaultView;
    const style = view?.getComputedStyle?.(element);
    if (style?.display === "none" || style?.visibility === "hidden") return false;
    return element.getClientRects().length > 0;
  }
  function queryIncludingRoot(root, selector) {
    const matches = [];
    if (root.matches?.(selector)) matches.push(root);
    matches.push(...root.querySelectorAll(selector));
    return matches;
  }
  function unique(items) {
    return items.length === 1 ? items[0] : null;
  }
  function parseCounterText(text) {
    const match = String(text ?? "").match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
    if (!match) return null;
    const current = Number.parseInt(match[1], 10);
    const total = Number.parseInt(match[2], 10);
    if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) {
      return null;
    }
    if (current < 0 || current > total) return null;
    return { current, total, ratio: current / total };
  }
  function getControlName(control) {
    return normalizeText(
      control.getAttribute("aria-label") || control.getAttribute("title") || control.value || control.textContent
    );
  }
  function createMaruMoriDomAdapter({
    document: document2,
    selectors = {},
    isVisible = defaultVisibilityCheck
  } = {}) {
    if (!document2?.querySelectorAll) {
      throw new TypeError("A document is required by the MaruMori DOM adapter");
    }
    const resolvedSelectors = { ...DEFAULT_SELECTORS, ...selectors };
    const rootIds = /* @__PURE__ */ new WeakMap();
    const wrapperIds = /* @__PURE__ */ new WeakMap();
    let nextRootId = 1;
    let nextWrapperId = 1;
    function getGenerationId(element, ids, nextId) {
      let id = ids.get(element);
      if (!id) {
        id = nextId();
        ids.set(element, id);
      }
      return id;
    }
    function visibleSiteElements(root, selector) {
      return queryIncludingRoot(root, selector).filter(
        (element) => !isUserscriptOwned(element) && isVisible(element)
      );
    }
    function resolveContext() {
      const wrappers = visibleSiteElements(
        document2.documentElement,
        resolvedSelectors.inputWrapper
      );
      const wrapper = unique(wrappers);
      if (!wrapper) return null;
      const root = wrapper.closest(resolvedSelectors.reviewRoot);
      if (!root || isUserscriptOwned(root) || !isVisible(root) || !root.contains(wrapper)) {
        return null;
      }
      const currentWrappers = visibleSiteElements(root, resolvedSelectors.inputWrapper);
      if (unique(currentWrappers) !== wrapper) return null;
      return { root, wrapper };
    }
    function getActiveReviewRoot() {
      return resolveContext()?.root ?? null;
    }
    function getInputWrapper2() {
      return resolveContext()?.wrapper ?? null;
    }
    function getQuestionPrompt() {
      const context = resolveContext();
      if (!context) return null;
      return unique(visibleSiteElements(context.root, resolvedSelectors.questionPrompt));
    }
    function getSessionIdentity() {
      const root = resolveContext()?.root;
      if (!root) return null;
      for (const attribute of SESSION_ID_ATTRIBUTES) {
        const value = root.getAttribute(attribute)?.trim();
        if (value) return `${attribute}:${value}`;
      }
      return null;
    }
    function isValidAnswerInput(input, wrapper) {
      if (!input?.isConnected || !wrapper.contains(input) || isUserscriptOwned(input) || !isVisible(input) || input.disabled || input.readOnly || input.getAttribute("aria-disabled") === "true") {
        return false;
      }
      if (input.localName === "textarea") return true;
      if (input.localName !== "input") return false;
      return input.type === "text" || input.type === "search";
    }
    function getAnswerInput2() {
      const context = resolveContext();
      if (!context) return null;
      const inputs = [...context.wrapper.querySelectorAll("input, textarea")].filter(
        (input) => isValidAnswerInput(input, context.wrapper)
      );
      return unique(inputs);
    }
    function getCounterElementForContext(context) {
      const counters = visibleSiteElements(context.root, resolvedSelectors.counter).filter(
        (counter) => parseCounterText(counter.textContent)
      );
      return unique(counters);
    }
    function getCounterElement2() {
      const context = resolveContext();
      return context ? getCounterElementForContext(context) : null;
    }
    function getProgressForContext(context) {
      const counter = getCounterElementForContext(context);
      const parsedCounter = counter ? parseCounterText(counter.textContent) : null;
      if (parsedCounter) return { ...parsedCounter, element: counter };
      const progress = unique(visibleSiteElements(context.root, resolvedSelectors.progress));
      if (!progress) return null;
      const current = Number(progress.value ?? progress.getAttribute("aria-valuenow"));
      const total = Number(progress.max ?? progress.getAttribute("aria-valuemax"));
      if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) {
        return null;
      }
      return { current, total, ratio: current / total, element: progress };
    }
    function getProgress() {
      const context = resolveContext();
      return context ? getProgressForContext(context) : null;
    }
    function getResolvedStateForContext(context) {
      const correct = context.wrapper.classList.contains("correct");
      const incorrect = context.wrapper.classList.contains("incorrect");
      if (correct && incorrect) return DOM_RESOLUTION.UNKNOWN;
      if (correct) return DOM_RESOLUTION.CORRECT;
      if (incorrect) return DOM_RESOLUTION.INCORRECT;
      return DOM_RESOLUTION.UNRESOLVED;
    }
    function getResolvedState() {
      const context = resolveContext();
      return context ? getResolvedStateForContext(context) : DOM_RESOLUTION.UNKNOWN;
    }
    function getQuestionIdentityForContext(context, progress) {
      const layouts = QUESTION_LAYOUT_CLASSES.filter(
        (className) => context.wrapper.classList.contains(className)
      );
      if (layouts.length > 1) return null;
      const questionLayout = layouts[0] ?? null;
      const layoutIdentity = questionLayout ? `|layout:${questionLayout}` : "";
      const attributedElements = [context.wrapper, context.root];
      for (const selector of QUESTION_ID_ATTRIBUTES.map((attribute) => `[${attribute}]`)) {
        attributedElements.push(...context.root.querySelectorAll(selector));
      }
      const siteIds = [];
      for (const element of attributedElements) {
        if (isUserscriptOwned(element) || !isVisible(element)) continue;
        for (const attribute of QUESTION_ID_ATTRIBUTES) {
          const value = element.getAttribute?.(attribute)?.trim();
          if (value) siteIds.push(`${attribute}:${value}`);
        }
      }
      const distinctSiteIds = [...new Set(siteIds)];
      if (distinctSiteIds.length > 1) return null;
      if (distinctSiteIds.length === 1) {
        return Object.freeze({
          identityKind: "host",
          logicalQuestionIdentity: `host:${distinctSiteIds[0]}${layoutIdentity}`,
          questionLayout
        });
      }
      if (!progress) return null;
      const wrapperId = getGenerationId(context.wrapper, wrapperIds, () => nextWrapperId++);
      return Object.freeze({
        identityKind: "fallback",
        logicalQuestionIdentity: `fallback:wrapper:${wrapperId}${layoutIdentity}`,
        questionLayout
      });
    }
    function getDomGenerationForContext(context) {
      const rootId = getGenerationId(context.root, rootIds, () => nextRootId++);
      const wrapperId = getGenerationId(context.wrapper, wrapperIds, () => nextWrapperId++);
      return Object.freeze({
        domGeneration: `root:${rootId}|wrapper:${wrapperId}`,
        rootGeneration: rootId,
        wrapperGeneration: wrapperId
      });
    }
    function readQuestionContext() {
      const context = resolveContext();
      if (!context) return null;
      const progress = getProgressForContext(context);
      const identity = getQuestionIdentityForContext(context, progress);
      const resolution = getResolvedStateForContext(context);
      if (!progress || !identity || resolution === DOM_RESOLUTION.UNKNOWN) return null;
      const generation = getDomGenerationForContext(context);
      return Object.freeze({
        root: context.root,
        wrapper: context.wrapper,
        ...generation,
        ...identity,
        progress: Object.freeze({ ...progress }),
        resolution
      });
    }
    function getQuestionIdentity() {
      return readQuestionContext()?.logicalQuestionIdentity ?? null;
    }
    function getDomQuestionGeneration() {
      return readQuestionContext()?.domGeneration ?? null;
    }
    function controlCandidates(root) {
      return [
        ...root.querySelectorAll(
          "button, [role='button'], input[type='button'], input[type='submit']"
        )
      ].filter(
        (control) => !isUserscriptOwned(control) && isVisible(control) && !control.disabled && control.getAttribute("aria-disabled") !== "true"
      );
    }
    function getControl(kind) {
      const names = CONTROL_NAMES[kind];
      const actions = CONTROL_ACTIONS[kind];
      if (!names || !actions) return null;
      const context = resolveContext();
      if (!context) return null;
      const candidates = controlCandidates(context.root);
      const actionMatches = candidates.filter(
        (control) => actions.has(normalizeText(control.getAttribute("data-action")))
      );
      if (actionMatches.length === 1) return actionMatches[0];
      if (actionMatches.length > 1) return null;
      return unique(candidates.filter((control) => names.has(getControlName(control))));
    }
    function getCapability(kind) {
      const element = getControl(kind);
      if (!element) return null;
      const root = getActiveReviewRoot();
      return Object.freeze({
        kind,
        element,
        invoke() {
          if (getActiveReviewRoot() !== root || getControl(kind) !== element) {
            return false;
          }
          try {
            element.click();
            return true;
          } catch {
            return false;
          }
        }
      });
    }
    function setAnswerValue(input, value) {
      if (getAnswerInput2() !== input) return false;
      const view = input.ownerDocument.defaultView;
      const prototype = input.localName === "textarea" ? view?.HTMLTextAreaElement?.prototype : view?.HTMLInputElement?.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype ?? {}, "value")?.set;
      try {
        if (setter) setter.call(input, String(value));
        else input.value = String(value);
        input.dispatchEvent(new view.Event("input", { bubbles: true }));
        input.dispatchEvent(new view.Event("change", { bubbles: true }));
        return true;
      } catch {
        return false;
      }
    }
    function observeResolution(callback) {
      const wrapper = getInputWrapper2();
      const MutationObserver2 = document2.defaultView?.MutationObserver;
      if (!wrapper || !MutationObserver2) return () => {
      };
      const observer = new MutationObserver2(() => callback());
      observer.observe(wrapper, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    }
    function observeCounter2(callback) {
      const counter = getCounterElement2();
      const MutationObserver2 = document2.defaultView?.MutationObserver;
      if (!counter || !MutationObserver2) return () => {
      };
      const observer = new MutationObserver2(() => callback());
      observer.observe(counter, {
        childList: true,
        subtree: true,
        characterData: true
      });
      return () => observer.disconnect();
    }
    return Object.freeze({
      getActiveReviewRoot,
      getSessionIdentity,
      getInputWrapper: getInputWrapper2,
      getQuestionPrompt,
      getAnswerInput: getAnswerInput2,
      getCounterElement: getCounterElement2,
      getProgress,
      getResolvedState,
      getQuestionIdentity,
      getDomQuestionGeneration,
      readQuestionContext,
      getControl,
      getCapability,
      getNativeRewindCapability: () => getCapability("rewind"),
      setAnswerValue,
      observeResolution,
      observeCounter: observeCounter2,
      isUserscriptOwned
    });
  }

  // src/adapters/navigation.js
  var REVIEW_ROUTE_PATTERN = /^\/study-lists\/reviews(?:\/|$)/;
  var DEFAULT_WATCHDOG_INTERVAL_MS = 1e3;
  var MIN_WATCHDOG_INTERVAL_MS = 50;
  function noop() {
  }
  function isReviewPathname(pathname) {
    return REVIEW_ROUTE_PATTERN.test(String(pathname ?? ""));
  }
  function bindScheduler(scheduler) {
    const fallback = globalThis;
    const setTimeout2 = scheduler?.setTimeout ?? fallback.setTimeout;
    const clearTimeout2 = scheduler?.clearTimeout ?? fallback.clearTimeout;
    const queueMicrotask2 = scheduler?.queueMicrotask ?? fallback.queueMicrotask;
    if (typeof setTimeout2 !== "function" || typeof clearTimeout2 !== "function") {
      throw new TypeError("The navigation adapter requires timeout scheduling");
    }
    const scheduleTimeout = setTimeout2.bind(scheduler ?? fallback);
    return {
      setTimeout: scheduleTimeout,
      clearTimeout: clearTimeout2.bind(scheduler ?? fallback),
      queueMicrotask: typeof queueMicrotask2 === "function" ? queueMicrotask2.bind(scheduler ?? fallback) : (callback) => scheduleTimeout(callback, 0)
    };
  }
  function normalizeWatchdogInterval(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return DEFAULT_WATCHDOG_INTERVAL_MS;
    return Math.max(MIN_WATCHDOG_INTERVAL_MS, Math.round(number));
  }
  function classListContainsOwnedClass(element) {
    if (element?.localName === "body") return false;
    return [...element?.classList ?? []].some((className) => className.startsWith("mm-"));
  }
  function isUserscriptOwnedNode(node) {
    let element = node?.nodeType === 1 ? node : node?.parentElement;
    while (element?.nodeType === 1) {
      if (element.hasAttribute?.("data-mm-owned")) return true;
      if (element.id?.startsWith("mm-")) return true;
      if (classListContainsOwnedClass(element)) return true;
      if (element.localName === "body") break;
      element = element.parentElement;
    }
    return false;
  }
  function isUserscriptOnlyMutation(record) {
    if (!record) return true;
    if (isUserscriptOwnedNode(record.target)) return true;
    if (record.type !== "childList") return false;
    const changedNodes = [...record.addedNodes ?? [], ...record.removedNodes ?? []];
    return changedNodes.length > 0 && changedNodes.every(isUserscriptOwnedNode);
  }
  function replaceHistoryMethod(history2, methodName, onChange) {
    const original = history2?.[methodName];
    if (typeof original !== "function") return null;
    const ownDescriptor = Object.getOwnPropertyDescriptor(history2, methodName);
    const wrapped = function navigationHistoryWrapper(...args) {
      const result3 = Reflect.apply(original, this, args);
      onChange(methodName);
      return result3;
    };
    let installed = false;
    try {
      const descriptor = ownDescriptor && "value" in ownDescriptor ? { ...ownDescriptor, value: wrapped } : {
        configurable: ownDescriptor?.configurable ?? true,
        enumerable: ownDescriptor?.enumerable ?? false,
        value: wrapped,
        writable: true
      };
      Object.defineProperty(history2, methodName, descriptor);
      installed = history2[methodName] === wrapped;
    } catch {
      try {
        installed = Reflect.set(history2, methodName, wrapped) && history2[methodName] === wrapped;
      } catch {
        installed = false;
      }
    }
    if (!installed) return null;
    return Object.freeze({ methodName, original, ownDescriptor, wrapped });
  }
  function restoreHistoryMethod(history2, record) {
    if (!record || history2?.[record.methodName] !== record.wrapped) return;
    try {
      if (record.ownDescriptor) {
        Object.defineProperty(history2, record.methodName, record.ownDescriptor);
        return;
      }
      if (Reflect.deleteProperty(history2, record.methodName)) return;
    } catch {
    }
    try {
      Reflect.set(history2, record.methodName, record.original);
    } catch {
    }
  }
  function createNavigationAdapter({
    window: window2 = globalThis.window,
    document: document2 = window2?.document ?? globalThis.document,
    history: history2 = window2?.history ?? globalThis.history,
    location: location2 = window2?.location ?? globalThis.location,
    MutationObserver: MutationObserverConstructor = window2?.MutationObserver ?? globalThis.MutationObserver,
    URL: URLConstructor = window2?.URL ?? globalThis.URL,
    scheduler = window2 ?? globalThis,
    watchdogIntervalMs = DEFAULT_WATCHDOG_INTERVAL_MS,
    getObserverRoot = () => document2?.body ?? document2?.documentElement ?? null,
    onEnter = noop,
    onLeave = noop,
    onReconcile = noop
  } = {}) {
    if (typeof URLConstructor !== "function") {
      throw new TypeError("The navigation adapter requires a URL constructor");
    }
    if (typeof getObserverRoot !== "function") {
      throw new TypeError("getObserverRoot must be a function");
    }
    const tasks = bindScheduler(scheduler);
    const watchdogDelay = normalizeWatchdogInterval(watchdogIntervalMs);
    let started = false;
    let generation = 0;
    let routeRelevant = false;
    let currentUrl = null;
    let popstateListener = null;
    let historyRecords = [];
    let watchdogTimer = null;
    let observer = null;
    let observerRoot = null;
    let observerGeneration = 0;
    let reconcileGeneration = 0;
    let reconcilePending = false;
    const reconcileReasons = /* @__PURE__ */ new Set();
    function readCurrentUrl() {
      try {
        const href = location2?.href ?? location2?.pathname ?? "/";
        const base = location2?.origin ? `${location2.origin}/` : "https://marumori.invalid/";
        const parsed = new URLConstructor(String(href), base);
        return Object.freeze({ href: parsed.href, pathname: parsed.pathname });
      } catch {
        return null;
      }
    }
    function callbackContext(source, url = currentUrl) {
      return Object.freeze({
        generation,
        pathname: url?.pathname ?? null,
        source,
        url: url?.href ?? null
      });
    }
    function cancelPendingReconcile() {
      reconcileGeneration += 1;
      reconcilePending = false;
      reconcileReasons.clear();
    }
    function requestReconcile(reason = "mutation") {
      if (!started || !routeRelevant) return false;
      reconcileReasons.add(reason);
      if (reconcilePending) return true;
      reconcilePending = true;
      const scheduledGeneration = generation;
      const scheduledReconcileGeneration = reconcileGeneration;
      tasks.queueMicrotask(() => {
        if (!started || !routeRelevant || generation !== scheduledGeneration || reconcileGeneration !== scheduledReconcileGeneration || !reconcilePending) {
          return;
        }
        reconcilePending = false;
        const reasons = [...reconcileReasons];
        reconcileReasons.clear();
        onReconcile(
          Object.freeze({
            ...callbackContext(reasons[0] ?? "mutation"),
            reasons: Object.freeze(reasons),
            root: observerRoot
          })
        );
      });
      return true;
    }
    function disconnectObserver() {
      observerGeneration += 1;
      try {
        observer?.disconnect();
      } finally {
        observer = null;
        observerRoot = null;
      }
    }
    function ensureObserver({ notify = false } = {}) {
      if (!started || !routeRelevant || typeof MutationObserverConstructor !== "function") {
        disconnectObserver();
        return false;
      }
      let nextRoot = null;
      try {
        nextRoot = getObserverRoot();
      } catch {
        nextRoot = null;
      }
      if (!nextRoot) {
        disconnectObserver();
        return false;
      }
      if (observer && observerRoot === nextRoot && observerRoot.isConnected !== false) {
        return false;
      }
      const previousRoot = observerRoot;
      disconnectObserver();
      const scheduledGeneration = generation;
      const scheduledObserverGeneration = observerGeneration;
      let nextObserver;
      try {
        nextObserver = new MutationObserverConstructor((records2 = []) => {
          if (!started || !routeRelevant || generation !== scheduledGeneration || observerGeneration !== scheduledObserverGeneration || observer !== nextObserver) {
            return;
          }
          if (records2.length > 0 && records2.every(isUserscriptOnlyMutation)) return;
          requestReconcile("mutation");
        });
        nextObserver.observe(nextRoot, {
          attributes: true,
          childList: true,
          subtree: true
        });
        observer = nextObserver;
        observerRoot = nextRoot;
      } catch {
        try {
          nextObserver?.disconnect();
        } catch {
        }
        observer = null;
        observerRoot = null;
        return false;
      }
      const rootChanged = previousRoot !== null && previousRoot !== nextRoot;
      if (notify && rootChanged) requestReconcile("observer-root");
      return rootChanged;
    }
    function checkRoute(source) {
      if (!started) return false;
      const nextUrl = readCurrentUrl();
      if (!nextUrl) {
        if (routeRelevant) ensureObserver({ notify: true });
        return false;
      }
      const previousUrl = currentUrl;
      const urlChanged = previousUrl?.href !== nextUrl.href;
      const nextRelevant = isReviewPathname(nextUrl.pathname);
      currentUrl = nextUrl;
      if (nextRelevant !== routeRelevant) {
        routeRelevant = nextRelevant;
        cancelPendingReconcile();
        if (routeRelevant) {
          ensureObserver();
          onEnter(callbackContext(source, nextUrl));
        } else {
          disconnectObserver();
          onLeave(
            Object.freeze({
              ...callbackContext(source, nextUrl),
              previousUrl: previousUrl?.href ?? null
            })
          );
        }
        return true;
      }
      if (routeRelevant) {
        ensureObserver({ notify: true });
        if (urlChanged && previousUrl) requestReconcile("navigation");
      }
      return urlChanged;
    }
    function scheduleWatchdog(scheduledGeneration) {
      if (!started || generation !== scheduledGeneration) return;
      watchdogTimer = tasks.setTimeout(() => {
        watchdogTimer = null;
        if (!started || generation !== scheduledGeneration) return;
        try {
          checkRoute("watchdog");
        } finally {
          scheduleWatchdog(scheduledGeneration);
        }
      }, watchdogDelay);
    }
    function start() {
      if (started) return false;
      started = true;
      generation += 1;
      const startedGeneration = generation;
      const historyChanged = (methodName) => {
        if (!started || generation !== startedGeneration) return;
        checkRoute(methodName);
      };
      historyRecords = ["pushState", "replaceState"].map((methodName) => replaceHistoryMethod(history2, methodName, historyChanged)).filter(Boolean);
      popstateListener = () => {
        if (!started || generation !== startedGeneration) return;
        checkRoute("popstate");
      };
      window2?.addEventListener?.("popstate", popstateListener);
      checkRoute("start");
      scheduleWatchdog(startedGeneration);
      return true;
    }
    function stop() {
      if (!started) return false;
      const shouldLeave = routeRelevant;
      const leaveUrl = currentUrl;
      started = false;
      generation += 1;
      routeRelevant = false;
      cancelPendingReconcile();
      disconnectObserver();
      if (watchdogTimer !== null) tasks.clearTimeout(watchdogTimer);
      watchdogTimer = null;
      window2?.removeEventListener?.("popstate", popstateListener);
      popstateListener = null;
      for (const record of [...historyRecords].reverse()) restoreHistoryMethod(history2, record);
      historyRecords = [];
      currentUrl = null;
      if (shouldLeave) onLeave(callbackContext("stop", leaveUrl));
      return true;
    }
    return Object.freeze({
      cleanup: stop,
      requestReconcile,
      start,
      stop,
      get currentUrl() {
        return currentUrl?.href ?? null;
      },
      get isReviewRoute() {
        return routeRelevant;
      },
      get isStarted() {
        return started;
      },
      get observedRoot() {
        return observerRoot;
      }
    });
  }

  // src/utils/json.js
  function safeJsonParse(value, fallback = {}) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  // src/adapters/userscript-storage.js
  function createUserscriptStorage({ getValue, setValue } = {}) {
    if (typeof getValue !== "function" || typeof setValue !== "function") {
      throw new TypeError("Userscript storage requires synchronous getValue and setValue");
    }
    function get(key, fallback = null) {
      try {
        const value = getValue(key, fallback);
        return value === void 0 ? fallback : value;
      } catch {
        return fallback;
      }
    }
    function set(key, value) {
      try {
        setValue(key, value);
        return true;
      } catch {
        return false;
      }
    }
    function getJson(key, fallback = {}) {
      const value = get(key, null);
      if (value === null || value === void 0) return fallback;
      if (typeof value === "string") return safeJsonParse(value, fallback);
      return value && typeof value === "object" ? value : fallback;
    }
    function setJson(key, value) {
      try {
        return set(key, JSON.stringify(value));
      } catch {
        return false;
      }
    }
    return Object.freeze({ get, set, getJson, setJson, getValue: get, setValue: set });
  }

  // src/audio/lifecycle.js
  var RUNNING2 = "running";
  function outcome(ok, status, reason) {
    return Object.freeze({ ok, status, reason });
  }
  function defaultScheduler() {
    return globalThis;
  }
  function createAudioLifecycle({
    audio,
    music,
    sfx = null,
    target = globalThis.document,
    scheduler,
    isHidden = () => Boolean(target?.hidden),
    gestureEvents = ["pointerdown", "keydown"],
    suspendDelayMs = 260,
    hiddenFadeSeconds = 0.2,
    cleanupFadeSeconds = 0,
    shouldArmUnlock = () => true,
    onError = () => {
    }
  } = {}) {
    if (!audio?.unlock || !audio?.suspend || !audio?.subscribe) {
      throw new TypeError("Audio lifecycle requires an audio context adapter");
    }
    if (!music?.start || !music?.stop) {
      throw new TypeError("Audio lifecycle requires a music controller");
    }
    if (!target?.addEventListener || !target?.removeEventListener) {
      throw new TypeError("Audio lifecycle target must be an EventTarget");
    }
    const clock = scheduler ?? defaultScheduler();
    let installed = false;
    let gestureArmed = false;
    let gestureHandler = null;
    let unlocking = false;
    let generation = 0;
    let startAttempt = null;
    let suspendTimer = null;
    let removeAudioStateListener = null;
    let removeMusicBlockedListener = null;
    let removeSfxBlockedListener = null;
    function warn(error, operation) {
      try {
        onError(error, operation);
      } catch {
      }
    }
    function hidden() {
      try {
        return Boolean(isHidden());
      } catch (error) {
        warn(error, "visibility");
        return true;
      }
    }
    function unlockIsRelevant() {
      try {
        return Boolean(shouldArmUnlock());
      } catch (error) {
        warn(error, "unlock-eligibility");
        return false;
      }
    }
    function clearSuspendTimer() {
      if (suspendTimer === null) return;
      clock.clearTimeout(suspendTimer);
      suspendTimer = null;
    }
    function armGestureUnlock() {
      if (!installed || hidden() || gestureArmed || audio.runningContext || !unlockIsRelevant()) {
        return false;
      }
      gestureHandler = () => {
        void resume();
      };
      for (const eventType of gestureEvents) {
        target.addEventListener(eventType, gestureHandler, true);
      }
      gestureArmed = true;
      return true;
    }
    function disarmGestureUnlock() {
      if (!gestureArmed) return false;
      for (const eventType of gestureEvents) {
        target.removeEventListener(eventType, gestureHandler, true);
      }
      gestureArmed = false;
      gestureHandler = null;
      return true;
    }
    function handleAudioState(state2) {
      if (!installed || hidden()) return;
      if (state2 === RUNNING2) {
        if (!unlocking) {
          disarmGestureUnlock();
          void music.start({ context: audio.runningContext });
        }
      } else {
        armGestureUnlock();
      }
    }
    function scheduleSuspend(delay = suspendDelayMs) {
      clearSuspendTimer();
      const ownerGeneration = generation;
      suspendTimer = clock.setTimeout(
        () => {
          suspendTimer = null;
          if (ownerGeneration !== generation) return;
          void audio.suspend();
        },
        Math.max(0, delay)
      );
    }
    function resume() {
      if (!installed) {
        return Promise.resolve(outcome(false, "cancelled", "not-installed"));
      }
      if (hidden()) {
        return Promise.resolve(outcome(false, "skipped", "hidden"));
      }
      clearSuspendTimer();
      if (startAttempt) return startAttempt;
      const ownerGeneration = generation;
      const wasRunning = Boolean(audio.runningContext);
      unlocking = !wasRunning;
      let ready;
      try {
        ready = audio.unlock();
      } catch (error) {
        unlocking = false;
        warn(error, "unlock");
        armGestureUnlock();
        return Promise.resolve(outcome(false, "blocked", "unlock-error"));
      }
      const attempt = Promise.resolve(ready).then(async (context) => {
        if (!installed || ownerGeneration !== generation || hidden()) {
          return outcome(false, "cancelled", "stale-owner");
        }
        unlocking = false;
        if (!context || context.state !== RUNNING2 || !audio.isRunning(context)) {
          armGestureUnlock();
          return outcome(false, "blocked", "context-not-running");
        }
        disarmGestureUnlock();
        await music.start({ context });
        if (!installed || ownerGeneration !== generation || hidden()) {
          return outcome(false, "cancelled", "stale-owner");
        }
        if (!audio.isRunning(context)) {
          armGestureUnlock();
          return outcome(false, "blocked", "context-not-running");
        }
        return outcome(true, "ready", "audio-running");
      }).catch((error) => {
        warn(error, "resume");
        if (installed && ownerGeneration === generation) {
          unlocking = false;
          armGestureUnlock();
        }
        return outcome(false, "blocked", "unlock-error");
      }).finally(() => {
        if (startAttempt === attempt) {
          unlocking = false;
          startAttempt = null;
        }
      });
      startAttempt = attempt;
      return attempt;
    }
    function handleVisibilityChange() {
      if (!installed) return;
      if (hidden()) {
        generation += 1;
        startAttempt = null;
        unlocking = false;
        clearSuspendTimer();
        music.stop({ fadeSeconds: hiddenFadeSeconds });
        sfx?.cancel?.();
        scheduleSuspend();
        return;
      }
      clearSuspendTimer();
      if (audio.runningContext) void resume();
      else armGestureUnlock();
    }
    function install({ start = false } = {}) {
      if (installed) {
        if (start && audio.runningContext) void resume();
        else if (start) armGestureUnlock();
        return false;
      }
      installed = true;
      generation += 1;
      target.addEventListener("visibilitychange", handleVisibilityChange);
      removeAudioStateListener = audio.subscribe(handleAudioState);
      removeMusicBlockedListener = music.onNeedsUnlock?.(armGestureUnlock) ?? null;
      removeSfxBlockedListener = sfx?.onNeedsUnlock?.(armGestureUnlock) ?? null;
      if (!hidden()) {
        if (audio.runningContext) disarmGestureUnlock();
        else armGestureUnlock();
        if (start && audio.runningContext) void resume();
      }
      return true;
    }
    function cleanup2({ suspend = true } = {}) {
      if (!installed) return false;
      installed = false;
      generation += 1;
      startAttempt = null;
      unlocking = false;
      clearSuspendTimer();
      disarmGestureUnlock();
      target.removeEventListener("visibilitychange", handleVisibilityChange);
      removeAudioStateListener?.();
      removeAudioStateListener = null;
      removeMusicBlockedListener?.();
      removeMusicBlockedListener = null;
      removeSfxBlockedListener?.();
      removeSfxBlockedListener = null;
      music.stop({ fadeSeconds: cleanupFadeSeconds, resetPattern: true });
      sfx?.cancel?.();
      if (suspend) void audio.suspend();
      return true;
    }
    function dispose() {
      cleanup2();
      music.dispose?.();
      sfx?.dispose?.();
    }
    return Object.freeze({
      install,
      installMusicLifecycle: install,
      cleanup: cleanup2,
      uninstallMusicLifecycle: cleanup2,
      resume,
      armGestureUnlock,
      disarmGestureUnlock,
      scheduleSuspend,
      dispose,
      get isInstalled() {
        return installed;
      },
      get isGestureArmed() {
        return gestureArmed;
      }
    });
  }

  // src/audio/music.js
  var RUNNING3 = "running";
  function outcome2(ok, status, reason, extra = {}) {
    return Object.freeze({ ok, status, reason, ...extra });
  }
  function defaultScheduler2() {
    return globalThis;
  }
  function normalizeVolume(value) {
    const volume = Number(value);
    return Number.isFinite(volume) ? Math.max(0, volume) : 0;
  }
  function defaultCreateDestination({ context, volume, fadeInSeconds }) {
    const destination = context.createGain();
    destination.gain.setValueAtTime(0, context.currentTime);
    if (fadeInSeconds > 0) {
      destination.gain.linearRampToValueAtTime(volume, context.currentTime + fadeInSeconds);
    } else {
      destination.gain.setValueAtTime(volume, context.currentTime);
    }
    destination.connect(context.destination);
    return destination;
  }
  function createMusicController({
    audio,
    scheduler,
    schedulePattern,
    createDestination = defaultCreateDestination,
    stopScheduled = () => {
    },
    isEnabled = () => true,
    isSessionActive = () => true,
    isLiteMode: isLiteMode2 = () => false,
    isVisible = () => true,
    getVolume = () => 1,
    fadeInSeconds = 0.7,
    startLeadSeconds = 0.08,
    scheduleOverlapSeconds = 0.12,
    minimumScheduleDelayMs = 100,
    restartDelayMs = 180,
    onError = () => {
    }
  } = {}) {
    if (!audio?.unlock || !audio?.isRunning) {
      throw new TypeError("Music requires an audio context adapter");
    }
    if (typeof schedulePattern !== "function") {
      throw new TypeError("Music requires a pattern scheduler");
    }
    const clock = scheduler ?? defaultScheduler2();
    const blockedListeners = /* @__PURE__ */ new Set();
    const retiredDestinations = /* @__PURE__ */ new Map();
    let generation = 0;
    let patternIndex = 0;
    let destination = null;
    let activeContext = null;
    let scheduleTimer = null;
    let restartTimer = null;
    let startAttempt = null;
    let disposed = false;
    function warn(error, operation) {
      try {
        onError(error, operation);
      } catch {
      }
    }
    function notifyNeedsUnlock(reason) {
      for (const listener of blockedListeners) {
        try {
          listener(reason);
        } catch (error) {
          warn(error, "blocked-listener");
        }
      }
    }
    function onNeedsUnlock(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("Music blocked listener must be a function");
      }
      blockedListeners.add(listener);
      return () => blockedListeners.delete(listener);
    }
    function eligibility() {
      if (disposed) return "disposed";
      if (!isEnabled()) return "disabled";
      if (isLiteMode2()) return "lite-mode";
      if (!isSessionActive()) return "inactive-session";
      if (!isVisible()) return "hidden";
      if (normalizeVolume(getVolume()) <= 0) return "zero-volume";
      return null;
    }
    function clearTimer(name) {
      const timer = name === "schedule" ? scheduleTimer : restartTimer;
      if (timer === null) return;
      clock.clearTimeout(timer);
      if (name === "schedule") scheduleTimer = null;
      else restartTimer = null;
    }
    function disconnectNow(node) {
      const timer = retiredDestinations.get(node);
      if (timer !== void 0) {
        clock.clearTimeout(timer);
        retiredDestinations.delete(node);
      }
      try {
        node?.disconnect?.();
      } catch (error) {
        warn(error, "disconnect");
      }
    }
    function retireDestination(node, context, fadeSeconds) {
      if (!node) return;
      if (fadeSeconds <= 0 || !audio.isRunning(context) || !node.gain) {
        disconnectNow(node);
        return;
      }
      const now = context.currentTime;
      try {
        node.gain.cancelScheduledValues(now);
        node.gain.setValueAtTime(node.gain.value, now);
        node.gain.linearRampToValueAtTime(0, now + fadeSeconds);
      } catch (error) {
        warn(error, "fade-out");
        disconnectNow(node);
        return;
      }
      const timer = clock.setTimeout(
        () => {
          retiredDestinations.delete(node);
          disconnectNow(node);
        },
        (fadeSeconds + 0.1) * 1e3
      );
      retiredDestinations.set(node, timer);
    }
    function stop(options = {}) {
      const { fadeSeconds = 0.35, resetPattern = false } = typeof options === "number" ? { fadeSeconds: options } : options;
      generation += 1;
      startAttempt = null;
      clearTimer("schedule");
      clearTimer("restart");
      const oldDestination = destination;
      const oldContext = activeContext;
      destination = null;
      activeContext = null;
      if (resetPattern) patternIndex = 0;
      if (fadeSeconds <= 0) {
        for (const node of [...retiredDestinations.keys()]) disconnectNow(node);
      }
      if (oldDestination) {
        try {
          stopScheduled({
            context: oldContext,
            destination: oldDestination,
            fadeSeconds
          });
        } catch (error) {
          warn(error, "stop-scheduled");
        }
        retireDestination(oldDestination, oldContext, fadeSeconds);
      }
      return Boolean(oldDestination);
    }
    function blockForReadiness(reason) {
      stop({ fadeSeconds: 0 });
      notifyNeedsUnlock(reason);
      return outcome2(false, "blocked", reason);
    }
    function scheduleNext(ownerGeneration) {
      if (ownerGeneration !== generation || !destination || !activeContext) {
        return outcome2(false, "cancelled", "stale-owner");
      }
      const ineligible = eligibility();
      if (ineligible) {
        stop({ fadeSeconds: ineligible === "hidden" ? 0 : 0.15 });
        return outcome2(false, "skipped", ineligible);
      }
      if (activeContext.state !== RUNNING3 || !audio.isRunning(activeContext)) {
        return blockForReadiness("context-not-running");
      }
      const volume = normalizeVolume(getVolume());
      let scheduled;
      try {
        scheduled = schedulePattern({
          context: activeContext,
          destination,
          start: activeContext.currentTime + startLeadSeconds,
          patternIndex,
          volume
        });
      } catch (error) {
        warn(error, "schedule-pattern");
        stop({ fadeSeconds: 0 });
        return outcome2(false, "failed", "scheduler-error");
      }
      const duration = Number(typeof scheduled === "number" ? scheduled : scheduled?.duration);
      if (!Number.isFinite(duration) || duration <= 0) {
        stop({ fadeSeconds: 0 });
        return outcome2(false, "failed", "invalid-pattern-duration");
      }
      patternIndex += 1;
      const delay = Math.max(minimumScheduleDelayMs, (duration - scheduleOverlapSeconds) * 1e3);
      scheduleTimer = clock.setTimeout(() => {
        scheduleTimer = null;
        scheduleNext(ownerGeneration);
      }, delay);
      return outcome2(true, "scheduled", "pattern-scheduled", { duration });
    }
    function start({ context: suppliedContext } = {}) {
      const ineligible = eligibility();
      if (ineligible) {
        if (destination) stop({ fadeSeconds: 0.15 });
        return Promise.resolve(outcome2(false, "skipped", ineligible));
      }
      if (destination && activeContext && activeContext.state === RUNNING3 && audio.isRunning(activeContext)) {
        return Promise.resolve(outcome2(true, "playing", "already-started"));
      }
      if (startAttempt) return startAttempt;
      const ownerGeneration = ++generation;
      const readyContext = suppliedContext && audio.isRunning(suppliedContext) ? Promise.resolve(suppliedContext) : audio.unlock();
      const attempt = Promise.resolve(readyContext).then((context) => {
        if (disposed || ownerGeneration !== generation) {
          return outcome2(false, "cancelled", "stale-owner");
        }
        const currentIneligible = eligibility();
        if (currentIneligible) {
          return outcome2(false, "skipped", currentIneligible);
        }
        if (!context || context.state !== RUNNING3 || !audio.isRunning(context)) {
          notifyNeedsUnlock("context-not-running");
          return outcome2(false, "blocked", "context-not-running");
        }
        const volume = normalizeVolume(getVolume());
        try {
          destination = createDestination({
            context,
            volume,
            fadeInSeconds
          });
        } catch (error) {
          warn(error, "create-destination");
          destination = null;
          return outcome2(false, "failed", "destination-error");
        }
        if (!destination || !audio.isRunning(context)) {
          disconnectNow(destination);
          destination = null;
          notifyNeedsUnlock("context-not-running");
          return outcome2(false, "blocked", "context-not-running");
        }
        activeContext = context;
        const scheduled = scheduleNext(ownerGeneration);
        if (!scheduled.ok) return scheduled;
        return outcome2(true, "playing", "started");
      }).finally(() => {
        if (startAttempt === attempt) startAttempt = null;
      });
      startAttempt = attempt;
      return attempt;
    }
    function restart({ fadeSeconds = 0.15 } = {}) {
      stop({ fadeSeconds, resetPattern: true });
      if (eligibility()) return false;
      const ownerGeneration = generation;
      restartTimer = clock.setTimeout(() => {
        restartTimer = null;
        if (ownerGeneration === generation) void start();
      }, restartDelayMs);
      return true;
    }
    function sync() {
      const ineligible = eligibility();
      if (ineligible) {
        stop({ fadeSeconds: 0.15 });
        return Promise.resolve(outcome2(false, "skipped", ineligible));
      }
      return start();
    }
    function setVolume(value = getVolume()) {
      const volume = normalizeVolume(value);
      if (volume <= 0) {
        stop({ fadeSeconds: 0.1 });
        return false;
      }
      if (!destination || !activeContext || !audio.isRunning(activeContext)) {
        return false;
      }
      try {
        destination.gain.setTargetAtTime(volume, activeContext.currentTime, 0.03);
        return true;
      } catch (error) {
        warn(error, "set-volume");
        return false;
      }
    }
    function dispose() {
      if (disposed) return;
      stop({ fadeSeconds: 0, resetPattern: true });
      disposed = true;
      for (const node of [...retiredDestinations.keys()]) disconnectNow(node);
      blockedListeners.clear();
    }
    return Object.freeze({
      start,
      startMusic: start,
      stop,
      stopMusic: stop,
      restart,
      restartMusic: restart,
      sync,
      setVolume,
      onNeedsUnlock,
      dispose,
      get isPlaying() {
        return Boolean(destination);
      },
      get currentPatternIndex() {
        return patternIndex;
      }
    });
  }

  // src/audio/policy.js
  function isAudible(enabled, volume) {
    return Boolean(enabled) && Number(volume) > 0;
  }
  function syncAudioPolicy({
    lifecycle: lifecycle2,
    sfx,
    sfxEnabled,
    sfxVolume,
    musicEnabled,
    musicVolume,
    consumeGesture = false
  }) {
    const sfxAudible = isAudible(sfxEnabled, sfxVolume);
    const musicAudible = isAudible(musicEnabled, musicVolume);
    if (!sfxAudible) sfx?.cancel?.();
    if (!sfxAudible && !musicAudible) {
      lifecycle2.disarmGestureUnlock();
      return "inaudible";
    }
    if (consumeGesture) {
      void lifecycle2.resume();
      return "resuming";
    }
    lifecycle2.armGestureUnlock();
    return "armed";
  }

  // src/audio/sfx.js
  var RUNNING4 = "running";
  function outcome3(ok, status, reason, extra = {}) {
    return Object.freeze({ ok, status, reason, ...extra });
  }
  function normalizeVolume2(value) {
    const volume = Number(value);
    return Number.isFinite(volume) ? Math.max(0, volume) : 0;
  }
  function createSfxPlayer({
    audio,
    scheduleSfx,
    isEnabled = () => true,
    getVolume = () => 1,
    onError = () => {
    },
    stopScheduled = () => {
    }
  } = {}) {
    if (!audio?.unlock || !audio?.isRunning) {
      throw new TypeError("Sound effects require an audio context adapter");
    }
    if (typeof scheduleSfx !== "function") {
      throw new TypeError("Sound effects require an injected scheduler");
    }
    const blockedListeners = /* @__PURE__ */ new Set();
    let generation = 0;
    let disposed = false;
    function warn(error, operation) {
      try {
        onError(error, operation);
      } catch {
      }
    }
    function notifyNeedsUnlock() {
      for (const listener of blockedListeners) {
        try {
          listener("context-not-running");
        } catch (error) {
          warn(error, "blocked-listener");
        }
      }
    }
    function onNeedsUnlock(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("SFX blocked listener must be a function");
      }
      blockedListeners.add(listener);
      return () => blockedListeners.delete(listener);
    }
    function schedule(context, eventType, eventContext, ownerGeneration) {
      if (disposed || ownerGeneration !== generation) {
        return outcome3(false, "cancelled", "stale-owner");
      }
      if (!isEnabled()) return outcome3(false, "skipped", "disabled");
      const volume = normalizeVolume2(getVolume());
      if (volume <= 0) return outcome3(false, "skipped", "zero-volume");
      if (!context || context.state !== RUNNING4 || !audio.isRunning(context)) {
        notifyNeedsUnlock();
        return outcome3(false, "blocked", "context-not-running");
      }
      try {
        const scheduled = scheduleSfx({
          context,
          destination: context.destination,
          eventType,
          eventContext,
          volume
        });
        return outcome3(true, "scheduled", "sfx-scheduled", { scheduled });
      } catch (error) {
        warn(error, "schedule-sfx");
        return outcome3(false, "failed", "scheduler-error");
      }
    }
    function play(eventType, eventContext = {}) {
      if (disposed) {
        return Promise.resolve(outcome3(false, "cancelled", "disposed"));
      }
      if (!isEnabled()) {
        return Promise.resolve(outcome3(false, "skipped", "disabled"));
      }
      if (normalizeVolume2(getVolume()) <= 0) {
        return Promise.resolve(outcome3(false, "skipped", "zero-volume"));
      }
      const ownerGeneration = generation;
      const runningContext = audio.runningContext;
      if (runningContext) {
        return Promise.resolve(
          schedule(runningContext, eventType, eventContext, ownerGeneration)
        );
      }
      const ready = audio.unlock();
      return Promise.resolve(ready).then(
        (context) => schedule(context, eventType, eventContext, ownerGeneration)
      );
    }
    function cancel() {
      generation += 1;
      try {
        stopScheduled();
      } catch (error) {
        warn(error, "stop-scheduled");
      }
    }
    function dispose() {
      if (disposed) return;
      cancel();
      disposed = true;
      blockedListeners.clear();
    }
    return Object.freeze({
      play,
      playThemeSound: play,
      cancel,
      onNeedsUnlock,
      dispose
    });
  }

  // src/audio/theme-music-scheduler.js
  function createThemeMusicScheduler({
    getMusicStyle = () => "lofi",
    isLiteMode: isLiteMode2 = () => false
  } = {}) {
    const musicOscillators = /* @__PURE__ */ new Set();
    function getScaleFrequency(root, degree) {
      const index = (degree % NOTE_RATIOS.length + NOTE_RATIOS.length) % NOTE_RATIOS.length;
      const octave = Math.floor(degree / NOTE_RATIOS.length);
      return root * NOTE_RATIOS[index] * Math.pow(2, octave);
    }
    function scheduleThemeMusicNote(ctx, destination, frequency, start, duration, preset, options = {}) {
      const volumeScale = clamp(preset.volumeScale, 0.05, 1.4, 1);
      scheduleMusicNote(ctx, destination, frequency, start, duration, {
        type: options.type || preset.type || "triangle",
        volume: (options.volume || 0.03) * volumeScale,
        cutoff: options.cutoff || preset.cutoff || 1400,
        detune: options.detune || 0
      });
    }
    function scheduleMusicNote(ctx, destination, frequency, start, duration, options = {}) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      musicOscillators.add(osc);
      osc.addEventListener("ended", () => musicOscillators.delete(osc), { once: true });
      osc.type = options.type || "triangle";
      osc.frequency.setValueAtTime(frequency, start);
      if (options.detune) osc.detune.setValueAtTime(options.detune, start);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(options.cutoff || 1800, start);
      gain.gain.setValueAtTime(1e-4, start);
      gain.gain.linearRampToValueAtTime(options.volume || 0.08, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(1e-4, start + duration);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(destination);
      osc.start(start);
      osc.stop(start + duration + 0.03);
    }
    function scheduleAmbientMusicBar(ctx, destination, start, preset, patternIndex) {
      const beat = 60 / (preset.bpm || 54);
      const chord = preset.chords[patternIndex % preset.chords.length];
      chord.forEach((degree, voice) => {
        scheduleThemeMusicNote(
          ctx,
          destination,
          getScaleFrequency(preset.root, degree),
          start,
          beat * 4.4,
          preset,
          {
            type: voice === 0 ? "sine" : preset.type,
            volume: voice === 0 ? 0.034 : 0.023,
            detune: (voice - 1) * 5
          }
        );
      });
      const melody = preset.melody || [];
      melody.forEach((degree, step) => {
        if (degree === null || degree === void 0) return;
        scheduleThemeMusicNote(
          ctx,
          destination,
          getScaleFrequency(preset.root * 2, degree),
          start + step * beat,
          beat * 0.75,
          preset,
          { type: "sine", volume: 0.018, cutoff: preset.cutoff + 450 }
        );
      });
      return beat * Math.max(8, melody.length || 8);
    }
    function schedulePulseMusicBar(ctx, destination, start, preset, patternIndex) {
      const beat = 60 / (preset.bpm || 104);
      const stepDuration = beat / 2;
      const pattern = preset.pattern || [];
      pattern.forEach((degree, step) => {
        const stepStart = start + step * stepDuration;
        if (degree !== null && degree !== void 0) {
          scheduleThemeMusicNote(
            ctx,
            destination,
            getScaleFrequency(preset.root * 2, degree),
            stepStart,
            stepDuration * 0.52,
            preset,
            { volume: 0.025, cutoff: preset.cutoff }
          );
        }
        if (step % 4 === 0) {
          scheduleThemeMusicNote(
            ctx,
            destination,
            preset.root / 2,
            stepStart,
            stepDuration * 0.8,
            preset,
            { type: "sine", volume: 0.022, cutoff: 520 }
          );
        }
        if (preset.glitch && !isLiteMode2() && step % 7 === patternIndex % 7) {
          scheduleThemeMusicNote(
            ctx,
            destination,
            getScaleFrequency(preset.root * 3, 11),
            stepStart + stepDuration * 0.35,
            0.035,
            preset,
            { type: "square", volume: 0.012, cutoff: 2400, detune: 16 }
          );
        }
      });
      return stepDuration * Math.max(8, pattern.length);
    }
    function scheduleChiptuneMusicBar(ctx, destination, start, preset) {
      const beat = 60 / (preset.bpm || 128);
      const stepDuration = beat / 2;
      const pattern = preset.pattern || [];
      pattern.forEach((degree, step) => {
        if (degree === null || degree === void 0) return;
        scheduleThemeMusicNote(
          ctx,
          destination,
          getScaleFrequency(preset.root * 2, degree),
          start + step * stepDuration,
          stepDuration * 0.62,
          preset,
          { volume: step % 4 === 0 ? 0.036 : 0.028, cutoff: preset.cutoff }
        );
      });
      for (let step = 0; step < pattern.length; step += 4) {
        scheduleThemeMusicNote(
          ctx,
          destination,
          preset.root / 2,
          start + step * stepDuration,
          stepDuration * 1.25,
          preset,
          { type: "square", volume: 0.027, cutoff: 720 }
        );
      }
      return stepDuration * Math.max(8, pattern.length);
    }
    function scheduleBellMusicBar(ctx, destination, start, preset) {
      const beat = 60 / (preset.bpm || 62);
      const stepDuration = beat / 2;
      const pattern = preset.pattern || [];
      pattern.forEach((degree, step) => {
        if (degree === null || degree === void 0) return;
        scheduleThemeMusicNote(
          ctx,
          destination,
          getScaleFrequency(preset.root, degree),
          start + step * stepDuration,
          beat * 1.4,
          preset,
          {
            type: step % 5 === 0 ? "triangle" : "sine",
            volume: 0.024,
            cutoff: preset.cutoff
          }
        );
      });
      scheduleThemeMusicNote(ctx, destination, preset.root / 2, start, beat * 5.6, preset, {
        type: "sine",
        volume: 0.014,
        cutoff: 500
      });
      return stepDuration * Math.max(8, pattern.length);
    }
    function scheduleMinyoMusicBar(ctx, destination, start, preset, patternIndex) {
      const beat = 60 / (preset.bpm || 58);
      const stepDuration = beat / 2;
      const pattern = preset.pattern || [];
      const reply = preset.reply || [];
      const drone = preset.drone || [-12, 0];
      const phraseOffset = [0, -3, 2, 0][patternIndex % 4];
      drone.forEach((degree, voice) => {
        scheduleThemeMusicNote(
          ctx,
          destination,
          getScaleFrequency(preset.root, degree),
          start,
          beat * 7.4,
          preset,
          {
            type: voice === 0 ? "sine" : "triangle",
            volume: voice === 0 ? 0.015 : 0.01,
            cutoff: 560 + voice * 180,
            detune: voice === 0 ? -4 : 4
          }
        );
      });
      pattern.forEach((degree, step) => {
        if (degree === null || degree === void 0) return;
        scheduleThemeMusicNote(
          ctx,
          destination,
          getScaleFrequency(preset.root * 2, degree + phraseOffset),
          start + step * stepDuration,
          stepDuration * (step % 4 === 2 ? 0.92 : 0.68),
          preset,
          {
            type: step % 4 === 0 ? "triangle" : "sine",
            volume: step % 4 === 0 ? 0.024 : 0.018,
            cutoff: preset.cutoff,
            detune: step % 3 === 0 ? -7 : 5
          }
        );
      });
      reply.forEach((degree, step) => {
        if (degree === null || degree === void 0) return;
        scheduleThemeMusicNote(
          ctx,
          destination,
          getScaleFrequency(preset.root, degree + phraseOffset),
          start + beat * 4 + step * stepDuration,
          stepDuration * 0.74,
          preset,
          {
            type: "triangle",
            volume: 0.014,
            cutoff: preset.cutoff * 0.88,
            detune: -10
          }
        );
      });
      return stepDuration * Math.max(pattern.length, 8 + reply.length, 16);
    }
    function scheduleVoidMusicBar(ctx, destination, start, preset) {
      const duration = preset.duration || 5;
      scheduleThemeMusicNote(ctx, destination, preset.root, start, duration * 0.82, preset, {
        type: "sine",
        volume: 6e-3,
        cutoff: preset.cutoff
      });
      return duration;
    }
    function scheduleLofiBar(ctx, destination, start, progression, patternIndex) {
      const beat = 60 / 74;
      progression.forEach((chord, chordIndex) => {
        const chordStart = start + chordIndex * beat * 2;
        chord.forEach((frequency, voice) => {
          scheduleMusicNote(ctx, destination, frequency, chordStart, beat * 1.85, {
            type: "triangle",
            volume: voice === 0 ? 0.045 : 0.032,
            cutoff: 950,
            detune: (voice - 1) * 4
          });
        });
        const bassDelay = chordIndex % 2 === patternIndex % 2 ? 0 : beat / 2;
        scheduleMusicNote(ctx, destination, chord[0] / 2, chordStart + bassDelay, beat * 0.72, {
          type: "sine",
          volume: 0.055,
          cutoff: 520
        });
      });
      const melody = LOFI_MELODIES[patternIndex % LOFI_MELODIES.length];
      melody.forEach((degree, step) => {
        if (degree === null) return;
        const chordIndex = Math.min(3, Math.floor(step / 4));
        const root = progression[chordIndex][0] * 2;
        const octave = (patternIndex + step) % 11 === 0 ? 2 : 1;
        scheduleMusicNote(
          ctx,
          destination,
          root * NOTE_RATIOS[degree] * octave,
          start + step * beat / 2,
          beat * (step % 4 === 3 ? 0.62 : 0.38),
          {
            type: "sine",
            volume: octave === 2 ? 0.014 : 0.022,
            cutoff: octave === 2 ? 1550 : 1150
          }
        );
      });
      return beat * 8;
    }
    function scheduleRetroBar(ctx, destination, start, progression, patternIndex) {
      const beat = 60 / 104;
      const melody = RETRO_MELODIES[patternIndex % RETRO_MELODIES.length];
      const root = progression[patternIndex % progression.length][0];
      melody.forEach((degree, step) => {
        if (degree === null) return;
        scheduleMusicNote(
          ctx,
          destination,
          root * 2 * NOTE_RATIOS[degree],
          start + step * beat / 2,
          beat * 0.38,
          {
            type: step % 4 === 0 ? "square" : "triangle",
            volume: 0.035,
            cutoff: 2100
          }
        );
      });
      progression.forEach((chord, index) => {
        const chordStart = start + index * beat * 2;
        scheduleMusicNote(ctx, destination, chord[0] / 2, chordStart, beat * 0.7, {
          type: "square",
          volume: 0.035,
          cutoff: 700
        });
        chord.slice(1).forEach((frequency) => {
          scheduleMusicNote(ctx, destination, frequency, chordStart, beat * 1.75, {
            type: "triangle",
            volume: 0.018,
            cutoff: 1300
          });
        });
      });
      return beat * 8;
    }
    function scheduleThemeMusicBar(ctx, destination, start, preset, patternIndex) {
      if (preset.scheduler === "ambient") {
        return scheduleAmbientMusicBar(ctx, destination, start, preset, patternIndex);
      }
      if (preset.scheduler === "pulse") {
        return schedulePulseMusicBar(ctx, destination, start, preset, patternIndex);
      }
      if (preset.scheduler === "chiptune") {
        return scheduleChiptuneMusicBar(ctx, destination, start, preset);
      }
      if (preset.scheduler === "bells") {
        return scheduleBellMusicBar(ctx, destination, start, preset);
      }
      if (preset.scheduler === "minyo") {
        return scheduleMinyoMusicBar(ctx, destination, start, preset, patternIndex);
      }
      if (preset.scheduler === "void") {
        return scheduleVoidMusicBar(ctx, destination, start, preset);
      }
      const progression = MUSIC_PROGRESSIONS[patternIndex % MUSIC_PROGRESSIONS.length];
      return getMusicStyle() === "retro" ? scheduleRetroBar(ctx, destination, start, progression, patternIndex) : scheduleLofiBar(ctx, destination, start, progression, patternIndex);
    }
    function stopScheduledMusic({ context, fadeSeconds = 0 } = {}) {
      const stopAt = (context?.currentTime || 0) + Math.max(0.02, fadeSeconds);
      for (const oscillator of musicOscillators) {
        try {
          oscillator.stop(stopAt);
        } catch {
        }
      }
      musicOscillators.clear();
    }
    return Object.freeze({
      scheduleBar: scheduleThemeMusicBar,
      stopScheduled: stopScheduledMusic,
      get activeCount() {
        return musicOscillators.size;
      }
    });
  }

  // src/audio/tone-scheduler.js
  function createToneScheduler({ onError = () => {
  } } = {}) {
    const activeOscillators = /* @__PURE__ */ new Map();
    function warn(error, operation) {
      try {
        onError(error, operation);
      } catch {
      }
    }
    function schedule({
      context,
      destination,
      frequency,
      duration = 0.12,
      volume = 0.2,
      type = "square",
      delay = 0,
      endFrequency,
      detune = 0
    }) {
      if (!context?.createOscillator || !context?.createGain || !destination) return false;
      try {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const startAt = context.currentTime + Math.max(0, delay);
        const toneDuration = Math.max(0.015, duration);
        oscillator.type = type;
        oscillator.connect(gain);
        gain.connect(destination);
        oscillator.frequency.setValueAtTime(frequency, startAt);
        if (detune) oscillator.detune.setValueAtTime(detune, startAt);
        if (Number.isFinite(endFrequency) && endFrequency > 0) {
          oscillator.frequency.exponentialRampToValueAtTime(
            endFrequency,
            startAt + Math.max(0.015, toneDuration * 0.86)
          );
        }
        gain.gain.setValueAtTime(1e-4, startAt);
        gain.gain.linearRampToValueAtTime(volume, startAt + 5e-3);
        gain.gain.exponentialRampToValueAtTime(1e-4, startAt + toneDuration);
        activeOscillators.set(oscillator, context);
        oscillator.addEventListener?.("ended", () => activeOscillators.delete(oscillator), {
          once: true
        });
        oscillator.start(startAt);
        oscillator.stop(startAt + toneDuration + 0.01);
        return true;
      } catch (error) {
        warn(error, "schedule-tone");
        return false;
      }
    }
    function stopAll() {
      for (const [oscillator, context] of activeOscillators) {
        try {
          oscillator.stop(context.currentTime);
        } catch {
        }
      }
      activeOscillators.clear();
    }
    return Object.freeze({
      schedule,
      stopAll,
      get activeCount() {
        return activeOscillators.size;
      }
    });
  }

  // src/core/state.js
  var SESSION_STATES = Object.freeze({
    INACTIVE: "inactive",
    MOUNTING: "mounting",
    ACTIVE: "active",
    COMPLETED: "completed",
    CLEANING_UP: "cleaning-up"
  });
  var QUESTION_STATES = Object.freeze({
    INACTIVE: "inactive",
    AWAITING_FIRST_INPUT: "awaiting-first-input",
    AWAITING_ANSWER: "awaiting-answer",
    RESOLVED_CORRECT: "resolved-correct",
    RESOLVED_INCORRECT: "resolved-incorrect",
    REWINDING: "rewinding"
  });
  var SESSION_TRANSITIONS = Object.freeze({
    [SESSION_STATES.INACTIVE]: /* @__PURE__ */ new Set([SESSION_STATES.MOUNTING]),
    [SESSION_STATES.MOUNTING]: /* @__PURE__ */ new Set([SESSION_STATES.ACTIVE, SESSION_STATES.CLEANING_UP]),
    [SESSION_STATES.ACTIVE]: /* @__PURE__ */ new Set([SESSION_STATES.COMPLETED, SESSION_STATES.CLEANING_UP]),
    [SESSION_STATES.COMPLETED]: /* @__PURE__ */ new Set([SESSION_STATES.ACTIVE, SESSION_STATES.CLEANING_UP]),
    [SESSION_STATES.CLEANING_UP]: /* @__PURE__ */ new Set([SESSION_STATES.INACTIVE])
  });
  var QUESTION_TRANSITIONS = Object.freeze({
    [QUESTION_STATES.INACTIVE]: /* @__PURE__ */ new Set([
      QUESTION_STATES.AWAITING_FIRST_INPUT,
      QUESTION_STATES.AWAITING_ANSWER
    ]),
    [QUESTION_STATES.AWAITING_FIRST_INPUT]: /* @__PURE__ */ new Set([
      QUESTION_STATES.AWAITING_ANSWER,
      QUESTION_STATES.RESOLVED_CORRECT,
      QUESTION_STATES.RESOLVED_INCORRECT,
      QUESTION_STATES.INACTIVE
    ]),
    [QUESTION_STATES.AWAITING_ANSWER]: /* @__PURE__ */ new Set([
      QUESTION_STATES.RESOLVED_CORRECT,
      QUESTION_STATES.RESOLVED_INCORRECT,
      QUESTION_STATES.INACTIVE
    ]),
    [QUESTION_STATES.RESOLVED_CORRECT]: /* @__PURE__ */ new Set([
      QUESTION_STATES.REWINDING,
      QUESTION_STATES.INACTIVE
    ]),
    [QUESTION_STATES.RESOLVED_INCORRECT]: /* @__PURE__ */ new Set([
      QUESTION_STATES.REWINDING,
      QUESTION_STATES.INACTIVE
    ]),
    [QUESTION_STATES.REWINDING]: /* @__PURE__ */ new Set([
      QUESTION_STATES.AWAITING_ANSWER,
      QUESTION_STATES.RESOLVED_CORRECT,
      QUESTION_STATES.RESOLVED_INCORRECT,
      QUESTION_STATES.INACTIVE
    ])
  });
  function canTransitionSession(from, to) {
    return SESSION_TRANSITIONS[from]?.has(to) ?? false;
  }
  function canTransitionQuestion(from, to) {
    return QUESTION_TRANSITIONS[from]?.has(to) ?? false;
  }
  function assertSessionTransition(from, to) {
    if (!canTransitionSession(from, to)) {
      throw new Error(`Invalid session transition: ${from} -> ${to}`);
    }
  }
  function assertQuestionTransition(from, to) {
    if (!canTransitionQuestion(from, to)) {
      throw new Error(`Invalid question transition: ${from} -> ${to}`);
    }
  }

  // src/core/lifecycle.js
  function defaultScheduler3() {
    return globalThis;
  }
  var LifecycleScope = class {
    constructor({ generation = 0, isCurrent = () => true, scheduler } = {}) {
      this.generation = generation;
      this.scheduler = scheduler ?? defaultScheduler3();
      this.isCurrentGeneration = isCurrent;
      this.active = true;
      this.cleanups = /* @__PURE__ */ new Set();
    }
    get isActive() {
      return this.active && this.isCurrentGeneration(this.generation);
    }
    guard(callback) {
      return (...args) => {
        if (!this.isActive) return void 0;
        return callback(...args);
      };
    }
    defer(cleanup2) {
      if (typeof cleanup2 !== "function") {
        throw new TypeError("Lifecycle cleanup must be a function");
      }
      if (!this.isActive) {
        cleanup2();
        return () => {
        };
      }
      this.cleanups.add(cleanup2);
      return () => this.cleanups.delete(cleanup2);
    }
    setTimeout(callback, delay = 0) {
      let timerId;
      let pending = true;
      const cancel = () => {
        if (!pending) return;
        pending = false;
        this.scheduler.clearTimeout(timerId);
        this.cleanups.delete(cancel);
      };
      timerId = this.scheduler.setTimeout(() => {
        if (!pending) return;
        pending = false;
        this.cleanups.delete(cancel);
        if (this.isActive) callback();
      }, delay);
      this.cleanups.add(cancel);
      return cancel;
    }
    listen(target, type, listener, options) {
      if (!target?.addEventListener || !target?.removeEventListener) {
        throw new TypeError("Lifecycle listener target must be an EventTarget");
      }
      const guarded = this.guard(listener);
      target.addEventListener(type, guarded, options);
      return this.defer(() => target.removeEventListener(type, guarded, options));
    }
    dispose() {
      if (!this.active) return;
      this.active = false;
      const cleanups = [...this.cleanups].reverse();
      this.cleanups.clear();
      for (const cleanup2 of cleanups) cleanup2();
    }
  };
  var LifecycleController = class {
    constructor({ scheduler } = {}) {
      this.scheduler = scheduler ?? defaultScheduler3();
      this.sessionGeneration = 0;
      this.questionGeneration = 0;
      this.answerGeneration = 0;
      this.sessionState = SESSION_STATES.INACTIVE;
      this.questionState = QUESTION_STATES.INACTIVE;
      this.questionId = null;
      this.sessionScope = null;
      this.questionScope = null;
      this.previousResolvedState = null;
      this.transitionListeners = /* @__PURE__ */ new Set();
    }
    onTransition(listener) {
      this.transitionListeners.add(listener);
      return () => this.transitionListeners.delete(listener);
    }
    emitTransition(kind, from, to) {
      const transition = Object.freeze({
        kind,
        from,
        to,
        ownership: this.captureOwnership()
      });
      for (const listener of this.transitionListeners) listener(transition);
    }
    transitionSession(to) {
      const from = this.sessionState;
      assertSessionTransition(from, to);
      this.sessionState = to;
      this.emitTransition("session", from, to);
    }
    transitionQuestion(to) {
      const from = this.questionState;
      assertQuestionTransition(from, to);
      this.questionState = to;
      this.emitTransition("question", from, to);
    }
    mount() {
      if (this.sessionState !== SESSION_STATES.INACTIVE) this.cleanup();
      this.sessionGeneration += 1;
      this.questionGeneration = 0;
      this.answerGeneration = 0;
      this.questionId = null;
      this.previousResolvedState = null;
      this.sessionScope = new LifecycleScope({
        generation: this.sessionGeneration,
        scheduler: this.scheduler,
        isCurrent: (generation) => generation === this.sessionGeneration && this.sessionState !== SESSION_STATES.INACTIVE && this.sessionState !== SESSION_STATES.CLEANING_UP
      });
      this.transitionSession(SESSION_STATES.MOUNTING);
      return this.captureOwnership();
    }
    start() {
      if (this.sessionState !== SESSION_STATES.MOUNTING) return false;
      this.transitionSession(SESSION_STATES.ACTIVE);
      return true;
    }
    beginQuestion(questionId, { awaitingFirstInput = false, force = false } = {}) {
      if (this.sessionState !== SESSION_STATES.ACTIVE) return null;
      if (questionId === null || questionId === void 0 || questionId === "") {
        return null;
      }
      if (!force && this.questionId === questionId && this.questionState !== QUESTION_STATES.INACTIVE) {
        return this.captureOwnership();
      }
      this.questionScope?.dispose();
      if (this.questionState !== QUESTION_STATES.INACTIVE) {
        this.transitionQuestion(QUESTION_STATES.INACTIVE);
      }
      this.questionGeneration += 1;
      this.questionId = questionId;
      this.previousResolvedState = null;
      const ownership = this.captureOwnership();
      this.questionScope = new LifecycleScope({
        generation: this.questionGeneration,
        scheduler: this.scheduler,
        isCurrent: (generation) => generation === this.questionGeneration && this.owns(ownership)
      });
      this.transitionQuestion(
        awaitingFirstInput ? QUESTION_STATES.AWAITING_FIRST_INPUT : QUESTION_STATES.AWAITING_ANSWER
      );
      return this.captureOwnership();
    }
    markFirstInput() {
      if (this.questionState !== QUESTION_STATES.AWAITING_FIRST_INPUT) {
        return false;
      }
      this.transitionQuestion(QUESTION_STATES.AWAITING_ANSWER);
      return true;
    }
    resolve(result3) {
      if (this.questionState !== QUESTION_STATES.AWAITING_FIRST_INPUT && this.questionState !== QUESTION_STATES.AWAITING_ANSWER) {
        return false;
      }
      if (result3 !== "correct" && result3 !== "incorrect") return false;
      this.answerGeneration += 1;
      this.transitionQuestion(
        result3 === "correct" ? QUESTION_STATES.RESOLVED_CORRECT : QUESTION_STATES.RESOLVED_INCORRECT
      );
      return true;
    }
    beginRewind() {
      if (this.questionState !== QUESTION_STATES.RESOLVED_CORRECT && this.questionState !== QUESTION_STATES.RESOLVED_INCORRECT) {
        return false;
      }
      this.previousResolvedState = this.questionState;
      this.transitionQuestion(QUESTION_STATES.REWINDING);
      return true;
    }
    confirmRewind() {
      if (this.questionState !== QUESTION_STATES.REWINDING) return false;
      this.transitionQuestion(QUESTION_STATES.AWAITING_ANSWER);
      if (this.sessionState === SESSION_STATES.COMPLETED) {
        this.transitionSession(SESSION_STATES.ACTIVE);
      }
      this.previousResolvedState = null;
      return true;
    }
    cancelRewind() {
      if (this.questionState !== QUESTION_STATES.REWINDING || !this.previousResolvedState) {
        return false;
      }
      this.transitionQuestion(this.previousResolvedState);
      this.previousResolvedState = null;
      return true;
    }
    complete(ownership = this.captureOwnership()) {
      if (this.sessionState !== SESSION_STATES.ACTIVE || !this.owns(ownership) || this.questionState !== QUESTION_STATES.RESOLVED_CORRECT && this.questionState !== QUESTION_STATES.RESOLVED_INCORRECT) {
        return false;
      }
      this.transitionSession(SESSION_STATES.COMPLETED);
      return true;
    }
    captureOwnership() {
      return Object.freeze({
        sessionGeneration: this.sessionGeneration,
        questionGeneration: this.questionGeneration,
        answerGeneration: this.answerGeneration,
        questionId: this.questionId
      });
    }
    owns(ownership, { requireQuestion = true } = {}) {
      if (!ownership || this.sessionState === SESSION_STATES.INACTIVE || this.sessionState === SESSION_STATES.CLEANING_UP) {
        return false;
      }
      if (ownership.sessionGeneration !== this.sessionGeneration) return false;
      if (!requireQuestion) return true;
      return ownership.questionGeneration === this.questionGeneration && ownership.questionId === this.questionId && this.questionState !== QUESTION_STATES.INACTIVE;
    }
    cleanup() {
      if (this.sessionState === SESSION_STATES.INACTIVE) return false;
      if (this.sessionState !== SESSION_STATES.CLEANING_UP) {
        this.transitionSession(SESSION_STATES.CLEANING_UP);
      }
      this.questionScope?.dispose();
      this.questionScope = null;
      if (this.questionState !== QUESTION_STATES.INACTIVE) {
        this.transitionQuestion(QUESTION_STATES.INACTIVE);
      }
      this.questionId = null;
      this.sessionScope?.dispose();
      this.sessionScope = null;
      this.previousResolvedState = null;
      this.transitionSession(SESSION_STATES.INACTIVE);
      return true;
    }
  };
  function createLifecycleController(options) {
    return new LifecycleController(options);
  }

  // src/core/reconciliation.js
  function createReconciler(reconcile, { schedule } = {}) {
    if (typeof reconcile !== "function") {
      throw new TypeError("Reconciler callback must be a function");
    }
    const enqueue = schedule ?? ((callback) => queueMicrotask(callback));
    let active = true;
    let pending = false;
    let generation = 0;
    const reasons = /* @__PURE__ */ new Set();
    const run = () => {
      if (!active || !pending) return;
      pending = false;
      const currentReasons = [...reasons];
      reasons.clear();
      reconcile(currentReasons);
    };
    return Object.freeze({
      request(reason = "dom-change") {
        if (!active) return false;
        reasons.add(reason);
        if (pending) return true;
        pending = true;
        const scheduledGeneration = generation;
        enqueue(() => {
          if (scheduledGeneration === generation) run();
        });
        return true;
      },
      flush: run,
      dispose() {
        active = false;
        pending = false;
        reasons.clear();
        generation += 1;
      },
      get pending() {
        return pending;
      }
    });
  }

  // src/core/session-finalization.js
  var RESOLVED_QUESTION_STATES = Object.freeze({
    correct: QUESTION_STATES.RESOLVED_CORRECT,
    incorrect: QUESTION_STATES.RESOLVED_INCORRECT
  });
  function ownershipKey(ownership) {
    return `${ownership.sessionGeneration}:${ownership.questionGeneration}`;
  }
  function isValidProgress(progress) {
    return Number.isInteger(progress?.current) && Number.isInteger(progress?.total) && progress.total > 0 && progress.current >= 0 && progress.current <= progress.total;
  }
  function response(accepted, reason, extra = {}) {
    return Object.freeze({ accepted, reason, ...extra });
  }
  function createSessionFinalizationController({
    lifecycle: lifecycle2,
    summaryDelayMs = 800,
    isCompletionCurrent = () => true,
    onSessionCompleted = () => {
    },
    onShowSummary = () => {
    }
  } = {}) {
    if (!lifecycle2?.captureOwnership || !lifecycle2?.owns || !lifecycle2?.complete) {
      throw new TypeError("Session finalization requires a lifecycle controller");
    }
    if (!Number.isFinite(summaryDelayMs) || summaryDelayMs < 0) {
      throw new RangeError("Summary delay must be a nonnegative duration");
    }
    const completedOwnerships = /* @__PURE__ */ new Set();
    let status = "active";
    let finalCompletion = null;
    let cancelSummaryTimer = null;
    let finalizationToken = 0;
    let summaryShown = false;
    function clearSummaryTimer() {
      cancelSummaryTimer?.();
      cancelSummaryTimer = null;
    }
    function scheduleSummary(completion) {
      clearSummaryTimer();
      cancelSummaryTimer = lifecycle2.sessionScope?.setTimeout(() => {
        cancelSummaryTimer = null;
        if (status !== "completed" || summaryShown || finalCompletion !== completion || completion.token !== finalizationToken || lifecycle2.sessionState !== SESSION_STATES.COMPLETED || !lifecycle2.owns(completion.ownership) || !isCompletionCurrent(completion)) {
          return;
        }
        summaryShown = true;
        onShowSummary(completion);
      }, summaryDelayMs);
    }
    function recordResolvedQuestion({
      ownership = lifecycle2.captureOwnership(),
      questionIdentity = ownership?.questionId,
      progress,
      resolution
    } = {}) {
      if (status === "disposed") return response(false, "disposed");
      if (!ownership || !questionIdentity || !lifecycle2.owns(ownership)) {
        return response(false, "stale-owner");
      }
      if (ownership.questionId !== questionIdentity) {
        return response(false, "identity-mismatch");
      }
      if (!isValidProgress(progress)) return response(false, "invalid-progress");
      if (RESOLVED_QUESTION_STATES[resolution] !== lifecycle2.questionState) {
        return response(false, "question-not-resolved");
      }
      const key = ownershipKey(ownership);
      const counted = !completedOwnerships.has(key);
      if (counted) {
        completedOwnerships.add(key);
      }
      if (progress.current !== progress.total) {
        return response(true, counted ? "question-counted" : "duplicate-resolution", {
          counted,
          sessionCompleted: false
        });
      }
      if (status === "completed") {
        const sameFinalQuestion = finalCompletion?.ownership.sessionGeneration === ownership.sessionGeneration && finalCompletion?.ownership.questionGeneration === ownership.questionGeneration && finalCompletion?.logicalQuestionIdentity === questionIdentity;
        return response(
          sameFinalQuestion,
          sameFinalQuestion ? "already-complete" : "completed",
          {
            counted,
            sessionCompleted: sameFinalQuestion
          }
        );
      }
      if (!lifecycle2.complete(ownership)) {
        return response(false, "lifecycle-rejected-completion", { counted });
      }
      finalizationToken += 1;
      const completion = Object.freeze({
        ownership,
        logicalQuestionIdentity: questionIdentity,
        resolution,
        progress: Object.freeze({ current: progress.current, total: progress.total }),
        token: finalizationToken
      });
      finalCompletion = completion;
      status = "completed";
      summaryShown = false;
      onSessionCompleted(completion);
      scheduleSummary(completion);
      return response(true, "session-completed", {
        counted,
        sessionCompleted: true,
        completion
      });
    }
    function reopenQuestion(ownership = lifecycle2.captureOwnership()) {
      if (status === "disposed" || !ownership) return false;
      completedOwnerships.delete(ownershipKey(ownership));
      const ownsFinal = finalCompletion?.ownership.sessionGeneration === ownership.sessionGeneration && finalCompletion?.ownership.questionGeneration === ownership.questionGeneration;
      if (ownsFinal) {
        clearSummaryTimer();
        finalizationToken += 1;
        finalCompletion = null;
        summaryShown = false;
        status = "active";
      }
      return true;
    }
    function cancelPendingSummary2() {
      if (!cancelSummaryTimer) return false;
      clearSummaryTimer();
      return true;
    }
    function isFinalizedQuestion({
      ownership = lifecycle2.captureOwnership(),
      questionIdentity = ownership?.questionId
    } = {}) {
      return Boolean(
        status === "completed" && finalCompletion && ownership && finalCompletion.ownership.sessionGeneration === ownership.sessionGeneration && finalCompletion.ownership.questionGeneration === ownership.questionGeneration && finalCompletion.logicalQuestionIdentity === questionIdentity
      );
    }
    function cleanup2() {
      if (status === "disposed") return;
      clearSummaryTimer();
      completedOwnerships.clear();
      finalCompletion = null;
      summaryShown = false;
      finalizationToken += 1;
      status = "disposed";
    }
    return Object.freeze({
      recordResolvedQuestion,
      reopenQuestion,
      cancelPendingSummary: cancelPendingSummary2,
      isFinalizedQuestion,
      cleanup: cleanup2,
      get isComplete() {
        return status === "completed";
      },
      get summaryShown() {
        return summaryShown;
      },
      get completedQuestionCount() {
        return completedOwnerships.size;
      },
      get finalCompletion() {
        return finalCompletion;
      }
    });
  }

  // src/core/session-boundary.js
  var SESSION_BOUNDARY_REASONS = Object.freeze({
    HOST_SESSION_CHANGED: "host-session-changed",
    URL_CHANGED: "url-changed",
    PROGRESS_RESET: "progress-reset"
  });
  var FALLBACK_BASE_URL = "https://marumori.invalid/";
  function normalizeSessionUrl(value) {
    if (value === null || value === void 0 || value === "") return null;
    try {
      const url = new URL(String(value), FALLBACK_BASE_URL);
      return `${url.origin}${url.pathname}${url.search}`;
    } catch {
      return null;
    }
  }
  function getReviewSessionBoundaryReason({
    activeUrl,
    currentUrl,
    activeSessionIdentity,
    currentSessionIdentity,
    lastCompleted,
    currentProgress,
    unresolved = false,
    rewindPending = false
  } = {}) {
    if (activeSessionIdentity && currentSessionIdentity && activeSessionIdentity !== currentSessionIdentity) {
      return SESSION_BOUNDARY_REASONS.HOST_SESSION_CHANGED;
    }
    const normalizedActiveUrl = normalizeSessionUrl(activeUrl);
    const normalizedCurrentUrl = normalizeSessionUrl(currentUrl);
    if (normalizedActiveUrl && normalizedCurrentUrl && normalizedActiveUrl !== normalizedCurrentUrl) {
      return SESSION_BOUNDARY_REASONS.URL_CHANGED;
    }
    if (rewindPending) return null;
    if (unresolved && Number.isFinite(lastCompleted) && Number.isFinite(currentProgress) && currentProgress < lastCompleted) {
      return SESSION_BOUNDARY_REASONS.PROGRESS_RESET;
    }
    return null;
  }

  // src/effects/crt.js
  var OVERLAY_IDS = Object.freeze(["mm-crt-tint", "mm-scanlines"]);
  function createCrtController({ document: document2 } = {}) {
    if (!document2?.createElement || !document2?.body) {
      throw new TypeError("CRT controller requires a document with a body");
    }
    function removeOverlays() {
      for (const id of OVERLAY_IDS) document2.getElementById(id)?.remove();
    }
    function sync({ enabled = false } = {}) {
      document2.body.classList.toggle("mm-crt-enabled", Boolean(enabled));
      if (!enabled) {
        removeOverlays();
        return false;
      }
      const fragment = document2.createDocumentFragment();
      for (const id of OVERLAY_IDS) {
        if (document2.getElementById(id)) continue;
        const overlay = document2.createElement("div");
        overlay.id = id;
        overlay.dataset.mmOwned = "";
        fragment.append(overlay);
      }
      document2.body.append(fragment);
      return true;
    }
    function cleanup2() {
      document2.body.classList.remove("mm-crt-enabled");
      removeOverlays();
    }
    return Object.freeze({ sync, cleanup: cleanup2 });
  }

  // src/effects/animation-replay.js
  function defaultScheduler4() {
    return {
      requestAnimationFrame: (callback) => globalThis.requestAnimationFrame(callback),
      cancelAnimationFrame: (id) => globalThis.cancelAnimationFrame(id),
      setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
      clearTimeout: (id) => globalThis.clearTimeout(id)
    };
  }
  function createAnimationReplayer({ scheduler = defaultScheduler4() } = {}) {
    const entries = /* @__PURE__ */ new Map();
    function cancel(element, { removeClasses = true } = {}) {
      const entry = entries.get(element);
      if (!entry) return false;
      entries.delete(element);
      if (entry.frameId !== null) scheduler.cancelAnimationFrame?.(entry.frameId);
      if (entry.timerId !== null) scheduler.clearTimeout(entry.timerId);
      if (removeClasses) element.classList.remove(...entry.resetClasses);
      return true;
    }
    function replay(element, resetClasses, activeClass, { removeAfterMs = 0 } = {}) {
      if (!element?.classList || typeof activeClass !== "string") return false;
      const classes = [...new Set(resetClasses ?? [activeClass])];
      cancel(element);
      element.classList.remove(...classes);
      const entry = {
        activeClass,
        resetClasses: classes,
        frameId: null,
        timerId: null
      };
      entries.set(element, entry);
      entry.frameId = scheduler.requestAnimationFrame(() => {
        entry.frameId = null;
        if (entries.get(element) !== entry || !element.isConnected) {
          entries.delete(element);
          return;
        }
        element.classList.add(activeClass);
        if (!(removeAfterMs > 0)) return;
        entry.timerId = scheduler.setTimeout(() => {
          entry.timerId = null;
          if (entries.get(element) !== entry) return;
          element.classList.remove(activeClass);
          entries.delete(element);
        }, removeAfterMs);
      });
      return true;
    }
    function cancelAll() {
      for (const element of [...entries.keys()]) cancel(element);
    }
    return Object.freeze({ replay, cancel, cancelAll });
  }

  // src/utils/dom.js
  function removeElementSafe(node) {
    node?.remove?.();
  }

  // src/effects/transient-effects.js
  var FLOAT_EVENT_TYPES = Object.freeze({
    correct: "correct",
    incorrect: "incorrect",
    wordwin: "wordComplete",
    milestone: "milestone",
    rewind: "rewind"
  });
  var BANNER_EVENT_TYPES = Object.freeze({
    "mm-mult-banner": "multiplierUp",
    "mm-milestone-banner": "milestone"
  });
  var DEFAULT_CELEBRATIONS = Object.freeze([
    { icon: "🎉", effect: "burst" },
    { icon: "✨", effect: "rise" },
    { icon: "🌸", effect: "pop" },
    { icon: "⚡", effect: "spin" },
    { icon: "🔥", effect: "burst" },
    { icon: "💫", effect: "spin" },
    { icon: "🎊", effect: "burst" },
    { icon: "🌟", effect: "pop" },
    { icon: "💥", effect: "burst" },
    { icon: "⭐", effect: "spin" },
    { icon: "💎", effect: "pop" },
    { icon: "🏆", effect: "rise" },
    { icon: "👑", effect: "rise" },
    { icon: "🌺", effect: "pop" },
    { icon: "🌼", effect: "rise" },
    { icon: "🌻", effect: "spin" },
    { icon: "🌙", effect: "rise" },
    { icon: "☄️", effect: "burst" },
    { icon: "🚀", effect: "rise" },
    { icon: "🎯", effect: "spin" },
    { icon: "💯", effect: "burst" },
    { icon: "✅", effect: "pop" },
    { icon: "🌀", effect: "spin" },
    { icon: "🔆", effect: "burst" },
    { icon: "✴️", effect: "spin" },
    { icon: "❇️", effect: "pop" },
    { icon: "🪷", effect: "rise" }
  ]);
  function defaultScheduler5() {
    return {
      setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
      clearTimeout: (id) => globalThis.clearTimeout(id)
    };
  }
  function createTransientEffectsController({
    document: document2,
    window: window2,
    getSettings,
    theme,
    isLiteMode: isLiteMode2,
    isMaxMode: isMaxMode2,
    prefersReducedMotion: prefersReducedMotion2,
    getFlashElement,
    getDefaultAnchor,
    temporaryEffectSelector,
    celebrations = DEFAULT_CELEBRATIONS,
    animationReplayer = createAnimationReplayer(),
    scheduler = defaultScheduler5(),
    random = Math.random,
    now = () => globalThis.performance.now()
  } = {}) {
    if (!document2?.createElement || !document2?.body) {
      throw new TypeError("Transient effects require a document with a body");
    }
    if (!window2 || typeof getSettings !== "function" || !theme) {
      throw new TypeError("Transient effects require window, settings, and theme adapters");
    }
    const removalTimers = /* @__PURE__ */ new Map();
    const classTimers = /* @__PURE__ */ new Set();
    const transientClasses = /* @__PURE__ */ new Map();
    let failureFlashTimer = null;
    let lastLiteFloatAt = 0;
    function trackTransientClass(element, className) {
      let classes = transientClasses.get(element);
      if (!classes) {
        classes = /* @__PURE__ */ new Set();
        transientClasses.set(element, classes);
      }
      classes.add(className);
    }
    function scheduleClassRemoval(element, className, delay) {
      const timer = scheduler.setTimeout(() => {
        classTimers.delete(timer);
        element.classList.remove(className);
        const classes = transientClasses.get(element);
        classes?.delete(className);
        if (classes?.size === 0) transientClasses.delete(element);
      }, delay);
      classTimers.add(timer);
    }
    function scheduleElementRemoval(node, delay) {
      const existingTimer = removalTimers.get(node);
      if (existingTimer !== void 0) scheduler.clearTimeout(existingTimer);
      const timer = scheduler.setTimeout(() => {
        removalTimers.delete(node);
        removeElementSafe(node);
      }, delay);
      removalTimers.set(node, timer);
    }
    function cancelElementRemoval(node) {
      const timer = removalTimers.get(node);
      if (timer === void 0) return;
      scheduler.clearTimeout(timer);
      removalTimers.delete(node);
    }
    function removeTemporaryEffects2() {
      if (!temporaryEffectSelector) return;
      document2.querySelectorAll(temporaryEffectSelector).forEach((node) => {
        cancelElementRemoval(node);
        removeElementSafe(node);
      });
    }
    function getAnchorPoint(anchorEl) {
      const rect = anchorEl?.getBoundingClientRect();
      return {
        x: rect ? rect.left + rect.width / 2 : window2.innerWidth / 2,
        y: rect ? rect.top + rect.height / 2 : window2.innerHeight / 2
      };
    }
    function shakeScreen2(hard = false) {
      const settings2 = getSettings();
      if (isLiteMode2() || !settings2.shakeEnabled || !settings2.visualsEnabled || prefersReducedMotion2()) {
        return;
      }
      const scale = theme.getEffectBudget(hard ? "comboBreak" : "correct").shakeScale;
      if (scale < 0.2) return;
      const hardShake = hard && scale >= 0.75;
      const activeClass = hardShake ? "mm-shake-hard" : "mm-shake-light";
      animationReplayer.replay(document2.body, ["mm-shake-light", "mm-shake-hard"], activeClass, {
        removeAfterMs: hardShake ? 450 : 350
      });
    }
    function flashScreen2(correct) {
      const settings2 = getSettings();
      if (isLiteMode2() || !settings2.visualsEnabled || prefersReducedMotion2()) return;
      if (correct ? !settings2.flashEnabled : !settings2.failureFlashEnabled) return;
      const flash = getFlashElement?.();
      if (!flash) return;
      const budget = theme.getEffectBudget(correct ? "correct" : "incorrect");
      flash.style.setProperty("--mm-theme-flash-strength", budget.flashScale);
      animationReplayer.replay(
        flash,
        ["correct-flash", "wrong-flash"],
        correct ? "correct-flash" : "wrong-flash"
      );
    }
    function scheduleFailureFlash2() {
      if (failureFlashTimer !== null) scheduler.clearTimeout(failureFlashTimer);
      failureFlashTimer = scheduler.setTimeout(() => {
        failureFlashTimer = null;
        flashScreen2(false);
      }, 70);
    }
    function spawnFloat2(text, cssClass, anchorEl) {
      const settings2 = getSettings();
      if (!settings2.floatEnabled || !settings2.visualsEnabled || prefersReducedMotion2()) return;
      if (isLiteMode2()) {
        const timestamp = now();
        if (timestamp - lastLiteFloatAt < 450) return;
        lastLiteFloatAt = timestamp;
      }
      const node = document2.createElement("div");
      const eventType = FLOAT_EVENT_TYPES[cssClass] || cssClass || "correct";
      const preset = theme.getFloatingTextPreset(eventType);
      node.className = `mm-float ${cssClass}`;
      node.textContent = text;
      if (preset.color) node.style.color = preset.color;
      if (preset.shadow) node.style.textShadow = preset.shadow;
      if (preset.fontSize) node.style.fontSize = preset.fontSize;
      if (preset.fontFamily) node.style.fontFamily = preset.fontFamily;
      if (preset.label) node.dataset.mmLabel = preset.label;
      if (preset.motion) node.dataset.mmMotion = preset.motion;
      const point = getAnchorPoint(anchorEl);
      node.style.left = `${point.x - 60 + (random() - 0.5) * 80}px`;
      node.style.top = `${point.y}px`;
      node.style.setProperty("--mm-float-drift-x", `${Math.round((random() - 0.5) * 42)}px`);
      document2.body.appendChild(node);
      scheduleElementRemoval(node, 1350);
    }
    function showBanner2(id, text) {
      const settings2 = getSettings();
      if (isLiteMode2() || !settings2.visualsEnabled || prefersReducedMotion2()) return;
      const banner = document2.getElementById(id);
      if (!banner) return;
      const preset = theme.getComboPreset(BANNER_EVENT_TYPES[id] || "multiplierUp");
      banner.textContent = text;
      banner.className = "";
      banner.dataset.mmComboStyle = preset.style || "pop";
      if (preset.color) banner.style.color = preset.color;
      if (preset.shadow) banner.style.textShadow = preset.shadow;
      animationReplayer.replay(banner, ["show"], "show");
    }
    function pickRandom(items, fallback) {
      return items?.length ? items[Math.floor(random() * items.length)] : fallback;
    }
    function spawnCelebrate(celebration, x, y, choreography) {
      const settings2 = getSettings();
      if (!settings2.visualsEnabled || prefersReducedMotion2() || document2.hidden) return;
      const preset = choreography || theme.getCelebrationPreset("wordComplete");
      const node = document2.createElement("div");
      node.className = `mm-celebrate ${celebration.effect}`;
      node.textContent = celebration.icon;
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      node.style.color = preset.color || theme.getThemeValue("colors.banner", "#fff");
      node.style.fontSize = `${Number(preset.size) || 52}px`;
      node.style.setProperty("--mm-celebrate-life", `${Number(preset.durationMs) || 900}ms`);
      const spread = Number(preset.spread) || 72;
      node.style.setProperty("--mm-celebrate-x", `${Math.round((random() - 0.5) * spread)}px`);
      node.style.setProperty("--mm-celebrate-y", `${Math.round(-48 - random() * spread)}px`);
      node.style.setProperty("--mm-celebrate-rot", `${Math.round((random() - 0.5) * 90)}deg`);
      document2.body.appendChild(node);
      scheduleElementRemoval(node, (Number(preset.durationMs) || 900) + 160);
    }
    function getRandomCelebration(eventType = "wordComplete") {
      const preset = theme.getComboPreset(eventType);
      const choreography = theme.getCelebrationPreset(eventType);
      const icons = preset.celebrations?.length ? preset.celebrations : celebrations;
      const icon = pickRandom(icons, { icon: "✨", effect: "rise" });
      if (typeof icon === "string") {
        return {
          icon,
          effect: pickRandom(choreography.effects, "rise")
        };
      }
      return {
        icon: icon.icon,
        effect: icon.effect || pickRandom(choreography.effects, "rise")
      };
    }
    function spawnCelebrationBurst2(eventType, anchorEl, options = {}) {
      const settings2 = getSettings();
      if (!settings2.visualsEnabled || prefersReducedMotion2() || document2.hidden) return;
      const choreography = { ...theme.getCelebrationPreset(eventType), ...options };
      const budget = theme.getEffectBudget(eventType);
      const baseCount = isLiteMode2() ? Number(choreography.liteCount) || 0 : Number(choreography.count) || 1;
      const maxCount = isLiteMode2() ? 1 : 4;
      const minCount = baseCount > 0 ? 1 : 0;
      const count = Math.min(
        maxCount,
        Math.max(minCount, Math.round(baseCount * budget.celebrationScale))
      );
      if (count <= 0) return;
      const point = getAnchorPoint(anchorEl);
      const jitter = Math.max(8, (Number(choreography.spread) || 60) * 0.26);
      for (let index = 0; index < count; index++) {
        spawnCelebrate(
          getRandomCelebration(eventType),
          point.x + (random() - 0.5) * jitter,
          point.y + (random() - 0.5) * jitter,
          choreography
        );
      }
    }
    function triggerAnswerBoxAccent2(eventType, anchorEl = getDefaultAnchor?.()) {
      const settings2 = getSettings();
      if (!settings2.visualsEnabled || prefersReducedMotion2() || document2.hidden) return;
      const rect = anchorEl?.getBoundingClientRect?.();
      if (!rect) return;
      const choreography = theme.getCelebrationPreset(eventType);
      const budget = theme.getEffectBudget(eventType);
      const node = document2.createElement("div");
      node.className = "mm-answer-accent";
      node.dataset.mmAccent = choreography.answerAccent || "pop";
      node.style.left = `${rect.left - 5}px`;
      node.style.top = `${rect.top - 5}px`;
      node.style.width = `${rect.width + 10}px`;
      node.style.height = `${rect.height + 10}px`;
      node.style.setProperty("--mm-answer-accent-opacity", budget.flashScale);
      document2.body.appendChild(node);
      scheduleElementRemoval(node, 980);
    }
    function getParticleText(shape, preset) {
      if (shape === "star") return "✦";
      if (shape !== "glyph") return "";
      const glyphs = preset.glyphs || "01";
      return glyphs[Math.floor(random() * glyphs.length)];
    }
    function spawnThemeParticles2(eventType, anchorEl, options = {}) {
      const settings2 = getSettings();
      if (!settings2.visualsEnabled || prefersReducedMotion2() || document2.hidden) return;
      const preset = { ...theme.getParticlePreset(eventType), ...options };
      const budget = theme.getEffectBudget(eventType);
      const baseCount = isLiteMode2() ? Number(preset.liteCount) || 0 : Number(preset.count) || 0;
      const maxCount = isLiteMode2() ? 2 : isMaxMode2() ? 16 : 12;
      const count = Math.min(maxCount, Math.max(0, Math.round(baseCount * budget.intensity)));
      if (count <= 0) return;
      const point = getAnchorPoint(anchorEl);
      const spread = (Number(preset.spread) || 64) * budget.spreadScale;
      const lifetime = Number(preset.lifetimeMs) || 700;
      for (let index = 0; index < count; index++) {
        const node = document2.createElement("span");
        const shape = preset.shape || "dot";
        const motion = preset.motion || "burst";
        const angle = random() * Math.PI * 2;
        const distance = spread * (0.25 + random() * 0.75);
        const fallBias = motion === "fall" ? spread * 0.6 : 0;
        node.className = `mm-theme-particle ${shape} ${motion}`;
        node.textContent = getParticleText(shape, preset);
        node.style.left = `${point.x + (random() - 0.5) * 20}px`;
        node.style.top = `${point.y + (random() - 0.5) * 16}px`;
        node.style.setProperty(
          "--mm-particle-color",
          preset.color || "var(--mm-theme-notification)"
        );
        node.style.setProperty("--mm-particle-size", `${Number(preset.size) || 5}px`);
        node.style.setProperty("--mm-particle-life", `${lifetime}ms`);
        node.style.setProperty("--mm-particle-x", `${Math.cos(angle) * distance}px`);
        node.style.setProperty("--mm-particle-y", `${Math.sin(angle) * distance + fallBias}px`);
        node.style.setProperty("--mm-particle-rot", `${Math.round((random() - 0.5) * 220)}deg`);
        document2.body.appendChild(node);
        scheduleElementRemoval(node, lifetime + 120);
      }
    }
    function pulseElement2(element) {
      const settings2 = getSettings();
      if (isLiteMode2() || !element || !settings2.visualsEnabled || prefersReducedMotion2()) return;
      element.classList.add("mm-pulse");
      trackTransientClass(element, "mm-pulse");
      scheduleClassRemoval(element, "mm-pulse", 350);
    }
    function animateClass2(element, className, duration) {
      if (isLiteMode2() || !element || prefersReducedMotion2()) return;
      element.classList.add(className);
      trackTransientClass(element, className);
      scheduleClassRemoval(element, className, duration);
    }
    function cleanup2() {
      if (failureFlashTimer !== null) {
        scheduler.clearTimeout(failureFlashTimer);
        failureFlashTimer = null;
      }
      for (const timer of classTimers) scheduler.clearTimeout(timer);
      classTimers.clear();
      for (const [element, classes] of transientClasses) {
        element.classList.remove(...classes);
      }
      transientClasses.clear();
      for (const timer of removalTimers.values()) scheduler.clearTimeout(timer);
      removalTimers.clear();
      animationReplayer.cancelAll();
      removeTemporaryEffects2();
      lastLiteFloatAt = 0;
    }
    return Object.freeze({
      animateClass: animateClass2,
      cleanup: cleanup2,
      flashScreen: flashScreen2,
      getAnchorPoint,
      pulseElement: pulseElement2,
      removeTemporaryEffects: removeTemporaryEffects2,
      scheduleFailureFlash: scheduleFailureFlash2,
      shakeScreen: shakeScreen2,
      showBanner: showBanner2,
      spawnCelebrationBurst: spawnCelebrationBurst2,
      spawnFloat: spawnFloat2,
      spawnThemeParticles: spawnThemeParticles2,
      triggerAnswerBoxAccent: triggerAnswerBoxAccent2
    });
  }

  // src/storage/keys.js
  var SETTINGS_STORAGE_KEY = "mmSettings";
  var RECORDS_STORAGE_KEY = "mmRecords";
  var LOCKED_CHALLENGE_FONT_STORAGE_KEY = "mmLockedChallengeFont";
  var STORAGE_KEYS = Object.freeze({
    settings: SETTINGS_STORAGE_KEY,
    records: RECORDS_STORAGE_KEY,
    lockedChallengeFont: LOCKED_CHALLENGE_FONT_STORAGE_KEY
  });

  // src/font-challenge/fonts.js
  var FONT_CHALLENGE_LOCAL_FONTS = Object.freeze([
    "MS Gothic",
    "MS Mincho",
    "Meiryo",
    "Yu Gothic",
    "Yu Mincho",
    "Hiragino Kaku Gothic Pro",
    "Hiragino Mincho Pro",
    "Osaka",
    "TakaoGothic",
    "TakaoMincho",
    "Kochi Gothic",
    "Kochi Mincho"
  ]);
  var FONT_CHALLENGE_WEB_FONTS = Object.freeze([
    "Noto Sans JP",
    "Noto Serif JP",
    "Sawarabi Gothic",
    "Sawarabi Mincho",
    "M PLUS Rounded 1c",
    "M PLUS 1p",
    "Kosugi",
    "Kosugi Maru",
    "Shippori Mincho",
    "Yuji Syuku",
    "Yuji Mai",
    "Yuji Boku",
    "Reggae One",
    "RocknRoll One",
    "Zen Kurenaido",
    "Zen Antique",
    "Zen Antique Soft",
    "Zen Maru Gothic",
    "Zen Kaku Gothic New",
    "Zen Old Mincho"
  ]);
  var FONT_CHALLENGE_FONTS = Object.freeze([
    ...FONT_CHALLENGE_LOCAL_FONTS,
    ...FONT_CHALLENGE_WEB_FONTS
  ]);
  var ALLOWED_FONT_NAMES = new Set(FONT_CHALLENGE_FONTS);
  var WEB_FONT_NAMES = new Set(FONT_CHALLENGE_WEB_FONTS);
  function isAllowedChallengeFont(fontName) {
    return typeof fontName === "string" && ALLOWED_FONT_NAMES.has(fontName);
  }
  function isWebChallengeFont(fontName) {
    return typeof fontName === "string" && WEB_FONT_NAMES.has(fontName);
  }
  function getChallengeFontPool({ lite = false } = {}) {
    return lite ? FONT_CHALLENGE_LOCAL_FONTS : FONT_CHALLENGE_FONTS;
  }
  function pickChallengeFont({ lite = false, random = Math.random } = {}) {
    const fonts = getChallengeFontPool({ lite });
    let randomValue = 0;
    try {
      randomValue = Number(typeof random === "function" ? random() : random);
    } catch {
      randomValue = 0;
    }
    const boundedValue = Number.isFinite(randomValue) ? Math.min(1, Math.max(0, randomValue)) : 0;
    const index = Math.min(fonts.length - 1, Math.floor(boundedValue * fonts.length));
    return fonts[index];
  }
  function getChallengeFontFamily(fontName) {
    if (!isAllowedChallengeFont(fontName)) return null;
    return `'${fontName}', sans-serif`;
  }
  function getChallengeFontStylesheetUrl(fontName) {
    if (!isWebChallengeFont(fontName)) return null;
    return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}&display=swap`;
  }

  // src/font-challenge/controller.js
  var DEFAULT_TARGET_SELECTOR = "#main .main_form, #main > span";
  var FONT_PROPERTY = "font-family";
  function readStorage(storage, key, fallback) {
    const getter = storage?.get ?? storage?.getValue;
    if (typeof getter !== "function") return fallback;
    try {
      const value = getter.call(storage, key, fallback);
      return value === void 0 ? fallback : value;
    } catch {
      return fallback;
    }
  }
  function writeStorage(storage, key, value) {
    const setter = storage?.set ?? storage?.setValue;
    if (typeof setter !== "function") return false;
    try {
      setter.call(storage, key, value);
      return true;
    } catch {
      return false;
    }
  }
  function hasInlineProperty(style, property) {
    for (let index = 0; index < style.length; index += 1) {
      if (style.item(index) === property) return true;
    }
    return false;
  }
  function captureInlineFont(target) {
    return Object.freeze({
      present: hasInlineProperty(target.style, FONT_PROPERTY),
      value: target.style.getPropertyValue(FONT_PROPERTY),
      priority: target.style.getPropertyPriority(FONT_PROPERTY)
    });
  }
  function restoreInlineFont(target, snapshot) {
    if (snapshot.present) {
      target.style.setProperty(FONT_PROPERTY, snapshot.value, snapshot.priority);
    } else {
      target.style.removeProperty(FONT_PROPERTY);
    }
  }
  function defaultTargetResolver(document2) {
    return document2.querySelector(DEFAULT_TARGET_SELECTOR);
  }
  function toLiteMode(isLiteMode2) {
    try {
      return typeof isLiteMode2 === "function" ? Boolean(isLiteMode2()) : Boolean(isLiteMode2);
    } catch {
      return false;
    }
  }
  function createLinkId(document2, fontName) {
    const baseId = `mm-font-${fontName.replace(/\s+/g, "-")}`;
    let candidate = baseId;
    let suffix = 0;
    while (document2.getElementById(candidate)) {
      suffix += 1;
      candidate = `${baseId}-font-challenge-${suffix}`;
    }
    return candidate;
  }
  function createFontChallengeController({
    document: document2,
    storage,
    feedback = () => {
    },
    random = Math.random,
    isLiteMode: isLiteMode2 = () => false,
    getTarget = defaultTargetResolver,
    storageKey = LOCKED_CHALLENGE_FONT_STORAGE_KEY,
    maxWebFontLinks = 3
  } = {}) {
    if (!document2?.createElement || !document2?.querySelector) {
      throw new TypeError("A document is required by the Font Challenge controller");
    }
    if (typeof getTarget !== "function") {
      throw new TypeError("Font Challenge getTarget must be a function");
    }
    const requestedLinkLimit = Number(maxWebFontLinks);
    const linkLimit = Number.isFinite(requestedLinkLimit) ? Math.min(4, Math.max(2, Math.floor(requestedLinkLimit))) : 3;
    const webFontLinks = /* @__PURE__ */ new Map();
    let accessCounter = 0;
    let enabled = false;
    let active = null;
    function notify(target, message, details = {}) {
      try {
        feedback(target, message, Object.freeze({ ...details }));
      } catch {
      }
    }
    function setLockedFont(fontName) {
      const normalized = isAllowedChallengeFont(fontName) ? fontName : null;
      writeStorage(storage, storageKey, normalized);
      return normalized;
    }
    function getLockedFont() {
      const stored = readStorage(storage, storageKey, null);
      if (stored === null || stored === void 0 || stored === "") return null;
      if (isAllowedChallengeFont(stored)) return stored;
      setLockedFont(null);
      return null;
    }
    function selectRandomFont({ localOnly = toLiteMode(isLiteMode2) } = {}) {
      return pickChallengeFont({ lite: localOnly, random });
    }
    function removeWebFontEntry(entry) {
      if (!entry || webFontLinks.get(entry.fontName) !== entry) return;
      entry.link.removeEventListener("load", entry.handleLoad);
      entry.link.removeEventListener("error", entry.handleError);
      entry.link.remove();
      webFontLinks.delete(entry.fontName);
    }
    function getProtectedWebFonts() {
      const protectedFonts = /* @__PURE__ */ new Set();
      if (isWebChallengeFont(active?.fontName)) protectedFonts.add(active.fontName);
      const lockedFont = getLockedFont();
      if (isWebChallengeFont(lockedFont)) protectedFonts.add(lockedFont);
      return protectedFonts;
    }
    function pruneWebFontLinks() {
      if (webFontLinks.size <= linkLimit) return;
      const protectedFonts = getProtectedWebFonts();
      const removable = [...webFontLinks.values()].filter((entry) => !protectedFonts.has(entry.fontName)).sort((left, right) => left.lastUsed - right.lastUsed);
      while (webFontLinks.size > linkLimit && removable.length > 0) {
        removeWebFontEntry(removable.shift());
      }
    }
    function clearWebFontLinks() {
      for (const entry of [...webFontLinks.values()]) removeWebFontEntry(entry);
    }
    function applyFontToActiveTarget() {
      if (!active || active.revealingOriginal) return false;
      const family = getChallengeFontFamily(active.fontName);
      if (!family) return false;
      active.target.style.setProperty(FONT_PROPERTY, family, "important");
      return true;
    }
    function handleWebFontFailure(entry) {
      if (webFontLinks.get(entry.fontName) !== entry) return;
      removeWebFontEntry(entry);
      if (!enabled || !active || active.fontName !== entry.fontName) return;
      const failedFont = entry.fontName;
      const fallback = selectRandomFont({ localOnly: true });
      active.fontName = fallback;
      if (getLockedFont() === failedFont) setLockedFont(fallback);
      applyFontToActiveTarget();
      notify(active.target, "FONT FALLBACK", { failedFont, fallback });
      pruneWebFontLinks();
    }
    function ensureWebFont(fontName) {
      if (!isWebChallengeFont(fontName)) return null;
      const cached = webFontLinks.get(fontName);
      if (cached) {
        cached.lastUsed = ++accessCounter;
        return cached;
      }
      const href = getChallengeFontStylesheetUrl(fontName);
      const link = document2.createElement("link");
      const entry = {
        fontName,
        link,
        lastUsed: ++accessCounter,
        handleLoad: null,
        handleError: null
      };
      entry.handleLoad = () => {
        if (webFontLinks.get(fontName) !== entry) return;
        link.dataset.mmFontState = "loaded";
        entry.lastUsed = ++accessCounter;
        if (active?.fontName === fontName) applyFontToActiveTarget();
        pruneWebFontLinks();
      };
      entry.handleError = () => handleWebFontFailure(entry);
      link.id = createLinkId(document2, fontName);
      link.rel = "stylesheet";
      link.href = href;
      link.referrerPolicy = "no-referrer";
      link.dataset.mmOwned = "";
      link.dataset.mmFontChallenge = fontName;
      link.dataset.mmFontState = "loading";
      link.addEventListener("load", entry.handleLoad);
      link.addEventListener("error", entry.handleError);
      webFontLinks.set(fontName, entry);
      const mount = document2.head ?? document2.documentElement;
      if (!mount) {
        handleWebFontFailure(entry);
        return null;
      }
      try {
        mount.append(link);
      } catch {
        handleWebFontFailure(entry);
        return null;
      }
      pruneWebFontLinks();
      return entry;
    }
    function setActiveFont(fontName) {
      if (!active || !isAllowedChallengeFont(fontName)) return false;
      active.fontName = fontName;
      applyFontToActiveTarget();
      ensureWebFont(fontName);
      pruneWebFontLinks();
      return true;
    }
    function clearActiveTarget() {
      if (!active) return;
      const current = active;
      active = null;
      current.target.removeEventListener("mouseenter", current.handleEnter);
      current.target.removeEventListener("mouseleave", current.handleLeave);
      current.target.removeEventListener("click", current.handleClick);
      restoreInlineFont(current.target, current.inlineFont);
    }
    function activateTarget(target) {
      const lockedFont = getLockedFont();
      const initialFont = toLiteMode(isLiteMode2) && isWebChallengeFont(lockedFont) ? selectRandomFont({ localOnly: true }) : lockedFont ?? selectRandomFont();
      const state2 = {
        target,
        text: target.textContent.trim(),
        inlineFont: captureInlineFont(target),
        fontName: initialFont,
        revealingOriginal: false,
        handleEnter: null,
        handleLeave: null,
        handleClick: null
      };
      state2.handleEnter = () => {
        if (active !== state2) return;
        state2.revealingOriginal = true;
        restoreInlineFont(target, state2.inlineFont);
      };
      state2.handleLeave = () => {
        if (active !== state2) return;
        state2.revealingOriginal = false;
        setActiveFont(state2.fontName);
      };
      state2.handleClick = (event) => {
        if (!enabled || active !== state2) return;
        if (event.shiftKey) {
          const locked = getLockedFont();
          if (locked) {
            setLockedFont(null);
            notify(target, "FONT UNLOCKED", { font: state2.fontName });
          } else {
            setLockedFont(state2.fontName);
            notify(target, "FONT LOCKED", { font: state2.fontName });
          }
          pruneWebFontLinks();
          return;
        }
        const fontName = selectRandomFont();
        setActiveFont(fontName);
        if (getLockedFont()) setLockedFont(fontName);
      };
      active = state2;
      target.addEventListener("mouseenter", state2.handleEnter);
      target.addEventListener("mouseleave", state2.handleLeave);
      target.addEventListener("click", state2.handleClick);
      setActiveFont(initialFont);
      return true;
    }
    function resolveTarget(explicitTarget) {
      let target = explicitTarget;
      if (target === void 0) {
        try {
          target = getTarget(document2);
        } catch {
          target = null;
        }
      }
      return target?.style?.setProperty && target.isConnected ? target : null;
    }
    function reconcile(explicitTarget) {
      if (!enabled) return false;
      const target = resolveTarget(explicitTarget);
      if (!target) {
        clearActiveTarget();
        return false;
      }
      const text = target.textContent.trim();
      if (active?.target === target && active.text === text) return true;
      clearActiveTarget();
      return activateTarget(target);
    }
    function setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);
      if (!enabled) {
        clearActiveTarget();
        clearWebFontLinks();
        return false;
      }
      return reconcile();
    }
    function cleanup2() {
      enabled = false;
      clearActiveTarget();
      clearWebFontLinks();
    }
    return Object.freeze({
      setEnabled,
      enable: () => setEnabled(true),
      disable: () => setEnabled(false),
      reconcile,
      apply: reconcile,
      cleanup: cleanup2,
      getLockedFont,
      setLockedFont,
      get isEnabled() {
        return enabled;
      },
      get activeFont() {
        return active?.fontName ?? null;
      },
      get activeTarget() {
        return active?.target ?? null;
      },
      get webFontLinkCount() {
        return webFontLinks.size;
      }
    });
  }

  // src/gameplay/answer-timer-ownership.js
  function result(ok, reason, context = null, extra = {}) {
    return Object.freeze({ ok, reason, context, ...extra });
  }
  function normalizeResolutions(allowedResolutions) {
    if (allowedResolutions === null) return null;
    const resolutions = Array.isArray(allowedResolutions) ? allowedResolutions : [allowedResolutions ?? DOM_RESOLUTION.UNRESOLVED];
    return new Set(resolutions);
  }
  function createAnswerTimerOwnershipController({ lifecycle: lifecycle2, dom, clock } = {}) {
    if (!lifecycle2?.captureOwnership || !lifecycle2?.owns) {
      throw new TypeError("Answer timer ownership requires a lifecycle controller");
    }
    if (!dom?.readQuestionContext) {
      throw new TypeError("Answer timer ownership requires atomic DOM question context");
    }
    const readClock = typeof clock === "function" ? clock : () => performance.now();
    let generation = 0;
    let current = null;
    function arm({ durationMs, deadline = null, armedAt = null } = {}) {
      if (!Number.isFinite(durationMs) || durationMs <= 0) {
        throw new RangeError("Answer timer durationMs must be greater than zero");
      }
      const context = dom.readQuestionContext();
      const lifecycleOwnership = lifecycle2.captureOwnership();
      if (!context || context.resolution !== DOM_RESOLUTION.UNRESOLVED || lifecycle2.sessionState !== SESSION_STATES.ACTIVE || !lifecycle2.owns(lifecycleOwnership) || lifecycleOwnership.questionId !== context.logicalQuestionIdentity) {
        return null;
      }
      const now = readClock();
      const resolvedDeadline = Number.isFinite(deadline) ? deadline : now + durationMs;
      const resolvedArmedAt = Number.isFinite(armedAt) ? armedAt : resolvedDeadline - durationMs;
      if (resolvedDeadline <= resolvedArmedAt) {
        throw new RangeError("Answer timer deadline must follow its arm time");
      }
      generation += 1;
      current = Object.freeze({
        kind: "answer-timer",
        timerGeneration: generation,
        sessionGeneration: lifecycleOwnership.sessionGeneration,
        questionGeneration: lifecycleOwnership.questionGeneration,
        logicalQuestionIdentity: context.logicalQuestionIdentity,
        identityKind: context.identityKind,
        domGeneration: context.domGeneration,
        rootGeneration: context.rootGeneration,
        wrapperGeneration: context.wrapperGeneration,
        reviewRoot: context.root,
        wrapper: context.wrapper,
        lifecycleOwnership,
        armedAt: resolvedArmedAt,
        deadline: resolvedDeadline,
        durationMs
      });
      return current;
    }
    function validate(ownership, {
      allowedResolutions = DOM_RESOLUTION.UNRESOLVED,
      requireExactDom = true,
      requireExpired = false
    } = {}) {
      if (!ownership || ownership.kind !== "answer-timer") {
        return result(false, "missing-ownership");
      }
      if (current !== ownership || ownership.timerGeneration !== generation) {
        return result(false, "stale-timer-generation");
      }
      if (ownership.sessionGeneration !== lifecycle2.sessionGeneration || ownership.questionGeneration !== lifecycle2.questionGeneration || ownership.logicalQuestionIdentity !== lifecycle2.questionId || !lifecycle2.owns(ownership.lifecycleOwnership)) {
        return result(false, "stale-lifecycle-owner");
      }
      const context = dom.readQuestionContext();
      if (!context) return result(false, "missing-question-context");
      if (context.root !== ownership.reviewRoot) {
        return result(false, "review-root-changed", context);
      }
      if (context.logicalQuestionIdentity !== ownership.logicalQuestionIdentity) {
        return result(false, "logical-question-changed", context);
      }
      if (requireExactDom && (context.domGeneration !== ownership.domGeneration || context.wrapper !== ownership.wrapper)) {
        return result(false, "dom-generation-changed", context);
      }
      const acceptedResolutions = normalizeResolutions(allowedResolutions);
      if (acceptedResolutions && !acceptedResolutions.has(context.resolution)) {
        return result(false, "unexpected-resolution", context);
      }
      if (requireExpired && readClock() + Number.EPSILON < ownership.deadline) {
        return result(false, "deadline-not-reached", context);
      }
      return result(true, "current", context);
    }
    function rearmForCurrentDom(ownership, { restartIfExpired = true } = {}) {
      const validation = validate(ownership, {
        allowedResolutions: DOM_RESOLUTION.UNRESOLVED,
        requireExactDom: false
      });
      if (!validation.ok) return result(false, validation.reason, validation.context);
      if (validation.context.domGeneration === ownership.domGeneration) {
        return result(true, "dom-unchanged", validation.context, { ownership });
      }
      const now = readClock();
      const expired = now >= ownership.deadline;
      if (expired && !restartIfExpired) {
        invalidate(ownership);
        return result(false, "replacement-after-deadline", validation.context);
      }
      const replacement = arm({
        durationMs: ownership.durationMs,
        deadline: expired ? now + ownership.durationMs : ownership.deadline,
        armedAt: expired ? now : ownership.armedAt
      });
      return replacement ? result(
        true,
        expired ? "restarted-after-replacement" : "rearmed-replacement",
        validation.context,
        {
          ownership: replacement,
          restartedDeadline: expired
        }
      ) : result(false, "replacement-rearm-rejected", validation.context);
    }
    function invalidate(ownership = current) {
      if (!ownership || ownership !== current) return false;
      generation += 1;
      current = null;
      return true;
    }
    return Object.freeze({
      arm,
      validate,
      rearmForCurrentDom,
      invalidate,
      get current() {
        return current;
      },
      get generation() {
        return generation;
      }
    });
  }

  // src/gameplay/grades.js
  var GRADES = Object.freeze(
    [
      { minimumAccuracy: 95, minimumScore: 1e4, label: "S", color: "#ffe066" },
      { minimumAccuracy: 90, minimumScore: null, label: "A", color: "#7f7" },
      { minimumAccuracy: 75, minimumScore: null, label: "B", color: "#7cf" },
      { minimumAccuracy: 60, minimumScore: null, label: "C", color: "#f90" },
      {
        minimumAccuracy: null,
        minimumScore: null,
        label: "D",
        color: "#f55"
      }
    ].map(Object.freeze)
  );
  function getGrade(accuracy, score) {
    return GRADES.find((grade) => {
      const accuracyMatches = grade.minimumAccuracy === null || accuracy >= grade.minimumAccuracy;
      const scoreMatches = grade.minimumScore === null || score >= grade.minimumScore;
      return accuracyMatches && scoreMatches;
    });
  }

  // src/gameplay/first-input-gate.js
  function createFirstInputGate({
    lifecycle: lifecycle2,
    isCurrentInput = () => true,
    isResolved,
    onStart
  } = {}) {
    if (!lifecycle2?.markFirstInput) {
      throw new TypeError("First-input gate requires a lifecycle controller");
    }
    if (typeof isCurrentInput !== "function" || typeof isResolved !== "function" || typeof onStart !== "function") {
      throw new TypeError("First-input gate requires input, resolution, and start callbacks");
    }
    let input = null;
    let handler = null;
    let started = false;
    function disarm() {
      if (input && handler) input.removeEventListener("input", handler, true);
      input = null;
      handler = null;
    }
    function markStarted() {
      if (started) return false;
      started = true;
      disarm();
      return true;
    }
    function arm(nextInput) {
      if (started || isResolved() || !nextInput?.addEventListener) return false;
      if (input === nextInput && handler) return true;
      disarm();
      input = nextInput;
      handler = (event) => {
        const value = event.target?.value ?? "";
        if (started || !isCurrentInput(event.target) || isResolved() || String(value).length === 0) {
          return;
        }
        if (onStart() !== true) return;
        lifecycle2.markFirstInput();
        markStarted();
      };
      input.addEventListener("input", handler, true);
      return true;
    }
    function reset() {
      disarm();
      started = false;
    }
    return Object.freeze({
      arm,
      disarm,
      markStarted,
      reset,
      cleanup: reset,
      get hasStarted() {
        return started;
      },
      get input() {
        return input;
      }
    });
  }

  // src/gameplay/records.js
  var RECORD_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  function emptyRecordDay() {
    return { score: 0, combo: 0, multiplier: 1 };
  }
  function getRecordKey(time = Date.now()) {
    const date = new Date(time);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  function recordKeyToTime(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day).getTime();
  }
  function normalizeRecords(raw = {}) {
    const days = raw?.days && typeof raw.days === "object" ? raw.days : {};
    const next = { days: {} };
    for (const [key, value] of Object.entries(days)) {
      if (!RECORD_KEY_PATTERN.test(key) || !value || typeof value !== "object") {
        continue;
      }
      next.days[key] = {
        score: Math.max(0, Math.floor(Number(value.score) || 0)),
        combo: Math.max(0, Math.floor(Number(value.combo) || 0)),
        multiplier: Math.max(1, Math.floor(Number(value.multiplier) || 1))
      };
    }
    return next;
  }
  function getRecordsSignature(source = {}) {
    const normalized = normalizeRecords(source);
    return Object.keys(normalized.days).sort().map((key) => {
      const day = normalized.days[key];
      return `${key}:${day.score}/${day.combo}/${day.multiplier}`;
    }).join("|");
  }
  function getRecordWindowCutoff(time = Date.now(), windowDays = RECORD_WINDOW_DAYS) {
    const now = new Date(time);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - (windowDays - 1)).getTime();
  }
  function pruneRecords(source, time = Date.now(), windowDays = RECORD_WINDOW_DAYS) {
    const records2 = normalizeRecords(source);
    const cutoff = getRecordWindowCutoff(time, windowDays);
    for (const key of Object.keys(records2.days)) {
      if (recordKeyToTime(key) < cutoff) delete records2.days[key];
    }
    return records2;
  }
  function getRollingRecords(source, time = Date.now(), windowDays = RECORD_WINDOW_DAYS) {
    const records2 = pruneRecords(source, time, windowDays);
    const best = emptyRecordDay();
    for (const day of Object.values(records2.days)) {
      best.score = Math.max(best.score, day.score);
      best.combo = Math.max(best.combo, day.combo);
      best.multiplier = Math.max(best.multiplier, day.multiplier);
    }
    return best;
  }
  function updateRollingRecords(source, state2, time = Date.now(), windowDays = RECORD_WINDOW_DAYS) {
    const previousSignature = getRecordsSignature(source);
    const records2 = pruneRecords(source, time, windowDays);
    const key = getRecordKey(time);
    const day = records2.days[key] || emptyRecordDay();
    const next = {
      score: Math.max(day.score, state2.score),
      combo: Math.max(day.combo, state2.answerStreak),
      multiplier: Math.max(day.multiplier, state2.multiplier)
    };
    const recordImproved = next.score !== day.score || next.combo !== day.combo || next.multiplier !== day.multiplier;
    if (recordImproved) records2.days[key] = next;
    const changed = recordImproved || getRecordsSignature(records2) !== previousSignature;
    return { records: records2, changed };
  }

  // src/gameplay/record-reset.js
  function resetRecordsAuthoritatively({ rewind, setRecords, saveRecords: saveRecords2, updateHud } = {}) {
    if (typeof setRecords !== "function") {
      throw new TypeError("Authoritative record reset requires a state setter");
    }
    if (typeof saveRecords2 !== "function") {
      throw new TypeError("Authoritative record reset requires persistence");
    }
    if (typeof updateHud !== "function") {
      throw new TypeError("Authoritative record reset requires a HUD update");
    }
    const emptyRecords = normalizeRecords({ days: {} });
    if (rewind?.hasSnapshot) {
      if (typeof rewind.updateSnapshot === "function") {
        try {
          rewind.updateSnapshot((snapshot) => ({
            ...snapshot,
            records: normalizeRecords(emptyRecords)
          }));
        } catch {
          rewind.discard?.();
        }
      } else {
        rewind.discard?.();
      }
    }
    setRecords(emptyRecords);
    saveRecords2();
    updateHud();
    return emptyRecords;
  }

  // src/gameplay/scoring.js
  function calcMultiplier(streak) {
    return Math.min(10, 1 + Math.floor(streak / 5));
  }
  function getDifficultyXpMultiplier(settings2 = DEFAULT_SETTINGS) {
    let multiplier = 1;
    if (settings2.timeoutFailureEnabled) multiplier *= 1.25;
    if (settings2.fontChallengeEnabled) multiplier *= 1.15;
    return multiplier;
  }
  function getTimerDurationXpModifier(timerSeconds) {
    if (timerSeconds <= 10) return 1.2;
    if (timerSeconds <= 15) return 1;
    if (timerSeconds <= 30) return 0.8;
    if (timerSeconds <= 45) return 0.65;
    if (timerSeconds <= 60) return 0.55;
    if (timerSeconds <= 90) return 0.45;
    return 0.35;
  }
  function getSpeedXpTier(remainingPct) {
    const percentage = clamp(remainingPct, 0, 1, 0);
    return SPEED_XP_TIERS.find((tier) => percentage > tier.minRemainingPct) || SPEED_XP_TIERS[SPEED_XP_TIERS.length - 1];
  }
  function getTimedXpMultiplier(tier, timerSeconds = DEFAULT_SETTINGS.timerSeconds) {
    if (!tier || tier.segment === 0) return 1;
    const durationModifier = getTimerDurationXpModifier(timerSeconds);
    return clamp(1 + (tier.multiplier - 1) * durationModifier, 1, MAX_TIMED_XP_MULTIPLIER, 1);
  }
  function evaluateTimedXpAward({ settings: settings2 = DEFAULT_SETTINGS, timerState: timerState2, remainingPct }) {
    const tier = getSpeedXpTier(remainingPct);
    const questionId = timerState2.currentQuestionId;
    const eligible = settings2.timerEnabled && settings2.timedXpBonusEnabled && timerState2.running && !timerState2.expired && remainingPct > 0 && questionId > 0 && timerState2.awardedForQuestionId !== questionId;
    return {
      eligible,
      remainingPct,
      tier,
      multiplier: eligible ? getTimedXpMultiplier(tier, settings2.timerSeconds) : 1,
      awardedForQuestionId: questionId > 0 ? questionId : timerState2.awardedForQuestionId
    };
  }
  function getCurrentXpBonusMultiplier({
    settings: settings2 = DEFAULT_SETTINGS,
    timerState: timerState2,
    remainingPct = null
  }) {
    let timedMultiplier = 1;
    if (settings2.timerEnabled && settings2.timedXpBonusEnabled && timerState2.running && !timerState2.expired) {
      const percentage = Number.isFinite(remainingPct) ? remainingPct : timerState2.remainingPct;
      timedMultiplier = getTimedXpMultiplier(getSpeedXpTier(percentage), settings2.timerSeconds);
    }
    return getDifficultyXpMultiplier(settings2) * timedMultiplier;
  }
  function calcAnswerPoints(multiplier, timedXpMultiplier = 1, settings2 = DEFAULT_SETTINGS) {
    const points = 100 * multiplier * getDifficultyXpMultiplier(settings2) * timedXpMultiplier;
    return Math.round(points / 10) * 10;
  }
  function calcIncorrectPenalty(score, lostStreak) {
    return Math.min(score, 50 * Math.floor(lostStreak / 5));
  }

  // src/gameplay/rewind.js
  var RESOLVED_STATES = /* @__PURE__ */ new Set([DOM_RESOLUTION.CORRECT, DOM_RESOLUTION.INCORRECT]);
  function result2(ok, status, reason, source, extra = {}) {
    return Object.freeze({ ok, status, reason, source, ...extra });
  }
  function defaultClock() {
    return globalThis.performance?.now?.() ?? Date.now();
  }
  function createTransactionalRewind({
    lifecycle: lifecycle2,
    dom,
    restoreSnapshot,
    cancelSummary = () => {
    },
    onCommit = () => {
    },
    onFailure = () => {
    },
    timeoutMs = 750,
    recoveryWindowMs = 2e3,
    clock = defaultClock
  } = {}) {
    if (!lifecycle2?.captureOwnership || !lifecycle2?.owns) {
      throw new TypeError("Transactional rewind requires a lifecycle controller");
    }
    if (!dom?.readQuestionContext) {
      throw new TypeError("Transactional rewind requires atomic MaruMori DOM context");
    }
    if (typeof restoreSnapshot !== "function") {
      throw new TypeError("Transactional rewind requires snapshot restoration");
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new RangeError("Rewind confirmation timeout must be positive");
    }
    if (!Number.isFinite(recoveryWindowMs) || recoveryWindowMs <= 0) {
      throw new RangeError("Rewind recovery window must be positive");
    }
    let captured = null;
    let pending = null;
    let recentRecovery = null;
    let programmaticInvocationDepth = 0;
    let nextSnapshotGeneration = 1;
    let nextTransactionGeneration = 1;
    function readOwnedContext(record) {
      if (!record || !lifecycle2.owns(record.ownership) || lifecycle2.answerGeneration !== record.answerGeneration) {
        return { ok: false, reason: "stale-owner", context: null };
      }
      const context = dom.readQuestionContext();
      if (!context) return { ok: false, reason: "missing-question-context", context: null };
      if (context.root !== record.reviewRoot) {
        return { ok: false, reason: "review-root-changed", context };
      }
      if (context.logicalQuestionIdentity !== record.sourceLogicalQuestionIdentity) {
        return { ok: false, reason: "question-changed", context };
      }
      if (record.identityKind === "fallback" && context.domGeneration !== record.sourceDomGeneration) {
        return { ok: false, reason: "fallback-dom-changed", context };
      }
      return { ok: true, reason: "current", context };
    }
    function capture(snapshot) {
      if (pending) return false;
      if (recentRecovery) {
        clearRecoveryCandidate("superseded-by-new-answer", { discard: true, notify: false });
      }
      const context = dom.readQuestionContext();
      const ownership = lifecycle2.captureOwnership();
      if (!context || !RESOLVED_STATES.has(context.resolution) || !lifecycle2.owns(ownership) || ownership.questionId !== context.logicalQuestionIdentity) {
        return false;
      }
      const snapshotIdentity = `${ownership.sessionGeneration}:${ownership.questionGeneration}:${nextSnapshotGeneration++}`;
      captured = Object.freeze({
        snapshot,
        snapshotIdentity,
        resolution: context.resolution,
        sourceLogicalQuestionIdentity: context.logicalQuestionIdentity,
        sourceDomGeneration: context.domGeneration,
        identityKind: context.identityKind,
        reviewRoot: context.root,
        wrapper: context.wrapper,
        progress: Object.freeze({
          current: context.progress.current,
          total: context.progress.total
        }),
        ownership,
        answerGeneration: lifecycle2.answerGeneration
      });
      return true;
    }
    function updateSnapshot(update) {
      if (typeof update !== "function") {
        throw new TypeError("Rewind snapshot update requires a function");
      }
      const records2 = [captured, pending, recentRecovery].filter(Boolean);
      if (records2.length === 0) return false;
      const replacements = /* @__PURE__ */ new Map();
      for (const record of records2) {
        if (replacements.has(record.snapshot)) continue;
        const replacement = update(record.snapshot);
        if (!replacement || typeof replacement !== "object") {
          throw new TypeError("Rewind snapshot update must return an object");
        }
        replacements.set(record.snapshot, replacement);
      }
      let changed = false;
      if (captured) {
        const replacement = replacements.get(captured.snapshot);
        if (replacement !== captured.snapshot) {
          captured = Object.freeze({ ...captured, snapshot: replacement });
          changed = true;
        }
      }
      for (const record of [pending, recentRecovery]) {
        if (!record) continue;
        const replacement = replacements.get(record.snapshot);
        if (replacement !== record.snapshot) {
          record.snapshot = replacement;
          changed = true;
        }
      }
      return changed;
    }
    function isCaptureCurrent() {
      if (!captured) return false;
      const validation = readOwnedContext(captured);
      return validation.ok && validation.context.resolution === captured.resolution;
    }
    function cleanupPending(transaction) {
      transaction.cancelTimeout?.();
      transaction.stopObserving?.();
      transaction.removeOwnershipCleanup?.();
      transaction.cancelTimeout = null;
      transaction.stopObserving = null;
      transaction.removeOwnershipCleanup = null;
    }
    function settle(transaction, outcome5, { discard = false } = {}) {
      if (pending !== transaction || transaction.settled) return;
      transaction.settled = true;
      cleanupPending(transaction);
      pending = null;
      if (!outcome5.ok && lifecycle2.owns(transaction.ownership)) {
        lifecycle2.cancelRewind?.();
      }
      if (discard) captured = null;
      transaction.resolve(outcome5);
      if (!outcome5.ok) onFailure(outcome5);
    }
    function performRestore(record, source, { recovered = false, context } = {}) {
      let outcome5;
      try {
        cancelSummary();
        const restored = restoreSnapshot(record.snapshot, {
          source,
          ownership: record.ownership,
          snapshotIdentity: record.snapshotIdentity,
          recovered
        });
        if (restored === false) throw new Error("Snapshot restoration was rejected");
        if (!lifecycle2.confirmRewind?.()) {
          throw new Error("Lifecycle rejected rewind confirmation");
        }
        captured = null;
        outcome5 = result2(
          true,
          recovered ? "recovered" : "committed",
          recovered ? "late-confirmed-unresolved" : "confirmed-unresolved",
          source,
          {
            transactionGeneration: record.transactionGeneration,
            snapshotIdentity: record.snapshotIdentity,
            recovered,
            progress: context ? Object.freeze({
              current: context.progress.current,
              total: context.progress.total
            }) : null
          }
        );
      } catch (error) {
        lifecycle2.cancelRewind?.();
        outcome5 = Object.freeze({
          ...result2(false, "failed", "snapshot-restore-failed", source, {
            transactionGeneration: record.transactionGeneration,
            snapshotIdentity: record.snapshotIdentity,
            recovered
          }),
          error
        });
      }
      if (outcome5.ok) onCommit(outcome5);
      else onFailure(outcome5);
      return outcome5;
    }
    function commit(transaction, context) {
      if (pending !== transaction || transaction.settled) return false;
      transaction.settled = true;
      cleanupPending(transaction);
      pending = null;
      const outcome5 = performRestore(transaction, transaction.source, { context });
      transaction.resolve(outcome5);
      return outcome5.ok;
    }
    function clearRecoveryCandidate(reason, { discard = false, notify = true, keepCapture = false } = {}) {
      const candidate = recentRecovery;
      if (!candidate) return false;
      recentRecovery = null;
      candidate.cancelRecoveryTimeout?.();
      candidate.removeOwnershipCleanup?.();
      candidate.cancelRecoveryTimeout = null;
      candidate.removeOwnershipCleanup = null;
      if (discard && !keepCapture) captured = null;
      if (notify) {
        onFailure(
          result2(false, "cancelled", reason, candidate.source, {
            transactionGeneration: candidate.transactionGeneration,
            snapshotIdentity: candidate.snapshotIdentity,
            recoveryExpired: reason === "late-recovery-expired"
          })
        );
      }
      return true;
    }
    function expireRecoveryCandidate(candidate) {
      if (recentRecovery !== candidate) return;
      const keepCapture = isCaptureCurrent();
      clearRecoveryCandidate("late-recovery-expired", {
        discard: !keepCapture,
        keepCapture
      });
    }
    function enterRecovery(transaction) {
      if (pending !== transaction || transaction.settled) return;
      transaction.settled = true;
      cleanupPending(transaction);
      pending = null;
      lifecycle2.cancelRewind?.();
      const expiredAt = clock();
      const candidate = {
        ...transaction,
        settled: true,
        expiredAt,
        recoveryDeadline: expiredAt + recoveryWindowMs,
        cancelRecoveryTimeout: null,
        removeOwnershipCleanup: null
      };
      recentRecovery = candidate;
      candidate.removeOwnershipCleanup = lifecycle2.questionScope?.defer(() => {
        clearRecoveryCandidate("late-recovery-owner-lost", {
          discard: true,
          notify: false
        });
      }) ?? (() => {
      });
      candidate.cancelRecoveryTimeout = lifecycle2.questionScope?.setTimeout(
        () => expireRecoveryCandidate(candidate),
        recoveryWindowMs
      );
      const outcome5 = result2(false, "failed", "confirmation-timeout", transaction.source, {
        transactionGeneration: transaction.transactionGeneration,
        snapshotIdentity: transaction.snapshotIdentity,
        recoveryPending: true,
        recoveryDeadline: candidate.recoveryDeadline
      });
      transaction.resolve(outcome5);
      onFailure(outcome5);
    }
    function reconcileRecovery() {
      const candidate = recentRecovery;
      if (!candidate) return false;
      if (clock() > candidate.recoveryDeadline) {
        expireRecoveryCandidate(candidate);
        return false;
      }
      const validation = readOwnedContext(candidate);
      if (!validation.ok) {
        if (validation.reason !== "missing-question-context") {
          clearRecoveryCandidate(`late-recovery-${validation.reason}`, { discard: true });
        }
        return false;
      }
      const { context } = validation;
      if (context.resolution === candidate.originResolution) return false;
      if (context.resolution !== DOM_RESOLUTION.UNRESOLVED) {
        clearRecoveryCandidate("late-recovery-superseded", { discard: true });
        return false;
      }
      clearRecoveryCandidate("late-recovery-committing", {
        keepCapture: true,
        notify: false
      });
      if (!lifecycle2.beginRewind?.()) {
        captured = null;
        onFailure(
          result2(false, "failed", "late-recovery-lifecycle-rejected", candidate.source)
        );
        return false;
      }
      return performRestore(candidate, candidate.source, {
        recovered: true,
        context
      }).ok;
    }
    function reconcilePending() {
      const transaction = pending;
      if (!transaction || transaction.settled) return false;
      const validation = readOwnedContext(transaction);
      if (!validation.ok) {
        if (validation.reason === "missing-question-context") return false;
        settle(transaction, result2(false, "cancelled", validation.reason, transaction.source), {
          discard: true
        });
        return false;
      }
      const { context } = validation;
      if (context.resolution === DOM_RESOLUTION.UNRESOLVED && transaction.sawResolved) {
        return commit(transaction, context);
      }
      if (context.resolution !== transaction.originResolution) {
        settle(
          transaction,
          result2(false, "failed", "unexpected-resolution", transaction.source)
        );
        return false;
      }
      transaction.sawResolved = true;
      return false;
    }
    function reconcile() {
      if (pending) return reconcilePending();
      if (recentRecovery) return reconcileRecovery();
      if (captured) {
        const validation = readOwnedContext(captured);
        if (validation.reason !== "missing-question-context" && (!validation.ok || validation.context.resolution !== captured.resolution)) {
          const source = "snapshot";
          const snapshotIdentity = captured.snapshotIdentity;
          captured = null;
          onFailure(
            result2(false, "cancelled", "snapshot-no-longer-current", source, {
              snapshotIdentity
            })
          );
        }
      }
      return false;
    }
    function createTransaction(source) {
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      const startedAt = clock();
      const transaction = {
        transactionGeneration: nextTransactionGeneration++,
        source,
        promise,
        resolve: resolvePromise,
        ownership: captured.ownership,
        sessionGeneration: captured.ownership.sessionGeneration,
        questionGeneration: captured.ownership.questionGeneration,
        answerGeneration: captured.answerGeneration,
        sourceLogicalQuestionIdentity: captured.sourceLogicalQuestionIdentity,
        sourceDomGeneration: captured.sourceDomGeneration,
        expectedDestinationLogicalQuestionIdentity: captured.sourceLogicalQuestionIdentity,
        identityKind: captured.identityKind,
        reviewRoot: captured.reviewRoot,
        wrapper: captured.wrapper,
        originResolution: captured.resolution,
        snapshot: captured.snapshot,
        snapshotIdentity: captured.snapshotIdentity,
        startedAt,
        confirmationDeadline: startedAt + timeoutMs,
        sawResolved: true,
        settled: false,
        cancelTimeout: null,
        stopObserving: null,
        removeOwnershipCleanup: null
      };
      pending = transaction;
      return transaction;
    }
    function begin({ source, invokeNative }) {
      if (pending) return pending.promise;
      if (recentRecovery) {
        return Promise.resolve(result2(false, "failed", "late-recovery-pending", source));
      }
      if (!isCaptureCurrent()) {
        return Promise.resolve(result2(false, "failed", "snapshot-not-current", source));
      }
      const capability = invokeNative ? dom.getNativeRewindCapability?.() : null;
      if (invokeNative && !capability) {
        const outcome5 = result2(false, "failed", "native-rewind-unavailable", source);
        onFailure(outcome5);
        return Promise.resolve(outcome5);
      }
      if (!lifecycle2.beginRewind?.()) {
        const outcome5 = result2(false, "failed", "lifecycle-not-resolved", source);
        onFailure(outcome5);
        return Promise.resolve(outcome5);
      }
      const transaction = createTransaction(source);
      transaction.stopObserving = dom.observeResolution?.(reconcile) ?? (() => {
      });
      transaction.removeOwnershipCleanup = lifecycle2.questionScope?.defer(() => {
        settle(transaction, result2(false, "cancelled", "stale-owner", source), {
          discard: true
        });
      }) ?? (() => {
      });
      transaction.cancelTimeout = lifecycle2.questionScope?.setTimeout(() => {
        reconcile();
        if (pending === transaction) enterRecovery(transaction);
      }, timeoutMs);
      if (!invokeNative) return transaction.promise;
      programmaticInvocationDepth += 1;
      let invoked = false;
      try {
        invoked = capability.invoke();
      } finally {
        programmaticInvocationDepth -= 1;
      }
      if (!invoked) {
        settle(transaction, result2(false, "failed", "native-invocation-failed", source));
        return transaction.promise;
      }
      reconcile();
      return transaction.promise;
    }
    return Object.freeze({
      capture,
      updateSnapshot,
      request(source = "hud") {
        return begin({ source, invokeNative: true });
      },
      trackNativeIntent(source = "native") {
        if (programmaticInvocationDepth > 0 && pending) return pending.promise;
        return begin({ source, invokeNative: false });
      },
      reconcile,
      discard() {
        if (pending) {
          settle(pending, result2(false, "cancelled", "discarded", pending.source), {
            discard: true
          });
        }
        clearRecoveryCandidate("discarded", { discard: true, notify: false });
        captured = null;
      },
      get hasSnapshot() {
        return Boolean(captured);
      },
      get isPending() {
        return Boolean(pending || recentRecovery);
      },
      get hasRecoveryCandidate() {
        return Boolean(recentRecovery);
      },
      get isInvokingNative() {
        return programmaticInvocationDepth > 0;
      }
    });
  }

  // src/gameplay/timeout-failure.js
  function outcome4(ok, status, reason, source, extra = {}) {
    return Object.freeze({ ok, status, reason, source, ...extra });
  }
  function createTimeoutFailureController({
    lifecycle: lifecycle2,
    dom,
    validateTimerOwnership,
    invalidValue = () => `__mm_timeout_${Date.now()}__`,
    resolutionTimeoutMs = 1200,
    advanceDelayMs = 150,
    canAdvance = () => true,
    onIncorrectConfirmed = () => {
    },
    onUnresolvedFailure = () => {
    },
    onFailure = () => {
    },
    onSettled = () => {
    }
  } = {}) {
    if (!lifecycle2?.owns) {
      throw new TypeError("Timeout failure requires a lifecycle controller");
    }
    if (!dom?.readQuestionContext) {
      throw new TypeError("Timeout failure requires atomic MaruMori DOM context");
    }
    if (typeof validateTimerOwnership !== "function") {
      throw new TypeError("Timeout failure requires timer ownership validation");
    }
    let pending = null;
    let nextTransactionGeneration = 1;
    function getAdvanceContext(transaction) {
      return Object.freeze({
        transactionGeneration: transaction.generation,
        timerOwnership: transaction.timerOwnership,
        ownership: transaction.ownership,
        questionIdentity: transaction.questionIdentity,
        domGeneration: transaction.domGeneration,
        reviewRoot: transaction.reviewRoot,
        wrapper: transaction.wrapper,
        source: transaction.source,
        strategy: transaction.strategy
      });
    }
    function validateTransaction(transaction, allowedResolutions) {
      const validation = validateTimerOwnership(transaction.timerOwnership, {
        allowedResolutions,
        requireExactDom: true
      });
      if (!validation?.ok) return validation ?? { ok: false, reason: "timer-owner-rejected" };
      const { context } = validation;
      if (!context || !lifecycle2.owns(transaction.ownership) || transaction.timerOwnership.lifecycleOwnership !== transaction.ownership || context.logicalQuestionIdentity !== transaction.questionIdentity || context.domGeneration !== transaction.domGeneration || context.root !== transaction.reviewRoot || context.wrapper !== transaction.wrapper) {
        return Object.freeze({ ok: false, reason: "transaction-owner-mismatch", context });
      }
      return validation;
    }
    function restoreInjectedInput(transaction) {
      const injected = transaction.injectedInput;
      if (!injected) return false;
      transaction.injectedInput = null;
      const validation = validateTransaction(transaction, DOM_RESOLUTION.UNRESOLVED);
      if (!validation.ok || dom.getAnswerInput?.() !== injected.input) return false;
      return dom.setAnswerValue?.(injected.input, injected.originalValue) ?? false;
    }
    function settle(transaction, result3, { restore = false } = {}) {
      if (pending !== transaction || transaction.settled) return;
      transaction.settled = true;
      transaction.cancelResolutionTimeout?.();
      transaction.cancelAdvance?.();
      transaction.stopObserving?.();
      transaction.removeOwnershipCleanup?.();
      const restoredInput = restore ? restoreInjectedInput(transaction) : false;
      pending = null;
      const unresolvedValidation = !result3.ok ? validateTransaction(transaction, DOM_RESOLUTION.UNRESOLVED) : null;
      const originStillUnresolved = unresolvedValidation?.ok === true;
      const finalResult = Object.freeze({
        ...result3,
        transactionGeneration: transaction.generation,
        timerGeneration: transaction.timerOwnership.timerGeneration,
        ...restoredInput ? { restoredInput: true } : {},
        ...originStillUnresolved ? { originStillUnresolved: true } : {}
      });
      transaction.resolve(finalResult);
      if (originStillUnresolved) onUnresolvedFailure(finalResult);
      if (!finalResult.ok) onFailure(finalResult);
      onSettled(finalResult, getAdvanceContext(transaction));
    }
    function suppressAdvance(transaction) {
      settle(
        transaction,
        outcome4(true, "completed", "automatic-advance-suppressed", transaction.source, {
          strategy: transaction.strategy
        })
      );
    }
    function advance(transaction) {
      if (pending !== transaction || transaction.settled || transaction.advanceState !== "scheduled") {
        return;
      }
      const validation = validateTransaction(transaction, DOM_RESOLUTION.INCORRECT);
      if (!validation.ok) {
        settle(
          transaction,
          outcome4(
            false,
            "cancelled",
            `stale-before-advance:${validation.reason}`,
            transaction.source
          )
        );
        return;
      }
      if (!canAdvance(getAdvanceContext(transaction))) {
        suppressAdvance(transaction);
        return;
      }
      const next = dom.getCapability?.("next");
      if (!next) {
        settle(transaction, outcome4(false, "failed", "next-unavailable", transaction.source));
        return;
      }
      transaction.advanceState = "invoking";
      transaction.committingAdvance = true;
      const invoked = next.invoke();
      transaction.committingAdvance = false;
      if (!invoked) {
        settle(
          transaction,
          outcome4(false, "failed", "next-invocation-failed", transaction.source)
        );
        return;
      }
      transaction.advanceState = "done";
      settle(
        transaction,
        outcome4(true, "advanced", "incorrect-confirmed", transaction.source, {
          strategy: transaction.strategy
        })
      );
    }
    function confirmIncorrect(transaction) {
      if (transaction.incorrectConfirmed) return;
      const validation = validateTransaction(transaction, DOM_RESOLUTION.INCORRECT);
      if (!validation.ok) {
        settle(
          transaction,
          outcome4(
            false,
            "cancelled",
            `stale-before-confirm:${validation.reason}`,
            transaction.source
          )
        );
        return;
      }
      transaction.incorrectConfirmed = true;
      transaction.injectedInput = null;
      transaction.cancelResolutionTimeout?.();
      transaction.cancelResolutionTimeout = null;
      lifecycle2.resolve?.("incorrect");
      onIncorrectConfirmed(getAdvanceContext(transaction));
      const afterCallback = validateTransaction(transaction, DOM_RESOLUTION.INCORRECT);
      if (!afterCallback.ok) {
        settle(
          transaction,
          outcome4(
            false,
            "cancelled",
            `stale-after-confirm:${afterCallback.reason}`,
            transaction.source
          )
        );
        return;
      }
      if (!canAdvance(getAdvanceContext(transaction))) {
        suppressAdvance(transaction);
        return;
      }
      transaction.advanceState = "scheduled";
      transaction.cancelAdvance = lifecycle2.questionScope?.setTimeout(
        () => advance(transaction),
        advanceDelayMs
      );
    }
    function reconcile() {
      const transaction = pending;
      if (!transaction || transaction.settled) return false;
      const validation = validateTransaction(transaction, [
        DOM_RESOLUTION.UNRESOLVED,
        DOM_RESOLUTION.INCORRECT,
        DOM_RESOLUTION.CORRECT
      ]);
      if (!validation.ok) {
        settle(
          transaction,
          outcome4(
            false,
            "cancelled",
            `ownership-rejected:${validation.reason}`,
            transaction.source
          )
        );
        return false;
      }
      const resolution = validation.context.resolution;
      if (resolution === DOM_RESOLUTION.INCORRECT) {
        confirmIncorrect(transaction);
        return true;
      }
      if (resolution === DOM_RESOLUTION.CORRECT) {
        settle(
          transaction,
          outcome4(false, "cancelled", "natural-answer-won-race", transaction.source)
        );
      }
      return false;
    }
    function createTransaction(source, timerOwnership) {
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      const transaction = {
        generation: nextTransactionGeneration++,
        source,
        promise,
        resolve: resolvePromise,
        timerOwnership,
        ownership: timerOwnership.lifecycleOwnership,
        questionIdentity: timerOwnership.logicalQuestionIdentity,
        domGeneration: timerOwnership.domGeneration,
        reviewRoot: timerOwnership.reviewRoot,
        wrapper: timerOwnership.wrapper,
        strategy: null,
        injectedInput: null,
        incorrectConfirmed: false,
        advanceState: "idle",
        committingAdvance: false,
        settled: false,
        cancelResolutionTimeout: null,
        cancelAdvance: null,
        stopObserving: null,
        removeOwnershipCleanup: null
      };
      pending = transaction;
      return transaction;
    }
    function immediateFailure(source, reason, timerOwnership = null) {
      const failure = outcome4(false, "failed", reason, source, {
        ...timerOwnership ? { timerGeneration: timerOwnership.timerGeneration } : {}
      });
      onFailure(failure);
      onSettled(failure, null);
      return Promise.resolve(failure);
    }
    function start(source = "timeout", timerOwnership = null) {
      if (pending) {
        if (pending.timerOwnership === timerOwnership) return pending.promise;
        settle(
          pending,
          outcome4(false, "cancelled", "superseded-by-new-timer", pending.source),
          { restore: true }
        );
      }
      if (!timerOwnership) return immediateFailure(source, "missing-timer-ownership");
      const initialValidation = validateTimerOwnership(timerOwnership, {
        allowedResolutions: DOM_RESOLUTION.UNRESOLVED,
        requireExactDom: true,
        requireExpired: true
      });
      if (!initialValidation?.ok) {
        return immediateFailure(
          source,
          `timer-owner-rejected:${initialValidation?.reason ?? "unknown"}`,
          timerOwnership
        );
      }
      const transaction = createTransaction(source, timerOwnership);
      if (!validateTransaction(transaction, DOM_RESOLUTION.UNRESOLVED).ok) {
        settle(transaction, outcome4(false, "cancelled", "stale-owner", source));
        return transaction.promise;
      }
      transaction.stopObserving = dom.observeResolution?.(reconcile) ?? (() => {
      });
      transaction.removeOwnershipCleanup = lifecycle2.questionScope?.defer(() => {
        if (transaction.committingAdvance) return;
        settle(transaction, outcome4(false, "cancelled", "stale-owner", source), {
          restore: true
        });
      }) ?? (() => {
      });
      transaction.cancelResolutionTimeout = lifecycle2.questionScope?.setTimeout(() => {
        reconcile();
        if (pending === transaction && !transaction.incorrectConfirmed) {
          settle(transaction, outcome4(false, "failed", "resolution-timeout", source), {
            restore: true
          });
        }
      }, resolutionTimeoutMs);
      let validation = validateTransaction(transaction, DOM_RESOLUTION.UNRESOLVED);
      if (!validation.ok) {
        settle(
          transaction,
          outcome4(false, "cancelled", `stale-before-failure:${validation.reason}`, source)
        );
        return transaction.promise;
      }
      const wrong = dom.getCapability?.("wrong");
      if (wrong) {
        transaction.strategy = "wrong-control";
        validation = validateTransaction(transaction, DOM_RESOLUTION.UNRESOLVED);
        if (!validation.ok) {
          settle(
            transaction,
            outcome4(false, "cancelled", `stale-before-wrong:${validation.reason}`, source)
          );
        } else if (!wrong.invoke()) {
          settle(transaction, outcome4(false, "failed", "wrong-invocation-failed", source));
        } else {
          reconcile();
        }
        return transaction.promise;
      }
      const input = dom.getAnswerInput?.();
      const submit = dom.getCapability?.("submit");
      if (!input || !submit) {
        settle(transaction, outcome4(false, "failed", "auto-fail-unavailable", source));
        return transaction.promise;
      }
      transaction.strategy = "invalid-answer";
      transaction.injectedInput = { input, originalValue: input.value };
      validation = validateTransaction(transaction, DOM_RESOLUTION.UNRESOLVED);
      if (!validation.ok || dom.getAnswerInput?.() !== input) {
        settle(transaction, outcome4(false, "cancelled", "stale-before-input", source));
        return transaction.promise;
      }
      if (!dom.setAnswerValue(input, invalidValue())) {
        settle(transaction, outcome4(false, "failed", "input-injection-failed", source), {
          restore: true
        });
        return transaction.promise;
      }
      validation = validateTransaction(transaction, DOM_RESOLUTION.UNRESOLVED);
      if (!validation.ok || dom.getAnswerInput?.() !== input) {
        settle(transaction, outcome4(false, "cancelled", "stale-before-submit", source), {
          restore: true
        });
        return transaction.promise;
      }
      if (!submit.invoke()) {
        settle(transaction, outcome4(false, "failed", "submit-invocation-failed", source), {
          restore: true
        });
        return transaction.promise;
      }
      reconcile();
      return transaction.promise;
    }
    return Object.freeze({
      start,
      reconcile,
      cancel(reason = "cancelled") {
        if (!pending) return false;
        settle(pending, outcome4(false, "cancelled", reason, pending.source), { restore: true });
        return true;
      },
      get isPending() {
        return Boolean(pending);
      }
    });
  }

  // src/storage/settings.js
  var hasOwn2 = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  function readFiniteSettingNumber(value) {
    if (value === null || value === void 0) return null;
    if (typeof value === "string" && value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function normalizeLegacyTimerSeconds(value) {
    const milliseconds = readFiniteSettingNumber(value);
    if (milliseconds === null) return DEFAULT_SETTINGS.timerSeconds;
    return clamp(milliseconds / 1e3, 5, 120, DEFAULT_SETTINGS.timerSeconds);
  }
  function normalizeBackgroundTheme(theme, fallback = DEFAULT_SETTINGS.backgroundTheme) {
    const raw = typeof theme === "string" ? theme.trim() : "";
    const alias = THEME_ALIASES[raw] || THEME_ALIASES[raw.toLowerCase()];
    const candidate = alias || raw;
    if (BACKGROUND_THEME_IDS.includes(candidate)) return candidate;
    if (hasOwn2(REMOVED_BACKGROUND_THEME_FALLBACKS, candidate)) {
      return REMOVED_BACKGROUND_THEME_FALLBACKS[candidate];
    }
    return BACKGROUND_THEME_IDS.includes(fallback) ? fallback : DEFAULT_SETTINGS.backgroundTheme;
  }
  function normalizeSettings(raw = {}) {
    const source = raw && typeof raw === "object" ? raw : {};
    const next = { ...DEFAULT_SETTINGS };
    const settingsVersion = Math.max(0, Math.floor(Number(source.settingsVersion) || 0));
    for (const key of BOOLEAN_SETTING_KEYS) {
      if (typeof source[key] === "boolean") next[key] = source[key];
    }
    if (settingsVersion < 2) next.failureFlashEnabled = true;
    next.settingsVersion = DEFAULT_SETTINGS.settingsVersion;
    if (typeof source.crtEnabled !== "boolean" && typeof source.arcadeEnabled === "boolean") {
      next.crtEnabled = source.arcadeEnabled;
    }
    if (typeof source.timeoutFailureEnabled !== "boolean" && typeof source.autoFailTimeout === "boolean") {
      next.timeoutFailureEnabled = source.autoFailTimeout;
    }
    next.volume = clamp(source.volume, 0, 1, DEFAULT_SETTINGS.volume);
    next.musicVolume = clamp(source.musicVolume, 0, 0.5, DEFAULT_SETTINGS.musicVolume);
    const timerFallback = normalizeLegacyTimerSeconds(source.comboTimeout);
    const currentTimerSeconds = readFiniteSettingNumber(source.timerSeconds);
    next.timerSeconds = Math.round(
      currentTimerSeconds === null ? timerFallback : clamp(currentTimerSeconds, 5, 120, timerFallback)
    );
    if (MUSIC_STYLES.includes(source.musicStyle)) {
      next.musicStyle = source.musicStyle;
    }
    if (PERFORMANCE_PROFILES.includes(source.performanceProfile)) {
      next.performanceProfile = source.performanceProfile;
    } else if (source.performanceMode === true) {
      next.performanceProfile = "lite";
    }
    const hasPinnedBackgroundTheme = typeof source.pinnedBackgroundTheme === "string";
    next.backgroundTheme = normalizeBackgroundTheme(source.backgroundTheme);
    next.pinnedBackgroundTheme = normalizeBackgroundTheme(
      source.pinnedBackgroundTheme,
      next.backgroundTheme
    );
    if (hasPinnedBackgroundTheme) {
      next.backgroundTheme = next.pinnedBackgroundTheme;
    }
    if (source.hudPosition && typeof source.hudPosition === "object") {
      const x = Number(source.hudPosition.x);
      const y = Number(source.hudPosition.y);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        next.hudPosition = { x, y };
      }
    }
    return next;
  }

  // src/ui/combo-timer.js
  var COMBO_TIMER_STATUS = Object.freeze({
    IDLE: "idle",
    RUNNING: "running",
    PAUSED: "paused",
    STOPPED: "stopped",
    EXPIRED: "expired",
    DISPOSED: "disposed"
  });
  var BOUNDARY_EPSILON = 1e-9;
  function defaultClock2() {
    return globalThis.performance?.now?.() ?? Date.now();
  }
  function defaultScheduler6() {
    return {
      setTimeout(callback, delay) {
        return globalThis.setTimeout(callback, delay);
      },
      clearTimeout(timerId) {
        globalThis.clearTimeout(timerId);
      },
      requestAnimationFrame(callback) {
        if (typeof globalThis.requestAnimationFrame === "function") {
          return globalThis.requestAnimationFrame(callback);
        }
        return null;
      },
      cancelAnimationFrame(frameId) {
        if (typeof globalThis.cancelAnimationFrame === "function") {
          globalThis.cancelAnimationFrame(frameId);
        }
      }
    };
  }
  function createReducedMotionReader(value) {
    if (typeof value === "function") return () => value() === true;
    if (value && typeof value === "object" && "matches" in value) {
      return () => value.matches === true;
    }
    if (typeof value === "boolean") return () => value;
    const mediaQuery = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    return () => mediaQuery?.matches === true;
  }
  function normalizeTiers(tiers) {
    if (!Array.isArray(tiers) || tiers.length === 0) {
      throw new TypeError("Combo timer tiers must be a non-empty array");
    }
    const normalized = tiers.map((tier) => {
      if (!tier || typeof tier.key !== "string" || !Number.isFinite(tier.minRemainingPct)) {
        throw new TypeError("Each combo timer tier needs a key and minRemainingPct");
      }
      return tier;
    }).sort((left, right) => right.minRemainingPct - left.minRemainingPct);
    return Object.freeze(normalized);
  }
  function validateBar(bar) {
    if (!bar?.style || !bar?.classList) {
      throw new TypeError("Combo timer requires a bar element");
    }
  }
  function normalizeAnimationMode(mode) {
    if (["auto", "waapi", "css", "none"].includes(mode)) return mode;
    throw new TypeError('Combo timer animationMode must be "auto", "waapi", "css", or "none"');
  }
  function formatScale(remainingPct) {
    return `scaleX(${clamp(remainingPct, 0, 1, 0)})`;
  }
  var _ComboTimerCompositor_instances, assertUsable_fn, getTier_fn, setInactive_fn, setTransform_fn, present_fn, resolveAnimationMode_fn, startInterpolation_fn, scheduleNextBoundary_fn, scheduleExpirationOnly_fn, expire_fn, cancelScheduledWork_fn;
  var ComboTimerCompositor = class {
    constructor({
      bar,
      wrapper = null,
      tiers = SPEED_XP_TIERS,
      clock = defaultClock2,
      scheduler = defaultScheduler6(),
      reducedMotion,
      animationMode = "auto",
      onTierChange = () => {
      },
      onExpire = () => {
      }
    } = {}) {
      __privateAdd(this, _ComboTimerCompositor_instances);
      validateBar(bar);
      if (typeof clock !== "function") {
        throw new TypeError("Combo timer clock must be a function");
      }
      if (typeof scheduler?.setTimeout !== "function" || typeof scheduler?.clearTimeout !== "function") {
        throw new TypeError("Combo timer scheduler needs setTimeout and clearTimeout");
      }
      if (typeof onTierChange !== "function" || typeof onExpire !== "function") {
        throw new TypeError("Combo timer callbacks must be functions");
      }
      this.bar = bar;
      this.wrapper = wrapper;
      this.tiers = normalizeTiers(tiers);
      this.tierClasses = [...new Set(this.tiers.map((tier) => tier.key))];
      this.clock = clock;
      this.scheduler = scheduler;
      this.readReducedMotion = createReducedMotionReader(reducedMotion);
      this.animationMode = normalizeAnimationMode(animationMode);
      this.onTierChange = onTierChange;
      this.onExpire = onExpire;
      this.status = COMBO_TIMER_STATUS.IDLE;
      this.durationMs = 0;
      this.anchorTime = 0;
      this.anchorRemainingPct = 1;
      this.visibleTierKey = null;
      this.activeAnimationMode = "none";
      this.boundaryTimerId = null;
      this.frameId = null;
      this.animation = null;
      this.generation = 0;
      this.expirationNotified = false;
      this.visualsEnabled = true;
      this.ownership = null;
      this.initialStyle = Object.freeze({
        transform: bar.style.transform,
        transformOrigin: bar.style.transformOrigin,
        transition: bar.style.transition,
        willChange: bar.style.willChange
      });
      this.initialTierClasses = new Map(
        this.tierClasses.map((key) => [key, bar.classList.contains(key)])
      );
      this.initialInactive = wrapper?.classList?.contains("inactive") ?? false;
      bar.style.transformOrigin = "left center";
      bar.style.willChange = "transform";
    }
    start({
      durationMs,
      remainingPct = 1,
      inactive = false,
      visualsEnabled = true,
      ownership = null
    } = {}) {
      __privateMethod(this, _ComboTimerCompositor_instances, assertUsable_fn).call(this);
      if (!Number.isFinite(durationMs) || durationMs <= 0) {
        throw new RangeError("Combo timer durationMs must be greater than zero");
      }
      __privateMethod(this, _ComboTimerCompositor_instances, cancelScheduledWork_fn).call(this);
      this.generation += 1;
      this.durationMs = durationMs;
      this.anchorTime = this.clock();
      this.anchorRemainingPct = clamp(remainingPct, 0, 1, 0);
      this.status = COMBO_TIMER_STATUS.RUNNING;
      this.expirationNotified = false;
      this.visualsEnabled = Boolean(visualsEnabled);
      this.ownership = ownership;
      __privateMethod(this, _ComboTimerCompositor_instances, setInactive_fn).call(this, inactive);
      if (this.visualsEnabled) {
        __privateMethod(this, _ComboTimerCompositor_instances, present_fn).call(this, this.anchorRemainingPct, { updateTransform: true });
      }
      if (this.anchorRemainingPct <= 0) {
        __privateMethod(this, _ComboTimerCompositor_instances, expire_fn).call(this);
      } else if (!this.visualsEnabled) {
        __privateMethod(this, _ComboTimerCompositor_instances, scheduleExpirationOnly_fn).call(this);
      } else {
        __privateMethod(this, _ComboTimerCompositor_instances, startInterpolation_fn).call(this);
        __privateMethod(this, _ComboTimerCompositor_instances, scheduleNextBoundary_fn).call(this);
      }
      return this.getSnapshot();
    }
    pause() {
      __privateMethod(this, _ComboTimerCompositor_instances, assertUsable_fn).call(this);
      if (this.status !== COMBO_TIMER_STATUS.RUNNING) return this.getSnapshot();
      const remainingPct = this.getRemainingPct();
      __privateMethod(this, _ComboTimerCompositor_instances, cancelScheduledWork_fn).call(this);
      this.generation += 1;
      this.anchorRemainingPct = remainingPct;
      this.anchorTime = this.clock();
      this.status = COMBO_TIMER_STATUS.PAUSED;
      __privateMethod(this, _ComboTimerCompositor_instances, present_fn).call(this, remainingPct, { updateTransform: true });
      return this.getSnapshot();
    }
    resume() {
      __privateMethod(this, _ComboTimerCompositor_instances, assertUsable_fn).call(this);
      if (this.status !== COMBO_TIMER_STATUS.PAUSED) return this.getSnapshot();
      this.generation += 1;
      this.anchorTime = this.clock();
      this.status = COMBO_TIMER_STATUS.RUNNING;
      if (this.anchorRemainingPct <= 0) {
        __privateMethod(this, _ComboTimerCompositor_instances, expire_fn).call(this);
      } else if (!this.visualsEnabled) {
        __privateMethod(this, _ComboTimerCompositor_instances, scheduleExpirationOnly_fn).call(this);
      } else {
        __privateMethod(this, _ComboTimerCompositor_instances, startInterpolation_fn).call(this);
        __privateMethod(this, _ComboTimerCompositor_instances, scheduleNextBoundary_fn).call(this);
      }
      return this.getSnapshot();
    }
    setVisualsEnabled(nextEnabled) {
      __privateMethod(this, _ComboTimerCompositor_instances, assertUsable_fn).call(this);
      const enabled = Boolean(nextEnabled);
      if (enabled === this.visualsEnabled) return this.getSnapshot();
      const remainingPct = this.getRemainingPct();
      __privateMethod(this, _ComboTimerCompositor_instances, cancelScheduledWork_fn).call(this);
      this.generation += 1;
      this.anchorRemainingPct = remainingPct;
      this.anchorTime = this.clock();
      this.visualsEnabled = enabled;
      if (this.status !== COMBO_TIMER_STATUS.RUNNING) return this.getSnapshot();
      if (remainingPct <= 0) {
        __privateMethod(this, _ComboTimerCompositor_instances, expire_fn).call(this);
      } else if (enabled) {
        __privateMethod(this, _ComboTimerCompositor_instances, present_fn).call(this, remainingPct, { updateTransform: true });
        __privateMethod(this, _ComboTimerCompositor_instances, startInterpolation_fn).call(this);
        __privateMethod(this, _ComboTimerCompositor_instances, scheduleNextBoundary_fn).call(this);
      } else {
        __privateMethod(this, _ComboTimerCompositor_instances, scheduleExpirationOnly_fn).call(this);
      }
      return this.getSnapshot();
    }
    stop({ remainingPct, inactive = false, clearTier = false } = {}) {
      __privateMethod(this, _ComboTimerCompositor_instances, assertUsable_fn).call(this);
      const finalRemainingPct = Number.isFinite(remainingPct) ? clamp(remainingPct, 0, 1, 0) : this.getRemainingPct();
      __privateMethod(this, _ComboTimerCompositor_instances, cancelScheduledWork_fn).call(this);
      this.generation += 1;
      this.anchorRemainingPct = finalRemainingPct;
      this.anchorTime = this.clock();
      this.status = COMBO_TIMER_STATUS.STOPPED;
      this.ownership = null;
      __privateMethod(this, _ComboTimerCompositor_instances, setInactive_fn).call(this, inactive);
      if (clearTier) {
        this.bar.classList.remove(...this.tierClasses);
        this.visibleTierKey = null;
        __privateMethod(this, _ComboTimerCompositor_instances, setTransform_fn).call(this, finalRemainingPct);
      } else {
        __privateMethod(this, _ComboTimerCompositor_instances, present_fn).call(this, finalRemainingPct, { updateTransform: true });
      }
      return this.getSnapshot();
    }
    getRemainingPct(now = this.clock()) {
      if (this.status !== COMBO_TIMER_STATUS.RUNNING) {
        return this.anchorRemainingPct;
      }
      const elapsedMs = Math.max(0, now - this.anchorTime);
      return clamp(this.anchorRemainingPct - elapsedMs / this.durationMs, 0, 1, 0);
    }
    getSnapshot() {
      const remainingPct = this.getRemainingPct();
      return Object.freeze({
        status: this.status,
        durationMs: this.durationMs,
        remainingPct,
        tierKey: __privateMethod(this, _ComboTimerCompositor_instances, getTier_fn).call(this, remainingPct).key,
        animationMode: this.activeAnimationMode,
        visualsEnabled: this.visualsEnabled,
        ownership: this.ownership
      });
    }
    dispose() {
      if (this.status === COMBO_TIMER_STATUS.DISPOSED) return;
      __privateMethod(this, _ComboTimerCompositor_instances, cancelScheduledWork_fn).call(this);
      this.generation += 1;
      this.status = COMBO_TIMER_STATUS.DISPOSED;
      this.visibleTierKey = null;
      this.ownership = null;
      this.bar.style.transform = this.initialStyle.transform;
      this.bar.style.transformOrigin = this.initialStyle.transformOrigin;
      this.bar.style.transition = this.initialStyle.transition;
      this.bar.style.willChange = this.initialStyle.willChange;
      for (const [key, wasPresent] of this.initialTierClasses) {
        this.bar.classList.toggle(key, wasPresent);
      }
      this.wrapper?.classList?.toggle("inactive", this.initialInactive);
    }
  };
  _ComboTimerCompositor_instances = new WeakSet();
  assertUsable_fn = function() {
    if (this.status === COMBO_TIMER_STATUS.DISPOSED) {
      throw new Error("Combo timer compositor has been disposed");
    }
  };
  getTier_fn = function(remainingPct) {
    const percentage = Number.isFinite(remainingPct) ? remainingPct : 0;
    return this.tiers.find((tier) => percentage > tier.minRemainingPct) ?? this.tiers[this.tiers.length - 1];
  };
  setInactive_fn = function(inactive) {
    this.wrapper?.classList?.toggle("inactive", inactive === true);
  };
  setTransform_fn = function(remainingPct) {
    this.bar.style.transform = formatScale(remainingPct);
  };
  present_fn = function(remainingPct, { updateTransform }) {
    const tier = __privateMethod(this, _ComboTimerCompositor_instances, getTier_fn).call(this, remainingPct);
    if (updateTransform) __privateMethod(this, _ComboTimerCompositor_instances, setTransform_fn).call(this, remainingPct);
    if (tier.key === this.visibleTierKey) return;
    this.bar.classList.remove(...this.tierClasses);
    this.bar.classList.add(tier.key);
    this.visibleTierKey = tier.key;
    this.onTierChange(Object.freeze({ tier, remainingPct, snapshot: this.getSnapshot() }));
  };
  resolveAnimationMode_fn = function() {
    if (this.readReducedMotion()) return "none";
    if (this.animationMode === "none") return "none";
    if ((this.animationMode === "auto" || this.animationMode === "waapi") && typeof this.bar.animate === "function") {
      return "waapi";
    }
    if (this.animationMode === "waapi") return "none";
    if ((this.animationMode === "auto" || this.animationMode === "css") && typeof this.scheduler.requestAnimationFrame === "function") {
      return "css";
    }
    return "none";
  };
  startInterpolation_fn = function() {
    const remainingPct = this.getRemainingPct();
    const remainingDurationMs = remainingPct * this.durationMs;
    let mode = __privateMethod(this, _ComboTimerCompositor_instances, resolveAnimationMode_fn).call(this);
    this.activeAnimationMode = mode;
    if (mode === "waapi") {
      this.bar.style.transition = "none";
      __privateMethod(this, _ComboTimerCompositor_instances, setTransform_fn).call(this, 0);
      try {
        this.animation = this.bar.animate(
          [{ transform: formatScale(remainingPct) }, { transform: formatScale(0) }],
          {
            duration: remainingDurationMs,
            easing: "linear",
            fill: "forwards"
          }
        );
        return;
      } catch {
        this.animation = null;
        mode = this.animationMode === "auto" && typeof this.scheduler.requestAnimationFrame === "function" ? "css" : "none";
        this.activeAnimationMode = mode;
      }
    }
    if (mode === "css") {
      this.bar.style.transition = "none";
      __privateMethod(this, _ComboTimerCompositor_instances, setTransform_fn).call(this, remainingPct);
      const generation = this.generation;
      this.frameId = this.scheduler.requestAnimationFrame(() => {
        this.frameId = null;
        if (generation !== this.generation || this.status !== COMBO_TIMER_STATUS.RUNNING) {
          return;
        }
        const currentRemainingPct = this.getRemainingPct();
        this.bar.style.transition = `transform ${currentRemainingPct * this.durationMs}ms linear`;
        __privateMethod(this, _ComboTimerCompositor_instances, setTransform_fn).call(this, 0);
      });
      if (this.frameId !== null && this.frameId !== void 0) return;
      this.activeAnimationMode = "none";
    }
    this.bar.style.transition = "none";
    __privateMethod(this, _ComboTimerCompositor_instances, setTransform_fn).call(this, remainingPct);
  };
  scheduleNextBoundary_fn = function() {
    if (this.status !== COMBO_TIMER_STATUS.RUNNING) return;
    const remainingPct = this.getRemainingPct();
    const nextBoundary = this.tiers.map((tier) => tier.minRemainingPct).filter((boundary) => boundary >= 0 && boundary < remainingPct - BOUNDARY_EPSILON).sort((left, right) => right - left)[0];
    const targetRemainingPct = Number.isFinite(nextBoundary) ? nextBoundary : 0;
    const delay = Math.max(0, (remainingPct - targetRemainingPct) * this.durationMs);
    const generation = this.generation;
    this.boundaryTimerId = this.scheduler.setTimeout(() => {
      this.boundaryTimerId = null;
      if (generation !== this.generation || this.status !== COMBO_TIMER_STATUS.RUNNING) {
        return;
      }
      const currentRemainingPct = this.getRemainingPct();
      __privateMethod(this, _ComboTimerCompositor_instances, present_fn).call(this, currentRemainingPct, {
        updateTransform: this.activeAnimationMode === "none"
      });
      if (currentRemainingPct <= BOUNDARY_EPSILON) {
        __privateMethod(this, _ComboTimerCompositor_instances, expire_fn).call(this);
      } else {
        __privateMethod(this, _ComboTimerCompositor_instances, scheduleNextBoundary_fn).call(this);
      }
    }, delay);
  };
  scheduleExpirationOnly_fn = function() {
    if (this.status !== COMBO_TIMER_STATUS.RUNNING) return;
    const generation = this.generation;
    const delay = this.getRemainingPct() * this.durationMs;
    this.boundaryTimerId = this.scheduler.setTimeout(
      () => {
        this.boundaryTimerId = null;
        if (generation !== this.generation || this.status !== COMBO_TIMER_STATUS.RUNNING) {
          return;
        }
        __privateMethod(this, _ComboTimerCompositor_instances, expire_fn).call(this);
      },
      Math.max(0, delay)
    );
  };
  expire_fn = function() {
    if (this.status === COMBO_TIMER_STATUS.DISPOSED) return;
    const ownership = this.ownership;
    __privateMethod(this, _ComboTimerCompositor_instances, cancelScheduledWork_fn).call(this);
    this.generation += 1;
    this.anchorRemainingPct = 0;
    this.anchorTime = this.clock();
    this.status = COMBO_TIMER_STATUS.EXPIRED;
    __privateMethod(this, _ComboTimerCompositor_instances, present_fn).call(this, 0, { updateTransform: true });
    if (this.expirationNotified) return;
    this.expirationNotified = true;
    this.onExpire(this.getSnapshot(), ownership);
  };
  cancelScheduledWork_fn = function() {
    if (this.boundaryTimerId !== null) {
      this.scheduler.clearTimeout(this.boundaryTimerId);
      this.boundaryTimerId = null;
    }
    if (this.frameId !== null) {
      this.scheduler.cancelAnimationFrame?.(this.frameId);
      this.frameId = null;
    }
    this.animation?.cancel?.();
    this.animation = null;
    this.activeAnimationMode = "none";
    this.bar.style.transition = "none";
  };
  function createComboTimerCompositor(options) {
    return new ComboTimerCompositor(options);
  }

  // src/ui/hud-controller.js
  function setTextIfChanged(node, value) {
    if (!node) return;
    const text = String(value);
    if (node.textContent !== text) node.textContent = text;
  }
  function createHudElement(document2) {
    const hud = document2.createElement("div");
    hud.id = "mm-hud";
    hud.innerHTML = `
        <div id="mm-hud-header">
            <span id="mm-hud-title">LIVE STATS</span>
            <button id="mm-hud-collapse-btn" type="button"
                aria-label="Collapse HUD" aria-expanded="true" title="Collapse HUD">−</button>
        </div>
        <div id="mm-hud-stats">
            <div class="mm-hud-stat">
                <div class="mm-hud-label" id="mm-hud-score-label">SCORE</div>
                <div class="mm-hud-value" id="mm-hud-score">0</div>
            </div>
            <div class="mm-hud-stat">
                <div class="mm-hud-label" id="mm-hud-combo-label">COMBO</div>
                <div class="mm-hud-value" id="mm-hud-combo">x0</div>
            </div>
            <div class="mm-hud-stat">
                <div class="mm-hud-label" id="mm-hud-mult-label">
                    <span class="mm-hud-label-full">MULTIPLIER</span>
                    <span class="mm-hud-label-short">MULT</span>
                </div>
                <div class="mm-hud-value" id="mm-hud-mult">x1</div>
            </div>
            <div class="mm-hud-stat">
                <div class="mm-hud-label" id="mm-hud-streak-label">
                    <span class="mm-hud-label-full">WORD STREAK</span>
                    <span class="mm-hud-label-short">STREAK</span>
                </div>
                <div class="mm-hud-value" id="mm-hud-streak">0</div>
            </div>
            <div class="mm-hud-stat mm-hud-secondary">
                <div class="mm-hud-label" id="mm-hud-acc-label">ACCURACY</div>
                <div class="mm-hud-value" id="mm-hud-acc">—</div>
            </div>
            <div class="mm-hud-stat">
                <div class="mm-hud-label" id="mm-hud-bonus-label">XP BONUS</div>
                <div class="mm-hud-value" id="mm-hud-bonus">x1.00</div>
            </div>
            <div class="mm-hud-stat mm-hud-secondary">
                <div class="mm-hud-label" id="mm-hud-record-label">7D BEST</div>
                <div class="mm-hud-value" id="mm-hud-record">
                    S <span>0</span> / C <span>x0</span> / M <span>x1</span>
                </div>
            </div>
        </div>
        <div id="mm-combo-bar-wrap"><div id="mm-combo-bar"></div></div>
        <div id="mm-hud-controls">
            <button id="mm-hud-rewind-btn" disabled>⟲ REWIND</button>
            <button id="mm-hud-settings-btn">⚙ SETTINGS</button>
        </div>
    `;
    return hud;
  }
  function createSettingsRecoveryLauncher(document2) {
    const launcher = document2.createElement("button");
    launcher.id = "mm-settings-launcher";
    launcher.type = "button";
    launcher.textContent = "⚙ SETTINGS";
    launcher.setAttribute("aria-label", "Open gamification settings");
    launcher.setAttribute("aria-controls", "mm-settings");
    launcher.title = "Open gamification settings";
    return launcher;
  }
  function createHudController({
    document: document2,
    window: window2 = document2.defaultView,
    settings: settings2,
    saveSettings: saveSettings2,
    prefersReducedMotion: prefersReducedMotion2 = () => false,
    isLiteMode: isLiteMode2 = () => false,
    onRewind = () => {
    }
  }) {
    if (!document2 || !window2) throw new TypeError("HUD controller requires a document and window");
    const hud = createHudElement(document2);
    const settingsLauncher = createSettingsRecoveryLauncher(document2);
    if (settings2.hudCollapsed) hud.classList.add("mm-panel-collapsed");
    const refs = {
      hud,
      score: hud.querySelector("#mm-hud-score"),
      combo: hud.querySelector("#mm-hud-combo"),
      mult: hud.querySelector("#mm-hud-mult"),
      streak: hud.querySelector("#mm-hud-streak"),
      acc: hud.querySelector("#mm-hud-acc"),
      bonus: hud.querySelector("#mm-hud-bonus"),
      record: hud.querySelector("#mm-hud-record"),
      bar: hud.querySelector("#mm-combo-bar"),
      barWrap: hud.querySelector("#mm-combo-bar-wrap"),
      rewind: hud.querySelector("#mm-hud-rewind-btn"),
      collapse: hud.querySelector("#mm-hud-collapse-btn"),
      title: hud.querySelector("#mm-hud-title"),
      settingsButton: hud.querySelector("#mm-hud-settings-btn")
    };
    const listeners = [];
    let settingsPanel = null;
    let resizeHandler = null;
    let drag = null;
    let dragRaf = null;
    let collapseTimer = null;
    let microTimer = null;
    let microElement = null;
    let installed = false;
    const listen = (target, type, handler, options) => {
      target.addEventListener(type, handler, options);
      listeners.push(() => target.removeEventListener(type, handler, options));
    };
    function syncCollapseControl() {
      const collapsed = settings2.hudCollapsed;
      refs.title.textContent = collapsed ? "HUD" : "LIVE STATS";
      refs.collapse.textContent = collapsed ? "+" : "−";
      refs.collapse.setAttribute("aria-expanded", String(!collapsed));
      refs.collapse.setAttribute("aria-label", collapsed ? "Expand HUD" : "Collapse HUD");
      refs.collapse.title = collapsed ? "Expand HUD" : "Collapse HUD";
    }
    function clampPosition(position, dimensions = null) {
      const margin = 20;
      const width = dimensions?.width || hud.offsetWidth || 220;
      const height = dimensions?.height || hud.offsetHeight || 330;
      const maxX = Math.max(margin, window2.innerWidth - width - margin);
      const maxY = Math.max(margin, window2.innerHeight - height - margin);
      return {
        x: clamp(position?.x, margin, maxX, margin),
        y: clamp(position?.y, margin, maxY, margin)
      };
    }
    function getDefaultPosition() {
      const margin = 20;
      const raisedBottom = 170;
      const hudHeight = hud.offsetHeight || 330;
      return {
        x: margin,
        y: Math.max(margin, window2.innerHeight - hudHeight - raisedBottom)
      };
    }
    function positionSettingsPanel() {
      if (!settingsPanel) return;
      const margin = 12;
      const anchor = hud.hidden ? settingsLauncher : hud;
      const hudRect = anchor.getBoundingClientRect();
      const panelWidth = settingsPanel.offsetWidth || 260;
      const panelHeight = settingsPanel.offsetHeight || 300;
      const rightSideX = hudRect.right + margin;
      const leftSideX = hudRect.left - panelWidth - margin;
      const x = rightSideX + panelWidth <= window2.innerWidth - margin ? rightSideX : Math.max(margin, leftSideX);
      const y = clamp(hudRect.top, margin, window2.innerHeight - panelHeight - margin, margin);
      settingsPanel.style.left = `${x}px`;
      settingsPanel.style.top = `${y}px`;
      settingsPanel.style.right = "auto";
      settingsPanel.style.bottom = "auto";
    }
    function applyPosition(position, dimensions = null) {
      const next = clampPosition(position || getDefaultPosition(), dimensions);
      hud.style.left = `${next.x}px`;
      hud.style.top = `${next.y}px`;
      hud.style.right = "auto";
      hud.style.bottom = "auto";
      if (settingsPanel?.classList.contains("open")) positionSettingsPanel();
      return next;
    }
    function setCollapsed(collapsed) {
      settings2.hudCollapsed = Boolean(collapsed);
      hud.classList.toggle("mm-panel-collapsed", settings2.hudCollapsed);
      if (settings2.hudCollapsed) settingsPanel?.classList.remove("open");
      syncCollapseControl();
      saveSettings2();
      if (collapseTimer) window2.clearTimeout(collapseTimer);
      collapseTimer = window2.setTimeout(
        () => {
          collapseTimer = null;
          const next = applyPosition(settings2.hudPosition);
          if (settings2.hudPosition && next) {
            settings2.hudPosition = next;
            saveSettings2();
          }
        },
        prefersReducedMotion2() ? 0 : 260
      );
    }
    function resetPosition() {
      settings2.hudPosition = null;
      applyPosition(null);
      saveSettings2();
    }
    function installDrag() {
      resizeHandler = debounce(
        () => {
          const next = applyPosition(settings2.hudPosition);
          if (settings2.hudPosition && next) {
            settings2.hudPosition = next;
            saveSettings2();
          }
        },
        140,
        window2
      );
      listen(window2, "resize", resizeHandler);
      listen(hud, "pointerdown", (event) => {
        if (event.button !== 0 || event.target.closest?.("button, input, label, a")) return;
        const rect = hud.getBoundingClientRect();
        drag = {
          pointerId: event.pointerId,
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
          width: rect.width,
          height: rect.height,
          pendingPosition: null
        };
        hud.classList.add("dragging");
        hud.setPointerCapture?.(event.pointerId);
        event.preventDefault();
      });
      listen(hud, "pointermove", (event) => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        drag.pendingPosition = {
          x: event.clientX - drag.offsetX,
          y: event.clientY - drag.offsetY
        };
        if (dragRaf) return;
        dragRaf = window2.requestAnimationFrame(() => {
          dragRaf = null;
          if (!drag?.pendingPosition) return;
          const next = applyPosition(drag.pendingPosition, drag);
          drag.pendingPosition = null;
          if (next) settings2.hudPosition = next;
        });
      });
      const stopDrag = (event) => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        if (dragRaf) {
          window2.cancelAnimationFrame(dragRaf);
          dragRaf = null;
        }
        if (drag.pendingPosition) {
          const next = applyPosition(drag.pendingPosition, drag);
          if (next) settings2.hudPosition = next;
        }
        hud.releasePointerCapture?.(event.pointerId);
        hud.classList.remove("dragging");
        drag = null;
        saveSettings2();
      };
      listen(hud, "pointerup", stopDrag);
      listen(hud, "pointercancel", stopDrag);
    }
    function install(panel) {
      if (installed) return;
      installed = true;
      settingsPanel = panel || null;
      syncCollapseControl();
      applyPosition(settings2.hudPosition);
      installDrag();
      listen(refs.collapse, "click", () => setCollapsed(!settings2.hudCollapsed));
      listen(refs.settingsButton, "click", () => {
        if (!settingsPanel) return;
        settingsPanel.classList.toggle("open");
        if (settingsPanel.classList.contains("open")) positionSettingsPanel();
      });
      listen(settingsLauncher, "click", () => {
        if (!settingsPanel) return;
        settingsPanel.classList.toggle("open");
        if (settingsPanel.classList.contains("open")) positionSettingsPanel();
      });
      listen(refs.rewind, "click", () => onRewind("hud"));
    }
    function update({ state: state2, rollingRecords, bonusMultiplier }) {
      const total = state2.sessionCorrect + state2.sessionIncorrect;
      setTextIfChanged(refs.score, state2.score.toLocaleString());
      setTextIfChanged(refs.combo, `x${state2.answerStreak}`);
      setTextIfChanged(refs.mult, `x${state2.multiplier}`);
      setTextIfChanged(refs.streak, state2.wordStreak);
      setTextIfChanged(
        refs.acc,
        total > 0 ? `${Math.round(state2.sessionCorrect / total * 100)}%` : "—"
      );
      updateBonus(bonusMultiplier);
      const recordMarkup = `S <span>${rollingRecords.score.toLocaleString()}</span> / C <span>x${rollingRecords.combo}</span> / M <span>x${rollingRecords.multiplier}</span>`;
      if (refs.record._mmMarkup !== recordMarkup) {
        refs.record.innerHTML = recordMarkup;
        refs.record._mmMarkup = recordMarkup;
      }
      hud.classList.toggle("glow", state2.answerStreak >= 10);
      hud.classList.toggle("danger", state2.answerStreak === 0 && state2.sessionIncorrect > 0);
    }
    function updateBonus(multiplier) {
      setTextIfChanged(refs.bonus, `x${multiplier.toFixed(2)}`);
    }
    function showMicro(text, tone = "score") {
      if (isLiteMode2() || !settings2.hudCollapsed || !settings2.visualsEnabled || prefersReducedMotion2()) {
        return;
      }
      if (microTimer) window2.clearTimeout(microTimer);
      removeElementSafe(microElement);
      const node = document2.createElement("div");
      node.className = `mm-hud-micro ${tone}`;
      node.textContent = text;
      document2.body.appendChild(node);
      microElement = node;
      const hudRect = hud.getBoundingClientRect();
      const gap = 7;
      const maxLeft = Math.max(8, window2.innerWidth - node.offsetWidth - 8);
      const left = clamp(hudRect.left + (hudRect.width - node.offsetWidth) / 2, 8, maxLeft, 8);
      const fitsBelow = hudRect.bottom + gap + node.offsetHeight <= window2.innerHeight - 8;
      node.style.left = `${left}px`;
      node.style.top = `${fitsBelow ? hudRect.bottom + gap : Math.max(8, hudRect.top - node.offsetHeight - gap)}px`;
      microTimer = window2.setTimeout(() => {
        removeElementSafe(node);
        if (microElement === node) microElement = null;
        microTimer = null;
      }, 900);
    }
    function setVisible(visible) {
      const showHud = Boolean(visible);
      const focusWasInsideHud = hud.contains(document2.activeElement);
      hud.classList.toggle("hidden", !showHud);
      hud.hidden = !showHud;
      hud.toggleAttribute("inert", !showHud);
      if (showHud) hud.removeAttribute("aria-hidden");
      else hud.setAttribute("aria-hidden", "true");
      settingsLauncher.hidden = showHud;
      if (showHud) settingsLauncher.setAttribute("aria-hidden", "true");
      else settingsLauncher.removeAttribute("aria-hidden");
      if (focusWasInsideHud && !showHud) settingsLauncher.focus();
      if (settingsPanel?.classList.contains("open")) positionSettingsPanel();
    }
    function cleanup2() {
      listeners.splice(0).forEach((removeListener) => removeListener());
      resizeHandler?.cancel?.();
      resizeHandler = null;
      if (dragRaf) window2.cancelAnimationFrame(dragRaf);
      if (collapseTimer) window2.clearTimeout(collapseTimer);
      if (microTimer) window2.clearTimeout(microTimer);
      dragRaf = null;
      collapseTimer = null;
      microTimer = null;
      drag = null;
      hud.classList.remove("dragging");
      removeElementSafe(microElement);
      removeElementSafe(settingsLauncher);
      microElement = null;
      settingsPanel = null;
      installed = false;
    }
    setVisible(settings2.hudEnabled);
    return {
      element: hud,
      settingsLauncher,
      refs,
      install,
      cleanup: cleanup2,
      applyPosition,
      positionSettingsPanel,
      resetPosition,
      setCollapsed,
      setVisible,
      showMicro,
      update,
      updateBonus
    };
  }

  // src/ui/settings-panel.js
  var TOGGLES = [
    ["sfxEnabled", "Sound FX"],
    ["visualsEnabled", "Visuals"],
    ["hudEnabled", "HUD"],
    ["shakeEnabled", "Screen Shake"],
    ["floatEnabled", "Floating Text"],
    ["flashEnabled", "Screen Flash"],
    ["failureFlashEnabled", "Failure Flash"],
    ["crtEnabled", "CRT Effects"],
    ["musicEnabled", "Music"],
    ["timerEnabled", "Answer Timer"],
    ["timedXpBonusEnabled", "Timed XP Bonus"],
    ["timeoutFailureEnabled", "Timeout Failure"],
    ["fontChallengeEnabled", "Font Challenge"]
  ];
  function createPanelElement(document2, settings2, getMusicModeLabel, getThemeLabel) {
    const rows = TOGGLES.map(
      ([key, label]) => `
            <div class="mm-setting-row">
                <label id="mm-label-${key}">${label}</label>
                <button class="mm-toggle ${settings2[key] ? "on" : ""}" data-key="${key}"
                    aria-labelledby="mm-label-${key}" aria-pressed="${settings2[key]}"></button>
            </div>`
    ).join("");
    const panel = document2.createElement("div");
    panel.id = "mm-settings";
    panel.innerHTML = `
        <h3>⚙ SETTINGS</h3>
        ${rows}
        <div class="mm-setting-row">
            <label>Visual Profile</label>
            <button class="mm-cycle-btn" id="mm-performance-profile" type="button">
                ${PERFORMANCE_PROFILE_LABELS2[settings2.performanceProfile]}
            </button>
        </div>
        <div class="mm-setting-row">
            <label>Timer Duration</label>
            <button class="mm-cycle-btn" id="mm-timer-seconds" type="button">
                ${settings2.timerSeconds} SEC
            </button>
        </div>
        <div class="mm-setting-row">
            <label>SFX Volume</label>
            <input id="mm-vol-slider" type="range" min="0" max="1" step="0.05" value="${settings2.volume}">
        </div>
        <div class="mm-setting-row">
            <label>Music Mode</label>
            <button class="mm-cycle-btn" id="mm-music-style" type="button">
                ${getMusicModeLabel()}
            </button>
        </div>
        <div class="mm-setting-row">
            <label>Music Volume</label>
            <input id="mm-music-vol-slider" type="range" min="0" max="0.5" step="0.01"
                value="${settings2.musicVolume}">
        </div>
        <div class="mm-setting-row">
            <label>Background</label>
            <button class="mm-cycle-btn" id="mm-bg-theme" type="button">
                ${getThemeLabel(settings2.backgroundTheme)}
            </button>
        </div>
        <div class="mm-setting-row">
            <label>Pinned Default</label>
            <button class="mm-cycle-btn" id="mm-pinned-bg-theme" type="button">
                ${getThemeLabel(settings2.pinnedBackgroundTheme)}
            </button>
        </div>
        <div class="mm-preview-title">THEME PREVIEW</div>
        <div class="mm-preview-grid">
            <button class="mm-preview-btn" type="button" data-preview-event="correct">CORRECT</button>
            <button class="mm-preview-btn" type="button" data-preview-event="incorrect">WRONG</button>
            <button class="mm-preview-btn" type="button" data-preview-event="combo">COMBO</button>
            <button class="mm-preview-btn" type="button" data-preview-event="milestone">MILESTONE</button>
            <button class="mm-preview-btn" type="button" data-preview-event="timeout">TIMEOUT</button>
            <button class="mm-preview-btn" type="button" data-preview-event="wordComplete">WORD CLEAR</button>
            <button class="mm-preview-btn" type="button" data-preview-event="sessionComplete">SESSION</button>
            <button class="mm-preview-btn" type="button" data-preview-event="all">PREVIEW ALL</button>
        </div>
        <button class="mm-btn-outline" id="mm-pin-bg">PIN CURRENT BACKGROUND</button>
        <button class="mm-btn-outline" id="mm-use-pinned-bg">USE PINNED BACKGROUND</button>
        <button class="mm-btn-outline" id="mm-reset-hud">RESET HUD POSITION</button>
        <button class="mm-btn-outline" id="mm-reset-records">RESET 7D RECORDS</button>
        <button class="mm-btn-outline" id="mm-settings-close">CLOSE</button>
    `;
    return panel;
  }
  function createSettingsPanelController({
    document: document2,
    settings: settings2,
    saveSettings: saveSettings2,
    scheduleSettingsSave: scheduleSettingsSave2,
    getMusicPreset,
    getThemeIds,
    getThemeId,
    getThemeLabel,
    normalizeTheme,
    onSettingSideEffects,
    onSfxVolumeChanged,
    onPerformanceProfileChanged,
    onTimerDurationChanged,
    onMusicStyleChanged,
    onMusicVolumeChanged,
    onPreviewThemeEvent,
    applyBackgroundTheme,
    onBackgroundThemeChanged,
    onResetHudPosition,
    onResetRecords
  }) {
    function canCycleMusicStyle() {
      return getMusicPreset().scheduler === "style";
    }
    function getMusicModeLabel() {
      const preset = getMusicPreset();
      if (preset.scheduler === "style") return MUSIC_STYLE_LABELS2[settings2.musicStyle];
      return THEME_MUSIC_MODE_LABELS[preset.id] || String(preset.scheduler || "theme").toUpperCase();
    }
    const panel = createPanelElement(document2, settings2, getMusicModeLabel, getThemeLabel);
    const listeners = [];
    let installed = false;
    const listen = (target, type, handler) => {
      target.addEventListener(type, handler);
      listeners.push(() => target.removeEventListener(type, handler));
    };
    function syncMusicModeButton(button = panel.querySelector("#mm-music-style")) {
      if (!button) return;
      const canCycle = canCycleMusicStyle();
      button.textContent = getMusicModeLabel();
      button.disabled = !canCycle;
      button.title = canCycle ? "Cycle Default theme music style" : "Theme music follows the selected background";
    }
    function updateBackgroundButtons() {
      panel.querySelector("#mm-bg-theme").textContent = getThemeLabel(settings2.backgroundTheme);
      panel.querySelector("#mm-pinned-bg-theme").textContent = getThemeLabel(
        settings2.pinnedBackgroundTheme
      );
      syncMusicModeButton();
    }
    function setBackgroundTheme(theme) {
      applyBackgroundTheme(theme);
      updateBackgroundButtons();
      saveSettings2();
      onBackgroundThemeChanged(theme);
    }
    function setPinnedBackgroundTheme(theme) {
      settings2.pinnedBackgroundTheme = normalizeTheme(theme);
      updateBackgroundButtons();
      saveSettings2();
    }
    function install() {
      if (installed) return;
      installed = true;
      syncMusicModeButton();
      panel.querySelectorAll(".mm-toggle").forEach((button) => {
        listen(button, "click", () => {
          const key = button.dataset.key;
          settings2[key] = !settings2[key];
          button.classList.toggle("on", settings2[key]);
          button.setAttribute("aria-pressed", String(settings2[key]));
          saveSettings2();
          onSettingSideEffects(key);
        });
      });
      listen(panel.querySelector("#mm-vol-slider"), "input", (event) => {
        settings2.volume = clamp(event.target.value, 0, 1, DEFAULTS.volume);
        onSfxVolumeChanged(settings2.volume);
        scheduleSettingsSave2();
      });
      listen(panel.querySelector("#mm-performance-profile"), "click", (event) => {
        const current = PERFORMANCE_PROFILES2.indexOf(settings2.performanceProfile);
        settings2.performanceProfile = PERFORMANCE_PROFILES2[(current + 1) % PERFORMANCE_PROFILES2.length];
        event.currentTarget.textContent = PERFORMANCE_PROFILE_LABELS2[settings2.performanceProfile];
        saveSettings2();
        onPerformanceProfileChanged(settings2.performanceProfile);
      });
      listen(panel.querySelector("#mm-timer-seconds"), "click", (event) => {
        const current = TIMER_SECONDS_PRESETS2.indexOf(settings2.timerSeconds);
        settings2.timerSeconds = TIMER_SECONDS_PRESETS2[(current + 1) % TIMER_SECONDS_PRESETS2.length];
        event.currentTarget.textContent = `${settings2.timerSeconds} SEC`;
        saveSettings2();
        onTimerDurationChanged(settings2.timerSeconds);
      });
      listen(panel.querySelector("#mm-music-style"), "click", (event) => {
        if (!canCycleMusicStyle()) {
          syncMusicModeButton(event.currentTarget);
          return;
        }
        const current = MUSIC_STYLES2.indexOf(settings2.musicStyle);
        settings2.musicStyle = MUSIC_STYLES2[(current + 1) % MUSIC_STYLES2.length];
        syncMusicModeButton(event.currentTarget);
        saveSettings2();
        onMusicStyleChanged(settings2.musicStyle);
      });
      listen(panel.querySelector("#mm-music-vol-slider"), "input", (event) => {
        settings2.musicVolume = clamp(event.target.value, 0, 0.5, DEFAULTS.musicVolume);
        onMusicVolumeChanged(settings2.musicVolume);
        scheduleSettingsSave2();
      });
      panel.querySelectorAll("[data-preview-event]").forEach((button) => {
        listen(button, "click", (event) => {
          onPreviewThemeEvent(event.currentTarget.dataset.previewEvent);
        });
      });
      listen(panel.querySelector("#mm-bg-theme"), "click", () => {
        const themeIds = getThemeIds();
        const current = themeIds.indexOf(getThemeId(settings2.backgroundTheme));
        setBackgroundTheme(themeIds[(current + 1) % themeIds.length]);
      });
      listen(panel.querySelector("#mm-pinned-bg-theme"), "click", () => {
        const themeIds = getThemeIds();
        const current = themeIds.indexOf(getThemeId(settings2.pinnedBackgroundTheme));
        setPinnedBackgroundTheme(themeIds[(current + 1) % themeIds.length]);
      });
      listen(panel.querySelector("#mm-pin-bg"), "click", () => {
        setPinnedBackgroundTheme(settings2.backgroundTheme);
      });
      listen(panel.querySelector("#mm-use-pinned-bg"), "click", () => {
        setBackgroundTheme(settings2.pinnedBackgroundTheme);
      });
      listen(panel.querySelector("#mm-reset-hud"), "click", onResetHudPosition);
      listen(panel.querySelector("#mm-reset-records"), "click", onResetRecords);
      listen(panel.querySelector("#mm-settings-close"), "click", () => {
        panel.classList.remove("open");
      });
    }
    function cleanup2() {
      listeners.splice(0).forEach((removeListener) => removeListener());
      installed = false;
    }
    return {
      element: panel,
      install,
      cleanup: cleanup2,
      syncMusicModeButton,
      updateBackgroundButtons
    };
  }

  // inline-userscript-css:src/ui/styles.css
  var cssText2 = "@font-face {\n    font-family: 'MM Arcade Local';\n    src:\n        local('Press Start 2P'), local('PressStart2P-Regular'), local('Pixel Emulator'),\n        local('Pixeled'), local('Silkscreen');\n    font-display: swap;\n}\n\n:root {\n    --mm-arcade-font:\n        'MM Arcade Local', 'Silkscreen', 'Monaco', 'Consolas', 'Courier New', monospace;\n}\n\n/* ── SHARED ── */\n#mm-hud,\n#mm-settings,\n#mm-summary {\n    font-family: var(--mm-arcade-font);\n}\n\n/* ── HUD ── */\n#mm-hud {\n    position: fixed;\n    top: 20px;\n    left: 20px;\n    background: var(--mm-theme-panel-bg, rgba(0, 0, 0, 0.85));\n    border: 2px solid var(--mm-theme-panel-border, rgba(255, 255, 255, 0.12));\n    color: var(--mm-theme-panel-text, #fff);\n    padding: 10px 16px 12px;\n    border-radius: 8px;\n    box-sizing: content-box;\n    width: 180px;\n    min-width: 180px;\n    font-size: 11px;\n    z-index: 9999;\n    line-height: 1.8;\n    image-rendering: pixelated;\n    display: flex;\n    flex-direction: column;\n    cursor: grab;\n    touch-action: none;\n    overflow: hidden;\n    user-select: none;\n    box-shadow: var(--mm-theme-panel-shadow, none);\n    transition:\n        width 0.24s ease,\n        min-width 0.24s ease,\n        padding 0.24s ease,\n        background 0.24s ease,\n        border-color 0.24s ease,\n        box-shadow 0.2s ease,\n        opacity 0.3s;\n}\n#mm-hud.dragging {\n    cursor: grabbing;\n    opacity: 0.92;\n}\n#mm-hud.hidden {\n    display: none !important;\n}\n#mm-hud[hidden],\n#mm-settings-launcher[hidden] {\n    display: none !important;\n}\n#mm-settings-launcher {\n    position: fixed;\n    top: 20px;\n    left: 20px;\n    z-index: 9999;\n    padding: 7px 9px;\n    border: 1px solid var(--mm-theme-control-border, rgba(255, 255, 255, 0.2));\n    border-radius: 6px;\n    background: var(--mm-theme-panel-bg, rgba(0, 0, 0, 0.82));\n    color: var(--mm-theme-panel-text, #fff);\n    box-shadow: var(--mm-theme-panel-shadow, none);\n    font-family: var(--mm-arcade-font);\n    font-size: 8px;\n    line-height: 1.2;\n    cursor: pointer;\n}\n#mm-settings-launcher:hover {\n    border-color: var(--mm-theme-button, #f90);\n    color: var(--mm-theme-button, #f90);\n}\n#mm-settings-launcher:focus-visible {\n    outline: 2px solid var(--mm-theme-secondary, #7cf);\n    outline-offset: 2px;\n}\n#mm-hud.glow {\n    box-shadow: 0 0 18px 4px var(--mm-theme-hud-glow, #f90);\n}\n#mm-hud.danger {\n    box-shadow: 0 0 18px 4px var(--mm-theme-failure, #f33);\n}\n\n#mm-hud-header {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    min-height: 18px;\n    margin-bottom: 4px;\n    order: 0;\n}\n#mm-hud-title {\n    color: var(--mm-theme-panel-muted, rgba(255, 255, 255, 0.42));\n    font-size: 7px;\n    line-height: 1;\n    white-space: nowrap;\n}\n#mm-hud-collapse-btn {\n    display: grid;\n    place-items: center;\n    width: 20px;\n    height: 20px;\n    padding: 0;\n    border: 1px solid var(--mm-theme-control-border, rgba(255, 255, 255, 0.16));\n    border-radius: 4px;\n    background: var(--mm-theme-control-bg, rgba(255, 255, 255, 0.04));\n    color: var(--mm-theme-panel-muted, #aaa);\n    font-family: inherit;\n    font-size: 11px;\n    line-height: 1;\n    cursor: pointer;\n    flex: 0 0 auto;\n}\n#mm-hud-collapse-btn:hover {\n    color: #fff;\n    border-color: var(--mm-theme-button, #f90);\n    background: var(--mm-theme-button-soft, rgba(255, 153, 0, 0.1));\n}\n#mm-hud-collapse-btn:focus-visible {\n    outline: 2px solid var(--mm-theme-secondary, #7cf);\n    outline-offset: 2px;\n}\n#mm-hud-stats {\n    display: block;\n    order: 1;\n}\n.mm-hud-stat {\n    min-width: 0;\n    margin-top: 4px;\n    transition:\n        opacity 0.18s ease,\n        transform 0.24s ease,\n        max-height 0.24s ease,\n        margin 0.24s ease;\n}\n.mm-hud-stat:first-child {\n    margin-top: 0;\n}\n.mm-hud-label {\n    color: var(--mm-theme-panel-muted, #aaa);\n    font-size: 8px;\n}\n.mm-hud-label-short {\n    display: none;\n}\n.mm-hud-value {\n    font-variant-numeric: tabular-nums;\n}\n.mm-hud-secondary {\n    max-height: 44px;\n    opacity: 1;\n    overflow: hidden;\n}\n\n#mm-hud-score {\n    color: var(--mm-theme-notification, #ffe066);\n    font-size: 13px;\n}\n#mm-hud-combo {\n    color: var(--mm-theme-secondary, #7cf);\n    font-size: 13px;\n}\n#mm-hud-mult {\n    color: var(--mm-theme-accent, #f90);\n    font-size: 13px;\n}\n#mm-hud-streak {\n    color: var(--mm-theme-success, #7f7);\n    font-size: 13px;\n}\n#mm-hud-acc {\n    color: var(--mm-theme-secondary, #c9f);\n    font-size: 11px;\n}\n#mm-hud-bonus {\n    color: var(--mm-theme-accent, #f90);\n    font-size: 11px;\n}\n#mm-hud-record {\n    color: var(--mm-theme-notification, #ffe066);\n    font-size: 8px;\n    line-height: 1.7;\n}\n#mm-hud-record span {\n    color: var(--mm-theme-secondary, #7cf);\n}\n\n#mm-hud-controls {\n    max-height: 82px;\n    opacity: 1;\n    overflow: hidden;\n    order: 3;\n    transition:\n        max-height 0.24s ease,\n        opacity 0.16s ease,\n        transform 0.24s ease;\n}\n#mm-hud-settings-btn {\n    display: block;\n    margin-top: 10px;\n    background: var(--mm-theme-control-bg, transparent);\n    border: 1px solid var(--mm-theme-control-border, rgba(255, 255, 255, 0.2));\n    color: var(--mm-theme-panel-muted, #aaa);\n    font-family: inherit;\n    font-size: 7px;\n    padding: 4px 6px;\n    border-radius: 4px;\n    cursor: pointer;\n    width: 100%;\n    text-align: center;\n}\n#mm-hud-rewind-btn {\n    display: block;\n    margin-top: 8px;\n    background: var(--mm-theme-button-soft, rgba(255, 153, 0, 0.08));\n    border: 1px solid var(--mm-theme-button, rgba(255, 153, 0, 0.35));\n    color: var(--mm-theme-button, #f90);\n    font-family: inherit;\n    font-size: 7px;\n    padding: 4px 6px;\n    border-radius: 4px;\n    cursor: pointer;\n    width: 100%;\n    text-align: center;\n}\n#mm-hud-settings-btn:hover,\n#mm-hud-rewind-btn:hover {\n    border-color: var(--mm-theme-button, #f90);\n    color: var(--mm-theme-button, #f90);\n}\n#mm-hud-rewind-btn:disabled {\n    opacity: 0.35;\n    cursor: not-allowed;\n    border-color: var(--mm-theme-panel-divider, rgba(255, 255, 255, 0.15));\n    color: var(--mm-theme-panel-muted, #aaa);\n    background: none;\n}\n\n/* combo bar */\n#mm-combo-bar-wrap {\n    position: relative;\n    margin-top: 8px;\n    height: 4px;\n    order: 2;\n    background: var(--mm-theme-panel-divider, rgba(255, 255, 255, 0.1));\n    border-radius: 2px;\n    overflow: hidden;\n}\n#mm-combo-bar-wrap::after {\n    content: '';\n    position: absolute;\n    inset: 0;\n    pointer-events: none;\n    background: linear-gradient(\n        to right,\n        transparent calc(100% - 1px),\n        rgba(3, 7, 18, 0.72) calc(100% - 1px)\n    );\n    background-size: 20% 100%;\n}\n#mm-combo-bar {\n    height: 100%;\n    width: 100%;\n    border-radius: 2px;\n    background: var(--mm-theme-timer-fast, #ffe066);\n    transform: scaleX(1);\n    transform-origin: left center;\n    will-change: transform;\n    transition: background 0.3s;\n}\n#mm-combo-bar.lightning {\n    background: var(--mm-theme-timer-fast, #ffe066);\n}\n#mm-combo-bar.fast {\n    background: var(--mm-theme-success, #65e88a);\n}\n#mm-combo-bar.steady {\n    background: var(--mm-theme-timer-medium, #62d7ff);\n}\n#mm-combo-bar.close {\n    background: var(--mm-theme-timer-low, #ff9b42);\n}\n#mm-combo-bar.barely {\n    background: var(--mm-theme-timer-critical, #ff5252);\n}\n#mm-combo-bar.expired {\n    background: #555;\n}\n#mm-combo-bar-wrap.inactive #mm-combo-bar {\n    transform: scaleX(1) !important;\n    background: var(--mm-theme-panel-divider, rgba(255, 255, 255, 0.16));\n}\n\n/* compact draggable HUD */\n#mm-hud.mm-panel-collapsed {\n    width: min(340px, calc(100vw - 72px));\n    min-width: 0;\n    padding: 6px 9px 8px;\n    background: var(--mm-theme-panel-bg, rgba(3, 7, 18, 0.72));\n    border-color: var(--mm-theme-panel-border, rgba(160, 205, 255, 0.2));\n    backdrop-filter: blur(10px) saturate(1.1);\n    -webkit-backdrop-filter: blur(10px) saturate(1.1);\n    line-height: 1.2;\n}\n#mm-hud.mm-panel-collapsed #mm-hud-header {\n    min-height: 16px;\n    margin-bottom: 4px;\n}\n#mm-hud.mm-panel-collapsed #mm-hud-title {\n    color: var(--mm-theme-panel-muted, rgba(190, 220, 255, 0.52));\n    font-size: 6px;\n}\n#mm-hud.mm-panel-collapsed #mm-hud-collapse-btn {\n    width: 18px;\n    height: 18px;\n    font-size: 10px;\n}\n#mm-hud.mm-panel-collapsed #mm-hud-stats {\n    display: grid;\n    grid-template-columns: 1.25fr repeat(4, 1fr);\n    align-items: center;\n    order: 2;\n}\n#mm-hud.mm-panel-collapsed #mm-combo-bar-wrap {\n    height: 3px;\n    margin: 1px 0 6px;\n    order: 1;\n}\n#mm-hud.mm-panel-collapsed .mm-hud-stat {\n    margin: 0;\n    padding: 0 7px;\n    border-left: 1px solid var(--mm-theme-panel-divider, rgba(255, 255, 255, 0.1));\n    transform: translateY(0);\n}\n#mm-hud.mm-panel-collapsed .mm-hud-stat:first-child {\n    padding-left: 0;\n    border-left: 0;\n}\n#mm-hud.mm-panel-collapsed .mm-hud-label {\n    display: block;\n    overflow: hidden;\n    color: var(--mm-theme-panel-muted, rgba(215, 225, 240, 0.52));\n    font-size: 6px;\n    line-height: 1.1;\n    white-space: nowrap;\n    text-overflow: ellipsis;\n}\n#mm-hud.mm-panel-collapsed .mm-hud-label-full {\n    display: none;\n}\n#mm-hud.mm-panel-collapsed .mm-hud-label-short {\n    display: inline;\n}\n#mm-hud.mm-panel-collapsed .mm-hud-value {\n    display: block;\n    overflow: hidden;\n    margin-top: 2px;\n    font-size: 10px;\n    line-height: 1.15;\n    white-space: nowrap;\n    text-overflow: ellipsis;\n}\n#mm-hud.mm-panel-collapsed .mm-hud-secondary {\n    display: none;\n}\n#mm-hud.mm-panel-collapsed #mm-hud-controls {\n    max-height: 0;\n    opacity: 0;\n    transform: translateY(-5px);\n    pointer-events: none;\n}\n\nbody.mm-performance-mode #mm-hud.mm-panel-collapsed {\n    background: var(--mm-theme-panel-bg, rgba(3, 7, 18, 0.9));\n    backdrop-filter: none;\n    -webkit-backdrop-filter: none;\n}\nbody.mm-performance-mode #mm-hud,\nbody.mm-performance-mode #mm-combo-bar {\n    transition: none;\n}\n\n.mm-hud-micro {\n    position: fixed;\n    z-index: 10000;\n    pointer-events: none;\n    padding: 5px 8px;\n    border: 1px solid var(--mm-theme-control-border, rgba(255, 255, 255, 0.16));\n    border-radius: 4px;\n    background: var(--mm-theme-panel-bg, rgba(2, 5, 14, 0.86));\n    color: var(--mm-theme-notification, #ffe066);\n    font-family: var(--mm-arcade-font);\n    font-size: 8px;\n    line-height: 1;\n    white-space: nowrap;\n    box-shadow: var(--mm-theme-panel-shadow, 0 5px 18px rgba(0, 0, 0, 0.32));\n    animation: mmHudMicro 0.85s ease-out forwards;\n}\n.mm-hud-micro.mult {\n    color: var(--mm-theme-accent, #f90);\n}\n.mm-hud-micro.streak {\n    color: var(--mm-theme-success, #7f7);\n}\n.mm-hud-micro.fail {\n    color: var(--mm-theme-failure, #f66);\n}\n@keyframes mmHudMicro {\n    0% {\n        opacity: 0;\n        transform: translateY(3px) scale(0.96);\n    }\n    18% {\n        opacity: 1;\n        transform: translateY(0) scale(1);\n    }\n    72% {\n        opacity: 1;\n        transform: translateY(-3px) scale(1);\n    }\n    100% {\n        opacity: 0;\n        transform: translateY(-10px) scale(0.98);\n    }\n}\n\n@media (max-width: 480px) {\n    #mm-hud.mm-panel-collapsed {\n        width: min(270px, calc(100vw - 56px));\n    }\n    #mm-hud.mm-panel-collapsed #mm-hud-stats {\n        grid-template-columns: repeat(3, 1fr);\n        row-gap: 5px;\n    }\n    #mm-hud.mm-panel-collapsed .mm-hud-stat:nth-child(4) {\n        padding-left: 0;\n        border-left: 0;\n    }\n}\n\n/* ── FLOATING TEXT ── */\n.mm-float {\n    --mm-float-drift-x: 0px;\n    position: fixed;\n    pointer-events: none;\n    font-family: var(--mm-arcade-font);\n    font-size: 14px;\n    font-weight: bold;\n    z-index: 10000;\n    animation: mmFloat 0.9s ease-out forwards;\n    color: var(--mm-theme-floating-text, #ffe066);\n    text-shadow: var(--mm-theme-floating-shadow, 0 2px 6px rgba(0, 0, 0, 0.8));\n    white-space: nowrap;\n}\n.mm-float[data-mm-label]::before {\n    content: attr(data-mm-label);\n    display: block;\n    width: max-content;\n    margin: 0 auto 3px;\n    padding: 2px 5px;\n    border: 1px solid currentColor;\n    border-radius: 3px;\n    background: var(--mm-theme-float-label-bg, rgba(255, 255, 255, 0.08));\n    color: var(--mm-theme-float-label-color, currentColor);\n    font-size: 7px;\n    line-height: 1;\n    letter-spacing: 0;\n    text-shadow: none;\n}\n.mm-float.correct {\n    color: var(--mm-theme-floating-text, #ffe066);\n}\n.mm-float.incorrect {\n    color: var(--mm-theme-failure, #f55);\n}\n.mm-float.wordwin {\n    color: var(--mm-theme-success, #7f7);\n    font-size: 16px;\n}\n.mm-float.milestone {\n    color: var(--mm-theme-banner, #f0f);\n    font-size: 20px;\n}\n.mm-float.rewind {\n    color: var(--mm-theme-secondary, #7cf);\n    font-size: 14px;\n}\n.mm-float[data-mm-motion='drift'] {\n    animation: mmFloatDrift 1.15s ease-out forwards;\n}\n.mm-float[data-mm-motion='wave'] {\n    animation: mmFloatWave 1.12s ease-out forwards;\n}\n.mm-float[data-mm-motion='snap'] {\n    animation: mmFloatSnap 0.72s steps(3, end) forwards;\n}\n.mm-float[data-mm-motion='glitch'] {\n    animation: mmFloatGlitch 0.76s steps(5, end) forwards;\n}\n.mm-float[data-mm-motion='minimal'] {\n    animation: mmFloatMinimal 0.72s ease-out forwards;\n}\n@keyframes mmFloat {\n    0% {\n        opacity: 1;\n        transform: translateY(0) scale(1);\n    }\n    60% {\n        opacity: 1;\n        transform: translateY(-38px) scale(1.1);\n    }\n    100% {\n        opacity: 0;\n        transform: translateY(-64px) scale(0.9);\n    }\n}\n@keyframes mmFloatDrift {\n    0% {\n        opacity: 0;\n        transform: translate(0, 8px) scale(0.94);\n    }\n    22% {\n        opacity: 1;\n    }\n    72% {\n        opacity: 1;\n        transform: translate(var(--mm-float-drift-x), -34px) scale(1.05);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(calc(var(--mm-float-drift-x) * 1.5), -66px) scale(0.92);\n    }\n}\n@keyframes mmFloatWave {\n    0% {\n        opacity: 0;\n        transform: translateY(8px) scale(0.92) rotate(-1deg);\n    }\n    20% {\n        opacity: 1;\n    }\n    58% {\n        transform: translate(var(--mm-float-drift-x), -32px) scale(1.1) rotate(1deg);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(calc(var(--mm-float-drift-x) * -0.6), -70px) scale(0.88) rotate(-2deg);\n    }\n}\n@keyframes mmFloatSnap {\n    0% {\n        opacity: 1;\n        transform: translate(0, 0) scale(1);\n    }\n    34% {\n        transform: translate(7px, -22px) scale(1.18);\n    }\n    68% {\n        opacity: 1;\n        transform: translate(-5px, -42px) scale(1.02);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(3px, -62px) scale(0.82);\n    }\n}\n@keyframes mmFloatGlitch {\n    0% {\n        opacity: 1;\n        transform: translate(0, 0) skewX(0deg);\n    }\n    24% {\n        transform: translate(9px, -16px) skewX(-12deg);\n    }\n    50% {\n        transform: translate(-7px, -32px) skewX(14deg);\n    }\n    76% {\n        opacity: 1;\n        transform: translate(4px, -48px) skewX(-8deg);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(0, -58px) skewX(0deg);\n    }\n}\n@keyframes mmFloatMinimal {\n    0% {\n        opacity: 0;\n        transform: translateY(4px);\n    }\n    25% {\n        opacity: 0.85;\n    }\n    100% {\n        opacity: 0;\n        transform: translateY(-32px);\n    }\n}\n\n/* ── BANNERS ── */\n#mm-mult-banner,\n#mm-milestone-banner {\n    position: fixed;\n    left: 50%;\n    transform: translateX(-50%) scale(0);\n    font-family: var(--mm-arcade-font);\n    z-index: 10001;\n    pointer-events: none;\n    opacity: 0;\n    white-space: nowrap;\n}\n#mm-mult-banner {\n    top: 20%;\n    font-size: 28px;\n    color: #fff;\n    text-shadow:\n        0 0 20px var(--mm-theme-banner-glow, #f90),\n        0 0 40px var(--mm-theme-banner-glow, #f90);\n}\n#mm-milestone-banner {\n    top: 35%;\n    font-size: 18px;\n    color: var(--mm-theme-banner, #f0f);\n    text-shadow:\n        0 0 16px var(--mm-theme-banner, #f0f),\n        0 0 32px var(--mm-theme-banner-glow, #80f);\n}\n#mm-mult-banner.show {\n    animation: mmBannerPop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;\n}\n#mm-milestone-banner.show {\n    animation: mmBannerPop 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;\n}\n#mm-mult-banner[data-mm-combo-style='float'].show,\n#mm-milestone-banner[data-mm-combo-style='float'].show {\n    animation: mmBannerFloat 1.05s ease-out forwards;\n}\n#mm-mult-banner[data-mm-combo-style='wave'].show,\n#mm-milestone-banner[data-mm-combo-style='wave'].show {\n    animation: mmBannerWave 1.05s ease-out forwards;\n}\n#mm-mult-banner[data-mm-combo-style='scan'].show,\n#mm-milestone-banner[data-mm-combo-style='scan'].show {\n    animation: mmBannerScan 0.78s steps(4, end) forwards;\n}\n#mm-mult-banner[data-mm-combo-style='marquee'].show,\n#mm-milestone-banner[data-mm-combo-style='marquee'].show {\n    animation: mmBannerMarquee 0.9s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;\n}\n#mm-mult-banner[data-mm-combo-style='calm'].show,\n#mm-milestone-banner[data-mm-combo-style='calm'].show {\n    animation: mmBannerCalm 1.25s ease-out forwards;\n}\n#mm-mult-banner[data-mm-combo-style='glitch'].show,\n#mm-milestone-banner[data-mm-combo-style='glitch'].show {\n    animation: mmBannerGlitch 0.78s steps(5, end) forwards;\n}\n#mm-mult-banner[data-mm-combo-style='minimal'].show,\n#mm-milestone-banner[data-mm-combo-style='minimal'].show {\n    animation: mmBannerMinimal 0.72s ease-out forwards;\n}\n@keyframes mmBannerPop {\n    0% {\n        opacity: 0;\n        transform: translateX(-50%) scale(0.2);\n    }\n    50% {\n        opacity: 1;\n        transform: translateX(-50%) scale(1.15);\n    }\n    75% {\n        transform: translateX(-50%) scale(0.95);\n    }\n    85% {\n        opacity: 1;\n        transform: translateX(-50%) scale(1);\n    }\n    100% {\n        opacity: 0;\n        transform: translateX(-50%) scale(1);\n    }\n}\n@keyframes mmBannerFloat {\n    0% {\n        opacity: 0;\n        transform: translate(-50%, 14px) scale(0.76);\n    }\n    28% {\n        opacity: 1;\n        transform: translate(-50%, 0) scale(1.04);\n    }\n    72% {\n        opacity: 1;\n        transform: translate(-50%, -18px) scale(1);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(-50%, -48px) scale(0.92);\n    }\n}\n@keyframes mmBannerWave {\n    0% {\n        opacity: 0;\n        transform: translateX(-50%) scale(0.7) rotate(-2deg);\n    }\n    30% {\n        opacity: 1;\n        transform: translateX(-50%) scale(1.12) rotate(1deg);\n    }\n    58% {\n        transform: translateX(-50%) scale(1.02) rotate(-1deg);\n    }\n    100% {\n        opacity: 0;\n        transform: translateX(-50%) scale(1.05) rotate(2deg);\n    }\n}\n@keyframes mmBannerScan {\n    0% {\n        opacity: 0;\n        transform: translate(-50%, 0) scaleX(0.36);\n    }\n    18% {\n        opacity: 1;\n        transform: translate(calc(-50% - 8px), 0) scaleX(1.18);\n    }\n    44% {\n        transform: translate(calc(-50% + 8px), 0) scaleX(0.92);\n    }\n    72% {\n        opacity: 1;\n        transform: translate(-50%, 0) scaleX(1);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(-50%, 0) scaleX(0.82);\n    }\n}\n@keyframes mmBannerMarquee {\n    0% {\n        opacity: 0;\n        transform: translateX(-50%) scale(0.28) rotate(-3deg);\n    }\n    34% {\n        opacity: 1;\n        transform: translateX(-50%) scale(1.22) rotate(2deg);\n    }\n    58% {\n        transform: translateX(-50%) scale(0.98) rotate(-1deg);\n    }\n    82% {\n        opacity: 1;\n        transform: translateX(-50%) scale(1.06) rotate(0deg);\n    }\n    100% {\n        opacity: 0;\n        transform: translateX(-50%) scale(0.92);\n    }\n}\n@keyframes mmBannerCalm {\n    0% {\n        opacity: 0;\n        transform: translate(-50%, 10px) scale(0.9);\n        filter: blur(2px);\n    }\n    25% {\n        opacity: 1;\n        filter: blur(0);\n    }\n    72% {\n        opacity: 1;\n        transform: translate(-50%, -10px) scale(1);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(-50%, -34px) scale(0.98);\n        filter: blur(1px);\n    }\n}\n@keyframes mmBannerGlitch {\n    0% {\n        opacity: 1;\n        transform: translateX(-50%) skewX(0deg);\n    }\n    18% {\n        transform: translate(calc(-50% + 14px), -2px) skewX(-18deg);\n    }\n    36% {\n        transform: translate(calc(-50% - 12px), 2px) skewX(16deg);\n    }\n    58% {\n        opacity: 1;\n        transform: translate(calc(-50% + 6px), 0) skewX(-10deg);\n    }\n    100% {\n        opacity: 0;\n        transform: translateX(-50%) skewX(0deg);\n    }\n}\n@keyframes mmBannerMinimal {\n    0% {\n        opacity: 0;\n        transform: translateX(-50%) scale(0.96);\n    }\n    24% {\n        opacity: 0.9;\n    }\n    100% {\n        opacity: 0;\n        transform: translateX(-50%) scale(1.02);\n    }\n}\n\n/* ── CELEBRATE ── */\n.mm-celebrate {\n    --mm-celebrate-x: 0px;\n    --mm-celebrate-y: -90px;\n    --mm-celebrate-rot: 0deg;\n    --mm-celebrate-life: 900ms;\n    position: fixed;\n    pointer-events: none;\n    font-size: 52px;\n    z-index: 9998;\n    transform: translate(-50%, -50%);\n    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.35));\n}\n.mm-celebrate.pop {\n    animation: mmCelebratePop var(--mm-celebrate-life) ease forwards;\n}\n.mm-celebrate.rise {\n    animation: mmCelebrateRise var(--mm-celebrate-life) ease-out forwards;\n}\n.mm-celebrate.spin {\n    animation: mmCelebrateSpin var(--mm-celebrate-life) cubic-bezier(0.34, 1.56, 0.64, 1) forwards;\n}\n.mm-celebrate.burst {\n    animation: mmCelebrateBurst var(--mm-celebrate-life) ease-out forwards;\n}\n.mm-celebrate.orbit {\n    animation: mmCelebrateOrbit var(--mm-celebrate-life) ease-in-out forwards;\n}\n.mm-celebrate.drift {\n    animation: mmCelebrateDrift var(--mm-celebrate-life) ease-out forwards;\n}\n.mm-celebrate.bloom {\n    animation: mmCelebrateBloom var(--mm-celebrate-life) ease-out forwards;\n}\n.mm-celebrate.scan {\n    animation: mmCelebrateScan var(--mm-celebrate-life) steps(5, end) forwards;\n}\n.mm-celebrate.calm {\n    animation: mmCelebrateCalm var(--mm-celebrate-life) ease-out forwards;\n}\n.mm-celebrate.glitch {\n    animation: mmCelebrateGlitch var(--mm-celebrate-life) steps(5, end) forwards;\n}\n.mm-celebrate.pulse {\n    animation: mmCelebratePulse var(--mm-celebrate-life) ease-out forwards;\n}\n@keyframes mmCelebratePop {\n    0% {\n        opacity: 0;\n        transform: translate(-50%, -50%) scale(0.4);\n    }\n    35% {\n        opacity: 1;\n        transform: translate(-50%, -50%) scale(1.25);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(-50%, -50%) scale(1.7);\n    }\n}\n@keyframes mmCelebrateRise {\n    0% {\n        opacity: 0;\n        transform: translate(-50%, -30%) scale(0.65);\n    }\n    30% {\n        opacity: 1;\n        transform: translate(-50%, -70%) scale(1.15);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(calc(-50% + var(--mm-celebrate-x)), calc(-50% + var(--mm-celebrate-y)))\n            scale(0.85);\n    }\n}\n@keyframes mmCelebrateSpin {\n    0% {\n        opacity: 0;\n        transform: translate(-50%, -50%) rotate(-24deg) scale(0.35);\n    }\n    45% {\n        opacity: 1;\n        transform: translate(-50%, -50%) rotate(var(--mm-celebrate-rot)) scale(1.3);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(-50%, -50%) rotate(calc(var(--mm-celebrate-rot) * 2)) scale(0.75);\n    }\n}\n@keyframes mmCelebrateBurst {\n    0% {\n        opacity: 0;\n        transform: translate(-50%, -50%) scale(0.2);\n    }\n    25% {\n        opacity: 1;\n        transform: translate(-50%, -50%) scale(1.45);\n    }\n    60% {\n        opacity: 1;\n        transform: translate(calc(-50% + var(--mm-celebrate-x)), -95%) scale(1);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(calc(-50% + var(--mm-celebrate-x)), -135%) scale(0.45);\n    }\n}\n@keyframes mmCelebrateOrbit {\n    0% {\n        opacity: 0;\n        transform: translate(-50%, -50%) rotate(0deg) translateX(0) scale(0.45);\n    }\n    28% {\n        opacity: 1;\n        transform: translate(-50%, -50%) rotate(120deg) translateX(16px) scale(1);\n    }\n    72% {\n        opacity: 1;\n        transform: translate(-50%, -50%) rotate(260deg) translateX(34px) scale(0.95);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(-50%, -50%) rotate(360deg) translateX(52px) scale(0.55);\n    }\n}\n@keyframes mmCelebrateDrift {\n    0% {\n        opacity: 0;\n        transform: translate(-50%, -35%) scale(0.78) rotate(-6deg);\n    }\n    26% {\n        opacity: 1;\n    }\n    100% {\n        opacity: 0;\n        transform: translate(calc(-50% + var(--mm-celebrate-x)), calc(-50% + var(--mm-celebrate-y)))\n            scale(0.78) rotate(var(--mm-celebrate-rot));\n    }\n}\n@keyframes mmCelebrateBloom {\n    0% {\n        opacity: 0;\n        transform: translate(-50%, -50%) scale(0.2);\n        filter: blur(2px);\n    }\n    30% {\n        opacity: 1;\n        filter: blur(0);\n    }\n    74% {\n        opacity: 1;\n        transform: translate(-50%, -50%) scale(1.45);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(calc(-50% + var(--mm-celebrate-x)), -80%) scale(1.8);\n    }\n}\n@keyframes mmCelebrateScan {\n    0% {\n        opacity: 0;\n        transform: translate(calc(-50% - 26px), -50%) scaleX(0.4);\n    }\n    20% {\n        opacity: 1;\n        transform: translate(calc(-50% + 22px), -50%) scaleX(1.25);\n    }\n    52% {\n        transform: translate(calc(-50% - 12px), -86%) scaleX(0.9);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(calc(-50% + var(--mm-celebrate-x)), -120%) scaleX(0.55);\n    }\n}\n@keyframes mmCelebrateCalm {\n    0% {\n        opacity: 0;\n        transform: translate(-50%, -30%) scale(0.92);\n    }\n    30% {\n        opacity: 0.85;\n    }\n    100% {\n        opacity: 0;\n        transform: translate(calc(-50% + var(--mm-celebrate-x)), calc(-50% + var(--mm-celebrate-y)))\n            scale(0.96);\n    }\n}\n@keyframes mmCelebrateGlitch {\n    0% {\n        opacity: 1;\n        transform: translate(-50%, -50%) skewX(0deg);\n    }\n    20% {\n        transform: translate(calc(-50% + 14px), calc(-50% - 8px)) skewX(-18deg);\n    }\n    42% {\n        transform: translate(calc(-50% - 12px), calc(-50% - 22px)) skewX(15deg);\n    }\n    66% {\n        opacity: 1;\n        transform: translate(calc(-50% + 8px), calc(-50% - 38px)) skewX(-10deg);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(calc(-50% + var(--mm-celebrate-x)), -120%) skewX(0deg);\n    }\n}\n@keyframes mmCelebratePulse {\n    0% {\n        opacity: 0;\n        transform: translate(-50%, -50%) scale(0.72);\n    }\n    30% {\n        opacity: 0.78;\n        transform: translate(-50%, -50%) scale(1.08);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(-50%, -50%) scale(1.45);\n    }\n}\n\n.mm-answer-accent {\n    --mm-answer-accent-opacity: 0.9;\n    position: fixed;\n    z-index: 9997;\n    pointer-events: none;\n    border: 1px solid var(--mm-theme-field-border, rgba(125, 211, 252, 0.65));\n    border-radius: 8px;\n    box-sizing: border-box;\n    box-shadow: 0 0 18px var(--mm-theme-field-glow, rgba(125, 211, 252, 0.24));\n    opacity: 0;\n    overflow: hidden;\n    animation: mmAnswerAccentPop 620ms ease-out forwards;\n}\n.mm-answer-accent::after {\n    content: '';\n    position: absolute;\n    inset: -2px;\n    background: linear-gradient(\n        90deg,\n        transparent,\n        var(--mm-theme-flash, rgba(125, 211, 252, 0.18)),\n        transparent\n    );\n    transform: translateX(-100%);\n}\n.mm-answer-accent[data-mm-accent='scan'] {\n    animation: mmAnswerAccentScan 560ms steps(4, end) forwards;\n}\n.mm-answer-accent[data-mm-accent='scan']::after {\n    animation: mmAnswerSweep 560ms steps(4, end) forwards;\n}\n.mm-answer-accent[data-mm-accent='glitch'] {\n    animation: mmAnswerAccentGlitch 520ms steps(5, end) forwards;\n}\n.mm-answer-accent[data-mm-accent='orbit'] {\n    border-radius: 999px;\n    animation: mmAnswerAccentOrbit 760ms ease-out forwards;\n}\n.mm-answer-accent[data-mm-accent='bloom'] {\n    animation: mmAnswerAccentBloom 760ms ease-out forwards;\n}\n.mm-answer-accent[data-mm-accent='shimmer'] {\n    animation: mmAnswerAccentShimmer 900ms ease-out forwards;\n}\n.mm-answer-accent[data-mm-accent='pulse'] {\n    animation: mmAnswerAccentPulse 520ms ease-out forwards;\n}\n@keyframes mmAnswerAccentPop {\n    0% {\n        opacity: 0;\n        transform: scale(0.96);\n    }\n    24% {\n        opacity: var(--mm-answer-accent-opacity);\n    }\n    100% {\n        opacity: 0;\n        transform: scale(1.04);\n    }\n}\n@keyframes mmAnswerAccentScan {\n    0% {\n        opacity: 0;\n        transform: translateX(-3px) scaleX(0.98);\n    }\n    22% {\n        opacity: var(--mm-answer-accent-opacity);\n    }\n    100% {\n        opacity: 0;\n        transform: translateX(5px) scaleX(1.02);\n    }\n}\n@keyframes mmAnswerSweep {\n    0% {\n        transform: translateX(-100%);\n    }\n    100% {\n        transform: translateX(100%);\n    }\n}\n@keyframes mmAnswerAccentGlitch {\n    0% {\n        opacity: var(--mm-answer-accent-opacity);\n        transform: translate(0, 0) skewX(0deg);\n    }\n    30% {\n        transform: translate(6px, -2px) skewX(-8deg);\n    }\n    58% {\n        transform: translate(-5px, 2px) skewX(10deg);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(0, 0) skewX(0deg);\n    }\n}\n@keyframes mmAnswerAccentOrbit {\n    0% {\n        opacity: 0;\n        transform: scale(0.92) rotate(0deg);\n    }\n    30% {\n        opacity: var(--mm-answer-accent-opacity);\n    }\n    100% {\n        opacity: 0;\n        transform: scale(1.14) rotate(22deg);\n    }\n}\n@keyframes mmAnswerAccentBloom {\n    0% {\n        opacity: 0;\n        transform: scale(0.9);\n        filter: blur(2px);\n    }\n    28% {\n        opacity: var(--mm-answer-accent-opacity);\n        filter: blur(0);\n    }\n    100% {\n        opacity: 0;\n        transform: scale(1.12);\n        filter: blur(1px);\n    }\n}\n@keyframes mmAnswerAccentShimmer {\n    0% {\n        opacity: 0;\n        transform: translateY(3px);\n    }\n    30% {\n        opacity: var(--mm-answer-accent-opacity);\n    }\n    100% {\n        opacity: 0;\n        transform: translateY(-5px);\n    }\n}\n@keyframes mmAnswerAccentPulse {\n    0% {\n        opacity: 0;\n        transform: scale(0.98);\n    }\n    34% {\n        opacity: var(--mm-answer-accent-opacity);\n    }\n    100% {\n        opacity: 0;\n        transform: scale(1.02);\n    }\n}\n\n/* ── SCREEN FLASH ── */\n#mm-flash {\n    position: fixed;\n    inset: 0;\n    pointer-events: none;\n    z-index: 10002;\n    opacity: 0;\n}\n#mm-flash.correct-flash {\n    background: var(--mm-theme-flash, rgba(100, 255, 150, 0.18));\n    animation: mmFlash 0.3s ease forwards;\n}\n#mm-flash.wrong-flash {\n    background: var(--mm-theme-failure-flash, rgba(255, 70, 90, 0.18));\n    animation: mmFlash 0.3s ease forwards;\n}\n@keyframes mmFlash {\n    0% {\n        opacity: var(--mm-theme-flash-strength, 1);\n    }\n    100% {\n        opacity: 0;\n    }\n}\n\n/* ── SHAKE ── */\n@keyframes mmShakeLight {\n    0%,\n    100% {\n        transform: translate(0, 0);\n    }\n    20% {\n        transform: translate(-3px, 2px);\n    }\n    40% {\n        transform: translate(3px, -2px);\n    }\n    60% {\n        transform: translate(-2px, 3px);\n    }\n    80% {\n        transform: translate(2px, -1px);\n    }\n}\n@keyframes mmShakeHard {\n    0%,\n    100% {\n        transform: translate(0, 0) rotate(0deg);\n    }\n    15% {\n        transform: translate(-6px, 4px) rotate(-0.4deg);\n    }\n    30% {\n        transform: translate(6px, -4px) rotate(0.4deg);\n    }\n    45% {\n        transform: translate(-4px, 6px) rotate(-0.3deg);\n    }\n    60% {\n        transform: translate(4px, -3px) rotate(0.3deg);\n    }\n    75% {\n        transform: translate(-3px, 3px) rotate(-0.2deg);\n    }\n}\nbody.mm-shake-light {\n    animation: mmShakeLight 0.35s ease;\n}\nbody.mm-shake-hard {\n    animation: mmShakeHard 0.45s ease;\n}\n\n/* ── UTILITY ANIMATIONS ── */\n.mm-pulse {\n    animation: mmPulse 0.35s ease;\n}\n.mm-bounce {\n    animation: mmBounce 0.6s ease;\n}\n.mm-progress-glow {\n    animation: mmGlow 0.6s ease;\n}\n@keyframes mmPulse {\n    0%,\n    100% {\n        transform: scale(1);\n    }\n    50% {\n        transform: scale(1.15);\n    }\n}\n@keyframes mmBounce {\n    0%,\n    100% {\n        transform: scale(1);\n    }\n    30% {\n        transform: scale(1.3);\n    }\n    60% {\n        transform: scale(0.9);\n    }\n}\n@keyframes mmGlow {\n    0%,\n    100% {\n        box-shadow: none;\n    }\n    50% {\n        box-shadow: 0 0 18px var(--mm-theme-notification, gold);\n    }\n}\n\n/* ── SETTINGS PANEL ── */\n#mm-settings {\n    display: none;\n    position: fixed;\n    bottom: 20px;\n    left: 210px;\n    background: var(--mm-theme-panel-bg, rgba(0, 0, 0, 0.92));\n    border: 2px solid var(--mm-theme-panel-border, rgba(255, 255, 255, 0.15));\n    border-radius: 8px;\n    padding: 14px 18px;\n    font-size: 9px;\n    color: var(--mm-theme-panel-text, #fff);\n    z-index: 10003;\n    min-width: 220px;\n    line-height: 2;\n    max-height: calc(100vh - 40px);\n    overflow-y: auto;\n    box-shadow: var(--mm-theme-panel-shadow, none);\n}\n#mm-settings.open {\n    display: block;\n}\n#mm-settings h3 {\n    font-size: 10px;\n    color: var(--mm-theme-accent, #f90);\n    margin: 0 0 10px;\n    border-bottom: 1px solid var(--mm-theme-panel-divider, rgba(255, 255, 255, 0.1));\n    padding-bottom: 6px;\n}\n.mm-setting-row {\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n    margin-bottom: 6px;\n}\n.mm-setting-row label {\n    color: var(--mm-theme-panel-muted, #ccc);\n}\n.mm-toggle {\n    width: 28px;\n    height: 14px;\n    background: var(--mm-theme-panel-divider, #444);\n    border-radius: 7px;\n    position: relative;\n    cursor: pointer;\n    border: none;\n    flex-shrink: 0;\n    transition: background 0.2s;\n}\n.mm-toggle.on {\n    background: var(--mm-theme-button, #f90);\n}\n.mm-toggle::after {\n    content: '';\n    position: absolute;\n    width: 10px;\n    height: 10px;\n    background: #fff;\n    border-radius: 50%;\n    top: 2px;\n    left: 2px;\n    transition: left 0.2s;\n}\n.mm-toggle.on::after {\n    left: 16px;\n}\n.mm-cycle-btn {\n    background: var(--mm-theme-button-soft, rgba(0, 180, 255, 0.08));\n    border: 1px solid var(--mm-theme-secondary, rgba(0, 180, 255, 0.28));\n    color: var(--mm-theme-secondary, #7cf);\n    font-family: inherit;\n    font-size: 7px;\n    padding: 4px 6px;\n    border-radius: 4px;\n    cursor: pointer;\n    min-width: 86px;\n    text-align: center;\n}\n.mm-cycle-btn:hover {\n    border-color: var(--mm-theme-secondary, #7cf);\n    color: #fff;\n}\n.mm-cycle-btn:disabled {\n    opacity: 0.58;\n    cursor: default;\n    color: var(--mm-theme-panel-muted, #aaa);\n    border-color: var(--mm-theme-control-border, rgba(255, 255, 255, 0.16));\n}\n.mm-cycle-btn:disabled:hover {\n    color: var(--mm-theme-panel-muted, #aaa);\n    border-color: var(--mm-theme-control-border, rgba(255, 255, 255, 0.16));\n}\n.mm-preview-title {\n    margin: 10px 0 5px;\n    padding-top: 8px;\n    border-top: 1px solid var(--mm-theme-panel-divider, rgba(255, 255, 255, 0.1));\n    color: var(--mm-theme-accent, #f90);\n    font-size: 8px;\n}\n.mm-preview-grid {\n    display: grid;\n    grid-template-columns: 1fr 1fr;\n    gap: 5px;\n    margin-bottom: 4px;\n}\n.mm-preview-btn {\n    background: var(--mm-theme-control-bg, transparent);\n    border: 1px solid var(--mm-theme-control-border, rgba(255, 255, 255, 0.2));\n    color: var(--mm-theme-panel-muted, #aaa);\n    font-family: inherit;\n    font-size: 7px;\n    padding: 4px 5px;\n    border-radius: 4px;\n    cursor: pointer;\n}\n.mm-preview-btn:hover {\n    border-color: var(--mm-theme-button, #f90);\n    color: var(--mm-theme-button, #f90);\n}\n#mm-vol-slider,\n#mm-music-vol-slider {\n    -webkit-appearance: none;\n    width: 80px;\n    height: 4px;\n    background: var(--mm-theme-panel-divider, #555);\n    border-radius: 2px;\n    outline: none;\n    cursor: pointer;\n}\n#mm-vol-slider::-webkit-slider-thumb,\n#mm-music-vol-slider::-webkit-slider-thumb {\n    -webkit-appearance: none;\n    width: 12px;\n    height: 12px;\n    background: var(--mm-theme-button, #f90);\n    border-radius: 50%;\n}\n\n/* shared close/action button style */\n.mm-btn-outline {\n    display: block;\n    width: 100%;\n    margin-top: 10px;\n    background: var(--mm-theme-control-bg, transparent);\n    border: 1px solid var(--mm-theme-control-border, rgba(255, 255, 255, 0.2));\n    color: var(--mm-theme-panel-muted, #aaa);\n    font-family: var(--mm-arcade-font);\n    font-size: 7px;\n    padding: 4px;\n    border-radius: 4px;\n    cursor: pointer;\n    text-align: center;\n}\n.mm-btn-outline:hover {\n    border-color: var(--mm-theme-button, #f90);\n    color: var(--mm-theme-button, #f90);\n}\n\n/* ── SESSION SUMMARY ── */\n#mm-summary {\n    display: none;\n    position: fixed;\n    inset: 0;\n    background: rgba(0, 0, 0, 0.88);\n    z-index: 10010;\n    align-items: center;\n    justify-content: center;\n    flex-direction: column;\n}\n#mm-summary.open {\n    display: flex;\n}\n#mm-summary-inner {\n    background: var(--mm-theme-panel-bg, #111);\n    border: 2px solid var(--mm-theme-panel-border, var(--mm-theme-accent, #f90));\n    border-radius: 12px;\n    padding: 32px 40px;\n    text-align: center;\n    max-width: 480px;\n    width: 90%;\n    box-shadow: var(--mm-theme-panel-shadow, none);\n    animation: mmSummaryIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;\n}\n@keyframes mmSummaryIn {\n    from {\n        transform: scale(0.5);\n        opacity: 0;\n    }\n    to {\n        transform: scale(1);\n        opacity: 1;\n    }\n}\n#mm-summary h2 {\n    color: var(--mm-theme-accent, #f90);\n    font-size: 18px;\n    margin: 0 0 24px;\n    letter-spacing: 2px;\n}\n#mm-grade {\n    font-size: 42px;\n    margin: 0 0 18px;\n    line-height: 1;\n}\n.mm-summary-grid {\n    display: grid;\n    grid-template-columns: 1fr 1fr;\n    gap: 14px 24px;\n    text-align: left;\n    margin-bottom: 24px;\n}\n.mm-summary-cell {\n    color: var(--mm-theme-panel-muted, #aaa);\n    font-size: 8px;\n    line-height: 2;\n}\n.mm-summary-val {\n    color: var(--mm-theme-panel-text, #fff);\n    font-size: 13px;\n    display: block;\n}\n.mm-summary-val.gold {\n    color: var(--mm-theme-notification, #ffe066);\n}\n.mm-summary-val.green {\n    color: var(--mm-theme-success, #7f7);\n}\n.mm-summary-val.cyan {\n    color: var(--mm-theme-secondary, #7cf);\n}\n.mm-summary-val.orange {\n    color: var(--mm-theme-accent, #f90);\n}\n.mm-summary-val.pink {\n    color: var(--mm-theme-banner, #f0f);\n}\n#mm-summary-close {\n    background: var(--mm-theme-button, #f90);\n    border: none;\n    color: #000;\n    font-family: var(--mm-arcade-font);\n    font-size: 10px;\n    padding: 10px 24px;\n    border-radius: 6px;\n    cursor: pointer;\n}\n#mm-summary-close:hover {\n    filter: brightness(1.12);\n}\n\n.mm-theme-particle {\n    --mm-particle-x: 0px;\n    --mm-particle-y: -56px;\n    --mm-particle-size: 5px;\n    --mm-particle-life: 700ms;\n    --mm-particle-rot: 0deg;\n    position: fixed;\n    z-index: 9999;\n    pointer-events: none;\n    width: var(--mm-particle-size);\n    height: var(--mm-particle-size);\n    color: var(--mm-particle-color, var(--mm-theme-notification, #ffe066));\n    background: currentColor;\n    border-radius: 50%;\n    box-shadow: 0 0 9px currentColor;\n    animation: mmThemeParticleBurst var(--mm-particle-life) ease-out forwards;\n}\n.mm-theme-particle.pixel {\n    border-radius: 1px;\n    image-rendering: pixelated;\n}\n.mm-theme-particle.star,\n.mm-theme-particle.glyph {\n    width: auto;\n    height: auto;\n    background: transparent;\n    border-radius: 0;\n    font-family: var(--mm-arcade-font);\n    font-size: var(--mm-particle-size);\n    line-height: 1;\n    text-shadow: 0 0 8px currentColor;\n}\n.mm-theme-particle.ring {\n    background: transparent;\n    border: 1px solid currentColor;\n}\n.mm-theme-particle.petal {\n    border-radius: 80% 20% 80% 20%;\n}\n.mm-theme-particle.fall {\n    animation-name: mmThemeParticleFall;\n}\n.mm-theme-particle.drift {\n    animation-name: mmThemeParticleDrift;\n}\n.mm-theme-particle.glitch {\n    animation-name: mmThemeParticleGlitch;\n}\n@keyframes mmThemeParticleBurst {\n    0% {\n        opacity: 1;\n        transform: translate(-50%, -50%) scale(1) rotate(0deg);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(calc(-50% + var(--mm-particle-x)), calc(-50% + var(--mm-particle-y)))\n            scale(0.3) rotate(var(--mm-particle-rot));\n    }\n}\n@keyframes mmThemeParticleFall {\n    0% {\n        opacity: 0.9;\n        transform: translate(-50%, -50%) rotate(0deg);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(\n                calc(-50% + var(--mm-particle-x)),\n                calc(-50% + var(--mm-particle-y) + 48px)\n            )\n            rotate(var(--mm-particle-rot));\n    }\n}\n@keyframes mmThemeParticleDrift {\n    0% {\n        opacity: 0;\n        transform: translate(-50%, -50%) scale(0.7);\n    }\n    22% {\n        opacity: 1;\n    }\n    100% {\n        opacity: 0;\n        transform: translate(calc(-50% + var(--mm-particle-x)), calc(-50% + var(--mm-particle-y)))\n            scale(1.35);\n    }\n}\n@keyframes mmThemeParticleGlitch {\n    0% {\n        opacity: 1;\n        transform: translate(-50%, -50%) skewX(0deg);\n    }\n    36% {\n        transform: translate(calc(-50% + 8px), calc(-50% - 8px)) skewX(-14deg);\n    }\n    100% {\n        opacity: 0;\n        transform: translate(calc(-50% + var(--mm-particle-x)), calc(-50% + var(--mm-particle-y)))\n            skewX(16deg);\n    }\n}\n\n@media (prefers-reduced-motion: reduce) {\n    #mm-hud,\n    #mm-combo-bar,\n    .mm-toggle::after,\n    .mm-float,\n    .mm-hud-micro,\n    .mm-theme-particle,\n    #mm-mult-banner,\n    #mm-milestone-banner,\n    .mm-celebrate,\n    .mm-answer-accent,\n    #mm-flash,\n    body.mm-shake-light,\n    body.mm-shake-hard,\n    .mm-pulse,\n    .mm-bounce,\n    .mm-progress-glow,\n    #mm-summary-inner {\n        animation: none !important;\n        transition: none !important;\n    }\n\n    .mm-float,\n    .mm-hud-micro,\n    .mm-theme-particle,\n    #mm-mult-banner,\n    #mm-milestone-banner,\n    .mm-celebrate,\n    .mm-answer-accent,\n    #mm-flash {\n        opacity: 0 !important;\n    }\n}\n";
  var styles_default = cssText2;

  // src/app.js
  function resolveToneFrequency(note, context = {}) {
    if (Array.isArray(note.freqByMultiplier)) {
      const index = Math.max(
        0,
        Math.min(
          note.freqByMultiplier.length - 1,
          Math.floor(Number(context.multiplier) || 1) - 1
        )
      );
      return note.freqByMultiplier[index];
    }
    const base = Number(note.freq) || 440;
    const streakAdd = (Number(context.answerStreak) || 0) * (Number(note.streakScale) || 0);
    const wordAdd = Math.min(
      (Number(context.wordStreak) || 0) * (Number(note.wordScale) || 0),
      Number(note.maxWordBonus) || 120
    );
    return clamp(base + streakAdd + wordAdd, note.minFreq || 40, note.maxFreq || 2800, base);
  }
  function resolveToneVolume(note, context = {}) {
    const volume = (Number(note.volume) || 0.12) + (Number(context.answerStreak) || 0) * (Number(note.volumeStreakScale) || 0);
    return clamp(volume, 1e-3, note.maxVolume || 0.3, note.volume || 0.12);
  }
  var userscriptStorage = createUserscriptStorage({
    getValue: (key, fallback) => GM_getValue(key, fallback),
    setValue: (key, value) => GM_setValue(key, value)
  });
  function loadSettings() {
    return normalizeSettings(userscriptStorage.getJson(SETTINGS_STORAGE_KEY, {}));
  }
  var settingsSaveTimer = null;
  function saveSettings() {
    if (settingsSaveTimer) {
      clearTimeout(settingsSaveTimer);
      settingsSaveTimer = null;
    }
    userscriptStorage.setJson(SETTINGS_STORAGE_KEY, settings);
  }
  var settings = loadSettings();
  validateThemeRegistry();
  var ThemeManager = createThemeManager({
    document,
    getSettings: () => settings,
    saveSettings,
    isLiteMode,
    isMaxMode
  });
  ThemeManager.applyCssVariables(settings.backgroundTheme);
  function isLiteMode() {
    return settings.performanceProfile === "lite";
  }
  function isMaxMode() {
    return settings.performanceProfile === "max";
  }
  function scheduleSettingsSave() {
    if (settingsSaveTimer) clearTimeout(settingsSaveTimer);
    settingsSaveTimer = setTimeout(saveSettings, 180);
  }
  function flushSettingsSave() {
    if (settingsSaveTimer) saveSettings();
  }
  function loadRecords() {
    return normalizeRecords(userscriptStorage.getJson(RECORDS_STORAGE_KEY, {}));
  }
  var recordsSaveTimer = null;
  var lastRecordsSaveAt = 0;
  function saveRecords() {
    if (recordsSaveTimer) {
      clearTimeout(recordsSaveTimer);
      recordsSaveTimer = null;
    }
    userscriptStorage.setJson(RECORDS_STORAGE_KEY, records);
    lastRecordsSaveAt = Date.now();
  }
  function scheduleRecordsSave() {
    if (recordsSaveTimer) return;
    const delay = Math.max(0, 1e3 - (Date.now() - lastRecordsSaveAt));
    recordsSaveTimer = setTimeout(saveRecords, delay);
  }
  function flushRecordsSave() {
    if (recordsSaveTimer) saveRecords();
  }
  var records = loadRecords();
  var STATE_INIT = {
    answerStreak: 0,
    wordStreak: 0,
    multiplier: 1,
    score: 0,
    lastCompleted: 0,
    sessionCorrect: 0,
    sessionIncorrect: 0,
    sessionWords: 0,
    sessionStart: 0,
    bestStreak: 0,
    bestMultiplier: 1,
    sessionActive: false
  };
  var state = { ...STATE_INIT };
  function resetState() {
    Object.assign(state, STATE_INIT, { sessionActive: true, sessionStart: Date.now() });
    firstInputGate.reset();
  }
  function pruneRecords2() {
    const previousSignature = getRecordsSignature(records);
    records = pruneRecords(records);
    if (getRecordsSignature(records) !== previousSignature) scheduleRecordsSave();
  }
  function getRollingRecords2() {
    pruneRecords2();
    return getRollingRecords(records);
  }
  function updateRollingRecords2() {
    const result3 = updateRollingRecords(records, state);
    records = result3.records;
    if (result3.changed) scheduleRecordsSave();
  }
  var initialized = false;
  var gamifyActive = false;
  var lastAnswerState = null;
  var correctnessObserver = null;
  var correctnessTarget = null;
  var counterObserver = null;
  var counterTarget = null;
  var comboTimerCompositor = null;
  var hudController = null;
  var settingsPanelController = null;
  var documentClickHandler = null;
  var documentKeyHandler = null;
  var domSyncRaf = null;
  var previewAllTimer = null;
  var sessionRemountPending = false;
  var els = {};
  var marumoriDom = createMaruMoriDomAdapter({ document });
  var lifecycle = createLifecycleController();
  var answerTimerOwnership = createAnswerTimerOwnershipController({
    lifecycle,
    dom: marumoriDom,
    clock: () => performance.now()
  });
  var crtController = createCrtController({ document });
  var transientEffects = createTransientEffectsController({
    document,
    window,
    getSettings: () => settings,
    theme: ThemeManager,
    isLiteMode,
    isMaxMode,
    prefersReducedMotion,
    getFlashElement: () => els.flash,
    getDefaultAnchor: getInputWrapper,
    temporaryEffectSelector: TEMP_EFFECT_SELECTOR
  });
  var {
    animateClass,
    flashScreen,
    pulseElement,
    removeTemporaryEffects,
    scheduleFailureFlash,
    shakeScreen,
    showBanner,
    spawnCelebrationBurst,
    spawnFloat,
    spawnThemeParticles,
    triggerAnswerBoxAccent
  } = transientEffects;
  var fontChallengeController = createFontChallengeController({
    document,
    storage: userscriptStorage,
    feedback(target, message) {
      spawnFloat(message, "rewind", target);
    },
    isLiteMode,
    getTarget: getFontChallengeTarget
  });
  var firstInputGate = createFirstInputGate({
    lifecycle,
    isCurrentInput: (input) => getAnswerInput() === input,
    isResolved: isAnswerResolved,
    onStart: () => resetComboTimer(true)
  });
  var reviewReconciler = null;
  var rewindController = null;
  var timeoutFailureController = null;
  var sessionFinalizationController = null;
  var activeReviewRoot = null;
  var activeReviewUrl = null;
  var activeReviewSessionIdentity = null;
  var timerState = {
    startedAt: 0,
    durationMs: settings.timerSeconds * 1e3,
    remainingPct: 1,
    expired: false,
    running: false,
    currentQuestionId: 0,
    awardedForQuestionId: null,
    ownership: null
  };
  var lastAudioWarnAt = 0;
  var sfxToneScheduler = createToneScheduler({ onError: warnAudioError });
  var reduceMotionMedia = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  function prefersReducedMotion() {
    return reduceMotionMedia?.matches === true;
  }
  function warnAudioError(error, operation = "runtime") {
    const now = Date.now();
    if (now - lastAudioWarnAt < AUDIO_WARN_THROTTLE_MS) return;
    lastAudioWarnAt = now;
    console.warn(`[MMGamify] Audio ${operation} error:`, error);
  }
  var audioAdapter = createAudioContextAdapter({
    createContext() {
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      return AudioContextConstructor ? new AudioContextConstructor() : null;
    },
    onError: warnAudioError
  });
  var themeMusicScheduler = createThemeMusicScheduler({
    getMusicStyle: () => settings.musicStyle,
    isLiteMode
  });
  var musicController = createMusicController({
    audio: audioAdapter,
    schedulePattern({ context, destination, start, patternIndex }) {
      return themeMusicScheduler.scheduleBar(
        context,
        destination,
        start,
        ThemeManager.getMusicPreset(),
        patternIndex
      );
    },
    stopScheduled: themeMusicScheduler.stopScheduled,
    isEnabled: () => settings.musicEnabled,
    isSessionActive: () => initialized && state.sessionActive,
    isLiteMode,
    isVisible: () => !document.hidden,
    getVolume: () => settings.musicVolume,
    onError: warnAudioError
  });
  var sfxPlayer = createSfxPlayer({
    audio: audioAdapter,
    isEnabled: () => settings.sfxEnabled,
    getVolume: () => settings.volume,
    scheduleSfx({ context: audioContext, destination, eventType, eventContext, volume }) {
      const notes = ThemeManager.getSoundPreset(eventType);
      const budget = ThemeManager.getEffectBudget(eventType);
      let scheduled = 0;
      notes.forEach((note) => {
        if (note.skipLite && isLiteMode()) return;
        if (note.every && (Number(eventContext.answerStreak) || 0) % note.every !== 0) return;
        if (note.chance && Math.random() >= note.chance) return;
        const frequency = resolveToneFrequency(note, eventContext);
        const endFreq = note.endFreqScale ? frequency * note.endFreqScale : note.endFreq;
        if (sfxToneScheduler.schedule({
          context: audioContext,
          destination,
          frequency,
          duration: note.duration,
          volume: resolveToneVolume(note, eventContext) * budget.soundScale * volume,
          type: note.type || "square",
          delay: note.delay || 0,
          endFrequency: endFreq,
          detune: note.detune || 0
        })) {
          scheduled++;
        }
      });
      return scheduled;
    },
    stopScheduled: () => sfxToneScheduler.stopAll(),
    onError: warnAudioError
  });
  function hasAudibleAudioWork() {
    return settings.sfxEnabled && settings.volume > 0 || settings.musicEnabled && settings.musicVolume > 0;
  }
  var audioLifecycle = createAudioLifecycle({
    audio: audioAdapter,
    music: musicController,
    sfx: sfxPlayer,
    target: document,
    isHidden: () => document.hidden,
    shouldArmUnlock: hasAudibleAudioWork,
    onError: warnAudioError
  });
  function syncAudioUnlockPolicy({ consumeGesture = false } = {}) {
    syncAudioPolicy({
      lifecycle: audioLifecycle,
      sfx: sfxPlayer,
      sfxEnabled: settings.sfxEnabled,
      sfxVolume: settings.volume,
      musicEnabled: settings.musicEnabled,
      musicVolume: settings.musicVolume,
      consumeGesture
    });
  }
  function stopMusic(fadeSeconds = 0.35) {
    return musicController.stop({ fadeSeconds });
  }
  function startMusic() {
    void musicController.start();
  }
  function restartMusic() {
    return musicController.restart();
  }
  function installMusicLifecycle() {
    audioLifecycle.install();
    if (audioAdapter.runningContext && settings.musicEnabled && settings.musicVolume > 0) {
      void audioLifecycle.resume();
    }
  }
  function uninstallMusicLifecycle() {
    audioLifecycle.cleanup();
  }
  function playThemeSound(eventType, context = {}) {
    void sfxPlayer.playThemeSound(eventType, context);
  }
  function playCorrectSound() {
    playThemeSound("correct", { answerStreak: state.answerStreak });
  }
  function playFailSound() {
    playThemeSound("incorrect");
  }
  function playWordCompleteSound() {
    playThemeSound("wordComplete", { wordStreak: state.wordStreak });
  }
  function playMultiplierUpSound(mult) {
    playThemeSound("multiplierUp", { multiplier: mult });
  }
  function playComboBreakSound() {
    playThemeSound("comboBreak");
  }
  function playSessionEndSound() {
    playThemeSound("sessionComplete");
  }
  function getTimedXpAward(now = performance.now()) {
    const remainingPct = getTimerRemainingPct(now);
    const award = evaluateTimedXpAward({ settings, timerState, remainingPct });
    timerState.awardedForQuestionId = award.awardedForQuestionId;
    return award;
  }
  function getCurrentXpBonusMultiplier2(remainingPct = null) {
    const currentRemainingPct = Number.isFinite(remainingPct) ? remainingPct : getTimerRemainingPct();
    return getCurrentXpBonusMultiplier({
      settings,
      timerState,
      remainingPct: currentRemainingPct
    });
  }
  function calcAnswerPoints2(multiplier, timedXpMultiplier = 1) {
    return calcAnswerPoints(multiplier, timedXpMultiplier, settings);
  }
  function injectStyles() {
    if (document.getElementById("mm-gamify-styles")) return;
    const s = document.createElement("style");
    s.id = "mm-gamify-styles";
    s.textContent = styles_default;
    document.head.appendChild(s);
  }
  function injectUI() {
    if (document.getElementById("mm-hud")) return;
    hudController = createHudController({
      document,
      window,
      settings,
      saveSettings,
      prefersReducedMotion,
      isLiteMode,
      onRewind: requestRewind
    });
    settingsPanelController = createSettingsPanelController({
      document,
      settings,
      saveSettings,
      scheduleSettingsSave,
      getMusicPreset: () => ThemeManager.getMusicPreset(),
      getThemeIds: () => ThemeManager.getThemeIds(),
      getThemeId: (theme) => ThemeManager.getThemeId(theme),
      getThemeLabel: (theme) => ThemeManager.getThemeLabel(theme),
      normalizeTheme: (theme) => ThemeManager.getThemeId(theme),
      onSettingSideEffects: applySettingSideEffects,
      onSfxVolumeChanged() {
        syncAudioUnlockPolicy({
          consumeGesture: settings.sfxEnabled && settings.volume > 0
        });
      },
      onPerformanceProfileChanged: applyPerformanceProfileSideEffects,
      onTimerDurationChanged() {
        refreshAnswerTimerForCurrentQuestion(true);
        updateHUD();
      },
      onMusicStyleChanged() {
        if (settings.musicEnabled) restartMusic();
      },
      onMusicVolumeChanged() {
        const updated = musicController.setVolume(settings.musicVolume);
        if (!updated && settings.musicEnabled && settings.musicVolume > 0) {
          void musicController.sync();
        }
        syncAudioUnlockPolicy();
      },
      onPreviewThemeEvent: previewThemeEvent,
      applyBackgroundTheme: (theme) => ThemeManager.applyTheme(theme, { persist: true }),
      onBackgroundThemeChanged() {
        restartArcadeBackdrop();
        if (settings.musicEnabled) restartMusic();
      },
      onResetHudPosition: () => hudController?.resetPosition(),
      onResetRecords() {
        resetRecordsAuthoritatively({
          rewind: rewindController,
          setRecords(nextRecords) {
            records = nextRecords;
          },
          saveRecords,
          updateHud: updateHUD
        });
      }
    });
    const frag = document.createDocumentFragment();
    frag.appendChild(hudController.element);
    frag.appendChild(hudController.settingsLauncher);
    frag.appendChild(createTrustedTemplateElement("div", "mm-flash"));
    frag.appendChild(createTrustedTemplateElement("div", "mm-mult-banner"));
    frag.appendChild(createTrustedTemplateElement("div", "mm-milestone-banner"));
    frag.appendChild(settingsPanelController.element);
    document.body.appendChild(frag);
    els = {
      hud: hudController.element,
      flash: document.getElementById("mm-flash"),
      bar: hudController.refs.bar,
      barWrap: hudController.refs.barWrap,
      rewind: hudController.refs.rewind
    };
    hudController.install(settingsPanelController.element);
    settingsPanelController.install();
  }
  function createTrustedTemplateElement(tag, id, html = "") {
    const node = document.createElement(tag);
    node.id = id;
    if (html) node.innerHTML = html;
    return node;
  }
  var REWIND_KEYS = [
    "answerStreak",
    "wordStreak",
    "multiplier",
    "score",
    "lastCompleted",
    "sessionCorrect",
    "sessionIncorrect",
    "sessionWords",
    "sessionStart",
    "bestStreak",
    "bestMultiplier",
    "sessionActive"
  ];
  function makeRewindSnapshot(kind) {
    const snapshot = {
      kind,
      records: normalizeRecords(records)
    };
    for (const key of REWIND_KEYS) {
      snapshot[key] = state[key];
    }
    return snapshot;
  }
  function setRewindSnapshot(snapshot) {
    if (!snapshot) {
      rewindController?.discard();
    } else {
      rewindController?.capture(snapshot);
    }
    updateRewindButton();
  }
  function updateRewindButton() {
    if (els.rewind) {
      els.rewind.disabled = !rewindController?.hasSnapshot || rewindController.isPending;
    }
  }
  function cancelPendingSummary() {
    sessionFinalizationController?.cancelPendingSummary();
    document.getElementById("mm-summary")?.classList.remove("open");
  }
  function restoreRewindSnapshot(snapshot, { source = "unknown" } = {}) {
    if (!snapshot) return false;
    for (const key of REWIND_KEYS) {
      state[key] = snapshot[key];
    }
    records = normalizeRecords(snapshot.records);
    saveRecords();
    lastAnswerState = null;
    updateHUD();
    updateRewindButton();
    spawnFloat("REWIND", "rewind", els.hud);
    console.warn(`[MMGamify] Rewound last ${source} answer.`);
    return true;
  }
  function requestRewind(source) {
    if (!rewindController?.hasSnapshot || rewindController.isPending) return false;
    updateRewindButton();
    rewindController.request(source).finally(() => {
      updateRewindButton();
    });
    return true;
  }
  function installNativeRewindDetection() {
    if (documentClickHandler || documentKeyHandler) return;
    documentClickHandler = (event) => {
      const control = event.target.closest?.('button, [role="button"]');
      const capability = marumoriDom.getNativeRewindCapability();
      if (!control || capability?.element !== control || !rewindController?.hasSnapshot) return;
      rewindController.trackNativeIntent("native").finally(updateRewindButton);
      updateRewindButton();
    };
    documentKeyHandler = (event) => {
      if (!rewindController?.hasSnapshot || !lastAnswerState || event.key !== "Backspace" || event.defaultPrevented) {
        return;
      }
      rewindController.trackNativeIntent("keyboard").finally(updateRewindButton);
      updateRewindButton();
    };
    document.addEventListener("click", documentClickHandler, true);
    document.addEventListener("keydown", documentKeyHandler, true);
  }
  function uninstallNativeRewindDetection() {
    if (documentClickHandler) {
      document.removeEventListener("click", documentClickHandler, true);
      documentClickHandler = null;
    }
    if (documentKeyHandler) {
      document.removeEventListener("keydown", documentKeyHandler, true);
      documentKeyHandler = null;
    }
  }
  function updateHUD() {
    if (!hudController) return;
    updateRollingRecords2();
    hudController.update({
      state,
      rollingRecords: getRollingRecords2(),
      bonusMultiplier: getCurrentXpBonusMultiplier2()
    });
    updateRewindButton();
  }
  function showHudMicro(text, tone = "score") {
    hudController?.showMicro(text, tone);
  }
  function syncPerformanceProfilePresentation() {
    document.body.classList.toggle("mm-performance-mode", isLiteMode());
    document.body.classList.toggle("mm-max-mode", isMaxMode());
  }
  function applyPerformanceProfileSideEffects() {
    syncPerformanceProfilePresentation();
    isLiteMode() ? stopMusic(0.12) : startMusic();
    if (settings.fontChallengeEnabled) {
      clearFontChallenge();
      applyFontChallenge();
    }
    restartArcadeBackdrop();
  }
  function applySettingSideEffects(key) {
    if (key === "sfxEnabled") {
      syncAudioUnlockPolicy({
        consumeGesture: settings.sfxEnabled && settings.volume > 0
      });
    }
    if (key === "hudEnabled") {
      hudController?.setVisible(settings.hudEnabled);
      comboTimerCompositor?.setVisualsEnabled(settings.hudEnabled);
    }
    if (key === "visualsEnabled") {
      if (!settings.visualsEnabled) {
        arcadeOff();
        document.body.classList.remove("mm-shake-light", "mm-shake-hard");
        removeTemporaryEffects();
      } else {
        syncArcadePresentation();
      }
    }
    if (key === "crtEnabled") {
      syncCrtEffects();
    }
    if (key === "musicEnabled") {
      settings.musicEnabled ? startMusic() : stopMusic();
      syncAudioUnlockPolicy();
    }
    if (key === "timerEnabled") {
      if (!settings.timerEnabled) timeoutFailureController?.cancel("timer-disabled");
      refreshAnswerTimerForCurrentQuestion(true);
    }
    if (key === "timeoutFailureEnabled" && !settings.timeoutFailureEnabled) {
      timeoutFailureController?.cancel("timeout-auto-fail-disabled");
    }
    if (key === "timedXpBonusEnabled" || key === "timeoutFailureEnabled" || key === "fontChallengeEnabled") {
      updateHUD();
    }
    if (key === "fontChallengeEnabled") {
      settings.fontChallengeEnabled ? applyFontChallenge() : clearFontChallenge();
    }
  }
  function isAnswerResolved() {
    const resolution = marumoriDom.getResolvedState();
    return resolution === DOM_RESOLUTION.CORRECT || resolution === DOM_RESOLUTION.INCORRECT;
  }
  function getAnswerInput() {
    return marumoriDom.getAnswerInput();
  }
  function getTimerDurationMs() {
    return settings.timerSeconds * 1e3;
  }
  function getTimerRemainingPct(now = performance.now()) {
    if (!timerState.running) return timerState.remainingPct;
    const remainingPct = comboTimerCompositor ? comboTimerCompositor.getRemainingPct(now) : clamp(1 - Math.max(0, now - timerState.startedAt) / timerState.durationMs, 0, 1, 0);
    timerState.remainingPct = remainingPct;
    if (remainingPct <= 0) timerState.expired = true;
    return remainingPct;
  }
  function syncXpBonusDisplay(remainingPct = null) {
    hudController?.updateBonus(getCurrentXpBonusMultiplier2(remainingPct));
  }
  function ensureComboTimerCompositor() {
    if (!els.bar || !els.barWrap) return null;
    if (comboTimerCompositor?.bar === els.bar) return comboTimerCompositor;
    comboTimerCompositor?.dispose();
    comboTimerCompositor = createComboTimerCompositor({
      bar: els.bar,
      wrapper: els.barWrap,
      reducedMotion: prefersReducedMotion,
      onTierChange({ remainingPct, snapshot }) {
        if (snapshot.ownership !== timerState.ownership) return;
        timerState.remainingPct = remainingPct;
        syncXpBonusDisplay(remainingPct);
      },
      onExpire(_snapshot, ownership) {
        if (!ownership || ownership !== timerState.ownership) return;
        const validation = answerTimerOwnership.validate(ownership, {
          requireExpired: true
        });
        if (!validation.ok) {
          handleRejectedTimerExpiration(ownership, validation);
          return;
        }
        handleAnswerTimeout(ownership);
      }
    });
    return comboTimerCompositor;
  }
  function startComboBar({ ownership = null } = {}) {
    const compositor = ensureComboTimerCompositor();
    if (!compositor) return false;
    const durationMs = ownership?.durationMs ?? getTimerDurationMs();
    const nextOwnership = ownership ?? answerTimerOwnership.arm({ durationMs });
    if (!nextOwnership) return false;
    const remainingPct = clamp(
      (nextOwnership.deadline - performance.now()) / nextOwnership.durationMs,
      0,
      1,
      0
    );
    timerState.startedAt = nextOwnership.armedAt;
    timerState.durationMs = nextOwnership.durationMs;
    timerState.remainingPct = remainingPct;
    timerState.expired = false;
    timerState.running = true;
    timerState.currentQuestionId = nextOwnership.timerGeneration;
    timerState.awardedForQuestionId = null;
    timerState.ownership = nextOwnership;
    compositor.start({
      durationMs: timerState.durationMs,
      remainingPct,
      visualsEnabled: settings.hudEnabled,
      ownership: nextOwnership
    });
    return true;
  }
  function stopComboBar({ remainingPct = 0, inactive = false, clearTier = true } = {}) {
    ensureComboTimerCompositor()?.stop({ remainingPct, inactive, clearTier });
  }
  function invalidateAnswerTimerOwnership(ownership = timerState.ownership) {
    const invalidated = answerTimerOwnership.invalidate(ownership);
    if (timerState.ownership === ownership) timerState.ownership = null;
    return invalidated;
  }
  function stopAnswerTimer({ preserveOwnership = false } = {}) {
    timerState.running = false;
    if (!preserveOwnership) invalidateAnswerTimerOwnership();
    stopComboBar();
    syncXpBonusDisplay();
  }
  function removeFirstAnswerInputGate() {
    firstInputGate.disarm();
  }
  function pauseFirstAnswerTimer() {
    timerState.running = false;
    timerState.expired = false;
    timerState.remainingPct = 1;
    invalidateAnswerTimerOwnership();
    stopComboBar({ remainingPct: 1, clearTier: false });
    syncXpBonusDisplay();
  }
  function armFirstAnswerTimer() {
    if (!settings.timerEnabled) {
      removeFirstAnswerInputGate();
      return resetComboTimer(true);
    }
    if (firstInputGate.hasStarted || isAnswerResolved()) {
      return resetComboTimer();
    }
    const input = getAnswerInput();
    if (!input) return false;
    if (firstInputGate.input === input) return true;
    pauseFirstAnswerTimer();
    return firstInputGate.arm(input);
  }
  function refreshAnswerTimerForCurrentQuestion(force = false) {
    if (!firstInputGate.hasStarted) {
      return armFirstAnswerTimer();
    }
    return resetComboTimer(force);
  }
  function resetComboTimer(force = false) {
    if (!force && timerState.running && !isAnswerResolved()) {
      return true;
    }
    timerState.running = false;
    invalidateAnswerTimerOwnership();
    if (!settings.timerEnabled) {
      timerState.remainingPct = 1;
      timerState.expired = false;
      stopComboBar({ remainingPct: 1, inactive: true, clearTier: true });
      syncXpBonusDisplay();
      return true;
    }
    if (state.sessionActive && getInputWrapper() && !isAnswerResolved()) {
      return startComboBar();
    } else {
      stopAnswerTimer();
      return false;
    }
  }
  function applyTimeoutPenalty() {
    if (state.answerStreak > 4) {
      playComboBreakSound();
      spawnThemeParticles("comboBreak", getInputWrapper());
    }
    state.answerStreak = 0;
    state.multiplier = 1;
    updateHUD();
  }
  function handleRejectedTimerExpiration(ownership, validation) {
    if (answerTimerOwnership.current !== ownership) return false;
    if (validation.reason === "deadline-not-reached") {
      return startComboBar({ ownership });
    }
    const rearmed = answerTimerOwnership.rearmForCurrentDom(ownership);
    if (rearmed.ok && rearmed.ownership) {
      return startComboBar({ ownership: rearmed.ownership });
    }
    invalidateAnswerTimerOwnership(ownership);
    timerState.running = false;
    timerState.expired = false;
    timerState.remainingPct = 1;
    stopComboBar({ remainingPct: 1, inactive: true, clearTier: true });
    syncXpBonusDisplay();
    reviewReconciler?.request("timer-owner-rejected");
    return false;
  }
  function reconcileAnswerTimerDomOwnership() {
    const ownership = timerState.ownership;
    if (!timerState.running || !ownership) return false;
    const validation = answerTimerOwnership.validate(ownership);
    if (validation.ok) return false;
    if (validation.reason !== "dom-generation-changed") return false;
    const rearmed = answerTimerOwnership.rearmForCurrentDom(ownership);
    if (!rearmed.ok || !rearmed.ownership || rearmed.ownership === ownership) return false;
    return startComboBar({ ownership: rearmed.ownership });
  }
  function handleAnswerTimeout(ownership) {
    const validation = answerTimerOwnership.validate(ownership, {
      requireExpired: true
    });
    if (!validation.ok || ownership !== timerState.ownership) {
      handleRejectedTimerExpiration(ownership, validation);
      return false;
    }
    timerState.remainingPct = 0;
    timerState.expired = true;
    timerState.running = false;
    stopComboBar({ remainingPct: 0, clearTier: false });
    syncXpBonusDisplay();
    spawnFloat("TIME UP", "incorrect", getInputWrapper());
    playThemeSound("timeout");
    triggerAnswerBoxAccent("timeout");
    spawnThemeParticles("timeout", getInputWrapper());
    if (settings.timeoutFailureEnabled && timeoutFailureController) {
      timeoutFailureController.start("answer-timeout", ownership);
      return true;
    }
    applyTimeoutPenalty();
    invalidateAnswerTimerOwnership(ownership);
    return true;
  }
  var THEME_PREVIEW_EVENTS = [
    "correct",
    "combo",
    "wordComplete",
    "milestone",
    "timeout",
    "incorrect",
    "sessionComplete"
  ];
  var THEME_PREVIEW_DELAY_MS = 360;
  var PREVIEW_STATE_KEYS = [
    "answerStreak",
    "wordStreak",
    "multiplier",
    "score",
    "lastCompleted",
    "sessionCorrect",
    "sessionIncorrect",
    "sessionWords",
    "sessionStart",
    "bestStreak",
    "bestMultiplier",
    "sessionActive"
  ];
  function getPreviewAnchor() {
    return getInputWrapper() || els.hud || null;
  }
  function getPreviewStateInvariant() {
    return {
      state: Object.fromEntries(PREVIEW_STATE_KEYS.map((key) => [key, state[key]])),
      records: getRecordsSignature(records),
      rewindAvailable: Boolean(rewindController?.hasSnapshot),
      timer: {
        running: timerState.running,
        expired: timerState.expired,
        currentQuestionId: timerState.currentQuestionId,
        awardedForQuestionId: timerState.awardedForQuestionId
      }
    };
  }
  function warnIfPreviewChangedState(before, eventType) {
    const after = getPreviewStateInvariant();
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      console.warn("[MMGamify] Theme preview changed gameplay state:", {
        eventType,
        before,
        after
      });
    }
  }
  function runThemePreviewEvent(eventType) {
    const anchor = getPreviewAnchor();
    const soundContext = {
      answerStreak: Math.max(5, state.answerStreak || 5),
      wordStreak: Math.max(2, state.wordStreak || 2),
      multiplier: Math.max(3, state.multiplier || 3)
    };
    if (eventType === "correct") {
      playThemeSound("correct", soundContext);
      flashScreen(true);
      triggerAnswerBoxAccent("correct", anchor);
      spawnFloat("+100", "correct", anchor);
      spawnThemeParticles("correct", anchor);
      return true;
    }
    if (eventType === "incorrect") {
      playThemeSound("incorrect");
      flashScreen(false);
      triggerAnswerBoxAccent("incorrect", anchor);
      spawnFloat("WRONG", "incorrect", anchor);
      spawnThemeParticles("incorrect", anchor);
      return true;
    }
    if (eventType === "combo") {
      playThemeSound("multiplierUp", soundContext);
      showBanner("mm-mult-banner", "3x COMBO!");
      triggerAnswerBoxAccent("multiplierUp", anchor);
      spawnFloat("MULT x3", "correct", anchor);
      spawnThemeParticles("multiplierUp", anchor);
      spawnCelebrationBurst("multiplierUp", anchor);
      return true;
    }
    if (eventType === "milestone") {
      playThemeSound("multiplierUp", soundContext);
      showBanner("mm-milestone-banner", "UNSTOPPABLE!");
      triggerAnswerBoxAccent("milestone", anchor);
      spawnFloat("UNSTOPPABLE!", "milestone", anchor);
      spawnThemeParticles("milestone", anchor);
      spawnCelebrationBurst("milestone", anchor);
      return true;
    }
    if (eventType === "timeout") {
      playThemeSound("timeout");
      flashScreen(false);
      triggerAnswerBoxAccent("timeout", anchor);
      spawnFloat("TIME UP", "incorrect", anchor);
      spawnThemeParticles("timeout", anchor);
      return true;
    }
    if (eventType === "wordComplete") {
      playThemeSound("wordComplete", soundContext);
      triggerAnswerBoxAccent("wordComplete", anchor);
      spawnFloat("WORD CLEAR!", "wordwin", anchor);
      spawnThemeParticles("wordComplete", anchor);
      spawnCelebrationBurst("wordComplete", anchor);
      return true;
    }
    if (eventType === "sessionComplete") {
      playThemeSound("sessionComplete");
      showBanner("mm-milestone-banner", "SESSION COMPLETE");
      spawnThemeParticles("sessionComplete", anchor);
      spawnCelebrationBurst("sessionComplete", anchor);
      return true;
    }
    return false;
  }
  function previewOneThemeEvent(eventType) {
    const before = getPreviewStateInvariant();
    const didPreview = runThemePreviewEvent(eventType);
    if (didPreview) warnIfPreviewChangedState(before, eventType);
    return didPreview;
  }
  function previewAllThemeEvents() {
    if (previewAllTimer) {
      clearTimeout(previewAllTimer);
      previewAllTimer = null;
    }
    let index = 0;
    const runNext = () => {
      const eventType = THEME_PREVIEW_EVENTS[index];
      if (!eventType) {
        previewAllTimer = null;
        return;
      }
      previewOneThemeEvent(eventType);
      index++;
      if (index >= THEME_PREVIEW_EVENTS.length) {
        previewAllTimer = null;
        return;
      }
      previewAllTimer = setTimeout(runNext, THEME_PREVIEW_DELAY_MS);
    };
    runNext();
  }
  function previewThemeEvent(eventType) {
    if (eventType === "all") {
      previewAllThemeEvents();
      return;
    }
    previewOneThemeEvent(eventType);
  }
  var {
    restart: restartArcadeBackdrop,
    triggerShootingStar,
    syncCrtEffects,
    off: arcadeOff,
    sync: syncArcadePresentation
  } = createCanvasBackgroundController({
    document,
    window,
    settings,
    themeManager: ThemeManager,
    crtController,
    isLiteMode,
    isMaxMode,
    prefersReducedMotion,
    isAnswerResolved
  });
  function getInputWrapper() {
    return marumoriDom.getInputWrapper();
  }
  function getCounterElement() {
    return marumoriDom.getCounterElement();
  }
  function getFontChallengeTarget() {
    return marumoriDom.getQuestionPrompt();
  }
  function applyFontChallenge() {
    fontChallengeController.setEnabled(settings.fontChallengeEnabled);
    if (settings.fontChallengeEnabled) fontChallengeController.reconcile();
  }
  function clearFontChallenge() {
    fontChallengeController.disable();
  }
  function handleCorrect() {
    firstInputGate.markStarted();
    removeFirstAnswerInputGate();
    setRewindSnapshot(makeRewindSnapshot("correct"));
    const timedXp = getTimedXpAward();
    state.sessionCorrect++;
    state.answerStreak++;
    if (state.answerStreak > state.bestStreak) state.bestStreak = state.answerStreak;
    const prevMult = state.multiplier;
    const newMult = calcMultiplier(state.answerStreak);
    state.multiplier = newMult;
    if (newMult > state.bestMultiplier) state.bestMultiplier = newMult;
    const pts = calcAnswerPoints2(newMult, timedXp.multiplier);
    state.score += pts;
    stopAnswerTimer();
    if (newMult > prevMult) {
      showBanner("mm-mult-banner", `${newMult}x COMBO!`);
      playMultiplierUpSound(newMult);
      spawnThemeParticles("multiplierUp", getInputWrapper());
      spawnCelebrationBurst("multiplierUp", getInputWrapper());
    }
    const milestone = MILESTONES[state.answerStreak];
    if (milestone) {
      showBanner("mm-milestone-banner", milestone);
      spawnFloat(milestone, "milestone", getInputWrapper());
      spawnThemeParticles("milestone", getInputWrapper());
      spawnCelebrationBurst("milestone", getInputWrapper());
    }
    updateHUD();
    const feedback = [`+${pts} XP`];
    if (timedXp.eligible && timedXp.multiplier > 1) {
      feedback.push(`${timedXp.tier.label.toUpperCase()} x${timedXp.multiplier.toFixed(2)}`);
    }
    if (newMult > prevMult) feedback.push(`MULT x${newMult}`);
    showHudMicro(feedback.join(" · "), newMult > prevMult ? "mult" : "score");
    playCorrectSound();
    flashScreen(true);
    triggerAnswerBoxAccent("correct");
    const floatText = timedXp.eligible && timedXp.multiplier > 1 ? `+${pts} · ${timedXp.tier.label}! XP x${timedXp.multiplier.toFixed(2)}` : `+${pts}`;
    spawnFloat(floatText, "correct", getInputWrapper());
    spawnThemeParticles("correct", getInputWrapper());
    pulseElement(els.hud);
    if (state.answerStreak % 10 === 0) shakeScreen(true);
  }
  function handleIncorrect({ preserveTimerOwnership = false } = {}) {
    firstInputGate.markStarted();
    removeFirstAnswerInputGate();
    setRewindSnapshot(makeRewindSnapshot("incorrect"));
    state.sessionIncorrect++;
    const lostStreak = state.answerStreak;
    state.answerStreak = 0;
    state.multiplier = 1;
    const penalty = calcIncorrectPenalty(state.score, lostStreak);
    state.score = Math.max(0, state.score - penalty);
    stopAnswerTimer({ preserveOwnership: preserveTimerOwnership });
    updateHUD();
    if (lostStreak > 0) showHudMicro("COMBO RESET", "fail");
    playFailSound();
    scheduleFailureFlash();
    triggerAnswerBoxAccent("incorrect");
    shakeScreen(lostStreak > 4);
    const anchor = getInputWrapper();
    spawnFloat("WRONG", "incorrect", anchor);
    if (lostStreak >= 5) spawnFloat(`-${lostStreak} COMBO LOST`, "incorrect", anchor);
    if (penalty > 0) spawnFloat(`-${penalty}`, "incorrect", anchor);
    spawnThemeParticles(lostStreak >= 5 ? "comboBreak" : "incorrect", anchor);
  }
  function handleWordComplete() {
    state.wordStreak++;
    state.sessionWords++;
    updateHUD();
    showHudMicro(`STREAK ${state.wordStreak}`, "streak");
    playWordCompleteSound();
    const counter = getCounterElement();
    const progress = document.querySelector('[role="progressbar"], .progress, .progress-bar');
    if (counter) animateClass(counter, "mm-bounce", 600);
    if (progress) animateClass(progress, "mm-progress-glow", 600);
    spawnFloat("WORD CLEAR!", "wordwin", counter);
    spawnThemeParticles("wordComplete", counter);
    spawnCelebrationBurst("wordComplete", counter);
    if (Math.random() < 0.55 || state.wordStreak % 5 === 0) triggerShootingStar();
  }
  function showSummary() {
    stopMusic(0.6);
    playSessionEndSound();
    const total = state.sessionCorrect + state.sessionIncorrect;
    const acc = total > 0 ? Math.round(state.sessionCorrect / total * 100) : 0;
    const elapsed = Math.round((Date.now() - state.sessionStart) / 1e3);
    const { label: g, color: c } = getGrade(acc, state.score);
    const stat = (label, val, cls) => `<div class="mm-summary-cell">${label}<span class="mm-summary-val ${cls}">${val}</span></div>`;
    const overlay = document.getElementById("mm-summary");
    if (!overlay) return;
    overlay.innerHTML = `
            <div id="mm-summary-inner">
                <h2>SESSION COMPLETE</h2>
                <div id="mm-grade" style="color:${c}">${g}</div>
                <div class="mm-summary-grid">
                    ${stat("SCORE", state.score.toLocaleString(), "gold")}
                    ${stat("ACCURACY", `${acc}%`, "green")}
                    ${stat("CORRECT", state.sessionCorrect, "cyan")}
                    ${stat("INCORRECT", state.sessionIncorrect, "")}
                    ${stat("WORDS DONE", state.sessionWords, "orange")}
                    ${stat("BEST COMBO", `x${state.bestStreak}`, "pink")}
                    ${stat("BEST MULT", `x${state.bestMultiplier}`, "orange")}
                    ${stat("TIME", `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`, "cyan")}
                </div>
                <button id="mm-summary-close">CONTINUE</button>
            </div>`;
    overlay.classList.add("open");
    overlay.querySelector("#mm-summary-close").addEventListener("click", () => overlay.classList.remove("open"));
    spawnThemeParticles("sessionComplete", overlay.querySelector("#mm-summary-inner"));
    spawnCelebrationBurst("sessionComplete", overlay.querySelector("#mm-summary-inner"));
  }
  function processResolvedAnswer(resolution, {
    lifecycleAlreadyResolved = false,
    preserveTimerOwnership = false,
    ownership = lifecycle.captureOwnership(),
    questionIdentity = ownership?.questionId,
    progress = marumoriDom.getProgress()
  } = {}) {
    if (resolution !== DOM_RESOLUTION.CORRECT && resolution !== DOM_RESOLUTION.INCORRECT) {
      return false;
    }
    let processed = false;
    if (lastAnswerState !== resolution) {
      if (!lifecycleAlreadyResolved && !lifecycle.resolve(resolution)) return false;
      lastAnswerState = resolution;
      if (resolution === DOM_RESOLUTION.CORRECT) handleCorrect();
      else handleIncorrect({ preserveTimerOwnership });
      processed = true;
    }
    sessionFinalizationController?.recordResolvedQuestion({
      ownership,
      questionIdentity,
      progress,
      resolution
    });
    return processed;
  }
  function processCounterChange(progress) {
    if (!progress) return;
    const { current } = progress;
    if (current > state.lastCompleted) {
      state.lastCompleted = current;
      handleWordComplete();
      applyFontChallenge();
      refreshAnswerTimerForCurrentQuestion();
    }
  }
  function scheduleSessionRemount() {
    if (sessionRemountPending) return;
    sessionRemountPending = true;
    const sessionGeneration = lifecycle.sessionGeneration;
    queueMicrotask(() => {
      sessionRemountPending = false;
      if (!gamifyActive || !initialized || !isReviewPage()) return;
      if (lifecycle.sessionGeneration !== sessionGeneration) return;
      cleanup();
      init();
    });
  }
  function reconcileReviewDom() {
    if (!initialized) return;
    const questionContext = marumoriDom.readQuestionContext();
    if (!questionContext) return;
    const { root, logicalQuestionIdentity: questionId, progress, resolution } = questionContext;
    if (root !== activeReviewRoot) {
      scheduleSessionRemount();
      return;
    }
    const currentSessionIdentity = marumoriDom.getSessionIdentity();
    if (!activeReviewSessionIdentity && currentSessionIdentity) {
      activeReviewSessionIdentity = currentSessionIdentity;
    }
    const rewindCommitted = rewindController?.reconcile() === true;
    const sessionBoundaryReason = getReviewSessionBoundaryReason({
      activeUrl: activeReviewUrl,
      currentUrl: location.href,
      activeSessionIdentity: activeReviewSessionIdentity,
      currentSessionIdentity,
      lastCompleted: state.lastCompleted,
      currentProgress: progress.current,
      unresolved: lifecycle.sessionState === SESSION_STATES.ACTIVE && resolution === DOM_RESOLUTION.UNRESOLVED,
      rewindPending: rewindController?.isPending === true || rewindCommitted
    });
    if (sessionBoundaryReason) {
      scheduleSessionRemount();
      return;
    }
    if (lifecycle.sessionState === SESSION_STATES.COMPLETED && resolution === DOM_RESOLUTION.UNRESOLVED && !rewindCommitted && rewindController?.isPending !== true) {
      scheduleSessionRemount();
      return;
    }
    if (lifecycle.sessionState === SESSION_STATES.ACTIVE && resolution === DOM_RESOLUTION.UNRESOLVED && questionId === lifecycle.questionId && lastAnswerState && !rewindCommitted && rewindController?.isPending !== true) {
      if (lastAnswerState === DOM_RESOLUTION.INCORRECT) {
        timeoutFailureController?.cancel("question-retried");
        rewindController?.discard();
        lastAnswerState = null;
        lifecycle.beginQuestion(questionId, { force: true });
        updateRewindButton();
        applyFontChallenge();
        refreshAnswerTimerForCurrentQuestion();
      } else {
        scheduleSessionRemount();
        return;
      }
    }
    if (lifecycle.sessionState === SESSION_STATES.ACTIVE && questionId !== lifecycle.questionId) {
      timeoutFailureController?.cancel("question-changed");
      rewindController?.discard();
      lastAnswerState = null;
      lifecycle.beginQuestion(questionId);
      updateRewindButton();
      applyFontChallenge();
      refreshAnswerTimerForCurrentQuestion();
    } else {
      reconcileAnswerTimerDomOwnership();
    }
    timeoutFailureController?.reconcile();
    if (resolution === DOM_RESOLUTION.CORRECT || resolution === DOM_RESOLUTION.INCORRECT) {
      processResolvedAnswer(resolution, {
        ownership: lifecycle.captureOwnership(),
        questionIdentity: questionId,
        progress
      });
    }
    processCounterChange(progress);
    syncArcadePresentation();
  }
  function observeCorrectness() {
    const wrapper = getInputWrapper();
    if (!wrapper || correctnessObserver && correctnessTarget === wrapper) return;
    correctnessObserver?.disconnect();
    correctnessTarget = wrapper;
    correctnessObserver = new MutationObserver(() => {
      reviewReconciler?.request("resolution");
    });
    correctnessObserver.observe(wrapper, { attributes: true, attributeFilter: ["class"] });
  }
  function observeCounter() {
    const counter = getCounterElement();
    if (!counter || counterObserver && counterTarget === counter) return;
    counterObserver?.disconnect();
    counterTarget = counter;
    counterObserver = new MutationObserver(() => {
      reviewReconciler?.request("counter");
    });
    counterObserver.observe(counter, { childList: true, subtree: true, characterData: true });
  }
  function setupReviewControllers() {
    sessionFinalizationController = createSessionFinalizationController({
      lifecycle,
      isCompletionCurrent(completion) {
        return initialized && marumoriDom.getActiveReviewRoot() === activeReviewRoot && marumoriDom.getQuestionIdentity() === completion.logicalQuestionIdentity && marumoriDom.getResolvedState() === completion.resolution;
      },
      onSessionCompleted() {
        state.sessionActive = false;
      },
      onShowSummary: showSummary
    });
    rewindController = createTransactionalRewind({
      lifecycle,
      dom: marumoriDom,
      restoreSnapshot: restoreRewindSnapshot,
      cancelSummary: cancelPendingSummary,
      onCommit(outcome5) {
        sessionFinalizationController?.reopenQuestion(lifecycle.captureOwnership());
        const rewindProgress = outcome5.progress ?? marumoriDom.getProgress();
        if (Number.isFinite(rewindProgress?.current) && rewindProgress.current < state.lastCompleted) {
          state.lastCompleted = rewindProgress.current;
        }
        lastAnswerState = null;
        state.sessionActive = true;
        if (settings.musicEnabled) startMusic();
        applyFontChallenge();
        refreshAnswerTimerForCurrentQuestion(true);
        updateRewindButton();
        reviewReconciler?.request("rewind-committed");
      },
      onFailure(outcome5) {
        updateRewindButton();
        reviewReconciler?.request("rewind-settled");
        if (outcome5.status === "failed") {
          console.warn("[MMGamify] Rewind was not confirmed:", outcome5.reason);
        }
      }
    });
    timeoutFailureController = createTimeoutFailureController({
      lifecycle,
      dom: marumoriDom,
      validateTimerOwnership: (ownership, options) => answerTimerOwnership.validate(ownership, options),
      canAdvance({ ownership, questionIdentity }) {
        return Boolean(
          state.sessionActive && lifecycle.sessionState === SESSION_STATES.ACTIVE && lifecycle.owns(ownership) && !sessionFinalizationController?.isFinalizedQuestion({
            ownership,
            questionIdentity
          })
        );
      },
      onIncorrectConfirmed({ ownership, questionIdentity }) {
        processResolvedAnswer(DOM_RESOLUTION.INCORRECT, {
          lifecycleAlreadyResolved: true,
          preserveTimerOwnership: true,
          ownership,
          questionIdentity,
          progress: marumoriDom.getProgress()
        });
        reviewReconciler?.request("timeout-incorrect");
      },
      onUnresolvedFailure(outcome5) {
        if (outcome5.status === "failed") applyTimeoutPenalty();
      },
      onFailure(outcome5) {
        if (outcome5.status === "failed") {
          console.warn("[MMGamify] Timeout auto-fail stopped:", outcome5.reason);
        }
      },
      onSettled(_outcome, context) {
        const ownership = context?.timerOwnership;
        if (ownership) invalidateAnswerTimerOwnership(ownership);
      }
    });
  }
  function init() {
    const questionContext = marumoriDom.readQuestionContext();
    if (initialized || !questionContext) return;
    const { root, logicalQuestionIdentity: questionId, progress } = questionContext;
    ThemeManager.applyTheme(settings.pinnedBackgroundTheme, { persist: true });
    resetState();
    lifecycle.mount();
    lifecycle.start();
    lifecycle.beginQuestion(questionId, { awaitingFirstInput: true });
    activeReviewRoot = root;
    activeReviewUrl = location.href;
    activeReviewSessionIdentity = marumoriDom.getSessionIdentity();
    setupReviewControllers();
    reviewReconciler = createReconciler(reconcileReviewDom);
    syncPerformanceProfilePresentation();
    injectStyles();
    injectUI();
    state.lastCompleted = progress.current;
    if (!document.getElementById("mm-summary")) {
      document.body.appendChild(createTrustedTemplateElement("div", "mm-summary"));
    }
    initialized = true;
    observeCorrectness();
    observeCounter();
    installNativeRewindDetection();
    installMusicLifecycle();
    updateHUD();
    applyFontChallenge();
    refreshAnswerTimerForCurrentQuestion();
    syncArcadePresentation();
    reviewReconciler.request("init");
  }
  function cleanup() {
    initialized = false;
    if (domSyncRaf) {
      cancelAnimationFrame(domSyncRaf);
      domSyncRaf = null;
    }
    correctnessObserver?.disconnect();
    correctnessObserver = null;
    correctnessTarget = null;
    counterObserver?.disconnect();
    counterObserver = null;
    counterTarget = null;
    reviewReconciler?.dispose();
    reviewReconciler = null;
    timeoutFailureController?.cancel("session-cleanup");
    timeoutFailureController = null;
    rewindController?.discard();
    rewindController = null;
    sessionFinalizationController?.cleanup();
    sessionFinalizationController = null;
    lifecycle.cleanup();
    activeReviewRoot = null;
    activeReviewUrl = null;
    activeReviewSessionIdentity = null;
    uninstallNativeRewindDetection();
    uninstallMusicLifecycle();
    hudController?.cleanup();
    hudController = null;
    settingsPanelController?.cleanup();
    settingsPanelController = null;
    if (previewAllTimer) {
      clearTimeout(previewAllTimer);
      previewAllTimer = null;
    }
    transientEffects.cleanup();
    stopAnswerTimer();
    comboTimerCompositor?.dispose();
    comboTimerCompositor = null;
    removeFirstAnswerInputGate();
    fontChallengeController.cleanup();
    flushRecordsSave();
    flushSettingsSave();
    firstInputGate.cleanup();
    els = {};
    lastAnswerState = null;
    [
      "mm-hud",
      "mm-settings-launcher",
      "mm-flash",
      "mm-mult-banner",
      "mm-milestone-banner",
      "mm-settings",
      "mm-summary",
      "mm-gamify-styles"
    ].forEach((id) => document.getElementById(id)?.remove());
    arcadeOff();
    ThemeManager.clearPresentation();
    document.body.classList.remove(
      "mm-performance-mode",
      "mm-max-mode",
      "mm-shake-light",
      "mm-shake-hard"
    );
  }
  function isReviewPage() {
    try {
      return isReviewPathname(new URL(location.href).pathname);
    } catch {
      return false;
    }
  }
  function syncGamifyDom() {
    domSyncRaf = null;
    if (!gamifyActive) return;
    const has = Boolean(getInputWrapper());
    if (has && !initialized) init();
    if (has && initialized) {
      observeCorrectness();
      observeCounter();
      reviewReconciler?.request("dom-sync");
      if (!firstInputGate.hasStarted && firstInputGate.input !== getAnswerInput()) {
        armFirstAnswerTimer();
      }
      if (settings.fontChallengeEnabled) applyFontChallenge();
    }
  }
  function scheduleGamifyDomSync() {
    if (!gamifyActive || domSyncRaf || document.hidden) return;
    domSyncRaf = requestAnimationFrame(syncGamifyDom);
  }
  var navigationAdapter = createNavigationAdapter({
    window,
    document,
    history,
    location,
    getObserverRoot: () => marumoriDom.getActiveReviewRoot() || document.body,
    onEnter() {
      gamifyActive = true;
      init();
      scheduleGamifyDomSync();
    },
    onLeave() {
      gamifyActive = false;
      cleanup();
    },
    onReconcile() {
      scheduleGamifyDomSync();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      navigationAdapter.requestReconcile("visibility");
      scheduleGamifyDomSync();
    } else {
      flushRecordsSave();
      flushSettingsSave();
    }
  });
  window.addEventListener("pagehide", () => {
    flushRecordsSave();
    flushSettingsSave();
  });
  navigationAdapter.start();
})();
