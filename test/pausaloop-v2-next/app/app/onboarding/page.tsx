"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopNav } from '@/components/TopNav';

export default function OnboardingPage() {
  const [breakMinutes, setBreakMinutes] = useState(45);
  const [walkMinutes, setWalkMinutes] = useState(20);
  const [mood, setMood] = useState('Oggi zero sbatti');
  const router = useRouter();

  return (
    <div className="space-y-3">
      <TopNav />
      <div className="card space-y-3">
        <h2 className="text-xl font-semibold">Onboarding leggero</h2>
        <p className="text-sm text-slate-400">Solo 3 scelte per iniziare subito.</p>
        <label className="text-sm">Pausa totale (min)
          <select className="input mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2" value={breakMinutes} onChange={e=>setBreakMinutes(+e.target.value)}>
            {[20,30,45,60].map(v=><option key={v}>{v}</option>)}
          </select>
        </label>
        <label className="text-sm">Camminata desiderata (min)
          <select className="input mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2" value={walkMinutes} onChange={e=>setWalkMinutes(+e.target.value)}>
            {[10,15,20,30].map(v=><option key={v}>{v}</option>)}
          </select>
        </label>
        <label className="text-sm">Mood rapido
          <select className="input mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2" value={mood} onChange={e=>setMood(e.target.value)}>
            {['Ho bisogno di aria','Voglio qualcosa di veloce','Voglio camminare di più','Oggi zero sbatti'].map(v=><option key={v}>{v}</option>)}
          </select>
        </label>
        <button
          className="btn-primary"
          onClick={() => {
            localStorage.setItem('prefs', JSON.stringify({ breakMinutes, walkMinutes, mood, budget:'$$', intensity:'rilassata', cuisine:'Italian' }));
            router.push('/app/dashboard');
          }}
        >Continua</button>
      </div>
    </div>
  );
}