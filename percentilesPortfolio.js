function onOpen() {
    setExchangeRates();
    setBitcoinRate();
    setMetalPrices();
}

// var TRENDING_ENDPOINT = 'Your own endpoint';
// var ENDPOINT_RATES = 'Your own endpoint';
// var GOLD_ENDPOINT = 'Your own endpoint';
// var EXCHANGE_RATE_CHART_ENDPOINT = 'Your own endpoint';

// Currencies to track in portfolio
var CURRENCIES = ['MXN','JPY','CNY','KRW'];

var portfolioTicks = [];
var exchangeRates = {};
var bitcoinRate;
var metalsRate;

/**
 * Gets the latest exchange rate for a given currency
 * @param {String} currency
 * @returns {String}
 */
function getLatestExchangeRates(currency) {
    var currencies = currency ? currency : CURRENCIES.join(',');
    var url = ENDPOINT_RATES.replace('{currency}', currencies);
    var response = UrlFetchApp.fetch(url);
    var data = JSON.parse(response.getContentText());
    var rate = 0.0;
    if (data && data.quotes && data.quotes) {
        currencies = currencies.split(',');
        for (var i = 0, c; (c = currencies[i]); i++) {
            exchangeRates[c] = data.quotes['USD' + c] ? data.quotes['USD' + c] : 0.0;
        }
    }
    return exchangeRates;
}

/**
 * Gets the current bitcoin price
 * @returns {String}
 */
function getBitcoinPrice() {
    var response = UrlFetchApp.fetch(BITCOIN_ENDPOINT);
    var r = JSON.parse(response.getContentText());
    var rate = 0.0;
    if (r && r.data && r.data.amount) {
        var rate = r.data.amount;
    }
    return rate;
}

/**
 * Gets the spot prices for Gold and Silver
 * You can overwrite this function with your custom endpoint
 * and logic to parse values.
 * @returns {String}
 */
function getMetalPrices() {
    var options = {
        contentType: 'text/plain;charset=UTF-8',
        headers: {
            origin: GOLD_ORIGIN
        }
    };
    var r = UrlFetchApp.fetch(GOLD_ENDPOINT, options);
    return r.getContentText();
}

function processMetalPrices(data) {
    data = data || getMetalPrices();
    var metals = data.split('\n');
    var goldData = metals[1].split(',');
    var silverData = metals[0].split(',');
    return {
        gold: getMetalData(goldData),
        silver: getMetalData(silverData)
    };
}
// exports.processMetalPrices = processMetalPrices;

/**
 * Process plain text data string and retrives
 * a metal value price (min/max) and variation (usd/pct)
 * @param {*} data
 */
function getMetalData(data) {
    return {
        'min': data[data.length - 2],
        'max': data[data.length - 1],
        'var_usd': data[data.length - 4],
        'var_pct': data[data.length - 3]
    };
}


function setExchangeRates() {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var master = spreadsheet.getSheetByName('Master');
    exchangeRates = getLatestExchangeRates();
    master.getRange('E64').setValue(exchangeRates.MXN);
}

function setBitcoinRate() {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var master = spreadsheet.getSheetByName('Master');
    bitcoinRate = getBitcoinPrice();
    master.getRange('E72').setValue(bitcoinRate);
}

/**
 * Sets the current metal data into spreadsheet
 */
function setMetalPrices() {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var metals = spreadsheet.getSheetByName('Metals');
    metalsRate = processMetalPrices();
    metals.getRange('T2').setValue((parseFloat(metalsRate.gold.max) + parseFloat(metalsRate.gold.min))/2);
    metals.getRange('T3').setValue((parseFloat(metalsRate.silver.max) + parseFloat(metalsRate.silver.min))/2);
}

/**
* Determines worst and best performers of day
*/
function getPortfolioPercentiles() {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var percentilesSheet = spreadsheet.getSheetByName('Percentiles');
    var managedPortfolioSheet = spreadsheet.getSheetByName('Managed Portfolio');
    var passivePortfolioSheet = spreadsheet.getSheetByName('Passive Portfolio');
    var kuspitSheet = spreadsheet.getSheetByName('Kuspit');

    var lowPercentileManaged = percentilesSheet.getRange('B2').getValue();
    var highPercentileManaged = percentilesSheet.getRange('C2').getValue();

    var lowPercentilePassive = percentilesSheet.getRange('B4').getValue();
    var highPercentilePassive = percentilesSheet.getRange('C4').getValue();

    var lowPercentileKuspit = percentilesSheet.getRange('B3').getValue();
    var highPercentileKuspit = percentilesSheet.getRange('C3').getValue();

    var managedPortfolioMovers = getMovers(managedPortfolioSheet, lowPercentileManaged, highPercentileManaged);
    var passivePortfolioMovers = getMovers(passivePortfolioSheet, lowPercentilePassive, highPercentilePassive);
    var kuspitPortfolioMovers = getMovers(kuspitSheet, lowPercentileKuspit, highPercentileKuspit);

    var message = constructPortfolioMessage('Managed Portfolio - Movers ', managedPortfolioMovers);
    message = message + constructPortfolioMessage('Passive Portfolio - Movers ', passivePortfolioMovers);
    message = message + constructPortfolioMessage('Kuspit Portfolio - Movers ', kuspitPortfolioMovers);

    return message;
}

function getPortfolioTicks() {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var portfolios = [
        'Managed Portfolio',
        'Passive Portfolio',
        'Kuspit'
    ];

    portfolios.forEach(function(portfolio) {
        var list = [];
        var s = spreadsheet.getSheetByName(portfolio);
        var last = s.getLastRow();
        var range = s.getRange('A2:A' + last);
        var ticks = range.getValues();
        if (ticks) {
            list.append(ticks);
        }
    });
}

