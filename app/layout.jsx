import './globals.css';

export const metadata = {
  title: 'Resto Mini App',
  description: 'Telegram Mini App for restaurant analytics'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body>{children}</body>
    </html>
  );
}
