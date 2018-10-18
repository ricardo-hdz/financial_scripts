var MORTGAGE_RATES_SHEET = 'mortgage_rates';

var ROWS = [1,2];
var TITLES_COLUMNS = [1,4,7];
var VALUES_COLUMNS = [2,5,8];
var CHANGE_COLUMNS = [3,6,9];

function contructMortgageRatesMessage() {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var ratesSheet = spreadsheet.getSheetByName(MORTGAGE_RATES_SHEET);

    var titles = [];
    var values = [];
    var changes = [];
    for (var i = 0; i < TITLES_COLUMNS.length; i++) {
        titles.push(ratesSheet.getRange(1, TITLES_COLUMNS[i]).getValue());
        values.push(ratesSheet.getRange(3, VALUES_COLUMNS[i]).getValue());
        changes.push(parseFloat(ratesSheet.getRange(3, CHANGE_COLUMNS[i]).getValue()).toFixed(3));
    }

    var message = '<div style="display: inline; float: left; margin: 0 35px 0 0;"><h3>Mortgage Rates</h3>';
    message = message +
        '<table style="float: left; margin: 0 25px 0 0;">' +
            '<tr>' +
                '<td><b>Rate</b></td>' +
                '<td><b>Current</b></td>' +
                '<td><b>Change</b></td>' +
            '</tr>';

    for (var i = 0; i < titles.length; i++) {
        var color = changes[i] < 0 ? 'red' : 'green';
        message = message +
            '<tr>' +
                '<td>' + titles[i] + '</td>' +
                '<td>' + values[i] + '</td>' +
                '<td style="color: ' + color + ';">' + changes[i] + '%</td>' +
            '</tr>';
    }

    message = message + '</table></div>';
    return message;
}