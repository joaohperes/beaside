/* rx-calc.js — as calculadoras das prescrições comentadas.
 *
 * Uma fonte só: os escores e as fórmulas moram aqui, e a página de
 * calculadoras apenas as renderiza. As prescrições linkam por âncora.
 *
 * Duas famílias:
 *   score   — caixas de seleção com peso, somadas e interpretadas por faixa;
 *   formula — campos numéricos, com uma função que devolve linhas de saída.
 *
 * Nenhuma delas decide conduta. Elas dizem o que o escore indica; o resto é
 * do médico que está com o paciente.
 */
(function () {
  'use strict';

  var n = function (v) { var x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : null; };
  var r = function (v, c) { return v === null ? '—' : Number(v.toFixed(c === undefined ? 1 : c)).toLocaleString('pt-BR'); };

  var CALCS = [

    /* ─── Universais ─────────────────────────────────────────────── */
    {
      id: 'clcr', grupo: 'Universais', nome: 'Clearance de creatinina (Cockcroft–Gault)',
      badge: 'ajuste de dose', tipo: 'formula',
      sub: 'É a fórmula em que a maioria das bulas baseia o ajuste renal — por isso ela, e não o eGFR do laboratório, é a que se usa para decidir dose.',
      campos: [
        { k: 'idade', l: 'Idade', u: 'anos' },
        { k: 'peso', l: 'Peso', u: 'kg', h: 'no obeso, considerar peso ajustado' },
        { k: 'cr', l: 'Creatinina', u: 'mg/dL' },
        { k: 'sexo', l: 'Sexo', tipo: 'select', op: [['1', 'Masculino'], ['0.85', 'Feminino']] }
      ],
      calc: function (v) {
        if (v.idade === null || v.peso === null || v.cr === null || !v.cr) return null;
        var cl = ((140 - v.idade) * v.peso) / (72 * v.cr) * (v.sexo || 1);
        var f = cl >= 50 ? 'Sem ajuste na maioria dos fármacos — conferir a bula mesmo assim.'
          : cl >= 30 ? 'Faixa de ajuste para vários fármacos (enoxaparina em dose plena ainda é 1 mg/kg 12/12 h; abaixo de 30 muda).'
            : cl >= 15 ? 'Ajuste obrigatório na maioria. Enoxaparina plena passa a 1 mg/kg 24/24 h; DOACs têm vetos.'
              : 'Função muito reduzida: HBPM em geral fora, preferir HNF; revisar TODO fármaco da prescrição.';
        return { linhas: [['ClCr estimado', r(cl, 1) + ' mL/min']], nota: f };
      },
      ref: 'Cockcroft DW, Gault MH. Prediction of creatinine clearance from serum creatinine. <em>Nephron.</em> 1976;16(1):31–41.'
    },
    {
      id: 'peso', grupo: 'Universais', nome: 'Peso ideal e peso ajustado',
      badge: 'dose por peso', tipo: 'formula',
      sub: 'Qual peso entra na conta muda a dose de verdade — volume na sepse, enoxaparina, aminoglicosídeo e volume-corrente usam pesos diferentes.',
      campos: [
        { k: 'altura', l: 'Altura', u: 'cm' },
        { k: 'peso', l: 'Peso real', u: 'kg' },
        { k: 'sexo', l: 'Sexo', tipo: 'select', op: [['50', 'Masculino'], ['45.5', 'Feminino']] }
      ],
      calc: function (v) {
        if (v.altura === null || v.peso === null) return null;
        var pol = (v.altura - 152.4) / 2.54;
        var pi = (v.sexo || 50) + 2.3 * pol;
        if (pi < 0) pi = 0;
        var paj = pi + 0.4 * (v.peso - pi);
        var imc = v.peso / Math.pow(v.altura / 100, 2);
        return {
          linhas: [
            ['IMC', r(imc, 1) + ' kg/m²'],
            ['Peso ideal (Devine)', r(pi, 1) + ' kg'],
            ['Peso ajustado', r(paj, 1) + ' kg']
          ],
          nota: imc >= 30
            ? 'IMC ≥ 30: use peso ajustado ou ideal onde a bula mandar (volume na sepse, aminoglicosídeo). Volume-corrente na ventilação usa SEMPRE o peso predito pela altura, nunca o real.'
            : 'Volume-corrente na ventilação usa o peso predito pela altura, não o real — mesmo no paciente magro.'
        };
      },
      ref: 'Devine BJ. Gentamicin therapy. <em>Drug Intell Clin Pharm.</em> 1974;8:650–655.'
    },
    {
      id: 'padua', grupo: 'Universais', nome: 'Escore de Pádua — risco de TEV',
      badge: '≥ 4 = alto risco', tipo: 'score',
      sub: 'Para o paciente clínico internado. Diz se há indicação de profilaxia farmacológica — não se este paciente deve recebê-la.',
      itens: [
        ['Câncer ativo (metástase, ou quimio/radioterapia nos últimos 6 meses)', 3],
        ['TEV prévio (exceto trombose venosa superficial)', 3],
        ['Mobilidade reduzida — restrito ao leito, com banheiro, por ≥ 3 dias', 3],
        ['Trombofilia conhecida', 3],
        ['Trauma ou cirurgia no último mês', 2],
        ['Idade ≥ 70 anos', 1],
        ['Insuficiência cardíaca e/ou respiratória', 1],
        ['Infarto agudo do miocárdio ou AVC isquêmico', 1],
        ['Infecção aguda e/ou doença reumatológica', 1],
        ['Obesidade (IMC ≥ 30)', 1],
        ['Terapia hormonal em curso', 1]
      ],
      faixas: [
        [4, 'alto', 'Alto risco de TEV', 'Indica profilaxia farmacológica. Antes de prescrever: sangramento, plaquetas, função renal, procedimento previsto — e se já há anticoagulação plena, não somar.'],
        [0, 'baixo', 'Baixo risco de TEV', 'Não indica profilaxia farmacológica de rotina. Reavaliar a cada mudança clínica: mobilidade, infecção nova ou procedimento mudam o resultado.']
      ],
      ref: 'Barbar S, Noventa F, Rossetto V, et al. <em>J Thromb Haemost.</em> 2010;8(11):2450–2457.'
    },
    {
      id: 'ulcera', grupo: 'Universais', nome: 'Profilaxia de úlcera de estresse',
      badge: '1 maior ou ≥ 2 menores', tipo: 'score', modo: 'maior-menor',
      sub: 'Não existe escore validado único. A regra prática dos consensos: um fator maior basta; dois ou mais menores costumam bastar. Sem fator, o dano supera o benefício.',
      itens: [
        ['Ventilação mecânica esperada por > 48 h', 1, 'maior'],
        ['Coagulopatia (plaquetas < 50.000, INR > 1,5 ou TTPa > 2× o controle)', 1, 'maior'],
        ['Choque, sepse ou vasopressor', 1, 'menor'],
        ['Úlcera péptica ou sangramento digestivo no último ano', 1, 'menor'],
        ['TCE, trauma raquimedular ou queimadura extensa', 1, 'menor'],
        ['Insuficiência hepática ou renal', 1, 'menor'],
        ['Corticoide em dose alta', 1, 'menor'],
        ['Permanência em UTI > 1 semana', 1, 'menor']
      ],
      ref: 'Cook DJ, Fuller HD, Guyatt GH, et al. <em>N Engl J Med.</em> 1994;330(6):377–381 — os dois fatores independentes. Os menores vêm de consensos posteriores.'
    },

    /* ─── Eletrólitos e metabólico ───────────────────────────────── */
    {
      id: 'na-corrigido', grupo: 'Eletrólitos e metabólico', nome: 'Sódio corrigido pela glicemia',
      badge: 'antes de tratar a hiponatremia', tipo: 'formula',
      sub: 'Na hiperglicemia, a água sai da célula e dilui o sódio. O sódio medido é falsamente baixo — corrigir antes de chamar de hiponatremia.',
      campos: [{ k: 'na', l: 'Sódio medido', u: 'mEq/L' }, { k: 'gli', l: 'Glicemia', u: 'mg/dL' }],
      calc: function (v) {
        if (v.na === null || v.gli === null) return null;
        var d = (v.gli - 100) / 100;
        var c16 = v.na + 1.6 * d, c24 = v.na + 2.4 * d;
        return {
          linhas: [['Corrigido (fator 1,6)', r(c16, 1) + ' mEq/L'], ['Corrigido (fator 2,4)', r(c24, 1) + ' mEq/L']],
          nota: c16 >= 135
            ? 'Corrigido dentro da faixa normal: a hiponatremia é translocacional (dilucional pela glicose), e o tratamento é da hiperglicemia — não é hiponatremia verdadeira.'
            : 'Mesmo corrigido, permanece baixo: há hiponatremia verdadeira somada. Seguir o fluxograma da hiponatremia. O fator 2,4 é o mais usado com glicemias muito altas.'
        };
      },
      ref: 'Hillier TA, Abbott RD, Barrett EJ. Hyponatremia: evaluating the correction factor for hyperglycemia. <em>Am J Med.</em> 1999;106(4):399–403.'
    },
    {
      id: 'osm', grupo: 'Eletrólitos e metabólico', nome: 'Osmolaridade sérica, efetiva e gap osmolar',
      badge: 'EHH e hiponatremia', tipo: 'formula',
      sub: 'A osmolaridade efetiva (tonicidade) é a que move água através da membrana — é ela que importa no estado hiperosmolar e na hiponatremia.',
      campos: [
        { k: 'na', l: 'Sódio', u: 'mEq/L' }, { k: 'gli', l: 'Glicemia', u: 'mg/dL' },
        { k: 'ur', l: 'Ureia', u: 'mg/dL', h: 'ureia, não nitrogênio ureico (BUN) — se o laudo trouxer BUN, multiplique por 2,14' }, { k: 'med', l: 'Osmolalidade medida', u: 'mOsm/kg', opcional: true }
      ],
      calc: function (v) {
        if (v.na === null || v.gli === null) return null;
        var ef = 2 * v.na + v.gli / 18;
        /* ureia (PM 60) → mOsm = ureia ÷ 6. O divisor 2,8 vale para BUN. */
        var tot = ef + (v.ur !== null ? v.ur / 6 : 0);
        var l = [['Osmolaridade efetiva (tonicidade)', r(ef, 1) + ' mOsm/L']];
        if (v.ur !== null) l.push(['Osmolaridade total calculada', r(tot, 1) + ' mOsm/L']);
        var nota = ef > 320 ? 'Osmolaridade efetiva > 320: faixa do estado hiperosmolar. Correção lenta — 3 a 8 mOsm/kg/h.'
          : ef > 300 ? 'Osmolaridade efetiva > 300: compatível com estado hiperosmolar se a glicose e o quadro fecharem.'
            : 'Osmolaridade efetiva normal ou baixa. Na hiponatremia, isso caracteriza a hipotônica verdadeira — siga o fluxograma.';
        if (v.med !== null && v.ur !== null) {
          var gap = v.med - tot;
          l.push(['Gap osmolar', r(gap, 1) + ' mOsm']);
          if (gap > 10) nota += ' Gap osmolar > 10 sugere osmol não medido — pense em álcoois tóxicos (metanol, etilenoglicol), cetoacidose alcoólica ou manitol.';
        }
        return { linhas: l, nota: nota };
      },
      ref: 'Spasovski G, et al. Clinical practice guideline on diagnosis and treatment of hyponatraemia. <em>Nephrol Dial Transplant.</em> 2014;29(Suppl 2):i1–i39.'
    },
    {
      id: 'adrogue', grupo: 'Eletrólitos e metabólico', nome: 'Adrogué–Madias — variação de Na por litro de solução',
      badge: 'planejar o ritmo', tipo: 'formula',
      sub: 'Estima quanto o sódio sobe (ou desce) por litro infundido. É ferramenta de planejamento — o sódio dosado seriado é que manda.',
      campos: [
        { k: 'na', l: 'Sódio atual', u: 'mEq/L' },
        { k: 'peso', l: 'Peso', u: 'kg' },
        { k: 'act', l: 'Água corporal total', tipo: 'select', op: [['0.6', 'Homem adulto (0,6)'], ['0.5', 'Mulher adulta / homem idoso (0,5)'], ['0.45', 'Mulher idosa (0,45)']] },
        { k: 'inf', l: 'Solução', tipo: 'select', op: [['513', 'NaCl 3% (513 mEq/L)'], ['154', 'SF 0,9% (154 mEq/L)'], ['77', 'NaCl 0,45% (77 mEq/L)'], ['0', 'SG 5% — água livre (0)'] ] }
      ],
      calc: function (v) {
        if (v.na === null || v.peso === null) return null;
        var act = (v.act || 0.6) * v.peso;
        var d = ((v.inf || 0) - v.na) / (act + 1);
        var alvo8 = d !== 0 ? 8 / Math.abs(d) : null;
        return {
          linhas: [
            ['Água corporal total', r(act, 1) + ' L'],
            ['Δ Na por litro infundido', (d > 0 ? '+' : '') + r(d, 2) + ' mEq/L'],
            ['Litros para variar 8 mEq/L', alvo8 ? r(alvo8, 2) + ' L' : '—']
          ],
          nota: 'A fórmula ignora perdas em curso e a autocorreção renal — ela subestima com frequência. Use como ponto de partida e redose o sódio a cada 4–6 h. Teto na hiponatremia crônica: 8 mEq/L em 24 h (4–6 no alto risco).'
        };
      },
      ref: 'Adrogué HJ, Madias NE. Hyponatremia. <em>N Engl J Med.</em> 2000;342(21):1581–1589.'
    },
    {
      id: 'agua-livre', grupo: 'Eletrólitos e metabólico', nome: 'Déficit de água livre',
      badge: 'hipernatremia', tipo: 'formula',
      sub: 'Quanto de água falta para levar o sódio ao alvo. O número é um total a distribuir em 48 h ou mais — não uma prescrição de plantão.',
      campos: [
        { k: 'na', l: 'Sódio atual', u: 'mEq/L' },
        { k: 'alvo', l: 'Sódio desejado', u: 'mEq/L', v: '140' },
        { k: 'peso', l: 'Peso', u: 'kg' },
        { k: 'act', l: 'Água corporal total', tipo: 'select', op: [['0.6', 'Homem adulto (0,6)'], ['0.5', 'Mulher adulta / homem idoso (0,5)'], ['0.45', 'Mulher idosa (0,45)']] }
      ],
      calc: function (v) {
        if (v.na === null || v.peso === null || !v.alvo) return null;
        var act = (v.act || 0.6) * v.peso;
        var def = act * (v.na / v.alvo - 1);
        return {
          linhas: [
            ['Água corporal total', r(act, 1) + ' L'],
            ['Déficit de água livre', r(def, 2) + ' L'],
            ['+ perda insensível estimada (24 h)', '≈ 1,0 L'],
            ['Total aproximado em 24 h', r(def / 2 + 1, 2) + ' L (metade do déficit + insensível)']
          ],
          nota: 'Teto de correção: 10 mEq/L em 24 h na hipernatremia crônica (muitos serviços usam 8). Somar as perdas em curso — febre, poliúria, drenos —, senão o sódio não se move. Via enteral é preferida.'
        };
      },
      ref: 'Adrogué HJ, Madias NE. Hypernatremia. <em>N Engl J Med.</em> 2000;342(20):1493–1499.'
    },
    {
      id: 'ca-corrigido', grupo: 'Eletrólitos e metabólico', nome: 'Cálcio corrigido pela albumina',
      badge: 'antes de tratar', tipo: 'formula',
      sub: 'Cerca de 40% do cálcio total viaja ligado à albumina. No hipoalbuminêmico, o total baixo pode ser artefato — o iônico é quem decide.',
      campos: [{ k: 'ca', l: 'Cálcio total', u: 'mg/dL' }, { k: 'alb', l: 'Albumina', u: 'g/dL' }],
      calc: function (v) {
        if (v.ca === null || v.alb === null) return null;
        var c = v.ca + 0.8 * (4 - v.alb);
        return {
          linhas: [['Cálcio corrigido', r(c, 2) + ' mg/dL']],
          nota: c >= 8.5
            ? 'Corrigido normal: a hipocalcemia era da albumina. Dose o iônico se houver sintoma — a fórmula erra nos extremos.'
            : 'Corrigido baixo: hipocalcemia provável. Confirme com cálcio IÔNICO e dose magnésio junto — hipomagnesemia sustenta hipocalcemia refratária. Alcalose reduz a fração iônica sem mudar o total.'
        };
      },
      ref: 'Payne RB, et al. Interpretation of serum calcium in patients with abnormal serum proteins. <em>Br Med J.</em> 1973;4(5893):643–646.'
    },
    {
      id: 'anion-gap', grupo: 'Eletrólitos e metabólico', nome: 'Ânion gap, corrigido e delta-delta',
      badge: 'CAD e acidose', tipo: 'formula',
      sub: 'O gap corrigido pela albumina e a relação delta-delta revelam o distúrbio misto que o gap isolado esconde.',
      campos: [
        { k: 'na', l: 'Sódio', u: 'mEq/L' }, { k: 'cl', l: 'Cloro', u: 'mEq/L' },
        { k: 'hco3', l: 'Bicarbonato', u: 'mEq/L' }, { k: 'alb', l: 'Albumina', u: 'g/dL', opcional: true }
      ],
      calc: function (v) {
        if (v.na === null || v.cl === null || v.hco3 === null) return null;
        var ag = v.na - v.cl - v.hco3;
        var agc = v.alb !== null ? ag + 2.5 * (4 - v.alb) : ag;
        var l = [['Ânion gap', r(ag, 1) + ' mEq/L']];
        if (v.alb !== null) l.push(['Ânion gap corrigido pela albumina', r(agc, 1) + ' mEq/L']);
        var nota;
        if (agc > 12) {
          var dd = (agc - 12) / (24 - v.hco3);
          l.push(['Relação delta-delta', isFinite(dd) ? r(dd, 2) : '—']);
          nota = !isFinite(dd) ? 'Acidose com gap aumentado.'
            : dd < 0.8 ? 'Delta-delta < 0,8: há acidose hiperclorêmica somada à de gap alto (típico da CAD em ressuscitação com soro fisiológico).'
              : dd > 2 ? 'Delta-delta > 2: há alcalose metabólica somada (vômito, diurético) mascarando a gravidade da acidose.'
                : 'Delta-delta entre 0,8 e 2: acidose de gap alto isolada, sem distúrbio metabólico associado evidente.';
        } else {
          nota = 'Gap normal: se há acidose, ela é hiperclorêmica — pense em perda digestiva baixa, acidose tubular renal ou excesso de soro fisiológico.';
        }
        if (v.alb === null) nota += ' Sem a albumina, o gap subestima: cada 1 g/dL a menos reduz o gap em ~2,5.';
        return { linhas: l, nota: nota };
      },
      ref: 'Figge J, Jabor A, Kazda A, Fencl V. Anion gap and hypoalbuminemia. <em>Crit Care Med.</em> 1998;26(11):1807–1810.'
    },

    /* ─── Cardiovascular ─────────────────────────────────────────── */
    {
      id: 'chads', grupo: 'Cardiovascular', nome: 'CHA₂DS₂-VA — risco tromboembólico na FA',
      badge: 'ESC 2024, sem o critério sexo', tipo: 'score',
      sub: 'A ESC 2024 retirou o critério sexo do escore clássico. Ele estima o risco embólico e sustenta a indicação de anticoagulação.',
      itens: [
        ['Insuficiência cardíaca congestiva / disfunção de VE', 1],
        ['Hipertensão arterial', 1],
        ['Idade ≥ 75 anos', 2],
        ['Diabetes mellitus', 1],
        ['AVC, AIT ou tromboembolismo prévio', 2],
        ['Doença vascular (IAM prévio, doença arterial periférica, placa aórtica)', 1],
        ['Idade 65–74 anos', 1]
      ],
      faixas: [
        [2, 'alto', 'Anticoagulação indicada', 'Escore ≥ 2: anticoagulação oral recomendada, salvo contraindicação. DOAC preferido ao antagonista da vitamina K, exceto em prótese mecânica, estenose mitral reumática e SAF trombótica.'],
        [1, 'limite', 'Zona de decisão individual', 'Escore 1: considerar anticoagulação pesando risco de sangramento e preferência do paciente.'],
        [0, 'baixo', 'Anticoagulação não indicada de rotina', 'Escore 0: em geral não anticoagular. Reavaliar a cada mudança clínica ou anualmente.']
      ],
      ref: 'Van Gelder IC, Rienstra M, Bunting KV, et al. 2024 ESC Guidelines for the management of atrial fibrillation. <em>Eur Heart J.</em> 2024;45(36):3314–3414.'
    },
    {
      id: 'hasbled', grupo: 'Cardiovascular', nome: 'HAS-BLED — risco de sangramento',
      badge: '≥ 3 = alto risco', tipo: 'score',
      sub: 'Não serve para negar anticoagulação. Serve para identificar e corrigir os fatores modificáveis — e para intensificar o seguimento.',
      itens: [
        ['Hipertensão não controlada (PAS > 160 mmHg)', 1],
        ['Função renal alterada (diálise, transplante ou creatinina > 2,3 mg/dL)', 1],
        ['Função hepática alterada (cirrose, ou bilirrubina > 2× com TGO/TGP > 3×)', 1],
        ['AVC prévio', 1],
        ['Sangramento prévio ou predisposição (anemia)', 1],
        ['INR lábil (tempo na faixa terapêutica < 60%)', 1],
        ['Idade > 65 anos', 1],
        ['Fármacos que aumentam sangramento (antiagregante, AINE)', 1],
        ['Uso nocivo de álcool (≥ 8 doses/semana)', 1]
      ],
      faixas: [
        [3, 'alto', 'Alto risco de sangramento', 'Não é contraindicação: é convite a corrigir o modificável — controlar a PA, revisar AINE e antiagregante, tratar anemia, ajustar álcool — e a encurtar o intervalo de reavaliação.'],
        [0, 'baixo', 'Risco de sangramento não elevado', 'Seguir com a indicação do CHA₂DS₂-VA, reavaliando periodicamente.']
      ],
      ref: 'Pisters R, Lane DA, Nieuwlaat R, et al. <em>Chest.</em> 2010;138(5):1093–1100.'
    },
    {
      id: 'wells-tep', grupo: 'Cardiovascular', nome: 'Wells para TEP',
      badge: '> 4 = provável', tipo: 'score',
      sub: 'Define a probabilidade pré-teste, que decide entre dímero-D e angiotomografia direta.',
      itens: [
        ['Sinais clínicos de TVP (edema e dor à palpação de panturrilha)', 3],
        ['TEP é o diagnóstico mais provável', 3],
        ['Frequência cardíaca > 100 bpm', 1.5],
        ['Imobilização ≥ 3 dias ou cirurgia nas últimas 4 semanas', 1.5],
        ['TEP ou TVP prévios', 1.5],
        ['Hemoptise', 1],
        ['Câncer em tratamento, tratado nos últimos 6 meses ou paliativo', 1]
      ],
      faixas: [
        [4.5, 'alto', 'TEP provável', 'Ir direto à angiotomografia. Dímero-D negativo NÃO exclui nesta faixa. Se houver atraso do exame e risco de sangramento baixo, considerar anticoagulação empírica.'],
        [0, 'baixo', 'TEP improvável', 'Dímero-D é o próximo passo — negativo (com corte ajustado pela idade quando aplicável) exclui e dispensa imagem.']
      ],
      ref: 'Wells PS, Anderson DR, Rodger M, et al. <em>Thromb Haemost.</em> 2000;83(3):416–420.'
    },
    {
      id: 'spesi', grupo: 'Cardiovascular', nome: 'sPESI — gravidade do TEP',
      badge: '0 = baixo risco', tipo: 'score',
      sub: 'Um único ponto já retira o paciente do grupo de baixo risco. Entra na categorização A–E da AHA/ACC 2026.',
      itens: [
        ['Idade > 80 anos', 1],
        ['Câncer', 1],
        ['Doença cardiopulmonar crônica', 1],
        ['Frequência cardíaca ≥ 110 bpm', 1],
        ['Pressão arterial sistólica < 100 mmHg', 1],
        ['Saturação de O₂ < 90%', 1]
      ],
      faixas: [
        [1, 'alto', 'Não é baixo risco', 'sPESI ≥ 1 tira o paciente da faixa de alta precoce. Some biomarcadores e função de VD para posicionar entre as categorias C, D e E.'],
        [0, 'baixo', 'Baixo risco (sPESI 0)', 'Candidato a alta precoce com DOAC, se não houver outro motivo de internação, dor incapacitante ou contexto social que inviabilize.']
      ],
      ref: 'Jiménez D, Aujesky D, Moores L, et al. <em>Arch Intern Med.</em> 2010;170(15):1383–1389.'
    },

    /* ─── Gastroenterologia ──────────────────────────────────────── */
    {
      id: 'blatchford', grupo: 'Gastroenterologia', nome: 'Glasgow-Blatchford — HDA',
      badge: '0–1 = alta possível', tipo: 'score',
      sub: 'Identifica quem pode ser investigado ambulatorialmente. É o único escore de HDA validado para essa decisão antes da endoscopia.',
      itens: [
        ['Ureia 39–47 mg/dL', 2], ['Ureia 48–59 mg/dL', 3], ['Ureia 60–149 mg/dL', 4], ['Ureia ≥ 150 mg/dL', 6],
        ['Hemoglobina 12–12,9 (homem) ou 10–11,9 (mulher)', 1],
        ['Hemoglobina 10–11,9 (homem)', 3],
        ['Hemoglobina < 10 g/dL', 6],
        ['PAS 100–109 mmHg', 1], ['PAS 90–99 mmHg', 2], ['PAS < 90 mmHg', 3],
        ['Frequência cardíaca ≥ 100 bpm', 1],
        ['Melena', 1], ['Síncope', 2],
        ['Doença hepática', 2], ['Insuficiência cardíaca', 2]
      ],
      faixas: [
        [2, 'alto', 'Internar e investigar', 'Escore ≥ 2: internação e endoscopia hospitalar — em até 24 h na não varicosa, 12 h na suspeita varicosa.'],
        [0, 'baixo', 'Alta com endoscopia ambulatorial é possível', 'Escore 0–1: pode-se considerar alta com endoscopia ambulatorial, mas SÓ se o paciente estiver estável, sem outro motivo de internação e com retorno garantido.']
      ],
      ref: 'Blatchford O, Murray WR, Blatchford M. <em>Lancet.</em> 2000;356(9238):1318–1321.'
    },
    {
      id: 'child', grupo: 'Gastroenterologia', nome: 'Child-Pugh',
      badge: 'gravidade da cirrose', tipo: 'score',
      sub: 'Define a classe funcional da cirrose — e entra na decisão de TIPS preemptivo no sangramento varicoso.',
      itens: [
        ['Bilirrubina 2–3 mg/dL', 1], ['Bilirrubina > 3 mg/dL', 2],
        ['Albumina 2,8–3,5 g/dL', 1], ['Albumina < 2,8 g/dL', 2],
        ['INR 1,7–2,3', 1], ['INR > 2,3', 2],
        ['Ascite leve (controlada com diurético)', 1], ['Ascite moderada a tensa', 2],
        ['Encefalopatia grau I–II', 1], ['Encefalopatia grau III–IV', 2]
      ],
      base: 5,
      faixas: [
        [10, 'alto', 'Child C (10–15)', 'Doença descompensada. No sangramento varicoso, Child C 10–13 é o grupo em que se avalia TIPS preemptivo em 24–72 h.'],
        [7, 'limite', 'Child B (7–9)', 'Doença com comprometimento funcional. Child B > 7 com sangramento ativo também entra na avaliação de TIPS preemptivo.'],
        [5, 'baixo', 'Child A (5–6)', 'Cirrose compensada.']
      ],
      ref: 'Pugh RN, Murray-Lyon IM, Dawson JL, et al. <em>Br J Surg.</em> 1973;60(8):646–649 · de Franchis R, et al. Baveno VII. <em>J Hepatol.</em> 2022;76(4):959–974.'
    },
    {
      id: 'bisap', grupo: 'Gastroenterologia', nome: 'BISAP — gravidade da pancreatite',
      badge: '≥ 3 = maior mortalidade', tipo: 'score',
      sub: 'Calculável nas primeiras 24 h, sem esperar 48. Não substitui a definição de gravidade por falência orgânica persistente.',
      itens: [
        ['Ureia > 25 mg/dL', 1],
        ['Alteração do estado mental', 1],
        ['SIRS (2 ou mais critérios)', 1],
        ['Idade > 60 anos', 1],
        ['Derrame pleural à imagem', 1]
      ],
      faixas: [
        [3, 'alto', 'Alto risco', 'Mortalidade substancialmente maior. Vigilância intensiva, reavaliação de volume e perfusão frequentes, e limiar baixo para UTI.'],
        [0, 'baixo', 'Baixo risco', 'Não dispensa reavaliação: a gravidade se define por falência orgânica que PERSISTE além de 48 h, não pelo escore de entrada.']
      ],
      ref: 'Wu BU, Johannes RS, Sun X, et al. <em>Gut.</em> 2008;57(12):1698–1703.'
    },

    /* ─── Infecto e respiratório ─────────────────────────────────── */
    {
      id: 'atsidsa', grupo: 'Infecto e respiratório', nome: 'Critérios ATS/IDSA — PAC grave',
      badge: '1 maior ou ≥ 3 menores', tipo: 'score', modo: 'maior-menor', minMenor: 3,
      sub: 'Decide quem vai para a UTI — e é outra pergunta que a do CURB-65 e a do PSI, que decidem quem interna. A gravidade aqui é medida por falência de órgão, não por extensão do infiltrado.',
      itens: [
        ['Ventilação mecânica invasiva', 1, 'maior'],
        ['Choque séptico com necessidade de vasopressor', 1, 'maior'],
        ['Frequência respiratória ≥ 30 irpm', 1, 'menor'],
        ['PaO₂/FiO₂ ≤ 250', 1, 'menor'],
        ['Infiltrado multilobar', 1, 'menor'],
        ['Confusão ou desorientação', 1, 'menor'],
        ['Ureia ≥ 42 mg/dL (ureia nitrogenada ≥ 20 mg/dL)', 1, 'menor'],
        ['Leucócitos < 4.000/mm³', 1, 'menor'],
        ['Plaquetas < 100.000/mm³', 1, 'menor'],
        ['Hipotermia — temperatura central < 36 °C', 1, 'menor'],
        ['Hipotensão exigindo reposição volêmica agressiva', 1, 'menor']
      ],
      textos: {
        maior: ['alto', 'PAC grave — critério maior presente', 'Um critério maior basta: é <b>UTI</b>. Antibiótico na primeira hora, culturas antes da primeira dose (sem atrasá-la) e cobertura de atípico associada ao beta-lactâmico.'],
        menor: ['alto', 'PAC grave — três ou mais critérios menores', 'Atinge o limiar de <b>UTI</b> mesmo sem ventilação ou vasopressor. É o grupo que mais se subestima na sala de emergência, porque o paciente ainda "conversa".'],
        limite: ['limite', 'Não atinge o limiar — mas vigie de perto', 'Um ou dois critérios menores não fecham PAC grave, e não autorizam relaxar: reavalie em horas, porque a trajetória vale mais que o corte. Deterioração progressiva indica UTI independentemente da contagem.'],
        baixo: ['baixo', 'Sem critérios de gravidade', 'Não preenche PAC grave. Decidir <b>internação</b> é outra pergunta — para ela, CURB-65 ou PSI, sempre somados ao julgamento clínico e ao contexto social.']
      },
      ref: 'Metlay JP, Waterer GW, Long AC, et al. Diagnosis and Treatment of Adults with Community-acquired Pneumonia. An Official Clinical Practice Guideline of the American Thoracic Society and Infectious Diseases Society of America. <em>Am J Respir Crit Care Med.</em> 2019;200(7):e45–e67 — critérios maiores e menores de PAC grave, mantidos na atualização de 2025 da ATS.'
    },
    {
      id: 'curb65', grupo: 'Infecto e respiratório', nome: 'CURB-65 — pneumonia comunitária',
      badge: 'decide internação', tipo: 'score',
      sub: 'Decide local de tratamento. Não identifica quem vai para a UTI — para isso, use os critérios maiores e menores da ATS/IDSA.',
      itens: [
        ['Confusão mental nova', 1],
        ['Ureia > 43 mg/dL (ou > 7 mmol/L)', 1],
        ['Frequência respiratória ≥ 30/min', 1],
        ['PAS < 90 mmHg ou PAD ≤ 60 mmHg', 1],
        ['Idade ≥ 65 anos', 1]
      ],
      faixas: [
        [3, 'alto', 'Internação — considerar UTI', 'CURB-65 ≥ 3: internação, com avaliação de UTI. Confirme com os critérios ATS/IDSA, que são os que definem PAC grave.'],
        [2, 'limite', 'Internação hospitalar', 'CURB-65 = 2: internar. Reavaliar gravidade nas primeiras horas.'],
        [0, 'baixo', 'Tratamento ambulatorial possível', 'CURB-65 0–1: tratamento domiciliar costuma ser seguro, se a saturação, o contexto social e a comorbidade permitirem.']
      ],
      ref: 'Lim WS, van der Eerden MM, Laing R, et al. <em>Thorax.</em> 2003;58(5):377–382.'
    },
    {
      id: 'ckdepi', grupo: 'Universais', nome: 'CKD-EPI 2021 — taxa de filtração estimada',
      badge: 'estadiar, não dosar', tipo: 'formula',
      sub: 'Versão 2021, sem coeficiente racial. Serve para estadiar a doença renal; para ajuste de dose, as bulas usam o Cockcroft–Gault (acima).',
      campos: [
        { k: 'cr', l: 'Creatinina', u: 'mg/dL' },
        { k: 'idade', l: 'Idade', u: 'anos' },
        { k: 'sexo', l: 'Sexo', tipo: 'select', op: [['1', 'Masculino'], ['2', 'Feminino']] }
      ],
      calc: function (v) {
        if (v.cr === null || v.idade === null || !v.cr) return null;
        var fem = v.sexo === 2;
        var k = fem ? 0.7 : 0.9, a = fem ? -0.241 : -0.302;
        var e = 142 * Math.pow(Math.min(v.cr / k, 1), a) * Math.pow(Math.max(v.cr / k, 1), -1.2)
              * Math.pow(0.9938, v.idade) * (fem ? 1.012 : 1);
        var g = e >= 90 ? 'G1' : e >= 60 ? 'G2' : e >= 45 ? 'G3a' : e >= 30 ? 'G3b' : e >= 15 ? 'G4' : 'G5';
        return {
          linhas: [['TFG estimada', r(e, 0) + ' mL/min/1,73 m²'], ['Estágio (KDIGO)', g]],
          nota: 'A CKD-EPI estadia a doença renal crônica em condição estável — na lesão renal AGUDA a creatinina ainda está subindo e a fórmula superestima a função. Para dose de fármaco, use o Cockcroft–Gault.'
        };
      },
      ref: 'Inker LA, Eneanya ND, Coresh J, et al. New creatinine- and cystatin C–based equations to estimate GFR without race. <em>N Engl J Med.</em> 2021;385(19):1737–1749.'
    },
    {
      id: 'qtc', grupo: 'Universais', nome: 'QT corrigido — Bazett e Fridericia',
      badge: '≥ 500 ms = alto risco', tipo: 'formula',
      sub: 'O QT que importa é o corrigido pela frequência. Em taquicardia, Bazett superestima — prefira Fridericia.',
      campos: [{ k: 'qt', l: 'QT medido', u: 'ms' }, { k: 'fc', l: 'Frequência cardíaca', u: 'bpm' }],
      calc: function (v) {
        if (v.qt === null || v.fc === null || !v.fc) return null;
        var rr = 60 / v.fc;
        var b = v.qt / Math.sqrt(rr), f = v.qt / Math.cbrt(rr);
        var pior = Math.max(b, f);
        return {
          linhas: [['QTc Bazett', r(b, 0) + ' ms'], ['QTc Fridericia', r(f, 0) + ' ms']],
          nota: (pior >= 500
            ? 'QTc ≥ 500 ms: alto risco de torsades. Revisar os prolongadores da prescrição — ondansetrona, amiodarona, macrolídeo, quinolona, antipsicótico — e corrigir K e Mg agora.'
            : 'Abaixo de 500 ms. Vigiar também a VARIAÇÃO: aumento > 60 ms sobre o basal já é sinal de alerta.')
            + ' Em FC > 100, Fridericia é o mais fiel.'
        };
      },
      ref: 'Bazett HC. <em>Heart.</em> 1920;7:353–370 · Fridericia LS. <em>Acta Med Scand.</em> 1920;53:469–486.'
    },
    {
      id: 'winter', grupo: 'Eletrólitos e metabólico', nome: 'Compensação esperada — fórmula de Winter',
      badge: 'acidose metabólica', tipo: 'formula',
      sub: 'Na acidose metabólica, o pulmão compensa numa faixa previsível. PaCO₂ fora dela = segundo distúrbio, respiratório, somado.',
      campos: [{ k: 'hco3', l: 'Bicarbonato', u: 'mEq/L' }, { k: 'paco2', l: 'PaCO₂ medida', u: 'mmHg', opcional: true }],
      calc: function (v) {
        if (v.hco3 === null) return null;
        var e = 1.5 * v.hco3 + 8;
        var l = [['PaCO₂ esperada', r(e - 2, 0) + ' a ' + r(e + 2, 0) + ' mmHg']];
        var nota = 'Válida para ACIDOSE metabólica. ';
        if (v.paco2 !== null) {
          nota += v.paco2 > e + 2
            ? 'A PaCO₂ medida está ACIMA da esperada: há acidose respiratória associada — fadiga, sedação ou doença pulmonar. Na CAD, é sinal de exaustão.'
            : v.paco2 < e - 2
              ? 'A PaCO₂ medida está ABAIXO da esperada: há alcalose respiratória associada — dor, sepse, TEP, ansiedade.'
              : 'Compensação adequada: distúrbio metabólico simples até aqui.';
        } else {
          nota += 'Informe a PaCO₂ da gasometria para comparar.';
        }
        return { linhas: l, nota: nota };
      },
      ref: 'Albert MS, Dell RB, Winters RW. Quantitative displacement of acid-base equilibrium in metabolic acidosis. <em>Ann Intern Med.</em> 1967;66(2):312–322.'
    },
    {
      id: 'pesi', grupo: 'Cardiovascular', nome: 'PESI completo — gravidade do TEP',
      badge: '≤ 85 = classes I–II', tipo: 'score',
      sub: 'A versão completa: a idade soma direto, e as classes I–II (≤ 85 pontos) compõem — com o sPESI 0 — a categoria B da AHA/ACC 2026, candidata a alta precoce.',
      campos: [{ k: 'idade', l: 'Idade (soma direto ao escore)', u: 'anos' }],
      itens: [
        ['Sexo masculino', 10],
        ['Câncer', 30],
        ['Insuficiência cardíaca', 10],
        ['Doença pulmonar crônica', 10],
        ['Frequência cardíaca ≥ 110 bpm', 20],
        ['PAS < 100 mmHg', 30],
        ['Frequência respiratória ≥ 30/min', 20],
        ['Temperatura < 36 °C', 20],
        ['Alteração do estado mental', 60],
        ['SpO₂ < 90%', 20]
      ],
      faixas: [
        [126, 'alto', 'Classe V — risco muito alto', 'Mortalidade em 30 dias de ~10–25%. Internação com monitorização; posicionar na categoria C–E conforme biomarcadores e VD.'],
        [106, 'alto', 'Classe IV — risco alto', 'Mortalidade ~4–11%. Internar e estratificar com troponina e função de VD.'],
        [86, 'limite', 'Classe III — risco intermediário', 'Mortalidade ~3–7%. Internação; a subcategoria da AHA/ACC vem dos biomarcadores e do VD.'],
        [66, 'baixo', 'Classe II — risco baixo', 'PESI ≤ 85: junto com o quadro clínico, compõe a categoria B — alta precoce com DOAC é possível se nada mais internar.'],
        [0, 'baixo', 'Classe I — risco muito baixo', 'Mortalidade < 2%. Candidato forte a tratamento domiciliar, se contexto e suporte permitirem.']
      ],
      ref: 'Aujesky D, Obrosky DS, Stone RA, et al. Derivation and validation of a prognostic model for pulmonary embolism. <em>Am J Respir Crit Care Med.</em> 2005;172(8):1041–1046.'
    },
    {
      id: 'meldna', grupo: 'Gastroenterologia', nome: 'MELD-Na — gravidade da hepatopatia',
      badge: 'complementa o Child', tipo: 'formula',
      sub: 'O escore que prioriza transplante — e que, na HDA do cirrótico, complementa o Child-Pugh na leitura de gravidade.',
      campos: [
        { k: 'bili', l: 'Bilirrubina', u: 'mg/dL' },
        { k: 'inr', l: 'INR' },
        { k: 'cr', l: 'Creatinina', u: 'mg/dL' },
        { k: 'na', l: 'Sódio', u: 'mEq/L' },
        { k: 'dial', l: 'Diálise (2× na última semana)?', tipo: 'select', op: [['0', 'Não'], ['1', 'Sim']] }
      ],
      calc: function (v) {
        if (v.bili === null || v.inr === null || v.cr === null) return null;
        var b = Math.max(v.bili, 1), i2 = Math.max(v.inr, 1);
        var c = v.dial === 1 ? 4 : Math.min(Math.max(v.cr, 1), 4);
        var meld = 9.57 * Math.log(c) + 3.78 * Math.log(b) + 11.2 * Math.log(i2) + 6.43;
        meld = Math.min(Math.round(meld), 40);
        var l = [['MELD', String(meld)]];
        var mn = meld;
        if (v.na !== null) {
          var na = Math.min(Math.max(v.na, 125), 137);
          mn = Math.min(Math.round(meld + 1.32 * (137 - na) - 0.033 * meld * (137 - na)), 40);
          l.push(['MELD-Na', String(mn)]);
        }
        return {
          linhas: l,
          nota: (mn >= 21 ? 'MELD-Na ≥ 21: mortalidade em 90 dias substancial — hepatologia junto, e no sangramento varicoso pesa a favor de decisões agressivas (TIPS precoce onde o Child indicar).'
            : 'Faixa de menor mortalidade em 90 dias. ') + ' Valores < 1 entram como 1; creatinina limitada a 4 (ou 4 se diálise); sódio limitado a 125–137.'
        };
      },
      ref: 'Kim WR, Biggins SW, Kremers WK, et al. Hyponatremia and mortality among patients on the liver-transplant waiting list. <em>N Engl J Med.</em> 2008;359(10):1018–1026.'
    },

    /* ─── Gravidade e triagem ────────────────────────────────────── */
    {
      id: 'sofa', grupo: 'Gravidade e triagem', nome: 'SOFA — disfunção orgânica',
      badge: 'Δ ≥ 2 define sepse', tipo: 'score',
      sub: 'Seis órgãos, 0 a 4 cada. O número absoluto acompanha mortalidade; a VARIAÇÃO de 2 ou mais pontos na infecção é o que define sepse (Sepsis-3).',
      selects: [
        ['Respiratório — PaO₂/FiO₂', [['0', '≥ 400'], ['1', '< 400'], ['2', '< 300'], ['3', '< 200 com suporte ventilatório'], ['4', '< 100 com suporte ventilatório']]],
        ['Coagulação — plaquetas (×10³/µL)', [['0', '≥ 150'], ['1', '< 150'], ['2', '< 100'], ['3', '< 50'], ['4', '< 20']]],
        ['Fígado — bilirrubina (mg/dL)', [['0', '< 1,2'], ['1', '1,2–1,9'], ['2', '2,0–5,9'], ['3', '6,0–11,9'], ['4', '≥ 12']]],
        ['Cardiovascular', [['0', 'PAM ≥ 70 mmHg'], ['1', 'PAM < 70 mmHg'], ['2', 'Dopamina ≤ 5 ou dobutamina (qualquer dose)'], ['3', 'Dopamina > 5 ou nora/adrenalina ≤ 0,1 µg/kg/min'], ['4', 'Dopamina > 15 ou nora/adrenalina > 0,1 µg/kg/min']]],
        ['Neurológico — Glasgow', [['0', '15'], ['1', '13–14'], ['2', '10–12'], ['3', '6–9'], ['4', '< 6']]],
        ['Renal — creatinina ou diurese', [['0', '< 1,2 mg/dL'], ['1', '1,2–1,9'], ['2', '2,0–3,4'], ['3', '3,5–4,9 ou diurese < 500 mL/dia'], ['4', '≥ 5,0 ou diurese < 200 mL/dia']]]
      ],
      faixas: [
        [13, 'alto', 'SOFA ≥ 13', 'Mortalidade estimada acima de 50%. Falência multiorgânica estabelecida — reavaliar metas de cuidado junto com a família e a equipe.'],
        [10, 'alto', 'SOFA 10–12', 'Mortalidade estimada em torno de 40–50%. UTI com suporte pleno e reavaliação diária do delta.'],
        [7, 'limite', 'SOFA 7–9', 'Mortalidade estimada em torno de 15–25%. O delta diário informa trajetória melhor que o valor isolado.'],
        [2, 'limite', 'SOFA 2–6', 'Na infecção suspeita, um AUMENTO de ≥ 2 pontos sobre o basal define sepse (Sepsis-3). Paciente sem doença prévia tem basal presumido de zero.'],
        [0, 'baixo', 'SOFA 0–1', 'Sem disfunção orgânica relevante pelos critérios do escore. Não afasta doença — o SOFA mede consequência, não causa.']
      ],
      ref: 'Vincent JL, Moreno R, Takala J, et al. The SOFA score. <em>Intensive Care Med.</em> 1996;22(7):707–710 · Singer M, et al. Sepsis-3. <em>JAMA.</em> 2016;315(8):801–810.'
    },
    {
      id: 'news2', grupo: 'Gravidade e triagem', nome: 'NEWS2 — deterioração clínica',
      badge: 'o que a SSC recomenda', tipo: 'score',
      sub: 'A ferramenta de triagem que a SSC 2026 recomenda (com MEWS e SIRS) SOBRE o qSOFA — cuja sensibilidade para sepse é baixa demais para triar sozinho. Escala 1 de SpO₂; no DPOC com alvo 88–92%, a pontuação de SpO₂ muda (escala 2).',
      selects: [
        ['Frequência respiratória (/min)', [['0', '12–20'], ['1', '9–11'], ['2', '21–24'], ['3', '≤ 8 ou ≥ 25']]],
        ['SpO₂ — escala 1 (%)', [['0', '≥ 96'], ['1', '94–95'], ['2', '92–93'], ['3', '≤ 91']]],
        ['Oxigênio suplementar', [['0', 'Não'], ['2', 'Sim']]],
        ['Temperatura (°C)', [['0', '36,1–38,0'], ['1', '35,1–36,0 ou 38,1–39,0'], ['2', '≥ 39,1'], ['3', '≤ 35,0']]],
        ['PAS (mmHg)', [['0', '111–219'], ['1', '101–110'], ['2', '91–100'], ['3', '≤ 90 ou ≥ 220']]],
        ['Frequência cardíaca (bpm)', [['0', '51–90'], ['1', '41–50 ou 91–110'], ['2', '111–130'], ['3', '≤ 40 ou ≥ 131']]],
        ['Nível de consciência', [['0', 'Alerta'], ['3', 'Confusão nova, resposta a voz/dor, ou irresponsivo']]]
      ],
      faixas: [
        [7, 'alto', 'NEWS2 ≥ 7 — resposta de emergência', 'Avaliação imediata por equipe com competência de via aérea e cuidado crítico; considerar UTI. Monitorização contínua.'],
        [5, 'limite', 'NEWS2 5–6 — revisão urgente', 'Gatilho-chave para pensar em sepse na infecção suspeita. Revisão médica urgente e aumento da frequência de sinais vitais.'],
        [1, 'baixo', 'NEWS2 1–4 — vigilância', 'Reavaliar a frequência de aferição. Atenção: parâmetro isolado com 3 pontos já pede revisão urgente mesmo com total baixo.'],
        [0, 'baixo', 'NEWS2 0 — rotina', 'Manter a monitorização de rotina.']
      ],
      ref: 'Royal College of Physicians. National Early Warning Score (NEWS) 2. Londres: RCP, 2017 · Prescott HC, et al. Surviving Sepsis Campaign 2026. <em>Crit Care Med.</em> 2026;54(4):725–812.'
    }
  ];

  /* ─── Renderização ─────────────────────────────────────────────── */

  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; }

  function saida(box, estado, titulo, detalhe) {
    var o = box.querySelector('.rxc-out');
    o.dataset.estado = estado;
    o.querySelector('.rxc-out-t').textContent = titulo;
    o.querySelector('.rxc-out-d').innerHTML = detalhe;
  }

  function baseHTML(c) {
    return '<div class="rxc-h"><span class="rxc-t">' + c.nome + '</span>'
      + (c.badge ? '<span class="rxc-badge">' + c.badge + '</span>' : '') + '</div>'
      + '<p class="rxc-sub">' + c.sub + '</p>'
      + '<div class="rxc-body"></div>'
      + '<div class="rxc-foot"><span class="rxc-score-k">' + (c.tipo === 'score' ? 'Pontos' : 'Resultado')
      + '</span><span class="rxc-score">' + (c.tipo === 'score' ? (c.base || 0) : '—')
      + '</span><button type="button" class="rxc-reset">Limpar</button></div>'
      + '<div class="rxc-out" data-estado="baixo"><span class="rxc-out-t"></span><span class="rxc-out-d"></span></div>'
      + (c.ref ? '<p class="rxc-ref">' + c.ref + '</p>' : '');
  }

  function montarScore(box, c) {
    var body = box.querySelector('.rxc-body');
    if (c.campos) {
      var grid = el('div', 'rxc-campos');
      c.campos.forEach(function (f) {
        var w = el('label', 'rxc-campo');
        w.appendChild(el('span', 'rxc-campo-l', f.l + (f.u ? ' (' + f.u + ')' : '')));
        var inp = document.createElement('input');
        inp.type = 'number'; inp.step = 'any'; inp.inputMode = 'decimal'; inp.placeholder = '—';
        inp.dataset.num = f.k;
        w.appendChild(inp);
        grid.appendChild(w);
      });
      body.appendChild(grid);
    }
    if (c.selects) {
      var sg = el('div', 'rxc-campos rxc-campos-sel');
      c.selects.forEach(function (sd) {
        var w = el('label', 'rxc-campo');
        w.appendChild(el('span', 'rxc-campo-l', sd[0]));
        var sel = document.createElement('select');
        sel.dataset.sel = '1';
        sd[1].forEach(function (o) {
          var op = document.createElement('option');
          op.value = o[0]; op.textContent = (Number(o[0]) > 0 ? '+' + o[0] + ' · ' : '0 · ') + o[1];
          sel.appendChild(op);
        });
        w.appendChild(sel);
        sg.appendChild(w);
      });
      body.appendChild(sg);
    }
    if (c.itens) {
      var lista = el('div', 'rxc-list');
      c.itens.forEach(function (it) {
        var lab = el('label', 'rxc-item');
        var inp = document.createElement('input');
        inp.type = 'checkbox'; inp.dataset.peso = it[1];
        if (it[2]) inp.dataset.classe = it[2];
        var sp = el('span'); sp.innerHTML = (it[2] ? '<b>' + (it[2] === 'maior' ? 'Maior' : 'Menor') + '</b> — ' : '') + it[0];
        lab.appendChild(inp); lab.appendChild(sp);
        lab.appendChild(el('span', 'rxc-pts', it[2] ? it[2] : String(it[1]).replace('.', ',')));
        lista.appendChild(lab);
      });
      body.appendChild(lista);
    }

    function calcular() {
      if (c.modo === 'maior-menor') {
        var M = 0, m = 0;
        box.querySelectorAll('input:checked').forEach(function (i) { i.dataset.classe === 'maior' ? M++ : m++; });
        box.querySelector('.rxc-score').textContent = M + 'M / ' + m + 'm';
        /* quantos menores bastam; e os textos de saída, sobrescrevíveis por calculadora */
        var alvoM = c.minMenor || 2;
        var T = c.textos || {
          maior: ['alto', 'Indicação presente — fator maior', 'Ventilação mecânica prolongada e coagulopatia são os dois fatores independentes clássicos. Prescrever inibidor de bomba e <b>reavaliar todo dia</b> — a indicação some antes da alta da UTI, a prescrição não.'],
          menor: ['alto', 'Indicação provável — dois ou mais fatores menores', 'A combinação justifica profilaxia na maioria dos protocolos. Reavaliar diariamente e suspender quando os fatores saírem.'],
          limite: ['limite', 'Zona cinzenta — um fator menor', 'Um fator menor isolado não sustenta profilaxia na maior parte dos protocolos. Decidir pelo conjunto e pelo protocolo do serviço.'],
          baixo: ['baixo', 'Sem indicação', 'Sem fator de risco, a profilaxia traz mais dano — pneumonia associada à ventilação e <em>C. difficile</em> — do que benefício.']
        };
        var r = M >= 1 ? T.maior : m >= alvoM ? T.menor : m >= 1 ? T.limite : T.baixo;
        saida(box, r[0], r[1] + (r === T.limite || r === T.menor ? ' (' + m + ')' : ''), r[2]);
        return;
      }
      var t = c.base || 0, sel3 = false, faltaNum = false;
      box.querySelectorAll('input[type=checkbox]:checked').forEach(function (i) { t += Number(i.dataset.peso); });
      box.querySelectorAll('input[data-num]').forEach(function (i) {
        var v = n(i.value);
        if (v === null) faltaNum = true; else t += v;
      });
      box.querySelectorAll('select[data-sel]').forEach(function (s2) {
        var v = Number(s2.value) || 0; t += v; if (v >= 3) sel3 = true;
      });
      box.querySelector('.rxc-score').textContent = String(Math.round(t * 10) / 10).replace('.', ',');
      if (c.campos && faltaNum) {
        saida(box, 'baixo', 'Preencha os campos numéricos', 'O escore só fica completo com todos os campos preenchidos — no PESI, a idade soma direto ao total.');
        return;
      }
      if (c.id === 'news2' && sel3 && t < 5) {
        saida(box, 'limite', 'Parâmetro isolado com 3 pontos (' + String(t) + ')', 'Mesmo com total abaixo de 5, um único parâmetro pontuando 3 já pede revisão clínica urgente e aumento da frequência de monitorização.');
        return;
      }
      for (var j2 = 0; j2 < c.faixas.length; j2++) {
        if (t >= c.faixas[j2][0]) { saida(box, c.faixas[j2][1], c.faixas[j2][2] + ' (' + String(Math.round(t * 10) / 10).replace('.', ',') + ')', c.faixas[j2][3]); return; }
      }
    }
    box.addEventListener('change', calcular);
    box.addEventListener('input', calcular);
    box.querySelector('.rxc-reset').addEventListener('click', function () {
      box.querySelectorAll('input[type=checkbox]').forEach(function (i) { i.checked = false; });
      box.querySelectorAll('input[data-num]').forEach(function (i) { i.value = ''; });
      box.querySelectorAll('select[data-sel]').forEach(function (s2) { s2.selectedIndex = 0; });
      calcular();
    });
    calcular();
  }

  function montarFormula(box, c) {
    var body = box.querySelector('.rxc-body');
    var grid = el('div', 'rxc-campos');
    c.campos.forEach(function (f) {
      var w = el('label', 'rxc-campo');
      w.appendChild(el('span', 'rxc-campo-l', f.l + (f.u ? ' (' + f.u + ')' : '') + (f.opcional ? ' — opcional' : '')));
      var inp;
      if (f.tipo === 'select') {
        inp = document.createElement('select');
        f.op.forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; inp.appendChild(op); });
      } else {
        inp = document.createElement('input');
        inp.type = 'number'; inp.step = 'any'; inp.inputMode = 'decimal'; inp.placeholder = '—';
        if (f.v) inp.value = f.v;
      }
      inp.dataset.k = f.k;
      w.appendChild(inp);
      if (f.h) w.appendChild(el('span', 'rxc-campo-h', f.h));
      grid.appendChild(w);
    });
    body.appendChild(grid);
    var res = el('div', 'rxc-res'); body.appendChild(res);

    function calcular() {
      var v = {};
      box.querySelectorAll('[data-k]').forEach(function (i) { v[i.dataset.k] = n(i.value); });
      var out = c.calc(v);
      res.innerHTML = '';
      if (!out) {
        box.querySelector('.rxc-score').textContent = '—';
        saida(box, 'baixo', 'Preencha os campos', 'O resultado aparece assim que os valores obrigatórios estiverem completos.');
        return;
      }
      out.linhas.forEach(function (l, i) {
        var row = el('div', 'rxc-res-row');
        row.appendChild(el('span', 'rxc-res-k', l[0]));
        row.appendChild(el('span', 'rxc-res-v', l[1]));
        res.appendChild(row);
        if (i === 0) box.querySelector('.rxc-score').textContent = l[1];
      });
      saida(box, 'limite', 'Leitura', out.nota);
    }
    box.addEventListener('input', calcular);
    box.addEventListener('change', calcular);
    box.querySelector('.rxc-reset').addEventListener('click', function () {
      box.querySelectorAll('input').forEach(function (i) { i.value = ''; }); calcular();
    });
    calcular();
  }

  function iniciar() {
    document.querySelectorAll('[data-calc]').forEach(function (slot) {
      var c = CALCS.filter(function (x) { return x.id === slot.dataset.calc; })[0];
      if (!c) return;
      var box = el('div', 'rxc');
      box.id = c.id;
      box.innerHTML = baseHTML(c);
      slot.appendChild(box);
      c.tipo === 'score' ? montarScore(box, c) : montarFormula(box, c);
    });
    // realce ao chegar por âncora
    if (location.hash) {
      var alvo = document.getElementById(location.hash.slice(1));
      if (alvo && alvo.classList.contains('rxc')) {
        alvo.classList.add('rxc-alvo');
        setTimeout(function () { alvo.scrollIntoView({ block: 'center' }); }, 60);
      }
    }
  }

  window.RX_CALCS = CALCS;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
