import { render } from "preact"
import { App } from "./app"
import { registerServiceWorker } from "./sw/register-sw"
import { startOfflineWriteQueueReplay } from "./lib/offline-write-queue"
import "./index.css"

registerServiceWorker()
startOfflineWriteQueueReplay(import.meta.env.VITE_API_BASE_URL || "/api")

render(<App />, document.getElementById("app")!)
