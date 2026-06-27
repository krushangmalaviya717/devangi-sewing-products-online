import './globals.css';
import Providers from '@/components/Providers';

export const metadata = {
  title: 'Devangi Products – Checkout & Orders',
  description: 'Manage your sewing supplies orders with ease.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
