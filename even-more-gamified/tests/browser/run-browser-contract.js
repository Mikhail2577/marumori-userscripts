import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Builder, By, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import safari from 'selenium-webdriver/safari.js';

const PROJECT_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const FIXTURE_DIRECTORY = path.join(PROJECT_ROOT, 'tests', 'browser');
const USER_SCRIPT_PATH = path.join(PROJECT_ROOT, 'dist', 'marumori_even_more_gamified.user.js');
const DEFAULT_TIMEOUT_MS = 6_000;

function parseBrowsers(argv) {
    const argument = argv.find((value) => value.startsWith('--browser='));
    const requested = argument?.slice('--browser='.length) || 'all';
    if (requested === 'all') return ['firefox', 'safari'];
    if (requested === 'firefox' || requested === 'safari') return [requested];
    throw new Error(`Unknown browser: ${requested}`);
}

async function createFixtureServer() {
    const [html, shim, host, userscript] = await Promise.all([
        readFile(path.join(FIXTURE_DIRECTORY, 'fixture.html'), 'utf8'),
        readFile(path.join(FIXTURE_DIRECTORY, 'gm-shim.js'), 'utf8'),
        readFile(path.join(FIXTURE_DIRECTORY, 'fixture-host.js'), 'utf8'),
        readFile(USER_SCRIPT_PATH, 'utf8'),
    ]);

    const server = createServer((request, response) => {
        const url = new URL(request.url || '/', 'http://127.0.0.1');
        if (url.pathname.startsWith('/study-lists/reviews')) {
            response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
            response.end(html);
            return;
        }
        const scripts = {
            '/browser-fixture/fixture-host.js': host,
            '/browser-fixture/gm-shim.js': shim,
            '/browser-fixture/userscript.js': userscript,
        };
        if (scripts[url.pathname]) {
            response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
            response.end(scripts[url.pathname]);
            return;
        }
        if (url.pathname === '/favicon.ico') {
            response.writeHead(204);
            response.end();
            return;
        }
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Not found');
    });

    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Fixture server did not bind');
    return {
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((resolve) => server.close(resolve)),
    };
}

async function createDriver(browserName) {
    const builder = new Builder().forBrowser(browserName);
    if (browserName === 'firefox') {
        const options = new firefox.Options().setBinary(
            '/Applications/Firefox.app/Contents/MacOS/firefox',
        );
        if (process.env.MM_BROWSER_HEADLESS === '1') options.addArguments('-headless');
        builder.setFirefoxOptions(options);
    } else {
        builder.setSafariOptions(new safari.Options());
    }
    const driver = await builder.build();
    try {
        await driver.manage().window().setRect({ width: 1280, height: 900, x: 20, y: 20 });
    } catch {
        // Window sizing is useful but not required by the behavioral contracts.
    }
    return driver;
}

async function waitForScript(driver, expression, message, timeout = DEFAULT_TIMEOUT_MS) {
    return driver.wait(
        async () => Boolean(await driver.executeScript(`return Boolean(${expression});`)),
        timeout,
        message,
        50,
    );
}

async function waitForElement(driver, selector, timeout = DEFAULT_TIMEOUT_MS) {
    return driver.wait(until.elementLocated(By.css(selector)), timeout, `Missing ${selector}`);
}

async function openFixture(
    driver,
    baseUrl,
    {
        hostIds = false,
        layouts = 1,
        mode = 'quiet',
        replaceInitialInput = false,
        timerSeconds = null,
        total = 3,
    } = {},
) {
    const url = new URL('/study-lists/reviews', baseUrl);
    url.searchParams.set('case', `${Date.now()}-${Math.random()}`);
    url.searchParams.set('mode', mode);
    url.searchParams.set('reset', '1');
    url.searchParams.set('total', String(total));
    url.searchParams.set('layouts', String(layouts));
    if (hostIds) url.searchParams.set('hostIds', '1');
    if (replaceInitialInput) url.searchParams.set('replaceInitialInput', '1');
    if (timerSeconds !== null) url.searchParams.set('timerSeconds', String(timerSeconds));
    await driver.get(url.href);
    const fixtureShape = await driver.executeScript(`
        const root = document.getElementById('time-me');
        const main = document.getElementById('main');
        const topWrap = document.querySelector('.top_wrap');
        const wrapper = document.querySelector('.input-wrapper');
        const counter = document.querySelector('.top_middle');
        return {
            counterInsideRoot: Boolean(root?.contains(counter)),
            counterInsideTopWrap: Boolean(topWrap?.contains(counter)),
            mainAndWrapperAreSiblings: Boolean(
                main?.parentElement && main.parentElement === wrapper?.parentElement
            ),
            rootId: wrapper?.closest('#time-me')?.id ?? null,
            wrapperInsideMain: Boolean(main?.contains(wrapper)),
        };
    `);
    assert.deepEqual(fixtureShape, {
        counterInsideRoot: true,
        counterInsideTopWrap: false,
        mainAndWrapperAreSiblings: true,
        rootId: 'time-me',
        wrapperInsideMain: false,
    });
    await waitForElement(driver, '#mm-hud');
    await assertNoPageErrors(driver);
}

