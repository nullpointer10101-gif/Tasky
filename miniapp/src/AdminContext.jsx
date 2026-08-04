import React, { createContext, useContext, useMemo } from 'react';

export const ADMIN_TELEGRAM_IDS = ['8823265955', '5487109053'];

const AdminContext = createContext({
  isUserAdmin: false,
  adminIds: ADMIN_TELEGRAM_IDS,
});

export function AdminProvider({ user, tgUser, children }) {
  const isUserAdmin = useMemo(() => {
    const tgId = String(
      user?.telegram_id || 
      user?.id || 
      tgUser?.id || 
      window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 
      ''
    );
    return Boolean(user?.is_admin) || ADMIN_TELEGRAM_IDS.includes(tgId);
  }, [user, tgUser]);

  return (
    <AdminContext.Provider value={{ isUserAdmin, adminIds: ADMIN_TELEGRAM_IDS }}>
      {children}
    </AdminContext.Provider>
  );
}

export const useIsAdmin = () => {
  const context = useContext(AdminContext);
  return context?.isUserAdmin || false;
};

export default AdminContext;
