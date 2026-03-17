import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

type WorkEntry = {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  duration_minutes: number | null;
  service_type: string;
  snow_depth: number | null;
  salt_used: number | null;
  temperature: number | null;
  weather_description: string | null;
  notes: string | null;
  accounts: { name: string } | null;
  crew: string;
  equipmentName: string;
  type: 'plow' | 'shovel';
};

type TimeClockEntry = {
  id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  duration_minutes: number | null;
  notes: string | null;
  employees: { name: string } | null;
};

type ReportFilters = {
  dateFrom: Date;
  dateTo: Date;
  logType: string;
  selectedAccount: string;
  selectedEmployee: string;
  selectedServiceType: string;
  selectedEquipment: string;
};

type ReportData = {
  workEntries: WorkEntry[];
  timeClockEntries: TimeClockEntry[];
  filters: ReportFilters;
  summaryStats: {
    total: number;
    plow: number;
    shovel: number;
    salt: number;
    locations: number;
  };
};

export type PDFSettings = {
  fontSize: number;
  workLogColumns: Record<string, boolean>;
  timeClockColumns: Record<string, boolean>;
  showSummaryStats: boolean;
  showFilters: boolean;
};

type ExportType = 'full' | 'worklogs' | 'timeclock';

const defaultSettings: PDFSettings = {
  fontSize: 9,
  workLogColumns: { type: true, date: true, checkIn: true, checkOut: true, duration: true, location: true, service: true, snow: true, salt: true, crew: true, equipment: true, notes: true },
  timeClockColumns: { employee: true, date: true, clockIn: true, clockOut: true, duration: true, notes: true },
  showSummaryStats: true,
  showFilters: true,
};

const formatDuration = (minutes: number | null): string => {
  if (!minutes) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const formatTime = (dateString: string | null): string => {
  if (!dateString) return '-';
  return format(new Date(dateString), 'HH:mm');
};

const addHeader = (doc: jsPDF, title: string, data: ReportData, fontSize: number): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(Math.max(16, fontSize + 8));
  doc.setFont('helvetica', 'bold');
  doc.text(`WinterWatch Pro - ${title}`, pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(Math.max(10, fontSize + 1));
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Report Period: ${format(data.filters.dateFrom, 'MMM d, yyyy')} - ${format(data.filters.dateTo, 'MMM d, yyyy')}`,
    pageWidth / 2,
    30,
    { align: 'center' }
  );
  
  doc.setFontSize(Math.max(8, fontSize - 1));
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, pageWidth / 2, 37, { align: 'center' });
  doc.setTextColor(0);

  return 45;
};

const addFooter = (doc: jsPDF): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Page ${i} of ${pageCount} | WinterWatch Pro`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
};

const buildWorkLogTable = (entries: WorkEntry[], cols: Record<string, boolean>) => {
  const allColumns = [
    { key: 'type', label: 'Type', getter: (e: WorkEntry) => e.type === 'plow' ? 'Plow' : 'Shovel' },
    { key: 'date', label: 'Date', getter: (e: WorkEntry) => format(new Date(e.check_in_time), 'MM/dd') },
    { key: 'checkIn', label: 'In', getter: (e: WorkEntry) => formatTime(e.check_in_time) },
    { key: 'checkOut', label: 'Out', getter: (e: WorkEntry) => formatTime(e.check_out_time) },
    { key: 'duration', label: 'Duration', getter: (e: WorkEntry) => formatDuration(e.duration_minutes) },
    { key: 'location', label: 'Location', getter: (e: WorkEntry) => e.accounts?.name || '-' },
    { key: 'service', label: 'Service', getter: (e: WorkEntry) => e.service_type || '-' },
    { key: 'snow', label: 'Snow', getter: (e: WorkEntry) => e.snow_depth ? `${e.snow_depth}"` : '-' },
    { key: 'salt', label: 'Salt', getter: (e: WorkEntry) => e.salt_used ? `${e.salt_used}lb` : '-' },
    { key: 'crew', label: 'Crew', getter: (e: WorkEntry) => e.crew || '-' },
    { key: 'equipment', label: 'Equipment', getter: (e: WorkEntry) => e.equipmentName || '-' },
    { key: 'notes', label: 'Notes', getter: (e: WorkEntry) => e.notes || '-' },
  ];

  const visible = allColumns.filter(c => cols[c.key]);
  const head = visible.map(c => c.label);
  const body = entries.map(entry => visible.map(c => c.getter(entry)));
  return { head, body };
};

const buildTimeClockTable = (entries: TimeClockEntry[], cols: Record<string, boolean>) => {
  const allColumns = [
    { key: 'employee', label: 'Employee', getter: (e: TimeClockEntry) => (e.employees as any)?.name || 'Unknown' },
    { key: 'date', label: 'Date', getter: (e: TimeClockEntry) => format(new Date(e.clock_in_time), 'MM/dd/yyyy') },
    { key: 'clockIn', label: 'Clock In', getter: (e: TimeClockEntry) => formatTime(e.clock_in_time) },
    { key: 'clockOut', label: 'Clock Out', getter: (e: TimeClockEntry) => formatTime(e.clock_out_time) },
    { key: 'duration', label: 'Duration', getter: (e: TimeClockEntry) => e.duration_minutes ? `${(e.duration_minutes / 60).toFixed(1)}h` : '-' },
    { key: 'notes', label: 'Notes', getter: (e: TimeClockEntry) => e.notes || '-' },
  ];

  const visible = allColumns.filter(c => cols[c.key]);
  const head = visible.map(c => c.label);
  const body = entries.map(entry => visible.map(c => c.getter(entry)));
  return { head, body };
};

const addSummaryBox = (doc: jsPDF, yPos: number, data: ReportData, fontSize: number): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(14, yPos, pageWidth - 28, 20, 3, 3, 'F');
  
  doc.setFontSize(Math.max(9, fontSize));
  doc.setFont('helvetica', 'bold');
  const statsY = yPos + 13;
  const colWidth = (pageWidth - 28) / 5;
  
  doc.text(`Total: ${data.summaryStats.total}`, 14 + colWidth * 0.5, statsY, { align: 'center' });
  doc.text(`Plow: ${data.summaryStats.plow}`, 14 + colWidth * 1.5, statsY, { align: 'center' });
  doc.text(`Shovel: ${data.summaryStats.shovel}`, 14 + colWidth * 2.5, statsY, { align: 'center' });
  doc.text(`Salt: ${data.summaryStats.salt}`, 14 + colWidth * 3.5, statsY, { align: 'center' });
  doc.text(`Locations: ${data.summaryStats.locations}`, 14 + colWidth * 4.5, statsY, { align: 'center' });
  
  return yPos + 28;
};