async function count(driver, selector) {
    return (await driver.findElements(By.css(selector))).length;
}

async function text(driver, selector) {
    return (await waitForElement(driver, selector)).getText();
}

async function hostSnapshot(driver) {
    return driver.executeScript('return globalThis.__mmHost.snapshot();');
}

async function dispatchBackspace(driver, selector = null) {
    return driver.executeScript(
        `
            const target = arguments[0] ? document.querySelector(arguments[0]) : document.body;
            const event = new KeyboardEvent('keydown', {
                bubbles: true,
                cancelable: true,
                key: 'Backspace',
            });
            target.dispatchEvent(event);
            return { defaultPrevented: event.defaultPrevented };
        `,
        selector,
    );
}

async function summarySnapshot(driver) {
    return driver.executeScript(`
        const overlay = document.getElementById('mm-summary');
        const stats = Object.fromEntries(
            [...(overlay?.querySelectorAll('.mm-summary-cell') || [])].map((cell) => [
                cell.childNodes[0]?.textContent?.trim() || '',
                cell.querySelector('.mm-summary-val')?.textContent?.trim() || '',
            ])
        );
        return {
            open: overlay?.classList.contains('open') === true,
            stats,
        };
    `);
}

async function assertNoPageErrors(driver) {
    const errors = await driver.executeScript(
        'return [...(globalThis.__mmBrowserContractErrors || [])];',
    );
    assert.deepEqual(errors, []);
}

async function bootAndRouteContract(driver, baseUrl) {
    await openFixture(driver, baseUrl, { mode: 'font' });
    assert.equal(await count(driver, '#mm-hud'), 1);
    assert.equal(await text(driver, '#mm-hud-score'), '0');
    const promptFont = await driver.executeScript(`
            const prompt = document.querySelector('#main > span');
            return {
                priority: prompt?.style.getPropertyPriority('font-family') ?? null,
                value: prompt?.style.getPropertyValue('font-family') ?? null,
            };
        `);
    assert.equal(promptFont.priority, 'important');
    assert.match(promptFont.value, /MS Gothic.*sans-serif/u);

    await driver.executeScript("history.pushState({}, '', '/study-lists/reviews-archive');");
    await waitForScript(driver, "!document.getElementById('mm-hud')", 'HUD did not clean up');

    await driver.executeScript("history.pushState({}, '', '/study-lists/reviews');");
    await waitForElement(driver, '#mm-hud');
    assert.equal(await count(driver, '#mm-hud'), 1);
}

async function answerAndWrapperContract(driver, baseUrl) {
    await openFixture(driver, baseUrl);
    await (await waitForElement(driver, '#answer')).sendKeys('answer');
    await (await waitForElement(driver, "[data-action='check']")).click();
    await waitForElement(driver, '.input-wrapper.correct');
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-score')?.textContent !== '0'",
        'Correct answer did not update score',
    );
    assert.equal(await text(driver, '#mm-hud-combo'), 'x1');

    await (await waitForElement(driver, "[data-action='next']")).click();
    await waitForElement(driver, "[data-fixture-item='2']");
    await (await waitForElement(driver, "[data-action='wrong']")).click();
    await waitForElement(driver, '.input-wrapper.incorrect');
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-acc')?.textContent === '50%'",
        'Incorrect answer did not update accuracy',
    );
    assert.equal(await text(driver, '#mm-hud-combo'), 'x0');
    assert.deepEqual(
        (({ checks, resolutions, wrongClicks }) => ({ checks, resolutions, wrongClicks }))(
            await hostSnapshot(driver),
        ),
        { checks: 1, resolutions: 2, wrongClicks: 1 },
    );
}

