import { NextRequest, NextResponse } from 'next/server';
import { uudecode, isUUEncoded } from '@/lib/uudecoder';

export async function POST(request: NextRequest) {
  try {
    const { exportData } = await request.json();
    
    if (!exportData) {
      return NextResponse.json({ error: 'Export data is required' }, { status: 400 });
    }

    let jsonData: any;
    const changes: string[] = [];

    // Decode UUEncoded data if needed
    if (isUUEncoded(exportData)) {
      try {
        const decoded = uudecode(exportData);
        console.log('Decoded content preview:', decoded.substring(0, 500));
        
        // Clean and try to parse as JSON
        const cleanDecoded = decoded.trim().replace(/^\uFEFF/, ''); // Remove BOM
        
        try {
          jsonData = JSON.parse(cleanDecoded);
          changes.push("Decoded and decompressed UUEncoded Streamerbot export");
        } catch (jsonError) {
          // If not JSON, try to find and extract JSON from the content
          const jsonStart = cleanDecoded.indexOf('{');
          const jsonEnd = cleanDecoded.lastIndexOf('}');
          
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            const extractedJson = cleanDecoded.substring(jsonStart, jsonEnd + 1);
            try {
              jsonData = JSON.parse(extractedJson);
              changes.push("Extracted JSON from decoded Streamerbot export");
            } catch (extractError) {
              return NextResponse.json({ 
                error: `Failed to parse extracted JSON. Original error: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}. Content preview: ${cleanDecoded.substring(0, 200)}` 
              }, { status: 400 });
            }
          } else {
            return NextResponse.json({ 
              error: `No valid JSON found in decoded content. Content preview: ${cleanDecoded.substring(0, 200)}` 
            }, { status: 400 });
          }
        }
      } catch (error) {
        return NextResponse.json({ error: `Failed to decode UUEncoded data: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 400 });
      }
    } else {
      try {
        jsonData = JSON.parse(exportData);
      } catch (error) {
        return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
      }
    }

    const actions: any[] = [];
    const commands: any[] = [];

    // Convert Streamerbot actions to StreamWeave format
    const actionsArray = jsonData.actions || jsonData.data?.actions || [];
    if (actionsArray.length > 0) {
      for (const sbAction of actionsArray) {
        const action: any = {
          name: sbAction.name || "Untitled Action",
          trigger: sbAction.trigger || "manual",
          type: "Execute Code",
          status: sbAction.enabled ? "Active" : "Draft",
          language: "javascript",
          code: sbAction.code || "// Converted from Streamerbot\nconsole.log('Action executed');"
        };

        // Convert triggers
        if (sbAction.triggers) {
          const trigger = sbAction.triggers[0];
          if (trigger?.type === "Command") {
            action.trigger = trigger.command || action.trigger;
            changes.push(`Converted command trigger for action: ${action.name}`);
          }
        }

        actions.push(action);
      }
    }

    // Convert Streamerbot commands to StreamWeave format
    const commandsArray = jsonData.commands || jsonData.data?.commands || [];
    if (commandsArray.length > 0) {
      for (const sbCommand of commandsArray) {
        const command = {
          name: sbCommand.command || sbCommand.name || "Untitled Command",
          trigger: sbCommand.command || sbCommand.trigger,
          response: sbCommand.message || sbCommand.response || "No response configured",
          enabled: sbCommand.enabled !== false,
          cooldown: sbCommand.cooldown || 0,
        };

        commands.push(command);
      }
    }

    return NextResponse.json({ actions, commands, changes });
  } catch (error: any) {
    console.error('Streamerbot conversion error:', error);
    return NextResponse.json({ 
      error: 'Failed to convert Streamerbot export',
      details: error.message 
    }, { status: 500 });
  }
}