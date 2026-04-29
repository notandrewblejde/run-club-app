import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export function usePushNotifications() {
  useEffect(() => {
    registerForPushNotifications()
  }, [])
}

async function registerForPushNotifications() {
  if (!Device.isDevice) return // skip simulator

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '856ca734-4ff9-4980-9f31-566451e77397',
    })
    const token = tokenData.data

    const jwt = await SecureStore.getItemAsync('jwt')
    if (!jwt) return

    await fetch(`${API_BASE}/v1/me/push/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify({ token, platform: Platform.OS }),
    })

    console.log('[Push] Token registered:', token.substring(0, 20) + '...')
  } catch (e) {
    console.warn('[Push] Token registration failed:', e)
  }
}
