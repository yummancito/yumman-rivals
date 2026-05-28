'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Users, Cloud, Gamepad2, Star, Loader2, RefreshCw } from 'lucide-react';
import { electronAPI } from '@/lib/electron-api';

interface ProfileStats {
  avatar: string;
  username: string;
  displayName: string;
  description: string;
  friends: number;
  mostUsedSky: string;
  mostUsedGame: string;
  totalLaunches: number;
}

// Funciones para obtener datos de Roblox
async function obtenerUsuario(userId: string) {
  try {
    const response = await fetch(`https://users.roblox.com/v1/users/${userId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

async function obtenerAmigosCount(userId: string) {
  try {
    const response = await fetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`);
    const data = await response.json();
    return data.count || 0;
  } catch (error) {
    console.error('Error:', error);
    return 0;
  }
}

async function obtenerAvatar(userId: string) {
  try {
    const response = await fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png`);
    const data = await response.json();
    return data.data && data.data.length > 0 ? data.data[0].imageUrl : null;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

export function ProfileSection() {
  const [stats, setStats] = useState<ProfileStats>({
    avatar: `https://tr.rbxcdn.com/30DAY-AvatarHeadshot-695CED98FDC232201477E9A144B99CE4-Png/150/150/AvatarHeadshot/Webp/noFilter`,
    username: 'Usuario',
    displayName: 'Usuario',
    description: 'Jugador de Rivals apasionado por los skyboxes personalizados',
    friends: 0,
    mostUsedSky: 'Night',
    mostUsedGame: 'Rivals',
    totalLaunches: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showChangeUserModal, setShowChangeUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const config = await electronAPI.loadAppConfig();
      console.log('Configuración cargada:', config);
      
      const username = config?.config?.robloxUsername;
      const displayName = config?.config?.displayName || username;
      let avatar = config?.config?.avatar || `https://tr.rbxcdn.com/30DAY-AvatarHeadshot-695CED98FDC232201477E9A144B99CE4-Png/150/150/AvatarHeadshot/Webp/noFilter`;
      const robloxUserId = config?.config?.robloxUserId;
      
      console.log('Datos del perfil:', { username, displayName, robloxUserId });
      
      // Si no hay usuario configurado, mostrar perfil vacío
      if (!username || username === 'Usuario') {
        setStats({
          avatar: `https://tr.rbxcdn.com/30DAY-AvatarHeadshot-695CED98FDC232201477E9A144B99CE4-Png/150/150/AvatarHeadshot/Webp/noFilter`,
          username: '',
          displayName: '',
          description: '',
          friends: 0,
          mostUsedSky: '',
          mostUsedGame: '',
          totalLaunches: 0,
        });
        setLoading(false);
        return;
      }
      
      // Obtener estadísticas de Roblox directamente
      let friends = 0;
      let mostUsedGame = 'Rivals';
      let totalLaunches = 0;
      let mostUsedSky = 'Night';
      let description = 'Jugador de Rivals apasionado por los skyboxes personalizados';

      if (robloxUserId) {
        console.log('Obteniendo datos de Roblox para userId:', robloxUserId);
        
        try {
          // Obtener amigos de Roblox
          friends = await obtenerAmigosCount(robloxUserId);
          console.log('Amigos obtenidos:', friends);

          // Obtener avatar de Roblox
          const avatarUrl = await obtenerAvatar(robloxUserId);
          console.log('Avatar obtenido:', avatarUrl);
          if (avatarUrl) {
            avatar = avatarUrl;
          }

          // Obtener información del usuario
          const usuario = await obtenerUsuario(robloxUserId);
          console.log('Usuario de Roblox:', usuario);
          if (usuario && usuario.description) {
            description = usuario.description;
          }
        } catch (error) {
          console.error('Error obteniendo datos de Roblox:', error);
        }

        // Intentar obtener estadísticas del backend
        try {
          const statsResult = await electronAPI.getUserStats(username);
          console.log('Estadísticas del backend:', statsResult);
          if (statsResult.success && statsResult.stats) {
            totalLaunches = statsResult.stats.total_launches || 0;
            mostUsedSky = statsResult.stats.most_used_sky || 'Night';
            mostUsedGame = statsResult.stats.most_used_game || 'Rivals';
          }
        } catch (error) {
          console.error('Error obteniendo estadísticas del backend:', error);
        }
      } else {
        console.log('No se puede obtener datos de Roblox: robloxUserId inválido');
      }
      
      setStats({
        avatar,
        username,
        displayName,
        description,
        friends,
        mostUsedSky,
        mostUsedGame,
        totalLaunches,
      });
    } catch (error) {
      console.error('Error cargando perfil:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleRefresh = () => {
    setShowChangeUserModal(true);
  };

  const handleChangeUser = async () => {
    if (!newUsername.trim()) {
      return;
    }

    setIsValidating(true);
    try {
      // Validar usuario con Roblox
      const result = await electronAPI.getRobloxProfile(newUsername.trim());

      if (result.success && result.profile) {
        // Guardar nuevo usuario en config
        const config = await electronAPI.loadAppConfig();
        if (config?.config) {
          const newConfig = {
            ...config.config,
            robloxUsername: newUsername.trim(),
            robloxUserId: result.profile.id.toString(),
            displayName: result.profile.displayName || result.profile.name,
            avatar: result.profile.avatar || "",
          };
          await electronAPI.saveAppConfig(newConfig);
        }

        // Recargar perfil
        await loadProfile();
        setShowChangeUserModal(false);
        setNewUsername('');
      } else {
        alert('Usuario no encontrado en Roblox');
      }
    } catch (error) {
      console.error('Error cambiando usuario:', error);
      alert('Error al cambiar usuario');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCloseModal = () => {
    setShowChangeUserModal(false);
    setNewUsername('');
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showChangeUserModal) {
        handleCloseModal();
      }
    };

    if (showChangeUserModal) {
      document.addEventListener('keydown', handleEscape);
      // Focus en el input cuando se abre el modal
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showChangeUserModal]);

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div aria-label="Orange and tan hamster running in a metal wheel" role="img" className="wheel-and-hamster">
          <div className="wheel"></div>
          <div className="hamster">
            <div className="hamster__body">
              <div className="hamster__head">
                <div className="hamster__ear"></div>
                <div className="hamster__eye"></div>
                <div className="hamster__nose"></div>
              </div>
              <div className="hamster__limb hamster__limb--fr"></div>
              <div className="hamster__limb hamster__limb--fl"></div>
              <div className="hamster__limb hamster__limb--br"></div>
              <div className="hamster__limb hamster__limb--bl"></div>
              <div className="hamster__tail"></div>
            </div>
          </div>
          <div className="spoke"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#AEAEAE]">Perfil</h2>
          <p className="text-xs text-[#B5BAC1] mt-0.5">Información de tu cuenta de Roblox</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {!stats.username ? (
          // Perfil vacío
          <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
            <div className="h-16 w-16 rounded-full bg-[#1A1A1E] flex items-center justify-center">
              <Users className="h-8 w-8 text-[#555250]" />
            </div>
            <div className="text-center">
              <p className="text-sm text-[#B5BAC1]">No hay usuario configurado</p>
              <p className="text-xs text-[#555250] mt-1">Haz clic en "Cambiar usuario" para comenzar</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header del perfil */}
            <div className="flex items-center gap-4 rounded-xl border border-[#393A41] bg-[#111214] p-4 mb-3">
              <div className="relative">
                <img
                  src={stats.avatar}
                  alt={stats.displayName}
                  className="h-16 w-16 rounded-full object-cover border-2 border-white/20"
                  crossOrigin="anonymous"
                />
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-success flex items-center justify-center">
                  <Star className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-[#AEAEAE]">{stats.displayName}</h3>
                <p className="text-sm text-[#B5BAC1]">@{stats.username}</p>
                <p className="text-xs text-[#888580] mt-1">{stats.description}</p>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-[#2A2825] bg-[#111214] p-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#1A1A1E]">
                  <Users className="h-4 w-4 text-[#F2F3F5]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#555250]">Amigos</p>
                  <p className="text-sm text-[#AEAEAE]">{stats.friends}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-[#2A2825] bg-[#111214] p-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#1A1A1E]">
                  <Gamepad2 className="h-4 w-4 text-[#F2F3F5]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#555250]">Lanzamientos</p>
                  <p className="text-sm text-[#AEAEAE]">{stats.totalLaunches}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-[#2A2825] bg-[#111214] p-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#1A1A1E]">
                  <Cloud className="h-4 w-4 text-[#F2F3F5]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#555250]">Cielo favorito</p>
                  <p className="text-sm text-[#AEAEAE]">{stats.mostUsedSky}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-[#2A2825] bg-[#111214] p-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#1A1A1E]">
                  <Gamepad2 className="h-4 w-4 text-[#F2F3F5]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#555250]">Juego favorito</p>
                  <p className="text-sm text-[#AEAEAE]">{stats.mostUsedGame}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="flex items-center justify-center gap-2 rounded-xl border border-[#2A2825] py-2.5 text-xs text-[#B5BAC1] hover:text-[#AEAEAE] hover:border-[#393A41] transition-all"
      >
        {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        {refreshing ? "Cambiando..." : "Cambiar usuario"}
      </button>

      {/* Modal para cambiar usuario */}
      {showChangeUserModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]"
          onClick={handleCloseModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-[#2A2825] bg-[#111214] p-6 space-y-4 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">Cambiar usuario</h3>
            <p className="text-sm text-[#B5BAC1]">Ingresa tu nuevo usuario de Roblox</p>
            <input
              ref={inputRef}
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Usuario de Roblox"
              className="w-full px-4 py-2 rounded-lg bg-[#1A1A1E] border border-[#2A2825] text-white placeholder:text-[#555250] focus:outline-none focus:border-[#393A41] focus:ring-1 focus:ring-[#393A41]"
              disabled={isValidating}
              onKeyDown={(e) => e.key === 'Enter' && handleChangeUser()}
            />
            <div className="flex gap-3">
              <button
                onClick={handleCloseModal}
                disabled={isValidating}
                className="flex-1 px-4 py-2 rounded-lg border border-[#2A2825] bg-[#1A1A1E] text-[#AEAEAE] hover:bg-[#111214] hover:border-[#393A41] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangeUser}
                disabled={isValidating || !newUsername.trim()}
                className="flex-1 px-4 py-2 rounded-lg border border-[#2A2825] bg-[#1A1A1E] text-[#AEAEAE] hover:bg-[#111214] hover:border-[#393A41] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isValidating ? 'Validando...' : 'Cambiar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
