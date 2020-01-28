function dumpAllData(sheetNames) {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  var data = [];
  for (var it=0; it<sheets.length; it++) {
    var sheet = sheets[it];
    if (sheetNames.indexOf(sheet.getName()) !== -1) {
      data[sheet.getName()] = getAllRows(sheet);
    }
  }
  return data;
}

function getAllRows(sheet) {
  var rows = sheet.getDataRange().getValues();
  var header = rows.shift();
  var data = {
    header: header,
    data: processData(header, rows)
  };
  return data;
}

function processData(header, rows) {
  var data = {}
  for (var rIt=0; rIt<rows.length; rIt++) {
    var row = rows[rIt];
    var keyCol = row[0];
    if (keyCol && keyCol !== "") {
      var attributes = {}
      var upLinks = []
      var downLinks = []
      for (var hIt=1; hIt<header.length; hIt++) {
        var h = header[hIt];
        if (h !== "Links ...") {
          attributes[h] = row[hIt]
        } else {
          var links = row.slice(hIt);
          for (var lIt=0; lIt<links.length; lIt++) {
            var link = links[lIt];
            if (link && link !== "" && link.indexOf) {
              if (link.indexOf("↑") === 0) {
                upLinks.push(link.substr(2));
              }
              if (link.indexOf("↓") === 0) {
                downLinks.push(link.substr(2));
              }
            }
          }
        }
      }
      var result = {
        attributes: attributes,
        upLinks: upLinks,
        downLinks: downLinks
      };
      data[keyCol] = result;
    }
  }
  return data
}

function followDownlinks(allData, start) {
  var resultRows = [];
  var firstTab = allData[start].data;
  var keys = Object.keys(firstTab);
  for (var it=0; it<keys.length; it++) {
    var specKey = keys[it];
    var row = firstTab[specKey]
    resultRows = resultRows.concat(explodeRows([specKey],row.downLinks,allData))
  }
  var maxSize = 0;
  for (var it=0; it<resultRows.length; it++) {
    maxSize = maxSize < resultRows[it].length ? resultRows[it].length : maxSize;
  }
  for (var it=0; it<resultRows.length; it++) {
    var delta = maxSize - resultRows[it].length;
    for (var p=0; p<delta; p++) {
      resultRows[it].push("");
    }
  }
  return resultRows
}

function explodeRows(specKeys, downLinks, data) {
  var resultRows = [];
  if (downLinks.length > 0) {
    for (var it=0; it<downLinks.length; it++) {
      var link = downLinks[it];

      var newArray = specKeys.slice();
      newArray.push(link);

      var cat = link.substring(0, link.indexOf("-"));
      var linked = data[cat].data[link];

      if (linked) {
        resultRows = resultRows.concat(explodeRows(newArray, linked.downLinks, data));
      } else {
        resultRows.push(newArray);
      }
    }
  } else {
    resultRows.push(specKeys);
  }
  return resultRows;
}

function addRows(flattened, allData, downlink, uplink) {
  var uplinks = allData[uplink].data;
  var uplinkIds = Object.keys(uplinks);
  var result = [];
  for (var it=0; it<flattened.length; it++) {
    var row = flattened[it];
    var matchingUp = [];
    for (var cc=0; cc<row.length; cc++) {
      var cell = row[cc];
      if (cell.indexOf(downlink) == 0) {
        for (var upIt=0; upIt<uplinkIds.length; upIt++) {
          var key = uplinkIds[upIt];
          if (uplinks[key].downLinks.indexOf(cell) !== -1) {
            matchingUp.push(key);
          }
        }
      }
    }
    if (matchingUp.length > 0) {
      for (var upIt=0; upIt<matchingUp.length; upIt++) {
        var up = matchingUp[upIt];
        var newRow = row.slice();
        newRow.push(up);
        result.push(newRow);
      }
    } else {
      var newRow = row.slice();
      newRow.push("");
      result.push(newRow);
    }
  }
  return result
}

function expandData(allData, flattened, output) {
  var sortColumns = getSortColumns(output.sortBy, flattened);
  var sortOffset = output.columns.length + 1;
  var sortInfo = [];
  for (var it=0; it<output.sortBy.length; it++) {
    sortInfo.push({
      column: sortOffset + it,
      ascending: true
    });
  }

  var columns = output.columns.concat(sortColumns);
  var headers = getHeaders(columns);
  const result = [];
  for (var it=0; it<flattened.length; it++) {
    var row = flattened[it];
    var newRow = [];
    for (var colIt=0; colIt<columns.length; colIt++) {
      var coldef = columns[colIt];
      switch (coldef.processing) {
        case "id":
          newRow.push(row[coldef.inputCol]);
          break;
        case 'numeric':
          newRow.push(numericID(row[coldef.inputCol]));
          break;
        case 'blank':
          newRow.push("");
          break;
        default:
          newRow.push(attribute(row[coldef.inputCol], coldef.processing, allData));
          break;
      }
    }
    result.push(newRow);
  }
  return {
    headers: headers,
    data: result,
    sortInfo: sortInfo
  };
}

function getHeaders(columns) {
  var result = [];
  for (var it=0; it<columns.length; it++) {
    var col = columns[it];
    result.push(col.title);
  }
  return result;
}

function getSortHeaders(flattened) {
  var columnNames = new Array(flattened[0].length);
  for (var it=0; it<flattened.length; it++) {
    var row = flattened[it];
    for (var cc=0; cc<row.length; cc++) {
      if (columnNames[cc]) {
        continue;
      } else {
        var col = row[cc];
        var index = col.indexOf("-");
        var catName = col.substring(0, index);
        columnNames[cc] = catName;
      }
    }
  }
  return columnNames;
}

function getSortColumns(sortBy, flattened) {
  var result = [];
  var columnNames = getSortHeaders(flattened);
  for (var it=0; it<sortBy.length; it++) {
    var name = sortBy[it];
    for (var cc=0; cc<columnNames.length; cc++) {
      if (columnNames[cc] === name) {
        result.push({ title: "SORT_"+name, inputCol: cc, processing: "numeric"});
      }
    }
  }
  return result;
}

function removeDuplicates(data) {
  var output = [];
  for (var it=0; it<data.length; it++) {
    var rowIn = data[it].join(",");
    var duplicate = false;
    for (var outIt=0; outIt<output.length; outIt++) {
      var rowOut = output[outIt].join(",");
      if (rowIn === rowOut) {
        duplicate = true;
        break;
      }
    }
    if (!duplicate) {
      output.push(data[it]);
    }
  }
  return output;
}

function numericID(key) {
  if (key) {
    return key.substring(key.indexOf("-")+1)
  } else {
    return ""
  }
}

function attribute(key, attribute, allData) {
  if (key && key !== "") {
    var cat = key.substring(0, key.indexOf("-"))
    return allData[cat].data[key].attributes[attribute]
  } else {
    return ""
  }
}
