// TITAN CORE - Vercel Serverless API
// Full-stack AI Monetization Platform

import { NextRequest, NextResponse } from 'next/server';

// In-memory storage (replace with Redis/Database in production)
const userDB = new Map();
const leaderboardCache = [
  { rank: 1, name: 'TitanMaster', credits: 50000 },
  { rank: 2, name: 'AIGod', credits: 45000 },
  { rank: 3, name: 'NeuralKing', credits: 40000 },
  { rank: 4, name: 'CyberPro', credits: 35000 },
  { rank: 5, name: 'QuantumX', credits: 30000 }
];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '/';
  
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Route handling
    if (path === '/get-user' || path.endsWith('/get-user')) {
      return await getUser(request);
    }
    if (path === '/leaderboard' || path.endsWith('/leaderboard')) {
      return getLeaderboard();
    }
    
    return NextResponse.json({ 
      message: 'TITAN CORE API v1.0',
      endpoints: ['/get-user', '/save-progress', '/generate', '/payment-webhook', '/leaderboard', '/daily-reward']
    }, { headers: corsHeaders });

  } catch (error) {
    return NextResponse.json(
      { error: error.message }, 
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'save-progress' || request.url.includes('/save-progress')) {
      return await saveProgress(body);
    }
    if (action === 'generate' || request.url.includes('/generate')) {
      return await generateAI(body);
    }
    if (action === 'payment-webhook' || request.url.includes('/payment-webhook')) {
      return await paymentWebhook(body);
    }
    if (action === 'daily-reward' || request.url.includes('/daily-reward')) {
      return await claimDailyReward(body);
    }

    return NextResponse.json({ 
      message: 'Available actions: save-progress, generate, payment-webhook, daily-reward'
    }, { headers: corsHeaders });

  } catch (error) {
    return NextResponse.json(
      { error: error.message }, 
      { status: 500, headers: corsHeaders }
    );
  }
}

async function getUser(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id') || searchParams.get('userId') || '0';
  
  let userData = userDB.get(`user:${userId}`);
  
  if (!userData) {
    // Create new user with welcome bonus
    userData = {
      id: userId,
      credits: 100,
      level: 1,
      xp: 0,
      achievements: ['boot'],
      createdAt: Date.now(),
      lastDaily: 0,
      totalGenerations: 0,
      premium: false,
      streak: 0
    };
    userDB.set(`user:${userId}`, userData);
  }
  
  return NextResponse.json(userData);
}

async function saveProgress(data) {
  const userId = data.id || data.userId;
  
  let userData = userDB.get(`user:${userId}`) || {};
  
  userData = {
    ...userData,
    ...data,
    updatedAt: Date.now()
  };
  
  userDB.set(`user:${userId}`, userData);
  return NextResponse.json({ success: true, data: userData });
}

async function generateAI(data) {
  const { model, prompt, userId } = data;
  
  const modelCosts = {
    'gpt4': 50, 'o1': 75, 'claude': 45, 'gemini': 30,
    'llama': 20, 'mistral': 25, 'midjourney': 100,
    'dalle': 80, 'flux': 90, 'codex': 60, 'deepseek': 35,
    'perplex': 40, 'grok': 50, 'sora': 150, 'stable': 70
  };
  
  const cost = modelCosts[model] || 50;
  
  let userData = userDB.get(`user:${userId}`);
  if (!userData || userData.credits < cost) {
    return NextResponse.json({ 
      error: 'Insufficient credits', 
      required: cost,
      current: userData?.credits || 0 
    }, { status: 402 });
  }
  
  userData.credits -= cost;
  userData.totalGenerations = (userData.totalGenerations || 0) + 1;
  userData.xp = (userData.xp || 0) + 10;
  
  const levelThreshold = userData.level * 100;
  if (userData.xp >= levelThreshold) {
    userData.level += 1;
    userData.xp = 0;
    userData.credits += 50;
  }
  
  userDB.set(`user:${userId}`, userData);
  
  const mockResponse = {
    result: `[${model}] Processing: ${prompt?.substring(0, 50) || ''}...`,
    creditsUsed: cost,
    remainingCredits: userData.credits,
    generationId: crypto.randomUUID ? crypto.randomUUID() : `gen-${Date.now()}`
  };
  
  return NextResponse.json(mockResponse);
}

async function claimDailyReward(data) {
  const userId = data.userId || data.id;
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  let userData = userDB.get(`user:${userId}`);
  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  if (now - userData.lastDaily < oneDay) {
    const waitTime = Math.ceil((oneDay - (now - userData.lastDaily)) / 3600000);
    return NextResponse.json({ 
      error: 'Come back later', 
      waitHours: waitTime 
    }, { status: 429 });
  }
  
  const streak = userData.streak || 0;
  const reward = 50 + (streak * 10);
  
  userData.credits += reward;
  userData.lastDaily = now;
  userData.streak = streak + 1;
  
  userDB.set(`user:${userId}`, userData);
  
  return NextResponse.json({ 
    success: true, 
    reward, 
    streak: userData.streak,
    newBalance: userData.credits 
  });
}

async function paymentWebhook(data) {
  const { userId, amount, method, transactionId } = data;
  
  let userData = userDB.get(`user:${userId}`);
  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  const creditsToAdd = amount * 100;
  userData.credits += creditsToAdd;
  
  if (amount >= 10) {
    userData.premium = true;
    userData.premiumExpiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
  }
  
  userDB.set(`user:${userId}`, userData);
  
  return NextResponse.json({
    success: true,
    creditsAdded: creditsToAdd,
    newBalance: userData.credits,
    premium: userData.premium
  });
}

function getLeaderboard() {
  return NextResponse.json({
    top: leaderboardCache
  });
}
