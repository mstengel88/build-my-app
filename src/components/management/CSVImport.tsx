import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, AlertCircle, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ColumnMapping {
  csvColumn: string;
  dbColumn: string;
}

interface CSVImportProps {
  tableName: string;
  columns: { key: string; label: string; required?: boolean }[];
  onImport: (data: Record<string, any>[]) => Promise<void>;
  trigger?: React.ReactNode;
}

export const CSVImport = ({ tableName, columns, onImport, trigger }: CSVImportProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const parseCSV = (text: string): { headers: string[]; data: string[][] } => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], data: [] };

    const parseRow = (row: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]);
    const data = lines.slice(1).map(parseRow);

    return { headers, data };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV file',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { headers, data } = parseCSV(text);
      setCsvHeaders(headers);
      setCsvData(data);

      // Auto-map columns based on name similarity
      const autoMappings: ColumnMapping[] = headers.map(csvCol => {
        const normalizedCsvCol = csvCol.toLowerCase().replace(/[_\s-]/g, '');
        const matchedDbCol = columns.find(dbCol => {
          const normalizedDbCol = dbCol.key.toLowerCase().replace(/[_\s-]/g, '');
          const normalizedLabel = dbCol.label.toLowerCase().replace(/[_\s-]/g, '');
          return normalizedCsvCol === normalizedDbCol || normalizedCsvCol === normalizedLabel;
        });
        return {
          csvColumn: csvCol,
          dbColumn: matchedDbCol?.key || '',
        };
      });

      setColumnMappings(autoMappings);
      setStep('map');
    };
    reader.readAsText(selectedFile);
  };

  const updateMapping = (csvColumn: string, dbColumn: string) => {
    setColumnMappings(prev =>
      prev.map(m => (m.csvColumn === csvColumn ? { ...m, dbColumn } : m))
    );
  };

  const getMappedData = (): Record<string, any>[] => {
    return csvData.map(row => {
      const record: Record<string, any> = {};
      columnMappings.forEach((mapping, index) => {
        if (mapping.dbColumn && row[index] !== undefined) {
          let value: any = row[index];
          // Handle empty strings
          if (value === '') value = null;
          // Try to parse numbers
          if (value !== null && !isNaN(Number(value)) && value.trim() !== '') {
            value = Number(value);
          }
          record[mapping.dbColumn] = value;
        }
      });
      return record;
    }).filter(record => Object.keys(record).length > 0);
  };

  const requiredColumns = columns.filter(c => c.required).map(c => c.key);
  const mappedDbColumns = columnMappings.filter(m => m.dbColumn).map(m => m.dbColumn);
  const missingRequired = requiredColumns.filter(rc => !mappedDbColumns.includes(rc));

  const handleImport = async () => {
    if (missingRequired.length > 0) {
      toast({
        title: 'Missing required columns',
        description: `Please map: ${missingRequired.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    try {
      const data = getMappedData();
      await onImport(data);
      toast({
        title: 'Import successful',
        description: `Imported ${data.length} records`,
      });
      handleReset();
    } catch (error: any) {
      const errorMessage = error?.message || error?.details || error?.hint || 
        (typeof error === 'object' ? JSON.stringify(error) : String(error));
      toast({
        title: 'Import failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setCsvHeaders([]);
    setCsvData([]);
    setColumnMappings([]);
    setStep('upload');
    setOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) handleReset();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import {tableName} from CSV
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV file to import data'}
            {step === 'map' && 'Map CSV columns to database fields'}
            {step === 'preview' && 'Review data before importing'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-muted rounded-lg">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Select a CSV file to import
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-success" />
                Found {csvData.length} rows with {csvHeaders.length} columns
              </div>

              {missingRequired.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                  <AlertCircle className="h-4 w-4" />
                  Missing required: {missingRequired.map(r => 
                    columns.find(c => c.key === r)?.label || r
                  ).join(', ')}
                </div>
              )}

              <ScrollArea className="h-[300px] border rounded-lg">
                <div className="p-4 space-y-3">
                  {csvHeaders.map((csvCol, index) => (
                    <div key={csvCol} className="flex items-center gap-4">
                      <div className="w-1/3">
                        <Badge variant="outline" className="font-mono text-xs">
                          {csvCol}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          e.g., {csvData[0]?.[index] || '(empty)'}
                        </p>
                      </div>
                      <span className="text-muted-foreground">→</span>
                      <Select
                        value={columnMappings.find(m => m.csvColumn === csvCol)?.dbColumn || 'skip'}
                        onValueChange={(value) => updateMapping(csvCol, value === 'skip' ? '' : value)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Skip this column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">Skip this column</SelectItem>
                          {columns.map(col => (
                            <SelectItem key={col.key} value={col.key}>
                              {col.label} {col.required && '*'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {step === 'preview' && (
            <ScrollArea className="h-[300px] border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    {columnMappings.filter(m => m.dbColumn).map(m => (
                      <th key={m.dbColumn} className="px-3 py-2 text-left font-medium">
                        {columns.find(c => c.key === m.dbColumn)?.label || m.dbColumn}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getMappedData().slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-t">
                      {columnMappings.filter(m => m.dbColumn).map(m => (
                        <td key={m.dbColumn} className="px-3 py-2 truncate max-w-[200px]">
                          {row[m.dbColumn] ?? '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvData.length > 10 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  ...and {csvData.length - 10} more rows
                </p>
              )}
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {step !== 'upload' && (
            <Button variant="outline" onClick={() => setStep(step === 'preview' ? 'map' : 'upload')}>
              Back
            </Button>
          )}
          {step === 'map' && (
            <Button onClick={() => setStep('preview')} disabled={missingRequired.length > 0}>
              Preview Import
            </Button>
          )}
          {step === 'preview' && (
            <Button onClick={handleImport} disabled={importing}>
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Import {csvData.length} Records
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
