(() => {
  "use strict";

  const FLOOR_ORDER = ["B", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"];
  const LONG_PRESS_MS = 2000;
  const READ_MS = 5200;

  const panel = document.getElementById("panel");
  const doorway = document.getElementById("doorway");
  const indicator = document.getElementById("indicator");
  const floorDisplay = document.getElementById("floorDisplay");
  const upArrow = document.getElementById("upArrow");
  const downArrow = document.getElementById("downArrow");
  const statusText = document.getElementById("statusText");
  const caption = document.getElementById("caption");
  const floorLabel = document.getElementById("floorLabel");
  const sceneArt = document.getElementById("sceneArt");
  const secretBtn = document.getElementById("secretBtn");
  const muteBtn = document.getElementById("muteBtn");

  let state = "idle";
  let currentFloor = "1";
  let selectedButton = null;
  let muted = false;
  let audioCtx = null;
  let longPressTimer = null;
  let suppressNext12Click = false;
  let readTimer = null;
  const bags = new Map();
  const lastShown = new Map();

  const vignettes = {
    B: [
      "Boxes labeled MISC stretch back farther than the building's footprint should allow. One box is carefully labeled MISC (SPECIFIC).",
      "A bicycle rack holds three umbrellas and no bicycles. The umbrellas are chained up very securely.",
      "The maintenance office has a sign-in sheet for yesterday. Every line is filled out in the same handwriting."
    ],
    1: [
      "The lobby directory lists every tenant by first name only. Somehow it feels less friendly that way.",
      "A potted plant beside the security desk has a visitor badge clipped to its leaves. It is authorized until Friday.",
      "The front desk bell rings once before anyone touches it. The guard writes down the time and nods."
    ],
    2: [
      "A conference room is set for a meeting of two people. There are seventeen water glasses.",
      "Someone has drawn a very careful evacuation map for a hallway that is perfectly straight.",
      "A copier hums with the confidence of a machine that has never been asked a question it liked."
    ],
    3: [
      "The break room microwave contains a mug of tea rotating slowly, though the timer says 00:00 and always has.",
      "Three birthday cards sit unsigned on the counter. None of the names belong to anyone in the building.",
      "A vending machine displays only the spiral coils. The snacks are implied."
    ],
    4: [
      "A single desk fan oscillates toward a row of empty chairs. Each chair leans back politely when the breeze arrives.",
      "The carpet has worn a path from one locked door to another locked door. No one seems proud of this achievement.",
      "A framed award congratulates the department for 'adequate completion.' The plaque has been polished recently."
    ],
    5: [
      "A receptionist asks you to take a number, then hands you a letter. It is Q, lowercase.",
      "The hallway smells faintly of toner and pancakes. Both explanations would be troubling for different reasons.",
      "Every office nameplate has been turned upside down except one, which reads 'temporary permanent.'"
    ],
    6: [
      "A wall clock has twelve hands and no numbers. Everyone walking past checks it and seems reassured.",
      "The mail cart is full of envelopes addressed to departments that were merged years ago. The cart is patient.",
      "A training video plays silently on a rolling television. The presenter keeps pointing behind you."
    ],
    7: [
      "Someone has reserved the copy room from 2:00 to 2:05 every day forever. The calendar accepts this.",
      "A tray of sandwiches waits under a plastic dome. The labels describe emotions instead of fillings.",
      "The office plants have been arranged in a semicircle around one stapler. It may be a performance review."
    ],
    8: [
      "The hallway lights turn on one panel ahead of you and off one panel behind you, like a building trying to conserve embarrassment.",
      "A bulletin board announces Casual Thursday. The notice is laminated and dated nine years from now.",
      "A printer outputs a single blank page. Someone has written 'received' on it in red pen."
    ],
    9: [
      "Someone has taped a sign to the water cooler that just says THANK YOU. There is no context. The water cooler seems pleased.",
      "A row of identical gray doors each has a different doormat. One says WELCOME BACK in your size.",
      "The kitchenette drawer contains forks, spoons, and one perfectly ordinary house key with a tiny spoon tag."
    ],
    10: [
      "A training mannequin sits at a desk wearing an employee-of-the-month ribbon. Nobody meets its eyes.",
      "The windows show a parking lot from a building across the street. In that lot, this elevator is waiting.",
      "A whiteboard lists action items, all checked off except 'remember why.' That box has been circled twice."
    ],
    11: [
      "A hallway sign points left for Accounting and right for Apologies. The arrows have been swapped often enough to leave marks.",
      "The carpet changes pattern halfway down the corridor, then appears to regret it and changes back.",
      "A door is propped open by a binder titled Door Prop Policies. The binder looks exhausted."
    ],
    12: [
      "The executive suite has a waiting area with no chairs, only small tables where chairs clearly used to wait.",
      "A fish tank bubbles behind reception. There are no fish, but each bubble rises in alphabetical order.",
      "A motivational poster reads REACH HIGHER, then includes a handwritten note: 'not too high.'"
    ]
  };

  const floor13 = {
    text: "The doors open on a waiting room arranged for a meeting that already ended. There are thirteen chairs, twelve little paper cups of water, and one name tag printed with the elevator's current floor. The fluorescent lights blink in the rhythm of someone deciding not to say anything.",
    art: "13"
  };

  function floorIndex(floor) {
    return FLOOR_ORDER.indexOf(String(floor));
  }

  function fisherYates(values) {
    const a = values.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function refillBag(floor) {
    const pool = vignettes[floor];
    let shuffled = fisherYates(pool.map((_, i) => i));
    const last = lastShown.get(floor);
    if (last !== undefined && shuffled[shuffled.length - 1] === last && shuffled.length > 1) {
      const swapIdx = Math.floor(Math.random() * (shuffled.length - 1));
      [shuffled[shuffled.length - 1], shuffled[swapIdx]] = [shuffled[swapIdx], shuffled[shuffled.length - 1]];
    }
    bags.set(floor, shuffled);
  }

  function nextVignette(floor) {
    if (!bags.get(floor)?.length) refillBag(floor);
    const bag = bags.get(floor);
    const idx = bag.pop();
    lastShown.set(floor, idx);
    return vignettes[floor][idx];
  }

  function makeArt(floor) {
    const n = floor === "B" ? 0 : Number(floor);
    const extra = floor === "13" ? "<path d='M35 74 C65 38, 105 106, 135 62' fill='none' stroke='currentColor' stroke-width='3' stroke-dasharray='5 8'/><circle cx='88' cy='70' r='9' fill='currentColor' opacity='.24'/>" : "";
    const windows = Array.from({ length: 4 }, (_, i) => {
      const x = 34 + i * 28;
      const lit = (n + i) % 2 === 0 ? ".26" : ".08";
      return `<rect x='${x}' y='37' width='12' height='18' rx='1.5' fill='currentColor' opacity='${lit}'/>`;
    }).join("");
    const label = floor === "B" ? "B" : String(floor);
    return `<svg viewBox='0 0 180 120' role='img' aria-label='simple line drawing of floor ${label}'><rect x='20' y='28' width='140' height='68' rx='4' fill='none' stroke='currentColor' stroke-width='3'/><path d='M20 56 H160 M56 28 V96 M124 28 V96' stroke='currentColor' stroke-width='2' opacity='.45'/>${windows}<text x='90' y='82' text-anchor='middle' font-family='Courier New, monospace' font-weight='800' font-size='34' fill='currentColor' opacity='.72'>${label}</text>${extra}</svg>`;
  }

  function setStatus(text) {
    statusText.textContent = text;
  }

  function setActiveButton(floor) {
    if (selectedButton) selectedButton.classList.remove("active");
    selectedButton = document.querySelector(`.floor-btn[data-floor='${floor}']`);
    if (selectedButton) selectedButton.classList.add("active");
  }

  function clearActiveButton() {
    if (selectedButton) selectedButton.classList.remove("active");
    selectedButton = null;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function ensureAudio() {
    if (muted) return null;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      return audioCtx;
    } catch (e) {
      return null;
    }
  }

  function playDing(kind = "normal") {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(kind === "wrong" ? 0.16 : 0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    const tones = kind === "wrong" ? [146.8, 138.4] : [880, 1174.66];
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = kind === "wrong" ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      osc.detune.setValueAtTime(kind === "wrong" ? -18 + i * 9 : 0, now + i * 0.12);
      osc.connect(gain);
      osc.start(now + i * 0.12);
      osc.stop(now + 0.5);
    });
  }

  function travelDuration(target) {
    if (target === "13") return 3600;
    return Math.min(2500, 700 + 150 * Math.abs(floorIndex(target) - floorIndex(currentFloor)));
  }

  async function tickFloors(target) {
    const start = floorIndex(currentFloor);
    const end = floorIndex(target);
    const direction = Math.sign(end - start) || 1;
    const steps = Math.max(1, Math.abs(end - start));
    const duration = travelDuration(target);
    const perStep = Math.max(120, duration / steps);
    upArrow.classList.toggle("lit", direction > 0);
    downArrow.classList.toggle("lit", direction < 0);

    if (target === "13") {
      const sequence = ["2", "4", "7", "10", "12", "--", "??", "░░", "␀", "13"];
      indicator.classList.add("glitch");
      for (const value of sequence) {
        floorDisplay.textContent = value;
        await sleep(value === "12" ? 520 : 260);
      }
      indicator.classList.remove("glitch");
      return;
    }

    for (let i = start; i !== end; i += direction) {
      await sleep(perStep);
      floorDisplay.textContent = FLOOR_ORDER[i + direction];
    }
  }

  function showScene(floor) {
    const is13 = floor === "13";
    floorLabel.textContent = is13 ? "Floor 13" : floor === "B" ? "Basement" : `Floor ${floor}`;
    caption.textContent = is13 ? floor13.text : nextVignette(floor);
    sceneArt.innerHTML = makeArt(floor);
  }

  function closeAfterReading() {
    window.clearTimeout(readTimer);
    readTimer = window.setTimeout(() => finishReading(), READ_MS);
  }

  function finishReading() {
    if (state !== "reading") return;
    state = "closing-auto";
    window.clearTimeout(readTimer);
    setStatus("Doors closing.");
    doorway.classList.remove("open");
    setTimeout(() => {
      clearActiveButton();
      state = "idle";
      if (!secretBtn.hidden) secretBtn.hidden = true;
      setStatus("Doors closed. Choose a floor.");
    }, 600);
  }

  async function rideTo(floor) {
    if (state !== "idle") return;
    const target = String(floor);
    state = "closing";
    setActiveButton(target);
    setStatus("Doors closing.");
    doorway.classList.remove("open");
    doorway.classList.add("shudder");
    await sleep(560);
    doorway.classList.remove("shudder");

    state = "transit";
    setStatus(target === "13" ? "The car is reconsidering the route." : `Traveling to ${target === "B" ? "basement" : `floor ${target}`}.`);
    await tickFloors(target);
    currentFloor = target;
    floorDisplay.textContent = target;
    upArrow.classList.remove("lit");
    downArrow.classList.remove("lit");
    playDing(target === "13" ? "wrong" : "normal");

    state = "opening";
    showScene(target);
    setStatus("Doors opening.");
    doorway.classList.add("open");
    await sleep(620);

    state = "reading";
    setStatus(target === "13" ? "This floor is not in the brochure." : "Please observe the floor briefly.");
    closeAfterReading();
  }

  function reveal13() {
    if (state !== "idle" || !secretBtn.hidden) return;
    suppressNext12Click = true;
    panel.classList.add("flicker");
    setTimeout(() => panel.classList.remove("flicker"), 820);
    setTimeout(() => {
      secretBtn.hidden = false;
      setStatus("A button has become available. That seems incorrect.");
    }, 430);
  }

  function cancelLongPress() {
    window.clearTimeout(longPressTimer);
    longPressTimer = null;
    const btn12 = document.querySelector(".floor-btn[data-floor='12']");
    btn12?.classList.remove("holding");
  }

  document.querySelectorAll(".floor-btn").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.floor === "12" && suppressNext12Click) {
        suppressNext12Click = false;
        return;
      }
      rideTo(button.dataset.floor);
    });
    if (button.dataset.floor === "12") {
      button.addEventListener("pointerdown", () => {
        if (state !== "idle") return;
        button.classList.add("holding");
        longPressTimer = window.setTimeout(() => {
          cancelLongPress();
          reveal13();
        }, LONG_PRESS_MS);
      });
      ["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => {
        button.addEventListener(eventName, cancelLongPress);
      });
    }
  });

  document.querySelectorAll(".service-btn").forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.remove("flash");
      void button.offsetWidth;
      button.classList.add("flash");
      setStatus("That button acknowledges your concern without acting on it.");
      setTimeout(() => {
        if (state === "idle") setStatus("Doors closed. Choose a floor.");
      }, 1500);
    });
  });

  doorway.addEventListener("click", () => {
    if (state === "reading") finishReading();
  });

  muteBtn.addEventListener("click", () => {
    muted = !muted;
    muteBtn.textContent = muted ? "Sound off" : "Sound on";
    muteBtn.setAttribute("aria-pressed", String(muted));
  });
})();
