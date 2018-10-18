/**
* Copies the value of the detailed portfolio to the historic spreadsheet
*/

// CONST
var TOTAL_ROW = 80;
var DIFF_ROW = 81;
var PCT_ROW = 82;
var PORTFOLIOS_ROWS = [2,8,16,22,28,34,40,47,54,60,65,69,73,77];
var VARIATION_ROWS = [81];
var TOTAL_ROWS = [80];

var dailyVariationPortfolio = [];

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
    var diffPortfolio;
    for (var i = 0, pr; (pr = PORTFOLIOS_ROWS[i]); i++) {
        historicSheetRange = historicSheet.getRange(pr, lastColumn);
        allocationSheet.getRange('C' + pr).copyTo(historicSheetRange, {contentsOnly: true});
        sumPortfoliosFormula = sumPortfoliosFormula + historicSheetRange.getA1Notation() + ',';
        diffPortfolio = historicSheet.getRange(pr, lastColumn).getValue() - historicSheet.getRange(pr, lastColumn - 1).getValue();
        dailyVariationPortfolio.push(diffPortfolio.toFixed(2));
    }
    sumPortfoliosFormula = sumPortfoliosFormula + ')';

    var dateCell = historicSheet.getRange(1, lastColumn);
    dateCell.setValue(getToday());
    // row, column, numRows
    // need to define one row less in sum
    var sumCell = historicSheet.getRange(TOTAL_ROW, lastColumn);
    sumCell.setValue(sumPortfoliosFormula);

    var previousSumCell = historicSheet.getRange(TOTAL_ROW, lastColumn-1.0);

    var diffCell = historicSheet.getRange(DIFF_ROW, lastColumn);

    diffCell.setValue('=' + sumCell.getA1Notation() + '-' + previousSumCell.getA1Notation());
    var pctCell = historicSheet.getRange(PCT_ROW, lastColumn);
    pctCell.setNumberFormat('00.00%');
    pctCell.setValue('=' + diffCell.getA1Notation() + '/' + previousSumCell.getA1Notation());

    var totalValue = parseFloat(sumCell.getValue()).toFixed(2);
    var diffValue = parseFloat(diffCell.getValue()).toFixed(2);
    var pctValue = parseFloat(pctCell.getValue() * 100).toFixed(2);

    var color = diffValue > 0 ? 'green' : 'red';
    var msgVariation = renderDailyPortfolioVariation();
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
            '<tr></tr>' +
            msgVariation +
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

    // update historical charts with latest data
    updateHistoricalCharts(lastColumn);
}

function renderDailyPortfolioVariation() {
    var portfolioName;
    var msg = '';
    var variation;
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var historicSheet = spreadsheet.getSheetByName('Historical Trends');
    for (var i = 0; i <= dailyVariationPortfolio.length; i++) {
        variation = dailyVariationPortfolio[i];
        portfolioName = historicSheet.getRange(PORTFOLIOS_ROWS[i],1).getValue();
        msg = msg +
        '<tr>' +
            '<td>' + portfolioName + '</td>' +
            '<td>$' + variation + '</td>' +
        '</tr>';
    }
    return msg;
}


function updateHistoricalCharts(lastColumn) {
    var ORDER = [VARIATION_ROWS, TOTAL_ROWS, PORTFOLIOS_ROWS];
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    // sheets
    var historicSheet = spreadsheet.getSheetByName('Historical Trends');
    var historicalSheet = spreadsheet.getSheetByName('Historical Portfolio');
    var lastRange;

    var charts = historicSheet.getCharts();
    var rows;

    for (var i = 0, chart; (chart = charts[i]); i++) {
        var uChart = chart.modify();
        var ranges = chart.getRanges();
        if (i > 2) {
            // get single portfolio rows
            rows = [PORTFOLIOS_ROWS[i -2]];
        } else {
            rows = ORDER[i];
        }
        rows.unshift(1);
        for (var j = 0, range; (range = ranges[j]); j++) {
            lastRange = historicalSheet.getRange(rows[j], lastColumn).getA1Notation();
            var rangeStr = 'A' + rows[j] + ':' + lastRange;
            uChart = uChart
                .removeRange(range)
                .addRange(historicalSheet.getRange(rangeStr));
        }
        historicSheet.updateChart(uChart.build());
    }
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