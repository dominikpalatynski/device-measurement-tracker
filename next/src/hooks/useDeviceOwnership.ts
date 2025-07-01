"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getDevice, Device } from "@/services/api";

interface UseDeviceOwnershipProps {
  deviceId?: string;
}

interface DeviceOwnership {
  isOwner: boolean;
  isAdmin: boolean;
  canAccess: boolean;
  loading: boolean;
  error: string | null;
  device: Device | null;
}

export function useDeviceOwnership({ deviceId }: UseDeviceOwnershipProps): DeviceOwnership {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [device, setDevice] = useState<Device | null>(null);

  useEffect(() => {
    const checkOwnership = async () => {
      if (!deviceId || !isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Admin can access everything
        if (isAdmin) {
          const deviceData = await getDevice(deviceId);
          setDevice(deviceData);
          setIsOwner(true);
          setLoading(false);
          return;
        }

        // Check if user owns the device
        const deviceData = await getDevice(deviceId);
        if (deviceData) {
          setDevice(deviceData);
          setIsOwner(deviceData.owner_id === user.id);
        } else {
          setError("Device not found or access denied");
          setIsOwner(false);
        }
      } catch (err) {
        setError("Failed to verify device ownership");
        setIsOwner(false);
      } finally {
        setLoading(false);
      }
    };

    checkOwnership();
  }, [deviceId, user, isAdmin, isAuthenticated]);

  return {
    isOwner,
    isAdmin,
    canAccess: isAdmin || isOwner,
    loading,
    error,
    device,
  };
}

export default useDeviceOwnership;
