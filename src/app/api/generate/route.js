import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { url } = await request.json()

    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const html = await res.text()
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 4000)

    // Try multiple models
    const MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-pro']
    const CATEGORIES = ['Adhesives', 'Waterproofing', 'Flooring', 'Grouts and Mortars', 'Concrete Repair', 'General Products']
    const LEVELS = ['Beginner', 'Intermediate', 'Advanced']
    let totalSaved = 0
    let workingModel = null

    // Find working model first
    for (const model of MODELS) {
      try {
        const testRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'Say hello' }] }] })
          }
        )
        const testData = await testRes.json()
        if (testData?.candidates?.[0]?.content) {
          workingModel = model
          console.log(`Using model: ${model}`)
          break
        }
      } catch (e) {
        continue
      }
    }

    if (!workingModel) {
      return Response.json({ message: '❌ No Gemini models available. Check your API key.' })
    }

    for (const level of LEVELS) {
      for (const category of CATEGORIES) {
        const prompt = `You are a quiz generator for Mapei construction products. Based on this content: ${text} Generate 3 multiple choice questions about "${category}" at "${level}" difficulty. Return ONLY a JSON array no markdown: [{"question":"...","option_a":"...","option_b":"...","option_c":"...","option_d":"...","correct_answer":"a","explanation":"..."}]`

        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${workingModel}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            }
          )
          const geminiData = await geminiRes.json()
          const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
          const match = raw.match(/\[[\s\S]*\]/)
          if (!match) continue
          const questions = JSON.parse(match[0])
          for (const q of questions) {
            await supabase.from('questions').insert([{ ...q, difficulty: level, category, approved: false }])
            totalSaved++
          }
        } catch (e) {
          console.error(`Failed ${level}/${category}:`, e.message)
        }
      }
    }

    return Response.json({ message: `✅ Generated and saved ${totalSaved} questions for review!` })
  } catch (error) {
    return Response.json({ message: `❌ Error: ${error.message}` }, { status: 500 })
  }
}
