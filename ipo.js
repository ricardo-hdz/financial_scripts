'use strict';

//var IPO_ENDPOINT = 'Your own endpoint';

/**
 * Gets the IPO data from endpoint
 * @returns {JSON}
 */
function getIPOData() {
    var response = UrlFetchApp.fetch(IPO_ENDPOINT);
    return JSON.parse(response.getContentText());
}

/**
 * Process IPOS to group them by week/date
 * @param {JSON} data
 * @returns {Object}
 */
function processIPOCalendar(data) {
    var ipos = {};
    if (data.hasOwnProperty('viewData') && data.viewData) {
        for (var i = 0, ipo; (ipo = data.viewData[i]); i++) {
            if (ipo && ipo.hasOwnProperty('Expected') && ipo.Expected) {
                if (!ipos.hasOwnProperty(ipo.Expected)) {
                    ipos[ipo.Expected] = [];
                }
                ipos[ipo.Expected].push(ipo);
            }
        }
    }
    return ipos;
}

/***
 * Sets the IPO data in sheet
 * @param {JSON} data
 */
function setIPOInfoInSheet(data) {
    // tick, company name, date, priceLow, priceHigh, URL, description
    // A, B, C, D, E, F
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var ipoSheet = spreadsheet.getSheetByName('IPOs');
    ipoSheet.getRange('A2:G50').clearContent();
    if (data.rawData && data.rawData.length) {
        for (var i = 0, ipo;(ipo = data.rawData[i]); i++) {
            var row = i + 2;
            ipoSheet.getRange('A' + row).setValue(ipo.symbol);
            ipoSheet.getRange('B' + row).setValue(ipo.companyName);
            ipoSheet.getRange('C' + row).setValue(ipo.expectedDate);
            ipoSheet.getRange('D' + row).setValue(ipo.priceLow);
            ipoSheet.getRange('E' + row).setValue(ipo.priceHigh);
            ipoSheet.getRange('F' + row).setValue(ipo.url);
            ipoSheet.getRange('G' + row).setValue(ipo.companyDescription);
        }
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
    var d = new Date();

    // Send briefing only on saturdays
    if (d.getDay() === 6) {
         return;
    }

    var data = getIPOData();
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
                        '<b>' + ipo.Expected + '</b>' +
                    '</td>' +
                    '<td style="padding-left: 0px;">' + ipo.Company + '</td>' +
                    '<td style="padding-left: 0px;">' + ipo.Symbol + '</td>' +
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