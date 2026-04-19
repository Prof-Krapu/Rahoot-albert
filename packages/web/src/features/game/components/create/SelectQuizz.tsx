import type { QuizzWithId } from "@rahoot/common/types/game"
import Button from "@rahoot/web/features/game/components/Button"
import {
  useEvent,
  useSocket,
} from "@rahoot/web/features/game/contexts/socketProvider"
import clsx from "clsx"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useNavigate } from "react-router"

type Props = {
  quizzList: QuizzWithId[]
  onSelect: (_id: string) => void
}

const SelectQuizz = ({ quizzList, onSelect }: Props) => {
  const navigate = useNavigate()
  const { socket } = useSocket()

  const [selected, setSelected] = useState<string | null>(null)
  const [list, setList] = useState<QuizzWithId[]>(quizzList)
  const [albertStatus, setAlbertStatus] = useState<{
    configured: boolean
    fromEnv: boolean
  } | null>(null)
  const [albertKey, setAlbertKey] = useState("")
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [savingKey, setSavingKey] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    setList(quizzList)
  }, [quizzList])

  useEffect(() => {
    socket?.emit("manager:getAlbertStatus")
  }, [socket])

  useEvent("manager:albertStatus", (status) => {
    setAlbertStatus(status)
  })

  useEvent("manager:albertKeySaved", () => {
    setSavingKey(false)
    setShowKeyInput(false)
    setAlbertKey("")
    toast.success("Clé ALBERT sauvegardée")
    socket?.emit("manager:getAlbertStatus")
  })

  useEvent("manager:quizzDeleted", () => {
    setDeletingId(null)
    toast.success("Quiz supprimé")
    socket?.emit("manager:refreshQuizzList")
  })

  useEvent("manager:quizzList", (updatedList) => {
    setList(updatedList)
  })

  useEvent("manager:errorMessage", (msg) => {
    setSavingKey(false)
    setDeletingId(null)
    toast.error(msg)
  })

  const handleSelect = (id: string) => () => {
    setSelected(selected === id ? null : id)
  }

  const handleSubmit = () => {
    if (!selected) {
      toast.error("Please select a quizz")
      return
    }
    onSelect(selected)
  }

  const handleDelete = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm("Supprimer ce quiz ?")) return
    setDeletingId(id)
    socket?.emit("manager:deleteQuizz", { id })
    setList((prev) => prev.filter((q) => q.id !== id))
    if (selected === id) setSelected(null)
  }

  const handleSaveKey = () => {
    if (!albertKey.trim()) return
    setSavingKey(true)
    socket?.emit("manager:setAlbertKey", albertKey.trim())
  }

  return (
    <div className="z-10 flex w-full max-w-md flex-col gap-4 rounded-md bg-white p-4 shadow-sm">
      {/* ALBERT status */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              ALBERT IA
            </span>
            {albertStatus === null ? (
              <span className="text-xs text-gray-400">Chargement…</span>
            ) : albertStatus.configured ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                {albertStatus.fromEnv ? "✓ via env var" : "✓ configuré"}
              </span>
            ) : (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                Non configuré
              </span>
            )}
          </div>
          {albertStatus && !albertStatus.fromEnv && (
            <button
              onClick={() => setShowKeyInput((v) => !v)}
              className="text-xs text-blue-500 hover:underline"
            >
              {showKeyInput ? "Annuler" : albertStatus.configured ? "Modifier la clé" : "Configurer"}
            </button>
          )}
        </div>

        {showKeyInput && (
          <div className="mt-2 flex gap-2">
            <input
              type="password"
              value={albertKey}
              onChange={(e) => setAlbertKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
              placeholder="Clé API ALBERT…"
              className="flex-1 rounded border border-gray-300 p-1.5 text-sm focus:border-blue-400 focus:outline-none"
            />
            <button
              onClick={handleSaveKey}
              disabled={savingKey || !albertKey.trim()}
              className="bg-primary rounded px-3 text-sm text-white disabled:opacity-50"
            >
              {savingKey ? "…" : "OK"}
            </button>
          </div>
        )}
      </div>

      {/* Create quiz button */}
      <button
        onClick={() => navigate("/create")}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 py-2 text-blue-600 transition hover:border-blue-400 hover:bg-blue-100"
      >
        <span>✨</span>
        <span className="font-semibold text-sm">Créer un nouveau quiz</span>
      </button>

      {/* Quiz list */}
      <div className="flex flex-col items-center justify-center">
        <h1 className="mb-2 text-2xl font-bold">Sélectionner un quiz</h1>
        <div className="w-full space-y-2">
          {list.length === 0 && (
            <p className="text-center text-sm text-gray-400">
              Aucun quiz disponible
            </p>
          )}
          {list.map((quizz) => (
            <button
              key={quizz.id}
              className={clsx(
                "flex w-full items-center justify-between rounded-md p-3 outline outline-gray-300",
              )}
              onClick={handleSelect(quizz.id)}
            >
              <span>{quizz.subject}</span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete(quizz.id)}
                  disabled={deletingId === quizz.id}
                  className="rounded px-1.5 py-0.5 text-xs text-red-400 hover:bg-red-50 disabled:opacity-40"
                >
                  {deletingId === quizz.id ? "…" : "✕"}
                </button>
                <div
                  className={clsx(
                    "h-5 w-5 rounded outline outline-offset-3 outline-gray-300",
                    selected === quizz.id &&
                      "bg-primary border-primary/80 shadow-inset",
                  )}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleSubmit}>Jouer</Button>
    </div>
  )
}

export default SelectQuizz
