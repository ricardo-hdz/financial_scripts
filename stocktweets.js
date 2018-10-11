'use strict';

//var EARNINGS_ENDPOINT = 'Your own endpoint';
var portfolioTicks = [];

function getEarningsCalendar(start, end) {
    var url = EARNINGS_ENDPOINT.replace('{start}', start);
    var options = {
        headers: {
            origin: STOCKTWEETS_ORIGIN
        }
    };
    url = url.replace('{end}', end);
    var response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response.getContentText());
}

function getDates(startDate, numberDays) {
    var dates = [];
    var s;

    if (startDate) {
        s = new Date(startDate);
    } else {
        s = new Date();
    }

    while (dates.length < numberDays) {
        s.setDate(s.getDate() + 1);
        if (s.getDay() < 1 || s.getDay() > 5) {
            continue;
        }
        var d = s.getFullYear() + '-' + getMonthFormatted(s) + '-' + getDateFormatted(s);
        dates.push(d);
    }

    return dates;
}

function getMonthFormatted(d) {
    return d.getMonth() + 1 < 10 ? '0' + (d.getMonth() + 1) : d.getMonth() + 1;
}

function getDateFormatted(d) {
    return d.getDate() < 10 ? '0' + d.getDate() : d.getDate();
}

function processEarningsCalendar(data, dates) {
    var c = {};
    var cal = [];
    if (data && data.earnings) {
        dates.forEach(function(date) {
            if (data.earnings.hasOwnProperty(date) && data.earnings[date]) {
                var day = data.earnings[date];
                var copy = day.selected_copy ? day.selected_copy : 'No earnings found';
                if (copy.toLowerCase().indexOf('sorry') == -1) {
                    cal.push(copy);
                }
            }
        });
    }
    return cal;
}

function processEarningsTicks(data, dates) {
    var c = {};
    var ticks = [];
    if (data && data.earnings) {
        dates.forEach(function(date) {
            if (data.earnings.hasOwnProperty(date) && data.earnings[date]) {
                var earnings = data.earnings[date];
                if (earnings.hasOwnProperty('stocks') && earnings.stocks) {
                    earnings.stocks.forEach(function(tick) {
                        ticks.push(tick.symbol + ';' + date);
                    });
                }
            }
        });
    }
    return ticks;
}

function setEarningTicksInSheet(ticks) {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var earningsSheet = spreadsheet.getSheetByName('Earnings');
    var ticksRange = earningsSheet.getRange('A2:A');
    var dateRange = earningsSheet.getRange('B2:B');
    var values;
    ticksRange.clearContent();
    dateRange.clearContent();
    for (var i = 0, cell; i < ticks.length; i++) {
        ticksRange = earningsSheet.getRange('A' + (i + 2));
        dateRange = earningsSheet.getRange('B' + (i + 2));
        // splits <TICK>;<date>
        values = ticks[i].split(';');
        if (values.length > 1) {
            ticksRange.setValue(values[0]);
            dateRange.setValue(values[1]);
        }
    }
}

function setTrendingTicksInSheet(ticks) {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var earningsSheet = spreadsheet.getSheetByName('Trending');
    var ticksRange = earningsSheet.getRange('A2:A');
    ticksRange.clearContent();
    for (var i = 0, cell; i < ticks.length; i++) {
        ticksRange = earningsSheet.getRange('A' + (i + 2));
        ticksRange.setValue(ticks[i]);
    }
}

var getEarningsCalendarMessage = function(earnings, dates) {
    var cal = processEarningsCalendar(earnings, dates);
    return renderEarningsCalendar(cal, dates);
}

function sendDailyTrendingReport() {
    var d = new Date();

    // Send briefing only on market days
    if (d.getDay() === 0) {
         return;
    }

    var dates = getDates(0, 10);
    var earnings = getEarningsCalendar(dates[0], dates[dates.length - 1]);
    var ticks = processEarningsTicks(earnings, dates);
    setEarningTicksInSheet(ticks);

    var message = getEarningsCalendarMessage(earnings, dates);

    var trendingData = getTrendingTicks();
    ticks = processTrendingTicks(trendingData);
    setTrendingTicksInSheet(ticks);

    message = message + renderTrendingTicks(ticks);

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var url = spreadsheet.getUrl();
    var owner = spreadsheet.getOwner();

    var microdata = '<div itemscope itemtype="http://schema.org/EmailMessage">' +
        '<div itemprop="potentialAction" itemscope itemtype="http://schema.org/ViewAction">' +
            '<link itemprop="target" href="' + url + '"/>' +
            '<meta itemprop="name" content="Track Trending & Earnings Report"/>' +
        '</div>' +
        '<meta itemprop="description" content="Track Trending & Earnings Report"/>' +
        '</div>';

    MailApp.sendEmail(owner.getEmail(), 'Market Intelligence - Earnings & Trending Report ' + getToday(), message, {
        name: 'Market Intelligence Bot',
        htmlBody: microdata + message
    });
}

function renderEarningsCalendar(data, dates) {
    var message = '<div style="display: inline; float: left; margin: 0 35px 0 0;"><h3>Earnings Calendar</h3>';

    if (data.length > 0) {
        message = message + '<table style="float: left; margin: 0 25px 0 0;">';

        for (var i = 0; i < data.length; i++) {
            message = message + (i % 2 === 0 ? '<tr style="background-color: lightgrey;">' : '<tr>');
            message = message +
                '<td>' +
                    '<b>' + dates[i] + '</b>' +
                '</td>' +
                '<td style="padding-left: 50px;">' + data[i] + '</td>' +
            '</tr>';
        }

        message = message + '</table>';
    } else {
        message = message + '<div>No earnings reporting this week.</div>';
    }

    return message + '</div>';
}

function renderTrendingTicks(ticks) {
    var message = '<div style="display: inline; float: left; margin: 0 35px 0 0;"><h3>Trending Stocks</h3>';
    var colorFirst, colorTwo;

    message = message +
        '<table style="float: left; margin: 0 25px 0 0;">' +
            '<tr>' +
                '<td><b>Tick</b></td>' +
                '<td style="padding-left: 25px;"><b>Tick</b></td>'  +
            '</tr>';

    for (var i = 0; i < ticks.length -1; i+=2) {
        colorFirst = portfolioTicks.indexOf(ticks[i]) > -1 ? 'green' : 'black';
        colorTwo = portfolioTicks.indexOf(ticks[i+1]) > -1 ? 'green' : 'black';

        message = message +
            '<tr>' +
            '<td>' +
                '<b>' +
                '<a style="color: ' + colorFirst + '; "' +
                    ' href="https://finance.yahoo.com/quote/' + ticks[i] + '/key-statistics?p=' +
                    ticks[i] + '">' + ticks[i] +
                '</a>' +
                '</b>' +
            '</td>' +
            '<td style="padding-left: 25px;">' +
                '<b>' +
                '<a style="color: ' + colorTwo + '; "' +
                    ' href="https://finance.yahoo.com/quote/' + ticks[i+1] + '/key-statistics?p=' +
                    ticks[i+1] + '">' + ticks[i+1] +
                '</a>' +
                '</b>' +
            '</td>' +
        '</tr>';
    }

    message = message + '</table></div>';

    return message;
}

var getTrendingTicks = function(start, end) {
    var response = UrlFetchApp.fetch(TRENDING_ENDPOINT);
    return JSON.parse(response.getContentText());
}

var processTrendingTicks = function(data) {
    var ticks = [];
    if (data && data.response.status == 200) {
        data.symbols.forEach(function(trend) {
            ticks.push(trend.symbol);
        });
    }
    return ticks;
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