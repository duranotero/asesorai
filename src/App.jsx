import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

// ============================================================
//  ASESOR FINANCIERO · Supabase + Netlify · multiusuario
//  Registro abierto · datos privados por usuario (RLS)
// ============================================================

const N = "\u00f1";
const A1 = "\u00e1", E1 = "\u00e9", I1 = "\u00ed", O1 = "\u00f3";

const CHF = (n) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF" }).format(
    isFinite(n) ? n : 0
  );

const C = {
  bg: "#F4F6F9", surface: "#FFFFFF", navy: "#0F2A4A", navy2: "#1B3A5C",
  line: "#E2E8F0", ink: "#1E293B", muted: "#64748B", accent: "#2563EB",
  green: "#15803D", red: "#B91C1C", amber: "#B45309",
};

const CATS = ["Vivienda", "Esencial", "Salud", "Transporte", "Discrecional", "Otro"];

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!authReady) return <Splash text="Cargando\u2026" />;
  if (!session) return <Auth />;
  return <Dashboard session={session} />;
}

// ----------------------------- AUTH -----------------------------
function Auth() {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setMsg(""); setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password: pass });
        if (error) throw error;
        setMsg("Cuenta creada. Revisa tu correo si se pide confirmaci" + O1 + "n, o inicia sesi" + O1 + "n.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
      }
    } catch (e) {
      setMsg(e.message || "Ocurri" + O1 + " un error.");
    } finally { setBusy(false); }
  };

  return (
    <Shell>
      <div style={{ maxWidth: 400, margin: "60px auto", padding: "0 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: C.accent, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 24, margin: "0 auto 12px" }}>F</div>
          <h1 style={{ margin: 0, fontSize: 22, color: C.navy }}>Asesor Financiero</h1>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 6 }}>
            {mode === "login" ? "Inicia sesi" + O1 + "n en tu cuenta" : "Crea tu cuenta gratuita"}
          </p>
        </div>
        <div className="card shadow" style={{ padding: 22 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="Correo electr{}">
              <Inp ph="tucorreo@ejemplo.com" v={email} on={setEmail} full type="email" />
            </Field>
            <Field label="Contrase{}">
              <Inp ph={"M" + I1 + "nimo 6 caracteres"} v={pass} on={setPass} full type="password" />
            </Field>
            <button onClick={submit} disabled={busy || !email || !pass} style={btnPrimary}>
              {busy ? "Procesando\u2026" : mode === "login" ? "Entrar" : "Crear cuenta"}
            </button>
          </div>
          {msg && <div style={{ marginTop: 12, fontSize: 13.5, color: C.accent }}>{msg}</div>}
          <div style={{ marginTop: 16, textAlign: "center", fontSize: 13.5, color: C.muted }}>
            {mode === "login" ? "\u00bfNo tienes cuenta? " : "\u00bfYa tienes cuenta? "}
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(""); }}
              style={{ border: "none", background: "none", color: C.accent, cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}>
              {mode === "login" ? "Reg" + I1 + "strate" : "Inicia sesi" + O1 + "n"}
            </button>
          </div>
        </div>
        <p style={{ fontSize: 12, color: C.muted, textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
          Tus datos se guardan de forma privada y solo t{U()} puedes verlos.
        </p>
      </div>
    </Shell>
  );
}
function U() { return "\u00fa"; }

// ----------------------------- DASHBOARD -----------------------------
function Dashboard({ session }) {
  const userId = session.user.id;
  const [tab, setTab] = useState("panel");
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({ ingreso: 0, pago_extra: 0, estrategia: "avalanche", meta_nombre: "Fondo de emergencia", meta_objetivo: 0, meta_ahorrado: 0 });
  const [debts, setDebts] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [{ data: p }, { data: d }, { data: g }] = await Promise.all([
      supabase.from("perfiles").select("*").eq("id", userId).single(),
      supabase.from("deudas").select("*").eq("user_id", userId).order("creado_en"),
      supabase.from("gastos").select("*").eq("user_id", userId).order("creado_en"),
    ]);
    if (p) setProfile(p);
    setDebts(d || []);
    setExpenses(g || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const saveProfile = async (patch) => {
    const next = { ...profile, ...patch };
    setProfile(next);
    await supabase.from("perfiles").update(patch).eq("id", userId);
  };

  // Deudas
  const addDebt = async (deuda) => {
    const { data } = await supabase.from("deudas").insert({ ...deuda, user_id: userId }).select().single();
    if (data) setDebts((x) => [...x, data]);
  };
  const updateDebt = async (id, patch) => {
    setDebts((x) => x.map((d) => d.id === id ? { ...d, ...patch } : d));
    await supabase.from("deudas").update(patch).eq("id", id);
  };
  const deleteDebt = async (id) => {
    setDebts((x) => x.filter((d) => d.id !== id));
    await supabase.from("deudas").delete().eq("id", id);
  };

  // Gastos
  const addExpense = async (gasto) => {
    const { data } = await supabase.from("gastos").insert({ ...gasto, user_id: userId }).select().single();
    if (data) setExpenses((x) => [...x, data]);
  };
  const updateExpense = async (id, patch) => {
    setExpenses((x) => x.map((e) => e.id === id ? { ...e, ...patch } : e));
    await supabase.from("gastos").update(patch).eq("id", id);
  };
  const deleteExpense = async (id) => {
    setExpenses((x) => x.filter((e) => e.id !== id));
    await supabase.from("gastos").delete().eq("id", id);
  };

  const totals = useMemo(() => {
    const totalDebt = debts.reduce((s, d) => s + (+d.saldo || 0), 0);
    const totalMin = debts.reduce((s, d) => s + (+d.minimo || 0), 0);
    const totalExp = expenses.reduce((s, e) => s + (+e.monto || 0), 0);
    const freeCash = (+profile.ingreso || 0) - totalExp - totalMin;
    return { totalDebt, totalMin, totalExp, freeCash };
  }, [debts, expenses, profile.ingreso]);

  const pool = Math.max(totals.freeCash, 0) + (+profile.pago_extra || 0);

  return (
    <Shell>
      <div style={{ background: C.navy, color: "#fff" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: C.accent, display: "grid", placeItems: "center", fontWeight: 700, flexShrink: 0 }}>F</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Asesor Financiero</div>
            <div style={{ fontSize: 11.5, color: "#9DB4CE", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user.email}</div>
          </div>
          <button onClick={() => supabase.auth.signOut()} style={{ border: "1px solid #ffffff33", background: "transparent", color: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer" }}>Salir</button>
        </div>
      </div>

      <div className="wrap">
        <Nav tab={tab} setTab={setTab} />
        {loading ? <div style={{ color: C.muted, padding: 30, textAlign: "center" }}>Cargando tus datos\u2026</div> : (
          <div key={tab} style={{ animation: "fade .25s ease" }}>
            {tab === "panel" && <Panel totals={totals} debts={debts} profile={profile} pool={pool} />}
            {tab === "deudas" && <Deudas debts={debts} addDebt={addDebt} updateDebt={updateDebt} deleteDebt={deleteDebt} pool={pool} profile={profile} saveProfile={saveProfile} />}
            {tab === "gastos" && <Gastos expenses={expenses} addExpense={addExpense} updateExpense={updateExpense} deleteExpense={deleteExpense} profile={profile} saveProfile={saveProfile} />}
            {tab === "metas" && <Metas profile={profile} saveProfile={saveProfile} pool={pool} />}
            {tab === "ia" && <Asesor profile={profile} debts={debts} expenses={expenses} totals={totals} />}
          </div>
        )}
      </div>
    </Shell>
  );
}

function Nav({ tab, setTab }) {
  const items = [["panel", "Resumen"], ["deudas", "Deudas"], ["gastos", "Gastos"], ["metas", "Metas"], ["ia", "Asesor IA"]];
  return (
    <nav style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${C.line}`, flexWrap: "wrap" }}>
      {items.map(([k, l]) => (
        <button key={k} onClick={() => setTab(k)}
          style={{ border: "none", background: "transparent", padding: "11px 14px", fontSize: 14.5, cursor: "pointer", color: tab === k ? C.accent : C.muted, fontWeight: tab === k ? 600 : 500, borderBottom: `2px solid ${tab === k ? C.accent : "transparent"}`, marginBottom: -1 }}>{l}</button>
      ))}
    </nav>
  );
}

function Panel({ totals, debts, profile, pool }) {
  const ingreso = +profile.ingreso || 0;
  const health = totals.freeCash > ingreso * 0.2 ? { t: "Saludable", c: C.green }
    : totals.freeCash > 0 ? { t: "Ajustado", c: C.amber } : { t: "En riesgo", c: C.red };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        <Card title="Deuda total" big={CHF(totals.totalDebt)} sub={`${debts.length} cuentas`} c={C.red} />
        <Card title="Gastos mensuales" big={CHF(totals.totalExp)} c={C.ink} />
        <Card title="Dinero libre / mes" big={CHF(totals.freeCash)} sub={health.t} c={health.c} />
        <Card title="Asignable a deuda" big={CHF(pool)} sub="libre + extra" c={C.accent} />
      </div>
      <div className="card shadow" style={{ padding: 20, marginTop: 16 }}>
        <Label>Diagn{O1}stico</Label>
        <p style={{ margin: 0, lineHeight: 1.65 }}>
          {totals.freeCash > 0
            ? <>Tras cubrir gastos y m{I1}nimos dispones de <b style={{ color: C.green }}>{CHF(totals.freeCash)}</b> al mes para amortizar deuda o ahorrar.</>
            : ingreso === 0
              ? <>A{N}ade tu ingreso mensual en la pesta{N}a <b>Gastos</b> para ver tu diagn{O1}stico.</>
              : <>Tus obligaciones superan tu ingreso en <b style={{ color: C.red }}>{CHF(-totals.freeCash)}</b>. Revisa el gasto discrecional.</>}
        </p>
      </div>
      <div className="card shadow" style={{ padding: 20, marginTop: 14 }}>
        <Label>Meta: {profile.meta_nombre}</Label>
        <Bar pct={profile.meta_objetivo ? Math.min((profile.meta_ahorrado / profile.meta_objetivo) * 100, 100) : 0} c={C.accent} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted, marginTop: 6 }}>
          <span>{CHF(profile.meta_ahorrado)} ahorrado</span><span>objetivo {CHF(profile.meta_objetivo)}</span>
        </div>
      </div>
    </div>
  );
}

function Deudas({ debts, addDebt, updateDebt, deleteDebt, pool, profile, saveProfile }) {
  const [f, setF] = useState({ nombre: "", saldo: "", tasa: "", minimo: "" });
  const [editId, setEditId] = useState(null);
  const [editF, setEditF] = useState({});
  const strategy = profile.estrategia;

  const add = () => {
    if (!f.nombre || !f.saldo) return;
    addDebt({ nombre: f.nombre, saldo: +f.saldo, tasa: +f.tasa || 0, minimo: +f.minimo || 0 });
    setF({ nombre: "", saldo: "", tasa: "", minimo: "" });
  };
  const del = (id) => { if (confirm("\u00bfEliminar esta deuda?")) deleteDebt(id); };
  const startEdit = (d) => { setEditId(d.id); setEditF({ ...d }); };
  const saveEdit = () => {
    updateDebt(editId, { nombre: editF.nombre, saldo: +editF.saldo, tasa: +editF.tasa || 0, minimo: +editF.minimo || 0 });
    setEditId(null);
  };

  const plan = useMemo(() => buildPayoff(debts, pool, strategy), [debts, pool, strategy]);
  const alt = useMemo(() => buildPayoff(debts, pool, strategy === "avalanche" ? "snowball" : "avalanche"), [debts, pool, strategy]);

  return (
    <div>
      <div className="card shadow" style={{ padding: 18, marginBottom: 14 }}>
        <Label>Estrategia de pago</Label>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <Toggle active={strategy === "avalanche"} onClick={() => saveProfile({ estrategia: "avalanche" })} title="Avalancha" sub={`Mayor inter${E1}s primero`} />
          <Toggle active={strategy === "snowball"} onClick={() => saveProfile({ estrategia: "snowball" })} title="Bola de nieve" sub="Saldo menor primero" />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13.5, color: C.muted }}>Pago extra mensual:</span>
          <Inp ph="CHF" v={profile.pago_extra} on={(v) => saveProfile({ pago_extra: +v || 0 })} num />
        </div>
      </div>

      <Label>Tus deudas</Label>
      {debts.length === 0 && <Empty text={"A" + N + "ade tu primera deuda abajo."} />}
      {debts.map((d) => (
        <div key={d.id} className="card shadow" style={{ padding: 14, marginBottom: 10 }}>
          {editId === d.id ? (
            <div style={{ display: "grid", gap: 8 }}>
              <Field label="Nombre"><Inp ph="Nombre" v={editF.nombre} on={(v) => setEditF({ ...editF, nombre: v })} full /></Field>
              <div style={{ display: "flex", gap: 8 }}>
                <Field label={`% inter${E1}s`}><Inp ph="%" v={editF.tasa} on={(v) => setEditF({ ...editF, tasa: v })} full num /></Field>
                <Field label={`M${I1}nimo`}><Inp ph="CHF" v={editF.minimo} on={(v) => setEditF({ ...editF, minimo: v })} full num /></Field>
              </div>
              <Field label="Saldo"><Inp ph="CHF" v={editF.saldo} on={(v) => setEditF({ ...editF, saldo: v })} full num /></Field>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveEdit} style={{ ...btnPrimary, flex: 1 }}>Guardar</button>
                <button onClick={() => setEditId(null)} style={{ ...btnGhost, flex: 1 }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15.5 }}>{d.nombre}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{d.tasa}% {"\u00b7"} m{I1}n {CHF(d.minimo)}</div>
                </div>
                <div className="mono" style={{ color: C.red, fontWeight: 700, fontSize: 16, whiteSpace: "nowrap" }}>{CHF(d.saldo)}</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => startEdit(d)} style={{ ...btnEdit, flex: 1 }}>Editar</button>
                <button onClick={() => del(d.id)} style={{ ...btnDelete, flex: 1 }}>Eliminar</button>
              </div>
            </>
          )}
        </div>
      ))}

      <div className="card shadow" style={{ padding: 14, marginTop: 4, marginBottom: 16, background: "#F8FAFC" }}>
        <Label>A{N}adir deuda</Label>
        <div style={{ display: "grid", gap: 8 }}>
          <Inp ph="Nombre" v={f.nombre} on={(v) => setF({ ...f, nombre: v })} full />
          <div style={{ display: "flex", gap: 8 }}>
            <Inp ph={`% inter${E1}s`} v={f.tasa} on={(v) => setF({ ...f, tasa: v })} full num />
            <Inp ph={`M${I1}nimo CHF`} v={f.minimo} on={(v) => setF({ ...f, minimo: v })} full num />
          </div>
          <Inp ph="Saldo CHF" v={f.saldo} on={(v) => setF({ ...f, saldo: v })} full num />
          <button onClick={add} style={btnPrimary}>+ A{N}adir deuda</button>
        </div>
      </div>

      {plan && debts.length > 0 && (
        <div className="card shadow" style={{ padding: 20 }}>
          <Label>Proyecci{O1}n {"\u00b7"} {strategy === "avalanche" ? "Avalancha" : "Bola de nieve"}</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 16, margin: "6px 0 14px" }}>
            <Metric label="Libre de deuda en" v={`${plan.months} meses`} c={C.green} />
            <Metric label="Intereses totales" v={CHF(plan.interest)} c={C.amber} />
            <Metric label="Frente a la otra" v={`${alt.months - plan.months >= 0 ? "ahorras " : "tardas "}${Math.abs(alt.months - plan.months)} m`} c={C.accent} />
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: 600 }}>Orden de pago:</div>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
            {plan.order.map((o) => <li key={o.id}><b>{o.name}</b> <span style={{ color: C.muted }}>{"\u2014"} {o.rate}% {"\u00b7"} {CHF(o.balance)}</span></li>)}
          </ol>
        </div>
      )}
    </div>
  );
}

function buildPayoff(debts, extra, strategy) {
  let bal = debts.filter((d) => +d.saldo > 0).map((d) => ({ id: d.id, name: d.nombre, balance: +d.saldo, rate: +d.tasa || 0, min: +d.minimo || 0 }));
  if (bal.length === 0) return null;
  const order = [...bal].sort((a, b) => strategy === "avalanche" ? b.rate - a.rate : a.balance - b.balance);
  let months = 0, interest = 0;
  while (bal.some((d) => d.balance > 0.5) && months < 600) {
    months++; let p = extra;
    bal.forEach((d) => { if (d.balance <= 0) return; const i = (d.balance * (d.rate / 100)) / 12; interest += i; d.balance += i; d.balance -= Math.min(d.min, d.balance); });
    for (const t of order) { const live = bal.find((d) => d.id === t.id); if (live && live.balance > 0) { const pay = Math.min(p, live.balance); live.balance -= pay; p -= pay; if (p <= 0) break; } }
  }
  return { months, interest: Math.round(interest), order: order.map((o) => ({ id: o.id, name: o.name, rate: o.rate, balance: o.balance })) };
}

function Gastos({ expenses, addExpense, updateExpense, deleteExpense, profile, saveProfile }) {
  const [f, setF] = useState({ nombre: "", monto: "", categoria: "Esencial" });
  const [editId, setEditId] = useState(null);
  const [editF, setEditF] = useState({});

  const add = () => { if (!f.nombre || !f.monto) return; addExpense({ nombre: f.nombre, monto: +f.monto, categoria: f.categoria }); setF({ nombre: "", monto: "", categoria: "Esencial" }); };
  const del = (id) => { if (confirm("\u00bfEliminar este gasto?")) deleteExpense(id); };
  const startEdit = (e) => { setEditId(e.id); setEditF({ ...e }); };
  const saveEdit = () => { updateExpense(editId, { nombre: editF.nombre, monto: +editF.monto, categoria: editF.categoria }); setEditId(null); };

  const total = expenses.reduce((s, e) => s + (+e.monto || 0), 0);
  const byCat = useMemo(() => { const m = {}; expenses.forEach((e) => (m[e.categoria] = (m[e.categoria] || 0) + (+e.monto || 0))); return m; }, [expenses]);
  const catColor = { Vivienda: C.navy2, Esencial: C.accent, Salud: C.green, Transporte: C.amber, Discrecional: C.red, Otro: C.muted };

  return (
    <div>
      <div className="card shadow" style={{ padding: 18, marginBottom: 14 }}>
        <Label>Ingreso mensual</Label>
        <Inp ph="CHF" v={profile.ingreso} on={(v) => saveProfile({ ingreso: +v || 0 })} num />
      </div>

      <Label>Gastos</Label>
      {expenses.length === 0 && <Empty text={"A" + N + "ade un gasto o sube un ticket arriba."} />}
      {expenses.map((e) => (
        <div key={e.id} className="card shadow" style={{ padding: 14, marginBottom: 10 }}>
          {editId === e.id ? (
            <div style={{ display: "grid", gap: 8 }}>
              <Field label="Concepto"><Inp ph="Concepto" v={editF.nombre} on={(v) => setEditF({ ...editF, nombre: v })} full /></Field>
              <div style={{ display: "flex", gap: 8 }}>
                <Field label={`Categor${I1}a`}><Sel v={editF.categoria} on={(v) => setEditF({ ...editF, categoria: v })} opts={CATS} full /></Field>
                <Field label="Importe"><Inp ph="CHF" v={editF.monto} on={(v) => setEditF({ ...editF, monto: v })} full num /></Field>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveEdit} style={{ ...btnPrimary, flex: 1 }}>Guardar</button>
                <button onClick={() => setEditId(null)} style={{ ...btnGhost, flex: 1 }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15.5 }}>{e.nombre}</div>
                  <span style={{ fontSize: 12, padding: "2px 9px", borderRadius: 20, background: `${catColor[e.categoria]}18`, color: catColor[e.categoria], fontWeight: 600, display: "inline-block", marginTop: 4 }}>{e.categoria}</span>
                </div>
                <div className="mono" style={{ fontWeight: 700, fontSize: 16, whiteSpace: "nowrap" }}>{CHF(e.monto)}</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => startEdit(e)} style={{ ...btnEdit, flex: 1 }}>Editar</button>
                <button onClick={() => del(e.id)} style={{ ...btnDelete, flex: 1 }}>Eliminar</button>
              </div>
            </>
          )}
        </div>
      ))}

      <div className="card shadow" style={{ padding: 14, marginTop: 4, marginBottom: 16, background: "#F8FAFC" }}>
        <Label>A{N}adir gasto</Label>
        <div style={{ display: "grid", gap: 8 }}>
          <Inp ph="Concepto" v={f.nombre} on={(v) => setF({ ...f, nombre: v })} full />
          <div style={{ display: "flex", gap: 8 }}>
            <Sel v={f.categoria} on={(v) => setF({ ...f, categoria: v })} opts={CATS} full />
            <Inp ph="CHF" v={f.monto} on={(v) => setF({ ...f, monto: v })} full num />
          </div>
          <button onClick={add} style={btnPrimary}>+ A{N}adir gasto</button>
        </div>
      </div>

      {total > 0 && (
        <div className="card shadow" style={{ padding: 20 }}>
          <Label>Distribuci{O1}n por categor{I1}a</Label>
          {Object.entries(byCat).map(([cat, amt]) => (
            <div key={cat} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 4 }}>
                <span style={{ fontWeight: 500 }}>{cat}</span>
                <span className="mono" style={{ color: C.muted }}>{CHF(amt)} {"\u00b7"} {Math.round((amt / total) * 100)}%</span>
              </div>
              <Bar pct={(amt / total) * 100} c={catColor[cat]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metas({ profile, saveProfile, pool }) {
  const remaining = Math.max((+profile.meta_objetivo || 0) - (+profile.meta_ahorrado || 0), 0);
  const monthsToGoal = pool > 0 ? Math.ceil(remaining / pool) : Infinity;
  return (
    <div>
      <div className="card shadow" style={{ padding: 20 }}>
        <Label>Meta de ahorro</Label>
        <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
          <Field label="Nombre de la meta"><Inp ph="Ej. Fondo de emergencia" v={profile.meta_nombre} on={(v) => saveProfile({ meta_nombre: v })} full /></Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Objetivo (CHF)"><Inp ph="9000" v={profile.meta_objetivo} on={(v) => saveProfile({ meta_objetivo: +v || 0 })} full num /></Field>
            <Field label="Ahorrado (CHF)"><Inp ph="1200" v={profile.meta_ahorrado} on={(v) => saveProfile({ meta_ahorrado: +v || 0 })} full num /></Field>
          </div>
        </div>
        <Bar pct={profile.meta_objetivo ? Math.min((profile.meta_ahorrado / profile.meta_objetivo) * 100, 100) : 0} c={C.accent} h={12} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 16, marginTop: 18 }}>
          <Metric label="Falta" v={CHF(remaining)} c={C.amber} />
          <Metric label="A tu ritmo" v={isFinite(monthsToGoal) ? `${monthsToGoal} meses` : "\u2014"} c={C.green} />
          <Metric label="Destinando" v={`${CHF(pool)}/mes`} c={C.accent} />
        </div>
      </div>
      <div className="card shadow" style={{ padding: 20, marginTop: 14 }}>
        <Label>Recomendaci{O1}n</Label>
        <p style={{ margin: 0, lineHeight: 1.65 }}>Un fondo de emergencia recomendable cubre entre 3 y 6 meses de gastos. Una vez constituido, conviene redirigir ese flujo hacia las deudas de mayor inter{E1}s.</p>
      </div>
    </div>
  );
}

function Asesor({ profile, debts, expenses, totals }) {
  const [msgs, setMsgs] = useState([{ role: "assistant", text: "Buenas. Dispongo de tus deudas, gastos, ingresos, estrategia y meta. \u00bfEn qu\u00e9 te ayudo?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  const send = async (preset) => {
    const q = preset || input.trim();
    if (!q || loading) return;
    const next = [...msgs, { role: "user", text: q }];
    setMsgs(next); setInput(""); setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/asesor", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
          context: { ingreso: profile.ingreso, estrategia: profile.estrategia, totalExp: totals.totalExp, totalDebt: totals.totalDebt, freeCash: totals.freeCash, debts: debts.map((d) => ({ nombre: d.nombre, saldo: d.saldo, tasa: d.tasa, minimo: d.minimo })), expenses: expenses.map((e) => ({ nombre: e.nombre, monto: e.monto, categoria: e.categoria })), meta: { nombre: profile.meta_nombre, objetivo: profile.meta_objetivo, ahorrado: profile.meta_ahorrado } },
        }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "assistant", text: data.text || "No pude responder. Intenta de nuevo." }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "Error de conexi\u00f3n. Intenta de nuevo." }]);
    } finally { setLoading(false); }
  };
  const presets = ["Plan para salir de deudas", `\u00bfD${O1}nde recorto gastos?`, "\u00bfAvalancha o bola de nieve?"];

  return (
    <div className="card shadow" style={{ padding: 16 }}>
      <Label>Asesor IA</Label>
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, height: 380, overflowY: "auto", padding: 14, background: "#FBFCFE", display: "flex", flexDirection: "column" }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
            <div style={{ maxWidth: "85%", borderRadius: 12, padding: "10px 13px", whiteSpace: "pre-wrap", lineHeight: 1.55, fontSize: 14.5, background: m.role === "user" ? C.navy : "#fff", color: m.role === "user" ? "#fff" : C.ink, border: m.role === "user" ? "none" : `1px solid ${C.line}` }}>{m.text}</div>
          </div>
        ))}
        {loading && <div style={{ color: C.muted, fontSize: 14 }}>El asesor est{A1} redactando{"\u2026"}</div>}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        {presets.map((p) => <button key={p} onClick={() => send(p)} disabled={loading} style={{ border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff", color: C.ink, padding: "8px 12px", fontSize: 13, cursor: "pointer" }}>{p}</button>)}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Escribe tu pregunta\u2026" style={{ flex: 1, minWidth: 0, border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff", color: C.ink, padding: "11px 13px", fontSize: 15 }} />
        <button onClick={() => send()} disabled={loading} style={btnPrimary}>Enviar</button>
      </div>
    </div>
  );
}

// ---- UI helpers ----
function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
        *{box-sizing:border-box;} body{margin:0;}
        input,select,button,textarea{font-family:'IBM Plex Sans',system-ui,sans-serif;}
        ::placeholder{color:${C.muted};}
        .mono{font-family:'IBM Plex Mono',monospace;}
        @keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .card{background:${C.surface};border:1px solid ${C.line};border-radius:12px;}
        .shadow{box-shadow:0 1px 3px rgba(15,42,74,.08),0 1px 2px rgba(15,42,74,.04);}
        button:disabled{opacity:.5;cursor:not-allowed;}
        .wrap{max-width:1120px;margin:0 auto;padding:20px 16px 80px;}
      `}</style>
      {children}
    </div>
  );
}
function Splash({ text }) { return <Shell><div style={{ padding: 60, textAlign: "center", color: C.muted }}>{text}</div></Shell>; }
function Empty({ text }) { return <div style={{ padding: 18, textAlign: "center", color: C.muted, fontSize: 14, border: `1px dashed ${C.line}`, borderRadius: 10, marginBottom: 10 }}>{text}</div>; }
function Label({ children }) { return <div style={{ fontSize: 12.5, fontWeight: 700, color: C.navy, textTransform: "uppercase", letterSpacing: .5, marginBottom: 12 }}>{children}</div>; }
function Field({ label, children }) { return <label style={{ display: "block", flex: 1, minWidth: 0 }}><span style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 4 }}>{label}</span>{children}</label>; }
function Card({ title, big, sub, c }) { return <div className="card shadow" style={{ padding: 16 }}><div style={{ fontSize: 12.5, color: C.muted }}>{title}</div><div className="mono" style={{ fontSize: 21, fontWeight: 600, marginTop: 6, color: c, wordBreak: "break-word" }}>{big}</div>{sub && <div style={{ fontSize: 12, color: c, marginTop: 4, fontWeight: 500 }}>{sub}</div>}</div>; }
function Toggle({ active, onClick, title, sub }) { return <button onClick={onClick} style={{ flex: 1, minWidth: 150, textAlign: "left", cursor: "pointer", borderRadius: 10, padding: "12px 14px", background: active ? "#EFF6FF" : "#fff", border: `1.5px solid ${active ? C.accent : C.line}`, color: C.ink }}><div style={{ fontSize: 14.5, fontWeight: 600, color: active ? C.accent : C.ink }}>{title}</div><div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>{sub}</div></button>; }
function Metric({ label, v, c }) { return <div><div style={{ fontSize: 12.5, color: C.muted }}>{label}</div><div className="mono" style={{ fontSize: 18, fontWeight: 600, color: c, marginTop: 4 }}>{v}</div></div>; }
function Bar({ pct, c, h = 8 }) { return <div style={{ height: h, background: "#EEF2F7", borderRadius: 99, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.max(0, Math.min(pct, 100))}%`, background: c, borderRadius: 99, transition: "width .4s" }} /></div>; }
function Inp({ ph, v, on, num, full, type }) { return <input value={v} onChange={(e) => on(e.target.value)} placeholder={ph} type={type || "text"} inputMode={num ? "decimal" : undefined} style={{ border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff", color: C.ink, padding: "10px 12px", fontSize: 15, width: full ? "100%" : 140, minWidth: 0 }} />; }
function Sel({ v, on, opts, full }) { return <select value={v} onChange={(e) => on(e.target.value)} style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px", background: "#fff", color: C.ink, fontSize: 15, width: full ? "100%" : "auto", minWidth: 0 }}>{opts.map((o) => <option key={o}>{o}</option>)}</select>; }
const btnPrimary = { border: "none", borderRadius: 8, background: C.accent, color: "#fff", padding: "11px 16px", fontSize: 14.5, cursor: "pointer", fontWeight: 600 };
const btnGhost = { border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff", color: C.muted, padding: "11px 14px", fontSize: 14.5, cursor: "pointer", fontWeight: 500 };
const btnEdit = { border: `1px solid ${C.accent}`, borderRadius: 8, background: "#EFF6FF", color: C.accent, padding: "10px 14px", fontSize: 14, cursor: "pointer", fontWeight: 600 };
const btnDelete = { border: `1px solid #FCA5A5`, borderRadius: 8, background: "#FEF2F2", color: C.red, padding: "10px 14px", fontSize: 14, cursor: "pointer", fontWeight: 600 };
