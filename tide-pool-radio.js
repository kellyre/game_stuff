(() => {
  'use strict';

  const pool = document.querySelector('#pool');
  const transcript = document.querySelector('#transcript');
  const meter = document.querySelector('#meter');
  const muteButton = document.querySelector('#muteButton');

  const svg = {
    crab: '<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M21 47c-8 0-13-5-16-10" fill="none" stroke="#ef8d4b" stroke-width="5" stroke-linecap="round"/><path d="M59 47c8 0 13-5 16-10" fill="none" stroke="#ef8d4b" stroke-width="5" stroke-linecap="round"/><ellipse cx="40" cy="45" rx="21" ry="15" fill="#e76f51"/><circle cx="31" cy="31" r="5" fill="#17252b"/><circle cx="49" cy="31" r="5" fill="#17252b"/><path d="M18 39l-10-9M62 39l10-9" stroke="#ef8d4b" stroke-width="6" stroke-linecap="round"/></svg>',
    anemone: '<svg viewBox="0 0 80 80" aria-hidden="true"><g fill="none" stroke="#d786c7" stroke-width="6" stroke-linecap="round"><path d="M40 52C32 35 22 23 11 17"/><path d="M40 52C38 35 36 22 31 10"/><path d="M40 52c4-18 12-30 24-39"/><path d="M40 52c14-12 24-17 35-16"/><path d="M40 52c-13-10-22-13-34-11"/></g><ellipse cx="40" cy="57" rx="18" ry="10" fill="#b565a7"/></svg>',
    limpet: '<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M14 55c9-28 20-39 28-39s18 13 24 39H14z" fill="#d8c99b"/><path d="M22 55c8-17 17-25 24-34" stroke="#8e8060" stroke-width="4" fill="none"/><ellipse cx="40" cy="58" rx="31" ry="8" fill="#695f4e" opacity=".55"/></svg>',
    cap: '<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="25" fill="#d84b4b"/><circle cx="40" cy="40" r="16" fill="#f5e6c8"/><path d="M22 22l36 36M58 22L22 58" stroke="#9b2f2f" stroke-width="4" opacity=".75"/></svg>',
    bubbles: '<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="25" cy="48" r="12" fill="none" stroke="#d9ffff" stroke-width="4"/><circle cx="47" cy="30" r="15" fill="none" stroke="#d9ffff" stroke-width="4"/><circle cx="55" cy="56" r="8" fill="none" stroke="#d9ffff" stroke-width="4"/></svg>',
    star: '<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M40 8l8 22 23-4-18 16 13 20-22-10-16 18 3-24-22-10 24-5 7-23z" fill="#f0a34e"/><circle cx="40" cy="41" r="7" fill="#d87942"/></svg>',
    kelp: '<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M39 72C28 51 53 35 38 9" fill="none" stroke="#5fae6f" stroke-width="6" stroke-linecap="round"/><path d="M42 48c11-7 19-6 24 5-10 3-18 1-24-5zM36 31c-12-3-19 0-22 11 11 0 18-4 22-11z" fill="#76c57d"/></svg>',
    snail: '<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M21 53c16 0 26 0 39-11 5 5 4 14-3 18H23c-9 0-14-2-17-7 4-1 9 0 15 0z" fill="#b8a06c"/><circle cx="36" cy="40" r="15" fill="#8b6d46"/><path d="M36 30a10 10 0 1 1-7 17" fill="none" stroke="#e8d7aa" stroke-width="4"/><path d="M57 39l9-12M62 39l13-7" stroke="#b8a06c" stroke-width="4" stroke-linecap="round"/></svg>',
    urchin: '<svg viewBox="0 0 80 80" aria-hidden="true"><g stroke="#493957" stroke-width="4" stroke-linecap="round"><path d="M40 7v66M7 40h66M17 17l46 46M63 17L17 63M27 10l26 60M53 10L27 70"/></g><circle cx="40" cy="40" r="18" fill="#6d527d"/></svg>',
    shell: '<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M15 57c4-26 16-39 25-39s22 13 25 39H15z" fill="#f1c7a3"/><g stroke="#b87864" stroke-width="3" fill="none"><path d="M40 19v38M28 57c1-15 5-27 12-38M52 57c-1-15-5-27-12-38M19 57c6-10 13-17 21-38M61 57c-6-10-13-17-21-38"/></g></svg>',
    barnacle: '<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M20 61l9-33 13-9 15 10 7 32H20z" fill="#c8c0aa"/><path d="M34 61l4-32M50 61l-6-35" stroke="#827b69" stroke-width="4"/><path d="M29 28l13-9 15 10" fill="none" stroke="#eee4c8" stroke-width="5" stroke-linecap="round"/></svg>',
    moonjelly: '<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M18 37c3-17 15-25 29-21 13 4 19 16 15 31-13 7-29 5-44-10z" fill="#bde4ff" opacity=".82"/><g stroke="#d8f1ff" stroke-width="4" stroke-linecap="round"><path d="M27 46c-3 7-3 13 1 18M39 48c-2 8-1 14 4 20M51 46c0 8 3 13 8 17"/></g></svg>'
  };

  const stations = [
    { id: 'crab', label: 'Hermit crab', tag: 'W-CRAB', x: 23, y: 62, s: 1.08, icon: svg.crab,
      messages: ['Two-bedroom spiral available, ocean view, previous owner absent.', 'I am not hiding. I am conducting a defensive open house.', 'The rent is one quiet corner and three unlicked pebbles.', 'Please stop calling it borrowed. It is a mobile zoning solution.', 'Inspection today found one draft, two ghosts, no regrets.', 'If the shell fits, the deed is implied.'],
      fragments: ['lease disputed', 'shell tour at low tide', 'no cosigners', 'address withheld'] },
    { id: 'anemone', label: 'Anemone', tag: 'K-ANEM', x: 70, y: 36, s: 1.05, icon: svg.anemone,
      messages: ['Current weather: soft from the left, remembering plankton.', 'A slow green front is arriving under the moon.', 'I waved at a rumor and it waved back six minutes later.', 'Forecast says every tentacle should remain emotionally available.', 'The tide has brought a small silence. I am opening it.', 'Clouds below the surface remain mostly decorative.'],
      fragments: ['weather below the rock', 'soft from the left', 'current says maybe', 'plankton advisory'] },
    { id: 'limpet', label: 'Limpet', tag: 'K-LIMP', x: 47, y: 73, s: .94, icon: svg.limpet,
      messages: ['Breaking: this rock remains the correct rock.', 'Adhesion report: excellent. Ambition report: unnecessary.', 'I have reviewed the horizon and declined it.', 'Pressure steady, grip sincere, travel plans canceled.', 'If found elsewhere, return me to exactly here.', 'The rock asked for privacy and I respect local stone.'],
      fragments: ['grip sincere', 'rock remains correct', 'horizon declined', 'adhesion excellent'] },
    { id: 'cap', label: 'Bottle cap', tag: 'AM-CAP', x: 58, y: 23, s: .86, icon: svg.cap,
      messages: ['Traffic is backed up on Exit 4B of the impossible highway.', 'I am a wheel, a crown, and absolutely not litter.', 'Northbound lanes report kelp delays near the cloverleaf.', 'This is not my ocean. My ocean had cupholders.', 'The overpass is closed due to gull negotiations.', 'Stay tuned for sports from a vending machine two towns inland.'],
      fragments: ['exit closed', 'not from here', 'gull negotiations', 'cupholder weather'] },
    { id: 'bubbles', label: 'Bubble cluster', tag: 'BUBL-5', x: 37, y: 29, s: .9, icon: svg.bubbles,
      messages: ['Bulletin: three bubbles rose. All three were promoted.', 'Emergency canceled. It was only a round thought.', 'Pop risk low to dramatic. Remain buoyant.', 'We repeat: the ceiling is wet and getting closer.', 'Small air has gathered and requests a chorus.', 'Situation clear. Everybody up. Everybody vanish.'],
      fragments: ['pop risk low', 'round thought', 'everybody up', 'air requests chorus'] },
    { id: 'star', label: 'Sea star', tag: 'WSTAR', x: 76, y: 67, s: .96, icon: svg.star,
      messages: ['Five arms confirm: the floor is deliciously still.', 'Rotating slightly to improve public reception.', 'Tonight I will point everywhere and call it navigation.', 'Lost arm has checked in. Says it is doing fine.', 'Sand texture review: granular, supportive, a little nosy.', 'The committee of points has reached no consensus.'],
      fragments: ['five arms confirm', 'floor delicious', 'pointing everywhere', 'committee of points'] },
    { id: 'kelp', label: 'Kelp strand', tag: 'KELP-FM', x: 18, y: 35, s: 1.1, icon: svg.kelp,
      messages: ['This song is just swaying with extra paperwork.', 'The chorus enters whenever the water remembers us.', 'Long green traffic moving south by moonlight.', 'I have been asked to stop applauding with my whole body.', 'Tangle forecast: affectionate but navigable.', 'Broadcasting live from the softest intersection.'],
      fragments: ['swaying paperwork', 'chorus enters late', 'green traffic south', 'tangle navigable'] },
    { id: 'snail', label: 'Snail trail', tag: 'SNAIL-AM', x: 61, y: 58, s: .92, icon: svg.snail,
      messages: ['We are moving now. Please update your calendars gradually.', 'Trail quality behind me: glossy and historically important.', 'Speed trap ahead. I will arrive to it tomorrow.', 'The road is wherever my foot has recently believed.', 'I left a silver memo for anyone patient enough to read pavement.', 'Momentum is a private matter.'],
      fragments: ['calendars gradually', 'glossy memo', 'speed trap tomorrow', 'momentum private'] },
    { id: 'urchin', label: 'Sea urchin', tag: 'K-URCH', x: 33, y: 80, s: .82, icon: svg.urchin,
      messages: ['Weather below the rock remains private.', 'I am not prickly. I am thoroughly footnoted.', 'Contact advisory: admire from a polite distance.', 'All directions currently point away from my center.', 'Round table meeting concluded with several sharp minutes.', 'The moon tried to pet me and learned governance.'],
      fragments: ['private weather', 'polite distance', 'sharp minutes', 'directions point away'] },
    { id: 'shell', label: 'Suspicious shell', tag: 'SHELL?', x: 82, y: 47, s: .82, icon: svg.shell,
      messages: ['Nobody is inside. That was an old policy.', 'The echo you heard was pre-recorded by a smaller echo.', 'Please place secrets in the slot and wait one tide.', 'Vacancy sign flickers in a language made of sand.', 'I am closed for inventory of imaginary pearls.', 'If this shell starts walking, look surprised for tax reasons.'],
      fragments: ['nobody inside', 'echo pre-recorded', 'secrets in slot', 'tax reasons'] },
    { id: 'barnacle', label: 'Barnacle row', tag: 'BARN-2', x: 42, y: 49, s: .8, icon: svg.barnacle,
      messages: ['We adhere to the minutes of the previous meeting.', 'Attendance is mandatory because leaving is structurally complex.', 'Motion to become a small castle has passed unanimously.', 'Filter feeding will resume after these brief remarks.', 'The rock has recognized the barnacle from the shallow end.', 'Quorum achieved by everyone already being stuck here.'],
      fragments: ['motion passed', 'leaving complex', 'small castle', 'quorum achieved'] },
    { id: 'moonjelly', label: 'Tiny moon jelly', tag: 'LUNA-J', x: 51, y: 39, s: .86, icon: svg.moonjelly,
      messages: ['Transparent thought crossing from west to maybe.', 'I misplaced my edges and feel professionally light.', 'Moon copy received. Original still overhead.', 'Do not worry. The drifting is part of the minutes.', 'I am here in pencil.', 'Tonight’s glow is sponsored by borrowed sky.'],
      fragments: ['west to maybe', 'edges misplaced', 'moon copy received', 'here in pencil'] }
  ];

  const openWater = {
    tag: 'OPEN-SEA',
    messages: ['Static rolls over a sandbar and refuses to explain.', 'Only moonlight answers, with poor pronunciation.', 'You tuned the gap between two very small opinions.', 'Open water says: please hold for a quieter pebble.', 'A wave clears its throat, then thinks better of it.'],
    fragments: ['moonlight answers', 'static over sandbar', 'quieter pebble', 'gap between opinions']
  };

  const bags = new Map();
  let activeRipples = [];
  let muted = false;
  let audioContext = null;
  let idleTimer = 0;
  let lastPoint = { x: 50, y: 50 };

  function makeBag(items) {
    return { items, pool: [], last: null };
  }

  function drawFromBag(key, items) {
    if (!bags.has(key)) bags.set(key, makeBag(items));
    const bag = bags.get(key);
    if (bag.pool.length === 0) {
      bag.pool = items.map((_, index) => index);
      for (let i = bag.pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag.pool[i], bag.pool[j]] = [bag.pool[j], bag.pool[i]];
      }
      if (bag.pool.length > 1 && bag.pool[0] === bag.last) {
        [bag.pool[0], bag.pool[1]] = [bag.pool[1], bag.pool[0]];
      }
    }
    const index = bag.pool.shift();
    bag.last = index;
    return items[index];
  }

  function placeStations() {
    stations.forEach((station) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'inhabitant';
      button.dataset.station = station.id;
      button.style.setProperty('--x', station.x);
      button.style.setProperty('--y', station.y);
      button.style.setProperty('--s', station.s);
      button.setAttribute('aria-label', station.label);
      button.innerHTML = station.icon;
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        tuneStation(station, station.x, station.y, true);
      });
      button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          tuneStation(station, station.x, station.y, true);
        }
      });
      pool.appendChild(button);
    });
  }

  function rectPointFromEvent(event) {
    const rect = pool.getBoundingClientRect();
    return {
      px: event.clientX - rect.left,
      py: event.clientY - rect.top,
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
      rect
    };
  }

  function nearestStation(point) {
    const rect = point.rect || pool.getBoundingClientRect();
    const scale = Math.min(rect.width, rect.height) / 100;
    const threshold = rect.width < 560 ? 20 : 18.5;
    let winner = null;
    let winnerDistance = Infinity;
    stations.forEach((station) => {
      const dx = (point.x - station.x) * scale;
      const dy = (point.y - station.y) * scale;
      const distance = Math.hypot(dx, dy);
      if (distance < winnerDistance) {
        winner = station;
        winnerDistance = distance;
      }
    });
    return winnerDistance <= threshold * scale ? winner : null;
  }

  function cleanRipples() {
    const now = performance.now();
    activeRipples = activeRipples.filter((ripple) => now - ripple.created < ripple.duration);
  }

  function addRipple(x, y, count = 1) {
    cleanRipples();
    const now = performance.now();
    for (let i = 0; i < count; i += 1) {
      const ring = document.createElement('span');
      const duration = 900 + Math.random() * 520 + i * 120;
      ring.className = 'ripple';
      ring.style.setProperty('--rx', `${x}%`);
      ring.style.setProperty('--ry', `${y}%`);
      ring.style.setProperty('--dur', `${duration}ms`);
      ring.style.setProperty('--size', `${170 + Math.random() * 95 + i * 36}px`);
      pool.appendChild(ring);
      ring.addEventListener('animationend', () => ring.remove(), { once: true });
      activeRipples.push({ x, y, created: now + i * 20, duration: duration + 140 });
    }
    const pebble = document.createElement('span');
    pebble.className = 'pebble';
    pebble.style.setProperty('--rx', `${x}%`);
    pebble.style.setProperty('--ry', `${y}%`);
    pool.appendChild(pebble);
    pebble.addEventListener('animationend', () => pebble.remove(), { once: true });
  }

  function addBubble() {
    if (document.hidden) return;
    const bubble = document.createElement('span');
    bubble.className = 'bubble';
    bubble.style.setProperty('--rx', `${20 + Math.random() * 60}%`);
    bubble.style.setProperty('--ry', `${38 + Math.random() * 43}%`);
    pool.appendChild(bubble);
    bubble.addEventListener('animationend', () => bubble.remove(), { once: true });
  }

  function tuneStation(station, x, y, fromCreature = false) {
    cleanRipples();
    const hadOverlap = activeRipples.length > 0;
    const count = fromCreature ? 2 : 1 + Math.floor(Math.random() * 3);
    addRipple(x, y, count);
    playPlunk();
    lastPoint = { x, y };

    const eligible = hadOverlap && Math.random() < 0.35;
    if (eligible) {
      const other = pickOtherStation(station);
      emitInterference(station || other, other);
    } else if (station) {
      emitLine(station.tag, drawFromBag(station.id, station.messages));
      markTuned(station.id);
    } else {
      emitLine(openWater.tag, drawFromBag('open', openWater.messages));
      markTuned(null);
    }
    scheduleIdle();
  }

  function pickOtherStation(station) {
    const choices = station ? stations.filter((candidate) => candidate.id !== station.id) : stations;
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function emitInterference(a, b) {
    const first = a || pickOtherStation(null);
    const second = b || pickOtherStation(first);
    const staticTokens = ['shhhr', 'moon skip', 'brine break', 'carrier wave', 'please kelp'];
    const text = `${pick(first.fragments)} / ${pick(second.fragments)} / ${pick(staticTokens)}`;
    emitLine(`${first.tag}/${second.tag}`, text, { interference: true });
    markTuned(first.id);
  }

  function pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function emitLine(tag, text, options = {}) {
    [...transcript.querySelectorAll('.line.new')].forEach((line) => line.classList.remove('new'));
    const line = document.createElement('div');
    line.className = `line new${options.idle ? ' idle' : ''}${options.interference ? ' interference' : ''}`;
    line.innerHTML = `<span class="station">${escapeHtml(tag)}:</span> ${escapeHtml(text)}`;
    transcript.prepend(line);
    while (transcript.children.length > 7) transcript.lastElementChild.remove();
    pulseMeter();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  }

  function markTuned(id) {
    pool.querySelectorAll('.inhabitant').forEach((element) => {
      element.classList.toggle('tuned', element.dataset.station === id);
    });
    if (id) {
      window.setTimeout(() => {
        const element = pool.querySelector(`[data-station="${CSS.escape(id)}"]`);
        if (element) element.classList.remove('tuned');
      }, 900);
    }
  }

  function pulseMeter() {
    meter.classList.remove('active');
    void meter.offsetWidth;
    meter.classList.add('active');
  }

  function scheduleIdle() {
    window.clearTimeout(idleTimer);
    if (document.hidden) return;
    const delay = 6000 + Math.random() * 4000;
    idleTimer = window.setTimeout(() => {
      if (!document.hidden) {
        const station = pick(stations);
        emitLine(station.tag, drawFromBag(`${station.id}-idle`, station.messages), { idle: true });
        markTuned(station.id);
      }
      idleTimer = window.setTimeout(function nextIdle() {
        if (!document.hidden) {
          const station = pick(stations);
          emitLine(station.tag, drawFromBag(`${station.id}-idle`, station.messages), { idle: true });
          markTuned(station.id);
        }
        scheduleIdle();
      }, 9000 + Math.random() * 7000);
    }, delay);
  }

  function ensureAudio() {
    if (audioContext || muted) return audioContext;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    audioContext = new AudioCtor();
    return audioContext;
  }

  function playPlunk() {
    if (muted) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(360 + Math.random() * 80, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.16);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(620, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.21);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  function toggleMute() {
    muted = !muted;
    muteButton.setAttribute('aria-pressed', String(muted));
    muteButton.textContent = muted ? 'Sound off' : 'Sound on';
  }

  pool.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.inhabitant')) return;
    const point = rectPointFromEvent(event);
    tuneStation(nearestStation(point), point.x, point.y);
  });

  pool.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const fallback = { x: lastPoint.x, y: lastPoint.y, rect: pool.getBoundingClientRect() };
      tuneStation(nearestStation(fallback), fallback.x, fallback.y);
    }
  });

  muteButton.addEventListener('click', toggleMute);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.clearTimeout(idleTimer);
    } else {
      scheduleIdle();
    }
  });

  placeStations();
  emitLine('POOL-HINT', 'Drop pebbles to tune the tide pool. The barnacles are already listening.');
  scheduleIdle();
  window.setInterval(addBubble, 1800);
})();
