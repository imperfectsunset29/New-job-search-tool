import './globals.css';

export const metadata = {
  title: 'Resume Optimizer',
  description: 'Tailor your resume to any job in seconds',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
