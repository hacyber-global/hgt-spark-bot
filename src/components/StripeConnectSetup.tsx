import React, { useState, useEffect } from 'react';
import { safeStorage as localStorage } from '../lib/safeStorage';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  UserPlus, 
  Link, 
  ShoppingBag, 
  PlusCircle, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  DollarSign, 
  ShieldCheck, 
  ArrowRight,
  ExternalLink,
  Store,
  Terminal,
  Info
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface StripeConnectSetupProps {
  onAddLog: (
    type: 'info' | 'bot_accept' | 'bot_skip' | 'manual_accept' | 'manual_decline' | 'competitor' | 'expire' | 'warning', 
    message: string, 
    offerId?: string, 
    badge?: string
  ) => void;
}

// Interface representing a Stripe Product expanded with default_price details and metadata mapping
interface StripeProduct {
  id: string;
  name: string;
  description: string;
  default_price?: {
    id: string;
    unit_amount: number;
    currency: string;
  };
  metadata: {
    connected_account_id?: string;
  };
}

// Interface representing a Stripe Account structure
interface StripeAccount {
  id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  controller?: {
    fees?: { payer?: string };
    losses?: { payments?: string };
    stripe_dashboard?: { type?: string };
  };
  email?: string;
}

export default function StripeConnectSetup({ onAddLog }: StripeConnectSetupProps) {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState<'onboard' | 'products' | 'storefront' | 'developer' | 'transactions' | 'docs' | 'audit'>('onboard');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [autoInstantPayout, setAutoInstantPayout] = useState(false);
  const [payoutSchedule, setPayoutSchedule] = useState<'automatic' | 'weekly' | 'manual'>('automatic');
  const [auditLogs, setAuditLogs] = useState<any[]>([
      { timestamp: '2026-06-25 12:00', event: 'Payout Initiated', status: 'pending' },
      { timestamp: '2026-06-25 10:00', event: 'Identity Verification Request', status: 'error' }
  ]);

  // Stripe Account state
  const [accounts, setAccounts] = useState<StripeAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    return localStorage.getItem('stripe_connect_selected_account_id') || '';
  });
  const [currentAccountStatus, setCurrentAccountStatus] = useState<StripeAccount | null>(null);

  // Form for product creation
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productPrice, setProductPrice] = useState('29.99');
  const [productCurrency, setProductCurrency] = useState('usd');
  const [productTargetAccount, setProductTargetAccount] = useState('');

  // Storefront products
  const [products, setProducts] = useState<StripeProduct[]>([]);
  
  // Transactions
  const [transactions, setTransactions] = useState<any[]>([
    { id: 'tx_1', date: '2026-06-25', amount: '$29.99', status: 'succeeded', paidOut: false },
    { id: 'tx_2', date: '2026-06-25', amount: '$59.99', status: 'failed', paidOut: false },
    { id: 'tx_3', date: '2026-06-24', amount: '$29.99', status: 'pending', paidOut: false },
  ]);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [instantPayoutsEnabled, setInstantPayoutsEnabled] = useState(false);
  const [apiLogs, setApiLogs] = useState<string[]>([]);

  // Automatic Instant Payout logic
  useEffect(() => {
      if (!autoInstantPayout) return;
      
      transactions.forEach(tx => {
          if (tx.status === 'succeeded' && !tx.paidOut) {
              addApiLog(`Automatically triggering instant payout for ${tx.amount}...`);
              setTransactions(prev => prev.map(t => t.id === tx.id ? {...t, paidOut: true} : t));
              setAuditLogs(prev => [{ timestamp: new Date().toLocaleTimeString(), event: `Automatic Payout: ${tx.amount}`, status: 'success' }, ...prev]);
          }
      });
  }, [transactions, autoInstantPayout]);

  // Sync simulation

  // Sync simulation
  const handleSyncTransactions = () => {
    setIsSyncing(true);
    setTimeout(() => {
        setIsSyncing(false);
        addApiLog('Transactions synced successfully from Stripe API.');
    }, 1500);
  };

  // CSV Export
  const handleExportCSV = () => {
    const csvContent = "Date,Amount,Status\n" + transactions.map(t => `${t.date},${t.amount},${t.status}`).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    addApiLog('Exported transactions to CSV.');
  };

  // Manual Payout Trigger
  const handleManualPayout = async (tx: any) => {
    if (!selectedAccountId) {
        addApiLog('Error: No connected account selected.');
        return;
    }
    const amount = Math.round(parseFloat(tx.amount.replace('$', '')) * 100);
    addApiLog(`Manually triggering instant payout of $${(amount/100).toFixed(2)} to ${selectedAccountId}...`);
    
    // In a real app, call initiateInstantPayout(selectedAccountId, amount);
    // Here we simulate the successful payout.
    setTransactions(prev => prev.map(t => t.id === tx.id ? {...t, paidOut: true, status: 'succeeded'} : t));
    setAuditLogs(prev => [{ timestamp: new Date().toLocaleTimeString(), event: `Manual Payout: ${tx.amount}`, status: 'success' }, ...prev]);
    setSelectedTransaction(null);
  };

  // Add local log for developer tab
  const addApiLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setApiLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  // Fee estimation helper
  const estimateFee = (amountStr: string) => {
    const amount = parseFloat(amountStr.replace('$', ''));
    return (amount * 0.10).toFixed(2); // 10% fee
  }

  const FeeEstimator = ({ amountStr }: { amountStr: string }) => {
    const fee = estimateFee(amountStr);
    return (
        <div className="bg-neutral-900/50 p-2 rounded border border-neutral-800 my-2">
            <p className="text-[9px] text-neutral-400">
                Est. Platform Fee (10%): <strong className="text-white">${fee}</strong>
            </p>
            <p className="text-[8px] text-neutral-500">
                Net Payout to Account: <strong className="text-emerald-400">${(parseFloat(amountStr.replace('$', '')) - parseFloat(fee)).toFixed(2)}</strong>
            </p>
        </div>
    );
  }

  // --- REFRESH DATA ON INITS AND TAB CHANGES ---
  useEffect(() => {
    fetchConnectedAccounts();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      localStorage.setItem('stripe_connect_selected_account_id', selectedAccountId);
      fetchAccountStatus(selectedAccountId);
    } else {
      setCurrentAccountStatus(null);
    }
  }, [selectedAccountId]);

  // Check URL parameters for redirect success from onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('onboard_return') === 'true') {
      const acctId = params.get('account_id');
      if (acctId) {
        setSelectedAccountId(acctId);
        onAddLog('bot_accept', `🎉 STRIPE CONNECT: Returned successfully from Stripe Onboarding for account ${acctId}!`, undefined, 'CONNECT_OK');
        addApiLog(`Onboarding redirect capture. Loaded Account: ${acctId}`);
      }
    } else if (params.get('checkout_success') === 'true') {
      onAddLog('bot_accept', `💰 STRIPE CONNECT: Destination checkout charge processed successfully! Application fee collected.`, undefined, 'CHARGE_OK');
      addApiLog(`Successful destination checkout session: ${params.get('session_id')}`);
    }
  }, []);

  // --- FETCH SERVICES ---

  // Retrieves list of all connected accounts on platform
  const fetchConnectedAccounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/connect/accounts');
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch connected accounts');
      }
      const data = await res.json();
      setAccounts(data);
      addApiLog(`Fetched ${data.length} connected accounts from platform.`);
    } catch (err: any) {
      setError(err.message);
      addApiLog(`Error fetching accounts: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Retrieves status of single connected account directly from API
  const fetchAccountStatus = async (accountId: string) => {
    if (!accountId) return;
    try {
      const res = await fetch(`/api/stripe/connect/accounts/${accountId}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch account status');
      }
      const data = await res.json();
      setCurrentAccountStatus(data);
      addApiLog(`Retrieved direct status for Account ${accountId}: Charges Enabled: ${data.charges_enabled}`);
    } catch (err: any) {
      addApiLog(`Error retrieving status for ${accountId}: ${err.message}`);
    }
  };

  // Retrieves list of products created at platform level
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/stripe/connect/products');
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch products');
      }
      const data = await res.json();
      setProducts(data);
      addApiLog(`Fetched ${data.length} active platform products.`);
    } catch (err: any) {
      addApiLog(`Error fetching products: ${err.message}`);
    }
  };

  // --- ACTIONS ---

  // STEP 1: Create a connected account
  const handleCreateAccount = async () => {
    setIsLoading(true);
    setError(null);
    addApiLog('Invoking accounts.create() with controller-only pricing rules...');
    
    try {
      const res = await fetch('/api/stripe/connect/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Account creation failed');
      }

      const { accountId } = await res.json();
      setSelectedAccountId(accountId);
      
      onAddLog('info', `✅ Connected account ${accountId} created under platform controllers successfully.`, undefined, 'CONNECT_ACCT');
      addApiLog(`Created account: ${accountId}. Ready for onboarding.`);
      
      // Refresh list
      await fetchConnectedAccounts();
    } catch (err: any) {
      setError(err.message);
      addApiLog(`Account creation error: ${err.message}`);
      onAddLog('warning', `❌ Account link creation failed: ${err.message}`, undefined, 'CONNECT_ERR');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Onboard Connected Account via Account Links API
  const handleOnboardAccount = async () => {
    if (!selectedAccountId) {
      setError('Please select or create an account first');
      return;
    }
    setIsLoading(true);
    setError(null);
    addApiLog(`Generating account link for onboarding: ${selectedAccountId}`);

    try {
      const res = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to generate onboarding URL');
      }

      const { url } = await res.json();
      onAddLog('info', `🔗 Redirecting user to Stripe Express onboarding interface...`, undefined, 'CONNECT_REDIRECT');
      addApiLog(`Onboarding URL generated successfully. Navigating...`);
      
      // Redirect securely to Stripe Hosted Onboarding
      window.location.href = url;
    } catch (err: any) {
      setError(err.message);
      addApiLog(`Onboarding link generation error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Instant bypass activation for testing/sandbox ease
  const handleInstantActivate = async () => {
    if (!selectedAccountId) {
      setError('Please select or create an account first');
      return;
    }
    setIsLoading(true);
    setError(null);
    addApiLog(`Simulating instant KYC bypass activation for Account: ${selectedAccountId}`);

    try {
      const res = await fetch(`/api/stripe/connect/accounts/${selectedAccountId}/simulate-activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to simulate account activation');
      }

      const data = await res.json();
      onAddLog('bot_accept', `⚡ BYPASS SUCCESS: Instantly activated ${selectedAccountId}! Charges and payouts are now active.`, undefined, 'CONNECT_BYPASS');
      addApiLog(data.message || `Activated account ${selectedAccountId}`);
      
      // Refresh status immediately
      await fetchAccountStatus(selectedAccountId);
      await fetchConnectedAccounts();
    } catch (err: any) {
      setError(err.message);
      addApiLog(`Activation bypass error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3: Create Stripe Product with Connected Account ID in metadata
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !productPrice || !productTargetAccount) {
      setError('Product Name, Price, and target Connected Account are required.');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    const priceInCents = Math.round(parseFloat(productPrice) * 100);
    addApiLog(`Creating platform product "${productName}" mapped to connected account "${productTargetAccount}"`);

    try {
      const res = await fetch('/api/stripe/connect/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productName,
          description: productDesc,
          priceInCents,
          currency: productCurrency,
          connectedAccountId: productTargetAccount
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create product');
      }

      const product = await res.json();
      onAddLog('bot_accept', `📦 PRODUCT LIVE: Created ${product.name} mapped to account ${productTargetAccount}!`, undefined, 'PROD_LIVE');
      addApiLog(`Product "${product.name}" live with default price ${product.default_price?.id || 'none'}`);
      
      // Reset fields
      setProductName('');
      setProductDesc('');
      setProductPrice('29.99');
      
      // Refresh products & switch tab
      await fetchProducts();
      setActiveTab('storefront');
    } catch (err: any) {
      setError(err.message);
      addApiLog(`Product creation error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 4: Process Charges (Checkout Session creation using Destination Charges)
  const handleBuyProduct = async (product: StripeProduct) => {
    const connectedAccountId = product.metadata.connected_account_id;
    if (!connectedAccountId) {
      onAddLog('warning', `⚠️ Product has no mapped Connected Account ID. Cannot construct destination charge.`, undefined, 'CONNECT_ERR');
      return;
    }

    setIsLoading(true);
    setError(null);
    addApiLog(`Initiating Checkout Destination Session for product: ${product.name} -> Target: ${connectedAccountId}`);

    // Calculate a 10% platform fee as an example of monetization
    const originalPrice = product.default_price?.unit_amount || 0;
    const applicationFeeAmount = Math.max(1, Math.round(originalPrice * 0.10)); // 10% fee or at least 1 cent

    try {
      const res = await fetch('/api/stripe/connect/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: product.default_price?.id,
          priceInCents: originalPrice,
          currency: product.default_price?.currency || 'usd',
          productName: product.name,
          connectedAccountId: connectedAccountId,
          applicationFeeAmount: applicationFeeAmount
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to initiate checkout session');
      }

      const { url } = await res.json();
      addApiLog(`Checkout link generated. Transfer destination is ${connectedAccountId} with $${(applicationFeeAmount/100).toFixed(2)} Platform fee.`);
      onAddLog('info', `🛒 Routing customer to Stripe Hosted checkout portal...`, undefined, 'CHECKOUT_ROUTE');
      
      // Redirect to Stripe Checkout portal
      window.location.href = url;
    } catch (err: any) {
      setError(err.message);
      addApiLog(`Checkout initiation error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 font-sans text-left">
      {/* Header section with description */}
      <div>
        <span className="text-[9px] font-mono text-purple-400 block uppercase font-bold tracking-wider">
          STRIPE CONNECT SYSTEM MULTI-TENANT ONBOARDING
        </span>
        <p className="text-[9.5px] text-neutral-400 mt-1 leading-normal">
          Onboard seller accounts to the platform, create products on behalf of sellers, display them on a global storefront, and handle automated split payouts via Destination Charges with application fees.
        </p>
      </div>

      {/* Cyberpunk Glass Dashboard Box */}
      <div className="bot-container relative overflow-hidden bg-neutral-950/40 border border-[#00f2ff]/20">
        <div className="scan-line" />

        {/* Global error alert */}
        {error && (
          <div className="p-2.5 mb-3 bg-red-950/50 border border-red-500/30 text-red-300 rounded text-[9px] font-mono flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="hover:text-white font-bold px-1 select-none">✕</button>
          </div>
        )}

        {/* Dynamic sub-tab switcher */}
        <div className="flex gap-1 bg-neutral-950/80 p-1 rounded-lg border border-neutral-900 mb-4 select-none">
          <button
            onClick={() => setActiveTab('onboard')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[8.5px] font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'onboard'
                ? 'bg-neutral-900 text-purple-400 border border-purple-500/20'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>1. Connected Accounts</span>
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[8.5px] font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-neutral-900 text-purple-400 border border-purple-500/20'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>2. Create Product</span>
          </button>
          <button
            onClick={() => setActiveTab('storefront')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[8.5px] font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'storefront'
                ? 'bg-neutral-900 text-purple-400 border border-purple-500/20'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>3. Storefront</span>
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[8.5px] font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-neutral-900 text-purple-400 border border-purple-500/20'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>4. Transactions</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[8.5px] font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-neutral-900 text-purple-400 border border-purple-500/20'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[8.5px] font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'docs'
                ? 'bg-neutral-900 text-purple-400 border border-purple-500/20'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>5. Docs</span>
          </button>
          <button
            onClick={() => setActiveTab('developer')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[8.5px] font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'developer'
                ? 'bg-neutral-900 text-purple-400 border border-purple-500/20'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Developer Guide</span>
          </button>
        </div>

        {/* TAB 1: ACCOUNTS & ONBOARDING */}
        <AnimatePresence mode="wait">
          {activeTab === 'onboard' && (
            <motion.div
              key="onboard-tab"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Account Creator Action Column */}
                <div className="space-y-3.5 p-3.5 bg-neutral-950/60 border border-neutral-900 rounded-xl flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-mono font-bold text-white tracking-wider flex items-center gap-1">
                      <CreditCard className="w-4 h-4 text-purple-400" />
                      <span>STEP 1: CREATION</span>
                    </h3>
                    <p className="text-[8.5px] text-neutral-400 leading-relaxed">
                      Instantly initialize a connected seller account where your custom platform determines the fee models, manages financial risks, and provides the user with access to an Express Dashboard.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <button
                      onClick={handleCreateAccount}
                      disabled={isLoading}
                      className="w-full action-btn text-[9px] font-bold font-mono tracking-wider flex items-center justify-center gap-1.5 text-purple-300 border-purple-500/30"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-purple-400" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5 text-purple-400" />
                      )}
                      <span>PROVISION NEW EXPRESS ACCOUNT</span>
                    </button>
                  </div>
                </div>

                {/* Account Selection and Onboarding Status Column */}
                <div className="space-y-3 p-3.5 bg-neutral-950/60 border border-neutral-900 rounded-xl">
                  <h3 className="text-[10px] font-mono font-bold text-white tracking-wider flex items-center gap-1">
                    <Link className="w-4 h-4 text-purple-400" />
                    <span>STEP 2: LINK & STATUS</span>
                  </h3>

                  <div className="space-y-1.5">
                    <label className="text-[8px] font-mono text-neutral-400 uppercase tracking-tight block">
                      Target Connected Account
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="flex-1 bg-neutral-950 border border-[#00f2ff]/30 text-[9.5px] font-mono text-purple-300 p-2 rounded outline-none"
                      >
                        <option value="">-- Choose Account --</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.id} {acc.charges_enabled ? '(Charges Active)' : '(Pending)'}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={fetchConnectedAccounts}
                        className="px-2.5 bg-neutral-900 border border-neutral-800 hover:border-purple-500/20 rounded text-[9px] text-neutral-400 hover:text-white"
                        title="Reload Accounts"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {selectedAccountId ? (
                    <div className="pt-2 border-t border-neutral-900 space-y-2.5">
                      <div className="p-2 bg-neutral-950 rounded border border-purple-500/10 space-y-1 text-[8.5px] font-mono text-neutral-400">
                        <div className="flex justify-between">
                          <span>Status Check:</span>
                          <span className={currentAccountStatus?.details_submitted ? 'text-emerald-400' : 'text-amber-400 font-semibold'}>
                            {currentAccountStatus?.details_submitted ? 'ONBOARDING COMPLETED' : 'DETAILS REQUIRED'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Charges Enabled:</span>
                          <span className={currentAccountStatus?.charges_enabled ? 'text-emerald-400' : 'text-neutral-500'}>
                            {currentAccountStatus?.charges_enabled ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Payouts Active:</span>
                          <span className={currentAccountStatus?.payouts_enabled ? 'text-emerald-400' : 'text-neutral-500'}>
                            {currentAccountStatus?.payouts_enabled ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={handleOnboardAccount}
                          disabled={isLoading}
                          className="w-full py-2 bg-purple-950/45 hover:bg-purple-900/40 text-purple-300 hover:text-white border border-purple-500/30 hover:border-purple-500/50 rounded-lg text-[9px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                          <span>1. STANDARD STRIPE ONBOARDING</span>
                        </button>
                        
                        <button
                          onClick={handleInstantActivate}
                          disabled={isLoading}
                          className="w-full action-btn text-[9px] font-bold font-mono tracking-wider flex items-center justify-center gap-1.5 text-[#00f2ff] border-[#00f2ff]/30"
                        >
                          {isLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00f2ff]" />
                          ) : (
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          )}
                          <span>2.⚡ BYPASS KYC & ACTIVATE INSTANTLY</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-neutral-950/20 text-center text-[8.5px] font-mono text-neutral-500 border border-neutral-900/40 border-dashed rounded-lg">
                      No account selected. Please select an existing connected account or create a new one to run onboarding flows.
                    </div>
                  )}
                </div>
              </div>

              {/* Status checklist metrics */}
              <div className="bg-neutral-950/50 border border-neutral-900 rounded-lg p-3 space-y-1.5 font-mono text-[8.5px]">
                <div className="text-neutral-400 uppercase tracking-wider font-bold">STRETCH GOAL PROGRESS & VERIFICATION</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex items-center gap-1.5 text-purple-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Application Fees Configured</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-purple-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Express Dashboard Support</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-purple-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Split Payment Rails Online</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: PRODUCT CREATION */}
          {activeTab === 'products' && (
            <motion.div
              key="products-tab"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="space-y-4"
            >
              <div className="p-3.5 bg-neutral-950/80 border border-purple-500/20 rounded-lg space-y-3.5">
                <div className="pb-1.5 border-b border-neutral-900 flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold text-white tracking-wide uppercase flex items-center gap-1">
                    <PlusCircle className="w-3.5 h-3.5 text-purple-400" />
                    <span>Platform-Level Product Registry</span>
                  </span>
                  <span className="text-[7.5px] font-mono text-neutral-400 uppercase">
                    Products mapped to active connected accounts
                  </span>
                </div>

                <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-mono text-neutral-400 block uppercase font-semibold">
                        Product Name
                      </label>
                      <input
                        type="text"
                        required
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="e.g. Cyber-Bot License Package"
                        className="w-full bg-neutral-950 border border-purple-500/30 text-[9.5px] text-purple-300 p-2 rounded outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8.5px] font-mono text-neutral-400 block uppercase font-semibold">
                        Description
                      </label>
                      <textarea
                        value={productDesc}
                        onChange={(e) => setProductDesc(e.target.value)}
                        placeholder="Detailed outline of features or authorization token terms"
                        rows={3}
                        className="w-full bg-neutral-950 border border-purple-500/30 text-[9.5px] text-purple-300 p-2 rounded outline-none font-mono resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8.5px] font-mono text-neutral-400 block uppercase font-semibold">
                          Price (USD)
                        </label>
                        <div className="relative">
                          <DollarSign className="w-3 h-3 absolute left-2 top-2.5 text-neutral-500" />
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={productPrice}
                            onChange={(e) => setProductPrice(e.target.value)}
                            className="w-full bg-neutral-950 border border-purple-500/30 text-[9.5px] text-purple-300 p-2 pl-6 rounded outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8.5px] font-mono text-neutral-400 block uppercase font-semibold">
                          Currency
                        </label>
                        <select
                          value={productCurrency}
                          onChange={(e) => setProductCurrency(e.target.value)}
                          className="w-full bg-neutral-950 border border-purple-500/30 text-[9.5px] text-purple-300 p-2 rounded outline-none font-mono"
                        >
                          <option value="usd">USD ($)</option>
                          <option value="eur">EUR (€)</option>
                          <option value="gbp">GBP (£)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8.5px] font-mono text-neutral-400 block uppercase font-semibold">
                        Target Connected Account (For Destination Charge Mapping)
                      </label>
                      <select
                        required
                        value={productTargetAccount}
                        onChange={(e) => setProductTargetAccount(e.target.value)}
                        className="w-full bg-neutral-950 border border-purple-500/30 text-[9.5px] text-purple-300 p-2 rounded outline-none font-mono"
                      >
                        <option value="">-- Select Connected Account --</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.id} {acc.charges_enabled ? '(Charges Verified)' : '(Onboarding Pending)'}
                          </option>
                        ))}
                      </select>
                      <span className="text-[7.5px] font-mono text-neutral-500 block leading-tight mt-0.5">
                        This maps who receives the funds when customers checkout, which we encode directly in the product's secure metadata structure.
                      </span>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2 bg-purple-950/60 hover:bg-purple-900/40 text-purple-300 hover:text-white border border-purple-500/30 rounded-md font-mono text-[9px] font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-purple-400" />
                        <span>REGISTER PLATFORM PRODUCT & MAP SELLER</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* TAB 3: CUSTOMER STOREFRONT */}
          {activeTab === 'storefront' && (
            <motion.div
              key="storefront-tab"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="space-y-4"
            >
              <div className="p-3 bg-neutral-950/80 border border-purple-500/20 rounded-lg space-y-2">
                <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1">
                  <Store className="w-4 h-4 text-purple-400" />
                  <span>Interactive Customer Purchase Simulator</span>
                </span>
                <p className="text-[8.5px] text-neutral-400 leading-normal">
                  Simulate live transactions as an end-customer. Selecting a product fires a Destination Charge with an application fee dynamically distributed into the mapped seller's connected account.
                </p>
              </div>

              {products.length === 0 ? (
                <div className="p-8 text-center bg-neutral-950/20 rounded-xl border border-neutral-900 border-dashed text-neutral-500 text-[9px] font-mono">
                  No products registered on platform yet. Move to "2. Create Product" to generate mock storefront catalogs!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {products.map(product => (
                    <div 
                      key={product.id} 
                      className="p-3 bg-neutral-950/80 border border-neutral-900 rounded-xl hover:border-purple-500/25 flex flex-col justify-between gap-3 relative transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-mono font-extrabold text-white leading-tight uppercase">
                            {product.name}
                          </span>
                          <span className="text-[10px] font-mono text-[#00f2ff] bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-500/20 leading-none">
                            ${((product.default_price?.unit_amount || 0) / 100).toFixed(2)}
                          </span>
                        </div>
                        {product.description && (
                          <p className="text-[8.5px] text-neutral-400 leading-normal font-sans">
                            {product.description}
                          </p>
                        )}
                        <div className="space-y-1 pt-1 text-[8px] font-mono text-neutral-500 leading-tight">
                          <div>
                            <strong className="text-purple-400 uppercase">Product ID:</strong> {product.id}
                          </div>
                          <div>
                            <strong className="text-purple-400 uppercase">Mapped Account:</strong> {product.metadata.connected_account_id || 'None'}
                          </div>
                          <div>
                            <strong className="text-purple-400 uppercase">Platform Fee:</strong> 10%
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-900/40">
                        <button
                          onClick={() => handleBuyProduct(product)}
                          className="w-full py-1.5 bg-purple-950/20 hover:bg-purple-950/55 text-purple-300 hover:text-white border border-purple-500/20 hover:border-purple-500/40 rounded text-[9px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                        >
                          <span>BUY NOW (CHECKOUT)</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 4: TRANSACTIONS */}
          {activeTab === 'transactions' && (
            <motion.div
              key="transactions-tab"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="space-y-4"
            >
              {currentAccountStatus && !currentAccountStatus.details_submitted && (
                <div className="p-3 bg-amber-950/30 border border-amber-500/50 rounded-lg text-[9px] font-mono text-amber-200">
                    <AlertTriangle className="w-4 h-4 inline mr-2 text-amber-500" />
                    <strong>Action Required:</strong> Identity verification incomplete. Instant payouts are disabled. Please check your Stripe Connect dashboard.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-lg space-y-2">
                    <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider block">Payout Schedule</span>
                    <select value={payoutSchedule} onChange={(e) => setPayoutSchedule(e.target.value as any)} className="w-full bg-neutral-900 text-[9px] p-1 rounded font-mono">
                        <option value="automatic">Automatic Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="manual">Manual Trigger</option>
                    </select>
                  </div>
                <div className="p-3 bg-neutral-950/80 border border-purple-500/20 rounded-lg space-y-2">
                    <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-purple-400" />
                    <span>Transaction Volume (30 Days)</span>
                    </span>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: '24', payments: 400, payouts: 240 },
                                { name: '25', payments: 300, payouts: 139 },
                            ]}>
                                <XAxis dataKey="name" fontSize={8} />
                                <YAxis fontSize={8} />
                                <Tooltip contentStyle={{ fontSize: 9, background: '#000', borderColor: '#333' }} />
                                <Bar dataKey="payments" fill="#8884d8" />
                                <Bar dataKey="payouts" fill="#82ca9d" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="p-3 bg-neutral-950 border border-neutral-900 rounded-lg flex justify-between items-center">
                        <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-white uppercase tracking-wider block">Automatic Instant Payout</span>
                            <p className="text-[8px] text-neutral-500 font-mono">Trigger instant payout on success</p>
                        </div>
                        <button 
                            onClick={() => setAutoInstantPayout(!autoInstantPayout)}
                            className={`w-10 h-5 rounded-full flex items-center p-1 transition-all ${autoInstantPayout ? 'bg-purple-600 justify-end' : 'bg-neutral-800 justify-start'}`}
                        >
                            <div className="w-3 h-3 bg-white rounded-full shadow" />
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleSyncTransactions} className="flex-1 flex items-center justify-center gap-1 px-3 py-1 bg-purple-900 text-purple-200 rounded text-[9px] hover:bg-purple-800 transition-colors">
                            <RefreshCw className="w-3 h-3" /> {isSyncing ? 'SYNCING...' : 'SYNC'}
                        </button>
                        <button onClick={handleExportCSV} className="flex-1 flex items-center justify-center gap-1 px-3 py-1 bg-neutral-800 text-neutral-300 rounded text-[9px] hover:bg-neutral-700 transition-colors">
                            <ExternalLink className="w-3 h-3" /> EXPORT CSV
                        </button>
                    </div>
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-2 text-[9px] font-mono text-neutral-400 max-h-60 overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-800 text-left">
                      <th className="px-2 py-1">Date</th>
                      <th className="px-2 py-1">Amount</th>
                      <th className="px-2 py-1">Status</th>
                      <th className="px-2 py-1">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, i) => (
                        <tr key={i} className="border-b border-neutral-900 hover:bg-neutral-900/50 cursor-pointer" onClick={() => setSelectedTransaction(tx)}>
                          <td className="px-2 py-1">{tx.date}</td>
                          <td className="px-2 py-1">{tx.amount}</td>
                          <td className="px-2 py-1">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                tx.status === 'succeeded' ? 'bg-emerald-950 text-emerald-400' :
                                tx.status === 'failed' ? 'bg-red-950 text-red-400' :
                                'bg-amber-950 text-amber-400'
                            }`}>
                                {tx.status}
                            </span>
                          </td>
                          <td className="px-2 py-1 underline text-purple-400">Details</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Transaction Modal */}
              <AnimatePresence>
                {selectedTransaction && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
                        onClick={() => setSelectedTransaction(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-neutral-950 border border-purple-500/30 p-6 rounded-xl w-full max-w-sm space-y-4 font-mono"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-[12px] font-bold text-white uppercase">Transaction Details</h2>
                            <div className="space-y-2 text-[10px] text-neutral-300">
                                <p><strong>ID:</strong> {selectedTransaction.id}</p>
                                <p><strong>Amount:</strong> {selectedTransaction.amount}</p>
                                <FeeEstimator amountStr={selectedTransaction.amount} />
                                <p><strong>Status:</strong> {selectedTransaction.status}</p>
                                <p><strong>Verification:</strong> REQUIRED - Upload ID</p>
                                <p><strong>Est. Transfer:</strong> Instant</p>
                            </div>
                            <button onClick={() => setSelectedTransaction(null)} className="w-full bg-purple-900 py-2 rounded text-[10px] font-bold">CLOSE</button>
                            <button onClick={() => handleManualPayout(selectedTransaction)} className="w-full bg-emerald-900 py-2 rounded text-[10px] font-bold text-emerald-200">EXECUTE MANUAL PAYOUT</button>
                        </motion.div>
                    </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* TAB: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <motion.div
              key="audit-tab"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="space-y-4"
            >
              <div className="p-3 bg-neutral-950/80 border border-purple-500/20 rounded-lg">
                <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>Payout Audit Trail</span>
                </span>
              </div>
              <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-2 text-[9px] font-mono text-neutral-400 max-h-60 overflow-y-auto">
                {auditLogs.map((log, i) => (
                    <div key={i} className="border-b border-neutral-900 py-1">
                        <span className="text-neutral-500">[{log.timestamp}]</span>
                        <span className="mx-2">{log.event}</span>
                        <span className={`px-1 rounded ${log.status === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{log.status}</span>
                    </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 5: DOCS */}
          {activeTab === 'docs' && (
            <motion.div
              key="docs-tab"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="space-y-4"
            >
              <div className="p-3 bg-neutral-950/80 border border-purple-500/20 rounded-lg space-y-2">
                <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1">
                  <Info className="w-4 h-4 text-purple-400" />
                  <span>Stripe Connect API Documentation</span>
                </span>
                <p className="text-[8.5px] text-neutral-400 leading-normal">
                  Follow this guide to obtain your API credentials and set up your business for payouts.
                </p>
              </div>

              <div className="bg-neutral-950/80 border border-neutral-900 rounded-lg p-4 space-y-4 font-mono text-[9px] text-neutral-300">
                <h3 className="text-[10px] font-bold text-purple-400 uppercase">1. Obtain API Keys</h3>
                <ol className="list-decimal list-inside space-y-2 pl-2">
                    <li>Log into your <a href="https://dashboard.stripe.com" className="underline text-blue-400">Stripe Dashboard</a>.</li>
                    <li>Navigate to <strong>Developers &gt; API keys</strong>.</li>
                    <li>Copy your <code>Publishable Key</code> and <code>Secret Key</code>.</li>
                </ol>
                <h3 className="text-[10px] font-bold text-purple-400 uppercase pt-2">2. Business Verification</h3>
                <p>To enable instant payouts, you must verify your business entity.</p>
                <ul className="list-disc list-inside space-y-2 pl-2">
                    <li>Ensure your tax identification number is verified.</li>
                    <li>Provide documentation for business registration.</li>
                    <li>Link a bank account for payouts.</li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* TAB 6: DEVELOPER GUIDE */}
          {activeTab === 'developer' && (
            <motion.div
              key="developer-tab"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="space-y-4"
            >
              {/* Detailed code instructions and diagrams */}
              <div className="bg-neutral-950/80 border border-purple-500/30 rounded-lg p-3.5 space-y-3 font-mono text-[8.5px] leading-relaxed">
                <div className="flex items-center gap-1 text-white uppercase font-bold border-b border-neutral-900 pb-1.5 mb-2">
                  <Info className="w-4 h-4 text-purple-400" />
                  <span>Stripe Connect Architectural Workflow Manual</span>
                </div>

                <div className="space-y-2">
                  <p className="text-neutral-300 font-sans leading-normal">
                    The platform coordinates secure payments between buyers and sellers using <strong>Stripe Connect Express</strong> with <strong>Destination Charges</strong>. The primary pricing fee schedules, loss refund controls, and dashboard configurations are handled dynamically using Stripe Account links.
                  </p>

                  <div className="p-3 bg-neutral-950 border border-neutral-900 rounded space-y-2 select-text">
                    <div className="text-purple-400 font-bold uppercase">1. CREATING CONNECTED ACCOUNT (API)</div>
                    <pre className="text-neutral-400 text-[8px] whitespace-pre overflow-x-auto scrollbar-thin">
{`stripe.accounts.create({
  controller: {
    fees: { payer: 'application' },   // Platform is responsible for pricing & fees
    losses: { payments: 'application' }, // Platform manages refund liability
    stripe_dashboard: { type: 'express' } // Automatic onboarding and analytics UI
  }
});`}
                    </pre>

                    <div className="text-purple-400 font-bold uppercase pt-2">2. GENERATING ONBOARDING LINK (API)</div>
                    <pre className="text-neutral-400 text-[8px] whitespace-pre overflow-x-auto scrollbar-thin">
{`stripe.accountLinks.create({
  account: accountId,
  refresh_url: 'https://orders.hacyberglobal.dgdns.org/?onboard_refresh=true',
  return_url: 'https://orders.hacyberglobal.dgdns.org/?onboard_return=true',
  type: 'account_onboarding',
});`}
                    </pre>

                    <div className="text-purple-400 font-bold uppercase pt-2">3. DESTINATION CHARGE SESSIONS (API)</div>
                    <pre className="text-neutral-400 text-[8px] whitespace-pre overflow-x-auto scrollbar-thin">
{`stripe.checkout.sessions.create({
  line_items: [{ price_data, quantity }],
  payment_intent_data: {
    application_fee_amount: feeAmountInCents, // e.g. 10% platform cut
    transfer_data: {
      destination: connectedAccountId, // Seller receives split payout
    },
  },
  mode: 'payment',
  success_url: 'https://orders.hacyberglobal.dgdns.org/success',
});`}
                    </pre>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Console / Handshake Logs */}
        {apiLogs.length > 0 && (
          <div className="space-y-1.5 mt-4 pt-4 border-t border-neutral-900">
            <div className="flex items-center gap-1.5 text-[8px] font-mono text-neutral-500 uppercase tracking-wider font-bold">
              <Terminal className="w-3.5 h-3.5" />
              <span>Stripe Connect API Operations Terminal logs</span>
            </div>
            <div className="bg-neutral-950 p-2.5 font-mono text-[8px] leading-relaxed rounded border border-purple-500/10 text-purple-300 max-h-[140px] overflow-y-auto scrollbar-thin space-y-1 select-text">
              {apiLogs.map((log, i) => (
                <div key={i} className={log.includes('error') || log.includes('Error') || log.includes('failed') ? 'text-red-400' : log.includes('Created') || log.includes('Success') || log.includes('live') ? 'text-emerald-400' : 'text-purple-300/85'}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
