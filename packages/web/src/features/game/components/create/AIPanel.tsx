import type { Question } from "@rahoot/common/types/game"
import LatexRenderer from "@rahoot/web/features/game/components/LatexRenderer"
import {
  useEvent,
  useSocket,
} from "@rahoot/web/features/game/contexts/socketProvider"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"

type Props = {
  onAddQuestions: (_questions: Question[]) => void
  onClose: () => void
}

const AIPanel = ({ onAddQuestions, onClose }: Props) => {
  const { socket } = useSocket()

  const [topic, setTopic] = useState("")
  const [count, setCount] = useState(5)
  const [model, setModel] = useState("")
  const [models, setModels] = useState<string[]>([])
  const [modelsLoading, setModelsLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<Question[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    socket?.emit("manager:getModels")
  }, [socket])

  useEvent("manager:modelsList", (list) => {
    setModels(list)
    setModelsLoading(false)
    if (list.length > 0 && !model) {
      setModel(list[0])
    }
  })

  useEvent("manager:questionsGenerated", (questions) => {
    setGenerating(false)
    setGenerated(questions)
    setSelected(new Set(questions.map((_, i) => i)))
  })

  useEvent("manager:errorMessage", (msg) => {
    setGenerating(false)
    toast.error(msg)
  })

  const handleGenerate = () => {
    if (!topic.trim()) {
      toast.error("Saisis un sujet")
      return
    }
    if (!model) {
      toast.error("Sélectionne un modèle")
      return
    }
    setGenerating(true)
    setGenerated([])
    socket?.emit("manager:generateQuestions", {
      topic: topic.trim(),
      count,
      model,
    })
  }

  const toggleSelect = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const handleAdd = () => {
    const toAdd = generated.filter((_, i) => selected.has(i))
    if (toAdd.length === 0) {
      toast.error("Sélectionne au moins une question")
      return
    }
    onAddQuestions(toAdd)
    onClose()
    toast.success(`${toAdd.length} question${toAdd.length > 1 ? "s" : ""} ajoutée${toAdd.length > 1 ? "s" : ""}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold">Générer avec ALBERT</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Config */}
          <div className="mb-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Sujet / thème
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                placeholder="ex: Mathématiques lycée, Histoire de France, Python…"
                className="w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-400 focus:ring-1 focus:outline-none"
                disabled={generating}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nombre de questions
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-400 focus:ring-1 focus:outline-none"
                  disabled={generating}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Modèle ALBERT
                </label>
                {modelsLoading ? (
                  <div className="rounded border border-gray-300 p-2 text-sm text-gray-400">
                    Chargement…
                  </div>
                ) : (
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-400 focus:ring-1 focus:outline-none"
                    disabled={generating}
                  >
                    {models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || modelsLoading}
              className="bg-primary w-full rounded-lg py-2 font-semibold text-white disabled:opacity-50"
            >
              {generating ? "Génération en cours…" : "Générer"}
            </button>
          </div>

          {/* Results */}
          {generated.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">
                  {generated.length} question{generated.length > 1 ? "s" : ""} générée{generated.length > 1 ? "s" : ""}
                </h3>
                <button
                  onClick={() =>
                    setSelected(
                      selected.size === generated.length
                        ? new Set()
                        : new Set(generated.map((_, i) => i)),
                    )
                  }
                  className="text-sm text-blue-500 hover:underline"
                >
                  {selected.size === generated.length
                    ? "Tout désélectionner"
                    : "Tout sélectionner"}
                </button>
              </div>

              {generated.map((q, i) => (
                <button
                  key={i}
                  onClick={() => toggleSelect(i)}
                  className={`w-full rounded-lg border-2 p-3 text-left transition-colors ${
                    selected.has(i)
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <p className="mb-2 text-sm font-medium">
                    <LatexRenderer text={q.question} />
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {q.answers.map((a, ai) => (
                      <span
                        key={ai}
                        className={`rounded px-2 py-0.5 text-xs ${
                          ai === q.solution
                            ? "bg-green-100 font-semibold text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <LatexRenderer text={a} />
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {generated.length > 0 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <span className="text-sm text-gray-500">
              {selected.size} / {generated.length} sélectionnée{selected.size > 1 ? "s" : ""}
            </span>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleAdd}
                className="bg-primary rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={selected.size === 0}
              >
                Ajouter au quiz
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AIPanel
