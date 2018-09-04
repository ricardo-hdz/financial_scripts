/**
* Copies the value of the detailed portfolio to the historic spreadsheet
*/
function trackPortfolio() {
    var d = new Date();

    // Track portflio only on market days
    if (d.getDay() === 6 || d.getDay() === 0) {
        return;
    }

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var url = spreadsheet.getUrl();
    var owner = spreadsheet.getOwner();
    var allocationSheet = spreadsheet.getSheetByName('Portfolio');
    var historicSheet = spreadsheet.getSheetByName('Historical Portfolio');
    var lastRow = historicSheet.getLastRow() + 1;
    var lastColumn = historicSheet.getLastColumn();
    historicSheet.insertColumnAfter(lastColumn);
    lastColumn = historicSheet.getLastColumn() + 1;

    var lastRowAllocation = allocationSheet.getLastRow() + 1;

    var allocationRange = allocationSheet.getRange('B2:B');
    allocationRange.copyValuesToRange(historicSheet, lastColumn, lastColumn, 2, 2 + allocationRange.getHeight());

    var dateCell = historicSheet.getRange(1, lastColumn);
    dateCell.setValue(getToday());
    // row, column, numRows
    // need to define one row less in sum
    var sumRange = historicSheet.getRange(2, lastColumn, 77);
    var sumRangeNotation = sumRange.getA1Notation();
    var sumCell = historicSheet.getRange(79, lastColumn);
    sumCell.setValue('=SUM(' + sumRangeNotation + ')');

    var previousSumCell = historicSheet.getRange(79, lastColumn-1.0);

    var diffCell = historicSheet.getRange(80, lastColumn);
    var currentValue = sumCell.getValue();
    var pastValue = previousSumCell.getValue();
    diffCell.setValue('=' + sumCell.getA1Notation() + '-' + previousSumCell.getA1Notation());
    var pctCell = historicSheet.getRange(81, lastColumn);
    pctCell.setNumberFormat('00.00%');
    pctCell.setValue('=' + diffCell.getA1Notation() + '/' + previousSumCell.getA1Notation());

    var totalValue = parseFloat(sumCell.getValue());
    var diffValue = parseFloat(diffCell.getValue());
    var pctValue = parseFloat(pctCell.getValue() * 100);

    var color = diffValue > 0 ? 'green' : 'red';

    var message = '<h3>Total Portfolio as of ' + getToday() + '</h3>' +
        '<table>' +
            '<tr>' +
                '<td></td>' +
                '<td><b>Value</b></td>' +
            '</tr>' +
            '<tr>' +
                '<td><b>Total Portfolio</b></td>' +
                '<td><b>$' + totalValue + '</b></td>' +
            '</tr>' +
            '<tr>' +
                '<td><b>Portfolio Variation</b></td>' +
                '<td style="color: ' + color + '"><b>$' + diffValue + '</b></td>' +
            '</tr>' +
            '<tr>' +
                '<td><b>Percentage Variation</b></td>' +
                '<td style="color: ' + color + '"><b>' + pctValue + '</b></td>' +
            '</tr>' +
        '</table>';

    var microdata = '<div itemscope itemtype="http://schema.org/EmailMessage">' +
        '<div itemprop="potentialAction" itemscope itemtype="http://schema.org/ViewAction">' +
        '<link itemprop="target" href="' + url + '"' +
        '<meta itemprop="name" content="View Portfolio"/>' +
        '</div>' +
        '<meta itemprop="description" content="Track daily portfolio"/>' +
        '</div>';

    MailApp.sendEmail(owner.getEmail(), 'Portfolio Update - ' + getToday(), message, {
        name: 'Market Intelligence Bot',
        htmlBody: message + microdata
    });
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