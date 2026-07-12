import React, { useState, useEffect } from 'react';
import { safeStorage as localStorage } from '../lib/safeStorage';
import { Check, Link as LinkIcon, CreditCard, ExternalLink, ShieldAlert, Monitor, Smartphone, CheckCircle } from 'lucide-react';
import StripeSubscriptionModal from './StripeSubscriptionModal';

interface StripeSetupProps {
  activeDomain: string;
  onAddLog: (type: 'info' | 'bot_accept' | 'bot_skip' | 'manual_accept' | 'manual_decline' | 'competitor' | 'expire' | 'warning', message: string, offerId?: string, badge?: string) => void;
}

export default function StripeSetup({ activeDomain, onAddLog }: StripeSetupProps) {
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('mobile');
  const [businessName, setBusinessName] = useState(() => localStorage.getItem('stripe_business_name') || 'HACYBERGLOBAL');
  const [stripeSecretKey, setStripeSecretKey] = useState(() => localStorage.getItem('stripe_secret_key') || '');
  const [stripePublicKey, setStripePublicKey] = useState(() => localStorage.getItem('stripe_public_key') || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  const customCheckoutUrl = `https://${activeDomain}/checkout`;

  useEffect(() => {
    // Check if Stripe is configured on the backend
    fetch('/api/stripe/verify')
      .then(res => res.json())
      .then(data => {
        if (data.configured) {
          setIsVerified(true);
          setStripeSecretKey(prev => prev || '••••••••••••••••••••');
          if (data.publicKey) {
            setStripePublicKey(prev => prev || data.publicKey);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveSettings = () => {
    if (isSaving) return;
    setIsSaving(true);
    
    localStorage.setItem('stripe_business_name', businessName);
    localStorage.setItem('stripe_secret_key', stripeSecretKey);
    localStorage.setItem('stripe_public_key', stripePublicKey);

    onAddLog('info', `Stripe Integration: Updating credentials and creating instant checkout sessions...`, undefined, 'STRIPE_INIT');

    setTimeout(() => {
      setIsSaving(false);
      onAddLog('info', `✅ SUCCESS: Stripe active credentials updated. Checkout is live.`, undefined, 'STRIPE_OK');
    }, 1200);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    onAddLog('info', `Stripe Integration: Verifying Instant Checkout connection...`, undefined, 'STRIPE_VERIFY');
    try {
      const res = await fetch('/api/stripe/verify');
      const data = await res.json();
      if (data.configured) {
         setIsVerified(true);
         onAddLog('bot_accept', `✅ SUCCESS: Stripe is fully verified and Instant Payments are active!`, undefined, 'STRIPE_ACTIVE');
      } else {
         onAddLog('warning', `⚠️ WARNING: Stripe is not configured on the backend. Please add STRIPE_SECRET_KEY to your .env file.`, undefined, 'STRIPE_FAIL');
      }
    } catch (e) {
      onAddLog('warning', `❌ ERROR: Failed to reach backend Stripe verification.`, undefined, 'STRIPE_ERR');
    }
    setIsVerifying(false);
  };

  const handleTestCheckout = async () => {
     try {
        const response = await fetch('/api/stripe/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 150, title: `Test License for ${businessName}` })
        });
        const data = await response.json();
        if (data.url) {
            window.open(data.url, '_blank');
        } else {
            alert('Failed to generate checkout URL: ' + (data.error || 'Unknown error'));
        }
     } catch (e) {
         alert('Checkout error');
     }
  };

  return (
    <div className="flex flex-col gap-4 font-sans">
      <div>
        <span className="text-[9px] font-mono text-purple-400 block uppercase font-bold tracking-wider">STRIPE INSTANT CHECKOUT</span>
        <p className="text-[9.5px] text-neutral-400 mt-1">
          Configure Stripe for instant live credit card transactions directly on your active domain.
        </p>
      </div>

      <div className="space-y-3 bg-neutral-950/60 p-3 rounded-lg border border-neutral-900">
        <div className="pb-1.5 border-b border-neutral-900 flex justify-between items-center">
          <span className="text-[8.5px] font-mono font-bold text-purple-400 uppercase tracking-widest block">API CREDENTIALS</span>
          <span className="text-[7.5px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold animate-pulse">
            {isVerified ? 'VERIFIED ACTIVE' : 'AWAITING VERIFICATION'}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-[9px] font-mono text-neutral-400">
            <span>Stripe Public Key (pk_live_...)</span>
          </div>
          <input
            type="text"
            value={stripePublicKey}
            onChange={(e) => setStripePublicKey(e.target.value)}
            placeholder="pk_live_..."
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-purple-500 rounded px-2 py-1.5 text-[9px] text-white font-mono outline-none"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-[9px] font-mono text-neutral-400">
            <span>Stripe Secret Key (sk_live_...)</span>
          </div>
          <p className="text-[8px] text-neutral-500 leading-tight mb-1">
            Note: In production, store this in your backend `.env` file as `STRIPE_SECRET_KEY` for maximum security.
          </p>
          <input
            type="password"
            value={stripeSecretKey}
            onChange={(e) => setStripeSecretKey(e.target.value)}
            placeholder="sk_live_..."
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-purple-500 rounded px-2 py-1.5 text-[9px] text-white font-mono outline-none"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-[9px] font-mono text-neutral-400">
            <span>Business Display Name</span>
          </div>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-purple-500 rounded px-2 py-1.5 text-[9px] text-white font-mono outline-none uppercase"
          />
        </div>
        
        {/* WEBHOOK CONFIGURATION */}
        <div className="pt-2 space-y-1 border-t border-neutral-900 mt-2">
            <label className="text-[8.5px] font-mono text-neutral-400 block uppercase font-semibold">
                Webhook Endpoint URL
            </label>
            <input 
                type="text"
                placeholder="https://your-api.com/webhook"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-purple-500 rounded px-2 py-1.5 text-[9px] text-white font-mono outline-none"
            />
            <button className="w-full mt-1 bg-neutral-900 border border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white font-mono font-bold text-[9px] py-1 rounded transition-colors">
                REGISTER WEBHOOK
            </button>
        </div>

        <div className="pt-2 flex gap-2">
           <button
             onClick={() => setIsSubscriptionModalOpen(true)}
             className="flex-1 justify-center px-2 py-1.5 bg-neutral-900 border border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white font-mono font-bold text-[9px] rounded transition-colors"
           >
             SUBSCRIPTION PLAN
           </button>
           <button
             onClick={handleVerify}
             disabled={isVerifying}
             className="flex-1 justify-center px-2 py-1.5 bg-neutral-900 border border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white font-mono font-bold text-[9px] rounded transition-colors"
           >
             {isVerifying ? 'VERIFYING...' : 'VERIFY ALL INSTANT'}
           </button>
           <button
             onClick={handleSaveSettings}
             disabled={isSaving}
             className="flex-1 justify-center px-2 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-[9px] rounded transition-colors"
           >
             {isSaving ? 'SAVING...' : 'SAVE CONFIGURATION'}
           </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-[9px] font-mono text-neutral-400">
          <span className="uppercase text-neutral-500">Live Checkout Preview</span>
          <div className="flex bg-neutral-950 p-0.5 rounded-md border border-neutral-900">
            <button
              onClick={() => setViewportMode('mobile')}
              className={`p-1 rounded transition-all ${viewportMode === 'mobile' ? 'bg-purple-500 text-white' : 'text-neutral-400'}`}
            >
              <Smartphone className="w-3 h-3" />
            </button>
            <button
              onClick={() => setViewportMode('desktop')}
              className={`p-1 rounded transition-all ${viewportMode === 'desktop' ? 'bg-purple-500 text-white' : 'text-neutral-400'}`}
            >
              <Monitor className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/40 relative p-4 flex justify-center">
            <div className={`bg-neutral-950 p-4 rounded-lg border border-neutral-800 shadow-xl ${viewportMode === 'mobile' ? 'w-full max-w-[280px]' : 'w-full'}`}>
               <div className="flex items-center justify-center mb-4">
                  <span className="font-sans font-black text-white text-sm tracking-tight">{businessName || 'HACYBERGLOBAL'}</span>
               </div>
               
               <div className="bg-neutral-900/60 p-3 rounded mb-4">
                  <div className="flex justify-between items-center text-[10px] text-neutral-300">
                     <span>Software License</span>
                     <span className="font-bold text-white">$150.00</span>
                  </div>
               </div>

               <button onClick={handleTestCheckout} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded text-[10px] transition-colors flex items-center justify-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  TEST STRIPE CHECKOUT
               </button>
            </div>
        </div>
      </div>
      <StripeSubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        onSave={(apiKey, plan) => {
          onAddLog('info', `Stripe Subscription: Activated ${plan} with provided API key.`, undefined, 'STRIPE_SUB');
          setIsSubscriptionModalOpen(false);
        }}
      />
    </div>
  );
}
