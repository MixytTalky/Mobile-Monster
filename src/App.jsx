import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
Home, Swords, BookOpen, Settings, Coins, Zap, Apple,
ChevronLeft, Loader2, Search, Coffee, Trophy, Bluetooth,
Globe, Shield, Activity, Sparkles, Wand2, Sword, RefreshCw,
Package, Box, Gem, AlertCircle, Sparkle, RotateCcw, ZapOff,
TrendingUp, Trees, Wind, Waves, Sun, Castle, Map as MapIcon,
Heart, Cloud, Mountain, Leaf, Moon, Play, Star, Gift, Send,
History, User, Timer, Flame, ShieldAlert, PlusCircle
} from 'lucide-react';

// --- Firebase 條件匯入（僅在有 __firebase_config 時使用）---
let firebaseApp, firebaseDb, firebaseAuth;
let fbInitialized = false;
try {
  if (typeof __firebase_config !== 'undefined') {
    const { initializeApp } = await import('firebase/app');
    const { getFirestore, setLogLevel } = await import('firebase/firestore');
    const { getAuth, signInAnonymously, signInWithCustomToken } = await import('firebase/auth');
    setLogLevel('error');
    const config = JSON.parse(__firebase_config);
    firebaseApp = initializeApp(config);
    firebaseDb = getFirestore(firebaseApp);
    firebaseAuth = getAuth(firebaseApp);
    fbInitialized = true;
  }
} catch (e) {
  console.warn('[冒險繪本] Firebase 未設定，使用本機存檔模式。', e);
}

// --- LocalStorage 存取工具 ---
import { PET_DATABASE, getVariantMultiplier } from './gameConfig';

const LS_KEY = 'legend-story-save';
const lsLoad = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
const lsSave = (data) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
};

// --- 1. 資料數據庫 ---

const ITEM_DB = {
'SHARP_FANG': { id: 'SHARP_FANG', name: '銳利獸牙', icon: 'Sword', color: '#f87171', atkBonus: 15, atkMult: 0.05, desc: '攻擊力 +15, +5%' },
'DRAGON_SCALE': { id: 'DRAGON_SCALE', name: '巨龍鱗片', icon: 'Shield', color: '#ef4444', atkMult: 0.15, hpBonus: 200, desc:
'攻擊力 +15%, 生命 +200' },
'IRON_SHIELD': { id: 'IRON_SHIELD', name: '鐵製護盾', icon: 'Shield', color: '#94a3b8', hpBonus: 100, hpMult: 0.10, desc:
'生命 +100, +10%' },
'LUCKY_COIN': { id: 'LUCKY_COIN', name: '幸運金幣', icon: 'Coins', color: '#fbbf24', clickMult: 1.0, desc: '點擊獲得金幣 +100%' },
'SILVER_BELL': { id: 'SILVER_BELL', name: '銀色鈴鐺', icon: 'Bell', color: '#e2e8f0', clickMult: 0.3, idleMult: 0.1, desc:
'點擊金幣 +30%, 掛機 +10%' },
'MONSTER_ESSENCE': { id: 'MONSTER_ESSENCE', name: '怪物精華', icon: 'Sparkle', color: '#818cf8', atkBonus: 20, hpBonus: 50,
dodgeRate: 0.05, desc: '攻擊 +20, 生命 +50, 閃避 +5%' },
'MYSTERY_CHEST': { id: 'MYSTERY_CHEST', name: '神秘寶箱', icon: 'Box', color: '#f59e0b', hpMult: 0.15, extraCounters: 1,
desc: '生命 +15%, 反擊次數 +1' },
'WIND_FEATHER': { id: 'WIND_FEATHER', name: '疾風之羽', icon: 'Wind', color: '#38bdf8', waitBonus: 1.5, dodgeRate: 0.1,
desc: '等待時間 +1.5s, 閃避 +10%' },
'MAGIC_SCROLL': { id: 'MAGIC_SCROLL', name: '魔法卷軸', icon: 'Book', color: '#a855f7', extraSkills: 1, atkMult: 0.1, desc:
'技能次數 +1, 攻擊力 +10%' },
'VOID_CLOAK': { id: 'VOID_CLOAK', name: '虛空斗篷', icon: 'Ghost', color: '#4c1d95', dodgeRate: 0.2, hpMult: -0.1, desc: '閃避 +20%, 生命 -10%' },
'GOLDEN_HOURGLASS': { id: 'GOLDEN_HOURGLASS', name: '黃金沙漏', icon: 'Timer', color: '#eab308', idleMult: 0.3, waitBonus:
1.0, desc: '掛機收益 +30%, 等待 +1s' }
};

const SCENES = [
{ id: 'grassland', name: '翠綠草原', minLv: 1, maxLv: 10, bgColor: 'bg-[#f0f9eb]', groundColor: 'bg-[#a7d08c]', icon: Wind,
accent: 'text-green-600' },
{ id: 'forest', name: '幽靜森林', minLv: 11, maxLv: 20, bgColor: 'bg-[#e7f3ef]', groundColor: 'bg-[#6a9c89]', icon: Trees,
accent: 'text-emerald-700' },
{ id: 'coast', name: '蔚藍海岸', minLv: 21, maxLv: 30, bgColor: 'bg-[#eef8ff]', groundColor: 'bg-[#7eb2dd]', icon: Waves,
accent: 'text-blue-600' },
{ id: 'desert', name: '灼熱沙漠', minLv: 31, maxLv: 40, bgColor: 'bg-[#fff9e6]', groundColor: 'bg-[#eec97d]', icon: Sun,
accent: 'text-orange-600' },
{ id: 'castle', name: '永恆聖城', minLv: 41, maxLv: 100, bgColor: 'bg-[#f4f1f8]', groundColor: 'bg-[#9b8eb3]', icon: Castle,
accent: 'text-purple-700' },
];

// --- 2. 寵物渲染組件 ---

const PixelPet = ({ type, stage = 0, variant = 'A', color = "#ccc", size = 120, isEgg = false, imageName }) => {

let finalImageName = imageName;
if (!finalImageName && !isEgg && PET_DATABASE[type]) {
  const meta = PET_DATABASE[type].find(p => p.stage === stage && p.variant === variant);
  if (meta && meta.imageName) finalImageName = meta.imageName;
}

const colors = useMemo(() => {
const brighten = (hex, amt) => {
let r = parseInt(hex.slice(1, 3), 16) + amt;
let g = parseInt(hex.slice(3, 5), 16) + amt;
let b = parseInt(hex.slice(5, 7), 16) + amt;
return `rgb(${Math.min(255, r)}, ${Math.min(255, g)}, ${Math.min(255, b)})`;
};
const darken = (hex, amt) => {
let r = parseInt(hex.slice(1, 3), 16) - amt;
let g = parseInt(hex.slice(3, 5), 16) - amt;
let b = parseInt(hex.slice(5, 7), 16) - amt;
return `rgb(${Math.max(0, r)}, ${Math.max(0, g)}, ${Math.max(0, b)})`;
};
return { main: color, light: brighten(color, 40), dark: darken(color, 50), outline: "#2d241e" };
}, [color]);

if (isEgg) {
return (
<div className="flex items-center justify-center animate-bounce-slow">
    <svg width={size} height={size} viewBox="0 0 32 32" className="drop-shadow-lg overflow-visible">
        <ellipse cx="16" cy="28" rx="8" ry="2" fill="rgba(0,0,0,0.1)" />
        <path d="M16 4 Q24 4 24 16 Q24 28 16 28 Q8 28 8 16 Q8 4 16 4" fill="#fdfaf5" stroke="#604a32" strokeWidth="1" />
        <path d="M14 6 L18 6 M13 10 L19 10" stroke="#604a32" strokeWidth="0.5" opacity="0.2" />
    </svg>
</div>
);
}

if (finalImageName) {
  return (
    <div className="flex items-center justify-center pointer-events-none drop-shadow-xl" 
         style={{ width: size, height: size, filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.3))" }}>
      <svg width="0" height="0">
        <filter id="chromaKey">
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0.5 -1.5 0.5 0 1" result="matrixOut" />
          <feComposite in="matrixOut" in2="SourceGraphic" operator="in" />
        </filter>
      </svg>
      <img src={`/pets/${finalImageName}.png`} 
           style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'url(#chromaKey)', imageRendering: 'pixelated' }} 
           alt={type} />
    </div>
  );
}

const s = Math.max(1, stage);
const isFire = type === 'FIRE';
const isWater = type === 'WATER';
const isShadow = type === 'SHADOW';

return (
<div className="flex items-center justify-center pointer-events-none">
    <svg width={size} height={size} viewBox="0 0 32 32" className="drop-shadow-2xl overflow-visible">
        <defs>
            <filter id="shadow-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>
        <ellipse cx="16" cy="28" rx={6 + s*2} ry={2} fill="rgba(0,0,0,0.1)" />
        <g filter={isShadow ? "url(#shadow-glow)" : "" }>
            {isFire ?
            <path d={`M16 ${26 - s * 4} L${16 - s * 3} 26 L${16 + s * 3} 26 Z`} fill={colors.main}
                stroke={colors.outline} strokeWidth="0.5" /> :
            isWater ?
            <circle cx="16" cy={26 - s * 2} r={s * 2.5} fill={colors.main} stroke={colors.outline} strokeWidth="0.5" />
            :
            isShadow ?
            <path d={`M16 8 Q${16-s*4} 16 16 32 Q${16+s*4} 16 16 8`} fill={colors.main} stroke="gold"
                strokeWidth="0.5" /> :
            <rect x={16 - s * 3} y={26 - s * 4} width={s * 6} height={s * 4} rx="2" fill={colors.main}
                stroke={colors.outline} strokeWidth="0.5" />}
            <rect x={14} y={18} width={2} height={2} fill={colors.light} opacity="0.4" />
            <g>
                <rect x={13} y={26 - s * 2.5} width="1.5" height="1.5" fill={isShadow ? "white" : colors.outline} />
                <rect x={17} y={26 - s * 2.5} width="1.5" height="1.5" fill={isShadow ? "white" : colors.outline} />
            </g>
            {s >= 5 &&
            <circle cx="16" cy="16" r="14" fill="none" stroke="gold" strokeWidth="0.5" strokeDasharray="2 4"
                className="animate-spin-slow" />}
        </g>
    </svg>
</div>
);
};

// --- 3. 主應用程序 ---

