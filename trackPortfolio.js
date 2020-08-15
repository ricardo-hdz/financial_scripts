/**
* Copies the value of the detailed portfolio to the historic spreadsheet
*/

// CONST
var TOTAL_ROW = 122;
var DIFF_ROW = 123;
var PCT_ROW = 124;
var PORTFOLIOS_ROWS = [2,8,16,24,30,36,42,48,54,61,68,76,81,85,89,94,97,101,106,109,112,115,119];
var TOTAL_ROWS = [122];
var VARIATION_ROWS = [123];
var TOTAL_COPY_RANGE = 'B2:B121';
const COLUMN_MAX_PCT_DIFF = 2;
const COLUMN_MAX = 'C';

function onOpen() {
  var menuEntries = [
    {name: "Track Portfolio", functionName: "trackPortfolio"}
  ];
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  spreadsheet.addMenu("Portfolio Utilities", menuEntries);
}

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
    var portfolioSheet = spreadsheet.getSheetByName('Portfolio');
    var historicalPortfolioSheet = spreadsheet.getSheetByName('Historical Portfolio');

    var lastColumn = historicalPortfolioSheet.getLastColumn();
    historicalPortfolioSheet.insertColumnAfter(lastColumn);
    lastColumn = historicalPortfolioSheet.getLastColumn() + 1;

    // copy positions
    var totalRange = portfolioSheet.getRange(TOTAL_COPY_RANGE);
    totalRange.copyValuesToRange(historicalPortfolioSheet, lastColumn, lastColumn, 2, 2 + totalRange.getHeight());

    // copy totals of positions (by portfolio)
    var historicalPortfolioSheetRange;
    var sumPortfoliosFormula = '=SUM(';
    var diffPortfolio;
    let maxDiffPctCell;
    let maxCell;
    for (var i = 0, pr; (pr = PORTFOLIOS_ROWS[i]); i++) {
        historicalPortfolioSheetRange = historicalPortfolioSheet.getRange(pr, lastColumn);
        sumPortfoliosFormula = sumPortfoliosFormula + historicalPortfolioSheetRange.getA1Notation() + ',';
        diffPortfolio = historicalPortfolioSheetRange.getValue() - historicalPortfolioSheet.getRange(pr, lastColumn - 1).getValue();
        dailyVariationPortfolio.push(diffPortfolio.toFixed(2));
        maxCell = historicalPortfolioSheet.getRange(COLUMN_MAX + pr).getA1Notation();
        maxDiffPctCell = historicalPortfolioSheet.getRange(pr, COLUMN_MAX_PCT_DIFF);
        maxDiffPctCell.setValue('=(' + historicalPortfolioSheetRange.getA1Notation() + '-' +  maxCell + ')/' + maxCell);
    }
    sumPortfoliosFormula = sumPortfoliosFormula + ')';

    var dateCell = historicalPortfolioSheet.getRange(1, lastColumn);
    dateCell.setValue(getToday());
    // row, column, numRows
    // need to define one row less in sum
    var sumCell = historicalPortfolioSheet.getRange(TOTAL_ROW, lastColumn);
    sumCell.setValue(sumPortfoliosFormula);

    var previousSumCell = historicalPortfolioSheet.getRange(TOTAL_ROW, lastColumn-1.0);

    var diffCell = historicalPortfolioSheet.getRange(DIFF_ROW, lastColumn);

    diffCell.setValue('=' + sumCell.getA1Notation() + '-' + previousSumCell.getA1Notation());
    var pctCell = historicalPortfolioSheet.getRange(PCT_ROW, lastColumn);
    pctCell.setNumberFormat('00.00%');
    pctCell.setValue('=' + diffCell.getA1Notation() + '/' + previousSumCell.getA1Notation());

    var totalValue = parseFloat(sumCell.getValue()).toFixed(2);
    var diffValue = parseFloat(diffCell.getValue()).toFixed(2);
    var pctValue = parseFloat(pctCell.getValue() * 100).toFixed(2);

    console.log('Assembling email');
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

    console.log('Updating chart');
    // update historical charts with latest data
    updateHistoricalCharts(lastColumn);
    console.log('Finished script');
}

function renderDailyPortfolioVariation() {
    var portfolioName;
    var msg = '';
    var variation;
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var historicalPortfolioSheet = spreadsheet.getSheetByName('Historical Portfolio');
    for (var i = 0; i < dailyVariationPortfolio.length; i++) {
        variation = dailyVariationPortfolio[i];
        portfolioName = historicalPortfolioSheet.getRange(PORTFOLIOS_ROWS[i],1).getValue();
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
    var historicalPortfolioSheet = spreadsheet.getSheetByName('Historical Trends');
    var historicalSheet = spreadsheet.getSheetByName('Historical Portfolio');
    var lastRange;

    var charts = historicalPortfolioSheet.getCharts();
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
        historicalPortfolioSheet.updateChart(uChart.build());
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