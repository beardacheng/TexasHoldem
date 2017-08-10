"use strict";

const _ = require('lodash');
const createSuits = require('./createSuits');
const global = require('./global');
const CardSuit = require('./cardSuit');

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
            this.cardValues = _.fill(new Array(global.MAX_CARDS_NUM), SeekCardTask.INVALID_VALUE);
            this.ignores = [];
            this.setToken = 0;
        }

        this.seeking = false;
    }

    setCardsValue(cardValues) {
        if (cardValues.length !== global.MAX_CARDS_NUM) return undefined;
        this.seeking = false;

        const initFunc = () => {
            this.setCardsValue([], []);
            return undefined;
        };

        for (let i = 0; i < cardValues.length; ++i) {
            const v = cardValues[i];
            if ((v < 0 || v >= global.TYPES.length * global.NUMBERS.length)
                && v !== SeekCardTask.INVALID_VALUE) return initFunc();

            this.setCardAtPos(v, i);
        }

        //检查是否有效
        for (let pos = 0 ; pos < global.MAX_CARDS_NUM; pos++) {
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
        if (pos >= global.MAX_CARDS_NUM || pos < 0) return undefined;
        this.setCardAtPos(value, pos);

        if (this.setToken !== SeekCardTask.FULL_SETED_TOKEN) return SeekCardTask.CONTINUE_NEW_TASK;

        // console.log(`${this.cardValues}`);

        return this.calcResult();
    }

    calcResult() {
        const cards5 = new CardSuit(this.cardValues);
        if (this.cards !== undefined) this.cards.push(cards5);
        if (this.points !== undefined) this.points[cards5.checkResult()]++;
        return cards5;
    }

    seekRange(pos) {
        if (pos >= global.MAX_CARDS_NUM || pos < 0
            || this.cardValues[pos] !== SeekCardTask.INVALID_VALUE) return undefined;

        //from
        let from = 0;
        for (let i = pos - 1; i >= 0; i--) {
            if (this.cardValues[i] === SeekCardTask.INVALID_VALUE) continue;
            from = this.cardValues[i] + 1 + (pos - 1 - i);
            break;
        }

        //to
        let to = global.TYPES.length * global.NUMBERS.length - 1;
        for (let i = pos + 1; i < global.MAX_CARDS_NUM; i++) {
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
SeekCardTask.FULL_SETED_TOKEN = parseInt(_.repeat('1', global.MAX_CARDS_NUM), 2);

const test = (exists, anyCount) => {
    CardSuit.getConfigs.then(() => {
        const task = new SeekCardTask();
        // const suits = createSuits([1,2,3,4,5,6,7], 5);
        // for (const {cards, suit} of suits) {
        //     task.cards = [];
        //     console.log(`${cards} / ${task.setCardsValue(suit)}`);
        //     task.run();
        //     console.log(`${task.cards.length}`);
        // }
        task.cards = [];
        task.points = _.clone(CARD5_TYPE_RESULT_TEMPLATE);
        task.run();
        console.log(`task over: ${task.cards.length}`);
        CardSuit.saveData();
    });
};
test();



