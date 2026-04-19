import ManagerPassword from "@rahoot/web/features/game/components/create/ManagerPassword"
import QuizzBuilder from "@rahoot/web/features/game/components/create/QuizzBuilder"
import {
  useEvent,
  useSocket,
} from "@rahoot/web/features/game/contexts/socketProvider"
import { useState } from "react"
import toast from "react-hot-toast"

const CreatePage = () => {
  const { socket } = useSocket()
  const [isAuth, setIsAuth] = useState(false)

  useEvent("manager:quizzList", () => {
    setIsAuth(true)
  })

  useEvent("manager:errorMessage", (msg) => {
    toast.error(msg)
  })

  const handleAuth = (password: string) => {
    socket?.emit("manager:auth", password)
  }

  if (!isAuth) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <ManagerPassword onSubmit={handleAuth} />
      </div>
    )
  }

  return <QuizzBuilder />
}

export default CreatePage
