import { AccountingService } from '../services/accountingService.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import XLSX from 'xlsx';

// Get ledger entries
export const getLedger = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { fromDate, toDate, entryType, partyName } = req.query;

  const entries = await AccountingService.getLedger(companyId, {
    fromDate, toDate, entryType, partyName
  }, req.roleFilter || {});

  res.json(new ApiResponse(200, entries, 'Ledger entries retrieved'));
});

// Get Profit & Loss Report
export const getProfitLoss = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { fromDate, toDate } = req.query;

  const report = await AccountingService.getProfitLoss(companyId, fromDate, toDate, req.roleFilter || {});

  res.json(new ApiResponse(200, report, 'P&L report generated'));
});

// Get Balance Sheet
export const getBalanceSheet = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { asOfDate } = req.query;

  const report = await AccountingService.getBalanceSheet(companyId, asOfDate, req.roleFilter || {});

  res.json(new ApiResponse(200, report, 'Balance sheet generated'));
});

// Export to CSV
export const exportToCSV = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { fromDate, toDate } = req.query;

  const data = await AccountingService.getExportData(companyId, fromDate, toDate, req.roleFilter || {});

  // Convert to CSV format
  const csvData = data.map(entry => ({
    Date: entry.date,
    Type: entry.entry_type,
    Reference: entry.reference_number,
    Party: entry.party_name,
    Description: entry.description,
    Amount: entry.amount
  }));

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=accounting_data.csv');
  
  const csv = convertToCSV(csvData);
  res.send(csv);
});

// Export to Excel
export const exportToExcel = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { fromDate, toDate } = req.query;

  const data = await AccountingService.getExportData(companyId, fromDate, toDate, req.roleFilter || {});

  // Create Excel workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data.map(entry => ({
    Date: entry.date,
    Type: entry.entry_type,
    Reference: entry.reference_number,
    Party: entry.party_name,
    Description: entry.description,
    Amount: entry.amount
  })));

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Accounting Data');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=accounting_data.xlsx');
  res.send(buffer);
});

// Manual entry creation
export const createEntry = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const entryData = {
    ...req.body,
    companyId,
    createdBy: req.user.id
  };

  await AccountingService.createEntry(entryData);

  res.json(new ApiResponse(201, null, 'Accounting entry created'));
});

// Helper function to convert JSON to CSV
function convertToCSV(data) {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
  ].join('\n');
  
  return csvContent;
}