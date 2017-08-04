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

const valueToStr = (v) => {
    const t = TYPES[parseInt(v / NUMBERS.length)];
    const n = NUMBERS[parseInt(v % NUMBERS.length)];
    return `${TYPES_STR[t] + NUMBERS_STR[n]}`;
};

const MAX_CARDS_NUM = 5;
let CARD5_TYPE_RESULT_TEMPLATE = [
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

let seq = 0;

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

        // vArr = _.sortBy(vArr);
        for (const v of vArr) {
            const card = new Card(v);
            this.cardsTypes.push(card.t);
            this.cardsNumbers.push(card.n);
            this.cards.push(card);
        }
    }

    isShun() {
        const sortedNumber = _.sortBy(this.cardsNumbers);  //TODO: 此算法比较耗时
        for(let i = 0; i < sortedNumber.length - 1; i++) {
            if (sortedNumber[i+1] - sortedNumber[i] !== 1) return false;
        }

        return true;
    }

    checkResult() {
        if (this.result !== undefined) return this.result;

        const numberCounts = _.countBy(this.cardsNumbers);
        const numberCountsKeys = _.keys(numberCounts);

        if (numberCountsKeys.length === 2) {
            const t = _.values(numberCounts)[0];
            if (t === 2 || t === 3) {
                //葫芦
                this.result = 3;
            }
            else {
                //金刚
                this.result = 2;
            }
        }
        else if (numberCountsKeys.length === 3) {
            if (_.indexOf(_.values(numberCounts), 3) !== -1) {
                //三条
                this.result = 6;
            }
            else {
                //两对
                this.result = 7;
            }
        }
        else if (numberCountsKeys.length === 4) {
            this.result = 8;
        }
        else {
            if (_.uniq(this.cardsTypes).length === 1) {
                if (this.isShun()) {
                    if (_.indexOf(this.cardsNumbers, NUMBERS[NUMBERS.length - 1]) !== -1) {
                        //皇家同花顺
                        this.result = 0;
                    }
                    else {
                        //同花顺
                        this.result = 1;
                    }
                }
                else {
                    //同花
                    this.result = 4;
                }
            }
            else if (this.isShun()){
                //顺子
                this.result = 5;
            }
            else {
                //高牌
                this.result = 9;
            }
        }

        // this.display();
        return this.result;
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

class SeekCardTask {
    constructor(task) {
        if (task instanceof SeekCardTask){
            this.cardValues = _.clone(task.cardValues);
            this.ignores = task.ignores;

            this.cards = task.cards;
            this.points = task.points;
            this.setToken = task.setToken;
        }
        else {
            this.cardValues = _.fill(new Array(MAX_CARDS_NUM), SeekCardTask.INVALID_VALUE);
            this.ignores = [];
            this.setToken = 0;
        }

        this.seeking = false;
    }

    setCardsValue(cardValues, poses) {
        if (cardValues.length !== poses.length) return undefined;

        cardValues = _.sortBy(cardValues);
        poses = _.sortBy(poses);
        this.cardValues = _.fill(new Array(MAX_CARDS_NUM), SeekCardTask.INVALID_VALUE);
        this.setToken = 0;
        this.seeking = false;

        const initFunc = () => {
            this.setCardsValue([], []);
            return undefined;
        };

        for (const pos of poses) {
            if (pos < 0 || pos >= MAX_CARDS_NUM) continue;

            const v = _.first(cardValues);
            if (v < 0 || v >= TYPES.length * NUMBERS.length) return initFunc();

            this.setCardAtPos(_.first(cardValues), pos);
            cardValues = _.drop(cardValues);
        }

        //检查是否有效
        for (let pos = 0 ; pos < MAX_CARDS_NUM; pos++) {
            if (SeekCardTask.INVALID_VALUE !== this.cardValues[pos]) continue;
            if (undefined === this.seekRange(pos)) {
                return initFunc();
            }
         }

        return _.clone(this.cardValues);
    }

    setCardAtPos(value, pos) {
        this.cardValues[pos] = value;
        this.setToken |= 1 << pos;
    }

    setExistCard(pos, value) {
        if (pos >= MAX_CARDS_NUM || pos < 0) return undefined;
        this.setCardAtPos(value, pos);

        if (this.setToken !== SeekCardTask.FULL_SETED_TOKEN) return SeekCardTask.CONTINUE_NEW_TASK;

        // console.log(`${this.cardValues}`);

        return this.calcResult();
    }

    calcResult() {
        const cards5 = new Cards5(this.cardValues);
        if (this.cards !== undefined) this.cards.push(cards5);
        if (this.points !== undefined) this.points[cards5.checkResult()]++;
        return cards5;
    }

    seekRange(pos) {
        if (pos >= MAX_CARDS_NUM || pos < 0
            || this.cardValues[pos] !== SeekCardTask.INVALID_VALUE) return undefined;

        //from
        let from = 0;
        for (let i = pos - 1; i >= 0; i--) {
            if (this.cardValues[i] === SeekCardTask.INVALID_VALUE) continue;
            from = this.cardValues[i] + 1 + (pos - 1 - i);
            break;
        }

        //to
        let to = TYPES.length * NUMBERS.length - 1;
        for (let i = pos + 1; i < MAX_CARDS_NUM; i++) {
            if (this.cardValues[i] === SeekCardTask.INVALID_VALUE) continue;
            to = this.cardValues[i] - 1 - ( i - pos - 1);
            break;
        }

        if(from > to)  return undefined;
        return {from, to};
    }

    nearestInvalidPos() {
        for (let i = 0; i < this.cardValues.length; ++i) {
            if (this.cardValues[i] === SeekCardTask.INVALID_VALUE) {
                return i;
            }
        }

        return SeekCardTask.INVALID_VALUE;
    }

    begin() {
        this.cardPos = this.nearestInvalidPos();
        if (this.cardPos === SeekCardTask.INVALID_VALUE) return;

        this.cardRange = this.seekRange(this.cardPos);
        if (this.cardRange === undefined) return;

        this.lastCheck = SeekCardTask.INVALID_VALUE;
        this.seeking = true;
    }

    next() {
        if (!this.seeking) return undefined;
        else if (this.lastCheck === SeekCardTask.INVALID_VALUE) this.lastCheck = this.cardRange.from;
        else if (this.lastCheck >= this.cardRange.to) {this.seeking = false; return undefined;}
        else this.lastCheck++;

        if (_.indexOf(this.ignores, this.lastCheck) !== -1) return this.next();

        const ret = this.setExistCard(this.cardPos, this.lastCheck);
        if (ret === SeekCardTask.CONTINUE_NEW_TASK) return ret;
        else if (this.lastCheck < this.cardRange.to) return SeekCardTask.CONTINUE_NEXT;
    }

    run() {
        if (this.setToken === SeekCardTask.FULL_SETED_TOKEN) return this.calcResult();

        this.begin();
        while(true) {
            const ret = this.next();
            if (ret === SeekCardTask.CONTINUE_NEW_TASK) {
                const newTask = new SeekCardTask(this);
                newTask.run();
            }
            else if (ret === SeekCardTask.CONTINUE_NEXT) {}
            else break;
        }
    }
}

SeekCardTask.INVALID_VALUE = -1;
SeekCardTask.CONTINUE_NEW_TASK = 1;
SeekCardTask.CONTINUE_NEXT = 2;
SeekCardTask.FULL_SETED_TOKEN = parseInt(_.repeat('1', MAX_CARDS_NUM), 2);


const task = new SeekCardTask();
// task.cards = [];
// task.ignores = [strToValue('♠', 'A')];
task.points = _.clone(CARD5_TYPE_RESULT_TEMPLATE);

// console.log(`${task.setCardsValue([strToValue('♠', 'A'), strToValue('♥', 'A')], [0,1])}`);
// console.log(`${valueToStr(1)}`);
// console.log(`${task.setCardsValue([5,4,3,2,1], [4,3,2,1,0])}`);
console.log(`${task.setCardsValue([5,4,3,2,10], [4,0,3,2,1])}`);

const beginTime = _.now();
task.run();
console.log(`Used Ms: ${_.now() - beginTime}`);
console.log(`${task.points}`);

// for (const card of task.cards) {
//     card.display();
// }

console.log(`${seq}`);
