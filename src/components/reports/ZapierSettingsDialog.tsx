import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ExternalLink, Zap } from 'lucide-react';

interface ZapierSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhookUrl: string;
  onSave: (url: string) => void;
}

export const ZapierSettingsDialog = ({
  open,
  onOpenChange,
  webhookUrl,
  onSave,
}: ZapierSettingsDialogProps) => {
  const [url, setUrl] = useState(webhookUrl);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setUrl(webhookUrl);
  }, [webhookUrl]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      onSave(url);
      toast({
        title: 'Webhook saved',
        description: 'Your Zapier webhook URL has been saved.',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save webhook URL.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" />
            Zapier Integration
          </DialogTitle>
          <DialogDescription>
            Connect your Zapier webhook to automatically send reports to Google Drive, email, or other services.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Zapier Webhook URL</Label>
            <Input
              id="webhook-url"
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Create a Zap with a "Webhooks by Zapier" trigger to get your webhook URL.
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <p className="text-sm font-medium">How to set up:</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Go to Zapier and create a new Zap</li>
              <li>Choose "Webhooks by Zapier" as the trigger</li>
              <li>Select "Catch Hook" as the event</li>
              <li>Copy the webhook URL and paste it above</li>
              <li>Add an action (e.g., "Upload File in Google Drive")</li>
            </ol>
            <a
              href="https://zapier.com/apps/webhook/integrations"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Learn more about Zapier Webhooks
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Webhook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
