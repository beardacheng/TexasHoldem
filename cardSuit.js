"use strict";

const global = require('./global');
const _ = require('lodash');
const fs = require('fs');
const redis = require('redis');
const cluster = require('cluster');
const SeqTokenData = require('./sortResultTool');

let ALL_SUITS_INFO = {}; //key: v1_v2_v3_v4_v5, {type : id}
let DIRTY_SUITS_INFO_KEYS = [];

class Card {
    constructor(v) {
        this.v = v;
        this.t = global.TYPES[parseInt(v / global.NUMBERS.length)];
        this.n = global.NUMBERS[parseInt(v % global.NUMBERS.length)];
        this.str = `${global.TYPES_STR[this.t] + global.NUMBERS_STR[this.n]}`;
    }
}

class CardSuit {
    constructor(vArr) {
        this.cards = [];
        this.cardsTypes = [];
        this.cardsNumbers = [];
        this.suitKey = '';

        // vArr = _.sortBy(vArr);
        for (const v of vArr) {
            const card = new Card(v);
            this.cardsTypes.push(card.t);
            this.cardsNumbers.push(card.n);
            this.cards.push(card);
            this.cardsValue = _.clone(vArr);

            if (this.suitKey === '') this.suitKey += v.toString();
            else this.suitKey += '_' + v.toString();
        }
    }

    isShun() {
        const sortedNumber = _.sortBy(this.cardsNumbers);  //TODO: 此算法比较耗时；增加A2345的判断
        for(let i = 0; i < sortedNumber.length - 1; i++) {
            if (sortedNumber[i+1] - sortedNumber[i] !== 1) return false;
        }

        return true;
    }

