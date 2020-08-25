function onOpen() {
    setExchangeRates();
    setMetalPrices();
}

// var TRENDING_ENDPOINT = 'Your own endpoint';
// var ENDPOINT_RATES = 'Your own endpoint';
// var GOLD_ENDPOINT = 'Your own endpoint';
// var EXCHANGE_RATE_CHART_ENDPOINT = 'Your own endpoint';

// Currencies to track in portfolio
var CURRENCIES = ['MXN','JPY','CNY','EUR'];

var UTILITIES_SHEET = 'Utilities';

/**
 * Global variables to track percentiles and exchange rates
 */
var portfolioTicks = [];
var exchangeRates = {};
var bitcoinRate;
var metalsRate;

// Column constants
var SOLD_COLUMN_MANAGED = 'AG';
var CHANGE_COLUMN_MANAGED = 'W';
var SOLD_COLUMN_PASSIVE = 'AE';
var CHANGE_COLUMN_PASSIVE = 'V';
var PCT_LOW = -3.0;
var PCT_HIGH = 3.0;
var EXCHANGE_RATE_CELL = 'F64';
var BITCOIN_RATE_CELL = 'F73';

// CHANGE PCT

/**
 * Constants to track currencies in portfolio
 * See Utilities sheet
 */
var CURRENCIES_HISTORICAL_NAME = 'E';
var CURRENCIES_HISTORICAL_PREVIOUS = 'F';
var CURRENCIES_HISTORICAL_CURRENT = 'G';
var CURRENCIES_HISTORICAL_VARIATION = 'H';
var CURRENCIES_START_ROW = 2;

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

    // Get and set exchange rates
    exchangeRates = getLatestExchangeRates();
    master.getRange(EXCHANGE_RATE_CELL).setValue(exchangeRates.MXN);
    bitcoinRate = getBitcoinPrice();
    master.getRange(BITCOIN_RATE_CELL).setValue(bitcoinRate);

    // Set exchange rates in utilities
    var utilitiesSheet = spreadsheet.getSheetByName(UTILITIES_SHEET);

    var i = 0;
    for (var c; (c = CURRENCIES[i]); i++) {
        utilitiesSheet.getRange(CURRENCIES_HISTORICAL_NAME + (CURRENCIES_START_ROW + i)).setValue(c);
        var currentRange = utilitiesSheet.getRange(CURRENCIES_HISTORICAL_CURRENT + (CURRENCIES_START_ROW + i));
        utilitiesSheet.getRange(CURRENCIES_HISTORICAL_PREVIOUS + (CURRENCIES_START_ROW + i)).setValue(currentRange.getValue());
        currentRange.setValue(exchangeRates[c]);
    }

    utilitiesSheet.getRange(CURRENCIES_HISTORICAL_NAME + (CURRENCIES_START_ROW + i)).setValue('BTC');
    currentRange = utilitiesSheet.getRange(CURRENCIES_HISTORICAL_CURRENT + (CURRENCIES_START_ROW + i));
    utilitiesSheet.getRange(CURRENCIES_HISTORICAL_PREVIOUS + (CURRENCIES_START_ROW + i)).setValue(currentRange.getValue());
    utilitiesSheet.getRange(CURRENCIES_HISTORICAL_CURRENT + (CURRENCIES_START_ROW + i)).setValue(bitcoinRate);
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
    var percentilesSheet = spreadsheet.getSheetByName(UTILITIES_SHEET);
    var managedPortfolioSheet = spreadsheet.getSheetByName('Managed Portfolio');
    var passivePortfolioSheet = spreadsheet.getSheetByName('Passive Portfolio');

    var managedPortfolioMovers = getMovers(managedPortfolioSheet, SOLD_COLUMN_MANAGED, CHANGE_COLUMN_MANAGED);
    var passivePortfolioMovers = getMovers(passivePortfolioSheet, SOLD_COLUMN_PASSIVE, CHANGE_COLUMN_PASSIVE);

    var message = constructPortfolioMessage('Managed Portfolio - Movers ', managedPortfolioMovers);
    message = message + constructPortfolioMessage('Passive Portfolio - Movers ', passivePortfolioMovers);

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
        //return;
    }

    setExchangeRates();

    var message = '<div>' + constructCurrenciesMessage();
    //message = message + contructMortgageRatesMessage();
    message = message + constructMetalsMessage() + '</div>';

    // var message = getEarningsCalendarMessage(2);
    message = message + '<div style="display: inline-block;">' + getPortfolioPercentiles() + '</div>';

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
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var utilitiesSheet = spreadsheet.getSheetByName(UTILITIES_SHEET);
    var numberOfCurrencies =  CURRENCIES.length + 1;
    var range = utilitiesSheet.getRange(CURRENCIES_HISTORICAL_NAME + CURRENCIES_START_ROW + ':' + CURRENCIES_HISTORICAL_VARIATION + (CURRENCIES_START_ROW + numberOfCurrencies));
    var values = range.getValues();

    // var bitcoinPrice = getBitcoinPrice();
    var currencies = {};
    for (var i = 0, c; i < numberOfCurrencies; i++) {
        currencies[values[i][0]] = {
            previous: parseFloat(values[i][1]).toFixed(2),
            current: parseFloat(values[i][2]).toFixed(2),
            change: (parseFloat(values[i][3])*100).toFixed(2),
            url: EXCHANGE_RATE_CHART_ENDPOINT.replace('{currency}', c)
        };
    }

    var message = '<div style="display: inline; float: left; margin: 0 35px 0 0;"><h3>Currencies</h3>';
    message = message +
        '<table style="float: left; margin: 0 25px 0 0;">' +
            '<tr>' +
                '<td><b>Currency</b></td>' +
                '<td><b>Previous</b></td>' +
                '<td><b>Current</b></td>' +
                '<td><b>Change %</b></td>' +
            '</tr>';

    for (var currency in currencies) {
        var data = currencies[currency];
        var color = data.change < 0 ? 'red' : 'green';
        message = message +
            '<tr>' +
                '<td>' +
                    '<a href="' + data.url + '">' + currency + '</a>' +
                '</td>' +
                '<td>' + data.previous + '</td>' +
                '<td>' + data.current + '</td>' +
                '<td style="color: ' + color + ';">' + data.change + '%</td>' +
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

function getMovers(sheet, soldColumn, changeColumn) {
    var movers = {
        worst: {},
        best: {}
    };

    for (var i = 2, tick; (tick = sheet.getRange('A' + i).getValue()); i++) {
        var sold = sheet.getRange(soldColumn + i).getValue();
        if (sold !== '') {
            continue;
        }

        if (portfolioTicks.indexOf(tick) === -1) {
            portfolioTicks.push(tick);
        }

        var change = sheet.getRange(changeColumn + i).getValue();
        if (change <= PCT_LOW && !movers.worst.hasOwnProperty(tick)) {
            movers.worst[tick] = change;
        } else if (change >= PCT_HIGH && !movers.best.hasOwnProperty(tick)) {
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
                        ' href="https://www.tradingview.com/symbols/' + prop + '">' + prop +
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