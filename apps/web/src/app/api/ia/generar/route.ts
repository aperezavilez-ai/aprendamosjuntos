import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: staff } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
  if (!staff || staff.rol === 'padre') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
  try {
    const { modo, contexto, prompt } = await request.json()

    if (!contexto || !prompt) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    const mensajeCompleto = `${prompt}

DATOS DEL PACIENTE:
${contexto}

Por favor, genera el contenido solicitado en español, con un tono clínico y profesional pero accesible para los padres. Usa formato markdown para estructurar mejor la información.`

    const respuesta = await client.messages.create({
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

    const tokensUsados = respuesta.usage?.input_tokens + respuesta.usage?.output_tokens

    return NextResponse.json({
      contenido,
      tokens: tokensUsados,
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

    return NextResponse.json(
      { error: 'Error al procesar la solicitud de IA', details: error?.message },
      { status: 500 }
    )
  }
}
