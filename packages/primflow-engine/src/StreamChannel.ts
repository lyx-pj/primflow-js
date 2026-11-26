import type { StreamWriter } from '@lyx-pj/primflow-model'

/** A task-owned queue. Waiting writers and readers are released on every terminal path. */
export class StreamChannel {
  private readonly queue: unknown[] = []
  private readonly waiters = new Set<() => void>()
  private readonly signal: AbortSignal
  private readonly validate: (value: unknown) => void
  private readonly connected: boolean
  private closed = false
  private writing = false
  private reading = false
  private readToEnd = false
  chunks = 0
  private failure?: { reason: unknown }

  constructor(signal: AbortSignal, validate: (value: unknown) => void, connected: boolean) {
    this.signal = signal
    this.validate = validate
    this.connected = connected
    signal.addEventListener('abort', this.abort, { once: true })
    if (signal.aborted) this.abort()
  }

  private abort = () => this.fail(this.signal.reason)

  private wake() {
    for (const notify of this.waiters) notify()
    this.waiters.clear()
  }

  private wait(): Promise<void> {
    return new Promise(resolve => this.waiters.add(resolve))
  }

  writer(): StreamWriter {
    return {
      write: async (value) => {
        if (this.writing) throw new Error('Await each stream write before writing another chunk.')
        this.writing = true
        try {
          while (!this.closed && this.queue.length >= 16) await this.wait()
          if (this.failure) throw this.failure.reason
          if (this.closed) throw new Error('Stream is closed.')
          this.validate(value)
          if (this.connected) this.queue.push(structuredClone(value))
          this.chunks++
          this.wake()
        } catch (error) {
          this.fail(error)
          throw error
        } finally {
          this.writing = false
        }
      },
      close: () => this.close(),
    }
  }

  async *read(): AsyncIterable<unknown> {
    if (this.reading) throw new Error('Stream already has a reader.')
    this.reading = true
    for (;;) {
      if (this.failure) throw this.failure.reason
      if (this.queue.length) {
        const value = this.queue.shift()
        this.wake()
        yield value
      } else if (this.closed) {
        this.readToEnd = true
        return
      } else {
        await this.wait()
      }
    }
  }

  close() {
    this.closed = true
    if (!this.connected) this.signal.removeEventListener('abort', this.abort)
    this.wake()
  }

  fail(reason: unknown) {
    if (this.failure) return
    this.failure = { reason }
    this.queue.length = 0
    this.closed = true
    this.signal.removeEventListener('abort', this.abort)
    this.wake()
  }

  finishConsumer() {
    if (!this.readToEnd) this.fail(new Error('Stream consumer finished before draining the stream.'))
    this.signal.removeEventListener('abort', this.abort)
    return this.failure
  }
}