function sendBriefing() {
    var d = new Date();

    // Send briefing only on market days
    if (d.getDay() === 6 || d.getDay() === 0) {
        return;
    }

    setExchangeRates();
    setBitcoinRate();

    var message = constructCurrenciesMessage();
    message = message + constructMetalsMessage();

    // var message = getEarningsCalendarMessage(2);
    message = message + getPortfolioPercentiles();

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var url = spreadsheet.getUrl();
    var owner = spreadsheet.getOwner();

    var type;
    type = d.getHours() < 12 ? 'Opening' : 'Closing';

    var microdata = '<div itemscope itemtype="http://schema.org/EmailMessage">' +
        '<div itemprop="potentialAction" itemscope itemtype="http://schema.org/ViewAction">' +
            '<link itemprop="target" href="' + url + '"/>' +
            '<meta itemprop="name" content="Track Protfolio & Market"/>' +
        '</div>' +
        '<meta itemprop="description" content="Track Protfolio & Market"/>' +
        '</div>';

    MailApp.sendEmail(owner.getEmail(), 'Market Intelligence - ' + type + ' Briefing ' + getToday(), message, {
        name: 'Market Intelligence Bot',
        htmlBody: message + microdata
    });
}

function constructCurrenciesMessage() {
    var bitcoinPrice = getBitcoinPrice();
    var currencies = {};
    for (var i = 0, c; (c = CURRENCIES[i]); i++) {
        if (exchangeRates.hasOwnProperty(c) && exchangeRates[c]) {
            currencies[c] = {
                rate: exchangeRates[c],
                url: EXCHANGE_RATE_CHART_ENDPOINT.replace('{currency}', c)
            };
        }
    }
    currencies['Bitcoin'] = {
        rate: getBitcoinPrice(),
        url: 'https://pro.coinbase.com/trade'
    };

    var message = '<div style="display: inline; float: left; margin: 0 35px 0 0;"><h3>Currencies</h3>';
    message = message +
        '<table style="float: left; margin: 0 25px 0 0;">' +
            '<tr>' +
                '<td><b>Currency</b></td>' +
                '<td><b>Current Rate</b></td>' +
            '</tr>';

    for (var currency in currencies) {
        var data = currencies[currency];
        message = message +
            '<tr>' +
                '<td>' +
                    '<a href="' + data.url + '">' + currency + '</a>' +
                '</td>' +
                '<td>' + data.rate + '</td>' +
            '</tr>';
    }

    message = message + '</table></div>';
    return message;
}

function constructMetalsMessage() {
    var data = processMetalPrices();

    var message = '<div style="display: inline; float: left; margin: 0 35px 0 0;"><h3>Metals</h3>';
    message = message +
        '<table style="float: left; margin: 0 25px 0 0;">' +
            '<tr>' +
                '<td><b>Metal</b></td>' +
                '<td><b>Min</b></td>' +
                '<td><b>Max</b></td>' +
                '<td><b>Var USD</b></td>' +
                '<td><b>Var %</b></td>' +
            '</tr>';

    for (var metal in data) {
        message = message + contructMetalTableRow(metal, data[metal]);
    }

    message = message + '</table></div>';
    return message;
}

function contructMetalTableRow(metal, data) {
    var color = parseFloat(data.var_pct) < 0 ? 'red' : 'green';

    return '<tr>' +
        '<td>' + metal + '</td>' +
        '<td>' + data.min + '</td>' +
        '<td>' + data.max + '</td>' +
        '<td style="color: ' + color + ';">' + data.var_usd + '</td>' +
        '<td style="color: ' + color + ';">' + data.var_pct + '</td>' +
    '</tr>';
}


function constructPortfolioMessage(portfolioName, movers) {
    var message = '<div style="display: inline; float: left; margin: 0 35px 0 0;"><h3>' + portfolioName + getToday() + '</h3>';
    message = renderMovers(movers.best, 'green', message);
    message = renderMovers(movers.worst, 'red', message);
    message = message + '</div>';

    return message;
}

function getMovers(sheet, low, high) {
    var movers = {
        worst: {},
        best: {}
    };

    for (var i = 2, tick; (tick = sheet.getRange('A' + i).getValue()); i++) {
        var sold = sheet.getRange('AA' + i).getValue();
        if (sold !== '') {
            continue;
        }

        if (portfolioTicks.indexOf(tick) === -1) {
            portfolioTicks.push(tick);
        }

        var change = sheet.getRange('Q' + i).getValue();
        if (change <= low && !movers.worst.hasOwnProperty(tick)) {
            movers.worst[tick] = change;
        } else if (change >= high && !movers.best.hasOwnProperty(tick)) {
            movers.best[tick] = change;
        }
    }

    return movers;
}

function renderMovers(group, color, message) {
    message = message +
        '<table style="float: left; margin: 0 25px 0 0;">' +
            '<tr>' +
                '<td><b>Tick</b></td>' +
                '<td><b>Change %</b></td>' +
            '</tr>';

    for (var prop in group) {
        message = message +
            '<tr>' +
                '<td>' +
                    '<b>' +
                    '<a style="color: ' + color + '; "' +
                        ' href="https://finance.yahoo.com/quote/' + prop + '/key-statistics?p=' +
                        prop + '">' + prop +
                    '</a>' +
                    '</b>' +
                '</td>' +
                '<td><b>' + group[prop] + '</b></td>' +
            '</tr>';
    };

    message = message + '</table>';

    return message;
}

function getToday() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1;
    var yyyy = today.getFullYear();

    if (dd < 10) {
        dd = '0' + dd;
    }

    if (mm < 10) {
        mm = '0' + mm;
    }

    return mm + '/' + dd + '/' + yyyy;
}