"use strict";

const _ = require('lodash');
const global = require('./global');

const pick = function*(exists, result) {
    if (exists.length === 0 || result.length >= global.MAX_CARDS_NUM) return;

    for (let i = 0; i < exists.length; ++i) {
        if (exists[i] <= _.last(result)) continue;

        let r = _.clone(result);
        let e = _.clone(exists);

        r.push(exists[i]);
        yield r;
        _.pullAt(e, i);
        yield* pick(e, r);
    }
};

const fillWithAny = function*(exists, maxAnyCount) {
    if (exists.length >= global.MAX_CARDS_NUM) {
        yield exists;
        return;
    } else if (exists.length + maxAnyCount < global.MAX_CARDS_NUM) return;

    const existsCount = exists.length;
    const anyCount = global.MAX_CARDS_NUM - existsCount;
    exists = _.concat(exists, _.fill(new Array(anyCount), -1));

    const swap = (arr, i, j) => {
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
        return arr;
    };

    yield exists;
    for (let i = existsCount - 1; i >= 0; --i) {
        let j = i + 1;
        while (j < global.MAX_CARDS_NUM && exists[j] === -1) {
            yield swap(exists, j - 1, j);
            ++j;
        }
    }
};

const createSuits = (exists, maxAnyCount) => {
    let result = [];
    // if (maxAnyCount >= global.MAX_CARDS_NUM) result.push(_.fill(new Array(global.MAX_CARDS_NUM), -1));

    const it = pick(exists, []);
    while (true) {
        const ret = it.next();
        if (ret.done === true) break;

        const cards = ret.value;
        const it2 = fillWithAny(cards, maxAnyCount);
        while (true) {
            const ret = it2.next();
            if (ret.done === true) break;
            // console.log(`${ret.value}`);
            result.push({cards: cards, suit : _.clone(ret.value)});
        }
    }
    return result;
};

// console.log(`${JSON.stringify(createSuits([1,2,3,4,5,6,7,8], 2, 5))}`);
module.exports = createSuits;





