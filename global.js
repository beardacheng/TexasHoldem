"use strict";

let global = {};
global.TYPES_STR = ['','♠','♥','♣','♦'];
global.NUMBERS_STR = ['','','2','3','4','5','6','7','8','9','10','J','Q','K','A'];
global.TYPES = [1,2,3,4];
global.NUMBERS = [5,6,7,8,9,10,11,12,13,14];
global.MAX_CARDS_NUM = 5;
global.valueToStr = (v) => {
    const t = global.TYPES[parseInt(v / global.NUMBERS.length)];
    const n = global.NUMBERS[parseInt(v % global.NUMBERS.length)];
    return `${global.TYPES_STR[t] + global.NUMBERS_STR[n]}`;
};

//strToValue('♥', 'A')
const strToValue = (typeStr, numberStr) => {
    const typeIndex = _.indexOf(global.TYPES_STR, typeStr);
    const numberIndex = _.indexOf(global.NUMBERS_STR, numberStr);

    if (typeIndex === -1 || numberIndex === -1) return -1;

    const typeRealIndex = _.indexOf(global.TYPES, typeIndex);
    const numberRealIndex = _.indexOf(global.NUMBERS, numberIndex);

    if (numberRealIndex === -1) return -1;

    return typeRealIndex * global.NUMBERS.length + numberRealIndex;
};


module.exports = global;