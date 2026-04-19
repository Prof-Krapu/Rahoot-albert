import { Server } from "@rahoot/common/types/game/socket"
import { inviteCodeValidator } from "@rahoot/common/validators/auth"
import { generateQuestions, getAlbertModels } from "@rahoot/socket/services/albert"
import Config from "@rahoot/socket/services/config"
import Game from "@rahoot/socket/services/game"
import Registry from "@rahoot/socket/services/registry"
import { withGame } from "@rahoot/socket/utils/game"
import { Server as ServerIO } from "socket.io"

const WS_PORT = 3001

const io: Server = new ServerIO({
  path: "/ws",
})
Config.init()

const registry = Registry.getInstance()

const authenticatedManagers = new Set<string>()

console.log(`Socket server running on port ${WS_PORT}`)
io.listen(WS_PORT)

io.on("connection", (socket) => {
  console.log(
    `A user connected: socketId: ${socket.id}, clientId: ${socket.handshake.auth.clientId}`,
  )

  socket.on("player:reconnect", ({ gameId }) => {
    const game = registry.getPlayerGame(gameId, socket.handshake.auth.clientId)

    if (game) {
      game.reconnect(socket)

      return
    }

    socket.emit("game:reset", "Game not found")
  })

  socket.on("manager:reconnect", ({ gameId }) => {
    const game = registry.getManagerGame(gameId, socket.handshake.auth.clientId)

    if (game) {
      game.reconnect(socket)

      return
    }

    socket.emit("game:reset", "Game expired")
  })

  socket.on("manager:auth", (password) => {
    try {
      const config = Config.game()

      if (config.managerPassword === "PASSWORD") {
        socket.emit("manager:errorMessage", "Manager password is not configured")

        return
      }

      if (password !== config.managerPassword) {
        socket.emit("manager:errorMessage", "Invalid password")

        return
      }

      authenticatedManagers.add(socket.id)
      socket.emit("manager:quizzList", Config.quizz())
    } catch (error) {
      console.error("Failed to read game config:", error)
      socket.emit("manager:errorMessage", "Failed to read game config")
    }
  })

  socket.on("game:create", (quizzId) => {
    const quizzList = Config.quizz()
    const quizz = quizzList.find((q) => q.id === quizzId)

    if (!quizz) {
      socket.emit("game:errorMessage", "Quizz not found")

      return
    }

    const game = new Game(io, socket, quizz)
    registry.addGame(game)
  })

  socket.on("player:join", (inviteCode) => {
    const result = inviteCodeValidator.safeParse(inviteCode)

    if (result.error) {
      socket.emit("game:errorMessage", result.error.issues[0].message)

      return
    }

    const game = registry.getGameByInviteCode(inviteCode)

    if (!game) {
      socket.emit("game:errorMessage", "Game not found")

      return
    }

    socket.emit("game:successRoom", game.gameId)
  })

  socket.on("player:login", ({ gameId, data }) =>
    withGame(gameId, socket, (game) => game.join(socket, data.username)),
  )

  socket.on("manager:kickPlayer", ({ gameId, playerId }) =>
    withGame(gameId, socket, (game) => game.kickPlayer(socket, playerId)),
  )

  socket.on("manager:startGame", ({ gameId }) =>
    withGame(gameId, socket, (game) => game.start(socket)),
  )

  socket.on("player:selectedAnswer", ({ gameId, data }) =>
    withGame(gameId, socket, (game) =>
      game.selectAnswer(socket, data.answerKey),
    ),
  )

  socket.on("manager:abortQuiz", ({ gameId }) =>
    withGame(gameId, socket, (game) => game.abortRound(socket)),
  )

  socket.on("manager:nextQuestion", ({ gameId }) =>
    withGame(gameId, socket, (game) => game.nextRound(socket)),
  )

  socket.on("manager:showLeaderboard", ({ gameId }) =>
    withGame(gameId, socket, (game) => game.showLeaderboard()),
  )

  // ── Quiz creator handlers (require manager auth) ────────────────────────────

  socket.on("manager:refreshQuizzList", () => {
    if (!authenticatedManagers.has(socket.id)) {
      socket.emit("manager:errorMessage", "Non autorisé")
      return
    }
    socket.emit("manager:quizzList", Config.quizz())
  })

  socket.on("manager:getAlbertStatus", () => {
    if (!authenticatedManagers.has(socket.id)) {
      socket.emit("manager:errorMessage", "Non autorisé")
      return
    }

    const fromEnv = Boolean(process.env.ALBERT_API_KEY)
    const configured = Boolean(Config.getAlbertKey())
    socket.emit("manager:albertStatus", { configured, fromEnv })
  })

  socket.on("manager:setAlbertKey", (key) => {
    if (!authenticatedManagers.has(socket.id)) {
      socket.emit("manager:errorMessage", "Non autorisé")
      return
    }

    if (process.env.ALBERT_API_KEY) {
      socket.emit("manager:errorMessage", "La clé est définie via variable d'environnement et ne peut pas être modifiée ici")
      return
    }

    try {
      Config.setAlbertKey(key.trim())
      socket.emit("manager:albertKeySaved")
    } catch (error) {
      console.error("Failed to save ALBERT key:", error)
      socket.emit("manager:errorMessage", "Erreur lors de la sauvegarde de la clé")
    }
  })

  socket.on("manager:getModels", async () => {
    if (!authenticatedManagers.has(socket.id)) {
      socket.emit("manager:errorMessage", "Non autorisé")
      return
    }

    const apiKey = Config.getAlbertKey()
    if (!apiKey) {
      socket.emit("manager:errorMessage", "Clé API ALBERT non configurée")
      return
    }

    try {
      const models = await getAlbertModels(apiKey)
      socket.emit("manager:modelsList", models)
    } catch (error: any) {
      console.error("Failed to fetch ALBERT models:", error)
      socket.emit("manager:errorMessage", error.message ?? "Erreur lors de la récupération des modèles")
    }
  })

  socket.on("manager:generateQuestions", async ({ topic, count, model }) => {
    if (!authenticatedManagers.has(socket.id)) {
      socket.emit("manager:errorMessage", "Non autorisé")
      return
    }

    const apiKey = Config.getAlbertKey()
    if (!apiKey) {
      socket.emit("manager:errorMessage", "Clé API ALBERT non configurée")
      return
    }

    try {
      const questions = await generateQuestions(apiKey, model, topic, count)
      socket.emit("manager:questionsGenerated", questions)
    } catch (error: any) {
      console.error("Failed to generate questions:", error)
      socket.emit("manager:errorMessage", error.message ?? "Erreur lors de la génération")
    }
  })

  socket.on("manager:saveQuizz", ({ filename, quizz }) => {
    if (!authenticatedManagers.has(socket.id)) {
      socket.emit("manager:errorMessage", "Non autorisé")
      return
    }

    try {
      const id = Config.saveQuizz(filename, quizz)
      socket.emit("manager:quizzSaved", { id })
    } catch (error: any) {
      console.error("Failed to save quizz:", error)
      socket.emit("manager:errorMessage", error.message ?? "Erreur lors de la sauvegarde")
    }
  })

  socket.on("manager:deleteQuizz", ({ id }) => {
    if (!authenticatedManagers.has(socket.id)) {
      socket.emit("manager:errorMessage", "Non autorisé")
      return
    }

    try {
      Config.deleteQuizz(id)
      socket.emit("manager:quizzDeleted")
    } catch (error: any) {
      console.error("Failed to delete quizz:", error)
      socket.emit("manager:errorMessage", error.message ?? "Erreur lors de la suppression")
    }
  })

  // ── Disconnect ──────────────────────────────────────────────────────────────

  socket.on("disconnect", () => {
    console.log(`A user disconnected : ${socket.id}`)

    authenticatedManagers.delete(socket.id)

    const managerGame = registry.getGameByManagerSocketId(socket.id)

    if (managerGame) {
      managerGame.manager.connected = false
      registry.markGameAsEmpty(managerGame)

      if (!managerGame.started) {
        console.log("Reset game (manager disconnected)")
        managerGame.abortCooldown()
        io.to(managerGame.gameId).emit("game:reset", "Manager disconnected")
        registry.removeGame(managerGame.gameId)

        return
      }
    }

    const game = registry.getGameByPlayerSocketId(socket.id)

    if (!game) {
      return
    }

    const player = game.players.find((p) => p.id === socket.id)

    if (!player) {
      return
    }

    if (!game.started) {
      game.players = game.players.filter((p) => p.id !== socket.id)

      io.to(game.manager.id).emit("manager:removePlayer", player.id)
      io.to(game.gameId).emit("game:totalPlayers", game.players.length)

      console.log(`Removed player ${player.username} from game ${game.gameId}`)

      return
    }

    player.connected = false
    io.to(game.gameId).emit("game:totalPlayers", game.players.length)
  })
})

process.on("SIGINT", () => {
  Registry.getInstance().cleanup()
  process.exit(0)
})

process.on("SIGTERM", () => {
  Registry.getInstance().cleanup()
  process.exit(0)
})
