/**
 * Stream handler for hashing
 */
declare class Stream {
    buffer: Uint32Array;
    state: Uint32Array;
    length: number;
    offset: number;
    tail: string;
    constructor(buf?: Uint32Array);
    update(chunk: string | Uint32Array): this;
    digest(): Uint32Array;
    digest(format: 'hex' | 'binary'): string;
    clear(): void;
}
/**
 * Hash as single function
 */
declare function sha256(message: string | Uint32Array): Uint32Array;
declare namespace sha256 {
    var stream: (buf?: Uint32Array) => Stream;
    var blockLength: number;
    var digestLength: number;
}
declare function sha256(message: string | Uint32Array, format: 'hex' | 'binary'): string;
declare namespace sha256 {
    var stream: (buf?: Uint32Array) => Stream;
    var blockLength: number;
    var digestLength: number;
}
export default sha256;
