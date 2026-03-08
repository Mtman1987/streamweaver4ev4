'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface AppConfig {
  twitchClientId?: string;
  discordClientId?: string;
  youtubeClientId?: string;
  geminiApiKey?: string;
  edenaiApiKey?: string;
  openaiApiKey?: string;
  inworldApiKey?: string;
  discordBotToken?: string;
  obsWsUrl?: string;
  obsWsPassword?: string;
  shoutoutScene?: string;
  shoutoutBrowserSource?: string;
  brbScene?: string;
  brbBrowserSource?: string;
  gambleOverlayScene?: string;
  gambleOverlaySource?: string;
  shoutoutIntroMessage?: string;
  discordLogChannelId?: string;
  discordAiChatChannelId?: string;
  discordWebhookUrl?: string;
  useTtsPlayer?: boolean;
  defaultTtsVoice?: string;
  googleApplicationCredentials?: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<AppConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [overlayBaseUrl, setOverlayBaseUrl] = useState('');

  useEffect(() => {
    loadConfig();
    if (typeof window !== 'undefined') {
      setOverlayBaseUrl(window.location.origin);
    }
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast({ title: 'Settings saved successfully' });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      toast({ variant: 'destructive', title: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key: keyof AppConfig, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed' });
    }
  };

  const overlayUrls = [
    '/overlay/avatar',
    '/shoutout-player',
    '/brb-player',
    '/tts-player',
    '/gamble-overlay',
    '/classic-gamble-overlay',
    '/pokemon-pack-overlay',
    '/pokemon-collection-overlay',
    '/pokemon-trade-overlay',
    '/gym-battle-overlay',
  ].map((path) => ({
    path,
    url: `${overlayBaseUrl || 'http://127.0.0.1:3100'}${path}`,
  }));

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your StreamWeaver application</p>
      </div>

      <Tabs defaultValue="oauth" className="space-y-6">
        <TabsList>
          <TabsTrigger value="oauth">OAuth & APIs</TabsTrigger>
          <TabsTrigger value="obs">OBS</TabsTrigger>
          <TabsTrigger value="discord">Discord</TabsTrigger>
          <TabsTrigger value="scenes">Scenes & Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="oauth">
          <Card>
            <CardHeader>
              <CardTitle>OAuth Client IDs & API Keys</CardTitle>
              <CardDescription>Configure your service integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="twitchClientId">Twitch Client ID</Label>
                <Input
                  id="twitchClientId"
                  value={config.twitchClientId || ''}
                  onChange={(e) => updateConfig('twitchClientId', e.target.value)}
                  placeholder="Your Twitch application client ID"
                />
              </div>
              
              <div>
                <Label htmlFor="discordClientId">Discord Client ID</Label>
                <Input
                  id="discordClientId"
                  value={config.discordClientId || ''}
                  onChange={(e) => updateConfig('discordClientId', e.target.value)}
                  placeholder="Your Discord application client ID"
                />
              </div>

              <div>
                <Label htmlFor="discordBotToken">Discord Bot Token</Label>
                <Input
                  id="discordBotToken"
                  type="password"
                  value={config.discordBotToken || ''}
                  onChange={(e) => updateConfig('discordBotToken', e.target.value)}
                  placeholder="Your Discord bot token"
                />
              </div>

              <div>
                <Label htmlFor="geminiApiKey">Gemini API Key</Label>
                <Input
                  id="geminiApiKey"
                  type="password"
                  value={config.geminiApiKey || ''}
                  onChange={(e) => updateConfig('geminiApiKey', e.target.value)}
                  placeholder="Your Google Gemini API key"
                />
              </div>

              <div>
                <Label htmlFor="edenaiApiKey">EdenAI API Key</Label>
                <Input
                  id="edenaiApiKey"
                  type="password"
                  value={config.edenaiApiKey || ''}
                  onChange={(e) => updateConfig('edenaiApiKey', e.target.value)}
                  placeholder="Your EdenAI API key"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="obs">
          <Card>
            <CardHeader>
              <CardTitle>OBS Configuration</CardTitle>
              <CardDescription>Configure OBS WebSocket connection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="obsWsUrl">OBS WebSocket URL</Label>
                <Input
                  id="obsWsUrl"
                  value={config.obsWsUrl || ''}
                  onChange={(e) => updateConfig('obsWsUrl', e.target.value)}
                  placeholder="ws://127.0.0.1:4455"
                />
              </div>

              <div>
                <Label htmlFor="obsWsPassword">OBS WebSocket Password</Label>
                <Input
                  id="obsWsPassword"
                  type="password"
                  value={config.obsWsPassword || ''}
                  onChange={(e) => updateConfig('obsWsPassword', e.target.value)}
                  placeholder="Your OBS WebSocket password"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discord">
          <Card>
            <CardHeader>
              <CardTitle>Discord Configuration</CardTitle>
              <CardDescription>Configure Discord channels and webhooks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="discordLogChannelId">Log Channel ID</Label>
                <Input
                  id="discordLogChannelId"
                  value={config.discordLogChannelId || ''}
                  onChange={(e) => updateConfig('discordLogChannelId', e.target.value)}
                  placeholder="Discord channel ID for chat logs"
                />
              </div>

              <div>
                <Label htmlFor="discordAiChatChannelId">AI Chat Channel ID</Label>
                <Input
                  id="discordAiChatChannelId"
                  value={config.discordAiChatChannelId || ''}
                  onChange={(e) => updateConfig('discordAiChatChannelId', e.target.value)}
                  placeholder="Discord channel ID for AI chat"
                />
              </div>

              <div>
                <Label htmlFor="discordWebhookUrl">Webhook URL</Label>
                <Input
                  id="discordWebhookUrl"
                  value={config.discordWebhookUrl || ''}
                  onChange={(e) => updateConfig('discordWebhookUrl', e.target.value)}
                  placeholder="Discord webhook URL for notifications"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenes">
          <Card>
            <CardHeader>
              <CardTitle>OBS Scenes & Sources</CardTitle>
              <CardDescription>Configure OBS scene and source names</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="shoutoutScene">Shoutout Scene</Label>
                <Input
                  id="shoutoutScene"
                  value={config.shoutoutScene || ''}
                  onChange={(e) => updateConfig('shoutoutScene', e.target.value)}
                  placeholder="Shoutout"
                />
              </div>

              <div>
                <Label htmlFor="shoutoutBrowserSource">Shoutout Browser Source</Label>
                <Input
                  id="shoutoutBrowserSource"
                  value={config.shoutoutBrowserSource || ''}
                  onChange={(e) => updateConfig('shoutoutBrowserSource', e.target.value)}
                  placeholder="Shoutout-Player"
                />
              </div>

              <div>
                <Label htmlFor="shoutoutIntroMessage">Shoutout Intro Message</Label>
                <Input
                  id="shoutoutIntroMessage"
                  value={config.shoutoutIntroMessage || ''}
                  onChange={(e) => updateConfig('shoutoutIntroMessage', e.target.value)}
                  placeholder="Shoutout: go check out @{displayName} at {url}"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tokens: <code>{'{displayName}'}</code>, <code>{'{username}'}</code>, <code>{'{url}'}</code>
                </p>
              </div>

              <div>
                <Label htmlFor="brbScene">BRB Scene</Label>
                <Input
                  id="brbScene"
                  value={config.brbScene || ''}
                  onChange={(e) => updateConfig('brbScene', e.target.value)}
                  placeholder="BRB"
                />
              </div>

              <div>
                <Label htmlFor="brbBrowserSource">BRB Browser Source</Label>
                <Input
                  id="brbBrowserSource"
                  value={config.brbBrowserSource || ''}
                  onChange={(e) => updateConfig('brbBrowserSource', e.target.value)}
                  placeholder="ClipPlayer"
                />
              </div>

              <div>
                <Label htmlFor="gambleOverlayScene">Gamble Overlay Scene</Label>
                <Input
                  id="gambleOverlayScene"
                  value={config.gambleOverlayScene || ''}
                  onChange={(e) => updateConfig('gambleOverlayScene', e.target.value)}
                  placeholder="Alerts"
                />
              </div>

              <div>
                <Label htmlFor="gambleOverlaySource">Gamble Overlay Source</Label>
                <Input
                  id="gambleOverlaySource"
                  value={config.gambleOverlaySource || ''}
                  onChange={(e) => updateConfig('gambleOverlaySource', e.target.value)}
                  placeholder="gamble"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="useTtsPlayer"
                  checked={config.useTtsPlayer ?? true}
                  onCheckedChange={(checked) => updateConfig('useTtsPlayer', checked)}
                />
                <Label htmlFor="useTtsPlayer">Use TTS Player</Label>
              </div>

              <div>
                <Label htmlFor="defaultTtsVoice">Default TTS Voice</Label>
                <Input
                  id="defaultTtsVoice"
                  value={config.defaultTtsVoice || ''}
                  onChange={(e) => updateConfig('defaultTtsVoice', e.target.value)}
                  placeholder="Algieba"
                />
              </div>

              <div className="space-y-2 pt-2">
                <Label>Overlay URLs (add these as OBS Browser Sources)</Label>
                {overlayUrls.map((item) => (
                  <div key={item.path} className="flex gap-2 items-center">
                    <Input value={item.url} readOnly />
                    <Button type="button" variant="outline" onClick={() => copyToClipboard(item.url)}>
                      Copy
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={saveConfig} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
