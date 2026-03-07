'use client';

import { useLogPanel } from './log-panel-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LogPanel() {
  const { logs, clearLogs, isVisible, setVisible } = useLogPanel();

  if (!isVisible && logs.length === 0) return null;

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">System Logs</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearLogs}>
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setVisible(!isVisible)}>
              {isVisible ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      {isVisible && (
        <CardContent className="pt-0">
          <ScrollArea className="h-32">
            <div className="space-y-1">
              {logs.map(log => (
                <div key={log.id} className="text-xs font-mono flex gap-2">
                  <span className="text-muted-foreground">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <span className={cn(
                    log.level === 'error' && 'text-red-500',
                    log.level === 'warn' && 'text-yellow-500',
                    log.level === 'info' && 'text-blue-500'
                  )}>
                    [{log.level.toUpperCase()}]
                  </span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}