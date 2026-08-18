/* rx-scores.js — calculadoras embutidas nas prescrições comentadas.
 *
 * Duas ferramentas, ambas de decisão *individual*: elas dizem se o escore
 * indica profilaxia, não se este paciente deve recebê-la. Sangramento,
 * plaquetas, função renal, procedimento previsto e anticoagulação já plena
 * continuam sendo do médico.
 *
 * Escore de Pádua — Barbar S, et al. J Thromb Haemost. 2010;8(11):2450–2457.
 * Fatores de risco para úlcera de estresse — Cook DJ, et al. N Engl J Med.
 * 1994;330(6):377–381, com os fatores adicionais que os consensos posteriores
 * agregaram. Não existe escore validado único: por isso a ferramenta trabalha
 * com fator maior isolado OU dois ou mais fatores menores.
 */
(function () {
  'use strict';

  function calcular(raiz) {
    var itens = raiz.querySelectorAll('input[type="checkbox"][data-peso]');
    var total = 0, marcados = [];
    itens.forEach(function (i) {
      if (i.checked) { total += Number(i.dataset.peso); marcados.push(i); }
    });
    return { total: total, marcados: marcados };
  }

  function pintar(saida, estado, titulo, detalhe) {
    saida.dataset.estado = estado;
    saida.querySelector('.rxc-out-t').textContent = titulo;
    saida.querySelector('.rxc-out-d').textContent = detalhe;
  }

  function padua(raiz) {
    var r = calcular(raiz);
    var saida = raiz.querySelector('.rxc-out');
    raiz.querySelector('.rxc-score').textContent = r.total;
    if (r.total >= 4) {
      pintar(saida, 'alto', 'Alto risco de TEV (' + r.total + ' pontos)',
        'O escore indica profilaxia farmacológica. Antes de prescrever: risco de sangramento, plaquetas, função renal, procedimento previsto e se o paciente já está em anticoagulação plena — nesse caso, não somar profilaxia.');
    } else {
      pintar(saida, 'baixo', 'Baixo risco de TEV (' + r.total + ' pontos)',
        'O escore não indica profilaxia farmacológica de rotina. Reavaliar a cada mudança clínica: mobilidade, infecção nova, procedimento ou piora respiratória mudam o resultado.');
    }
  }

  function ulcera(raiz) {
    var maiores = 0, menores = 0;
    raiz.querySelectorAll('input[type="checkbox"][data-peso]').forEach(function (i) {
      if (!i.checked) return;
      if (i.dataset.classe === 'maior') maiores++; else menores++;
    });
    var saida = raiz.querySelector('.rxc-out');
    raiz.querySelector('.rxc-score').textContent = maiores + 'M / ' + menores + 'm';
    if (maiores >= 1) {
      pintar(saida, 'alto', 'Indicação presente — fator maior',
        'Ventilação mecânica prolongada e coagulopatia são os dois fatores de risco independentes clássicos. Prescrever inibidor de bomba de prótons e reavaliar a indicação a cada dia: ela costuma desaparecer antes da alta da UTI.');
    } else if (menores >= 2) {
      pintar(saida, 'alto', 'Indicação provável — dois ou mais fatores menores',
        'A combinação justifica profilaxia na maioria dos protocolos. Reavaliar diariamente e suspender quando os fatores saírem — profilaxia que segue até a enfermaria é fonte de pneumonia e de C. difficile.');
    } else if (menores === 1) {
      pintar(saida, 'limite', 'Zona cinzenta — um fator menor',
        'Um fator menor isolado não sustenta profilaxia na maior parte dos protocolos. Decidir pelo conjunto e pelo protocolo do serviço.');
    } else {
      pintar(saida, 'baixo', 'Sem indicação',
        'Sem fator de risco, a profilaxia traz mais dano (pneumonia associada à ventilação, C. difficile) do que benefício. Não é carimbo de internação.');
    }
  }

  function montar(raiz) {
    var tipo = raiz.dataset.rxCalc;
    var fn = tipo === 'padua' ? padua : ulcera;
    raiz.addEventListener('change', function (e) {
      if (e.target.matches('input[type="checkbox"]')) fn(raiz);
    });
    var limpar = raiz.querySelector('.rxc-reset');
    if (limpar) limpar.addEventListener('click', function () {
      raiz.querySelectorAll('input[type="checkbox"]').forEach(function (i) { i.checked = false; });
      fn(raiz);
    });
    fn(raiz);
  }

  function iniciar() {
    document.querySelectorAll('[data-rx-calc]').forEach(montar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
