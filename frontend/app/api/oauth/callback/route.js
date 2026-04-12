import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  let type = "GMAIL_AUTH_CODE";
  if (state && state.startsWith("gdrive")) {
    type = "GDRIVE_AUTH_CODE";
  }

  const html = `
    <html>
      <head>
        <title>Authenticating...</title>
        <style>
          body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #fafafa; }
          .loader { text-align: center; }
          .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #C8871A; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 15px auto; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="loader">
          <div class="spinner"></div>
          <h2>Authentication Successful</h2>
          <p>Redirecting back to dashboard...</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: "${type}", code: "${code}" }, "*");
            window.close();
          } else {
            document.write("Authentication complete. You can close this window manually.");
          }
        </script>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}
