/**
 * Gets a uint32 from string in big-endian order order
 */
function s2i(str, pos) {
    return (str.charCodeAt(pos) << 24
        ^ str.charCodeAt(pos + 1) << 16
        ^ str.charCodeAt(pos + 2) << 8
        ^ str.charCodeAt(pos + 3));
}
/**
 * Returns a uint32 as a string in big-endian order order
 */
function i2s(data) {
    return (String.fromCharCode((data >> 24) & 0xFF)
        + String.fromCharCode((data >> 16) & 0xFF)
        + String.fromCharCode((data >> 8) & 0xFF)
        + String.fromCharCode(data & 0xFF));
}
/**
 * Returns a uint32 as a hex-string in big-endian order order
 */
function i2h(data) {
    return ("00000000" + data.toString(16)).slice(-8);
}

/**
 * Creates new SHA-1 state
 */
function init(h) {
    if (!h)
        h = new Uint32Array(5);
    // SHA-1 state contains five 32-bit integers
    h[0] = 0x67452301;
    h[1] = 0xEFCDAB89;
    h[2] = 0x98BADCFE;
    h[3] = 0x10325476;
    h[4] = 0xC3D2E1F0;
    return h;
}
/** Array to use to store round words. */
var words = new Uint32Array(80);
/**
 * Perform round function
 */
function round(state, data) {
    var i = 0;
    var t = 0;
    var f = 0;
    // initialize hash value for this chunk
    var a = state[0];
    var b = state[1];
    var c = state[2];
    var d = state[3];
    var e = state[4];
    // round 1
    for (i = 0; i < 16; i += 1) {
        words[i] = data[i];
        f = d ^ (b & (c ^ d));
        t = ((a << 5) | (a >>> 27)) + f + e + 0x5A827999 + words[i];
        e = d;
        d = c;
        c = ((b << 30) | (b >>> 2)) >>> 0;
        b = a;
        a = t;
    }
    for (; i < 20; i += 1) {
        t = (words[i - 3] ^ words[i - 8] ^ words[i - 14] ^ words[i - 16]);
        t = (t << 1) | (t >>> 31);
        words[i] = t;
        f = d ^ (b & (c ^ d));
        t = ((a << 5) | (a >>> 27)) + f + e + 0x5A827999 + t;
        e = d;
        d = c;
        // `>>> 0` necessary to avoid iOS/Safari 10 optimization bug
        c = ((b << 30) | (b >>> 2)) >>> 0;
        b = a;
        a = t;
    }
    // round 2
    for (; i < 32; i += 1) {
        t = (words[i - 3] ^ words[i - 8] ^ words[i - 14] ^ words[i - 16]);
        t = (t << 1) | (t >>> 31);
        words[i] = t;
        f = b ^ c ^ d;
        t = ((a << 5) | (a >>> 27)) + f + e + 0x6ED9EBA1 + t;
        e = d;
        d = c;
        // `>>> 0` necessary to avoid iOS/Safari 10 optimization bug
        c = ((b << 30) | (b >>> 2)) >>> 0;
        b = a;
        a = t;
    }
    for (; i < 40; i += 1) {
        t = (words[i - 6] ^ words[i - 16] ^ words[i - 28] ^ words[i - 32]);
        t = (t << 2) | (t >>> 30);
        words[i] = t;
        f = b ^ c ^ d;
        t = ((a << 5) | (a >>> 27)) + f + e + 0x6ED9EBA1 + t;
        e = d;
        d = c;
        // `>>> 0` necessary to avoid iOS/Safari 10 optimization bug
        c = ((b << 30) | (b >>> 2)) >>> 0;
        b = a;
        a = t;
    }
    // round 3
    for (; i < 60; i += 1) {
        t = (words[i - 6] ^ words[i - 16] ^ words[i - 28] ^ words[i - 32]);
        t = (t << 2) | (t >>> 30);
        words[i] = t;
        f = (b & c) | (d & (b ^ c));
        t = ((a << 5) | (a >>> 27)) + f + e + 0x8F1BBCDC + t;
        e = d;
        d = c;
        // `>>> 0` necessary to avoid iOS/Safari 10 optimization bug
        c = ((b << 30) | (b >>> 2)) >>> 0;
        b = a;
        a = t;
    }
    // round 4
    for (; i < 80; i += 1) {
        t = (words[i - 6] ^ words[i - 16] ^ words[i - 28] ^ words[i - 32]);
        t = (t << 2) | (t >>> 30);
        words[i] = t;
        f = b ^ c ^ d;
        t = ((a << 5) | (a >>> 27)) + f + e + 0xCA62C1D6 + t;
        e = d;
        d = c;
        // `>>> 0` necessary to avoid iOS/Safari 10 optimization bug
        c = ((b << 30) | (b >>> 2)) >>> 0;
        b = a;
        a = t;
    }
    // update hash state
    state[0] += a;
    state[1] += b;
    state[2] += c;
    state[3] += d;
    state[4] += e;
}
/**
 * Pre-processing round buffer for string input
 */
