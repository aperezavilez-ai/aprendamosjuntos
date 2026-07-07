import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MAX_CONTEXT_CHARS = 18000
const MAX_PROMPT_CHARS = 4000
const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504])

// Ruteado via GafCore API Proxy directo a Claude (NO pool-cheap): esta app
// maneja datos clinicos de pacientes (diagnosticos, medicamentos), asi que
// se queda en un proveedor con acuerdos de manejo de datos mas claros que
// los tiers gratis de Groq/Cerebras. El proxy traduce este body estilo
// OpenAI al formato nativo de Anthropic automaticamente.
const PROXY_URL = 'https://gafcore-api-proxy.vercel.app/api/proxy/v1/chat/completions'
const PROXY_PROJECT_KEY = process.env.GAFCORE_PROXY_PROJECT_KEY
const PROXY_PROVIDER_ID = '608200c4-280d-4c28-b058-7947cc4a0352' // claude
const PROXY_MODEL = 'claude-sonnet-5'

type IaRequest = {
  modo?: string
  contexto?: string
  prompt?: string
}

type ProxyChatResponse = {
  choices?: Array<{ message?: { content?: string } }>
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callGafcoreProxyWithRetry(body: Record<string, unknown>) {
  let lastError: any = null

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-key': PROXY_PROJECT_KEY ?? '',
          'x-provider-id': PROXY_PROVIDER_ID,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const status = res.status
        const error: any = new Error(`Proxy respondio ${status}`)
        error.status = status
        throw error
      }
      return (await res.json()) as ProxyChatResponse
    } catch (error: any) {
      lastError = error
      const status = Number(error?.status || 0)
      const shouldRetry = RETRYABLE_STATUS.has(status)
      if (!shouldRetry || attempt === 3) break
      await sleep(300 * attempt)
    }
  }

  throw lastError
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: staff } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  if (!staff || staff.rol === 'padre') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (!PROXY_PROJECT_KEY) {
    return NextResponse.json(
      { error: 'GAFCORE_PROXY_PROJECT_KEY no configurada' },
      { status: 503 }
    )
  }

  try {
    const { modo, contexto, prompt } = (await request.json()) as IaRequest

    if (!contexto?.trim() || !prompt?.trim()) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    const contextoSeguro = contexto.slice(0, MAX_CONTEXT_CHARS)
    const promptSeguro = prompt.slice(0, MAX_PROMPT_CHARS)

    const mensajeCompleto = `${promptSeguro}

DATOS DEL PACIENTE:
${contextoSeguro}

Por favor, genera el contenido solicitado en español, con un tono clínico y profesional pero accesible para los padres. Usa formato markdown para estructurar mejor la información.`

    const respuesta = await callGafcoreProxyWithRetry({
      model: PROXY_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: `Eres un especialista experto en Terapia Ocupacional Infantil con 15 años de experiencia clínica.
Tu rol es asistir a terapeutas con análisis clínicos, reportes de progreso y recomendaciones terapéuticas basadas en evidencia.
Siempre mantienes un tono profesional pero comprensible para los padres.
Tus respuestas están basadas en enfoques como la Teoría de Integración Sensorial de Ayres, el Modelo de Ocupación Humana (MOHO),
y las guías de práctica basada en evidencia de AOTA.
Genera contenido en español latinoamericano (México).`,
        },
        {
          role: 'user',
          content: mensajeCompleto,
        },
      ],
    })

    const contenido = respuesta.choices?.[0]?.message?.content ?? ''
    const inputTokens = Number(respuesta.usage?.prompt_tokens || 0)
    const outputTokens = Number(respuesta.usage?.completion_tokens || 0)
    const tokensUsados = inputTokens + outputTokens

    return NextResponse.json({
      contenido,
      tokens: tokensUsados,
      modo: modo || 'reporte',
      modelo: PROXY_MODEL,
    })

  } catch (error: any) {
    console.error('Error en API de IA:', error)

    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'Credenciales del proxy de IA no válidas' },
        { status: 401 }
      )
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Límite de uso de IA alcanzado. Intenta de nuevo en unos minutos.' },
        { status: 429 }
      )
    }

    if (error?.status === 400) {
      return NextResponse.json(
        { error: 'La solicitud de IA no es válida.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al procesar la solicitud de IA', details: error?.message },
      { status: 500 }
    )
  }
}
