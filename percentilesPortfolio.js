function onOpen() {
    setExchangeRate();
}

//var TRENDING_ENDPOINT = 'Your own endpoint';
//var ENDPOINT_RATES = 'Your own endpoint';

var portfolioTicks = [];

function getLatestExchangeRate(currency) {
    var url = ENDPOINT_RATES.replace('{currency}', currency);
    var response = UrlFetchApp.fetch(url);
    var data = JSON.parse(response.getContentText());
    var rate = 0.0;
    if (data && data.quotes && data.quotes.USDMXN) {
        var rate = data.quotes.USDMXN;
    }
    return rate;
}

function setExchangeRate() {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var master = spreadsheet.getSheetByName('Master');
    var rate = getLatestExchangeRate('mxn');
    master.getRange('E64').setValue(rate);
}

/**
* Determines worst and best performers of day
*/
function getPortfolioPercentiles() {
    setExchangeRate();

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

    // var message = getEarningsCalendarMessage(2);
    var message = getPortfolioPercentiles();

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
        var sold = sheet.getRange('Y' + i).getValue();
        if (sold !== '') {
            continue;
        }

        if (portfolioTicks.indexOf(tick) === -1) {
            portfolioTicks.push(tick);
        }

        var change = sheet.getRange('O' + i).getValue();
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