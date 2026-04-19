import type { Question, Quizz } from "@rahoot/common/types/game"
import AIPanel from "@rahoot/web/features/game/components/create/AIPanel"
import QuestionEditor from "@rahoot/web/features/game/components/create/QuestionEditor"
import {
  useEvent,
  useSocket,
} from "@rahoot/web/features/game/contexts/socketProvider"
import { useState } from "react"
import toast from "react-hot-toast"
import { useNavigate } from "react-router"

const DEFAULT_QUESTION: Question = {
  question: "",
  answers: ["", "", "", ""],
  solution: 0,
  cooldown: 5,
  time: 20,
}

const QuizzBuilder = () => {
  const { socket } = useSocket()
  const navigate = useNavigate()

  const [subject, setSubject] = useState("")
  const [questions, setQuestions] = useState<Question[]>([{ ...DEFAULT_QUESTION }])
  const [showAI, setShowAI] = useState(false)
  const [saving, setSaving] = useState(false)

  useEvent("manager:quizzSaved", ({ id }) => {
    setSaving(false)
    toast.success(`Quiz sauvegardé (id: ${id})`)
    navigate("/manager")
  })

  useEvent("manager:errorMessage", (msg) => {
    setSaving(false)
    toast.error(msg)
  })

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { ...DEFAULT_QUESTION }])
  }

  const updateQuestion = (i: number, q: Question) => {
    setQuestions((prev) => prev.map((old, idx) => (idx === i ? q : old)))
  }

  const deleteQuestion = (i: number) => {
    if (questions.length <= 1) {
      toast.error("Le quiz doit avoir au moins une question")
      return
    }
    setQuestions((prev) => prev.filter((_, idx) => idx !== i))
  }

  const moveQuestion = (i: number, dir: -1 | 1) => {
    const next = i + dir
    if (next < 0 || next >= questions.length) return
    setQuestions((prev) => {
      const arr = [...prev]
      ;[arr[i], arr[next]] = [arr[next], arr[i]]
      return arr
    })
  }

  const handleAddAIQuestions = (aiQuestions: Question[]) => {
    setQuestions((prev) => [...prev, ...aiQuestions])
  }

  const validate = (): string | null => {
    if (!subject.trim()) return "Le titre du quiz est requis"
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question.trim()) return `Question ${i + 1} : l'énoncé est vide`
      if (q.answers.some((a) => !a.trim()))
        return `Question ${i + 1} : toutes les réponses doivent être remplies`
      if (q.solution >= q.answers.length)
        return `Question ${i + 1} : la bonne réponse est invalide`
    }
    return null
  }

  const handleSave = () => {
    const error = validate()
    if (error) {
      toast.error(error)
      return
    }

    const quizz: Quizz = { subject: subject.trim(), questions }
    setSaving(true)
    socket?.emit("manager:saveQuizz", { filename: subject.trim(), quizz })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {showAI && (
        <AIPanel
          onAddQuestions={handleAddAIQuestions}
          onClose={() => setShowAI(false)}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <button
            onClick={() => navigate("/manager")}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            ← Retour
          </button>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Titre du quiz…"
            className="min-w-0 flex-1 rounded border border-gray-200 px-3 py-1.5 text-lg font-semibold focus:border-blue-400 focus:ring-1 focus:outline-none"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary shrink-0 rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        {/* AI Button */}
        <button
          onClick={() => setShowAI(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 py-3 text-blue-600 transition hover:border-blue-400 hover:bg-blue-100"
        >
          <span className="text-xl">✨</span>
          <span className="font-semibold">Générer des questions avec ALBERT</span>
        </button>

        {/* Questions */}
        {questions.map((q, i) => (
          <div key={i} className="group relative">
            <div className="absolute -left-8 top-1/2 hidden -translate-y-1/2 flex-col gap-1 group-hover:flex">
              <button
                onClick={() => moveQuestion(i, -1)}
                disabled={i === 0}
                className="rounded bg-gray-200 px-1 text-xs disabled:opacity-30 hover:bg-gray-300"
              >
                ▲
              </button>
              <button
                onClick={() => moveQuestion(i, 1)}
                disabled={i === questions.length - 1}
                className="rounded bg-gray-200 px-1 text-xs disabled:opacity-30 hover:bg-gray-300"
              >
                ▼
              </button>
            </div>
            <QuestionEditor
              question={q}
              index={i}
              onChange={(updated) => updateQuestion(i, updated)}
              onDelete={() => deleteQuestion(i)}
            />
          </div>
        ))}

        {/* Add question */}
        <button
          onClick={addQuestion}
          className="w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-gray-500 transition hover:border-gray-400 hover:text-gray-700"
        >
          + Ajouter une question manuellement
        </button>
      </div>
    </div>
  )
}

export default QuizzBuilder
