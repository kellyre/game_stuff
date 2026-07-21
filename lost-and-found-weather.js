const objects = [
  { id: 'umbrella', name: 'umbrella', glyph: '☂️', adj: 'inside-out', weather: 'rain', mood: 'careful', place: 'coat rack', verb: 'drips', advisory: 'Carry an umbrella for punctuation, not protection.', priority: 9, fragments: ['raindrops that politely wait for permission', 'puddles shaped like almost-decisions', 'a damp clicking in the hinges'] },
  { id: 'key', name: 'spare key', glyph: '🔑', adj: 'brass', weather: 'showers', mood: 'locked', place: 'north door', verb: 'unlocks', advisory: 'Do not lend the wind your spare key twice.', priority: 8, fragments: ['gusts trying every doorknob on the block', 'a bright little clatter under the mat', 'low clouds with landlord energy'] },
  { id: 'mitten', name: 'left mitten', glyph: '🧤', adj: 'woolly', weather: 'fog', mood: 'lonely', place: 'sleeve', verb: 'warms', advisory: 'Check both sleeves before blaming the climate.', priority: 5, fragments: ['fog with one cold hand', 'soft static around the wrists', 'a missing thumb in the barometer'] },
  { id: 'receipt', name: 'receipt cloud', glyph: '🧾', adj: 'itemized', weather: 'drizzle', mood: 'apologetic', place: 'subtotal', verb: 'totals', advisory: 'Save your receipts; the sky may ask for proof.', priority: 6, fragments: ['mist that apologizes for tax', 'numbers smearing gently after lunch', 'a low-pressure subtotal near aisle four'] },
  { id: 'moon', name: 'pocket moon', glyph: '🌙', adj: 'silver', weather: 'moonfall', mood: 'sleepy', place: 'night pocket', verb: 'glows', advisory: 'Sweep small moons gently. They bruise like peaches.', priority: 10, fragments: ['scattered tiny moons after midnight', 'a pale tide in the sock drawer', 'sleepy orbiting around the porch light'] },
  { id: 'button', name: 'coat button', glyph: '●', adj: 'button-gray', weather: 'fog', mood: 'buttoned-up', place: 'under-furniture front', verb: 'fastens', advisory: 'Visibility improves if you stop staring directly at the missing thing.', priority: 4, fragments: ['fog gathering under the furniture', 'a small round silence on the floorboards', 'cloud cover with four neat holes'] },
  { id: 'ticket', name: 'bus ticket', glyph: '🎟️', adj: 'creased', weather: 'delays', mood: 'transit', place: 'last stop', verb: 'transfers', advisory: 'Expect connections to arrive exactly when you stop waiting.', priority: 7, fragments: ['scattered delays in the eastbound lane', 'a transfer of drizzle at platform three', 'the smell of wet vinyl seats'] },
  { id: 'shell', name: 'borrowed shell', glyph: '🐚', adj: 'coastal', weather: 'mist', mood: 'listening', place: 'far beach', verb: 'echoes', advisory: 'Hold the shell to your ear only if you can handle the minutes.', priority: 6, fragments: ['tide noises inside dry rooms', 'salt air taking attendance', 'a gull-shaped pause near the lampshade'] },
  { id: 'marble', name: 'green marble', glyph: '🟢', adj: 'rolling', weather: 'hail', mood: 'mischievous', place: 'kitchen slope', verb: 'ricochets', advisory: 'Level all tables before the afternoon hail starts choosing sides.', priority: 5, fragments: ['round hail with excellent aim', 'tiny thunder under the cabinets', 'glass-green pressure in the hallway'] },
  { id: 'boat', name: 'paper boat', glyph: '⛵', adj: 'folded', weather: 'floodlet', mood: 'hopeful', place: 'margin', verb: 'sails', advisory: 'Do not launch important mail during a floodlet watch.', priority: 7, fragments: ['a floodlet advancing by folded corners', 'rainwater with good handwriting', 'paper sails in the gutter forecast'] },
  { id: 'acorn', name: 'acorn', glyph: '🌰', adj: 'squirrelly', weather: 'gusts', mood: 'hoarding', place: 'future oak', verb: 'buries', advisory: 'Label all buried plans before leaf season.', priority: 4, fragments: ['gusts full of small future trees', 'barometric rustling in the coat pockets', 'a crunchy argument with autumn'] },
  { id: 'thimble', name: 'thimble', glyph: '🥄', adj: 'thimble-sized', weather: 'sprinkles', mood: 'careful', place: 'sewing tin', verb: 'stitches', advisory: 'Patch any holes in the afternoon before they widen into weather.', priority: 5, fragments: ['sprinkles stitched in a straight line', 'needlepoint pressure over the windowsill', 'a neat seam of rain at dusk'] },
  { id: 'compass', name: 'compass needle', glyph: '🧭', adj: 'north-ish', weather: 'crosswind', mood: 'uncertain', place: 'wrong north', verb: 'points', advisory: 'If north changes its mind, wait politely.', priority: 8, fragments: ['crosswinds debating the definition of north', 'a needle twitch in the map drawer', 'directional drizzle from several opinions'] },
  { id: 'cloud', name: 'cloud scrap', glyph: '☁️', adj: 'frayed', weather: 'overcast', mood: 'soft', place: 'mending basket', verb: 'unravels', advisory: 'Return loose cloud scraps to the nearest open sky.', priority: 9, fragments: ['loose overcast snagged on the curtain rod', 'frayed shade over the breakfast table', 'linty thunder with no follow-through'] },
  { id: 'sock', name: 'blue sock', glyph: '🧦', adj: 'static-blue', weather: 'drizzle', mood: 'domestic', place: 'dryer vent', verb: 'clings', advisory: 'Separate lights, darks, and unexplained precipitation.', priority: 5, fragments: ['dryer-static drizzle after supper', 'blue lint in the lower clouds', 'a damp reminder of laundry you meant to fold'] },
  { id: 'teacup', name: 'cracked teacup', glyph: '☕', adj: 'porcelain', weather: 'steam', mood: 'remembering', place: 'saucer', verb: 'steeps', advisory: 'Let emotional tea cool before reading the leaves.', priority: 6, fragments: ['steam carrying almost-remembered names', 'hairline cracks in the afternoon pressure', 'a spoon-clink front by the sink'] },
  { id: 'pencil', name: 'short pencil', glyph: '✏️', adj: 'stubby', weather: 'sketches', mood: 'drafty', place: 'margin', verb: 'scribbles', advisory: 'Forecast lines are approximate and may erase themselves.', priority: 3, fragments: ['penciled-in showers near the margin', 'eraser crumbs of sleet', 'a draft front with bite marks'] },
  { id: 'ribbon', name: 'red ribbon', glyph: '🎀', adj: 'ceremonial', weather: 'breeze', mood: 'dramatic', place: 'package bow', verb: 'flutters', advisory: 'Cut no ribbons until the breeze has finished its speech.', priority: 4, fragments: ['a ribbon of wind across the counter', 'ceremonial fluttering in the hedges', 'gift-wrapped pressure from the west'] },
  { id: 'matchbox', name: 'empty matchbox', glyph: '▣', adj: 'empty', weather: 'heat lightning', mood: 'sheepish', place: 'junk drawer', verb: 'fizzles', advisory: 'Heat lightning will not light candles, but it will try to look useful.', priority: 7, fragments: ['tiny dry thunder in a cardboard room', 'a fizzle of summer behind the labels', 'warm static with no matches left'] },
  { id: 'stamp', name: 'postage stamp', glyph: '✉️', adj: 'postmarked', weather: 'airmail flurries', mood: 'official', place: 'return address', verb: 'delivers', advisory: 'Affix sufficient postage to all outgoing sighs.', priority: 6, fragments: ['airmail flurries sorted by zip code', 'a postmark passing over the roof', 'envelopes of cold air opening themselves'] }
];

