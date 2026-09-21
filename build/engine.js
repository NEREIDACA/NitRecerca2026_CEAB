// NEREIDA seasonal digital twin — Sau+Susqueda water-balance engine.
// Same arithmetic as run_seasonal_hydro.R: monthlyvolume_to_dailyQout() + Qout_ter_eco, then volume_seasonal() (codes/functions.R).
(function (root) {
  const SEC_PER_DAY = 86400;

  function daysInMonth(ym) {
    const [y, m] = ym.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  }

  // monthly volumes (hm3/month) + maintenance flow (m3/s per month) -> daily release (m3/s)
  function dailyRelease(dates, months, volumes, eco) {
    const idx = {};
    months.forEach((m, i) => { idx[m] = i; });
    return dates.map(d => {
      const i = idx[d.slice(0, 7)];
      return volumes[i] * 1e6 / daysInMonth(months[i]) / SEC_PER_DAY + eco[i];
    });
  }

  // V[0] = V0; V[t] = clamp(V[t-1] + (Qin[t] - Qout[t]) * 86400, 0, vmax)   (hm3, m3/s)
  function simulate(V0, Qin, Qout, vmax) {
    const n = Qout.length, out = new Array(Qin.length);
    for (let k = 0; k < Qin.length; k++) {
      const q = Qin[k], v = new Float64Array(n);
      let V = V0 * 1e6;
      v[0] = V0;
      for (let t = 1; t < n; t++) {
        V = Math.min(vmax * 1e6, Math.max(0, V + (q[t] - Qout[t]) * SEC_PER_DAY));
        v[t] = V / 1e6;
      }
      out[k] = v;
    }
    return out;
  }

  // linear interpolation between order statistics (numpy default / R type 7)
  function quantile(sorted, p) {
    const h = (sorted.length - 1) * p, lo = Math.floor(h), hi = Math.min(lo + 1, sorted.length - 1);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo);
  }

  function summarize(traj, probs) {
    probs = probs || [0.1, 0.25, 0.5, 0.75, 0.9];
    const n = traj[0].length, res = probs.map(() => new Float64Array(n)), col = new Float64Array(traj.length);
    for (let t = 0; t < n; t++) {
      for (let k = 0; k < traj.length; k++) col[k] = traj[k][t];
      const s = Float64Array.from(col).sort();
      probs.forEach((p, i) => { res[i][t] = quantile(s, p); });
    }
    const out = {};
    probs.forEach((p, i) => { out['p' + Math.round(p * 100)] = res[i]; });
    return out;
  }

  // share of members that fall below the (daily) threshold at least once, and median first-crossing day
  function crossing(traj, threshold) {
    const first = [];
    for (const v of traj) {
      for (let t = 0; t < v.length; t++) {
        if (v[t] < threshold[t]) { first.push(t); break; }
      }
    }
    first.sort((a, b) => a - b);
    return { p: first.length / traj.length, medianFirst: first.length ? first[Math.floor((first.length - 1) / 2)] : null };
  }

  const api = { daysInMonth, dailyRelease, simulate, summarize, crossing };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TwinEngine = api;
})(this);
