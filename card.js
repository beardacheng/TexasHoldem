"use strict";

const _ = require('lodash');
const createSuits = require('./createSuits');
const global = require('./global');
const CardSuit = require('./cardSuit');
const pickCards = require('./pickCards');

let seq = 0;

class SeekCardTask {
    constructor(task) {
        if (task instanceof SeekCardTask){
            this.cardValues = _.clone(task.cardValues);
            this.ignores = task.ignores;

            this.cards = task.cards;
            this.points = task.points;
            this.setToken = task.setToken;
            this.maxCard = task.maxCard;
            this.addedValues = _.clone(task.addedValues);
        }
        else {
            this.cardValues = _.fill(new Array(global.MAX_CARDS_NUM), SeekCardTask.INVALID_VALUE);
            this.ignores = [];
            this.setToken = 0;
            this.addedValues = [];
        }

        this.seeking = false;
    }

    setCardsValue(cardValues) {
        if (cardValues.length !== global.MAX_CARDS_NUM) return undefined;
        this.seeking = false;
        this.cardValues = _.fill(new Array(global.MAX_CARDS_NUM), SeekCardTask.INVALID_VALUE);
        this.setToken = 0;

        const initFunc = () => {
            this.setCardsValue([]);
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

         // console.log(`set value ${global.valueToStr5(this.cardValues)}`);

        return _.clone(this.cardValues);
    }

    setCardAtPos(value, pos) {
        this.cardValues[pos] = value;
        if (value !== SeekCardTask.INVALID_VALUE) this.setToken |= 1 << pos;
    }

    getCardResult(addedValue) {
        addedValue = (addedValue !== undefined ?  _.clone(addedValue) : []);
        return {
            values : _.clone(this.cardValues),
            compareValue : this.calcResult(),
            cards : global.valueToStr5(this.cardValues),
            addedValue : addedValue,
            addedCards : global.valueToStr5(addedValue),
        };
    };

    setExistCard(pos, value) {
        if (pos >= global.MAX_CARDS_NUM || pos < 0) return undefined;

        if (this.cardValues[pos] !== SeekCardTask.INVALID_VALUE) {
            _.pull(this.addedValues, this.cardValues[pos]);
        }
        this.addedValues.push(value);
        // console.log(`added ${this.addedValues}`);

        this.setCardAtPos(value, pos);

        if (this.setToken !== SeekCardTask.FULL_SETED_TOKEN) {
            return SeekCardTask.CONTINUE_NEW_TASK;
        }

        if (this.maxCard === undefined) {
            this.maxCard = this.getCardResult(this.addedValues);
        } else {
            const nowCard = this.getCardResult(this.addedValues);
            if (nowCard.compareValue < this.maxCard.compareValue) this.maxCard = nowCard;
        }

        return this.maxCard;
    }

    calcResult() {
        const cards5 = new CardSuit(this.cardValues);
        return cards5.checkResult();
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
        this.maxCard = undefined;
    }

    next() {
        if (!this.seeking) return this.maxCard;
        else if (this.lastCheck === SeekCardTask.INVALID_VALUE) this.lastCheck = this.cardRange.from;
        else if (this.lastCheck >= this.cardRange.to) {this.seeking = false; return this.maxCard;}
        else this.lastCheck++;

        if (_.indexOf(this.ignores, this.lastCheck) !== -1) return this.next();

        const ret = this.setExistCard(this.cardPos, this.lastCheck);
        if (ret === SeekCardTask.CONTINUE_NEW_TASK) return ret;
        else if (this.lastCheck < this.cardRange.to) return SeekCardTask.CONTINUE_NEXT;
        else return ret;
    }

    run() {
        if (this.setToken === SeekCardTask.FULL_SETED_TOKEN) {
            return this.getCardResult();
        }

        this.begin();
        while(true) {
            const ret = this.next();
            if (ret === SeekCardTask.CONTINUE_NEW_TASK) {
                const newTask = new SeekCardTask(this);
                this.maxCard = newTask.run();
            }
            else if (ret === SeekCardTask.CONTINUE_NEXT) {}
            else break;
        }

        return this.maxCard;
    }
}

SeekCardTask.INVALID_VALUE = -1;
SeekCardTask.CONTINUE_NEW_TASK = 1;
SeekCardTask.CONTINUE_NEXT = 2;
SeekCardTask.FULL_SETED_TOKEN = parseInt(_.repeat('1', global.MAX_CARDS_NUM), 2);

const getSuitCompareValue = (suit) => {
    if (suit.length > global.MAX_CARDS_NUM) {
        const suits = [];
        const suitsIt = pickCards(suit, global.MAX_CARDS_NUM);
        while(true) {
            const newSuit = suitsIt.next();
            if (newSuit.done === true) break;
            suits.push(newSuit.value.picked);
        }
        return getSuitsMaxValue(suits);
    }

    const task = new SeekCardTask();
    if (task.setCardsValue(suit) === undefined) return undefined;
    else {
        return task.run();
    }
};

const getSuitsMaxValue = (suits) => {
    let maxValue = null;
    for (const suit of suits) {
        const tmp = getSuitCompareValue(suit);
        if (tmp === undefined) continue;
        else if (maxValue === null) maxValue = tmp;
        else if (maxValue.compareValue > tmp.compareValue) maxValue = tmp;
    }

    if (maxValue === null) return undefined;
    return maxValue;
};

const test = () => {
    const fullCards = [];
    for (let i = 0; i < global.TYPES.length * global.NUMBERS.length; ++i) {
        fullCards.push(i);
    }

    const myCards = [global.strToValue('♥', 'A'), global.strToValue('♠', 'A')];
    _.pull(fullCards, global.strToValue('♥', 'A'));
    _.pull(fullCards, global.strToValue('♠', 'A'));

    const pickCardsIt = pickCards(fullCards, global.MAX_CARDS_NUM);
    while (true) {
        const pickCardsSuitStat = pickCardsIt.next();
        if (pickCardsSuitStat.done === true) break;

        const pickCardsSuit = pickCardsSuitStat.value;
        const picked5 = pickCardsSuit.picked;

        const othersMinValue = getSuitCompareValue(picked5);
        if (othersMinValue === undefined) continue;
        const remainCards = pickCardsSuit.remains;

        const myMaxValue = getSuitCompareValue(_.concat(myCards, picked5));
        if (myMaxValue === undefined) continue;

        let resultScore = {win:0, loss:0, draw:0};

        const otherPick2It = pickCards(remainCards, 2);
        while (true) {
            const otherPick2 = otherPick2It.next();
            if (otherPick2.done === true) break;

            let otherSuitValue = getSuitCompareValue(_.concat(otherPick2.value.picked, picked5));
            if (otherSuitValue.compareValue > othersMinValue.compareValue) otherSuitValue = othersMinValue;

            let str = `5 is ${global.valueToStr5(picked5)} picked ${global.valueToStr5(otherPick2.value.picked)} compare: ${myMaxValue.cards} ${otherSuitValue.cards} `;

            if (myMaxValue.compareValue < otherSuitValue.compareValue) {
                resultScore.win++;
                str += 'win';
            }
            else if (myMaxValue.compareValue > otherSuitValue.compareValue) {
                resultScore.loss++;
                str += 'loss';
            }
            else {
                resultScore.draw++;
                str += 'draw';
            }

            // console.log(`${str}`);
        }

        console.log(`5 is ${global.valueToStr5(picked5)} result is ${JSON.stringify(resultScore)}`);
    }

};
test();