async function multiQuestionFinalizationContract(driver, baseUrl) {
    await openFixture(driver, baseUrl, { layouts: 2, total: 2 });
    await driver.sleep(950);
    assert.equal(await count(driver, '#mm-summary.open'), 0);
    assert.equal(await text(driver, '#mm-hud-streak'), '0');
    assert.equal(await text(driver, '.top_middle'), '0 / 2');

    await (await waitForElement(driver, '#answer')).sendKeys('word one reading');
    await (await waitForElement(driver, "[data-action='check']")).click();
    await waitForElement(driver, '.input-wrapper.correct');
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-combo')?.textContent === 'x1'",
        'First sibling prompt was not scored',
    );
    assert.equal(await text(driver, '#mm-hud-streak'), '0');
    assert.equal(await count(driver, '#mm-summary.open'), 0);
    await (await waitForElement(driver, "[data-action='next']")).click();
    await waitForElement(
        driver,
        "[data-fixture-item='1'][data-fixture-layout='meaning']:not(.correct):not(.incorrect)",
    );
    assert.equal((await hostSnapshot(driver)).wrapperReplacements, 0);
    assert.equal(await text(driver, '.top_middle'), '0 / 2');
    assert.equal(await text(driver, '#mm-hud-streak'), '0');

    await (await waitForElement(driver, '#answer')).sendKeys('word one meaning');
    await (await waitForElement(driver, "[data-action='check']")).click();
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-combo')?.textContent === 'x2'",
        'Second sibling prompt was not scored independently',
    );
    assert.equal(await text(driver, '#mm-hud-streak'), '0');
    await (await waitForElement(driver, "[data-action='next']")).click();
    await waitForElement(
        driver,
        "[data-fixture-item='2'][data-fixture-layout='reading']:not(.correct):not(.incorrect)",
    );
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-streak')?.textContent === '1'",
        'Completed first item did not advance the word streak exactly once',
    );
    assert.equal(await text(driver, '.top_middle'), '1 / 2');
    await driver.executeScript('globalThis.__mmHost.repeatSignals();');
    await driver.sleep(950);

    assert.equal(await count(driver, '#mm-summary.open'), 0);
    assert.equal(await text(driver, '#mm-hud-streak'), '1');
    assert.equal((await hostSnapshot(driver)).resolution, 'unresolved');

    await (await waitForElement(driver, '#answer')).sendKeys('word two reading');
    await (await waitForElement(driver, "[data-action='check']")).click();
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-combo')?.textContent === 'x3'",
        'Final item reading prompt was not scored',
    );
    assert.equal(await text(driver, '#mm-hud-streak'), '1');
    assert.equal(await count(driver, '#mm-summary.open'), 0);
    await (await waitForElement(driver, "[data-action='next']")).click();
    await waitForElement(
        driver,
        "[data-fixture-item='2'][data-fixture-layout='meaning']:not(.correct):not(.incorrect)",
    );
    assert.equal(await text(driver, '.top_middle'), '1 / 2');
    assert.equal(await count(driver, '#mm-summary.open'), 0);

    await (await waitForElement(driver, '#answer')).sendKeys('word two meaning');
    await (await waitForElement(driver, "[data-action='check']")).click();
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-combo')?.textContent === 'x4'",
        'Final sibling prompt was not scored',
    );
    assert.equal(await text(driver, '#mm-hud-streak'), '1');
    assert.equal(await count(driver, '#mm-summary.open'), 0);
    await (await waitForElement(driver, "[data-action='next']")).click();
    await waitForScript(
        driver,
        "document.getElementById('mm-summary')?.classList.contains('open')",
        'Host N/N completion did not open the summary',
    );
    await driver.executeScript(`
        globalThis.__mmHost.repeatSignals();
        globalThis.__mmHost.repeatSignals();
    `);
    await driver.sleep(950);

    const summary = await summarySnapshot(driver);
    assert.equal(summary.open, true);
    assert.equal(summary.stats.CORRECT, '4');
    assert.equal(summary.stats['WORDS DONE'], '2');
    assert.equal(await text(driver, '#mm-hud-streak'), '2');
    assert.equal(await count(driver, '#mm-summary.open'), 1);
}

async function promptTimerRestartContract(driver, baseUrl) {
    await openFixture(driver, baseUrl, {
        layouts: 2,
        mode: 'timeout',
        replaceInitialInput: true,
        timerSeconds: 5,
        total: 2,
    });

    await driver.sleep(5_500);
    let snapshot = await hostSnapshot(driver);
    assert.equal(snapshot.wrongClicks, 0);
    assert.equal(snapshot.nextClicks, 0);
    assert.equal(snapshot.current, 0);

    await (await waitForElement(driver, '#answer')).sendKeys('start first timer');
    await waitForScript(
        driver,
        'globalThis.__mmHost.snapshot().nextClicks === 1',
        'The session timer did not start from the first non-empty input',
        10_000,
    );
    snapshot = await hostSnapshot(driver);
    assert.equal(snapshot.wrongClicks, 1);
    assert.equal(snapshot.layout, 'reading');
    assert.equal(snapshot.current, 0);

    await (await waitForElement(driver, '#answer')).sendKeys('correct retry');
    await (await waitForElement(driver, "[data-action='check']")).click();
    await waitForElement(driver, '.input-wrapper.correct');
    await (await waitForElement(driver, "[data-action='next']")).click();
    await waitForElement(
        driver,
        "[data-fixture-item='1'][data-fixture-layout='meaning']:not(.correct):not(.incorrect)",
    );
    snapshot = await hostSnapshot(driver);
    assert.equal(snapshot.wrapperReplacements, 0);
    assert.equal(snapshot.nextClicks, 2);
    assert.equal(snapshot.current, 0);
    assert.equal(await text(driver, '.top_middle'), '0 / 2');
    assert.equal(
        await driver.executeScript("return document.querySelector('#answer')?.value;"),
        '',
    );

    await waitForScript(
        driver,
        'globalThis.__mmHost.snapshot().nextClicks === 3',
        'The sibling meaning timer did not restart before input',
        10_000,
    );
    snapshot = await hostSnapshot(driver);
    assert.equal(snapshot.wrongClicks, 2);
    assert.equal(snapshot.layout, 'meaning');
    assert.equal(snapshot.current, 0);
    assert.equal(await text(driver, '.top_middle'), '0 / 2');
    assert.equal(await text(driver, '#mm-hud-streak'), '0');
    assert.equal(await count(driver, '#mm-summary.open'), 0);
}

