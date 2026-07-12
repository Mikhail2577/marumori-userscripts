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

async function openFixture(driver, baseUrl, { mode = 'quiet', total = 3 } = {}) {
    const url = new URL('/study-lists/reviews', baseUrl);
    url.searchParams.set('case', `${Date.now()}-${Math.random()}`);
    url.searchParams.set('mode', mode);
    url.searchParams.set('reset', '1');
    url.searchParams.set('total', String(total));
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
    await waitForElement(driver, "[data-question-id='fixture-question-2']");
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
    assert.equal(snapshot.current, 2);
}

const CONTRACTS = Object.freeze([
    ['bundle boot and exact-route cleanup', bootAndRouteContract],
    ['answer processing and wrapper replacement', answerAndWrapperContract],
    ['transactional final-answer rewind', rewindContract],
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

    const failures = [];
    try {
        for (const [name, contract] of CONTRACTS) {
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
}

async function main() {
    const browsers = parseBrowsers(process.argv.slice(2));
    const fixtureServer = await createFixtureServer();
    const failures = [];
    try {
        for (const browserName of browsers) {
            try {
                await runBrowser(browserName, fixtureServer.baseUrl);
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
    process.stdout.write(`\nPassed ${CONTRACTS.length} contracts in ${browsers.join(' and ')}.\n`);
}

await main();
