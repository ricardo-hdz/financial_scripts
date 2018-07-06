const chai = require('chai');
const assert = chai.assert;
let st = require('./stocktweets');

let data = require('./data/trending.json');
let earnings = require('./data/earnings.json');

describe('Stock Tweets', function() {
    it('should retrieve trending ticks', function() {
        var ticks = st.processTrendingTicks(data);
        assert.isNotEmpty(ticks);
    });

    it('should get start and end dates', function() {
        var dates = st.getDates('07/01/2018');
        assert.deepEqual(dates, [
            '2018-07-02',
            '2018-07-03',
            '2018-07-04',
            '2018-07-05',
            '2018-07-06',
            '2018-07-09',
            '2018-07-10',
            '2018-07-11',
            '2018-07-12',
            '2018-07-13'
        ]);
    });

    it('should get earnings calendar', function() {
        var dates = st.getDates('07/01/2018');
        var calendar = st.processEarningsCalendar(earnings, dates);
        assert.isNotEmpty(calendar);
    });
});