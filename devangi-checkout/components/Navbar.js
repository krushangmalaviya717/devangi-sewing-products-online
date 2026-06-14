'use client';
import Link from 'next/link';
import { ShoppingBag, Package, LogOut, User, Menu, X, Scissors } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function Navbar() {
  const [user, setUser]       = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setUser(d.user); })
      .catch(() => {});
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    toast.success('Logged out from Devangi Store');
    router.push('/');
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-pink-600">
            <div className="bg-pink-100 p-1.5 rounded-lg">
              <Scissors className="w-6 h-6 text-pink-600" />
            </div>
            <span className="tracking-tight text-slate-800">Devangi <span className="text-pink-600">Sewing Store</span></span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/checkout" className="text-slate-600 hover:text-pink-600 font-medium transition-colors">Checkout</Link>
            {user && (
              <Link href="/orders" className="flex items-center gap-1 text-slate-600 hover:text-pink-600 font-medium transition-colors">
                <Package className="w-4 h-4" /> My Orders
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link href="/admin" className="text-pink-600 hover:text-pink-700 font-semibold transition-colors">Admin Dashboard</Link>
            )}
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-pink-50 px-3 py-1.5 rounded-full">
                  <User className="w-4 h-4 text-pink-600" />
                  <span className="text-sm font-medium text-pink-700">{user.name?.split(' ')[0]}</span>
                </div>
                <button onClick={logout} className="flex items-center gap-1 text-slate-500 hover:text-red-500 transition-colors text-sm">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-slate-600 hover:text-pink-600 font-medium text-sm transition-colors">Login</Link>
                <Link href="/register" className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-pink-700 transition-all shadow-md shadow-pink-100">Sign Up</Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 text-slate-600" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-100 py-4 space-y-3 px-2">
            <Link href="/checkout" className="block px-2 py-2 text-slate-700 font-medium hover:text-pink-600" onClick={() => setMenuOpen(false)}>Checkout</Link>
            {user && <Link href="/orders" className="block px-2 py-2 text-slate-700 font-medium hover:text-pink-600" onClick={() => setMenuOpen(false)}>My Orders</Link>}
            {user?.role === 'admin' && <Link href="/admin" className="block px-2 py-2 text-pink-600 font-semibold" onClick={() => setMenuOpen(false)}>Admin Panel</Link>}
            {user ? (
              <button onClick={logout} className="block w-full text-left px-2 py-2 text-red-500 font-medium">Logout</button>
            ) : (
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-50">
                <Link href="/login" className="block px-2 py-2 text-slate-700 font-medium" onClick={() => setMenuOpen(false)}>Login</Link>
                <Link href="/register" className="block px-4 py-2 bg-pink-600 text-white rounded-lg text-center font-medium" onClick={() => setMenuOpen(false)}>Sign Up</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
