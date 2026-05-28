-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  roblox_user_id BIGINT,
  display_name TEXT,
  avatar TEXT,
  data_consent BOOLEAN DEFAULT false,
  app_version TEXT,
  roblox_version TEXT,
  friends INTEGER DEFAULT 0,
  total_launches INTEGER DEFAULT 0,
  most_used_sky TEXT DEFAULT 'Night',
  most_used_game TEXT DEFAULT 'Rivals',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar columnas si la tabla ya existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE users ADD COLUMN username TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'roblox_user_id'
  ) THEN
    ALTER TABLE users ADD COLUMN roblox_user_id BIGINT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE users ADD COLUMN display_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'avatar'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'friends'
  ) THEN
    ALTER TABLE users ADD COLUMN friends INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'total_launches'
  ) THEN
    ALTER TABLE users ADD COLUMN total_launches INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'most_used_sky'
  ) THEN
    ALTER TABLE users ADD COLUMN most_used_sky TEXT DEFAULT 'Night';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'most_used_game'
  ) THEN
    ALTER TABLE users ADD COLUMN most_used_game TEXT DEFAULT 'Rivals';
  END IF;
END $$;

-- Tabla de presets
CREATE TABLE IF NOT EXISTS presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  config_json JSONB,
  tags TEXT[],
  visibility TEXT DEFAULT 'public', -- 'public', 'private'
  downloads INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de likes de presets
CREATE TABLE IF NOT EXISTS preset_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  preset_id UUID REFERENCES presets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(preset_id, user_id)
);

-- Tabla de reportes de presets
CREATE TABLE IF NOT EXISTS preset_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  preset_id UUID REFERENCES presets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de logs de uso
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  roblox_version TEXT,
  app_version TEXT,
  success BOOLEAN,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de logs de crashes
CREATE TABLE IF NOT EXISTS crash_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  app_version TEXT,
  roblox_version TEXT,
  error_type TEXT,
  error_message TEXT,
  stack_trace TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_presets_owner ON presets(owner_id);
CREATE INDEX IF NOT EXISTS idx_presets_visibility ON presets(visibility);
CREATE INDEX IF NOT EXISTS idx_preset_likes_preset ON preset_likes(preset_id);
CREATE INDEX IF NOT EXISTS idx_preset_likes_user ON preset_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_event ON usage_logs(event);
CREATE INDEX IF NOT EXISTS idx_crash_logs_user ON crash_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_crash_logs_app_version ON crash_logs(app_version);

-- Habilitar Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crash_logs ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes antes de crear nuevas
DROP POLICY IF EXISTS "Users can read all users" ON users;
DROP POLICY IF EXISTS "Users can insert" ON users;
DROP POLICY IF EXISTS "Users can update own" ON users;

DROP POLICY IF EXISTS "Public presets are readable" ON presets;
DROP POLICY IF EXISTS "Users can create presets" ON presets;
DROP POLICY IF EXISTS "Users can update own presets" ON presets;
DROP POLICY IF EXISTS "Users can delete own presets" ON presets;

DROP POLICY IF EXISTS "Likes are readable" ON preset_likes;
DROP POLICY IF EXISTS "Users can create likes" ON preset_likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON preset_likes;

DROP POLICY IF EXISTS "Reports are readable by admin" ON preset_reports;
DROP POLICY IF EXISTS "Users can create reports" ON preset_reports;

DROP POLICY IF EXISTS "Logs are readable by admin" ON usage_logs;
DROP POLICY IF EXISTS "Users can create logs" ON usage_logs;

DROP POLICY IF EXISTS "Crash logs are readable by admin" ON crash_logs;
DROP POLICY IF EXISTS "Users can create crash logs" ON crash_logs;

-- Políticas RLS básicas
-- Usuarios: lectura pública, escritura solo para el propio usuario
CREATE POLICY "Users can read all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own" ON users FOR UPDATE USING (true);

-- Presets: lectura pública para presets públicos, escritura solo para el dueño
CREATE POLICY "Public presets are readable" ON presets FOR SELECT USING (visibility = 'public' OR owner_id = auth.uid());
CREATE POLICY "Users can create presets" ON presets FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own presets" ON presets FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own presets" ON presets FOR DELETE USING (owner_id = auth.uid());

-- Likes: lectura pública, escritura solo para el propio usuario
CREATE POLICY "Likes are readable" ON preset_likes FOR SELECT USING (true);
CREATE POLICY "Users can create likes" ON preset_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own likes" ON preset_likes FOR DELETE USING (user_id = auth.uid());

-- Reports: lectura solo para admin, escritura para usuarios autenticados
CREATE POLICY "Reports are readable by admin" ON preset_reports FOR SELECT USING (true);
CREATE POLICY "Users can create reports" ON preset_reports FOR INSERT WITH CHECK (user_id = auth.uid());

-- Logs: lectura solo para admin, escritura para usuarios autenticados
CREATE POLICY "Logs are readable by admin" ON usage_logs FOR SELECT USING (true);
CREATE POLICY "Users can create logs" ON usage_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Crash logs are readable by admin" ON crash_logs FOR SELECT USING (true);
CREATE POLICY "Users can create crash logs" ON crash_logs FOR INSERT WITH CHECK (true);