function preprocess(str, buf, state, offset) {
    if (offset === void 0) { offset = 0; }
    while (str.length >= 64) {
        for (var i = offset; i < 16; i++)
            buf[i] = s2i(str, i * 4);
        str = str.slice(64 - offset * 4);
        offset = 0;
        round(state, buf);
    }
    return str;
}
/**
 * Process input buffer
 */
function process(input, buf, state, offset) {
    if (offset === void 0) { offset = 0; }
    while (input.length >= buf.length - offset) {
        for (var i = 0; i < buf.length - offset; i++)
            buf[offset + i] = input[i];
        input = input.subarray(buf.length - offset);
        offset = 0;
        round(state, buf);
    }
    if (input.length > 0) {
        for (var i = 0; i < input.length; i++)
            buf[offset + i] = input[i];
        offset += input.length;
    }
    return offset;
}
/**
 * Repeatable part
 */
function finish(len, buf, state, offset) {
    if (offset === void 0) { offset = 0; }
    var len64hi = (len / 0x100000000) >>> 0;
    var len64lo = len >>> 0;
    for (var i = offset + 1; i < buf.length; i++)
        buf[i] = 0;
    if (offset >= 14) {
        round(state, buf);
        for (var i = 0; i < buf.length; i++)
            buf[i] = 0;
    }
    buf[14] = (len64hi << 3) + ((len64lo << 3) / 0x100000000 >>> 0);
    buf[15] = len64lo << 3;
    round(state, buf);
}
/**
 * Adds padding to message
 */
function finalizestr(chunk, len, buf, state, offset) {
    if (offset === void 0) { offset = 0; }
    for (; chunk.length >= 4; offset++) {
        buf[offset] = s2i(chunk, 0);
        chunk = chunk.slice(4);
    }
    if (offset >= 16) {
        round(state, buf);
        offset = 0;
    }
    buf[offset] = s2i(chunk + "\u0080\0\0\0", 0);
    finish(len, buf, state, offset);
}
/**
 * Adds padding to buffer
 */
function finalize(len, buf, state, offset) {
    if (offset === void 0) { offset = 0; }
    buf[offset] = 0x80000000;
    finish(len, buf, state, offset);
}
function out(state, format) {
    if (format === void 0) { format = 'array'; }
    switch (format) {
        case 'hex': return (i2h(state[0])
            + i2h(state[1])
            + i2h(state[2])
            + i2h(state[3])
            + i2h(state[4]));
        case 'binary': return (i2s(state[0])
            + i2s(state[1])
            + i2s(state[2])
            + i2s(state[3])
            + i2s(state[4]));
        default: return state;
    }
}
/**
 * Stream handler for hashing
 */
var Stream = /** @class */ (function () {
    function Stream(buf) {
        this.buffer = new Uint32Array(16);
        this.state = init(buf);
        this.length = 0;
        this.offset = 0;
        this.tail = '';
    }
    Stream.prototype.update = function (chunk) {
        if (typeof chunk === 'string') {
            this.length += chunk.length;
            this.tail = preprocess(this.tail + chunk, this.buffer, this.state, this.offset);
            this.offset = 0;
        }
        else {
            if (this.tail.length > 0)
                throw new Error('Unable to update hash-stream with array');
            this.length += chunk.length * 4;
            this.offset = process(chunk, this.buffer, this.state, this.offset);
        }
        return this;
    };
    Stream.prototype.digest = function (format) {
        if (format === void 0) { format = 'array'; }
        if (this.tail.length > 0) {
            finalizestr(this.tail, this.length, this.buffer, this.state, this.offset);
        }
        else {
            finalize(this.length, this.buffer, this.state, this.offset);
        }
        return out(this.state, format);
    };
    Stream.prototype.clear = function () {
        this.state = init();
        this.length = 0;
        this.offset = 0;
        this.tail = '';
    };
    return Stream;
}());
function sha1(message, format) {
    if (format === void 0) { format = 'array'; }
    var buf = new Uint32Array(16);
    var state = init();
    if (typeof message === 'string')
        finalizestr(preprocess(message, buf, state), message.length, buf, state);
    else
        finalize(message.length * 4, buf, state, process(message, buf, state));
    return out(state, format);
}
/**
 * Hash with stream constructor
 */
sha1.stream = function (buf) { return new Stream(buf); };
sha1.blockLength = 64;
sha1.digestLength = 20;

export default sha1;