const specialReports = {
  'key+umbrella': ['Weather for Locked Doors', 'Inside-out rain will fall only where the doors are locked. Expect brass showers at the threshold, with puddles practicing their keys.', 'Advisory: Knock before entering any cloud.'],
  'moon+receipt': ['Lunar Reimbursement Drizzle', 'A silver drizzle moves in from the night pocket and submits every drop for reimbursement. Totals may glow faintly until morning.', 'Advisory: The moon will not accept store credit.'],
  'mitten+shell+ticket': ['Coastal Sleeve Delays', 'Coastal fog is boarding late inside the left mitten. Expect salt mist in both sleeves, with the last bus apologizing from a conch.', 'Advisory: Keep your wrists above the tide line.'],
  'button+cloud': ['Under-Furniture Overcast', 'Button-gray fog gathers low under the sofa and refuses to come out when called. Visibility improves near missing coins.', 'Advisory: Sweep gently; the weather is embarrassed.'],
  'boat+receipt+teacup': ['Tea-Stained Floodlet Accounting', 'A folded floodlet sails from the saucer carrying itemized steam. Expect mild remembering by late afternoon and totals too damp to dispute.', 'Advisory: Do not audit puddles while nostalgic.'],
  'compass+key': ['North Has Borrowed the Key', 'Crosswinds are trying every direction in the lock. The brass front will turn suddenly toward a north it claims to have found under the mat.', 'Advisory: If the map clicks, step back.'],
  'marble+moon': ['Green Lunar Hail', 'Round moonfall overnight with glass-green impacts under the cabinets. The storm will roll toward any room that looks too level.', 'Advisory: Put saucers under the planets.'],
  'acorn+ribbon': ['Ceremonial Autumn Gusts', 'Squirrelly gusts arrive wearing a red ribbon and making a short speech about future trees. Leaves may applaud despite having no hands.', 'Advisory: Label your snacks as either lunch or prophecy.'],
  'matchbox+stamp': ['Official Heat Lightning Notice', 'Postmarked heat lightning flickers in an empty matchbox and declares itself delivered. No flame is expected, but several envelopes may feel warm.', 'Advisory: Return all sparks to sender.'],
  'pencil+ticket': ['Draft Route Weather', 'Creased delays move along a penciled route that keeps erasing its own stops. Expect light sketches near the margin and one bus drawn from memory.', 'Advisory: Sharpen your patience at the next transfer.'],
  'sock+teacup+button': ['Laundry Room Almost-Remembering', 'Static-blue drizzle steeps in a cracked teacup while button-gray fog gathers under the dryer. You may remember why you came in just as you leave.', 'Advisory: Fold the weather while it is still warm.'],
  'cloud+thimble': ['Mended Overcast', 'Frayed overcast will be stitched into small, careful sprinkles by evening. Loose thunder may collect in the sewing tin.', 'Advisory: Wear a thimble when pointing at clouds.']
};

