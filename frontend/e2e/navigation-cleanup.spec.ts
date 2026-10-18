import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import process from 'node:process'

const navigationCycles = Number(
  process.env.NAVIGATION_CYCLES ?? '50',
)

if (
  !Number.isInteger(navigationCycles)
  || navigationCycles < 50
  || navigationCycles > 500
) {
  throw new Error('NAVIGATION_CYCLES must be an integer from 50 to 500')
}

interface Resources {
  documentId: string
  eventSources: number
  timeouts: number
  intervals: number
}

interface Sample {
  cycle: number
  heapBytes: number
  listeners: number
  nodes: number
  eventSources: number
  timers: number
}

declare global {
  interface Window {
    __pipelinePulseResources: () => Resources
  }
}

test(`resources remain bounded across ${navigationCycles} navigation cycles`, async ({
  page,
  request,
}, testInfo) => {
  const pipelineName = `Navigation cleanup ${randomUUID()}`

  const createdPipeline = await request.post('/api/v1/pipelines', {
    data: {
      name: pipelineName,
      product: 'flasharray',
    },
  })

  expect(createdPipeline.status()).toBe(201)

  const pipeline = await createdPipeline.json() as { id: string }
  const samples: Sample[] = []
  const pageErrors: string[] = []

  page.on('pageerror', error => {
    pageErrors.push(error.message)
  })

  try {
    const createdRun = await request.post(
      `/api/v1/pipelines/${encodeURIComponent(pipeline.id)}/runs`,
      {
        data: {
          triggeredBy: 'navigation-cleanup-test',
          commitSha: '0123456789abcdef0123456789abcdef01234567',
        },
      },
    )

    expect(createdRun.status()).toBe(201)

    const run = await createdRun.json() as { id: string }

    await page.addInitScript({
      path: fileURLToPath(
        new URL('./resource-probe.js', import.meta.url),
      ),
    })

    const cdp = await page.context().newCDPSession(page)

    await page.goto('/')

    const pipelineLink = page.getByRole('link', {
      name: pipelineName,
      exact: true,
    })

    await expect(pipelineLink).toBeVisible()

    const documentId = await page.evaluate(
      () => window.__pipelinePulseResources().documentId,
    )

    for (let cycle = 1; cycle <= navigationCycles; cycle += 1) {
      await pipelineLink.click()

      await page.getByTestId('run-row')
        .getByRole('link', { name: run.id, exact: true })
        .click()

      await expect(
        page.getByRole('heading', {
          name: 'Run details',
          exact: true,
        }),
      ).toBeVisible()

      await expect(
        page.getByText('Live updates connected.', { exact: true }),
      ).toBeVisible()

      await expect.poll(() => page.evaluate(
        () => window.__pipelinePulseResources().eventSources,
      )).toBe(1)

      await page.getByTestId('nav-home').click()
      await expect(pipelineLink).toBeVisible()

      await expect.poll(async () => {
        const resources = await page.evaluate(
          () => window.__pipelinePulseResources(),
        )

        return {
          eventSources: resources.eventSources,
          timeouts: resources.timeouts,
          intervals: resources.intervals,
        }
      }).toEqual({
        eventSources: 0,
        timeouts: 0,
        intervals: 0,
      })

      expect(await page.evaluate(
        () => window.__pipelinePulseResources().documentId,
      )).toBe(documentId)

      if (cycle % 10 === 0) {
        await page.evaluate(() => new Promise<void>(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve())
          })
        }))

        await cdp.send('HeapProfiler.collectGarbage')

        const heap = await cdp.send('Runtime.getHeapUsage')
        const dom = await cdp.send('Memory.getDOMCounters')
        const resources = await page.evaluate(
          () => window.__pipelinePulseResources(),
        )

        samples.push({
          cycle,
          heapBytes: heap.usedSize,
          listeners: dom.jsEventListeners,
          nodes: dom.nodes,
          eventSources: resources.eventSources,
          timers: resources.timeouts + resources.intervals,
        })

        console.log(
          `Completed ${cycle}/${navigationCycles} navigation cycles`,
        )
      }
    }

    console.table(samples.map(sample => ({
      cycle: sample.cycle,
      heapMiB: Number(
        (sample.heapBytes / 1024 / 1024).toFixed(3),
      ),
      listeners: sample.listeners,
      nodes: sample.nodes,
      eventSources: sample.eventSources,
      timers: sample.timers,
    })))

    await testInfo.attach('navigation-resource-samples', {
      body: JSON.stringify(samples, null, 2),
      contentType: 'application/json',
    })

    const baseline = samples[0]

    if (!baseline) {
      throw new Error('No resource measurements were collected')
    }

    // The first 10 cycles warm up the application.
    // Compare later samples at the same home-page state.
    for (const sample of samples.slice(1)) {
      expect(sample.eventSources).toBe(0)
      expect(sample.timers).toBe(0)

      expect(sample.listeners)
        .toBeLessThanOrEqual(baseline.listeners + 5)

      expect(sample.nodes)
        .toBeLessThanOrEqual(baseline.nodes + 30)

      expect(sample.heapBytes)
        .toBeLessThanOrEqual(baseline.heapBytes + 1024 * 1024)
    }
    await test.step('cancel a pending reconnect timer', async () => {
      const eventsUrl = new URL(
        `/api/v1/runs/${encodeURIComponent(run.id)}/events`,
        page.url(),
      ).href

      await page.route(eventsUrl, route => route.abort())

      await pipelineLink.click()

      await page.getByTestId('run-row')
        .getByRole('link', { name: run.id, exact: true })
        .click()

      await expect(page.getByText(
        'Live updates disconnected. Reconnecting...',
        { exact: true },
      )).toBeVisible()

      await expect.poll(() => page.evaluate(
        () => window.__pipelinePulseResources().timeouts,
      )).toBeGreaterThan(0)

      await page.getByTestId('nav-home').click()
      await expect(pipelineLink).toBeVisible()

      await expect.poll(async () => {
        const resources = await page.evaluate(
          () => window.__pipelinePulseResources(),
        )

        return {
          eventSources: resources.eventSources,
          timeouts: resources.timeouts,
          intervals: resources.intervals,
        }
      }).toEqual({
        eventSources: 0,
        timeouts: 0,
        intervals: 0,
      })

      await page.unroute(eventsUrl)

      console.log('PASS: navigation cancelled the reconnect timer')
    })

    await test.step('abort a pending details request', async () => {
      const detailsUrl = new URL(
        `/api/v1/runs/${encodeURIComponent(run.id)}`,
        page.url(),
      ).href

      await page.route(detailsUrl, () => {
        // Intentionally leave the request pending.
        // The application must cancel it when navigating away.
      })

      await pipelineLink.click()
      await Promise.all([
        page.waitForRequest(detailsUrl),
        page.getByTestId('run-row')
          .getByRole('link', { name: run.id, exact: true })
          .click(),
      ])

      await expect(page.getByText(
        'Loading run details...',
        { exact: true },
      )).toBeVisible()

      await Promise.all([
        page.waitForEvent('requestfailed', {
          predicate: failed =>
            failed.url() === detailsUrl
            && failed.failure()?.errorText.includes('ERR_ABORTED') === true,
          timeout: 10_000,
        }),
        page.getByTestId('nav-home').click(),
      ])

      await expect(pipelineLink).toBeVisible()
      await page.unroute(detailsUrl)

      console.log('PASS: navigation aborted the pending details request')
    })

    expect(pageErrors).toEqual([])
  } finally {
    await page.close()

    const deleted = await request.delete(
      `/api/v1/pipelines/${encodeURIComponent(pipeline.id)}`,
    )

    expect(deleted.status()).toBe(204)
  }
})