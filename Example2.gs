function runGenerator() {
  var output = {
    columns: [
      { title: "REQ ID", inputCol: 3, processing: "id"},
      { title: "REQ", inputCol: 3, processing: "Title"},
      { title: "RISK ID", inputCol: 4, processing: "id"},
      { title: "RISK", inputCol: 4, processing: "Title"},
      { title: "SPEC ID", inputCol: 0, processing: "id"},
      { title: "Description", inputCol: 0, processing: "Description"},
      { title: "Folder", inputCol: 0, processing: "Folder"},
      { title: "TC ID", inputCol: 1, processing: "id"},
      { title: "TC Title", inputCol: 1, processing: "Title"},
    ],
    sortBy: ["REQ","RISK","SPEC"],
    freeze: {
      rows: 1,
      columns: 0,
    }
  };

  var s = SpreadsheetApp.getActiveSpreadsheet();

  var allData = dumpAllData(["XTC","TC","SPEC","RISK","REQ"]);
  var flat = followDownlinks(allData, "SPEC");
  flat = addRows(flat, allData, "SPEC", "REQ");
  flat = addRows(flat, allData, "SPEC", "RISK");

  var expanded = expandData(allData, flat, output);
  expanded.data = removeDuplicates(expanded.data);

  var sheetName = "__REPORT";
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
