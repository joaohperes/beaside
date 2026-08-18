#!/usr/bin/env node
/**
 * calc-dhe.mjs — a aritmética das prescrições de distúrbios hidroeletrolíticos.
 *
 * Regra da casa: nenhuma vazão em mL/h, nenhum mEq por ampola e nenhuma
 * concentração final entra numa página escrita à mão. Tudo sai daqui.
 *
 * Rodar:  node scripts/calc-dhe.mjs
 *
 * As apresentações são as brasileiras usuais; a página sempre manda o leitor
 * conferir a da própria farmácia, porque elas variam entre serviços.
 */

const PM = { NaCl: 58.44, KCl: 74.55, MgSO4_7H2O: 246.5, glucCa: 430.4, CaCl2_2H2O: 147.0 };
const EQ = { Ca_mg_por_mEq: 20.04, Mg_mg_por_mmol: 24.305 };

const r = (n, c = 2) => Number(n.toFixed(c));
const linha = (k, v) => console.log(`  ${k.padEnd(46)} ${v}`);
const titulo = (t) => console.log(`\n${'─'.repeat(72)}\n${t}\n${'─'.repeat(72)}`);

/* ── 1. Sódio ─────────────────────────────────────────────────────────── */
titulo('1 · SÓDIO — apresentações e preparo do NaCl 3%');

const naCl20_mEq_mL = (200 / PM.NaCl);            // 20 g/100 mL = 200 g/L
const naCl09_mEq_mL = (9 / PM.NaCl);              // 0,9 g/100 mL = 9 g/L
const naCl3_mEq_L   = (30 / PM.NaCl) * 1000;      // 3 g/100 mL = 30 g/L

linha('NaCl 20% — mEq Na/mL', r(naCl20_mEq_mL));
linha('NaCl 20% — mEq por ampola de 10 mL', r(naCl20_mEq_mL * 10, 1));
linha('SF 0,9% — mEq Na/mL', r(naCl09_mEq_mL, 3));
linha('NaCl 3% de referência — mEq Na/L', r(naCl3_mEq_L, 1));

function preparo3pct(volSF, volNaCl20) {
  const total = volSF + volNaCl20;
  const mEq = volSF * naCl09_mEq_mL + volNaCl20 * naCl20_mEq_mL;
  const mEq_L = (mEq / total) * 1000;
  const pct = (mEq_L * PM.NaCl) / 1000 / 10;      // mEq/L → g/L → g/100 mL
  return { total, mEq: r(mEq, 1), mEq_mL: r(mEq / total, 3), mEq_L: r(mEq_L, 1), pct: r(pct, 2) };
}

const usual = preparo3pct(440, 60);
linha('PREPARO USUAL  SF 440 mL + NaCl 20% 60 mL', `${usual.mEq} mEq / ${usual.total} mL = ${usual.mEq_mL} mEq/mL`);
linha('  → concentração equivalente', `${usual.mEq_L} mEq/L  =  NaCl ${usual.pct}%`);

// qual combinação dá 3,0% exatos em 500 mL?
const alvo_mEq = (naCl3_mEq_L / 1000) * 500;
const x = (alvo_mEq - 500 * naCl09_mEq_mL) / (naCl20_mEq_mL - naCl09_mEq_mL);
const exato = preparo3pct(500 - Math.round(x), Math.round(x));
linha('PREPARO 3,0% EXATO em 500 mL', `SF ${500 - Math.round(x)} mL + NaCl 20% ${Math.round(x)} mL`);
linha('  → concentração', `${exato.mEq_L} mEq/L  =  NaCl ${exato.pct}%`);

console.log('\n  Bolus de resgate (hiponatremia sintomática grave):');
for (const vol of [100, 150]) {
  linha(`  ${vol} mL do preparo usual (${usual.mEq_mL} mEq/mL)`, `${r(vol * usual.mEq_mL, 1)} mEq de Na`);
  linha(`  ${vol} mL de NaCl 3,0% de referência`, `${r(vol * naCl3_mEq_L / 1000, 1)} mEq de Na`);
}

console.log('\n  Teto de correção (hiponatremia crônica):');
linha('  máximo em 24 h', '8–10 mEq/L (usar 8 como alvo de segurança)');
linha('  máximo em 48 h', '18 mEq/L');
linha('  ritmo médio que respeita 8/24 h', `${r(8 / 24, 2)} mEq/L/h`);

/* ── 2. Potássio ──────────────────────────────────────────────────────── */
titulo('2 · POTÁSSIO — apresentação, concentração e vazão');

const kcl191_mEq_mL = (191 / PM.KCl);             // 19,1 g/100 mL = 191 g/L
linha('KCl 19,1% — mEq K/mL', r(kcl191_mEq_mL));
linha('KCl 19,1% — mEq por ampola de 10 mL', r(kcl191_mEq_mL * 10, 1));

