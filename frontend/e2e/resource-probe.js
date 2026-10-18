/* global window */

(() => {
  const timeouts = new Set()
  const intervals = new Set()
  const sources = new Set()
  const documentId = window.crypto.randomUUID()

  const nativeTimeout = window.setTimeout.bind(window)
  const nativeInterval = window.setInterval.bind(window)
  const nativeClearTimeout = window.clearTimeout.bind(window)
  const nativeClearInterval = window.clearInterval.bind(window)
  const NativeEventSource = window.EventSource

  window.setTimeout = (handler, delay, ...args) => {
    if (typeof handler !== 'function') {
      throw new TypeError(
        'The resource probe requires function-based timeout callbacks',
      )
    }

    let id = 0

    id = nativeTimeout(() => {
      timeouts.delete(id)
      Reflect.apply(handler, window, args)
    }, delay)

    timeouts.add(id)
    return id
  }

  window.setInterval = (handler, delay, ...args) => {
    const id = nativeInterval(handler, delay, ...args)
    intervals.add(id)
    return id
  }

  function forgetTimer(id) {
    timeouts.delete(id)
    intervals.delete(id)
  }

  window.clearTimeout = id => {
    forgetTimer(id)
    nativeClearTimeout(id)
  }

  window.clearInterval = id => {
    forgetTimer(id)
    nativeClearInterval(id)
  }

  window.EventSource = class extends NativeEventSource {
    constructor(url, options) {
      super(url, options)
      sources.add(this)

      this.addEventListener('error', () => {
        if (this.readyState === NativeEventSource.CLOSED) {
          sources.delete(this)
        }
      })
    }

    close() {
      sources.delete(this)
      super.close()
    }
  }

  Object.defineProperty(window, '__pipelinePulseResources', {
    value: () => ({
      documentId,
      eventSources: sources.size,
      timeouts: timeouts.size,
      intervals: intervals.size,
    }),
  })
})()