    checkResult() {
        if (this.result !== undefined) return this.result;
        else if (ALL_SUITS_INFO[this.suitKey] !== undefined) return ALL_SUITS_INFO[this.suitKey].type;

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
                    if (_.indexOf(this.cardsNumbers, global.NUMBERS[global.NUMBERS.length - 1]) !== -1) {
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
        if (ALL_SUITS_INFO[this.suitKey] === undefined) {
            this.addToSuitInfo();
        }

        return this.result;
    }

    addToSuitInfo() {
        const v = {
            'key' : this.suitKey,
            'type' : this.result,
            'cards' : _.map(this.cardsValue, global.valueToStr),
            'types' : this.cardsTypes,
            'numbers' : this.cardsNumbers,
        };
        ALL_SUITS_INFO[this.suitKey] = v;
        DIRTY_SUITS_INFO_KEYS.push(this.suitKey);
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

CardSuit.redisClient = redis.createClient();
CardSuit.getConfigs = new Promise((resolve, error) => {
    const redisClient = CardSuit.redisClient;
    let data = {};
    redisClient.smembers('ALL_SUITS_INFO_KEYS', (err, replies) => {
        const resultLen = replies.length;
        let nowAdded = 0;
        console.log(`total = ${resultLen}`);

        if (resultLen > 0) {
            let VALUE_KEYS = ['key', 'type', 'cards', 'types', 'numbers'];
            const nextReply = function*() {
                for (const reply of replies) {
                    yield reply;
                }
            }();

            let loadingCount = 0;
            const getValue = () => {
                let keys = [];
                const KEY_COUNT_PER_TIME = 20;

                while (keys.length < KEY_COUNT_PER_TIME) {
                    const it = nextReply.next();
                    if (it.done === true) break;

                    keys.push(it.value);
                }

                if (keys.length === 0) return;

                const redisMulti = redisClient.multi();

                for (const key of keys) {
                    for (const valueKey of VALUE_KEYS) {
                        redisMulti.hget('ALL_SUITS_INFO_VALUES', key + '_' + valueKey);
                    }
                }

                redisMulti.exec((err, results) => {
                    for (let i = 0; i < keys.length; ++i) {
                        let value = {};
                        for (let j = 0; j < VALUE_KEYS.length; ++j) {
                            value[VALUE_KEYS[j]] = JSON.parse(results[i * VALUE_KEYS.length + j]);
                        }
                        data[keys[i]] = value;
                        nowAdded++;
                        if (nowAdded % 10000 === 0) {
                            if (CardSuit.SHOW_LOG === true) console.log(`${nowAdded}`);
                        }
                    }

                    if (nowAdded === resultLen) {
                        redisClient.quit();
                        resolve(data);
                    } else {
                        if (keys.length === KEY_COUNT_PER_TIME) getValue();
                    }
                });
                loadingCount++;
            };
            getValue();
        }
        else {
            resolve({});
        }
    });
}).then((v) => {
    ALL_SUITS_INFO = v;
});

CardSuit.saveData = () => {
    if (DIRTY_SUITS_INFO_KEYS.length === 0) {
        CardSuit.sortResult();
        CardSuit.redisClient.quit();
        return;
    }

    const redisMulti = CardSuit.redisClient.multi();

    let i = 0;
    for (; i < DIRTY_SUITS_INFO_KEYS.length; ++i) {
        const data = ALL_SUITS_INFO[DIRTY_SUITS_INFO_KEYS[i]];
        redisMulti.sadd('ALL_SUITS_INFO_KEYS', data.key);
        for (const key of _.keys(data)) {
            redisMulti.hset('ALL_SUITS_INFO_VALUES', data.key + "_" + key, JSON.stringify(data[key]));
        }

        if (i >= 1000) {
            break;
        }
    }

    DIRTY_SUITS_INFO_KEYS = _.drop(DIRTY_SUITS_INFO_KEYS, i);
    redisMulti.exec((err, result) => {
        console.log(`saveData remain count ${DIRTY_SUITS_INFO_KEYS.length}`);
        CardSuit.saveData();
    });
};

const numberSortBuff = {};
const findInNumberSortBuff = (value) => {
    const key = value.toString();
    let r = numberSortBuff[key];

    if (r !== undefined) return r;
    else {
        r =  _.sortBy(value);
        numberSortBuff[key] = r;
        return r;
    }
};

CardSuit.SHOW_LOG = true;
CardSuit.sortResult = () => {
    let addedCount = 0;
    const allValues =  _.values(ALL_SUITS_INFO);
    let now = Date.now();
    for (let v of allValues) {

        let inserted = false;

        const getSortedKey = (value) => {
            switch (value.type) {
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                    return `${value.type}`;
                case 8:
                    return `${value.type}_${_.invert(_.countBy(value.numbers))['2']}`;
                case 9:
                    return `${value.type}_${_.max(value.numbers)}`;
                default:
                    console.log(`ERROR`);
            }
        };

        const sortedKey = getSortedKey(v);
        if (SORTED_ALL_SUITS_INFO[sortedKey] === undefined) SORTED_ALL_SUITS_INFO[sortedKey] = new SeqTokenData(compareCard);

        let sortedData = SORTED_ALL_SUITS_INFO[sortedKey];
        sortedData.addData(v);

        addedCount++;

        if (addedCount % 1000 === 0 || addedCount === 658008) {
            if (CardSuit.SHOW_LOG === true) {
                let sum = 0;
                _.each(SORTED_ALL_SUITS_INFO, (value, key) => {
                    let str = '';
                    let pos = value.head;
                    for (let i = 0; i < 5; ++i) {
                        str += pos.value.cards + '/';
                        pos = pos.next;
                        if (pos === null) break;
                    }

                    console.log(`${key}: ${value.count} ${str}`);
                    sum += value.count;
                });
                console.log(`${sum} / ${addedCount}`);
            }
            console.log(`${addedCount} use ${Date.now() - now}`);
            now = Date.now();
        }
    }
};

const compareCard = function(a,b) {
    const compare = (a,b) => {
        if (a > b) return -1;
        else if (a < b) return 1;
        return 0;
    };

    const compareByNumberReal = (a, b) => {
        const getCompareArr = (value) => {
            if (value.numbers !== undefined) value = value.numbers;

            return _.sortBy(_.map(_.countBy(value), (v, k) => {
                return v * 100 + parseInt(k);
            }));
        };

        const aCon = getCompareArr(a);
        const bCon = getCompareArr(b);

        let ret = 0;
        for (let i = aCon.length - 1; i >= 0; --i) {
            ret = compare(aCon[i], bCon[i]);
            if (ret !== 0) return ret;
        }
        return ret;
    };

    class CardNumberCompareBuff {
        constructor() {
            this.existChecks = {};
            this.seqDatas = {};
        }

        compare(a, b) {
            const size = a.length;

            if (size === 1) return compare(a[0],b[0]);

            if (this.seqDatas[size] === undefined) {
                this.seqDatas[size] = new SeqTokenData(compareByNumberReal);
                this.existChecks[size] = {};
            }
            const seqData = this.seqDatas[size];
            const existCheck = this.existChecks[size];

            a = findInNumberSortBuff(a);
            b = findInNumberSortBuff(b);

            const keyA = a.toString();
            const keyB = b.toString();

            if (existCheck[keyA] !== undefined && existCheck[keyB] !== undefined) {
                return compare(existCheck[keyA], existCheck[keyB]);
            }

            const addToSeqData = (value) => {
                seqData.addData(value);
                let data = seqData.head;
                let nowSeq = seqData.count;
                while (data !== null) {
                    existCheck[data.value.toString()] = nowSeq;
                    nowSeq--;
                    data = data.next;
                }

                console.log(`existCheck size is ${_.size(existCheck)}, seqData count is ${seqData.count}`);
            };

            if (existCheck[keyA] === undefined) {
                addToSeqData(a);
            }

            if (existCheck[keyB] === undefined) {
                addToSeqData(b);
            }

            return compare(existCheck[keyA], existCheck[keyB]);
        }
    }

    const cardNumberCompareBuff = new CardNumberCompareBuff();

    const compareByNumber = (a,b) => {
        return cardNumberCompareBuff.compare(a, b);
    };

    const getNumberAndCountBuff = {};

    return function(a , b) {
        const getNumberAndCount = (numbers) => {
            numbers = findInNumberSortBuff(numbers);

            let ret = getNumberAndCountBuff[numbers.toString()];
            if (ret !== undefined) return ret;

            const result = [];
            for (const number of numbers) {
                const data = _.find(result, ['number', number]);
                if (data === undefined) result.push({'number' : number, 'count' : 1});
                else data['count']++;
            }

            ret = _.sortBy(result, (v) => {
                return v.count * 100 + v.number;
            });

            getNumberAndCountBuff[numbers.toString()] = ret;
            return ret;
        };

        let ret = compare(a.type, b.type);
        if (ret !== 0) return ret * -1;

        switch (a.type) {
            case 0:
                return 0;
            case 1:
            case 5:
                return compare(_.max(a.numbers), _.max(b.numbers)); //TODO:考虑A2345
            case 2:
            case 3:{
                const aCon = getNumberAndCount(a.numbers);
                const bCon = getNumberAndCount(b.numbers);
                ret = compare(aCon[1].number, bCon[1].number);
                if (ret !== 0) return ret;
                return compare(aCon[0].number, bCon[0].number);
            }
            case 6:{
                const aCon = getNumberAndCount(a.numbers);
                const bCon = getNumberAndCount(b.numbers);
                ret = compare(aCon[1].number, bCon[1].number);
                if (ret !== 0) return ret;
                return compareByNumber([aCon[0].number, aCon[1].number], [bCon[0].number, bCon[1].number]);
            }
            case 7:{
                const aCon = getNumberAndCount(a.numbers);
                const bCon = getNumberAndCount(b.numbers);
                ret = compare(aCon[2].number, bCon[2].number);
                if (ret !== 0) return ret;
                ret = compare(aCon[1].number, bCon[1].number);
                if (ret !== 0) return ret;
                return compare(aCon[0].number, bCon[0].number);
            }
            case 8:{
                const aCon = getNumberAndCount(a.numbers);
                const bCon = getNumberAndCount(b.numbers);
                ret = compare(aCon[3].number, bCon[3].number);
                if (ret !== 0) return ret;
                return compareByNumber([aCon[0].number, aCon[1].number, aCon[2].number], [bCon[0].number, bCon[1].number,  bCon[2].number]);
            }
            case 4:
            case 9:
                return compareByNumber(a.numbers, b.numbers);
        }
    };
}();

let SORTED_ALL_SUITS_INFO = {
};


process.on('SIGINT', () => {
    console.log(`recv signal SIGINT`);
    CardSuit.SHOW_LOG = false;
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const quest = () => {
        rl.question('input key: ', (key) => {
            if (key.length === 0) {
                CardSuit.SHOW_LOG = true;
                return;
            }

            console.log(`key = ${key}`);
            quest();
        });
    };
    quest();
});

process.on('exit', () => {
    console.log(`exit begin`);
});

module.exports = CardSuit;