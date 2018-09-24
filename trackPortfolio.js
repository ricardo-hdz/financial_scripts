/**
* Copies the value of the detailed portfolio to the historic spreadsheet
*/
var PORTFOLIOS_ROWS = [2,8,16,21,27,33,39,46,53,59,64,68,72,76];

function trackPortfolio() {
    var d = new Date();

    // Track portflio only on market days
    if (d.getDay() === 6 || d.getDay() === 0) {
        return;
    }

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var url = spreadsheet.getUrl();
    var owner = spreadsheet.getOwner();

    // sheets
    var allocationSheet = spreadsheet.getSheetByName('Portfolio');
    var historicSheet = spreadsheet.getSheetByName('Historical Portfolio');

    var lastColumn = historicSheet.getLastColumn();
    historicSheet.insertColumnAfter(lastColumn);
    lastColumn = historicSheet.getLastColumn() + 1;

    // copy positions
    var allocationRange = allocationSheet.getRange('B2:B');
    allocationRange.copyValuesToRange(historicSheet, lastColumn, lastColumn, 2, 2 + allocationRange.getHeight());

    // copy totals of positions (by portfolio)
    var historicSheetRange;
    var sumPortfoliosFormula = '=SUM(';
    for (var i = 0, pr; (pr = PORTFOLIOS_ROWS[i]); i++) {
        historicSheetRange = historicSheet.getRange(pr, lastColumn);
        allocationSheet.getRange('C' + pr).copyTo(historicSheetRange, {contentsOnly: true});
        sumPortfoliosFormula = sumPortfoliosFormula + historicSheetRange.getA1Notation() + ',';
    }
    sumPortfoliosFormula = sumPortfoliosFormula + ')';

    var dateCell = historicSheet.getRange(1, lastColumn);
    dateCell.setValue(getToday());
    // row, column, numRows
    // need to define one row less in sum
    var sumCell = historicSheet.getRange(79, lastColumn);
    sumCell.setValue(sumPortfoliosFormula);

    var previousSumCell = historicSheet.getRange(79, lastColumn-1.0);

    var diffCell = historicSheet.getRange(80, lastColumn);

    diffCell.setValue('=' + sumCell.getA1Notation() + '-' + previousSumCell.getA1Notation());
    var pctCell = historicSheet.getRange(81, lastColumn);
    pctCell.setNumberFormat('00.00%');
    pctCell.setValue('=' + diffCell.getA1Notation() + '/' + previousSumCell.getA1Notation());

    var totalValue = parseFloat(sumCell.getValue()).toFixed(2);
    var diffValue = parseFloat(diffCell.getValue()).toFixed(2);
    var pctValue = parseFloat(pctCell.getValue() * 100).toFixed(2);

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
                '<td style="color: ' + color + '"><b>' + pctValue + ' %</b></td>' +
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