function bolsaK({ mEq, volume }) {
  const mL_kcl = mEq / kcl191_mEq_mL;
  const conc_mEq_L = (mEq / volume) * 1000;
  const conc_mEq_mL = mEq / volume;
  return { mL_kcl: r(mL_kcl, 1), conc_mEq_L: r(conc_mEq_L, 1), conc_mEq_mL };
}
function vazaoK(conc_mEq_mL, mEq_h) { return r(mEq_h / conc_mEq_mL, 0); }

console.log('\n  PERIFÉRICA — teto de 40 mEq/L e 10 mEq/h:');
const per = bolsaK({ mEq: 20, volume: 500 });
linha('  SF 0,9% 500 mL + KCl 19,1%', `${per.mL_kcl} mL  →  20 mEq  (${per.conc_mEq_L} mEq/L)`);
linha('  vazão para 10 mEq/h', `${vazaoK(per.conc_mEq_mL, 10)} mL/h  (bolsa corre em 2 h)`);
linha('  vazão para 5 mEq/h', `${vazaoK(per.conc_mEq_mL, 5)} mL/h`);

console.log('\n  CENTRAL — concentrada, em bomba, com monitor:');
const cen = bolsaK({ mEq: 20, volume: 100 });
linha('  SF 0,9% 100 mL + KCl 19,1%', `${cen.mL_kcl} mL  →  20 mEq  (${cen.conc_mEq_L} mEq/L)`);
linha('  vazão para 10 mEq/h', `${vazaoK(cen.conc_mEq_mL, 10)} mL/h`);
linha('  vazão para 20 mEq/h (teto)', `${vazaoK(cen.conc_mEq_mL, 20)} mL/h`);

console.log('\n  Regra de bolso do déficit (estimativa grosseira, não prescrição):');
linha('  queda de ~0,3 mEq/L no K sérico', '≈ 100 mEq de déficit corporal total');

/* ── 3. Magnésio ──────────────────────────────────────────────────────── */
titulo('3 · MAGNÉSIO — MgSO4 50%');

const mg_mmol_mL = 500 / PM.MgSO4_7H2O;           // 50 g/100 mL = 500 mg/mL
const mg_mEq_mL = mg_mmol_mL * 2;                 // Mg2+ → 2 mEq por mmol
linha('MgSO4 50% — mg de sal/mL', 500);
linha('MgSO4 50% — mmol Mg/mL', r(mg_mmol_mL));
linha('MgSO4 50% — mEq Mg/mL', r(mg_mEq_mL));
linha('MgSO4 50% — mg de Mg elementar/mL', r(mg_mmol_mL * EQ.Mg_mg_por_mmol, 1));
linha('ampola de 10 mL', `5 g de sal  =  ${r(mg_mEq_mL * 10, 1)} mEq  =  ${r(mg_mmol_mL * 10 * EQ.Mg_mg_por_mmol, 0)} mg de Mg elementar`);

console.log('\n  Reposição sintomática/grave (1–2 g em 100 mL, 20 min a 1 h):');
for (const g of [1, 2]) {
  const mL = g * 2;                                // 500 mg/mL → 1 g = 2 mL
  linha(`  ${g} g de MgSO4 50%`, `${mL} mL  =  ${r(mL * mg_mEq_mL, 1)} mEq`);
}
linha('  1 g em 100 mL correndo em 20 min', `${r(100 / (20 / 60), 0)} mL/h`);
linha('  2 g em 100 mL correndo em 1 h', '100 mL/h');
linha('  torsades — 2 g em 10 min', `${r(100 / (10 / 60), 0)} mL/h (100 mL) — emergência`);

/* ── 4. Cálcio ────────────────────────────────────────────────────────── */
titulo('4 · CÁLCIO — gluconato 10% × cloreto 10%');

const gluc_Ca_mg_mL = 100 * (40.08 / PM.glucCa);
const gluc_Ca_mEq_mL = gluc_Ca_mg_mL / EQ.Ca_mg_por_mEq;
const cacl_Ca_mg_mL = 100 * (40.08 / PM.CaCl2_2H2O);
const cacl_Ca_mEq_mL = cacl_Ca_mg_mL / EQ.Ca_mg_por_mEq;

linha('Gluconato 10% — mg Ca elementar/mL', r(gluc_Ca_mg_mL));
linha('Gluconato 10% — mEq Ca/mL', r(gluc_Ca_mEq_mL, 3));
linha('Gluconato 10% — ampola de 10 mL', `${r(gluc_Ca_mg_mL * 10, 0)} mg de Ca  =  ${r(gluc_Ca_mEq_mL * 10, 2)} mEq`);
linha('Cloreto 10% — mg Ca elementar/mL', r(cacl_Ca_mg_mL));
linha('Cloreto 10% — ampola de 10 mL', `${r(cacl_Ca_mg_mL * 10, 0)} mg de Ca  =  ${r(cacl_Ca_mEq_mL * 10, 2)} mEq`);
linha('razão cloreto ÷ gluconato (Ca elementar)', `${r(cacl_Ca_mg_mL / gluc_Ca_mg_mL, 1)}×`);

