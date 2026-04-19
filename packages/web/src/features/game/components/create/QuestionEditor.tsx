import type { Question } from "@rahoot/common/types/game"
import LatexRenderer from "@rahoot/web/features/game/components/LatexRenderer"
import clsx from "clsx"

type Props = {
  question: Question
  index: number
  onChange: (_q: Question) => void
  onDelete: () => void
}

const ANSWER_COLORS = [
  "border-red-400 focus:ring-red-300",
  "border-blue-400 focus:ring-blue-300",
  "border-yellow-400 focus:ring-yellow-300",
  "border-green-400 focus:ring-green-300",
]

const QuestionEditor = ({ question, index, onChange, onDelete }: Props) => {
  const update = (patch: Partial<Question>) => onChange({ ...question, ...patch })

  const updateAnswer = (i: number, value: string) => {
    const answers = [...question.answers]
    answers[i] = value
    update({ answers })
  }

  const addAnswer = () => {
    if (question.answers.length >= 4) return
    update({ answers: [...question.answers, ""] })
  }

  const removeAnswer = (i: number) => {
    if (question.answers.length <= 2) return
    const answers = question.answers.filter((_, idx) => idx !== i)
    const solution = question.solution >= answers.length ? 0 : question.solution
    update({ answers, solution })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-500">
          Question {index + 1}
        </span>
        <button
          onClick={onDelete}
          className="rounded px-2 py-1 text-sm text-red-500 hover:bg-red-50"
        >
          Supprimer
        </button>
      </div>

      {/* Question text */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Énoncé <span className="text-gray-400">(LaTeX avec $...$)</span>
        </label>
        <textarea
          value={question.question}
          onChange={(e) => update({ question: e.target.value })}
          placeholder="Quelle est la valeur de $\pi$ ?"
          rows={2}
          className="w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-300 focus:outline-none"
        />
        {question.question && (
          <div className="mt-1 rounded bg-gray-50 px-2 py-1 text-sm">
            <LatexRenderer text={question.question} />
          </div>
        )}
      </div>

      {/* Answers */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Réponses{" "}
          <span className="text-gray-400">(cliquer le cercle = bonne réponse)</span>
        </label>
        <div className="space-y-2">
          {question.answers.map((answer, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => update({ solution: i })}
                className={clsx(
                  "h-5 w-5 shrink-0 rounded-full border-2 transition-colors",
                  question.solution === i
                    ? "border-green-500 bg-green-500"
                    : "border-gray-300 hover:border-green-400",
                )}
              />
              <input
                value={answer}
                onChange={(e) => updateAnswer(i, e.target.value)}
                placeholder={`Réponse ${i + 1}`}
                className={clsx(
                  "flex-1 rounded border p-2 text-sm focus:ring-1 focus:outline-none",
                  ANSWER_COLORS[i],
                )}
              />
              {question.answers.length > 2 && (
                <button
                  onClick={() => removeAnswer(i)}
                  className="text-gray-400 hover:text-red-400"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {question.answers.length < 4 && (
          <button
            onClick={addAnswer}
            className="mt-2 text-sm text-blue-500 hover:underline"
          >
            + Ajouter une réponse
          </button>
        )}
      </div>

      {/* Image URL */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-gray-600">
          URL image <span className="text-gray-400">(optionnel)</span>
        </label>
        <input
          value={question.image ?? ""}
          onChange={(e) => update({ image: e.target.value || undefined })}
          placeholder="https://..."
          className="w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-400 focus:ring-1 focus:outline-none"
        />
      </div>

      {/* Timing */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Temps de réponse (s)
          </label>
          <input
            type="number"
            min={5}
            max={120}
            value={question.time}
            onChange={(e) => update({ time: Number(e.target.value) })}
            className="w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-400 focus:ring-1 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Cooldown affichage (s)
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={question.cooldown}
            onChange={(e) => update({ cooldown: Number(e.target.value) })}
            className="w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-400 focus:ring-1 focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}

export default QuestionEditor