export default function App() {
const [userId, setUserId] = useState(null);
const [userData, setUserData] = useState(null);
const [currentTab, setCurrentTab] = useState('home');
const [battleState, setBattleState] = useState(null);
const [battleType, setBattleType] = useState(null);
const [matching, setMatching] = useState(false);
const [autoTimer, setAutoTimer] = useState(3);
const [victoryMessage, setVictoryMessage] = useState("");
const [activeEvent, setActiveEvent] = useState(null);
const [chestReward, setChestReward] = useState(null);
const [isGoldPulsing, setIsGoldPulsing] = useState(false);
const [evolutionPending, setEvolutionPending] = useState(null);
const [toast, setToast] = useState(null);
const [offlineReward, setOfflineReward] = useState(null);
const [isBookOpened, setIsBookOpened] = useState(false);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

// --- 計算屬性邏輯 (精確到小數點第一位) ---
const effectiveStats = useMemo(() => {
if (!userData?.pet) return { atk: 0, hp: 0, baseAtk: 0, baseHp: 0, bonusAtk: 0, bonusHp: 0, dodge: 0, clickMult: 1,
idleMult: 1, waitBonus: 0, extraSkills: 0, extraCounters: 0 };
const p = userData.pet;

let variantMultAtk = 1.0;
let variantMultHp = 1.0;
if (p.variant === 'B') { variantMultHp = 0.9; variantMultAtk = 1.35; }
else if (p.variant === 'C') { variantMultHp = 1.2; variantMultAtk = 1.6; }
else if (p.variant === 'D') { variantMultHp = 1.6; variantMultAtk = 2.2; }
else if (p.variant === 'E') { variantMultHp = 2.5; variantMultAtk = 3.5; }

let baseAtk = Math.floor((p.atk || 0) * variantMultAtk);
let baseHp = Math.floor((p.maxHp || 0) * variantMultHp);
let flatAtk = 0; let multAtk = 1; let flatHp = 0; let multHp = 1;
let dodge = 0; let clickMult = 1; let idleMult = 1; let waitBonus = 0;
let extraSkills = 0; let extraCounters = 0;

p.equipment?.forEach(itemId => {
if (!itemId || !ITEM_DB[itemId]) return;
const item = ITEM_DB[itemId];
if (item.atkBonus) flatAtk += item.atkBonus;
if (item.atkMult) multAtk += item.atkMult;
if (item.hpBonus) flatHp += item.hpBonus;
if (item.hpMult) multHp += item.hpMult;
if (item.dodgeRate) dodge += item.dodgeRate;
if (item.clickMult) clickMult += item.clickMult;
if (item.idleMult) idleMult += item.idleMult;
if (item.waitBonus) waitBonus += item.waitBonus;
if (item.extraSkills) extraSkills += item.extraSkills;
if (item.extraCounters) extraCounters += item.extraCounters;
});

const finalAtk = Math.floor((baseAtk + flatAtk) * multAtk);
const finalHp = Math.floor((baseHp + flatHp) * multHp);

return {
atk: finalAtk,
hp: finalHp,
baseAtk,
baseHp,
bonusAtk: finalAtk - baseAtk,
bonusHp: finalHp - baseHp,
dodge, clickMult, idleMult, waitBonus, extraSkills, extraCounters
};
}, [userData?.pet]);

const isWorldMoving = useMemo(() => {
return !battleState && !matching && !offlineReward && !chestReward && !evolutionPending && currentTab === 'home';
}, [battleState, matching, offlineReward, chestReward, evolutionPending, currentTab]);

// --- Firebase 模式：初始化 ---
useEffect(() => {
  if (!fbInitialized) {
    // LocalStorage 模式
    setUserId('local-user');
    const saved = lsLoad();
    const defaultData = { uid: 'local-user', coins: 1000, collection: [], inventory: [], lastActiveTime: Date.now(), pet: null, dailyWins: 0, dailyLosses: 0, lastResetDate: new Date().toLocaleDateString(), battleHistory: [] };
    const data = saved || defaultData;
    if (!data.collection) data.collection = [];
    if (!data.inventory) data.inventory = [];
    if (!data.battleHistory) data.battleHistory = [];
    if (!saved) lsSave(data);
    // 檢查離線獎勵
    if (data.pet && data.pet.level > 1 && data.pet.state !== 'EGG' && data.lastActiveTime) {
      const elapsedSec = Math.floor((Date.now() - data.lastActiveTime) / 1000);
      if (elapsedSec > 10) {
        const cappedSec = Math.min(elapsedSec, 3600);
        let idleBonus = 1;
        data.pet?.equipment?.forEach(id => { if (ITEM_DB[id]?.idleMult) idleBonus += ITEM_DB[id].idleMult; });
        const incomePerCycle = Math.floor(20 * Math.pow(data.pet.level, 1.1) * idleBonus);
        const totalGain = Math.floor(cappedSec / 3) * incomePerCycle;
        if (totalGain > 0) { setOfflineReward({ coins: totalGain, minutes: Math.floor(cappedSec / 60), seconds: cappedSec % 60 }); }
      }
    }
    setUserData(data);
    return;
  }
  // Firebase 模式
  (async () => {
    const { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } = await import('firebase/auth');
    const auth = getAuth(firebaseApp);
    if (typeof __initial_auth_token !== 'undefined') { await signInWithCustomToken(auth, __initial_auth_token); }
    else { await signInAnonymously(auth); }
    onAuthStateChanged(auth, u => u && setUserId(u.uid));
  })();
}, []);

// --- Firebase 模式：監聽用戶資料 ---
useEffect(() => {
  if (!fbInitialized || !userId || !firebaseDb) return;
  (async () => {
    const { doc, setDoc, onSnapshot } = await import('firebase/firestore');
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'pet-v6-book';
    const ref = doc(firebaseDb, 'artifacts', appId, 'users', userId, 'data', 'profile');
    let isInitialLoad = true;
    onSnapshot(ref, s => {
      if (s.exists()) {
        const data = s.data();
        if (!data.collection) data.collection = [];
        if (!data.inventory) data.inventory = [];
        if (!data.battleHistory) data.battleHistory = [];
        const today = new Date().toLocaleDateString();
        if (data.lastResetDate !== today) { updateData({ dailyWins: 0, dailyLosses: 0, lastResetDate: today }); }
        if (isInitialLoad && data.pet && data.pet.level > 1 && data.pet.state !== 'EGG' && data.lastActiveTime) {
          const elapsedSec = Math.floor((Date.now() - data.lastActiveTime) / 1000);
          if (elapsedSec > 10) {
            const cappedSec = Math.min(elapsedSec, 3600);
            let idleBonus = 1;
            data.pet.equipment?.forEach(id => { if (ITEM_DB[id]?.idleMult) idleBonus += ITEM_DB[id].idleMult; });
            const incomePerCycle = Math.floor(20 * Math.pow(data.pet.level, 1.1) * idleBonus);
            const totalGain = Math.floor(cappedSec / 3) * incomePerCycle;
            if (totalGain > 0) { setOfflineReward({ coins: totalGain, minutes: Math.floor(cappedSec / 60), seconds: cappedSec % 60 }); }
          }
          isInitialLoad = false;
        }
        setUserData(data);
      } else {
        setDoc(ref, { uid: userId, coins: 1000, collection: [], inventory: [], lastActiveTime: Date.now(), pet: null, dailyWins: 0, dailyLosses: 0, lastResetDate: new Date().toLocaleDateString(), battleHistory: [] });
      }
    });
  })();
}, [userId]);

const currentScene = useMemo(() => {
const lv = userData?.pet?.level || 1;
return SCENES.find(s => lv >= s.minLv && lv <= s.maxLv) || SCENES[0]; }, [userData?.pet?.level]); useEffect(()=> {
    let timer;
    if (battleState && battleState.turn === 'me' && !battleState.finished) {
    const initialTime = 3 + (effectiveStats.waitBonus || 0);
    setAutoTimer(initialTime);
    timer = setInterval(() => {
    setAutoTimer(prev => { if (prev <= 1) { battleAction("NORMAL"); return initialTime; } return prev - 1; }); }, 1000);
        } return ()=> clearInterval(timer);
        }, [battleState?.turn, battleState?.finished, effectiveStats.waitBonus]);

        useEffect(() => {
        const t = setInterval(() => {
        const canTrigger = userData?.pet && userData.pet.level > 1 && userData.pet.state !== 'EGG' && isBookOpened &&
        currentTab === 'home' && !battleState && !activeEvent && !evolutionPending && !offlineReward && !chestReward;
        if (canTrigger) {
        const gain = Math.floor(20 * Math.pow(userData.pet.level, 1.1) * effectiveStats.idleMult);
        setIsGoldPulsing(true); setTimeout(() => setIsGoldPulsing(false), 500);
        updateData({ coins: (userData.coins || 0) + gain, lastActiveTime: Date.now() });
        if (Math.random() < 0.05) triggerEvent(); } }, 4000); return ()=> clearInterval(t);
            }, [userData?.pet, battleState, activeEvent, evolutionPending, offlineReward, isBookOpened, chestReward,
            currentTab, effectiveStats.idleMult]);

            const updateData = async (f) => {
            if(!userData) return;
            const merged = { ...userData, ...f };
            if (fbInitialized && firebaseDb) {
              const { doc, setDoc } = await import('firebase/firestore');
              const appId = typeof __app_id !== 'undefined' ? __app_id : 'pet-v6-book';
              await setDoc(doc(firebaseDb, 'artifacts', appId, 'users', userId, 'data', 'profile'), merged);
            } else {
              lsSave(merged);
              setUserData(merged);
            }
            };

            const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2000); };
            const triggerEvent = () => { setActiveEvent({ type: Math.random() > 0.4 ? 'ENCOUNTER' : 'TREASURE', id:
            Date.now() }); };
            const getTrainCost = (lv) => Math.floor((lv <= 20 ? 0.5 : 1) * 100 * Math.pow(lv, 1.7));
            
            const checkEvolution=(p)=> {
                const nextLevel = p.level;
                const nextStage = Math.floor((nextLevel - 1) / 10);
                
                if (nextStage > p.stage && nextStage <= 5) {
                    if (p.stage === 0) {
                        // 0階 -> 1階 (覺醒屬性)
                        const roll = Math.random();
                        let newLine = roll < 0.1 ? 'SHADOW' : roll < 0.4 ? 'FIRE' : roll < 0.7 ? 'WATER' : 'GRASS';
                        const target = PET_DATABASE[newLine].find(item => item.stage === 1 && item.variant === 'A');
                        if (target) setEvolutionPending({ ...target, newLine });
                    } else {
                        // 1階以上進化，根據 70/30 機率樹分支
                        const roll = Math.random();
                        let nextVariant = 'A';
                        const currentV = p.variant || 'A';
                        
                        if (currentV === 'A') {
                            nextVariant = roll < 0.3 ? 'B' : 'A';
                        } else if (currentV === 'B') {
                            nextVariant = roll < 0.3 ? 'C' : 'B';
                        } else if (currentV === 'C') {
                            nextVariant = roll < 0.3 ? 'D' : 'C';
                        } else if (currentV === 'D') {
                            nextVariant = roll < 0.3 ? 'E' : 'D';
                        } else {
                            nextVariant = 'E'; // E 型態無法繼續突變
                        }
                        
                        // 檢查該屬系該階層是否有對應變異型態 (避免越界，例如第一階只有 A)
                        let target = PET_DATABASE[p.line].find(item => item.stage === nextStage && item.variant === nextVariant);
                        // 如果沒有對應變異型（保險機制），降級尋回前一個 variant
                        if (!target && nextVariant > 'A') {
                           target = PET_DATABASE[p.line].find(item => item.stage === nextStage && item.variant <= nextVariant);
                        }
                        if (!target) target = PET_DATABASE[p.line].find(item => item.stage === nextStage);
                        
                        if (target) setEvolutionPending({ ...target, newLine: p.line });
                    }
                }
            };

                        const hatch = () => {
                          const b = PET_DATABASE['NEUTRAL'][0];
                          updateData({ pet: { state: 'EGG', clicksLeft: 4, level: 1, name: '神祕的蛋', line: 'NEUTRAL', variant: 'A' } });
                        };

                        const handlePetClick = (e) => {
                        if (!userData?.pet) return;
                        if (userData.pet.state === 'EGG') {
                        const nextClicks = userData.pet.clicksLeft - 1;
                        if (nextClicks <= 0) { 
                            const b = PET_DATABASE['NEUTRAL'][0]; 
                            updateData({ pet: { line: 'NEUTRAL' ,
                            level: 1, exp: 0, stage: 0, variant: 'A', name: b.name, color: b.color, hp: b.baseHp, maxHp: b.baseHp,
                            atk: b.baseAtk, equipment: [null, null, null], state: 'ALIVE' }, collection: [...new
                            Set([...(userData.collection || []), b.id])] }); showToast("新生命誕生！"); } else { updateData({
                            pet: { ...userData.pet, clicksLeft: nextClicks } }); showToast(["", "就要破殼了！" , "有裂痕了！"
                            , "蛋晃動了！" ][nextClicks]); } return; } const gain=Math.floor(Math.max(1, userData.pet.level)
                            * effectiveStats.clickMult); updateData({ coins: (userData.coins || 0) + gain }); const
                            pop=document.createElement('div'); pop.className=`fixed pointer-events-none font-black
                            text-xl z-[200] text-yellow-500 animate-float-up`; pop.style.left=`${e.clientX}px`;
                            pop.style.top=`${e.clientY}px`; pop.innerText=`+$${gain}`; document.body.appendChild(pop);
                            setTimeout(()=> pop.remove(), 800);
                            };

                            const startMatching = (type) => {
                            if (!userData.pet || userData.pet.state === 'EGG') return showToast("蛋無法戰鬥！");
                            setMatching(true); setBattleType(type);
                            setTimeout(() => { setMatching(false); startBattle(type); }, 2000);
                            };

                            const handleEventClick = () => {
                            if (!activeEvent) return;
                            const type = activeEvent.type; setActiveEvent(null);
                            if (type === 'ENCOUNTER') startBattle('ENCOUNTER');
                            else {
                            const cost = getTrainCost(userData.pet.level);
                            if (Math.random() < 0.3) { const keys=Object.keys(ITEM_DB); setChestReward({ type: 'ITEM' ,
                                itemId: keys[Math.floor(Math.random() * keys.length)] }); } else { setChestReward({
                                type: 'GOLD' , amount: Math.floor((cost * (5 + Math.random() * 5)) / 10) * 10 }); } } };
                                
  

  const processStatuses = (pet, logs) => {
    let hp = pet.curHp;
    let newStatus = [];
    (pet.status || []).forEach(s => {
      if (s.type === 'IGNITE') {
        hp -= s.value;
        logs.push(`${pet.name || '你'} 受到 ${s.value} 點燃燒傷害！`);
      }
      if (s.duration > 1) {
        newStatus.push({ ...s, duration: s.duration - 1 });
      } else {
        logs.push(`${pet.name || '你'} 的 ${s.type === 'IGNITE' ? '點燃' : s.type === 'CHILL' ? '遲緩' : s.type} 狀態解除了。`);
      }
    });
    return { ...pet, curHp: Math.max(0, hp), status: newStatus };
  };

  const startBattle = (type) => {
    const p = userData.pet;
    setBattleType(type);
    
    const myVar = getVariantMultiplier(p.variant || 'A');
    const myShield = myVar.shieldBonus ? Math.floor(effectiveStats.hp * myVar.shieldBonus) : 0;
    
    const oppElements = ['FIRE', 'WATER', 'GRASS', 'SHADOW'];
    const oppType = oppElements[Math.floor(Math.random() * oppElements.length)];
    const oppVariants = ['A', 'B'];
    const oppVar = oppVariants[Math.floor(Math.random() * oppVariants.length)];
    const oppMod = getVariantMultiplier(oppVar);
    
    const isBluetooth = type === 'BLUETOOTH';
    const oppBaseHp = effectiveStats.hp * 0.8 * (isBluetooth ? 1.5 : 1);
    const oppBaseAtk = effectiveStats.atk * (isBluetooth ? 0.9 : 0.7);
    
    setBattleState({
      me: {
        ...p,
        line: p.line || p.type,
        curHp: effectiveStats.hp,
        maxHp: effectiveStats.hp,
        atk: effectiveStats.atk,
        skillsLeft: 2 + effectiveStats.extraSkills,
        countersLeft: 2 + effectiveStats.extraCounters,
        status: [],
        shield: myShield
      },
      opp: {
        name: isBluetooth ? '藍牙挑戰者' : type === 'RANDOM' ? '隨機路人' : '野外怪物',
        level: p.level + (isBluetooth ? 2 : 0),
        line: oppType,
        type: oppType,
        curHp: oppBaseHp,
        maxHp: oppBaseHp,
        atk: oppBaseAtk,
        color: isBluetooth ? '#818cf8' : type === 'ENCOUNTER' ? '#ef4444' : '#94a3b8',
        variant: oppVar,
        status: [],
        shield: 0
      },
      logs: [`${isBluetooth ? '藍牙' : type === 'ENCOUNTER' ? '野外' : '隨機'}戰鬥開始！`, myShield > 0 ? `護盾啟動！吸收 ${myShield} 點傷害。` : null].filter(Boolean),
      turn: 'me',
      finished: false,
      result: null
    });
    setVictoryMessage("");
  };

  const calculateDamageAndStatus = (attacker, defender, isSkill, logs) => {
    const varMod = getVariantMultiplier(attacker.variant || 'A');
    const mult = isSkill ? varMod.skill : (0.9 + Math.random() * 0.2);
    
    const isChilled = (attacker.status || []).some(s => s.type === 'CHILL');
    const chillMod = isChilled ? 0.75 : 1.0;
    
    const baseDmg = Math.floor(attacker.atk * mult * chillMod);
    let finalDmg = baseDmg;
    
    let defShield = defender.shield || 0;
    if (defShield > 0) {
      if (finalDmg >= defShield) {
        logs.push(`${defender.name || '對手'} 的護盾被擊破了！`);
        finalDmg -= defShield;
        defShield = 0;
      } else {
        defShield -= finalDmg;
        logs.push(`${defender.name || '對手'} 的護盾吸收了 ${finalDmg} 傷害！`);
        finalDmg = 0;
      }
    }
    
    let newDefStatus = [...(defender.status || [])];
    let lifesteal = 0;
    let dodgeBuff = false;
    
    const baseChance = isSkill ? 0.3 : varMod.autoStatus;
    const triggerChance = baseChance * varMod.statusMod;
    
    if (finalDmg > 0 && Math.random() < triggerChance) {
      const line = attacker.line || attacker.type;
      if (line === 'FIRE') {
        const dot = Math.floor(attacker.atk * 0.3);
        const exists = newDefStatus.find(s => s.type === 'IGNITE');
        if (exists) exists.duration = 2;
        else newDefStatus.push({ type: 'IGNITE', duration: 2, value: dot });
        logs.push(`${defender.name || '對手'} 受到點燃！`);
      } else if (line === 'WATER') {
        const exists = newDefStatus.find(s => s.type === 'CHILL');
        if (exists) exists.duration = 2;
        else newDefStatus.push({ type: 'CHILL', duration: 2 });
        logs.push(`${defender.name || '對手'} 受到遲緩！`);
      } else if (line === 'GRASS') {
        lifesteal = Math.floor(finalDmg * 0.3);
        logs.push(`寄生吸取了 ${lifesteal} 點生命！`);
      }
    }
    
    if ((attacker.line || attacker.type) === 'SHADOW') {
        if (Math.random() < (isSkill ? 0.4 : 0.1)) {
            dodgeBuff = true;
            logs.push(`${attacker.name || '我方'} 隱入暗影，閃避率大幅提升！`);
        }
    }
    
    return { dmg: finalDmg, newDefShield: defShield, newDefStatus, lifesteal, dodgeBuff };
  };

  const battleAction = (mode = "NORMAL") => {
    if (battleState.turn !== 'me' || battleState.finished) return;
    
    let logs = [...battleState.logs];
    
    let meState = processStatuses(battleState.me, logs);
    if (meState.curHp <= 0) {
      setBattleState(s => ({ ...s, me: meState, logs }));
      handleBattleEnd(false, logs);
      return;
    }
    
    let oppState = { ...battleState.opp };
    let meStance = "NONE";
    let isSkill = false;
    
    if (mode === "SKILL") {
      if (meState.skillsLeft <= 0) return showToast("技能次數已耗盡！");
      meState.skillsLeft -= 1;
      isSkill = true;
      logs.push(`發動技能攻擊！`);
    } else if (mode === "COUNTER") {
      if (meState.countersLeft <= 0) return showToast("反擊次數已耗盡！");
      meState.countersLeft -= 1;
      meStance = "COUNTER";
      logs.push(`進入反擊架式...`);
    } else {
      logs.push(`發動普通攻擊！`);
    }
    
    let shieldBreak = false;
    if (meStance !== "COUNTER") {
      const res = calculateDamageAndStatus(meState, oppState, isSkill, logs);
      oppState.shield = res.newDefShield;
      if (res.dmg > 0) {
         oppState.curHp = Math.max(0, oppState.curHp - res.dmg);
         logs.push(`造成 ${res.dmg} 傷害！`);
      }
      oppState.status = res.newDefStatus;
      if (res.lifesteal > 0) {
         meState.curHp = Math.min(meState.maxHp, meState.curHp + res.lifesteal);
      }
      if (res.dodgeBuff) meState.shadowDodgeObj = true;
    }
    
    if (oppState.curHp <= 0) {
      setBattleState(s => ({ ...s, me: meState, opp: oppState, logs }));
      handleBattleEnd(true, logs);
      return;
    }
    
    setBattleState(s => ({ ...s, me: meState, opp: oppState, logs, turn: 'opp' }));
    
    setTimeout(() => {
      setBattleState(current => {
        if (!current || current.finished) return current;
        let cLogs = [...current.logs];
        
        let botState = processStatuses(current.opp, cLogs);
        if (botState.curHp <= 0) {
          setTimeout(() => handleBattleEnd(true, cLogs), 100);
          return { ...current, opp: botState, logs: cLogs };
        }
        
        let pState = { ...current.me };
        
        let finalDodgeRate = effectiveStats.dodge + (pState.shadowDodgeObj ? 0.5 : 0);
        let variantEBonus = getVariantMultiplier(pState.variant || 'A').dodgeBonus || 0;
        finalDodgeRate += variantEBonus;

        if (Math.random() < finalDodgeRate) {
          cLogs.push(`對手發動攻擊...被巧妙閃避了！`);
          pState.shadowDodgeObj = false; 
          return { ...current, me: pState, opp: botState, logs: cLogs, turn: 'me' };
        }
        
        const isOppSkill = Math.random() < 0.4;
        cLogs.push(`對手發動${isOppSkill ? '技能' : '攻擊'}！`);
        
        if (meStance === "COUNTER") {
          if (isOppSkill) {
            cLogs.push(`反擊成功！對手遭受 ${pState.atk} 反震傷害`);
            botState.curHp = Math.max(0, botState.curHp - pState.atk);
            if (botState.curHp <= 0) {
               setTimeout(() => handleBattleEnd(true, cLogs), 100);
               return { ...current, me: pState, opp: botState, logs: cLogs };
            }
            return { ...current, me: pState, opp: botState, logs: cLogs, turn: 'me' };
          } else {
            cLogs.push(`對手發動普攻...無法反擊！`);
          }
        }
        
        const botRes = calculateDamageAndStatus(botState, pState, isOppSkill, cLogs);
        pState.shield = botRes.newDefShield;
        if (botRes.dmg > 0) {
           pState.curHp = Math.max(0, pState.curHp - botRes.dmg);
           cLogs.push(`你受到了 ${botRes.dmg} 傷害！`);
        }
        pState.status = botRes.newDefStatus;
        if (botRes.lifesteal > 0) {
           botState.curHp = Math.min(botState.maxHp, botState.curHp + botRes.lifesteal);
        }
        
        pState.shadowDodgeObj = false; 
        
        if (pState.curHp <= 0) {
          setTimeout(() => handleBattleEnd(false, cLogs), 100);
          return { ...current, me: pState, opp: botState, logs: cLogs };
        }
        
        return { ...current, me: pState, opp: botState, logs: cLogs, turn: 'me' };
      });
    }, 800);
  };
