(() => {
  "use strict";

  const COMPLIMENTS = [
    "You have never once put the wrong lid on a container. Not once.",
    "Somewhere, a plant you forgot to water is thriving out of sheer respect for you.",
    "You once made a stranger laugh and you'll never know about it. It happened.",
    "Your walking pace is exactly correct and everyone behind you agrees.",
    "You are the reason someone's playlist has one really good song in it.",
    "You have excellent posture for someone who is definitely slouching right now.",
    "The way you organize your junk drawer is, weirdly, a form of art.",
    "You have never lost a staring contest with a Roomba. This is documented.",
    "Your handwriting on grocery lists is more legible than most legal documents.",
    "You are extremely good at pretending you remember someone's name.",
    "You have a talent for finding the one good parking spot. Every time.",
    "Somewhere a vending machine gave you the good snack on the first try because it knew.",
    "You once returned a shopping cart from very far away and a stranger clapped internally.",
    "Your left eyebrow has more range of expression than most sitcom actors.",
    "You know exactly how many seconds a microwave burrito needs. This is a rare gift.",
    "You have never once mispronounced 'quinoa' in front of someone you were trying to impress. Impossible, but true.",
    "The way you fold fitted sheets is a mystery to scientists and an inspiration to us all.",
    "You are the calm one in group chats and everyone silently thanks you for it.",
    "Your search history is a national treasure disguised as chaos.",
    "You've never once eaten the last slice without at least performative guilt.",
    "You remember which mug is 'yours' at every house you've ever visited. Loyalty.",
    "You are unreasonably good at guessing the weight of things by holding them.",
    "Your one weird party trick is actually kind of impressive and you should do it more.",
    "You have never lost a game of rock-paper-scissors that truly mattered.",
    "You always know which grocery line will move faster. This is a form of wisdom.",
    "You've said 'you too' back to a waiter who told you to enjoy your meal, and the universe forgave you instantly.",
    "You have the rare ability to nap for exactly the right amount of time.",
    "Your Wi-Fi password makes strangers smile when you tell it to them.",
    "You've never once forgotten to laugh at a joke, even the bad ones. Especially the bad ones.",
    "You are disproportionately good at opening stubborn jars for people who ask.",
    "You have impeccable timing for arriving right as the kettle finishes.",
    "Your instinct for which way a door opens is correct 71% more often than average.",
    "You once gave someone directions and they actually worked. This is rarer than you think.",
    "You have never regifted something and been caught. A perfect record.",
    "You are the person who remembers to bring the good snacks. Every group has one. It's you.",
    "Your ability to sense when leftovers have gone bad without opening the container is unmatched.",
    "You've never once said 'talk to you soon' and not meant it, at least a little.",
    "You have a gift for finding the remote control that no one else could find.",
    "Your car playlist reveals a rich and complicated inner life that deserves recognition.",
    "You know exactly how hard to knock on a door. Too soft is timid, too hard is alarming. You nail it.",
    "You've mastered the art of the polite exit from a conversation you didn't want to be in.",
    "You are inexplicably good at telling if a melon is ripe. Nobody taught you this. You just know.",
    "Your ability to parallel park has been quietly admired by at least one onlooker this year.",
    "You have never once put a fork in the dishwasher tines-up when it mattered.",
    "You've correctly predicted the ending of a movie and let everyone else feel smart anyway.",
    "You always know which drawer the tape is in, in a house that is not yours.",
    "Your capacity to small-talk with a dog like it fully understands you is admirable.",
    "You've never once double-booked yourself without gracefully fixing it.",
    "You have a talent for finding the comfortable spot on any couch within four seconds.",
    "Your ability to sense rain twenty minutes before it starts should be studied.",
    "You once let a bee land on you and didn't panic. Or you did panic, quietly, with dignity.",
    "You are the person your friends text when they need someone to just say 'that makes sense.'",
    "You've never once mixed up 'affect' and 'effect' in a way anyone actually noticed.",
    "Your instinct for exactly how long to microwave leftover rice is a form of quiet mastery.",
    "You have successfully faked confidence in at least one job interview, and it worked.",
  ];

  const STORAGE_KEY = "emergency-compliment-bag-v1";

  const caseEl = document.getElementById("case");
  const glassBtn = document.getElementById("glassBtn");
  const resetBtn = document.getElementById("resetBtn");
  const muteBtn = document.getElementById("muteBtn");
  const lightEl = document.getElementById("light");
  const textEl = document.getElementById("complimentText");

  let state = "intact"; // "intact" | "broken"
  let muted = false;
  let bag = []; // shuffled queue, pop from the end
  let lastShown = null;

  function fisherYates(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function refillBag() {
    let shuffled = fisherYates(COMPLIMENTS);
    // avoid back-to-back repeat across a reshuffle boundary
    if (lastShown !== null && shuffled[shuffled.length - 1] === lastShown && shuffled.length > 1) {
      const swapIdx = Math.floor(Math.random() * (shuffled.length - 1));
      const tmp = shuffled[shuffled.length - 1];
      shuffled[shuffled.length - 1] = shuffled[swapIdx];
      shuffled[swapIdx] = tmp;
    }
    bag = shuffled;
  }

  function nextCompliment() {
    if (bag.length === 0) refillBag();
    const pick = bag.pop();
    lastShown = pick;
    persistBag();
    return pick;
  }

  function persistBag() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ bag, lastShown }));
    } catch (e) {
      /* localStorage unavailable — fine, just no persistence */
    }
  }

  function restoreBag() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.bag)) {
        bag = parsed.bag.filter((c) => COMPLIMENTS.includes(c));
        lastShown = parsed.lastShown || null;
      }
    } catch (e) {
      /* ignore malformed storage */
    }
  }

  // --- Sound: a single short synthesized "crack" via Web Audio, no files ---
  let audioCtx = null;
  function playCrack() {
    if (muted) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;

      const noise = audioCtx.createBufferSource();
      const bufferSize = audioCtx.sampleRate * 0.18;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 1200;

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start(now);
      noise.stop(now + 0.2);
    } catch (e) {
      /* Web Audio unavailable — silently skip */
    }
  }

  function breakGlass() {
    if (state !== "intact") return;
    state = "broken";
    textEl.textContent = nextCompliment();
    caseEl.classList.add("broken");
    caseEl.classList.add("swing");
    lightEl.classList.remove("flash");
    // restart the flash animation reliably
    void lightEl.offsetWidth;
    lightEl.classList.add("flash");
    playCrack();
    glassBtn.setAttribute("aria-disabled", "true");
    glassBtn.disabled = true;
    resetBtn.hidden = false;
    setTimeout(() => caseEl.classList.remove("swing"), 550);
  }

  function resetCase() {
    if (state !== "broken") return;
    state = "intact";
    caseEl.classList.remove("broken");
    glassBtn.disabled = false;
    glassBtn.removeAttribute("aria-disabled");
    resetBtn.hidden = true;
  }

  function toggleMute() {
    muted = !muted;
    muteBtn.setAttribute("aria-pressed", String(muted));
    muteBtn.textContent = muted ? "\uD83D\uDD07 Sound off" : "\uD83D\uDD08 Sound on";
  }

  glassBtn.addEventListener("click", breakGlass);
  resetBtn.addEventListener("click", resetCase);
  muteBtn.addEventListener("click", toggleMute);

  restoreBag();
})();
