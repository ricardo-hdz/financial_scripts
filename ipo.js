'use strict';

//var IPO_ENDPOINT = 'Your own endpoint';

/**
 * Gets the IPO data from endpoint
 * @returns {JSON}
 */
function getIPOData(week = '') {
    var response = UrlFetchApp.fetch(IPO_ENDPOINT + week, IPO_ENDPOINT_OPTIONS);
    return JSON.parse(response.getContentText());
}

/**
 * Process IPOS to group them by week/date
 * @param {JSON} data
 * @returns {Object}
 */
function processIPOCalendar(data) {
    var ipos = {};
    
    for (var i = 0, ipo; (ipo = data[i]); i++) {
        if (ipo && ipo.expectedPriceDate) {
            if (!ipos.hasOwnProperty(ipo.expectedPriceDate)) {
                ipos[ipo.expectedPriceDate] = [];
            }
            ipos[ipo.expectedPriceDate].push(ipo);
        }
    }
    
    return ipos;
}

/***
 * Sets the IPO data in sheet
 * @param {JSON} data Raw payload from service
 */
function setIPOInfoInSheet(data) {
    // tick, company name, date, priceLow, priceHigh, URL, description
    // A, B, C, D, E, F
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var ipoSheet = spreadsheet.getSheetByName('IPOs');
    ipoSheet.getRange('A2:G50').clearContent();
   
    for (var i = 0, ipo;(ipo = data[i]); i++) {
        var row = i + 2;
        ipoSheet.getRange('A' + row).setValue(ipo.proposedTickerSymbol);
        ipoSheet.getRange('B' + row).setValue(ipo.companyName);
        ipoSheet.getRange('C' + row).setValue(ipo.expectedPriceDate);
        let prices = ipo.proposedSharePrice ? ipo.proposedSharePrice.split('-') : [];
        if (prices.length >= 2) {
            ipoSheet.getRange('D' + row).setValue(prices[0]);
            ipoSheet.getRange('E' + row).setValue(prices[1]);
        } else {
            ipoSheet.getRange('D' + row).setValue('NA');
            ipoSheet.getRange('E' + row).setValue('NA');
        }
        ipoSheet.getRange('F' + row).setValue(`${IPO_LINK + ipo.dealID}`);
        ipoSheet.getRange('G' + row).setValue('');
    }
}

/**
 * Transforms IPO data and renders the IPO in a table
 * @param {JSON} data
 * @returns {String} HTML block
 */
var getIPOCalendarMessage = function(data) {
    var ipos = processIPOCalendar(data);
    return renderIPOCalendar(ipos);
}

/**
 * Sends an email with the IPO calendar data
 */
function sendIPOReport() {
    let data = getDataForNextWeeks();
    setIPOInfoInSheet(data);
    var msg = getIPOCalendarMessage(data);

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var url = spreadsheet.getUrl();
    var owner = spreadsheet.getOwner();

    var microdata = '<div itemscope itemtype="http://schema.org/EmailMessage">' +
        '<div itemprop="potentialAction" itemscope itemtype="http://schema.org/ViewAction">' +
            '<link itemprop="target" href="' + url + '"/>' +
            '<meta itemprop="name" content="Track IPOS"/>' +
        '</div>' +
        '<meta itemprop="description" content="Track IPOs"/>' +
        '</div>';

    MailApp.sendEmail(owner.getEmail(), 'Market Intelligence - IPO Calendar ' + getToday(), msg, {
        name: 'Market Intelligence Bot',
        htmlBody: microdata + msg
    });
}

/**
 * Constructs the HTML component to render IPOs in a table
 * @param {Object} ipos
 * @returns {String} HTML block
 */
function renderIPOCalendar(ipos) {
    var message = '<div style="display: inline; float: left; margin: 0 35px 0 0;"><h3>IPOs Calendar</h3>';

    if (Object.keys(ipos).length > 0) {
        message = message + '<table style="float: left; margin: 0 25px 0 0;">';

        for (var day in ipos) {
            var iposForDay = ipos[day];
            for (var i = 0, ipo; (ipo = iposForDay[i]); i++) {
                message = message + (i % 2 === 0 ? '<tr style="background-color: lightgrey;">' : '<tr>');
                message = message +
                    '<td>' +
                        '<b>' + ipo.expectedPriceDate + '</b>' +
                    '</td>' +
                    '<td style="padding-left: 0px;">' + ipo.companyName + '</td>' +
                    '<td style="padding-left: 0px;">' + ipo.proposedTickerSymbol + '</td>' +
                '</tr>';
            }
        };
        message = message + '</table>';
    } else {
        message = message + '<div>No IPOs this week.</div>';
    }

    return message + '</div>';
}

/**
 * Returns today's date formatted as MM/DD/YYYY
 * @returns {String}
 */
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

function getDataForNextWeeks() {
    let weeks = getNextWeeks();
    let payload, data = [];
    weeks.forEach(w => {
        payload = getIPOData(w);
        if (
            payload &&
            payload.data &&
            payload.data.upcoming &&
            payload.data.upcoming.upcomingTable &&
            payload.data.upcoming.upcomingTable.rows
        ) {
            data = [...data, ...payload.data.upcoming.upcomingTable.rows];
        }
    });
    return data;
}

/**
 * Gets an array of YYYY-MM for current and next week
 */
function getNextWeeks() {
    let weeks = [];
    let currentWeek = getMonthYear();
    weeks.push(currentWeek);
    let nextWeek = getMonthYear(7);
    if (currentWeek !== nextWeek) {
        weeks.push(nextWeek);
    }
    return weeks;
}

function getMonthYear(daysAhead = 0) {
    var today = new Date();
    today.setDate(today.getDate() + daysAhead);
    var mm = today.getMonth() + 1;
    var yyyy = today.getFullYear();

    if (mm < 10) {
        mm = '0' + mm;
    }

    return yyyy + '-' + mm;
}

module.exports = {
    getIPOData: getIPOData,
    processIPOCalendar: processIPOCalendar,
    getToday: getToday,
    getMonthYear: getMonthYear,
    getNextWeeks: getNextWeeks,
    getDataForNextWeeks: getDataForNextWeeks
};