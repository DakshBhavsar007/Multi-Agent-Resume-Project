import './globals.css';
import '../src/index.css';
import { Providers } from './providers';
import SmoothScroll from '../src/components/SmoothScroll';

export const metadata = {
  title: 'Vishleshan - Recruiter Dashboard',
  description: 'AI-Powered Recruitment Dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SmoothScroll>
          <Providers>
            {children}
          </Providers>
        </SmoothScroll>
      </body>
    </html>
  );
}