async function oneQuestionFinalizationContract(driver, baseUrl) {
    await openFixture(driver, baseUrl, { total: 1 });
    await driver.sleep(950);
    assert.equal(await count(driver, '#mm-summary.open'), 0);

    await (await waitForElement(driver, '#answer')).sendKeys('answer');
    await (await waitForElement(driver, "[data-action='check']")).click();
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-score')?.textContent !== '0'",
        'One-item answer was not scored',
    );
    await driver.sleep(950);
    assert.equal(await count(driver, '#mm-summary.open'), 0);
    assert.equal(await text(driver, '#mm-hud-streak'), '0');
    await (await waitForElement(driver, "[data-action='next']")).click();
    await waitForScript(
        driver,
        "document.getElementById('mm-summary')?.classList.contains('open')",
        'One-question session did not complete after resolution',
    );

    const summary = await summarySnapshot(driver);
    assert.equal(summary.stats.CORRECT, '1');
    assert.equal(summary.stats['WORDS DONE'], '1');
    assert.equal(await count(driver, '#mm-summary.open'), 1);
}

async function finalIncorrectContract(driver, baseUrl) {
    await openFixture(driver, baseUrl, { total: 1 });
    await (await waitForElement(driver, "[data-action='wrong']")).click();
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-acc')?.textContent === '0%'",
        'Incorrect attempt was not recorded',
    );
    await driver.executeScript('globalThis.__mmHost.repeatSignals();');
    await driver.sleep(950);

    let snapshot = await hostSnapshot(driver);
    assert.equal(snapshot.wrongClicks, 1);
    assert.equal(snapshot.current, 0);
    assert.equal(snapshot.resolution, 'incorrect');
    assert.equal(await text(driver, '#mm-hud-streak'), '0');
    assert.equal(await count(driver, '#mm-summary.open'), 0);

    await (await waitForElement(driver, "[data-action='next']")).click();
    await waitForElement(driver, '.input-wrapper:not(.correct):not(.incorrect)');
    snapshot = await hostSnapshot(driver);
    assert.equal(snapshot.current, 0);
    assert.equal(snapshot.resolution, 'unresolved');
    assert.equal(await count(driver, '#mm-summary.open'), 0);
}

async function finalTimeoutContract(driver, baseUrl) {
    await openFixture(driver, baseUrl, { mode: 'timeout', timerSeconds: 5, total: 1 });
    await (await waitForElement(driver, '#answer')).sendKeys('start timer');
    await waitForScript(
        driver,
        'globalThis.__mmHost.snapshot().nextClicks === 1',
        'Timed-out incomplete item did not requeue exactly once',
        10_000,
    );
    await driver.sleep(500);

    const snapshot = await hostSnapshot(driver);
    assert.equal(snapshot.wrongClicks, 1);
    assert.equal(snapshot.nextClicks, 1);
    assert.equal(snapshot.current, 0);
    assert.equal(snapshot.resolution, 'unresolved');
    assert.equal(await text(driver, '#mm-hud-streak'), '0');
    assert.equal(await count(driver, '#mm-summary.open'), 0);
}

async function summaryCleanupContract(driver, baseUrl) {
    await openFixture(driver, baseUrl, { total: 1 });
    await (await waitForElement(driver, '#answer')).sendKeys('answer');
    await (await waitForElement(driver, "[data-action='check']")).click();
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-score')?.textContent !== '0'",
        'Final answer was not processed before cleanup',
    );
    await (await waitForElement(driver, "[data-action='next']")).click();
    await waitForScript(
        driver,
        "document.querySelector('.top_middle')?.textContent.trim() === '1 / 1'",
        'Host did not confirm completion before cleanup',
    );

    await driver.executeScript("history.pushState({}, '', '/study-lists/reviews-archive');");
    await waitForScript(driver, "!document.getElementById('mm-hud')", 'HUD did not clean up');
    await driver.sleep(950);
    assert.equal(await count(driver, '#mm-summary.open'), 0);
    const restored = await driver.executeScript(`
        const root = document.getElementById('time-me');
        return {
            ariaHidden: root?.getAttribute('aria-hidden'),
            inert: root?.hasAttribute('inert') === true,
        };
    `);
    assert.deepEqual(restored, { ariaHidden: null, inert: false });
}

