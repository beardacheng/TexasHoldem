"use strict";

const global = require('./global');
const _ = require('lodash');

/**
 * 从cardPool中抽取cardCount张牌，返回所有可能的组合, 数量为C(m,n)
 * @param cardPool    牌池
 * @param cardCount    抽取张数
 * @param pickedCards   结果集，用于递归调用
 */
const pickCards = function* (cardPool, cardCount, pickedCards) {
    if (pickedCards === undefined) pickedCards = [];
    if (pickedCards.length === cardCount) {
        yield {
            picked: pickedCards,
            remains: cardPool,
        };
        return;
    }

    for (const card of cardPool) {
        if (pickedCards.length > 0 && _.last(pickedCards) >= card) continue;

        const tmpPickCards = _.clone(pickedCards);
        const tmpCardPool = _.clone(cardPool);
        tmpPickCards.push(card);
        _.pull(tmpCardPool, card);
        yield* pickCards(tmpCardPool, cardCount, tmpPickCards);
    }
};

module.exports = pickCards;


