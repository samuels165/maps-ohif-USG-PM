import { DicomMetadataStore } from '../services/DicomMetadataStore/DicomMetadataStore';
import ChartJsImage from 'chartjs-to-image';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

export default function downloadCSVReport(measurementData, img) {
  if (measurementData.length === 0) {
    // Prevent download of report with no measurements.
    return;
  }

  const columns = [
    'Patient ID',
    'Patient Name',
    'StudyInstanceUID',
    'SeriesInstanceUID',
    'SOPInstanceUID',
    'Label',
  ];

  const reportMap = {};
  measurementData.forEach(measurement => {
    const { referenceStudyUID, referenceSeriesUID, getReport, uid } = measurement;

    if (!getReport) {
      console.warn('Measurement does not have a getReport function');
      return;
    }

    const seriesMetadata = DicomMetadataStore.getSeries(referenceStudyUID, referenceSeriesUID);

    const commonRowItems = _getCommonRowItems(measurement, seriesMetadata);
    const report = getReport(measurement);

    reportMap[uid] = {
      report,
      commonRowItems,
    };
  });

  // get columns names inside the report from each measurement and
  // add them to the rows array (this way we can add columns for any custom
  // measurements that may be added in the future)
  Object.keys(reportMap).forEach(id => {
    const { report } = reportMap[id];
    report.columns.forEach(column => {
      if (!columns.includes(column)) {
        columns.push(column);
      }
    });
  });

  const results = _mapReportsToRowArray(reportMap, columns);
  let csvContent = 'data:text/csv;charset=utf-8,' + results.map(res => res.join(',')).join('\n');
  let bodyPartsComparision = bodyPartsComparisionDict(measurementData);
  _exportComparisions(bodyPartsComparision, img);
  _createAndDownloadFile(csvContent);
}

function _mapReportsToRowArray(reportMap, columns) {
  const results = [columns];
  Object.keys(reportMap).forEach(id => {
    const { report, commonRowItems } = reportMap[id];
    const row = [];
    // For commonRowItems, find the correct index and add the value to the
    // correct row in the results array
    Object.keys(commonRowItems).forEach(key => {
      const index = columns.indexOf(key);
      const value = commonRowItems[key];
      row[index] = value;
    });

    // For each annotation data, find the correct index and add the value to the
    // correct row in the results array
    report.columns.forEach((column, index) => {
      const colIndex = columns.indexOf(column);
      const value = report.values[index];
      row[colIndex] = value;
    });

    results.push(row);
  });

  return results;
}

function _getCommonRowItems(measurement, seriesMetadata) {
  const firstInstance = seriesMetadata.instances[0];
  return {
    'Patient ID': firstInstance.PatientID, // Patient ID
    'Patient Name': firstInstance.PatientName?.Alphabetic || '', // Patient Name
    StudyInstanceUID: measurement.referenceStudyUID, // StudyInstanceUID
    SeriesInstanceUID: measurement.referenceSeriesUID, // SeriesInstanceUID
    SOPInstanceUID: measurement.SOPInstanceUID, // SOPInstanceUID
    Label: measurement.label || '', // Label
  };
}

function _createAndDownloadFile(csvContent) {
  const encodedUri = encodeURI(csvContent);

  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'MeasurementReport.csv');
  document.body.appendChild(link);
  link.click();
}

async function _exportComparisions(data, img) {
  console.log(data);
  const doc = new jsPDF('landscape');
  let yOffset = 0;
  let chartCount = 0;
  let x = 25;
  let y = 10;
  let width = 130;
  let heigth = 80;

  let imgUrl;
  await html2canvas(img).then(canvas => {
    imgUrl = canvas.toDataURL();
  });
  // x, y, w, h (optional)
  doc.addImage(imgUrl, 'PNG', 25, yOffset + 5, 250, 200);
  doc.addPage();

  for (const key in data) {
    if (Object.hasOwnProperty.call(data, key)) {
      const chartData = {
        labels: data[key].map(tuple => `${tuple[1]} - ${tuple[0].toFixed(4)}`),
        datasets: [
          {
            label: key,
            data: data[key].map(tuple => tuple[0]),
          },
        ],
      };

      const myChart = new ChartJsImage();
      myChart.setConfig({
        type: 'line',
        data: chartData,
      });

      const dataUrl = await myChart.toDataUrl();

      if (chartCount === 1) {
        x = 160;
      } else if (chartCount === 2) {
        x = 25;
        y = 120;
      } else if (chartCount === 3) {
        x = 160;
        y = 120;
      }
      doc.addImage(dataUrl, 'PNG', x, y, width, heigth);
      yOffset += 100 + 20; // adjustable
      chartCount++;
    }
  }
  doc.save('combined_charts.pdf');
}

function bodyPartsComparisionDict(measurementData) {
  console.log(measurementData);
  const dictionary = {};

  for (const item of measurementData) {
    const key = item.label;
    let res = 0;
    res = Math.abs(Math.abs(item.points[0][2]) - Math.abs(item.points[1][2]));
    console.log(res);
    const value = [res, item.description];

    if (!dictionary[key]) {
      dictionary[key] = [];
    }
    dictionary[key].push(value);
  }
  return dictionary;
}
