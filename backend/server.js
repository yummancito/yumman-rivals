require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware de autenticación para admin
const adminAuth = (req, res, next) => {
  const adminToken = req.headers['x-admin-token'];
  if (adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
};

// ─── RUTAS DE AUTH ────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, data_consent, app_version, roblox_version } = req.body;

    // Verificar si el usuario ya existe
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    let userId;

    if (existingUser) {
      // Actualizar usuario existente
      userId = existingUser.id;
      const { error: updateError } = await supabase
        .from('users')
        .update({
          data_consent: data_consent,
          app_version: app_version,
          roblox_version: roblox_version,
          roblox_username: username
        })
        .eq('id', userId);

      if (updateError) throw updateError;
    } else {
      // Crear nuevo usuario
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          username,
          roblox_username: username,
          data_consent: data_consent,
          app_version: app_version,
          roblox_version: roblox_version,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;
      userId = newUser.id;
    }

    res.json({ success: true, user_id: userId });
  } catch (error) {
    console.error('Error en /api/auth/login:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── RUTAS DE ROBLOX ────────────────────────────────────────────────────────

// Función auxiliar para obtener user_id de Roblox por username
async function getRobloxUserId(username) {
  try {
    const response = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: true
      })
    });
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      return data.data[0].id;
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo user_id de Roblox:', error);
    return null;
  }
}

