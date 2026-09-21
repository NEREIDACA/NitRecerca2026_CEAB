(function () {
  const D = window.STORY, E = window.TwinEngine, $ = id => document.getElementById(id);
  const VMAX = D.vmax;
  const MES = ['gen', 'febr', 'març', 'abr', 'maig', 'juny', 'jul', 'ag', 'set', 'oct', 'nov', 'des'];
  const MES_LLARG = { 10: 'octubre', 11: 'novembre', 12: 'desembre', 1: 'gener', 2: 'febrer', 3: 'març', 4: 'abril', 9: 'setembre' };
  const pct = v => Math.round(100 * v / VMAX);

  const ACTORS = [
    { key: 'abast', name: 'L’aixeta', desc: 'L’aigua que arriba a Girona i a l’àrea de Barcelona.', icon: tapIcon,
      levels: { poca: 0.85, normal: 1, molta: 1.15 } },
    { key: 'reg', name: 'Els camps', desc: 'El reg dels camps del Baix Ter.', icon: cropIcon,
      levels: { poca: 0.25, normal: 1, molta: 1.5 } },
    { key: 'eco', name: 'El riu', desc: 'El cabal que manté viu el Ter riu avall del pantà.', icon: riverIcon },
  ];
  ACTORS[2].levels = { poca: 0.4, normal: 1, molta: 1.6 };
  const LEVEL_LABEL = { poca: 'Poca', normal: 'Normal', molta: 'Molta' };
  const MOOD_LABEL = { poca: 'amb set', normal: 'servit just', molta: 'ben servit' };
  const MOOD_COLOR = { poca: '#c9613f', normal: '#00374a', molta: '#3d7fa6' };

  function tapIcon() { return '<svg class="icon" viewBox="0 0 48 48" fill="none" stroke="#00374a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14h14a6 6 0 0 1 6 6v4"/><circle cx="10" cy="14" r="4"/><path d="M30 24v6a3 3 0 0 1-3 3h-2"/><path d="M25 33v6M20 39h10"/><path d="M25 27c2 2 2 5 0 7-2-2-2-5 0-7Z" fill="#3d7fa6" stroke="none" opacity=".55"/></svg>'; }
  function cropIcon() { return '<svg class="icon" viewBox="0 0 48 48" fill="none" stroke="#00374a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 40V20"/><path d="M24 22c0-7-6-11-12-11 0 7 5 12 12 11Z" fill="#c9613f" stroke="none" opacity=".55"/><path d="M24 26c0-6 6-9 11-9 0 6-5 10-11 9Z" fill="#3d7fa6" stroke="none" opacity=".55"/><path d="M14 40h20"/></svg>'; }
  function riverIcon() { return '<svg class="icon" viewBox="0 0 48 48" fill="none" stroke="#00374a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18c4-3 8-3 12 0s8 3 12 0 8-3 12 0"/><path d="M6 27c4-3 8-3 12 0s8 3 12 0 8-3 12 0"/><path d="M6 36c4-3 8-3 12 0s8 3 12 0 8-3 12 0"/></svg>'; }

  // face expressing how well-served an actor was: 'poca' (thirsty) / 'normal' / 'molta' (thriving)
  function faceIcon(level) {
    const c = MOOD_COLOR[level];
    let mouth, extra = '';
    if (level === 'poca') { mouth = '<path d="M15 30q9-7 18 0" stroke-width="2.6"/>'; extra = '<path d="M32 15l3 4M35 15l-3 4" stroke-width="2.2"/>'; }
    else if (level === 'molta') { mouth = '<path d="M14 26q10 10 20 0" stroke-width="2.6"/><path d="M24 6l1.4 3.6L29 11l-3.6 1.4L24 16l-1.4-3.6L19 11l3.6-1.4Z" fill="' + c + '" stroke="none"/>'; }
    else { mouth = '<path d="M15 28h18" stroke-width="2.6"/>'; }
    return `<svg class="face" viewBox="0 0 48 34" aria-hidden="true">
      <circle cx="24" cy="17" r="15" fill="none" stroke="${c}" stroke-width="2.4"/>
      <circle cx="17" cy="14" r="2" fill="${c}"/><circle cx="31" cy="14" r="2" fill="${c}"/>
      <g stroke="${c}" stroke-linecap="round" fill="none">${mouth}${extra}</g>
    </svg>`;
  }
  function buildReactions(elId, choice) {
    $(elId).innerHTML = ACTORS.map(a => {
      const lvl = choice[a.key] || 'normal';
      return `<div class="reaction"><span title="${a.name}">${faceIcon(lvl)}</span>
        <span class="rname">${a.name}</span>
        <span class="rmood" style="color:${MOOD_COLOR[lvl]}">${MOOD_LABEL[lvl]}</span></div>`;
    }).join('');
  }

  function days(m) { return E.daysInMonth(m); }

  function runWindow(win, choice, V0) {
    const vol = win.months.map((m, i) => ACTORS.reduce((a, act) => a + win.plan[act.key === 'eco' ? 'eco_hm3' : act.key][i] * act.levels[choice[act.key]], 0));
    const zeros = win.months.map(() => 0);
    const Qout = E.dailyRelease(win.dates, win.months, vol, zeros);
    // Susqueda local inflow (net of losses) -- the forecast only covers Sau's own inflow.
    const Qres = E.dailyRelease(win.dates, win.months, win.residual, zeros);
    const Qin = win.Q.map(r => Float64Array.from(r, (x, i) => x + Qres[i]));
    const traj = E.simulate(V0, Qin, Qout, VMAX);
    return E.summarize(traj);
  }

  // ---------- state ----------
  let choice1 = {}, choice2 = {}, sum1 = null, sum2 = null, sampleMembers1 = null, sampleMembers2 = null;

  // ---------- participant record log (kept in this device's browser; export via ?admin=1) ----------
  const REC_KEY = 'nitceab_kiosk_records_v1';
  function loadRecords() { try { return JSON.parse(localStorage.getItem(REC_KEY) || '[]'); } catch (e) { return []; } }
  function saveRecords(r) { try { localStorage.setItem(REC_KEY, JSON.stringify(r)); } catch (e) { } }
  let currentRecordId = null;
  function startRecord() {
    const records = loadRecords();
    currentRecordId = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    records.push({
      id: currentRecordId, startedAt: new Date().toISOString(), completedAt: null,
      choice1: null, pctStep1: null, choice2: null, pctStep2: null,
      feedbackUseful: null, feedbackMessage: ''
    });
    saveRecords(records);
  }
  function updateRecord(patch) {
    if (!currentRecordId) return;
    const records = loadRecords();
    const idx = records.findIndex(r => r.id === currentRecordId);
    if (idx < 0) return;
    Object.assign(records[idx], patch);
    saveRecords(records);
  }

  function screen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    window.scrollTo(0, 0);
    resetIdle();
  }

  function fillReservoir(elId, pctVal) {
    const el = $(elId), full = 152, h = full * pctVal / 100;
    el.setAttribute('height', h.toFixed(1));
    el.setAttribute('y', (156 - h).toFixed(1));
  }

  function buildGrid(gridId, storeInto) {
    const grid = $(gridId);
    grid.innerHTML = ACTORS.map(a => `
      <div class="actor-card" data-actor="${a.key}">
        ${a.icon()}
        <h3>${a.name}</h3>
        <p>${a.desc}</p>
        <div class="level-row">
          ${['poca', 'normal', 'molta'].map(l => `<button type="button" class="lvl" data-actor="${a.key}" data-level="${l}">${LEVEL_LABEL[l]}</button>`).join('')}
        </div>
      </div>`).join('');
    grid.querySelectorAll('.lvl').forEach(btn => btn.addEventListener('click', () => {
      const actor = btn.dataset.actor, level = btn.dataset.level;
      storeInto[actor] = level;
      grid.querySelectorAll(`.lvl[data-actor="${actor}"]`).forEach(b => b.classList.toggle('sel', b === btn));
      onChoiceChange();
    }));
  }
  function onChoiceChange() {
    const ready1 = ACTORS.every(a => choice1[a.key]);
    $('btnGo1').disabled = !ready1;
    const ready2 = ACTORS.every(a => choice2[a.key]);
    $('btnGo2') && ($('btnGo2').disabled = false);
    $('btnGo3').disabled = !ready2;
  }

  // ---------- ensemble mini-animation ----------
  function drawEnsembleAnim(svgId, memberValues) {
    const svg = $(svgId), W = 520, H = 120, n = memberValues[0].length;
    const all = memberValues.flat(); const lo = Math.min(...all), hi = Math.max(...all);
    const x = i => 20 + (W - 40) * i / (n - 1);
    const y = v => H - 14 - (H - 28) * (v - lo) / Math.max(1, hi - lo);
    let s = '';
    memberValues.forEach((arr, k) => {
      const d = arr.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1)).join('');
      const len = 900;
      s += `<path d="${d}" fill="none" stroke="#3d7fa6" stroke-width="1.6" opacity="${0.18 + 0.5 * Math.random()}"
              stroke-dasharray="${len}" stroke-dashoffset="${len}">
              <animate attributeName="stroke-dashoffset" from="${len}" to="0" dur="1.1s" begin="${(k * 0.02).toFixed(2)}s" fill="freeze"/>
            </path>`;
    });
    svg.innerHTML = s;
  }

  // ---------- charts ----------
  function lineChart(svgId, series, months, opts) {
    const svg = $(svgId), W = 900, H = 300, m = { l: 46, r: 20, t: 18, b: 34 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const yMax = opts.yMax || 45, yMin = 0;
    const n = months.length;
    const x = i => m.l + iw * i / (n - 1);
    const y = v => m.t + ih * (1 - (v - yMin) / (yMax - yMin));
    const line = arr => arr.reduce((p, v, i) => v == null ? p : (p + (p === '' ? 'M' : 'L') + x(i).toFixed(1) + ',' + y(v).toFixed(1)), '');
    let s = `<g>`;
    for (let g = 0; g <= yMax; g += 10) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(g)}" y2="${y(g)}" stroke="#e3eeee"/><text x="${m.l - 8}" y="${y(g) + 4}" text-anchor="end" font-size="13" fill="#5a6e72" font-family="IBM Plex Mono">${g}%</text>`;
    const thin = n > 10 ? 2 : 1;
    months.forEach((mo, i) => {
      const isJan = mo.slice(5) === '01';
      if (i % thin !== 0 && i !== n - 1 && !isJan) return;
      const yy = mo.slice(2, 4);
      const yearChanged = i === 0 || yy !== months[i - 1].slice(2, 4);
      const label = MES[+mo.slice(5) - 1] + (yearChanged ? ` '${yy}` : '');
      s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="13" fill="#5a6e72" font-family="Hanken Grotesk">${label}</text>`;
    });
    if (opts.real) s += `<path d="${line(opts.real)}" fill="none" stroke="#3d7fa6" stroke-width="3" stroke-dasharray="7 5" stroke-linecap="round"/>`;
    if (opts.mine) s += `<path d="${line(opts.mine)}" fill="none" stroke="#c9613f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (opts.mine) { const li = opts.mine.map((v, i) => v == null ? -1 : i).filter(i => i >= 0).pop(); if (li != null) s += `<circle cx="${x(li)}" cy="${y(opts.mine[li])}" r="5.5" fill="#c9613f"/>`; }
    if (opts.real) { const li = opts.real.map((v, i) => v == null ? -1 : i).filter(i => i >= 0).pop(); if (li != null) s += `<circle cx="${x(li)}" cy="${y(opts.real[li])}" r="4.5" fill="#3d7fa6"/>`; }
    s += `</g>`;
    svg.innerHTML = s;
  }

  // ---------- flow ----------
  function initIntro() {
    $('introPct').textContent = pct(D.step1.V0) + '%';
    fillReservoir('introFill', pct(D.step1.V0));
  }
  $('btnStart').addEventListener('click', () => {
    startRecord();
    buildGrid('grid1', choice1);
    $('d1start').textContent = pct(D.step1.V0) + '%';
    screen('s-dec1');
  });

  $('btnGo1').addEventListener('click', () => {
    const idx = Math.round(D.step1.Q.length * Math.random());
    const sample = []; for (let k = 0; k < 14; k++) sample.push(cumVolPreview(D.step1, k * 3 % D.step1.Q.length));
    drawEnsembleAnim('ens1', sample);
    screen('s-load1');
    setTimeout(() => {
      sum1 = runWindow(D.step1, choice1, D.step1.V0);
      const mineFull = D.step1.months.map((_, i) => pct(sum1.p50[D.step1.monthEndIdx ? D.step1.monthEndIdx[i] : lastDayOfMonth(D.step1, i)]));
      const realFull = D.step1.obs.slice(0, D.step1.months.length).map(pctFromHm3);
      lineChart('chart1', null, D.step1.months, { mine: mineFull, real: realFull, yMax: 45 });
      buildReactions('reactions1', choice1);
      const endMine = mineFull[mineFull.length - 1], endReal = realFull[realFull.length - 1];
      $('take1').innerHTML = takeaway(endMine, endReal, 'a l’abril de 2023');
      updateRecord({ choice1: { ...choice1 }, pctStep1: endMine });
      screen('s-res1');
    }, 1250);
  });

  $('btnGo2').addEventListener('click', () => {
    const V0b = lastValue(sum1, D.step1);
    buildGrid('grid2', choice2);
    $('d2start').textContent = pct(V0b) + '%';
    screen('s-dec2');
    window.__V0b = V0b;
  });

  $('btnGo3').addEventListener('click', () => {
    const sample = []; for (let k = 0; k < 14; k++) sample.push(cumVolPreview(D.step2, k * 3 % D.step2.Q.length));
    drawEnsembleAnim('ens2', sample);
    screen('s-load2');
    setTimeout(() => {
      sum2 = runWindow(D.step2, choice2, window.__V0b);
      renderFinal();
      screen('s-reveal');
    }, 1250);
  });

  $('btnReplay').addEventListener('click', () => { choice1 = {}; choice2 = {}; currentRecordId = null; screen('s-intro'); });
  $('btnQR').addEventListener('click', () => { window.open('https://nereidaca.github.io/hydro_tool/', '_blank'); });

  // ---------- helpers ----------
  function lastDayOfMonth(win, monthIdx) {
    const m = win.months[monthIdx]; let last = 0;
    win.dates.forEach((d, i) => { if (d.startsWith(m)) last = i; });
    return last;
  }
  function lastValue(sum, win) { const li = lastDayOfMonth(win, win.months.length - 1); return sum.p50[li]; }
  function pctFromHm3(v) { return v == null ? null : Math.round(100 * v / VMAX); }
  function cumVolPreview(win, memberIdx) {
    const q = win.Q[memberIdx % win.Q.length]; const out = []; let acc = 0;
    for (let i = 0; i < q.length; i += Math.max(1, Math.floor(q.length / 40))) { acc += q[i]; out.push(acc); }
    return out;
  }
  function takeaway(mine, real, when) {
    let base;
    if (mine >= real + 4) base = `Has guardat <b>més marge</b> que el que hi va haver de debò.`;
    else if (mine <= real - 4) base = `T’has quedat amb <b>menys marge</b> que el que hi va haver de debò.`;
    else base = `T’ha quedat molt semblant al que va passar de debò.`;
    const tag = mine >= 30 ? 'Encara hi ha un bon coixí.' : (mine >= 20 ? 'Vas just, però hi ha marge.' : 'Et quedes molt just de reserva.');
    return `El pantà queda al <b>${mine}%</b> ${when}. ${base} ${tag}`;
  }

  function renderFinal() {
    const months = D.step1.months.concat(D.step2.months).concat(D.epilogue.months);
    const mine1 = D.step1.months.map((_, i) => pct(sum1.p50[lastDayOfMonth(D.step1, i)]));
    const mine2 = D.step2.months.map((_, i) => pct(sum2.p50[lastDayOfMonth(D.step2, i)]));
    const real1 = D.step1.obs.map(pctFromHm3);
    const real2 = D.step2.obs.map(pctFromHm3);
    const mine = mine1.concat(mine2).concat(D.epilogue.months.map(() => null));
    const real = real1.concat(real2).concat(D.epilogue.obs.map(pctFromHm3));
    lineChart('chartFinal', null, months, { mine, real, yMax: 45 });
    buildReactions('reactionsFinal', choice2);
    const endMine = mine2[mine2.length - 1], endReal = real2[real2.length - 1];
    $('takeFinal').innerHTML = takeaway(endMine, endReal, 'al setembre de 2023');
    $('epilogueText').innerHTML = `El pantà real va continuar baixant. El sistema Ter-Llobregat va entrar en <b>emergència per sequera</b> l’${D.epilogue.emergency_date}. Sau i Susqueda van tocar fons l’<b>${D.epilogue.min_date}</b>, amb només un <b>${D.epilogue.min_pct}%</b> ple &mdash; el mínim històric. Per això prediem mesos abans: per tenir temps de decidir sense presses.`;
    resetFeedback();
    updateRecord({ choice2: { ...choice2 }, pctStep2: endMine, completedAt: new Date().toISOString() });
  }

  // ---------- feedback ----------
  let fbSavedT;
  function resetFeedback() {
    $('fbChoices').querySelectorAll('.fb-btn').forEach(b => b.classList.remove('sel'));
    $('fbMessage').value = '';
    $('fbSaved').classList.remove('show');
  }
  function flashSaved() {
    $('fbSaved').classList.add('show');
    clearTimeout(fbSavedT);
    fbSavedT = setTimeout(() => $('fbSaved').classList.remove('show'), 1800);
  }
  $('fbChoices').querySelectorAll('.fb-btn').forEach(btn => btn.addEventListener('click', () => {
    $('fbChoices').querySelectorAll('.fb-btn').forEach(b => b.classList.toggle('sel', b === btn));
    updateRecord({ feedbackUseful: btn.dataset.v });
    flashSaved();
  }));
  $('fbMessage').addEventListener('input', () => { clearTimeout(fbSavedT); });
  $('fbMessage').addEventListener('blur', () => {
    updateRecord({ feedbackMessage: $('fbMessage').value.trim() });
    if ($('fbMessage').value.trim()) flashSaved();
  });

  // ---------- idle reset (kiosk hygiene) ----------
  const isAdmin = new URLSearchParams(location.search).get('admin') === '1';
  let idleT;
  function resetIdle() {
    clearTimeout(idleT);
    if (isAdmin) return;
    idleT = setTimeout(() => { choice1 = {}; choice2 = {}; currentRecordId = null; screen('s-intro'); }, 90000);
  }
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, resetIdle));
  resetIdle();

  // ---------- admin (?admin=1): review & export the participant log ----------
  function fmtChoice(c) { return c ? ACTORS.map(a => LEVEL_LABEL[c[a.key]] || '?').join(' / ') : '—'; }
  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function escapeHtml(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function renderAdmin() {
    const records = loadRecords().slice().reverse();
    $('adminCount').textContent = records.length + (records.length === 1 ? ' participant registrat' : ' participants registrats') + ' (desats en aquest navegador)';
    document.querySelector('#adminTable thead').innerHTML =
      '<tr><th>Inici</th><th>Fi</th><th>Decisió 1 (aixeta / camps / riu)</th><th>% abr23</th><th>Decisió 2</th><th>% set23</th><th>Útil?</th><th>Missatge</th></tr>';
    document.querySelector('#adminTable tbody').innerHTML = records.map(r => `<tr>
      <td>${fmtDate(r.startedAt)}</td><td>${fmtDate(r.completedAt)}</td>
      <td>${fmtChoice(r.choice1)}</td><td>${r.pctStep1 == null ? '—' : r.pctStep1 + '%'}</td>
      <td>${fmtChoice(r.choice2)}</td><td>${r.pctStep2 == null ? '—' : r.pctStep2 + '%'}</td>
      <td>${r.feedbackUseful || '—'}</td><td class="msg">${r.feedbackMessage ? escapeHtml(r.feedbackMessage) : '—'}</td>
    </tr>`).join('') || '<tr><td colspan="8">Encara no hi ha registres.</td></tr>';
  }
  function toCsv(records) {
    const cols = ['id', 'startedAt', 'completedAt', 'choice1_abast', 'choice1_reg', 'choice1_eco', 'pctStep1',
      'choice2_abast', 'choice2_reg', 'choice2_eco', 'pctStep2', 'feedbackUseful', 'feedbackMessage'];
    const rows = records.map(r => [
      r.id, r.startedAt, r.completedAt || '',
      r.choice1 ? r.choice1.abast || '' : '', r.choice1 ? r.choice1.reg || '' : '', r.choice1 ? r.choice1.eco || '' : '',
      r.pctStep1 == null ? '' : r.pctStep1,
      r.choice2 ? r.choice2.abast || '' : '', r.choice2 ? r.choice2.reg || '' : '', r.choice2 ? r.choice2.eco || '' : '',
      r.pctStep2 == null ? '' : r.pctStep2,
      r.feedbackUseful || '', r.feedbackMessage || ''
    ]);
    const esc = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
    return cols.join(',') + '\n' + rows.map(row => row.map(esc).join(',')).join('\n');
  }
  $('btnAdminExport').addEventListener('click', () => {
    const blob = new Blob([toCsv(loadRecords())], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'nit_ceab_registres_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
  $('btnAdminClear').addEventListener('click', () => {
    if (confirm('Segur que vols esborrar tots els registres? Aquesta acció no es pot desfer.')) {
      localStorage.removeItem(REC_KEY);
      renderAdmin();
    }
  });

  if (isAdmin) { renderAdmin(); screen('s-admin'); }
  else initIntro();
})();
