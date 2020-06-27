// const chai = require('chai');
// const assert = chai.assert;
const requireText = require('require-text');
let ipo = require('./ipo');
let data = require('./data/nasdaq_ipo.json');
// let jest = require('jest');

describe('IPO', function() {
    beforeEach(() => {
        jest.spyOn(ipo, 'getIPOData').mockReturnValue(data);
    });

    it('should return data', () => {
        expect(ipo.getIPOData()).not.toBeNull()
    });

    it('should have correct upcoming ipos', () => {
        let expected = [
            {
                "dealID": "864405-91738",
                "proposedTickerSymbol": "NARI",
                "companyName": "Inari Medical, Inc.",
                "proposedExchange": "NASDAQ Global Select",
                "proposedSharePrice": "17.00-18.00",
                "sharesOffered": "7,333,000",
                "expectedPriceDate": "05/22/2020",
                "dollarValueOfSharesOffered": "$151,793,100.00"
            }
        ];
        expect(ipo.processIPOCalendar(data)).toEqual({ '05/22/2020': expected });
    });

    it('should get month and year for API call', () => {
        expect(ipo.getMonthYear()).toEqual('2020-06');
    });

    it('should get next weeks month and year for API call', () => {
        expect(ipo.getMonthYear(7)).toEqual('2020-07');
    });

    it('should get next weeks array', () => {
        expect(ipo.getNextWeeks()).toEqual(['2020-06', '2020-07']);
    });
});