app.get('/api/roblox/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    console.log('GET /api/roblox/profile/:username - username:', username);

    // Obtener user_id de Roblox
    const userId = await getRobloxUserId(username);
    console.log('getRobloxUserId result:', userId);
    
    if (!userId) {
      console.log('userId is null, returning 404');
      return res.status(404).json({ success: false, error: 'Usuario no encontrado en Roblox' });
    }

    // Obtener información básica del usuario
    const profileResponse = await fetch(`https://users.roblox.com/v1/users/${userId}`);
    const profileData = await profileResponse.json();

    // Obtener conteo de amigos
    const friendsResponse = await fetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`);
    const friendsData = await friendsResponse.json();

    // Obtener conteo de seguidores
    const followersResponse = await fetch(`https://friends.roblox.com/v1/users/${userId}/followers/count`);
    const followersData = await followersResponse.json();

    // Obtener conteo de siguiendo
    const followingsResponse = await fetch(`https://friends.roblox.com/v1/users/${userId}/followings/count`);
    const followingsData = await followingsResponse.json();

    // Obtener avatar
    const avatarResponse = await fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
    const avatarData = await avatarResponse.json();

    const profile = {
      id: userId,
      name: profileData.name,
      displayName: profileData.displayName,
      description: profileData.description,
      created: profileData.created,
      isBanned: profileData.isBanned,
      friendsCount: friendsData.count || 0,
      followersCount: followersData.count || 0,
      followingsCount: followingsData.count || 0,
      avatar: avatarData.data && avatarData.data.length > 0 ? avatarData.data[0].imageUrl : null
    };

    console.log('Profile data:', profile);
    res.json({ success: true, profile });
  } catch (error) {
    console.error('Error en /api/roblox/profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── RUTAS DE USUARIOS ────────────────────────────────────────────────────────

app.get('/api/users/stats/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Obtener usuario de Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (userError || !user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    // Obtener estadísticas de Roblox
    const robloxUserId = user.roblox_user_id;
    let friendsCount = user.friends || 0;
    
    if (robloxUserId) {
      try {
        const friendsResponse = await fetch(`https://friends.roblox.com/v1/users/${robloxUserId}/friends/count`);
        const friendsData = await friendsResponse.json();
        friendsCount = friendsData.count || 0;
      } catch (error) {
        console.error('Error obteniendo amigos de Roblox:', error);
      }
    }

    const stats = {
      friends: friendsCount,
      total_launches: user.total_launches || 0,
      most_used_sky: user.most_used_sky || 'Night',
      most_used_game: user.most_used_game || 'Rivals',
      avatar: user.avatar || null,
      display_name: user.display_name || username
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error en /api/users/stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── RUTAS DE LOGS ───────────────────────────────────────────────────────────

app.post('/api/logs/usage', async (req, res) => {
  try {
    const { user_id, event, roblox_version, app_version, success, error_message, metadata } = req.body;

    const { error } = await supabase
      .from('usage_logs')
      .insert({
        user_id,
        event,
        roblox_version,
        app_version,
        success,
        error_message,
        metadata,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error en /api/logs/usage:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/logs/crash', async (req, res) => {
  try {
    const { user_id, app_version, roblox_version, error_type, error_message, stack_trace } = req.body;

    const { error } = await supabase
      .from('crash_logs')
      .insert({
        user_id,
        app_version,
        roblox_version,
        error_type,
        error_message,
        stack_trace,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error en /api/logs/crash:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── RUTAS DE PRESETS ───────────────────────────────────────────────────────

app.get('/api/presets', async (req, res) => {
  try {
    const { visibility = 'public', limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('presets')
      .select('*')
      .eq('visibility', visibility)
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error en GET /api/presets:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/presets', async (req, res) => {
  try {
    const { owner_id, name, description, config_json, tags, visibility } = req.body;

    const { data, error } = await supabase
      .from('presets')
      .insert({
        owner_id,
        name,
        description,
        config_json,
        tags,
        visibility,
        downloads: 0,
        likes: 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error en POST /api/presets:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/presets/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('presets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error en GET /api/presets/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/presets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, name, description, config_json, tags, visibility } = req.body;

    const { data, error } = await supabase
      .from('presets')
      .update({
        name,
        description,
        config_json,
        tags,
        visibility,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('owner_id', user_id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error en PUT /api/presets/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/presets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    const { error } = await supabase
      .from('presets')
      .delete()
      .eq('id', id)
      .eq('owner_id', user_id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error en DELETE /api/presets/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/presets/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener valor actual de downloads
    const { data: preset, error: fetchError } = await supabase
      .from('presets')
      .select('downloads')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Incrementar downloads
    const { error } = await supabase
      .from('presets')
      .update({
        downloads: (preset.downloads || 0) + 1
      })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error en POST /api/presets/:id/download:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/presets/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    // Verificar si ya dio like
    const { data: existingLike } = await supabase
      .from('preset_likes')
      .select('*')
      .eq('preset_id', id)
      .eq('user_id', user_id)
      .single();

    if (existingLike) {
      // Ya dio like, no hacer nada
      return res.json({ success: true, liked: true });
    }

    // Agregar like
    const { error: likeError } = await supabase
      .from('preset_likes')
      .insert({
        preset_id: id,
        user_id,
        created_at: new Date().toISOString()
      });

    if (likeError) throw likeError;

    // Incrementar contador de likes
    const { data: preset, error: fetchError } = await supabase
      .from('presets')
      .select('likes')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const { error: updateError } = await supabase
      .from('presets')
      .update({
        likes: (preset.likes || 0) + 1
      })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({ success: true, liked: true });
  } catch (error) {
    console.error('Error en POST /api/presets/:id/like:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/presets/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    // Eliminar like
    const { error: likeError } = await supabase
      .from('preset_likes')
      .delete()
      .eq('preset_id', id)
      .eq('user_id', user_id);

    if (likeError) throw likeError;

    // Decrementar contador de likes
    const { data: preset, error: fetchError } = await supabase
      .from('presets')
      .select('likes')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const { error: updateError } = await supabase
      .from('presets')
      .update({
        likes: Math.max((preset.likes || 0) - 1, 0)
      })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({ success: true, liked: false });
  } catch (error) {
    console.error('Error en DELETE /api/presets/:id/like:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/presets/:id/report', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, reason } = req.body;

    const { error } = await supabase
      .from('preset_reports')
      .insert({
        preset_id: id,
        user_id,
        reason,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error en POST /api/presets/:id/report:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/presets/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('presets')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error en GET /api/presets/user/:userId:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── RUTAS DE UPDATES ────────────────────────────────────────────────────────

app.get('/api/updates/check', async (req, res) => {
  try {
    const { current_version, channel = 'stable' } = req.query;

    // Simular verificación de actualizaciones
    // En producción, esto debería verificar contra GitHub releases o base de datos
    const latestVersion = '1.0.4';
    const hasUpdate = current_version !== latestVersion;

    res.json({
      success: true,
      has_update: hasUpdate,
      latest_version: latestVersion,
      channel,
      download_url: hasUpdate ? 'https://github.com/mmgb5656/yumman-rivals/releases/latest' : null
    });
  } catch (error) {
    console.error('Error en /api/updates/check:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── RUTAS DE ADMIN ───────────────────────────────────────────────────────────

app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    // Obtener estadísticas
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: presetCount } = await supabase
      .from('presets')
      .select('*', { count: 'exact', head: true });

    const { count: logCount } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true });

    res.json({
      success: true,
      stats: {
        users: userCount || 0,
        presets: presetCount || 0,
        logs: logCount || 0
      }
    });
  } catch (error) {
    console.error('Error en /api/admin/stats:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error en /api/admin/users:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/presets', adminAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('presets')
      .select('*')
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error en /api/admin/presets:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/presets/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('presets')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error en DELETE /api/admin/presets/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── AUTO-PING PARA MANTENER BACKEND DESPIERTO ───────────────────────────────

// Hacer ping a sí mismo cada 5 minutos para evitar que el servicio duerma (Render, etc.)
const PING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

setInterval(async () => {
  try {
    const response = await fetch(`http://localhost:${PORT}/health`);
    if (response.ok) {
      console.log('✅ Auto-ping exitoso - Backend despierto');
    }
  } catch (error) {
    console.error('❌ Error en auto-ping:', error.message);
  }
}, PING_INTERVAL_MS);

// ─── INICIAR SERVIDOR ────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en puerto ${PORT}`);
  console.log(`📊 Supabase URL: ${supabaseUrl}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Auto-ping configurado cada ${PING_INTERVAL_MS / 60000} minutos`);
});
