"""
Extract the two real forecast windows the kiosk story needs, as a compact
embedded dataset (no runtime fetch -- this has to work standalone on an
unattended kiosk with no server).

Decision 1: init 2022-11 (V0 = observed Sau+Susqueda, real), horizon trimmed
            to the real 6-month ACA release window (2022-11 .. 2023-04, i.e.
            the period covered by that commission's approved plan).
Decision 2: init 2023-03 (continues from wherever the visitor's own decision-1
            trajectory lands, so V0 is NOT fixed here -- only the inflow
            ensemble and the real plan/outcome for 2023-03..2023-09 are needed).

"Real outcome" values are hardcoded from seasonal/bias_correction (already
computed, verified against observed balance) -- not re-derived at runtime.
"""
import json, os
import pandas as pd

ROOT = "/home/dmercado/Documents/NEREIDA/claude/main/"
A = "/home/dmercado/Documents/NEREIDA/documents/sessio3_cas_sequera/build/analysis/"
VMAX = 165.26 + 233

obs_monthly = pd.read_csv(A + "obs_ter_monthly.csv", parse_dates=["date"]).set_index("date")["Sau_in_m3s"]

def members(init, n_months):
    """Extract the inflow ensemble for one story window, bias-corrected so the
    ensemble mean matches the real observed inflow for these (now historical)
    months -- otherwise a single-instance SEAS5 miss (this window was 3x too
    wet / 2x too dry) would dominate the story over the player's own choices.
    Every member is scaled by the same ratio, so the 51-member spread survives."""
    q = pd.read_csv(f"{ROOT}seasonal/forecast/{init}/Q_ter_sau.csv", parse_dates=["dates"])
    mem = [c for c in q.columns if c.startswith("Qsim_")]
    months = [str(p) for p in pd.period_range(init, periods=n_months, freq="M")]
    q = q[q.dates.dt.to_period("M").astype(str) <= months[-1]].reset_index(drop=True)
    end = pd.Period(months[-1], "M")
    fc_mean = q[mem].values.mean()
    ob_mean = obs_monthly.loc[pd.Period(init, "M").start_time:end.end_time].mean()
    ratio = ob_mean / fc_mean
    print(f"  {init}: bias-correction ratio (real/forecast) = {ratio:.3f}")
    return {
        "months": months,
        "dates": q.dates.dt.strftime("%Y-%m-%d").tolist(),
        "Q": [[round(float(x) * ratio, 2) for x in q[c]] for c in mem],
    }

plans = pd.read_csv(A + "ter_release_plans.csv", index_col=0)
obs = pd.read_csv(A + "obs_ter_monthly.csv", parse_dates=["date"]).set_index("date").V_ter

def plan_for(months):
    return {"abast": [round(float(plans.loc[m, "abast"]), 2) for m in months],
            "reg": [round(float(plans.loc[m, "reg"]), 2) for m in months],
            "eco_hm3": [round(float(plans.loc[m, "eco_hm3"]), 2) for m in months]}

def obs_for(months):
    return [round(float(obs[pd.Period(m).to_timestamp()]), 1) for m in months]

d1 = members("2022-10", 6)   # 2022-10 .. 2023-03  (real session-33 commission window)
d2 = members("2023-04", 6)   # 2023-04 .. 2023-09  (real session-34 commission window)

# Susqueda local inflow (+ net evaporation/losses) climatology, hm3/month, 1995-2020 median.
# The GR4J inflow forecast only covers Sau; without this the balance is short by
# roughly this much every month (verified against observed Sau+Susqueda volume).
RESIDUAL = {1:2.08,2:2.22,3:3.18,4:2.96,5:4.78,6:1.17,7:0.55,8:1.5,9:2.66,10:2.43,11:2.48,12:2.73}
def residual_for(months): return [RESIDUAL[int(m[5:])] for m in months]

data = {
    "vmax": VMAX,
    "step1": {**d1, "V0": round(float(obs[pd.Timestamp("2022-10-01")]), 1),
              "plan": plan_for(d1["months"]), "obs": obs_for(d1["months"]), "residual": residual_for(d1["months"])},
    "step2": {**d2, "plan": plan_for(d2["months"]), "obs": obs_for(d2["months"]), "residual": residual_for(d2["months"])},
    # epilogue: real observed trajectory beyond what the visitor controls, through the historic low
    "epilogue": {
        "months": [str(p) for p in pd.period_range("2023-10", "2024-03", freq="M")],
        "obs": obs_for([str(p) for p in pd.period_range("2023-10", "2024-03", freq="M")] + ["2024-04"])[:-1],
        "min_date": "8 de març de 2024", "min_pct": round(100 * 50.21 / VMAX, 1),
        "emergency_date": "1 de febrer de 2024",
    },
}
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "story_data.json")
json.dump(data, open(out, "w"), separators=(",", ":"), ensure_ascii=False)
print("wrote", out, os.path.getsize(out), "bytes")
print("step1 V0:", data["step1"]["V0"], "| months:", data["step1"]["months"])
print("step1 real plan totals:", [round(a+r+e,1) for a,r,e in zip(data["step1"]["plan"]["abast"],data["step1"]["plan"]["reg"],data["step1"]["plan"]["eco_hm3"])])
print("step1 obs (incl May23):", data["step1"]["obs"])
print("step2 real plan totals:", [round(a+r+e,1) for a,r,e in zip(data["step2"]["plan"]["abast"],data["step2"]["plan"]["reg"],data["step2"]["plan"]["eco_hm3"])])
print("step2 obs (incl Oct23):", data["step2"]["obs"])
print("epilogue:", data["epilogue"])
