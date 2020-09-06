function onOpen() {
    let menuEntries = [
        {name: "Add Data", functionName: "setColumn"}
    ];
    let spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    spreadsheet.addMenu("COT Utilities", menuEntries);
}

function setColumn() {
    let spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let reportSheet = spreadsheet.getSheetByName('report');
    reportSheet.insertColumnAfter(9);

    for (let i = 2; i <= 56; i++) {
        let stdDevColumn = reportSheet.getRange(`A${i}`);
        stdDevColumn.setValue(`=STDEV(J${i}:${i})`);

        let diffColumn = reportSheet.getRange(`B${i}`);
        diffColumn.setValue(`=J${i}-K${i}`);

        let diffLowColumn = reportSheet.getRange(`C${i}`);
        diffLowColumn.setValue(`=if(J${i}<=I${i},"52 LOW",ABS((I${i}-J${i})/J${i}))`);

        let diffHighColumn = reportSheet.getRange(`D${i}`);
        diffHighColumn.setValue(`=if(J${i}>=H${i},"52 HIGH",ABS((H${i}-J${i})/J${2}))`);
    }
}