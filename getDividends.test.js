const chai = require('chai');
const assert = chai.assert;
const dividends = require('./getDividends');

describe('Dividends', function() {
    it('should return error for unkown symbol', function() {
        assert.equal(dividends.DIVIDENDS('', '2018-02-15', '2018-02-20'), 'ERROR: Unknown symbol');
    });

    it('should return sum for all dividends from start to end date', function() {
        assert.equal(dividends.DIVIDENDS('appl', '2018-02-15', '2018-02-20'), 0.63);
        assert.equal(dividends.DIVIDENDS('appl', '2017-11-01', '2018-02-20'), 1.26);
        assert.equal(dividends.DIVIDENDS('appl', '2017-08-01', '2018-02-20'), 1.89);
        assert.equal(dividends.DIVIDENDS('appl', '2017-05-01', '2018-02-20'), 2.52);
    });

    it('should return correct time diff', function() {
        assert.equal(dividends.getTimeDiff(new Date(), new Date('2018-10-10')), '6m');
        assert.equal(dividends.getTimeDiff(new Date(), new Date('2017-12-10')), '1y');
        assert.equal(dividends.getTimeDiff(new Date(), new Date('2016-10-10')), '5y');
        assert.equal(dividends.getTimeDiff(new Date(), new Date('2016-10-10')), '5y');
    });
});