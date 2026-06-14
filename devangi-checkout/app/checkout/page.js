'use client';
import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  MapPin, Phone, Mail, User, CreditCard, Truck, CheckCircle,
  ChevronDown, Plus, Tag, Package, Loader2, Scissors
} from 'lucide-react';

// ─── Sample items (from the actual shop) ─────────
const SAMPLE_CART = [
  { product_id: 101, name: 'Premium Sewing Machine Oil', price: 150, quantity: 1, image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100' },
  { product_id: 102, name: 'Professional Tailoring Scissors', price: 850, quantity: 1, image_url: 'https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?w=100' },
];
const DELIVERY_CHARGE = 40;

// ─── Form Field ───────────────────────────────────────────────────────────────
function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-pink-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-pink-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Input({ icon: Icon, error, className = '', ...props }) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
      <input
        className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 border ${error ? 'border-pink-400 bg-pink-50' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-800 text-sm transition ${className}`}
        {...props}
      />
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const [user, setUser]               = useState(null);
  const [savedAddresses, setSaved]    = useState([]);
  const [selectedAddr, setSelectedAddr] = useState(null);
  const [useNewAddr, setUseNewAddr]   = useState(true);
  const [saveAddr, setSaveAddr]       = useState(false);
  const [paymentMethod, setPayment]   = useState('cod');
  const [loading, setLoading]         = useState(false);
  const [errors, setErrors]           = useState({});

  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [address, setAddress] = useState({
    address_line1: '', address_line2: '', city: '', state: '', pincode: '', country: 'India'
  });

  const cart        = SAMPLE_CART;
  const subtotal    = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const total       = subtotal + DELIVERY_CHARGE;

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.user) {
          setUser(d.user);
          setContact(c => ({ ...c, name: d.user.name || '', email: d.user.email || '' }));
          fetch('/api/addresses')
            .then(r => r.json())
            .then(addrs => {
              setSaved(addrs);
              if (addrs.length > 0) {
                const def = addrs.find(a => a.is_default) || addrs[0];
                setSelectedAddr(def.id);
                setUseNewAddr(false);
              }
            });
        }
      })
      .catch(() => {});
  }, []);

  const validate = useCallback(() => {
    const errs = {};
    if (!contact.name.trim())    errs.name  = 'Full name is required';
    if (!/^\d{10}$/.test(contact.phone)) errs.phone = 'Enter valid 10-digit mobile';
    const addr = useNewAddr ? address : (savedAddresses.find(a => a.id === selectedAddr) || {});
    if (!addr.address_line1?.trim()) errs.address_line1 = 'Address is required';
    if (!addr.city?.trim())          errs.city          = 'City is required';
    if (!addr.state?.trim())         errs.state         = 'State is required';
    if (!/^\d{6}$/.test(addr.pincode)) errs.pincode     = 'Enter valid 6-digit pincode';
    return errs;
  }, [contact, address, useNewAddr, selectedAddr, savedAddresses]);

  const placeOrder = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); toast.error('Please check the form'); return; }
    setErrors({});
    setLoading(true);

    const shippingAddr = useNewAddr
      ? { ...address }
      : (() => { const a = savedAddresses.find(x => x.id === selectedAddr); return { address_line1: a.address_line1, address_line2: a.address_line2, city: a.city, state: a.state, pincode: a.pincode, country: a.country }; })();

    const fullAddr = { ...shippingAddr, full_name: contact.name, phone: contact.phone };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items:          cart,
          address:        fullAddr,
          address_id:     !useNewAddr ? selectedAddr : null,
          save_address:   saveAddr,
          payment_method: paymentMethod,
          guest_email:    !user ? contact.email : null,
          delivery_charge: DELIVERY_CHARGE,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Order placed at Devangi Store! 🎉');
      router.push(`/order-success?id=${data.orderId}`);
    } catch (err) {
      toast.error(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const STATES = ['Gujarat','Maharashtra','Delhi','Rajasthan','Madhya Pradesh','Karnataka','Tamil Nadu','Punjab','Haryana'];

  return (
    <div className="min-h-screen bg-pink-50/30">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-10 page-fade">
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Checkout</h1>
          <p className="text-slate-500 mt-2">Complete your purchase from Devangi Sewing Products</p>
        </header>

        <form onSubmit={placeOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* ── Form Section ── */}
            <div className="lg:col-span-2 space-y-8">

              {/* Contact */}
              <div className="bg-white rounded-3xl shadow-sm border border-pink-100 p-8">
                <h2 className="flex items-center gap-3 text-xl font-bold text-slate-800 mb-6">
                  <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-pink-600" />
                  </div>
                  Contact Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2">
                    <Field label="Full Name" required error={errors.name}>
                      <Input icon={User} placeholder="Enter your full name" value={contact.name} onChange={e => setContact({ ...contact, name: e.target.value })} error={errors.name} />
                    </Field>
                  </div>
                  <Field label="Mobile Number" required error={errors.phone}>
                    <Input icon={Phone} placeholder="10-digit mobile number" maxLength={10} value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value.replace(/\D/,'') })} error={errors.phone} />
                  </Field>
                  <Field label="Email Address">
                    <Input icon={Mail} type="email" placeholder="you@example.com" value={contact.email} onChange={e => setContact({ ...contact, email: e.target.value })} />
                  </Field>
                </div>
              </div>

              {/* Shipping */}
              <div className="bg-white rounded-3xl shadow-sm border border-pink-100 p-8">
                <h2 className="flex items-center gap-3 text-xl font-bold text-slate-800 mb-6">
                  <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-pink-600" />
                  </div>
                  Shipping Address
                </h2>

                {savedAddresses.length > 0 && (
                  <div className="mb-8 space-y-3">
                    <p className="text-sm font-bold text-slate-600 mb-2">Use a Saved Address</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {savedAddresses.map(addr => (
                        <label key={addr.id} className={`relative p-5 border-2 rounded-2xl cursor-pointer transition-all ${selectedAddr === addr.id && !useNewAddr ? 'border-pink-500 bg-pink-50/50 shadow-md' : 'border-slate-100 hover:border-pink-200 bg-white'}`}>
                          <input type="radio" name="saved_addr" checked={selectedAddr === addr.id && !useNewAddr} onChange={() => { setSelectedAddr(addr.id); setUseNewAddr(false); }} className="absolute top-4 right-4 accent-pink-600" />
                          <div className="text-sm">
                            <p className="font-bold text-slate-800">{addr.address_line1}</p>
                            <p className="text-slate-500 text-xs mt-1">{addr.city}, {addr.state} – {addr.pincode}</p>
                            {addr.is_default === 1 && <span className="inline-block mt-2 bg-pink-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">DEFAULT</span>}
                          </div>
                        </label>
                      ))}
                    </div>
                    <button type="button" onClick={() => { setUseNewAddr(true); setSelectedAddr(null); }}
                      className={`w-full mt-4 flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-2xl text-sm font-bold transition-all ${useNewAddr ? 'border-pink-500 bg-pink-50 text-pink-600' : 'border-slate-200 text-slate-500 hover:border-pink-400 hover:text-pink-600'}`}>
                      <Plus className="w-4 h-4" /> Add New Delivery Address
                    </button>
                  </div>
                )}

                {(useNewAddr || savedAddresses.length === 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="sm:col-span-2">
                      <Field label="Address Line 1" required error={errors.address_line1}>
                        <Input placeholder="Flat, House no., Building, Company, Apartment" value={address.address_line1} onChange={e => setAddress({ ...address, address_line1: e.target.value })} error={errors.address_line1} />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Address Line 2 (Optional)">
                        <Input placeholder="Area, Colony, Street, Sector, Village" value={address.address_line2} onChange={e => setAddress({ ...address, address_line2: e.target.value })} />
                      </Field>
                    </div>
                    <Field label="City" required error={errors.city}>
                      <Input placeholder="e.g. Surat" value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} error={errors.city} />
                    </Field>
                    <Field label="State" required error={errors.state}>
                      <div className="relative">
                        <select value={address.state} onChange={e => setAddress({ ...address, state: e.target.value })}
                          className={`w-full pl-4 pr-10 py-2.5 border ${errors.state ? 'border-pink-400 bg-pink-50' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-800 text-sm appearance-none`}>
                          <option value="">Select State</option>
                          {STATES.map(s => <option key={s}>{s}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                    </Field>
                    <Field label="Pincode" required error={errors.pincode}>
                      <Input placeholder="6-digit code" maxLength={6} value={address.pincode} onChange={e => setAddress({ ...address, pincode: e.target.value.replace(/\D/,'') })} error={errors.pincode} />
                    </Field>
                    <Field label="Country">
                      <Input value={address.country} disabled className="bg-slate-50 cursor-not-allowed" />
                    </Field>

                    {user && (
                      <label className="sm:col-span-2 flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={saveAddr} onChange={e => setSaveAddr(e.target.checked)} className="accent-pink-600 w-5 h-5 rounded-lg" />
                        <span className="text-sm font-semibold text-slate-600 group-hover:text-pink-600 transition-colors">Save this address for future orders</span>
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Payment */}
              <div className="bg-white rounded-3xl shadow-sm border border-pink-100 p-8">
                <h2 className="flex items-center gap-3 text-xl font-bold text-slate-800 mb-6">
                  <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-pink-600" />
                  </div>
                  Payment Method
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'cod',    label: 'Cash on Delivery', icon: Truck },
                    { id: 'online', label: 'Online Payment', icon: CreditCard },
                  ].map(({ id, label, icon: Icon }) => (
                    <label key={id} className={`flex items-center gap-4 p-5 border-2 rounded-2xl cursor-pointer transition-all ${paymentMethod === id ? 'border-pink-500 bg-pink-50/50' : 'border-slate-100 hover:border-pink-200'}`}>
                      <input type="radio" name="payment" value={id} checked={paymentMethod === id} onChange={() => setPayment(id)} className="accent-pink-600 w-5 h-5" />
                      <Icon className={`w-6 h-6 ${paymentMethod === id ? 'text-pink-600' : 'text-slate-400'}`} />
                      <span className="font-bold text-slate-800">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Summary Section ── */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl shadow-xl border border-pink-100 p-8 lg:sticky lg:top-24">
                <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800 mb-6 border-b border-pink-50 pb-4">
                  <Package className="w-6 h-6 text-pink-600" /> Order Summary
                </h2>

                <div className="space-y-6 mb-8">
                  {cart.map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="relative">
                        <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-2xl object-cover border border-slate-100 flex-shrink-0" />
                        <span className="absolute -top-2 -right-2 bg-pink-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg">{item.quantity}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 leading-tight">{item.name}</p>
                        <p className="text-xs text-slate-400 mt-1">Devangi Quality Assured</p>
                        <p className="text-sm font-black text-pink-600 mt-2">₹{item.price.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 pt-6 border-t border-pink-50 mb-8">
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Shipping</span>
                    <span className="text-green-600">₹{DELIVERY_CHARGE}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-pink-50">
                    <span className="text-lg font-bold text-slate-800">Total Payable</span>
                    <span className="text-2xl font-black text-pink-600">₹{total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-pink-50/50 rounded-2xl p-4 mb-8 flex gap-3 items-center border border-pink-100">
                  <Tag className="w-5 h-5 text-pink-600 flex-shrink-0" />
                  <p className="text-xs font-bold text-pink-700 leading-snug">Order above ₹1000 to get FREE gift!</p>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-pink-600 text-white font-black py-5 rounded-2xl hover:bg-pink-700 active:scale-[0.98] transition-all shadow-xl shadow-pink-200 flex items-center justify-center gap-3 disabled:opacity-60 text-lg uppercase tracking-wider">
                  {loading ? <><Loader2 className="w-6 h-6 animate-spin" /> Finalizing...</> : <><CheckCircle className="w-6 h-6" /> Place Order Now</>}
                </button>

                <div className="flex items-center justify-center gap-2 mt-6 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  <Scissors className="w-3 h-3" /> Secure Devangi Checkout <Scissors className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