export const generateWorkLogsPDF = (data: ReportData, settings: PDFSettings = defaultSettings): jsPDF => {
  const doc = new jsPDF();
  let yPos = addHeader(doc, 'Work Logs Report', data, settings.fontSize);

  if (settings.showSummaryStats) {
    yPos = addSummaryBox(doc, yPos, data, settings.fontSize);
  }

  doc.setFontSize(Math.max(12, settings.fontSize + 3));
  doc.setFont('helvetica', 'bold');
  doc.text(`Work Log Entries (${data.workEntries.length})`, 14, yPos);
  yPos += 6;

  if (data.workEntries.length > 0) {
    const { head, body } = buildWorkLogTable(data.workEntries, settings.workLogColumns);
    autoTable(doc, {
      startY: yPos,
      head: [head],
      body,
      styles: { fontSize: settings.fontSize, cellPadding: Math.max(1, settings.fontSize * 0.2) },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    });
  } else {
    doc.setFontSize(settings.fontSize);
    doc.setFont('helvetica', 'normal');
    doc.text('No work log entries found for the selected filters.', 14, yPos + 10);
  }

  addFooter(doc);
  return doc;
};

export const generateTimeClockPDF = (data: ReportData, settings: PDFSettings = defaultSettings): jsPDF => {
  const doc = new jsPDF();
  let yPos = addHeader(doc, 'Time Clock Report', data, settings.fontSize);

  const totalMinutes = data.timeClockEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  doc.setFontSize(Math.max(10, settings.fontSize + 1));
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Shifts: ${data.timeClockEntries.length} | Total Hours: ${totalHours}h`, 14, yPos);
  yPos += 10;

  if (data.timeClockEntries.length > 0) {
    const { head, body } = buildTimeClockTable(data.timeClockEntries, settings.timeClockColumns);
    autoTable(doc, {
      startY: yPos,
      head: [head],
      body,
      styles: { fontSize: settings.fontSize, cellPadding: Math.max(1.5, settings.fontSize * 0.2) },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    });
  } else {
    doc.setFontSize(settings.fontSize);
    doc.setFont('helvetica', 'normal');
    doc.text('No time clock entries found for the selected period.', 14, yPos + 10);
  }

  addFooter(doc);
  return doc;
};

export const generateFullReportPDF = (data: ReportData, settings: PDFSettings = defaultSettings): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = addHeader(doc, 'Full Service Report', data, settings.fontSize);

  // Active filters
  if (settings.showFilters) {
    const activeFilters: string[] = [];
    if (data.filters.logType !== 'all') activeFilters.push(`Type: ${data.filters.logType}`);
    if (data.filters.selectedAccount !== 'all') activeFilters.push(`Account: ${data.filters.selectedAccount}`);
    if (data.filters.selectedEmployee !== 'all') activeFilters.push(`Employee: ${data.filters.selectedEmployee}`);
    if (data.filters.selectedServiceType !== 'all') activeFilters.push(`Service: ${data.filters.selectedServiceType}`);
    if (data.filters.selectedEquipment !== 'all') activeFilters.push(`Equipment: ${data.filters.selectedEquipment}`);
    
    if (activeFilters.length > 0) {
      doc.setFontSize(settings.fontSize);
      doc.text(`Filters: ${activeFilters.join(' | ')}`, 14, yPos);
      yPos += 8;
    }
  }

  if (settings.showSummaryStats) {
    yPos = addSummaryBox(doc, yPos, data, settings.fontSize);
  }

  // Daily Shifts Section
  if (data.timeClockEntries.length > 0) {
    doc.setFontSize(Math.max(12, settings.fontSize + 3));
    doc.setFont('helvetica', 'bold');
    doc.text(`Daily Shifts (${data.timeClockEntries.length})`, 14, yPos);
    yPos += 6;

    const { head, body } = buildTimeClockTable(data.timeClockEntries, settings.timeClockColumns);
    autoTable(doc, {
      startY: yPos,
      head: [head],
      body,
      styles: { fontSize: settings.fontSize, cellPadding: Math.max(1.5, settings.fontSize * 0.2) },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;
  }

  // Work Log Entries Section
  doc.setFontSize(Math.max(12, settings.fontSize + 3));
  doc.setFont('helvetica', 'bold');
  doc.text(`Work Log Entries (${data.workEntries.length})`, 14, yPos);
  yPos += 6;

  if (data.workEntries.length > 0) {
    const { head, body } = buildWorkLogTable(data.workEntries, settings.workLogColumns);
    autoTable(doc, {
      startY: yPos,
      head: [head],
      body,
      styles: { fontSize: settings.fontSize, cellPadding: Math.max(1, settings.fontSize * 0.2) },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    });
  } else {
    doc.setFontSize(settings.fontSize);
    doc.setFont('helvetica', 'normal');
    doc.text('No work log entries found for the selected filters.', 14, yPos + 10);
  }

  addFooter(doc);
  return doc;
};

export const downloadReportPDF = (data: ReportData, type: ExportType = 'full', settings: PDFSettings = defaultSettings): void => {
  let doc: jsPDF;
  let prefix: string;

  switch (type) {
    case 'worklogs':
      doc = generateWorkLogsPDF(data, settings);
      prefix = 'work-logs';
      break;
    case 'timeclock':
      doc = generateTimeClockPDF(data, settings);
      prefix = 'time-clock';
      break;
    default:
      doc = generateFullReportPDF(data, settings);
      prefix = 'full-report';
  }

  const filename = `${prefix}_${format(data.filters.dateFrom, 'yyyy-MM-dd')}_to_${format(data.filters.dateTo, 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
};

export const printReportPDF = (data: ReportData, type: ExportType = 'full', settings: PDFSettings = defaultSettings): void => {
  let doc: jsPDF;

  switch (type) {
    case 'worklogs':
      doc = generateWorkLogsPDF(data, settings);
      break;
    case 'timeclock':
      doc = generateTimeClockPDF(data, settings);
      break;
    default:
      doc = generateFullReportPDF(data, settings);
  }

  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};
