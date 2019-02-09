function DIVIDEND(stock) {
    if (stock === '' || stock === null) {
        return 'ERROR: Unknown symbol';
    }
    var DIVIDEND_ENDPOINT = 'https://api.iextrading.com/1.0/stock/{stock}/stats';

    var url = DIVIDEND_ENDPOINT.replace('{stock}', stock);

    var response = null;
    try {
        var r = UrlFetchApp.fetch(url);
        response = r.getContentText();
    } catch (err) {
        return 0.0;
    }

    response = JSON.parse(response);
    var dividend = 0.0;

    if (response === null || response.length === 0) {
        return dividend;
    }

    if (response.hasOwnProperty('dividendYield') && response.dividendYield) {
        var yield = parseFloat(response.dividendYield);
        var movingAverage = parseFloat(response.day50MovingAvg);
        dividend = yield/100*movingAverage/4;
    } else {
        return 0.0;
    }

    return dividend.toFixed(2);
}

function YIELD(stock) {
    if (stock === '' || stock === null) {
        return 'ERROR: Unknown symbol';
    }
    var DIVIDEND_ENDPOINT = 'https://api.iextrading.com/1.0/stock/{stock}/stats';

    var url = DIVIDEND_ENDPOINT.replace('{stock}', stock);

    var response = null;
    try {
        var r = UrlFetchApp.fetch(url);
        response = r.getContentText();
    } catch (err) {
        return 0.0;
    }

    response = JSON.parse(response);

    if (response === null || response.length === 0) {
        return 0.0;
    }

    if (response.hasOwnProperty('dividendYield') && response.dividendYield) {
        return response.dividendYield;
    } else {
        return 0.0;
    }
}

module.exports = {
    DIVIDEND: DIVIDEND
};