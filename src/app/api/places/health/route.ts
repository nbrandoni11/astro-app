import { NextResponse } from 'next/server';
import { googleConnectionCheck } from '@/lib/google-places';
export async function POST(req:Request) {
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{return NextResponse.json(await googleConnectionCheck(),{headers:{'Cache-Control':'no-store'}});}
 catch{console.error('[places] Connection check failed');return NextResponse.json({error:'Connection check failed'},{status:502});}
}
