export const metadata = {
  title: "A+ Scanner",
  description: "IBKR Options Daily Trade Scanner",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="A+ Scanner" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0a0a0a" }}>
        {children}
      </body>
    </html>
  );
}