console.log('\n  Hipocalcemia sintomática — 1–2 ampolas em 50–100 mL, 10–20 min:');
linha('  2 ampolas (20 mL) de gluconato', `${r(gluc_Ca_mg_mL * 20, 0)} mg de Ca  =  ${r(gluc_Ca_mEq_mL * 20, 1)} mEq`);
linha('  100 mL correndo em 20 min', `${r(100 / (20 / 60), 0)} mL/h`);
console.log('\n  Infusão contínua (hipocalcemia grave persistente):');
const infCa = { mg: 1000, vol: 500, h: 10 };       // ~1 mg/kg/h de Ca elementar em 70 kg
const ampolas = infCa.mg / (gluc_Ca_mg_mL * 10);
linha(`  ${infCa.mg} mg de Ca elementar em ${infCa.vol} mL`, `${r(ampolas, 1)} ampolas de gluconato`);
linha(`  correndo em ${infCa.h} h`, `${r(infCa.vol / infCa.h, 0)} mL/h  =  ${r(infCa.mg / infCa.h, 0)} mg de Ca/h`);

/* ── 5. Fósforo ───────────────────────────────────────────────────────── */
titulo('5 · FÓSFORO — e por que quem manda na velocidade é o potássio');

const fosfK = { P_mmol_mL: 3, K_mEq_mL: 4.4 };
const fosfNa = { P_mmol_mL: 3, Na_mEq_mL: 4 };
linha('Fosfato de K — por mL', `${fosfK.P_mmol_mL} mmol de P  +  ${fosfK.K_mEq_mL} mEq de K`);
linha('Fosfato de Na — por mL', `${fosfNa.P_mmol_mL} mmol de P  +  ${fosfNa.Na_mEq_mL} mEq de Na`);

console.log('\n  Reposição de 15 e 30 mmol de P com fosfato de POTÁSSIO:');
for (const mmolP of [15, 30]) {
  const mL = mmolP / fosfK.P_mmol_mL;
  const kTotal = mL * fosfK.K_mEq_mL;
  const hMin_perif = kTotal / 10;                  // teto periférico de 10 mEq/h
  const hMin_centr = kTotal / 20;                  // teto central de 20 mEq/h
  console.log(`\n    ${mmolP} mmol de P  →  ${r(mL, 1)} mL  →  arrasta ${r(kTotal, 1)} mEq de K`);
  linha('    tempo mínimo por via periférica (10 mEq/h)', `${r(hMin_perif, 1)} h`);
  linha('    tempo mínimo por via central (20 mEq/h)', `${r(hMin_centr, 1)} h`);
  const vol = 250, hUsual = 6;
  linha(`    em ${vol} mL correndo em ${hUsual} h`, `${r(vol / hUsual, 0)} mL/h  →  ${r(kTotal / hUsual, 1)} mEq de K/h`);
}

console.log('\n  Mesmos 30 mmol com fosfato de SÓDIO (quando o K não pode subir):');
const mLNa = 30 / fosfNa.P_mmol_mL;
linha('  30 mmol de P', `${r(mLNa, 1)} mL  →  arrasta ${r(mLNa * fosfNa.Na_mEq_mL, 1)} mEq de Na`);

/* ── 6. Neurocrítico — hipertônica concentrada como osmoterapia ───────── */
titulo('6 · NEUROCRÍTICO — hipertônica concentrada (osmoterapia, NÃO correção de hiponatremia)');

const naCl234_mEq_mL = (234 / PM.NaCl);           // 23,4 g/100 mL = 234 g/L
linha('NaCl 23,4% — mEq Na/mL', r(naCl234_mEq_mL));
linha('NaCl 20% — mEq Na/mL', r(naCl20_mEq_mL));

const bolus234 = 30;                               // bolus clássico da literatura
const mEq234 = bolus234 * naCl234_mEq_mL;
linha(`bolus clássico de 23,4% — ${bolus234} mL`, `${r(mEq234, 1)} mEq de Na`);
const equiv20 = mEq234 / naCl20_mEq_mL;
linha('mesmo Na com NaCl 20% (equivalência)', `${r(equiv20, 1)} mL  ≈  ${Math.round(equiv20 / 10)} ampolas de 10 mL`);

console.log('\n  Ampolas de NaCl 20% e o Na que cada uma entrega:');
for (const amp of [2, 3, 4]) {
  const mL = amp * 10;
  linha(`  ${amp} ampolas (${mL} mL)`, `${r(mL * naCl20_mEq_mL, 1)} mEq de Na`);
}

console.log('\n  Salina 3% em bolus de osmoterapia (alternativa diluída):');
for (const vol of [150, 250]) {
  linha(`  ${vol} mL de NaCl 3,0%`, `${r(vol * naCl3_mEq_L / 1000, 1)} mEq de Na`);
}

console.log('\n  Manitol 20% — para comparar a carga osmótica:');
linha('  frasco de 250 mL a 20%', '50 g');
linha('  1 g/kg em 70 kg', `${r(70 / (200 / 1000), 0)} mL do frasco a 20%  (${70} g)`);

console.log(`\n${'─'.repeat(72)}`);
console.log('Conferir SEMPRE a apresentação da farmácia do serviço antes de prescrever.');
console.log(`${'─'.repeat(72)}\n`);
