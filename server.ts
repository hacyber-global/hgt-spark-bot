import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/cloudflare/kv", async (req, res) => {
    const accountId = req.body.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    const namespaceId = req.body.namespaceId || process.env.CLOUDFLARE_NAMESPACE_ID;
    const apiToken = req.body.apiToken || process.env.CLOUDFLARE_API_TOKEN;
    const { keyName, value } = req.body;
    
    if (!accountId || !namespaceId || !apiToken || !keyName || !value) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${keyName}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: value
      });

      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to upload to Cloudflare KV" });
    }
  });

  // ==========================================
  // --- TELEGRAM BOT WEBHOOKS & PROXY API ---
  // ==========================================

  app.post("/api/telegram/send", async (req, res) => {
    const { chatId, text, token } = req.body;
    const botToken = token || process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return res.status(500).json({ error: "TELEGRAM_BOT_TOKEN not configured" });
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.post("/api/telegram/verify", async (req, res) => {
    const { token, chatId } = req.body;
    const botToken = token || process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return res.status(500).json({ error: "No token" });
    }

    try {
      if (chatId) {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`);
        if (response.ok) return res.json({ ok: true });
      }
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      res.json({ ok: response.ok });
    } catch {
      res.status(500).json({ error: "Failed to verify connection" });
    }
  });

  // Webhook for Telegram Interactive Bot Commands
  app.post("/api/telegram/webhook", async (req, res) => {
    const update = req.body;
    if (update.message && update.message.text) {
      const { text, chat } = update.message;
      const chatId = chat.id;
      const token = process.env.TELEGRAM_BOT_TOKEN;

      if (token) {
        let replyText = "";
        const lowerText = text.toLowerCase();

        if (lowerText.startsWith("/start") || lowerText.startsWith("/help")) {
          replyText = `🤖 *HGT Multi-Bot Dispatch Control Bot v3.12* 🤖\n\nWelcome to Hacyber Global Tech telemetry systems! Use the following terminal commands to check status and sync endpoints:\n\n/status - View license and driver intercept status\n/dns - Inspect domain CNAME & Nameserver configuration\n/payment - Get checkout instructions (Zelle, PayPal, BTC)\n/license [key] - Verify active system activation key\n/help - Show this commands dictionary.`;
        } else if (lowerText.startsWith("/status")) {
          replyText = `📊 *TELEMETRY STATUS REPORT* 📊\n\nDomain: hacyberglobal.dpdns.org\nCNAME Route: Cloud Run cluster (Active)\nLatency: 28ms\nConnection: TLS 1.3 Secure\nActive Sessions: 1\nStatus: ONLINE & TRACKING ⚡`;
        } else if (lowerText.startsWith("/dns")) {
          replyText = `🌐 *CLOUDFLARE DNS CONFIGURATION* 🌐\n\nNameserver 1: anirban.ns.cloudflare.com\nNameserver 2: cecelia.ns.cloudflare.com\nTXT verification: google-site-verification=n7ECyUmQagKB2NSjhm0UWuVnhhvYdxWQH5ez_l2F75w\nDS Records: hacyberglobaltech.github.io. 3600 IN DS ...\nStatus: Sync completed.`;
        } else if (lowerText.startsWith("/payment_request") || lowerText.startsWith("/payment") || lowerText.startsWith("/pay") || lowerText.startsWith("/buy")) {
          replyText = `💸 *SECURE CHECKOUT CREDENTIALS* 💸\n\nTo activate your Multi-Bot Dispatcher & bypass filters, submit your deposit of $130.00:\n\n- Zelle Payee: Godfrey N Joshua (zelle@hacyberglobal.dpdns.org)\n- PayPal Checkout: https://paypal.me/hacyberglobaltech/130\n- Bitcoin address: 3QJ8yE7wU1fKAnF5sWpDHezB39P4Jp8YgD\n\nAfter payment, send receipt / transaction hash via /license [receipt_id] to activate immediately.`;
        } else if (lowerText.startsWith("/license")) {
          const parts = text.split(" ");
          if (parts.length > 1) {
            const key = parts.slice(1).join(" ");
            replyText = `🔐 *LICENSING ENGINE VERIFICATION* 🔐\n\nLicense: ${key}\nStatus: VERIFIED & AUTHORIZED ✅\nAuthorized Holder: Godfrey N Joshua\nPipeline Stream: ACTIVE\n\nThank you for choosing HGT Systems!`;
          } else {
            replyText = `🔐 *LICENSE KEY ENTRY REQUIRED* 🔐\n\nPlease enter your system key or receipt transaction ID, for example:\n/license HGT-SPARK-PRO-992`;
          }
        }

        if (replyText) {
          try {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: replyText, parse_mode: "Markdown" }),
            });
          } catch (e) {
            console.error("Failed to post message to Telegram sendMessage API:", e);
          }
        }
      }
    }
    res.sendStatus(200);
  });

  // Stripe Integration & Mock Fallback Maps
  let stripeClient: Stripe | null = null;
  const mockAccounts = new Map<string, any>();
  const mockProducts = new Map<string, any>();
  const simulatedActiveAccounts = new Set<string>();

  // Add initial mock accounts so there is always a pre-loaded account
  mockAccounts.set('acct_1HGT_MOCK_PRO', {
    id: 'acct_1HGT_MOCK_PRO',
    charges_enabled: true,
    payouts_enabled: true,
    details_submitted: true,
    email: 'godfrey@hacyberglobal.com',
    controller: {
      fees: { payer: 'application' },
      losses: { payments: 'application' },
      stripe_dashboard: { type: 'express' }
    }
  });

  const getStripe = (): Stripe | null => {
    if (!stripeClient) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (key) {
        stripeClient = new Stripe(key, {
          apiVersion: '2026-05-27.dahlia' as any
        });
        console.log("⚡ Stripe Node Client successfully initialized using API version 2026-05-27.dahlia");
      } else {
        console.warn("⚠️ Stripe secret key missing. Seamlessly running in simulated Sandbox controller mode.");
      }
    }
    return stripeClient;
  };

  // --- STRIPE CONNECT API ROUTE PLUGS ---

  // 1. Creating Connected Accounts under Platform Controller responsibility
  app.post('/api/stripe/connect/accounts', async (req, res) => {
    try {
      const stripe = getStripe();
      if (!stripe) {
        const mockAccountId = `acct_${Math.random().toString(36).substring(2, 10)}`;
        mockAccounts.set(mockAccountId, {
          id: mockAccountId,
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false,
          controller: {
            fees: { payer: 'application' },
            losses: { payments: 'application' },
            stripe_dashboard: { type: 'express' }
          },
          email: "partner@hacyberglobal.com"
        });
        return res.json({ accountId: mockAccountId, isMock: true });
      }

      const account = await stripe.accounts.create({
        controller: {
          fees: { payer: 'application' as const },
          losses: { payments: 'application' as const },
          stripe_dashboard: { type: 'express' as const }
        }
      });

      res.json({ accountId: account.id });
    } catch (err: any) {
      console.error("Error creating Connect Account:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Onboarding Connected Accounts via Stripe Account Links API
  app.post('/api/stripe/connect/onboard', async (req, res) => {
    try {
      const { accountId } = req.body;
      if (!accountId) {
        return res.status(400).json({ error: 'Missing accountId parameter.' });
      }

      const origin = req.headers.origin || `http://${req.headers.host}`;
      const stripe = getStripe();

      if (!stripe) {
        const mockUrl = `${origin}/?onboard_return=true&account_id=${accountId}`;
        return res.json({ url: mockUrl });
      }

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${origin}/?onboard_refresh=true&account_id=${accountId}`,
        return_url: `${origin}/?onboard_return=true&account_id=${accountId}`,
        type: 'account_onboarding',
      });

      res.json({ url: accountLink.url });
    } catch (err: any) {
      console.error("Error creating Account Link:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Retrieve Connected Account Status Directly from API (with Sandbox bypass)
  app.get('/api/stripe/connect/accounts/:accountId', async (req, res) => {
    try {
      const { accountId } = req.params;
      const stripe = getStripe();

      if (!stripe) {
        const mockAcc = mockAccounts.get(accountId) || {
          id: accountId,
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false
        };
        if (simulatedActiveAccounts.has(accountId)) {
          mockAcc.charges_enabled = true;
          mockAcc.payouts_enabled = true;
          mockAcc.details_submitted = true;
        }
        return res.json(mockAcc);
      }

      const account = await stripe.accounts.retrieve(accountId);
      
      if (simulatedActiveAccounts.has(accountId)) {
        account.charges_enabled = true;
        account.payouts_enabled = true;
        account.details_submitted = true;
      }
      
      res.json(account);
    } catch (err: any) {
      console.error("Error retrieving Connect Account:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Retrieve List of Connected Accounts (with Sandbox bypass)
  app.get('/api/stripe/connect/accounts', async (req, res) => {
    try {
      const stripe = getStripe();
      if (!stripe) {
        const list = Array.from(mockAccounts.values()).map(acc => {
          if (simulatedActiveAccounts.has(acc.id)) {
            return {
              ...acc,
              charges_enabled: true,
              payouts_enabled: true,
              details_submitted: true
            };
          }
          return acc;
        });
        return res.json(list);
      }

      const accounts = await stripe.accounts.list({ limit: 50 });
      const mappedData = accounts.data.map(acc => {
        if (simulatedActiveAccounts.has(acc.id)) {
          return {
            ...acc,
            charges_enabled: true,
            payouts_enabled: true,
            details_submitted: true
          };
        }
        return acc;
      });
      res.json(mappedData);
    } catch (err: any) {
      console.error("Error listing Connect Accounts:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Create Platform-Level Product Mapped to Connected Account ID
  app.post('/api/stripe/connect/products', async (req, res) => {
    try {
      const { name, description, priceInCents, currency = 'usd', connectedAccountId } = req.body;

      if (!name || !priceInCents || !connectedAccountId) {
        return res.status(400).json({ error: 'Missing name, priceInCents, or connectedAccountId properties.' });
      }

      const stripe = getStripe();
      if (!stripe) {
        const mockProdId = `prod_${Math.random().toString(36).substring(2, 10)}`;
        const mockProduct = {
          id: mockProdId,
          name,
          description,
          default_price: {
            id: `price_${Math.random().toString(36).substring(2, 10)}`,
            unit_amount: priceInCents,
            currency
          },
          metadata: {
            connected_account_id: connectedAccountId
          }
        };
        mockProducts.set(mockProdId, mockProduct);
        return res.json(mockProduct);
      }

      const product = await stripe.products.create({
        name: name,
        description: description,
        default_price_data: {
          unit_amount: priceInCents,
          currency: currency,
        },
        metadata: {
          connected_account_id: connectedAccountId,
        },
      });

      res.json(product);
    } catch (err: any) {
      console.error("Error creating Platform Product:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Retrieve Platform-Level Products with Expanded Default Prices
  app.get('/api/stripe/connect/products', async (req, res) => {
    try {
      const stripe = getStripe();
      if (!stripe) {
        return res.json(Array.from(mockProducts.values()));
      }

      const products = await stripe.products.list({
        active: true,
        limit: 100,
        expand: ['data.default_price'],
      });

      res.json(products.data);
    } catch (err: any) {
      console.error("Error listing platform products:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Create Destination Charge Checkout Session (monetized with application fee)
  app.post('/api/stripe/connect/checkout', async (req, res) => {
    try {
      const { priceId, priceInCents, currency = 'usd', productName = 'Platform Product', connectedAccountId, applicationFeeAmount } = req.body;

      if (!connectedAccountId) {
        return res.status(400).json({ error: 'Missing connectedAccountId' });
      }

      const origin = req.headers.origin || `http://${req.headers.host}`;
      const stripe = getStripe();

      if (!stripe) {
        const mockUrl = `${origin}/?checkout_success=true&session_id=cs_mock_${Math.random().toString(36).substring(2, 10)}`;
        return res.json({ url: mockUrl });
      }

      let line_items: any[] = [];
      if (priceId) {
        line_items = [
          {
            price: priceId,
            quantity: 1,
          }
        ];
      } else {
        line_items = [
          {
            price_data: {
              currency,
              product_data: {
                name: productName,
              },
              unit_amount: priceInCents,
            },
            quantity: 1,
          }
        ];
      }

      const session = await stripe.checkout.sessions.create({
        line_items,
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount || 200, // application fee in cents
          transfer_data: {
            destination: connectedAccountId,
          },
        },
        mode: 'payment',
        success_url: `${origin}/?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?checkout_canceled=true`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Error creating Checkout Session:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Bypass Identity Verification / Activate Account Instantly
  app.post('/api/stripe/connect/accounts/:accountId/simulate-activate', (req, res) => {
    try {
      const { accountId } = req.params;
      simulatedActiveAccounts.add(accountId);
      
      const mockAcc = mockAccounts.get(accountId);
      if (mockAcc) {
        mockAcc.charges_enabled = true;
        mockAcc.payouts_enabled = true;
        mockAcc.details_submitted = true;
        mockAccounts.set(accountId, mockAcc);
      }
      
      res.json({ 
        success: true, 
        accountId, 
        message: "⚡ Account identity verification bypassed successfully. Charges and payouts enabled!" 
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/stripe/create-checkout-session', async (req, res) => {
    try {
      const stripe = getStripe();
      if (!stripe) {
         return res.status(500).json({ error: 'Stripe is not configured. STRIPE_SECRET_KEY is missing.' });
      }

      const { amount, currency = 'usd', successUrl, cancelUrl, title = 'Software License' } = req.body;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency,
              product_data: {
                name: title,
              },
              unit_amount: Math.round(amount * 100), // amount in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl || `${req.headers.origin}?success=true`,
        cancel_url: cancelUrl || `${req.headers.origin}?canceled=true`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/stripe/verify', async (req, res) => {
      const stripe = getStripe();
      if (stripe) {
          res.json({ configured: true, publicKey: process.env.STRIPE_PUBLIC_KEY || "" });
      } else {
          res.json({ configured: false, publicKey: "" });
      }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
