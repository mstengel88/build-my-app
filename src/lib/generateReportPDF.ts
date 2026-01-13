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

export const generateReportPDF = (data: ReportData): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('WinterWatch Pro - Service Report', pageWidth / 2, 20, { align: 'center' });
  
  // Date range
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Report Period: ${format(data.filters.dateFrom, 'MMM d, yyyy')} - ${format(data.filters.dateTo, 'MMM d, yyyy')}`,
    pageWidth / 2,
    30,
    { align: 'center' }
  );
  
  // Generated timestamp
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, pageWidth / 2, 37, { align: 'center' });
  doc.setTextColor(0);

  // Active filters
  const activeFilters: string[] = [];
  if (data.filters.logType !== 'all') activeFilters.push(`Type: ${data.filters.logType}`);
  if (data.filters.selectedAccount !== 'all') activeFilters.push(`Account: ${data.filters.selectedAccount}`);
  if (data.filters.selectedEmployee !== 'all') activeFilters.push(`Employee: ${data.filters.selectedEmployee}`);
  if (data.filters.selectedServiceType !== 'all') activeFilters.push(`Service: ${data.filters.selectedServiceType}`);
  if (data.filters.selectedEquipment !== 'all') activeFilters.push(`Equipment: ${data.filters.selectedEquipment}`);
  
  let yPos = 45;
  if (activeFilters.length > 0) {
    doc.setFontSize(10);
    doc.text(`Filters: ${activeFilters.join(' | ')}`, 14, yPos);
    yPos += 8;
  }

  // Summary Stats Box
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(14, yPos, pageWidth - 28, 20, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const statsY = yPos + 13;
  const colWidth = (pageWidth - 28) / 5;
  
  doc.text(`Total: ${data.summaryStats.total}`, 14 + colWidth * 0.5, statsY, { align: 'center' });
  doc.text(`Plow: ${data.summaryStats.plow}`, 14 + colWidth * 1.5, statsY, { align: 'center' });
  doc.text(`Shovel: ${data.summaryStats.shovel}`, 14 + colWidth * 2.5, statsY, { align: 'center' });
  doc.text(`Salt: ${data.summaryStats.salt}`, 14 + colWidth * 3.5, statsY, { align: 'center' });
  doc.text(`Locations: ${data.summaryStats.locations}`, 14 + colWidth * 4.5, statsY, { align: 'center' });
  
  yPos += 28;

  // Daily Shifts Section
  if (data.timeClockEntries.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Daily Shifts (${data.timeClockEntries.length})`, 14, yPos);
    yPos += 6;

    autoTable(doc, {
      startY: yPos,
      head: [['Employee', 'Date', 'Clock In', 'Clock Out', 'Duration']],
      body: data.timeClockEntries.map(entry => [
        (entry.employees as any)?.name || 'Unknown',
        format(new Date(entry.clock_in_time), 'MM/dd/yyyy'),
        formatTime(entry.clock_in_time),
        formatTime(entry.clock_out_time),
        entry.duration_minutes ? `${(entry.duration_minutes / 60).toFixed(1)}h` : '-',
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;
  }

  // Work Log Entries Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Work Log Entries (${data.workEntries.length})`, 14, yPos);
  yPos += 6;

  if (data.workEntries.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Type', 'Date', 'In', 'Out', 'Duration', 'Location', 'Service', 'Snow', 'Salt', 'Crew']],
      body: data.workEntries.map(entry => [
        entry.type === 'plow' ? 'Plow' : 'Shovel',
        format(new Date(entry.check_in_time), 'MM/dd'),
        formatTime(entry.check_in_time),
        formatTime(entry.check_out_time),
        formatDuration(entry.duration_minutes),
        entry.accounts?.name || '-',
        entry.service_type || '-',
        entry.snow_depth ? `${entry.snow_depth}"` : '-',
        entry.salt_used ? `${entry.salt_used}lb` : '-',
        entry.crew || '-',
      ]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        5: { cellWidth: 25 }, // Location
        9: { cellWidth: 30 }, // Crew
      },
    });
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('No work log entries found for the selected filters.', 14, yPos + 10);
  }

  // Footer on each page
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

  return doc;
};

export const downloadReportPDF = (data: ReportData): void => {
  const doc = generateReportPDF(data);
  const filename = `service-report_${format(data.filters.dateFrom, 'yyyy-MM-dd')}_to_${format(data.filters.dateTo, 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
};

export const printReportPDF = (data: ReportData): void => {
  const doc = generateReportPDF(data);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};