const rotations = [-2.5, 1.8, -1.1, 2.7, .6, -3.2, 1.2, -1.8, 2.1, -.5, 3.3, -2.1];
const selectedIds = [];
let lastReportText = '';

const objectsEl = document.querySelector('#objects');
const slotsEl = document.querySelector('#slots');
const fileButton = document.querySelector('#fileButton');
const clearButton = document.querySelector('#clearButton');
const note = document.querySelector('#note');
const report = document.querySelector('#report');
const counter = document.querySelector('#counter');
const desk = document.querySelector('#desk');
const byId = new Map(objects.map(item => [item.id, item]));

function choice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function setNote(text, bump = false) {
  note.textContent = text;
  note.classList.toggle('bump', bump);
  if (bump) window.setTimeout(() => note.classList.remove('bump'), 340);
}

function comboKey(ids) {
  return [...ids].sort().join('+');
}

function renderObjects() {
  objectsEl.innerHTML = '';
  objects.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thing';
    button.dataset.id = item.id;
    button.style.setProperty('--r', `${rotations[index % rotations.length]}deg`);
    button.setAttribute('aria-label', `Lost ${item.name}`);
    button.setAttribute('aria-pressed', selectedIds.includes(item.id) ? 'true' : 'false');
    if (selectedIds.includes(item.id)) button.classList.add('selected');
    button.innerHTML = `<span class="glyph" aria-hidden="true">${item.glyph}</span><span class="thing-name">${item.name}</span>`;
    button.addEventListener('click', () => toggleItem(item.id));
    objectsEl.appendChild(button);
  });
}

function renderSlots() {
  slotsEl.innerHTML = '';
  for (let i = 0; i < 3; i += 1) {
    const id = selectedIds[i];
    const slot = document.createElement('div');
    slot.className = `slot${id ? ' filled' : ''}`;
    if (id) {
      const item = byId.get(id);
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `Remove ${item.name} from forecast`);
      button.innerHTML = `<span class="glyph" aria-hidden="true">${item.glyph}</span><small>${item.name}</small>`;
      button.addEventListener('click', () => toggleItem(id));
      slot.appendChild(button);
    } else {
      slot.textContent = `slot ${i + 1}`;
    }
    slotsEl.appendChild(slot);
  }
  fileButton.disabled = selectedIds.length < 2;
}

function renderAll() {
  renderObjects();
  renderSlots();
}

