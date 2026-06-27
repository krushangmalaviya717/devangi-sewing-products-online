import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { ShoppingBag, Scissors, Package, Truck, ShieldCheck, ArrowRight, Heart } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative bg-white pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col items-center text-center page-fade">
            <div className="inline-flex items-center gap-2 bg-pink-50 text-pink-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-8 border border-pink-100 shadow-sm">
              <Scissors className="w-3.5 h-3.5" /> Best Sewing Supplies in India
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-800 leading-[1.1] mb-8">
              Quality Craftsmanship,<br />
              <span className="text-pink-600">Devangi</span> Standard.
            </h1>
            <p className="text-lg md:text-xl text-slate-500 max-w-2xl mb-12 font-medium">
              Your one-stop destination for professional tailoring tools, premium threads, and sewing accessories since 1995.
            </p>
            <div className="flex flex-col sm:flex-row gap-5">
              <Link href="/checkout" className="bg-pink-600 text-white font-black px-10 py-5 rounded-2xl hover:bg-pink-700 transition-all shadow-xl shadow-pink-200 text-lg flex items-center gap-3 active:scale-[0.98]">
                Start Shopping <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/login" className="bg-white text-slate-800 font-bold px-10 py-5 rounded-2xl border-2 border-slate-100 hover:border-pink-200 hover:text-pink-600 transition-all text-lg">
                Member Login
              </Link>
            </div>
          </div>
        </div>
        
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 -z-0"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-100/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 -z-0"></div>
      </section>

      {/* Trust Section */}
      <section className="bg-slate-50 py-16 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Truck, label: 'Fast Delivery', sub: 'Across All States' },
              { icon: ShieldCheck, label: 'Secure Payment', sub: '100% Protected' },
              { icon: Package, label: 'Bulk Orders', sub: 'Wholesale Rates' },
              { icon: Heart, label: 'Happy Crafters', sub: '5000+ Customers' },
            ].map((f, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <f.icon className="w-8 h-8 text-pink-500 mb-3" />
                <p className="font-bold text-slate-800 text-sm">{f.label}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{f.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-12 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 text-slate-400 mb-6 grayscale">
             <Scissors className="w-5 h-5" /> Devangi Products
          </div>
          <p className="text-slate-400 text-sm font-medium">© 2024 Devangi Products. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
