function DIVIDENDS(stock, startDate, endDate) {
    if (stock === '' || stock === null) {
        return 'ERROR: Unknown symbol';
    }
    let DIVIDEND_ENDPOINT = 'https://api.iextrading.com/1.0/stock/{stock}/dividends/{time}';
    var t = new Date();
    var s = new Date(startDate);
    var e = new Date(endDate);

    var time = getTimeDiff(t, s);
    var url = DIVIDEND_ENDPOINT.replace('{stock}', stock);
    url = url.replace('{time}', time);
    var r = UrlFetchApp.fetch(url);
    var response = r.getContentText();
    // response = data;
    if (response === 'Unknown symbol') {
        return 'ERROR: Unknown symbol';
    }
    response = JSON.parse(response);
    // console.log(d);
    if (response === null || response.length === 0) {
        return 'ND';
    }

    var sum = 0.0;
    for (var i = 0, dividend; (dividend = response[i]); i++) {
        var pd = new Date(dividend.paymentDate);
        if (pd >= s && pd <= e) {
            sum = sum + parseFloat(dividend.amount);
        }
    }
    return sum.toFixed(2);
}

function getTimeDiff(t, s) {
    var timeDiff = Math.abs(t.getTime() - s.getTime());
    var days = Math.ceil(timeDiff / (1000 * 3600 * 24));
    var m = days / 30;
    if (m <= 12) {
        if (m <= 6) {
            return '6m';
        } else {
            return '1y';
        }
    } else {
        if (m <= 24) {
            return '2y';
        } else {
            return '5y';
        }
    }
}

module.exports = {
    DIVIDENDS: DIVIDENDS,
    getTimeDiff: getTimeDiff
};