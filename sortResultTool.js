"use strict";

const _ = require('lodash');

class SeqTokenData {
    constructor(compareFunc) {
        this.head = null;
        this.tail = null;
        this.count = 0;

        this.centers = [];
        this.compareFunc = compareFunc;
    }

    addData(value) {
        if (this.head === null) {
            const data = new SeqToken(value, this);
            this.head = data;
            this.tail = data;
        }
        else {
            const findBeginCenter = (centers, head, newValue) => {

                if (centers.length === 0) return head;

                const centerIndex = (centers.length % 2 === 0) ? ( centers.length / 2 - 1) : ((centers.length - 1) / 2);
                if (this.compareFunc(newValue, centers[centerIndex].value) < 0) {
                    if (centerIndex === 0) return head;
                    return findBeginCenter(_.slice(centers, 0, centerIndex), head, newValue);
                }
                else {
                    if (centers.length === 1) return centers[centerIndex];
                    return findBeginCenter(_.slice(centers, centerIndex + 1), centers[centerIndex], newValue);
                }
            };
            let begin = findBeginCenter(_.clone(this.centers), this.head, value);

            let needRefresh = false;
            while(true) {
                if (begin !== null && this.compareFunc(value, begin.value) > 0) {
                    if (begin.next === null) {
                        begin.afterMe(new SeqToken(value, this));
                        needRefresh = true;
                        break;
                    }
                    else {
                        begin = begin.next;
                    }
                }else {
                    if (begin.last === null) needRefresh = true;
                    begin.beforeMe(new SeqToken(value, this));
                    break;
                }
            }

            this.refreshCenters();
        }
    }

    refreshCenters() {
        this.centers = [];

        let interval = 0;
        if (Math.pow(2, 5) >= this.count) interval = this.count;
        else {
            for (let i = 5; ;++i) {
                if (Math.pow(2, i) < this.count) continue;
                interval = Math.floor(this.count / i);
                // console.log(`interval is ${interval}`);
                break;
            }
        }

        let i = 1;
        let data = this.head;
        while(true) {
            data = data.next;
            if (data === null) break;

            if (i % interval === 0) {
                this.centers.push(data);
            }
            i++;

            if ((this.count - i) < interval) break;
        }

        // console.log(`after refresh, centers is ${_.map(this.centers, 'value')}`);
    }
}

class SeqToken {
    constructor(value, tokenData) {
        this.tokenData = tokenData;
        this.value = value;
        this.next = null;
        this.last = null;
        tokenData.count++;
    }

    afterMe(token) {
        const oldNext = this.next;

        this.next = token;
        token.last = this;

        token.next = oldNext;
        if (oldNext !== null) {
            oldNext.last = token;
        } else {
            this.tokenData.tail = token;
        }
    }

    beforeMe(token) {
        const oldBefore = this.last;

        this.last = token;
        token.next = this;

        token.last = oldBefore;
        if (oldBefore !== null) {
            oldBefore.next = token;
        } else {
            this.tokenData.head = token;
        }
    }
}

module.exports = SeqTokenData;

// const tokenData = new SeqTokenData((a, b) => {
//     if (a > b) return -1;
//     else return 1;
// });

// for (let i = 0; i < 1000; ++i) {
//     tokenData.addData(i);
// }

// let data = tokenData.head;
// while(true) {
//     console.log(`${data.value}`);
//     data = data.next;
//     if (data === null) break;
// }
// console.log(`${tokenData.count}`);

// tokenData.refreshCenters(1024);
// for (const i of tokenData.centers) {
//     console.log(`${i.key}`);
// }