import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Vishleshan Portal - API for Developers',
  description: 'Resume Intelligence API for HR Platforms',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "white",
              color: "#2A2A2A",
              borderLeft: "4px solid #C8871A",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }
          }}
        />
      </body>
    </html>
  )
}
