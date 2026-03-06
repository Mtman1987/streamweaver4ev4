import { NextResponse } from 'next/server';
import { readVault } from '@/lib/vault-store';
import { readAutomationVariables } from '@/lib/automation-variables-store';

export async function GET() {
  try {
    const [vault, variables] = await Promise.all([readVault(), readAutomationVariables()]);
    return NextResponse.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      vault,
      variables,
    });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}
