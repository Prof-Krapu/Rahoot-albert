import type { Question } from "@rahoot/common/types/game"

const ALBERT_BASE_URL = "https://albert.api.etalab.gouv.fr"

const SYSTEM_PROMPT = `Tu es un générateur de questions de quiz pédagogiques.
Réponds UNIQUEMENT avec un tableau JSON valide, sans texte avant ni après, sans bloc de code markdown.
Format strict de chaque question :
{"question":"...","answers":["...","...","...","..."],"solution":0,"cooldown":5,"time":20}
Règles :
- "solution" est l'index (0 à 3) de la bonne réponse
- Toujours 4 réponses, sauf si moins de 4 sont pertinentes (minimum 2)
- Tu peux utiliser LaTeX avec $...$ pour les formules mathématiques
- Les questions doivent être claires et les mauvaises réponses plausibles`

export async function getAlbertModels(apiKey: string): Promise<string[]> {
  const response = await fetch(`${ALBERT_BASE_URL}/v1/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!response.ok) {
    throw new Error(buildError(response.status))
  }

  const data = await response.json()
  const models: string[] = (data.data ?? []).map((m: { id: string }) => m.id)
  return models.sort()
}

export async function generateQuestions(
  apiKey: string,
  model: string,
  topic: string,
  count: number,
): Promise<Question[]> {
  const response = await fetch(`${ALBERT_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Génère ${count} question${count > 1 ? "s" : ""} QCM sur : ${topic}`,
        },
      ],
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error(buildError(response.status))
  }

  const data = await response.json()
  const content: string = data.choices?.[0]?.message?.content ?? ""

  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error("Format de réponse invalide — le modèle n'a pas retourné un JSON valide")
  }

  let questions: unknown[]
  try {
    questions = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error("Impossible de parser la réponse JSON du modèle")
  }

  return questions.map((q: any, i: number) => {
    if (
      typeof q.question !== "string" ||
      !Array.isArray(q.answers) ||
      typeof q.solution !== "number"
    ) {
      throw new Error(`Question ${i + 1} invalide dans la réponse du modèle`)
    }
    return {
      question: q.question,
      answers: q.answers.map(String),
      solution: q.solution,
      cooldown: q.cooldown ?? 5,
      time: q.time ?? 20,
      image: q.image,
    } satisfies Question
  })
}

function buildError(status: number): string {
  if (status === 401) return "Clé API ALBERT invalide ou expirée"
  if (status === 429) return "Limite de requêtes ALBERT atteinte, réessayez dans quelques instants"
  if (status === 503) return "Service ALBERT temporairement indisponible"
  return `Erreur ALBERT API (${status})`
}
