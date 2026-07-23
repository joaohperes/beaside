/**
 * Plantão Hub UTI — GET/PUT/DELETE por usuário autenticado (Clerk).
 *
 * Env:
 *   CLERK_SECRET_KEY          — obrigatória
 *   KV_REST_API_URL + TOKEN   — opcional (Vercel KV); senão Clerk privateMetadata (~6KB)
 *
 * Headers: Authorization: Bearer <session JWT do Clerk>
 */
import { createClerkClient, verifyToken } from '@clerk/backend'

const KEY_PREFIX = 'hub:plantao:'
const META_MAX = 6000
const MAX_BODY_BYTES = 256 * 1024
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 90
const rateBuckets = new Map()

const AUTHORIZED_PARTIES = [
  'https://be-aside.vercel.app',
  'https://be-aside-joaohperes-projects.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...String(process.env.HUB_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
]

function requestOrigin(req) {
  return String(req.headers.origin || '').replace(/\/$/, '')
}

function cors(req, res) {
  const origin = requestOrigin(req)
  if (origin && AUTHORIZED_PARTIES.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Cache-Control', 'no-store')
}

function enforceRateLimit(userId) {
  const now = Date.now()
  const prev = rateBuckets.get(userId)
  const bucket = !prev || now - prev.startedAt >= RATE_WINDOW_MS
    ? { startedAt: now, count: 0 }
    : prev
  bucket.count += 1
  rateBuckets.set(userId, bucket)
  if (bucket.count > RATE_MAX) {
    const err = new Error('Muitas requisições. Aguarde alguns segundos.')
    err.status = 429
    err.code = 'rate_limited'
    throw err
  }
}

function bearer(req) {
  const h = req.headers.authorization || req.headers.Authorization || ''
  const m = String(h).match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : ''
}

/** Vercel às vezes entrega body já parseado; às vezes string; às vezes stream. */
async function readJsonBody(req) {
  if (req.body != null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    if (Buffer.byteLength(JSON.stringify(req.body), 'utf8') > MAX_BODY_BYTES) {
      const err = new Error('Plantão excede o limite de 256 KB')
      err.status = 413
      err.code = 'payload_too_large'
      throw err
    }
    return req.body
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    if (Buffer.byteLength(req.body, 'utf8') > MAX_BODY_BYTES) {
      const err = new Error('Plantão excede o limite de 256 KB')
      err.status = 413
      err.code = 'payload_too_large'
      throw err
    }
    try {
      return JSON.parse(req.body)
    } catch {
      return null
    }
  }
  // raw stream
  const chunks = []
  let bytes = 0
  for await (const chunk of req) {
    const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
    bytes += buf.length
    if (bytes > MAX_BODY_BYTES) {
      const err = new Error('Plantão excede o limite de 256 KB')
      err.status = 413
      err.code = 'payload_too_large'
      throw err
    }
    chunks.push(buf)
  }
  if (!chunks.length) return null
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw.trim()) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function userIdFromRequest(req) {
  const secretKey = process.env.CLERK_SECRET_KEY || ''
  if (!secretKey) {
    const err = new Error('CLERK_SECRET_KEY não configurada no servidor')
    err.status = 503
    err.code = 'no_clerk_secret'
    throw err
  }
  const token = bearer(req)
  if (!token) {
    const err = new Error('Faça login para sincronizar o plantão')
    err.status = 401
    err.code = 'no_token'
    throw err
  }

  try {
    // withLegacyReturn: lança se inválido, devolve JwtPayload se ok
    const payload = await verifyToken(token, {
      secretKey,
      authorizedParties: AUTHORIZED_PARTIES,
      clockSkewInMs: 15_000,
    })
    const sub = payload?.sub
    if (!sub) {
      const err = new Error('Token sem user id (sub)')
      err.status = 401
      err.code = 'bad_token'
      throw err
    }
    return String(sub)
  } catch (e) {
    if (e.status) throw e
    const err = new Error('Sessão inválida')
    err.status = 401
    err.code = 'bad_token'
    throw err
  }
}

function hasKv() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

async function kvCommand(parts, body) {
  const base = process.env.KV_REST_API_URL.replace(/\/$/, '')
  const token = process.env.KV_REST_API_TOKEN
  const path = parts.map(encodeURIComponent).join('/')
  const res = await fetch(`${base}/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`KV error ${res.status}: ${t.slice(0, 200)}`)
  }
  return res.json()
}

async function storeGet(userId) {
  if (hasKv()) {
    const out = await kvCommand(['get', `${KEY_PREFIX}${userId}`])
    const raw = out?.result
    if (raw == null || raw === '') return null
    if (typeof raw === 'object') return raw
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  const user = await clerk.users.getUser(userId)
  const data = user.privateMetadata?.hubPlantao
  return data && typeof data === 'object' ? data : null
}

async function storePut(userId, payload) {
  if (hasKv()) {
    await kvCommand(['set', `${KEY_PREFIX}${userId}`], payload)
    return { backend: 'kv' }
  }

  const json = JSON.stringify(payload)
  if (json.length > META_MAX) {
    const err = new Error(
      'Plantão grande demais sem Vercel KV. Crie um KV no projeto e faça redeploy.',
    )
    err.status = 413
    err.code = 'too_large_no_kv'
    throw err
  }

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  await clerk.users.updateUserMetadata(userId, {
    privateMetadata: { hubPlantao: payload },
  })
  return { backend: 'clerk_metadata' }
}

function cleanString(value, max = 200) {
  return String(value ?? '').replace(/\u0000/g, '').slice(0, max)
}

function cleanRecord(raw, maxKeys = 100, maxValue = 100) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out = {}
  for (const [key, value] of Object.entries(raw).slice(0, maxKeys)) {
    const safeKey = cleanString(key, 40)
    if (!safeKey || value == null) continue
    if (typeof value === 'object' && !Array.isArray(value)) {
      out[safeKey] = cleanRecord(value, 30, maxValue)
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      out[safeKey] = value
    } else {
      out[safeKey] = cleanString(value, maxValue)
    }
  }
  return out
}

function cleanList(raw, max, mapper) {
  return Array.isArray(raw) ? raw.slice(0, max).map(mapper).filter(Boolean) : []
}

function sanitizePatient(raw) {
  if (!raw || typeof raw !== 'object') return null
  const text = (key, max = 200) => cleanString(raw[key], max)
  const labs = {}
  for (const [date, values] of Object.entries(raw.labs || {}).slice(0, 40)) {
    labs[cleanString(date, 12)] = cleanRecord(values, 100, 80)
  }
  const vitals = {}
  for (const [date, values] of Object.entries(raw.vitals || {}).slice(0, 40)) {
    vitals[cleanString(date, 12)] = cleanRecord(values, 80, 100)
  }
  return {
    id: text('id', 80),
    episodeId: text('episodeId', 80),
    occupiedAt: Number.isFinite(raw.occupiedAt) ? raw.occupiedAt : Date.now(),
    leito: text('leito', 30),
    nome: text('nome', 160),
    iniciais: '',
    dx: text('dx', 500),
    peso: text('peso', 30),
    idade: text('idade', 30),
    admHosp: text('admHosp', 12),
    admUti: text('admUti', 12),
    labs,
    vitals,
    bh: cleanList(raw.bh, 90, (x) => cleanRecord(x, 20, 100)),
    invasoes: cleanList(raw.invasoes, 40, (x) => cleanRecord(x, 20, 500)),
    drogas: cleanList(raw.drogas, 40, (x) => cleanRecord(x, 24, 500)),
    examesImg: cleanList(raw.examesImg, 40, (x) => cleanRecord(x, 16, 2500)),
    evo: {
      problemas: cleanString(raw.evo?.problemas, 12_000),
      examesRelevantes: cleanString(raw.evo?.examesRelevantes, 12_000),
      culturas: cleanString(raw.evo?.culturas, 12_000),
      clinica: cleanString(raw.evo?.clinica, 12_000),
      avaliacao: cleanString(raw.evo?.avaliacao, 12_000),
      conduta: cleanString(raw.evo?.conduta, 12_000),
      templateId: ['sedado', 'sem_sedacao', 'tqt_vm'].includes(raw.evo?.templateId)
        ? raw.evo.templateId
        : null,
    },
  }
}

function sanitizePlantao(body) {
  if (!body || typeof body !== 'object') return null
  if (!Array.isArray(body.patients)) return null
  const patients = body.patients.slice(0, 10).map(sanitizePatient).filter(Boolean)
  let activeId = body.activeId ?? null
  if (!patients.length) {
    activeId = null
  } else if (!patients.some((p) => p.id === activeId)) {
    activeId = patients[0]?.id || null
  }
  return {
    patients,
    activeId: activeId == null ? null : cleanString(activeId, 80),
    plantao: {
      hospital: cleanString(body.plantao?.hospital, 160),
      servico: cleanString(body.plantao?.servico, 160),
      unidade: cleanString(body.plantao?.unidade, 160),
    },
  }
}

export { sanitizePlantao }

export default async function handler(req, res) {
  cors(req, res)
  if (req.method === 'OPTIONS') {
    const origin = requestOrigin(req)
    if (origin && !AUTHORIZED_PARTIES.includes(origin)) {
      res.status(403).end()
      return
    }
    res.status(204).end()
    return
  }

  try {
    const userId = await userIdFromRequest(req)
    enforceRateLimit(userId)

    if (req.method === 'GET') {
      const data = await storeGet(userId)
      res.status(200).json({
        ok: true,
        plantao: data,
        backend: hasKv() ? 'kv' : 'clerk_metadata',
      })
      return
    }

    if (req.method === 'PUT') {
      const body = await readJsonBody(req)
      const plantao = sanitizePlantao(body)
      if (!plantao) {
        res.status(400).json({
          ok: false,
          error: 'Plantão inválido (body vazio ou sem patients)',
          code: 'bad_body',
        })
        return
      }
      const current = await storeGet(userId)
      const currentRevision = Number(current?.revision) || 0
      const baseRevision = Number(body.baseRevision) || 0
      if (baseRevision !== currentRevision) {
        res.status(409).json({
          ok: false,
          error: 'O plantão foi alterado em outro dispositivo. Recarregue antes de salvar.',
          code: 'revision_conflict',
          plantao: current,
        })
        return
      }
      const now = Date.now()
      plantao.revision = currentRevision + 1
      plantao.updatedAt = now
      plantao.deletedAt = null
      const meta = await storePut(userId, plantao)
      res.status(200).json({ ok: true, plantao, ...meta })
      return
    }

    if (req.method === 'DELETE') {
      const body = await readJsonBody(req)
      const current = await storeGet(userId)
      const currentRevision = Number(current?.revision) || 0
      const baseRevision = Number(body?.baseRevision) || 0
      if (baseRevision !== currentRevision) {
        res.status(409).json({
          ok: false,
          error: 'O plantão foi alterado em outro dispositivo. Recarregue antes de encerrar.',
          code: 'revision_conflict',
          plantao: current,
        })
        return
      }
      const now = Date.now()
      const tombstone = {
        patients: [],
        activeId: null,
        plantao: {
          hospital: cleanString(current?.plantao?.hospital, 160),
          servico: cleanString(current?.plantao?.servico, 160),
          unidade: cleanString(current?.plantao?.unidade, 160),
        },
        revision: currentRevision + 1,
        updatedAt: now,
        deletedAt: now,
      }
      const meta = await storePut(userId, tombstone)
      res.status(200).json({ ok: true, plantao: tombstone, ...meta })
      return
    }

    res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (e) {
    console.error('[hub-plantao]', e?.code || 'error', e?.message || 'Erro')
    const status = e.status || 500
    res.status(status).json({
      ok: false,
      error: status >= 500 ? 'Erro ao sincronizar o plantão' : e.message,
      code: e.code || 'error',
    })
  }
}