async function summaryAccessibilityContract(driver, baseUrl) {
    await openFixture(driver, baseUrl, { mode: 'hidden-hud', total: 1 });
    await (await waitForElement(driver, '#answer')).sendKeys('answer');
    await (await waitForElement(driver, "[data-action='check']")).click();
    await driver.executeScript(`
        const next = document.querySelector('[data-action="next"]');
        next.focus();
        next.click();
    `);
    await waitForScript(
        driver,
        "document.getElementById('mm-summary')?.classList.contains('open')",
        'Accessible summary did not open',
    );

    const modal = await driver.executeScript(`
        const dialog = document.getElementById('mm-summary');
        const hud = document.getElementById('mm-hud');
        const launcher = document.getElementById('mm-settings-launcher');
        const title = document.getElementById(dialog?.getAttribute('aria-labelledby'));
        return {
            activeId: document.activeElement?.id ?? null,
            dialogCount: document.querySelectorAll('#mm-summary').length,
            headingCount: document.querySelectorAll('#mm-summary-title').length,
            hudAriaHidden: hud?.getAttribute('aria-hidden'),
            hudInert: hud?.hasAttribute('inert') === true,
            labelledBy: dialog?.getAttribute('aria-labelledby'),
            launcherAriaHidden: launcher?.getAttribute('aria-hidden'),
            launcherInert: launcher?.hasAttribute('inert') === true,
            modal: dialog?.getAttribute('aria-modal'),
            role: dialog?.getAttribute('role'),
            rootAriaHidden: document.getElementById('time-me')?.getAttribute('aria-hidden'),
            rootInert: document.getElementById('time-me')?.hasAttribute('inert') === true,
            title: title?.textContent?.trim(),
        };
    `);
    assert.deepEqual(modal, {
        activeId: 'mm-summary-close',
        dialogCount: 1,
        headingCount: 1,
        hudAriaHidden: 'true',
        hudInert: true,
        labelledBy: 'mm-summary-title',
        launcherAriaHidden: 'true',
        launcherInert: true,
        modal: 'true',
        role: 'dialog',
        rootAriaHidden: 'true',
        rootInert: true,
        title: 'SESSION COMPLETE',
    });

    const focusTrap = await driver.executeScript(`
        const close = document.getElementById('mm-summary-close');
        const forward = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'Tab',
        });
        close.dispatchEvent(forward);
        const backward = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'Tab',
            shiftKey: true,
        });
        close.dispatchEvent(backward);
        document.getElementById('mm-settings-launcher').focus();
        return {
            activeId: document.activeElement?.id ?? null,
            backwardPrevented: backward.defaultPrevented,
            forwardPrevented: forward.defaultPrevented,
        };
    `);
    assert.deepEqual(focusTrap, {
        activeId: 'mm-summary-close',
        backwardPrevented: true,
        forwardPrevented: true,
    });

    await (await waitForElement(driver, '#mm-summary-close')).click();
    await waitForScript(
        driver,
        "document.getElementById('mm-summary')?.hidden === true",
        'Summary did not close',
    );
    const restored = await driver.executeScript(`
        const hud = document.getElementById('mm-hud');
        const launcher = document.getElementById('mm-settings-launcher');
        const root = document.getElementById('time-me');
        return {
            activeAction: document.activeElement?.dataset?.action ?? null,
            hudAriaHidden: hud?.getAttribute('aria-hidden'),
            hudInert: hud?.hasAttribute('inert') === true,
            launcherAriaHidden: launcher?.getAttribute('aria-hidden'),
            launcherInert: launcher?.hasAttribute('inert') === true,
            rootAriaHidden: root?.getAttribute('aria-hidden'),
            rootInert: root?.hasAttribute('inert') === true,
        };
    `);
    assert.deepEqual(restored, {
        activeAction: 'next',
        hudAriaHidden: 'true',
        hudInert: true,
        launcherAriaHidden: null,
        launcherInert: false,
        rootAriaHidden: null,
        rootInert: false,
    });
}

async function sameRouteSecondSessionContract(driver, baseUrl) {
    await openFixture(driver, baseUrl, { total: 1 });
    await (await waitForElement(driver, '#answer')).sendKeys('first session');
    await (await waitForElement(driver, "[data-action='check']")).click();
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-score')?.textContent !== '0'",
        'First session did not process its final answer',
    );
    await (await waitForElement(driver, "[data-action='next']")).click();
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-streak')?.textContent === '1'",
        'First session did not record its completed item',
    );
    await driver.executeScript("globalThis.__mmHost.resetSession('fixture-session-2', 1);");
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-score')?.textContent === '0'",
        'Second same-route session did not start with clean state',
    );
    await driver.sleep(950);
    assert.equal(await count(driver, '#mm-summary.open'), 0);

    await (await waitForElement(driver, '#answer')).sendKeys('second session');
    await (await waitForElement(driver, "[data-action='check']")).click();
    await (await waitForElement(driver, "[data-action='next']")).click();
    await waitForScript(
        driver,
        "document.getElementById('mm-summary')?.classList.contains('open')",
        'Second same-route session did not complete independently',
    );
    const summary = await summarySnapshot(driver);
    assert.equal(summary.stats.CORRECT, '1');
    assert.equal(summary.stats['WORDS DONE'], '1');
}