const handleBattleEnd = (isWin, currentLogs) => {
                                                    const cost = getTrainCost(userData.pet.level);
                                                    let goldGain = 0; let updates = {};
                                                    if (battleType === 'BLUETOOTH') {
                                                    if (isWin) { if ((userData.dailyWins || 0) < 10) { goldGain=cost *
                                                        10; updates.dailyWins=(userData.dailyWins || 0) + 1; } } else {
                                                        if ((userData.dailyLosses || 0) < 3) { goldGain=cost * 3;
                                                        updates.dailyLosses=(userData.dailyLosses || 0) + 1; } } } else
                                                        if (battleType==='ENCOUNTER' && isWin) { if (Math.random() <
                                                        0.3) { updates.inventory=[...(userData.inventory ||
                                                        []), 'MONSTER_ESSENCE' ]; } else { goldGain=Math.floor(cost * (2
                                                        + Math.random() * 2)); } const p={ ...userData.pet }; p.exp
                                                        +=15; if (p.exp>= 100) { p.exp = 0; p.level++; p.maxHp += 20;
                                                        p.atk += 8; p.hp = p.maxHp; checkEvolution(p); }
                                                        updates.pet = p;
                                                        }
                                                        updates.coins = (userData.coins || 0) + goldGain;
                                                        setBattleState(s => ({ ...s, logs: [...currentLogs, isWin ?
                                                        '勝利！' : '戰敗...'], finished: true, result: isWin ? 'WIN' : 'LOSE'
                                                        }));
                                                        updateData(updates);
                                                        };

                                                        const saveVictoryRecord = async () => {
                                                        if (!battleState) return;
                                                        const newRecord = { type: '藍牙戰', time: new
                                                        Date().toLocaleString(), msg: victoryMessage || "凱旋而歸，續寫傳奇！",
                                                        opponent: battleState.opp.name };
                                                        await updateData({ battleHistory: [newRecord,
                                                        ...(userData.battleHistory || [])].slice(0, 20) });
                                                        setBattleState(null); setCurrentTab('battle');
                                                        showToast("凱旋紀錄已保存！");
                                                        };

                                                        const exitBattle = () => { setBattleState(null);
                                                        setCurrentTab('battle'); };
                                                        const train = () => { if(!userData.pet) return; const p = {
                                                        ...userData.pet }; const cost = getTrainCost(p.level); if
                                                        (userData.coins < cost) return showToast("墨水不足！"); p.exp +=35;
                                                            if (p.exp>= 100) { p.exp = 0; p.level++; p.maxHp += 20;
                                                            p.atk += 8; p.hp = p.maxHp; checkEvolution(p); }
                                                            updateData({ pet: p, coins: (userData.coins || 0) - cost });
                                                            };
                                                            const claimOfflineReward = () => { if (!offlineReward)
                                                            return; updateData({ coins: (userData.coins || 0) +
                                                            offlineReward.coins, lastActiveTime: Date.now() });
                                                            setOfflineReward(null); };
                                                            const confirmChestReward = () => { if (!chestReward) return;
                                                            if (chestReward.type === 'ITEM') { updateData({ inventory:
                                                            [...(userData.inventory || []), chestReward.itemId] });
                                                            showToast("寶物已收入行囊"); } else { updateData({ coins:
                                                            (userData.coins || 0) + chestReward.amount });
                                                            showToast(`獲得金幣 ${chestReward.amount}`); }
                                                            setChestReward(null); };
                                                            const handleDeleteAll = () => { updateData({ pet: null,
                                                            collection: [], inventory: [], coins: 1000 });
                                                            setIsBookOpened(false); setShowDeleteConfirm(false); };
                                                            const addTestItem = () => { const keys =
                                                            Object.keys(ITEM_DB); const id =
                                                            keys[Math.floor(Math.random() * keys.length)]; updateData({
                                                            inventory: [...(userData.inventory || []), id] });
                                                            showToast(`獲得測試道具：${ITEM_DB[id].name}`); };

                                                            if (!isBookOpened) {
                                                            return (
                                                            <div
                                                                className="flex items-center justify-center min-h-screen bg-[#604a32] p-2 font-serif">
                                                                <div
                                                                    className="w-full max-w-md h-[90vh] sm:h-[800px] rounded-[3rem] shadow-2xl flex flex-col items-center justify-center relative overflow-hidden bg-[#fdfaf5] border-[15px] border-[#4a3a2a]">
                                                                    <div
                                                                        className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')]">
                                                                    </div>
                                                                    <div
                                                                        className="z-10 flex flex-col items-center text-center px-10">
                                                                        <h1
                                                                            className="text-5xl font-black text-[#604a32] tracking-tighter mb-2 italic">
                                                                            冒險繪本</h1>
                                                                        <p
                                                                            className="text-sm font-bold text-[#d4a373] tracking-[0.3em] uppercase mb-12">
                                                                            Legend Story</p>
                                                                        <div
                                                                            className="relative mb-12 transform scale-150">
                                                                            <PixelPet stage={1} type="NEUTRAL"
                                                                                color="#d1d5db" size={100} />
                                                                            <div
                                                                                className="absolute -inset-4 border-2 border-dashed border-[#d4a373]/30 rounded-full animate-spin-slow">
                                                                            </div>
                                                                        </div>
                                                                        <button onClick={()=> setIsBookOpened(true)}
                                                                            className="bg-[#604a32] text-[#fdfaf5] px-12
                                                                            py-5 rounded-[2rem] font-bold text-xl
                                                                            shadow-2xl active:scale-95 transition-all
                                                                            border-4
                                                                            border-[#faedcd]/20"><span>翻開扉頁</span></button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            );
                                                            }

                                                            if (!userData) return <div
                                                                className="h-screen flex items-center justify-center bg-[#fdfaf5]">
                                                                <Loader2 className="animate-spin text-[#d4a373]" />
                                                            </div>;

                                                            return (
                                                            <div
                                                                className="flex items-center justify-center min-h-screen bg-[#e9edc9] p-2 font-serif text-[#4a3a2a]">
                                                                <div className={`w-full max-w-md h-[90vh] sm:h-[800px]
                                                                    rounded-[3rem] shadow-2xl flex flex-col relative
                                                                    overflow-hidden border-[12px] border-[#604a32]
                                                                    ${currentTab==='home' ? currentScene.bgColor
                                                                    : 'bg-[#fdfaf5]' } transition-colors duration-1000
                                                                    shadow-inner`}>
                                                                    <header
                                                                        className="p-6 pb-2 flex justify-between items-center z-30">
                                                                        <div className="flex flex-col">
                                                                            <h1
                                                                                className="text-xl font-bold tracking-tight flex items-center gap-1">
                                                                                <BookOpen size={18}
                                                                                    className="text-[#604a32]" /> 冒險繪本
                                                                            </h1>
                                                                            <div className={`text-[10px] font-bold
                                                                                ${currentScene.accent} flex items-center
                                                                                gap-1 px-2 py-0.5 bg-white/40
                                                                                rounded-full mt-1 shadow-sm`}>
                                                                                {React.createElement(currentScene.icon,
                                                                                {size:10})} {currentScene.name}</div>
                                                                        </div>
                                                                        <div className={`flex items-center gap-2
                                                                            bg-white/80 border-2 border-[#d4a373] px-3
                                                                            py-1.5 rounded-2xl transition-all
                                                                            duration-300 ${isGoldPulsing
                                                                            ? 'scale-110 shadow-lg' : '' }`}>
                                                                            <Coins size={14}
                                                                                className="text-[#d4a373]" /><span
                                                                                className="font-bold text-sm">{(userData.coins
                                                                                || 0).toLocaleString()}</span>
                                                                        </div>
                                                                    </header>

                                                                    <main
                                                                        className="flex-1 flex flex-col relative overflow-hidden">
                                                                        {currentTab === 'home' && (
                                                                        <div className="flex-1 flex flex-col relative">
                                                                            <div
                                                                                className="relative w-full h-[68%] overflow-hidden z-10 border-b-4 border-[#604a32]/10">
                                                                                <div className="absolute inset-0 z-0">
                                                                                    <div className={`absolute top-10
                                                                                        w-[200%] flex opacity-30
                                                                                        ${isWorldMoving
                                                                                        ? 'animate-parallax-far' : ''
                                                                                        }`}>{[...Array(10)].map((_, i) =>
                                                                                        <Cloud key={i} size={60}
                                                                                            className="text-white mx-10" />
                                                                                        )}
                                                                                    </div>
                                                                                    <div className={`absolute bottom-24
                                                                                        w-[300%] flex items-end
                                                                                        ${isWorldMoving
                                                                                        ? 'animate-parallax-mid' : ''
                                                                                        }`}>{[...Array(15)].map((_, i) => (<div key={i}
                                                                                            className="flex-1 px-10 opacity-30">
                                                                                            {React.createElement(currentScene.icon
                                                                                            || Trees, {size: 80})}</div>
                                                                                        ))}</div>
                                                                                    <div className={`absolute bottom-0
                                                                                        w-[200%] h-40
                                                                                        ${currentScene.groundColor}`}>
                                                                                        <div className={`flex w-full
                                                                                            h-full ${isWorldMoving
                                                                                            ? 'animate-parallax-fast'
                                                                                            : '' }`}>
                                                                                            {[...Array(20)].map((_, i) => (<div key={i}
                                                                                                className="flex-1 h-full opacity-20">
                                                                                                <div
                                                                                                    className="w-16 h-1.5 bg-black/10 mt-6 rounded-full">
                                                                                                </div>
                                                                                            </div>))}</div>
                                                                                    </div>
                                                                                </div>
                                                                                <div
                                                                                    className="absolute inset-0 flex flex-col items-center justify-center z-10 pt-16">
                                                                                    {activeEvent ? (
                                                                                    <button onClick={handleEventClick}
                                                                                        className={`${activeEvent.type==='ENCOUNTER'
                                                                                        ? 'bg-[#e63946]'
                                                                                        : 'bg-[#fbbf24]' } text-white
                                                                                        p-10 rounded-full border-4
                                                                                        border-white shadow-2xl
                                                                                        animate-bounce flex flex-col
                                                                                        items-center active:scale-95
                                                                                        transition-all`}>
                                                                                        {activeEvent.type ===
                                                                                        'ENCOUNTER' ?
                                                                                        <Flame size={56} /> :
                                                                                        <Gift size={56} />}
                                                                                        <span
                                                                                            className="text-sm font-bold mt-2 uppercase">{activeEvent.type
                                                                                            === 'ENCOUNTER' ? '遭遇勁敵!' :
                                                                                            '發現秘寶!'}</span>
                                                                                    </button>
                                                                                    ) : !userData.pet ? (
                                                                                    <button onClick={hatch}
                                                                                        className="bg-[#d4a373] text-white px-14 py-8 rounded-full font-bold shadow-2xl border-4 border-[#faedcd] active:scale-95 text-3xl">獲取原力</button>
                                                                                    ) : (
                                                                                    <div
                                                                                        className="flex flex-col items-center">
                                                                                        <div onClick={handlePetClick}
                                                                                            className={`w-56 h-56 flex
                                                                                            items-center justify-center
                                                                                            active:scale-90
                                                                                            transition-all
                                                                                            cursor-pointer
                                                                                            ${isWorldMoving
                                                                                            ? 'animate-pet-walking' : ''
                                                                                            }`}>
                                                                                            <PixelPet
                                                                                                stage={userData.pet.stage}
                                                                                                type={userData.pet.line}
                                                                                                color={userData.pet.color}
                                                                                                isEgg={userData.pet.state==='EGG'
                                                                                                } size={150} />
                                                                                        </div>
                                                                                        <div
                                                                                            className="mt-4 bg-[#604a32] text-white text-[12px] font-bold px-5 py-1.5 rounded-full border-2 border-[#faedcd] shadow-lg uppercase tracking-widest">
                                                                                            {userData.pet.state ===
                                                                                            'EGG' ? `點擊蛋
                                                                                            (${userData.pet.clicksLeft})`
                                                                                            : `LV.${userData.pet.level}
                                                                                            · ${userData.pet.name}`}
                                                                                        </div>
                                                                                    </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div
                                                                                className="relative flex-1 bg-[#fdfaf5] z-20 p-6 flex flex-col justify-start shadow-inner gap-4">
                                                                                {userData.pet && (
                                                                                <>
                                                                                    <div
                                                                                        className="flex justify-center gap-4 mt-2">
                                                                                        {userData.pet.equipment?.map((slot,
                                                                                        i) => (
                                                                                        <div key={i} onClick={()=> {
                                                                                            if (slot)
                                                                                            showToast(ITEM_DB[slot].desc);
                                                                                            else
                                                                                            setCurrentTab('inventory');
                                                                                            }}
                                                                                            className={`w-14 h-14
                                                                                            rounded-2xl border-2 flex
                                                                                            items-center justify-center
                                                                                            transition-all ${slot ?
                                                                                            'bg-white border-[#d4a373] shadow-md cursor-pointer' :
                                                                                            'bg-white/40 border-dashed border-black/10 opacity-30 cursor-pointer'}`}
                                                                                            >
                                                                                            {slot ?
                                                                                            <Sparkle size={20}
                                                                                                color={ITEM_DB[slot].color} />
                                                                                            :
                                                                                            <PlusCircle size={20}
                                                                                                className="text-black/10" />
                                                                                            }
                                                                                        </div>
                                                                                        ))}
                                                                                    </div>
                                                                                    <div
                                                                                        className="grid grid-cols-2 gap-4">
                                                                                        <div
                                                                                            className="bg-white border-2 border-[#d4a373]/20 p-4 rounded-[2.5rem] text-center shadow-sm">
                                                                                            <p
                                                                                                className="text-[10px] font-bold opacity-40 uppercase">
                                                                                                攻擊力</p>
                                                                                            <div
                                                                                                className="flex flex-col mt-1">
                                                                                                <span
                                                                                                    className="text-red-500 font-black text-lg leading-tight">{effectiveStats.atk.toFixed(1)}</span>
                                                                                                <span
                                                                                                    className="text-[9px] font-bold opacity-30">{effectiveStats.baseAtk.toFixed(1)}
                                                                                                    (+{effectiveStats.bonusAtk.toFixed(1)})</span>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div
                                                                                            className="bg-white border-2 border-[#d4a373]/20 p-4 rounded-[2.5rem] text-center shadow-sm">
                                                                                            <p
                                                                                                className="text-[10px] font-bold opacity-40 uppercase">
                                                                                                最大生命</p>
                                                                                            <div
                                                                                                className="flex flex-col mt-1">
                                                                                                <span
                                                                                                    className="text-green-500 font-black text-lg leading-tight">{effectiveStats.hp.toFixed(1)}</span>
                                                                                                <span
                                                                                                    className="text-[9px] font-bold opacity-30">{effectiveStats.baseHp.toFixed(1)}
                                                                                                    (+{effectiveStats.bonusHp.toFixed(1)})</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div
                                                                                        className="grid grid-cols-2 gap-4 mt-2">
                                                                                        <button onClick={train}
                                                                                            disabled={userData.pet.state==='EGG'
                                                                                            }
                                                                                            className="bg-[#faedcd] border-4 border-[#d4a373] p-4 rounded-[2rem] font-bold flex flex-col items-center gap-1 active:translate-y-1 disabled:opacity-30">
                                                                                            <TrendingUp size={20} />
                                                                                            <span
                                                                                                className="text-[10px]">修煉
                                                                                                (${getTrainCost(userData.pet.level)})</span>
                                                                                        </button>
                                                                                        <button onClick={()=>
                                                                                            setCurrentTab('inventory')}
                                                                                            className="bg-[#faedcd]
                                                                                            border-4 border-[#d4a373]
                                                                                            p-4 rounded-[2.5rem]
                                                                                            font-bold flex flex-col
                                                                                            items-center gap-1
                                                                                            active:translate-y-1
                                                                                            shadow-sm">
                                                                                            <Package size={20} /><span
                                                                                                className="text-[10px]">行囊</span>
                                                                                        </button>
                                                                                    </div>
                                                                                </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        )}

                                                                        {currentTab === 'battle' && (
                                                                        <div
                                                                            className="flex-1 p-6 overflow-y-auto bg-[#fdfaf5] animate-in fade-in">
                                                                            <h2
                                                                                className="text-2xl font-bold italic border-b-4 border-red-500 pb-2 mb-6">
                                                                                戰鬥大廳</h2>
                                                                            <div
                                                                                className="grid grid-cols-1 gap-4 mb-8">
                                                                                <button onClick={()=>
                                                                                    startMatching('RANDOM')}
                                                                                    className="bg-white border-4
                                                                                    border-slate-200 p-6
                                                                                    rounded-[2.5rem] flex items-center
                                                                                    justify-between shadow-sm
                                                                                    active:scale-95 transition-all"><div
                                                                                        className="flex items-center gap-4">
                                                                                        <div
                                                                                            className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                                                                                            <Globe size={24} />
                                                                                        </div>
                                                                                        <div className="text-left">
                                                                                            <p className="font-bold">
                                                                                                隨機配對</p>
                                                                                            <p
                                                                                                className="text-[10px] opacity-40">
                                                                                                練習用，無任何獎勵</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <ChevronLeft
                                                                                        className="rotate-180 opacity-20" />
                                                                                </button>
                                                                                <button onClick={()=>
                                                                                    startMatching('BLUETOOTH')}
                                                                                    className="bg-white border-4
                                                                                    border-indigo-200 p-6
                                                                                    rounded-[2.5rem] flex items-center
                                                                                    justify-between shadow-sm
                                                                                    active:scale-95 transition-all"><div
                                                                                        className="flex items-center gap-4">
                                                                                        <div
                                                                                            className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                                                                                            <Bluetooth size={24} />
                                                                                        </div>
                                                                                        <div className="text-left">
                                                                                            <p
                                                                                                className="font-bold text-indigo-600">
                                                                                                藍牙對戰 (模擬)</p>
                                                                                            <p
                                                                                                className="text-[10px] opacity-40">
                                                                                                勝: 10x 金幣 | 敗: 3x 金幣</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <ChevronLeft
                                                                                        className="rotate-180 opacity-20" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                        )}

                                                                        {currentTab === 'inventory' && (
                                                                        <div
                                                                            className="flex-1 p-6 overflow-y-auto bg-[#fdfaf5] animate-in fade-in slide-in-from-left-4">
                                                                            <div
                                                                                className="flex items-center gap-3 mb-6">
                                                                                <button onClick={()=>
                                                                                    setCurrentTab('home')}>
                                                                                    <ChevronLeft />
                                                                                </button>
                                                                                <h2
                                                                                    className="text-2xl font-bold italic underline decoration-[#d4a373] decoration-4">
                                                                                    行囊與裝備</h2>
                                                                            </div>
                                                                            <div className="mb-8">
                                                                                <p
                                                                                    className="text-[10px] font-bold opacity-30 uppercase tracking-widest mb-3">
                                                                                    當前裝備</p>
                                                                                <div
                                                                                    className="flex justify-around bg-white border-4 border-[#faedcd] p-4 rounded-3xl shadow-sm">
                                                                                    {userData.pet?.equipment?.map((slotId,
                                                                                    i) => (
                                                                                    <div key={i}
                                                                                        className="flex flex-col items-center gap-2">
                                                                                        <div onClick={()=> { if(!slotId)
                                                                                            return; const
                                                                                            p={...userData.pet};
                                                                                            p.equipment[i]=null;
                                                                                            updateData({pet:p,
                                                                                            inventory:[...(userData.inventory||[]),
                                                                                            slotId]});
                                                                                            showToast("卸下裝備"); }}
                                                                                            className={`w-16 h-16
                                                                                            rounded-2xl border-2 flex
                                                                                            items-center justify-center
                                                                                            transition-all ${slotId ?
                                                                                            'bg-white border-[#d4a373] shadow-md cursor-pointer active:scale-90' :
                                                                                            'bg-black/5 border-dashed border-black/10 opacity-30'}`}>{slotId ?
                                                                                            <Sparkle size={28}
                                                                                                color={ITEM_DB[slotId].color} />
                                                                                            :
                                                                                            <PlusCircle size={20}
                                                                                                className="text-black/20" />
                                                                                            }
                                                                                        </div>
                                                                                        <span
                                                                                            className="text-[9px] font-bold opacity-40">{slotId
                                                                                            ? ITEM_DB[slotId].name : `格位
                                                                                            ${i+1}`}</span>
                                                                                    </div>))}
                                                                                </div>
                                                                            </div>
                                                                            <p
                                                                                className="text-[10px] font-bold opacity-30 uppercase tracking-widest mb-3">
                                                                                儲物空間</p>
                                                                            <div className="grid gap-3 pb-20">
                                                                                {(!userData.inventory ||
                                                                                userData.inventory.length === 0) ? <div
                                                                                    className="py-10 text-center opacity-30 italic font-bold text-sm">
                                                                                    目前空空如也...</div> :
                                                                                userData.inventory.map((itemId, idx) =>
                                                                                (
                                                                                <div key={idx}
                                                                                    className="bg-white border-4 border-[#faedcd] p-4 rounded-[2.5rem] flex items-center justify-between shadow-sm">
                                                                                    <div
                                                                                        className="flex items-center gap-4">
                                                                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center"
                                                                                            style={{ color:
                                                                                            ITEM_DB[itemId].color }}>
                                                                                            <Sparkle size={24} />
                                                                                        </div>
                                                                                        <div className="flex flex-col">
                                                                                            <p
                                                                                                className="font-bold text-sm leading-tight">
                                                                                                {ITEM_DB[itemId].name}
                                                                                            </p>
                                                                                            <p
                                                                                                className="text-[10px] font-bold text-indigo-500 mt-0.5">
                                                                                                {ITEM_DB[itemId].desc}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <button onClick={()=> {
                                                                                        if(userData.pet?.state ===
                                                                                        'EGG') return
                                                                                        showToast("蛋無法裝備道具！"); const s =
                                                                                        userData.pet.equipment.indexOf(null);
                                                                                        if(s > -1) { const p =
                                                                                        {...userData.pet}; const inv =
                                                                                        [...userData.inventory];
                                                                                        p.equipment[s] = itemId;
                                                                                        inv.splice(idx,1);
                                                                                        updateData({pet:p,
                                                                                        inventory:inv});
                                                                                        showToast("已穿戴！"); } else
                                                                                        showToast("欄位滿了！"); }}
                                                                                        className="bg-[#604a32]
                                                                                        text-white px-4 py-2 rounded-xl
                                                                                        text-[10px] font-bold
                                                                                        active:scale-90">穿戴</button>
                                                                                </div>))}
                                                                            </div>
                                                                        </div>
                                                                        )}

                                                                        {currentTab === 'settings' && (
                                                                        <div
                                                                            className="flex-1 p-8 space-y-8 bg-[#fdfaf5] animate-in fade-in">
                                                                            <h2
                                                                                className="text-2xl font-bold italic border-b-4 border-[#d4a373] pb-2">
                                                                                墨水調配與測試</h2>
                                                                            <div
                                                                                className="bg-white p-4 rounded-3xl border-2 border-[#d4a373]/20 shadow-sm">
                                                                                <p
                                                                                    className="text-[10px] font-bold opacity-30 uppercase tracking-widest mb-4">
                                                                                    測試工具箱</p>
                                                                                <div className="grid grid-cols-1 gap-4">
                                                                                    <button onClick={addTestItem}
                                                                                        className="w-full p-4 bg-indigo-50 border-2 border-indigo-200 text-indigo-700 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
                                                                                        <PlusCircle size={18} />
                                                                                        獲取隨機測試道具
                                                                                    </button>
                                                                                    <div
                                                                                        className="grid grid-cols-2 gap-4">
                                                                                        <button onClick={()=>
                                                                                            updateData({ coins:
                                                                                            (userData.coins || 0) +
                                                                                            10000 })} className="p-6
                                                                                            bg-[#faedcd] border-4
                                                                                            border-[#d4a373] rounded-3xl
                                                                                            font-bold flex flex-col
                                                                                            items-center gap-2 text-sm
                                                                                            shadow-md">
                                                                                            <Coins /> +10K金幣
                                                                                        </button>
                                                                                        <button onClick={()=> {
                                                                                            if(!userData.pet) return;
                                                                                            const p={...userData.pet};
                                                                                            p.level+=10;
                                                                                            updateData({pet:p});
                                                                                            checkEvolution(p);
                                                                                            showToast("章節躍進！"); }}
                                                                                            className="p-6 bg-[#faedcd]
                                                                                            border-4 border-[#d4a373]
                                                                                            rounded-3xl font-bold flex
                                                                                            flex-col items-center gap-2
                                                                                            text-sm shadow-md">
                                                                                            <Zap /> +10章節
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <button onClick={()=>
                                                                                setShowDeleteConfirm(true)}
                                                                                className="w-full py-5 mt-8 bg-red-100
                                                                                text-red-700 font-bold rounded-3xl
                                                                                border-4 border-red-200">撕毀這本繪本</button>
                                                                        </div>
                                                                        )}

                                                                        {currentTab === 'pokedex' && (
                                                                        <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-fade-in relative z-10 pb-32 hide-scrollbar">
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                                                                                    <BookOpen className="text-blue-500" /> 神獸圖鑑
                                                                                </h2>
                                                                                <span className="text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                                                                    解鎖: {userData?.collection?.length || 0} / 61
                                                                                </span>
                                                                            </div>
                                                                            
                                                                            {Object.entries(PET_DATABASE).map(([elementKey, pets]) => (
                                                                                <div key={elementKey} className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 shadow-sm border-2 border-white">
                                                                                    <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 
                                                                                        ${elementKey === 'FIRE' ? 'text-red-500' : elementKey === 'WATER' ? 'text-blue-500' : elementKey === 'GRASS' ? 'text-green-500' : elementKey === 'SHADOW' ? 'text-purple-500' : 'text-gray-500'}`}>
                                                                                        {elementKey === 'NEUTRAL' ? '一般系' : elementKey === 'FIRE' ? '火系' : elementKey === 'WATER' ? '水系' : elementKey === 'GRASS' ? '草系' : '影系'}譜系
                                                                                    </h3>
                                                                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                                                                        {pets.map(p => {
                                                                                            const isUnlocked = userData?.collection?.includes(p.id);
                                                                                            return (
                                                                                                <div key={p.id} className={`relative flex flex-col items-center p-2 rounded-2xl border-2 transition-all
                                                                                                    ${isUnlocked ? 'border-gray-200 bg-white shadow-sm' : 'border-dashed border-gray-300 bg-gray-50/50 opacity-60'}`}>
                                                                                                    
                                                                                                    <div className="absolute top-1 left-2 text-[10px] font-bold text-gray-400">{p.stage}階 {p.variant}</div>
                                                                                                    {p.variant !== 'A' && (
                                                                                                         <div className={`absolute top-1 right-2 w-2 h-2 rounded-full shadow-inner ${p.variant==='B'?'bg-blue-400':p.variant==='C'?'bg-purple-400':p.variant==='D'?'bg-orange-400':'bg-yellow-400'}`} />
                                                                                                    )}
                                                                                                    
                                                                                                    <div className="w-16 h-16 flex items-center justify-center mb-1 mt-3">
                                                                                                       {isUnlocked ? (
                                                                                                           <PixelPet type={elementKey} stage={p.stage} variant={p.variant} color={p.color} size={60} imageName={p.imageName} />
                                                                                                       ) : (
                                                                                                           <div className="text-gray-300"><Search size={20}/></div>
                                                                                                       )}
                                                                                                    </div>
                                                                                                    <span className={`text-[11px] font-bold text-center ${isUnlocked ? 'text-gray-700' : 'text-gray-400'}`}>
                                                                                                        {isUnlocked ? p.name : '???'}
                                                                                                    </span>
                                                                                                </div>
                                                                                            )
                                                                                        })}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        )}
                                                                    </main>

                                                                    <nav
                                                                        className="p-4 bg-white/60 backdrop-blur-lg border-t-4 border-[#d4a373] flex justify-around rounded-b-[2rem] z-30">
                                                                        {[ { id: 'home', icon: Home, label: '封面' }, {
                                                                        id: 'battle', icon: Swords, label: '戰鬥' }, { id:
                                                                        'inventory', icon: Package, label: '行囊' }, { id:
                                                                        'pokedex', icon: BookOpen, label: '圖鑑' }, { id:
                                                                        'settings', icon: Settings, label: '配置'
                                                                        }].map(tab => (<button key={tab.id}
                                                                            onClick={()=> setCurrentTab(tab.id)}
                                                                            className={`flex flex-col items-center p-3
                                                                            rounded-2xl transition-all ${currentTab ===
                                                                            tab.id ? 'text-[#d4a373] bg-white scale-110 shadow-lg border-2 border-[#faedcd]' :
                                                                            'text-black/30'}`}>
                                                                            <tab.icon size={22}
                                                                                strokeWidth={currentTab===tab.id ? 3 :
                                                                                2} /><span
                                                                                className="text-[10px] font-bold mt-1">{tab.label}</span>
                                                                        </button>))}
                                                                    </nav>

                                                                    {showDeleteConfirm && (
                                                                    <div
                                                                        className="absolute inset-0 z-[500] bg-black/60 flex items-center justify-center p-6 animate-in fade-in">
                                                                        <div
                                                                            className="bg-[#fdfaf5] w-full rounded-[2.5rem] p-8 border-8 border-red-200 text-center">
                                                                            <h3
                                                                                className="text-xl font-bold text-red-700 mb-4">
                                                                                確定撕毀繪本？</h3>
                                                                            <p className="text-sm opacity-60 mb-8">
                                                                                此動作將永久刪除所有存檔進度。</p>
                                                                            <div className="flex gap-4">
                                                                                <button onClick={()=>
                                                                                    setShowDeleteConfirm(false)}
                                                                                    className="flex-1 bg-slate-100 py-3
                                                                                    rounded-2xl font-bold">取消</button>
                                                                                <button onClick={handleDeleteAll}
                                                                                    className="flex-1 bg-red-600 text-white py-3 rounded-2xl font-bold">確定刪除</button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    )}

                                                                    {matching && (
                                                                    <div
                                                                        className="absolute inset-0 z-[400] bg-white flex flex-col items-center justify-center p-10 animate-in fade-in">
                                                                        <div
                                                                            className="w-24 h-24 rounded-full border-8 border-indigo-100 border-t-indigo-600 animate-spin mb-8">
                                                                        </div>
                                                                        <div
                                                                            className="flex items-center gap-2 text-indigo-600 font-bold animate-pulse text-xl">
                                                                            <Bluetooth size={24} /> {battleType ===
                                                                            'BLUETOOTH' ? '藍牙搜尋中...' : '全球配對中...'}
                                                                        </div>
                                                                        <p className="text-xs opacity-40 mt-4 italic">
                                                                            正在同步繪本世界線...</p>
                                                                    </div>
                                                                    )}

                                                                    {evolutionPending && (
                                                                    <div
                                                                        className="absolute inset-0 z-[270] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
                                                                        <div
                                                                            className="bg-[#fdfaf5] w-full rounded-[3rem] p-10 border-[10px] border-[#604a32] shadow-2xl text-center flex flex-col items-center">
                                                                            <div
                                                                                className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 border-4 border-[#d4a373] shadow-inner">
                                                                                <Sparkles size={48}
                                                                                    className="text-yellow-500 animate-spin" />
                                                                            </div>
                                                                            <h2
                                                                                className="text-3xl font-bold italic mb-2 tracking-tighter text-[#604a32]">
                                                                                進化！</h2>
                                                                            <p
                                                                                className="text-[#604a32]/60 text-sm mb-6 leading-relaxed font-bold">
                                                                                你的夥伴正在蛻變...</p>
                                                                            <div className="mb-6 transform scale-125">
                                                                                <PixelPet
                                                                                    stage={evolutionPending.stage}
                                                                                    type={evolutionPending.newLine || userData?.pet?.line}
                                                                                    color={evolutionPending.color}
                                                                                    size={120} />
                                                                            </div>
                                                                            <div
                                                                                className="bg-white border-4 border-[#faedcd] w-full py-4 rounded-3xl mb-6 flex flex-col items-center gap-1 shadow-inner">
                                                                                <p className="text-2xl font-black text-[#604a32]">
                                                                                    {evolutionPending.name}</p>
                                                                                <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                                                                                    階段 {evolutionPending.stage} · {evolutionPending.element || ''}</p>
                                                                                <div className="flex gap-6 mt-2 text-sm font-bold">
                                                                                    <span className="text-red-500">ATK {evolutionPending.baseAtk}</span>
                                                                                    <span className="text-green-500">HP {evolutionPending.baseHp}</span>
                                                                                </div>
                                                                            </div>
                                                                            <button onClick={() => {
                                                                                const p = { ...userData.pet };
                                                                                if (evolutionPending.newLine) p.line = evolutionPending.newLine;
                                                                                p.stage = evolutionPending.stage;
                                                                                p.name = evolutionPending.name;
                                                                                p.color = evolutionPending.color;
                                                                                p.maxHp = evolutionPending.baseHp;
                                                                                p.hp = evolutionPending.baseHp;
                                                                                p.atk = evolutionPending.baseAtk;
                                                                                updateData({ pet: p, collection: [...new Set([...(userData.collection || []), evolutionPending.id])] });
                                                                                setEvolutionPending(null);
                                                                                showToast(`進化成功！${evolutionPending.name}`);
                                                                            }}
                                                                                className="w-full bg-[#604a32] text-white py-5 rounded-3xl font-bold shadow-xl active:scale-95 transition-transform uppercase tracking-widest">
                                                                                確認進化
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    )}

                                                                    {offlineReward && (
                                                                    <div
                                                                        className="absolute inset-0 z-[250] bg-black/60 flex items-center justify-center p-6 animate-in fade-in duration-300">
                                                                        <div
                                                                            className="bg-[#fdfaf5] w-full rounded-[3rem] p-10 border-[10px] border-[#604a32] shadow-2xl text-center flex flex-col items-center">
                                                                            <div
                                                                                className="w-20 h-20 bg-[#faedcd] rounded-full flex items-center justify-center mb-6 border-4 border-[#d4a373] shadow-md">
                                                                                <Coffee size={40}
                                                                                    className="text-[#604a32]" />
                                                                            </div>
                                                                            <h2
                                                                                className="text-3xl font-bold italic mb-2 tracking-tighter">
                                                                                歡迎回來！</h2>
                                                                            <p
                                                                                className="text-[#604a32]/60 text-sm mb-8 leading-relaxed font-bold">
                                                                                探險了 {offlineReward.minutes} 分
                                                                                {offlineReward.seconds} 秒...</p>
                                                                            <div
                                                                                className="bg-white border-4 border-[#faedcd] w-full py-6 rounded-3xl mb-8 flex flex-col items-center gap-1 shadow-inner">
                                                                                <p
                                                                                    className="text-[10px] font-bold opacity-30 uppercase tracking-widest">
                                                                                    累積獲取</p>
                                                                                <div
                                                                                    className="flex items-center gap-2 text-3xl font-black text-[#d4a373]">
                                                                                    <Coins size={28} />
                                                                                    <span>+{offlineReward.coins.toLocaleString()}</span>
                                                                                </div>
                                                                            </div>
                                                                            <button onClick={claimOfflineReward}
                                                                                className="w-full bg-[#604a32] text-white py-5 rounded-3xl font-bold shadow-xl active:scale-95 transition-transform uppercase tracking-widest">收下回憶</button>
                                                                        </div>
                                                                    </div>
                                                                    )}

                                                                    {chestReward && (
                                                                    <div
                                                                        className="absolute inset-0 z-[260] bg-[#604a32]/80 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-300">
                                                                        <div
                                                                            className="bg-[#fdfaf5] w-full rounded-[3rem] p-8 border-8 border-[#faedcd] shadow-2xl text-center">
                                                                            <div
                                                                                className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#d4a373] shadow-inner animate-pulse">
                                                                                {chestReward.type === 'GOLD' ?
                                                                                <Coins size={48}
                                                                                    className="text-yellow-500" /> :
                                                                                <Gift size={48}
                                                                                    className="text-indigo-500" />}
                                                                            </div>
                                                                            <h3
                                                                                className="text-2xl font-bold text-[#604a32] mb-2 italic">
                                                                                發現了寶物！</h3>
                                                                            <div
                                                                                className="bg-white p-4 rounded-2xl border-2 border-dashed border-[#d4a373] mb-8">
                                                                                {chestReward.type === 'GOLD' ? ( <p
                                                                                    className="text-3xl font-black text-[#d4a373] tracking-tighter">
                                                                                    +{chestReward.amount.toLocaleString()}
                                                                                    <span
                                                                                        className="text-sm opacity-50">GOLD</span>
                                                                                </p> ) : (
                                                                                <div>
                                                                                    <p
                                                                                        className="text-xl font-black text-indigo-600">
                                                                                        {ITEM_DB[chestReward.itemId]?.name
                                                                                        || "神秘物件"}</p>
                                                                                    <p
                                                                                        className="text-[10px] font-bold text-slate-400 mt-1">
                                                                                        {ITEM_DB[chestReward.itemId]?.desc
                                                                                        || ""}</p>
                                                                                </div> )}
                                                                            </div>
                                                                            <button onClick={confirmChestReward}
                                                                                className="w-full bg-[#604a32] text-white py-4 rounded-2xl font-bold active:scale-95 shadow-lg uppercase tracking-widest">收入行囊</button>
                                                                        </div>
                                                                    </div>
                                                                    )}

                                                                    {battleState && (
                                                                    <div className={`absolute inset-0 z-[100]
                                                                        ${currentScene.bgColor} flex flex-col animate-in
                                                                        slide-in-from-bottom duration-500
                                                                        overflow-hidden`}>
                                                                        <div className={`absolute bottom-0 w-full h-64
                                                                            ${currentScene.groundColor} opacity-40
                                                                            border-t-8 border-white/20 shadow-inner`}>
                                                                        </div>
                                                                        <div
                                                                            className="relative z-10 flex-1 p-6 flex flex-col">
                                                                            <div
                                                                                className="flex justify-between items-center mb-8">
                                                                                <button onClick={exitBattle}
                                                                                    className="p-3 bg-white/80 rounded-2xl border-4 border-[#d4a373] active:scale-90 shadow-md">
                                                                                    <ChevronLeft />
                                                                                </button>
                                                                                <div
                                                                                    className="flex items-center gap-2 bg-[#604a32] text-white px-6 py-2 rounded-full shadow-lg">
                                                                                    <span
                                                                                        className="text-sm font-bold uppercase tracking-widest">{battleType
                                                                                        === 'BLUETOOTH' ? '藍牙戰' :
                                                                                        battleType === 'ENCOUNTER' ?
                                                                                        '野外戰' : '隨機戰'}</span>
                                                                                    {battleState.turn === 'me' &&
                                                                                    !battleState.finished && ( <span
                                                                                        className="text-xs bg-red-500 text-white w-6 h-6 flex items-center justify-center rounded-full font-black animate-pulse">{autoTimer}</span>
                                                                                    )}</div>
                                                                            </div>
                                                                            <div
                                                                                className="flex flex-col items-end space-y-3 mb-10 animate-in slide-in-from-right duration-1000">
                                                                                <div
                                                                                    className="w-24 h-24 bg-white/80 border-4 border-red-500/10 rounded-[2.5rem] flex items-center justify-center shadow-2xl">
                                                                                    <PixelPet stage={3}
                                                                                        type={battleState.opp.type}
                                                                                        color={battleState.opp.color}
                                                                                        size={70} />
                                                                                </div>
                                                                                <div
                                                                                    className="w-48 text-right bg-white/40 p-2 rounded-2xl backdrop-blur-sm shadow-sm">
                                                                                    <p
                                                                                        className="font-bold text-xs uppercase tracking-tighter">
                                                                                        {battleState.opp.name} ·
                                                                                        LV.{battleState.opp.level}</p>
                                                                                    <div className="h-2.5 w-full bg-black/10 rounded-full overflow-hidden border-2 border-white mt-1.5 shadow-inner">
          <div className="h-full bg-red-500 transition-all duration-700 shadow-sm" style={{ width: `${Math.max(0, (battleState.opp.curHp/battleState.opp.maxHp)*100)}%` }}></div>
    </div>
    <div className="flex justify-end gap-1 mt-1 flex-wrap">
        {battleState.opp.shield > 0 && <span className="bg-blue-100/80 text-blue-600 text-[10px] px-1.5 py-0.5 rounded font-bold border border-blue-200 shadow-sm">🛡️ {battleState.opp.shield}</span>}
        {(battleState.opp.status || []).map((s, idx) => (
            <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded font-bold border shadow-sm ${s.type === 'IGNITE' ? 'bg-red-100/80 text-red-600 border-red-200' : s.type === 'CHILL' ? 'bg-cyan-100/80 text-cyan-600 border-cyan-200' : 'bg-gray-100 text-gray-600'}`}>
                {s.type === 'IGNITE' ? '🔥' : s.type === 'CHILL' ? '❄️' : '⚠️'} {s.duration}回合
            </span>
        ))}
    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div
                                                                                className="flex-1 flex flex-col items-start justify-center animate-in slide-in-from-left duration-1000">
                                                                                <div className={`w-32 h-32 bg-white/90
                                                                                    border-[8px] border-blue-500/10
                                                                                    rounded-[3rem] flex items-center
                                                                                    justify-center shadow-2xl relative
                                                                                    transition-all duration-500
                                                                                    ${battleState.turn==='me' &&
                                                                                    !battleState.finished
                                                                                    ? 'scale-110 rotate-3'
                                                                                    : 'scale-95 opacity-80' }`}>
                                                                                    <PixelPet stage={userData.pet.stage}
                                                                                        type={userData.pet.line}
                                                                                        color={userData.pet.color}
                                                                                        size={90} />
                                                                                    {battleState.turn === 'me' &&
                                                                                    !battleState.finished &&
                                                                                    <Sparkles
                                                                                        className="absolute -top-6 -right-6 text-yellow-400 animate-spin"
                                                                                        size={32} />}
                                                                                </div>
                                                                                <div
                                                                                    className="w-56 mt-4 bg-white/40 p-3 rounded-2xl backdrop-blur-sm shadow-sm">
                                                                                    <p
                                                                                        className="font-bold text-sm uppercase tracking-widest text-[#604a32]">
                                                                                        {userData.pet.name}</p>
                                                                                    <div className="h-2.5 w-full bg-black/10 rounded-full overflow-hidden mt-1.5 border-2 border-white shadow-inner">
        <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${Math.max(0, (battleState.me.curHp/battleState.me.maxHp)*100)}%` }}></div>
    </div>
    <div className="flex justify-start gap-1 mt-1 flex-wrap">
        {battleState.me.shield > 0 && <span className="bg-blue-100 text-blue-600 text-[10px] px-1.5 py-0.5 rounded font-bold border border-blue-200 shadow-sm">🛡️ {battleState.me.shield}</span>}
        {battleState.me.shadowDodgeObj && <span className="bg-purple-100 text-purple-600 text-[10px] px-1.5 py-0.5 rounded font-bold border border-purple-200 shadow-sm">💨 潛伏</span>}
        {(battleState.me.status || []).map((s, idx) => (
            <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded font-bold border shadow-sm ${s.type === 'IGNITE' ? 'bg-red-100 text-red-600 border-red-200' : s.type === 'CHILL' ? 'bg-cyan-100 text-cyan-600 border-cyan-200' : 'bg-gray-100 text-gray-600'}`}>
                {s.type === 'IGNITE' ? '🔥' : s.type === 'CHILL' ? '❄️' : '⚠️'} {s.duration}回合
            </span>
        ))}
    </div>
                                                                                    <div
                                                                                        className="flex gap-4 mt-2 text-[10px] font-bold">
                                                                                        <span
                                                                                            className="text-indigo-600">技能:
                                                                                            {battleState.me.skillsLeft}</span><span
                                                                                            className="text-orange-600">反擊:
                                                                                            {battleState.me.countersLeft}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="mt-4 space-y-4">
                                                                                <div
                                                                                    className="h-20 bg-[#604a32]/20 rounded-3xl p-4 text-[10px] font-bold overflow-y-auto no-scrollbar border-4 border-white shadow-inner">
                                                                                    {battleState.logs.map((log, i) =>
                                                                                    <div key={i} className={`mb-1
                                                                                        ${log.includes('勝利')
                                                                                        ? 'text-green-700 font-black' :
                                                                                        log.includes('戰敗')
                                                                                        ? 'text-red-700 font-black' :
                                                                                        log.includes('反擊成功')
                                                                                        ? 'text-indigo-600 font-black' :
                                                                                        log.includes('閃避')
                                                                                        ? 'text-blue-600 font-black'
                                                                                        : '' }`}>[{i+1}] {log}</div>)}
                                                                                </div>
                                                                                {!battleState.finished ? (
                                                                                <div className="grid grid-cols-3 gap-3">
                                                                                    <button onClick={()=>
                                                                                        battleAction("NORMAL")}
                                                                                        disabled={battleState.turn !==
                                                                                        'me'} className="bg-white
                                                                                        border-4 border-slate-300 py-4
                                                                                        rounded-2xl font-bold
                                                                                        text-[10px] active:scale-95
                                                                                        shadow-md flex flex-col
                                                                                        items-center gap-1">
                                                                                        <Sword size={16} /> 普攻
                                                                                    </button>
                                                                                    <button onClick={()=>
                                                                                        battleAction("SKILL")}
                                                                                        disabled={battleState.turn !==
                                                                                        'me' ||
                                                                                        battleState.me.skillsLeft <= 0}
                                                                                            className="bg-indigo-600 text-white py-4 rounded-2xl font-bold text-[10px] active:scale-95 shadow-lg flex flex-col items-center gap-1 disabled:opacity-50">
                                                                                            <Zap size={16} /> 技能
                                                                                            ({battleState.me.skillsLeft})</button>
                                                                                    <button onClick={()=>
                                                                                        battleAction("COUNTER")}
                                                                                        disabled={battleState.turn !==
                                                                                        'me' ||
                                                                                        battleState.me.countersLeft <=
                                                                                            0}
                                                                                            className="bg-orange-500 text-white py-4 rounded-2xl font-bold text-[10px] active:scale-95 shadow-lg flex flex-col items-center gap-1 disabled:opacity-50">
                                                                                            <ShieldAlert size={16} /> 反擊
                                                                                            ({battleState.me.countersLeft})</button>
                                                                                </div> ) : (
                                                                                <div
                                                                                    className="bg-white/90 p-5 rounded-[2rem] border-4 border-[#d4a373] shadow-2xl animate-in zoom-in">
                                                                                    {battleState.result === 'WIN' ? (
                                                                                    <div className="space-y-3">
                                                                                        <h3
                                                                                            className="text-center text-xl font-black text-indigo-600 italic">
                                                                                            {battleType === 'BLUETOOTH'
                                                                                            ? '凱旋而歸！' : '冒險勝利！'}
                                                                                        </h3>
                                                                                        {/* 僅藍牙對戰顯示獲勝宣言輸入框 */}
                                                                                        {battleType === 'BLUETOOTH' && (
                                                                                        <div className="relative">
                                                                                            <input type="text"
                                                                                                value={victoryMessage}
                                                                                                onChange={(e)=>
                                                                                            setVictoryMessage(e.target.value)}
                                                                                            placeholder="留下獲勝宣言..."
                                                                                            className="w-full
                                                                                            bg-[#fdfaf5] border-2
                                                                                            border-[#d4a373]/30 p-3
                                                                                            rounded-xl text-[10px]
                                                                                            font-bold focus:outline-none
                                                                                            focus:border-indigo-400
                                                                                            pr-10"
                                                                                            />
                                                                                            <button
                                                                                                onClick={saveVictoryRecord}
                                                                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 active:scale-90 transition-all">
                                                                                                <Send size={18} />
                                                                                            </button>
                                                                                        </div>
                                                                                        )}
                                                                                        <button
                                                                                            onClick={battleType==='BLUETOOTH'
                                                                                            ? saveVictoryRecord :
                                                                                            exitBattle}
                                                                                            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-xs active:scale-95 shadow-md">
                                                                                            {battleType === 'BLUETOOTH'
                                                                                            ? '保存並退出' : '結束戰鬥'}
                                                                                        </button>
                                                                                    </div>
                                                                                    ) : (
                                                                                    <button onClick={exitBattle}
                                                                                        className="w-full bg-[#d4a373] text-white py-5 rounded-2xl font-bold text-xs shadow-lg border-4 border-white active:scale-95">回憶冒險路途</button>
                                                                                    )}
                                                                                </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    )}

                                                                    {toast && <div
                                                                        className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[300] bg-[#604a32]/95 text-white px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-2xl border-2 border-[#faedcd] animate-in fade-in slide-in-from-bottom-4">
                                                                        {toast}</div>}
                                                                </div>

                                                                <style dangerouslySetInnerHTML={{ __html: `
                                                                    .no-scrollbar::-webkit-scrollbar { display: none; }
                                                                    .no-scrollbar { -ms-overflow-style: none;
                                                                    scrollbar-width: none; } @keyframes parallax-far {
                                                                    from { transform: translateX(0); } to { transform:
                                                                    translateX(-50%); } } .animate-parallax-far {
                                                                    animation: parallax-far 60s linear infinite; }
                                                                    @keyframes parallax-mid { from { transform:
                                                                    translateX(0); } to { transform: translateX(-50%); }
                                                                    } .animate-parallax-mid { animation: parallax-mid
                                                                    30s linear infinite; } @keyframes parallax-fast {
                                                                    from { transform: translateX(0); } to { transform:
                                                                    translateX(-50%); } } .animate-parallax-fast {
                                                                    animation: parallax-fast 10s linear infinite; }
                                                                    @keyframes pet-walking { 0%, 100% { transform:
                                                                    translateY(0) rotate(0deg); } 25% { transform:
                                                                    translateY(-8px) rotate(4deg); } 75% { transform:
                                                                    translateY(-8px) rotate(-4deg); } }
                                                                    .animate-pet-walking { animation: pet-walking 0.6s
                                                                    ease-in-out infinite; } .animate-spin-slow {
                                                                    animation: spin 15s linear infinite; } @keyframes
                                                                    spin { from { transform: rotate(0deg); } to {
                                                                    transform: rotate(360deg); } } @keyframes
                                                                    bounce-slow { 0%, 100% { transform: translateY(0); }
                                                                    50% { transform: translateY(-5px); } }
                                                                    .animate-bounce-slow { animation: bounce-slow 2s
                                                                    ease-in-out infinite; } @keyframes float-up { 0% {
                                                                    transform: translateY(0); opacity: 1; } 100% {
                                                                    transform: translateY(-100px); opacity: 0; } }
                                                                    .animate-float-up { animation: float-up 0.8s
                                                                    ease-out forwards; } ` }} />
                                                            </div>
                                                            );
                                                            }