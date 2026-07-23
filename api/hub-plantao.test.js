import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizePlantao } from './hub-plantao.js'

describe('hub-plantao API contract', () => {
  it('preserva metadados e limita cardinalidade/tamanho', () => {
    const raw = {
      patients: Array.from({ length: 14 }, (_, index) => ({
        id: `p-${index}`,
        episodeId: `e-${index}`,
        leito: String(index + 1),
        nome: 'A'.repeat(500),
        examesImg: Array.from({ length: 60 }, () => ({ laudo: 'x'.repeat(5000) })),
      })),
      activeId: 'p-0',
      plantao: { hospital: 'HRO', servico: 'UTI', unidade: 'U2' },
    }
    const out = sanitizePlantao(raw)
    assert.equal(out.patients.length, 10)
    assert.equal(out.patients[0].nome.length, 160)
    assert.equal(out.patients[0].examesImg.length, 40)
    assert.equal(out.patients[0].examesImg[0].laudo.length, 2500)
    assert.deepEqual(out.plantao, { hospital: 'HRO', servico: 'UTI', unidade: 'U2' })
  })

  it('rejeita corpo sem patients', () => {
    assert.equal(sanitizePlantao(null), null)
    assert.equal(sanitizePlantao({ patients: 'não-array' }), null)
  })
})
