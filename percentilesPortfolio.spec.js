const chai = require('chai');
const assert = chai.assert;
const requireText = require('require-text');
let pp = require('./percentilesPortfolio');
let data = requireText('./data/metals.txt', require);

describe('Percentiles Portfolio', function() {
    it('should process metal data correctly', function() {
        var gold = pp.processMetalPrices(data);
        assert.deepEqual(gold, {
            gold: {
                'min': '1221.80',
                'max': '1235.80',
                'var_usd': '-6.70',
                'var_pct': '-0.54'
            },
            silver: {
                'min': '15.29',
                'max': '15.63',
                'var_usd': '-0.14',
                'var_pct': '-0.90'
            }
        });
    });
});