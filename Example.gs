function runGenerator() {
  var output = {
    columns: [
      { title: "CR Description", inputCol: 4, processing: "Title"},
      { title: "CR ID", inputCol: 4, processing: "id"},
      { title: "SR ID", inputCol: 3, processing: "id"},
      { title: "SR Description", inputCol: 3, processing: "Description"},
      { title: "SRS ID", inputCol: 0, processing: "id"},
      { title: "SRS Description", inputCol: 0, processing: "Description"},
      { title: "TC ID", inputCol: 1, processing: "id"},
      { title: "Verification Test Report (Manually Fill In)", inputCol: 1, processing: "blank"},
//          { title: "Verification Status Pass / Fail", inputCol: 2, processing: "Test Run Result"},
      { title: "Risk ID", inputCol: 5, processing: "id"},
      { title: "Project Release Version", inputCol: 0, processing: "Target Release"},
      { title: "Criticality", inputCol: 0, processing: 'Criticality'},
      { title: "Folder", inputCol: 0, processing: "Folder"},
      { title: "Priority", inputCol: 0, processing: "Priority"},
      { title: "YouTrack#", inputCol: 0, processing: "YouTrack#"},
    ],
    sortBy: ["CR","SR","SRS"],
    freeze: {
      rows: 1,
      columns: 5,
    }
  };

  var s = SpreadsheetApp.getActiveSpreadsheet();

  var allData = MatrixReport.dumpAllData(["CR","SR","SRS","TC","XTC","RAT"]);
  var flat = MatrixReport.followDownlinks(allData, "SRS");
  flat = MatrixReport.addRows(flat, allData, "SRS", "SR");
  flat = MatrixReport.addRows(flat, allData, "SR", "CR");
  flat = MatrixReport.addRows(flat, allData, "SRS", "RAT");

  var expanded = MatrixReport.expandData(allData, flat, output);
  expanded.data = MatrixReport.removeDuplicates(expanded.data);

  var sheetName = "__DIVVM";
  var newSheet = s.getSheetByName(sheetName);
  if (newSheet) {
    newSheet.clear({formatOnly:false, contentsOnly:true});
  } else {
    newSheet = s.insertSheet();
    newSheet.setName(sheetName);
  }

  newSheet.getRange(1,1,1,expanded.headers.length).setValues([expanded.headers]);
  newSheet.setFrozenRows(output.freeze.rows);
  newSheet.setFrozenColumns(output.freeze.columns);

  var fullRange = newSheet.getRange(2,1,expanded.data.length,expanded.data[0].length);
  fullRange.setValues(expanded.data);
  fullRange.sort(expanded.sortInfo);
}