async function rewindContract(driver, baseUrl) {
    await openFixture(driver, baseUrl, { total: 1 });
    await (await waitForElement(driver, '#answer')).sendKeys('answer');
    await (await waitForElement(driver, "[data-action='check']")).click();
    await waitForElement(driver, '.input-wrapper.correct');
    await waitForScript(
        driver,
        "!document.getElementById('mm-hud-rewind-btn')?.disabled",
        'Rewind did not become available',
    );
    await (await waitForElement(driver, '#mm-hud-rewind-btn')).click();
    await waitForScript(
        driver,
        "document.querySelector('.input-wrapper:not(.correct):not(.incorrect)')",
        'Confirmed rewind did not restore the unresolved question',
    );
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-score')?.textContent === '0'",
        'Confirmed rewind did not restore local score',
    );
    await driver.sleep(950);
    assert.equal(await count(driver, '#mm-summary.open'), 0);
    assert.equal((await hostSnapshot(driver)).rewinds, 1);

    await (await waitForElement(driver, '#answer')).sendKeys('answer again');
    await (await waitForElement(driver, "[data-action='check']")).click();
    await (await waitForElement(driver, "[data-action='next']")).click();
    await waitForScript(
        driver,
        "document.getElementById('mm-summary')?.classList.contains('open')",
        'Re-answered final question did not complete cleanly',
    );
    const summary = await summarySnapshot(driver);
    assert.equal(summary.stats.CORRECT, '1');
    assert.equal(summary.stats['WORDS DONE'], '1');
    assert.equal(await count(driver, '#mm-summary.open'), 1);
}

async function keyboardRewindIntentContract(driver, baseUrl) {
    await openFixture(driver, baseUrl, { total: 1 });
    assert.deepEqual(await dispatchBackspace(driver), { defaultPrevented: false });
    assert.equal((await hostSnapshot(driver)).rewinds, 0);
    assert.equal(
        await count(driver, '.input-wrapper:not(.correct):not(.incorrect)'),
        1,
        'Backspace rewound an unanswered prompt',
    );

    await (await waitForElement(driver, '#answer')).sendKeys('answer');
    await (await waitForElement(driver, "[data-action='check']")).click();
    await waitForScript(
        driver,
        "!document.getElementById('mm-hud-rewind-btn')?.disabled",
        'Keyboard rewind snapshot did not become available',
    );

    const ordinaryEditing = await driver.executeScript(`
        const targets = [document.getElementById('mm-vol-slider')];
        const unrelated = document.createElement('textarea');
        document.getElementById('time-me').prepend(unrelated);
        targets.push(unrelated);
        const editable = document.createElement('span');
        editable.contentEditable = 'true';
        editable.textContent = 'editable';
        document.querySelector('.input-wrapper').prepend(editable);
        targets.push(editable);

        return targets.map((target) => {
            const event = new KeyboardEvent('keydown', {
                bubbles: true,
                cancelable: true,
                key: 'Backspace',
            });
            target.dispatchEvent(event);
            return event.defaultPrevented;
        });
    `);
    assert.deepEqual(ordinaryEditing, [false, false, false]);
    assert.equal((await hostSnapshot(driver)).rewinds, 0);
    assert.equal(
        await driver.executeScript(
            "return document.getElementById('mm-hud-rewind-btn')?.disabled === false;",
        ),
        true,
    );

    const accepted = await dispatchBackspace(driver);
    assert.deepEqual(accepted, { defaultPrevented: false });
    await waitForScript(
        driver,
        "document.querySelector('.input-wrapper:not(.correct):not(.incorrect)')",
        'Page-level Backspace did not produce host rewind confirmation',
    );
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-score')?.textContent === '0'",
        'Page-level Backspace did not restore local score',
    );
    assert.equal(await text(driver, '#mm-hud-combo'), 'x0');
    assert.equal(await text(driver, '#mm-hud-acc'), '—');
    assert.equal((await hostSnapshot(driver)).rewinds, 1);
}

async function repeatedBackspaceAccuracyContract(driver, baseUrl) {
    await openFixture(driver, baseUrl, { total: 6 });

    for (let item = 1; item <= 5; item++) {
        await waitForElement(driver, `[data-fixture-item='${item}']`);
        await (await waitForElement(driver, '#answer')).sendKeys(`answer ${item}`);
        await (await waitForElement(driver, "[data-action='check']")).click();
        await waitForScript(
            driver,
            `document.getElementById('mm-hud-combo')?.textContent === 'x${item}'`,
            `Correct answer ${item} did not establish its combo`,
        );
        await (await waitForElement(driver, "[data-action='next']")).click();
    }

    await waitForElement(driver, "[data-fixture-item='6']");
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-acc')?.textContent === '100%'",
        'Baseline correct answers did not establish 100% accuracy',
    );
    assert.equal(await text(driver, '#mm-hud-score'), '600');
    assert.equal(await text(driver, '#mm-hud-combo'), 'x5');
    assert.equal(await text(driver, '#mm-hud-mult'), 'x2');

    for (let attempt = 1; attempt <= 3; attempt++) {
        await (await waitForElement(driver, "[data-action='wrong']")).click();
        await waitForScript(
            driver,
            "document.getElementById('mm-hud-acc')?.textContent === '83%'",
            `Incorrect attempt ${attempt} did not lower accuracy to 83%`,
        );
        assert.equal(await text(driver, '#mm-hud-score'), '550');
        assert.equal(await text(driver, '#mm-hud-combo'), 'x0');
        assert.equal(await text(driver, '#mm-hud-mult'), 'x1');

        assert.deepEqual(await dispatchBackspace(driver, "[data-action='wrong']"), {
            defaultPrevented: false,
        });
        await waitForScript(
            driver,
            "document.querySelector('.input-wrapper:not(.correct):not(.incorrect)')",
            `Backspace attempt ${attempt} did not restore the unresolved question`,
        );
        await waitForScript(
            driver,
            "document.getElementById('mm-hud-acc')?.textContent === '100%'",
            `Backspace attempt ${attempt} did not restore accuracy`,
        );
        assert.equal(await text(driver, '#mm-hud-score'), '600');
        assert.equal(await text(driver, '#mm-hud-combo'), 'x5');
        assert.equal(await text(driver, '#mm-hud-mult'), 'x2');
    }

    assert.equal((await hostSnapshot(driver)).rewinds, 3);
}

