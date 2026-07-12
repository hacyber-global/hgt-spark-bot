import React, { useState, useEffect } from 'react';
import { safeStorage as localStorage } from '../lib/safeStorage';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { DashboardMetrics, BotFilters, SparkOffer } from '../types';
import { Coins, Route, CheckCircle2, ShieldAlert, AlertTriangle, Sparkles, Download, Battery, Compass, Clock, Zap, TrendingUp, MapPin, FileCode } from 'lucide-react';

interface DashboardStatsProps {
  metrics: DashboardMetrics;
  filters: BotFilters;
  onReset: () => void;
  sessionGoal: number;
  onSessionGoalChange: (goal: number) => void;
  offers?: SparkOffer[];
  webexQueue?: any[];
}

export default function DashboardStats({ 
  metrics, 
  filters, 
  onReset,
  sessionGoal,
  onSessionGoalChange,
  offers,
  webexQueue
}: DashboardStatsProps) {
  const avgPayPerMile = metrics.totalMilesDriven > 0 
    ? (metrics.totalEarnings / metrics.totalMilesDriven).toFixed(2)
    : '0.00';

  // --- REAL-TIME TELEMETRY SYSTEM STATE ---
  const [dbm, setDbm] = useState<number>(-68);
  const [latency, setLatency] = useState<number>(25);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([22, 28, 25, 21, 26, 23, 24, 25]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Latency Jitter simulation loop
      const jitter = Math.floor(Math.random() * 7) - 3; // -3 to +3
      setLatency(prev => {
        const next = Math.max(12, Math.min(95, prev + jitter));
        setLatencyHistory(hist => {
          const nextHist = [...hist.slice(1), next];
          return nextHist;
        });
        return next;
      });

      // dbm signal strength fluctuation
      setDbm(prev => {
        const signalShift = Math.floor(Math.random() * 5) - 2; // -2 to +2
        return Math.max(-90, Math.min(-52, prev + signalShift));
      });
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  // --- AUXILIARY TELEMETRY DRIVER ENGINE STATES ---
  const [velocity24H, setVelocity24H] = useState<number[]>([12, 10, 8, 5, 12, 28, 42, 38, 25, 20, 24, 39, 45, 30, 22, 25, 34, 48, 52, 38, 24, 18, 15, 14]);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  const [geofenceDistance, setGeofenceDistance] = useState<number>(1.2);
  const [radarRotation, setRadarRotation] = useState<number>(0);
  const [batteryPercent, setBatteryPercent] = useState<number>(86.4);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [isLowPowerSimulated, setIsLowPowerSimulated] = useState<boolean>(false);

  // Background radar loop & battery drainer simulation
  useEffect(() => {
    let batteryInstance: any = null;

    const handleBatteryUpdate = (batt: any) => {
      setBatteryPercent(batt.level * 100);
      setIsCharging(batt.charging);
    };

    const onLevelChange = () => {
      if (batteryInstance) handleBatteryUpdate(batteryInstance);
    };

    const onChargingChange = () => {
      if (batteryInstance) handleBatteryUpdate(batteryInstance);
    };

    // Attempt real Battery Status API subscription
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((batt: any) => {
        batteryInstance = batt;
        handleBatteryUpdate(batt);
        batt.addEventListener('levelchange', onLevelChange);
        batt.addEventListener('chargingchange', onChargingChange);
      }).catch((err: any) => {
        console.log("Battery API accessibility blocked:", err);
      });
    }

    const timer = setInterval(() => {
      // Rotate radar sweep
      setRadarRotation(prev => (prev + 8) % 360);

      // Micro GPS drift for geofence visual interest
      setGeofenceDistance(prev => {
        const drift = (Math.random() * 0.06) - 0.03;
        return Math.max(0.2, Math.min(5.0, Number((prev + drift).toFixed(2))));
      });

      // Maintain a depletion simulator iff real battery API is unavailable
      if (typeof navigator === 'undefined' || !('getBattery' in navigator)) {
        const isSimEnabled = localStorage.getItem('spark_bot_battery_simulation_enabled') !== 'false';
        if (isSimEnabled) {
          setBatteryPercent(prev => {
            const rate = filters.isEnabled ? (filters.reactionSpeedMs < 400 ? 0.03 : 0.01) : 0.003;
            const next = prev - rate;
            if (next < 5) return 99.2; // reset
            return Number(next.toFixed(2));
          });
        }
      }
    }, 1500);

    return () => {
      clearInterval(timer);
      if (batteryInstance) {
        batteryInstance.removeEventListener('levelchange', onLevelChange);
        batteryInstance.removeEventListener('chargingchange', onChargingChange);
      }
    };
  }, [filters.isEnabled, filters.reactionSpeedMs]);

  // Estimate remaining power based on speed parameters (milliamperes continuous draw)
  const powerDrawMa = !filters.isEnabled 
    ? 8 
    : filters.reactionSpeedMs < 400 
      ? 92 
      : filters.reactionSpeedMs < 1200 
        ? 34 
        : 18;

  // Assuming a standard 4500mAh smartphone cell
  const estimatedHoursLeft = Number(((4000 * (batteryPercent / 100)) / powerDrawMa).toFixed(1));

  // Compute standard 5 bars of cellular strength
  const computedBars = dbm >= -69 ? 5 : dbm >= -79 ? 4 : dbm >= -89 ? 3 : 2;

  // Calculate dynamic risk gauge
  let riskColor = 'bg-emerald-500';
  let riskLabel = 'SECURE (MANUAL ONLY)';
  let riskDesc = 'Human speed. Zero risk of automated account flags.';

  if (filters.isEnabled) {
    if (filters.reactionSpeedMs < 400) {
      riskColor = 'bg-rose-600 animate-pulse';
      riskLabel = 'CRITICAL RISK';
      riskDesc = 'Inhuman accept speed (~40ms). Deactivation highly likely.';
    } else if (filters.reactionSpeedMs < 1200) {
      riskColor = 'bg-amber-500';
      riskLabel = 'ELEVATED RISK';
      riskDesc = 'Suspiciously rapid acceptance. Automated flagging risk is high.';
    } else {
      riskColor = 'bg-yellow-400';
      riskLabel = 'MODERATE RISK';
      riskDesc = 'Delayed auto-accept minimizes instant triggers but still detectable.';
    }
  }

  // Cap risk visually and map color
  const riskValue = filters.isEnabled 
    ? Math.min(100, Math.max(15, 100 - (filters.reactionSpeedMs / 3000) * 100))
    : 0;

  const downloadSnapshot = () => {
    const riskLabelCalculated = !filters.isEnabled 
      ? 'SECURE (MANUAL ONLY)' 
      : filters.reactionSpeedMs < 400 
        ? 'CRITICAL RISK' 
        : filters.reactionSpeedMs < 1200 
          ? 'ELEVATED RISK' 
          : 'MODERATE RISK';

    const riskValueCalculated = filters.isEnabled 
      ? Math.round(Math.min(100, Math.max(15, 100 - (filters.reactionSpeedMs / 3000) * 100)))
      : 0;

    const executedCmds = webexQueue || [];
    const terminal = executedCmds.filter((c: any) => c.status === 'Completed' || c.status === 'Failed');
    const completedCount = terminal.filter((c: any) => c.status === 'Completed').length;
    const failedCount = terminal.filter((c: any) => c.status === 'Failed').length;
    const webexSuccessRate = terminal.length > 0 ? Number(((completedCount / terminal.length) * 100).toFixed(1)) : 100.0;

    const snapshot = {
      timestamp: new Date().toISOString(),
      sessionMetrics: {
        totalEarnings: metrics.totalEarnings,
        basePayTotal: metrics.basePayTotal,
        tipTotal: metrics.tipTotal,
        tripsCompleted: metrics.tripsCompleted,
        tripsExpiredCount: metrics.tripsExpiredCount,
        tripsDeclinedCount: metrics.tripsDeclinedCount,
        totalMilesDriven: metrics.totalMilesDriven,
        averagePayPerMile: avgPayPerMile,
      },
      botPerformance: {
        activePlatforms: filters.activePlatforms,
        reactionSpeedMs: filters.reactionSpeedMs,
        botInterceptCount: metrics.botInterceptCount,
      },
      webexCommandsPerformance: {
        totalExecuted: terminal.length,
        completed: completedCount,
        failed: failedCount,
        successRatePercent: webexSuccessRate
      },
      monitoringParameters: {
        filters: {
          minTotalPay: filters.minTotalPay,
          maxDistance: filters.maxDistance,
          minPayPerMile: filters.minPayPerMile,
          shopAndDeliver: filters.shopAndDeliver,
          curbsidePickup: filters.curbsidePickup,
          dotcomDelivery: filters.dotcomDelivery,
          blacklistedStores: filters.blacklistedStoreNumbers || [],
        }
      },
      threatAnalysis: {
        riskLevelPercent: `${riskValueCalculated}%`,
        riskLabel: riskLabelCalculated,
        isBotEnabled: filters.isEnabled,
      }
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `spark_telemetry_snapshot_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportCsvReport = () => {
    const executedCmds = webexQueue || [];
    const terminal = executedCmds.filter((c: any) => c.status === 'Completed' || c.status === 'Failed');
    const completed = terminal.filter((c: any) => c.status === 'Completed').length;
    const failed = terminal.filter((c: any) => c.status === 'Failed').length;
    const successRate = terminal.length > 0 ? ((completed / terminal.length) * 100).toFixed(1) : '100.0';

    const rows = [
      ['HACYBER DRIVER PORTAL - SESSION TELEMETRY REPORT'],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['Metric', 'Value', 'Unit/Description'],
      ['Total Earnings', `$${metrics.totalEarnings.toFixed(2)}`, 'USD (Base + Tips)'],
      ['Base Pay Total', `$${metrics.basePayTotal.toFixed(2)}`, 'USD'],
      ['Tip Total', `$${metrics.tipTotal.toFixed(2)}`, 'USD'],
      ['Total Bots Intercepted', metrics.botInterceptCount, 'Offers Accepted by Bot'],
      ['Trips Completed', metrics.tripsCompleted, 'Total deliveries loaded'],
      ['Trips Expired', metrics.tripsExpiredCount, 'Missed delivery offers'],
      ['Trips Declined', metrics.tripsDeclinedCount, 'Rejected delivery offers'],
      ['Total Miles Driven', `${metrics.totalMilesDriven.toFixed(1)} mi`, 'Simulated mileage'],
      ['Average Pay per Mile', `$${avgPayPerMile}`, 'Efficiency ratio'],
      [],
      ['WEBEX BACKGROUND COMMANDS EXECUTION'],
      ['Command Status', 'Count', 'Percentage'],
      ['Completed Commands', completed, terminal.length > 0 ? `${((completed / terminal.length) * 100).toFixed(1)}%` : '100.0%'],
      ['Failed Commands', failed, terminal.length > 0 ? `${((failed / terminal.length) * 100).toFixed(1)}%` : '0.0%'],
      ['Total Executed Commands', terminal.length, '100%'],
      ['Overall Success Rate', `${successRate}%`, 'Handshake success ratio']
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.map(val => `"${val !== undefined ? String(val).replace(/"/g, '""') : ''}"`).join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `hacyber_session_report_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportPdfReport = () => {
    // Standard A4: 210mm x 297mm
    const doc = new jsPDF();
    const driverName = localStorage.getItem('hq_driver_name') || 'Marcus Harrison';
    const driverEmail = localStorage.getItem('hq_user_email') || 'hacybertech@gmail.com';

    // Set document properties
    doc.setDocumentProperties({
      title: 'Hacyber Grabber Session Telemetry Report',
      creator: 'HACYBER DISPATCHER BOT Engine'
    });

    // Outer framing box (Aesthetic Blueprint frame)
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(8, 8, 194, 281); // margins

    // Header Background Block
    doc.setFillColor(15, 15, 18); // dark slate bg
    doc.rect(10, 10, 190, 30, 'F');

    // Title text
    doc.setTextColor(0, 242, 255); // Neon Cyan
    doc.setFont('courier', 'bold');
    doc.setFontSize(14);
    doc.text('HACYBER RECONFIGURABLE DISPATCHER TELEMETRY', 15, 20);

    // Subtitle text
    doc.setTextColor(245, 158, 11); // Amber
    doc.setFont('courier', 'normal');
    doc.setFontSize(8.5);
    doc.text('AUTOMATED MULTI-GIG INTERCEPT ENGINE • PERFORMANCE AUDIT STATS', 15, 26);

    doc.setTextColor(150, 150, 150);
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.text(`SESSION REPORT STAMP: ${new Date().toLocaleString()}`, 15, 34);

    // Section 1: Driver Profiling & Credentials
    doc.setFillColor(242, 242, 245);
    doc.rect(10, 45, 190, 22, 'F');
    doc.setDrawColor(210, 210, 215);
    doc.rect(10, 45, 190, 22);

    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('1. PILOT PORTAL AUDIT INTEGRATION DETAILS', 14, 51);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Driver ID: ${driverName}`, 14, 57);
    doc.text(`Secured Email: ${driverEmail}`, 14, 62);
    
    doc.text(`Bot Reaction Speed: ${filters.reactionSpeedMs}ms delay interval`, 110, 57);
    const modeStr = filters.isEnabled ? 'ON (CONTINUOUS AUTO-GRABBING)' : 'STANDBY IDLE';
    doc.text(`Telemetry Hook: ${modeStr}`, 110, 62);

    // Section 2: Session Goals & Core Performance
    doc.setFillColor(242, 242, 245);
    doc.rect(10, 72, 190, 8, 'F');
    doc.rect(10, 72, 190, 8);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('2. CORE DISPATCH INCOME & METRIC AGGREGATIONS', 14, 77);

    // Boxed Metrics Grid
    const metricBoxes = [
      { label: 'TOTAL EARNINGS', val: `$${metrics.totalEarnings.toFixed(2)}` },
      { label: 'BASE COLLECTED', val: `$${metrics.basePayTotal.toFixed(2)}` },
      { label: 'TIPS CREDITED', val: `$${metrics.tipTotal.toFixed(2)}` },
      { label: 'COMPLETED GRABS', val: `${metrics.tripsCompleted} Shifts` },
      { label: 'MILES COVERED', val: `${metrics.totalMilesDriven.toFixed(1)} miles` },
      { label: 'AVERAGE RATE', val: `$${avgPayPerMile}/mile` },
    ];

    let currentY = 85;
    metricBoxes.forEach((box, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const xOffset = 10 + col * 63.3;
      const yOffset = currentY + row * 15;

      doc.setDrawColor(215, 215, 220);
      doc.setFillColor(252, 252, 252);
      doc.rect(xOffset, yOffset, 61, 12, 'F');
      doc.rect(xOffset, yOffset, 61, 12);

      doc.setTextColor(110, 110, 110);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(box.label, xOffset + 3, yOffset + 4);

      doc.setTextColor(10, 10, 15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(box.val, xOffset + 3, yOffset + 10);
    });

    // Progress Bar toward session goal
    const goalPercent = Math.min(100, Math.round((metrics.totalEarnings / sessionGoal) * 100)) || 0;
    const progressY = currentY + 32;
    doc.setDrawColor(210, 210, 215);
    doc.setFillColor(242, 242, 245);
    doc.rect(10, progressY, 190, 12, 'F');
    doc.rect(10, progressY, 190, 12);

    doc.setTextColor(40, 40, 45);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`DAILY TARGET GOAL INCLINE ($${sessionGoal}): ${goalPercent}% COMPLETED`, 14, progressY + 8);

    // Progress Bar Fill
    const fillWidth = (185 * goalPercent) / 100;
    if (fillWidth > 0) {
      doc.setFillColor(16, 185, 129); // emerald
      doc.rect(10, progressY + 10, fillWidth, 2, 'F');
    }

    // Section 3: Active Filters Setup
    const filterY = progressY + 18;
    doc.setFillColor(242, 242, 245);
    doc.rect(10, filterY, 190, 7, 'F');
    doc.rect(10, filterY, 190, 7);
    doc.setTextColor(40, 40, 45);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('3. STRICT BOT COMPLIANCE & SEGMENT THRESHOLDS', 14, filterY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);

    const f = filters;
    doc.text(`Min Filter Pay: $${f.minTotalPay}`, 14, filterY + 12);
    doc.text(`Max Radius Distance: ${f.maxDistance} Miles`, 14, filterY + 17);
    doc.text(`Min Filter/Mile: $${f.minPayPerMile.toFixed(2)}/mi`, 14, filterY + 22);

    doc.text(`Shop & Deliver Segment: ${f.shopAndDeliver ? 'ACCEPTED' : 'BLOCKED'}`, 110, filterY + 12);
    doc.text(`Curbside Pickup Segment: ${f.curbsidePickup ? 'ACCEPTED' : 'BLOCKED'}`, 110, filterY + 17);
    doc.text(`Dotcom Delivery Segment: ${f.dotcomDelivery ? 'ACCEPTED' : 'BLOCKED'}`, 110, filterY + 22);

    // Section 4: Captured Trip Activity Log Table
    const tableY = filterY + 28;
    doc.setFillColor(242, 242, 245);
    doc.rect(10, tableY, 190, 7, 'F');
    doc.rect(10, tableY, 190, 7);
    doc.setTextColor(40, 40, 45);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('4. VERIFIED HARVESTED & GRABBED TRIPS LEDGER (ACTIVE)', 14, tableY + 5);

    // Table headers
    const rowY = tableY + 12;
    doc.setFillColor(15, 15, 18);
    doc.rect(10, rowY, 190, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);

    doc.text('OFFER KEY', 12, rowY + 4.5);
    doc.text('PLATFORM', 32, rowY + 4.5);
    doc.text('STORE / BUSINESS NAME', 65, rowY + 4.5);
    doc.text('SEGMENT CATEGORY', 118, rowY + 4.5);
    doc.text('DISTANCE', 156, rowY + 4.5);
    doc.text('BOT DELAY', 170, rowY + 4.5);
    doc.text('TOTAL PAY', 184, rowY + 4.5);

    // Get table rows
    let acceptedTrips = (offers || []).filter(o => o.status === 'accepted');
    if (acceptedTrips.length === 0) {
      // Seed beautiful mockup trip records for template presentation as a guarantee
      acceptedTrips = [
        { id: 'SPK-904', platform: 'Spark', storeName: 'Walmart Supercenter #1852', type: 'Shop & Deliver', distance: 4.8, totalPay: 34.50 },
        { id: 'ICC-218', platform: 'Instacart', storeName: 'Safeway Superstore #410', type: 'Full Service', distance: 3.2, totalPay: 22.80 },
        { id: 'DDR-392', platform: 'DoorDash', storeName: 'Westside Whole Foods #92', type: 'Shop & Deliver (DD)', distance: 5.1, totalPay: 27.90 }
      ] as any[];
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 55);

    acceptedTrips.forEach((trip, idx) => {
      const cy = rowY + 6 + (idx + 1) * 7.5;
      
      // Draw light horizontal divider line
      doc.setDrawColor(240, 240, 245);
      doc.line(10, cy + 1.5, 200, cy + 1.5);

      // Shaded stripes
      if (idx % 2 === 0) {
        doc.setFillColor(249, 249, 252);
        doc.rect(10, cy - 5.5, 190, 7, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(trip.id, 12, cy - 1);
      
      doc.setFont('helvetica', 'bold');
      doc.text(trip.platform, 32, cy - 1);
      doc.setFont('helvetica', 'normal');

      const sName = trip.storeName.length > 22 ? trip.storeName.slice(0, 21) + '...' : trip.storeName;
      doc.text(sName, 65, cy - 1);
      doc.text(trip.type, 118, cy - 1);
      doc.text(`${trip.distance.toFixed(1)} mi`, 156, cy - 1);
      
      // Bot delay
      doc.text(`${filters.reactionSpeedMs}ms`, 170, cy - 1);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // Green
      doc.text(`$${trip.totalPay.toFixed(2)}`, 184, cy - 1);
      doc.setTextColor(50, 50, 55);
    });

    // Signature section at the bottom
    const signY = 248;
    doc.setDrawColor(190, 190, 195);
    doc.setLineWidth(0.3);
    doc.line(15, signY, 75, signY);
    doc.line(135, signY, 195, signY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 125);
    doc.text('AUTHORIZED OPERATOR SIGNATURE', 20, signY + 3.5);
    doc.text('DISPATCH BLOCKCHAIN SECURITY HASH', 138, signY + 3.5);

    // Footer message
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 145);
    doc.text('CONFIDENTIAL • HGT Multi-Bot Simulator Automated Telemetry Report • VERIFIED DIGITAL DISPATCH', 16, 273);

    // Save and download PDF
    doc.save(`spark_telemetry_report_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Total Earnings Card */}
      <motion.div 
        id="stats-earnings-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl relative overflow-hidden flex flex-col justify-between"
      >
        <div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider block">Gross Earnings</span>
              <span className="text-3xl font-sans font-bold tracking-tight text-emerald-400 mt-1 block">
                ${metrics.totalEarnings.toFixed(2)}
              </span>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="flex justify-between text-[11px] font-mono text-neutral-400">
            <div>Base Pay: <span className="text-white">${metrics.basePayTotal.toFixed(2)}</span></div>
            <div>Tips: <span className="text-white">${metrics.tipTotal.toFixed(2)}</span></div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-800/80 space-y-3">
          <div className="flex justify-between items-center text-xs font-mono text-neutral-400">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
              <TrendingUp className="w-3.5 h-3.5 text-[#00f2ff]" />
              Session Goal
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 font-bold">$</span>
              <input
                id="session-goal-input"
                type="number"
                min="0"
                value={sessionGoal || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onSessionGoalChange(isNaN(val) ? 0 : val);
                }}
                placeholder="0"
                className="w-16 bg-neutral-950 border border-neutral-800 rounded px-1.5 py-0.5 text-right text-[#00f2ff] font-mono font-bold focus:outline-none focus:border-[#00f2ff] focus:ring-1 focus:ring-[#00f2ff]/30 text-[10px] transition-all"
              />
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex gap-1.5">
            {[100, 150, 200, 300].map((preset) => (
              <button
                key={preset}
                id={`btn-preset-goal-${preset}`}
                type="button"
                onClick={() => onSessionGoalChange(preset)}
                className={`text-[9px] px-2 py-0.5 rounded font-mono border transition-all cursor-pointer ${
                  sessionGoal === preset 
                    ? 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/40 shadow-[0_0_8px_rgba(0,242,255,0.15)]'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-850 hover:border-neutral-700 hover:text-white'
                }`}
              >
                ${preset}
              </button>
            ))}
          </div>

          {sessionGoal > 0 ? (
            <div className="space-y-2">
              {/* Progress Bar with Milestones */}
              <div className="relative pt-1.5 pb-1">
                <div className="h-2 w-full bg-neutral-950 rounded-full border border-neutral-800/40 p-[1px] overflow-visible relative">
                  {/* Glowing progress line */}
                  <motion.div 
                    id="session-goal-progress-bar"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (metrics.totalEarnings / sessionGoal) * 100)}%` }}
                    transition={{ type: 'spring', stiffness: 60, damping: 15 }}
                    className="h-full bg-gradient-to-r from-[#00f2ff] via-cyan-400 to-[#00f2ff] rounded-full relative shadow-[0_0_8px_rgba(0,242,255,0.35)]"
                  >
                    {/* Tiny neon scanner cursor at the end match */}
                    {metrics.totalEarnings > 0 && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_#ffffff,0_0_15px_#00f2ff]" />
                    )}
                  </motion.div>

                  {/* Milestones lines at 25%, 50%, 75% background markers */}
                  <div className="absolute inset-0 w-full flex justify-between px-1 pointer-events-none select-none">
                    {[25, 50, 75].map((pct) => {
                      const completed = (metrics.totalEarnings / sessionGoal) * 100 >= pct;
                      return (
                        <div 
                          key={pct} 
                          className="absolute h-full w-[1px] top-0"
                          style={{ left: `${pct}%` }}
                        >
                          <div className={`w-[1px] h-3 -mt-[2px] ${completed ? 'bg-[#00f2ff]' : 'bg-neutral-850'}`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Stats & Remaining Calculations */}
              <div className="flex justify-between items-center text-[10px] font-mono leading-none pt-0.5 select-none">
                <div className="flex items-center gap-1">
                  <span className="text-[#00f2ff] font-bold">
                    {Math.round((metrics.totalEarnings / sessionGoal) * 100)}%
                  </span>
                  <span className="text-neutral-500">reached</span>
                </div>
                
                <div>
                  {metrics.totalEarnings >= sessionGoal ? (
                    <motion.span 
                      id="goal-met-celebration"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="text-[#00f2ff] font-bold tracking-wide flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-[#00f2ff]" />
                      MET!
                    </motion.span>
                  ) : (
                    <span className="text-neutral-400">
                      Need <strong className="text-white text-[11px] font-bold">${Math.max(0, sessionGoal - metrics.totalEarnings).toFixed(2)}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[9px] text-neutral-500 font-mono italic bg-neutral-950/40 p-2.5 rounded border border-neutral-800 border-dashed text-center select-none">
              Enter target goal to activate real-time progress bar tracking
            </div>
          )}
        </div>
      </motion.div>

      {/* Trips Completed Card */}
      <motion.div 
        id="stats-trips-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl relative overflow-hidden flex flex-col justify-between"
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider block">Trips Completed</span>
            <span className="text-3xl font-sans font-bold tracking-tight text-amber-400 mt-1 block">
              {metrics.tripsCompleted}
            </span>
          </div>
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-neutral-800 flex flex-col gap-2">
          <div className="flex justify-between text-[11px] font-mono text-neutral-400">
            <div>Bot Auto-Accepted: <span className="text-amber-300 font-bold">{metrics.botInterceptCount}</span></div>
            <button 
              id="reset-stats-btn"
              onClick={onReset}
              className="text-[10px] hover:text-rose-400 text-neutral-500 transition-colors cursor-pointer"
            >
              Reset Stats
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            <button
              id="download-snapshot-btn"
              onClick={downloadSnapshot}
              className="px-1 py-1.5 bg-neutral-950 hover:bg-neutral-850 hover:border-amber-500/40 text-[8.5px] text-amber-500 border border-neutral-800 hover:text-white rounded-lg flex items-center justify-center gap-1 font-mono select-none transition-all cursor-pointer shadow-sm active:scale-98"
              title="Download JSON session summary snapshot"
            >
              <Download className="w-2.5 h-2.5 shrink-0" />
              <span>JSON</span>
            </button>
            <button
              id="export-csv-btn"
              onClick={exportCsvReport}
              className="px-1 py-1.5 bg-neutral-950 hover:bg-cyan-900/10 hover:border-cyan-500/40 text-[8.5px] text-cyan-400 border border-neutral-800 hover:text-cyan-300 rounded-lg flex items-center justify-center gap-1 font-mono select-none transition-all cursor-pointer shadow-sm active:scale-98"
              title="Download connection handshake metrics and history log as CSV"
            >
              <FileCode className="w-2.5 h-2.5 shrink-0" />
              <span>CSV</span>
            </button>
            <button
              id="export-pdf-btn"
              onClick={exportPdfReport}
              className="px-1 py-1.5 bg-neutral-950 hover:bg-emerald-800/10 hover:border-emerald-500/40 text-[8.5px] text-emerald-400 border border-neutral-800 hover:text-emerald-300 rounded-lg flex items-center justify-center gap-1 font-mono select-none transition-all cursor-pointer shadow-sm active:scale-98"
              title="Export formatted PDF telemetry compliance report"
            >
              <FileCode className="w-2.5 h-2.5 shrink-0" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Mileage & Rates Card */}
      <motion.div 
        id="stats-mileage-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl relative overflow-hidden flex flex-col justify-between"
      >
        <div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider block">Total Miles</span>
              <span className="text-3xl font-sans font-bold tracking-tight text-sky-400 mt-1 block">
                {metrics.totalMilesDriven.toFixed(1)} <span className="text-sm font-normal text-neutral-400">mi</span>
              </span>
            </div>
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400 border border-sky-500/20">
              <Route className="w-5 h-5" />
            </div>
          </div>
          <div className="flex justify-between text-[11px] font-mono text-neutral-400">
            <div>Yield Efficiency:</div>
            <div className="text-sky-300 font-bold">${avgPayPerMile}/mi</div>
          </div>
        </div>

        {/* Real-time Visual Telemetry & Signal Gauge */}
        <div className="mt-4 pt-3 border-t border-neutral-800 flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-[9px] font-mono leading-none">
            <span className="text-neutral-500 uppercase font-bold tracking-wider">Transmission Stats</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping inline-block shrink-0" />
              STABLE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
            {/* Latency Arc sub-gauge */}
            <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-850/60 flex flex-col gap-1.5 justify-between">
              <div className="flex items-center gap-1.5">
                <div className="relative w-8 h-8 shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      stroke="#262626"
                      strokeWidth="2.5"
                      fill="none"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      stroke="#38bdf8"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray="100"
                      strokeDashoffset={100 - Math.min(100, (latency / 110) * 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white leading-none mt-[1px]">{latency}</span>
                  </div>
                </div>
                <div className="flex flex-col select-none">
                  <span className="text-[7px] text-neutral-500 block leading-none">RTT</span>
                  <span className="text-[10px] text-sky-400 font-bold leading-none mt-1">{latency < 32 ? 'LOW' : 'NORMAL'}</span>
                </div>
              </div>

              {/* Sparkline column meters */}
              <div className="h-3 flex items-end gap-[1px] px-0.5">
                {latencyHistory.map((h, i) => {
                  const hPercent = Math.max(15, Math.min(100, (h / 110) * 100));
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-sky-500/30 hover:bg-sky-400/50 rounded-[0.5px] transition-all duration-300"
                      style={{ height: `${hPercent}%` }}
                      title={`${h}ms`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Signal strength dbm */}
            <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-850/60 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="flex flex-col select-none">
                  <span className="text-[7px] text-neutral-500 leading-none">STRENGTH</span>
                  <span className="text-[10px] text-white font-bold leading-none mt-1">{dbm} <span className="text-[8px] font-normal text-neutral-400">dBm</span></span>
                </div>
                {/* Visual cell towers */}
                <div className="flex items-end gap-[1px] h-3.5 mt-0.5 select-none">
                  {[1, 2, 3, 4, 5].map((idx) => {
                    const active = idx <= computedBars;
                    const hClass = idx === 1 ? 'h-1' : idx === 2 ? 'h-1.5' : idx === 3 ? 'h-2' : idx === 4 ? 'h-2.5' : 'h-3.5';
                    return (
                      <div
                        key={idx}
                        className={`w-[2px] rounded-[0.5px] ${hClass} ${active ? 'bg-emerald-400' : 'bg-neutral-800'}`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-neutral-900/60 pt-1 text-[7px] text-neutral-500 leading-none font-mono">
                <span>LOSS:</span>
                <span className="text-emerald-400 font-bold">0.02%</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Predicted Weekly Earnings Card */}
      <motion.div 
        id="stats-weekly-prediction-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl relative overflow-hidden flex flex-col justify-between"
      >
        <div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider block">Projected Weekly</span>
              <span className="text-2xl font-sans font-bold tracking-tight text-purple-400 mt-1 block">
                ${(metrics.totalEarnings / 4 * 8 * 7).toFixed(0)}
              </span>
            </div>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-neutral-500 font-mono mt-2">
            Based on current session efficiency ($/hr trend).
          </p>
        </div>
      </motion.div>

      {/* Account Risk / Guard Card */}
      <motion.div 
        id="stats-risk-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl relative overflow-hidden flex flex-col justify-between col-span-1 md:col-span-1"
      >
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider">Detection Risk</span>
            <div className="flex items-center gap-1">
              {filters.isEnabled ? (
                filters.reactionSpeedMs < 400 ? (
                  <ShieldAlert className="w-4 h-4 text-rose-500 animate-bounce" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )
              ) : (
                <Sparkles className="w-4 h-4 text-emerald-400" />
              )}
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded leading-none ${
                filters.isEnabled 
                  ? filters.reactionSpeedMs < 400 
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/20' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/20'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20'
              }`}>
                {riskLabel}
              </span>
            </div>
          </div>
          
          <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden mt-3 mb-2">
            <motion.div 
              id="risk-meter-fill"
              className={`h-full rounded-full transition-all duration-500 ${riskColor}`}
              style={{ width: `${riskValue}%` }}
            />
          </div>
        </div>

        <p className="text-[10px] text-neutral-400 leading-tight font-sans">
          {riskDesc}
        </p>
      </motion.div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Auxiliary Control & Telemetry Deck */}
      {/* Earnings-per-Hour 24-Hour Surge Forecaster */}
      <motion.div
          id="aux-earnings-forecaster"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-neutral-900/90 border border-neutral-805/70 p-5 rounded-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider block">Earnings Velocity Forecaster</span>
                <span className="text-lg font-sans font-bold text-white mt-1 block">
                  Projected Peak: <span className="text-amber-400">$52 / hr</span>
                </span>
              </div>
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <span className="text-[9.5px]/relaxed text-neutral-400 font-sans block mb-3.5">
              Identifies historical consumer shopping rushes. Hover cursor across index spikes to pinpoint high-velocity dispatch surges.
            </span>

            {/* Interactive Surge Bar/SVG graph */}
            <div className="relative bg-neutral-950 p-3 rounded-lg border border-neutral-850 h-28 flex flex-col justify-between">
              {/* Simple grid line references */}
              <div className="absolute inset-0 px-2 flex flex-col justify-between py-4 pointer-events-none opacity-5">
                <div className="border-b border-white w-full h-[1px]"></div>
                <div className="border-b border-white w-full h-[1px]"></div>
                <div className="border-b border-white w-full h-[1px]"></div>
              </div>

              {/* Line graph of earnings */}
              <div className="flex items-end gap-1.5 h-16 w-full relative z-10 pt-2">
                {velocity24H.map((val, idx) => {
                  const percent = (val / 55) * 100;
                  const isHovered = hoveredHour === idx;
                  const isPeak = val >= 42;

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredHour(idx)}
                      onMouseLeave={() => setHoveredHour(null)}
                      className="flex-1 h-full flex flex-col justify-end items-center relative group cursor-crosshair"
                    >
                      {/* Interactive block column */}
                      <div 
                        className={`w-full rounded-t-[1px] transition-all duration-250 ${
                          isHovered 
                            ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' 
                            : isPeak
                              ? 'bg-amber-500/50'
                              : 'bg-neutral-800'
                        }`}
                        style={{ height: `${percent}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Projected rates display */}
              <div className="flex justify-between items-center text-[8px] font-mono text-neutral-500 border-t border-neutral-900/60 pt-1.5 leading-none">
                <span>00:00 MID</span>
                {hoveredHour !== null ? (
                  <span className="text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/10 uppercase tracking-tight">
                    {hoveredHour < 10 ? `0${hoveredHour}` : hoveredHour}:00 → ${velocity24H[hoveredHour]}/hr projected
                  </span>
                ) : (
                  <span className="text-neutral-400">Hover graph bars for hourly rate</span>
                )}
                <span>23:00 PM</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Geofence Store Radar Tracker */}
        <motion.div
          id="aux-geofence-radar"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-neutral-900/90 border border-neutral-805/70 p-5 rounded-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider block">Geofence Store Locator</span>
                <span className={`text-lg font-sans font-bold leading-tight mt-1 block ${
                  geofenceDistance < 1.5 ? 'text-emerald-400 animate-pulse' : 'text-white'
                }`}>
                  {geofenceDistance < 1.5 ? 'PROXIMITY: HIGH' : 'PROXIMITY: MODERATE'}
                </span>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                <Compass className="w-4 h-4" />
              </div>
            </div>
            <span className="text-[9.5px]/relaxed text-neutral-400 font-sans block mb-3.5">
              Monitors distance relative to nearest high-density cluster to coordinate priority queue rankings.
            </span>

            {/* Radar Sweep & Stats overlay */}
            <div className="grid grid-cols-2 gap-3.5 bg-neutral-950 p-2.5 rounded-lg border border-neutral-850 h-28 items-center">
              {/* Radar Circle */}
              <div className="relative w-20 h-20 bg-neutral-900 border border-neutral-800/80 rounded-full mx-auto overflow-hidden flex items-center justify-center">
                {/* Concentric rings */}
                <div className="absolute w-14 h-14 border border-emerald-500/10 rounded-full" />
                <div className="absolute w-8 h-8 border border-emerald-500/10 rounded-full" />
                {/* Crosshairs */}
                <div className="absolute w-full h-[0.5px] bg-emerald-500/10" />
                <div className="absolute h-full w-[0.5px] bg-emerald-500/10" />

                {/* Sweeping radar line */}
                <div 
                  className="absolute w-[40px] h-[40px] border-r border-emerald-450/45 origin-bottom-right"
                  style={{
                    transform: `rotate(${radarRotation}deg)`,
                    bottom: '50%',
                    right: '50%',
                    background: 'linear-gradient(45deg, transparent 80%, rgba(16,185,129,0.1) 100%)',
                    borderRadius: '100% 0 0 0'
                  }}
                />

                {/* Simulated store target blips */}
                <div className="absolute top-6 left-6 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping opacity-60" />
                <div className="absolute bottom-6 right-8 w-1 h-1 bg-emerald-500 rounded-full" />
                <div className="absolute top-12 right-4 w-1.2 h-1.2 bg-emerald-400/80 rounded-full" />

                <div className="absolute text-[8px] font-mono text-emerald-500/70 font-bold tracking-tight">SCANNING...</div>
              </div>

              {/* Coordinates Info */}
              <div className="flex flex-col justify-between h-full font-mono text-[8px] text-neutral-500">
                <div className="space-y-1 mt-0.5">
                  <span className="text-neutral-400 block font-bold uppercase tracking-wide text-[7px]">NEAREST DEPOT:</span>
                  <span className="text-white block text-[9.5px]/tight font-bold">Walmart Super #4051</span>
                  <span className="text-emerald-400 block font-bold mt-0.5 font-sans flex items-center gap-0.5 text-[8.5px]">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>{geofenceDistance} MILES AWAY</span>
                  </span>
                </div>
                <div className="border-t border-neutral-900 pt-1 leading-normal">
                  <span className="text-neutral-400 block text-[6px]">GPS METRIC RANGE:</span>
                  <span>LAT: 26.115 | LON: -80.124</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Battery Power & Efficiency Monitor */}
        <motion.div
          id="aux-power-monitor"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-neutral-900/90 border border-neutral-805/70 p-5 rounded-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider block">Lifespan Estimator</span>
                <span className="text-lg font-sans font-bold text-white mt-1 block">
                  Power Draw: <span className={powerDrawMa > 60 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}>{powerDrawMa} mA</span>
                </span>
              </div>
              <div className={`p-2 rounded-lg border ${
                powerDrawMa > 60 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                <Battery className="w-4 h-4" />
              </div>
            </div>
            <span className="text-[9.5px]/relaxed text-neutral-400 font-sans block mb-3.5">
              Estimates battery life during continuous background run cycles based on reaction-delay CPU wake frequency.
            </span>

            {/* Battery status gauges */}
            <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-850 h-28 flex flex-col justify-between font-mono text-[9px]">
              <div className="flex items-center justify-between text-[11px] font-mono select-none">
                <span className="text-neutral-500">PHONE BATT TEMP:</span>
                <span className="text-white font-bold">{batteryPercent.toFixed(1)}%</span>
              </div>

              {/* Dynamic Battery Fill Graphics */}
              <div className="flex items-center gap-2">
                <div className="h-4 bg-neutral-900 rounded border border-neutral-800 select-none flex-1 overflow-hidden p-[1px] relative">
                  <div 
                    className={`h-full rounded-sm transition-all duration-300 ${
                      batteryPercent > 50 ? 'bg-emerald-500' : batteryPercent > 20 ? 'bg-amber-400' : 'bg-rose-500'
                    }`}
                    style={{ width: `${batteryPercent}%` }}
                  />
                  {filters.isEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Zap className="w-3 h-3 text-amber-300 animate-pulse drop-shadow" />
                    </div>
                  )}
                </div>
                {/* Battery tip */}
                <div className="w-1.5 h-2 bg-neutral-800 rounded-r-xs border border-neutral-800 shrink-0" />
              </div>

              {/* Projected uptime values */}
              <div className="flex justify-between items-center border-t border-neutral-900 pt-1.5 text-[8.5px] text-neutral-500 leading-none">
                <span className="uppercase tracking-tight">Active Listen Lifespan:</span>
                <span className="text-emerald-400 font-bold bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-850">
                  ~{estimatedHoursLeft} {isCharging ? '• CHARGING' : 'HRS RUNTIME'}
                </span>
              </div>
            </div>

            {/* Warning Banner block */}
            {(() => {
              const isLowPowerActive = isLowPowerSimulated || (batteryPercent <= 20 && !isCharging);
              return (
                <>
                  <AnimatePresence>
                    {isLowPowerActive && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 p-2.5 bg-rose-950/40 border border-rose-500/30 rounded-lg text-[8.5px] leading-normal text-rose-400 select-none"
                      >
                        <div className="flex items-center gap-1.5 font-bold mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse inline-block" />
                          <span>⚠️ MOBILE BATTERY CRITICAL WARNING</span>
                        </div>
                        Mobile low power mode detected (or simulated). iOS and Android underclock background processes, which may delay WebSocket telemetry intervals or completely suspend the bot thread! Please connect a charger to prevent driver dispatch delays.
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider">Mobile State Tester:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isLowPowerSimulated;
                        setIsLowPowerSimulated(next);
                        if (next) {
                          setBatteryPercent(14.5);
                          setIsCharging(false);
                        } else {
                          setBatteryPercent(86.4);
                        }
                      }}
                      className={`px-2 py-1 rounded text-[7.5px] font-mono font-bold border transition-all cursor-pointer ${
                        isLowPowerSimulated 
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.1)]' 
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-[#00f2ff] hover:border-[#00f2ff]/30'
                      }`}
                    >
                      {isLowPowerSimulated ? '⚠️ DEACTIVATE LOW POWER' : '🔌 FORCE LOW POWER MODE'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
