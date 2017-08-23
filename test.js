"use strict";

const _ = require('lodash');
const fs = require('fs');

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
    if (m < n) return 1;

    let r = 1;
    let i = m;
    while (i >= (m - n + 1)) {
        r *= i;
        i--;
    }

    return r;
};

const C = (m, n) => {
    return parseInt(P(m, n) / P(n, n));
};

console.log(`${C(40,2) * C(38,5) *  C(33,4) * C(4, 2)}`);




