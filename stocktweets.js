'use strict';

//var EARNINGS_ENDPOINT = 'Your own endpoint';

function getEarningsCalendar(start, end) {
    var url = EARNINGS_ENDPOINT.replace('{start}', start);
    url = url.replace('{end}', end);
    var response = UrlFetchApp.fetch(url);
    return JSON.parse(response.getContentText());
}

function getDates(date) {
    var dates = [];
    var s;

    if (date) {
        s = new Date(date);
    } else {
        s = new Date();
    }

    while (dates.length < 10) {
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
                cal.push(copy);
            }
        });
    }
    return cal;
}

function sendWeeklyEarningsCalendar() {
    var dates = getDates();
    var earnings = getEarningsCalendar(dates[0], dates[dates.length - 1]);
    var cal = processEarningsCalendar(earnings, dates);
    var message = renderEarningsCalendar(cal, dates);

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var url = spreadsheet.getUrl();
    var owner = spreadsheet.getOwner();

    var microdata = '<div itemscope itemtype="http://schema.org/EmailMessage">' +
        '<div itemprop="potentialAction" itemscope itemtype="http://schema.org/ViewAction">' +
        '<link itemprop="target" href=""/>' +
        '<meta itemprop="name" content="Market Intelligence - Weekly Earnings Calendar"/>' +
        '</div>';

    MailApp.sendEmail(owner.getEmail(), 'Market Intelligence - Weekly Earnings Calendar', message, {
        name: 'Market Intelligence Bot',
        htmlBody: message + microdata
    });
}

function renderEarningsCalendar(data, dates) {
    var message = '<table style="float: left; margin: 0 25px 0 0;">';

    for (var i = 0; i < data.length; i++) {
        message = message + (i % 2 === 0 ? '<tr style="background-color: lightgrey;">' : '<tr>');
        message = message +
            '<td>' +
                '<b>' + dates[i] + '</b>' +
            '</td>' +
            '<td style="padding-left: 50px;">' + data[i] + '</td>' +
        '</tr>';
    }

    return message + '</table>';
}

module.exports = {
    'getDates': getDates,
    'processEarningsCalendar': processEarningsCalendar
};