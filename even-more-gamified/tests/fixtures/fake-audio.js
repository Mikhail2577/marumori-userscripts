export function createDeferred() {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

export class FakeAudioParam {
    constructor(value = 1) {
        this.value = value;
        this.calls = [];
    }

    record(method, value, time, extra) {
        this.value = value;
        this.calls.push({ method, value, time, ...extra });
    }

    setValueAtTime(value, time) {
        this.record('setValueAtTime', value, time);
    }

    linearRampToValueAtTime(value, time) {
        this.record('linearRampToValueAtTime', value, time);
    }

    exponentialRampToValueAtTime(value, time) {
        this.record('exponentialRampToValueAtTime', value, time);
    }

    setTargetAtTime(value, time, timeConstant) {
        this.record('setTargetAtTime', value, time, { timeConstant });
    }

    cancelScheduledValues(time) {
        this.calls.push({ method: 'cancelScheduledValues', time });
    }
}

export class FakeAudioNode extends EventTarget {
    constructor() {
        super();
        this.connections = [];
        this.disconnectCalls = 0;
    }

    connect(destination) {
        this.connections.push(destination);
        return destination;
    }

    disconnect() {
        this.disconnectCalls += 1;
        this.connections = [];
    }
}

export class FakeGainNode extends FakeAudioNode {
    constructor() {
        super();
        this.gain = new FakeAudioParam(1);
    }
}

export class FakeBiquadFilterNode extends FakeAudioNode {
    constructor() {
        super();
        this.frequency = new FakeAudioParam(350);
        this.type = 'lowpass';
    }
}

export class FakeOscillatorNode extends FakeAudioNode {
    constructor() {
        super();
        this.frequency = new FakeAudioParam(440);
        this.detune = new FakeAudioParam(0);
        this.startCalls = [];
        this.stopCalls = [];
        this.type = 'sine';
    }

    start(time) {
        this.startCalls.push(time);
    }

    stop(time) {
        this.stopCalls.push(time);
    }
}

export class FakeAudioContext extends EventTarget {
    constructor({ state = 'suspended', currentTime = 0 } = {}) {
        super();
        this.state = state;
        this.currentTime = currentTime;
        this.destination = new FakeAudioNode();
        this.resumeCalls = 0;
        this.suspendCalls = 0;
        this.createGainCalls = 0;
        this.createOscillatorCalls = 0;
        this.createBiquadFilterCalls = 0;
        this.gains = [];
        this.oscillators = [];
        this.filters = [];
        this.resumeImplementation = (context) => {
            context.setState('running');
            return Promise.resolve();
        };
        this.suspendImplementation = (context) => {
            context.setState('suspended');
            return Promise.resolve();
        };
    }

    setState(state) {
        this.state = state;
        this.dispatchEvent(new Event('statechange'));
    }

    setResumeImplementation(implementation) {
        this.resumeImplementation = implementation;
    }

    setSuspendImplementation(implementation) {
        this.suspendImplementation = implementation;
    }

    resume() {
        this.resumeCalls += 1;
        return this.resumeImplementation(this);
    }

    suspend() {
        this.suspendCalls += 1;
        return this.suspendImplementation(this);
    }

    createGain() {
        this.createGainCalls += 1;
        const gain = new FakeGainNode();
        this.gains.push(gain);
        return gain;
    }

    createOscillator() {
        this.createOscillatorCalls += 1;
        const oscillator = new FakeOscillatorNode();
        this.oscillators.push(oscillator);
        return oscillator;
    }

    createBiquadFilter() {
        this.createBiquadFilterCalls += 1;
        const filter = new FakeBiquadFilterNode();
        this.filters.push(filter);
        return filter;
    }
}

export function createVisibilityTarget({ hidden = false } = {}) {
    const target = new EventTarget();
    let currentHidden = hidden;
    return {
        target,
        isHidden: () => currentHidden,
        setHidden(value) {
            currentHidden = Boolean(value);
            target.dispatchEvent(new Event('visibilitychange'));
        },
        gesture(type = 'pointerdown') {
            target.dispatchEvent(new Event(type));
        },
    };
}
