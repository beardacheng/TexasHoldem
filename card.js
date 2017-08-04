"use strict";

const _ = require('lodash');

const TYPES_STR = ['','♠','♥','♣','♦'];
const NUMBERS_STR = ['','2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const TYPES = [1,2,3,4];
const NUMBERS = [4,5,6,7,8,9,10,11,12,13];

//strToValue('♥', 'A')
const strToValue = (typeStr, numberStr) => {
    const typeIndex = _.indexOf(TYPES_STR, typeStr);
    const numberIndex = _.indexOf(NUMBERS_STR, numberStr);

    if (typeIndex === -1 || numberIndex === -1) return -1;

    const typeRealIndex = _.indexOf(TYPES, typeIndex);
    const numberRealIndex = _.indexOf(NUMBERS, numberIndex);

    if (numberRealIndex === -1) return -1;

    return typeRealIndex * NUMBERS.length + numberRealIndex;
};

let CARD5_TYPE_COUNT = [
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

class Card {
    constructor(v) {
        this.v = v;
        this.t = TYPES[parseInt(v / NUMBERS.length)];
        this.n = NUMBERS[parseInt(v % NUMBERS.length)];
        this.str = `${TYPES_STR[this.t] + NUMBERS_STR[this.n]}`;
    }
}

class Cards5 {
    constructor(vArr) {
        this.cards = [];
        this.cardsTypes = [];
        this.cardsNumbers = [];

        vArr = _.sortBy(vArr);
        for (const v of vArr) {
            const card = new Card(v);
            this.cardsTypes.push(card.t);
            this.cardsNumbers.push(card.n);
            this.cards.push(card);
        }
    }

    isShun() {
        for(let i = 0; i < this.cardsNumbers.length - 1; i++) {
            if (this.cardsNumbers[i+1] - this.cardsNumbers[i] !== 1) return false;
        }

        return true;
    }

    checkResult() {
        const numberCounts = _(this.cardsNumbers).countBy().values().value();

        if (_.keys(numberCounts).length === 2) {
            const t = _.values(numberCounts)[0];
            if (t === 2 || t === 3) {
                //葫芦
                //CARD5_TYPE_COUNT[3]++;
                return 3;
            }
            else {
                //金刚
                //CARD5_TYPE_COUNT[2]++;
                return 2;
            }
        }
        else if (_.keys(numberCounts).length === 3) {
            if (_.indexOf(_.values(numberCounts), 3) !== -1) {
                //三条
                //CARD5_TYPE_COUNT[6]++;
                return 6;
            }
            else {
                //两对
                //CARD5_TYPE_COUNT[7]++;
                return 7;
            }
        }
        else if (_.keys(numberCounts).length === 4) {
            //CARD5_TYPE_COUNT[8]++;
            return 8;
        }
        else {
            if (_.uniq(this.cardsTypes).length === 1) {
                if (this.isShun()) {
                    if (_.indexOf(this.cardsNumbers, NUMBERS[NUMBERS.length - 1]) !== -1) {
                        //皇家同花顺
                        //CARD5_TYPE_COUNT[0]++;
                        return 0;
                    }
                    else {
                        //同花顺
                        //CARD5_TYPE_COUNT[1]++;
                        return 1;
                    }
                }
                else {
                    //同花
                    //CARD5_TYPE_COUNT[4]++;
                    return 4;
                }
            }
            else if (this.isShun()){
                //顺子
                // CARD5_TYPE_COUNT[5]++;
                return 5;
            }
            else {
                // CARD5_TYPE_COUNT[9]++;
                return 9;
            }
        }

        // this.display();
    }

    display() {
        let s = "";
        for (const c of this.cards)
        {
            s += c.str + ',';
        }
        console.log(`${s}`);
    }
}

const insertCard = (nowArr, card) => {
    let newArr = [];

    if (nowArr.length === 0) {
        newArr.push(card);
        return newArr;
    }

    let added = false;
    for(let i = 0; i < nowArr.length; i++){
        if (nowArr[i] === card) return undefined;

        if (added || nowArr[i] < card) {
            newArr.push(nowArr[i]);
        } else {
            newArr.push(card);
            added = true;
            i--;
        }
    }

    if (!added) newArr.push(card);

    return newArr;
};

const getCard = (lastIndex, now, points, cards, ignores) => {
    for(let i = 0 ; i < NUMBERS.length * TYPES.length; i++) {
        if ((lastIndex !== undefined && i < lastIndex)
            || (ignores !== undefined && _.indexOf(ignores, i))) continue;

        if (now === undefined || now.length === 0) {
            const r = getCard(i, [i], points, cards, ignores);
            points = r.points;
            cards = r.cards;
        }
        else {
            const t = insertCard(now, i);
            if (t === undefined) continue;

            if (t.length === 5) {
                const cards5 = new Cards5(t);
                if (cards !== undefined) cards.push(cards5);
                points[cards5.checkResult()]++;
            }
            else {
                const r = getCard(i, t, points, cards, ignores);
                points = r.points;
                cards = r.cards;
            }
        }
    }

    return {points, cards};
};

const {points, cards} = getCard(0, [strToValue('♠', 'A'), strToValue('♥', 'A')], CARD5_TYPE_COUNT, []);
console.log(`${points} ${cards.length}`);

// const {points} = getCard(-1, [], CARD5_TYPE_COUNT);
// console.log(`${points}`);

