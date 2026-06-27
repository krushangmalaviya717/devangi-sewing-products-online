'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { CheckCircle, Package, MapPin, Calendar, ArrowRight, Scissors } from 'lucide-react';
import Navbar from '@/components/Navbar';

function SuccessContent() {
  const params  = useSearchParams();
  const orderId = params.get('id');

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-16 text-center page-fade">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-black text-slate-800 mb-2">Order Confirmed!</h1>
        <p className="text-slate-500 mb-8 font-medium">Thank you for shopping with Devangi Products.</p>

        <div className="bg-pink-50/50 rounded-3xl border border-pink-100 p-8 text-left space-y-5 mb-8 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Package className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order Number</p>
              <p className="text-lg font-black text-slate-800">#{orderId}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Calendar className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimated Delivery</p>
              <p className="text-base font-bold text-slate-800">In 3-5 Working Days</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Link href={`/orders/${orderId}`} className="flex items-center justify-center gap-2 w-full bg-pink-600 text-white font-bold py-4 rounded-2xl hover:bg-pink-700 transition-all shadow-lg shadow-pink-200">
            Track Your Order <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/" className="block text-slate-400 font-bold text-sm hover:text-pink-600 transition-colors uppercase tracking-widest">
            ← Continue Shopping
          </Link>
        </div>

        <div className="mt-12 opacity-20">
          <Scissors className="w-8 h-8 mx-auto text-pink-600" />
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-pink-600" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
