const chai = require('chai');
const assert = chai.assert;
const DIVIDEND = require('./getDividend');

describe('DIVIDEND', function() {
    it('should return error for unkown symbol', function() {
        assert.equal(DIVIDEND.DIVIDEND(''), 'ERROR: Unknown symbol');
    });

    it('should return correct dividend', function() {
        assert.equal(DIVIDEND.DIVIDEND('appl'), 0.73);
    });
});