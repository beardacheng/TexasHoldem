"use strict";

const _ = require('lodash');

let global = {};
global.TYPES_STR = ['','♠','♥','♣','♦'];
global.NUMBERS_STR = ['','','2','3','4','5','6','7','8','9','10','J','Q','K','A'];
global.TYPES = [1,2,3,4];
global.NUMBERS = [5,6,7,8,9,10,11,12,13,14];
// global.NUMBERS = [2,3,4,5,6,7,8,9,10,11,12,13,14];
global.MAX_CARDS_NUM = 5;

global.CARD5_TYPE_RESULT_TEMPLATE = [
    0,  //皇家同花顺 0
    0,  //同花顺   1
    0,  //四条    2
    0,  //葫芦    3
    0,  //同花    4
    0,  //顺子    5
    0,  //三条    6
    0,  //两对    7
    0,  //对子    8
    0,  //高牌    9
];

global.valueToStr5 = (values) => {
    let s = '';
    for (const v of values) {
        if (v === -1) continue;

        s += (s === '' ? '' : ',') + global.valueToStr(v);
    }
    return s;
};

global.strToValue5 = (str) => {
    let vals = [];
    for (const s of _.split(str, ',')) {
        vals.push(global.strToValue(s[0], s.substr(1)));
    }

    return vals;
};

global.valueToStr = (v) => {
    const t = global.TYPES[parseInt(v / global.NUMBERS.length)];
    const n = global.NUMBERS[parseInt(v % global.NUMBERS.length)];
    return `${global.TYPES_STR[t] + global.NUMBERS_STR[n]}`;
};

//strToValue('♥', 'A')
global.strToValue = (typeStr, numberStr) => {
    const typeIndex = _.indexOf(global.TYPES_STR, typeStr);
    const numberIndex = _.indexOf(global.NUMBERS_STR, numberStr);

    if (typeIndex === -1 || numberIndex === -1) return -1;

    const typeRealIndex = _.indexOf(global.TYPES, typeIndex);
    const numberRealIndex = _.indexOf(global.NUMBERS, numberIndex);

    if (numberRealIndex === -1) return -1;

    return typeRealIndex * global.NUMBERS.length + numberRealIndex;
};


module.exports = global;