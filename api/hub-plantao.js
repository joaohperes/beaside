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

const AUTHORIZED_PARTIES = [
  'https://be-aside.vercel.app',
  'https://be-aside-joaohperes-projects.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Cache-Control', 'no-store')
}

function bearer(req) {
  const h = req.headers.authorization || req.headers.Authorization || ''
  const m = String(h).match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : ''
}

/** Vercel às vezes entrega body já parseado; às vezes string; às vezes stream. */
async function readJsonBody(req) {
  if (req.body != null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body)
    } catch {
      return null
    }
  }
  // raw stream
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
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
    // retry sem authorizedParties (alguns tokens de sessão não trazem azp)
    try {
      const payload = await verifyToken(token, {
        secretKey,
        clockSkewInMs: 15_000,
      })
      if (payload?.sub) return String(payload.sub)
    } catch (e2) {
      const detail = e2?.message || e?.message || 'token inválido'
      const err = new Error(`Sessão inválida: ${detail}`)
      err.status = 401
      err.code = 'bad_token'
      err.detail = detail
      throw err
    }
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

async function storeDelete(userId) {
  if (hasKv()) {
    await kvCommand(['del', `${KEY_PREFIX}${userId}`])
    return { backend: 'kv' }
  }
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  await clerk.users.updateUserMetadata(userId, {
    privateMetadata: { hubPlantao: null },
  })
  return { backend: 'clerk_metadata' }
}

function sanitizePlantao(body) {
  if (!body || typeof body !== 'object') return null
  if (!Array.isArray(body.patients) || !body.patients.length) return null
  const patients = body.patients.slice(0, 10)
  let activeId = body.activeId
  if (!patients.some((p) => p && p.id === activeId)) {
    activeId = patients[0]?.id || null
  }
  return {
    patients,
    activeId,
    updatedAt: typeof body.updatedAt === 'number' ? body.updatedAt : Date.now(),
  }
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  try {
    const userId = await userIdFromRequest(req)

    if (req.method === 'GET') {
      const data = await storeGet(userId)
      res.status(200).json({
        ok: true,
        plantao: data,
        backend: hasKv() ? 'kv' : 'clerk_metadata',
        userId,
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
          gotType: body == null ? 'null' : typeof body,
        })
        return
      }
      const meta = await storePut(userId, plantao)
      res.status(200).json({ ok: true, plantao, ...meta })
      return
    }

    if (req.method === 'DELETE') {
      const meta = await storeDelete(userId)
      res.status(200).json({ ok: true, ...meta })
      return
    }

    res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (e) {
    console.error('[hub-plantao]', e?.code || e?.reason || '', e?.message || e)
    const status = e.status || 500
    res.status(status).json({
      ok: false,
      error: e.message || 'Erro no servidor',
      code: e.code || 'error',
      detail: e.detail || e.reason || undefined,
    })
  }
}
