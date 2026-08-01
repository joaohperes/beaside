import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizePlantao } from './hub-plantao.js'

describe('hub-plantao API contract', () => {
  it('preserva metadados e limita cardinalidade/tamanho', () => {
    const raw = {
      patients: Array.from({ length: 44 }, (_, index) => ({
        id: `p-${index}`,
        episodeId: `e-${index}`,
        leito: String(index + 1),
        nome: 'A'.repeat(500),
        examesImg: Array.from({ length: 60 }, () => ({ laudo: 'x'.repeat(5000) })),
        tratamentoInfeccioso: Array.from({ length: 50 }, () => ({
          nome: 'Meropenem',
          obs: 'x'.repeat(800),
        })),
        culturas: Array.from({ length: 90 }, () => ({
          material: 'Hemocultura',
          resultado: 'x'.repeat(1500),
        })),
      })),
      activeId: 'p-0',
      plantao: { hospital: 'HRO', servico: 'UTI', unidade: 'U2' },
    }
    const out = sanitizePlantao(raw)
    assert.equal(out.patients.length, 40)
    assert.equal(out.patients[0].nome.length, 160)
    assert.equal(out.patients[0].examesImg.length, 40)
    assert.equal(out.patients[0].examesImg[0].laudo.length, 2500)
    assert.equal(out.patients[0].tratamentoInfeccioso.length, 40)
    assert.equal(out.patients[0].tratamentoInfeccioso[0].obs.length, 500)
    assert.equal(out.patients[0].culturas.length, 80)
    assert.equal(out.patients[0].culturas[0].resultado.length, 1000)
    assert.deepEqual(out.plantao, { hospital: 'HRO', servico: 'UTI', unidade: 'U2' })
  })

  it('preserva setor de origem e o limite de alerta das invasões', () => {
    // Campos novos precisam de teste de contrato: `setorOrigem` é nomeado no
    // sanitizador (some se esquecido) e `alertaDias` viaja dentro da invasão.
    const out = sanitizePlantao({
      patients: [
        {
          id: 'p-1',
          leito: '1-01',
          setorOrigem: 'Bloco cirúrgico',
          invasoes: [{ id: 'i-1', tipo: 'cvc', data: '24/07/26', alertaDias: '10' }],
        },
      ],
      activeId: 'p-1',
    })
    assert.equal(out.patients[0].setorOrigem, 'Bloco cirúrgico')
    assert.equal(out.patients[0].invasoes[0].alertaDias, '10')
  })

  it('trunca setor de origem exagerado sem descartar o paciente', () => {
    const out = sanitizePlantao({
      patients: [{ id: 'p-1', leito: '1-01', setorOrigem: 'S'.repeat(400) }],
      activeId: 'p-1',
    })
    assert.equal(out.patients[0].setorOrigem.length, 120)
  })

  it('preserva sexo e o SAPS 3 de admissão', () => {
    const out = sanitizePlantao({
      patients: [
        {
          id: 'p-1',
          leito: '1-01',
          sexo: 'F',
          saps3: {
            data: '20/07/26',
            respostas: { idade: '60-69', glasgow: '>=13' },
            comorbidades: ['cirrose'],
            razoes: ['cv_choque_septico', 'cv_arritmia'],
          },
        },
      ],
      activeId: 'p-1',
    })
    assert.equal(out.patients[0].sexo, 'F')
    assert.equal(out.patients[0].saps3.data, '20/07/26')
    assert.equal(out.patients[0].saps3.respostas.idade, '60-69')
    assert.deepEqual(out.patients[0].saps3.comorbidades, ['cirrose'])
    assert.deepEqual(out.patients[0].saps3.razoes, ['cv_choque_septico', 'cv_arritmia'])
  })

  it('descarta sexo fora de F/M em vez de propagar lixo', () => {
    const out = sanitizePlantao({
      patients: [{ id: 'p-1', leito: '1-01', sexo: 'outro' }],
      activeId: 'p-1',
    })
    assert.equal(out.patients[0].sexo, '')
  })

  it('aceita paciente sem SAPS 3 preenchido', () => {
    const out = sanitizePlantao({
      patients: [{ id: 'p-1', leito: '1-01' }],
      activeId: 'p-1',
    })
    assert.equal(out.patients[0].saps3, null)
  })

  it('preserva as altas do turno com enum fechado', () => {
    // Campo novo precisa de teste de contrato: `altas` é nomeado no
    // sanitizador e sumiria em silêncio no sync se fosse esquecido.
    const out = sanitizePlantao({
      patients: [{ id: 'p-1', leito: '1-01' }],
      activeId: 'p-1',
      altas: [
        {
          pacienteId: 'p-0',
          leito: '1-02',
          nome: 'Maria',
          data: '30/07/26',
          tipo: 'transferencia',
          destino: 'outro_hospital',
          ira: 'sim_com_dialise',
          complicacoes: 'sim',
          quaisComplicacoes: 'PAV',
          readmissao: 'nao',
        },
      ],
    })
    assert.equal(out.altas.length, 1)
    assert.equal(out.altas[0].tipo, 'transferencia')
    assert.equal(out.altas[0].destino, 'outro_hospital')
    assert.equal(out.altas[0].ira, 'sim_com_dialise')
    assert.equal(out.altas[0].quaisComplicacoes, 'PAV')
    assert.deepEqual(out.altas[0].complicacoesList, [])
  })

  it('descarta valor fora do enum da alta em vez de propagar lixo', () => {
    const out = sanitizePlantao({
      patients: [{ id: 'p-1', leito: '1-01' }],
      activeId: 'p-1',
      altas: [{ tipo: 'inventado', destino: 'marte', ira: 'talvez', complicacoes: 'quem sabe' }],
    })
    assert.equal(out.altas[0].tipo, '')
    assert.equal(out.altas[0].destino, '')
    assert.equal(out.altas[0].ira, '')
    assert.equal(out.altas[0].complicacoes, '')
  })

  it('preserva a lista de complicações marcadas', () => {
    const out = sanitizePlantao({
      patients: [{ id: 'p-1', leito: '1-01' }],
      activeId: 'p-1',
      altas: [{ tipo: 'melhora', complicacoes: 'sim', complicacoesList: ['pav', 'lpp'] }],
    })
    assert.deepEqual(out.altas[0].complicacoesList, ['pav', 'lpp'])
  })

  it('limita a cardinalidade das altas', () => {
    const out = sanitizePlantao({
      patients: [{ id: 'p-1', leito: '1-01' }],
      activeId: 'p-1',
      altas: Array.from({ length: 120 }, () => ({ tipo: 'obito', data: '30/07/26' })),
    })
    assert.equal(out.altas.length, 80)
  })

  it('plantão sem altas devolve lista vazia, não undefined', () => {
    const out = sanitizePlantao({ patients: [{ id: 'p-1', leito: '1-01' }], activeId: 'p-1' })
    assert.deepEqual(out.altas, [])
  })

  it('rejeita corpo sem patients', () => {
    assert.equal(sanitizePlantao(null), null)
    assert.equal(sanitizePlantao({ patients: 'não-array' }), null)
  })
})
