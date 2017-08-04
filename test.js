"use strict";

const N = (n) => {
    if (n <= 0) return 1;

    let r = 1;
    while (n > 0) {
        r *= n;
        n--;
    }

    return r;
};

const P = (m, n) => {
    return parseInt(N(m) / N(m - n));
};

const C = (m, n) => {
    return parseInt(P(m, n) / P(n, n));
};

console.log(`${4 *C(10,5)}`);