async function rewindReplacementProgressContract(driver, baseUrl) {
    await openFixture(driver, baseUrl, { hostIds: true, total: 2 });
    await (await waitForElement(driver, '#answer')).sendKeys('answer one');
    await (await waitForElement(driver, "[data-action='check']")).click();
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-score')?.textContent !== '0'",
        'First answer was not recorded',
    );
    const firstScore = await text(driver, '#mm-hud-score');
    await (await waitForElement(driver, "[data-action='next']")).click();
    await waitForElement(driver, "[data-fixture-item='2']");
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-streak')?.textContent === '1'",
        'First completed item was not recorded before final rewind',
    );

    await driver.executeScript("globalThis.__mmHost.setRewindMode('replace-progress');");
    await (await waitForElement(driver, '#answer')).sendKeys('answer two');
    await (await waitForElement(driver, "[data-action='check']")).click();
    await (await waitForElement(driver, "[data-action='next']")).click();
    await waitForScript(
        driver,
        "!document.getElementById('mm-hud-rewind-btn')?.disabled",
        'Final rewind snapshot did not become available',
    );
    await (await waitForElement(driver, '#mm-hud-rewind-btn')).click();
    await waitForScript(
        driver,
        `document.querySelector(
            "[data-fixture-item='2']:not(.correct):not(.incorrect)"
        ) && document.querySelector('.top_middle')?.textContent.trim() === '1 / 2'`,
        'Wrapper-replacing progress rewind did not settle',
    );
    await waitForScript(
        driver,
        `document.getElementById('mm-hud-score')?.textContent === ${JSON.stringify(firstScore)}`,
        'Wrapper-replacing rewind did not restore the prior score',
    );
    await driver.sleep(950);
    assert.equal(await count(driver, '#mm-summary.open'), 0);
    assert.equal(await text(driver, '#mm-hud-streak'), '1');
    assert.equal((await hostSnapshot(driver)).rewinds, 1);
}

async function delayedRewindRecoveryContract(driver, baseUrl) {
    await openFixture(driver, baseUrl, { total: 1 });
    await driver.executeScript("globalThis.__mmHost.setRewindMode('delayed', 900);");
    await (await waitForElement(driver, '#answer')).sendKeys('answer');
    await (await waitForElement(driver, "[data-action='check']")).click();
    await waitForScript(
        driver,
        "!document.getElementById('mm-hud-rewind-btn')?.disabled",
        'Delayed rewind snapshot did not become available',
    );
    await (await waitForElement(driver, '#mm-hud-rewind-btn')).click();
    await waitForScript(
        driver,
        "document.querySelector('.input-wrapper:not(.correct):not(.incorrect)')",
        'Delayed host rewind never reached unresolved state',
    );
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-score')?.textContent === '0'",
        'Bounded late recovery did not restore local state',
    );
    await driver.sleep(250);
    assert.equal(await count(driver, '#mm-summary.open'), 0);
    assert.equal((await hostSnapshot(driver)).rewinds, 1);
}

async function remountAndPersistenceContract(driver, baseUrl) {
    await openFixture(driver, baseUrl);
    await (await waitForElement(driver, '#mm-hud-collapse-btn')).click();
    await waitForElement(driver, '#mm-hud.mm-panel-collapsed');
    await driver.navigate().refresh();
    await waitForElement(driver, '#mm-hud.mm-panel-collapsed');

    await (await waitForElement(driver, '#answer')).sendKeys('answer');
    await (await waitForElement(driver, "[data-action='check']")).click();
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-score')?.textContent !== '0'",
        'Pre-remount score was not recorded',
    );
    await driver.executeScript("globalThis.__mmHost.resetSession('fixture-session-2');");
    await waitForScript(
        driver,
        "document.getElementById('mm-hud-score')?.textContent === '0'",
        'Changed host session token did not remount cleanly',
    );
    assert.equal(await count(driver, '#mm-hud'), 1);
}

