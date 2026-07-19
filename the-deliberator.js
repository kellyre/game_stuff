(() => {
  const button = document.getElementById('deliberateBtn');
  const dilemma = document.getElementById('dilemma');
  const log = document.getElementById('log');
  const receipt = document.getElementById('receipt');
  const decisionText = document.getElementById('decisionText');
  const muteBtn = document.getElementById('muteBtn');
  const consoleEl = document.getElementById('console');
  const needles = [
    document.getElementById('needle-confidence'),
    document.getElementById('needle-regret'),
    document.getElementById('needle-commitment')
  ];

  const logLines = [
    'Quantifying the size of the moment.',
    'Convening a temporary subcommittee.',
    'Subcommittee has requested chairs.',
    'Consulting the archive of almosts.',
    'Comparing apples to legal pads.',
    'Assigning blame in advance.',
    'Running a gut check. Gut declines to comment.',
    'Escalating to a committee of one.',
    'Committee of one has adjourned to think about it.',
    'Cross-referencing regret database.',
    'Dusting off the obvious answer.',
    'Finding the obvious answer too obvious.',
    'Reticulating consequences.',
    'Reticulating consequences again, but slower.',
    'Overruled.',
    'Un-overruled.',
    'Interviewing a hunch in Conference Room B.',
    'Hunch brought no identification.',
    'Weighing pros against unrelated cons.',
    'Preparing a decisive throat-clearing.',
    'Reclassifying hesitation as research.',
    'Checking whether this is one of those times.',
    'It might be one of those times.',
    'Temporarily admiring the problem.',
    'Measuring ambient certainty leakage.',
    'Calibrating tiny institutional eyebrows.',
    'Polling the available silences.',
    'Filing a motion to get on with it.',
    'Motion seconded by no one in particular.',
    'Auditing the snack implications.',
    'Notifying future you by certified shrug.',
    'Reviewing Appendix Maybe.',
    'Appendix Maybe is mostly margins.',
    'Locating the moral high ground.',
    'Moral high ground is currently rented out.',
    'Applying a thin coat of procedure.',
    'Testing the emergency seriousness lamp.',
    'Lamp reports normal seriousness.',
    'Removing a duplicate concern.',
    'Adding the concern back for balance.',
    'Reconsidering line 14.',
    'Striking previous entry without reading it.',
    'Backtracking with professional confidence.',
    'Asking the machine inside this machine.',
    'Machine inside this machine says: busy.'
  ];

  const stuckLines = [
    'Reopening the file marked absolutely final.',
    'Reconsidering line 14.',
    'Striking previous entry without reading it.',
    'Backtracking with professional confidence.',
    'Requesting an extension from the present moment.',
    'Extension denied. Appealing denial.',
    'Appeal upheld by the same button.'
  ];

  const decisions = [
    'DECISION: You will eat the sandwich. Bite order remains discretionary.',
    'DECISION: Reply now. Emoji optional but administratively encouraged.',
    'DECISION: The left sock goes on first. This is binding until laundry day.',
    'DECISION: Water the plant. It has noticed you noticing it.',
    'DECISION: Take the stairs. The elevator has seen enough of you today.',
    'DECISION: Use the small spoon. The large spoon is being dramatic.',
    'DECISION: Put the mug in the sink, not near the sink. This distinction matters.',
    'DECISION: Open the window for three minutes and call it a system reset.',
    'DECISION: Send the shorter message. The longer one has formed a committee.',
    'DECISION: Wear the comfortable shoes. Mystery is not arch support.',
    'DECISION: The leftovers are still lunch. No hearing required.',
    'DECISION: Buy the bananas, but only the slightly green ones.',
    'DECISION: The tab may be closed. It has served with adequate distinction.',
    'DECISION: Move the chair six inches and pretend it was strategy.',
    'DECISION: Do the errand clockwise. Counterclockwise has filed a complaint.',
    'DECISION: You may nap, provided you call it a horizontal briefing.',
    'DECISION: Choose the blue pen. The black pen knows what it did.',
    'DECISION: Make tea. Coffee has already had a turn.',
    'DECISION: The towel goes on the hook. The floor is not a hook.',
    'DECISION: Start with the easy part and look surprised when that helps.',
    'DECISION: Delete the draft sentence. It was mostly furniture.',
    'DECISION: Park farther away. Your legs requested a cameo.',
    'DECISION: The laundry can wait exactly one podcast episode.',
    'DECISION: Use the good bowl for cereal. Ceremony begins at breakfast.',
    'DECISION: Turn the lamp on. Ambience has entered evidence.',
    'DECISION: Add the comma. It has been standing there patiently.',
    'DECISION: Do not buy another notebook until one notebook becomes paper.',
    'DECISION: The first playlist is acceptable. Stop interviewing music.',
    'DECISION: Put the keys in the same place as yesterday, radically.',
    'DECISION: Toast it. Untoasted bread lacks authorization.',
    'DECISION: Take the scenic route if it is under seven extra minutes.',
    'DECISION: Fold the blanket. The couch deserves closure.',
    'DECISION: Ask for the box. Leftovers are future treasure.',
    'DECISION: Change the batteries. The remote is not being philosophical.',
    'DECISION: The meeting can be an email if the email is brave.',
    'DECISION: Put on the sweater. Pride is a poor thermostat.',
    'DECISION: Save the file with a boring name. Future you loves boring names.',
    'DECISION: Sharpen the pencil. It wants to feel useful again.',
    'DECISION: Leave five minutes earlier and spend them being smug.',
    'DECISION: The tiny chore is first. It is tiny and knows secrets.',
    'DECISION: Sit somewhere else. The room needs a plot twist.',
    'DECISION: Rinse the jar. This is how civilizations continue.'
  ];

  let state = 'idle';
  let muted = false;
  let lastLog = '';
  let bag = shuffle(decisions.slice());
  let lastDecision = '';
  let audioCtx = null;
  let jitterTimer = null;
  let logTimer = null;
  let tickTimer = null;

  function shuffle(items) {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  function nextDecision() {
    if (Math.random() < 0.05) {
      lastDecision = 'DECISION: Deferred. Please try again never.';
      return lastDecision;
    }
    if (!bag.length) {
      bag = shuffle(decisions.slice());
      if (bag[bag.length - 1] === lastDecision && bag.length > 1) {
        const swapIndex = Math.floor(Math.random() * (bag.length - 1));
        [bag[bag.length - 1], bag[swapIndex]] = [bag[swapIndex], bag[bag.length - 1]];
      }
    }
    lastDecision = bag.pop();
    return lastDecision;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function setNeedles(resting = false) {
    needles.forEach((needle, index) => {
      const base = resting ? [-34, 12, -8][index] : rand(-58, 58);
      const wobble = resting ? rand(-4, 4) : rand(-9, 9);
      needle.style.setProperty('--angle', `${base + wobble}deg`);
    });
  }

  function appendLog(line) {
    const p = document.createElement('p');
    p.textContent = line;
    log.appendChild(p);
    while (log.children.length > 8) log.removeChild(log.firstElementChild);
    log.scrollTop = log.scrollHeight;
  }

  function pickLogLine(pool = logLines) {
    let line = pool[Math.floor(Math.random() * pool.length)];
    if (line === lastLog && pool.length > 1) {
      line = pool[Math.floor(Math.random() * pool.length)];
    }
    lastLog = line;
    return line;
  }

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function tone(frequency, duration, type = 'square', volume = 0.045) {
    if (muted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  function clickSound() {
    tone(92, 0.045, 'square', 0.06);
    setTimeout(() => tone(58, 0.055, 'triangle', 0.05), 42);
  }

  function printSound() {
    tone(72, 0.08, 'sawtooth', 0.055);
    setTimeout(() => tone(120, 0.04, 'square', 0.04), 95);
    setTimeout(() => tone(84, 0.07, 'triangle', 0.045), 155);
  }

  function startTicks() {
    if (muted) return;
    tickTimer = window.setInterval(() => {
      tone(rand(180, 230), 0.018, 'square', 0.018);
    }, 720);
  }

  function stopTimers() {
    [jitterTimer, logTimer, tickTimer].forEach(timer => {
      if (timer) window.clearInterval(timer);
    });
    jitterTimer = null;
    logTimer = null;
    tickTimer = null;
  }

  function deliberate() {
    if (state !== 'idle') return;
    state = 'deliberating';
    const stuck = Math.random() < (1 / 17);
    const duration = stuck ? Math.floor(rand(18000, 25000)) : Math.floor(rand(6000, 11000));
    receipt.classList.remove('printed');
    decisionText.textContent = 'DECISION: Pending.';
    log.replaceChildren();
    appendLog('Button event accepted. Please stand by with dignity.');
    button.disabled = true;
    dilemma.disabled = true;
    button.classList.add('pressed');
    consoleEl.classList.add('thinking');
    document.body.classList.add('thinking');
    button.textContent = 'Deliberating';
    clickSound();
    setTimeout(() => button.classList.remove('pressed'), 180);

    jitterTimer = window.setInterval(() => setNeedles(false), Math.floor(rand(300, 500)));
    const started = Date.now();
    logTimer = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const useStuckPool = stuck && elapsed > duration * 0.42 && Math.random() < 0.45;
      appendLog(pickLogLine(useStuckPool ? stuckLines : logLines));
    }, Math.floor(rand(620, 1080)));
    startTicks();

    window.setTimeout(() => {
      state = 'printing';
      stopTimers();
      appendLog(stuck ? 'A conclusion has survived appeal.' : 'Decision pressure has reached printable levels.');
      setNeedles(true);
      printSound();
      button.textContent = 'Printing';
      window.setTimeout(() => {
        decisionText.textContent = nextDecision();
        receipt.classList.add('printed');
        consoleEl.classList.remove('thinking');
        document.body.classList.remove('thinking');
        button.disabled = false;
        dilemma.disabled = false;
        button.textContent = 'Deliberate again';
        state = 'idle';
      }, 680);
    }, duration);
  }

  button.addEventListener('click', deliberate);
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    muteBtn.setAttribute('aria-pressed', String(muted));
    muteBtn.textContent = muted ? 'Sound off' : 'Sound on';
    if (muted && tickTimer) {
      window.clearInterval(tickTimer);
      tickTimer = null;
    } else if (!muted && state === 'deliberating' && !tickTimer) {
      startTicks();
    }
  });

  setNeedles(true);
  window.setInterval(() => {
    if (state === 'idle') setNeedles(true);
  }, 1600);
})();
