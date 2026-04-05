const APP_CACHE = "ppv-app-shell-v1"
const APP_SHELL = ["/", "/manifest.json"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== APP_CACHE).map((key) => caches.delete(key)))
    )
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached
      }

      return fetch(event.request)
        .then((response) => {
          if (!response.ok || response.type !== "basic") {
            return response
          }

          const clone = response.clone()
          caches.open(APP_CACHE).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() => caches.match("/"))
    })
  )
})
