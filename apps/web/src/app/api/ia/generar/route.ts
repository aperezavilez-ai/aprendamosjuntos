import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MAX_CONTEXT_CHARS = 18000
const MAX_PROMPT_CHARS = 4000
const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504])

type IaRequest = {
  modo?: string
  contexto?: string
  prompt?: string
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callAnthropicWithRetry(
  client: Anthropic,
  payload: Anthropic.Messages.MessageCreateParamsNonStreaming
) {
  let lastError: any = null

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await client.messages.create(payload)
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

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY no configurada' },
      { status: 503 }
    )
  }

  const client = new Anthropic({ apiKey })

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

    const respuesta = await callAnthropicWithRetry(client, {
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: mensajeCompleto,
        },
      ],
      system: `Eres un especialista experto en Terapia Ocupacional Infantil con 15 años de experiencia clínica. 
Tu rol es asistir a terapeutas con análisis clínicos, reportes de progreso y recomendaciones terapéuticas basadas en evidencia.
Siempre mantienes un tono profesional pero comprensible para los padres.
Tus respuestas están basadas en enfoques como la Teoría de Integración Sensorial de Ayres, el Modelo de Ocupación Humana (MOHO), 
y las guías de práctica basada en evidencia de AOTA.
Genera contenido en español latinoamericano (México).`,
    })

    const contenido = respuesta.content
      .filter(c => c.type === 'text')
      .map(c => (c as any).text)
      .join('\n')

    const inputTokens = Number(respuesta.usage?.input_tokens || 0)
    const outputTokens = Number(respuesta.usage?.output_tokens || 0)
    const tokensUsados = inputTokens + outputTokens

    return NextResponse.json({
      contenido,
      tokens: tokensUsados,
      modo: modo || 'reporte',
      modelo: 'claude-sonnet-4-6',
    })

  } catch (error: any) {
    console.error('Error en API de IA:', error)

    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'API key de Anthropic no válida o no configurada' },
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
