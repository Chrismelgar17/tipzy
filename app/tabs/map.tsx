import * as Location from 'expo-location';
import { useState, useEffect } from 'react';

export default function MapScreen() {
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  return (
    <NativeMapView
      venues={venues}
      onMarkerPress={handleMarkerPress}
      getMarkerColor={getMarkerColor}
      userLocation={userLocation}
    />
  );
}