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
        { k: 'ur', l: 'Ureia', u: 'mg/dL' }, { k: 'med', l: 'Osmolalidade medida', u: 'mOsm/kg', opcional: true }
      ],
      calc: function (v) {
        if (v.na === null || v.gli === null) return null;
        var ef = 2 * v.na + v.gli / 18;
        var tot = ef + (v.ur !== null ? v.ur / 2.8 : 0);
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
      id: 'qsofa', grupo: 'Infecto e respiratório', nome: 'qSOFA — e por que a SSC prefere outro',
      badge: 'baixa sensibilidade', tipo: 'score',
      sub: 'Está aqui porque ainda é muito usado — e para registrar que a SSC 2026 recomenda NEWS, NEWS2, MEWS ou SIRS SOBRE o qSOFA como ferramenta única de triagem.',
      itens: [
        ['Frequência respiratória ≥ 22/min', 1],
        ['Alteração do estado mental (Glasgow < 15)', 1],
        ['PAS ≤ 100 mmHg', 1]
      ],
      faixas: [
        [2, 'alto', 'qSOFA ≥ 2 — risco aumentado', 'Positivo indica maior risco de desfecho ruim. Mas atenção: um qSOFA ≥ 2 já é sinal tardio — não espere por ele para agir.'],
        [0, 'baixo', 'qSOFA < 2 — NÃO exclui sepse', 'Este é o ponto principal: a sensibilidade do qSOFA para sepse é baixa (em torno de 23% em coorte grande). Um qSOFA negativo NÃO afasta sepse. Use NEWS2, MEWS ou SIRS para triar.']
      ],
      ref: 'Prescott HC, Antonelli M, Alhazzani W, et al. Surviving Sepsis Campaign 2026. <em>Crit Care Med.</em> 2026;54(4):725–812 — recomendação forte de usar NEWS, NEWS2, MEWS ou SIRS sobre o qSOFA como ferramenta única de triagem.'
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
    var lista = el('div', 'rxc-list');
    c.itens.forEach(function (it, i) {
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

    function calcular() {
      if (c.modo === 'maior-menor') {
        var M = 0, m = 0;
        box.querySelectorAll('input:checked').forEach(function (i) { i.dataset.classe === 'maior' ? M++ : m++; });
        box.querySelector('.rxc-score').textContent = M + 'M / ' + m + 'm';
        if (M >= 1) saida(box, 'alto', 'Indicação presente — fator maior', 'Ventilação mecânica prolongada e coagulopatia são os dois fatores independentes clássicos. Prescrever inibidor de bomba e <b>reavaliar todo dia</b> — a indicação some antes da alta da UTI, a prescrição não.');
        else if (m >= 2) saida(box, 'alto', 'Indicação provável — dois ou mais fatores menores', 'A combinação justifica profilaxia na maioria dos protocolos. Reavaliar diariamente e suspender quando os fatores saírem.');
        else if (m === 1) saida(box, 'limite', 'Zona cinzenta — um fator menor', 'Um fator menor isolado não sustenta profilaxia na maior parte dos protocolos. Decidir pelo conjunto e pelo protocolo do serviço.');
        else saida(box, 'baixo', 'Sem indicação', 'Sem fator de risco, a profilaxia traz mais dano — pneumonia associada à ventilação e <em>C. difficile</em> — do que benefício.');
        return;
      }
      var t = c.base || 0;
      box.querySelectorAll('input:checked').forEach(function (i) { t += Number(i.dataset.peso); });
      box.querySelector('.rxc-score').textContent = String(Math.round(t * 10) / 10).replace('.', ',');
      for (var j = 0; j < c.faixas.length; j++) {
        if (t >= c.faixas[j][0]) { saida(box, c.faixas[j][1], c.faixas[j][2] + ' (' + String(Math.round(t * 10) / 10).replace('.', ',') + ')', c.faixas[j][3]); return; }
      }
    }
    box.addEventListener('change', calcular);
    box.querySelector('.rxc-reset').addEventListener('click', function () {
      box.querySelectorAll('input').forEach(function (i) { i.checked = false; }); calcular();
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
