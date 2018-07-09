function onOpen() {
    setSnapshotValues();
}

/**
* Sets the portfolio values from snapshots according to recent entry
*/
function setSnapshotValues() {
    var SUM_COLUMN = 'B';
    var SUM_ROW_START = 17;

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var allocationSheet = spreadsheet.getSheetByName('Allocation');
    var snapshotsSheet = spreadsheet.getSheetByName('Snapshots');
    var lastColumn = snapshotsSheet.getLastColumn() - 2;

    var sumTypes = {
        'Cash Bank': 0,
        'Crypto': 0,
        'Numismatic': 0
    };

    for (var i = 3, type; (type = snapshotsSheet.getRange('B' + i).getValue()); i++) {
        if (sumTypes.hasOwnProperty(type)) {
            var val = snapshotsSheet.getRange(i, lastColumn).getValue();
            val = val ? val : 0;
            sumTypes[type] += parseFloat(val);
        }
    }

    for (var type in sumTypes) {
        allocationSheet.getRange(SUM_COLUMN + SUM_ROW_START).setValue(sumTypes[type]);   
        SUM_ROW_START++;
    }
}