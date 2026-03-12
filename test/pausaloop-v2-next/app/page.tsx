import Link from 'next/link';
import { TopNav } from '@/components/TopNav';

export default function HomePage() {
  return (
    <div>
      <TopNav />
      <section className="card space-y-3">
        <h1 className="text-3xl font-bold">Stacca, cammina, mangia bene.</h1>
        <p className="text-slate-300">Un assistente pausa pranzo calmante e a basso sforzo decisionale.</p>
        <div className="flex gap-2">
          <Link className="btn-primary" href="/app/onboarding">Inizia onboarding</Link>
          <Link className="btn-secondary" href="/app/dashboard">Vai alla dashboard</Link>
        </div>
      </section>
    </div>
  );
}