import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Download, Printer } from 'lucide-react';

export type PDFSettings = {
  fontSize: number;
  workLogColumns: Record<string, boolean>;
  timeClockColumns: Record<string, boolean>;
  showSummaryStats: boolean;
  showFilters: boolean;
};

const WORK_LOG_COLUMNS = [
  { key: 'type', label: 'Type' },
  { key: 'date', label: 'Date' },
  { key: 'checkIn', label: 'Check In' },
  { key: 'checkOut', label: 'Check Out' },
  { key: 'duration', label: 'Duration' },
  { key: 'location', label: 'Location' },
  { key: 'service', label: 'Service Type' },
  { key: 'snow', label: 'Snow Depth' },
  { key: 'salt', label: 'Salt Used' },
  { key: 'crew', label: 'Crew' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'notes', label: 'Notes' },
];

const TIME_CLOCK_COLUMNS = [
  { key: 'employee', label: 'Employee' },
  { key: 'date', label: 'Date' },
  { key: 'clockIn', label: 'Clock In' },
  { key: 'clockOut', label: 'Clock Out' },
  { key: 'duration', label: 'Duration' },
  { key: 'notes', label: 'Notes' },
];

const defaultSettings: PDFSettings = {
  fontSize: 9,
  workLogColumns: Object.fromEntries(WORK_LOG_COLUMNS.map(c => [c.key, true])),
  timeClockColumns: Object.fromEntries(TIME_CLOCK_COLUMNS.map(c => [c.key, true])),
  showSummaryStats: true,
  showFilters: true,
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (settings: PDFSettings) => void;
  onPrint: (settings: PDFSettings) => void;
  reportType: 'full' | 'worklogs' | 'timeclock';
};

export const PDFSettingsDialog = ({ open, onOpenChange, onDownload, onPrint, reportType }: Props) => {
  const [settings, setSettings] = useState<PDFSettings>(defaultSettings);

  const toggleWorkLogColumn = (key: string) => {
    setSettings(prev => ({
      ...prev,
      workLogColumns: { ...prev.workLogColumns, [key]: !prev.workLogColumns[key] },
    }));
  };

  const toggleTimeClockColumn = (key: string) => {
    setSettings(prev => ({
      ...prev,
      timeClockColumns: { ...prev.timeClockColumns, [key]: !prev.timeClockColumns[key] },
    }));
  };

  const fontSizeLabel = settings.fontSize <= 6 ? 'Extra Small' : settings.fontSize <= 8 ? 'Small' : settings.fontSize <= 10 ? 'Medium' : settings.fontSize <= 12 ? 'Large' : 'Extra Large';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>PDF Report Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Font Size */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Text Size: {fontSizeLabel} ({settings.fontSize}pt)</Label>
            <Slider
              value={[settings.fontSize]}
              onValueChange={([v]) => setSettings(prev => ({ ...prev, fontSize: v }))}
              min={5}
              max={14}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Smaller</span>
              <span>Larger</span>
            </div>
          </div>

          <Separator />

          {/* General Options */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">General</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="showSummary"
                checked={settings.showSummaryStats}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showSummaryStats: !!checked }))}
              />
              <label htmlFor="showSummary" className="text-sm cursor-pointer">Summary Statistics</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="showFilters"
                checked={settings.showFilters}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showFilters: !!checked }))}
              />
              <label htmlFor="showFilters" className="text-sm cursor-pointer">Active Filters</label>
            </div>
          </div>

          {/* Work Log Columns */}
          {reportType !== 'timeclock' && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Work Log Columns</Label>
                <div className="grid grid-cols-2 gap-2">
                  {WORK_LOG_COLUMNS.map(col => (
                    <div key={col.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`wl-${col.key}`}
                        checked={settings.workLogColumns[col.key]}
                        onCheckedChange={() => toggleWorkLogColumn(col.key)}
                      />
                      <label htmlFor={`wl-${col.key}`} className="text-sm cursor-pointer">{col.label}</label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Time Clock Columns */}
          {reportType !== 'worklogs' && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Time Clock Columns</Label>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_CLOCK_COLUMNS.map(col => (
                    <div key={col.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`tc-${col.key}`}
                        checked={settings.timeClockColumns[col.key]}
                        onCheckedChange={() => toggleTimeClockColumn(col.key)}
                      />
                      <label htmlFor={`tc-${col.key}`} className="text-sm cursor-pointer">{col.label}</label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex gap-2 pt-4">
          <Button variant="outline" className="gap-2 flex-1" onClick={() => { onPrint(settings); onOpenChange(false); }}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button className="gap-2 flex-1" onClick={() => { onDownload(settings); onOpenChange(false); }}>
            <Download className="h-4 w-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
