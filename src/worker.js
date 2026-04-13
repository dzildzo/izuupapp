// TITAN CORE - Cloudflare Worker Backend
// Full-stack AI Monetization Platform

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

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
      // API Routes
      if (path === '/get-user') {
        return await getUser(request, env);
      }
      if (path === '/save-progress') {
        return await saveProgress(request, env);
      }
      if (path === '/generate') {
        return await generateAI(request, env);
      }
      if (path === '/payment-webhook') {
        return await paymentWebhook(request, env);
      }
      if (path === '/leaderboard') {
        return await getLeaderboard(env);
      }
      if (path === '/daily-reward') {
        return await claimDailyReward(request, env);
      }

      // Static files from site bucket
      if (path === '/' || path === '/index.html') {
        const asset = await env.ASSETS.get('index.html');
        if (asset) {
          return new Response(asset, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
      }

      return new Response('TITAN CORE API v1.0\nFrontend: / or /index.html', { 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// Database Schema using Durable Objects or KV
async function getUser(request, env) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('id') || '0';
  
  // Get user from KV storage
  let userData = await env.USER_DB.get(`user:${userId}`, { type: 'json' });
  
  if (!userData) {
    // Create new user
    userData = {
      id: userId,
      credits: 100, // Welcome bonus
      level: 1,
      xp: 0,
      achievements: ['boot'],
      createdAt: Date.now(),
      lastDaily: 0,
      totalGenerations: 0,
      premium: false
    };
    await env.USER_DB.put(`user:${userId}`, JSON.stringify(userData));
  }
  
  return Response.json(userData);
}

async function saveProgress(request, env) {
  const data = await request.json();
  const userId = data.id;
  
  let userData = await env.USER_DB.get(`user:${userId}`, { type: 'json' }) || {};
  
  userData = {
    ...userData,
    ...data,
    updatedAt: Date.now()
  };
  
  await env.USER_DB.put(`user:${userId}`, JSON.stringify(userData));
  return Response.json({ success: true, data: userData });
}

async function generateAI(request, env) {
  const { model, prompt, userId } = await request.json();
  
  // Cost calculation based on model
  const modelCosts = {
    'gpt4': 50, 'o1': 75, 'claude': 45, 'gemini': 30,
    'llama': 20, 'mistral': 25, 'midjourney': 100,
    'dalle': 80, 'flux': 90, 'codex': 60, 'deepseek': 35,
    'perplex': 40, 'grok': 50, 'sora': 150, 'stable': 70
  };
  
  const cost = modelCosts[model] || 50;
  
  // Check user credits
  let userData = await env.USER_DB.get(`user:${userId}`, { type: 'json' });
  if (!userData || userData.credits < cost) {
    return Response.json({ 
      error: 'Insufficient credits', 
      required: cost,
      current: userData?.credits || 0 
    }, { status: 402 });
  }
  
  // Deduct credits
  userData.credits -= cost;
  userData.totalGenerations = (userData.totalGenerations || 0) + 1;
  userData.xp = (userData.xp || 0) + 10;
  
  // Level up logic
  const levelThreshold = userData.level * 100;
  if (userData.xp >= levelThreshold) {
    userData.level += 1;
    userData.xp = 0;
    userData.credits += 50; // Level up bonus
  }
  
  await env.USER_DB.put(`user:${userId}`, JSON.stringify(userData));
  
  // Here you would integrate with actual AI APIs
  // For demo, return mock response
  const mockResponse = {
    result: `[${model}] Processing: ${prompt.substring(0, 50)}...`,
    creditsUsed: cost,
    remainingCredits: userData.credits,
    generationId: crypto.randomUUID()
  };
  
  return Response.json(mockResponse);
}

async function claimDailyReward(request, env) {
  const { userId } = await request.json();
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  let userData = await env.USER_DB.get(`user:${userId}`, { type: 'json' });
  if (!userData) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }
  
  if (now - userData.lastDaily < oneDay) {
    const waitTime = Math.ceil((oneDay - (now - userData.lastDaily)) / 3600000);
    return Response.json({ 
      error: 'Come back later', 
      waitHours: waitTime 
    }, { status: 429 });
  }
  
  // Daily reward increases with streak
  const streak = userData.streak || 0;
  const reward = 50 + (streak * 10); // Base 50 + 10 per day streak
  
  userData.credits += reward;
  userData.lastDaily = now;
  userData.streak = streak + 1;
  
  await env.USER_DB.put(`user:${userId}`, JSON.stringify(userData));
  
  return Response.json({ 
    success: true, 
    reward, 
    streak: userData.streak,
    newBalance: userData.credits 
  });
}

async function paymentWebhook(request, env) {
  const { userId, amount, method, transactionId } = await request.json();
  
  // Verify transaction (in production, verify with payment provider)
  let userData = await env.USER_DB.get(`user:${userId}`, { type: 'json' });
  if (!userData) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }
  
  // Convert payment to credits (1 USD = 100 credits)
  const creditsToAdd = amount * 100;
  userData.credits += creditsToAdd;
  
  if (amount >= 10) {
    userData.premium = true;
    userData.premiumExpiry = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days
  }
  
  await env.USER_DB.put(`user:${userId}`, JSON.stringify(userData));
  
  return Response.json({
    success: true,
    creditsAdded: creditsToAdd,
    newBalance: userData.credits,
    premium: userData.premium
  });
}

async function getLeaderboard(env) {
  // In production, use proper indexing
  // This is a simplified version
  return Response.json({
    top: [
      { rank: 1, name: 'TitanMaster', credits: 50000 },
      { rank: 2, name: 'AIGod', credits: 45000 },
      { rank: 3, name: 'NeuralKing', credits: 40000 },
      { rank: 4, name: 'CyberPro', credits: 35000 },
      { rank: 5, name: 'QuantumX', credits: 30000 }
    ]
  });
}
