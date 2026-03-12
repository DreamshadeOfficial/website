import { NextResponse } from 'next/server';
import { generateProposal, type Prefs } from '@/lib/scoring';

export async function POST(req: Request) {
  const prefs = (await req.json()) as Prefs;
  const proposal = generateProposal(prefs);
  return NextResponse.json(proposal);
}