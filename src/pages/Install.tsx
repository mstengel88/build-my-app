import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Share, Plus, CheckCircle2, Smartphone, Monitor, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import winterwatchLogo from '@/assets/winterwatch-pro-logo.png';

const Install = () => {
  const { isInstallable, isInstalled, isIOS, promptInstall, canInstall } = usePWAInstall();

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      console.log('App installed successfully');
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 rounded-full bg-success/10">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>
            <CardTitle className="text-2xl text-foreground">Already Installed!</CardTitle>
            <CardDescription>
              WinterWatch-Pro is already installed on your device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              You can open the app from your home screen or app drawer.
            </p>
            <Link to="/" className="block">
              <Button className="w-full gap-2">
                <ArrowRight className="h-4 w-4" />
                Go to App
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src={winterwatchLogo} alt="WinterWatch-Pro" className="h-16 w-16 rounded-full object-cover" />
          </div>
          <CardTitle className="text-2xl text-foreground">Install WinterWatch-Pro</CardTitle>
          <CardDescription>
            Add to your home screen for quick access and offline functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Smartphone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Works Like a Native App</p>
                <p className="text-xs text-muted-foreground">Full screen experience without browser UI</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Download className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Quick Access</p>
                <p className="text-xs text-muted-foreground">Launch directly from your home screen</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Monitor className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Works Offline</p>
                <p className="text-xs text-muted-foreground">Access key features without internet</p>
              </div>
            </div>
          </div>

          {/* Install Instructions */}
          {isInstallable ? (
            <Button onClick={handleInstall} className="w-full gap-2" size="lg">
              <Download className="h-5 w-5" />
              Install App
            </Button>
          ) : isIOS ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-center">To install on iPhone/iPad:</p>
              <div className="space-y-3 bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Tap the</span>
                    <Share className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Share</span>
                    <span className="text-sm">button</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</div>
                  <span className="text-sm">Scroll down and tap <span className="font-medium">"Add to Home Screen"</span></span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">3</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Tap</span>
                    <span className="text-sm font-medium">"Add"</span>
                    <span className="text-sm">to install</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium text-center">To install on Android:</p>
              <div className="space-y-3 bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</div>
                  <span className="text-sm">Tap the <span className="font-medium">⋮ menu</span> in Chrome</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Tap</span>
                    <Plus className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">"Add to Home screen"</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">3</div>
                  <span className="text-sm">Tap <span className="font-medium">"Install"</span> to confirm</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <Link to="/" className="block">
              <Button variant="ghost" className="w-full">
                Continue to Website
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
