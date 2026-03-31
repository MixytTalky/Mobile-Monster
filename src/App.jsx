import React, { useState, useEffect, useMemo } from 'react';
import {
Home, Swords, BookOpen, Settings, Coins, Zap, Apple,
ChevronLeft, Loader2, Search, Coffee, Trophy, Bluetooth,
Globe, Shield, Activity, Sparkles, Wand2, Sword, RefreshCw,
Package, Box, Gem, AlertCircle, Sparkle, RotateCcw, ZapOff,
TrendingUp, Trees, Wind, Waves, Sun, Castle, Map as MapIcon,
Heart, Cloud, Mountain, Leaf, Moon, Play, Star, Gift, Send,
History, User, Timer, Flame, ShieldAlert, PlusCircle
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, collection, setLogLevel } from 'firebase/firestore';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';

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

const PET_DATABASE = {
'NEUTRAL': [{ no: '000', stage: 1, id: 'NEUTRAL_1', name: '初生豆', color: '#d1d5db', element: '一般', baseHp: 40, baseAtk:
8, skills: ['STRIKE'] }],
'FIRE': [
{ no: '001', stage: 1, id: 'FIRE_1', name: '暖暖豆', color: '#fca5a5', element: '火', baseHp: 50, baseAtk: 15 },
{ no: '002', stage: 2, id: 'FIRE_2', name: '焰尾犬', color: '#f87171', element: '火', baseHp: 130, baseAtk: 35 },
{ no: '003', stage: 3, id: 'FIRE_3', name: '紅蓮使', color: '#ef4444', element: '火', baseHp: 320, baseAtk: 65 },
{ no: '004', stage: 4, id: 'FIRE_4', name: '獄火龍', color: '#dc2626', element: '火', baseHp: 650, baseAtk: 140 },
{ no: '005', stage: 5, id: 'FIRE_5', name: '煌鳳凰', color: '#b91c1c', element: '火', baseHp: 1300, baseAtk: 320 }
],
'WATER': [
{ no: '011', stage: 1, id: 'WATER_1', name: '水滴兒', color: '#93c5fd', element: '水', baseHp: 60, baseAtk: 10 },
{ no: '012', stage: 2, id: 'WATER_2', name: '波波龜', color: '#60a5fa', element: '水', baseHp: 190, baseAtk: 24 },
{ no: '013', stage: 3, id: 'WATER_3', name: '怒濤獸', color: '#3b82f6', element: '水', baseHp: 450, baseAtk: 48 },
{ no: '014', stage: 4, id: 'WATER_4', name: '海之主', color: '#2563eb', element: '水', baseHp: 950, baseAtk: 100 },
{ no: '015', stage: 5, id: 'WATER_5', name: '利維坦', color: '#1d4ed8', element: '水', baseHp: 2200, baseAtk: 260 }
],
'GRASS': [
{ no: '021', stage: 1, id: 'GRASS_1', name: '嫩芽種', color: '#86efac', element: '草', baseHp: 55, baseAtk: 12 },
{ no: '022', stage: 2, id: 'GRASS_2', name: '藤蔓貓', color: '#4ade80', element: '草', baseHp: 160, baseAtk: 28 },
{ no: '023', stage: 3, id: 'GRASS_3', name: '翠靈豹', color: '#22c55e', element: '草', baseHp: 350, baseAtk: 58 },
{ no: '024', stage: 4, id: 'GRASS_4', name: '古樹魂', color: '#16a34a', element: '草', baseHp: 850, baseAtk: 115 },
{ no: '025', stage: 5, id: 'GRASS_5', name: '世界樹', color: '#15803d', element: '草', baseHp: 1800, baseAtk: 300 }
],
'SHADOW': [
{ no: '099', stage: 2, id: 'SHADOW_2', name: '幽影苗', color: '#4c1d95', element: '影', baseHp: 200, baseAtk: 50 },
{ no: '100', stage: 3, id: 'SHADOW_3', name: '虛空行者', color: '#2e1065', element: '影', baseHp: 500, baseAtk: 110 },
{ no: '101', stage: 4, id: 'SHADOW_4', name: '裂隙之王', color: '#1e1b4b', element: '影', baseHp: 1200, baseAtk: 250 },
{ no: '102', stage: 5, id: 'SHADOW_5', name: '終焉之噬', color: '#020617', element: '影', baseHp: 3000, baseAtk: 600 }
]
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

const PixelPet = ({ type, stage = 1, color = "#ccc", size = 120, isEgg = false }) => {
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
const [db, setDb] = useState(null);
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
let baseAtk = p.atk || 0;
let baseHp = p.maxHp || 0;
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

const finalAtk = (baseAtk + flatAtk) * multAtk;
const finalHp = (baseHp + flatHp) * multHp;

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

useEffect(() => {
setLogLevel('error');
if (typeof __firebase_config === 'undefined') return;
const config = JSON.parse(__firebase_config);
const app = initializeApp(config);
const fs = getFirestore(app);
setDb(fs);
const auth = getAuth(app);
const handleSignIn = async () => {
if (typeof __initial_auth_token !== 'undefined') { await signInWithCustomToken(auth, __initial_auth_token); }
else { await signInAnonymously(auth); }
};
handleSignIn();
return onAuthStateChanged(auth, u => u && setUserId(u.uid));
}, []);

useEffect(() => {
if (!userId || !db) return;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'pet-v6-book';
const ref = doc(db, 'artifacts', appId, 'users', userId, 'data', 'profile');
let isInitialLoad = true;
return onSnapshot(ref, s => {
if (s.exists()) {
const data = s.data();
if(!data.collection) data.collection = [];
if(!data.inventory) data.inventory = [];
if(!data.battleHistory) data.battleHistory = [];
const today = new Date().toLocaleDateString();
if (data.lastResetDate !== today) { updateData({ dailyWins: 0, dailyLosses: 0, lastResetDate: today }); }
if (isInitialLoad && data.pet && data.pet.level > 1 && data.pet.state !== 'EGG' && data.lastActiveTime) {
const elapsedSec = Math.floor((Date.now() - data.lastActiveTime) / 1000);
if (elapsedSec > 10) {
const cappedSec = Math.min(elapsedSec, 3600);
let idleBonus = 1;
data.pet.equipment?.forEach(id => { if(ITEM_DB[id]?.idleMult) idleBonus += ITEM_DB[id].idleMult; });
const incomePerCycle = Math.floor(20 * Math.pow(data.pet.level, 1.1) * idleBonus);
const totalGain = Math.floor(cappedSec / 3) * incomePerCycle;
if (totalGain > 0) { setOfflineReward({ coins: totalGain, minutes: Math.floor(cappedSec / 60), seconds: cappedSec % 60
}); }
}
isInitialLoad = false;
}
setUserData(data);
} else {
setDoc(ref, { uid: userId, coins: 1000, collection: [], inventory: [], lastActiveTime: Date.now(), pet: null, dailyWins:
0, dailyLosses: 0, lastResetDate: new Date().toLocaleDateString(), battleHistory: [] });
}
});
}, [userId, db]);

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
            if(!userData || !db) return;
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'pet-v6-book';
            await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'data', 'profile'), { ...userData, ...f });
            };

            const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2000); };
            const triggerEvent = () => { setActiveEvent({ type: Math.random() > 0.4 ? 'ENCOUNTER' : 'TREASURE', id:
            Date.now() }); };
            const getTrainCost = (lv) => Math.floor((lv <= 20 ? 0.5 : 1) * 100 * Math.pow(lv, 1.7)); const
                checkEvolution=(p)=> {
                const nextLevel = p.level;
                if (p.line === 'NEUTRAL' && nextLevel >= 11) {
                const roll = Math.random();
                let newLine = roll < 0.1 ? 'SHADOW' : roll < 0.4 ? 'FIRE' : roll < 0.7 ? 'WATER' : 'GRASS' ;
                    setEvolutionPending({ ...PET_DATABASE[newLine].find(item=> item.stage === 2), newLine });
                    } else {
                    const nextStage = Math.floor((nextLevel - 1) / 10) + 1;
                    if (nextStage > p.stage && nextStage <= 5 && p.line !=='NEUTRAL' ) { const
                        target=PET_DATABASE[p.line].find(item=> item.stage === nextStage);
                        if (target) setEvolutionPending(target);
                        }
                        }
                        };

                        const hatch = () => updateData({ pet: { state: 'EGG', clicksLeft: 4, level: 1, name: '神祕的蛋',
                        line: 'NEUTRAL' } });

                        const handlePetClick = (e) => {
                        if (!userData?.pet) return;
                        if (userData.pet.state === 'EGG') {
                        const nextClicks = userData.pet.clicksLeft - 1;
                        if (nextClicks <= 0) { const b=PET_DATABASE['NEUTRAL'][0]; updateData({ pet: { line: 'NEUTRAL' ,
                            level: 1, exp: 0, stage: 1, name: b.name, color: b.color, hp: b.baseHp, maxHp: b.baseHp,
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
                                const startBattle=(type)=> {
                                const p = userData.pet; setBattleType(type);
                                setBattleState({
                                me: { ...p, curHp: effectiveStats.hp, maxHp: effectiveStats.hp, atk: effectiveStats.atk,
                                skillsLeft: 2 + effectiveStats.extraSkills, countersLeft: 2 +
                                effectiveStats.extraCounters },
                                opp: { name: type === 'BLUETOOTH' ? '藍牙挑戰者' : type === 'RANDOM' ? '隨機路人' : '野外怪物',
                                level: p.level + (type === 'BLUETOOTH' ? 2 : 0), curHp: (effectiveStats.hp * 0.8) *
                                (type === 'BLUETOOTH' ? 1.5 : 1), maxHp: (effectiveStats.hp * 0.8) * (type ===
                                'BLUETOOTH' ? 1.5 : 1), atk: effectiveStats.atk * (type === 'BLUETOOTH' ? 0.9 : 0.7),
                                color: type === 'BLUETOOTH' ? '#818cf8' : type === 'ENCOUNTER' ? '#ef4444' : '#94a3b8',
                                type: ['FIRE','WATER','GRASS'][Math.floor(Math.random()*3)] },
                                logs: [`${type === 'BLUETOOTH' ? '藍牙' : type === 'ENCOUNTER' ? '野外' : '隨機'}戰鬥開始！`],
                                turn: 'me', finished: false, result: null
                                });
                                setVictoryMessage("");
                                };

                                const battleAction = (mode = "NORMAL") => {
                                if (battleState.turn !== 'me' || battleState.finished) return;
                                let newLogs = [...battleState.logs]; let newOppHp = battleState.opp.curHp; let meStance
                                = "NONE";
                                if (mode === "SKILL") {
                                if (battleState.me.skillsLeft <= 0) return showToast("技能次數已耗盡！"); const
                                    dmg=Math.floor(battleState.me.atk * 1.5 * (0.9 + Math.random() * 0.2));
                                    newOppHp=Math.max(0, newOppHp - dmg); newLogs.push(`使用技能造成 ${dmg} 傷害`);
                                    setBattleState(s=> ({ ...s, me: { ...s.me, skillsLeft: s.me.skillsLeft - 1 } }));
                                    } else if (mode === "COUNTER") {
                                    if (battleState.me.countersLeft <= 0) return showToast("反擊次數已耗盡！");
                                        meStance="COUNTER" ; newLogs.push(`進入反擊架式...`); setBattleState(s=> ({ ...s, me:
                                        { ...s.me, countersLeft: s.me.countersLeft - 1 } }));
                                        } else {
                                        const dmg = Math.floor(battleState.me.atk * (0.9 + Math.random() * 0.2));
                                        newOppHp = Math.max(0, newOppHp - dmg); newLogs.push(`發動普通攻擊造成 ${dmg} 傷害`);
                                        }
                                        if (newOppHp <= 0) { handleBattleEnd(true, newLogs); return; }
                                            setBattleState(s=> ({ ...s, opp: { ...s.opp, curHp: newOppHp }, logs:
                                            newLogs, turn: 'opp' }));
                                            setTimeout(() => {
                                            setBattleState(current => {
                                            if (!current || current.finished) return current;
                                            const oppLogs = [...current.logs];
                                            if (Math.random() < effectiveStats.dodge) { oppLogs.push(`對手發動攻擊...
                                                被你巧妙閃避了！`); return { ...current, logs: oppLogs, turn: 'me' }; } const
                                                isOppSkill=Math.random() < 0.4; const botDmg=Math.floor(current.opp.atk
                                                * (isOppSkill ? 1.4 : 1) * (0.8 + Math.random() * 0.4)); let
                                                playerFinalHp=current.me.curHp; let opponentFinalHp=current.opp.curHp;
                                                if (meStance==="COUNTER" ) { if (isOppSkill) {
                                                oppLogs.push(`對手使用技能！反擊成功！對手遭受 ${current.me.atk} 反震傷害`);
                                                opponentFinalHp=Math.max(0, opponentFinalHp - current.me.atk); } else {
                                                oppLogs.push(`對手發動普攻...反擊無效！遭受 ${botDmg} 傷害`); playerFinalHp=Math.max(0,
                                                playerFinalHp - botDmg); } } else { oppLogs.push(`對手發動${isOppSkill
                                                ? '技能' : '攻擊' }造成 ${botDmg} 傷害`); playerFinalHp=Math.max(0,
                                                playerFinalHp - botDmg); } if (opponentFinalHp <=0) { setTimeout(()=>
                                                handleBattleEnd(true, oppLogs), 100); return { ...current, opp: {
                                                ...current.opp, curHp: 0 }, logs: oppLogs }; }
                                                else if (playerFinalHp <= 0) { setTimeout(()=> handleBattleEnd(false,
                                                    oppLogs), 100); return { ...current, me: { ...current.me, curHp: 0
                                                    }, logs: oppLogs }; }
                                                    else { return { ...current, me: { ...current.me, curHp:
                                                    playerFinalHp }, opp: { ...current.opp, curHp: opponentFinalHp },
                                                    logs: oppLogs, turn: 'me' }; }
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
                                                                    </main>

                                                                    <nav
                                                                        className="p-4 bg-white/60 backdrop-blur-lg border-t-4 border-[#d4a373] flex justify-around rounded-b-[2rem] z-30">
                                                                        {[ { id: 'home', icon: Home, label: '封面' }, {
                                                                        id: 'battle', icon: Swords, label: '戰鬥' }, { id:
                                                                        'inventory', icon: Package, label: '行囊' }, { id:
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
                                                                                    <div
                                                                                        className="h-2.5 bg-black/10 rounded-full overflow-hidden border-2 border-white mt-1.5 shadow-inner">
                                                                                        <div className="h-full bg-red-500 transition-all duration-700 shadow-sm"
                                                                                            style={{ width:
                                                                                            `${(battleState.opp.curHp/battleState.opp.maxHp)*100}%`
                                                                                            }}></div>
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
                                                                                    <div
                                                                                        className="h-2.5 bg-black/10 rounded-full overflow-hidden mt-1.5 border-2 border-white shadow-inner">
                                                                                        <div className="h-full bg-blue-500 transition-all duration-700"
                                                                                            style={{ width:
                                                                                            `${(battleState.me.curHp/battleState.me.maxHp)*100}%`
                                                                                            }}></div>
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