async function timeoutContract(driver, baseUrl) {
    await openFixture(driver, baseUrl, { mode: 'timeout' });
    await (await waitForElement(driver, '#answer')).sendKeys('start timer');
    await waitForScript(
        driver,
        'globalThis.__mmHost.snapshot().nextClicks === 1',
        'Timeout failure did not advance exactly once',
        14_000,
    );
    await driver.sleep(500);
    const snapshot = await hostSnapshot(driver);
    assert.equal(snapshot.wrongClicks, 1);
    assert.equal(snapshot.nextClicks, 1);
    assert.equal(snapshot.current, 0);
    assert.equal(snapshot.resolution, 'unresolved');
    assert.equal(await text(driver, '#mm-hud-streak'), '0');
}

const CONTRACTS = Object.freeze([
    ['bundle boot and exact-route cleanup', bootAndRouteContract],
    ['answer processing and wrapper replacement', answerAndWrapperContract],
    ['multi-question finalization ownership', multiQuestionFinalizationContract],
    ['first-input gate and per-prompt timer restart', promptTimerRestartContract],
    ['one-question finalization', oneQuestionFinalizationContract],
    ['incorrect attempt does not complete an item', finalIncorrectContract],
    ['incomplete-item timeout requeues without finalizing', finalTimeoutContract],
    ['accessible modal summary ownership', summaryAccessibilityContract],
    ['summary cancellation on cleanup', summaryCleanupContract],
    ['transactional final-answer rewind', rewindContract],
    ['scoped Backspace rewind intent', keyboardRewindIntentContract],
    ['repeated page-level Backspace state restoration', repeatedBackspaceAccuracyContract],
    ['rewind across wrapper and progress replacement', rewindReplacementProgressContract],
    ['bounded delayed rewind recovery', delayedRewindRecoveryContract],
    ['same-route second-session finalization', sameRouteSecondSessionContract],
    ['settings persistence and same-root remount', remountAndPersistenceContract],
    ['serialized timeout advancement', timeoutContract],
]);

async function saveFailureScreenshot(driver, browserName, contractName) {
    try {
        const slug = contractName.replace(/[^a-z0-9]+/giu, '-').replace(/^-|-$/gu, '');
        const filePath = path.join(tmpdir(), `mmgamify-${browserName}-${slug}-${Date.now()}.png`);
        await writeFile(filePath, await driver.takeScreenshot(), 'base64');
        return filePath;
    } catch {
        return null;
    }
}

async function runBrowser(browserName, baseUrl) {
    process.stdout.write(`\n${browserName.toUpperCase()}\n`);
    let driver;
    try {
        driver = await createDriver(browserName);
    } catch (error) {
        const hint =
            browserName === 'safari'
                ? 'Enable Safari Develop → Developer Settings → Allow remote automation, or run `safaridriver --enable`.'
                : 'Ensure Firefox is installed; Selenium Manager will provision geckodriver on the first run.';
        throw new Error(`Could not start ${browserName}. ${hint}\n${error.message}`, {
            cause: error,
        });
    }

    const contractFilter = process.env.MM_BROWSER_CONTRACT?.trim().toLowerCase();
    const contracts = contractFilter
        ? CONTRACTS.filter(([name]) => name.toLowerCase().includes(contractFilter))
        : CONTRACTS;
    if (contracts.length === 0) {
        throw new Error(`No browser contract matched MM_BROWSER_CONTRACT=${contractFilter}`);
    }

    const failures = [];
    try {
        for (const [name, contract] of contracts) {
            try {
                await contract(driver, baseUrl);
                await assertNoPageErrors(driver);
                process.stdout.write(`  ✓ ${name}\n`);
            } catch (error) {
                const screenshot = await saveFailureScreenshot(driver, browserName, name);
                failures.push({ error, name, screenshot });
                process.stdout.write(`  ✗ ${name}\n`);
            }
        }
    } finally {
        if (process.env.MM_BROWSER_KEEP_OPEN === '1') {
            process.stdout.write('  Browser left open because MM_BROWSER_KEEP_OPEN=1.\n');
        } else {
            await driver.quit();
        }
    }

    if (failures.length > 0) {
        const details = failures
            .map(
                ({ error, name, screenshot }) =>
                    `${name}: ${error.stack || error.message}${screenshot ? `\nScreenshot: ${screenshot}` : ''}`,
            )
            .join('\n\n');
        throw new Error(`${browserName} failed ${failures.length} contract(s):\n\n${details}`);
    }
    return contracts.length;
}

async function main() {
    const browsers = parseBrowsers(process.argv.slice(2));
    const fixtureServer = await createFixtureServer();
    const failures = [];
    let passedContracts = 0;
    try {
        for (const browserName of browsers) {
            try {
                passedContracts += await runBrowser(browserName, fixtureServer.baseUrl);
            } catch (error) {
                failures.push(error);
            }
        }
    } finally {
        await fixtureServer.close();
    }

    if (failures.length > 0) {
        for (const error of failures) console.error(`\n${error.stack || error.message}`);
        process.exitCode = 1;
        return;
    }
    process.stdout.write(`\nPassed ${passedContracts} contracts in ${browsers.join(' and ')}.\n`);
}

await main();