function toggleItem(id) {
  const existing = selectedIds.indexOf(id);
  if (existing >= 0) {
    selectedIds.splice(existing, 1);
    report.innerHTML = '<p class="placeholder">The clerk pulls a fresh blank card from somewhere improbable.</p>';
    setNote(selectedIds.length < 2 ? 'Two items minimum. The weather refuses to be filed alone.' : 'Changed the claim ticket. File again when ready.');
  } else if (selectedIds.length < 3) {
    selectedIds.push(id);
    report.innerHTML = '<p class="placeholder">The card is listening. It is trying not to look eager.</p>';
    setNote(selectedIds.length === 1 ? 'Add one more misplaced thing to make a forecast.' : 'Ready to file. A third item may improve the punchline.');
  } else {
    counter.classList.remove('shake');
    void counter.offsetWidth;
    counter.classList.add('shake');
    setNote('Three items only. The counter has union rules.', true);
  }
  renderAll();
}

function assembleGeneric(ids) {
  const items = ids.map(id => byId.get(id));
  const dominant = [...items].sort((a, b) => b.priority - a.priority)[0] || items[0];
  const texture = items.find(item => item.id !== dominant.id) || items[1];
  const punch = items[2] || texture;
  const titleTemplates = [
    `${dominant.adj[0].toUpperCase() + dominant.adj.slice(1)} ${dominant.weather}`,
    `${dominant.weather[0].toUpperCase() + dominant.weather.slice(1)} from the ${texture.place}`,
    `${texture.mood[0].toUpperCase() + texture.mood.slice(1)} ${dominant.weather} watch`
  ];
  const bodyTemplates = [
    `${dominant.adj} ${dominant.weather} ${dominant.verb} in from the ${texture.place}. Expect ${choice(dominant.fragments)}, with ${choice(texture.fragments)}.`,
    `A ${texture.mood} system is forming near the ${dominant.place}. It brings ${choice(texture.fragments)} and a chance of ${choice(punch.fragments)}.`,
    `The ${dominant.weather} remains ${dominant.adj} through late afternoon. By evening, ${choice(texture.fragments)} will meet ${choice(punch.fragments)} near the ${punch.place}.`
  ];
  if (items.length === 3) {
    bodyTemplates.push(`${dominant.adj} ${dominant.weather} arrives first, followed by ${texture.mood} pressure from the ${texture.place}. The ${punch.name} adds ${choice(punch.fragments)}, which the clerk files under "probably official."`);
  }
  return {
    title: choice(titleTemplates),
    body: choice(bodyTemplates),
    advisory: punch.advisory || texture.advisory
  };
}

function buildReport() {
  const special = specialReports[comboKey(selectedIds)];
  if (special) return { title: special[0], body: special[1], advisory: special[2] };
  return assembleGeneric(selectedIds);
}

function fileForecast() {
  if (selectedIds.length < 2) return;
  let next = buildReport();
  let text = `${next.title} ${next.body} ${next.advisory}`;
  for (let i = 0; i < 4 && text === lastReportText; i += 1) {
    next = buildReport();
    text = `${next.title} ${next.body} ${next.advisory}`;
  }
  lastReportText = text;
  report.innerHTML = `
    <article class="forecast-card">
      <h2>${next.title}</h2>
      <p>${next.body}</p>
      <span class="advisory">${next.advisory}</span>
    </article>`;
  setNote(specialReports[comboKey(selectedIds)] ? 'Special claim discovered. The clerk stamps it twice.' : 'Forecast filed with complete meteorological confidence.');
}

function clearCounter() {
  selectedIds.splice(0, selectedIds.length);
  report.innerHTML = '<p class="placeholder">The forecast card is blank, but it is already very sure of itself.</p>';
  setNote('Counter cleared. Rummage responsibly.');
  renderAll();
}

function rummageRotations() {
  [...objectsEl.children].forEach(button => {
    const degrees = (Math.random() * 7 - 3.5).toFixed(2);
    button.style.setProperty('--r', `${degrees}deg`);
  });
  desk.classList.remove('shake');
  void desk.offsetWidth;
  desk.classList.add('shake');
}

fileButton.addEventListener('click', fileForecast);
clearButton.addEventListener('click', clearCounter);

renderAll();
const rummage = document.createElement('button');
rummage.type = 'button';
rummage.className = 'rummage';
rummage.textContent = 'Rummage the box';
rummage.style.marginTop = '1rem';
rummage.addEventListener('click', rummageRotations);
document.querySelector('.desk').appendChild(rummage);
